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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Runs the 1.9.0 migration upgrade regression on MySQL, where the pre-release scripts
 * failed with {@code 1061 Duplicate key name}. Requires a Docker daemon, which the
 * backend CI runner provides.
 */
@DisplayName("1.9.0 migration upgrade on MySQL")
class MysqlMigrationUpgradeTest extends AbstractMigrationUpgradeTest {

    private static final DockerImageName IMAGE = DockerImageName.parse("mysql:8.4");

    private static final String ROOT_USER = "root";

    private static final String ROOT_PASSWORD = "root123";

    private static final int MYSQL_PORT = 3306;

    private static final AtomicInteger DATABASE_SEQUENCE = new AtomicInteger();

    private static GenericContainer<?> container;

    private DriverManagerDataSource dataSource;

    @BeforeAll
    static void startContainer() {
        assumeTrue(DockerClientFactory.instance().isDockerAvailable(),
                "a Docker daemon is required to verify the MySQL migrations");
        container = new GenericContainer<>(IMAGE)
                .withExposedPorts(MYSQL_PORT)
                .withEnv("MYSQL_ROOT_PASSWORD", ROOT_PASSWORD)
                .waitingFor(Wait.forListeningPort().withStartupTimeout(Duration.ofMinutes(5)));
        container.start();
        awaitDatabaseReady(jdbcUrl("mysql"), ROOT_USER, ROOT_PASSWORD);
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
        try (Connection connection = DriverManager.getConnection(jdbcUrl("mysql"), ROOT_USER, ROOT_PASSWORD);
             Statement statement = connection.createStatement()) {
            statement.execute("CREATE DATABASE " + database);
        }
        dataSource = new DriverManagerDataSource(jdbcUrl(database), ROOT_USER, ROOT_PASSWORD);
        dataSource.setDriverClassName("com.mysql.cj.jdbc.Driver");
    }

    private static String jdbcUrl(String database) {
        return "jdbc:mysql://" + container.getHost() + ":" + container.getMappedPort(MYSQL_PORT) + "/" + database
                + "?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC";
    }

    @Override
    protected DataSource dataSource() {
        return dataSource;
    }

    @Override
    protected String vendor() {
        return "mysql";
    }

    @Override
    protected String declaredType(String table, String column) throws SQLException {
        return queryString("SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
                + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?", table, column);
    }

    @Override
    protected Set<String> expectedBooleanTypes() {
        // Hibernate declares bit(1); the migration's BOOLEAN lands as tinyint(1).
        return Set.of("tinyint(1)", "bit(1)");
    }

    @Override
    protected String expectedEnlargedTextType() {
        return "longtext";
    }

    @Override
    protected List<String> storedRoutines() throws SQLException {
        return queryStrings("SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE()");
    }
}
