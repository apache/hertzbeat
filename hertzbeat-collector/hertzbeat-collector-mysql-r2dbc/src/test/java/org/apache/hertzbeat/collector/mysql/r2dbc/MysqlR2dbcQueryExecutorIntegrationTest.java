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

package org.apache.hertzbeat.collector.mysql.r2dbc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

class MysqlR2dbcQueryExecutorIntegrationTest {

    private static final String TEST_DATABASE = "hzb";
    private static final String TEST_USERNAME = "test";
    private static final String TEST_PASSWORD = "test123";

    private final MysqlQueryExecutor executor = new MysqlR2dbcQueryExecutor(
            new MysqlR2dbcConnectionFactoryProvider(), new ResultSetMapper(), new SqlGuard());

    @TestFactory
    Stream<DynamicTest> shouldRunReadOnlyQueriesAcrossCompatibilityMatrix() {
        return Stream.of(
                new DatabaseTarget("mysql-5.7", DockerImageName.parse("mysql:5.7.44"), false, false),
                new DatabaseTarget("mysql-8.0-default-auth", DockerImageName.parse("mysql:8.0.36"), false, false),
                new DatabaseTarget("mysql-8.0-native-auth", DockerImageName.parse("mysql:8.0.36"), false, true),
                new DatabaseTarget("mariadb-11.4", DockerImageName.parse("mariadb:11.4"), true, false))
                .map(target -> DynamicTest.dynamicTest(target.name(), () -> verifyReadOnlyQueries(target)));
    }

    @Test
    void shouldRejectIllegalSqlBeforeConnecting() {
        assertThrows(IllegalArgumentException.class, () -> executor.execute("DELETE FROM sample_metrics", QueryOptions.builder()
                .host("127.0.0.1")
                .port(3306)
                .username("test")
                .password("test123")
                .database("hzb")
                .build()));
    }

    @Test
    void shouldReturnTimeoutErrorOnSlowQuery() throws Exception {
        Assumptions.assumeTrue(DockerClientFactory.instance().isDockerAvailable(), "Docker is required for integration tests");
        DatabaseTarget target = new DatabaseTarget("mysql-8.0-native-auth", DockerImageName.parse("mysql:8.0.36"), false, true);
        try (GenericContainer<?> container = createContainer(target)) {
            container.start();
            awaitTcpLoginReady(container);
            QueryResult result = executor.execute("SELECT SLEEP(3)", buildOptions(container, TEST_DATABASE, Duration.ofSeconds(1)));
            assertTrue(result.hasError());
        }
    }

    @Test
    void shouldSupportMysql8DefaultCachingSha2Users() throws Exception {
        Assumptions.assumeTrue(DockerClientFactory.instance().isDockerAvailable(), "Docker is required for integration tests");
        DatabaseTarget target = new DatabaseTarget("mysql-8.0-default-auth", DockerImageName.parse("mysql:8.0.36"), false, false);
        try (GenericContainer<?> container = createContainer(target)) {
            container.start();
            awaitTcpLoginReady(container);
            initSchema(container);
            QueryResult result = executor.execute("SELECT 1 AS value", buildOptions(container, TEST_DATABASE, Duration.ofSeconds(5)));
            assertFalse(result.hasError(), () -> "mysql-8.0-default-auth failed: " + result.getError());
            assertEquals(List.of("value"), result.getColumns());
            assertEquals(List.of(List.of("1")), result.getRows());
        }
    }

