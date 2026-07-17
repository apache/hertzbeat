/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.storage;

import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionStatus.RECEIVED;
import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal.LOGS;
import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal.METRICS;
import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal.TRACES;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

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
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsConsoleDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.observability.ingestion.service.OtlpGrpcIngestionService;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionRequest;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionResponse;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Environment;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Framework;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Language;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Method;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.PollingDecision;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.QueryJump;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.QueryJumpContext;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal;
import org.apache.hertzbeat.observability.instrumentation.service.InstrumentationDetectionService;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.observability.metrics.service.CollectorScopedMetricsQueryService;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/** Proves scoped onboarding detection against telemetry written through the real HertzBeat ingestion services. */
@SpringBootTest(
        classes = org.apache.hertzbeat.startup.HertzBeatApplication.class,
        properties = {
                "hertzbeat.otlp.grpc.enabled=false",
                "otel.sdk.disabled=true",
                "scheduler.server.enabled=false",
                "spring.datasource.url=jdbc:h2:mem:hertzbeat-e2e;MODE=MYSQL;DB_CLOSE_DELAY=-1",
                "warehouse.store.duckdb.enabled=false",
                "warehouse.store.greptime.enabled=true",
                "warehouse.store.greptime.username=",
                "warehouse.store.greptime.password="
        })
@Testcontainers(disabledWithoutDocker = true)
class GreptimeThreeSignalInstrumentationE2eTest {

    private static final int GREPTIME_HTTP_PORT = 4000;
    private static final int GREPTIME_GRPC_PORT = 4001;
    private static final String SERVICE_NAME = "checkout-api";
    private static final String SERVICE_NAMESPACE = "commerce";
    private static final String ENVIRONMENT = "proof";
    private static final String COLLECTOR_ID = "collector-e2e";
    private static final String TRACE_ID = "0123456789abcdef0123456789abcdef";
    private static final String SPAN_ID = "0123456789abcdef";

    @Container
    @SuppressWarnings("resource")
    private static final GenericContainer<?> GREPTIME = new GenericContainer<>(
            DockerImageName.parse("greptime/greptimedb:v1.0.1"))
            .withExposedPorts(GREPTIME_HTTP_PORT, GREPTIME_GRPC_PORT)
            .withCommand("standalone", "start",
                    "--http-addr", "0.0.0.0:" + GREPTIME_HTTP_PORT,
                    "--rpc-bind-addr", "0.0.0.0:" + GREPTIME_GRPC_PORT)
            .waitingFor(Wait.forListeningPorts(GREPTIME_HTTP_PORT, GREPTIME_GRPC_PORT))
            .withStartupTimeout(Duration.ofSeconds(120));

    @Autowired
    private OtlpGrpcIngestionService ingestionService;

    @Autowired
    private InstrumentationDetectionService detectionService;

    @Autowired
    private GreptimeSqlQueryExecutor queryExecutor;

    @Autowired
    private CollectorScopedMetricsQueryService metricsQueryService;

    @Autowired
    private LogQueryService logQueryService;

    @Autowired
    private EntityTraceQueryService traceQueryService;

    @DynamicPropertySource
    static void greptimeProperties(DynamicPropertyRegistry registry) {
        registry.add("warehouse.store.greptime.http-endpoint", () -> "http://" + GREPTIME.getHost()
                + ":" + GREPTIME.getMappedPort(GREPTIME_HTTP_PORT));
        registry.add("warehouse.store.greptime.grpc-endpoints", () -> GREPTIME.getHost()
                + ":" + GREPTIME.getMappedPort(GREPTIME_GRPC_PORT));
    }

