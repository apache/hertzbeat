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
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.time.Duration;
import org.apache.hertzbeat.collector.mysql.r2dbc.MysqlR2dbcConnectionFactoryProvider;
import org.apache.hertzbeat.collector.mysql.r2dbc.MysqlR2dbcQueryExecutor;
import org.apache.hertzbeat.collector.mysql.r2dbc.QueryOptions;
import org.apache.hertzbeat.collector.mysql.r2dbc.QueryResult;
import org.apache.hertzbeat.collector.mysql.r2dbc.ResultSetMapper;
import org.apache.hertzbeat.collector.mysql.r2dbc.SqlGuard;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

/**
 * Verifies that the startup runtime can execute a real MySQL R2DBC query.
 */
class StartupMysqlR2dbcCompatibilityTest {

    private static final String DATABASE = "hzb";
    private static final String USERNAME = "test";
    private static final String PASSWORD = "test123";
    private static final String ROOT_PASSWORD = "root123";

    private GenericContainer<?> container;

    @AfterEach
    void tearDown() {
        if (container != null) {
            container.stop();
            container = null;
        }
    }

    @Test
    void shouldExecuteMysqlQueryOnStartupRuntimeClasspath() throws Exception {
        container = new GenericContainer<>(DockerImageName.parse("mysql:8.0.36"))
                .withExposedPorts(3306)
                .withEnv("MYSQL_DATABASE", DATABASE)
                .withEnv("MYSQL_USER", USERNAME)
                .withEnv("MYSQL_PASSWORD", PASSWORD)
                .withEnv("MYSQL_ROOT_PASSWORD", ROOT_PASSWORD)
                .waitingFor(Wait.forListeningPort());
        container.start();
        awaitTcpLoginReady();

        MysqlR2dbcQueryExecutor executor = new MysqlR2dbcQueryExecutor(
                new MysqlR2dbcConnectionFactoryProvider(),
                new ResultSetMapper(),
                new SqlGuard());
        QueryOptions options = QueryOptions.builder()
                .host(container.getHost())
                .port(container.getMappedPort(3306))
                .database(DATABASE)
                .username(USERNAME)
                .password(PASSWORD)
                .timeout(Duration.ofSeconds(8))
                .build();

        QueryResult result = executor.execute("SELECT 1 AS ok", options);

        assertFalse(result.hasError(), () -> "Unexpected query error: " + result.getError());
        assertEquals(1, result.getRowCount());
        assertEquals("1", result.getRows().getFirst().getFirst());
    }

    private void awaitTcpLoginReady() throws Exception {
        long deadline = System.currentTimeMillis() + 30_000L;
        while (System.currentTimeMillis() < deadline) {
            try {
                var result = container.execInContainer("sh", "-lc",
                        mysqlCliCommand("SELECT 1"));
                if (result.getExitCode() == 0) {
                    return;
                }
            } catch (Exception ignored) {
                // Wait for the MySQL entrypoint to finish bootstrapping and switch to the final TCP listener.
            }
            Thread.sleep(1000);
        }
        throw new IllegalStateException("Timed out waiting for MySQL TCP login to become ready");
    }

    private String mysqlCliCommand(String sql) {
        return String.join(" ",
                "CLIENT=$(command -v mysql || command -v mariadb)",
                "&&",
                "$CLIENT --protocol=TCP -h127.0.0.1 -P3306",
                "-u" + USERNAME,
                "-p" + PASSWORD,
                DATABASE,
                "-e",
                "\"" + sql.replace("\"", "\\\"") + "\"");
    }
}
