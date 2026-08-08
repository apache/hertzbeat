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
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Executes the compatibility and temporary CRUD statements for one session-owned candidate. */
final class JdbcMetadataProbeOperations {

    Optional<SetupErrorCode> validateCompatibility(Connection connection, MetadataDatabaseKind expected,
                                                    DeadlineGuard deadline) throws SQLException {
        deadline.activeDeadline();
        DatabaseMetaData metadata = connection.getMetaData();
        String product = metadata.getDatabaseProductName().toLowerCase(Locale.ROOT);
        boolean matches = switch (expected) {
            case H2 -> product.contains("h2");
            case MYSQL -> product.contains("mysql");
            case POSTGRESQL -> product.contains("postgresql");
        };
        if (!matches || !utf8Compatible(connection, expected, deadline)) {
            return Optional.of(SetupErrorCode.METADATA_SCHEMA_MISMATCH);
        }
        deadline.activeDeadline();
        try (ResultSet ignored = metadata.getSchemas()) {
            // Opening the schema projection verifies that metadata visibility is available.
        }
        return Optional.empty();
    }

    void executeCrudProbe(Connection connection, String table, DeadlineGuard deadline) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            execute(statement, "CREATE TABLE " + table
                    + " (probe_id INTEGER NOT NULL PRIMARY KEY, probe_value VARCHAR(32) NOT NULL)", deadline);
            executeUpdate(statement, "INSERT INTO " + table + " VALUES (1, 'created')", deadline);
            executeUpdate(statement,
                    "UPDATE " + table + " SET probe_value = 'updated' WHERE probe_id = 1", deadline);
            prepare(statement, deadline.activeDeadline());
            try (ResultSet result = statement.executeQuery("SELECT probe_value FROM " + table
                    + " WHERE probe_id = 1")) {
                if (!result.next() || !"updated".equals(result.getString(1))) {
                    throw new SQLException("Temporary probe value was not readable");
                }
            }
            executeUpdate(statement, "DELETE FROM " + table + " WHERE probe_id = 1", deadline);
            execute(statement, "DROP TABLE " + table, deadline);
        }
    }

    void dropIfExists(Connection connection, String table, DeadlineGuard deadline) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            execute(statement, "DROP TABLE IF EXISTS " + table, deadline);
        }
    }

    void configureConnection(Connection connection, long deadline) throws SQLException {
        connection.setNetworkTimeout(Runnable::run, timeoutMillis(deadline));
    }

    void rollback(Connection connection) {
        try {
            connection.rollback();
        } catch (SQLException ignored) {
            // Preserve the stable validation error.
        }
    }

    private boolean utf8Compatible(Connection connection, MetadataDatabaseKind kind,
                                   DeadlineGuard deadline) throws SQLException {
        String sql = switch (kind) {
            case MYSQL -> "SELECT @@character_set_database";
            case POSTGRESQL -> "SHOW server_encoding";
            case H2 -> null;
        };
        if (sql == null) {
            return true;
        }
        try (Statement statement = connection.createStatement()) {
            prepare(statement, deadline.activeDeadline());
            try (ResultSet result = statement.executeQuery(sql)) {
                return result.next() && result.getString(1).toLowerCase(Locale.ROOT).startsWith("utf8");
            }
        }
    }

    private void execute(Statement statement, String sql, DeadlineGuard deadline) throws SQLException {
        prepare(statement, deadline.activeDeadline());
        statement.execute(sql);
    }

    private void executeUpdate(Statement statement, String sql, DeadlineGuard deadline) throws SQLException {
        prepare(statement, deadline.activeDeadline());
        statement.executeUpdate(sql);
    }

    private void prepare(Statement statement, long deadline) throws SQLException {
        statement.setQueryTimeout(timeoutSeconds(deadline));
    }

    private int timeoutMillis(long deadline) throws SQLException {
        long remaining = remainingNanos(deadline);
        return Math.toIntExact(Math.min(Integer.MAX_VALUE,
                Math.max(1, TimeUnit.NANOSECONDS.toMillis(remaining))));
    }

    private int timeoutSeconds(long deadline) throws SQLException {
        long remaining = remainingNanos(deadline);
        long nanosPerSecond = TimeUnit.SECONDS.toNanos(1);
        long roundedUp = remaining / nanosPerSecond + (remaining % nanosPerSecond == 0 ? 0 : 1);
        return Math.toIntExact(Math.min(Integer.MAX_VALUE, roundedUp));
    }

    private long remainingNanos(long deadline) throws SQLException {
        long remaining = deadline - System.nanoTime();
        if (remaining <= 0) {
            throw new SQLException("Metadata probe deadline reached", "57014");
        }
        return remaining;
    }

    static long deadlineAfter(long durationNanos) {
        long now = System.nanoTime();
        return durationNanos > Long.MAX_VALUE - now ? Long.MAX_VALUE : now + durationNanos;
    }

    @FunctionalInterface
    interface DeadlineGuard {
        long activeDeadline() throws SQLException;
    }
}
