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
 * Integration test for Docker monitoring functionality
 */
@Slf4j
@ExtendWith(MockitoExtension.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class DockerMonitorE2eTest extends AbstractCollectE2eTest {

    private static final int MOCK_SERVER_PORT = 52375;
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
        // Setup collect instance
        collect = new HttpCollectImpl();

        // Setup mock server and endpoints
        mockServer = HttpServer.create(new InetSocketAddress(MOCK_SERVER_PORT), 0);
        mockServer.setExecutor(null);
        mockServer.start();

        // Setup Docker API endpoints
        String containerResponse = loadResponseFromFile("classpath:http/docker/containers_result.txt");
        String infoResponse = loadResponseFromFile("classpath:http/docker/system_result.txt");
        String containerStatsResponse = loadResponseFromFile("classpath:http/docker/containers_stats.txt");

        mockServer.createContext("/containers/json", exchange -> {
            String query = exchange.getRequestURI().getQuery();
            if (query != null && query.contains("all=true")) {
                sendJsonResponse(exchange, containerResponse);
            } else {
                exchange.sendResponseHeaders(404, 0);
                exchange.close();
            }
        });

        mockServer.createContext("/info", exchange -> sendJsonResponse(exchange, infoResponse));
        mockServer.createContext("/containers/34174a918eb2e38cdb097c910f74af845e7383b04765d26ad52f940f86342a64/stats", exchange -> sendJsonResponse(exchange, containerStatsResponse));

    }

    private String loadResponseFromFile(String resourcePath) throws Exception {
        return new String(Files.readAllBytes(ResourceUtils.getFile(resourcePath).toPath()));
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
    public void testDockerMonitor() {
        Job dockerJob = appService.getAppDefine("docker");
        List<Map<String, Configmap>> configmapFromPreCollectData = new LinkedList<>();
        for (Metrics metricsDef : dockerJob.getMetrics()) {
            metricsDef = CollectUtil.replaceCryPlaceholderToMetrics(metricsDef, configmapFromPreCollectData.size() > 0 ? configmapFromPreCollectData.get(0) : new HashMap<>());
            CollectRep.MetricsData metricsData = validateMetricsCollection(metricsDef, metricsDef.getName());
            configmapFromPreCollectData = CollectUtil.getConfigmapFromPreCollectData(metricsData);
        }
    }

    @Override
    protected Protocol buildProtocol(Metrics metricsDef) {
        // Setup HTTP protocol
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
        return collectMetricsData(metrics, metricsDef);
    }
}