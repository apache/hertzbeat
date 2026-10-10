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

package org.apache.hertzbeat.observability.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.protobuf.ByteString;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.resource.v1.Resource;
import io.opentelemetry.proto.trace.v1.ResourceSpans;
import io.opentelemetry.proto.trace.v1.ScopeSpans;
import io.opentelemetry.proto.trace.v1.Span;
import io.opentelemetry.proto.trace.v1.Status;
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.observability.ingestion.forwarder.GreptimeSqlScript;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * Proves Greptime's native OTLP trace pipeline writes the production HertzBeat trace schema and RED Flow.
 */
@Testcontainers
class GreptimeTraceApmFlowProofE2eTest {

    private static final String GREPTIME_IMAGE = "greptime/greptimedb:v1.1.4";
    private static final int GREPTIME_HTTP_PORT = 4000;
    private static final int GREPTIME_GRPC_PORT = 4001;
    private static final String TRACE_TABLE = "hzb_traces";
    private static final String APM_TABLE = "hertzbeat_apm_red_1m";
    private static final String SERVICE_NAME = "checkout";
    private static final String OPERATION = "GET /checkout";
    private static final String ROLLUP_SPAN_KIND = "SERVER";
    private static final String WORKSPACE_ID = "workspace-trace-flow-proof";
    private static final String ENTITY_ID = "entity-trace-flow-proof";
    private static final String ENTITY_TYPE = "service";
    private static final String ENVIRONMENT = "prod";
    private static final String SERVICE_NAMESPACE = "payments";
    private static final String SERVICE_INSTANCE_ID = "checkout-proof-7d9";
    private static final String COLLECTOR_ID = "collector-trace-flow-proof";
    private static final String RESOURCE_LONG_TAIL_VALUE = "2026.08-proof";
    private static final String SPAN_LONG_TAIL_VALUE = "postgresql";
    private static final String TRACE_ID = "0123456789abcdef0123456789abcdef";
    private static final String SPAN_ID = "0123456789abcdef";
    private static final long DURATION_NANOS = 1_200_000_000L;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Container
    @SuppressWarnings("resource")
    private static final GenericContainer<?> GREPTIME = new GenericContainer<>(DockerImageName.parse(GREPTIME_IMAGE))
            .withExposedPorts(GREPTIME_HTTP_PORT, GREPTIME_GRPC_PORT)
            .withCommand("standalone", "start",
                    "--http-addr", "0.0.0.0:" + GREPTIME_HTTP_PORT,
                    "--rpc-bind-addr", "0.0.0.0:" + GREPTIME_GRPC_PORT)
            .waitingFor(Wait.forListeningPorts(GREPTIME_HTTP_PORT, GREPTIME_GRPC_PORT))
            .withStartupTimeout(Duration.ofSeconds(120));

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final long windowNanos = Instant.now().truncatedTo(ChronoUnit.MINUTES).toEpochMilli() * 1_000_000L;

