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
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * Proves Greptime Flow can derive HertzBeat APM RED alert data from native trace rows.
 */
@Testcontainers
class GreptimeTraceApmFlowProofE2eTest {

    private static final String GREPTIME_IMAGE = "greptime/greptimedb:latest";
    private static final int GREPTIME_HTTP_PORT = 4000;
    private static final int GREPTIME_GRPC_PORT = 4001;
    private static final String TRACE_TABLE = "hzb_traces";
    private static final String APM_FLOW = "hertzbeat_apm_red_1m_flow";
    private static final String APM_TABLE = "hertzbeat_apm_red_1m";
    private static final String SERVICE_NAME = "checkout";
    private static final String OPERATION = "GET /checkout";
    private static final String SPAN_KIND = "SPAN_KIND_SERVER";
    private static final String WORKSPACE_ID = "workspace-trace-flow-proof";
    private static final String ENTITY_ID = "entity-trace-flow-proof";
    private static final String ENVIRONMENT = "prod";
    private static final String SERVICE_NAMESPACE = "payments";
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
    void greptimeFlowCanDeriveApmRedRowsFromNativeTraceRows() throws Exception {
        executeSql(traceTableDdl());
        executeSql(apmSinkDdl());
        executeSql(apmFlowSql());
        insertTraceRows();

        await().atMost(Duration.ofSeconds(45)).pollInterval(Duration.ofSeconds(1)).untilAsserted(() -> {
            Map<String, Object> row = querySingleRow("SELECT service_name, operation, span_kind, workspace_id, "
                    + "entity_id, deployment_environment, service_namespace, calls_total, error_total, "
                    + "duration_sum_nano, duration_count FROM " + APM_TABLE
                    + " WHERE service_name = '" + SERVICE_NAME + "'"
                    + " AND operation = '" + OPERATION + "'"
                    + " AND span_kind = '" + SPAN_KIND + "'");

            assertThat(row)
                    .containsEntry("service_name", SERVICE_NAME)
                    .containsEntry("operation", OPERATION)
                    .containsEntry("span_kind", SPAN_KIND)
                    .containsEntry("workspace_id", WORKSPACE_ID)
                    .containsEntry("entity_id", ENTITY_ID)
                    .containsEntry("deployment_environment", ENVIRONMENT)
                    .containsEntry("service_namespace", SERVICE_NAMESPACE);
            assertThat(number(row.get("calls_total"))).isEqualTo(2L);
            assertThat(number(row.get("error_total"))).isEqualTo(1L);
            assertThat(number(row.get("duration_sum_nano"))).isEqualTo(1_300_000_000L);
            assertThat(number(row.get("duration_count"))).isEqualTo(2L);

            Map<String, Object> sketchRow = querySingleRow("SELECT "
                    + "uddsketch_calc(0.95, uddsketch_merge(128, 0.01, duration_sketch)) AS p95_nano "
                    + "FROM " + APM_TABLE
                    + " WHERE service_name = '" + SERVICE_NAME + "'"
                    + " GROUP BY service_name");
            double p95Nanos = decimal(sketchRow.get("p95_nano"));
            assertThat(p95Nanos).isGreaterThan(1_000_000_000D).isLessThan(1_400_000_000D);
        });
    }

    private String traceTableDdl() {
        return "CREATE TABLE IF NOT EXISTS " + TRACE_TABLE + " ("
                + "\"timestamp\" TIMESTAMP(9) TIME INDEX,"
                + "\"timestamp_end\" TIMESTAMP(9) NULL,"
                + "\"duration_nano\" BIGINT UNSIGNED NULL,"
                + "\"trace_id\" STRING NULL SKIPPING INDEX WITH(granularity = '10240', type = 'BLOOM'),"
                + "\"span_id\" STRING NULL,"
                + "\"parent_span_id\" STRING NULL,"
                + "\"span_kind\" STRING NULL,"
                + "\"span_name\" STRING NULL,"
                + "\"span_status_code\" STRING NULL,"
                + "\"span_status_message\" STRING NULL,"
                + "\"trace_state\" STRING NULL,"
                + "\"scope_name\" STRING NULL,"
                + "\"scope_version\" STRING NULL,"
                + "\"service_name\" STRING NULL,"
                + "\"resource_attributes\" JSON NULL,"
                + "\"span_attributes\" JSON NULL,"
                + "\"span_events\" JSON NULL,"
                + "\"span_links\" JSON NULL,"
                + "PRIMARY KEY(\"service_name\"))"
                + " WITH (append_mode = true, table_data_model = 'greptime_trace_v1')";
    }

