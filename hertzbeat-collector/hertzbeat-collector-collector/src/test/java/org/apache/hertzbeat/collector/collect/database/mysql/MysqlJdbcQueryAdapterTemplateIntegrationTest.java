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

package org.apache.hertzbeat.collector.collect.database.mysql;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.hertzbeat.collector.collect.strategy.CollectStrategyFactory;
import org.apache.hertzbeat.collector.dispatch.CollectDataDispatch;
import org.apache.hertzbeat.collector.dispatch.MetricsCollect;
import org.apache.hertzbeat.collector.mysql.r2dbc.MysqlR2dbcConnectionFactoryProvider;
import org.apache.hertzbeat.collector.mysql.r2dbc.MysqlR2dbcQueryExecutor;
import org.apache.hertzbeat.collector.mysql.r2dbc.ResultSetMapper;
import org.apache.hertzbeat.collector.mysql.r2dbc.SqlGuard;
import org.apache.hertzbeat.collector.timer.WheelTimerTask;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.JdbcProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.timer.Timeout;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestFactory;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;
import org.yaml.snakeyaml.Yaml;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class MysqlJdbcQueryAdapterTemplateIntegrationTest {

    private static final String TEST_DATABASE = "hzb";
    private static final String TEST_USERNAME = "test";
    private static final String TEST_PASSWORD = "test123";
    private static final String ROOT_PASSWORD = "root123";

    private GenericContainer<?> container;
    private MysqlR2dbcJdbcQueryExecutor jdbcQueryExecutor;
    private List<Metrics> mysqlTemplateMetrics;

    @BeforeAll
    void setUp() throws Exception {
        Assumptions.assumeTrue(DockerClientFactory.instance().isDockerAvailable(), "Docker is required for integration tests");
        new CollectStrategyFactory().run();
        container = new GenericContainer<>(DockerImageName.parse("mysql:8.0.36"))
                .withExposedPorts(3306)
                .withEnv("MYSQL_DATABASE", TEST_DATABASE)
                .withEnv("MYSQL_USER", TEST_USERNAME)
                .withEnv("MYSQL_PASSWORD", TEST_PASSWORD)
                .withEnv("MYSQL_ROOT_PASSWORD", ROOT_PASSWORD)
                .waitingFor(Wait.forListeningPort());
        container.start();
        awaitTcpLoginReady(container, TEST_USERNAME, TEST_PASSWORD, TEST_DATABASE);
        initMonitoringData(container);

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
        mysqlTemplateMetrics = loadMysqlTemplate().getMetrics();
    }

    @AfterAll
    void tearDown() throws Exception {
        if (jdbcQueryExecutor != null) {
            jdbcQueryExecutor.destroy();
        }
        if (container != null) {
            container.stop();
        }
    }

    @TestFactory
    Stream<DynamicTest> shouldCollectOfficialMysqlTemplateThroughJdbcQueryAdapter() {
        return mysqlTemplateMetrics.stream()
                .map(templateMetric -> DynamicTest.dynamicTest(templateMetric.getName(),
                        () -> verifyTemplateMetric(templateMetric)));
    }

    private void verifyTemplateMetric(Metrics templateMetric) throws Exception {
        Metrics metric = materializeMetric(templateMetric);
        if ("process_state".equals(metric.getName())) {
            startBackgroundSleepQuery(container);
        }
        if ("slow_sql".equals(metric.getName())) {
            generateSlowQuery(container);
        }
        CollectRep.MetricsData metricsData = collect(metric);
        assertEquals(CollectRep.Code.SUCCESS, metricsData.getCode(),
                () -> metric.getName() + " failed: " + metricsData.getMsg());
        assertEquals(metric.getFields().size(), metricsData.getFieldsCount(),
                () -> metric.getName() + " fields should still be produced by the original parser");
        if ("columns".equals(metric.getJdbc().getQueryType())) {
            assertEquals(1, metricsData.getValuesCount(), () -> metric.getName() + " should keep the original single-row shape");
        }
        if ("basic".equals(metric.getName())) {
            assertTrue(metricsData.getValuesCount() > 0);
            assertNotNull(metricsData.getValues().getFirst().getColumns(0));
            assertTrue(!Objects.equals(CommonConstants.NULL_VALUE, metricsData.getValues().getFirst().getColumns(0)),
                    "basic.version should be collected through the adapted query path");
        }
        if ("process_state".equals(metric.getName())
                || "slow_sql".equals(metric.getName())
                || "account_expiry".equals(metric.getName())) {
            assertTrue(metricsData.getValuesCount() > 0, () -> metric.getName() + " should return at least one row");
        }
    }

    private CollectRep.MetricsData collect(Metrics metric) {
        Job job = Job.builder()
                .monitorId(1L)
                .tenantId(1L)
                .app("mysql")
                .defaultInterval(600L)
                .metadata(new HashMap<>(0))
                .labels(new HashMap<>(0))
                .annotations(new HashMap<>(0))
                .configmap(new ArrayList<>(0))
                .metrics(new ArrayList<>(List.of(metric)))
                .build();
        WheelTimerTask timerTask = new WheelTimerTask(job, timeout -> {
        });
        CapturingCollectDataDispatch collectDataDispatch = new CapturingCollectDataDispatch();
        MetricsCollect metricsCollect = new MetricsCollect(
                metric,
                new StubTimeout(timerTask),
                collectDataDispatch,
                "collector-test",
                List.of());
        metricsCollect.run();
        assertNotNull(collectDataDispatch.metricsData, metric.getName() + " should dispatch metrics data");
        return collectDataDispatch.metricsData;
    }

    private Metrics materializeMetric(Metrics templateMetric) {
        Metrics metric = JsonUtil.fromJson(JsonUtil.toJson(templateMetric), Metrics.class);
        JdbcProtocol jdbcProtocol = metric.getJdbc();
        jdbcProtocol.setHost(container.getHost());
        jdbcProtocol.setPort(String.valueOf(container.getMappedPort(3306)));
        jdbcProtocol.setUsername(TEST_USERNAME);
        jdbcProtocol.setPassword(TEST_PASSWORD);
        jdbcProtocol.setTimeout(String.valueOf(Duration.ofSeconds(8).toMillis()));
        jdbcProtocol.setReuseConnection("false");
        jdbcProtocol.setUrl(null);
        jdbcProtocol.setSshTunnel(null);
        if (jdbcProtocol.getDatabase() == null || jdbcProtocol.getDatabase().contains("^_^")) {
            jdbcProtocol.setDatabase(TEST_DATABASE);
        }
        if (metric.getAliasFields() == null || metric.getAliasFields().isEmpty()) {
            metric.setAliasFields(metric.getFields().stream().map(Metrics.Field::getField).collect(Collectors.toList()));
        }
        return metric;
    }

    private Job loadMysqlTemplate() throws IOException {
        Path template = Path.of("..", "..", "hertzbeat-manager", "src", "main", "resources", "define", "app-mysql.yml")
                .toAbsolutePath()
                .normalize();
        Yaml yaml = new Yaml();
        try (Reader reader = Files.newBufferedReader(template)) {
            return yaml.loadAs(reader, Job.class);
        }
    }

    private void initMonitoringData(GenericContainer<?> mysql) throws Exception {
        execRoot(mysql,
                "GRANT SELECT ON mysql.* TO '" + TEST_USERNAME + "'@'%';"
                        + " GRANT PROCESS ON *.* TO '" + TEST_USERNAME + "'@'%';"
                        + " SET GLOBAL log_output='TABLE';"
                        + " SET GLOBAL slow_query_log='ON';"
                        + " SET GLOBAL long_query_time=0;"
                        + " FLUSH PRIVILEGES;");
        generateSlowQuery(mysql);
    }

    private void generateSlowQuery(GenericContainer<?> mysql) throws Exception {
        execUser(mysql, TEST_DATABASE, "SELECT SLEEP(0.2);");
        Thread.sleep(300);
    }

    private void startBackgroundSleepQuery(GenericContainer<?> mysql) throws Exception {
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
        mysql.execInContainer("sh", "-lc", command);
        Thread.sleep(500);
    }

    private void awaitTcpLoginReady(GenericContainer<?> mysql, String username, String password, String database) throws Exception {
        long deadline = System.currentTimeMillis() + Duration.ofSeconds(30).toMillis();
        while (System.currentTimeMillis() < deadline) {
            try {
                var result = mysql.execInContainer("sh", "-lc", mysqlCliCommand(username, password, database, "SELECT 1"));
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

    private void execRoot(GenericContainer<?> mysql, String sql) throws Exception {
        var result = mysql.execInContainer("sh", "-lc", mysqlCliCommand("root", ROOT_PASSWORD, "mysql", sql));
        if (result.getExitCode() != 0) {
            throw new IllegalStateException("root mysql command failed: " + result.getStderr());
        }
    }

    private void execUser(GenericContainer<?> mysql, String database, String sql) throws Exception {
        var result = mysql.execInContainer("sh", "-lc", mysqlCliCommand(TEST_USERNAME, TEST_PASSWORD, database, sql));
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

    private static final class CapturingCollectDataDispatch implements CollectDataDispatch {

        private CollectRep.MetricsData metricsData;

        @Override
        public void dispatchCollectData(Timeout timeout, Metrics metrics, CollectRep.MetricsData metricsData) {
            this.metricsData = metricsData;
        }

        @Override
        public void dispatchCollectData(Timeout timeout, Metrics metrics, List<CollectRep.MetricsData> metricsDataList) {
            if (metricsDataList != null && !metricsDataList.isEmpty()) {
                this.metricsData = metricsDataList.getFirst();
            }
        }
    }

    private record StubTimeout(WheelTimerTask wheelTimerTask) implements Timeout {

        @Override
        public org.apache.hertzbeat.common.timer.Timer timer() {
            return null;
        }

        @Override
        public org.apache.hertzbeat.common.timer.TimerTask task() {
            return wheelTimerTask;
        }

        @Override
        public boolean isExpired() {
            return false;
        }

        @Override
        public boolean isCancelled() {
            return false;
        }

        @Override
        public boolean cancel() {
            return false;
        }
    }
}
