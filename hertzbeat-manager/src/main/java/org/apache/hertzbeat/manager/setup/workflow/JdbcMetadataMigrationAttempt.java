/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Owns one worker's connection-deadline mutation, result, cancellation, and exit proof. */
final class JdbcMetadataMigrationAttempt {

    private final Object stateLock = new Object();
    private final CountDownLatch workerExited = new CountDownLatch(1);
    private final Connection source;
    private final Connection target;
    private final MetadataDatabaseKind targetKind;
    private final JdbcMetadataMigrationDeadline deadline;
    private final JdbcMigrationConnectionScope connections;
    private final JdbcMetadataMigrationExecutor.MigrationWork work;
    private final MetadataMigrationProgressSink progress;
    private volatile State state = State.RUNNING;
    private boolean workerStarted;
    private Thread workerThread;
    private Throwable resultFailure;

    JdbcMetadataMigrationAttempt(
            Connection source,
            Connection target,
            MetadataDatabaseKind targetKind,
            JdbcMetadataMigrationDeadline deadline,
            JdbcMigrationConnectionScope connections,
            JdbcMetadataMigrationExecutor.MigrationWork work,
            MetadataMigrationProgressSink progress) {
        this.source = source;
        this.target = target;
        this.targetKind = targetKind;
        this.deadline = deadline;
        this.connections = connections;
        this.work = work;
        this.progress = progress;
    }

    void run() {
        if (!beginWorker()) {
            workerExited.countDown();
            return;
        }
        Throwable completion = null;
        boolean invalidate = false;
        try {
            connections.configure();
            completion = runMigration();
            if (!abandoned() && !connections.restore()) {
                invalidate = true;
            }
        } catch (SQLException | RuntimeException configurationFailure) {
            completion = new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
            invalidate = true;
        } catch (Error lifecycleFailure) {
            completion = lifecycleFailure;
            invalidate = true;
        } finally {
            if (invalidate) {
                completion = invalidateConnections(completion);
            }
            try {
                complete(completion);
            } catch (Error lifecycleFailure) {
                forceFatalCompletion(lifecycleFailure);
            } finally {
                workerExited.countDown();
            }
        }
    }

    private Throwable runMigration() {
        try {
            work.migrate(source, target, targetKind, deadline.remainingDuration(), this::reportProgress);
            return null;
        } catch (MetadataMigrationException stable) {
            return stable;
        } catch (Error fatal) {
            return fatal;
        } catch (RuntimeException unexpected) {
            return new MetadataMigrationException(MetadataMigrationErrorCode.COPY);
        }
    }

    private Throwable invalidateConnections(Throwable completion) {
        Throwable result = completion;
        try {
            abortConnections();
        } catch (Error lifecycleFailure) {
            result = lifecycleFailure;
        }
        try {
            closeInvalidatedConnections();
        } catch (Error lifecycleFailure) {
            result = lifecycleFailure;
        }
        return result;
    }

    boolean awaitExit(long timeoutNanos) throws InterruptedException {
        return workerExited.await(timeoutNanos, TimeUnit.NANOSECONDS);
    }

    boolean awaitExitUninterruptibly() {
        boolean interrupted = false;
        while (workerExited.getCount() > 0) {
            try {
                workerExited.await();
            } catch (InterruptedException ignored) {
                interrupted = true;
            }
        }
        return interrupted;
    }

    Abandonment abandon() {
        synchronized (stateLock) {
            if (state != State.RUNNING) {
                return new Abandonment(false, workerStarted);
            }
            state = State.ABANDONED;
            return new Abandonment(true, workerStarted);
        }
    }

    void completeNeverStartedWorker() {
        workerExited.countDown();
    }

    void abortConnections() {
        Error failure = connections.abort();
        if (failure != null) {
            forceFatalCompletion(failure);
        }
    }

    void closeInvalidatedConnections() {
        Error failure = connections.closeInvalidated();
        if (failure != null) {
            forceFatalCompletion(failure);
            throw failure;
        }
    }

    void rethrowFailure() {
        Throwable failure;
        synchronized (stateLock) {
            failure = resultFailure;
        }
        if (failure instanceof Error error) {
            throw error;
        }
        if (failure instanceof MetadataMigrationException stable) {
            throw stable;
        }
        if (failure != null) {
            throw new MetadataMigrationException(MetadataMigrationErrorCode.COPY);
        }
    }

    void rethrowFatalOrOutcomeUnknown() {
        Throwable failure;
        synchronized (stateLock) {
            failure = resultFailure;
        }
        if (failure instanceof Error fatal) {
            throw fatal;
        }
        if (failure instanceof MetadataMigrationException stable
                && (stable.code() == MetadataMigrationErrorCode.COMMIT_OUTCOME_UNKNOWN
                || stable.code() == MetadataMigrationErrorCode.ROLLBACK_OUTCOME_UNKNOWN)) {
            throw stable;
        }
    }

    private boolean beginWorker() {
        synchronized (stateLock) {
            workerStarted = true;
            workerThread = Thread.currentThread();
            return state != State.ABANDONED;
        }
    }

    boolean isCurrentWorkerThread() {
        synchronized (stateLock) {
            return workerThread == Thread.currentThread();
        }
    }

    private void complete(Throwable failure) {
        synchronized (stateLock) {
            if (state == State.RUNNING) {
                if (outranks(failure, resultFailure)) {
                    resultFailure = failure;
                }
                state = State.RESULT_READY;
            } else if (state == State.ABANDONED && outranks(failure, resultFailure)) {
                resultFailure = failure;
            }
        }
    }

    private void forceFatalCompletion(Error failure) {
        synchronized (stateLock) {
            if (outranks(failure, resultFailure)) {
                resultFailure = failure;
            }
            if (state == State.RUNNING) {
                state = State.RESULT_READY;
            }
        }
    }

    private void reportProgress(MetadataMigrationStage stage, int percent) {
        if (state == State.RUNNING) {
            progress.report(stage, percent);
        }
    }

    boolean abandoned() {
        synchronized (stateLock) {
            return state == State.ABANDONED;
        }
    }

    private static boolean outranks(Throwable candidate, Throwable current) {
        return failurePriority(candidate) > failurePriority(current);
    }

    private static int failurePriority(Throwable failure) {
        if (failure instanceof Error) {
            return 2;
        }
        if (failure instanceof MetadataMigrationException stable) {
            if (stable.code() == MetadataMigrationErrorCode.COMMIT_OUTCOME_UNKNOWN
                    || stable.code() == MetadataMigrationErrorCode.ROLLBACK_OUTCOME_UNKNOWN) {
                return 1;
            }
        }
        return failure == null ? -1 : 0;
    }

    record Abandonment(boolean abandoned, boolean workerStarted) {
    }

    private enum State { RUNNING, RESULT_READY, ABANDONED }
}
