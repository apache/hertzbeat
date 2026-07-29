/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Proves the authenticated public HTTP boundary can ingest, detect, and query all three signals in Greptime.
 */
@SpringBootTest(
        classes = org.apache.hertzbeat.startup.HertzBeatApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "hertzbeat.otlp.grpc.enabled=false",
                "otel.sdk.disabled=true",
                "scheduler.server.enabled=false",
                "spring.datasource.url=jdbc:h2:mem:hertzbeat-authenticated-greptime-e2e;MODE=MYSQL;DB_CLOSE_DELAY=-1",
                "warehouse.store.duckdb.enabled=false",
                "warehouse.store.greptime.enabled=true",
                "warehouse.store.greptime.username=",
                "warehouse.store.greptime.password="
        })
@Testcontainers
class AuthenticatedGreptimeThreeSignalPublicApiE2eTest extends GreptimeThreeSignalE2eSupport {

    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(20);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(REQUEST_TIMEOUT)
            .build();

    @LocalServerPort
    private int serverPort;

    @Autowired
    private CollectorDao collectorDao;

    @Test
    void authenticatedPublicApiIngestsDetectsAndQueriesThreeSignalsInGreptime() throws Exception {
        advertiseCollectorProfile();
        long startedAt = System.currentTimeMillis() - 1_000;
        long signalTimeNanos = System.currentTimeMillis() * 1_000_000L;
        byte[] detectionBody = detectionBody(startedAt);

        assertUnauthenticatedRequestsAreRejected(detectionBody);
        String token = login();

        postSignal("metrics", metrics(signalTimeNanos).toByteArray(), token);
        postSignal("logs", logs(signalTimeNanos).toByteArray(), token);
        postSignal("traces", traces(signalTimeNanos).toByteArray(), token);

        JsonNode queryContext = awaitReceivedDetection(detectionBody, token);
        awaitPublicQueries(queryContext, token);
    }

    private void assertUnauthenticatedRequestsAreRejected(byte[] detectionBody) throws Exception {
        HttpResponse<byte[]> ingest = send(postProtobuf("/api/otlp/v1/metrics", metrics(
                System.currentTimeMillis() * 1_000_000L).toByteArray(), null));
        assertThat(ingest.statusCode()).isEqualTo(401);

        HttpResponse<byte[]> detection = send(postJson("/api/instrumentation/detect", detectionBody, null));
        assertThat(detection.statusCode()).isEqualTo(401);

        HttpResponse<byte[]> query = send(get("/api/ingestion/otlp/metrics/console", null));
        assertThat(query.statusCode()).isEqualTo(401);
    }

    private String login() throws Exception {
        byte[] body = OBJECT_MAPPER.writeValueAsBytes(Map.of(
                "type", 0,
                "identifier", "admin",
                "credential", "hertzbeat"));
        HttpResponse<byte[]> response = send(postJson("/api/account/auth/form", body, null));
        assertThat(response.statusCode()).isEqualTo(200);
        JsonNode envelope = OBJECT_MAPPER.readTree(response.body());
        assertThat(envelope.path("code").asInt()).isZero();
        String token = envelope.path("data").path("token").asText();
        assertThat(token).isNotBlank();
        return token;
    }

    private void postSignal(String signal, byte[] payload, String token) throws Exception {
        HttpResponse<byte[]> response = send(postProtobuf("/api/otlp/v1/" + signal, payload, token));
        assertThat(response.statusCode()).isBetween(200, 299);
    }

    private JsonNode awaitReceivedDetection(byte[] detectionBody, String token) {
        JsonNode[] received = new JsonNode[1];
        await().atMost(Duration.ofSeconds(30)).pollInterval(Duration.ofSeconds(1)).untilAsserted(() -> {
            HttpResponse<byte[]> response = send(postJson("/api/instrumentation/detect", detectionBody, token));
            assertThat(response.statusCode()).isEqualTo(200);
            JsonNode envelope = OBJECT_MAPPER.readTree(response.body());
            assertThat(envelope.path("code").asInt()).isZero();
            JsonNode data = envelope.path("data");
            assertThat(data.path("signals").path("metrics").path("status").asText()).isEqualTo("received");
            assertThat(data.path("signals").path("logs").path("status").asText()).isEqualTo("received");
            assertThat(data.path("signals").path("traces").path("status").asText()).isEqualTo("received");
            assertThat(data.path("queryJumps").isArray()).isTrue();
            assertThat(data.path("queryJumps").size()).isEqualTo(3);
            assertThat(data.path("queryJumps").findValuesAsText("enabled")).containsOnly("true");
            received[0] = data.path("queryJumpContext");
        });
        return received[0];
    }

    private void awaitPublicQueries(JsonNode context, String token) {
        await().atMost(Duration.ofSeconds(30)).pollInterval(Duration.ofSeconds(1)).untilAsserted(() -> {
            assertMetricsQuery(context, token);
            assertLogsQuery(context, token);
            assertTracesQuery(context, token);
        });
    }

