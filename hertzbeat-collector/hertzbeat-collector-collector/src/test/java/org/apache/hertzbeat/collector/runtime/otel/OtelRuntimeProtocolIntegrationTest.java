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

package org.apache.hertzbeat.collector.runtime.otel;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.google.protobuf.ByteString;
import io.grpc.ManagedChannel;
import io.grpc.netty.shaded.io.grpc.netty.NettyChannelBuilder;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.logs.v1.LogsServiceGrpc;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.MetricsServiceGrpc;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.TraceServiceGrpc;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.logs.v1.LogRecord;
import io.opentelemetry.proto.logs.v1.ResourceLogs;
import io.opentelemetry.proto.logs.v1.ScopeLogs;
import io.opentelemetry.proto.metrics.v1.Gauge;
import io.opentelemetry.proto.metrics.v1.Metric;
import io.opentelemetry.proto.metrics.v1.NumberDataPoint;
import io.opentelemetry.proto.metrics.v1.ResourceMetrics;
import io.opentelemetry.proto.metrics.v1.ScopeMetrics;
import io.opentelemetry.proto.trace.v1.ResourceSpans;
import io.opentelemetry.proto.trace.v1.ScopeSpans;
import io.opentelemetry.proto.trace.v1.Span;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OtelRuntimeProtocolIntegrationTest {

    private static final String RUNTIME_BINARY_ENV = "HERTZBEAT_OTEL_RUNTIME_BINARY";

    @TempDir
    private Path tempDir;

    @Test
    void receivesHttpProtobufAndGrpcForAllThreeSignals() throws Exception {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        OtelRuntimeTestSupport.OtlpCapture capture = new OtelRuntimeTestSupport.OtlpCapture();
        capture.start();
        OtelRuntimeProperties properties = OtelRuntimeTestSupport.properties(
                tempDir, runtimeBinary, capture.port(), "collector-protocol-integration");
        OtelRuntimeSupervisor supervisor = OtelRuntimeTestSupport.supervisor(properties);
        ManagedChannel channel = null;
        try {
            supervisor.start();
            assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());

            sendJsonSignals(properties.getOtlpHttpEndpoint());

            SignalRequests protobuf = signalRequests("http-protobuf", 0x31);
            sendProtobuf(properties.getOtlpHttpEndpoint(), "metrics", protobuf.metrics().toByteArray());
            sendProtobuf(properties.getOtlpHttpEndpoint(), "logs", protobuf.logs().toByteArray());
            sendProtobuf(properties.getOtlpHttpEndpoint(), "traces", protobuf.traces().toByteArray());

            channel = NettyChannelBuilder.forTarget(properties.getOtlpGrpcEndpoint()).usePlaintext().build();
            SignalRequests grpc = signalRequests("grpc", 0x41);
            MetricsServiceGrpc.newBlockingStub(channel).export(grpc.metrics());
            LogsServiceGrpc.newBlockingStub(channel).export(grpc.logs());
            TraceServiceGrpc.newBlockingStub(channel).export(grpc.traces());

            OtelRuntimeTestSupport.await(
                    () -> capture.contains("hertzbeat_http-json_metric"), Duration.ofSeconds(20));
            OtelRuntimeTestSupport.await(
                    () -> capture.contains("hertzbeat http-json log"), Duration.ofSeconds(20));
            OtelRuntimeTestSupport.await(
                    () -> capture.contains("hertzbeat http-json span"), Duration.ofSeconds(20));
            OtelRuntimeTestSupport.await(
                    () -> capture.contains("hertzbeat_http-protobuf_metric"), Duration.ofSeconds(20));
            OtelRuntimeTestSupport.await(
                    () -> capture.contains("hertzbeat http-protobuf log"), Duration.ofSeconds(20));
            OtelRuntimeTestSupport.await(
                    () -> capture.contains("hertzbeat http-protobuf span"), Duration.ofSeconds(20));
            OtelRuntimeTestSupport.await(
                    () -> capture.contains("hertzbeat_grpc_metric"), Duration.ofSeconds(20));
            OtelRuntimeTestSupport.await(
                    () -> capture.contains("hertzbeat grpc log"), Duration.ofSeconds(20));
            OtelRuntimeTestSupport.await(
                    () -> capture.contains("hertzbeat grpc span"), Duration.ofSeconds(20));
        } finally {
            if (channel != null) {
                channel.shutdownNow().awaitTermination(5, TimeUnit.SECONDS);
            }
            supervisor.close();
            capture.close();
        }
    }

    private static void sendJsonSignals(String endpoint) throws Exception {
        long now = System.currentTimeMillis() * 1_000_000;
        sendJson(endpoint, "metrics", """
                {"resourceMetrics":[{"scopeMetrics":[{"metrics":[{
                  "name":"hertzbeat_http-json_metric",
                  "gauge":{"dataPoints":[{"timeUnixNano":"%d","asDouble":7.0}]}
                }]}]}]}
                """.formatted(now));
        sendJson(endpoint, "logs", """
                {"resourceLogs":[{"scopeLogs":[{"logRecords":[{
                  "timeUnixNano":"%d",
                  "body":{"stringValue":"hertzbeat http-json log"}
                }]}]}]}
                """.formatted(now));
        sendJson(endpoint, "traces", """
                {"resourceSpans":[{"scopeSpans":[{"spans":[{
                  "traceId":"51515151515151515151515151515151",
                  "spanId":"5151515151515151",
                  "name":"hertzbeat http-json span",
                  "startTimeUnixNano":"%d",
                  "endTimeUnixNano":"%d"
                }]}]}]}
                """.formatted(now, now + 1_000_000));
    }

    private static void sendJson(String endpoint, String signal, String payload) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://" + endpoint + "/v1/" + signal))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();
        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode(), response.body());
    }

    private static void sendProtobuf(String endpoint, String signal, byte[] payload) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://" + endpoint + "/v1/" + signal))
                .header("Content-Type", "application/x-protobuf")
                .POST(HttpRequest.BodyPublishers.ofByteArray(payload))
                .build();
        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode(), response.body());
    }

    private static SignalRequests signalRequests(String scenario, int idByte) {
        long now = System.currentTimeMillis() * 1_000_000;
        ExportMetricsServiceRequest metrics = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("hertzbeat_" + scenario + "_metric")
                                        .setGauge(Gauge.newBuilder().addDataPoints(NumberDataPoint.newBuilder()
                                                .setTimeUnixNano(now).setAsDouble(7.0))))))
                .build();
        ExportLogsServiceRequest logs = ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .addScopeLogs(ScopeLogs.newBuilder()
                                .addLogRecords(LogRecord.newBuilder()
                                        .setTimeUnixNano(now)
                                        .setBody(AnyValue.newBuilder()
                                                .setStringValue("hertzbeat " + scenario + " log")))))
                .build();
        ExportTraceServiceRequest traces = ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .addScopeSpans(ScopeSpans.newBuilder()
                                .addSpans(Span.newBuilder()
                                        .setTraceId(ByteString.copyFrom(repeatedBytes(idByte, 16)))
                                        .setSpanId(ByteString.copyFrom(repeatedBytes(idByte, 8)))
                                        .setName("hertzbeat " + scenario + " span")
                                        .setStartTimeUnixNano(now)
                                        .setEndTimeUnixNano(now + 1_000_000))))
                .build();
        return new SignalRequests(metrics, logs, traces);
    }

    private static byte[] repeatedBytes(int value, int length) {
        byte[] bytes = new byte[length];
        java.util.Arrays.fill(bytes, (byte) value);
        return bytes;
    }

    private record SignalRequests(ExportMetricsServiceRequest metrics, ExportLogsServiceRequest logs,
                                  ExportTraceServiceRequest traces) {
    }

}