    @Test
    void greptimeOtlpPipelinePopulatesFlattenedTraceColumnsAndRedFlow() throws Exception {
        executeSqlScript("greptime/tables/hzb_traces.sql");
        executeSqlScript("greptime/flows/hertzbeat_apm_red_1m.sql");
        ExportTraceServiceResponse response = exportTrace();

        assertThat(response.hasPartialSuccess()).isFalse();

        await().atMost(Duration.ofSeconds(45)).pollInterval(Duration.ofSeconds(1)).untilAsserted(() -> {
            Map<String, Object> row = querySingleRow("SELECT service_name, trace_id, span_id, span_kind, "
                    + "span_status_code, duration_nano, "
                    + "\"resource_attributes.hertzbeat.workspace_id\" AS workspace_id, "
                    + "\"resource_attributes.hertzbeat.entity_id\" AS entity_id, "
                    + "\"resource_attributes.hertzbeat.entity_type\" AS entity_type, "
                    + "\"resource_attributes.service.namespace\" AS service_namespace, "
                    + "\"resource_attributes.service.instance.id\" AS service_instance_id, "
                    + "\"resource_attributes.deployment.environment.name\" AS deployment_environment, "
                    + "\"resource_attributes.hertzbeat.collector.id\" AS collector_id, "
                    + "\"resource_attributes.service.version\" AS resource_long_tail, "
                    + "\"span_attributes.db.system\" AS span_long_tail "
                    + "FROM " + TRACE_TABLE + " WHERE trace_id = '" + TRACE_ID + "'");

            assertThat(row)
                    .containsEntry("service_name", SERVICE_NAME)
                    .containsEntry("trace_id", TRACE_ID)
                    .containsEntry("span_id", SPAN_ID)
                    .containsEntry("span_kind", "SPAN_KIND_SERVER")
                    .containsEntry("span_status_code", "STATUS_CODE_ERROR")
                    .containsEntry("workspace_id", WORKSPACE_ID)
                    .containsEntry("entity_id", ENTITY_ID)
                    .containsEntry("entity_type", ENTITY_TYPE)
                    .containsEntry("service_namespace", SERVICE_NAMESPACE)
                    .containsEntry("service_instance_id", SERVICE_INSTANCE_ID)
                    .containsEntry("deployment_environment", ENVIRONMENT)
                    .containsEntry("collector_id", COLLECTOR_ID)
                    .containsEntry("resource_long_tail", RESOURCE_LONG_TAIL_VALUE)
                    .containsEntry("span_long_tail", SPAN_LONG_TAIL_VALUE);
            assertThat(number(row.get("duration_nano"))).isEqualTo(DURATION_NANOS);
        });

        await().atMost(Duration.ofSeconds(45)).pollInterval(Duration.ofSeconds(1)).untilAsserted(() -> {
            Map<String, Object> row = querySingleRow("SELECT service_name, operation, span_kind, workspace_id, "
                    + "entity_id, entity_type, deployment_environment, service_namespace, calls_total, error_total, "
                    + "duration_sum_nano, duration_count FROM " + APM_TABLE
                    + " WHERE service_name = '" + SERVICE_NAME + "'"
                    + " AND operation = '" + OPERATION + "'"
                    + " AND span_kind = '" + ROLLUP_SPAN_KIND + "'");

            assertThat(row)
                    .containsEntry("service_name", SERVICE_NAME)
                    .containsEntry("operation", OPERATION)
                    .containsEntry("span_kind", ROLLUP_SPAN_KIND)
                    .containsEntry("workspace_id", WORKSPACE_ID)
                    .containsEntry("entity_id", ENTITY_ID)
                    .containsEntry("entity_type", ENTITY_TYPE)
                    .containsEntry("deployment_environment", ENVIRONMENT)
                    .containsEntry("service_namespace", SERVICE_NAMESPACE);
            assertThat(number(row.get("calls_total"))).isEqualTo(1L);
            assertThat(number(row.get("error_total"))).isEqualTo(1L);
            assertThat(number(row.get("duration_sum_nano"))).isEqualTo(DURATION_NANOS);
            assertThat(number(row.get("duration_count"))).isEqualTo(1L);

            Map<String, Object> sketchRow = querySingleRow("SELECT "
                    + "uddsketch_calc(0.95, uddsketch_merge(128, 0.01, duration_sketch)) AS p95_nano "
                    + "FROM " + APM_TABLE
                    + " WHERE service_name = '" + SERVICE_NAME + "'"
                    + " GROUP BY service_name");
            double p95Nanos = decimal(sketchRow.get("p95_nano"));
            assertThat(p95Nanos).isGreaterThan(1_000_000_000D).isLessThan(1_400_000_000D);
        });
    }

