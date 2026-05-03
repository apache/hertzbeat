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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceDetailDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceOverviewDto;
import org.apache.hertzbeat.warehouse.repository.TraceQueryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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

    @Test
    void buildEntityTraceSummaryAndHintsUseCanonicalIdentity() {
        long now = System.currentTimeMillis();
        ObservedEntityContext entityContext = ObservedEntityContext.from(
                ObserveEntity.builder().id(1L).type("service").name("checkout-service").build(),
                List.of(
                identity(1L, "service.name", "checkout-service", 100, true),
                identity(1L, "service.namespace", "commerce", 80, false)
        ));

        when(traceQueryRepository.queryRecentTraceRows(1500)).thenReturn(List.of(
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
        when(traceQueryRepository.queryRecentTraceRows(1500, null, false)).thenReturn(listRows);
        when(traceQueryRepository.queryTraceRows("trace-1", 5000)).thenReturn(detailRows);

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
    }

    @Test
    void getTraceOverviewAggregatesErrorsAndRecentActivity() {
        long now = System.currentTimeMillis();
        when(traceQueryRepository.queryRecentTraceRows(1500, null, false)).thenReturn(List.of(
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
        when(traceQueryRepository.queryRecentTraceRows(1500, null, true)).thenReturn(List.of(
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
        verify(traceQueryRepository, atLeastOnce()).queryRecentTraceRows(1500, null, true);
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
        when(traceQueryRepository.queryRecentTraceRows(1500, "recommendation", true)).thenReturn(List.of(
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
        verify(traceQueryRepository).queryRecentTraceRows(1500, "recommendation", true);
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
}
