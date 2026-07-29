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

import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsConsoleDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.instrumentation.intake.CollectorIntakeAdvertisementCodec;
import org.apache.hertzbeat.manager.instrumentation.intake.CollectorIntakeAdvertisementRequest;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Capability;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Gateway;
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
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.DetectionCriteria;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationDetectionV2Service;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.observability.metrics.service.CollectorScopedMetricsQueryService;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.testcontainers.junit.jupiter.Testcontainers;

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
class GreptimeThreeSignalInstrumentationE2eTest extends GreptimeThreeSignalE2eSupport {

    @Autowired
    private OtlpGrpcIngestionService ingestionService;

    @Autowired
    private InstrumentationDetectionService detectionService;

    @Autowired
    private InstrumentationDetectionV2Service currentDetectionService;

    @Autowired
    private CollectorDao collectorDao;

    @Autowired
    private InstrumentationSignalDetectionStore signalDetectionStore;

    @Autowired
    private GreptimeSqlQueryExecutor queryExecutor;

    @Autowired
    private CollectorScopedMetricsQueryService metricsQueryService;

    @Autowired
    private LogQueryService logQueryService;

    @Autowired
    private EntityTraceQueryService traceQueryService;

    @Test
    void ingestedSignalsConvergeToReceivedUnderExactOnboardingContext() {
        advertiseCollectorProfile();
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
        await().atMost(Duration.ofSeconds(20)).pollInterval(Duration.ofSeconds(1)).untilAsserted(
                () -> assertNativeContextMappings(startedAt, System.currentTimeMillis()));
        await().atMost(Duration.ofSeconds(20)).pollInterval(Duration.ofSeconds(1)).untilAsserted(
                () -> assertCurrentDetectionContract(startedAt));

        var nativeSnapshot = signalDetectionStore.detect(new DetectionCriteria(
                SERVICE_NAME,
                SERVICE_NAMESPACE,
                ENVIRONMENT,
                COLLECTOR_ID,
                INSTANCE_ID,
                ENDPOINT,
                startedAt,
                System.currentTimeMillis()));
        assertThat(nativeSnapshot.observation(LOGS)).as("native log detector snapshot").satisfies(observation -> {
            assertThat(observation.status()).isEqualTo(RECEIVED);
            assertThat(observation.lastReceivedAt()).isBetween(startedAt, System.currentTimeMillis());
        });

        DetectionRequest request = new DetectionRequest(
                1,
                Language.JAVA,
                Framework.SPRING_BOOT,
                Method.ZERO_CODE,
                Environment.VM,
                Platform.LINUX_AMD64,
                new ServiceIdentity(
                        SERVICE_NAME, SERVICE_NAMESPACE, ENVIRONMENT, INSTANCE_ID, ENDPOINT),
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
                assertThat(jump.context().serviceInstanceId()).isEqualTo(INSTANCE_ID);
                assertThat(jump.context().endpoint()).isEqualTo(ENDPOINT);
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
        assertNotReceived(requestWithContext(request, "other-instance", ENDPOINT));
        assertNotReceived(requestWithContext(request, INSTANCE_ID, "/other"));

        DetectionResponse detected = detectionService.detect(request);
        assertProductionQueries(
                enabledJump(detected, METRICS).context(),
                enabledJump(detected, LOGS).context(),
                enabledJump(detected, TRACES).context());
    }

    private void advertiseCollectorProfile() {
        CollectorIntakeAdvertisementCodec codec = new CollectorIntakeAdvertisementCodec();
        String advertisement = codec.encode(
                new CollectorIntakeAdvertisementRequest(
                        1,
                        Gateway.COLLECTOR,
                        List.of(Capability.OTLP_HTTP_PROTOBUF),
                        "http://127.0.0.1:4318",
                        null));
        collectorDao.save(Collector.builder()
                .name(COLLECTOR_ID)
                .ip("127.0.0.1")
                .status(CommonConstants.COLLECTOR_STATUS_ONLINE)
                .instrumentationIntake(advertisement)
                .build());
        String serverAdvertisement = codec.encode(new CollectorIntakeAdvertisementRequest(
                1,
                Gateway.SERVER,
                List.of(Capability.OTLP_HTTP_PROTOBUF),
                "http://127.0.0.1:4318",
                null));
        collectorDao.save(Collector.builder()
                .name(SERVER_PROFILE_ID)
                .ip("127.0.0.1")
                .status(CommonConstants.COLLECTOR_STATUS_ONLINE)
                .instrumentationIntake(serverAdvertisement)
                .build());
    }

    private void assertCurrentDetectionContract(long startedAt) {
        var response = currentDetectionService.detect(
                new InstrumentationDetectionV2.DetectionRequest(
                        2,
                        SourceKind.QUICK_START,
                        "opentelemetry_telemetrygen",
                        null,
                        null,
                        null,
                        Environment.VM,
                        Platform.LINUX_AMD64,
                        new ServiceIdentity(
                                SERVICE_NAME, SERVICE_NAMESPACE, ENVIRONMENT, INSTANCE_ID, ENDPOINT),
                        "collector:" + COLLECTOR_ID,
                        startedAt));
        assertThat(response.signals().values())
                .allMatch(signal -> signal.status()
                        == InstrumentationDetectionV2.DetectionStatus.RECEIVED);
        assertThat(response.queryJumps()).hasSize(3).allMatch(jump -> jump.enabled()
                && COLLECTOR_ID.equals(jump.context().collectorId())
                && INSTANCE_ID.equals(jump.context().serviceInstanceId())
                && ENDPOINT.equals(jump.context().endpoint())
                && startedAt == jump.context().startedAt());

        var directServerResponse = currentDetectionService.detect(
                new InstrumentationDetectionV2.DetectionRequest(
                        2,
                        SourceKind.QUICK_START,
                        "opentelemetry_telemetrygen",
                        null,
                        null,
                        null,
                        Environment.VM,
                        Platform.LINUX_AMD64,
                        new ServiceIdentity(
                                SERVICE_NAME, SERVICE_NAMESPACE, ENVIRONMENT, INSTANCE_ID, ENDPOINT),
                        "server:" + SERVER_PROFILE_ID,
                        startedAt));
        assertThat(directServerResponse.signals().values())
                .allMatch(signal -> signal.status()
                        != InstrumentationDetectionV2.DetectionStatus.RECEIVED);
        assertThat(directServerResponse.queryJumps()).hasSize(3).allMatch(jump -> !jump.enabled());
    }

    private void assertNativeContextMappings(long startedAt, long detectedAt) {
        assertThat(queryExecutor.executeStrict("""
                SELECT service_name, resource_attributes, log_attributes, timestamp
                FROM hertzbeat_logs
                ORDER BY timestamp DESC LIMIT 1
                """))
                .singleElement()
                .satisfies(row -> {
                    assertThat(String.valueOf(row.get("resource_attributes")))
                            .contains("service.instance.id", INSTANCE_ID);
                    assertThat(String.valueOf(row.get("log_attributes")))
                            .contains("http.route", ENDPOINT);
                });
        assertThat(queryExecutor.executeStrict("""
                SELECT COUNT(*) AS signal_count FROM hertzbeat_logs
                WHERE service_name = '%s'
                  AND json_get_string(resource_attributes, '$["service.namespace"]') = '%s'
                  AND json_get_string(resource_attributes, '$["deployment.environment.name"]') = '%s'
                  AND json_get_string(resource_attributes, '$["hertzbeat.collector.id"]') = '%s'
                  AND json_get_string(resource_attributes, '$["service.instance.id"]') = '%s'
                  AND json_get_string(log_attributes, '$["http.route"]') = '%s'
                  AND timestamp >= to_timestamp_millis(%d)
                  AND timestamp < to_timestamp_millis(%d)
                """.formatted(
                        SERVICE_NAME,
                        SERVICE_NAMESPACE,
                        ENVIRONMENT,
                        COLLECTOR_ID,
                        INSTANCE_ID,
                        ENDPOINT,
                        startedAt,
                        detectedAt + 1)))
                .singleElement()
                .satisfies(row -> assertThat(((Number) row.get("signal_count")).longValue()).isPositive());
        assertThat(queryExecutor.executeStrict("""
                SELECT service_name,
                  "resource_attributes.service.instance.id" AS service_instance_id,
                  "span_attributes.http.route" AS http_route,
                  timestamp
                FROM hzb_traces
                ORDER BY timestamp DESC LIMIT 1
                """))
                .singleElement()
                .satisfies(row -> {
                    assertThat(row.get("service_instance_id")).hasToString(INSTANCE_ID);
                    assertThat(row.get("http_route")).hasToString(ENDPOINT);
                });
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
                INSTANCE_ID, ENDPOINT, "hertzbeat_e2e_requests", null, null,
                null, null, "1s", "20", null));
        assertThat(metrics.getContext().getCollectorId()).isEqualTo(metricsContext.collectorId());
        assertThat(metrics.getContext().getInstance()).isEqualTo(INSTANCE_ID);
        assertThat(metrics.getContext().getEndpoint()).isEqualTo(ENDPOINT);
        assertThat(metrics.getQuery())
                .contains("hertzbeat_e2e_requests")
                .contains("hertzbeat_collector_id=\"" + metricsContext.collectorId() + "\"")
                .contains("service_instance_id=\"" + INSTANCE_ID + "\"")
                .contains("http_route=\"" + ENDPOINT + "\"");
        assertThat(metrics.getStats().getNonEmptySeries()).isPositive();
        assertThat(metrics.getResults().getFrames()).isNotEmpty();
        assertThat(metrics.getResults().getFrames())
                .flatExtracting(frame -> frame.getData())
                .anySatisfy(row -> assertThat(Double.parseDouble(String.valueOf(row[1]))).isEqualTo(1.0));
        OtlpMetricsConsoleDto missingInstanceMetrics = metricsQueryService.query(
                new CollectorScopedMetricsQueryService.Request(
                        null, null, metricsContext.startedAt(), end, metricsContext.serviceName(),
                        metricsContext.serviceNamespace(), metricsContext.environment(), metricsContext.collectorId(),
                        "other-instance", ENDPOINT, "hertzbeat_e2e_requests", null, null,
                        null, null, "1s", "20", null));
        assertThat(missingInstanceMetrics.getStats().getNonEmptySeries()).isZero();

