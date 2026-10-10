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
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * Reproduces the Greptime v1.1.4 blockers that prevent a production service-edge Flow.
 *
 * <p>This is deliberately a capability proof, not production materialization SQL. It establishes
 * that simple-column scheduled self-joins can emit rows, while the same scheduled join over the
 * physical dotted columns written by {@code greptime_trace_v1} is accepted at CREATE time but
 * fails during runtime planning. It also proves that a streaming projection into simple staging
 * columns does not backfill source rows that existed before the Flow, so that workaround cannot
 * provide honest outage recovery or coverage.</p>
 */
@Testcontainers
class GreptimeTraceServiceEdgeFlowFeasibilityE2eTest {

    private static final String GREPTIME_IMAGE = "greptime/greptimedb:v1.1.4";
    private static final int GREPTIME_HTTP_PORT = 4000;
    private static final int GREPTIME_GRPC_PORT = 4001;
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

    @Test
    void scheduledSelfJoinOverSimpleColumnsProducesAnAggregatedSinkRow() throws Exception {
        executeSql("""
                CREATE TABLE m3_probe_simple_traces (
                  ts TIMESTAMP(9) NOT NULL TIME INDEX,
                  workspace_id STRING NULL,
                  trace_id STRING NULL,
                  span_id STRING NULL,
                  parent_span_id STRING NULL,
                  service_name STRING NULL,
                  PRIMARY KEY(workspace_id, trace_id, span_id)
                )
                """);
        executeSql("""
                CREATE TABLE m3_probe_simple_edges (
                  time_window TIMESTAMP(9) NOT NULL TIME INDEX,
                  workspace_id STRING NULL,
                  source_service_name STRING NULL,
                  target_service_name STRING NULL,
                  calls BIGINT NULL,
                  PRIMARY KEY(workspace_id, source_service_name, target_service_name)
                )
                """);
        executeSql("""
                CREATE FLOW m3_probe_simple_self_join_flow
                SINK TO m3_probe_simple_edges
                EVAL INTERVAL '1s'
                AS
                SELECT
                  date_bin('1 minute'::INTERVAL, child.ts) AS time_window,
                  child.workspace_id AS workspace_id,
                  parent.service_name AS source_service_name,
                  child.service_name AS target_service_name,
                  COUNT(*) AS calls
                FROM m3_probe_simple_traces child
                JOIN m3_probe_simple_traces parent
                  ON child.workspace_id = parent.workspace_id
                 AND child.trace_id = parent.trace_id
                 AND child.parent_span_id = parent.span_id
                GROUP BY time_window, workspace_id, source_service_name, target_service_name
                """);

        executeSql("""
                INSERT INTO m3_probe_simple_traces
                  (ts, workspace_id, trace_id, span_id, parent_span_id, service_name)
                VALUES
                  (now() - '2 minutes'::INTERVAL, 'workspace-a', 'trace-a', 'parent-a', '', 'checkout-api'),
                  (now() - '2 minutes'::INTERVAL, 'workspace-a', 'trace-a', 'child-a', 'parent-a', 'payment-api')
                """);

        await().atMost(Duration.ofSeconds(30)).pollInterval(Duration.ofSeconds(1)).untilAsserted(() -> {
            Map<String, Object> row = querySingleRow("SELECT workspace_id, source_service_name, "
                    + "target_service_name, calls FROM m3_probe_simple_edges");
            assertThat(row)
                    .containsEntry("workspace_id", "workspace-a")
                    .containsEntry("source_service_name", "checkout-api")
                    .containsEntry("target_service_name", "payment-api");
            assertThat(number(row.get("calls"))).isEqualTo(1L);
        });
    }

    @Test
    void dottedScheduledSelfJoinCreatesButFailsRuntimePlanningWithoutSinkRows() throws Exception {
        executeSql("""
                CREATE TABLE m3_probe_dotted_traces (
                  ts TIMESTAMP(9) NOT NULL TIME INDEX,
                  trace_id STRING NULL,
                  span_id STRING NULL,
                  parent_span_id STRING NULL,
                  service_name STRING NULL,
                  "resource_attributes.hertzbeat.workspace_id" STRING NULL,
                  PRIMARY KEY(service_name)
                )
                """);
        executeSql("""
                CREATE TABLE m3_probe_dotted_edges (
                  time_window TIMESTAMP(9) NOT NULL TIME INDEX,
                  workspace_id STRING NULL,
                  source_service_name STRING NULL,
                  target_service_name STRING NULL,
                  calls BIGINT NULL,
                  PRIMARY KEY(workspace_id, source_service_name, target_service_name)
                )
                """);

        HttpResponse<String> createResponse = executeSql("""
                CREATE FLOW m3_probe_dotted_self_join_flow
                SINK TO m3_probe_dotted_edges
                EVAL INTERVAL '1s'
                AS
                SELECT
                  date_bin('1 minute'::INTERVAL, child.ts) AS time_window,
                  child."resource_attributes.hertzbeat.workspace_id" AS workspace_id,
                  parent.service_name AS source_service_name,
                  child.service_name AS target_service_name,
                  COUNT(*) AS calls
                FROM m3_probe_dotted_traces child
                JOIN m3_probe_dotted_traces parent
                  ON child."resource_attributes.hertzbeat.workspace_id"
                   = parent."resource_attributes.hertzbeat.workspace_id"
                 AND child.trace_id = parent.trace_id
                 AND child.parent_span_id = parent.span_id
                GROUP BY time_window, workspace_id, source_service_name, target_service_name
                """);
        assertThat(createResponse.statusCode()).isBetween(200, 299);

        executeSql("""
                INSERT INTO m3_probe_dotted_traces
                  (ts, trace_id, span_id, parent_span_id, service_name,
                   "resource_attributes.hertzbeat.workspace_id")
                VALUES
                  (now() - '2 minutes'::INTERVAL, 'trace-b', 'parent-b', '', 'checkout-api', 'workspace-b'),
                  (now() - '2 minutes'::INTERVAL, 'trace-b', 'child-b', 'parent-b', 'payment-api', 'workspace-b')
                """);

        await().atMost(Duration.ofSeconds(30)).pollInterval(Duration.ofSeconds(1)).untilAsserted(() -> {
            String logs = GREPTIME.getLogs();
            assertThat(logs).contains("Failed to execute Flow");
            assertThat(logs).contains("resource_attributes.hertzbeat");
        });
        assertThat(queryCount("m3_probe_dotted_edges")).isZero();
    }

