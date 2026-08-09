/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Captures vendor-catalog objects that can change copy or identity behavior. */
final class JdbcTargetSchemaObjectState {

    private JdbcTargetSchemaObjectState() {
    }

    static void capture(
            Connection connection,
            MetadataDatabaseKind kind,
            Set<String> baselineTables,
            int queryTimeoutSeconds,
            FactSink facts) throws SQLException {
        captureChecks(connection, kind, baselineTables, queryTimeoutSeconds, facts);
        captureTriggers(connection, kind, baselineTables, queryTimeoutSeconds, facts);
        captureSequences(connection, kind, queryTimeoutSeconds, facts);
    }

    static void captureIdentityOwnership(
            Connection connection,
            MetadataDatabaseKind kind,
            String table,
            List<String> identities,
            int queryTimeoutSeconds,
            FactSink facts) throws SQLException {
        if (kind != MetadataDatabaseKind.POSTGRESQL) {
            return;
        }
        try (PreparedStatement statement = connection.prepareStatement("SELECT pg_get_serial_sequence(?, ?)")) {
            applyTimeout(statement, queryTimeoutSeconds);
            for (String column : identities) {
                statement.setString(1, table);
                statement.setString(2, column);
                try (ResultSet rows = statement.executeQuery()) {
                    if (!rows.next()) {
                        throw new SQLException("Target identity sequence ownership is absent", "55000");
                    }
                    String sequence = rows.getString(1);
                    if (sequence == null) {
                        throw new SQLException("Target identity sequence ownership is absent", "55000");
                    }
                    facts.add("identity-sequence", table, column, normalize(sequence));
                }
            }
        }
    }

    private static void captureChecks(
            Connection connection,
            MetadataDatabaseKind kind,
            Set<String> baselineTables,
            int queryTimeoutSeconds,
            FactSink facts) throws SQLException {
        String sql = kind == MetadataDatabaseKind.POSTGRESQL
                ? "SELECT relation.relname, pg_get_constraintdef(c.oid, false) "
                        + "FROM pg_constraint c "
                        + "JOIN pg_class relation ON relation.oid = c.conrelid "
                        + "JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace "
                        + "WHERE c.contype = 'c' AND namespace.nspname = current_schema()"
                : "SELECT table_constraint.table_name, check_constraint.check_clause "
                        + "FROM information_schema.table_constraints table_constraint "
                        + "JOIN information_schema.check_constraints check_constraint "
                        + "ON check_constraint.constraint_schema = table_constraint.constraint_schema "
                        + "AND check_constraint.constraint_name = table_constraint.constraint_name "
                        + "WHERE table_constraint.constraint_type = 'CHECK' "
                        + "AND table_constraint.table_schema = DATABASE()";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            applyTimeout(statement, queryTimeoutSeconds);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    String table = normalize(rows.getString(1));
                    if (baselineTables.contains(table)) {
                        facts.add("check", table, rows.getString(2).strip());
                    }
                }
            }
        }
    }

    private static void captureTriggers(
            Connection connection,
            MetadataDatabaseKind kind,
            Set<String> baselineTables,
            int queryTimeoutSeconds,
            FactSink facts) throws SQLException {
        String schemaPredicate = kind == MetadataDatabaseKind.POSTGRESQL
                ? "trigger_schema = current_schema()"
                : "trigger_schema = DATABASE()";
        String sql = "SELECT event_object_table, action_timing, event_manipulation, action_statement "
                + "FROM information_schema.triggers WHERE " + schemaPredicate;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            applyTimeout(statement, queryTimeoutSeconds);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    String table = normalize(rows.getString(1));
                    if (baselineTables.contains(table)) {
                        facts.add("trigger", table, normalize(rows.getString(2)),
                                normalize(rows.getString(3)), rows.getString(4).strip());
                    }
                }
            }
        }
    }

    private static void captureSequences(
            Connection connection,
            MetadataDatabaseKind kind,
            int queryTimeoutSeconds,
            FactSink facts) throws SQLException {
        if (kind != MetadataDatabaseKind.POSTGRESQL) {
            return;
        }
        String sql = "SELECT schemaname, sequencename, increment_by, min_value, max_value, "
                + "cache_size, cycle FROM pg_sequences WHERE schemaname = current_schema()";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            applyTimeout(statement, queryTimeoutSeconds);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    String qualifiedName = normalize(rows.getString(1)) + '.' + normalize(rows.getString(2));
                    facts.add(
                            "sequence",
                            qualifiedName,
                            "increment=" + rows.getLong(3),
                            "minimum=" + rows.getLong(4),
                            "maximum=" + rows.getLong(5),
                            "cache=" + rows.getLong(6),
                            "cycle=" + rows.getBoolean(7));
                }
            }
        }
    }

    private static void applyTimeout(PreparedStatement statement, int queryTimeoutSeconds) throws SQLException {
        if (queryTimeoutSeconds > 0) {
            statement.setQueryTimeout(queryTimeoutSeconds);
        }
    }

    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT);
    }

    @FunctionalInterface
    interface FactSink {

        void add(String... parts);
    }
}
