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
import org.apache.hertzbeat.collector.collect.http.HttpCollectImpl;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.manager.service.impl.AppServiceImpl;
import org.apache.hertzbeat.manager.service.impl.ObjectStoreConfigServiceImpl;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.util.ResourceUtils;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.util.stream.Collectors;

/**
 * Integration test for Docker monitoring functionality
 */
@Slf4j
@ExtendWith(MockitoExtension.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class DockerMonitorE2eTest {

    private static final int MOCK_SERVER_PORT = 52375;
    private static final String LOCALHOST = "127.0.0.1";
    private static HttpServer mockServer;

    @InjectMocks
    private AppServiceImpl appService;

    private HttpCollectImpl httpCollector;
    private Metrics metricsTemplate;

    @Mock
    private ObjectStoreConfigServiceImpl objectStoreConfigService;

    @BeforeEach
    public void setUp() throws Exception {
        // Initialize services
        appService.run();
        httpCollector = new HttpCollectImpl();
        metricsTemplate = new Metrics();

        // Setup mock server and endpoints
        mockServer = HttpServer.create(new InetSocketAddress(MOCK_SERVER_PORT), 0);
        mockServer.setExecutor(null);
        mockServer.start();

        // Setup Docker API endpoints
        String containerResponse = loadResponseFromFile("classpath:http/docker/containers_result.txt");
        String infoResponse = loadResponseFromFile("classpath:http/docker/system_result.txt");

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
    }

    private String loadResponseFromFile(String resourcePath) throws Exception {
        return new String(Files.readAllBytes(ResourceUtils.getFile(resourcePath).toPath()));
    }

    private void sendJsonResponse(HttpExchange exchange, String response) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, response.getBytes().length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes());
        }
    }

    @Test
    public void testDockerMonitor() {
        Job dockerJob = appService.getAppDefine("docker");
        dockerJob.getMetrics().forEach(this::validateMetricsCollection);
    }

    private void validateMetricsCollection(Metrics metricsDef) {
        // Skip metrics containing "^o^" as parameter substitution is not supported in e2e tests
        if (metricsDef.getHttp().getUrl().contains("^o^")) {
            return;
        }

        String metricName = metricsDef.getName();

        // Setup HTTP protocol and collect metrics
        HttpProtocol protocol = new HttpProtocol();
        protocol.setHost(LOCALHOST);
        protocol.setPort(String.valueOf(MOCK_SERVER_PORT));
        protocol.setMethod(metricsDef.getHttp().getMethod());
        protocol.setParseType(metricsDef.getHttp().getParseType());
        protocol.setParseScript(metricsDef.getHttp().getParseScript());
        protocol.setUrl(metricsDef.getHttp().getUrl());

        metricsTemplate.setHttp(protocol);
        metricsTemplate.setAliasFields(metricsDef.getAliasFields() == null ? metricsDef.getFields().stream()
                        .map(Metrics.Field::getField)
                        .collect(Collectors.toList()) : metricsDef.getAliasFields());

        // Collect and validate metrics
        CollectRep.MetricsData.Builder metricsData = CollectRep.MetricsData.newBuilder();
        httpCollector.collect(metricsData, metricsTemplate);

        // Validate results
        Assertions.assertTrue(metricsData.getValuesList().size() > 0,
                String.format("%s metrics values should not be empty", metricName));

        CollectRep.ValueRow firstRow = metricsData.getValuesList().get(0);
        for (int i = 0; i < firstRow.getColumnsCount(); i++) {
            Assertions.assertFalse(firstRow.getColumns(i).isEmpty(),
                    String.format("%s metric column %d should not be empty", metricName, i));
        }

        log.info("{} metrics validation passed", metricName);
    }

    @AfterAll
    public static void tearDown() {
        if (mockServer != null) {
            mockServer.stop(0);
        }
    }
}