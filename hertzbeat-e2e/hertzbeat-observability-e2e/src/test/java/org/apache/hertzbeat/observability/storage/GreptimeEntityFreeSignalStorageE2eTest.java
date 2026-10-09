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
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeOtlpSignalStorage;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/** Proves the warehouse-owned Entity-free OTLP log path against a real GreptimeDB. */
@Testcontainers
class GreptimeEntityFreeSignalStorageE2eTest {

    private static final int GREPTIME_HTTP_PORT = 4000;
    private static final int GREPTIME_GRPC_PORT = 4001;
    private static final String LOG_SCHEMA = "greptime/tables/hertzbeat_logs.sql";
    private static final String LOG_PIPELINE = "greptime/pipelines/hertzbeat_otlp_log_v1.yaml";
    private static final String PIPELINE_NAME = "hertzbeat_otlp_log_v1";
    private static final String TRACE_ID = "0123456789abcdef0123456789abcdef";
    private static final String SPAN_ID = "0123456789abcdef";
    private static final String BODY = "entity-free greptime proof";
    private static final long LOG_TIME_NANOS = 1_710_000_000_123_456_789L;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Container
    @SuppressWarnings("resource")
    private static final GenericContainer<?> GREPTIME = new GenericContainer<>(
            DockerImageName.parse("greptime/greptimedb:latest"))
            .withExposedPorts(GREPTIME_HTTP_PORT, GREPTIME_GRPC_PORT)
            .withCommand("standalone", "start",
                    "--http-addr", "0.0.0.0:" + GREPTIME_HTTP_PORT,
                    "--rpc-bind-addr", "0.0.0.0:" + GREPTIME_GRPC_PORT)
            .waitingFor(Wait.forListeningPorts(GREPTIME_HTTP_PORT, GREPTIME_GRPC_PORT))
            .withStartupTimeout(Duration.ofSeconds(120));

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Test
    void warehouseStorageShouldPersistEntityFreeOtlpLogs() throws Exception {
        executeSql(classpathResource(LOG_SCHEMA).strip().replaceFirst(";\\s*$", ""));
        uploadPipeline();

        GreptimeOtlpSignalStorage storage = new GreptimeOtlpSignalStorage(
                new GreptimeProperties(true, GREPTIME.getHost() + ':' + GREPTIME.getMappedPort(GREPTIME_GRPC_PORT),
                        endpoint(), "public", "", ""),
                new RestTemplate());

        storage.writeProtobuf("logs", request().toByteArray());

        await().atMost(Duration.ofSeconds(30)).pollInterval(Duration.ofSeconds(1)).untilAsserted(() -> {
            String sql = "SELECT COUNT(*) AS count FROM hertzbeat_logs WHERE trace_id = '" + TRACE_ID
                    + "' AND body = '" + BODY + "'";
            assertThat(queryCount(sql)).isEqualTo(1);
        });
    }

    private void uploadPipeline() throws Exception {
        String boundary = "----hertzbeat-entity-free-proof";
        String body = "--" + boundary + "\r\n"
                + "Content-Disposition: form-data; name=\"file\"; filename=\"pipeline.yaml\"\r\n"
                + "Content-Type: application/x-yaml\r\n\r\n"
                + classpathResource(LOG_PIPELINE) + "\r\n"
                + "--" + boundary + "--\r\n";
        HttpResponse<String> response = httpClient.send(HttpRequest.newBuilder()
                .uri(URI.create(endpoint() + "/v1/pipelines/" + PIPELINE_NAME))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build(), HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).as(response.body()).isBetween(200, 299);
    }

    private ExportLogsServiceRequest request() {
        LogRecord record = LogRecord.newBuilder()
                .setTimeUnixNano(LOG_TIME_NANOS)
                .setObservedTimeUnixNano(LOG_TIME_NANOS)
                .setSeverityNumberValue(9)
                .setSeverityText("INFO")
                .setBody(AnyValue.newBuilder().setStringValue(BODY).build())
                .setTraceId(ByteString.copyFrom(hexToBytes(TRACE_ID)))
                .setSpanId(ByteString.copyFrom(hexToBytes(SPAN_ID)))
                .build();
        return ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(stringAttribute("service.name", "checkout"))
                                .addAttributes(stringAttribute("deployment.environment.name", "test"))
                                .build())
                        .addScopeLogs(ScopeLogs.newBuilder().addLogRecords(record).build())
                        .build())
                .build();
    }

    private int queryCount(String sql) throws Exception {
        JsonNode rows = OBJECT_MAPPER.readTree(executeSql(sql).body())
                .path("output").path(0).path("records").path("rows");
        assertThat(rows.isArray()).isTrue();
        assertThat(rows).isNotEmpty();
        return rows.get(0).get(0).asInt();
    }

    private HttpResponse<String> executeSql(String sql) throws Exception {
        HttpResponse<String> response = httpClient.send(HttpRequest.newBuilder()
                .uri(URI.create(endpoint() + "/v1/sql?db=public"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(
                        "sql=" + URLEncoder.encode(sql, StandardCharsets.UTF_8), StandardCharsets.UTF_8))
                .build(), HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).as(response.body()).isBetween(200, 299);
        return response;
    }

    private String classpathResource(String path) throws Exception {
        try (InputStream input = Thread.currentThread().getContextClassLoader().getResourceAsStream(path)) {
            assertThat(input).as(path).isNotNull();
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static KeyValue stringAttribute(String key, String value) {
        return KeyValue.newBuilder().setKey(key)
                .setValue(AnyValue.newBuilder().setStringValue(value).build()).build();
    }

    private static byte[] hexToBytes(String value) {
        byte[] bytes = new byte[value.length() / 2];
        for (int index = 0; index < value.length(); index += 2) {
            bytes[index / 2] = (byte) Integer.parseInt(value.substring(index, index + 2), 16);
        }
        return bytes;
    }

    private static String endpoint() {
        return "http://" + GREPTIME.getHost() + ':' + GREPTIME.getMappedPort(GREPTIME_HTTP_PORT);
    }
}
