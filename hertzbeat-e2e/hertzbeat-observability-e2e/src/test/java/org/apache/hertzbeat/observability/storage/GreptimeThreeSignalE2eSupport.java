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

import com.google.protobuf.ByteString;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.logs.v1.LogRecord;
import io.opentelemetry.proto.logs.v1.ResourceLogs;
import io.opentelemetry.proto.logs.v1.ScopeLogs;
import io.opentelemetry.proto.metrics.v1.Gauge;
import io.opentelemetry.proto.metrics.v1.Metric;
import io.opentelemetry.proto.metrics.v1.NumberDataPoint;
import io.opentelemetry.proto.metrics.v1.ResourceMetrics;
import io.opentelemetry.proto.metrics.v1.ScopeMetrics;
import io.opentelemetry.proto.resource.v1.Resource;
import io.opentelemetry.proto.trace.v1.ResourceSpans;
import io.opentelemetry.proto.trace.v1.ScopeSpans;
import io.opentelemetry.proto.trace.v1.Span;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.utility.DockerImageName;

/** Shared real-Greptime container and deterministic OTLP payloads for three-signal E2E tests. */
abstract class GreptimeThreeSignalE2eSupport {

    static final String SERVICE_NAME = "checkout-api";
    static final String SERVICE_NAMESPACE = "commerce";
    static final String ENVIRONMENT = "proof";
    static final String COLLECTOR_ID = "collector-e2e";
    static final String SERVER_PROFILE_ID = "server-e2e";
    static final String INSTANCE_ID = "checkout-e2e-7d9";
    static final String ENDPOINT = "/checkout";
    static final String TRACE_ID = "0123456789abcdef0123456789abcdef";
    static final String SPAN_ID = "0123456789abcdef";
    static final String METRIC_NAME = "hertzbeat.e2e.requests";
    static final String METRIC_QUERY = "hertzbeat_e2e_requests";
    static final String LOG_BODY = "three-signal-e2e";
    static final String SPAN_NAME = "GET /checkout";

    private static final int GREPTIME_HTTP_PORT = 4000;
    private static final int GREPTIME_GRPC_PORT = 4001;

    @Container
    @SuppressWarnings("resource")
    static final GenericContainer<?> GREPTIME = new GenericContainer<>(
            DockerImageName.parse("greptime/greptimedb:v1.0.1"))
            .withExposedPorts(GREPTIME_HTTP_PORT, GREPTIME_GRPC_PORT)
            .withCommand("standalone", "start",
                    "--http-addr", "0.0.0.0:" + GREPTIME_HTTP_PORT,
                    "--rpc-bind-addr", "0.0.0.0:" + GREPTIME_GRPC_PORT)
            .waitingFor(Wait.forListeningPorts(GREPTIME_HTTP_PORT, GREPTIME_GRPC_PORT))
            .withStartupTimeout(Duration.ofSeconds(120));

    @DynamicPropertySource
    static void greptimeProperties(DynamicPropertyRegistry registry) {
        registry.add("warehouse.store.greptime.http-endpoint", () -> "http://" + GREPTIME.getHost()
                + ":" + GREPTIME.getMappedPort(GREPTIME_HTTP_PORT));
        registry.add("warehouse.store.greptime.grpc-endpoints", () -> GREPTIME.getHost()
                + ":" + GREPTIME.getMappedPort(GREPTIME_GRPC_PORT));
    }

    static ExportMetricsServiceRequest metrics(long timeNanos) {
        NumberDataPoint point = NumberDataPoint.newBuilder()
                .setTimeUnixNano(timeNanos)
                .setAsInt(1)
                .addAttributes(attribute("http.route", ENDPOINT))
                .build();
        Metric metric = Metric.newBuilder()
                .setName(METRIC_NAME)
                .setGauge(Gauge.newBuilder().addDataPoints(point))
                .build();
        return ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(resource())
                        .addScopeMetrics(ScopeMetrics.newBuilder().addMetrics(metric)))
                .build();
    }

    static ExportLogsServiceRequest logs(long timeNanos) {
        LogRecord record = LogRecord.newBuilder()
                .setTimeUnixNano(timeNanos)
                .setObservedTimeUnixNano(timeNanos)
                .setSeverityText("INFO")
                .setBody(AnyValue.newBuilder().setStringValue(LOG_BODY))
                .setTraceId(ByteString.copyFrom(HexFormat.of().parseHex(TRACE_ID)))
                .setSpanId(ByteString.copyFrom(HexFormat.of().parseHex(SPAN_ID)))
                .addAttributes(attribute("http.route", ENDPOINT))
                .build();
        return ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .setResource(resource())
                        .addScopeLogs(ScopeLogs.newBuilder().addLogRecords(record)))
                .build();
    }

    static ExportTraceServiceRequest traces(long timeNanos) {
        Span span = Span.newBuilder()
                .setTraceId(ByteString.copyFrom(HexFormat.of().parseHex(TRACE_ID)))
                .setSpanId(ByteString.copyFrom(HexFormat.of().parseHex(SPAN_ID)))
                .setName(SPAN_NAME)
                .setKind(Span.SpanKind.SPAN_KIND_SERVER)
                .setStartTimeUnixNano(timeNanos)
                .setEndTimeUnixNano(timeNanos + 10_000_000L)
                .addAttributes(attribute("http.route", ENDPOINT))
                .build();
        return ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .setResource(resource())
                        .addScopeSpans(ScopeSpans.newBuilder().addSpans(span)))
                .build();
    }

    private static Resource resource() {
        return Resource.newBuilder().addAllAttributes(List.of(
                attribute("service.name", SERVICE_NAME),
                attribute("service.namespace", SERVICE_NAMESPACE),
                attribute("deployment.environment.name", ENVIRONMENT),
                attribute("service.instance.id", INSTANCE_ID),
                attribute("hertzbeat.collector.id", COLLECTOR_ID))).build();
    }

    private static KeyValue attribute(String key, String value) {
        return KeyValue.newBuilder()
                .setKey(key)
                .setValue(AnyValue.newBuilder().setStringValue(value))
                .build();
    }
}
