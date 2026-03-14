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
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;
import org.yaml.snakeyaml.Yaml;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class TidbJdbcQueryAdapterIntegrationTest {

    private static final String TIDB_USERNAME = "root";
    private static final String TIDB_PASSWORD = "";
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();

    private GenericContainer<?> container;
    private MysqlR2dbcJdbcQueryExecutor jdbcQueryExecutor;
    private Metrics tidbBasicMetric;

    @BeforeAll
    void setUp() throws Exception {
        Assumptions.assumeTrue(DockerClientFactory.instance().isDockerAvailable(), "Docker is required for integration tests");
        new CollectStrategyFactory().run();
        container = new GenericContainer<>(DockerImageName.parse("pingcap/tidb:v7.5.1"))
                .withCommand("--store=unistore", "--path=")
                .withExposedPorts(4000, 10080)
                .waitingFor(Wait.forLogMessage(".*server is running MySQL protocol.*", 1));
        container.start();
        waitForStatusEndpoint();

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
        tidbBasicMetric = loadTidbBasicMetric();
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

    @Test
    void shouldCollectTidbBasicMetricThroughMysqlCompatibleQueryAdapter() {
        Metrics metric = materializeMetric(tidbBasicMetric);
        CollectRep.MetricsData metricsData = collect(metric);
        assertEquals(CollectRep.Code.SUCCESS, metricsData.getCode(), metricsData.getMsg());
        assertEquals(metric.getFields().size(), metricsData.getFieldsCount());
        assertTrue(metricsData.getValuesCount() > 0);
        assertNotNull(metricsData.getValues().getFirst());
        assertTrue(metricsData.getValues().getFirst().getColumnsList().stream()
                        .anyMatch(value -> !Objects.equals(CommonConstants.NULL_VALUE, value) && !value.isEmpty()),
                "TiDB basic should still return at least one concrete field value through the adapted query path");
    }

    private Metrics materializeMetric(Metrics templateMetric) {
        Metrics metric = JsonUtil.fromJson(JsonUtil.toJson(templateMetric), Metrics.class);
        JdbcProtocol jdbcProtocol = metric.getJdbc();
        jdbcProtocol.setHost(container.getHost());
        jdbcProtocol.setPort(String.valueOf(container.getMappedPort(4000)));
        jdbcProtocol.setUsername(TIDB_USERNAME);
        jdbcProtocol.setPassword(TIDB_PASSWORD);
        jdbcProtocol.setTimeout(String.valueOf(Duration.ofSeconds(8).toMillis()));
        jdbcProtocol.setReuseConnection("false");
        jdbcProtocol.setDatabase(null);
        jdbcProtocol.setUrl(null);
        jdbcProtocol.setSshTunnel(null);
        return metric;
    }

    private Metrics loadTidbBasicMetric() throws IOException {
        Path template = Path.of("..", "..", "hertzbeat-manager", "src", "main", "resources", "define", "app-tidb.yml")
                .toAbsolutePath()
                .normalize();
        Yaml yaml = new Yaml();
        try (Reader reader = Files.newBufferedReader(template)) {
            Job job = yaml.loadAs(reader, Job.class);
            return job.getMetrics().stream()
                    .filter(metric -> "basic".equals(metric.getName()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("Unable to locate the basic metric in app-tidb.yml"));
        }
    }

    private CollectRep.MetricsData collect(Metrics metric) {
        Job job = Job.builder()
                .monitorId(1L)
                .tenantId(1L)
                .app("tidb")
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

    private void waitForStatusEndpoint() throws Exception {
        long deadline = System.currentTimeMillis() + Duration.ofSeconds(30).toMillis();
        String statusUrl = "http://" + container.getHost() + ":" + container.getMappedPort(10080) + "/status";
        while (System.currentTimeMillis() < deadline) {
            try {
                HttpRequest request = HttpRequest.newBuilder(URI.create(statusUrl))
                        .GET()
                        .timeout(Duration.ofSeconds(3))
                        .build();
                HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    return;
                }
            } catch (Exception ignored) {
                // Wait for the TiDB status endpoint to become available.
            }
            Thread.sleep(1000);
        }
        throw new IllegalStateException("Timed out waiting for TiDB status endpoint");
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
