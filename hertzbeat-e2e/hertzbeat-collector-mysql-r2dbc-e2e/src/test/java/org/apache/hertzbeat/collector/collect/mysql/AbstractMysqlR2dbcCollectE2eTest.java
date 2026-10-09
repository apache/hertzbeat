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

package org.apache.hertzbeat.collector.collect.mysql;

import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.collector.collect.AbstractCollectE2eTest;
import org.apache.hertzbeat.collector.collect.database.JdbcCommonCollect;
import org.apache.hertzbeat.collector.collect.database.mysql.MysqlCollectorProperties;
import org.apache.hertzbeat.collector.collect.database.mysql.MysqlJdbcDriverAvailability;
import org.apache.hertzbeat.collector.collect.database.mysql.MysqlR2dbcJdbcQueryExecutor;
import org.apache.hertzbeat.collector.mysql.r2dbc.MysqlR2dbcConnectionFactoryProvider;
import org.apache.hertzbeat.collector.mysql.r2dbc.MysqlR2dbcQueryExecutor;
import org.apache.hertzbeat.collector.mysql.r2dbc.ResultSetMapper;
import org.apache.hertzbeat.collector.mysql.r2dbc.SqlGuard;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.JdbcProtocol;
import org.apache.hertzbeat.common.entity.job.protocol.Protocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Assertions;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

/**
 * Shared MySQL-compatible E2E support for the collector-side R2DBC adapter.
 */
abstract class AbstractMysqlR2dbcCollectE2eTest extends AbstractCollectE2eTest {

    protected static final String TEST_DATABASE = "hzb";
    protected static final String TEST_USERNAME = "test";
    protected static final String TEST_PASSWORD = "test123";
    protected static final String ROOT_PASSWORD = "root123";

    protected GenericContainer<?> container;
    private MysqlR2dbcJdbcQueryExecutor jdbcQueryExecutor;

    protected void setUpTarget(DatabaseTarget target) throws Exception {
        super.setUp();
        collect = new JdbcCommonCollect();
        metrics = new Metrics();

        container = createContainer(target);
        container.start();
        awaitTcpLoginReady();
        initMonitoringData();

        MysqlCollectorProperties properties = new MysqlCollectorProperties();
        properties.setQueryEngine(MysqlCollectorProperties.QueryEngine.R2DBC);
        jdbcQueryExecutor = new MysqlR2dbcJdbcQueryExecutor(
                properties,
                new MysqlR2dbcQueryExecutor(
                        new MysqlR2dbcConnectionFactoryProvider(),
                        new ResultSetMapper(),
                        new SqlGuard()),
                new MysqlJdbcDriverAvailability());
        jdbcQueryExecutor.afterPropertiesSet();
    }

    protected void tearDownTarget() throws Exception {
        if (jdbcQueryExecutor != null) {
            jdbcQueryExecutor.destroy();
            jdbcQueryExecutor = null;
        }
        if (container != null) {
            container.stop();
            container = null;
        }
    }

    protected void assertMysqlJdbcDriverAbsent() {
        Assertions.assertThrows(ClassNotFoundException.class, () -> Class.forName("com.mysql.cj.jdbc.Driver"));
    }

    protected void collectMysqlTemplate(Set<String> metricFilter) throws Exception {
        Job mysqlJob = appService.getAppDefine("mysql");
        List<Map<String, Configmap>> configmapFromPreCollectData = new LinkedList<>();
        for (Metrics metricsDef : mysqlJob.getMetrics()) {
            if (metricFilter != null && !metricFilter.contains(metricsDef.getName())) {
                continue;
            }
            metricsDef = CollectUtil.replaceCryPlaceholderToMetrics(metricsDef,
                    configmapFromPreCollectData.isEmpty() ? new HashMap<>() : configmapFromPreCollectData.getFirst());
            String metricName = metricsDef.getName();
            if ("process_state".equals(metricName)) {
                startBackgroundSleepQuery();
            }
            if ("slow_sql".equals(metricName)) {
                generateSlowQuery();
            }
            CollectRep.MetricsData metricsData = validateMetricsCollection(metricsDef, metricName, true);
            configmapFromPreCollectData = CollectUtil.getConfigmapFromPreCollectData(metricsData);
        }
    }

    @Override
    protected CollectRep.MetricsData.Builder collectMetrics(Metrics metricsDef) {
        JdbcProtocol jdbcProtocol = (JdbcProtocol) buildProtocol(metricsDef);
        metrics.setJdbc(jdbcProtocol);
        CollectRep.MetricsData.Builder metricsData = CollectRep.MetricsData.newBuilder();
        metricsData.setApp("mysql");
        return collectMetricsData(metrics, metricsDef, metricsData);
    }

