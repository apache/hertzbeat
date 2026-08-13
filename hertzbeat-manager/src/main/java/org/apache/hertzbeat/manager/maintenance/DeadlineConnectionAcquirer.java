/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import javax.sql.DataSource;

/** Bounded JDBC connection acquisition that closes every result arriving after its deadline. */
final class DeadlineConnectionAcquirer implements AutoCloseable {

    private final DataSource dataSource;
    private final ThreadPoolExecutor executor;

    DeadlineConnectionAcquirer(DataSource dataSource) {
        this.dataSource = dataSource;
        executor = new ThreadPoolExecutor(0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>(),
                Thread.ofPlatform().daemon(true).name("migration-source-connection", 0).factory());
    }

    Connection acquire(Duration timeout) {
        long timeoutNanos;
        try {
            timeoutNanos = timeout.toNanos();
        } catch (ArithmeticException exception) {
            throw MigrationMaintenanceException.invalidRequest();
        }
        Attempt attempt = new Attempt();
        try {
            executor.execute(() -> connect(attempt));
        } catch (RejectedExecutionException exception) {
            if (executor.isShutdown()) {
                throw MigrationMaintenanceException.sourceUnavailable();
            }
            throw MigrationMaintenanceException.timeout();
        }
        return attempt.await(timeoutNanos);
    }

    private void connect(Attempt attempt) {
        Connection acquired = null;
        Throwable failure = null;
        try {
            acquired = dataSource.getConnection();
        } catch (Throwable connectionFailure) {
            failure = connectionFailure;
        }
        attempt.complete(acquired, failure);
    }

    @Override
    public void close() {
        executor.shutdownNow();
    }

    private static final class Attempt {

        private final Object lock = new Object();
        private final CountDownLatch completed = new CountDownLatch(1);
        private Connection connection;
        private Throwable failure;
        private boolean abandoned;
        private boolean finished;

        private Connection await(long timeoutNanos) {
            try {
                if (completed.await(timeoutNanos, TimeUnit.NANOSECONDS)) {
                    return claimCompleted();
                }
                return abandonOrClaim();
            } catch (InterruptedException exception) {
                abandon();
                Thread.currentThread().interrupt();
                throw MigrationMaintenanceException.interrupted();
            }
        }

        private void complete(Connection acquired, Throwable acquiredFailure) {
            synchronized (lock) {
                if (abandoned) {
                    closeLate(acquired);
                } else {
                    connection = acquired;
                    failure = acquiredFailure;
                }
                finished = true;
            }
            completed.countDown();
        }

        private Connection abandonOrClaim() {
            synchronized (lock) {
                if (finished) {
                    return claimCompletedLocked();
                }
                abandoned = true;
            }
            throw MigrationMaintenanceException.timeout();
        }

        private void abandon() {
            synchronized (lock) {
                if (!finished) {
                    abandoned = true;
                } else {
                    closeLate(connection);
                    connection = null;
                }
            }
        }

        private Connection claimCompleted() {
            synchronized (lock) {
                return claimCompletedLocked();
            }
        }

        private Connection claimCompletedLocked() {
            if (failure instanceof Error error) {
                throw error;
            }
            if (failure != null || connection == null) {
                throw MigrationMaintenanceException.sourceUnavailable();
            }
            Connection claimed = connection;
            connection = null;
            return claimed;
        }

        private static void closeLate(Connection lateConnection) {
            if (lateConnection == null) {
                return;
            }
            try {
                lateConnection.close();
            } catch (SQLException | RuntimeException exception) {
                // A late connection never becomes a lease; its details remain private.
            }
        }
    }
}
