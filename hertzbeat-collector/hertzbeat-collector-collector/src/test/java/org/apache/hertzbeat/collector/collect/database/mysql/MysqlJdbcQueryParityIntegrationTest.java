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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.io.IOException;
import java.io.Reader;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.hertzbeat.collector.collect.strategy.CollectStrategyFactory;
import org.apache.hertzbeat.collector.collect.database.query.JdbcQueryExecutorRegistry;
import org.apache.hertzbeat.collector.dispatch.CollectDataDispatch;
import org.apache.hertzbeat.collector.dispatch.MetricsCollect;
import org.apache.hertzbeat.collector.mysql.r2dbc.MysqlR2dbcConnectionFactoryProvider;
import org.apache.hertzbeat.collector.mysql.r2dbc.MysqlR2dbcQueryExecutor;
import org.apache.hertzbeat.collector.mysql.r2dbc.ResultSetMapper;
import org.apache.hertzbeat.collector.mysql.r2dbc.SqlGuard;
import org.apache.hertzbeat.collector.timer.WheelTimerTask;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.JdbcProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.timer.Timeout;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;
import org.junit.jupiter.api.TestInstance;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;
import org.yaml.snakeyaml.Yaml;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class MysqlJdbcQueryParityIntegrationTest {

    private static final String TEST_DATABASE = "hzb";
    private static final String TEST_USERNAME = "test";
    private static final String TEST_PASSWORD = "test123";
    private static final String ROOT_PASSWORD = "root123";
    private static final String PARITY_TABLE = "collector_parity_metrics";

    private Metrics basicTemplateMetric;

    @BeforeAll
    void setUp() throws Exception {
        Assumptions.assumeTrue(DockerClientFactory.instance().isDockerAvailable(), "Docker is required for integration tests");
        new CollectStrategyFactory().run();
        assertDoesNotThrow(() -> Class.forName("com.mysql.cj.jdbc.Driver"));
        basicTemplateMetric = loadMysqlTemplate().getMetrics().stream()
                .filter(metric -> "basic".equals(metric.getName()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Unable to locate the basic metric in app-mysql.yml"));
    }

    @AfterEach
    void clearRegisteredExecutors() throws Exception {
        Field executorsField = JdbcQueryExecutorRegistry.class.getDeclaredField("EXECUTORS");
        executorsField.setAccessible(true);
        @SuppressWarnings("unchecked")
        CopyOnWriteArrayList<Object> executors = (CopyOnWriteArrayList<Object>) executorsField.get(null);
        executors.clear();
    }

    @TestFactory
    Stream<DynamicTest> shouldMatchJdbcResultsForRepresentativeMysqlQueryShapes() {
        return Stream.of(
                        new DatabaseTarget("mysql-5.7.44", DockerImageName.parse("mysql:5.7.44")),
                        new DatabaseTarget("mysql-8.0.36", DockerImageName.parse("mysql:8.0.36")))
                .map(target -> DynamicTest.dynamicTest(target.name(), () -> verifyParityAcrossTarget(target)));
    }

    private void verifyParityAcrossTarget(DatabaseTarget target) throws Exception {
        try (GenericContainer<?> container = createContainer(target)) {
            container.start();
            awaitTcpLoginReady(container, TEST_USERNAME, TEST_PASSWORD, TEST_DATABASE);
            initParityData(container);

            List<Metrics> parityMetrics = List.of(
                    materializeMetric(basicTemplateMetric, container),
                    buildColumnsParityMetric(container),
                    buildOneRowParityMetric(container),
                    buildMultiRowParityMetric(container));

            for (Metrics parityMetric : parityMetrics) {
                CollectRep.MetricsData jdbcResult = collectWithJdbc(parityMetric);
                CollectRep.MetricsData r2dbcResult = collectWithR2dbc(parityMetric);

                assertEquals(CollectRep.Code.SUCCESS, jdbcResult.getCode(),
                        () -> target.name() + " JDBC baseline failed for " + parityMetric.getName() + ": " + jdbcResult.getMsg());
                assertEquals(CollectRep.Code.SUCCESS, r2dbcResult.getCode(),
                        () -> target.name() + " R2DBC path failed for " + parityMetric.getName() + ": " + r2dbcResult.getMsg());
                assertEquals(jdbcResult.getFields(), r2dbcResult.getFields(),
                        () -> target.name() + " field set differs for " + parityMetric.getName());
                assertEquals(normalizeRows(jdbcResult), normalizeRows(r2dbcResult),
                        () -> target.name() + " row payload differs for " + parityMetric.getName());
                assertFalse(r2dbcResult.getValues().isEmpty(),
                        () -> target.name() + " " + parityMetric.getName() + " should return at least one row");
            }
        }
    }

    private CollectRep.MetricsData collectWithJdbc(Metrics metric) throws Exception {
        clearRegisteredExecutors();
        return collect(JsonUtil.fromJson(JsonUtil.toJson(metric), Metrics.class));
    }

    private CollectRep.MetricsData collectWithR2dbc(Metrics metric) throws Exception {
        clearRegisteredExecutors();
        MysqlCollectorProperties properties = new MysqlCollectorProperties();
        properties.setQueryEngine(MysqlCollectorProperties.QueryEngine.R2DBC);
        MysqlR2dbcJdbcQueryExecutor jdbcQueryExecutor = new MysqlR2dbcJdbcQueryExecutor(
                properties,
                new MysqlR2dbcQueryExecutor(
                        new MysqlR2dbcConnectionFactoryProvider(),
                        new ResultSetMapper(),
                        new SqlGuard()),
                new MysqlJdbcDriverAvailability());
        try {
            jdbcQueryExecutor.afterPropertiesSet();
            return collect(JsonUtil.fromJson(JsonUtil.toJson(metric), Metrics.class));
        } finally {
            jdbcQueryExecutor.destroy();
            clearRegisteredExecutors();
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
        return collectDataDispatch.metricsData;
    }

    private Metrics buildColumnsParityMetric(GenericContainer<?> container) {
        return buildMetric(
                "columns-parity",
                List.of(field("version"), field("max_connections"), field("character_set_server")),
                List.of("version", "max_connections", "character_set_server"),
                "columns",
                "SHOW VARIABLES WHERE Variable_name IN ('version', 'max_connections', 'character_set_server')",
                container);
    }

    private Metrics buildOneRowParityMetric(GenericContainer<?> container) {
        return buildMetric(
                "one-row-parity",
                List.of(field("answer"), field("label"), field("nullable_value")),
                List.of("answer", "label", "nullable_value"),
                "oneRow",
                "SELECT 42 AS answer, 'adapter-parity' AS label, NULL AS nullable_value",
                container);
    }

    private Metrics buildMultiRowParityMetric(GenericContainer<?> container) {
        return buildMetric(
                "multi-row-parity",
                List.of(field("metric_name"), field("metric_value"), field("metric_note")),
                List.of("metric_name", "metric_value", "metric_note"),
                "multiRow",
                "SELECT metric_name, metric_value, metric_note FROM " + PARITY_TABLE + " ORDER BY metric_name",
                container);
    }

    private Metrics buildMetric(String name, List<Metrics.Field> fields, List<String> aliasFields,
                                String queryType, String sql, GenericContainer<?> container) {
        JdbcProtocol jdbcProtocol = JdbcProtocol.builder()
                .host(container.getHost())
                .port(String.valueOf(container.getMappedPort(3306)))
                .platform("mysql")
                .database(TEST_DATABASE)
                .username(TEST_USERNAME)
                .password(TEST_PASSWORD)
                .timeout(String.valueOf(Duration.ofSeconds(8).toMillis()))
                .queryType(queryType)
                .reuseConnection("false")
                .url(buildJdbcUrl(container))
                .sql(sql)
                .build();
        return Metrics.builder()
                .name(name)
                .protocol("jdbc")
                .priority((byte) 1)
                .fields(fields)
                .aliasFields(aliasFields)
                .jdbc(jdbcProtocol)
                .build();
    }

    private Metrics materializeMetric(Metrics templateMetric, GenericContainer<?> container) {
        Metrics metric = JsonUtil.fromJson(JsonUtil.toJson(templateMetric), Metrics.class);
        JdbcProtocol jdbcProtocol = metric.getJdbc();
        jdbcProtocol.setHost(container.getHost());
        jdbcProtocol.setPort(String.valueOf(container.getMappedPort(3306)));
        jdbcProtocol.setUsername(TEST_USERNAME);
        jdbcProtocol.setPassword(TEST_PASSWORD);
        jdbcProtocol.setTimeout(String.valueOf(Duration.ofSeconds(8).toMillis()));
        jdbcProtocol.setReuseConnection("false");
        jdbcProtocol.setUrl(buildJdbcUrl(container));
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

    private GenericContainer<?> createContainer(DatabaseTarget target) {
        return new GenericContainer<>(target.image())
                .withExposedPorts(3306)
                .withEnv("MYSQL_DATABASE", TEST_DATABASE)
                .withEnv("MYSQL_USER", TEST_USERNAME)
                .withEnv("MYSQL_PASSWORD", TEST_PASSWORD)
                .withEnv("MYSQL_ROOT_PASSWORD", ROOT_PASSWORD)
                .waitingFor(Wait.forListeningPort());
    }

    private void initParityData(GenericContainer<?> mysql) throws Exception {
        execRoot(mysql,
                "GRANT SELECT ON mysql.* TO '" + TEST_USERNAME + "'@'%';"
                        + " GRANT SELECT ON " + TEST_DATABASE + ".* TO '" + TEST_USERNAME + "'@'%';"
                        + " DROP TABLE IF EXISTS " + TEST_DATABASE + "." + PARITY_TABLE + ";"
                        + " CREATE TABLE " + TEST_DATABASE + "." + PARITY_TABLE + " ("
                        + " metric_name VARCHAR(32) PRIMARY KEY,"
                        + " metric_value VARCHAR(32) NOT NULL,"
                        + " metric_note VARCHAR(32) NULL"
                        + " );"
                        + " INSERT INTO " + TEST_DATABASE + "." + PARITY_TABLE
                        + " (metric_name, metric_value, metric_note) VALUES"
                        + " ('alpha', '1', NULL),"
                        + " ('beta', '2', 'steady');"
                        + " FLUSH PRIVILEGES;");
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

    private String buildJdbcUrl(GenericContainer<?> container) {
        return "jdbc:mysql://%s:%d/%s?allowPublicKeyRetrieval=true&useSSL=false"
                .formatted(container.getHost(), container.getMappedPort(3306), TEST_DATABASE);
    }

    private List<List<String>> normalizeRows(CollectRep.MetricsData metricsData) {
        return metricsData.getValues().stream()
                .map(valueRow -> new ArrayList<>(valueRow.getColumnsList()))
                .sorted(Comparator.comparing(row -> String.join("\u0001", row)))
                .collect(Collectors.toList());
    }

    private Metrics.Field field(String name) {
        return Metrics.Field.builder().field(name).type((byte) 1).build();
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

    private record DatabaseTarget(String name, DockerImageName image) {
    }
}
