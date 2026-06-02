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

package org.apache.hertzbeat.observability.traces.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceDetailDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceOverviewDto;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;
import org.apache.hertzbeat.warehouse.repository.TraceQueryRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class EntityTraceQueryServiceImplTest {

    @InjectMocks
    private EntityTraceQueryServiceImpl entityTraceQueryService;

    @Mock
    private TraceQueryRepository traceQueryRepository;

    @Mock
    private ObservabilityWorkspaceQueryGateway workspaceQueryGateway;

    @AfterEach
    void tearDown() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void buildEntityTraceSummaryAndHintsUseCanonicalIdentity() {
        long now = System.currentTimeMillis();
        ObservedEntityContext entityContext = ObservedEntityContext.from(
                ObserveEntity.builder().id(1L).type("service").name("checkout-service").build(),
                List.of(
                identity(1L, "service.name", "checkout-service", 100, true),
                identity(1L, "service.namespace", "commerce", 80, false)
        ));

        when(traceQueryRepository.queryRecentTraceRows(
                eq(1500), org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyLong(),
                eq("checkout-service"), eq("commerce"), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(false))).thenReturn(List.of(
                traceRow("trace-1", "span-root", null, "GET /checkout", "checkout-service", "STATUS_CODE_ERROR",
                        now - 60_000, 4_000_000L,
                        Map.of("service.name", "checkout-service", "service.namespace", "commerce",
                                "deployment.environment.name", "prod")),
                traceRow("trace-2", "span-root-2", null, "GET /payment", "payment-service", "STATUS_CODE_OK",
                        now - 120_000, 2_000_000L,
                        Map.of("service.name", "payment-service", "service.namespace", "payments"))
        ));

        EntityTraceSummaryDto summary = entityTraceQueryService.buildEntityTraceSummary(entityContext);
        List<EntityTraceQueryHintDto> hints = entityTraceQueryService.buildEntityTraceQueryHints(entityContext);

        assertEquals(1, summary.getRecentTraceCount());
        assertEquals(1, summary.getRecentErrorTraceCount());
        assertEquals("trace-1", summary.getLatestTraceId());
        assertTrue(summary.isActive());
        assertEquals(1, hints.size());
        assertEquals("checkout-service", hints.getFirst().getResourceFilters().get("service.name"));
        assertEquals("commerce", hints.getFirst().getResourceFilters().get("service.namespace"));
        assertTrue(hints.getFirst().getSearchTerms().contains("trace-1"));
        ArgumentCaptor<Map<String, Set<String>>> identityFilterCaptor = ArgumentCaptor.forClass(Map.class);
        verify(traceQueryRepository, atLeastOnce()).queryRecentTraceRows(
                eq(1500), org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyLong(),
                eq("checkout-service"), eq("commerce"), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), identityFilterCaptor.capture(), eq(false));
        assertEquals(Set.of("checkout-service"), identityFilterCaptor.getValue().get("service.name"));
        assertEquals(Set.of("commerce"), identityFilterCaptor.getValue().get("service.namespace"));
    }

    @Test
    void buildEntityTraceSummaryUsesGreptimeAggregateWhenRepositorySupportsIt() {
        long now = System.currentTimeMillis();
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        ObservedEntityContext entityContext = ObservedEntityContext.from(
                ObserveEntity.builder().id(1L).type("service").name("checkout-service").build(),
                List.of(
                        identity(1L, "service.name", "checkout-service", 100, true),
                        identity(1L, "service.namespace", "commerce", 80, false),
                        identity(1L, "host.name", "checkout-1", 50, false)
                ));
        when(traceQueryRepository.supportsTraceSummaryRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceSummaryRows(
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyLong(),
                eq("checkout-service"), eq("commerce"), org.mockito.ArgumentMatchers.isNull(),
                eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(false)))
                .thenReturn(Map.of(
                        "total_trace_count", 7L,
                        "error_trace_count", 2L,
                        "latest_observed_at", now - 30_000,
                        "latest_trace_id", "trace-latest"
                ));

        EntityTraceSummaryDto summary = entityTraceQueryService.buildEntityTraceSummary(entityContext);

        assertEquals(7, summary.getRecentTraceCount());
        assertEquals(2, summary.getRecentErrorTraceCount());
        assertEquals("trace-latest", summary.getLatestTraceId());
        assertEquals(now - 30_000, summary.getLatestObservedAt());
        assertTrue(summary.isActive());
        ArgumentCaptor<Map<String, Set<String>>> identityFilterCaptor = ArgumentCaptor.forClass(Map.class);
        verify(traceQueryRepository).queryTraceSummaryRows(
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyLong(),
                eq("checkout-service"), eq("commerce"), org.mockito.ArgumentMatchers.isNull(),
                eq("team-a"), identityFilterCaptor.capture(), eq(false));
        assertEquals(Set.of("checkout-service"), identityFilterCaptor.getValue().get("service.name"));
        assertEquals(Set.of("commerce"), identityFilterCaptor.getValue().get("service.namespace"));
        assertEquals(Set.of("checkout-1"), identityFilterCaptor.getValue().get("host.name"));
        verify(traceQueryRepository, never()).queryRecentTraceRows(
                eq(1500), org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void queryTraceListAndDetailRespectEntityBinding() {
        long now = System.currentTimeMillis();
        ObserveEntity entity = ObserveEntity.builder().id(1L).type("service").name("checkout-service").build();
        Map<String, Object> rootRow = traceRow("trace-1", "span-root", null, "GET /checkout", "checkout-service", "STATUS_CODE_OK",
                now - 20_000, 5_000_000L,
                Map.of("service.name", "checkout-service", "service.namespace", "commerce"));
        rootRow.put("span_kind", "SPAN_KIND_SERVER");
        rootRow.put("span_status_message", "upstream timeout recovered");
        rootRow.put("trace_state", "vendor=demo");
        rootRow.put("scope_name", "io.opentelemetry.auto.servlet");
        rootRow.put("scope_version", "2.5.0");
        rootRow.put("span_events", """
                [
                  {
                    "time_unix_nano": 1710000000000000123,
                    "name": "exception",
                    "attributes": {
                      "exception.type": "java.lang.IllegalStateException",
                      "retryable": true
                    },
                    "dropped_attributes_count": 1
                  }
                ]
                """);
        rootRow.put("span_links", """
                [
                  {
                    "trace_id": "fedcba0987654321fedcba0987654321",
                    "span_id": "1111111111111111",
                    "trace_state": "vendor=linked",
                    "attributes": {
                      "link.kind": "follows_from"
                    },
                    "dropped_attributes_count": 2
                  }
                ]
                """);
        Map<String, Object> childRow = traceRow("trace-1", "span-child", "span-root", "SELECT cart", "checkout-service", "STATUS_CODE_ERROR",
                now - 19_500, 1_000_000L,
                Map.of("service.name", "checkout-service", "service.namespace", "commerce"));
        List<Map<String, Object>> detailRows = List.of(rootRow, childRow);
        List<Map<String, Object>> listRows = List.of(
                traceRow("trace-1", "span-root", null, "GET /checkout", "checkout-service", "STATUS_CODE_OK",
                        now - 20_000, 5_000_000L,
                        Map.of("service.name", "checkout-service", "service.namespace", "commerce")),
                traceRow("trace-2", "span-root-2", null, "GET /payment", "payment-service", "STATUS_CODE_OK",
                        now - 60_000, 2_000_000L,
                        Map.of("service.name", "payment-service", "service.namespace", "payments"))
        );

        when(workspaceQueryGateway.findEntityById(1L)).thenReturn(Optional.of(entity));
        when(workspaceQueryGateway.findIdentitiesByEntityId(1L)).thenReturn(List.of(
                identity(1L, "service.name", "checkout-service", 100, true)
        ));
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1500), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(false))).thenReturn(listRows);
        when(traceQueryRepository.queryTraceRows(
                eq("trace-1"), eq(5000), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(false))).thenReturn(detailRows);

        var page = entityTraceQueryService.queryTraceList(1L, null, null, null, false, null, null, null, 0, 20);
        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(1L, "trace-1");

        assertEquals(1, page.getTotalElements());
        assertEquals("trace-1", page.getContent().getFirst().getTraceId());
        assertNotNull(detail);
        assertEquals("trace-1", detail.getTraceId());
        assertEquals(2, detail.getSpans().size());
        assertEquals("span-root", detail.getRootSpanId());
        assertEquals("span-child", detail.getSpans().get(1).getSpanId());
        assertEquals("SPAN_KIND_SERVER", detail.getSpans().getFirst().getSpanKind());
        assertEquals("upstream timeout recovered", detail.getSpans().getFirst().getStatusMessage());
        assertEquals("vendor=demo", detail.getSpans().getFirst().getTraceState());
        assertEquals("io.opentelemetry.auto.servlet", detail.getSpans().getFirst().getScopeName());
        assertEquals("2.5.0", detail.getSpans().getFirst().getScopeVersion());
        assertEquals(1, detail.getSpans().getFirst().getEvents().size());
        assertEquals("exception", detail.getSpans().getFirst().getEvents().getFirst().getName());
        assertEquals("java.lang.IllegalStateException",
                detail.getSpans().getFirst().getEvents().getFirst().getAttributes().get("exception.type"));
        assertEquals(1, detail.getSpans().getFirst().getLinks().size());
        assertEquals("fedcba0987654321fedcba0987654321", detail.getSpans().getFirst().getLinks().getFirst().getTraceId());
        assertEquals("follows_from", detail.getSpans().getFirst().getLinks().getFirst().getAttributes().get("link.kind"));
        ArgumentCaptor<Map<String, Set<String>>> detailIdentityFilterCaptor = ArgumentCaptor.forClass(Map.class);
        verify(traceQueryRepository).queryTraceRows(
                eq("trace-1"), eq(5000), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), detailIdentityFilterCaptor.capture(), eq(false));
        assertEquals(Set.of("checkout-service"), detailIdentityFilterCaptor.getValue().get("service.name"));
    }

    @Test
    void getTraceOverviewAggregatesErrorsAndRecentActivity() {
        long now = System.currentTimeMillis();
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1500), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(false))).thenReturn(List.of(
                traceRow("trace-1", "span-root", null, "GET /checkout", "checkout-service", "STATUS_CODE_ERROR",
                        now - 10_000, 3_000_000L,
                        Map.of("service.name", "checkout-service")),
                traceRow("trace-2", "span-root-2", null, "GET /inventory", "inventory-service", "STATUS_CODE_OK",
                        now - 200_000, 2_000_000L,
                        Map.of("service.name", "inventory-service"))
        ));

        TraceOverviewDto overview = entityTraceQueryService.getTraceOverview(null, null, null, null, false, null, null, null);

        assertEquals(2, overview.getTotalTraceCount());
        assertEquals(1, overview.getErrorTraceCount());
        assertTrue(overview.isHasActiveTrace());
        assertNotNull(overview.getLatestObservedAt());
    }

    @Test
    void queryTraceListCanHideInternalTraceNoise() {
        long now = System.currentTimeMillis();
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1500), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(true))).thenReturn(List.of(
                traceRow("trace-self", "span-root", null, "GET /internal", "hertzbeat", "STATUS_CODE_OK",
                        now - 10_000, 2_000_000L,
                        Map.of("service.name", "hertzbeat", "service.namespace", "platform")),
                traceRow("trace-user", "span-root-2", null, "GET /checkout", "checkout-service", "STATUS_CODE_OK",
                        now - 8_000, 3_000_000L,
                        Map.of("service.name", "checkout-service", "service.namespace", "commerce"))
        ));

        var page = entityTraceQueryService.queryTraceList(null, null, null, null, false, null, null, null, 0, 20, true);
        TraceOverviewDto overview = entityTraceQueryService.getTraceOverview(null, null, null, null, false, null, null, null, true);

        assertEquals(1, page.getTotalElements());
        assertEquals("trace-user", page.getContent().getFirst().getTraceId());
        assertEquals(1, overview.getTotalTraceCount());
        assertTrue(overview.isHasActiveTrace());
        verify(traceQueryRepository, atLeastOnce()).queryRecentTraceRows(
                eq(1500), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(true));
    }

    @Test
    void queryTraceListUsesRepositoryForTraceRows() {
        long now = System.currentTimeMillis();
        List<Map<String, Object>> rows = List.of(
                traceRow("trace-http", "span-root", null, "GET /checkout", "checkout-service", "STATUS_CODE_OK",
                        now - 5_000, 5_000_000L, Map.of("service.name", "checkout-service"))
        );
        when(traceQueryRepository.queryTraceRows("trace-http", 5000)).thenReturn(rows);

        var page = entityTraceQueryService.queryTraceList(null, null, null, "trace-http", false, null, null, null, 0, 20, false);
        TraceOverviewDto overview = entityTraceQueryService.getTraceOverview(null, null, null, "trace-http", false, null, null, null, false);
        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-http");

        assertEquals(1, page.getTotalElements());
        assertEquals("trace-http", page.getContent().getFirst().getTraceId());
        assertEquals(1, overview.getTotalTraceCount());
        assertNotNull(detail);
        assertEquals("trace-http", detail.getTraceId());
        assertEquals(1, detail.getSpans().size());
        verify(traceQueryRepository, atLeastOnce()).queryTraceRows("trace-http", 5000);
        verify(traceQueryRepository, never()).queryRecentTraceRows(1500, null, false);
    }

    @Test
    void queryTraceListUsesRootSpanServiceWhenChildSpanAppearsFirst() {
        long now = System.currentTimeMillis();
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1500), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("recommendation"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(true))).thenReturn(List.of(
                traceRow("trace-rec", "span-child", "span-root", "Lookup products", "product-catalog", "STATUS_CODE_OK",
                        now - 5_000, 900_000L,
                        Map.of("service.name", "product-catalog", "service.namespace", "opentelemetry-demo")),
                traceRow("trace-rec", "span-root", null, "/oteldemo.RecommendationService/ListRecommendations",
                        "recommendation", "STATUS_CODE_OK",
                        now - 6_000, 4_000_000L,
                        Map.of("service.name", "recommendation", "service.namespace", "opentelemetry-demo"))
        ));

        var page = entityTraceQueryService.queryTraceList(null, null, null, null,
                false, "recommendation", null, null, 0, 20, true);

        assertEquals(1, page.getTotalElements());
        assertEquals("recommendation", page.getContent().getFirst().getServiceName());
        assertEquals("/oteldemo.RecommendationService/ListRecommendations",
                page.getContent().getFirst().getRootSpanName());
        verify(traceQueryRepository).queryRecentTraceRows(
                eq(1500), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("recommendation"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(true));
    }

    @Test
    void queryTraceListPushesWorkspaceTimeEnvironmentAndEntityFiltersToRepository() {
        long now = System.currentTimeMillis();
        long start = now - 60_000;
        long end = now;
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        ObserveEntity entity = ObserveEntity.builder().id(1L).type("service").name("checkout-service").build();
        when(workspaceQueryGateway.findEntityById(1L)).thenReturn(Optional.of(entity));
        when(workspaceQueryGateway.findIdentitiesByEntityId(1L)).thenReturn(List.of(
                identity(1L, "service.name", "checkout-service", 100, true),
                identity(1L, "service.namespace", "commerce", 80, false),
                identity(1L, "host.name", "checkout-1", 50, false)
        ));
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1500), eq(start), eq(end), eq("checkout-service"), eq("commerce"),
                eq("prod"), eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(true)))
                .thenReturn(List.of(traceRow("trace-1", "span-root", null, "GET /checkout",
                        "checkout-service", "STATUS_CODE_OK", now - 10_000, 2_000_000L,
                        Map.of("service.name", "checkout-service",
                                "service.namespace", "commerce",
                                "host.name", "checkout-1",
                                "deployment.environment.name", "prod",
                                "hertzbeat.workspace_id", "team-a"))));

        var page = entityTraceQueryService.queryTraceList(1L, start, end, null,
                false, "checkout-service", "commerce", "prod", 0, 20, true);

        assertEquals(1, page.getTotalElements());
        assertEquals("trace-1", page.getContent().getFirst().getTraceId());
        ArgumentCaptor<Map<String, Set<String>>> identityFilterCaptor = ArgumentCaptor.forClass(Map.class);
        verify(traceQueryRepository).queryRecentTraceRows(
                eq(1500), eq(start), eq(end), eq("checkout-service"), eq("commerce"),
                eq("prod"), eq("team-a"), identityFilterCaptor.capture(), eq(true));
        Map<String, Set<String>> pushedIdentityFilters = identityFilterCaptor.getValue();
        assertEquals(Set.of("checkout-service"), pushedIdentityFilters.get("service.name"));
        assertEquals(Set.of("commerce"), pushedIdentityFilters.get("service.namespace"));
        assertEquals(Set.of("checkout-1"), pushedIdentityFilters.get("host.name"));
    }

    @Test
    void queryTraceListUsesGreptimeGroupedPaginationWhenRepositorySupportsIt() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        ObserveEntity entity = ObserveEntity.builder().id(1L).type("service").name("checkout-service").build();
        when(workspaceQueryGateway.findEntityById(1L)).thenReturn(Optional.of(entity));
        when(workspaceQueryGateway.findIdentitiesByEntityId(1L)).thenReturn(List.of(
                identity(1L, "service.name", "checkout-service", 100, true),
                identity(1L, "service.namespace", "commerce", 80, false)
        ));
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceListRows(
                eq(start), eq(end), eq(true), eq("checkout-service"), eq("commerce"),
                eq("prod"), eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(true), eq(40), eq(20))).thenReturn(List.of(traceListRow(
                "trace-page-3",
                "span-root",
                "/checkout",
                "checkout-service",
                "commerce",
                "STATUS_CODE_ERROR",
                now - 30_000,
                8_000_000L,
                2,
                41L,
                Map.of("service.name", "checkout-service",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod",
                        "hertzbeat.workspace_id", "team-a"))));

        var page = entityTraceQueryService.queryTraceList(1L, start, end, null,
                true, "checkout-service", "commerce", "prod", 2, 20, true);

        assertEquals(41L, page.getTotalElements());
        assertEquals(2, page.getNumber());
        assertEquals("trace-page-3", page.getContent().getFirst().getTraceId());
        assertEquals("checkout-service", page.getContent().getFirst().getServiceName());
        assertEquals("commerce", page.getContent().getFirst().getServiceNamespace());
        assertEquals("error", page.getContent().getFirst().getStatus());
        assertEquals(2, page.getContent().getFirst().getErrorSpanCount());
        verify(traceQueryRepository, never()).queryRecentTraceRows(
                eq(1500), eq(start), eq(end), eq("checkout-service"), eq("commerce"),
                eq("prod"), eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(true));
    }

    @Test
    void getTraceOverviewUsesGreptimeAggregateWhenRepositorySupportsIt() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        ObserveEntity entity = ObserveEntity.builder().id(1L).type("service").name("checkout-service").build();
        when(workspaceQueryGateway.findEntityById(1L)).thenReturn(Optional.of(entity));
        when(workspaceQueryGateway.findIdentitiesByEntityId(1L)).thenReturn(List.of(
                identity(1L, "service.name", "checkout-service", 100, true),
                identity(1L, "service.namespace", "commerce", 80, false)
        ));
        when(traceQueryRepository.supportsTraceOverviewRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceOverviewRows(
                eq(start), eq(end), eq(true), eq("checkout-service"), eq("commerce"),
                eq("prod"), eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(true))).thenReturn(Map.of(
                "total_trace_count", 41L,
                "error_trace_count", 41L,
                "latest_observed_at", now - 30_000
        ));

        TraceOverviewDto overview = entityTraceQueryService.getTraceOverview(1L, start, end, null,
                true, "checkout-service", "commerce", "prod", true);

        assertEquals(41, overview.getTotalTraceCount());
        assertEquals(41, overview.getErrorTraceCount());
        assertEquals(now - 30_000, overview.getLatestObservedAt());
        assertTrue(overview.isHasActiveTrace());
        ArgumentCaptor<Map<String, Set<String>>> identityFilterCaptor = ArgumentCaptor.forClass(Map.class);
        verify(traceQueryRepository).queryTraceOverviewRows(
                eq(start), eq(end), eq(true), eq("checkout-service"), eq("commerce"),
                eq("prod"), eq("team-a"), identityFilterCaptor.capture(), eq(true));
        assertEquals(Set.of("checkout-service"), identityFilterCaptor.getValue().get("service.name"));
        assertEquals(Set.of("commerce"), identityFilterCaptor.getValue().get("service.namespace"));
        verify(traceQueryRepository, never()).queryTraceListRows(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyInt());
        verify(traceQueryRepository, never()).queryRecentTraceRows(
                eq(1500), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void getTraceOverviewUsesGreptimeTraceIdAggregateWhenRepositorySupportsIt() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        ObserveEntity entity = ObserveEntity.builder().id(1L).type("service").name("checkout-service").build();
        when(workspaceQueryGateway.findEntityById(1L)).thenReturn(Optional.of(entity));
        when(workspaceQueryGateway.findIdentitiesByEntityId(1L)).thenReturn(List.of(
                identity(1L, "service.name", "checkout-service", 100, true),
                identity(1L, "service.namespace", "commerce", 80, false)
        ));
        when(traceQueryRepository.supportsTraceIdOverviewRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceIdOverviewRows(
                eq("trace-filtered"), eq(start), eq(end), eq(true), eq("checkout-service"), eq("commerce"),
                eq("prod"), eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(true))).thenReturn(Map.of(
                "total_trace_count", 1L,
                "error_trace_count", 1L,
                "latest_observed_at", now - 30_000
        ));

        TraceOverviewDto overview = entityTraceQueryService.getTraceOverview(1L, start, end, "trace-filtered",
                true, "checkout-service", "commerce", "prod", true);

        assertEquals(1, overview.getTotalTraceCount());
        assertEquals(1, overview.getErrorTraceCount());
        assertEquals(now - 30_000, overview.getLatestObservedAt());
        assertTrue(overview.isHasActiveTrace());
        ArgumentCaptor<Map<String, Set<String>>> identityFilterCaptor = ArgumentCaptor.forClass(Map.class);
        verify(traceQueryRepository).queryTraceIdOverviewRows(
                eq("trace-filtered"), eq(start), eq(end), eq(true), eq("checkout-service"), eq("commerce"),
                eq("prod"), eq("team-a"), identityFilterCaptor.capture(), eq(true));
        assertEquals(Set.of("checkout-service"), identityFilterCaptor.getValue().get("service.name"));
        assertEquals(Set.of("commerce"), identityFilterCaptor.getValue().get("service.namespace"));
        verify(traceQueryRepository, never()).queryTraceRows(
                eq("trace-filtered"), eq(5000), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void queryTraceListPushesTraceIdFiltersToRepository() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        ObserveEntity entity = ObserveEntity.builder().id(1L).type("service").name("checkout-service").build();
        when(workspaceQueryGateway.findEntityById(1L)).thenReturn(Optional.of(entity));
        when(workspaceQueryGateway.findIdentitiesByEntityId(1L)).thenReturn(List.of(
                identity(1L, "service.name", "checkout-service", 100, true),
                identity(1L, "service.namespace", "commerce", 80, false)
        ));
        when(traceQueryRepository.queryTraceRows(
                eq("trace-filtered"), eq(5000), eq(start), eq(end), eq("checkout-service"), eq("commerce"),
                eq("prod"), eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(true)))
                .thenReturn(List.of(traceRow("trace-filtered", "span-root", null, "GET /checkout",
                        "checkout-service", "STATUS_CODE_ERROR", now - 30_000, 8_000_000L,
                        Map.of("service.name", "checkout-service",
                                "service.namespace", "commerce",
                                "deployment.environment.name", "prod",
                                "hertzbeat.workspace_id", "team-a"))));

        var page = entityTraceQueryService.queryTraceList(1L, start, end, "trace-filtered",
                true, "checkout-service", "commerce", "prod", 0, 20, true);

        assertEquals(1, page.getTotalElements());
        assertEquals("trace-filtered", page.getContent().getFirst().getTraceId());
        ArgumentCaptor<Map<String, Set<String>>> identityFilterCaptor = ArgumentCaptor.forClass(Map.class);
        verify(traceQueryRepository).queryTraceRows(
                eq("trace-filtered"), eq(5000), eq(start), eq(end), eq("checkout-service"), eq("commerce"),
                eq("prod"), eq("team-a"), identityFilterCaptor.capture(), eq(true));
        assertEquals(Set.of("checkout-service"), identityFilterCaptor.getValue().get("service.name"));
        assertEquals(Set.of("commerce"), identityFilterCaptor.getValue().get("service.namespace"));
        verify(traceQueryRepository, never()).queryRecentTraceRows(
                eq(1500), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void queryTraceListAndOverviewUseRequestWorkspaceContext() {
        long now = System.currentTimeMillis();
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1500), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("team-a"),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(false))).thenReturn(List.of(
                traceRow("trace-team-a", "span-root-a", null, "GET /checkout", "checkout-service", "STATUS_CODE_OK",
                        now - 10_000, 2_000_000L,
                        Map.of("service.name", "checkout-service", "hertzbeat.workspace_id", "team-a")),
                traceRow("trace-team-b", "span-root-b", null, "GET /payment", "payment-service", "STATUS_CODE_ERROR",
                        now - 8_000, 3_000_000L,
                        Map.of("service.name", "payment-service", "hertzbeat.workspace_id", "team-b"))
        ));

        var page = entityTraceQueryService.queryTraceList(null, null, null, null,
                false, null, null, null, 0, 20, false);
        TraceOverviewDto overview = entityTraceQueryService.getTraceOverview(null, null, null, null,
                false, null, null, null, false);

        assertEquals(1, page.getTotalElements());
        assertEquals("trace-team-a", page.getContent().getFirst().getTraceId());
        assertEquals(1, overview.getTotalTraceCount());
        assertEquals(0, overview.getErrorTraceCount());
    }

    @Test
    void getTraceDetailAndSpansUseRequestWorkspaceContext() {
        long now = System.currentTimeMillis();
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(traceQueryRepository.queryTraceRows(
                eq("trace-shared"), eq(5000), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), eq("team-a"),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(false))).thenReturn(List.of(
                traceRow("trace-shared", "span-root-b", null, "GET /payment", "payment-service", "STATUS_CODE_OK",
                        now - 10_000, 2_000_000L,
                        Map.of("service.name", "payment-service", "hertzbeat.workspace_id", "team-b"))
        ));

        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-shared");

        assertNull(detail);
        assertTrue(entityTraceQueryService.getTraceSpans(null, "trace-shared").isEmpty());
    }

    @Test
    void getTraceDetailParsesOtlpKeyValueResourceAttributesForHertzBeatAttribution() {
        long now = System.currentTimeMillis();
        Map<String, Object> row = traceRow("trace-attribution", "span-root", null, "POST /checkout",
                "checkout", "STATUS_CODE_OK", now, 4_000_000L, Map.of());
        row.put("resource_attributes", List.of(
                Map.of("key", "service.namespace", "value", Map.of("stringValue", "payments")),
                Map.of("key", "deployment.environment.name", "value", Map.of("stringValue", "prod-east")),
                Map.of("key", "hertzbeat.entity_id", "value", Map.of("stringValue", "4200")),
                Map.of("key", "hertzbeat.entity_name", "value", Map.of("stringValue", "Checkout API")),
                Map.of("key", "hertzbeat.collector", "value", Map.of("stringValue", "collector-a")),
                Map.of("key", "hertzbeat.template", "value", Map.of("stringValue", "spring-boot"))
        ));
        row.put("span_attributes", List.of(
                Map.of("key", "db.statement", "value", Map.of("stringValue", "select 1"))
        ));
        when(traceQueryRepository.queryTraceRows("trace-attribution", 5000)).thenReturn(List.of(row));

        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-attribution");

        assertNotNull(detail);
        assertEquals("4200", detail.getResourceAttributes().get("hertzbeat.entity_id"));
        assertEquals("Checkout API", detail.getResourceAttributes().get("hertzbeat.entity_name"));
        assertEquals("collector-a", detail.getResourceAttributes().get("hertzbeat.collector"));
        assertEquals("spring-boot", detail.getResourceAttributes().get("hertzbeat.template"));
        assertEquals("payments", detail.getServiceNamespace());
        assertEquals("prod-east", detail.getResourceAttributes().get("deployment.environment.name"));
        assertEquals("select 1", detail.getSpans().getFirst().getSpanAttributes().get("db.statement"));
    }

    @Test
    void traceDetailClampsUnsignedGreptimeDurationInsteadOfWrappingNegative() {
        Map<String, Object> row = traceRow("trace-unsigned-duration", "span-root", null, "GET /checkout",
                "checkout-service", "STATUS_CODE_OK", System.currentTimeMillis(), 1L,
                Map.of("service.name", "checkout-service"));
        row.put("duration_nano", BigInteger.valueOf(Long.MAX_VALUE).add(BigInteger.ONE));
        when(traceQueryRepository.queryTraceRows("trace-unsigned-duration", 5000)).thenReturn(List.of(row));

        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-unsigned-duration");

        assertNotNull(detail);
        assertEquals(Long.MAX_VALUE, detail.getDurationNanos());
        assertEquals(Long.MAX_VALUE, detail.getSpans().getFirst().getDurationNanos());
    }

    @Test
    void traceDetailClampsDecimalGreptimeDurationInsteadOfWrappingNegative() {
        Map<String, Object> row = traceRow("trace-decimal-duration", "span-root", null, "GET /checkout",
                "checkout-service", "STATUS_CODE_OK", System.currentTimeMillis(), 1L,
                Map.of("service.name", "checkout-service"));
        row.put("duration_nano", BigDecimal.valueOf(Long.MAX_VALUE).add(BigDecimal.ONE));
        when(traceQueryRepository.queryTraceRows("trace-decimal-duration", 5000)).thenReturn(List.of(row));

        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-decimal-duration");

        assertNotNull(detail);
        assertEquals(Long.MAX_VALUE, detail.getDurationNanos());
        assertEquals(Long.MAX_VALUE, detail.getSpans().getFirst().getDurationNanos());
    }

    @Test
    void traceDetailClampsNegativeGreptimeDurationToZero() {
        Map<String, Object> row = traceRow("trace-negative-duration", "span-root", null, "GET /checkout",
                "checkout-service", "STATUS_CODE_OK", System.currentTimeMillis(), 1L,
                Map.of("service.name", "checkout-service"));
        row.put("duration_nano", -1L);
        when(traceQueryRepository.queryTraceRows("trace-negative-duration", 5000)).thenReturn(List.of(row));

        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-negative-duration");

        assertNotNull(detail);
        assertEquals(0L, detail.getDurationNanos());
        assertEquals(0L, detail.getSpans().getFirst().getDurationNanos());
    }

    @Test
    void traceDetailClampsOversizedDroppedAttributeCountsFromGreptimeJson() {
        Map<String, Object> row = traceRow("trace-dropped-count", "span-root", null, "GET /checkout",
                "checkout-service", "STATUS_CODE_OK", System.currentTimeMillis(), 1L,
                Map.of("service.name", "checkout-service"));
        row.put("span_events", """
                [
                  {
                    "time_unix_nano": 1710000000000000123,
                    "name": "large-event",
                    "attributes": {},
                    "dropped_attributes_count": "2147483648"
                  }
                ]
                """);
        row.put("span_links", """
                [
                  {
                    "trace_id": "fedcba0987654321fedcba0987654321",
                    "span_id": "1111111111111111",
                    "attributes": {},
                    "dropped_attributes_count": "2147483648"
                  }
                ]
                """);
        when(traceQueryRepository.queryTraceRows("trace-dropped-count", 5000)).thenReturn(List.of(row));

        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-dropped-count");

        assertNotNull(detail);
        assertEquals(Integer.MAX_VALUE,
                detail.getSpans().getFirst().getEvents().getFirst().getDroppedAttributesCount());
        assertEquals(Integer.MAX_VALUE,
                detail.getSpans().getFirst().getLinks().getFirst().getDroppedAttributesCount());
    }

    @Test
    void traceDetailClampsNegativeDroppedAttributeCountsFromGreptimeJson() {
        Map<String, Object> row = traceRow("trace-negative-dropped-count", "span-root", null, "GET /checkout",
                "checkout-service", "STATUS_CODE_OK", System.currentTimeMillis(), 1L,
                Map.of("service.name", "checkout-service"));
        row.put("span_events", """
                [
                  {
                    "time_unix_nano": 1710000000000000123,
                    "name": "negative-event",
                    "attributes": {},
                    "dropped_attributes_count": "-1"
                  }
                ]
                """);
        row.put("span_links", """
                [
                  {
                    "trace_id": "fedcba0987654321fedcba0987654321",
                    "span_id": "1111111111111111",
                    "attributes": {},
                    "dropped_attributes_count": "-1"
                  }
                ]
                """);
        when(traceQueryRepository.queryTraceRows("trace-negative-dropped-count", 5000)).thenReturn(List.of(row));

        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-negative-dropped-count");

        assertNotNull(detail);
        assertEquals(0, detail.getSpans().getFirst().getEvents().getFirst().getDroppedAttributesCount());
        assertEquals(0, detail.getSpans().getFirst().getLinks().getFirst().getDroppedAttributesCount());
    }

    @Test
    void traceDetailPreservesNumericEpochMillisTimestampFromGreptimeRows() {
        long timestampMillis = Instant.parse("2026-05-13T00:47:00Z").toEpochMilli();
        Map<String, Object> row = traceRow("trace-epoch-millis", "span-root", null, "GET /checkout",
                "checkout-service", "STATUS_CODE_OK", timestampMillis, 5_000_000L,
                Map.of("service.name", "checkout-service"));
        row.put("timestamp", timestampMillis);
        when(traceQueryRepository.queryTraceRows("trace-epoch-millis", 5000)).thenReturn(List.of(row));

        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-epoch-millis");

        assertNotNull(detail);
        assertEquals(timestampMillis, detail.getStartTime());
        assertEquals(timestampMillis, detail.getSpans().getFirst().getStartTime());
    }

    @Test
    void traceDetailPreservesNumericStringEpochMillisTimestampFromGreptimeRows() {
        long timestampMillis = Instant.parse("2026-05-13T00:59:00Z").toEpochMilli();
        Map<String, Object> row = traceRow("trace-epoch-millis-string", "span-root", null, "GET /checkout",
                "checkout-service", "STATUS_CODE_OK", timestampMillis, 5_000_000L,
                Map.of("service.name", "checkout-service"));
        row.put("timestamp", Long.toString(timestampMillis));
        when(traceQueryRepository.queryTraceRows("trace-epoch-millis-string", 5000)).thenReturn(List.of(row));

        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-epoch-millis-string");

        assertNotNull(detail);
        assertEquals(timestampMillis, detail.getStartTime());
        assertEquals(timestampMillis, detail.getSpans().getFirst().getStartTime());
    }

    @Test
    void traceDetailParsesGreptimeTimestampStringWithOffsetAndSpaceSeparator() {
        long timestampMillis = Instant.parse("2026-05-13T01:04:00Z").toEpochMilli();
        Map<String, Object> row = traceRow("trace-offset-timestamp", "span-root", null, "GET /checkout",
                "checkout-service", "STATUS_CODE_OK", timestampMillis, 5_000_000L,
                Map.of("service.name", "checkout-service"));
        row.put("timestamp", "2026-05-13 01:04:00+00:00");
        when(traceQueryRepository.queryTraceRows("trace-offset-timestamp", 5000)).thenReturn(List.of(row));

        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-offset-timestamp");

        assertNotNull(detail);
        assertEquals(timestampMillis, detail.getStartTime());
        assertEquals(timestampMillis, detail.getSpans().getFirst().getStartTime());
    }

    @Test
    void traceDetailPreservesZonedDateTimeTimestampFromGreptimeRows() {
        long timestampMillis = Instant.parse("2026-05-13T02:05:00Z").toEpochMilli();
        Map<String, Object> row = traceRow("trace-zoned-timestamp", "span-root", null, "GET /checkout",
                "checkout-service", "STATUS_CODE_OK", timestampMillis, 5_000_000L,
                Map.of("service.name", "checkout-service"));
        row.put("timestamp", ZonedDateTime.parse("2026-05-13T02:05:00Z[UTC]"));
        when(traceQueryRepository.queryTraceRows("trace-zoned-timestamp", 5000)).thenReturn(List.of(row));

        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-zoned-timestamp");

        assertNotNull(detail);
        assertEquals(timestampMillis, detail.getStartTime());
        assertEquals(timestampMillis, detail.getSpans().getFirst().getStartTime());
    }

    @Test
    void traceDetailPreservesSqlDateTimestampFromGreptimeRows() {
        java.sql.Date timestampDate = java.sql.Date.valueOf("2026-05-13");
        Map<String, Object> row = traceRow("trace-sql-date-timestamp", "span-root", null, "GET /checkout",
                "checkout-service", "STATUS_CODE_OK", timestampDate.getTime(), 5_000_000L,
                Map.of("service.name", "checkout-service"));
        row.put("timestamp", timestampDate);
        when(traceQueryRepository.queryTraceRows("trace-sql-date-timestamp", 5000)).thenReturn(List.of(row));

        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-sql-date-timestamp");

        assertNotNull(detail);
        assertEquals(timestampDate.getTime(), detail.getStartTime());
        assertEquals(timestampDate.getTime(), detail.getSpans().getFirst().getStartTime());
    }

    @Test
    void traceDetailRetainsOrphanSpanWhenParentSpanIsMissingFromGreptimeRows() {
        long now = System.currentTimeMillis();
        Map<String, Object> rootRow = traceRow("trace-orphan", "span-root", null, "GET /checkout",
                "checkout-service", "STATUS_CODE_OK", now, 5_000_000L,
                Map.of("service.name", "checkout-service"));
        Map<String, Object> orphanRow = traceRow("trace-orphan", "span-orphan", "span-missing", "SELECT cart",
                "checkout-service", "STATUS_CODE_ERROR", now + 500, 1_000_000L,
                Map.of("service.name", "checkout-service"));
        when(traceQueryRepository.queryTraceRows("trace-orphan", 5000)).thenReturn(List.of(rootRow, orphanRow));

        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-orphan");

        assertNotNull(detail);
        assertEquals(2, detail.getSpans().size());
        assertEquals("span-root", detail.getSpans().getFirst().getSpanId());
        assertEquals("span-orphan", detail.getSpans().get(1).getSpanId());
        assertEquals(1, detail.getErrorSpanCount());
    }

    private EntityIdentity identity(Long entityId, String key, String value, int priority, boolean primary) {
        return EntityIdentity.builder()
                .entityId(entityId)
                .identityKey(key)
                .identityValue(value)
                .normalizedValue(value)
                .priority(priority)
                .primaryIdentity(primary)
                .build();
    }

    private Map<String, Object> traceRow(String traceId, String spanId, String parentSpanId, String spanName,
                                         String serviceName, String status, long timestampMillis, long durationNanos,
                                         Map<String, String> resourceAttributes) {
        Map<String, Object> row = new HashMap<>();
        row.put("trace_id", traceId);
        row.put("span_id", spanId);
        row.put("parent_span_id", parentSpanId);
        row.put("span_name", spanName);
        row.put("service_name", serviceName);
        row.put("span_status_code", status);
        row.put("duration_nano", durationNanos);
        row.put("timestamp", Timestamp.from(Instant.ofEpochMilli(timestampMillis)));
        row.put("resource_attributes", resourceAttributes);
        row.put("span_attributes", Map.of("db.statement", "select 1"));
        return row;
    }

    private Map<String, Object> traceListRow(String traceId, String rootSpanId, String rootSpanName,
                                             String serviceName, String serviceNamespace, String status,
                                             long timestampMillis, long durationNanos, int errorSpanCount,
                                             long totalCount, Map<String, String> resourceAttributes) {
        Map<String, Object> row = traceRow(traceId, rootSpanId, null, rootSpanName, serviceName, status,
                timestampMillis, durationNanos, resourceAttributes);
        row.put("root_span_id", rootSpanId);
        row.put("root_span_name", rootSpanName);
        row.put("service_namespace", serviceNamespace);
        row.put("error_span_count", errorSpanCount);
        row.put("total_count", totalCount);
        return row;
    }
}