    @Test
    void streamingProjectionDoesNotBackfillRowsThatPredateFlowCreation() throws Exception {
        executeSql("""
                CREATE TABLE m3_probe_stream_source (
                  ts TIMESTAMP(9) NOT NULL TIME INDEX,
                  workspace_id STRING NULL,
                  trace_id STRING NULL,
                  span_id STRING NULL
                )
                """);
        executeSql("""
                CREATE TABLE m3_probe_stream_staging (
                  ts TIMESTAMP(9) NOT NULL TIME INDEX,
                  workspace_id STRING NULL,
                  trace_id STRING NULL,
                  span_id STRING NULL,
                  PRIMARY KEY(workspace_id, trace_id, span_id)
                )
                """);
        executeSql("""
                INSERT INTO m3_probe_stream_source (ts, workspace_id, trace_id, span_id)
                VALUES (now() - '2 minutes'::INTERVAL, 'workspace-c', 'trace-before', 'span-before')
                """);

        executeSql("""
                CREATE FLOW m3_probe_stream_projection_flow
                SINK TO m3_probe_stream_staging
                AS
                SELECT ts, workspace_id, trace_id, span_id
                FROM m3_probe_stream_source
                """);

        Thread.sleep(Duration.ofSeconds(3));
        assertThat(queryCount("m3_probe_stream_staging")).isZero();

        executeSql("""
                INSERT INTO m3_probe_stream_source (ts, workspace_id, trace_id, span_id)
                VALUES (now(), 'workspace-c', 'trace-after', 'span-after')
                """);
        await().atMost(Duration.ofSeconds(20)).pollInterval(Duration.ofMillis(500)).untilAsserted(() -> {
            assertThat(queryCount("m3_probe_stream_staging")).isEqualTo(1L);
            assertThat(querySingleRow("SELECT trace_id, span_id FROM m3_probe_stream_staging"))
                    .containsEntry("trace_id", "trace-after")
                    .containsEntry("span_id", "span-after");
        });
    }

    private HttpResponse<String> executeSql(String sql) throws Exception {
        HttpResponse<String> response = executeSqlRaw(sql);
        assertThat(response.statusCode()).as(response.body()).isBetween(200, 299);
        JsonNode body = OBJECT_MAPPER.readTree(response.body());
        if (body.has("code")) {
            assertThat(body.path("code").asInt()).as(response.body()).isZero();
        }
        assertThat(body.path("output")).as(response.body()).isNotEmpty();
        return response;
    }

    private long queryCount(String table) throws Exception {
        return number(querySingleRow("SELECT COUNT(*) AS row_count FROM " + table).get("row_count"));
    }

    private Map<String, Object> querySingleRow(String sql) throws Exception {
        HttpResponse<String> response = executeSqlRaw(sql);
        assertThat(response.statusCode()).as(response.body()).isBetween(200, 299);
        JsonNode body = OBJECT_MAPPER.readTree(response.body());
        if (body.has("code")) {
            assertThat(body.path("code").asInt()).as(response.body()).isZero();
        }
        JsonNode records = body.path("output").path(0).path("records");
        JsonNode rows = records.path("rows");
        assertThat(rows.isArray()).as(response.body()).isTrue();
        assertThat(rows).as(response.body()).isNotEmpty();

        JsonNode schemas = records.path("schema").path("column_schemas");
        Map<String, Object> values = new LinkedHashMap<>();
        for (int index = 0; index < schemas.size(); index++) {
            JsonNode value = rows.get(0).get(index);
            values.put(schemas.get(index).path("name").asText(),
                    value.isNumber() ? value.numberValue() : value.asText());
        }
        return values;
    }

    private long number(Object value) {
        return value instanceof Number number ? number.longValue() : Long.parseLong(String.valueOf(value));
    }

    private HttpResponse<String> executeSqlRaw(String sql) throws Exception {
        return httpClient.send(HttpRequest.newBuilder()
                .uri(URI.create(greptimeEndpoint() + "/v1/sql?db=public"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(
                        "sql=" + URLEncoder.encode(sql, StandardCharsets.UTF_8), StandardCharsets.UTF_8))
                .build(), HttpResponse.BodyHandlers.ofString());
    }

    private static String greptimeEndpoint() {
        return "http://" + GREPTIME.getHost() + ":" + GREPTIME.getMappedPort(GREPTIME_HTTP_PORT);
    }
}