        org.springframework.data.domain.Page<LogEntry> logs = logQueryService.list(
                logsContext.startedAt(), end, TRACE_ID, SPAN_ID, null, "INFO", "three-signal-e2e",
                logsContext.serviceName(), logsContext.serviceNamespace(), logsContext.environment(),
                "hertzbeat.collector.id=" + logsContext.collectorId()
                        + " and service.instance.id=" + INSTANCE_ID,
                "http.route=" + ENDPOINT, 0, 20, false, false);
        assertThat(logs.getContent()).singleElement().satisfies(log -> {
            assertThat(log.getBody()).isEqualTo("three-signal-e2e");
            assertThat(log.getTraceId()).isEqualTo(TRACE_ID);
            assertThat(log.getSpanId()).isEqualTo(SPAN_ID);
            assertThat(log.getResource()).containsEntry("hertzbeat.collector.id", logsContext.collectorId());
            assertThat(log.getResource()).containsEntry("service.instance.id", INSTANCE_ID);
            assertThat(log.getAttributes()).containsEntry("http.route", ENDPOINT);
        });

        org.springframework.data.domain.Page<TraceListItemDto> traces = traceQueryService.queryTraceList(
                null, tracesContext.startedAt(), end, TRACE_ID, false,
                tracesContext.serviceName(), tracesContext.serviceNamespace(), tracesContext.environment(),
                "hertzbeat.collector.id=" + tracesContext.collectorId()
                        + " and service.instance.id=" + INSTANCE_ID,
                "GET /checkout", null, null, 0, 20, false, null, "http.route=" + ENDPOINT);
        assertThat(traces.getContent()).singleElement().satisfies(trace -> {
            assertThat(trace.getTraceId()).isEqualTo(TRACE_ID);
            assertThat(trace.getRootSpanId()).isEqualTo(SPAN_ID);
            assertThat(trace.getServiceName()).isEqualTo(tracesContext.serviceName());
            assertThat(trace.getResourceAttributes())
                    .containsEntry("hertzbeat.collector.id", tracesContext.collectorId())
                    .containsEntry("service.instance.id", INSTANCE_ID);
        });

