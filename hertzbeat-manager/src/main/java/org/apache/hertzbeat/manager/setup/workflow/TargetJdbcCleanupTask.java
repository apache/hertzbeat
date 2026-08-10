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

/** Executes one exact provisional connection cleanup without leaking driver diagnostics. */
final class TargetJdbcCleanupTask implements Runnable {

    private final Connection connection;
    private final boolean abortFirst;
    private final Executor abortExecutor;
    private final Completion completion;
    private final CountDownLatch completed = new CountDownLatch(1);
    private boolean success;
    private Error fatal;

    TargetJdbcCleanupTask(
            Connection connection,
            boolean abortFirst,
            Executor abortExecutor,
            Completion completion) {
        this.connection = Objects.requireNonNull(connection, "connection");
        this.abortFirst = abortFirst;
        this.abortExecutor = Objects.requireNonNull(abortExecutor, "abortExecutor");
        this.completion = Objects.requireNonNull(completion, "completion");
    }

    @Override
    public void run() {
        TargetJdbcCleanupTask task = this;
        while (task != null) {
            task = task.runOnce();
        }
    }

    private TargetJdbcCleanupTask runOnce() {
        boolean interrupted = Thread.interrupted();
        Error cleanupFatal = null;
        boolean closed = false;
        TargetJdbcCleanupTask next = null;
        try {
            if (abortFirst) {
                try {
                    connection.abort(abortExecutor);
                } catch (SQLException | RuntimeException ignored) {
                    // Exact close remains mandatory after an abort failure.
                } finally {
                    interrupted |= Thread.interrupted();
                }
            }
            connection.close();
            closed = true;
        } catch (SQLException | RuntimeException cleanupFailure) {
            // Stable cleanup-required state contains no driver diagnostic.
        } catch (Error fatalCleanup) {
            cleanupFatal = fatalCleanup;
        } finally {
            interrupted |= Thread.interrupted();
            try {
                next = completion.finished(this, closed, cleanupFatal);
            } finally {
                if (interrupted) {
                    Thread.currentThread().interrupt();
                }
            }
        }
        return next;
    }

    Connection connection() {
        return connection;
    }

    boolean abortFirst() {
        return abortFirst;
    }

    CountDownLatch completed() {
        return completed;
    }

    Error fatal() {
        return fatal;
    }

    void complete(boolean completedSuccessfully, Error completedFatal) {
        success = completedSuccessfully;
        fatal = completedFatal;
        completed.countDown();
    }

    void replay() {
        if (fatal != null) {
            throw fatal;
        }
        if (!success) {
            throw new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
        }
    }

    @FunctionalInterface
    interface Completion {

        TargetJdbcCleanupTask finished(TargetJdbcCleanupTask task, boolean success, Error fatal);
    }
}
