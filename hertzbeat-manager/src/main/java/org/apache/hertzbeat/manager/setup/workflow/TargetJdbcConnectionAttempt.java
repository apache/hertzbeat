/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.Objects;
import java.util.concurrent.CountDownLatch;

/** One deadline-bound connection attempt and its publication race. */
final class TargetJdbcConnectionAttempt implements Runnable {

    private final TargetJdbcConnectionAttemptOwner owner;
    private final TargetJdbcConnector connector;
    private final TargetJdbcConnectionVerifier verifier;
    private final TargetJdbcUrl target;
    private final String username;
    private final char[] password;
    private final JdbcMetadataMigrationDeadline deadline;
    private final TargetJdbcResultWaiter resultWaiter;
    private final CountDownLatch resultReady = new CountDownLatch(1);
    private State state = State.RUNNING;
    private TargetJdbcConnectionLease lease;
    private TargetJdbcConnectionException failure;
    private Error fatal;

    TargetJdbcConnectionAttempt(
            TargetJdbcConnectionAttemptOwner owner,
            TargetJdbcConnector connector,
            TargetJdbcConnectionVerifier verifier,
            TargetJdbcUrl target,
            String username,
            char[] password,
            JdbcMetadataMigrationDeadline deadline,
            TargetJdbcResultWaiter resultWaiter) {
        this.owner = Objects.requireNonNull(owner, "owner");
        this.connector = Objects.requireNonNull(connector, "connector");
        this.verifier = Objects.requireNonNull(verifier, "verifier");
        this.target = Objects.requireNonNull(target, "target");
        this.username = Objects.requireNonNull(username, "username");
        this.password = Objects.requireNonNull(password, "password");
        this.deadline = Objects.requireNonNull(deadline, "deadline");
        this.resultWaiter = Objects.requireNonNull(resultWaiter, "resultWaiter");
    }

    @Override
    public void run() {
        Connection connection = null;
        try {
            connection = connector.connect(target, username, password, deadline);
            if (abandoned()) {
                closeLate(connection);
                return;
            }
            TargetJdbcConnectionLease verified = verifier.verify(connection, target, username, deadline);
            if (!complete(verified, null, null)) {
                closeLate(connection);
            }
        } catch (TargetJdbcConnectionException connectionFailure) {
            if (connectionFailure.code() == TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED
                    && connection != null) {
                owner.poison(connection);
            }
            complete(null, connectionFailure, null);
        } catch (MetadataMigrationException deadlineFailure) {
            TargetJdbcConnectionErrorCode code = deadlineFailure.code() == MetadataMigrationErrorCode.TIMEOUT
                    ? TargetJdbcConnectionErrorCode.TIMEOUT
                    : TargetJdbcConnectionErrorCode.UNAVAILABLE;
            complete(null, failure(code), null);
        } catch (SQLException | RuntimeException unavailable) {
            complete(null, failure(TargetJdbcConnectionErrorCode.UNAVAILABLE), null);
        } catch (Error error) {
            if (complete(null, null, error)) {
                owner.poison(connection);
            } else {
                owner.lateFatal(error, connection);
            }
        } finally {
            Arrays.fill(password, '\0');
            try {
                owner.finished(this);
            } catch (RuntimeException lifecycleFailure) {
                recordLifecycleFailure(lifecycleFailure, connection);
            } catch (Error fatalLifecycle) {
                recordLifecycleFailure(fatalLifecycle, connection);
            } finally {
                publishResult();
            }
        }
    }

    TargetJdbcConnectionLease await() {
        boolean interrupted = false;
        try {
            long remaining = deadline.remainingNanos();
            if (remaining <= 0 || !resultWaiter.await(resultReady, remaining)) {
                if (abandon(TargetJdbcConnectionErrorCode.TIMEOUT)) {
                    throw failure(TargetJdbcConnectionErrorCode.TIMEOUT);
                }
                awaitPublication();
                return replay();
            }
        } catch (InterruptedException interruptedFailure) {
            interrupted = true;
            if (abandon(TargetJdbcConnectionErrorCode.TIMEOUT)) {
                throw failure(TargetJdbcConnectionErrorCode.TIMEOUT);
            }
            awaitPublication();
            return replay();
        } finally {
            if (interrupted) {
                Thread.currentThread().interrupt();
            }
        }
        return replay();
    }

    synchronized boolean abandon(TargetJdbcConnectionErrorCode code) {
        if (state == State.RUNNING) {
            failure = failure(code);
            state = State.ABANDONED;
            resultReady.countDown();
            return true;
        }
        return false;
    }

    private synchronized boolean abandoned() {
        return state == State.ABANDONED;
    }

    private synchronized boolean complete(
            TargetJdbcConnectionLease completedLease,
            TargetJdbcConnectionException completedFailure,
            Error completedFatal) {
        if (state != State.RUNNING) {
            return false;
        }
        lease = completedLease;
        failure = completedFailure;
        fatal = completedFatal;
        state = State.RESULT_READY;
        return true;
    }

    private void recordLifecycleFailure(Throwable lifecycleFailure, Connection connection) {
        boolean accepted;
        synchronized (this) {
            accepted = state == State.RESULT_READY;
            if (accepted) {
                lease = null;
                if (lifecycleFailure instanceof Error lifecycleFatal) {
                    fatal = lifecycleFatal;
                    failure = null;
                } else {
                    failure = failure(TargetJdbcConnectionErrorCode.UNAVAILABLE);
                    fatal = null;
                }
            }
        }
        if (accepted) {
            owner.poison(connection);
        } else if (lifecycleFailure instanceof Error lifecycleFatal) {
            owner.lateFatal(lifecycleFatal, connection);
        } else {
            owner.poison(connection);
        }
    }

    private synchronized void publishResult() {
        if (state == State.RESULT_READY) {
            resultReady.countDown();
        }
    }

    private void awaitPublication() {
        boolean interrupted = false;
        while (true) {
            try {
                resultReady.await();
                break;
            } catch (InterruptedException ignored) {
                interrupted = true;
            }
        }
        if (interrupted) {
            Thread.currentThread().interrupt();
        }
    }

    private synchronized TargetJdbcConnectionLease replay() {
        if (fatal != null) {
            throw fatal;
        }
        if (failure != null) {
            throw failure;
        }
        return lease;
    }

    private void closeLate(Connection connection) {
        owner.cleanupLate(connection);
    }

    private static TargetJdbcConnectionException failure(TargetJdbcConnectionErrorCode code) {
        return new TargetJdbcConnectionException(code);
    }

    private enum State {
        RUNNING,
        ABANDONED,
        RESULT_READY
    }
}
