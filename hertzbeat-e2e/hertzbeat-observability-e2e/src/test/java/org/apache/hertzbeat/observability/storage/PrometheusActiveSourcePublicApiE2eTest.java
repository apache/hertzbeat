/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.observability.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.instrumentation.intake.CollectorIntakeAdvertisementCodec;
import org.apache.hertzbeat.manager.instrumentation.intake.CollectorIntakeAdvertisementRequest;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Capability;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Gateway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Proves a managed active scrape reaches persisted public evidence without a forged OTLP request. */
@SpringBootTest(
        classes = org.apache.hertzbeat.startup.HertzBeatApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "hertzbeat.otlp.grpc.enabled=false",
                "otel.sdk.disabled=true",
                "scheduler.server.enabled=false",
                "spring.datasource.url=jdbc:h2:mem:hertzbeat-active-prometheus-e2e;MODE=MYSQL;DB_CLOSE_DELAY=-1",
                "warehouse.store.duckdb.enabled=false",
                "warehouse.store.greptime.enabled=true",
                "warehouse.store.greptime.username=",
                "warehouse.store.greptime.password="
        })
@Testcontainers
class PrometheusActiveSourcePublicApiE2eTest extends GreptimeThreeSignalE2eSupport {

    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(20);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(REQUEST_TIMEOUT).build();

    @LocalServerPort
    private int serverPort;

    @Autowired
    private CollectorDao collectorDao;

    @TempDir
    private Path tempDir;

