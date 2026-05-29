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

package org.apache.hertzbeat.observability.shared.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.entity.EntityEvidenceSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityUnifiedEvidenceSummary;
import org.apache.hertzbeat.common.observability.dto.binding.TelemetryIdentitySnapshot;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogQueryHint;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.metrics.MetricCorrelationHint;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.model.CodeNavigationHint;
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.warehouse.repository.LogQueryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mockito;

class TelemetryIntakeServiceImplTest {

    private final LogQueryRepository logQueryRepository = Mockito.mock(LogQueryRepository.class);
    private final TelemetryIntakeServiceImpl telemetryIntakeService =
            new TelemetryIntakeServiceImpl(logQueryRepository);

    @Test
    void buildCodeNavigationHintUsesEntityCodeLocations() {
        ObservedEntityContext entityContext = buildObservedEntityContextWithCodeLocations("https://github.com/apache/hertzbeat.git");

        CodeNavigationHint hint = telemetryIntakeService.buildCodeNavigationHint(
                entityContext,
                Map.of("service.name", "checkout"),
                Map.of(
                        "code.function", "localOtlpTraceIngest",
                        "code.namespace", "org.apache.hertzbeat.manager.service.impl",
                        "code.filepath", "hertzbeat-manager/src/main/java/org/apache/hertzbeat/manager/service/impl/ObserveEntityServiceImpl.java"
                ),
                List.of("localOtlpTraceIngest"),
                "查看代码"
        );

        assertNotNull(hint);
        assertEquals("https://github.com/apache/hertzbeat", hint.getRepositoryUrl());
        assertEquals("github", hint.getProvider());
        assertEquals("hertzbeat-manager/src/main/java/org/apache/hertzbeat/manager/service/impl/ObserveEntityServiceImpl.java",
                hint.getDefaultPath());
        assertEquals("localOtlpTraceIngest", hint.getSearchQuery());
    }

    @Test
    void buildCodeNavigationHintFallsBackForGenericProvider() {
        ObservedEntityContext entityContext = buildObservedEntityContextWithCodeLocations("https://git.example.com/acme/checkout-service.git");

        CodeNavigationHint hint = telemetryIntakeService.buildCodeNavigationHint(
                entityContext,
                Collections.emptyMap(),
                Collections.emptyMap(),
                List.of("CheckoutController"),
                "CheckoutController"
        );

        assertNotNull(hint);
        assertEquals("https://git.example.com/acme/checkout-service", hint.getRepositoryUrl());
        assertEquals("generic", hint.getProvider());
        assertEquals("hertzbeat-manager/src/main/java/org/apache/hertzbeat/manager/service/impl", hint.getDefaultPath());
        assertEquals("CheckoutController", hint.getSearchQuery());
    }

    @ParameterizedTest
    @CsvSource({
            "https://github.com/apache/hertzbeat.git,github",
            "https://gitlab.example.com/acme/checkout-service.git,gitlab",
            "https://gitee.com/acme/checkout-service.git,gitee",
            "https://git.example.com/acme/checkout-service.git,generic"
    })
    void buildCodeNavigationHintDetectsSupportedProviders(String repositoryUrl, String expectedProvider) {
        ObservedEntityContext entityContext = buildObservedEntityContextWithCodeLocations(repositoryUrl);

        CodeNavigationHint hint = telemetryIntakeService.buildCodeNavigationHint(
                entityContext,
                Collections.emptyMap(),
                Map.of("code.function", "CheckoutController"),
                Collections.emptyList(),
                "CheckoutController"
        );

        assertNotNull(hint);
        assertEquals(expectedProvider, hint.getProvider());
    }

    @Test
    void collectRecentExternalIdentitySnapshotsFiltersSelfTelemetry() {
        LogEntry selfLog = LogEntry.builder()
                .resource(Map.of("service.name", "hertzbeat", "service.namespace", "platform"))
                .build();
        LogEntry externalLog = LogEntry.builder()
                .resource(Map.of("service.name", "checkout", "service.namespace", "commerce"))
                .build();

        List<TelemetryIdentitySnapshot> snapshots = telemetryIntakeService.collectRecentExternalIdentitySnapshots(
                List.of(selfLog, externalLog),
                Collections.emptyList(),
                Collections.emptyList()
        );

        assertEquals(1, snapshots.size());
        assertEquals("checkout", snapshots.getFirst().getServiceName());
    }