    @Test
    void ingestedSignalsConvergeToReceivedUnderExactOnboardingContext() {
        long startedAt = System.currentTimeMillis() - 1_000;
        long signalTimeNanos = System.currentTimeMillis() * 1_000_000L;

        ingestionService.ingestMetricsGrpc(metrics(signalTimeNanos));
        ingestionService.ingestLogsGrpc(logs(signalTimeNanos));
        ingestionService.ingestTracesGrpc(traces(signalTimeNanos));

        await().atMost(Duration.ofSeconds(20)).pollInterval(Duration.ofSeconds(1)).untilAsserted(() -> {
            List<Map<String, Object>> rows = queryExecutor.executeStrict(
                    "SELECT COUNT(*) AS signal_count FROM hzb_traces");
            assertThat(rows).hasSize(1);
            assertThat(((Number) rows.getFirst().get("signal_count")).longValue())
                    .as("trace schema: %s", queryExecutor.executeStrict("DESC TABLE hzb_traces"))
                    .isPositive();
        });

        DetectionRequest request = new DetectionRequest(
                1,
                Language.JAVA,
                Framework.SPRING_BOOT,
                Method.ZERO_CODE,
                Environment.VM,
                Platform.LINUX_AMD64,
                new ServiceIdentity(SERVICE_NAME, SERVICE_NAMESPACE, ENVIRONMENT),
                COLLECTOR_ID,
                startedAt);

        await().atMost(Duration.ofSeconds(20)).pollInterval(Duration.ofSeconds(1)).untilAsserted(() -> {
            DetectionResponse response = detectionService.detect(request);
            assertThat(response.signals().metrics().status()).isEqualTo(RECEIVED);
            assertThat(response.signals().logs().status()).isEqualTo(RECEIVED);
            assertThat(response.signals().traces().status()).isEqualTo(RECEIVED);
            assertThat(response.queryJumps())
                    .hasSize(3)
                    .extracting(QueryJump::signal)
                    .containsExactly(METRICS, LOGS, TRACES);
            assertThat(response.queryJumps()).allSatisfy(jump -> {
                assertThat(jump.enabled()).isTrue();
                assertThat(jump.context().serviceName()).isEqualTo(SERVICE_NAME);
                assertThat(jump.context().serviceNamespace()).isEqualTo(SERVICE_NAMESPACE);
                assertThat(jump.context().environment()).isEqualTo(ENVIRONMENT);
                assertThat(jump.context().collectorId()).isEqualTo(COLLECTOR_ID);
                assertThat(jump.context().startedAt()).isEqualTo(startedAt);
                assertThat(jump.context().detectedAt()).isGreaterThanOrEqualTo(startedAt);
            });
            assertThat(response.polling().decision()).isEqualTo(PollingDecision.COMPLETE);
        });

        assertNotReceived(requestWith(request, "other-service", SERVICE_NAMESPACE, ENVIRONMENT,
                COLLECTOR_ID, startedAt));
        assertNotReceived(requestWith(request, SERVICE_NAME, "other-namespace", ENVIRONMENT,
                COLLECTOR_ID, startedAt));
        assertNotReceived(requestWith(request, SERVICE_NAME, SERVICE_NAMESPACE, "other-environment",
                COLLECTOR_ID, startedAt));
        assertNotReceived(requestWith(request, SERVICE_NAME, SERVICE_NAMESPACE, ENVIRONMENT,
                "other-collector", startedAt));
        assertNotReceived(requestWith(request, SERVICE_NAME, SERVICE_NAMESPACE, ENVIRONMENT,
                COLLECTOR_ID, signalTimeNanos / 1_000_000L + 1));

        DetectionResponse detected = detectionService.detect(request);
        assertProductionQueries(
                enabledJump(detected, METRICS).context(),
                enabledJump(detected, LOGS).context(),
                enabledJump(detected, TRACES).context());
    }

    private QueryJump enabledJump(DetectionResponse response, Signal signal) {
        return response.queryJumps().stream()
                .filter(jump -> jump.signal() == signal && jump.enabled())
                .findFirst()
                .orElseThrow();
    }

    private void assertProductionQueries(
            QueryJumpContext metricsContext,
            QueryJumpContext logsContext,
            QueryJumpContext tracesContext) {
        long end = metricsContext.detectedAt() + 60_000;
        OtlpMetricsConsoleDto metrics = metricsQueryService.query(new CollectorScopedMetricsQueryService.Request(
                null, null, metricsContext.startedAt(), end, metricsContext.serviceName(),
                metricsContext.serviceNamespace(), metricsContext.environment(), metricsContext.collectorId(),
                "hertzbeat_e2e_requests", null, null,
                null, null, "1s", "20", null));
        assertThat(metrics.getContext().getCollectorId()).isEqualTo(metricsContext.collectorId());
        assertThat(metrics.getQuery())
                .contains("hertzbeat_e2e_requests")
                .contains("hertzbeat_collector_id=\"" + metricsContext.collectorId() + "\"");
        assertThat(metrics.getStats().getNonEmptySeries()).isPositive();
        assertThat(metrics.getResults().getFrames()).isNotEmpty();
        assertThat(metrics.getResults().getFrames())
                .flatExtracting(frame -> frame.getData())
                .anySatisfy(row -> assertThat(Double.parseDouble(String.valueOf(row[1]))).isEqualTo(1.0));

        org.springframework.data.domain.Page<LogEntry> logs = logQueryService.list(
                logsContext.startedAt(), end, TRACE_ID, SPAN_ID, null, "INFO", "three-signal-e2e",
                logsContext.serviceName(), logsContext.serviceNamespace(), logsContext.environment(),
                "hertzbeat.collector.id=" + logsContext.collectorId(), null, 0, 20, false, false);
        assertThat(logs.getContent()).singleElement().satisfies(log -> {
            assertThat(log.getBody()).isEqualTo("three-signal-e2e");
            assertThat(log.getTraceId()).isEqualTo(TRACE_ID);
            assertThat(log.getSpanId()).isEqualTo(SPAN_ID);
            assertThat(log.getResource()).containsEntry("hertzbeat.collector.id", logsContext.collectorId());
        });

        org.springframework.data.domain.Page<TraceListItemDto> traces = traceQueryService.queryTraceList(
                null, tracesContext.startedAt(), end, TRACE_ID, false,
                tracesContext.serviceName(), tracesContext.serviceNamespace(), tracesContext.environment(),
                "hertzbeat.collector.id=" + tracesContext.collectorId(), "GET /checkout", null, null,
                0, 20, false, null, null);
        assertThat(traces.getContent()).singleElement().satisfies(trace -> {
            assertThat(trace.getTraceId()).isEqualTo(TRACE_ID);
            assertThat(trace.getRootSpanId()).isEqualTo(SPAN_ID);
            assertThat(trace.getServiceName()).isEqualTo(tracesContext.serviceName());
            assertThat(trace.getResourceAttributes())
                    .containsEntry("hertzbeat.collector.id", tracesContext.collectorId());
        });
    }

