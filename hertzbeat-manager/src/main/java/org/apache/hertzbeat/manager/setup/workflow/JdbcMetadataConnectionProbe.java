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
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Bounded JDBC connection, dialect/charset, schema access, and temporary DDL/DML probe. */
public final class JdbcMetadataConnectionProbe implements MetadataConnectionProbe {
    private static final int MAX_CONCURRENT_PROBES = 2;
    private static final int MAX_QUEUED_PROBES = 4;
    private static final ThreadPoolExecutor SHARED_EXECUTOR = new ThreadPoolExecutor(
            MAX_CONCURRENT_PROBES, MAX_CONCURRENT_PROBES, 0L, TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(MAX_QUEUED_PROBES), task -> {
                Thread thread = new Thread(task, "setup-metadata-probe");
                thread.setDaemon(true);
                return thread;
            }, new ThreadPoolExecutor.AbortPolicy());
    private final Duration timeout;
    private final ThreadPoolExecutor executor;
    private final JdbcConnector connector;

    public JdbcMetadataConnectionProbe(Duration timeout) {
        this(timeout, SHARED_EXECUTOR, (url, username, password) ->
                DriverManager.getConnection(url, username, new String(password)));
    }

    JdbcMetadataConnectionProbe(Duration timeout, ThreadPoolExecutor executor, JdbcConnector connector) {
        this.timeout = timeout;
        this.executor = executor;
        this.connector = connector;
    }

    @Override
    public Optional<SetupErrorCode> probe(MetadataConnectionProbe.Request configuration) {
        AtomicReference<Connection> activeConnection = new AtomicReference<>();
        Future<Optional<SetupErrorCode>> future;
        try {
            future = executor.submit(() -> validate(configuration, activeConnection));
        } catch (RejectedExecutionException overload) {
            return Optional.of(SetupErrorCode.METADATA_CONNECTION_FAILED);
        }
        try {
            return future.get(timeout.toMillis(), TimeUnit.MILLISECONDS);
        } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
            return Optional.of(SetupErrorCode.METADATA_CONNECTION_FAILED);
        } catch (ExecutionException | TimeoutException failure) {
            future.cancel(true);
            close(activeConnection.get());
            return Optional.of(SetupErrorCode.METADATA_CONNECTION_FAILED);
        }
    }

    private Optional<SetupErrorCode> validate(MetadataConnectionProbe.Request configuration,
                                               AtomicReference<Connection> activeConnection) {
        char[] password = configuration.password().copy();
        try (Connection connection = connector.connect(configuration.jdbcUrl(),
                configuration.username(), password)) {
            activeConnection.set(connection);
            connection.setNetworkTimeout(Runnable::run, Math.toIntExact(timeout.toMillis()));
            Optional<SetupErrorCode> compatibility = validateCompatibility(connection, configuration.kind());
            if (compatibility.isPresent()) {
                return compatibility;
            }
            return validatePrivileges(connection);
        } catch (SQLException | RuntimeException failure) {
            return Optional.of(SetupErrorCode.METADATA_CONNECTION_FAILED);
        } finally {
            Arrays.fill(password, '\0');
            activeConnection.set(null);
        }
    }

    private Optional<SetupErrorCode> validateCompatibility(Connection connection,
                                                            MetadataDatabaseKind expected) throws SQLException {
        DatabaseMetaData metadata = connection.getMetaData();
        String product = metadata.getDatabaseProductName().toLowerCase(Locale.ROOT);
        boolean matches = switch (expected) {
            case H2 -> product.contains("h2");
            case MYSQL -> product.contains("mysql");
            case POSTGRESQL -> product.contains("postgresql");
        };
        if (!matches || !utf8Compatible(connection, expected)) {
            return Optional.of(SetupErrorCode.METADATA_SCHEMA_MISMATCH);
        }
        try (ResultSet ignored = metadata.getSchemas()) {
            // Opening the schema projection verifies that metadata visibility is available.
        }
        return Optional.empty();
    }

    private boolean utf8Compatible(Connection connection, MetadataDatabaseKind kind) throws SQLException {
        String sql = switch (kind) {
            case MYSQL -> "SELECT @@character_set_database";
            case POSTGRESQL -> "SHOW server_encoding";
            case H2 -> null;
        };
        if (sql == null) {
            return true;
        }
        try (Statement statement = connection.createStatement()) {
            statement.setQueryTimeout(Math.max(1, Math.toIntExact(timeout.toSeconds())));
            try (ResultSet result = statement.executeQuery(sql)) {
                return result.next() && result.getString(1).toLowerCase(Locale.ROOT).startsWith("utf8");
            }
        }
    }

    Optional<SetupErrorCode> validatePrivileges(Connection connection) {
        String table = "HZB_SETUP_PROBE_" + UUID.randomUUID().toString().replace("-", "");
        boolean created = false;
        try {
            connection.setAutoCommit(false);
            try (Statement statement = connection.createStatement()) {
                statement.setQueryTimeout(Math.max(1, Math.toIntExact(timeout.toSeconds())));
                statement.execute("CREATE TABLE " + table
                        + " (probe_id INTEGER NOT NULL PRIMARY KEY, probe_value VARCHAR(32) NOT NULL)");
                created = true;
                statement.executeUpdate("INSERT INTO " + table + " VALUES (1, 'created')");
                statement.executeUpdate("UPDATE " + table + " SET probe_value = 'updated' WHERE probe_id = 1");
                try (ResultSet result = statement.executeQuery("SELECT probe_value FROM " + table
                        + " WHERE probe_id = 1")) {
                    if (!result.next() || !"updated".equals(result.getString(1))) {
                        throw new SQLException("Temporary probe value was not readable");
                    }
                }
                statement.executeUpdate("DELETE FROM " + table + " WHERE probe_id = 1");
                statement.execute("DROP TABLE " + table);
                created = false;
            }
            connection.commit();
            return Optional.empty();
        } catch (SQLException failure) {
            rollback(connection);
            if (created) {
                drop(connection, table);
            }
            return Optional.of(SetupErrorCode.METADATA_INSUFFICIENT_PRIVILEGES);
        }
    }

    private static boolean drop(Connection connection, String table) {
        try (Statement statement = connection.createStatement()) {
            statement.execute("DROP TABLE " + table);
            connection.commit();
            return true;
        } catch (SQLException ignored) {
            return false;
        }
    }

    private static void rollback(Connection connection) {
        try {
            connection.rollback();
        } catch (SQLException ignored) {
            // Preserve the stable validation error.
        }
    }

    private static void close(Connection connection) {
        if (connection != null) {
            try {
                connection.close();
            } catch (SQLException ignored) {
                // Preserve the stable timeout error.
            }
        }
    }

    @FunctionalInterface
    interface JdbcConnector {
        Connection connect(String url, String username, char[] password) throws SQLException;
    }
}
