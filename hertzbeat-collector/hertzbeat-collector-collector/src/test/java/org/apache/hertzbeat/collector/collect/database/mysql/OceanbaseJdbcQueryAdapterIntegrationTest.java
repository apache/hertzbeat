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
import org.junit.jupiter.api.TestFactory;
import org.junit.jupiter.api.TestInstance;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;
import org.yaml.snakeyaml.Yaml;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class OceanbaseJdbcQueryAdapterIntegrationTest {

    private static final String OCEANBASE_IMAGE = "oceanbase/oceanbase-ce:latest";
    private static final String OCEANBASE_USERNAME = "root@sys";
    private static final String OCEANBASE_PASSWORD = "";
    private static final String OCEANBASE_DATABASE = "oceanbase";

    private GenericContainer<?> container;
    private MysqlR2dbcJdbcQueryExecutor jdbcQueryExecutor;
    private List<Metrics> oceanbaseTemplateMetrics;

    @BeforeAll
    void setUp() throws Exception {
        Assumptions.assumeTrue(DockerClientFactory.instance().isDockerAvailable(), "Docker is required for integration tests");
        new CollectStrategyFactory().run();
        container = new GenericContainer<>(DockerImageName.parse(OCEANBASE_IMAGE))
                .withExposedPorts(2881)
                .withEnv("MODE", "MINI")
                .withEnv("OB_MEMORY_LIMIT", "4096M")
                .withEnv("OB_SYSTEM_MEMORY", "1024M")
                .withEnv("OB_DATAFILE_SIZE", "2048M")
                .withEnv("OB_LOG_DISK_SIZE", "2048M")
                .withCommand("bash", "-lc", "/usr/sbin/sshd || true; /root/boot/start.sh || true; tail -f /dev/null")
                .waitingFor(Wait.forListeningPort())
                .withStartupTimeout(Duration.ofMinutes(5));
        container.start();
        awaitSysLoginReady();

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
        oceanbaseTemplateMetrics = loadOceanbaseTemplate().getMetrics();
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
    Stream<DynamicTest> shouldCollectOfficialOceanbaseTemplateThroughJdbcQueryAdapter() {
        return oceanbaseTemplateMetrics.stream()
                .map(templateMetric -> DynamicTest.dynamicTest(templateMetric.getName(),
                        () -> verifyTemplateMetric(templateMetric)));
    }

    private void verifyTemplateMetric(Metrics templateMetric) throws Exception {
        Metrics metric = materializeMetric(templateMetric);
        if ("process_state".equals(metric.getName())) {
            startBackgroundSleepQuery();
        }
        CollectRep.MetricsData metricsData = collect(metric);
        assertEquals(CollectRep.Code.SUCCESS, metricsData.getCode(),
                () -> metric.getName() + " failed: " + metricsData.getMsg());
        assertEquals(metric.getFields().size(), metricsData.getFieldsCount(),
                () -> metric.getName() + " fields should still be produced by the original parser");
        if ("basic".equals(metric.getName())) {
            assertTrue(metricsData.getValuesCount() > 0, "basic should return data");
            assertNotNull(metricsData.getValues().getFirst().getColumns(0));
            assertTrue(!Objects.equals(CommonConstants.NULL_VALUE, metricsData.getValues().getFirst().getColumns(0)),
                    "basic.version should be collected through the adapted query path");
        }
        if ("tenant".equals(metric.getName()) || "sql".equals(metric.getName()) || "process_state".equals(metric.getName())) {
            assertTrue(metricsData.getValuesCount() > 0, () -> metric.getName() + " should return at least one row");
        }
    }

    private CollectRep.MetricsData collect(Metrics metric) {
        Job job = Job.builder()
                .monitorId(1L)
                .tenantId(1L)
                .app("oceanbase")
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
        jdbcProtocol.setPort(String.valueOf(container.getMappedPort(2881)));
        jdbcProtocol.setUsername(OCEANBASE_USERNAME);
        jdbcProtocol.setPassword(OCEANBASE_PASSWORD);
        jdbcProtocol.setTimeout(String.valueOf(Duration.ofSeconds(12).toMillis()));
        jdbcProtocol.setReuseConnection("false");
        jdbcProtocol.setUrl(null);
        jdbcProtocol.setSshTunnel(null);
        jdbcProtocol.setDatabase(OCEANBASE_DATABASE);
        if (metric.getAliasFields() == null || metric.getAliasFields().isEmpty()) {
            metric.setAliasFields(metric.getFields().stream().map(Metrics.Field::getField).collect(Collectors.toList()));
        }
        return metric;
    }

    private Job loadOceanbaseTemplate() throws IOException {
        Path template = Path.of("..", "..", "hertzbeat-manager", "src", "main", "resources", "define", "app-oceanbase.yml")
                .toAbsolutePath()
                .normalize();
        Yaml yaml = new Yaml();
        try (Reader reader = Files.newBufferedReader(template)) {
            return yaml.loadAs(reader, Job.class);
        }
    }

    private void awaitSysLoginReady() throws Exception {
        long deadline = System.currentTimeMillis() + Duration.ofMinutes(3).toMillis();
        while (System.currentTimeMillis() < deadline) {
            try {
                var result = container.execInContainer("sh", "-lc", obclientCommand("select 1"));
                if (result.getExitCode() == 0) {
                    return;
                }
            } catch (Exception ignored) {
                // Wait for OceanBase observer bootstrap to finish and accept sys tenant logins.
            }
            Thread.sleep(1000);
        }
        throw new IllegalStateException("Timed out waiting for OceanBase sys tenant login to become ready");
    }

    private void startBackgroundSleepQuery() throws Exception {
        String command = "nohup sh -lc '" + obclientCommand("select sleep(15);").replace("'", "'\"'\"'") + " >/tmp/oceanbase-process-state.log 2>&1' >/dev/null 2>&1 &";
        container.execInContainer("sh", "-lc", command);
        Thread.sleep(500);
    }

    private String obclientCommand(String sql) {
        StringBuilder command = new StringBuilder("obclient -h127.0.0.1 -P2881 -u")
                .append(OCEANBASE_USERNAME)
                .append(" -D")
                .append(OCEANBASE_DATABASE)
                .append(" -A ");
        if (!OCEANBASE_PASSWORD.isEmpty()) {
            command.append("-p").append(OCEANBASE_PASSWORD).append(' ');
        }
        command.append("-e \"").append(sql.replace("\"", "\\\"")).append('"');
        return command.toString();
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