    @Test
    void managedPrometheusSourceScrapesWritesAndSurfacesPersistedEvidence() throws Exception {
        advertiseCollectorProfile();
        String adminToken = login();
        long entityId = createEntity(adminToken);
        String intakeToken = generateCollectorIntakeToken(adminToken);
        long startedAt = System.currentTimeMillis() - 1_000;

        try (ActivePrometheusFixture prometheus = new ActivePrometheusFixture()) {
            prometheus.start();
            String instance = "127.0.0.1:" + prometheus.port();
            try (ManagedPrometheusRuntimeHarness runtime = new ManagedPrometheusRuntimeHarness(
                    tempDir, serverPort, prometheus.port(), intakeToken)) {
                runtime.start();

                await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
                        assertThat(prometheus.requestCount()).isPositive());
                JsonNode queryContext = awaitMetricsDetection(startedAt, instance, adminToken);
                awaitMetricsQuery(queryContext, adminToken);
                awaitEntityEvidence(entityId, adminToken);
            }
        }
    }

    private String login() throws Exception {
        byte[] body = OBJECT_MAPPER.writeValueAsBytes(Map.of(
                "type", 0,
                "identifier", "admin",
                "credential", "hertzbeat"));
        JsonNode data = successfulJson(send(postJson("/api/account/auth/form", body, null)));
        assertThat(data.path("token").asText()).isNotBlank();
        return data.path("token").asText();
    }

    private long createEntity(String adminToken) throws Exception {
        byte[] body = OBJECT_MAPPER.writeValueAsBytes(Map.of("entity", Map.of(
                "type", "service",
                "name", SERVICE_NAME,
                "namespace", SERVICE_NAMESPACE,
                "environment", ENVIRONMENT)));
        return successfulJson(send(postJson("/api/entities", body, adminToken))).asLong();
    }

    private String generateCollectorIntakeToken(String adminToken) throws Exception {
        Map<String, String> parameters = Map.of(
                "collectorId", COLLECTOR_ID,
                "workspaceId", "default",
                "expireSeconds", "3600");
        HttpRequest request = authorize(request(
                "/api/account/token/collector-intake/generate" + queryString(parameters))
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.noBody()), adminToken).build();
        String token = successfulJson(send(request)).path("token").asText();
        assertThat(token).isNotBlank();
        return token;
    }

    private JsonNode awaitMetricsDetection(long startedAt, String instance, String token) throws Exception {
        byte[] body = detectionBody(startedAt, instance);
        JsonNode[] context = new JsonNode[1];
        await().atMost(Duration.ofSeconds(45)).pollInterval(Duration.ofSeconds(1)).untilAsserted(() -> {
            JsonNode data = successfulJson(send(postJson("/api/instrumentation/detect", body, token)));
            assertThat(data.path("signals").path("metrics").path("status").asText()).isEqualTo("received");
            assertThat(data.path("queryJumps").get(0).path("enabled").asBoolean()).isTrue();
            context[0] = data.path("queryJumpContext");
        });
        return context[0];
    }

    private void awaitMetricsQuery(JsonNode context, String token) {
        Map<String, String> parameters = new LinkedHashMap<>();
        parameters.put("start", context.path("startedAt").asText());
        parameters.put("end", Long.toString(context.path("detectedAt").asLong() + 60_000));
        parameters.put("serviceName", context.path("serviceName").asText());
        parameters.put("serviceNamespace", context.path("serviceNamespace").asText());
        parameters.put("environment", context.path("environment").asText());
        parameters.put("collectorId", context.path("collectorId").asText());
        parameters.put("instance", context.path("serviceInstanceId").asText());
        parameters.put("endpoint", context.path("endpoint").asText());
        parameters.put("query", METRIC_QUERY);
        parameters.put("step", "1s");
        parameters.put("limit", "20");
        await().atMost(Duration.ofSeconds(30)).pollInterval(Duration.ofSeconds(1)).untilAsserted(() -> {
            JsonNode data = successfulJson(send(get(
                    "/api/ingestion/otlp/metrics/console" + queryString(parameters), token)));
            assertThat(data.path("stats").path("nonEmptySeries").asInt()).isPositive();
            assertThat(data.path("results").path("frames").size()).isPositive();
        });
    }

    private void awaitEntityEvidence(long entityId, String token) {
        await().atMost(Duration.ofSeconds(30)).pollInterval(Duration.ofSeconds(1)).untilAsserted(() -> {
            JsonNode data = successfulJson(send(get("/api/entities/" + entityId + "/detail", token)));
            assertThat(data.path("metricEvidence").findValuesAsText("metricName")).contains(METRIC_QUERY);
            JsonNode evidence = data.path("metricEvidence").findParents("metricName").stream()
                    .filter(candidate -> METRIC_QUERY.equals(candidate.path("metricName").asText()))
                    .findFirst()
                    .orElseThrow();
            // "otlp" is the managed intake transport provenance; the originating source remains Prometheus.
            assertThat(evidence.path("source").asText()).isEqualTo("otlp");
            assertThat(evidence.path("identitySnapshot").path("serviceName").asText()).isEqualTo(SERVICE_NAME);
            assertThat(evidence.path("identitySnapshot").path("environmentName").asText()).isEqualTo(ENVIRONMENT);
        });
    }

    private byte[] detectionBody(long startedAt, String instance) throws Exception {
        Map<String, Object> service = Map.of(
                "name", SERVICE_NAME,
                "namespace", SERVICE_NAMESPACE,
                "environment", ENVIRONMENT,
                "serviceInstanceId", instance,
                "endpoint", ENDPOINT);
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("schemaVersion", 2);
        request.put("sourceKind", "quick_start");
        request.put("recipeId", "opentelemetry_telemetrygen");
        request.put("environment", "vm");
        request.put("platform", "linux_amd64");
        request.put("service", service);
        request.put("intakeProfileId", "collector:" + COLLECTOR_ID);
        request.put("startedAt", startedAt);
        return OBJECT_MAPPER.writeValueAsBytes(request);
    }

    /** Collector persistence is control-plane setup; telemetry starts only at the real scrape endpoint. */
    private void advertiseCollectorProfile() {
        String advertisement = new CollectorIntakeAdvertisementCodec().encode(
                new CollectorIntakeAdvertisementRequest(
                        1,
                        Gateway.COLLECTOR,
                        java.util.List.of(Capability.OTLP_HTTP_PROTOBUF),
                        "http://127.0.0.1:4318",
                        null));
        collectorDao.save(Collector.builder()
                .name(COLLECTOR_ID)
                .ip("127.0.0.1")
                .status(CommonConstants.COLLECTOR_STATUS_ONLINE)
                .instrumentationIntake(advertisement)
                .build());
    }

    private JsonNode successfulJson(HttpResponse<byte[]> response) throws Exception {
        assertThat(response.statusCode()).isEqualTo(200);
        JsonNode envelope = OBJECT_MAPPER.readTree(response.body());
        assertThat(envelope.path("code").asInt()).isZero();
        return envelope.path("data");
    }

    private HttpRequest postJson(String path, byte[] body, String token) {
        return authorize(request(path)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofByteArray(body)), token).build();
    }

    private HttpRequest get(String path, String token) {
        return authorize(request(path).header("Accept", "application/json").GET(), token).build();
    }

    private HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder()
                .uri(URI.create("http://127.0.0.1:" + serverPort + path))
                .timeout(REQUEST_TIMEOUT);
    }

    private HttpRequest.Builder authorize(HttpRequest.Builder builder, String token) {
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return builder;
    }

    private HttpResponse<byte[]> send(HttpRequest request) throws Exception {
        return httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
    }

    private String queryString(Map<String, String> parameters) {
        StringBuilder query = new StringBuilder("?");
        parameters.forEach((key, value) -> {
            if (query.length() > 1) {
                query.append('&');
            }
            query.append(URLEncoder.encode(key, StandardCharsets.UTF_8))
                    .append('=')
                    .append(URLEncoder.encode(value, StandardCharsets.UTF_8));
        });
        return query.toString();
    }
}
