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

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollectE2eTest;
import org.apache.hertzbeat.collector.collect.http.HttpCollectImpl;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.Protocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * E2E test for PrestoDB monitor with HTTP Basic Auth enabled (issue #2838).
 * Unlike other http monitor tests, the protocol is taken from the template definition
 * after placeholder replacement (mirroring WheelTimerTask#initJobMetrics), so a metric
 * whose http section lacks the authorization wiring fails this test with a 401.
 */
@Slf4j
@ExtendWith(MockitoExtension.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class PrestodbMonitorE2eTest extends AbstractCollectE2eTest {

    private static final int MOCK_SERVER_PORT = 52390;
    private static final String LOCALHOST = "127.0.0.1";
    private static final String USERNAME = "presto-admin";
    private static final String PASSWORD = "presto-secret";
    private static final Gson GSON = new Gson();
    private static HttpServer mockServer;

    private static final String CLUSTER_JSON = """
            {"activeWorkers": 3, "runningQueries": 2, "queuedQueries": 1,
             "blockedQueries": 0, "runningDrivers": 12, "runningTasks": 5}""";

    private static final String NODE_JSON = """
            [{"uri": "http://127.0.0.1:8080", "recentRequests": 25.3, "recentFailures": 0.0,
              "recentSuccesses": 25.3, "lastRequestTime": "2026-07-08T10:00:00.000Z",
              "lastResponseTime": "2026-07-08T10:00:00.100Z", "age": "5.20d", "recentFailureRatio": 0.0}]""";

    private static final String STATUS_JSON = """
            {"nodeId": "coordinator-1", "nodeVersion": {"version": "0.289"}, "environment": "production",
             "coordinator": true, "uptime": "5.20d", "externalAddress": "127.0.0.1",
             "internalAddress": "127.0.0.1", "processors": 8, "processCpuLoad": 0.35,
             "systemCpuLoad": 0.42, "heapUsed": 1073741824, "heapAvailable": 4294967296, "nonHeapUsed": 268435456}""";

    private static final String TASK_JSON = """
            [{"taskId": "20260708_100000_00001_abcde.1.0.0", "version": 42, "state": "RUNNING",
              "self": "http://127.0.0.1:8080/v1/task/20260708_100000_00001_abcde.1.0.0",
              "lastHeartbeat": "2026-07-08T10:00:00.000Z"}]""";

    @AfterEach
    public void tearDown() {
        if (mockServer != null) {
            mockServer.stop(0);
        }
    }

    @BeforeEach
    public void setUp() throws Exception {
        super.setUp();
        collect = new HttpCollectImpl();

        mockServer = HttpServer.create(new InetSocketAddress(MOCK_SERVER_PORT), 0);
        mockServer.setExecutor(null);
        mockServer.start();
        mockServer.createContext("/v1/cluster", exchange -> sendAuthenticatedJson(exchange, CLUSTER_JSON));
        mockServer.createContext("/v1/node", exchange -> sendAuthenticatedJson(exchange, NODE_JSON));
        mockServer.createContext("/v1/status", exchange -> sendAuthenticatedJson(exchange, STATUS_JSON));
        mockServer.createContext("/v1/task", exchange -> sendAuthenticatedJson(exchange, TASK_JSON));
    }

    private void sendAuthenticatedJson(HttpExchange exchange, String response) throws IOException {
        String expected = "Basic " + Base64.getEncoder()
                .encodeToString((USERNAME + ":" + PASSWORD).getBytes(StandardCharsets.UTF_8));
        if (!expected.equals(exchange.getRequestHeaders().getFirst("Authorization"))) {
            exchange.getResponseHeaders().set("WWW-Authenticate", "Basic realm=\"presto\"");
            exchange.sendResponseHeaders(401, -1);
            exchange.close();
            return;
        }
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        final byte[] array = response.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(200, array.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(array);
        }
    }

    @Test
    public void testPrestodbMonitorWithBasicAuth() {
        Job prestodbJob = appService.getAppDefine("prestodb");
        Map<String, Configmap> configmap = buildParamConfigmap(true);
        for (Metrics metricsDef : prestodbJob.getMetrics()) {
            metricsDef = replaceJobPlaceholder(metricsDef, configmap);
            validateMetricsCollection(metricsDef, metricsDef.getName());
        }
    }

    @Test
    public void testPrestodbMonitorWithoutAuthIsRejected() {
        Job prestodbJob = appService.getAppDefine("prestodb");
        Map<String, Configmap> configmap = buildParamConfigmap(false);
        Metrics availabilityMetric = prestodbJob.getMetrics().stream()
                .filter(m -> "cluster".equals(m.getName()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("prestodb template has no cluster metric"));
        availabilityMetric = replaceJobPlaceholder(availabilityMetric, configmap);
        CollectRep.MetricsData.Builder metricsData = collectMetrics(availabilityMetric);
        Assertions.assertNotEquals(CollectRep.Code.SUCCESS, metricsData.getCode(),
                "collection against an auth-protected endpoint must fail when no credentials are configured");
    }

    private Map<String, Configmap> buildParamConfigmap(boolean withAuth) {
        Map<String, Configmap> configmap = new HashMap<>();
        configmap.put("host", new Configmap("host", LOCALHOST, (byte) 1));
        configmap.put("port", new Configmap("port", String.valueOf(MOCK_SERVER_PORT), (byte) 1));
        configmap.put("ssl", new Configmap("ssl", "false", (byte) 1));
        configmap.put("timeout", new Configmap("timeout", "6000", (byte) 1));
        if (withAuth) {
            configmap.put("authType", new Configmap("authType", "Basic Auth", (byte) 1));
            configmap.put("username", new Configmap("username", USERNAME, (byte) 1));
            configmap.put("password", new Configmap("password", PASSWORD, (byte) 1));
        }
        return configmap;
    }

    /**
     * Mirrors WheelTimerTask#initJobMetrics: replace ^_^param^_^ placeholders
     * in the whole metric definition, keeping the template's http authorization wiring.
     */
    private Metrics replaceJobPlaceholder(Metrics metricsDef, Map<String, Configmap> configmap) {
        JsonElement jsonElement = GSON.toJsonTree(metricsDef);
        CollectUtil.replaceSmilingPlaceholder(jsonElement, configmap);
        return GSON.fromJson(jsonElement, Metrics.class);
    }

    @Override
    protected Protocol buildProtocol(Metrics metricsDef) {
        return metricsDef.getHttp();
    }

    @Override
    protected CollectRep.MetricsData.Builder collectMetrics(Metrics metricsDef) {
        metrics.setHttp(metricsDef.getHttp());
        return collectMetricsData(metrics, metricsDef);
    }
}