    private ExportTraceServiceResponse exportTrace() throws Exception {
        Span span = Span.newBuilder()
                .setTraceId(ByteString.copyFrom(HexFormat.of().parseHex(TRACE_ID)))
                .setSpanId(ByteString.copyFrom(HexFormat.of().parseHex(SPAN_ID)))
                .setName(OPERATION)
                .setKind(Span.SpanKind.SPAN_KIND_SERVER)
                .setStartTimeUnixNano(windowNanos + 1_000_000_000L)
                .setEndTimeUnixNano(windowNanos + 1_000_000_000L + DURATION_NANOS)
                .setStatus(Status.newBuilder().setCode(Status.StatusCode.STATUS_CODE_ERROR))
                .addAttributes(attribute("db.system", SPAN_LONG_TAIL_VALUE))
                .build();
        Resource resource = Resource.newBuilder().addAllAttributes(List.of(
                attribute("service.name", SERVICE_NAME),
                attribute("hertzbeat.workspace_id", WORKSPACE_ID),
                attribute("hertzbeat.entity_id", ENTITY_ID),
                attribute("hertzbeat.entity_type", ENTITY_TYPE),
                attribute("service.namespace", SERVICE_NAMESPACE),
                attribute("service.instance.id", SERVICE_INSTANCE_ID),
                attribute("deployment.environment.name", ENVIRONMENT),
                attribute("hertzbeat.collector.id", COLLECTOR_ID),
                attribute("service.version", RESOURCE_LONG_TAIL_VALUE))).build();
        ExportTraceServiceRequest request = ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .setResource(resource)
                        .addScopeSpans(ScopeSpans.newBuilder().addSpans(span)))
                .build();

        HttpResponse<byte[]> response = httpClient.send(HttpRequest.newBuilder()
                .uri(URI.create(greptimeEndpoint() + "/v1/otlp/v1/traces"))
                .header("Content-Type", "application/x-protobuf")
                .header("X-Greptime-DB-Name", "public")
                .header("X-Greptime-Trace-Table-Name", TRACE_TABLE)
                .header("X-Greptime-Pipeline-Name", "greptime_trace_v1")
                .POST(HttpRequest.BodyPublishers.ofByteArray(request.toByteArray()))
                .build(), HttpResponse.BodyHandlers.ofByteArray());

        assertThat(response.statusCode())
                .as("OTLP response body: %s", new String(response.body(), StandardCharsets.UTF_8))
                .isBetween(200, 299);
        return ExportTraceServiceResponse.parseFrom(response.body());
    }

    private KeyValue attribute(String key, String value) {
        return KeyValue.newBuilder()
                .setKey(key)
                .setValue(AnyValue.newBuilder().setStringValue(value))
                .build();
    }

    private void executeSqlScript(String resourceName) throws Exception {
        try (InputStream input = Thread.currentThread().getContextClassLoader().getResourceAsStream(resourceName)) {
            assertThat(input).as(resourceName).isNotNull();
            String sql = new String(input.readAllBytes(), StandardCharsets.UTF_8);
            for (String statement : GreptimeSqlScript.statements(sql)) {
                executeSql(statement);
            }
        }
    }

    private Map<String, Object> querySingleRow(String sql) throws Exception {
        HttpResponse<String> response = executeSql(sql);
        JsonNode records = OBJECT_MAPPER.readTree(response.body()).path("output").path(0).path("records");
        JsonNode rows = records.path("rows");
        assertThat(rows.isArray()).as(response.body()).isTrue();
        assertThat(rows).as(response.body()).isNotEmpty();

        JsonNode schemas = records.path("schema").path("column_schemas");
        Map<String, Object> values = new LinkedHashMap<>();
        for (int i = 0; i < schemas.size(); i++) {
            values.put(schemas.get(i).path("name").asText(), jsonScalar(rows.get(0).get(i)));
        }
        return values;
    }

    private Object jsonScalar(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isIntegralNumber()) {
            return node.asLong();
        }
        if (node.isFloatingPointNumber()) {
            return node.asDouble();
        }
        return node.asText();
    }

    private long number(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(String.valueOf(value));
    }

    private double decimal(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return Double.parseDouble(String.valueOf(value));
    }

    private HttpResponse<String> executeSql(String sql) throws Exception {
        HttpResponse<String> response = httpClient.send(HttpRequest.newBuilder()
                .uri(URI.create(greptimeEndpoint() + "/v1/sql?db=public"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(
                        "sql=" + URLEncoder.encode(sql, StandardCharsets.UTF_8), StandardCharsets.UTF_8))
                .build(), HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode())
                .as("SQL response body for [%s]: %s", sql, response.body())
                .isBetween(200, 299);
        return response;
    }

    private static String greptimeEndpoint() {
        return "http://" + GREPTIME.getHost() + ":" + GREPTIME.getMappedPort(GREPTIME_HTTP_PORT);
    }
}
