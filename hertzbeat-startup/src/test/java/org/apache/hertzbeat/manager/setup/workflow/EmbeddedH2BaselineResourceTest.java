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

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.Set;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

/** Executable contract for a brand-new embedded HertzBeat metadata database. */
class EmbeddedH2BaselineResourceTest {

    @Test
    void standardFlywayBootstrapsFreshEmbeddedSchemaFromOneCurrentBaseline() throws Exception {
        String jdbcUrl = "jdbc:h2:mem:fresh-hertzbeat-" + UUID.randomUUID()
                + ";MODE=MYSQL;DB_CLOSE_DELAY=-1";
        Flyway flyway = Flyway.configure()
                .dataSource(jdbcUrl, "sa", "")
                .locations("classpath:db/migration/h2")
                .cleanDisabled(false)
                .validateMigrationNaming(true)
                .load();

        assertThat(flyway.migrate().migrationsExecuted).isEqualTo(1);
        flyway.validate();
        assertThat(flyway.migrate().migrationsExecuted).isZero();

        try (Connection connection = DriverManager.getConnection(jdbcUrl, "sa", "")) {
            assertThat(metadataTables(connection))
                    .containsExactlyInAnyOrderElementsOf(TargetSchemaBaselineResourceTest.mappedTables());
            try (Statement statement = connection.createStatement();
                    ResultSet history = statement.executeQuery(
                            "SELECT \"version\", \"type\", \"script\" FROM \"flyway_schema_history\" "
                                    + "WHERE \"version\" IS NOT NULL ORDER BY \"installed_rank\"")) {
                assertThat(history.next()).isTrue();
                assertThat(history.getString("version")).isEqualTo("200");
                assertThat(history.getString("type")).isEqualTo("SQL_BASELINE");
                assertThat(history.getString("script")).isEqualTo("B200__current_schema.sql");
                assertThat(history.next()).isFalse();
            }
        }
        flyway.clean();
    }

    @Test
    void embeddedBaselinePinsTheExactSharedSchemaContent() throws Exception {
        byte[] shared;
        String embedded;
        ClassLoader loader = getClass().getClassLoader();
        try (InputStream input = loader.getResourceAsStream("db/migration/mysql/B200__current_schema.sql")) {
            assertThat(input).isNotNull();
            shared = input.readAllBytes();
        }
        try (InputStream input = loader.getResourceAsStream("db/migration/h2/B200__current_schema.sql")) {
            assertThat(input).isNotNull();
            embedded = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
        String digest = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(shared));
        assertThat(embedded).contains("Shared MySQL baseline SHA-256: " + digest);
    }

    private static Set<String> metadataTables(Connection connection) throws Exception {
        Set<String> tables = new HashSet<>();
        try (ResultSet result = connection.getMetaData().getTables(null, "PUBLIC", "HZB_%", new String[]{"TABLE"})) {
            while (result.next()) {
                tables.add(result.getString("TABLE_NAME").toLowerCase());
            }
        }
        return Set.copyOf(tables);
    }
}