    private DetectionRequest requestWith(
            DetectionRequest source,
            String serviceName,
            String serviceNamespace,
            String environment,
            String collectorId,
            long startedAt) {
        return new DetectionRequest(
                source.schemaVersion(),
                source.language(),
                source.framework(),
                source.method(),
                source.environment(),
                source.platform(),
                new ServiceIdentity(serviceName, serviceNamespace, environment),
                collectorId,
                startedAt);
    }

    private void assertNotReceived(DetectionRequest request) {
        DetectionResponse response = detectionService.detect(request);
        assertThat(List.of(
                response.signals().metrics().status(),
                response.signals().logs().status(),
                response.signals().traces().status()))
                .doesNotContain(RECEIVED);
        assertThat(response.queryJumps()).hasSize(3).allMatch(jump -> !jump.enabled());
    }

    private ExportMetricsServiceRequest metrics(long timeNanos) {
        NumberDataPoint point = NumberDataPoint.newBuilder()
                .setTimeUnixNano(timeNanos)
                .setAsInt(1)
                .build();
        Metric metric = Metric.newBuilder()
                .setName("hertzbeat.e2e.requests")
                .setGauge(Gauge.newBuilder().addDataPoints(point))
                .build();
        return ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(resource())
                        .addScopeMetrics(ScopeMetrics.newBuilder().addMetrics(metric)))
                .build();
    }

    private ExportLogsServiceRequest logs(long timeNanos) {
        LogRecord record = LogRecord.newBuilder()
                .setTimeUnixNano(timeNanos)
                .setObservedTimeUnixNano(timeNanos)
                .setSeverityText("INFO")
                .setBody(AnyValue.newBuilder().setStringValue("three-signal-e2e"))
                .setTraceId(ByteString.copyFrom(hex(TRACE_ID)))
                .setSpanId(ByteString.copyFrom(hex(SPAN_ID)))
                .build();
        return ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .setResource(resource())
                        .addScopeLogs(ScopeLogs.newBuilder().addLogRecords(record)))
                .build();
    }

    private ExportTraceServiceRequest traces(long timeNanos) {
        Span span = Span.newBuilder()
                .setTraceId(ByteString.copyFrom(hex(TRACE_ID)))
                .setSpanId(ByteString.copyFrom(hex(SPAN_ID)))
                .setName("GET /checkout")
                .setKind(Span.SpanKind.SPAN_KIND_SERVER)
                .setStartTimeUnixNano(timeNanos)
                .setEndTimeUnixNano(timeNanos + 10_000_000L)
                .build();
        return ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .setResource(resource())
                        .addScopeSpans(ScopeSpans.newBuilder().addSpans(span)))
                .build();
    }

    private Resource resource() {
        return Resource.newBuilder().addAllAttributes(List.of(
                attribute("service.name", SERVICE_NAME),
                attribute("service.namespace", SERVICE_NAMESPACE),
                attribute("deployment.environment.name", ENVIRONMENT),
                attribute("hertzbeat.collector.id", COLLECTOR_ID))).build();
    }

    private KeyValue attribute(String key, String value) {
        return KeyValue.newBuilder()
                .setKey(key)
                .setValue(AnyValue.newBuilder().setStringValue(value))
                .build();
    }

    private byte[] hex(String value) {
        return java.util.HexFormat.of().parseHex(value);
    }
}
