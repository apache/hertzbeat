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
import java.sql.Statement;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Persists and compares the human-readable semantic contract for a provisioned baseline. */
final class TargetSchemaContract {

    static final String TABLE = "flyway_schema_contract";
    private static final String CREATE_TABLE = "CREATE TABLE " + TABLE + " ("
            + "contract_id INT NOT NULL, database_kind VARCHAR(20) NOT NULL, definition TEXT NOT NULL, "
            + "occurrences INT NOT NULL, CONSTRAINT flyway_schema_contract_pk PRIMARY KEY (contract_id))";

    private final MetadataDatabaseKind kind;

    TargetSchemaContract(MetadataDatabaseKind kind) {
        this.kind = kind;
    }

    void record(Connection connection, Set<String> baselineTables) throws SQLException {
        record(connection, baselineTables, TargetSchemaJdbcBudget.none());
    }

    void record(
            Connection connection,
            Set<String> baselineTables,
            TargetSchemaJdbcBudget budget) throws SQLException {
        JdbcTargetSchemaState.SchemaState state =
                JdbcTargetSchemaState.capture(connection, kind, baselineTables, budget);
        try (Statement statement = connection.createStatement()) {
            budget.apply(statement);
            statement.execute(CREATE_TABLE);
        }
        String insert = "INSERT INTO " + TABLE
                + " (contract_id, database_kind, definition, occurrences) VALUES (?, ?, ?, ?)";
        try (PreparedStatement statement = connection.prepareStatement(insert)) {
            budget.apply(statement);
            int contractId = 1;
            for (Map.Entry<String, Integer> fact : state.facts().entrySet()) {
                budget.check();
                statement.setInt(1, contractId++);
                statement.setString(2, kind.name());
                statement.setString(3, fact.getKey());
                statement.setInt(4, fact.getValue());
                statement.addBatch();
            }
            budget.apply(statement);
            statement.executeBatch();
        }
    }

    boolean matches(Connection connection, Set<String> baselineTables) throws SQLException {
        return matches(connection, baselineTables, TargetSchemaJdbcBudget.none());
    }

    boolean matches(Connection connection, Set<String> baselineTables, int queryTimeoutSeconds) throws SQLException {
        return matches(connection, baselineTables, TargetSchemaJdbcBudget.fixed(queryTimeoutSeconds));
    }

    boolean matches(
            Connection connection,
            Set<String> baselineTables,
            TargetSchemaJdbcBudget budget) throws SQLException {
        return JdbcTargetSchemaState.capture(connection, kind, baselineTables, budget)
                .equals(readRecordedState(connection, budget));
    }

    private JdbcTargetSchemaState.SchemaState readRecordedState(
            Connection connection, TargetSchemaJdbcBudget budget) throws SQLException {
        Map<String, Integer> facts = new TreeMap<>();
        String select = "SELECT database_kind, definition, occurrences FROM " + TABLE;
        try (PreparedStatement statement = connection.prepareStatement(select)) {
            budget.apply(statement);
            try (ResultSet rows = statement.executeQuery()) {
                budget.check();
                while (rows.next()) {
                    budget.check();
                    if (!kind.name().equals(rows.getString("database_kind"))) {
                        throw new SQLException("Target schema contract contains another database kind", "55000");
                    }
                    String definition = rows.getString("definition");
                    if (facts.put(definition, rows.getInt("occurrences")) != null) {
                        throw new SQLException("Target schema contract contains duplicate definitions", "55000");
                    }
                }
                budget.check();
            }
        }
        return new JdbcTargetSchemaState.SchemaState(facts);
    }
}
