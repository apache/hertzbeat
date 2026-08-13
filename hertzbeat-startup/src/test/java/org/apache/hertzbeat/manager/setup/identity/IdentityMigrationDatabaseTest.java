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

package org.apache.hertzbeat.manager.setup.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Executes identity migrations against the two production metadata database dialects. */
@EnabledIfSystemProperty(named = "hertzbeat.test.database-containers", matches = "true")
class IdentityMigrationDatabaseTest {
    private static final String DATABASE = "hertzbeat";
    private static final String USERNAME = "hertzbeat";
    private static final String PASSWORD = "test-only-password";

    @Test
    void mysqlMigrationExecutesAgainstRealDatabase() throws Exception {
        try (MySQLContainer database = new MySQLContainer("mysql:8.4")
                .withDatabaseName(DATABASE)
                .withUsername(USERNAME)
                .withPassword(PASSWORD)) {
            database.start();
            verifyMigration("mysql", database.getJdbcUrl());
        }
    }

    @Test
    void postgresqlMigrationExecutesAgainstRealDatabase() throws Exception {
        try (PostgreSQLContainer database = new PostgreSQLContainer("postgres:17.6")
                .withDatabaseName(DATABASE)
                .withUsername(USERNAME)
                .withPassword(PASSWORD)) {
            database.start();
            verifyMigration("postgresql", database.getJdbcUrl());
        }
    }

    private static void verifyMigration(String dialect, String jdbcUrl) throws Exception {
        try (Connection connection = DriverManager.getConnection(jdbcUrl, USERNAME, PASSWORD)) {
            IdentityMigrationResourceTest.executeMigration(
                    connection, IdentityMigrationResourceTest.migration(dialect));
            long accountId = insertAdministrator(connection, "owner", 1);
            assertTrue(accountId > 0);
            assertConstraintViolation(connection, accountInsert("owner", null));
            assertConstraintViolation(connection, accountInsert("other", 1));
            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate("INSERT INTO hzb_installation "
                        + "(id, installation_fingerprint, complete) VALUES (1, '" + "a".repeat(64) + "', TRUE)");
            }
            assertEquals(1, rowCount(connection, "hzb_account"));
            assertEquals(1, rowCount(connection, "hzb_installation"));
        }
    }

    private static long insertAdministrator(Connection connection, String username, int bootstrapSlot)
            throws SQLException {
        String sql = "INSERT INTO hzb_account "
                + "(username, password_hash, roles, credential_version, disabled, bootstrap_slot) "
                + "VALUES (?, 'hash', 'admin', 1, FALSE, ?)";
        try (PreparedStatement statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            statement.setString(1, username);
            statement.setInt(2, bootstrapSlot);
            statement.executeUpdate();
            try (ResultSet keys = statement.getGeneratedKeys()) {
                assertTrue(keys.next());
                return keys.getLong(1);
            }
        }
    }

    private static String accountInsert(String username, Integer bootstrapSlot) {
        String slot = bootstrapSlot == null ? "NULL" : bootstrapSlot.toString();
        return "INSERT INTO hzb_account "
                + "(username, password_hash, roles, credential_version, disabled, bootstrap_slot) VALUES ('"
                + username + "', 'hash', 'admin', 1, FALSE, " + slot + ")";
    }

    private static void assertConstraintViolation(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            try {
                statement.executeUpdate(sql);
            } catch (SQLException exception) {
                assertTrue(exception.getSQLState().startsWith("23"));
                return;
            }
        }
        throw new AssertionError("Expected a database constraint violation");
    }

    private static int rowCount(Connection connection, String table) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            assertTrue(result.next());
            return result.getInt(1);
        }
    }
}
