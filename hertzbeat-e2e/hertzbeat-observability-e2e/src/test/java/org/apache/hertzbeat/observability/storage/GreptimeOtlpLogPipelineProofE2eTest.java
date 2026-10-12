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
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.logs.v1.LogRecord;
import io.opentelemetry.proto.logs.v1.ResourceLogs;
import io.opentelemetry.proto.logs.v1.ScopeLogs;
import io.opentelemetry.proto.resource.v1.Resource;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.apache.hertzbeat.observability.ingestion.forwarder.GreptimeLogPipelineInitializer;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * Proves the Greptime OTLP logs path can persist HertzBeat correlation fields as queryable indexed columns.
 */
@Testcontainers
class GreptimeOtlpLogPipelineProofE2eTest {

    private static final String GREPTIME_IMAGE = "greptime/greptimedb:latest";
    private static final int GREPTIME_HTTP_PORT = 4000;
    private static final int GREPTIME_GRPC_PORT = 4001;
    private static final String LOG_TABLE = "hertzbeat_logs";
    private static final String LOG_PIPELINE = "hertzbeat_otlp_log_v1";
    private static final String EVENT_ID = "event-otlp-proof-0001";
    private static final String LOG_RECORD_UID = "event-otlp-proof-0001";
    private static final String INGEST_ID = "ingest-otlp-proof-0001";
    private static final String ENTITY_ID = "entity-otlp-proof-0001";
    private static final String WORKSPACE_ID = "workspace-otlp-proof-0001";
    private static final String TRACE_ID = "0123456789abcdef0123456789abcdef";
    private static final String SPAN_ID = "0123456789abcdef";
    private static final long LOG_TIME_NANOS = 1_710_000_000_123_456_789L;
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
    void otlpLogsCanWriteCorrelationFieldsToPipelineQueryableGreptimeColumns() throws Exception {
        uploadLogPipeline();

        HttpResponse<byte[]> ingestResponse = httpClient.send(HttpRequest.newBuilder()
                .uri(URI.create(greptimeEndpoint() + "/v1/otlp/v1/logs"))
                .header("Content-Type", "application/x-protobuf")
                .header("X-Greptime-DB-Name", "public")
                .header("X-Greptime-Log-Table-Name", LOG_TABLE)
                .header("X-Greptime-Log-Pipeline-Name", LOG_PIPELINE)
                .POST(HttpRequest.BodyPublishers.ofByteArray(buildOtlpRequest().toByteArray()))
                .build(), HttpResponse.BodyHandlers.ofByteArray());

        assertThat(ingestResponse.statusCode())
                .as("OTLP ingest response body: %s",
                        new String(ingestResponse.body(), StandardCharsets.UTF_8))
                .isBetween(200, 299);

        await().atMost(Duration.ofSeconds(30)).pollInterval(Duration.ofSeconds(1)).untilAsserted(() -> {
            String exactLookupSql = "SELECT COUNT(*) AS count FROM " + LOG_TABLE
                    + " WHERE hertzbeat_event_id = '" + EVENT_ID + "'"
                    + " AND log_record_uid = '" + LOG_RECORD_UID + "'"
                    + " AND trace_id = '" + TRACE_ID + "'"
                    + " AND hertzbeat_entity_id = '" + ENTITY_ID + "'"
                    + " AND hertzbeat_workspace_id = '" + WORKSPACE_ID + "'"
                    + " AND `timestamp` >= to_timestamp_nanos(" + (LOG_TIME_NANOS - 1_000_000L) + ")"
                    + " AND `timestamp` <= to_timestamp_nanos(" + (LOG_TIME_NANOS + 1_000_000L) + ")";
            assertThat(queryCount(exactLookupSql)).isEqualTo(1);

            String bodySearchSql = "SELECT COUNT(*) AS count FROM " + LOG_TABLE
                    + " WHERE hertzbeat_event_id = '" + EVENT_ID + "'"
                    + " AND matches_term(body, 'greptimeproof')";
            assertThat(queryCount(bodySearchSql)).isEqualTo(1);
        });
    }

    private void uploadLogPipeline() throws Exception {
        String boundary = "----hertzbeat-otlp-proof";
        String pipeline = productionLogPipeline();
        String body = "--" + boundary + "\r\n"
                + "Content-Disposition: form-data; name=\"file\"; filename=\"pipeline.yaml\"\r\n"
                + "Content-Type: application/x-yaml\r\n\r\n"
                + pipeline + "\r\n"
                + "--" + boundary + "--\r\n";

        HttpResponse<String> response = httpClient.send(HttpRequest.newBuilder()
                .uri(URI.create(greptimeEndpoint() + "/v1/pipelines/" + LOG_PIPELINE))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build(), HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode())
                .as("Pipeline upload response body: %s", response.body())
                .isBetween(200, 299);
    }

    private String productionLogPipeline() throws Exception {
        try (InputStream inputStream = Thread.currentThread().getContextClassLoader()
                .getResourceAsStream(GreptimeLogPipelineInitializer.LOG_PIPELINE_RESOURCE)) {
            assertThat(inputStream).as("bundled Greptime log pipeline resource").isNotNull();
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private ExportLogsServiceRequest buildOtlpRequest() {
        LogRecord logRecord = LogRecord.newBuilder()
                .setTimeUnixNano(LOG_TIME_NANOS)
                .setObservedTimeUnixNano(LOG_TIME_NANOS)
                .setSeverityNumberValue(17)
                .setSeverityText("ERROR")
                .setBody(AnyValue.newBuilder().setStringValue("checkout greptimeproof failed").build())
                .setTraceId(ByteString.copyFrom(hexToBytes(TRACE_ID)))
                .setSpanId(ByteString.copyFrom(hexToBytes(SPAN_ID)))
                .addAttributes(stringAttribute("log.record.uid", LOG_RECORD_UID))
                .addAttributes(stringAttribute("hertzbeat.event_id", EVENT_ID))
                .addAttributes(stringAttribute("hertzbeat.ingest_id", INGEST_ID))
                .build();

        return ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(stringAttribute("service.name", "checkout"))
                                .addAttributes(stringAttribute("hertzbeat.entity_id", ENTITY_ID))
                                .addAttributes(stringAttribute("hertzbeat.workspace_id", WORKSPACE_ID))
                                .build())
                        .addScopeLogs(ScopeLogs.newBuilder()
                                .addLogRecords(logRecord)
                                .build())
                        .build())
                .build();
    }

    private int queryCount(String sql) throws Exception {
        HttpResponse<String> response = executeSql(sql);

        JsonNode rows = OBJECT_MAPPER.readTree(response.body())
                .path("output").path(0)
                .path("records").path("rows");
        assertThat(rows.isArray()).as(response.body()).isTrue();
        assertThat(rows).as(response.body()).isNotEmpty();
        return rows.get(0).get(0).asInt();
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

    private static KeyValue stringAttribute(String key, String value) {
        return KeyValue.newBuilder()
                .setKey(key)
                .setValue(AnyValue.newBuilder().setStringValue(value).build())
                .build();
    }

    private static byte[] hexToBytes(String value) {
        int length = value.length();
        byte[] bytes = new byte[length / 2];
        for (int i = 0; i < length; i += 2) {
            bytes[i / 2] = (byte) Integer.parseInt(value.substring(i, i + 2), 16);
        }
        return bytes;
    }

    private static String greptimeEndpoint() {
        return "http://" + GREPTIME.getHost() + ":" + GREPTIME.getMappedPort(GREPTIME_HTTP_PORT);
    }
}