    @Test
    void resolveRecentOtlpMetricContextReturnsLatestMatchingExternalSnapshot() {
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of("service.name", "hertzbeat", "service.namespace", "platform"),
                10L,
                "internal_metric",
                "gauge",
                "1",
                1.0,
                Map.of()
        );
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "flagd",
                        "service.namespace", "opentelemetry-demo",
                        "deployment.environment.name", "demo"
                ),
                20L,
                "http_server_request_duration_count",
                "sum",
                "1",
                2.0,
                Map.of()
        );

        TelemetryIdentitySnapshot snapshot = telemetryIntakeService.resolveRecentOtlpMetricContext(null, null, null);

        assertNotNull(snapshot);
        assertEquals("flagd", snapshot.getServiceName());
        assertEquals("opentelemetry-demo", snapshot.getServiceNamespace());
        assertEquals("demo", snapshot.getEnvironmentName());
    }

    @Test
    void collectRecentOtlpMetricNamesKeepsNewestDistinctNamesForMatchingContext() {
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of("service.name", "checkout", "service.namespace", "commerce"),
                10L,
                "checkout_active_requests",
                "gauge",
                "1",
                1.0,
                Map.of()
        );
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of("service.name", "checkout", "service.namespace", "commerce"),
                11L,
                "http_server_request_duration_count",
                "sum",
                "1",
                2.0,
                Map.of()
        );
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of("service.name", "checkout", "service.namespace", "commerce"),
                12L,
                "http_server_request_duration_count",
                "sum",
                "1",
                3.0,
                Map.of()
        );

        List<String> metricNames = telemetryIntakeService.collectRecentOtlpMetricNames("checkout", "commerce", null, 5);

        assertEquals(List.of("http_server_request_duration_count", "checkout_active_requests"), metricNames);
    }

    @Test
    void collectRecentOtlpMetricNamesIncludesGreptimePrometheusUnitName() {
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of("service.name", "checkout", "service.namespace", "storefront"),
                20L,
                "hertzbeat_demo_checkout_latency_ms",
                "gauge",
                "ms",
                92.0,
                Map.of()
        );

        List<String> metricNames = telemetryIntakeService.collectRecentOtlpMetricNames(
                "checkout", "storefront", null, 5);

        assertEquals(List.of(
                "hertzbeat_demo_checkout_latency_ms_milliseconds",
                "hertzbeat_demo_checkout_latency_ms"
        ), metricNames);
    }

    @Test
    void collectRecentOtlpMetricNamesPrioritizesDemoSignalsOverRuntimeNoise() {
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "hertzbeat-demo",
                        "deployment.environment.name", "demo"
                ),
                20L,
                "hertzbeat_demo_checkout_latency_ms",
                "gauge",
                "ms",
                92.0,
                Map.of()
        );
        for (int i = 0; i < 80; i++) {
            telemetryIntakeService.recordOtlpMetricIntake(
                    Map.of(
                            "service.name", "checkout",
                            "service.namespace", "hertzbeat-demo",
                            "deployment.environment.name", "demo"
                    ),
                    30L + i,
                    "system_cpu_load_average_" + i,
                    "gauge",
                    "1",
                    1.0,
                    Map.of()
            );
        }

        List<String> metricNames = telemetryIntakeService.collectRecentOtlpMetricNames(
                "checkout", "hertzbeat-demo", "demo", 8);

        assertEquals("hertzbeat_demo_checkout_latency_ms_milliseconds", metricNames.getFirst());
    }

    @Test
    void collectRecentOtlpMetricContextsReturnsDistinctNewestExternalContexts() {
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of("service.name", "quote", "service.namespace", "opentelemetry-demo"),
                30L,
                "otel.logs.log_processor.logs",
                "gauge",
                "1",
                1.0,
                Map.of()
        );
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of("service.name", "flagd", "service.namespace", "opentelemetry-demo"),
                20L,
                "http_server_request_duration_count",
                "sum",
                "1",
                2.0,
                Map.of()
        );
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of("service.name", "flagd", "service.namespace", "opentelemetry-demo"),
                10L,
                "flagd_active_requests",
                "gauge",
                "1",
                3.0,
                Map.of()
        );

        List<TelemetryIdentitySnapshot> contexts = telemetryIntakeService.collectRecentOtlpMetricContexts(5);

        assertEquals(2, contexts.size());
        assertEquals("quote", contexts.getFirst().getServiceName());
        assertEquals("flagd", contexts.get(1).getServiceName());
    }

    @Test
    void collectRecentOtlpMetricContextsSkipsCollectorNoise() {
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of("service.name", "otelcol-contrib", "service.namespace", "observability"),
                40L,
                "otelcol_process_runtime",
                "gauge",
                "1",
                1.0,
                Map.of()
        );
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of("service.name", "flagd", "service.namespace", "opentelemetry-demo"),
                30L,
                "http_server_request_duration_count",
                "sum",
                "1",
                2.0,
                Map.of()
        );

        List<TelemetryIdentitySnapshot> contexts = telemetryIntakeService.collectRecentOtlpMetricContexts(5);

        assertEquals(1, contexts.size());
        assertEquals("flagd", contexts.getFirst().getServiceName());
    }

    @Test
    void buildUnifiedEvidenceSummaryRequiresRealLogEvidenceToActivateLogs() {
        EntityUnifiedEvidenceSummary summary = telemetryIntakeService.buildUnifiedEvidenceSummary(
                new EntityEvidenceSummaryInfo(0, 0, 0, 0L, 1, System.currentTimeMillis()),
                null,
                new EntityLogSummaryInfo(1, "trace", "error", Collections.emptyMap(), List.of("trace-1"), "trace-1"),
                null,
                Collections.emptyList(),
                Collections.emptyList(),
                Collections.emptyList()
        );

        assertFalse(summary.isLogsActive());
        assertEquals(0, summary.getActiveSignalCount());
    }

    @Test
    void buildLogEvidenceQueriesStoredLogsFromRepository() {
        ObservedEntityContext entityContext = ObservedEntityContext.from(
                ObserveEntity.builder().id(88L).type("service").name("checkout").build(),
                List.of(
                EntityIdentity.builder().entityId(88L).identityKey("service.name").identityValue("checkout").build(),
                EntityIdentity.builder().entityId(88L).identityKey("service.namespace").identityValue("commerce").build(),
                EntityIdentity.builder().entityId(88L).identityKey("deployment.environment.name").identityValue("prod").build()
                )
        );
        EntityLogSummaryInfo summaryInfo = new EntityLogSummaryInfo(
                1,
                "trace",
                "checkout failed",
                Map.of("service.name", "checkout"),
                List.of("checkout failed"),
                "checkout failed"
        );
        EntityLogQueryHint queryHint = new EntityLogQueryHint(
                "trace-1",
                Map.of("service.name", "checkout"),
                List.of("trace-1"),
                "trace-1",
                "span-1",
                "checkout",
                "commerce",
                "prod",
                1000L,
                2000L
        );
        LogEntry storedLog = LogEntry.builder()
                .timeUnixNano(1_710_000_000_000_000_000L)
                .severityText("ERROR")
                .body("checkout failed in repository")
                .traceId("trace-1")
                .spanId("span-1")
                .resource(Map.of(
                        "service.name", "checkout",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ))
                .attributes(Map.of("code.function", "processOrder"))
                .build();
        when(logQueryRepository.queryLogs(1000L, 2000L, "trace-1", "span-1", 20))
                .thenReturn(List.of(storedLog));

        List<LogEvidence> evidence = telemetryIntakeService.buildLogEvidence(
                entityContext,
                summaryInfo,
                List.of(queryHint)
        );

        assertEquals(1, evidence.size());
        assertEquals("checkout failed in repository", evidence.getFirst().getBody());
        assertEquals("trace-1", evidence.getFirst().getTraceId());
        assertEquals("checkout", evidence.getFirst().getIdentitySnapshot().getServiceName());
        assertTrue(evidence.getFirst().getBindingResult().isBound());
        assertEquals(3, evidence.getFirst().getBindingResult().getMatchedIdentityCount());
        verify(logQueryRepository).queryLogs(1000L, 2000L, "trace-1", "span-1", 20);
    }

    @Test
    void recordOtlpLogIntakeCanonicalizesNormalizedResourceKeysForEvidenceMatching() {
        ObservedEntityContext entityContext = ObservedEntityContext.from(
                ObserveEntity.builder().id(88L).type("service").name("checkout").build(),
                List.of(
                        EntityIdentity.builder().entityId(88L).identityKey("service.name").identityValue("checkout").build(),
                        EntityIdentity.builder().entityId(88L).identityKey("service.namespace").identityValue("commerce").build(),
                        EntityIdentity.builder().entityId(88L).identityKey("deployment.environment.name").identityValue("prod").build()
                )
        );
        telemetryIntakeService.recordOtlpLogIntake(
                Map.of(
                        "service_name", "checkout",
                        "service_namespace", "commerce",
                        "deployment_environment_name", "prod",
                        "hertzbeat_workspace_id", "team-a"
                ),
                1_710_000_000_000L,
                "checkout failed",
                "ERROR",
                "trace-1",
                "span-1",
                Map.of("code.function", "CheckoutController")
        );

        List<LogEvidence> evidence = telemetryIntakeService.buildLogEvidence(
                entityContext,
                null,
                Collections.emptyList()
        );

        assertEquals(1, evidence.size());
        assertEquals("checkout", evidence.getFirst().getIdentitySnapshot().getServiceName());
        assertEquals("commerce", evidence.getFirst().getIdentitySnapshot().getServiceNamespace());
        assertEquals("prod", evidence.getFirst().getIdentitySnapshot().getEnvironmentName());
        assertTrue(evidence.getFirst().getBindingResult().isBound());
        assertEquals(3, evidence.getFirst().getBindingResult().getMatchedIdentityCount());
    }

    @Test
    void explicitHertzBeatEntityIdKeepsThreeSignalEvidenceWhenCanonicalIdentityIsMissing() {
        ObservedEntityContext entityContext = ObservedEntityContext.from(
                ObserveEntity.builder().id(88L).type("service").name("checkout").build(),
                Collections.emptyList()
        );
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of("hertzbeat.entity_id", "88", "hertzbeat.workspace_id", "team-a"),
                1_710_000_000_000L,
                "checkout_request_latency",
                "gauge",
                "ms",
                41.0,
                Map.of("route", "/checkout")
        );
        telemetryIntakeService.recordOtlpLogIntake(
                Map.of("hertzbeat_entity_id", "88", "hertzbeat_workspace_id", "team-a"),
                1_710_000_000_500L,
                "checkout failed",
                "ERROR",
                "trace-explicit",
                "span-explicit",
                Map.of("code.function", "CheckoutController")
        );
        telemetryIntakeService.recordOtlpTraceIntake(
                Map.of("hertzbeat.entity_id", "88", "hertzbeat.workspace_id", "team-a"),
                1_710_000_001_000L,
                "trace-explicit",
                "span-explicit",
                "POST /checkout",
                "error",
                Map.of("http.route", "/checkout")
        );

        List<MetricEvidence> metricEvidence =
                telemetryIntakeService.buildMetricEvidence(entityContext, null, Collections.emptyList());
        List<LogEvidence> logEvidence =
                telemetryIntakeService.buildLogEvidence(entityContext, null, Collections.emptyList());
        EntityTraceSummaryDto traceSummary = telemetryIntakeService.buildTraceSummary(entityContext);
        var traceQueryHints = telemetryIntakeService.buildTraceQueryHints(entityContext);
        List<TraceEvidence> traceEvidence =
                telemetryIntakeService.buildTraceEvidence(entityContext, traceSummary, traceQueryHints);
        EntityUnifiedEvidenceSummary summary = telemetryIntakeService.buildUnifiedEvidenceSummary(
                null,
                null,
                null,
                traceSummary,
                metricEvidence,
                logEvidence,
                traceEvidence
        );

        assertEquals(1, metricEvidence.size());
        assertEquals(88L, metricEvidence.getFirst().getEntityId());
        assertEquals("88", metricEvidence.getFirst().getIdentitySnapshot()
                .getCanonicalIdentities().get("hertzbeat.entity_id"));
        assertEquals("team-a", metricEvidence.getFirst().getIdentitySnapshot()
                .getCanonicalIdentities().get("hertzbeat.workspace_id"));
        assertEquals(1, logEvidence.size());
        assertEquals(88L, logEvidence.getFirst().getEntityId());
        assertEquals("checkout failed", logEvidence.getFirst().getBody());
        assertEquals("team-a", logEvidence.getFirst().getResource().get("hertzbeat_workspace_id"));
        assertEquals(1, traceSummary.getRecentTraceCount());
        assertEquals(1, traceSummary.getRecentErrorTraceCount());
        assertEquals(1, traceQueryHints.size());
        assertEquals("team-a", traceQueryHints.getFirst().getResourceFilters().get("hertzbeat.workspace_id"));
        assertEquals(1, traceEvidence.size());
        assertEquals("trace-explicit", traceEvidence.getFirst().getTraceId());
        assertEquals(3, summary.getActiveSignalCount());
        assertEquals(1, summary.getMetricEvidenceCount());
        assertEquals(1, summary.getLogEvidenceCount());
        assertEquals(1, summary.getTraceEvidenceCount());
    }

    @Test
    void buildMetricCorrelationHintUsesCanonicalIdentityAndTimeWindow() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(99L)
                .type("service")
                .name("checkout")
                .namespace("commerce")
                .environment("prod")
                .build();
        TelemetryIdentitySnapshot snapshot = new TelemetryIdentitySnapshot(
                "otlp",
                "metrics",
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                "checkout",
                "commerce",
                "prod",
                null,
                null,
                1_710_000_000_000L
        );

        MetricCorrelationHint hint = telemetryIntakeService.buildMetricCorrelationHint(
                ObservedEntityContext.from(entity, Collections.emptyList()),
                snapshot,
                1_710_000_000_000L,
                "checkout_request_latency"
        );

        assertNotNull(hint);
        assertEquals(99L, hint.getEntityId());
        assertEquals("checkout", hint.getServiceName());
        assertEquals("commerce", hint.getServiceNamespace());
        assertEquals("prod", hint.getEnvironment());
        assertEquals(1_710_000_000_000L, hint.getEnd());
        assertEquals(1_709_999_100_000L, hint.getStart());
        assertEquals("checkout", hint.getLogQuery());
        assertEquals("checkout", hint.getTraceQuery());
    }

    @Test
    void buildMetricCorrelationHintFallsBackToEntityCanonicalIdentity() {
        ObservedEntityContext entityContext = ObservedEntityContext.from(
                ObserveEntity.builder().id(100L).type("service").name("payment").build(),
                List.of(
                EntityIdentity.builder().identityKey("service.name").identityValue("payment").build(),
                EntityIdentity.builder().identityKey("service.namespace").identityValue("billing").build(),
                EntityIdentity.builder().identityKey("deployment.environment.name").identityValue("prod").build()
                )
        );

        MetricCorrelationHint hint = telemetryIntakeService.buildMetricCorrelationHint(
                entityContext,
                new TelemetryIdentitySnapshot("monitor", "metrics", Collections.emptyMap(), null, null, null, null, null, 1_720_000_000_000L),
                1_720_000_000_000L,
                "payment_request_total"
        );

        assertNotNull(hint);
        assertEquals("payment", hint.getServiceName());
        assertEquals("billing", hint.getServiceNamespace());
        assertEquals("prod", hint.getEnvironment());
        assertEquals("payment", hint.getLogQuery());
    }

    @Test
    void buildMetricEvidenceRequiresExactServiceNameWhenEntityDefinesIt() {
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of("service.name", "checkout-v2", "service.namespace", "commerce", "deployment.environment.name", "prod"),
                1_710_000_000_000L,
                "checkout_request_latency",
                "gauge",
                "ms",
                42.5,
                Map.of("instance", "e2e")
        );
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of("service.name", "checkout", "service.namespace", "commerce", "deployment.environment.name", "prod"),
                1_710_000_000_500L,
                "checkout_request_latency",
                "gauge",
                "ms",
                41.0,
                Map.of("instance", "e2e")
        );

        ObservedEntityContext entityContext = ObservedEntityContext.from(
                ObserveEntity.builder().id(101L).type("service").name("checkout").build(),
                List.of(
                EntityIdentity.builder()
                        .entityId(101L)
                        .identityType("otel_resource")
                        .identityKey("service.name")
                        .identityValue("checkout")
                        .normalizedValue("checkout")
                        .priority(100)
                        .primaryIdentity(true)
                        .build(),
                EntityIdentity.builder()
                        .entityId(101L)
                        .identityType("otel_resource")
                        .identityKey("service.namespace")
                        .identityValue("commerce")
                        .normalizedValue("commerce")
                        .priority(80)
                        .primaryIdentity(false)
                        .build(),
                EntityIdentity.builder()
                        .entityId(101L)
                        .identityType("otel_resource")
                        .identityKey("deployment.environment.name")
                        .identityValue("prod")
                        .normalizedValue("prod")
                        .priority(60)
                        .primaryIdentity(false)
                        .build()
                )
        );

        assertEquals(1, telemetryIntakeService.buildMetricEvidence(entityContext, null, Collections.emptyList()).size());
    }

    @Test
    void buildMetricEvidencePreservesCompatibilityMetadataAndReadableContext() {
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of("service.name", "checkout", "service.namespace", "commerce", "deployment.environment.name", "prod"),
                1_710_000_003_000L,
                "http.server.request.size",
                "summary",
                "By",
                512.0,
                Map.of(
                        "instance", "e2e",
                        "otlp.metric.compatibility", "partial",
                        "otlp.metric.compatibility.reason",
                        "Summary quantiles 当前仅作为兼容元信息保留，尚未作为一等查询语义暴露。",
                        "otlp.metric.greptime.compatibility", "partial",
                        "otlp.metric.facade.compatibility", "partial",
                        "otlp.metric.summary.quantiles",
                        "[{\"quantile\":0.5,\"value\":128.0},{\"quantile\":0.95,\"value\":384.0}]"
                )
        );

        ObservedEntityContext entityContext = ObservedEntityContext.from(
                ObserveEntity.builder().id(102L).type("service").name("checkout").build(),
                List.of(
                EntityIdentity.builder()
                        .entityId(102L)
                        .identityType("otel_resource")
                        .identityKey("service.name")
                        .identityValue("checkout")
                        .normalizedValue("checkout")
                        .priority(100)
                        .primaryIdentity(true)
                        .build(),
                EntityIdentity.builder()
                        .entityId(102L)
                        .identityType("otel_resource")
                        .identityKey("service.namespace")
                        .identityValue("commerce")
                        .normalizedValue("commerce")
                        .priority(80)
                        .primaryIdentity(false)
                        .build(),
                EntityIdentity.builder()
                        .entityId(102L)
                        .identityType("otel_resource")
                        .identityKey("deployment.environment.name")
                        .identityValue("prod")
                        .normalizedValue("prod")
                        .priority(60)
                        .primaryIdentity(false)
                        .build()
                )
        );

        List<MetricEvidence> evidence = telemetryIntakeService.buildMetricEvidence(
                entityContext, null, Collections.emptyList());

        assertEquals(1, evidence.size());
        MetricEvidence metricEvidence = evidence.getFirst();
        assertEquals("summary", metricEvidence.getMetricType());
        assertNotNull(metricEvidence.getAttributes());
        assertEquals("partial", metricEvidence.getAttributes().get("otlp.metric.compatibility"));
        assertTrue(metricEvidence.getAttributes().get("otlp.metric.summary.quantiles").contains("\"quantile\":0.95"));
        assertNotNull(metricEvidence.getOtelContext());
        assertTrue(metricEvidence.getOtelContext().contains("部分支持"));
        assertTrue(metricEvidence.getOtelContext().contains("Summary quantiles"));
    }

    private ObservedEntityContext buildObservedEntityContextWithCodeLocations(String repositoryUrl) {
        return ObservedEntityContext.from(
                ObserveEntity.builder().id(1L).type("service").name("checkout").build(),
                Collections.emptyList(),
                JsonUtil.fromJson("""
                {
                  "codeLocations": [
                    {
                      "repositoryURL": "%s",
                      "paths": [
                        "hertzbeat-manager/src/main/java/org/apache/hertzbeat/manager/service/impl",
                        "web-app/src/app/routes"
                      ]
                    }
                  ]
                }
                """.formatted(repositoryUrl))
        );
    }
}
