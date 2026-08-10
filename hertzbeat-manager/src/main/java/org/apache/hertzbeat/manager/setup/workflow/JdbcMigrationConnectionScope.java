/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Objects;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;

/** Owns temporary network deadlines and fail-closed disposal for one connection pair. */
final class JdbcMigrationConnectionScope {

    private final Object lifecycleLock = new Object();
    private final Connection source;
    private final Connection target;
    private final JdbcMetadataMigrationDeadline deadline;
    private final Executor networkExecutor;
    private final ThreadPoolExecutor abortWorker;
    private CountDownLatch abortCompleted;
    private CountDownLatch closeCompleted;
    private Error abortFailure;
    private Error closeFailure;
    private int sourceNetworkTimeout;
    private int targetNetworkTimeout;
    private boolean configured;
    private boolean abortIssued;
    private boolean closeIssued;

    JdbcMigrationConnectionScope(
            Connection source,
            Connection target,
            JdbcMetadataMigrationDeadline deadline,
            Executor networkExecutor,
            ThreadPoolExecutor abortWorker) {
        this.source = Objects.requireNonNull(source, "source");
        this.target = Objects.requireNonNull(target, "target");
        this.deadline = Objects.requireNonNull(deadline, "deadline");
        this.networkExecutor = Objects.requireNonNull(networkExecutor, "networkExecutor");
        this.abortWorker = Objects.requireNonNull(abortWorker, "abortWorker");
    }

    void configure() throws SQLException {
        sourceNetworkTimeout = source.getNetworkTimeout();
        targetNetworkTimeout = target.getNetworkTimeout();
        source.setNetworkTimeout(networkExecutor, deadline.remainingMillis());
        target.setNetworkTimeout(networkExecutor, deadline.remainingMillis());
        configured = true;
    }

    boolean restore() {
        if (!configured) {
            return true;
        }
        RestoreResult sourceResult = restore(source, sourceNetworkTimeout);
        RestoreResult targetResult = restore(target, targetNetworkTimeout);
        Error failure = targetResult.failure() == null ? sourceResult.failure() : targetResult.failure();
        if (failure != null) {
            throw failure;
        }
        return sourceResult.restored() && targetResult.restored();
    }

    Error abort() {
        CountDownLatch completion;
        boolean start;
        synchronized (lifecycleLock) {
            start = !abortIssued;
            if (start) {
                abortIssued = true;
                abortCompleted = new CountDownLatch(2);
            }
            completion = abortCompleted;
        }
        if (start) {
            submitAbort(source, completion);
            submitAbort(target, completion);
        }
        awaitUninterruptibly(completion);
        synchronized (lifecycleLock) {
            return abortFailure;
        }
    }

    Error closeInvalidated() {
        CountDownLatch completion;
        boolean start;
        synchronized (lifecycleLock) {
            start = !closeIssued;
            if (start) {
                closeIssued = true;
                closeCompleted = new CountDownLatch(1);
            }
            completion = closeCompleted;
        }
        if (start) {
            Error sourceFailure = close(source);
            Error targetFailure = close(target);
            synchronized (lifecycleLock) {
                closeFailure = targetFailure == null ? sourceFailure : targetFailure;
            }
            completion.countDown();
        } else {
            awaitUninterruptibly(completion);
        }
        synchronized (lifecycleLock) {
            return closeFailure;
        }
    }

    private RestoreResult restore(Connection connection, int timeoutMillis) {
        try {
            connection.setNetworkTimeout(networkExecutor, timeoutMillis);
            return new RestoreResult(true, null);
        } catch (SQLException | RuntimeException failure) {
            return new RestoreResult(false, null);
        } catch (Error fatal) {
            return new RestoreResult(false, fatal);
        }
    }

    private void submitAbort(Connection connection, CountDownLatch completion) {
        try {
            abortWorker.execute(() -> {
                try {
                    connection.abort(networkExecutor);
                } catch (SQLException | RuntimeException failure) {
                    // The stable primary outcome must not retain driver or endpoint details.
                } catch (Error fatal) {
                    recordAbortFailure(fatal);
                } finally {
                    completion.countDown();
                }
            });
        } catch (RejectedExecutionException rejected) {
            completion.countDown();
        } catch (Error fatal) {
            recordAbortFailure(fatal);
            completion.countDown();
        }
    }

    private void recordAbortFailure(Error failure) {
        synchronized (lifecycleLock) {
            abortFailure = failure;
        }
    }

    private static Error close(Connection connection) {
        try {
            connection.close();
            return null;
        } catch (SQLException | RuntimeException failure) {
            return null;
        } catch (Error fatal) {
            return fatal;
        }
    }

    private static void awaitUninterruptibly(CountDownLatch latch) {
        boolean interrupted = false;
        while (latch.getCount() > 0) {
            try {
                latch.await();
            } catch (InterruptedException ignored) {
                interrupted = true;
            }
        }
        if (interrupted) {
            Thread.currentThread().interrupt();
        }
    }

    private record RestoreResult(boolean restored, Error failure) {
    }
}
