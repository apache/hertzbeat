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

package org.apache.hertzbeat.observability.ingestion.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.binding.TelemetryIdentitySnapshot;
import org.apache.hertzbeat.common.observability.dto.binding.OtlpEntityBindingSummaryDto;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionGuideDto;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionOverviewDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsConsoleDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsInventoryDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpRelatedMetricsDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.common.observability.gateway.ObservabilitySignalIntakeGateway;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.common.observability.model.EntityCanonicalIdentityRegistry;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.warehouse.repository.LogQueryRepository;
import org.apache.hertzbeat.warehouse.repository.MetricQueryRepository;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockHttpServletRequest;

@ExtendWith(MockitoExtension.class)
class OtlpIngestionWorkspaceServiceImplTest {

    private static final String METRIC_PROMQL_GROUP_BY = "sum by (__name__, service_name, service_namespace, "
            + "deployment_environment_name, hertzbeat_entity_id, hertzbeat_entity_type, hertzbeat_entity_name) ";

    private OtlpIngestionWorkspaceServiceImpl otlpIngestionWorkspaceService;

    @Mock
    private EntityTraceQueryService entityTraceQueryService;

    @Mock
    private ObservabilityWorkspaceQueryGateway workspaceQueryGateway;

    @Mock
    private MetricQueryRepository metricQueryRepository;

    @Mock
    private LogQueryRepository logQueryRepository;

    private ObservabilitySignalIntakeGateway observabilitySignalIntakeGateway;

    private Locale previousLocale;

    @BeforeEach
    void setUp() {
        previousLocale = Locale.getDefault();
        Locale.setDefault(Locale.US);
        observabilitySignalIntakeGateway = new InMemoryObservabilitySignalIntakeGateway();
        otlpIngestionWorkspaceService = new OtlpIngestionWorkspaceServiceImpl(
                entityTraceQueryService,
                workspaceQueryGateway,
                observabilitySignalIntakeGateway,
                logQueryRepository,
                metricQueryRepository,
                List.of(),
                List.of(),
                List.of()
        );
    }

    @AfterEach
    void restoreLocale() {
        Locale.setDefault(previousLocale);
    }

    private void stubRecentLogs(LogEntry... logs) {
        when(logQueryRepository.queryRecentLogs(anyLong(), anyLong(), eq(20))).thenReturn(List.of(logs));
    }

    private MetricQueryRepository.PromqlRangeQueryResult promqlSuccess(DatasourceQueryData queryData) {
        return new MetricQueryRepository.PromqlRangeQueryResult("Greptime-promql", queryData, null);
    }

