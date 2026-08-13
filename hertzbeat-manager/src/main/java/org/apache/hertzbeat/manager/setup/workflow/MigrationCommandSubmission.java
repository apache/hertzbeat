/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.LockSupport;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Bounded handoff to a zero-queue worker that may still be unwinding its previous task. */
final class MigrationCommandSubmission {

    private static final long AVAILABILITY_POLL_NANOS = TimeUnit.MILLISECONDS.toNanos(1);

    private MigrationCommandSubmission() {
    }

    static void submitWhenAvailable(
            ExecutorService worker, Runnable task, Duration timeout) {
        Objects.requireNonNull(worker, "worker");
        Objects.requireNonNull(task, "task");
        JdbcMetadataMigrationDeadline deadline = JdbcMetadataMigrationDeadline.start(
                timeout, System::nanoTime);
        boolean interrupted = false;
        try {
            while (deadline.remainingNanos() > 0) {
                try {
                    worker.execute(task);
                    return;
                } catch (RejectedExecutionException transientRejection) {
                    if (worker.isShutdown()) {
                        throw unavailable();
                    }
                    long remaining = deadline.remainingNanos();
                    if (remaining <= 0) {
                        throw unavailable();
                    }
                    LockSupport.parkNanos(Math.min(remaining, AVAILABILITY_POLL_NANOS));
                    if (Thread.interrupted()) {
                        interrupted = true;
                        throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
                    }
                }
            }
            throw unavailable();
        } finally {
            if (interrupted) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private static MigrationOperationStoreException unavailable() {
        return new MigrationOperationStoreException(SetupErrorCode.MIGRATION_UNAVAILABLE);
    }
}