    private void verifyReadOnlyQueries(DatabaseTarget target) throws Exception {
        Assumptions.assumeTrue(DockerClientFactory.instance().isDockerAvailable(), "Docker is required for integration tests");
        try (GenericContainer<?> container = createContainer(target)) {
            container.start();
            awaitTcpLoginReady(container);
            initSchema(container);

            QueryOptions options = buildOptions(container, TEST_DATABASE, Duration.ofSeconds(5));

            QueryResult selectResult = executor.execute("SELECT 1 AS value", options);
            assertFalse(selectResult.hasError(),
                    () -> target.name() + " SELECT 1 failed: " + selectResult.getError());
            assertEquals(List.of("value"), selectResult.getColumns());
            assertEquals(List.of(List.of("1")), selectResult.getRows());

            QueryResult showResult = executor.execute("SHOW VARIABLES LIKE 'version%'", options);
            assertFalse(showResult.hasError(),
                    () -> target.name() + " SHOW VARIABLES failed: " + showResult.getError());
            assertTrue(showResult.getRowCount() > 0);

            QueryResult businessResult = executor.execute("SELECT label FROM sample_metrics WHERE id = 1", options);
            assertFalse(businessResult.hasError(),
                    () -> target.name() + " business SQL failed: " + businessResult.getError());
            assertEquals(List.of(List.of("alpha")), businessResult.getRows());
        }
    }

    private GenericContainer<?> createContainer(DatabaseTarget target) {
        GenericContainer<?> container = new GenericContainer<>(target.image())
                .withExposedPorts(3306)
                .waitingFor(Wait.forListeningPort());
        if (target.mariaDb()) {
            container.withEnv("MARIADB_DATABASE", TEST_DATABASE)
                    .withEnv("MARIADB_USER", TEST_USERNAME)
                    .withEnv("MARIADB_PASSWORD", TEST_PASSWORD)
                    .withEnv("MARIADB_ROOT_PASSWORD", "root123");
            return container;
        }
        container.withEnv("MYSQL_DATABASE", TEST_DATABASE)
                .withEnv("MYSQL_USER", TEST_USERNAME)
                .withEnv("MYSQL_PASSWORD", TEST_PASSWORD)
                .withEnv("MYSQL_ROOT_PASSWORD", "root123");
        if (target.mysqlNativePasswordUser()) {
            container.withCommand("--default-authentication-plugin=mysql_native_password");
        }
        return container;
    }

    private QueryOptions buildOptions(GenericContainer<?> container, String database, Duration timeout) {
        return QueryOptions.builder()
                .host(normalizeLoopbackHost(container.getHost()))
                .port(container.getMappedPort(3306))
                .username(TEST_USERNAME)
                .password(TEST_PASSWORD)
                .database(database)
                .timeout(timeout)
                .maxRows(1000)
                .fetchSize(128)
                .readOnly(true)
                .build();
    }

    private void awaitTcpLoginReady(GenericContainer<?> container) throws Exception {
        long deadline = System.currentTimeMillis() + Duration.ofSeconds(30).toMillis();
        String command = String.join(" ",
                "CLIENT=$(command -v mysql || command -v mariadb)",
                "&&",
                "$CLIENT --protocol=TCP -h127.0.0.1 -P3306",
                "-u" + TEST_USERNAME,
                "-p" + TEST_PASSWORD,
                TEST_DATABASE,
                "-e",
                "\"SELECT 1\"");
        while (System.currentTimeMillis() < deadline) {
            try {
                var result = container.execInContainer("sh", "-lc", command);
                if (result.getExitCode() == 0) {
                    return;
                }
            } catch (Exception ignored) {
                // The entrypoint may still be switching from the temporary bootstrap server to the final one.
            }
            Thread.sleep(1000);
        }
        throw new IllegalStateException("Timed out waiting for MySQL TCP login to become ready");
    }

    private String normalizeLoopbackHost(String host) {
        return host;
    }

    private void initSchema(GenericContainer<?> container) throws Exception {
        String command = String.join(" ",
                "CLIENT=$(command -v mysql || command -v mariadb)",
                "&&",
                "$CLIENT --protocol=TCP -h127.0.0.1 -P3306",
                "-u" + TEST_USERNAME,
                "-p" + TEST_PASSWORD,
                TEST_DATABASE,
                "-e",
                "\"CREATE TABLE IF NOT EXISTS sample_metrics (id INT PRIMARY KEY, label VARCHAR(32));",
                "REPLACE INTO sample_metrics (id, label) VALUES (1, 'alpha');\"");
        container.execInContainer("sh", "-lc", command);
    }

    private record DatabaseTarget(String name, DockerImageName image, boolean mariaDb, boolean mysqlNativePasswordUser) {
    }
}
