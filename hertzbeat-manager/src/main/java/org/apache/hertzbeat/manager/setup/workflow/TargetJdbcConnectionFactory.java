/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.Connection;
import java.util.Arrays;
import java.util.Objects;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;

/** Owns one bounded target JDBC acquisition worker and any failed cleanup handle. */
final class TargetJdbcConnectionFactory implements AutoCloseable, TargetJdbcConnectionAttemptOwner {

    private final ThreadPoolExecutor worker;
    private final TargetJdbcCleanupLane cleanupLane;
    private final TargetJdbcConnector connector;
    private final TargetJdbcConnectionVerifier verifier;
    private final TargetJdbcResultWaiter resultWaiter;
    private TargetJdbcConnectionAttempt active;
    private Error lateFailure;
    private boolean closed;

    TargetJdbcConnectionFactory(Executor abortExecutor) {
        this(new TargetJdbcVendorConnector(), abortExecutor);
    }

    TargetJdbcConnectionFactory(TargetJdbcConnector connector, Executor abortExecutor) {
        this(newWorker("target-jdbc-acquisition"), newWorker("target-jdbc-cleanup"),
                abortExecutor, connector, new TargetJdbcConnectionVerifier(abortExecutor));
    }

    TargetJdbcConnectionFactory(
            ThreadPoolExecutor worker,
            ThreadPoolExecutor cleanupWorker,
            Executor abortExecutor,
            TargetJdbcConnector connector,
            TargetJdbcConnectionVerifier verifier) {
        this(worker, cleanupWorker, abortExecutor, connector, verifier, TargetJdbcResultWaiter.TIMED);
    }

    TargetJdbcConnectionFactory(
            ThreadPoolExecutor worker,
            ThreadPoolExecutor cleanupWorker,
            Executor abortExecutor,
            TargetJdbcConnector connector,
            TargetJdbcConnectionVerifier verifier,
            TargetJdbcResultWaiter resultWaiter) {
        this.worker = Objects.requireNonNull(worker, "worker");
        this.cleanupLane = new TargetJdbcCleanupLane(cleanupWorker, abortExecutor);
        this.connector = Objects.requireNonNull(connector, "connector");
        this.verifier = Objects.requireNonNull(verifier, "verifier");
        this.resultWaiter = Objects.requireNonNull(resultWaiter, "resultWaiter");
    }

    TargetJdbcConnectionLease acquire(
            MetadataDatabaseSettings settings,
            SecretValue borrowedPassword,
            JdbcMetadataMigrationDeadline deadline) {
        Objects.requireNonNull(settings, "settings");
        Objects.requireNonNull(borrowedPassword, "borrowedPassword");
        Objects.requireNonNull(deadline, "deadline");
        TargetJdbcUrl target = TargetJdbcUrl.parse(settings.kind(), settings.jdbcUrl());
        char[] attemptPassword = borrowedPassword.copy();
        TargetJdbcConnectionAttempt attempt = new TargetJdbcConnectionAttempt(
                this, connector, verifier, target, settings.username(),
                attemptPassword, deadline, resultWaiter);
        try {
            claim(attempt);
        } catch (RuntimeException | Error claimFailure) {
            Arrays.fill(attemptPassword, '\0');
            throw claimFailure;
        }
        try {
            worker.execute(attempt);
        } catch (RejectedExecutionException rejected) {
            Arrays.fill(attemptPassword, '\0');
            poison(null);
            finished(attempt);
            throw failure(TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
        } catch (RuntimeException submitFailure) {
            Arrays.fill(attemptPassword, '\0');
            poison(null);
            finished(attempt);
            throw failure(TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
        } catch (Error fatalSubmission) {
            Arrays.fill(attemptPassword, '\0');
            lateFatal(fatalSubmission, null);
            finished(attempt);
            throw fatalSubmission;
        }
        return attempt.await();
    }

    void retryCleanup(JdbcMetadataMigrationDeadline deadline) {
        cleanupLane.retry(deadline);
    }

    @Override
    public synchronized void close() {
        closed = true;
        if (active != null) {
            active.abandon(TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
        } else {
            cleanupLane.close();
        }
        worker.shutdownNow();
    }

    @Override
    public synchronized void poison(Connection connection) {
        cleanupLane.poison(connection);
    }

    @Override
    public void cleanupLate(Connection connection) {
        cleanupLane.cleanupLate(connection);
    }

    @Override
    public synchronized void lateFatal(Error failure, Connection connection) {
        cleanupLane.poison(connection);
        if (lateFailure == null) {
            lateFailure = failure;
        }
    }

    @Override
    public synchronized void finished(TargetJdbcConnectionAttempt attempt) {
        if (active == attempt) {
            active = null;
            if (closed) {
                cleanupLane.close();
            }
        }
    }

    private synchronized void claim(TargetJdbcConnectionAttempt attempt) {
        if (lateFailure != null) {
            throw lateFailure;
        }
        TargetJdbcConnectionErrorCode cleanupFailure = cleanupLane.acquisitionFailure();
        if (cleanupFailure != null) {
            throw failure(cleanupFailure);
        }
        if (closed) {
            throw failure(TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
        }
        if (active != null) {
            throw failure(TargetJdbcConnectionErrorCode.OPERATION_CONFLICT);
        }
        active = attempt;
    }

    private static TargetJdbcConnectionException failure(TargetJdbcConnectionErrorCode code) {
        return new TargetJdbcConnectionException(code);
    }

    private static ThreadPoolExecutor newWorker(String name) {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
                0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>(),
                Thread.ofPlatform().daemon(true).name(name, 0).factory(),
                new ThreadPoolExecutor.AbortPolicy());
        executor.allowCoreThreadTimeOut(true);
        return executor;
    }
}