    private void stubPromqlQuery(String expr, DatasourceQueryData queryData) {
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                argThat(actualExpr -> expr.equals(actualExpr)),
                anyLong(),
                anyLong(),
                anyString()
        )).thenReturn(promqlSuccess(queryData));
    }

    private static String groupedMetricPromql(String filter) {
        return METRIC_PROMQL_GROUP_BY + "({" + filter + "})";
    }

    private static String groupedMetricPromql(String groupBy, String filter) {
        return "sum by (" + groupBy + ") ({" + filter + "})";
    }

    private static String temporalGroupedMetricPromql(String function, String filter) {
        return METRIC_PROMQL_GROUP_BY + "(" + function + "({" + filter + "}[5m]))";
    }

    private static List<DatasourceQueryData.SchemaData> metricFrames(int count) {
        List<DatasourceQueryData.SchemaData> frames = new ArrayList<>();
        for (int index = 0; index < count; index++) {
            frames.add(new DatasourceQueryData.SchemaData(
                    new DatasourceQueryData.MetricSchema(
                            List.of(
                                    new DatasourceQueryData.MetricField("__ts__", "time", null),
                                    new DatasourceQueryData.MetricField("__value__", "number", null)
                            ),
                            Map.of(
                                    "__name__", "http_server_request_duration_count",
                                    "service_name", "service-" + index
                            ),
                            Map.of()
                    ),
                    Collections.singletonList(new Object[] {1000L, (double) index})
            ));
        }
        return frames;
    }

    @Test
    void overviewAggregatesSignalStatusAndServiceCount() {
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(1_710_000_000_000_000_000L)
                .severityText("ERROR")
                .body("checkout failed")
                .traceId("trace-log-1")
                .resource(Map.of("service.name", "checkout", "service.namespace", "commerce"))
                .build();
        TraceListItemDto traceItem = new TraceListItemDto();
        traceItem.setTraceId("trace-1");
        traceItem.setRootSpanName("GET /checkout");
        traceItem.setServiceName("checkout");
        traceItem.setStartTime(1_710_000_000_000L);
        Monitor latestMonitor = Monitor.builder()
                .id(1L)
                .name("checkout-api")
                .app("api")
                .instance("checkout:8080")
                .gmtUpdate(LocalDateTime.now())
                .build();

        stubRecentLogs(logEntry);
        when(entityTraceQueryService.queryTraceList(org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.eq(false),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq(0), org.mockito.ArgumentMatchers.eq(20)))
                .thenReturn(new PageImpl<>(List.of(traceItem), PageRequest.of(0, 20), 1));
        when(workspaceQueryGateway.countMonitors()).thenReturn(5L);
        when(workspaceQueryGateway.findLatestMonitor()).thenReturn(java.util.Optional.of(latestMonitor));
        when(workspaceQueryGateway.countDistinctBoundEntityIdsByIdentityKeys(org.mockito.ArgumentMatchers.anySet())).thenReturn(4L);

        OtlpIngestionOverviewDto overview = otlpIngestionWorkspaceService.getOverview();

        assertTrue(overview.getLogs().isActive());
        assertTrue(overview.getTraces().isActive());
        assertTrue(overview.getMetrics().isActive());
        assertEquals(3, overview.getActiveSignalCount());
        assertEquals(1, overview.getRecentServiceCount());
        assertEquals(4L, overview.getBoundEntityCount());
        assertFalse(overview.getRecentEvents().isEmpty());
        assertTrue(overview.getLatestObservedAt() != null && overview.getLatestObservedAt() > 0);
    }

    @Test
    void overviewReportsRealReadinessChecksForCollectorStorageQueryAndGreptime() {
        HistoryDataReader historyDataReader = org.mockito.Mockito.mock(HistoryDataReader.class);
        GreptimeSqlQueryExecutor greptimeSqlQueryExecutor = org.mockito.Mockito.mock(GreptimeSqlQueryExecutor.class);
        OtlpIngestionWorkspaceServiceImpl service = new OtlpIngestionWorkspaceServiceImpl(
                entityTraceQueryService,
                workspaceQueryGateway,
                observabilitySignalIntakeGateway,
                logQueryRepository,
                metricQueryRepository,
                List.of(historyDataReader),
                List.of(greptimeSqlQueryExecutor),
                List.of(new GreptimeProperties(true, "127.0.0.1:4001", "http://127.0.0.1:4000", "public", null, null, null))
        );

        stubRecentLogs();
        when(entityTraceQueryService.queryTraceList(org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.eq(false),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq(0), org.mockito.ArgumentMatchers.eq(20)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));
        when(workspaceQueryGateway.countMonitors()).thenReturn(2L);
        when(workspaceQueryGateway.findLatestMonitor()).thenReturn(java.util.Optional.empty());
        when(workspaceQueryGateway.countDistinctBoundEntityIdsByIdentityKeys(org.mockito.ArgumentMatchers.anySet())).thenReturn(0L);
        when(workspaceQueryGateway.countCollectors()).thenReturn(3L);
        when(workspaceQueryGateway.countCollectorsByStatus(org.apache.hertzbeat.common.constants.CommonConstants.COLLECTOR_STATUS_ONLINE))
                .thenReturn(2L);
        when(historyDataReader.isServerAvailable()).thenReturn(true);
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(greptimeSqlQueryExecutor.execute("SELECT 1")).thenReturn(List.of(Map.of("col_0", 1)));

        OtlpIngestionOverviewDto overview = service.getOverview();

        assertEquals(List.of("collector", "storage", "query", "greptime"),
                overview.getReadinessChecks().stream().map(OtlpIngestionOverviewDto.ReadinessCheck::getKey).toList());
        assertTrue(overview.getReadinessChecks().stream().anyMatch(check -> "collector".equals(check.getKey())
                && "warning".equals(check.getStatus())
                && check.getSummary().contains("2 / 3 online")));
        assertTrue(overview.getReadinessChecks().stream().anyMatch(check -> "storage".equals(check.getKey())
                && "success".equals(check.getStatus())
                && check.getSummary().contains("1 / 1 available")));
        assertTrue(overview.getReadinessChecks().stream().anyMatch(check -> "query".equals(check.getKey())
                && "success".equals(check.getStatus())
                && check.getSummary().contains("Metrics, logs, and traces queries are available.")));
        assertTrue(overview.getReadinessChecks().stream().anyMatch(check -> "greptime".equals(check.getKey())
                && "success".equals(check.getStatus())
                && check.getSummary().contains("SQL self-check passed.")));
    }

    @Test
    void overviewUsesLogQueryRepositoryForRecentLogs() {
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(1_710_000_000_000_000_000L)
                .severityText("ERROR")
                .body("checkout failed")
                .traceId("trace-log-1")
                .resource(Map.of("service.name", "checkout", "service.namespace", "commerce"))
                .build();

        stubRecentLogs(logEntry);
        when(entityTraceQueryService.queryTraceList(org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.eq(false),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq(0), org.mockito.ArgumentMatchers.eq(20)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));
        when(workspaceQueryGateway.countMonitors()).thenReturn(0L);
        when(workspaceQueryGateway.findLatestMonitor()).thenReturn(java.util.Optional.empty());
        when(workspaceQueryGateway.countDistinctBoundEntityIdsByIdentityKeys(org.mockito.ArgumentMatchers.anySet())).thenReturn(1L);

        OtlpIngestionOverviewDto overview = otlpIngestionWorkspaceService.getOverview();

        assertTrue(overview.getLogs().isActive());
        assertEquals(1, overview.getRecentServiceCount());
        assertEquals("logs", overview.getRecentEvents().getFirst().getSignal());
        verify(logQueryRepository).queryRecentLogs(anyLong(), anyLong(), eq(20));
    }

    @Test
    void guideUsesGreptimeCompatibleEndpointsWhenAvailable() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setScheme("https");
        request.setServerPort(443);
        request.addHeader("X-Forwarded-Host", "demo.hertzbeat.apache.org");
        request.addHeader("X-Forwarded-Proto", "https");
        OtlpIngestionGuideDto guide = otlpIngestionWorkspaceService.getGuide(request);

        assertEquals("OTLP HTTP", guide.getHttpProtocolLabel());
        assertEquals("Authorization", guide.getAuthHeaderName());
        assertEquals("Bearer <api-token>", guide.getAuthHeaderExample());
        assertEquals("demo.hertzbeat.apache.org:4317", guide.getGrpcAuthorityExample());
        assertTrue(guide.getSignals().stream().anyMatch(signal -> "logs".equals(signal.getSignal())
                && "http".equals(signal.getProtocol())
                && "https://demo.hertzbeat.apache.org/api/otlp/v1/logs".equals(signal.getEndpoint())));
        assertTrue(guide.getSignals().stream().anyMatch(signal -> "traces".equals(signal.getSignal())
                && "http".equals(signal.getProtocol())
                && "https://demo.hertzbeat.apache.org/api/otlp/v1/traces".equals(signal.getEndpoint())));
        assertTrue(guide.getSignals().stream().anyMatch(signal -> "metrics".equals(signal.getSignal())
                && "http".equals(signal.getProtocol())
                && "https://demo.hertzbeat.apache.org/api/otlp/v1/metrics".equals(signal.getEndpoint())));
        assertTrue(guide.getSignals().stream().anyMatch(signal -> "logs".equals(signal.getSignal())
                && "grpc".equals(signal.getProtocol())
                && "demo.hertzbeat.apache.org:4317".equals(signal.getEndpoint())));
        assertTrue(guide.getSnippets().stream().anyMatch(snippet -> "java-http".equals(snippet.getKey())
                && snippet.getContent().contains("OTEL_EXPORTER_OTLP_ENDPOINT=https://demo.hertzbeat.apache.org/api/otlp")
                && snippet.getContent().contains("Authorization=Bearer <api-token>")));
        assertTrue(guide.getSnippets().stream().anyMatch(snippet -> "collector-grpc".equals(snippet.getKey())
                && snippet.getContent().contains("endpoint: demo.hertzbeat.apache.org:4317")
                && snippet.getContent().contains("Authorization: \"Bearer <api-token>\"")));
        assertTrue(guide.getSignals().stream().filter(signal -> "grpc".equals(signal.getProtocol()))
                .allMatch(signal -> signal.getNote() == null || !signal.getNote().contains("login token")));
        assertFalse(guide.getSnippets().isEmpty());
    }

    @Test
    void guideUsesBracketedIpv6ForwardedHostWithoutDuplicatingPorts() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServerPort(8080);
        request.addHeader("Forwarded", "proto=https;host=\"[2001:db8::1]:8443\"");

        OtlpIngestionGuideDto guide = otlpIngestionWorkspaceService.getGuide(request);

        assertEquals("[2001:db8::1]:4317", guide.getGrpcAuthorityExample());
        assertTrue(guide.getSignals().stream().anyMatch(signal -> "metrics".equals(signal.getSignal())
                && "http".equals(signal.getProtocol())
                && "https://[2001:db8::1]:8443/api/otlp/v1/metrics".equals(signal.getEndpoint())));
        assertTrue(guide.getSignals().stream().filter(signal -> "grpc".equals(signal.getProtocol()))
                .allMatch(signal -> "[2001:db8::1]:4317".equals(signal.getEndpoint())));
        assertTrue(guide.getSnippets().stream().anyMatch(snippet -> "collector-http".equals(snippet.getKey())
                && snippet.getContent().contains("endpoint: https://[2001:db8::1]:8443/api/otlp")));
        assertTrue(guide.getSnippets().stream().anyMatch(snippet -> "collector-grpc".equals(snippet.getKey())
                && snippet.getContent().contains("endpoint: [2001:db8::1]:4317")));
    }

    @Test
    void guideBracketsBareIpv6ForwardedHostBeforeAppendingPorts() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServerPort(8080);
        request.addHeader("X-Forwarded-Proto", "https");
        request.addHeader("X-Forwarded-Host", "2001:db8::2");
        request.addHeader("X-Forwarded-Port", "8443");

        OtlpIngestionGuideDto guide = otlpIngestionWorkspaceService.getGuide(request);

        assertEquals("[2001:db8::2]:4317", guide.getGrpcAuthorityExample());
        assertTrue(guide.getSignals().stream().anyMatch(signal -> "logs".equals(signal.getSignal())
                && "http".equals(signal.getProtocol())
                && "https://[2001:db8::2]:8443/api/otlp/v1/logs".equals(signal.getEndpoint())));
        assertTrue(guide.getSignals().stream().filter(signal -> "grpc".equals(signal.getProtocol()))
                .allMatch(signal -> "[2001:db8::2]:4317".equals(signal.getEndpoint())));
        assertTrue(guide.getSnippets().stream().anyMatch(snippet -> "collector-http".equals(snippet.getKey())
                && snippet.getContent().contains("endpoint: https://[2001:db8::2]:8443/api/otlp")));
        assertTrue(guide.getSnippets().stream().anyMatch(snippet -> "collector-grpc".equals(snippet.getKey())
                && snippet.getContent().contains("endpoint: [2001:db8::2]:4317")));
    }

    @Test
    void bindingSummaryCombinesRecentSamplesAndBoundEntities() {
        LogEntry logEntry = LogEntry.builder()
                .resource(Map.of("service.name", "checkout", "service.namespace", "commerce"))
                .build();
        TraceListItemDto traceItem = new TraceListItemDto();
        traceItem.setTraceId("trace-1");
        traceItem.setServiceName("checkout");
        traceItem.setResourceAttributes(Map.of("service.name", "checkout", "deployment.environment.name", "prod"));
        EntityIdentity identity = EntityIdentity.builder()
                .id(10L)
                .entityId(1L)
                .identityKey("service.name")
                .identityValue("checkout")
                .normalizedValue("checkout")
                .priority(90)
                .primaryIdentity(true)
                .build();
        ObserveEntity entity = ObserveEntity.builder()
                .id(1L)
                .type("service")
                .name("checkout")
                .displayName("Checkout Service")
                .namespace("commerce")
                .build();

        stubRecentLogs(logEntry);
        when(entityTraceQueryService.queryTraceList(org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.eq(false),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq(0), org.mockito.ArgumentMatchers.eq(20)))
                .thenReturn(new PageImpl<>(List.of(traceItem), PageRequest.of(0, 20), 1));
        when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(
                org.mockito.ArgumentMatchers.anySet(), org.mockito.ArgumentMatchers.anySet()))
                .thenReturn(List.of(identity));
        when(workspaceQueryGateway.findEntitiesByIds(org.mockito.ArgumentMatchers.anySet())).thenReturn(Map.of(1L, entity));
        when(workspaceQueryGateway.countMonitorBindsByEntityId(1L)).thenReturn(2L);

        OtlpEntityBindingSummaryDto summary = otlpIngestionWorkspaceService.getBindingSummary();

        assertTrue(summary.getCanonicalIdentityKeys().contains("service.name"));
        assertEquals(List.of("checkout"), summary.getRecentServices());
        assertFalse(summary.getRecentIdentitySamples().isEmpty());
        assertEquals(1, summary.getRecentBoundEntities().size());
        assertEquals("checkout", summary.getRecentBoundEntities().getFirst().getPrimaryIdentityValue());
    }

    @Test
    void bindingSummarySurfacesUnboundOtlpServiceAsEntityCandidate() {
        long now = System.currentTimeMillis();
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(now * 1_000_000L)
                .resource(Map.of(
                        "service.name", "checkout",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ))
                .build();
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                now,
                "checkout_request_latency",
                "gauge",
                "ms",
                42.5,
                Map.of("route", "/checkout")
        );

        stubRecentLogs(logEntry);
        when(entityTraceQueryService.queryTraceList(org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.eq(false),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq(0), org.mockito.ArgumentMatchers.eq(20)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));
        when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(
                org.mockito.ArgumentMatchers.anySet(), org.mockito.ArgumentMatchers.anySet()))
                .thenReturn(List.of());
        when(workspaceQueryGateway.findEntitiesByIds(org.mockito.ArgumentMatchers.anySet())).thenReturn(Map.of());

        OtlpEntityBindingSummaryDto summary = otlpIngestionWorkspaceService.getBindingSummary();

        assertTrue(summary.getRecentBoundEntities().isEmpty());
        assertEquals(1, summary.getRecentUnboundCandidates().size());
        OtlpEntityBindingSummaryDto.UnboundEntityCandidate candidate =
                summary.getRecentUnboundCandidates().getFirst();
        assertEquals("checkout", candidate.getSuggestedName());
        assertEquals("service", candidate.getSuggestedType());
        assertEquals("commerce", candidate.getNamespace());
        assertEquals("prod", candidate.getEnvironment());
        assertEquals("service.name", candidate.getPrimaryIdentityKey());
        assertEquals("checkout", candidate.getPrimaryIdentityValue());
        assertEquals(List.of("logs", "metrics"), candidate.getSignals());
        assertEquals("checkout", candidate.getCanonicalIdentities().get("service.name"));
        assertEquals("commerce", candidate.getCanonicalIdentities().get("service.namespace"));
    }

    @Test
    void overviewMarksMetricsActiveWhenRecentOtlpMetricWasRecorded() {
        long now = System.currentTimeMillis();
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of("service.name", "checkout", "service.namespace", "commerce"),
                now,
                "checkout_request_latency",
                "gauge",
                "ms",
                42.5,
                Map.of("instance", "e2e")
        );
        stubRecentLogs();
        when(entityTraceQueryService.queryTraceList(org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.eq(false),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq(0), org.mockito.ArgumentMatchers.eq(20)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));
        when(workspaceQueryGateway.countMonitors()).thenReturn(0L);
        when(workspaceQueryGateway.findLatestMonitor()).thenReturn(java.util.Optional.empty());
        when(workspaceQueryGateway.countDistinctBoundEntityIdsByIdentityKeys(org.mockito.ArgumentMatchers.anySet())).thenReturn(1L);

        OtlpIngestionOverviewDto overview = otlpIngestionWorkspaceService.getOverview();

        assertTrue(overview.getMetrics().isActive());
        assertEquals(1, overview.getActiveSignalCount());
        assertEquals("OTLP", overview.getMetrics().getIntakeMode());
        assertEquals(1, overview.getRecentServiceCount());
        assertEquals("metrics", overview.getRecentEvents().getFirst().getSignal());
    }

    @Test
    void overviewDoesNotMarkMetricsActiveForStaleMonitorOnly() {
        Monitor staleMonitor = Monitor.builder()
                .id(1L)
                .name("stale-checkout")
                .app("api")
                .instance("checkout:8080")
                .gmtUpdate(LocalDateTime.now().minusDays(3))
                .build();
        stubRecentLogs();
        when(entityTraceQueryService.queryTraceList(org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.eq(false),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq(0), org.mockito.ArgumentMatchers.eq(20)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));
        when(workspaceQueryGateway.countMonitors()).thenReturn(1L);
        when(workspaceQueryGateway.findLatestMonitor()).thenReturn(java.util.Optional.of(staleMonitor));
        when(workspaceQueryGateway.countDistinctBoundEntityIdsByIdentityKeys(org.mockito.ArgumentMatchers.anySet())).thenReturn(0L);

        OtlpIngestionOverviewDto overview = otlpIngestionWorkspaceService.getOverview();

        assertFalse(overview.getMetrics().isActive());
        assertEquals(0, overview.getActiveSignalCount());
    }

    @Test
    void overviewIgnoresSelfTelemetrySignals() {
        LogEntry selfLog = LogEntry.builder()
                .timeUnixNano(1_710_000_000_000_000_000L)
                .severityText("INFO")
                .body("internal request")
                .traceId("self-trace")
                .resource(Map.of("service.name", "hertzbeat", "service.namespace", "platform"))
                .build();
        TraceListItemDto selfTrace = new TraceListItemDto();
        selfTrace.setTraceId("self-trace");
        selfTrace.setServiceName("hertzbeat");
        selfTrace.setStartTime(1_710_000_000_000L);
        selfTrace.setResourceAttributes(Map.of("service.name", "hertzbeat"));

        stubRecentLogs(selfLog);
        when(entityTraceQueryService.queryTraceList(org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.eq(false),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq(0), org.mockito.ArgumentMatchers.eq(20)))
                .thenReturn(new PageImpl<>(List.of(selfTrace), PageRequest.of(0, 20), 1));
        when(workspaceQueryGateway.countMonitors()).thenReturn(0L);
        when(workspaceQueryGateway.findLatestMonitor()).thenReturn(java.util.Optional.empty());
        when(workspaceQueryGateway.countDistinctBoundEntityIdsByIdentityKeys(org.mockito.ArgumentMatchers.anySet())).thenReturn(0L);

        OtlpIngestionOverviewDto overview = otlpIngestionWorkspaceService.getOverview();

        assertFalse(overview.getLogs().isActive());
        assertFalse(overview.getTraces().isActive());
        assertFalse(overview.getMetrics().isActive());
        assertEquals(0, overview.getActiveSignalCount());
        assertEquals(0, overview.getRecentServiceCount());
        assertTrue(overview.getRecentEvents().isEmpty());
    }

    @Test
    void bindingSummaryIgnoresCollectorNoiseWhenCollectingRecentServices() {
        LogEntry collectorLog = LogEntry.builder()
                .resource(Map.of("service.name", "otelcol-contrib", "service.namespace", "observability"))
                .build();
        LogEntry businessLog = LogEntry.builder()
                .resource(Map.of("service.name", "checkout", "service.namespace", "opentelemetry-demo"))
                .build();

        stubRecentLogs(collectorLog, businessLog);
        when(entityTraceQueryService.queryTraceList(org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.eq(false),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq(0), org.mockito.ArgumentMatchers.eq(20)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));
        when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(
                org.mockito.ArgumentMatchers.anySet(), org.mockito.ArgumentMatchers.anySet()))
                .thenReturn(List.of());
        when(workspaceQueryGateway.findEntitiesByIds(org.mockito.ArgumentMatchers.anySet())).thenReturn(Map.of());

        OtlpEntityBindingSummaryDto summary = otlpIngestionWorkspaceService.getBindingSummary();

        assertEquals(List.of("checkout"), summary.getRecentServices());
    }

    @Test
    void bindingSummaryRecognizesSeededServiceWhenEntityIdentitiesExist() {
        LogEntry seededLog = LogEntry.builder()
                .timeUnixNano(1_710_000_000_000_000_000L)
                .traceId("trace-linked-demo")
                .spanId("1111222233334444")
                .resource(Map.of(
                        "service.name", "checkout",
                        "service.namespace", "hertzbeat-demo",
                        "deployment.environment.name", "demo"))
                .build();
        TraceListItemDto seededTrace = new TraceListItemDto();
        seededTrace.setTraceId("trace-linked-demo");
        seededTrace.setServiceName("checkout");
        seededTrace.setStartTime(1_710_000_000_000L);
        seededTrace.setResourceAttributes(Map.of(
                "service.name", "checkout",
                "service.namespace", "hertzbeat-demo",
                "deployment.environment.name", "demo"));
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "hertzbeat-demo",
                        "deployment.environment.name", "demo"),
                1_710_000_000_000L,
                "hertzbeat_demo_checkout_latency_ms_milliseconds",
                "gauge",
                "ms",
                103.0,
                Map.of());
        EntityIdentity serviceName = EntityIdentity.builder()
                .id(1L)
                .entityId(4200L)
                .identityType("otel_resource")
                .identityKey("service.name")
                .identityValue("checkout")
                .normalizedValue("checkout")
                .primaryIdentity(true)
                .priority(90)
                .build();
        EntityIdentity serviceNamespace = EntityIdentity.builder()
                .id(2L)
                .entityId(4200L)
                .identityType("otel_resource")
                .identityKey("service.namespace")
                .identityValue("hertzbeat-demo")
                .normalizedValue("hertzbeat-demo")
                .priority(30)
                .build();
        EntityIdentity environment = EntityIdentity.builder()
                .id(3L)
                .entityId(4200L)
                .identityType("otel_resource")
                .identityKey("deployment.environment.name")
                .identityValue("demo")
                .normalizedValue("demo")
                .priority(20)
                .build();
        ObserveEntity entity = ObserveEntity.builder()
                .id(4200L)
                .type("service")
                .name("checkout")
                .displayName("Checkout API")
                .namespace("hertzbeat-demo")
                .environment("demo")
                .build();

        stubRecentLogs(seededLog);
        when(entityTraceQueryService.queryTraceList(org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.eq(false),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq(0), org.mockito.ArgumentMatchers.eq(20)))
                .thenReturn(new PageImpl<>(List.of(seededTrace), PageRequest.of(0, 20), 1));
        when(workspaceQueryGateway.findLatestMonitor()).thenReturn(java.util.Optional.empty());
        when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(
                argThat(keys -> keys.contains("service.name")
                        && keys.contains("service.namespace")
                        && keys.contains("deployment.environment.name")),
                argThat(values -> values.contains("checkout")
                        && values.contains("hertzbeat-demo")
                        && values.contains("demo"))))
                .thenReturn(List.of(serviceName, serviceNamespace, environment));
        when(workspaceQueryGateway.findEntitiesByIds(Set.of(4200L))).thenReturn(Map.of(4200L, entity));
        when(workspaceQueryGateway.countMonitorBindsByEntityId(4200L)).thenReturn(0L);

        OtlpEntityBindingSummaryDto summary = otlpIngestionWorkspaceService.getBindingSummary();

        assertEquals(List.of("checkout"), summary.getRecentServices());
        assertEquals(1, summary.getRecentBoundEntities().size());
        OtlpEntityBindingSummaryDto.BoundEntity boundEntity = summary.getRecentBoundEntities().getFirst();
        assertEquals(4200L, boundEntity.getEntityId());
        assertEquals("service", boundEntity.getType());
        assertEquals("checkout", boundEntity.getName());
        assertEquals("Checkout API", boundEntity.getDisplayName());
        assertEquals("hertzbeat-demo", boundEntity.getNamespace());
        assertEquals("service.name", boundEntity.getPrimaryIdentityKey());
        assertEquals("checkout", boundEntity.getPrimaryIdentityValue());
        assertTrue(summary.getRecentUnboundCandidates().isEmpty());
    }

    @Test
    void metricsConsoleBuildsDefaultPromqlFromResolvedServiceContext() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                2_000L,
                "http_server_request_duration_count",
                "sum",
                "1",
                14.0,
                Map.of()
        );
        EntityIdentity serviceName = EntityIdentity.builder()
                .entityId(42L)
                .identityKey("service.name")
                .identityValue("checkout")
                .build();
        EntityIdentity serviceNamespace = EntityIdentity.builder()
                .entityId(42L)
                .identityKey("service.namespace")
                .identityValue("commerce")
                .build();
        ObserveEntity entity = ObserveEntity.builder()
                .id(42L)
                .name("checkout-api")
                .displayName("Checkout API")
                .build();

        when(workspaceQueryGateway.findEntityById(42L)).thenReturn(java.util.Optional.of(entity));
        when(workspaceQueryGateway.findIdentitiesByEntityId(42L)).thenReturn(List.of(serviceName, serviceNamespace));
        String checkoutQuery = groupedMetricPromql("__name__=\"http_server_request_duration_count\", "
                + "service_name=\"checkout\", service_namespace=\"commerce\", deployment_environment_name=\"prod\", "
                + "hertzbeat_entity_id=\"42\"");
        stubPromqlQuery(checkoutQuery,
                new DatasourceQueryData(
                        "otlp-metrics-console",
                        200,
                        null,
                        List.of(
                                new DatasourceQueryData.SchemaData(
                                        new DatasourceQueryData.MetricSchema(
                                                List.of(
                                                        new DatasourceQueryData.MetricField("__ts__", "time", null),
                                                        new DatasourceQueryData.MetricField("__value__", "number", null)
                                                ),
                                                Map.of("__name__", "http_server_requests_seconds_count"),
                                                Map.of()
                                        ),
                                        List.of(new Object[] {1000L, 12.0}, new Object[] {2000L, 14.0})
                                )
                        )
                ));

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                42L,
                1000L,
                2000L,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        assertEquals("checkout", console.getContext().getServiceName());
        assertEquals("commerce", console.getContext().getServiceNamespace());
        assertEquals("Greptime-promql", console.getDatasource());
        assertEquals("promql", console.getQueryMode());
        assertEquals(checkoutQuery, console.getQuery());
        assertEquals(1, console.getStats().getTotalSeries());
        assertEquals(2000L, console.getStats().getLatestObservedAt());
        assertNotNull(console.getResults());
        verify(metricQueryRepository).queryPromqlRange(
                eq("otlp-metrics-console"),
                argThat(expr -> console.getQuery().equals(expr)),
                anyLong(),
                anyLong(),
                anyString()
        );
    }

    @Test
    void metricsConsoleAddsSafeLabelMatchersFromFilterToGeneratedPromql() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                2_000L,
                "http_server_request_duration_count",
                "sum",
                "1",
                14.0,
                Map.of("span.kind", "server", "http.route", "/checkout/{id}")
        );
        String expectedQuery = groupedMetricPromql("__name__=\"http_server_request_duration_count\", "
                + "service_name=\"checkout\", service_namespace=\"commerce\", deployment_environment_name=\"prod\", "
                + "span_kind=\"server\", http_route=~\"/checkout.*\"");
        DatasourceQueryData emptyQueryData = new DatasourceQueryData("otlp-metrics-console", 200, null, List.of());
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenAnswer(invocation -> promqlSuccess(emptyQueryData));

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                null,
                "span.kind=\"server\" and http.route=~\"/checkout.*\"",
                null,
                null
        );

        assertEquals(expectedQuery, console.getQuery());
        verify(metricQueryRepository).queryPromqlRange(
                eq("otlp-metrics-console"),
                eq(expectedQuery),
                anyLong(),
                anyLong(),
                anyString()
        );
    }

    @Test
    void metricsConsoleUsesOperationNameWithHttpRouteFallback() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                2_000L,
                "http_server_request_duration_count",
                "sum",
                "1",
                14.0,
                Map.of("http.route", "POST /checkout")
        );
        String operationNameQuery = groupedMetricPromql("__name__=\"http_server_request_duration_count\", "
                + "service_name=\"checkout\", service_namespace=\"commerce\", deployment_environment_name=\"prod\", "
                + "operation_name=\"POST /checkout\"");
        String httpRouteQuery = groupedMetricPromql("__name__=\"http_server_request_duration_count\", "
                + "service_name=\"checkout\", service_namespace=\"commerce\", deployment_environment_name=\"prod\", "
                + "http_route=\"POST /checkout\"");
        DatasourceQueryData emptyQueryData = new DatasourceQueryData("otlp-metrics-console", 200, null, List.of());
        DatasourceQueryData httpRouteData = new DatasourceQueryData(
                "otlp-metrics-console",
                200,
                null,
                List.of(new DatasourceQueryData.SchemaData(
                        new DatasourceQueryData.MetricSchema(
                                List.of(
                                        new DatasourceQueryData.MetricField("__ts__", "time", null),
                                        new DatasourceQueryData.MetricField("__value__", "number", null)
                                ),
                                Map.of("__name__", "http_server_request_duration_count"),
                                Map.of()
                        ),
                        Collections.singletonList(new Object[] {2_000L, 14.0})
                ))
        );
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenAnswer(invocation -> {
            String query = invocation.getArgument(1);
            return promqlSuccess(httpRouteQuery.equals(query) ? httpRouteData : emptyQueryData);
        });

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                null,
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                "http_server_request_duration_count",
                null,
                null,
                null,
                null,
                null,
                null,
                "POST /checkout"
        );

        assertEquals(httpRouteQuery, console.getQuery());
        assertEquals("POST /checkout", console.getContext().getOperationName());
        assertEquals(1, console.getStats().getNonEmptySeries());
        verify(metricQueryRepository).queryPromqlRange(
                eq("otlp-metrics-console"),
                eq(operationNameQuery),
                anyLong(),
                anyLong(),
                anyString()
        );
        verify(metricQueryRepository).queryPromqlRange(
                eq("otlp-metrics-console"),
                eq(httpRouteQuery),
                anyLong(),
                anyLong(),
                anyString()
        );
    }

    @Test
    void metricsConsoleTranslatesFriendlyLabelOperatorsToPromqlMatchers() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                2_000L,
                "http_server_request_duration_count",
                "sum",
                "1",
                14.0,
                Map.of("span.kind", "server", "http.route", "/checkout/{id}")
        );
        String expectedQuery = groupedMetricPromql("__name__=\"http_server_request_duration_count\", "
                + "service_name=\"checkout\", service_namespace=\"commerce\", deployment_environment_name=\"prod\", "
                + "span_kind=~\"^(?:server|consumer)$\", http_route=~\".*checkout.*\", "
                + "host_name!~\".*canary.*\", cloud_region!~\"^(?:us-west-1|us-west-2)$\", "
                + "k8s_pod_name=~\".+\", service_instance_id!~\".+\"");
        DatasourceQueryData emptyQueryData = new DatasourceQueryData("otlp-metrics-console", 200, null, List.of());
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenAnswer(invocation -> promqlSuccess(emptyQueryData));

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                null,
                "span.kind IN ('server', \"consumer\") and http.route CONTAINS checkout "
                        + "and host.name NOT CONTAINS canary and cloud.region NOT IN ('us-west-1', 'us-west-2') "
                        + "and k8s.pod.name EXISTS and service.instance.id NOT EXISTS",
                null,
                null
        );

        assertEquals(expectedQuery, console.getQuery());
        verify(metricQueryRepository).queryPromqlRange(
                eq("otlp-metrics-console"),
                eq(expectedQuery),
                anyLong(),
                anyLong(),
                anyString()
        );
    }

    @Test
    void metricsConsoleAppliesRequestedEntityIdentityAsPromqlResourceMatcher() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod",
                        "hertzbeat.entity_id", "42",
                        "hertzbeat.entity_type", "service"
                ),
                2_000L,
                "http_server_request_duration_count",
                "sum",
                "1",
                14.0,
                Map.of()
        );
        String expectedQuery = groupedMetricPromql("__name__=\"http_server_request_duration_count\", "
                + "service_name=\"checkout\", service_namespace=\"commerce\", deployment_environment_name=\"prod\", "
                + "hertzbeat_entity_id=\"42\", hertzbeat_entity_type=\"service\"");
        DatasourceQueryData emptyQueryData = new DatasourceQueryData("otlp-metrics-console", 200, null, List.of());
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenAnswer(invocation -> promqlSuccess(emptyQueryData));
        when(workspaceQueryGateway.findEntityById(42L)).thenReturn(java.util.Optional.empty());
        when(workspaceQueryGateway.findIdentitiesByEntityId(42L)).thenReturn(List.of());

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                42L,
                "service",
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                null,
                "hertzbeat.entity_id=\"99\" and hertzbeat.entity_type=\"host\"",
                null,
                null,
                null,
                null,
                null
        );

        assertEquals(42L, console.getContext().getEntityId());
        assertEquals("service", console.getContext().getEntityType());
        assertEquals(expectedQuery, console.getQuery());
        verify(metricQueryRepository).queryPromqlRange(
                eq("otlp-metrics-console"),
                eq(expectedQuery),
                anyLong(),
                anyLong(),
                anyString()
        );
    }

    @Test
    void metricsConsolePrefersEntityIdentitiesOverConflictingRouteContext() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                2_000L,
                "http_server_request_duration_count",
                "sum",
                "1",
                14.0,
                Map.of()
        );
        EntityIdentity serviceName = EntityIdentity.builder()
                .entityId(42L)
                .identityKey("service.name")
                .identityValue("checkout")
                .build();
        EntityIdentity serviceNamespace = EntityIdentity.builder()
                .entityId(42L)
                .identityKey("service.namespace")
                .identityValue("commerce")
                .build();
        EntityIdentity environment = EntityIdentity.builder()
                .entityId(42L)
                .identityKey("deployment.environment.name")
                .identityValue("prod")
                .build();
        when(workspaceQueryGateway.findEntityById(42L)).thenReturn(java.util.Optional.empty());
        when(workspaceQueryGateway.findIdentitiesByEntityId(42L)).thenReturn(List.of(serviceName, serviceNamespace, environment));
        String checkoutQuery = groupedMetricPromql("__name__=\"http_server_request_duration_count\", "
                + "service_name=\"checkout\", service_namespace=\"commerce\", deployment_environment_name=\"prod\", "
                + "hertzbeat_entity_id=\"42\"");
        stubPromqlQuery(checkoutQuery,
                new DatasourceQueryData(
                        "otlp-metrics-console",
                        200,
                        null,
                        List.of(
                                new DatasourceQueryData.SchemaData(
                                        new DatasourceQueryData.MetricSchema(
                                                List.of(
                                                        new DatasourceQueryData.MetricField("__ts__", "time", null),
                                                        new DatasourceQueryData.MetricField("__value__", "number", null)
                                                ),
                                                Map.of("__name__", "http_server_requests_seconds_count"),
                                                Map.of()
                                        ),
                                        List.of(new Object[] {1000L, 12.0}, new Object[] {2000L, 14.0})
                                )
                        )
                ));

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                42L,
                1_000L,
                2_000L,
                "billing",
                "wrong-namespace",
                "staging",
                null,
                null,
                null,
                null
        );

        assertEquals("checkout", console.getContext().getServiceName());
        assertEquals("commerce", console.getContext().getServiceNamespace());
        assertEquals("prod", console.getContext().getEnvironment());
        assertEquals(checkoutQuery, console.getQuery());
        verify(metricQueryRepository).queryPromqlRange(
                eq("otlp-metrics-console"),
                eq(checkoutQuery),
                anyLong(),
                anyLong(),
                anyString()
        );
    }

    @Test
    void relatedMetricsReturnsServiceAndResourceScopedCandidatesWithoutQueryingPromql() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                2_000L,
                "http.server.duration",
                "histogram",
                "ms",
                14.0,
                Map.of()
        );
        when(workspaceQueryGateway.findEntityById(42L)).thenReturn(java.util.Optional.empty());
        when(workspaceQueryGateway.findIdentitiesByEntityId(42L)).thenReturn(List.of());

        OtlpRelatedMetricsDto related = otlpIngestionWorkspaceService.getRelatedMetrics(
                42L,
                "service",
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                "k8s.pod.name=\"checkout-7d9\" and host.name=\"node-a\"",
                null,
                "8"
        );

        assertEquals("backend-related-metrics", related.getSource());
        assertEquals(42L, related.getContext().getEntityId());
        assertEquals("service", related.getContext().getEntityType());
        assertEquals("checkout", related.getContext().getServiceName());
        assertEquals("k8s_pod_name", related.getResourceMatchers().getFirst().getLabel());
        assertTrue(related.getCandidates().stream().anyMatch(candidate ->
                "http_server_duration".equals(candidate.getQuery())
                        && "service".equals(candidate.getSource())
                        && "latency".equals(candidate.getFamily())
                        && "service".equals(candidate.getResourceMatch().get("hertzbeat_entity_type"))));
        assertTrue(related.getCandidates().stream().anyMatch(candidate ->
                "container.cpu.usage".equals(candidate.getQuery())
                        && "pod".equals(candidate.getSource())
                        && candidate.getMatchedLabels().contains("k8s_pod_name")));
        assertTrue(related.getCandidates().stream().anyMatch(candidate ->
                "system.memory.usage".equals(candidate.getQuery())
                        && "host".equals(candidate.getSource())
                        && "node-a".equals(candidate.getResourceMatch().get("host_name"))));
        assertEquals(related.getCandidates().size(), related.getCandidateCount());
    }

    @Test
    void relatedMetricsParsesFriendlyResourceFilterOperators() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                2_000L,
                "http.server.duration",
                "histogram",
                "ms",
                14.0,
                Map.of()
        );
        when(workspaceQueryGateway.findEntityById(42L)).thenReturn(java.util.Optional.empty());
        when(workspaceQueryGateway.findIdentitiesByEntityId(42L)).thenReturn(List.of());

        OtlpRelatedMetricsDto related = otlpIngestionWorkspaceService.getRelatedMetrics(
                42L,
                "service",
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                "k8s.pod.name IN ('checkout-7d9', \"checkout-8f1\") and host.name CONTAINS node "
                        + "and cloud.region NOT IN ('us-west-1', 'us-west-2') and service.instance.id EXISTS",
                null,
                "8"
        );

        assertEquals("k8s_pod_name", related.getResourceMatchers().get(0).getLabel());
        assertEquals("=~", related.getResourceMatchers().get(0).getOperator());
        assertEquals("^(?:checkout-7d9|checkout-8f1)$", related.getResourceMatchers().get(0).getValue());
        assertTrue(related.getResourceMatchers().stream().anyMatch(matcher ->
                "host_name".equals(matcher.getLabel())
                        && "=~".equals(matcher.getOperator())
                        && ".*node.*".equals(matcher.getValue())));
        assertTrue(related.getResourceMatchers().stream().anyMatch(matcher ->
                "cloud_region".equals(matcher.getLabel())
                        && "!~".equals(matcher.getOperator())
                        && "^(?:us-west-1|us-west-2)$".equals(matcher.getValue())));
        assertTrue(related.getResourceMatchers().stream().anyMatch(matcher ->
                "service_instance_id".equals(matcher.getLabel())
                        && "=~".equals(matcher.getOperator())
                        && ".+".equals(matcher.getValue())));
        assertTrue(related.getCandidates().stream().anyMatch(candidate ->
                "container.cpu.usage".equals(candidate.getQuery())
                        && candidate.getMatchedLabels().contains("k8s_pod_name")));
        assertTrue(related.getCandidates().stream().anyMatch(candidate ->
                "system.cpu.utilization".equals(candidate.getQuery())
                        && candidate.getMatchedLabels().contains("host_name")));
    }

    @Test
    void relatedMetricsReturnsOperationScopedServiceCandidates() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                2_000L,
                "http.server.duration",
                "histogram",
                "ms",
                14.0,
                Map.of()
        );
        when(workspaceQueryGateway.findEntityById(42L)).thenReturn(java.util.Optional.empty());
        when(workspaceQueryGateway.findIdentitiesByEntityId(42L)).thenReturn(List.of());

        OtlpRelatedMetricsDto related = otlpIngestionWorkspaceService.getRelatedMetrics(
                42L,
                "service",
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                "k8s.pod.name=\"checkout-7d9\"",
                "POST /checkout",
                "8"
        );

        assertEquals("POST /checkout", related.getOperationName());
        assertEquals("POST /checkout", related.getContext().getOperationName());
        assertTrue(related.getCandidates().stream().anyMatch(candidate ->
                "http_server_duration".equals(candidate.getQuery())
                        && "operation".equals(candidate.getSource())
                        && "latency".equals(candidate.getFamily())
                        && "operation-context".equals(candidate.getReason())
                        && candidate.getMatchedLabels().contains("operation_name")
                        && "POST /checkout".equals(candidate.getResourceMatch().get("operation_name"))
                        && "POST /checkout".equals(candidate.getResourceMatch().get("http_route"))));
    }

    @Test
    void relatedMetricsReportsActualOperationAvailabilityMatcher() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                2_000L,
                "http.server.duration",
                "histogram",
                "ms",
                14.0,
                Map.of()
        );
        when(workspaceQueryGateway.findEntityById(42L)).thenReturn(java.util.Optional.empty());
        when(workspaceQueryGateway.findIdentitiesByEntityId(42L)).thenReturn(List.of());
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                anyString(),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenAnswer(invocation -> {
            String refId = invocation.getArgument(0);
            String query = invocation.getArgument(1);
            if ("otlp-related-metrics-inventory".equals(refId)) {
                return promqlSuccess(new DatasourceQueryData("otlp-related-metrics-inventory", 200, null, List.of()));
            }
            if (query.contains("__name__=\"http_server_duration\"")
                    && query.contains("http_route=\"POST /checkout\"")
                    && !query.contains("operation_name=\"POST /checkout\"")) {
                return promqlSuccess(new DatasourceQueryData(
                        "otlp-related-metrics",
                        200,
                        null,
                        List.of(new DatasourceQueryData.SchemaData(
                                new DatasourceQueryData.MetricSchema(
                                        List.of(
                                                new DatasourceQueryData.MetricField("__ts__", "time", null),
                                                new DatasourceQueryData.MetricField("__value__", "number", null)
                                        ),
                                        Map.of("__name__", "http_server_duration"),
                                        Map.of()
                                ),
                                Collections.singletonList(new Object[] {2_000L, 14.0})
                        ))
                ));
            }
            return promqlSuccess(new DatasourceQueryData("otlp-related-metrics", 200, null, List.of()));
        });

        OtlpRelatedMetricsDto related = otlpIngestionWorkspaceService.getRelatedMetrics(
                42L,
                "service",
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                null,
                "POST /checkout",
                "8"
        );

        assertFalse(related.getCandidates().isEmpty());
        OtlpRelatedMetricsDto.Candidate candidate = related.getCandidates().getFirst();
        assertEquals("http_server_duration", candidate.getQuery());
        assertEquals("promql-series", candidate.getReason());
        assertTrue(candidate.getMatchedLabels().contains("http_route"));
        assertFalse(candidate.getMatchedLabels().contains("operation_name"));
        assertEquals("POST /checkout", candidate.getResourceMatch().get("http_route"));
        assertFalse(candidate.getResourceMatch().containsKey("operation_name"));
    }

    @Test
    void relatedMetricsPrefersPromqlAvailableCandidatesWhenExecutorExists() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                2_000L,
                "http.server.duration",
                "histogram",
                "ms",
                14.0,
                Map.of()
        );
        when(workspaceQueryGateway.findEntityById(42L)).thenReturn(java.util.Optional.empty());
        when(workspaceQueryGateway.findIdentitiesByEntityId(42L)).thenReturn(List.of());
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                anyString(),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenAnswer(invocation -> {
            String query = invocation.getArgument(1);
            if (query.contains("__name__=\"http_server_duration\"")) {
                return promqlSuccess(new DatasourceQueryData(
                        "otlp-related-metrics",
                        200,
                        null,
                        List.of(new DatasourceQueryData.SchemaData(
                                new DatasourceQueryData.MetricSchema(
                                        List.of(
                                                new DatasourceQueryData.MetricField("__ts__", "time", null),
                                                new DatasourceQueryData.MetricField("__value__", "number", null)
                                        ),
                                        Map.of("__name__", "http_server_duration"),
                                        Map.of()
                                ),
                                Collections.singletonList(new Object[] {2_000L, 14.0})
                        ))
                ));
            }
            return promqlSuccess(new DatasourceQueryData("otlp-related-metrics", 200, null, List.of()));
        });

        OtlpRelatedMetricsDto related = otlpIngestionWorkspaceService.getRelatedMetrics(
                42L,
                "service",
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                "k8s.pod.name=\"checkout-7d9\" and host.name=\"node-a\"",
                null,
                "8"
        );

        assertFalse(related.getCandidates().isEmpty());
        assertEquals("http_server_duration", related.getCandidates().getFirst().getQuery());
        assertEquals("promql-series", related.getCandidates().getFirst().getReason());
        verify(metricQueryRepository).queryPromqlRange(
                eq("otlp-related-metrics"),
                argThat(query -> query.contains("__name__=\"http_server_duration\"")
                        && query.contains("service_name=\"checkout\"")
                        && query.contains("service_namespace=\"commerce\"")),
                eq(1_000L),
                eq(2_000L),
                anyString()
        );
    }

    @Test
    void relatedMetricsDiscoversCandidateNamesFromPromqlSeriesInventory() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                2_000L,
                "stale.intake.metric",
                "gauge",
                "1",
                1.0,
                Map.of()
        );
        when(workspaceQueryGateway.findEntityById(42L)).thenReturn(java.util.Optional.empty());
        when(workspaceQueryGateway.findIdentitiesByEntityId(42L)).thenReturn(List.of());
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                anyString(),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenAnswer(invocation -> {
            String refId = invocation.getArgument(0);
            String query = invocation.getArgument(1);
            if ("otlp-related-metrics-inventory".equals(refId)) {
                return promqlSuccess(new DatasourceQueryData(
                        "otlp-related-metrics-inventory",
                        200,
                        null,
                        List.of(new DatasourceQueryData.SchemaData(
                                new DatasourceQueryData.MetricSchema(
                                        List.of(new DatasourceQueryData.MetricField("__value__", "number", null)),
                                        Map.of("__name__", "rpc_server_duration_milliseconds"),
                                        Map.of()
                                ),
                                Collections.singletonList(new Object[] {7.0})
                        ))
                ));
            }
            if (query.contains("__name__=\"rpc_server_duration_milliseconds\"")) {
                return promqlSuccess(new DatasourceQueryData(
                        "otlp-related-metrics",
                        200,
                        null,
                        List.of(new DatasourceQueryData.SchemaData(
                                new DatasourceQueryData.MetricSchema(
                                        List.of(
                                                new DatasourceQueryData.MetricField("__ts__", "time", null),
                                                new DatasourceQueryData.MetricField("__value__", "number", null)
                                        ),
                                        Map.of("__name__", "rpc_server_duration_milliseconds"),
                                        Map.of()
                                ),
                                Collections.singletonList(new Object[] {2_000L, 7.0})
                        ))
                ));
            }
            return promqlSuccess(new DatasourceQueryData("otlp-related-metrics", 200, null, List.of()));
        });

        OtlpRelatedMetricsDto related = otlpIngestionWorkspaceService.getRelatedMetrics(
                42L,
                "service",
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                null,
                null,
                "8"
        );

        assertFalse(related.getCandidates().isEmpty());
        assertEquals("rpc_server_duration_milliseconds", related.getCandidates().getFirst().getQuery());
        assertEquals("promql-series", related.getCandidates().getFirst().getReason());
        verify(metricQueryRepository).queryPromqlRange(
                eq("otlp-related-metrics-inventory"),
                argThat(query -> query.contains("sum by (__name__)")
                        && query.contains("service_name=\"checkout\"")
                        && query.contains("service_namespace=\"commerce\"")),
                eq(1_000L),
                eq(2_000L),
                anyString()
        );
    }

    @Test
    void metricsInventoryReturnsPromqlSeriesBackedItems() {
        when(workspaceQueryGateway.findEntityById(42L)).thenReturn(java.util.Optional.empty());
        when(workspaceQueryGateway.findIdentitiesByEntityId(42L)).thenReturn(List.of());
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-related-metrics-inventory"),
                anyString(),
                eq(1_000L),
                eq(2_000L),
                anyString()
        )).thenReturn(promqlSuccess(new DatasourceQueryData(
                "otlp-related-metrics-inventory",
                200,
                null,
                List.of(
                        new DatasourceQueryData.SchemaData(
                                new DatasourceQueryData.MetricSchema(
                                        List.of(
                                                new DatasourceQueryData.MetricField("__ts__", "time", null),
                                                new DatasourceQueryData.MetricField("__value__", "number", null)
                                        ),
                                        Map.of("__name__", "http_server_duration", "service_name", "checkout", "http_route", "/checkout"),
                                        Map.of()
                                ),
                                Collections.singletonList(new Object[] {1_000L, 12.0})
                        ),
                        new DatasourceQueryData.SchemaData(
                                new DatasourceQueryData.MetricSchema(
                                        List.of(
                                                new DatasourceQueryData.MetricField("__ts__", "time", null),
                                                new DatasourceQueryData.MetricField("__value__", "number", null)
                                        ),
                                        Map.of("__name__", "http_server_duration", "service_name", "checkout", "http_route", "/cart"),
                                        Map.of()
                                ),
                                Collections.singletonList(new Object[] {2_000L, 14.0})
                        )
                )
        )));

        OtlpMetricsInventoryDto inventory = otlpIngestionWorkspaceService.getMetricsInventory(
                42L,
                "service",
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                "20"
        );

        assertEquals("promql-inventory", inventory.getSource());
        assertEquals(1, inventory.getTotal());
        assertEquals("http_server_duration", inventory.getItems().getFirst().getMetricName());
        assertEquals("latency", inventory.getItems().getFirst().getFamily());
        assertEquals(2, inventory.getItems().getFirst().getTimeSeriesCount());
        assertEquals(2_000L, inventory.getItems().getFirst().getLatestObservedAt());
        verify(metricQueryRepository).queryPromqlRange(
                eq("otlp-related-metrics-inventory"),
                argThat(query -> query.contains("sum by (__name__)")
                        && query.contains("service_name=\"checkout\"")
                        && query.contains("service_namespace=\"commerce\"")),
                eq(1_000L),
                eq(2_000L),
                anyString()
        );
    }

    @Test
    void metricsConsoleAppliesFilterWhenQueryIsExplicitMetricName() {
        String expectedQuery = groupedMetricPromql("__name__=\"http_server_request_duration_count\", "
                + "service_name=\"checkout\", service_namespace=\"commerce\", deployment_environment_name=\"prod\", "
                + "http_route=\"/checkout\"");
        DatasourceQueryData emptyQueryData = new DatasourceQueryData("otlp-metrics-console", 200, null, List.of());
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenAnswer(invocation -> promqlSuccess(emptyQueryData));

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                "http.server.request.duration.count",
                "http.route=\"/checkout\"",
                null,
                null
        );

        assertEquals(expectedQuery, console.getQuery());
        verify(metricQueryRepository).queryPromqlRange(
                eq("otlp-metrics-console"),
                eq(expectedQuery),
                anyLong(),
                anyLong(),
                anyString()
        );
    }

    @Test
    void metricsConsoleMapsOtelResourceGroupByWhenQueryIsExplicitMetricName() {
        String expectedQuery = groupedMetricPromql(
                "service_version, __name__, service_name, service_namespace, deployment_environment_name, "
                        + "hertzbeat_entity_id, hertzbeat_entity_type, hertzbeat_entity_name",
                "__name__=\"hertzbeat_demo_checkout_latency_ms_milliseconds\", "
                        + "service_name=\"checkout\", service_namespace=\"hertzbeat-demo\", "
                        + "deployment_environment_name=\"demo\"");
        DatasourceQueryData emptyQueryData = new DatasourceQueryData("otlp-metrics-console", 200, null, List.of());
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenAnswer(invocation -> promqlSuccess(emptyQueryData));

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1_000L,
                2_000L,
                "checkout",
                "hertzbeat-demo",
                "demo",
                "hertzbeat_demo_checkout_latency_ms_milliseconds",
                null,
                "service.version",
                null
        );

        assertEquals(expectedQuery, console.getQuery());
        verify(metricQueryRepository).queryPromqlRange(
                eq("otlp-metrics-console"),
                eq(expectedQuery),
                anyLong(),
                anyLong(),
                anyString()
        );
    }

    @Test
    void metricsConsoleMapsCanonicalEntityResourceGroupByWhenQueryIsExplicitMetricName() {
        String expectedQuery = groupedMetricPromql(
                "host_name, k8s_pod_name, cloud_resource_id, __name__, service_name, service_namespace, "
                        + "deployment_environment_name, hertzbeat_entity_id, hertzbeat_entity_type, hertzbeat_entity_name",
                "__name__=\"hertzbeat_demo_checkout_latency_ms_milliseconds\", "
                        + "service_name=\"checkout\", service_namespace=\"hertzbeat-demo\", "
                        + "deployment_environment_name=\"demo\"");
        DatasourceQueryData emptyQueryData = new DatasourceQueryData("otlp-metrics-console", 200, null, List.of());
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenAnswer(invocation -> promqlSuccess(emptyQueryData));

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1_000L,
                2_000L,
                "checkout",
                "hertzbeat-demo",
                "demo",
                "hertzbeat_demo_checkout_latency_ms_milliseconds",
                null,
                "resource:host.name,k8s.pod.name,cloud.resource_id",
                null
        );

        assertEquals(expectedQuery, console.getQuery());
        verify(metricQueryRepository).queryPromqlRange(
                eq("otlp-metrics-console"),
                eq(expectedQuery),
                anyLong(),
                anyLong(),
                anyString()
        );
    }

    @Test
    void metricsConsoleDoesNotDuplicateScopedLabelsFromFilterWhenContextAlreadyProvidesThem() {
        String expectedQuery = groupedMetricPromql("__name__=\"http_server_request_duration_count\", "
                + "service_name=\"checkout\", service_namespace=\"commerce\", deployment_environment_name=\"prod\", "
                + "http_route=\"/checkout\"");
        DatasourceQueryData emptyQueryData = new DatasourceQueryData("otlp-metrics-console", 200, null, List.of());
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenAnswer(invocation -> promqlSuccess(emptyQueryData));

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                "http.server.request.duration.count",
                "service.name=\"checkout\" and service.namespace=\"commerce\" and http.route=\"/checkout\"",
                null,
                null
        );

        assertEquals(expectedQuery, console.getQuery());
        verify(metricQueryRepository).queryPromqlRange(
                eq("otlp-metrics-console"),
                eq(expectedQuery),
                anyLong(),
                anyLong(),
                anyString()
        );
    }

    @Test
    void metricsConsoleAppliesTemporalAggregationWhenQueryIsSimpleMetricName() {
        String expectedQuery = temporalGroupedMetricPromql("rate", "__name__=\"http_server_request_duration_count\", "
                + "service_name=\"checkout\", service_namespace=\"commerce\", deployment_environment_name=\"prod\", "
                + "http_route=\"/checkout\"");
        DatasourceQueryData emptyQueryData = new DatasourceQueryData("otlp-metrics-console", 200, null, List.of());
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenAnswer(invocation -> promqlSuccess(emptyQueryData));

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                "http.server.request.duration.count",
                "http.route=\"/checkout\"",
                null,
                null,
                "rate",
                "60",
                null
        );

        assertEquals(expectedQuery, console.getQuery());
        verify(metricQueryRepository).queryPromqlRange(
                eq("otlp-metrics-console"),
                eq(expectedQuery),
                anyLong(),
                anyLong(),
                eq("60s")
        );
    }

    @Test
    void metricsConsoleAppliesSeriesLimitToReturnedFramesAndStats() {
        DatasourceQueryData queryData = new DatasourceQueryData(
                "otlp-metrics-console",
                200,
                null,
                List.of(
                        new DatasourceQueryData.SchemaData(
                                new DatasourceQueryData.MetricSchema(
                                        List.of(
                                                new DatasourceQueryData.MetricField("__ts__", "time", null),
                                                new DatasourceQueryData.MetricField("__value__", "number", null)
                                        ),
                                        Map.of("__name__", "http_server_request_duration_count", "service_name", "checkout"),
                                        Map.of()
                                ),
                                Collections.singletonList(new Object[] {1000L, 12.0})
                        ),
                        new DatasourceQueryData.SchemaData(
                                new DatasourceQueryData.MetricSchema(
                                        List.of(
                                                new DatasourceQueryData.MetricField("__ts__", "time", null),
                                                new DatasourceQueryData.MetricField("__value__", "number", null)
                                        ),
                                        Map.of("__name__", "http_server_request_duration_count", "service_name", "billing"),
                                        Map.of()
                                ),
                                Collections.singletonList(new Object[] {1000L, 9.0})
                        )
                )
        );
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenReturn(promqlSuccess(queryData));

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                "http.server.request.duration.count",
                null,
                null,
                null,
                null,
                null,
                "1"
        );

        assertEquals(1, console.getResults().getFrames().size());
        assertEquals("checkout", console.getResults().getFrames().get(0).getSchema().getLabels().get("service_name"));
        assertEquals(1, console.getStats().getTotalSeries());
        assertEquals(1, console.getStats().getNonEmptySeries());
    }

    @Test
    void metricsConsoleAppliesDefaultSeriesLimitWhenLimitMissing() {
        DatasourceQueryData queryData = new DatasourceQueryData(
                "otlp-metrics-console",
                200,
                null,
                metricFrames(101)
        );
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenReturn(promqlSuccess(queryData));

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                "http.server.request.duration.count",
                null,
                null,
                null,
                null,
                null,
                null
        );

        assertEquals(100, console.getResults().getFrames().size());
        assertEquals(100, console.getStats().getTotalSeries());
        assertEquals("service-99", console.getResults().getFrames().get(99).getSchema().getLabels().get("service_name"));
    }

    @Test
    void metricsConsoleCapsOversizedSeriesLimit() {
        DatasourceQueryData queryData = new DatasourceQueryData(
                "otlp-metrics-console",
                200,
                null,
                metricFrames(101)
        );
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenReturn(promqlSuccess(queryData));

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                "http.server.request.duration.count",
                null,
                null,
                null,
                null,
                null,
                "50000"
        );

        assertEquals(100, console.getResults().getFrames().size());
        assertEquals(100, console.getStats().getTotalSeries());
        assertEquals("service-99", console.getResults().getFrames().get(99).getSchema().getLabels().get("service_name"));
    }

    @Test
    void metricsConsoleNormalizesZeroSeriesLimitToDefault() {
        DatasourceQueryData queryData = new DatasourceQueryData(
                "otlp-metrics-console",
                200,
                null,
                metricFrames(101)
        );
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenReturn(promqlSuccess(queryData));

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1_000L,
                2_000L,
                "checkout",
                "commerce",
                "prod",
                "http.server.request.duration.count",
                null,
                null,
                null,
                null,
                null,
                "0"
        );

        assertEquals(100, console.getResults().getFrames().size());
        assertEquals(100, console.getStats().getTotalSeries());
    }

    @Test
    void metricsConsoleFallsBackToRecentOtlpMetricContextWhenExplicitContextMissing() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "flagd",
                        "service.namespace", "opentelemetry-demo",
                        "deployment.environment.name", "demo"
                ),
                1_710_000_000_000L,
                "http_server_request_duration_count",
                "sum",
                "1",
                42.0,
                Map.of("http.route", "/flagd.evaluation.v1.Service/ResolveBoolean")
        );

        String flagdQuery = groupedMetricPromql("__name__=\"http_server_request_duration_count\", "
                + "service_name=\"flagd\", service_namespace=\"opentelemetry-demo\", deployment_environment_name=\"demo\"");
        stubPromqlQuery(flagdQuery,
                new DatasourceQueryData(
                        "otlp-metrics-console",
                        200,
                        null,
                        List.of(
                                new DatasourceQueryData.SchemaData(
                                        new DatasourceQueryData.MetricSchema(
                                                List.of(
                                                        new DatasourceQueryData.MetricField("__ts__", "time", null),
                                                        new DatasourceQueryData.MetricField("__value__", "number", null)
                                                ),
                                                Map.of("__name__", "http_server_request_duration_count"),
                                                Map.of()
                                        ),
                                        List.of(new Object[] {1000L, 12.0}, new Object[] {2000L, 14.0})
                                )
                        )
                ));

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1000L,
                2000L,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        assertNotNull(console.getContext());
        assertEquals("flagd", console.getContext().getServiceName());
        assertEquals("opentelemetry-demo", console.getContext().getServiceNamespace());
        assertEquals("demo", console.getContext().getEnvironment());
        assertEquals(flagdQuery, console.getQuery());
        assertEquals(1, console.getStats().getTotalSeries());
    }

    @Test
    void metricsConsoleFallsBackToQueryableRecentContextAndNormalizesMetricName() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of("service.name", "quote", "service.namespace", "opentelemetry-demo"),
                2_100L,
                "otel.logs.log_processor.logs",
                "gauge",
                "1",
                1.0,
                Map.of()
        );
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of("service.name", "flagd", "service.namespace", "opentelemetry-demo"),
                2_000L,
                "http.server.request.duration.count",
                "sum",
                "1",
                42.0,
                Map.of("http.route", "/flagd.evaluation.v1.Service/ResolveBoolean")
        );

        stubPromqlQuery(groupedMetricPromql("__name__=\"otel_logs_log_processor_logs\", "
                        + "service_name=\"quote\", service_namespace=\"opentelemetry-demo\""),
                new DatasourceQueryData(
                        "otlp-metrics-console",
                        200,
                        null,
                        List.of()
                ));
        String flagdQueryableQuery = groupedMetricPromql("__name__=\"http_server_request_duration_count\", "
                + "service_name=\"flagd\", service_namespace=\"opentelemetry-demo\"");
        stubPromqlQuery(flagdQueryableQuery,
                new DatasourceQueryData(
                        "otlp-metrics-console",
                        200,
                        null,
                        List.of(
                                new DatasourceQueryData.SchemaData(
                                        new DatasourceQueryData.MetricSchema(
                                                List.of(
                                                        new DatasourceQueryData.MetricField("__ts__", "time", null),
                                                        new DatasourceQueryData.MetricField("__value__", "number", null)
                                                ),
                                                Map.of("__name__", "http_server_request_duration_count"),
                                                Map.of()
                                        ),
                                        List.of(new Object[] {1000L, 12.0}, new Object[] {2000L, 14.0})
                                )
                        )
                ));

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1000L,
                2000L,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        assertNotNull(console.getContext());
        assertEquals("flagd", console.getContext().getServiceName());
        assertEquals(flagdQueryableQuery, console.getQuery());
        assertEquals(1, console.getStats().getTotalSeries());
    }

    @Test
    void metricsConsoleFallsBackToRecentExternalTraceContextWhenMetricContextIsOnlyCollectorNoise() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of("service.name", "otelcol-contrib", "service.namespace", "observability"),
                2_100L,
                "http.server.request.duration.count",
                "sum",
                "1",
                1.0,
                Map.of()
        );
        TraceListItemDto traceItem = new TraceListItemDto();
        traceItem.setTraceId("trace-demo-1");
        traceItem.setServiceName("frontend");
        traceItem.setStartTime(2_200L);
        traceItem.setResourceAttributes(Map.of(
                "service.name", "frontend",
                "service.namespace", "opentelemetry-demo",
                "deployment.environment.name", "demo"
        ));

        stubRecentLogs();
        when(entityTraceQueryService.queryTraceList(org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.eq(false),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq(0), org.mockito.ArgumentMatchers.eq(20)))
                .thenReturn(new PageImpl<>(List.of(traceItem), PageRequest.of(0, 20), 1));
        String frontendQuery = groupedMetricPromql("__name__=\"http_server_request_duration_count\", "
                + "service_name=\"frontend\", service_namespace=\"opentelemetry-demo\", "
                + "deployment_environment_name=\"demo\"");
        stubPromqlQuery(frontendQuery,
                new DatasourceQueryData(
                        "otlp-metrics-console",
                        200,
                        null,
                        List.of(
                                new DatasourceQueryData.SchemaData(
                                        new DatasourceQueryData.MetricSchema(
                                                List.of(
                                                        new DatasourceQueryData.MetricField("__ts__", "time", null),
                                                        new DatasourceQueryData.MetricField("__value__", "number", null)
                                                ),
                                                Map.of("__name__", "http_server_request_duration_count"),
                                                Map.of()
                                        ),
                                        List.of(new Object[] {1000L, 12.0}, new Object[] {2000L, 14.0})
                                )
                        )
                ));

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1000L,
                2000L,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        assertNotNull(console.getContext());
        assertEquals("frontend", console.getContext().getServiceName());
        assertEquals("opentelemetry-demo", console.getContext().getServiceNamespace());
        assertEquals("demo", console.getContext().getEnvironment());
        assertEquals(frontendQuery, console.getQuery());
        assertEquals(1, console.getStats().getTotalSeries());
    }

    @Test
    void metricsConsoleSkipsWorkspaceInfraServicesAndExporterFailureMetrics() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of("service.name", "jaeger", "service.namespace", "observability"),
                2_300L,
                "otelcol_exporter_send_failed_spans",
                "sum",
                "1",
                3.0,
                Map.of()
        );
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "flagd",
                        "service.namespace", "opentelemetry-demo",
                        "deployment.environment.name", "demo"
                ),
                2_200L,
                "http_server_request_duration_count",
                "sum",
                "1",
                7.0,
                Map.of()
        );

        String expectedFlagdQuery = groupedMetricPromql("__name__=\"http_server_request_duration_count\", "
                + "service_name=\"flagd\", service_namespace=\"opentelemetry-demo\", "
                + "deployment_environment_name=\"demo\"");
        stubPromqlQuery(expectedFlagdQuery,
                new DatasourceQueryData(
                        "otlp-metrics-console",
                        200,
                        null,
                        List.of(
                                new DatasourceQueryData.SchemaData(
                                        new DatasourceQueryData.MetricSchema(
                                                List.of(
                                                        new DatasourceQueryData.MetricField("__ts__", "time", null),
                                                        new DatasourceQueryData.MetricField("__value__", "number", null)
                                                ),
                                                Map.of("__name__", "http_server_request_duration_count"),
                                                Map.of()
                                        ),
                                        List.of(new Object[] {1000L, 6.0}, new Object[] {2000L, 7.0})
                                )
                        )
                ));

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1000L,
                2000L,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        assertNotNull(console.getContext());
        assertEquals("flagd", console.getContext().getServiceName());
        assertEquals(expectedFlagdQuery, console.getQuery());
        assertEquals(1, console.getStats().getTotalSeries());
    }

    @Test
    void metricsConsoleDoesNotFallBackToContextWideQueryWhenNamedCandidatesAreEmpty() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "storefront",
                        "deployment.environment.name", "demo"
                ),
                2_000L,
                "rpc_server_duration_milliseconds",
                "histogram",
                "ms",
                0.0,
                Map.of()
        );

        String namedQuery = groupedMetricPromql("__name__=\"rpc_server_duration_milliseconds\", "
                + "service_name=\"checkout\", service_namespace=\"storefront\", "
                + "deployment_environment_name=\"demo\"");
        DatasourceQueryData emptyQueryData = new DatasourceQueryData(
                "otlp-metrics-console",
                200,
                null,
                List.of()
        );
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenAnswer(invocation -> {
            String actualQuery = invocation.getArgument(1, String.class);
            assertTrue(actualQuery.contains("__name__=\""));
            return promqlSuccess(emptyQueryData);
        });

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1_000L,
                2_000L,
                "checkout",
                "storefront",
                "demo",
                null,
                null,
                null,
                null
        );

        assertEquals(namedQuery, console.getQuery());
        assertEquals(0, console.getStats().getTotalSeries());
        verify(metricQueryRepository, never()).queryPromqlRange(
                eq("otlp-metrics-console"),
                argThat(query -> query != null && query.contains("({service_name=\"checkout\"")),
                anyLong(),
                anyLong(),
                anyString()
        );
    }

    @Test
    void metricsConsoleTriesCommonServiceMetricBeforeNoisyRecentNames() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "hertzbeat-demo",
                        "deployment.environment.name", "demo"
                ),
                2_000L,
                "postgresql_backends",
                "gauge",
                "1",
                1.0,
                Map.of()
        );

        String rpcQuery = groupedMetricPromql("__name__=\"rpc_server_duration_milliseconds\", "
                + "service_name=\"checkout\", service_namespace=\"hertzbeat-demo\", "
                + "deployment_environment_name=\"demo\"");
        DatasourceQueryData emptyQueryData = new DatasourceQueryData(
                "otlp-metrics-console",
                200,
                null,
                List.of()
        );
        DatasourceQueryData rpcQueryData = new DatasourceQueryData(
                "otlp-metrics-console",
                200,
                null,
                List.of(
                        new DatasourceQueryData.SchemaData(
                                new DatasourceQueryData.MetricSchema(
                                        List.of(
                                                new DatasourceQueryData.MetricField("__ts__", "time", null),
                                                new DatasourceQueryData.MetricField("__value__", "number", null)
                                        ),
                                        Map.of("__name__", "rpc_server_duration_milliseconds"),
                                        Map.of("service_name", "checkout")
                                ),
                                List.of(new Object[] {1_000L, 92.0}, new Object[] {2_000L, 118.0})
                        )
                )
        );
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenAnswer(invocation -> {
            String actualQuery = invocation.getArgument(1, String.class);
            DatasourceQueryData queryData = rpcQuery.equals(actualQuery) ? rpcQueryData : emptyQueryData;
            return promqlSuccess(queryData);
        });

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1_000L,
                2_000L,
                "checkout",
                "hertzbeat-demo",
                "demo",
                null,
                null,
                null,
                null
        );

        assertEquals(rpcQuery, console.getQuery());
        assertEquals(1, console.getStats().getTotalSeries());
    }

    @Test
    void metricsConsoleKeepsDemoEntityLabelsInDefaultQuery() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "hertzbeat-demo",
                        "deployment.environment.name", "demo",
                        "hertzbeat.entity_id", "4200",
                        "hertzbeat.entity_type", "service",
                        "hertzbeat.entity_name", "Checkout API"
                ),
                2_000L,
                "rpc_server_duration",
                "histogram",
                "ms",
                118.0,
                Map.of()
        );

        String rpcQuery = "sum by (__name__, service_name, service_namespace, deployment_environment_name, "
                + "hertzbeat_entity_id, hertzbeat_entity_type, hertzbeat_entity_name) "
                + "({__name__=\"rpc_server_duration_milliseconds\", "
                + "service_name=\"checkout\", service_namespace=\"hertzbeat-demo\", "
                + "deployment_environment_name=\"demo\"})";
        DatasourceQueryData emptyQueryData = new DatasourceQueryData(
                "otlp-metrics-console",
                200,
                null,
                List.of()
        );
        DatasourceQueryData rpcQueryData = new DatasourceQueryData(
                "otlp-metrics-console",
                200,
                null,
                List.of(
                        new DatasourceQueryData.SchemaData(
                                new DatasourceQueryData.MetricSchema(
                                        List.of(
                                                new DatasourceQueryData.MetricField("__ts__", "time", null),
                                                new DatasourceQueryData.MetricField("__value__", "number", null)
                                        ),
                                        Map.of(
                                                "__name__", "rpc_server_duration_milliseconds",
                                                "service_name", "checkout",
                                                "hertzbeat_entity_id", "4200",
                                                "hertzbeat_entity_type", "service",
                                                "hertzbeat_entity_name", "Checkout API"
                                        ),
                                        Map.of()
                                ),
                                List.of(new Object[] {1_000L, 92.0}, new Object[] {2_000L, 118.0})
                        )
                )
        );
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenAnswer(invocation -> {
            String actualQuery = invocation.getArgument(1, String.class);
            DatasourceQueryData queryData = rpcQuery.equals(actualQuery) ? rpcQueryData : emptyQueryData;
            return promqlSuccess(queryData);
        });

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1_000L,
                2_000L,
                "checkout",
                "hertzbeat-demo",
                "demo",
                null,
                null,
                null,
                null
        );

        assertEquals(rpcQuery, console.getQuery());
        assertEquals("4200", console.getResults().getFrames().getFirst().getSchema().getLabels().get("hertzbeat_entity_id"));
        assertEquals("service", console.getResults().getFrames().getFirst().getSchema().getLabels().get("hertzbeat_entity_type"));
        assertEquals("Checkout API", console.getResults().getFrames().getFirst().getSchema().getLabels().get("hertzbeat_entity_name"));
    }

    @Test
    void metricsConsoleFindsRecentNonEmptyMetricAcrossBurstOfEmptyMetrics() {
        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout",
                        "service.namespace", "storefront",
                        "deployment.environment.name", "demo"
                ),
                2_000L,
                "hertzbeat_demo_checkout_latency_ms_milliseconds",
                "gauge",
                "1",
                92.0,
                Map.of("http.route", "/checkout")
        );
        for (int i = 0; i < 20; i++) {
            observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                    Map.of(
                            "service.name", "checkout",
                            "service.namespace", "storefront",
                            "deployment.environment.name", "demo"
                    ),
                    2_001L + i,
                    "legacy_empty_" + i + "_count",
                    "sum",
                    "1",
                    0.0,
                    Map.of()
            );
        }

        String demoQuery = groupedMetricPromql("__name__=\"hertzbeat_demo_checkout_latency_ms_milliseconds\", "
                + "service_name=\"checkout\", service_namespace=\"storefront\", "
                + "deployment_environment_name=\"demo\"");
        DatasourceQueryData emptyQueryData = new DatasourceQueryData(
                "otlp-metrics-console",
                200,
                null,
                List.of()
        );
        DatasourceQueryData demoQueryData = new DatasourceQueryData(
                        "otlp-metrics-console",
                        200,
                        null,
                        List.of(
                                new DatasourceQueryData.SchemaData(
                                        new DatasourceQueryData.MetricSchema(
                                                List.of(
                                                        new DatasourceQueryData.MetricField("__ts__", "time", null),
                                                        new DatasourceQueryData.MetricField("__value__", "number", null)
                                                ),
                                                Map.of("__name__", "hertzbeat_demo_checkout_latency_ms_milliseconds"),
                                                Map.of("service_name", "checkout")
                                        ),
                                                List.of(new Object[] {1_000L, 92.0}, new Object[] {2_000L, 118.0})
                                )
                        )
        );
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"),
                anyString(),
                anyLong(),
                anyLong(),
                anyString()
        )).thenAnswer(invocation -> {
            String actualQuery = invocation.getArgument(1, String.class);
            DatasourceQueryData queryData = demoQuery.equals(actualQuery) ? demoQueryData : emptyQueryData;
            return promqlSuccess(queryData);
        });

        OtlpMetricsConsoleDto console = otlpIngestionWorkspaceService.getMetricsConsole(
                null,
                1_000L,
                2_000L,
                "checkout",
                "storefront",
                "demo",
                null,
                null,
                null,
                null
        );

        assertEquals(demoQuery, console.getQuery());
        assertEquals(1, console.getStats().getTotalSeries());
    }

    private static final class InMemoryObservabilitySignalIntakeGateway implements ObservabilitySignalIntakeGateway {

        private static final Set<String> WORKSPACE_INFRA_SERVICE_NAMES = Set.of(
                "otelcol-contrib",
                "otel-collector",
                "opentelemetry-collector",
                "jaeger",
                "prometheus",
                "grafana",
                "opensearch",
                "frontend-proxy"
        );

        private final List<RecentMetricSignal> recentMetricSignals = new ArrayList<>();

        @Override
        public void recordOtlpMetricIntake(Map<String, String> resourceAttributes, Long observedAt, String metricName,
                                           String metricType, String unit, Double value, Map<String, String> attributes) {
            Map<String, String> canonicalIdentities = extractCanonicalStringMap(resourceAttributes);
            if (canonicalIdentities.isEmpty()) {
                return;
            }
            recentMetricSignals.add(0, new RecentMetricSignal(canonicalIdentities, observedAt, trimToNull(metricName)));
            while (recentMetricSignals.size() > 256) {
                recentMetricSignals.remove(recentMetricSignals.size() - 1);
            }
        }

        @Override
        public void recordOtlpLogIntake(Map<String, String> resourceAttributes, Long observedAt, String body,
                                        String severityText, String traceId, String spanId,
                                        Map<String, String> attributes) {
        }

        @Override
        public void recordOtlpTraceIntake(Map<String, String> resourceAttributes, Long observedAt, String traceId,
                                          String spanId, String spanName, String errorState,
                                          Map<String, String> spanAttributes) {
        }

        @Override
        public List<TelemetryIdentitySnapshot> collectRecentIdentitySnapshots(List<LogEntry> logs,
                                                                              List<TraceListItemDto> traces,
                                                                              List<Monitor> monitors) {
            List<TelemetryIdentitySnapshot> snapshots = new ArrayList<>();
            if (logs != null) {
                for (LogEntry log : logs) {
                    Map<String, String> canonical = extractCanonicalStringMap(log == null ? null : log.getResource());
                    if (canonical.isEmpty()) {
                        continue;
                    }
                    snapshots.add(new TelemetryIdentitySnapshot(
                            "otlp",
                            "logs",
                            canonical,
                            canonical.get("service.name"),
                            canonical.get("service.namespace"),
                            canonical.get("deployment.environment.name"),
                            canonical.get("service.instance.id"),
                            canonical.get("host.name"),
                            log == null || log.getTimeUnixNano() == null ? null : log.getTimeUnixNano() / 1_000_000L
                    ));
                }
            }
            if (traces != null) {
                for (TraceListItemDto trace : traces) {
                    Map<String, String> canonical = extractCanonicalStringMap(trace == null ? null : trace.getResourceAttributes());
                    if (canonical.isEmpty()) {
                        continue;
                    }
                    snapshots.add(new TelemetryIdentitySnapshot(
                            "otlp",
                            "traces",
                            canonical,
                            canonical.get("service.name"),
                            canonical.get("service.namespace"),
                            canonical.get("deployment.environment.name"),
                            canonical.get("service.instance.id"),
                            canonical.get("host.name"),
                            toLong(trace == null ? null : trace.getStartTime())
                    ));
                }
            }
            if (monitors != null) {
                for (Monitor monitor : monitors) {
                    Map<String, String> canonical = extractCanonicalStringMap(monitor == null ? null : monitor.getLabels());
                    if (canonical.isEmpty()) {
                        continue;
                    }
                    snapshots.add(new TelemetryIdentitySnapshot(
                            "monitor",
                            "metrics",
                            canonical,
                            canonical.get("service.name"),
                            canonical.get("service.namespace"),
                            canonical.get("deployment.environment.name"),
                            canonical.get("service.instance.id"),
                            canonical.get("host.name"),
                            toEpochMillis(monitor == null ? null : monitor.getGmtUpdate())
                    ));
                }
            }
            for (RecentMetricSignal signal : recentMetricSignals) {
                snapshots.add(buildMetricIdentitySnapshot(signal));
            }
            return snapshots;
        }

        @Override
        public List<TelemetryIdentitySnapshot> collectRecentExternalIdentitySnapshots(List<LogEntry> logs,
                                                                                      List<TraceListItemDto> traces,
                                                                                      List<Monitor> monitors) {
            return collectRecentIdentitySnapshots(logs, traces, monitors).stream()
                    .filter(snapshot -> !isSelfTelemetrySnapshot(snapshot))
                    .filter(snapshot -> !isWorkspaceNoiseSnapshot(snapshot))
                    .toList();
        }

        @Override
        public TelemetryIdentitySnapshot resolveRecentOtlpMetricContext(String serviceName, String serviceNamespace,
                                                                        String environment) {
            String requiredServiceName = normalizeValue(serviceName);
            String requiredServiceNamespace = normalizeValue(serviceNamespace);
            String requiredEnvironment = normalizeValue(environment);
            for (RecentMetricSignal signal : orderedMetricSignals()) {
                if (!matchesMetricContext(signal.canonicalIdentities(),
                        requiredServiceName, requiredServiceNamespace, requiredEnvironment)) {
                    continue;
                }
                TelemetryIdentitySnapshot snapshot = buildMetricIdentitySnapshot(signal);
                if (!hasText(requiredServiceName) && isWorkspaceNoiseSnapshot(snapshot)) {
                    continue;
                }
                if (!hasText(snapshot.getServiceName()) && !hasText(requiredServiceName)) {
                    continue;
                }
                return snapshot;
            }
            return null;
        }

        @Override
        public List<TelemetryIdentitySnapshot> collectRecentOtlpMetricContexts(int limit) {
            int resolvedLimit = limit <= 0 ? 1 : limit;
            LinkedHashMap<String, TelemetryIdentitySnapshot> contexts = new LinkedHashMap<>();
            for (RecentMetricSignal signal : orderedMetricSignals()) {
                TelemetryIdentitySnapshot snapshot = buildMetricIdentitySnapshot(signal);
                if (!hasText(snapshot.getServiceName())
                        || isSelfTelemetrySnapshot(snapshot)
                        || isWorkspaceNoiseSnapshot(snapshot)) {
                    continue;
                }
                String contextKey = String.join("|",
                        defaultText(normalizeValue(snapshot.getServiceName()), ""),
                        defaultText(normalizeValue(snapshot.getServiceNamespace()), ""),
                        defaultText(normalizeValue(snapshot.getEnvironmentName()), ""));
                if (contexts.containsKey(contextKey)) {
                    continue;
                }
                contexts.put(contextKey, snapshot);
                if (contexts.size() >= resolvedLimit) {
                    break;
                }
            }
            return List.copyOf(contexts.values());
        }

        @Override
        public List<String> collectRecentOtlpMetricNames(String serviceName, String serviceNamespace,
                                                         String environment, int limit) {
            String requiredServiceName = normalizeValue(serviceName);
            String requiredServiceNamespace = normalizeValue(serviceNamespace);
            String requiredEnvironment = normalizeValue(environment);
            int resolvedLimit = limit <= 0 ? 1 : limit;
            LinkedHashSet<String> metricNames = new LinkedHashSet<>();
            for (RecentMetricSignal signal : orderedMetricSignals()) {
                if (!matchesMetricContext(signal.canonicalIdentities(),
                        requiredServiceName, requiredServiceNamespace, requiredEnvironment)) {
                    continue;
                }
                String metricName = trimToNull(signal.metricName());
                if (!hasText(metricName) || !metricNames.add(metricName)) {
                    continue;
                }
                if (metricNames.size() >= resolvedLimit) {
                    break;
                }
            }
            return List.copyOf(metricNames);
        }

        private List<RecentMetricSignal> orderedMetricSignals() {
            return recentMetricSignals.stream()
                    .sorted(Comparator.comparing(RecentMetricSignal::observedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                    .toList();
        }

        private TelemetryIdentitySnapshot buildMetricIdentitySnapshot(RecentMetricSignal signal) {
            return new TelemetryIdentitySnapshot(
                    "otlp",
                    "metrics",
                    signal.canonicalIdentities(),
                    signal.canonicalIdentities().get("service.name"),
                    signal.canonicalIdentities().get("service.namespace"),
                    signal.canonicalIdentities().get("deployment.environment.name"),
                    signal.canonicalIdentities().get("service.instance.id"),
                    signal.canonicalIdentities().get("host.name"),
                    signal.observedAt()
            );
        }

        private boolean matchesMetricContext(Map<String, String> canonicalIdentities, String requiredServiceName,
                                             String requiredServiceNamespace, String requiredEnvironment) {
            if (canonicalIdentities == null || canonicalIdentities.isEmpty() || isSelfTelemetryResource(canonicalIdentities)) {
                return false;
            }
            if (hasText(requiredServiceName)
                    && !requiredServiceName.equals(normalizeValue(canonicalIdentities.get("service.name")))) {
                return false;
            }
            if (hasText(requiredServiceNamespace)
                    && !requiredServiceNamespace.equals(normalizeValue(canonicalIdentities.get("service.namespace")))) {
                return false;
            }
            if (hasText(requiredEnvironment)
                    && !requiredEnvironment.equals(normalizeValue(canonicalIdentities.get("deployment.environment.name")))) {
                return false;
            }
            return true;
        }

        private boolean isSelfTelemetrySnapshot(TelemetryIdentitySnapshot snapshot) {
            return snapshot != null
                    && snapshot.getCanonicalIdentities() != null
                    && isSelfTelemetryResource(snapshot.getCanonicalIdentities());
        }

        private boolean isWorkspaceNoiseSnapshot(TelemetryIdentitySnapshot snapshot) {
            return snapshot != null
                    && snapshot.getCanonicalIdentities() != null
                    && isWorkspaceNoiseResource(snapshot.getCanonicalIdentities());
        }

        private boolean isSelfTelemetryResource(Map<String, String> resourceAttributes) {
            String serviceName = normalizeValue(resourceAttributes.get("service.name"));
            String serviceNamespace = normalizeValue(resourceAttributes.get("service.namespace"));
            return "hertzbeat".equals(serviceName)
                    || "apache-hertzbeat".equals(serviceName)
                    || "hertzbeat".equals(serviceNamespace)
                    || "apache-hertzbeat".equals(serviceNamespace);
        }

        private boolean isWorkspaceNoiseResource(Map<String, String> resourceAttributes) {
            String serviceName = normalizeValue(resourceAttributes.get("service.name"));
            return hasText(serviceName) && WORKSPACE_INFRA_SERVICE_NAMES.contains(serviceName);
        }

        private Map<String, String> extractCanonicalStringMap(Map<?, ?> values) {
            if (values == null || values.isEmpty()) {
                return Collections.emptyMap();
            }
            Map<String, String> canonical = new LinkedHashMap<>();
            for (String key : EntityCanonicalIdentityRegistry.CANONICAL_OTEL_RESOURCE_KEYS) {
                Object value = values.get(key);
                if (value == null) {
                    continue;
                }
                String normalized = trimToNull(String.valueOf(value));
                if (normalized != null) {
                    canonical.put(key, normalized);
                }
            }
            return canonical;
        }

        private Long toEpochMillis(LocalDateTime dateTime) {
            return dateTime == null ? null : dateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        }

        private Long toLong(Object value) {
            return value instanceof Number number ? number.longValue() : null;
        }

        private String defaultText(String preferred, String fallback) {
            String normalized = trimToNull(preferred);
            return normalized != null ? normalized : trimToNull(fallback);
        }

        private String normalizeValue(String value) {
            String normalized = trimToNull(value);
            return normalized == null ? null : normalized.toLowerCase(java.util.Locale.ROOT);
        }

        private boolean hasText(String value) {
            return trimToNull(value) != null;
        }

        private String trimToNull(String value) {
            if (value == null) {
                return null;
            }
            String trimmed = value.trim();
            return trimmed.isEmpty() ? null : trimmed;
        }

        private record RecentMetricSignal(Map<String, String> canonicalIdentities, Long observedAt, String metricName) {
        }
    }
}
