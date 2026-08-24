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

package org.apache.hertzbeat.collector.collect.basic.http;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollectE2eTest;
import org.apache.hertzbeat.collector.collect.http.HttpCollectImpl;
import org.apache.hertzbeat.collector.dispatch.CollectDataDispatch;
import org.apache.hertzbeat.collector.dispatch.MetricsCollect;
import org.apache.hertzbeat.collector.dispatch.unit.impl.DataSizeConvert;
import org.apache.hertzbeat.collector.timer.WheelTimerTask;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.apache.hertzbeat.common.entity.job.protocol.Protocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.timer.Timeout;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.util.ResourceUtils;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

/**
 * Integration test for etcd monitoring functionality.
 * Fixture at src/test/resources/http/etcd/metrics.txt is a real capture from a live
 * etcd v3.5.17 /metrics endpoint (see app-etcd.yml for the corresponding template).
 */
@Slf4j
@ExtendWith(MockitoExtension.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class EtcdMonitorE2eTest extends AbstractCollectE2eTest {

    private static final int MOCK_SERVER_PORT = 52379;
    private static final String LOCALHOST = "127.0.0.1";
    private static HttpServer mockServer;

    @AfterAll
    public static void tearDown() {
        if (mockServer != null) {
            mockServer.stop(0);
        }
    }

    @BeforeEach
    public void setUp() throws Exception {
        super.setUp();
        collect = new HttpCollectImpl();

        // the shared harness wires MetricsCollect with an empty unit-convert list,
        // but this template relies on B->MB conversion
        Timeout convertTimeout = mock(Timeout.class);
        WheelTimerTask convertTimerJob = mock(WheelTimerTask.class);
        when(convertTimeout.task()).thenReturn(convertTimerJob);
        when(convertTimerJob.getJob()).thenReturn(mock(Job.class));
        metricsCollect = new MetricsCollect(mock(Metrics.class), convertTimeout,
                mock(CollectDataDispatch.class), null, List.of(new DataSizeConvert()));

        String metricsResponse = loadResponseFromFile("classpath:http/etcd/metrics.txt");

        mockServer = HttpServer.create(new InetSocketAddress(MOCK_SERVER_PORT), 0);
        mockServer.setExecutor(null);
        mockServer.start();
        mockServer.createContext("/metrics", exchange -> sendTextResponse(exchange, metricsResponse));
    }

    private String loadResponseFromFile(String resourcePath) throws Exception {
        return new String(Files.readAllBytes(ResourceUtils.getFile(resourcePath).toPath()));
    }

    private void sendTextResponse(HttpExchange exchange, String response) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "text/plain");
        final byte[] array = response.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(200, array.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(array);
        }
    }

    private static final Map<String, String> EXPECTED_VALUES = Map.of(
            "etcd_server_has_leader", "1",
            "etcd_mvcc_db_total_size_in_bytes", "0.0195",
            "etcd_server_leader_changes_seen_total", "1",
            "process_cpu_seconds_total", "42.41",
            "process_resident_memory_bytes", "29.9844");

    @Test
    public void testEtcdMonitor() {
        Job etcdJob = appService.getAppDefine("etcd");
        List<Map<String, Configmap>> configmapFromPreCollectData = new LinkedList<>();
        for (Metrics metricsDef : etcdJob.getMetrics()) {
            metricsDef = CollectUtil.replaceCryPlaceholderToMetrics(metricsDef,
                    !configmapFromPreCollectData.isEmpty() ? configmapFromPreCollectData.get(0) : new HashMap<>());
            CollectRep.MetricsData metricsData = validateMetricsCollection(metricsDef, metricsDef.getName());
            Assertions.assertEquals(EXPECTED_VALUES.get(metricsDef.getName()),
                    metricsData.getValues().get(0).getColumns(0),
                    metricsDef.getName() + " collected value mismatch");
            configmapFromPreCollectData = CollectUtil.getConfigmapFromPreCollectData(metricsData);
        }
    }

    @Override
    protected Protocol buildProtocol(Metrics metricsDef) {
        HttpProtocol protocol = new HttpProtocol();
        protocol.setHost(LOCALHOST);
        protocol.setPort(String.valueOf(MOCK_SERVER_PORT));
        protocol.setMethod(metricsDef.getHttp().getMethod());
        protocol.setParseType(metricsDef.getHttp().getParseType());
        protocol.setParseScript(metricsDef.getHttp().getParseScript());
        protocol.setUrl(metricsDef.getHttp().getUrl());
        return protocol;
    }

    @Override
    protected CollectRep.MetricsData.Builder collectMetrics(Metrics metricsDef) {
        HttpProtocol protocol = (HttpProtocol) buildProtocol(metricsDef);
        metrics.setHttp(protocol);
        // prometheus parseType filters by builder.getMetrics(); production sets it in
        // MetricsCollect.run() but this test harness does not, so set it here
        CollectRep.MetricsData.Builder metricsData = CollectRep.MetricsData.newBuilder()
                .setMetrics(metricsDef.getName());
        return collectMetricsData(metrics, metricsDef, metricsData);
    }
}
