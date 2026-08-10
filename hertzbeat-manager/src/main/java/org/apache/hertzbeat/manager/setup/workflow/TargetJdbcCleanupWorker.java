/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.LockSupport;

/** Submits exact cleanup work without turning a zero-queue worker handoff into a cleanup failure. */
final class TargetJdbcCleanupWorker {

    private static final long AVAILABILITY_POLL_NANOS = TimeUnit.MILLISECONDS.toNanos(1);

    private final ThreadPoolExecutor executor;

    TargetJdbcCleanupWorker(ThreadPoolExecutor executor) {
        this.executor = Objects.requireNonNull(executor, "executor");
    }

    void submit(TargetJdbcCleanupTask task, SubmissionFailure failure) {
        try {
            executor.execute(task);
        } catch (RuntimeException submissionFailure) {
            failure.failed(task, null);
        } catch (Error fatalSubmission) {
            failure.failed(task, fatalSubmission);
        }
    }

    void submitWhenAvailableAsync(TargetJdbcCleanupTask task, SubmissionFailure failure) {
        try {
            executor.execute(task);
        } catch (RejectedExecutionException transientRejection) {
            if (executor.isShutdown()) {
                failure.failed(task, null);
                return;
            }
            startHandoff(task, failure);
        } catch (RuntimeException submissionFailure) {
            failure.failed(task, null);
        } catch (Error fatalSubmission) {
            failure.failed(task, fatalSubmission);
        }
    }

    void submitWhenAvailable(
            TargetJdbcCleanupTask task,
            JdbcMetadataMigrationDeadline deadline,
            SubmissionFailure failure) {
        boolean interrupted = false;
        try {
            while (true) {
                if (deadline.remainingNanos() <= 0) {
                    failure.failed(task, null);
                    return;
                }
                try {
                    executor.execute(task);
                    return;
                } catch (RejectedExecutionException transientRejection) {
                    if (executor.isShutdown()) {
                        failure.failed(task, null);
                        return;
                    }
                    long remaining = deadline.remainingNanos();
                    if (remaining <= 0) {
                        failure.failed(task, null);
                        return;
                    }
                    LockSupport.parkNanos(Math.min(remaining, AVAILABILITY_POLL_NANOS));
                    if (Thread.interrupted()) {
                        interrupted = true;
                        failure.failed(task, null);
                        return;
                    }
                } catch (RuntimeException submissionFailure) {
                    failure.failed(task, null);
                    return;
                } catch (Error fatalSubmission) {
                    failure.failed(task, fatalSubmission);
                    return;
                }
            }
        } finally {
            if (interrupted) {
                Thread.currentThread().interrupt();
            }
        }
    }

    void shutdown() {
        executor.shutdown();
    }

    private void startHandoff(TargetJdbcCleanupTask task, SubmissionFailure failure) {
        try {
            Thread.ofPlatform()
                    .daemon(true)
                    .name("target-jdbc-cleanup-close-handoff")
                    .start(() -> awaitAvailability(task, failure));
        } catch (RuntimeException submissionFailure) {
            failure.failed(task, null);
        } catch (Error fatalSubmission) {
            failure.failed(task, fatalSubmission);
        }
    }

    private void awaitAvailability(TargetJdbcCleanupTask task, SubmissionFailure failure) {
        boolean interrupted = false;
        try {
            while (true) {
                try {
                    executor.execute(task);
                    return;
                } catch (RejectedExecutionException transientRejection) {
                    if (executor.isShutdown()) {
                        failure.failed(task, null);
                        return;
                    }
                    LockSupport.parkNanos(AVAILABILITY_POLL_NANOS);
                    if (Thread.interrupted()) {
                        interrupted = true;
                        failure.failed(task, null);
                        return;
                    }
                } catch (RuntimeException submissionFailure) {
                    failure.failed(task, null);
                    return;
                } catch (Error fatalSubmission) {
                    failure.failed(task, fatalSubmission);
                    return;
                }
            }
        } finally {
            if (interrupted) {
                Thread.currentThread().interrupt();
            }
        }
    }

    @FunctionalInterface
    interface SubmissionFailure {

        void failed(TargetJdbcCleanupTask task, Error fatal);
    }
}
