/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.Connection;
import java.util.ArrayDeque;
import java.util.Collections;
import java.util.Deque;
import java.util.IdentityHashMap;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/** Owns the exact provisional connection while bounded cleanup is pending. */
final class TargetJdbcCleanupLane implements AutoCloseable {

    private final TargetJdbcCleanupWorker worker;
    private final Executor abortExecutor;
    private final Deque<Connection> retained = new ArrayDeque<>();
    private final Set<Connection> retainedIdentities = Collections.newSetFromMap(new IdentityHashMap<>());
    private TargetJdbcCleanupTask active;
    private Error pendingFatal;
    private boolean poisoned;
    private boolean closing;

    TargetJdbcCleanupLane(ThreadPoolExecutor worker, Executor abortExecutor) {
        this.worker = new TargetJdbcCleanupWorker(worker);
        this.abortExecutor = Objects.requireNonNull(abortExecutor, "abortExecutor");
    }

    synchronized TargetJdbcConnectionErrorCode acquisitionFailure() {
        if (!retained.isEmpty() || active != null || pendingFatal != null) {
            return TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED;
        }
        return poisoned ? TargetJdbcConnectionErrorCode.FACTORY_CLOSED : null;
    }

    synchronized void poison(Connection connection) {
        poisoned = true;
        retainLocked(connection);
    }

    void cleanupLate(Connection connection) {
        TargetJdbcCleanupTask task;
        synchronized (this) {
            poisoned = true;
            retainLocked(connection);
            if (active != null || pendingFatal != null) {
                return;
            }
            task = newTask(firstRetainedLocked(), true);
            active = task;
        }
        submit(task);
    }

    void retry(JdbcMetadataMigrationDeadline deadline) {
        boolean attempted = false;
        while (true) {
            replayPendingFatal();
            TargetJdbcCleanupTask task = claimRetry(attempted, deadline);
            if (task == null) {
                return;
            }
            attempted = true;
            await(task, deadline);
            try {
                replay(task);
            } catch (TargetJdbcConnectionException cleanupRequired) {
                if (!task.abortFirst()) {
                    throw cleanupRequired;
                }
                continue;
            }
        }
    }

    private TargetJdbcCleanupTask claimRetry(
            boolean attempted,
            JdbcMetadataMigrationDeadline deadline) {
        TargetJdbcCleanupTask task;
        synchronized (this) {
            if (retained.isEmpty()) {
                if (!attempted) {
                    throw failure(TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
                }
                return null;
            }
            if (active != null) {
                return active;
            }
            task = newTask(firstRetainedLocked(), false);
            active = task;
        }
        submitRetry(task, deadline);
        return task;
    }

    private void submitRetry(
            TargetJdbcCleanupTask task,
            JdbcMetadataMigrationDeadline deadline) {
        worker.submitWhenAvailable(task, deadline, this::submissionFailed);
    }

    private static void await(TargetJdbcCleanupTask task, JdbcMetadataMigrationDeadline deadline) {
        boolean interrupted = false;
        try {
            long remaining = deadline.remainingNanos();
            if (remaining <= 0 || !task.completed().await(remaining, TimeUnit.NANOSECONDS)) {
                throw failure(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
            }
        } catch (InterruptedException interruptedFailure) {
            interrupted = true;
            throw failure(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
        } finally {
            if (interrupted) {
                Thread.currentThread().interrupt();
            }
        }
    }

    @Override
    public void close() {
        TargetJdbcCleanupTask task = null;
        synchronized (this) {
            closing = true;
            if (active == null && pendingFatal == null && !retained.isEmpty()) {
                task = newTask(firstRetainedLocked(), false);
                active = task;
            } else if (active == null && retained.isEmpty()) {
                worker.shutdown();
            }
        }
        if (task != null) {
            worker.submitWhenAvailableAsync(task, this::submissionFailed);
        }
    }

    private void submit(TargetJdbcCleanupTask task) {
        worker.submit(task, this::submissionFailed);
    }

    private void submissionFailed(TargetJdbcCleanupTask task, Error fatal) {
        submitNext(finish(task, false, fatal));
    }

    private TargetJdbcCleanupTask finish(TargetJdbcCleanupTask task, boolean success, Error fatal) {
        TargetJdbcCleanupTask next = null;
        boolean shutdown = false;
        synchronized (this) {
            if (active != task) {
                return null;
            }
            if (success) {
                success = removeFirstRetainedLocked(task.connection());
                if (!success) {
                    poisoned = true;
                }
            } else {
                poisoned = true;
            }
            if (fatal != null && pendingFatal == null) {
                pendingFatal = fatal;
            }
            active = null;
            task.complete(success, fatal);
            if (closing && success && pendingFatal == null && !retained.isEmpty()) {
                next = newTask(firstRetainedLocked(), false);
                active = next;
            } else if (closing && retained.isEmpty()) {
                shutdown = true;
            }
        }
        if (shutdown) {
            worker.shutdown();
        }
        return next;
    }

    private void submitNext(TargetJdbcCleanupTask next) {
        if (next != null) {
            submit(next);
        }
    }

    private synchronized void replayPendingFatal() {
        if (pendingFatal != null) {
            Error fatal = pendingFatal;
            pendingFatal = null;
            throw fatal;
        }
    }

    private void replay(TargetJdbcCleanupTask task) {
        if (task.fatal() != null) {
            synchronized (this) {
                if (pendingFatal == task.fatal()) {
                    pendingFatal = null;
                }
            }
        }
        task.replay();
    }

    private void retainLocked(Connection connection) {
        if (connection == null || !retainedIdentities.add(connection)) {
            return;
        }
        retained.addLast(connection);
    }

    private Connection firstRetainedLocked() {
        return retained.getFirst();
    }

    private boolean removeFirstRetainedLocked(Connection connection) {
        if (retained.peekFirst() != connection || !retainedIdentities.contains(connection)) {
            return false;
        }
        retained.removeFirst();
        return retainedIdentities.remove(connection);
    }

    private TargetJdbcCleanupTask newTask(Connection connection, boolean abortFirst) {
        return new TargetJdbcCleanupTask(connection, abortFirst, abortExecutor, this::finish);
    }

    private static TargetJdbcConnectionException failure(TargetJdbcConnectionErrorCode code) {
        return new TargetJdbcConnectionException(code);
    }

}