        assertThat(logQueryService.list(
                logsContext.startedAt(), end, null, null, null, null, null,
                logsContext.serviceName(), logsContext.serviceNamespace(), logsContext.environment(),
                "service.instance.id=other-instance", "http.route=" + ENDPOINT, 0, 20, false, false))
                .isEmpty();
        assertThat(traceQueryService.queryTraceList(
                null, tracesContext.startedAt(), end, null, false,
                tracesContext.serviceName(), tracesContext.serviceNamespace(), tracesContext.environment(),
                "service.instance.id=other-instance", null, null, null,
                0, 20, false, null, "http.route=" + ENDPOINT))
                .isEmpty();
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
                new ServiceIdentity(
                        serviceName,
                        serviceNamespace,
                        environment,
                        source.service().serviceInstanceId(),
                        source.service().endpoint()),
                collectorId,
                startedAt);
    }

    private DetectionRequest requestWithContext(
            DetectionRequest source, String serviceInstanceId, String endpoint) {
        return new DetectionRequest(
                source.schemaVersion(),
                source.language(),
                source.framework(),
                source.method(),
                source.environment(),
                source.platform(),
                new ServiceIdentity(
                        source.service().name(),
                        source.service().namespace(),
                        source.service().environment(),
                        serviceInstanceId,
                        endpoint),
                source.collectorId(),
                source.startedAt());
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

}
