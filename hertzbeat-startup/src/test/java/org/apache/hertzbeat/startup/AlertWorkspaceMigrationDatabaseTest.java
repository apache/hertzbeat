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

package org.apache.hertzbeat.startup;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.workflow.FlywayTargetSchemaProvisioner;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Real MySQL and PostgreSQL proof for the fresh B200 alert workspace boundary. */
@EnabledIfSystemProperty(named = "hertzbeat.test.database-containers", matches = "true")
class AlertWorkspaceMigrationDatabaseTest {

    private static final String DATABASE = "hertzbeat";
    private static final String USERNAME = "hertzbeat";
    private static final String PASSWORD = "test-only-password";

    @Test
    void mysqlFreshBaselineScopesAlertIdentityByWorkspace() throws Exception {
        try (MySQLContainer database = new MySQLContainer("mysql:8.4")
                .withDatabaseName(DATABASE)
                .withUsername(USERNAME)
                .withPassword(PASSWORD)
                .withCommand("--lower-case-table-names=1")) {
            database.start();
            proveBoundary(database.getJdbcUrl(), MetadataDatabaseKind.MYSQL);
        }
    }

    @Test
    void postgresqlFreshBaselineScopesAlertIdentityByWorkspace() throws Exception {
        try (PostgreSQLContainer database = new PostgreSQLContainer("postgres:17.6")
                .withDatabaseName(DATABASE)
                .withUsername(USERNAME)
                .withPassword(PASSWORD)) {
            database.start();
            proveBoundary(database.getJdbcUrl(), MetadataDatabaseKind.POSTGRESQL);
        }
    }

    private static void proveBoundary(String jdbcUrl, MetadataDatabaseKind kind) throws Exception {
        new FlywayTargetSchemaProvisioner().provision(
                new MetadataDatabaseConfiguration(kind, jdbcUrl, USERNAME, PASSWORD));
        try (Connection connection = DriverManager.getConnection(jdbcUrl, USERNAME, PASSWORD)) {
            insertSingle(connection, "team-a", "same-fingerprint");
            insertSingle(connection, "team-b", "same-fingerprint");
            insertGroup(connection, "team-a", "same-group");
            insertGroup(connection, "team-b", "same-group");
            insertPolicy(connection, "team-a");
            assertThrows(SQLException.class,
                    () -> insertSingle(connection, "team-a", "same-fingerprint"));
            assertThrows(SQLException.class,
                    () -> insertGroup(connection, "team-a", "same-group"));
            assertEquals(2, count(connection, "hzb_alert_single"));
            assertEquals(2, count(connection, "hzb_alert_group"));
            assertEquals(1, count(connection, "hzb_alert_analysis_policy"));
        }
    }

    private static void insertSingle(Connection connection, String workspace, String fingerprint)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO hzb_alert_single(workspace_id, fingerprint) VALUES (?, ?)")) {
            statement.setString(1, workspace);
            statement.setString(2, fingerprint);
            statement.executeUpdate();
        }
    }

    private static void insertGroup(Connection connection, String workspace, String groupKey)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO hzb_alert_group(workspace_id, group_key) VALUES (?, ?)")) {
            statement.setString(1, workspace);
            statement.setString(2, groupKey);
            statement.executeUpdate();
        }
    }

    private static void insertPolicy(Connection connection, String workspace) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO hzb_alert_analysis_policy"
                        + "(workspace_id, name, enabled, match_labels, group_by_labels, window_seconds,"
                        + " minimum_alert_count, cooldown_seconds) VALUES (?, 'policy', true, '{}', '[]', 300, 2, 1800)")) {
            statement.setString(1, workspace);
            statement.executeUpdate();
        }
    }

    private static int count(Connection connection, String table) throws SQLException {
        try (Statement statement = connection.createStatement();
                var rows = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            rows.next();
            return rows.getInt(1);
        }
    }
}
