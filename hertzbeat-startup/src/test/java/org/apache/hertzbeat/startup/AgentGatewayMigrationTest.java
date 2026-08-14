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

package org.apache.hertzbeat.startup;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Locale;
import org.junit.jupiter.api.Test;

/** Contract for the Agent Gateway schema included in the 2.0 foundation. */
class AgentGatewayMigrationTest {

    private static final String[] AGENT_TABLES = {
            "hzb_agent_session",
            "hzb_agent_run",
            "hzb_agent_tool_call",
            "hzb_agent_transcript_entry",
            "hzb_agent_schedule",
            "hzb_alert_analysis_policy"
    };

    @Test
    void h2MigrationCreatesGatewayTablesWithoutDeletingExistingAiData() throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:h2:mem:agent-gateway-migration")) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("CREATE TABLE hzb_config (type VARCHAR(32) PRIMARY KEY, content VARCHAR(8192))");
                statement.execute("INSERT INTO hzb_config(type, content) VALUES ('provider', '{\"legacy\":true}')");
                statement.execute("CREATE TABLE hzb_ai_conversation (id BIGINT PRIMARY KEY)");
                statement.execute("CREATE TABLE hzb_ai_message (id BIGINT PRIMARY KEY)");
                statement.execute("CREATE TABLE hzb_sop_schedule (id BIGINT PRIMARY KEY)");
                statement.execute("INSERT INTO hzb_ai_conversation(id) VALUES (1)");

                for (String sql : gatewaySchema(migration("h2")).split(";")) {
                    if (!sql.isBlank()) {
                        statement.execute(sql);
                    }
                }

                assertEquals(1, count(statement, "SELECT COUNT(*) FROM hzb_config WHERE type = 'provider'"));
                assertEquals(1, count(statement, "SELECT COUNT(*) FROM hzb_ai_conversation"));
                for (String table : AGENT_TABLES) {
                    assertTrue(tableExists(statement, table), table);
                }
                assertTrue(columnExists(statement, "hzb_agent_run", "target_context_json"));
                assertTrue(columnExists(statement, "hzb_agent_run", "entry_type"));
                assertTrue(columnExists(statement, "hzb_agent_session", "origin_entry_type"));
            }
        }
    }

    @Test
    void databaseMigrationsAreAdditiveAcrossSupportedVendors() throws IOException {
        for (String database : new String[] {"h2", "mysql", "postgresql"}) {
            String sql = migration(database).toLowerCase(Locale.ROOT);
            assertFalse(sql.contains("drop table"), database);
            assertFalse(sql.contains("delete from"), database);
            for (String table : AGENT_TABLES) {
                assertTrue(sql.contains("create table") && sql.contains(table), database + ":" + table);
            }
            assertTrue(sql.contains("target_context_json"), database);
        }
    }

    private int count(Statement statement, String sql) throws Exception {
        try (ResultSet rows = statement.executeQuery(sql)) {
            assertTrue(rows.next());
            return rows.getInt(1);
        }
    }

    private boolean tableExists(Statement statement, String table) throws Exception {
        try (ResultSet rows = statement.executeQuery("""
                SELECT COUNT(*)
                  FROM INFORMATION_SCHEMA.TABLES
                 WHERE TABLE_NAME = UPPER('%s')
                """.formatted(table))) {
            assertTrue(rows.next());
            return rows.getInt(1) == 1;
        }
    }

    private boolean columnExists(Statement statement, String table, String column) throws Exception {
        try (ResultSet rows = statement.executeQuery("""
                SELECT COUNT(*)
                  FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_NAME = UPPER('%s')
                   AND COLUMN_NAME = UPPER('%s')
                """.formatted(table, column))) {
            assertTrue(rows.next());
            return rows.getInt(1) == 1;
        }
    }

    private String migration(String database) throws IOException {
        String path = "/db/migration/" + database + "/V200__create_entity_foundation.sql";
        try (var input = getClass().getResourceAsStream(path)) {
            assertNotNull(input, path);
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private String gatewaySchema(String migration) {
        int start = migration.indexOf("CREATE TABLE IF NOT EXISTS hzb_agent_session");
        int end = migration.indexOf("ALTER TABLE hzb_config ALTER COLUMN content CLOB", start);
        assertTrue(start >= 0, "agent session schema");
        assertTrue(end > start, "agent gateway schema boundary");
        return migration.substring(start, end);
    }
}
