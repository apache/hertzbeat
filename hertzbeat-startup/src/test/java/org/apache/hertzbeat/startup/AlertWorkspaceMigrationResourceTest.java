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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import org.junit.jupiter.api.Test;

/** V200 and B200 contracts for persisted alert workspace ownership. */
class AlertWorkspaceMigrationResourceTest {

    private static final String START = "-- scope persisted alerts by workspace.";
    private static final String END = "-- add the agent gateway persistence model.";

    @Test
    void h2HistoricalMigrationBackfillsDefaultAndScopesBothUniqueKeys() throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:h2:mem:alert-workspace-migration")) {
            createLegacyTablesWithConstraints(connection);
            execute(connection, alertWorkspaceMigration("h2"));

            insertSingle(connection, "default", "same-fingerprint");
            insertSingle(connection, "team-b", "same-fingerprint");
            insertGroup(connection, "default", "same-group");
            insertGroup(connection, "team-b", "same-group");

            assertEquals(3, count(connection, "hzb_alert_single"));
            assertEquals(3, count(connection, "hzb_alert_group"));
            assertThrows(SQLException.class, () -> insertSingle(connection, "default", "same-fingerprint"));
            assertThrows(SQLException.class, () -> insertGroup(connection, "default", "same-group"));
        }
    }

    @Test
    void h2HistoricalMigrationReplacesStandaloneUniqueIndexes() throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:h2:mem:alert-workspace-index-migration")) {
            createLegacyTablesWithIndexes(connection);
            execute(connection, alertWorkspaceMigration("h2"));

            insertSingle(connection, "default", "same-fingerprint");
            insertSingle(connection, "team-b", "same-fingerprint");
            insertGroup(connection, "default", "same-group");
            insertGroup(connection, "team-b", "same-group");

            assertThrows(SQLException.class, () -> insertSingle(connection, "default", "same-fingerprint"));
            assertThrows(SQLException.class, () -> insertGroup(connection, "default", "same-group"));
        }
    }

    @Test
    void allV200MigrationsDeclareTheSameWorkspaceBoundary() throws Exception {
        for (String vendor : List.of("h2", "mysql", "postgresql")) {
            String sql = alertWorkspaceMigration(vendor);
            assertTrue(sql.contains("workspace_id varchar(128) not null default 'default'"), vendor);
            assertTrue(sql.contains("workspace_id, fingerprint"), vendor);
            assertTrue(sql.contains("workspace_id, group_key"), vendor);
            assertTrue(sql.contains("idx_alert_single_workspace"), vendor);
            assertTrue(sql.contains("idx_alert_group_workspace"), vendor);
        }
    }

    @Test
    void currentBaselinesDeclareTheSameWorkspaceBoundary() throws Exception {
        for (String vendor : List.of("mysql", "postgresql")) {
            String sql = resource("/db/migration/" + vendor + "/B200__current_schema.sql");
            assertTrue(sql.contains("workspace_id varchar(128) default 'default' not null"), vendor);
            assertTrue(sql.contains("unique (workspace_id, group_key)"), vendor);
            assertTrue(sql.contains("unique (workspace_id, fingerprint)"), vendor);
            assertTrue(sql.contains("idx_alert_single_workspace"), vendor);
            assertTrue(sql.contains("idx_alert_group_workspace"), vendor);
        }
    }

    @Test
    void alertAnalysisPolicyIsWorkspaceOwnedInEveryCurrentSchema() throws Exception {
        for (String vendor : List.of("h2", "mysql", "postgresql")) {
            String sql = resource("/db/migration/" + vendor + "/V200__create_entity_foundation.sql");
            assertTrue(sql.contains("hzb_alert_analysis_policy"), vendor);
            assertTrue(sql.contains("idx_alert_analysis_workspace_enabled"), vendor);
        }
        for (String vendor : List.of("mysql", "postgresql")) {
            String sql = resource("/db/migration/" + vendor + "/B200__current_schema.sql");
            assertTrue(sql.contains("hzb_alert_analysis_policy"), vendor);
            assertTrue(sql.contains("idx_alert_analysis_workspace_enabled"), vendor);
        }
    }

    private static void createLegacyTablesWithConstraints(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE hzb_alert_single (id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,"
                    + " fingerprint VARCHAR(2048), CONSTRAINT unique_fingerprint UNIQUE (fingerprint))");
            statement.execute("INSERT INTO hzb_alert_single(fingerprint) VALUES ('legacy-single')");
            statement.execute("CREATE TABLE hzb_alert_group (id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,"
                    + " group_key VARCHAR(2048), CONSTRAINT unique_group_key UNIQUE (group_key))");
            statement.execute("INSERT INTO hzb_alert_group(group_key) VALUES ('legacy-group')");
        }
    }

    private static void createLegacyTablesWithIndexes(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE hzb_alert_single (id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,"
                    + " fingerprint VARCHAR(2048))");
            statement.execute("CREATE UNIQUE INDEX unique_fingerprint ON hzb_alert_single(fingerprint)");
            statement.execute("INSERT INTO hzb_alert_single(fingerprint) VALUES ('legacy-single')");
            statement.execute("CREATE TABLE hzb_alert_group (id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,"
                    + " group_key VARCHAR(2048))");
            statement.execute("CREATE UNIQUE INDEX unique_group_key ON hzb_alert_group(group_key)");
            statement.execute("INSERT INTO hzb_alert_group(group_key) VALUES ('legacy-group')");
        }
    }

    private static void insertSingle(Connection connection, String workspaceId, String fingerprint)
            throws SQLException {
        try (var statement = connection.prepareStatement(
                "INSERT INTO hzb_alert_single(workspace_id, fingerprint) VALUES (?, ?)")) {
            statement.setString(1, workspaceId);
            statement.setString(2, fingerprint);
            statement.executeUpdate();
        }
    }

    private static void insertGroup(Connection connection, String workspaceId, String groupKey) throws SQLException {
        try (var statement = connection.prepareStatement(
                "INSERT INTO hzb_alert_group(workspace_id, group_key) VALUES (?, ?)")) {
            statement.setString(1, workspaceId);
            statement.setString(2, groupKey);
            statement.executeUpdate();
        }
    }

    private static int count(Connection connection, String table) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet rows = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            assertTrue(rows.next());
            return rows.getInt(1);
        }
    }

    private static String alertWorkspaceMigration(String vendor) throws Exception {
        String migration = resource("/db/migration/" + vendor + "/V200__create_entity_foundation.sql");
        int start = migration.indexOf(START);
        int end = migration.indexOf(END, start);
        assertTrue(start >= 0, vendor + " alert workspace migration start");
        assertTrue(end > start, vendor + " alert workspace migration end");
        return migration.substring(start, end);
    }

    private static String resource(String path) throws IOException {
        try (var input = AlertWorkspaceMigrationResourceTest.class.getResourceAsStream(path)) {
            assertNotNull(input, path);
            return new String(input.readAllBytes(), StandardCharsets.UTF_8).toLowerCase();
        }
    }

    private static void execute(Connection connection, String migration) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            for (String sql : migration.replaceAll("(?m)^--.*$", "").split(";")) {
                if (!sql.isBlank()) {
                    statement.execute(sql);
                }
            }
        }
    }
}
