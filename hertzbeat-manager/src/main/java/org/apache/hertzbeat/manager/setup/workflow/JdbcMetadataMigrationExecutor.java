/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.Connection;
import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.Executor;
import java.util.concurrent.Future;
import java.util.concurrent.FutureTask;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.function.LongSupplier;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/**
 * Runs one caller-owned JDBC metadata copy with socket deadlines and an outer abort watchdog.
 *
 * <p>A deadline requests cancellation and aborts both connections, but its hard return bound still
 * depends on the JDBC driver honoring {@link Connection#abort(Executor)}. This method does not
 * return until the migration worker, including rollback and connection-state restoration, has
 * actually exited. A deadline-invalidated connection is closed and must not be reused.
 */
public final class JdbcMetadataMigrationExecutor implements AutoCloseable {

    private final Object lifecycleLock = new Object();
    private final ThreadPoolExecutor worker;
    private final ThreadPoolExecutor abortWorker;
    private final Executor networkExecutor;
    private final MigrationWork work;
    private final LongSupplier ticker;
    private ActiveExecution active;
    private boolean closed;

    public JdbcMetadataMigrationExecutor() {
        this(worker(), abortWorker(), Runnable::run, new JdbcMetadataMigration()::migrate, System::nanoTime);
    }

    JdbcMetadataMigrationExecutor(
            ThreadPoolExecutor worker, Executor networkExecutor, MigrationWork work) {
        this(worker, abortWorker(), networkExecutor, work, System::nanoTime);
    }

    JdbcMetadataMigrationExecutor(
            ThreadPoolExecutor worker,
            ThreadPoolExecutor abortWorker,
            Executor networkExecutor,
            MigrationWork work,
            LongSupplier ticker) {
        this.worker = Objects.requireNonNull(worker, "worker");
        this.abortWorker = Objects.requireNonNull(abortWorker, "abortWorker");
        this.networkExecutor = Objects.requireNonNull(networkExecutor, "networkExecutor");
        this.work = Objects.requireNonNull(work, "work");
        this.ticker = Objects.requireNonNull(ticker, "ticker");
    }

    /** Executes without accepting or retaining any JDBC URL, username, or credential. */
    public void execute(
            Connection source,
            Connection target,
            MetadataDatabaseKind targetKind,
            Duration timeout,
            MetadataMigrationProgressSink progress) {
        Objects.requireNonNull(source, "source");
        Objects.requireNonNull(target, "target");
        Objects.requireNonNull(targetKind, "targetKind");
        Objects.requireNonNull(progress, "progress");
        JdbcMetadataMigrationDeadline deadline = JdbcMetadataMigrationDeadline.start(timeout, ticker);
        JdbcMigrationConnectionScope connections = new JdbcMigrationConnectionScope(
                source, target, deadline, networkExecutor, abortWorker);
        JdbcMetadataMigrationAttempt attempt = new JdbcMetadataMigrationAttempt(
                source, target, targetKind, deadline, connections, work, progress);
        ActiveExecution execution;
        synchronized (lifecycleLock) {
            if (closed || active != null) {
                throw timeoutFailure();
            }
            FutureTask<Void> submitted = new FutureTask<>(attempt::run, null);
            execution = new ActiveExecution(attempt, submitted);
            active = execution;
            try {
                worker.execute(submitted);
            } catch (RuntimeException unexpected) {
                active = null;
                submitted.cancel(false);
                throw timeoutFailure();
            } catch (Error fatal) {
                active = null;
                submitted.cancel(false);
                throw fatal;
            }
        }

        boolean callerInterrupted = false;
        try {
            boolean abandoned = false;
            try {
                long remaining = deadline.remainingNanos();
                if (remaining <= 0 || !attempt.awaitExit(remaining)) {
                    abandoned = stop(execution);
                }
            } catch (InterruptedException interrupted) {
                callerInterrupted = true;
                abandoned = stop(execution);
            }
            callerInterrupted |= attempt.awaitExitUninterruptibly();
            abandoned |= attempt.abandoned();
            if (abandoned) {
                attempt.closeInvalidatedConnections();
            }
            if (abandoned) {
                attempt.rethrowFatalOrOutcomeUnknown();
                throw timeoutFailure();
            }
            attempt.rethrowFailure();
        } finally {
            if (callerInterrupted) {
                Thread.currentThread().interrupt();
            }
            synchronized (lifecycleLock) {
                if (active == execution) {
                    active = null;
                }
            }
        }
    }

    /**
     * Stops an active copy and joins its abort and connection disposal.
     *
     * @throws IllegalStateException when invoked by the active copy worker or its progress callback
     */
    @Override
    public void close() {
        ActiveExecution execution;
        synchronized (lifecycleLock) {
            execution = active;
            if (execution != null && execution.attempt().isCurrentWorkerThread()) {
                throw new IllegalStateException("Migration executor cannot be closed by its copy worker");
            }
            closed = true;
        }
        boolean interrupted = false;
        try {
            if (execution != null) {
                stop(execution);
                interrupted = execution.attempt().awaitExitUninterruptibly();
                if (execution.attempt().abandoned()) {
                    execution.attempt().closeInvalidatedConnections();
                }
            }
        } finally {
            worker.shutdownNow();
            abortWorker.shutdownNow();
            if (interrupted) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private static boolean stop(ActiveExecution execution) {
        JdbcMetadataMigrationAttempt attempt = execution.attempt();
        JdbcMetadataMigrationAttempt.Abandonment abandonment = attempt.abandon();
        if (!abandonment.abandoned()) {
            if (attempt.abandoned()) {
                attempt.abortConnections();
            }
            return false;
        }
        execution.submitted().cancel(true);
        attempt.abortConnections();
        if (!abandonment.workerStarted()) {
            attempt.completeNeverStartedWorker();
        }
        return true;
    }

    private static MetadataMigrationException timeoutFailure() {
        return new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
    }

    private static ThreadPoolExecutor worker() {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
                0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>(),
                Thread.ofPlatform().daemon(true).name("metadata-migration-copy", 0).factory(),
                new ThreadPoolExecutor.AbortPolicy());
        executor.allowCoreThreadTimeOut(true);
        return executor;
    }

    private static ThreadPoolExecutor abortWorker() {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
                0, 2, 30, TimeUnit.SECONDS, new SynchronousQueue<>(),
                Thread.ofPlatform().daemon(true).name("metadata-migration-abort", 0).factory(),
                new ThreadPoolExecutor.AbortPolicy());
        executor.allowCoreThreadTimeOut(true);
        return executor;
    }

    @FunctionalInterface
    interface MigrationWork {
        void migrate(
                Connection source,
                Connection target,
                MetadataDatabaseKind targetKind,
                Duration timeout,
                MetadataMigrationProgressSink progress);
    }

    private record ActiveExecution(JdbcMetadataMigrationAttempt attempt, Future<?> submitted) {
    }
}
