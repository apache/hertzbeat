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

package org.apache.hertzbeat.startup.migration;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Runs the 1.9.0 migration upgrade regression on PostgreSQL, where the pre-release scripts
 * failed with {@code 42804 column "enabled" is of type boolean but expression is of type
 * integer}. Requires a Docker daemon, which the backend CI runner provides.
 */
@DisplayName("1.9.0 migration upgrade on PostgreSQL")
class PostgresqlMigrationUpgradeTest extends AbstractMigrationUpgradeTest {

    private static final DockerImageName IMAGE = DockerImageName.parse("postgres:17-alpine");

    private static final String USERNAME = "postgres";

    private static final String PASSWORD = "postgres123";

    private static final int POSTGRESQL_PORT = 5432;

    private static final AtomicInteger DATABASE_SEQUENCE = new AtomicInteger();

    private static GenericContainer<?> container;

    private DriverManagerDataSource dataSource;

    @BeforeAll
    static void startContainer() {
        assumeTrue(DockerClientFactory.instance().isDockerAvailable(),
                "a Docker daemon is required to verify the PostgreSQL migrations");
        container = new GenericContainer<>(IMAGE)
                .withExposedPorts(POSTGRESQL_PORT)
                .withEnv("POSTGRES_PASSWORD", PASSWORD)
                .waitingFor(Wait.forListeningPort().withStartupTimeout(Duration.ofMinutes(5)));
        container.start();
        awaitDatabaseReady(jdbcUrl("postgres"), USERNAME, PASSWORD);
    }

    @AfterAll
    static void stopContainer() {
        if (container != null) {
            container.stop();
            container = null;
        }
    }

    @BeforeEach
    void createDatabase() throws SQLException {
        String database = "hertzbeat_migration_" + DATABASE_SEQUENCE.incrementAndGet();
        try (Connection connection = DriverManager.getConnection(jdbcUrl("postgres"), USERNAME, PASSWORD);
             Statement statement = connection.createStatement()) {
            statement.execute("CREATE DATABASE " + database);
        }
        dataSource = new DriverManagerDataSource(jdbcUrl(database), USERNAME, PASSWORD);
        dataSource.setDriverClassName("org.postgresql.Driver");
    }

    private static String jdbcUrl(String database) {
        return "jdbc:postgresql://" + container.getHost() + ":" + container.getMappedPort(POSTGRESQL_PORT)
                + "/" + database;
    }

    @Override
    protected DataSource dataSource() {
        return dataSource;
    }

    @Override
    protected String vendor() {
        return "postgresql";
    }

    @Override
    protected String declaredType(String table, String column) throws SQLException {
        return queryString("SELECT udt_name FROM information_schema.columns "
                + "WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?", table, column);
    }

    @Override
    protected Set<String> expectedBooleanTypes() {
        return Set.of("bool");
    }

    @Override
    protected String expectedEnlargedTextType() {
        return "text";
    }

    @Override
    protected List<String> storedRoutines() throws SQLException {
        return queryStrings("SELECT routine_name FROM information_schema.routines "
                + "WHERE routine_schema = current_schema()");
    }
}
