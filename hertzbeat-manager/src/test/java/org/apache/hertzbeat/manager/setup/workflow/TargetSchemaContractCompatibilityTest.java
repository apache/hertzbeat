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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Set;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;

class TargetSchemaContractCompatibilityTest {

    private static final Set<String> TABLES = Set.of("contract_parent", "contract_child");

    @Test
    void equivalentSchemaDoesNotDependOnJdbcPresentationMetadata() throws Exception {
        try (Connection first = schema("representation_a", "alpha", "1", "first", "asc", true);
                Connection second = schema("representation_b", "beta", "2", "second", "desc", false)) {
            assertThat(JdbcTargetSchemaState.capture(first, MetadataDatabaseKind.MYSQL, TABLES))
                    .isEqualTo(JdbcTargetSchemaState.capture(second, MetadataDatabaseKind.MYSQL, TABLES));
        }
    }

    @Test
    void recordedContractRejectsDuplicateHumanReadableDefinitions() throws Exception {
        try (Connection connection = schema("duplicate_contract", "stable", "1", "remarks", "asc", false);
                Statement statement = connection.createStatement()) {
            TargetSchemaContract contract = new TargetSchemaContract(MetadataDatabaseKind.MYSQL);
            contract.record(connection, TABLES);
            statement.execute("INSERT INTO flyway_schema_contract "
                    + "(contract_id, database_kind, definition, occurrences) "
                    + "SELECT 9999, database_kind, definition, occurrences FROM flyway_schema_contract "
                    + "FETCH FIRST 1 ROW ONLY");

            assertThatThrownBy(() -> contract.matches(connection, TABLES))
                    .isInstanceOf(SQLException.class)
                    .hasMessage("Target schema contract contains duplicate definitions");
        }
    }

    @Test
    void semanticStatePreservesIntegerWidth() throws Exception {
        try (Connection baseline = semanticSchema("semantic_baseline", "BIGINT", "");
                Connection narrowerInteger = semanticSchema("semantic_integer", "INTEGER", "")) {
            JdbcTargetSchemaState.SchemaState baselineState =
                    JdbcTargetSchemaState.capture(baseline, MetadataDatabaseKind.MYSQL, TABLES);

            assertThat(JdbcTargetSchemaState.capture(narrowerInteger, MetadataDatabaseKind.MYSQL, TABLES))
                    .isNotEqualTo(baselineState);
        }
    }

    @Test
    void semanticStatePreservesForeignKeyActions() throws Exception {
        try (Connection baseline = semanticSchema("foreign_key_baseline", "BIGINT", "");
                Connection cascadingDelete =
                        semanticSchema("foreign_key_cascade", "BIGINT", " ON DELETE CASCADE")) {
            JdbcTargetSchemaState.SchemaState baselineState =
                    JdbcTargetSchemaState.capture(baseline, MetadataDatabaseKind.MYSQL, TABLES);

            assertThat(JdbcTargetSchemaState.capture(cascadingDelete, MetadataDatabaseKind.MYSQL, TABLES))
                    .isNotEqualTo(baselineState);
        }
    }

    @Test
    void recordedContractRejectsRowsForAnotherDatabaseKind() throws Exception {
        try (Connection connection = schema("cross_kind_contract", "stable", "1", "remarks", "asc", false);
                Statement statement = connection.createStatement()) {
            TargetSchemaContract contract = new TargetSchemaContract(MetadataDatabaseKind.MYSQL);
            contract.record(connection, TABLES);
            statement.execute("INSERT INTO flyway_schema_contract "
                    + "(contract_id, database_kind, definition, occurrences) "
                    + "VALUES (9999, 'POSTGRESQL', 'table|intruder', 1)");

            assertThatThrownBy(() -> contract.matches(connection, TABLES))
                    .isInstanceOfSatisfying(SQLException.class,
                            exception -> assertThat(exception.getSQLState()).isEqualTo("55000"));
        }
    }

    private static Connection schema(
            String database,
            String objectSuffix,
            String defaultValue,
            String remarks,
            String indexOrder,
            boolean identity) throws Exception {
        Connection connection = DriverManager.getConnection(
                "jdbc:h2:mem:" + database + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "sa", "");
        try (Statement statement = connection.createStatement()) {
            String id = identity ? "BIGINT GENERATED BY DEFAULT AS IDENTITY" : "BIGINT";
            statement.execute("CREATE TABLE contract_parent (id " + id
                    + ", CONSTRAINT pk_parent_" + objectSuffix + " PRIMARY KEY (id))");
            statement.execute("CREATE TABLE contract_child (id BIGINT NOT NULL, parent_id BIGINT, "
                    + "label VARCHAR(64) NOT NULL DEFAULT '" + defaultValue + "', "
                    + "CONSTRAINT pk_child_" + objectSuffix + " PRIMARY KEY (id), "
                    + "CONSTRAINT fk_child_" + objectSuffix
                    + " FOREIGN KEY (parent_id) REFERENCES contract_parent(id))");
            statement.execute("COMMENT ON COLUMN contract_child.label IS '" + remarks + "'");
            statement.execute("CREATE INDEX ix_child_" + objectSuffix
                    + " ON contract_child(parent_id " + indexOrder + ", label " + indexOrder + ")");
        }
        return connection;
    }

    private static Connection semanticSchema(String database, String integerType, String foreignKeyAction)
            throws Exception {
        Connection connection = DriverManager.getConnection(
                "jdbc:h2:mem:" + database + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "sa", "");
        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE contract_parent (id BIGINT PRIMARY KEY)");
            statement.execute("CREATE TABLE contract_child (id BIGINT PRIMARY KEY, parent_id " + integerType
                    + ", CONSTRAINT fk_child FOREIGN KEY (parent_id) REFERENCES contract_parent(id)"
                    + foreignKeyAction + ")");
        }
        return connection;
    }
}
