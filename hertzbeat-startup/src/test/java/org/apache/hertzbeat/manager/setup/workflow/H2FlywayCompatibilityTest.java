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

import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.h2.tools.RunScript;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** Current H2/Flyway proof using only synthetic temporary file databases. */
class H2FlywayCompatibilityTest {
    @TempDir
    Path temporaryDirectory;

    @Test
    void freshFileDatabaseReopensWithoutRepeatingMigrationsOrLosingFixtureData() throws Exception {
        String url = temporaryUrl();
        assertThat(flyway(url).migrate().migrationsExecuted).isEqualTo(1);
        insertFixture(url);
        verifyReopenedDatabase(url);
    }

    @Test
    void indexedHistoricalFixtureExposesBlockedH2UpgradeWithoutRepairingHistory() throws Exception {
        String url = temporaryUrl();
        try (var connection = DriverManager.getConnection(url, "sa", "")) {
            // The immutable repository MySQL V159 fixture is synthetic input, not a historical user H2 database.
            RunScript.execute(connection, new java.io.InputStreamReader(
                    getClass().getResourceAsStream("/db/historical/mysql/V159__schema.sql"),
                    java.nio.charset.StandardCharsets.UTF_8));
        }
        insertFixture(url);
        var migration = Flyway.configure().dataSource(url, "sa", "")
                .locations("classpath:db/migration/h2").baselineOnMigrate(true).baselineVersion("159")
                .validateMigrationNaming(true).cleanDisabled(true).load();
        // Characterize the release blocker, do not reinterpret this path as a successful upgrade.
        assertThatThrownBy(migration::migrate).hasMessageContaining("V180__update_column.sql")
                .hasMessageContaining("HISTORY_QUERY_INDEX").hasMessageContaining("monitor_id");
        assertThat(migration.info().pending()).extracting(info -> info.getVersion().getVersion()).contains("200");
    }

    private String temporaryUrl() {
        return "jdbc:h2:file:" + temporaryDirectory.resolve("synthetic-" + UUID.randomUUID())
                + ";MODE=MYSQL;DB_CLOSE_ON_EXIT=FALSE";
    }

    private static Flyway flyway(String url) {
        return Flyway.configure().dataSource(url, "sa", "").locations("classpath:db/migration/h2")
                .validateMigrationNaming(true).cleanDisabled(true).load();
    }

    private static void insertFixture(String url) throws Exception {
        try (var connection = DriverManager.getConnection(url, "sa", ""); var statement = connection.createStatement()) {
            boolean revisionRequired;
            try (var columns = connection.getMetaData().getColumns(null, "PUBLIC", "HZB_CONFIG", "CONFIG_REVISION")) {
                revisionRequired = columns.next();
            }
            String columns = revisionRequired ? "type, content, config_revision" : "type, content";
            String values = "'compatibility-fixture', '{\"fixture\":true}'" + (revisionRequired ? ", UUID()" : "");
            statement.executeUpdate("INSERT INTO hzb_config(" + columns + ") VALUES (" + values + ")");
        }
    }

    private static void verifyReopenedDatabase(String url) throws Exception {
        // New Flyway/JDBC connections reopen the file; no DB_CLOSE_DELAY or open connection pins it in memory.
        var reopened = flyway(url);
        reopened.validate();
        assertThat(reopened.migrate().migrationsExecuted).isZero();
        try (var connection = DriverManager.getConnection(url, "sa", ""); var statement = connection.createStatement()) {
            try (var row = statement.executeQuery("SELECT content FROM hzb_config WHERE type='compatibility-fixture'")) {
                assertThat(row.next()).isTrue();
                assertThat(row.getString(1)).isEqualTo("{\"fixture\":true}");
                assertThat(row.next()).isFalse();
            }
            try (var row = statement.executeQuery("SELECT COUNT(*) FROM hzb_account")) {
                assertThat(row.next()).isTrue();
                assertThat(row.getInt(1)).isZero();
            }
        }
    }
}