    private void assertMetricsQuery(JsonNode context, String token) throws Exception {
        Map<String, String> parameters = commonQueryParameters(context);
        parameters.put("query", METRIC_QUERY);
        parameters.put("step", "1s");
        parameters.put("limit", "20");
        JsonNode data = authenticatedGet("/api/ingestion/otlp/metrics/console", parameters, token);
        assertThat(data.path("context").path("collectorId").asText()).isEqualTo(COLLECTOR_ID);
        assertThat(data.path("context").path("instance").asText()).isEqualTo(INSTANCE_ID);
        assertThat(data.path("context").path("endpoint").asText()).isEqualTo(ENDPOINT);
        assertThat(data.path("stats").path("nonEmptySeries").asInt()).isPositive();
        assertThat(data.path("results").path("frames").isArray()).isTrue();
        assertThat(data.path("results").path("frames").size()).isPositive();
    }

    private void assertLogsQuery(JsonNode context, String token) throws Exception {
        Map<String, String> parameters = commonQueryParameters(context);
        parameters.put("traceId", TRACE_ID);
        parameters.put("spanId", SPAN_ID);
        parameters.put("severityText", "INFO");
        parameters.put("search", LOG_BODY);
        parameters.put("pageIndex", "0");
        parameters.put("pageSize", "20");
        JsonNode content = authenticatedGet("/api/logs/list", parameters, token).path("content");
        assertThat(content.isArray()).isTrue();
        assertThat(content.size()).isEqualTo(1);
        JsonNode log = content.get(0);
        assertThat(log.path("body").asText()).isEqualTo(LOG_BODY);
        assertThat(log.path("traceId").asText()).isEqualTo(TRACE_ID);
        assertThat(log.path("spanId").asText()).isEqualTo(SPAN_ID);
        assertThat(log.path("resource").path("hertzbeat.collector.id").asText()).isEqualTo(COLLECTOR_ID);
        assertThat(log.path("resource").path("service.instance.id").asText()).isEqualTo(INSTANCE_ID);
        assertThat(log.path("attributes").path("http.route").asText()).isEqualTo(ENDPOINT);
    }

    private void assertTracesQuery(JsonNode context, String token) throws Exception {
        Map<String, String> parameters = commonQueryParameters(context);
        parameters.put("traceId", TRACE_ID);
        parameters.put("operationName", SPAN_NAME);
        parameters.put("spanScope", "root");
        parameters.put("pageIndex", "0");
        parameters.put("pageSize", "20");
        JsonNode content = authenticatedGet("/api/traces/list", parameters, token).path("content");
        assertThat(content.isArray()).isTrue();
        assertThat(content.size()).isEqualTo(1);
        JsonNode trace = content.get(0);
        assertThat(trace.path("traceId").asText()).isEqualTo(TRACE_ID);
        assertThat(trace.path("rootSpanId").asText()).isEqualTo(SPAN_ID);
        assertThat(trace.path("serviceName").asText()).isEqualTo(SERVICE_NAME);
        assertThat(trace.path("resourceAttributes").path("hertzbeat.collector.id").asText())
                .isEqualTo(COLLECTOR_ID);
        assertThat(trace.path("resourceAttributes").path("service.instance.id").asText())
                .isEqualTo(INSTANCE_ID);
    }

    private JsonNode authenticatedGet(String path, Map<String, String> parameters, String token) throws Exception {
        HttpResponse<byte[]> response = send(get(path + queryString(parameters), token));
        assertThat(response.statusCode()).isEqualTo(200);
        JsonNode envelope = OBJECT_MAPPER.readTree(response.body());
        assertThat(envelope.path("code").asInt()).isZero();
        return envelope.path("data");
    }

    private Map<String, String> commonQueryParameters(JsonNode context) {
        Map<String, String> parameters = new LinkedHashMap<>();
        parameters.put("start", context.path("startedAt").asText());
        parameters.put("end", Long.toString(context.path("detectedAt").asLong() + 60_000));
        parameters.put("serviceName", context.path("serviceName").asText());
        parameters.put("serviceNamespace", context.path("serviceNamespace").asText());
        parameters.put("environment", context.path("environment").asText());
        parameters.put("collectorId", context.path("collectorId").asText());
        parameters.put("instance", context.path("serviceInstanceId").asText());
        parameters.put("endpoint", context.path("endpoint").asText());
        return parameters;
    }

    private byte[] detectionBody(long startedAt) throws Exception {
        Map<String, Object> service = Map.of(
                "name", SERVICE_NAME,
                "namespace", SERVICE_NAMESPACE,
                "environment", ENVIRONMENT,
                "serviceInstanceId", INSTANCE_ID,
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

    /**
     * Collector persistence is deterministic test setup only. All behavior under proof starts at the public HTTP
     * boundary; no ingestion, detection, or query service is invoked directly.
     */
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

    private HttpRequest postProtobuf(String path, byte[] body, String token) {
        HttpRequest.Builder builder = request(path)
                .header("Content-Type", "application/x-protobuf")
                .header("Accept", "application/x-protobuf")
                .POST(HttpRequest.BodyPublishers.ofByteArray(body));
        return authorize(builder, token).build();
    }

    private HttpRequest postJson(String path, byte[] body, String token) {
        HttpRequest.Builder builder = request(path)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofByteArray(body));
        return authorize(builder, token).build();
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