    private String apmSinkDdl() {
        return "CREATE TABLE IF NOT EXISTS " + APM_TABLE + " ("
                + "time_window TIMESTAMP(9) TIME INDEX,"
                + "service_name STRING,"
                + "operation STRING,"
                + "span_kind STRING,"
                + "workspace_id STRING NULL,"
                + "entity_id STRING NULL,"
                + "deployment_environment STRING NULL,"
                + "service_namespace STRING NULL,"
                + "calls_total BIGINT,"
                + "error_total BIGINT,"
                + "duration_sum_nano BIGINT,"
                + "duration_count BIGINT,"
                + "duration_sketch BINARY,"
                + "PRIMARY KEY(service_name, operation, span_kind, workspace_id, entity_id, "
                + "deployment_environment, service_namespace))";
    }

    private String apmFlowSql() {
        return "CREATE FLOW IF NOT EXISTS " + APM_FLOW + " "
                + "SINK TO " + APM_TABLE + " "
                + "EXPIRE AFTER '6 hours'::INTERVAL "
                + "AS SELECT "
                + "date_bin('1 minute'::INTERVAL, \"timestamp\") AS time_window,"
                + "service_name,"
                + "span_name AS operation,"
                + "span_kind,"
                + "json_get_string(resource_attributes, '$[\"hertzbeat.workspace_id\"]') AS workspace_id,"
                + "json_get_string(resource_attributes, '$[\"hertzbeat.entity_id\"]') AS entity_id,"
                + "json_get_string(resource_attributes, '$[\"deployment.environment\"]') AS deployment_environment,"
                + "json_get_string(resource_attributes, '$[\"service.namespace\"]') AS service_namespace,"
                + "COUNT(*) AS calls_total,"
                + "SUM(CASE WHEN span_status_code = 'STATUS_CODE_ERROR' THEN 1 ELSE 0 END) AS error_total,"
                + "SUM(duration_nano) AS duration_sum_nano,"
                + "COUNT(duration_nano) AS duration_count,"
                + "uddsketch_state(128, 0.01, duration_nano) AS duration_sketch "
                + "FROM " + TRACE_TABLE + " "
                + "WHERE span_kind IN ('SPAN_KIND_SERVER', 'SERVER', 'SPAN_KIND_CONSUMER', 'CONSUMER') "
                + "GROUP BY time_window, service_name, operation, span_kind, workspace_id, entity_id, "
                + "deployment_environment, service_namespace";
    }

    private void insertTraceRows() throws Exception {
        executeSql("INSERT INTO " + TRACE_TABLE + " (\"timestamp\", \"timestamp_end\", duration_nano, trace_id, "
                + "span_id, parent_span_id, span_kind, span_name, span_status_code, span_status_message, "
                + "trace_state, scope_name, scope_version, service_name, resource_attributes, span_attributes, "
                + "span_events, span_links) VALUES "
                + traceRow(windowNanos + 1_000_000_000L, 100_000_000L, "trace-flow-ok-1", "span-flow-ok-1",
                "STATUS_CODE_OK")
                + ","
                + traceRow(windowNanos + 2_000_000_000L, 1_200_000_000L, "trace-flow-error-1",
                "span-flow-error-1", "STATUS_CODE_ERROR")
                + ","
                + traceRow(windowNanos + 3_000_000_000L, 50_000_000L, "trace-flow-client-1",
                "span-flow-client-1", "STATUS_CODE_ERROR").replace("'" + SPAN_KIND + "'", "'SPAN_KIND_CLIENT'"));
    }

    private String traceRow(long startNanos, long durationNanos, String traceId, String spanId, String statusCode) {
        return "("
                + "to_timestamp_nanos(" + startNanos + "),"
                + "to_timestamp_nanos(" + (startNanos + durationNanos) + "),"
                + durationNanos + ","
                + "'" + traceId + "',"
                + "'" + spanId + "',"
                + "'',"
                + "'" + SPAN_KIND + "',"
                + "'" + OPERATION + "',"
                + "'" + statusCode + "',"
                + "'',"
                + "'',"
                + "'io.opentelemetry',"
                + "'1.0.0',"
                + "'" + SERVICE_NAME + "',"
                + "parse_json('" + resourceAttributesJson() + "'),"
                + "parse_json('{\"http.route\":\"/checkout\"}'),"
                + "parse_json('[]'),"
                + "parse_json('[]')"
                + ")";
    }

    private String resourceAttributesJson() {
        return "{\"hertzbeat.workspace_id\":\"" + WORKSPACE_ID
                + "\",\"hertzbeat.entity_id\":\"" + ENTITY_ID
                + "\",\"deployment.environment\":\"" + ENVIRONMENT
                + "\",\"service.namespace\":\"" + SERVICE_NAMESPACE + "\"}";
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
