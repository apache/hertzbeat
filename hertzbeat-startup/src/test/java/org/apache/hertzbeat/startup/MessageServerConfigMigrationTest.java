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
import org.junit.jupiter.api.Test;

/** Upgrade contract for opaque per-row message-server revisions. */
class MessageServerConfigMigrationTest {

    @Test
    void h2MigrationBackfillsDistinctRevisionsAndLeavesNoSharedDefault() throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:h2:mem:config-revision-migration")) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("CREATE TABLE hzb_config (type VARCHAR(32) PRIMARY KEY)");
                statement.execute("INSERT INTO hzb_config(type) VALUES ('email'), ('sms')");
                for (String sql : migration("h2").split(";")) {
                    if (!sql.isBlank()) {
                        statement.execute(sql);
                    }
                }
                try (ResultSet rows = statement.executeQuery(
                        "SELECT COUNT(*), COUNT(DISTINCT config_revision) FROM hzb_config")) {
                    assertTrue(rows.next());
                    assertEquals(2, rows.getInt(1));
                    assertEquals(2, rows.getInt(2));
                }
                try (ResultSet column = statement.executeQuery("""
                        SELECT IS_NULLABLE, COLUMN_DEFAULT
                          FROM INFORMATION_SCHEMA.COLUMNS
                         WHERE TABLE_NAME = 'HZB_CONFIG'
                           AND COLUMN_NAME = 'CONFIG_REVISION'
                        """)) {
                    assertTrue(column.next());
                    assertEquals("NO", column.getString("IS_NULLABLE"));
                    assertEquals(null, column.getString("COLUMN_DEFAULT"));
                }
            }
        }
    }

    @Test
    void databaseMigrationsUseGeneratedTokensAndNoDefaults() throws IOException {
        String h2 = migration("h2");
        String mysql = migration("mysql");
        String postgresql = migration("postgresql");

        assertTrue(h2.contains("RANDOM_UUID()"));
        assertTrue(mysql.contains("UUID()"));
        assertTrue(postgresql.contains("gen_random_uuid()"));
        for (String migration : new String[] {h2, mysql, postgresql}) {
            assertTrue(migration.contains("WHERE config_revision IS NULL"));
            assertFalse(migration.matches("(?is).*config_revision[^;]*default.*"));
        }
    }

    private String migration(String database) throws IOException {
        String path = "/db/migration/" + database + "/V204__add_config_revision.sql";
        try (var input = getClass().getResourceAsStream(path)) {
            assertNotNull(input, path);
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
