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

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.warehouse.repository.TraceQueryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

/**
 * Contract for deriving topology trace-call edges from Greptime trace rows.
 */
@ExtendWith(MockitoExtension.class)
class TraceCallTopologyQueryServiceTest {

    @InjectMocks
    private TraceCallTopologyQueryService traceCallTopologyQueryService;

    @Mock
    private TraceQueryRepository traceQueryRepository;

    @Mock
    private EntityIdentityQueryService entityIdentityQueryService;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Test
    void derivesServiceCallEdgesFromParentChildTraceSpans() {
        ObserveEntity checkout = entity(10L, "checkout-api", "commerce", "prod");
        ObserveEntity payment = entity(20L, "payment-api", "commerce", "prod");
        when(entityIdentityQueryService.findIdentities(10L)).thenReturn(List.of(
                identity(10L, "service.name", "checkout-api")));
        when(traceQueryRepository.queryRecentTraceRows(1500, 1710000000000L, 1710003600000L, null, "prod", true))
                .thenReturn(List.of(
                traceRow("trace-1", "root", null, "GET /checkout", "checkout-api", "STATUS_CODE_OK", 20D),
                traceRow("trace-1", "payment", "root", "POST /pay", "payment-api", "STATUS_CODE_ERROR", 300D),
                traceRow("trace-2", "root", null, "GET /checkout", "checkout-api", "STATUS_CODE_OK", 10D),
                traceRow("trace-2", "payment", "root", "POST /pay", "payment-api", "STATUS_CODE_OK", 100D)));
        when(entityIdentityQueryService.findMatchingIdentities(argThat(keys ->
                keys != null && keys.contains("service.name")), argThat(values ->
                values != null && values.containsAll(Set.of("checkout api", "payment api"))))).thenReturn(List.of(
                identity(10L, "service.name", "checkout-api"),
                identity(20L, "service.name", "payment-api")));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.containsAll(Set.of(10L, 20L))))).thenReturn(List.of(checkout, payment));

        TraceCallTopologyReadModel readModel = traceCallTopologyQueryService.findTraceCallEdges(
                List.of(checkout), "prod", 1710000000000L, 1710003600000L);

        assertEquals(Set.of(10L, 20L), readModel.entityById().keySet());
        assertEquals(1, readModel.edges().size());
        TraceCallTopologyEdgeInfo edge = readModel.edges().getFirst();
        assertEquals(10L, edge.sourceEntityId());
        assertEquals(20L, edge.targetEntityId());
        assertEquals("trace-1", edge.traceId());
        assertEquals("payment", edge.sampleSpanId());
        assertEquals("POST /pay", edge.spanName());
        assertEquals("error", edge.status());
        assertEquals(60, edge.score());
        assertTrue(edge.id().contains("trace-call"));
        assertNotNull(edge.redMetrics());
        assertEquals(2L, edge.redMetrics().requestCount());
        assertEquals(1L, edge.redMetrics().errorCount());
        assertEquals(0.5D, edge.redMetrics().errorRate(), 0.000001D);
        assertEquals(2D / 3600D, edge.redMetrics().requestRatePerSecond(), 0.000001D);
        assertEquals(300D, edge.redMetrics().latencyP95Ms(), 0.000001D);
        assertEquals(200D, edge.redMetrics().latencyAvgMs(), 0.000001D);
        verify(traceQueryRepository).queryRecentTraceRows(1500, 1710000000000L, 1710003600000L, null, "prod", true);
    }

    @Test
    void derivesServiceCallEdgesFromGreptimeServiceGraphAggregation() {
        ObserveEntity checkout = entity(10L, "checkout-api", "commerce", "prod");
        ObserveEntity payment = entity(20L, "payment-api", "commerce", "prod");
        when(entityIdentityQueryService.findIdentities(10L)).thenReturn(List.of(
                identity(10L, "service.name", "checkout-api")));
        when(traceQueryRepository.queryTraceServiceGraphRows(
                eq(1500), eq(1710000000000L), eq(1710003600000L), eq("prod"),
                argThat(serviceNames -> serviceNames != null && serviceNames.contains("checkout-api")),
                eq(true)))
                .thenReturn(List.of(serviceGraphRow(
                        "checkout-api", "payment-api", 4L, 1L, 240D, 120D,
                        "trace-9", "span-9", "POST /pay",
                        "2026-05-20T03:01:00Z", "2026-05-20T03:08:00Z")));
        when(entityIdentityQueryService.findMatchingIdentities(argThat(keys ->
                keys != null && keys.contains("service.name")), argThat(values ->
                values != null && values.containsAll(Set.of("checkout api", "payment api"))))).thenReturn(List.of(
                identity(10L, "service.name", "checkout-api"),
                identity(20L, "service.name", "payment-api")));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.containsAll(Set.of(10L, 20L))))).thenReturn(List.of(checkout, payment));

        TraceCallTopologyReadModel readModel = traceCallTopologyQueryService.findTraceCallEdges(
                List.of(checkout), "prod", 1710000000000L, 1710003600000L);

        assertEquals(Set.of(10L, 20L), readModel.entityById().keySet());
        assertEquals(1, readModel.edges().size());
        TraceCallTopologyEdgeInfo edge = readModel.edges().getFirst();
        assertEquals(10L, edge.sourceEntityId());
        assertEquals(20L, edge.targetEntityId());
        assertEquals("trace-9", edge.traceId());
        assertEquals("span-9", edge.sampleSpanId());
        assertEquals("POST /pay", edge.spanName());
        assertEquals("2026-05-20T03:01:00Z", edge.firstSeen());
        assertEquals("2026-05-20T03:08:00Z", edge.lastSeen());
        assertEquals("error", edge.status());
        assertEquals(60, edge.score());
        assertEquals(4L, edge.redMetrics().requestCount());
        assertEquals(1L, edge.redMetrics().errorCount());
        assertEquals(0.25D, edge.redMetrics().errorRate(), 0.000001D);
        assertEquals(4D / 3600D, edge.redMetrics().requestRatePerSecond(), 0.000001D);
        assertEquals(240D, edge.redMetrics().latencyP95Ms(), 0.000001D);
        assertEquals(120D, edge.redMetrics().latencyAvgMs(), 0.000001D);
        verify(traceQueryRepository).queryTraceServiceGraphRows(
                eq(1500), eq(1710000000000L), eq(1710003600000L), eq("prod"),
                argThat(serviceNames -> serviceNames != null && serviceNames.contains("checkout-api")),
                eq(true));
        verify(traceQueryRepository, never()).queryRecentTraceRows(
                1500, 1710000000000L, 1710003600000L, null, "prod", true);
    }

    @Test
    void fallsBackToRawTraceRowsWhenGreptimeServiceGraphAggregationFails() {
        ObserveEntity checkout = entity(10L, "checkout-api", "commerce", "prod");
        ObserveEntity payment = entity(20L, "payment-api", "commerce", "prod");
        when(entityIdentityQueryService.findIdentities(10L)).thenReturn(List.of(
                identity(10L, "service.name", "checkout-api")));
        when(traceQueryRepository.queryTraceServiceGraphRows(
                eq(1500), eq(1710000000000L), eq(1710003600000L), eq("prod"),
                argThat(serviceNames -> serviceNames != null && serviceNames.contains("checkout-api")),
                eq(true)))
                .thenThrow(new IllegalStateException("greptime service graph unavailable"));
        when(traceQueryRepository.queryRecentTraceRows(1500, 1710000000000L, 1710003600000L, null, "prod", true))
                .thenReturn(List.of(
                        traceRow("trace-fallback", "root", null, "GET /checkout",
                                "checkout-api", "STATUS_CODE_OK", 20D),
                        traceRow("trace-fallback", "payment", "root", "POST /pay",
                                "payment-api", "STATUS_CODE_OK", 140D)));
        when(entityIdentityQueryService.findMatchingIdentities(argThat(keys ->
                keys != null && keys.contains("service.name")), argThat(values ->
                values != null && values.containsAll(Set.of("checkout api", "payment api"))))).thenReturn(List.of(
                identity(10L, "service.name", "checkout-api"),
                identity(20L, "service.name", "payment-api")));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.containsAll(Set.of(10L, 20L))))).thenReturn(List.of(checkout, payment));

        TraceCallTopologyReadModel readModel = traceCallTopologyQueryService.findTraceCallEdges(
                List.of(checkout), "prod", 1710000000000L, 1710003600000L);

        assertEquals(Set.of(10L, 20L), readModel.entityById().keySet());
        assertEquals(1, readModel.edges().size());
        TraceCallTopologyEdgeInfo edge = readModel.edges().getFirst();
        assertEquals(10L, edge.sourceEntityId());
        assertEquals(20L, edge.targetEntityId());
        assertEquals("trace-fallback", edge.traceId());
        assertEquals(1L, edge.redMetrics().requestCount());
    }

    @Test
    void fallsBackToRawTraceRowsWhenGreptimeServiceGraphAggregationTimesOut() throws InterruptedException {
        TraceCallTopologyQueryService boundedService = new TraceCallTopologyQueryService(
                traceQueryRepository,
                entityIdentityQueryService,
                entityWorkspaceAccessService,
                Duration.ofMillis(25));
        ObserveEntity checkout = entity(10L, "checkout-api", "commerce", "prod");
        ObserveEntity payment = entity(20L, "payment-api", "commerce", "prod");
        CountDownLatch releaseServiceGraphQuery = new CountDownLatch(1);
        when(entityIdentityQueryService.findIdentities(10L)).thenReturn(List.of(
                identity(10L, "service.name", "checkout-api")));
        when(traceQueryRepository.queryTraceServiceGraphRows(
                eq(1500), eq(1710000000000L), eq(1710003600000L), eq("prod"),
                argThat(serviceNames -> serviceNames != null && serviceNames.contains("checkout-api")),
                eq(true)))
                .thenAnswer(invocation -> {
                    releaseServiceGraphQuery.await(5, TimeUnit.SECONDS);
                    return List.of(serviceGraphRow(
                            "checkout-api", "payment-api", 1L, 0L, 100D, 80D,
                            "trace-late", "span-late", "POST /pay",
                            "2026-05-20T03:01:00Z", "2026-05-20T03:08:00Z"));
                });
        when(traceQueryRepository.queryRecentTraceRows(1500, 1710000000000L, 1710003600000L, null, "prod", true))
                .thenReturn(List.of(
                        traceRow("trace-timeout", "root", null, "GET /checkout",
                                "checkout-api", "STATUS_CODE_OK", 20D),
                        traceRow("trace-timeout", "payment", "root", "POST /pay",
                                "payment-api", "STATUS_CODE_OK", 140D)));
        when(entityIdentityQueryService.findMatchingIdentities(argThat(keys ->
                keys != null && keys.contains("service.name")), argThat(values ->
                values != null && values.containsAll(Set.of("checkout api", "payment api"))))).thenReturn(List.of(
                identity(10L, "service.name", "checkout-api"),
                identity(20L, "service.name", "payment-api")));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.containsAll(Set.of(10L, 20L))))).thenReturn(List.of(checkout, payment));

        long startedAt = System.nanoTime();
        TraceCallTopologyReadModel readModel;
        try {
            readModel = boundedService.findTraceCallEdges(
                    List.of(checkout), "prod", 1710000000000L, 1710003600000L);
        } finally {
            releaseServiceGraphQuery.countDown();
        }

        assertTrue(TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt) < 1000);
        assertEquals(Set.of(10L, 20L), readModel.entityById().keySet());
        assertEquals(1, readModel.edges().size());
        TraceCallTopologyEdgeInfo edge = readModel.edges().getFirst();
        assertEquals(10L, edge.sourceEntityId());
        assertEquals(20L, edge.targetEntityId());
        assertEquals("trace-timeout", edge.traceId());
        assertEquals(1L, edge.redMetrics().requestCount());
    }

    @Test
    void pushesSeedServiceScopeIntoGreptimeServiceGraphAggregation() {
        ObserveEntity checkout = entity(10L, "Checkout API", "commerce", "prod");
        ObserveEntity payment = entity(20L, "Payment API", "commerce", "prod");
        when(entityIdentityQueryService.findIdentities(10L)).thenReturn(List.of(
                identity(10L, "service.name", "checkout-api"),
                identity(10L, "service.name", "checkout")));
        when(traceQueryRepository.queryTraceServiceGraphRows(
                eq(1500), eq(1710000000000L), eq(1710003600000L), eq("prod"),
                argThat(serviceNames -> serviceNames != null
                        && serviceNames.contains("Checkout API")
                        && serviceNames.contains("checkout-api")
                        && serviceNames.contains("checkout")),
                eq(true)))
                .thenReturn(List.of(serviceGraphRow(
                        "checkout-api", "Payment API", 5L, 0L, 75D, 42D,
                        "trace-scope", "span-payment", "POST /pay",
                        "2026-05-20T04:01:00Z", "2026-05-20T04:08:00Z")));
        when(entityIdentityQueryService.findMatchingIdentities(argThat(keys ->
                keys != null && keys.contains("service.name")), argThat(values ->
                values != null && values.containsAll(Set.of("checkout api", "payment api"))))).thenReturn(List.of(
                identity(10L, "service.name", "checkout-api"),
                identity(20L, "service.name", "Payment API")));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.containsAll(Set.of(10L, 20L))))).thenReturn(List.of(checkout, payment));

        TraceCallTopologyReadModel readModel = traceCallTopologyQueryService.findTraceCallEdges(
                List.of(checkout), "prod", 1710000000000L, 1710003600000L);

        assertEquals(1, readModel.edges().size());
        TraceCallTopologyEdgeInfo edge = readModel.edges().getFirst();
        assertEquals(10L, edge.sourceEntityId());
        assertEquals(20L, edge.targetEntityId());
        assertEquals(5L, edge.redMetrics().requestCount());
        verify(traceQueryRepository, never()).queryRecentTraceRows(
                1500, 1710000000000L, 1710003600000L, null, "prod", true);
    }

    @Test
    void keepsHideInternalScopeWhenQueryingGreptimeServiceGraphAggregation() {
        ObserveEntity checkout = entity(10L, "checkout-api", "commerce", "prod");
        ObserveEntity hertzbeat = entity(30L, "hertzbeat", "platform", "prod");
        when(entityIdentityQueryService.findIdentities(10L)).thenReturn(List.of(
                identity(10L, "service.name", "checkout-api")));
        when(traceQueryRepository.queryTraceServiceGraphRows(
                eq(1500), eq(1710000000000L), eq(1710003600000L), eq("prod"),
                argThat(serviceNames -> serviceNames != null && serviceNames.contains("checkout-api")),
                eq(false)))
                .thenReturn(List.of(serviceGraphRow(
                        "checkout-api", "hertzbeat", 2L, 0L, 80D, 40D,
                        "trace-internal", "span-internal", "POST /internal",
                        "2026-05-20T03:29:00Z", "2026-05-20T03:30:00Z")));
        when(entityIdentityQueryService.findMatchingIdentities(argThat(keys ->
                keys != null && keys.contains("service.name")), argThat(values ->
                values != null && values.containsAll(Set.of("checkout api", "hertzbeat"))))).thenReturn(List.of(
                identity(10L, "service.name", "checkout-api"),
                identity(30L, "service.name", "hertzbeat")));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.containsAll(Set.of(10L, 30L))))).thenReturn(List.of(checkout, hertzbeat));

        TraceCallTopologyReadModel readModel = traceCallTopologyQueryService.findTraceCallEdges(
                List.of(checkout), "prod", 1710000000000L, 1710003600000L, false);

        assertEquals(1, readModel.edges().size());
        TraceCallTopologyEdgeInfo edge = readModel.edges().getFirst();
        assertEquals(10L, edge.sourceEntityId());
        assertEquals(30L, edge.targetEntityId());
        assertEquals("trace-internal", edge.traceId());
        verify(traceQueryRepository).queryTraceServiceGraphRows(
                eq(1500), eq(1710000000000L), eq(1710003600000L), eq("prod"),
                argThat(serviceNames -> serviceNames != null && serviceNames.contains("checkout-api")),
                eq(false));
        verify(traceQueryRepository, never()).queryRecentTraceRows(
                1500, 1710000000000L, 1710003600000L, null, "prod", false);
    }

    @Test
    void resolvesGreptimeServiceGraphRowsByAccessibleEntityNameWhenIdentityIsMissing() {
        ObserveEntity checkout = entity(10L, "Checkout API", "commerce", "prod");
        ObserveEntity payment = entity(20L, "Payment API", "commerce", "prod");
        ObserveEntity orders = entity(30L, "Orders DB", "commerce", "prod");
        when(entityIdentityQueryService.findIdentities(20L)).thenReturn(List.of());
        when(traceQueryRepository.queryTraceServiceGraphRows(
                eq(1500), eq(1710000000000L), eq(1710003600000L), eq("prod"),
                argThat(serviceNames -> serviceNames != null && serviceNames.contains("Payment API")),
                eq(true)))
                .thenReturn(List.of(
                        serviceGraphRow("Checkout API", "Payment API", 1L, 0L, 95D, 96D,
                                "trace-local", "span-payment", "POST /payments/authorize",
                                "2026-05-20T10:28:01Z", "2026-05-20T10:29:05Z"),
                        serviceGraphRow("Payment API", "Orders DB", 1L, 1L, 139D, 138D,
                                "trace-local", "span-orders", "SELECT orders",
                                "2026-05-20T10:28:03Z", "2026-05-20T10:29:05Z")));
        when(entityIdentityQueryService.findMatchingIdentities(argThat(keys ->
                keys != null && keys.contains("service.name")), argThat(values ->
                values != null && values.containsAll(Set.of("checkout api", "payment api", "orders db")))))
                .thenReturn(List.of());
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.isEmpty()))).thenReturn(List.of());
        when(entityWorkspaceAccessService.findAccessibleEntitiesForRequestWorkspace(any(Sort.class)))
                .thenReturn(List.of(checkout, payment, orders));

        TraceCallTopologyReadModel readModel = traceCallTopologyQueryService.findTraceCallEdges(
                List.of(payment), "prod", 1710000000000L, 1710003600000L);

        assertEquals(Set.of(10L, 20L, 30L), readModel.entityById().keySet());
        assertEquals(2, readModel.edges().size());
        assertEquals(10L, readModel.edges().get(0).sourceEntityId());
        assertEquals(20L, readModel.edges().get(0).targetEntityId());
        assertEquals(20L, readModel.edges().get(1).sourceEntityId());
        assertEquals(30L, readModel.edges().get(1).targetEntityId());
        assertEquals(1L, readModel.edges().get(1).redMetrics().errorCount());
        verify(traceQueryRepository, never()).queryRecentTraceRows(
                1500, 1710000000000L, 1710003600000L, null, "prod", true);
    }

    @Test
    void resolvesGreptimeServiceGraphRowsAcrossHumanLabelsAndSlugEntityNames() {
        ObserveEntity checkout = entity(10L, "checkout-api", "commerce", "prod");
        ObserveEntity payment = entity(20L, "payment-api", "commerce", "prod");
        ObserveEntity orders = entity(30L, "orders-db", "commerce", "prod");
        when(entityIdentityQueryService.findIdentities(20L)).thenReturn(List.of());
        when(traceQueryRepository.queryTraceServiceGraphRows(
                eq(1500), eq(1710000000000L), eq(1710003600000L), eq("prod"),
                argThat(serviceNames -> serviceNames != null && serviceNames.contains("payment-api")),
                eq(true)))
                .thenReturn(List.of(
                        serviceGraphRow("Checkout API", "Payment API", 1L, 0L, 95D, 96D,
                                "trace-local", "span-payment", "POST /payments/authorize",
                                "2026-05-20T10:28:01Z", "2026-05-20T10:29:05Z"),
                        serviceGraphRow("Payment API", "Orders DB", 1L, 1L, 139D, 138D,
                                "trace-local", "span-orders", "SELECT orders",
                                "2026-05-20T10:28:03Z", "2026-05-20T10:29:05Z")));
        when(entityIdentityQueryService.findMatchingIdentities(argThat(keys ->
                keys != null && keys.contains("service.name")), argThat(values ->
                values != null && values.containsAll(Set.of("checkout api", "payment api", "orders db")))))
                .thenReturn(List.of());
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.isEmpty()))).thenReturn(List.of());
        when(entityWorkspaceAccessService.findAccessibleEntitiesForRequestWorkspace(any(Sort.class)))
                .thenReturn(List.of(checkout, payment, orders));

        TraceCallTopologyReadModel readModel = traceCallTopologyQueryService.findTraceCallEdges(
                List.of(payment), "prod", 1710000000000L, 1710003600000L);

        assertEquals(Set.of(10L, 20L, 30L), readModel.entityById().keySet());
        assertEquals(2, readModel.edges().size());
        assertEquals(10L, readModel.edges().get(0).sourceEntityId());
        assertEquals(20L, readModel.edges().get(0).targetEntityId());
        assertEquals(20L, readModel.edges().get(1).sourceEntityId());
        assertEquals(30L, readModel.edges().get(1).targetEntityId());
        assertEquals(1L, readModel.edges().get(1).redMetrics().errorCount());
    }

    private static ObserveEntity entity(Long id, String name, String namespace, String environment) {
        return ObserveEntity.builder()
                .id(id)
                .type("service")
                .name(name)
                .namespace(namespace)
                .environment(environment)
                .status("healthy")
                .build();
    }

    private static EntityIdentity identity(Long entityId, String key, String value) {
        return EntityIdentity.builder()
                .entityId(entityId)
                .identityKey(key)
                .identityValue(value)
                .normalizedValue(value)
                .priority(100)
                .primaryIdentity(true)
                .build();
    }

    private static Map<String, Object> traceRow(String traceId,
                                                String spanId,
                                                String parentSpanId,
                                                String spanName,
                                                String serviceName,
                                                String status,
                                                Double durationMs) {
        return Map.of(
                "trace_id", traceId,
                "span_id", spanId,
                "parent_span_id", parentSpanId == null ? "" : parentSpanId,
                "span_name", spanName,
                "service_name", serviceName,
                "span_status_code", status,
                "duration_ms", durationMs,
                "resource_attributes", Map.of("service.name", serviceName)
        );
    }

    private static Map<String, Object> serviceGraphRow(String sourceService,
                                                       String targetService,
                                                       Long requestCount,
                                                       Long errorCount,
                                                       Double latencyP95Ms,
                                                       Double latencyAvgMs,
                                                       String traceId,
                                                       String spanId,
                                                       String spanName,
                                                       String firstSeen,
                                                       String lastSeen) {
        return Map.ofEntries(
                Map.entry("source_service_name", sourceService),
                Map.entry("target_service_name", targetService),
                Map.entry("request_count", requestCount),
                Map.entry("error_count", errorCount),
                Map.entry("latency_p95_ms", latencyP95Ms),
                Map.entry("latency_avg_ms", latencyAvgMs),
                Map.entry("sample_trace_id", traceId),
                Map.entry("sample_span_id", spanId),
                Map.entry("sample_span_name", spanName),
                Map.entry("first_seen", firstSeen),
                Map.entry("last_seen", lastSeen)
        );
    }
}
