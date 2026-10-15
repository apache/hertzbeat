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
import java.sql.SQLException;
import java.time.Duration;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Owns the deadline, cancellation, connection, candidate, and cleanup lifecycle of one probe. */
final class JdbcMetadataProbeSession {
    private static final String TABLE_PREFIX = "HZB_SETUP_PROBE_";
    private static final Optional<SetupErrorCode> CONNECTION_FAILED =
            Optional.of(SetupErrorCode.METADATA_CONNECTION_FAILED);
    private final Object stateLock = new Object();
    private final MetadataConnectionProbe.Request request;
    private final long timeoutNanos;
    private final ThreadPoolExecutor executor;
    private final JdbcMetadataConnectionProbe.JdbcConnector connector;
    private final JdbcMetadataProbeOperations operations = new JdbcMetadataProbeOperations();
    private final JdbcMetadataProbeCleanup cleanup;
    private final long deadlineNanos;
    private boolean cancelled;
    private String candidateTable;
    private boolean candidateCleanupConfirmed;

    JdbcMetadataProbeSession(MetadataConnectionProbe.Request request, Duration timeout,
                             ThreadPoolExecutor executor, Executor cleanupExecutor,
                             JdbcMetadataConnectionProbe.JdbcConnector connector) {
        this.request = request;
        this.timeoutNanos = Math.max(1, timeout.toNanos());
        this.executor = executor;
        this.connector = connector;
        this.cleanup = new JdbcMetadataProbeCleanup(request, timeoutNanos, cleanupExecutor, connector);
        this.deadlineNanos = JdbcMetadataProbeOperations.deadlineAfter(timeoutNanos);
    }

    Optional<SetupErrorCode> probe() {
        Future<Optional<SetupErrorCode>> submitted;
        try {
            submitted = executor.submit(this::execute);
        } catch (RejectedExecutionException overload) {
            return CONNECTION_FAILED;
        }
        try {
            return submitted.get(timeoutMillis(), TimeUnit.MILLISECONDS);
        } catch (InterruptedException failure) {
            cancel(submitted);
            Thread.currentThread().interrupt();
            return CONNECTION_FAILED;
        } catch (ExecutionException | TimeoutException failure) {
            cancel(submitted);
            return CONNECTION_FAILED;
        }
    }

    private Optional<SetupErrorCode> execute() {
        char[] password = request.password().copy();
        try {
            return validatePrimary(password);
        } finally {
            Thread.interrupted();
            scheduleCleanup(password);
            Arrays.fill(password, '\0');
        }
    }

    private Optional<SetupErrorCode> validatePrimary(char[] password) {
        Connection connection = null;
        try {
            connection = connector.connect(request.jdbcUrl(), request.username(), password);
            if (!acceptPrimary()) {
                close(connection);
                return CONNECTION_FAILED;
            }
            Connection claimed = connection;
            try (claimed) {
                operations.configureConnection(claimed, activeDeadline());
                Optional<SetupErrorCode> compatibility = operations.validateCompatibility(
                        claimed, request.kind(), this::activeDeadline);
                return compatibility.isPresent() ? compatibility : validatePrivileges(claimed);
            }
        } catch (SQLException | RuntimeException failure) {
            return CONNECTION_FAILED;
        }
    }

    private Optional<SetupErrorCode> validatePrivileges(Connection connection) {
        try {
            connection.setAutoCommit(false);
            String table = registerCandidate();
            // MySQL DDL can commit implicitly, so the exact candidate is owned before CREATE is sent.
            operations.executeCrudProbe(connection, table, this::activeDeadline);
            connection.commit();
            confirmCandidateCleanup(table);
            return Optional.empty();
        } catch (SQLException failure) {
            operations.rollback(connection);
            dropOnPrimary(connection);
            return Optional.of(isStopped() ? SetupErrorCode.METADATA_CONNECTION_FAILED
                    : JdbcMetadataProbeFailureClassifier.classify(failure));
        }
    }

    private void dropOnPrimary(Connection connection) {
        String table = candidateNeedingCleanup();
        if (table == null || isStopped()) {
            return;
        }
        try {
            operations.dropIfExists(connection, table, this::activeDeadline);
            connection.commit();
            confirmCandidateCleanup(table);
        } catch (SQLException ignored) {
            // Independent cleanup runs after the primary connection exits.
        }
    }

    private void scheduleCleanup(char[] password) {
        String table = candidateNeedingCleanup();
        if (table != null) {
            cleanup.schedule(table, password, () -> confirmCandidateCleanup(table));
        }
    }

    private void cancel(Future<Optional<SetupErrorCode>> submitted) {
        synchronized (stateLock) {
            cancelled = true;
        }
        submitted.cancel(true);
    }

    private boolean acceptPrimary() {
        synchronized (stateLock) {
            return !stoppedLocked();
        }
    }

    private String registerCandidate() throws SQLException {
        synchronized (stateLock) {
            if (stoppedLocked()) {
                throw deadlineFailure();
            }
            candidateTable = TABLE_PREFIX + UUID.randomUUID().toString().replace("-", "");
            return candidateTable;
        }
    }

    private String candidateNeedingCleanup() {
        synchronized (stateLock) {
            return candidateCleanupConfirmed ? null : candidateTable;
        }
    }

    private void confirmCandidateCleanup(String table) {
        synchronized (stateLock) {
            if (table.equals(candidateTable)) {
                candidateCleanupConfirmed = true;
            }
        }
    }

    private boolean isStopped() {
        synchronized (stateLock) {
            return stoppedLocked();
        }
    }

    private boolean stoppedLocked() {
        return cancelled || System.nanoTime() >= deadlineNanos;
    }

    private long activeDeadline() throws SQLException {
        synchronized (stateLock) {
            if (stoppedLocked()) {
                throw deadlineFailure();
            }
            return deadlineNanos;
        }
    }

    private long timeoutMillis() {
        return Math.max(1, TimeUnit.NANOSECONDS.toMillis(timeoutNanos));
    }

    private static SQLException deadlineFailure() {
        return new SQLException("Metadata probe deadline reached", "57014");
    }

    private static void close(Connection connection) {
        if (connection != null) {
            try {
                connection.close();
            } catch (SQLException ignored) {
                // Preserve the stable timeout or interruption error.
            }
        }
    }
}
