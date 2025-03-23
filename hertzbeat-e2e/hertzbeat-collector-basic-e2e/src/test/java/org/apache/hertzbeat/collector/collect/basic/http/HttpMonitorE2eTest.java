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

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollectE2eTest;
import org.apache.hertzbeat.collector.collect.http.HttpCollectImpl;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.apache.hertzbeat.common.entity.job.protocol.Protocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

/**
 * E2E test for HTTP monitor
 */
@Slf4j
@ExtendWith(MockitoExtension.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class HttpMonitorE2eTest extends AbstractCollectE2eTest {

    private static final int MOCK_SERVER_PORT = 52376;
    private static final String LOCALHOST = "127.0.0.1";
    private static final String RELATIVE_PATH = "/";
    private static final List<String> ALLOW_EMPTY_WHITE_LIST = List.of("header");
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
        // Setup collect instance
        collect = new HttpCollectImpl();

        // Setup mock server and endpoints
        mockServer = HttpServer.create(new InetSocketAddress(MOCK_SERVER_PORT), 0);
        mockServer.setExecutor(null);
        mockServer.start();

        mockServer.createContext(RELATIVE_PATH, exchange -> sendJsonResponse(exchange, ""));

    }

    private void sendJsonResponse(HttpExchange exchange, String response) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        final byte[] array = response.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(200, array.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(array);
        }
    }

    @Test
    public void testHttpMonitor() {
        Job dockerJob = appService.getAppDefine("api");
        List<Map<String, Configmap>> configmapFromPreCollectData = new LinkedList<>();
        for (Metrics metricsDef : dockerJob.getMetrics()) {
            metricsDef = CollectUtil.replaceCryPlaceholderToMetrics(metricsDef, configmapFromPreCollectData.size() > 0 ? configmapFromPreCollectData.get(0) : new HashMap<>());
            CollectRep.MetricsData metricsData;
            if (ALLOW_EMPTY_WHITE_LIST.contains(metricsDef.getName())) {
                metricsData = validateMetricsCollection(metricsDef, metricsDef.getName(), true);
            } else {
                metricsData = validateMetricsCollection(metricsDef, metricsDef.getName());
            }
            configmapFromPreCollectData = CollectUtil.getConfigmapFromPreCollectData(metricsData);
        }
    }

    @Override
    protected Protocol buildProtocol(Metrics metricsDef) {
        // Setup HTTP protocol
        HttpProtocol protocol = new HttpProtocol();
        protocol.setHost(LOCALHOST);
        protocol.setUrl(RELATIVE_PATH);
        protocol.setMethod("GET");
        protocol.setPort(String.valueOf(MOCK_SERVER_PORT));
        protocol.setParseType(metricsDef.getHttp().getParseType());
        protocol.setParseScript(metricsDef.getHttp().getParseScript());
        return protocol;
    }

    @Override
    protected CollectRep.MetricsData.Builder collectMetrics(Metrics metricsDef) {
        HttpProtocol protocol = (HttpProtocol) buildProtocol(metricsDef);
        metrics.setHttp(protocol);
        return collectMetricsData(metrics, metricsDef);
    }
}