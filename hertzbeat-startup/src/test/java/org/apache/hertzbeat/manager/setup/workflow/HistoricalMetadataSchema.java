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

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import org.flywaydb.core.Flyway;

/** Rebuilds the current schema from an independent V159 fixture and the committed migrations. */
final class HistoricalMetadataSchema {

    private static final String FIXTURE = "V159__schema.sql";

    private HistoricalMetadataSchema() {
    }

    static void rebuild(String jdbcUrl, String username, String password, String vendor)
            throws SQLException, IOException {
        Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration/" + vendor)
                .cleanDisabled(false)
                .load()
                .clean();
        try (Connection connection = DriverManager.getConnection(jdbcUrl, username, password)) {
            executeFixture(connection, resource(vendor));
        }
        Flyway flyway = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration/" + vendor)
                .baselineVersion("159")
                .baselineOnMigrate(true)
                .cleanDisabled(true)
                .target("206")
                .validateMigrationNaming(true)
                .load();
        flyway.migrate();
        flyway.validate();
    }

    private static void executeFixture(Connection connection, String fixture) throws SQLException {
        String executable = fixture.replaceAll("(?m)^--.*$", "");
        try (Statement statement = connection.createStatement()) {
            for (String sql : executable.split(";")) {
                if (!sql.isBlank()) {
                    statement.execute(sql);
                }
            }
        }
    }

    private static String resource(String vendor) throws IOException {
        String path = "/db/historical/" + vendor + '/' + FIXTURE;
        try (InputStream input = HistoricalMetadataSchema.class.getResourceAsStream(path)) {
            if (input == null) {
                throw new IOException("Historical schema fixture is missing: " + path);
            }
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
