/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
    private boolean previousAttemptFinished;
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
        boolean handoffExpected;
        try {
            handoffExpected = claim(attempt);
        } catch (RuntimeException | Error claimFailure) {
            Arrays.fill(attemptPassword, '\0');
            throw claimFailure;
        }
        boolean submitted;
        try {
            submitted = submit(attempt, deadline, handoffExpected);
        } catch (InterruptedException interrupted) {
            Arrays.fill(attemptPassword, '\0');
            releaseUnsubmitted(attempt, handoffExpected);
            Thread.currentThread().interrupt();
            throw failure(TargetJdbcConnectionErrorCode.TIMEOUT);
        } catch (RejectedExecutionException rejected) {
            Arrays.fill(attemptPassword, '\0');
            poison(null);
            releaseUnsubmitted(attempt, false);
            throw failure(TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
        } catch (RuntimeException submitFailure) {
            Arrays.fill(attemptPassword, '\0');
            poison(null);
            releaseUnsubmitted(attempt, false);
            throw failure(TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
        } catch (Error fatalSubmission) {
            Arrays.fill(attemptPassword, '\0');
            lateFatal(fatalSubmission, null);
            releaseUnsubmitted(attempt, false);
            throw fatalSubmission;
        }
        if (!submitted) {
            Arrays.fill(attemptPassword, '\0');
            releaseUnsubmitted(attempt, handoffExpected);
            throw failure(TargetJdbcConnectionErrorCode.TIMEOUT);
        }
        return attempt.await();
    }

    void retryCleanup(JdbcMetadataMigrationDeadline deadline) {
        cleanupLane.retry(deadline);
    }

    TargetJdbcFailedAcquireSettlement settleFailedAcquire(
            JdbcMetadataMigrationDeadline deadline) {
        awaitInactive(deadline);
        TargetJdbcConnectionErrorCode cleanupState = cleanupLane.acquisitionFailure();
        if (cleanupState == TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED) {
            cleanupLane.retry(deadline);
        }
        synchronized (this) {
            if (lateFailure != null) {
                throw lateFailure;
            }
            cleanupState = cleanupLane.acquisitionFailure();
            if (closed || cleanupState == TargetJdbcConnectionErrorCode.FACTORY_CLOSED) {
                return TargetJdbcFailedAcquireSettlement.TERMINAL_CLOSED;
            }
            if (cleanupState != null) {
                throw failure(cleanupState);
            }
            return TargetJdbcFailedAcquireSettlement.REUSABLE;
        }
    }

    @Override
    public synchronized void close() {
        closed = true;
        notifyAll();
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
            previousAttemptFinished = true;
            active = null;
            notifyAll();
            if (closed) {
                cleanupLane.close();
            }
        }
    }

    private synchronized void awaitInactive(JdbcMetadataMigrationDeadline deadline) {
        boolean interrupted = false;
        try {
            while (active != null) {
                long remaining = deadline.remainingNanos();
                if (remaining <= 0) {
                    throw failure(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
                }
                try {
                    TimeUnit.NANOSECONDS.timedWait(this, remaining);
                } catch (InterruptedException ignored) {
                    interrupted = true;
                    throw failure(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
                }
            }
        } finally {
            if (interrupted) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private synchronized boolean claim(TargetJdbcConnectionAttempt attempt) {
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
        boolean handoffExpected = previousAttemptFinished;
        previousAttemptFinished = false;
        return handoffExpected;
    }

    /**
     * A finished attempt releases the logical slot before its executor worker becomes idle.
     * The admitted successor owns that slot while submitting with its original acquisition budget.
     * Always submit through execute: shutdownNow can drain even a SynchronousQueue timed offer.
     */
    private boolean submit(TargetJdbcConnectionAttempt attempt,
                           JdbcMetadataMigrationDeadline deadline, boolean handoffExpected) throws InterruptedException {
        try {
            worker.execute(attempt);
            return true;
        } catch (RejectedExecutionException rejection) {
            if (!handoffExpected || worker.isShutdown()
                    || !(worker.getQueue() instanceof SynchronousQueue<?>)) {
                throw rejection;
            }
        }
        while (true) {
            synchronized (this) {
                if (closed || worker.isShutdown()) {
                    throw new RejectedExecutionException();
                }
                long remaining = deadline.remainingNanos();
                if (remaining <= 0) {
                    return false;
                }
                // close notifies this condition; executor readiness is retried within the same budget.
                TimeUnit.NANOSECONDS.timedWait(this,
                        Math.min(remaining, TimeUnit.MILLISECONDS.toNanos(10)));
                if (closed || worker.isShutdown()) {
                    throw new RejectedExecutionException();
                }
                if (deadline.remainingNanos() <= 0) {
                    return false;
                }
            }
            try {
                worker.execute(attempt);
                return true;
            } catch (RejectedExecutionException rejection) {
                if (worker.isShutdown()) {
                    throw rejection;
                }
            }
        }
    }

    private synchronized void releaseUnsubmitted(
            TargetJdbcConnectionAttempt attempt, boolean handoffExpected) {
        if (active == attempt) {
            previousAttemptFinished = handoffExpected;
            active = null;
            notifyAll();
            if (closed) {
                cleanupLane.close();
            }
        }
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