    @Override
    protected Protocol buildProtocol(Metrics metricsDef) {
        JdbcProtocol jdbcProtocol = metricsDef.getJdbc();
        jdbcProtocol.setHost(container.getHost());
        jdbcProtocol.setPort(String.valueOf(container.getMappedPort(3306)));
        jdbcProtocol.setUsername(TEST_USERNAME);
        jdbcProtocol.setPassword(TEST_PASSWORD);
        jdbcProtocol.setDatabase(TEST_DATABASE);
        jdbcProtocol.setTimeout("8000");
        jdbcProtocol.setReuseConnection("false");
        jdbcProtocol.setUrl(null);
        jdbcProtocol.setSshTunnel(null);
        return jdbcProtocol;
    }

    private GenericContainer<?> createContainer(DatabaseTarget target) {
        GenericContainer<?> mysql = new GenericContainer<>(target.image())
                .withExposedPorts(3306)
                .waitingFor(Wait.forListeningPort());
        if (target.mariaDb()) {
            return mysql.withEnv("MARIADB_DATABASE", TEST_DATABASE)
                    .withEnv("MARIADB_USER", TEST_USERNAME)
                    .withEnv("MARIADB_PASSWORD", TEST_PASSWORD)
                    .withEnv("MARIADB_ROOT_PASSWORD", ROOT_PASSWORD);
        }
        return mysql.withEnv("MYSQL_DATABASE", TEST_DATABASE)
                .withEnv("MYSQL_USER", TEST_USERNAME)
                .withEnv("MYSQL_PASSWORD", TEST_PASSWORD)
                .withEnv("MYSQL_ROOT_PASSWORD", ROOT_PASSWORD);
    }

    private void initMonitoringData() throws Exception {
        execRoot("GRANT SELECT ON mysql.* TO '" + TEST_USERNAME + "'@'%';"
                + " GRANT PROCESS ON *.* TO '" + TEST_USERNAME + "'@'%';"
                + " SET GLOBAL log_output='TABLE';"
                + " SET GLOBAL slow_query_log='ON';"
                + " SET GLOBAL long_query_time=0;"
                + " FLUSH PRIVILEGES;");
        generateSlowQuery();
    }

    private void generateSlowQuery() throws Exception {
        execUser(TEST_DATABASE, "SELECT SLEEP(0.2);");
        Thread.sleep(300);
    }

    private void startBackgroundSleepQuery() throws Exception {
        String command = String.join(" ",
                "CLIENT=$(command -v mysql || command -v mariadb)",
                "&&",
                "nohup sh -lc",
                "'$CLIENT --protocol=TCP -h127.0.0.1 -P3306",
                "-u" + TEST_USERNAME,
                "-p" + TEST_PASSWORD,
                TEST_DATABASE,
                "-e",
                "\"SELECT SLEEP(15)\" >/tmp/process-state.log 2>&1'",
                ">/dev/null 2>&1 &");
        container.execInContainer("sh", "-lc", command);
        Thread.sleep(500);
    }

    private void awaitTcpLoginReady() throws Exception {
        long deadline = System.currentTimeMillis() + 30_000L;
        while (System.currentTimeMillis() < deadline) {
            try {
                var result = container.execInContainer("sh", "-lc",
                        mysqlCliCommand(TEST_USERNAME, TEST_PASSWORD, TEST_DATABASE, "SELECT 1"));
                if (result.getExitCode() == 0) {
                    return;
                }
            } catch (Exception ignored) {
                // Wait for the MySQL entrypoint to finish bootstrapping and switch to the final TCP listener.
            }
            Thread.sleep(1000);
        }
        throw new IllegalStateException("Timed out waiting for MySQL-compatible TCP login to become ready");
    }

    private void execRoot(String sql) throws Exception {
        var result = container.execInContainer("sh", "-lc", mysqlCliCommand("root", ROOT_PASSWORD, "mysql", sql));
        if (result.getExitCode() != 0) {
            throw new IllegalStateException("root mysql command failed: " + result.getStderr());
        }
    }

    private void execUser(String database, String sql) throws Exception {
        var result = container.execInContainer("sh", "-lc", mysqlCliCommand(TEST_USERNAME, TEST_PASSWORD, database, sql));
        if (result.getExitCode() != 0) {
            throw new IllegalStateException("user mysql command failed: " + result.getStderr());
        }
    }

    private String mysqlCliCommand(String username, String password, String database, String sql) {
        return String.join(" ",
                "CLIENT=$(command -v mysql || command -v mariadb)",
                "&&",
                "$CLIENT --protocol=TCP -h127.0.0.1 -P3306",
                "-u" + username,
                "-p" + password,
                database,
                "-e",
                "\"" + sql.replace("\"", "\\\"") + "\"");
    }

    protected record DatabaseTarget(String name, DockerImageName image, boolean mariaDb) {
    }
}
