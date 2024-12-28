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
import java.util.List;
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

    @AfterAll
    public static void tearDown() {
        if (mockServer != null) {
            mockServer.stop(0);
        }
    }

    @BeforeEach
    public void setUp() throws Exception {
        initializeServices();
        setupMockServer();
        setupDockerEndpoints();
    }

    @Test
    public void testDockerMonitor() {
        Job dockerJob = appService.getAppDefine("docker");
        dockerJob.getMetrics().forEach(this::validateMetricsCollection);
    }

    private void initializeServices() throws Exception {
        appService.run();
        httpCollector = new HttpCollectImpl();
        metricsTemplate = new Metrics();
    }

    private void setupMockServer() throws Exception {
        mockServer = HttpServer.create(new InetSocketAddress(MOCK_SERVER_PORT), 0);
        mockServer.setExecutor(null);
        mockServer.start();
    }

    private void setupDockerEndpoints() throws Exception {
        setupContainersEndpoint();
        setupInfoEndpoint();
    }

    private void setupContainersEndpoint() throws Exception {
        String containerResponse = loadResponseFromFile("classpath:http/docker/system_result.txt");
        mockServer.createContext("/containers/json", exchange -> handleContainersRequest(exchange, containerResponse));
    }

    private void setupInfoEndpoint() throws Exception {
        String infoResponse = loadResponseFromFile("classpath:http/docker/containers_result.txt");
        mockServer.createContext("/info", exchange -> handleInfoRequest(exchange, infoResponse));
    }

    private String loadResponseFromFile(String resourcePath) throws Exception {
        return new String(Files.readAllBytes(ResourceUtils.getFile(resourcePath).toPath()));
    }

    private void handleContainersRequest(HttpExchange exchange, String response) throws IOException {
        String query = exchange.getRequestURI().getQuery();
        if (query != null && query.contains("all=true")) {
            sendJsonResponse(exchange, response);
        } else {
            sendNotFoundResponse(exchange);
        }
    }

    private void handleInfoRequest(HttpExchange exchange, String response) throws IOException {
        sendJsonResponse(exchange, response);
    }

    private void sendJsonResponse(HttpExchange exchange, String response) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, response.getBytes().length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes());
        }
    }

    private void sendNotFoundResponse(HttpExchange exchange) throws IOException {
        exchange.sendResponseHeaders(404, 0);
        exchange.close();
    }


    private void validateMetricsCollection(Metrics metricsDef) {
        if (shouldSkipMetric(metricsDef)) {
            return;
        }
        String metricName = metricsDef.getName();
        CollectRep.MetricsData.Builder metricsData = collectMetrics(metricsDef);

        validateMetricsResults(metricName, metricsData);
        log.info("{} metrics validation passed", metricName);
    }

    private boolean shouldSkipMetric(Metrics metricsDef) {
        // TODO Skip metrics containing "^o^" as parameter substitution is not supported in e2e tests
        return metricsDef.getHttp().getUrl().contains("^o^");
    }

    private CollectRep.MetricsData.Builder collectMetrics(Metrics metricsDef) {
        HttpProtocol httpProtocol = createHttpProtocol(metricsDef);
        metricsTemplate.setHttp(httpProtocol);
        metricsTemplate.setAliasFields(determineAliasFields(metricsDef));

        CollectRep.MetricsData.Builder metricsData = CollectRep.MetricsData.newBuilder();
        httpCollector.collect(metricsData, metricsTemplate);
        return metricsData;
    }

    private List<String> determineAliasFields(Metrics metricsDef) {
        return metricsDef.getAliasFields() == null ? metricsDef.getFields().stream()
                        .map(Metrics.Field::getField)
                        .collect(Collectors.toList()) :
                metricsDef.getAliasFields();
    }

    private void validateMetricsResults(String metricName, CollectRep.MetricsData.Builder metricsData) {
        Assertions.assertTrue(metricsData.getValuesList().size() > 0,
                String.format("%s metrics values should not be empty", metricName));

        CollectRep.ValueRow firstRow = metricsData.getValuesList().get(0);
        validateRowColumns(metricName, firstRow);
    }

    private void validateRowColumns(String metricName, CollectRep.ValueRow row) {
        for (int i = 0; i < row.getColumnsCount(); i++) {
            Assertions.assertFalse(row.getColumns(i).isEmpty(),
                    String.format("%s metric column %d should not be empty", metricName, i));
        }
    }

    private HttpProtocol createHttpProtocol(Metrics metricsDef) {
        HttpProtocol protocol = new HttpProtocol();
        protocol.setHost(LOCALHOST);
        protocol.setPort(String.valueOf(MOCK_SERVER_PORT));
        protocol.setMethod(metricsDef.getHttp().getMethod());
        protocol.setParseType(metricsDef.getHttp().getParseType());
        protocol.setParseScript(metricsDef.getHttp().getParseScript());
        protocol.setUrl(metricsDef.getHttp().getUrl());
        return protocol;
    }


}
