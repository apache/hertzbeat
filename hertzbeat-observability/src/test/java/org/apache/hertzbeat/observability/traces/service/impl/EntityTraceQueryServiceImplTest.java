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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.ArrayList;
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
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.observability.traces.dto.TraceListPageDto;
import org.apache.hertzbeat.observability.traces.dto.TraceStructureQuery;
import org.apache.hertzbeat.common.observability.dto.trace.TraceOverviewDto;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.warehouse.repository.TraceQueryRepository;
import org.apache.hertzbeat.warehouse.repository.TraceQueryRepository.TraceRowQuery;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.apache.hertzbeat.warehouse.repository.TraceQueryRepository.TraceSort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;

@ExtendWith(MockitoExtension.class)
class EntityTraceQueryServiceImplTest {

    @InjectMocks
    private EntityTraceQueryServiceImpl entityTraceQueryService;

    @Mock
    private TraceQueryRepository traceQueryRepository;

    @Mock
    private ObservabilityWorkspaceQueryGateway workspaceQueryGateway;

    @BeforeEach
    void setUp() {
        AuthTokenRequestContext.bindWorkspaceId("default");
    }

    @AfterEach
    void tearDown() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void structuralQueryKeepsDistinctSpanRelationshipsAndBoundedCoverage() {
        List<Map<String, Object>> rows = List.of(
                traceRow("trace-direct", "root-a", null, "POST /checkout", "checkout", "OK", 1500L, 100L, Map.of()),
                traceRow("trace-direct", "child-a", "root-a", "SELECT cart_items", "cart", "ERROR", 1501L, 50L, Map.of()),
                traceRow("trace-indirect", "root-b", null, "POST /checkout", "checkout", "OK", 1600L, 100L, Map.of()),
                traceRow("trace-indirect", "middle-b", "root-b", "authorize", "payment", "OK", 1601L, 50L, Map.of()),
                traceRow("trace-indirect", "child-b", "middle-b", "SELECT cart_items", "cart", "ERROR", 1602L, 20L, Map.of()));
        when(traceQueryRepository.queryRecentTraceRows(1501, 1000L, 2000L, null, null, null, null, null, null,
                "default", Map.of(), false)).thenReturn(rows);
        var left = new TraceStructureQuery.Clause("checkout", "POST /checkout", null);
        var right = new TraceStructureQuery.Clause("cart", null, "ERROR");
        var direct = entityTraceQueryService.queryTraceStructure("default",
                new TraceStructureQuery(1000L, 2000L, left, right, TraceStructureQuery.Relation.DIRECT, 0, 20));
        assertEquals(List.of("trace-direct"), direct.getContent().stream().map(TraceListItemDto::getTraceId).toList());
        assertEquals("bounded", ((TraceListPageDto) direct).getQuery().coverage());
        var upstream = entityTraceQueryService.queryTraceStructure("default",
                new TraceStructureQuery(1000L, 2000L, left, right, TraceStructureQuery.Relation.UPSTREAM, 0, 20));
        assertEquals(2, upstream.getTotalElements());
        var analysis = entityTraceQueryService.queryTraceStructureAnalysis("default",
                new TraceStructureQuery(1000L, 2000L, left, right, TraceStructureQuery.Relation.DIRECT, 0, 20));
        assertEquals(1, analysis.matchedTraces());
        assertEquals(5, analysis.scannedRows());
        assertEquals("checkout", analysis.edges().getFirst().sourceService());
        assertEquals("cart", analysis.edges().getFirst().targetService());
        assertEquals("trace-direct", analysis.edges().getFirst().exampleTraceId());
    }

    @Test
    void structuralQueryMarksAnEmptyBoundedSampleAsTruncated() {
        List<Map<String, Object>> rows = java.util.stream.IntStream.range(0, 1501)
                .mapToObj(index -> traceRow("trace-" + index, "root-" + index, null, "other", "other", "OK",
                        1500L, 100L, Map.of()))
                .toList();
        when(traceQueryRepository.queryRecentTraceRows(1501, 1000L, 2000L, null, null, null, null, null, null,
                "default", Map.of(), false)).thenReturn(rows);
        var page = entityTraceQueryService.queryTraceStructure("default", new TraceStructureQuery(1000L, 2000L,
                new TraceStructureQuery.Clause("checkout", null, null),
                new TraceStructureQuery.Clause("cart", null, null), TraceStructureQuery.Relation.DIRECT, 0, 20));
        assertTrue(page.isEmpty());
        assertTrue(((TraceListPageDto) page).getQuery().truncated());
        assertEquals(1500, ((TraceListPageDto) page).getQuery().rowLimit());
    }

    @Test
    void recentTraceReadUsesOnlyTheExplicitWorkspace() {
        AuthTokenRequestContext.bindWorkspaceId("team-b");
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceListRows(
                100L, 200L, false, null, null, null, "team-a", Map.of(), false, 0, 20))
                .thenReturn(traceListPage(List.of()));

        assertTrue(entityTraceQueryService.queryRecentTraces("team-a", 100L, 200L, 20).isEmpty());

        verify(traceQueryRepository).queryTraceListRows(
                100L, 200L, false, null, null, null, "team-a", Map.of(), false, 0, 20);
    }

    @Test
    void recentTraceReadDoesNotInventSpanCountWhenStorageOmitsIt() {
        Map<String, Object> row = traceListRow(
                "trace-incomplete", "span-root", "GET /checkout", "checkout", null,
                "STATUS_CODE_OK", 150L, 1_000_000L, 0, 1, 1L, Map.of());
        row.remove("span_count");
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceListRows(
                100L, 200L, false, null, null, null, "default", Map.of(), false, 0, 20))
                .thenReturn(traceListPage(List.of(row)));

        assertThrows(TelemetryStorageUnavailableException.class,
                () -> entityTraceQueryService.queryRecentTraces("default", 100L, 200L, 20));
    }

    @Test
    void recentTraceReadPreservesPartialEvidenceUnattributedCountsAndExactObservedWindow() {
        Map<String, Object> row = traceListRow("0123456789abcdef0123456789abcdef", "0123456789abcdef",
                "actual child", null, null, "UNSET", 1_710_000_000_000L, 1_500_001L, 0, 2, 1L, Map.of());
        row.put("root_span_count", 0L);
        row.put("root_span_id", null);
        row.put("root_span_name", null);
        row.put("timestamp", null);
        row.put("duration_nano", null);
        row.put("observed_start_nanos", 1_710_000_000_000_000_001L);
        row.put("representative_start_nanos", 1_710_000_000_000_000_001L);
        row.put("observed_end_nanos", 1_710_000_000_003_000_001L);
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceListRows(
                100L, 200L, false, null, null, null, "default", Map.of(), false, 0, 20)).thenReturn(traceListPage(List.of(row)));
        for (long roots : List.of(0L, 2L)) {
            row.put("root_span_count", roots);
            var item = entityTraceQueryService.queryRecentTraces("default", 100L, 200L, 20).getContent().getFirst();
            assertEquals(roots == 0 ? "missing" : "ambiguous", item.getRootState());
            assertNull(item.getRootSpanId());
            assertNull(item.getServiceName());
            assertNull(item.getResourceAttributes());
            assertNull(item.getDurationNanos());
            assertEquals("actual child", item.getRepresentativeSpan().spanName());
            assertEquals(1_710_000_000_000L, item.getObservedStartTime());
            assertEquals(1_710_000_000_004L, item.getObservedEndTime());
            assertEquals(1_500_001L, item.getRepresentativeSpan().durationNanos());
            assertTrue(item.getServiceStats().isEmpty());
            assertEquals(2L, item.getUnattributedServiceStats().getSpanCount());
            assertEquals("unset", item.getStatus());
        }
    }

    @Test
    void recentTraceReadKeepsRepresentativeSeparateFromTwoRootsAcrossServices() {
        Map<String, Object> first = traceListRow("trace-two-roots", "span-root-a", "root A", "checkout", null,
                "STATUS_CODE_OK", 150L, 1_000_000L, 0, 2, 1L, Map.of("service.name", "checkout"));
        first.put("root_span_count", 2L);
        first.put("service_span_count", 1L);
        first.put("service_row_count", 2L);
        Map<String, Object> second = new HashMap<>(first);
        second.put("root_span_id", "span-root-b");
        second.put("root_span_name", "root B");
        second.put("stats_service_name", "payment");
        second.put("service_name", "payment");
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceListRows(
                100L, 200L, false, null, null, null, "default", Map.of(), false, 0, 20))
                .thenReturn(traceListPage(List.of(second, first))).thenReturn(traceListPage(List.of(first, second)));
        var reversed = entityTraceQueryService.queryRecentTraces("default", 100L, 200L, 20).getContent().getFirst();
        var ordered = entityTraceQueryService.queryRecentTraces("default", 100L, 200L, 20).getContent().getFirst();
        assertEquals("ambiguous", reversed.getRootState());
        assertEquals(2L, reversed.getRootSpanCount());
        assertNull(reversed.getRootSpanId());
        assertNull(reversed.getResourceAttributes());
        assertEquals(ordered.getRepresentativeSpan(), reversed.getRepresentativeSpan());
        assertEquals("span-root-a", reversed.getRepresentativeSpan().spanId());
        assertEquals(2, reversed.getServiceStats().size());
    }

    @Test
    void traceListDoesNotReplaceEmptyPageExactTotalWithRequestedOffset() {
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceListRows(null, null, null, null, null, null, null, null, null,
                "default", Map.of(), false, null, 100, 20, TraceSort.NEWEST, false))
                .thenReturn(new TraceQueryRepository.TraceListPage(List.of(), 2L));
        var page = entityTraceQueryService.queryTraceList("default", null, null, null, null, null,
                null, null, null, null, null, null, null, 5, 20, false, null, null);
        assertTrue(page.isEmpty());
        assertEquals(2L, page.getTotalElements());
        String json = org.apache.hertzbeat.common.util.JsonUtil.toJson(page);
        assertTrue(json.contains("\"coverage\":\"window\""));
        assertTrue(json.contains("\"sort\":\"newest\""));
        assertTrue(json.contains("\"rowLimit\":null"));
        assertTrue(json.contains("\"truncated\":false"));
    }

    @Test
    void fallbackSortsAcrossPagesByOnlyTheUniqueRootWithStableTiesAndMissingRootsLast() {
        List<Map<String, Object>> rows = List.of(
                traceRow("trace-c", "child", "root", "child", "checkout", "OK", 1000L, 9000L, Map.of()),
                traceRow("trace-c", "root", null, "root", "checkout", "OK", 1000L, 100L, Map.of()),
                traceRow("trace-b", "root", null, "root", "checkout", "OK", 1000L, 200L, Map.of()),
                traceRow("trace-a", "root", null, "root", "checkout", "OK", 1000L, 200L, Map.of()),
                traceRow("trace-e", "root-1", null, "root", "checkout", "OK", 1000L, 10000L, Map.of()),
                traceRow("trace-e", "root-2", null, "root", "checkout", "OK", 1000L, 10000L, Map.of()),
                traceRow("trace-d", "child", "missing", "child", "checkout", "OK", 1100L, 50000L, Map.of()));
        when(traceQueryRepository.queryRecentTraceRows(1501, null, null, null, null, null, null, null, null,
                "default", Map.of(), false)).thenReturn(rows);
        List<TraceListItemDto> result = new ArrayList<>();
        for (int pageIndex = 0; pageIndex < 3; pageIndex++) {
            var page = entityTraceQueryService.queryTraceList("default", null, null, null, null, false,
                    null, null, null, null, null, null, null, pageIndex, 2, false, null, null, TraceSort.DURATION_DESC);
            result.addAll(page.getContent());
            assertEquals(5, page.getTotalElements());
            var metadata = ((TraceListPageDto) page).getQuery();
            assertEquals("bounded", metadata.coverage());
            assertEquals(1500, metadata.rowLimit());
            assertEquals(false, metadata.truncated());
        }
        assertEquals(List.of("trace-a", "trace-b", "trace-c", "trace-d", "trace-e"),
                result.stream().map(TraceListItemDto::getTraceId).toList());
        assertEquals(100L, result.get(2).getDurationNanos());
        assertNull(result.get(3).getDurationNanos());
        assertNull(result.get(4).getDurationNanos());
        assertEquals("missing", result.get(3).getRootState());
        assertEquals("ambiguous", result.get(4).getRootState());
        var newest = entityTraceQueryService.queryTraceList("default", null, null, null, null, false,
                null, null, null, null, null, null, null, 0, 20, false, null, null, TraceSort.NEWEST);
        assertEquals(List.of("trace-d", "trace-a", "trace-b", "trace-c", "trace-e"),
                newest.getContent().stream().map(TraceListItemDto::getTraceId).toList());
    }

    @Test
    void scopedAttributeFallbackRetainsMissingAmbiguousAndOutOfWindowRootEvidence() {
        Map<String, String> resource = Map.of("service.namespace", "commerce", "deployment.environment.name", "prod",
                "service.instance.id", "instance-1", "hertzbeat.workspace_id", "default");
        List<Map<String, Object>> rows = List.of(
                traceRow("trace-unique", "root", null, "target", "checkout", "OK", 1500L, 100L, resource),
                traceRow("trace-missing", "child", "absent", "target", "checkout", "OK", 1500L, 99999L, resource),
                traceRow("trace-window", "child", "outside-window", "target", "checkout", "OK", 1500L, 99999L, resource),
                traceRow("trace-ambiguous", "root-1", null, "target", "checkout", "OK", 1500L, 99999L, resource),
                traceRow("trace-ambiguous", "root-2", null, "target", "checkout", "OK", 1500L, 99999L, resource));
        rows.forEach(row -> row.put("span_attributes.proof.signal", "trace"));
        when(traceQueryRepository.queryRecentTraceRows(org.mockito.ArgumentMatchers.any(TraceRowQuery.class), eq(1501)))
                .thenReturn(rows);

        var page = entityTraceQueryService.queryTraceList("default", null, 1000L, 2000L, null, false,
                "checkout", "commerce", "prod", "service.instance.id=instance-1", null, null, null,
                0, 20, false, null, "proof.signal=trace", TraceSort.DURATION_DESC);

        assertEquals(4, page.getTotalElements());
        assertEquals(List.of("trace-unique", "trace-ambiguous", "trace-missing", "trace-window"),
                page.getContent().stream().map(TraceListItemDto::getTraceId).toList());
        assertEquals(List.of("unique", "ambiguous", "missing", "missing"),
                page.getContent().stream().map(TraceListItemDto::getRootState).toList());
        page.getContent().subList(1, 4).forEach(item -> assertNull(item.getDurationNanos()));
        ArgumentCaptor<TraceRowQuery> query = ArgumentCaptor.forClass(TraceRowQuery.class);
        verify(traceQueryRepository).queryRecentTraceRows(query.capture(), eq(1501));
        assertEquals("checkout", query.getValue().serviceName());
        assertEquals("commerce", query.getValue().serviceNamespace());
        assertEquals("prod", query.getValue().environment());
        assertEquals("default", query.getValue().workspaceId());
        assertEquals(Set.of("instance-1"), query.getValue().resourceFilters().get("service.instance.id"));
        assertEquals(Set.of("trace"), query.getValue().attributeFilters().get("proof.signal"));
    }

    @Test
    void fallbackRequiresScopeErrorOperationAndAttributesToMatchTheSameSpan() {
        Map<String, String> resource = Map.of("service.namespace", "commerce", "deployment.environment.name", "prod",
                "service.instance.id", "instance-1", "hertzbeat.workspace_id", "default");
        var root = traceRow("trace-split", "root", null, "root-operation", "checkout", "OK", 1500L, 100L, resource);
        var child = traceRow("trace-split", "child", "root", "target", "checkout", "ERROR", 1500L, 20_000_000L, resource);
        child.put("span_attributes.proof.signal", "trace");
        child.put("span_kind", "SERVER");
        when(traceQueryRepository.queryRecentTraceRows(org.mockito.ArgumentMatchers.any(TraceRowQuery.class), eq(1501)))
                .thenReturn(List.of(root, child));

        var rootPage = entityTraceQueryService.queryTraceList("default", null, 1000L, 2000L, null, true,
                "checkout", "commerce", "prod", "service.instance.id=instance-1", "target", null, null,
                0, 20, false, "root", "proof.signal=trace", TraceSort.DURATION_DESC);

        assertTrue(rootPage.isEmpty());
        for (String environment : List.of("prod", "all")) {
            var entrypointPage = entityTraceQueryService.queryTraceList("default", null, 1000L, 2000L, null, true,
                    "checkout", "commerce", environment, "service.instance.id=instance-1", "target", 10L, 30L,
                    0, 20, false, "entrypoint", "proof.signal=trace", TraceSort.DURATION_DESC);
            assertEquals(1, entrypointPage.getTotalElements());
            assertEquals(100L, entrypointPage.getContent().getFirst().getDurationNanos());
        }
    }

    @Test
    void fallbackDropsThe1501stRowBeforeAggregationAndReportsTruncation() {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < 1500; i++) {
            rows.add(traceRow("trace-" + i, "root", null, "root", "checkout", "OK", 1000L, 100L, Map.of()));
        }
        rows.add(Map.of("sentinel", true));
        when(traceQueryRepository.queryRecentTraceRows(1501, null, null, null, null, null, null, null, null,
                "default", Map.of(), false)).thenReturn(rows);

        var page = entityTraceQueryService.queryTraceList("default", null, null, null, null, false,
                null, null, null, null, null, null, null, 0, 20, false, null, null, TraceSort.NEWEST);

        assertEquals(1500L, page.getTotalElements());
        var query = ((TraceListPageDto) page).getQuery();
        assertEquals("bounded", query.coverage());
        assertEquals(1500, query.rowLimit());
        assertEquals(true, query.truncated());
    }

    @Test
    void exactTraceDropsThe5001stRowAndKeepsTheBoundedSpanCount() {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < 5000; i++) {
            rows.add(traceRow("trace-exact", "span-" + i, i == 0 ? null : "span-0", "operation", "checkout", "OK",
                    1000L, 100L, Map.of()));
        }
        rows.add(Map.of("sentinel", true));
        when(traceQueryRepository.queryTraceRows("trace-exact", 5001, null, null, null, null, null,
                null, null, null, "default", Map.of(), false)).thenReturn(rows);

        var page = entityTraceQueryService.queryTraceList("default", null, null, null, "trace-exact", false,
                null, null, null, null, null, null, null, 0, 20, false, null, null, TraceSort.DURATION_DESC);

        assertEquals(5000L, page.getContent().getFirst().getSpanCount());
        var query = ((TraceListPageDto) page).getQuery();
        assertEquals("bounded", query.coverage());
        assertEquals(5000, query.rowLimit());
        assertEquals(true, query.truncated());
    }

    @Test
    void traceListRejectsMissingPageRowsInsteadOfReportingFalseEmptySuccess() {
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceListRows(
                100L, 200L, false, null, null, null, "default", Map.of(), false, 0, 20))
                .thenReturn(new TraceQueryRepository.TraceListPage(null, 1L));
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> entityTraceQueryService.queryRecentTraces("default", 100L, 200L, 20));
    }

    @Test
    void recentTraceReadMergesDistinctMissingServiceGroupsWithoutInventingIdentity() {
        Map<String, Object> first = traceListRow("trace-partial", "span-child", "child", null, null,
                "UNSET", 150L, 1_000_000L, 1, 3, 1L, Map.of());
        first.put("root_span_count", 0L);
        first.put("root_span_id", null);
        first.put("service_span_count", 1L);
        first.put("service_error_span_count", 0L);
        first.put("service_row_count", 2L);
        Map<String, Object> second = new HashMap<>(first);
        second.put("stats_service_name", " ");
        second.put("service_span_count", 2L);
        second.put("service_error_span_count", 1L);
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceListRows(
                100L, 200L, false, null, null, null, "default", Map.of(), false, 0, 20)).thenReturn(traceListPage(List.of(second, first)));
        var item = entityTraceQueryService.queryRecentTraces("default", 100L, 200L, 20).getContent().getFirst();
        assertTrue(item.getServiceStats().isEmpty());
        assertEquals(3L, item.getUnattributedServiceStats().getSpanCount());
        assertEquals(1L, item.getUnattributedServiceStats().getErrorCount());
    }

    @Test
    void recentTraceReadRejectsFractionalCountersAndInvalidEvidence() {
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        for (String key : List.of("span_count", "service_span_count", "total_count", "root_span_count",
                "representative_duration_nano", "observed_end_nanos", "invalid_span_count", "evidence_distinct_span_count")) {
            Map<String, Object> row = traceListRow("trace-invalid", "span-root", "GET /checkout", "checkout", null,
                    "STATUS_CODE_OK", 150L, 1_000_000L, 0, 1, 1L, Map.of());
            row.put(key, new BigDecimal("1.5"));
            when(traceQueryRepository.queryTraceListRows(
                    100L, 200L, false, null, null, null, "default", Map.of(), false, 0, 20)).thenReturn(traceListPage(List.of(row)));
            assertThrows(TelemetryStorageUnavailableException.class,
                    () -> entityTraceQueryService.queryRecentTraces("default", 100L, 200L, 20));
        }
    }

    @Test
    void recentTraceReadFailsClosedWhenPerServiceRowsExceedTheServerBudget() {
        Map<String, Object> row = traceListRow(
                "trace-budget", "span-root", "GET /checkout", "checkout", null,
                "STATUS_CODE_OK", 150L, 1_000_000L, 0, 1, 1L, Map.of());
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int index = 0; index <= TraceQueryRepository.MAX_TRACE_LIST_SERVICE_ROWS; index++) {
            rows.add(row);
        }
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceListRows(
                100L, 200L, false, null, null, null, "default", Map.of(), false, 0, 20))
                .thenReturn(traceListPage(rows));

        assertThrows(TelemetryStorageUnavailableException.class,
                () -> entityTraceQueryService.queryRecentTraces("default", 100L, 200L, 20));
    }

    @Test
    void recentTraceReadFailsClosedForMissingTraceIdentityOrUnrepresentableErrorCount() {
        Map<String, Object> missingIdentity = traceListRow(
                "trace-invalid", "span-root", "GET /checkout", "checkout", null,
                "STATUS_CODE_ERROR", 150L, 1_000_000L, 1, 1, 1L, Map.of());
        missingIdentity.put("trace_id", null);
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceListRows(
                100L, 200L, false, null, null, null, "default", Map.of(), false, 0, 20))
                .thenReturn(traceListPage(List.of(missingIdentity)));

        assertThrows(TelemetryStorageUnavailableException.class,
                () -> entityTraceQueryService.queryRecentTraces("default", 100L, 200L, 20));

        Map<String, Object> oversizedErrorCount = traceListRow(
                "trace-invalid", "span-root", "GET /checkout", "checkout", null,
                "STATUS_CODE_ERROR", 150L, 1_000_000L, 1, 1, 1L, Map.of());
        long count = (long) Integer.MAX_VALUE + 1L;
        oversizedErrorCount.put("error_span_count", count);
        oversizedErrorCount.put("span_count", count);
        oversizedErrorCount.put("service_span_count", count);
        oversizedErrorCount.put("service_error_span_count", count);
        when(traceQueryRepository.queryTraceListRows(
                100L, 200L, false, null, null, null, "default", Map.of(), false, 0, 20))
                .thenReturn(traceListPage(List.of(oversizedErrorCount)));

        assertThrows(TelemetryStorageUnavailableException.class,
                () -> entityTraceQueryService.queryRecentTraces("default", 100L, 200L, 20));
    }

    @Test
    void recentTraceReadFailsClosedForInvalidOrInconsistentTotalCountEvidence() {
        Map<String, Object> first = traceListRow(
                "trace-1", "span-root-1", "GET /checkout", "checkout", null,
                "STATUS_CODE_OK", 150L, 1_000_000L, 0, 1, 2L, Map.of());
        Map<String, Object> second = traceListRow(
                "trace-2", "span-root-2", "GET /payment", "payment", null,
                "STATUS_CODE_OK", 140L, 1_000_000L, 0, 1, 2L, Map.of());
        first.put("service_row_count", 2L);
        second.put("service_row_count", 2L);
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);

        second.put("total_count", 3L);
        when(traceQueryRepository.queryTraceListRows(
                100L, 200L, false, null, null, null, "default", Map.of(), false, 0, 20))
                .thenReturn(traceListPage(List.of(first, second)));
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> entityTraceQueryService.queryRecentTraces("default", 100L, 200L, 20));

        second.remove("total_count");
        when(traceQueryRepository.queryTraceListRows(
                100L, 200L, false, null, null, null, "default", Map.of(), false, 0, 20))
                .thenReturn(traceListPage(List.of(first, second)));
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> entityTraceQueryService.queryRecentTraces("default", 100L, 200L, 20));

        first.put("total_count", -1L);
        second.put("total_count", -1L);
        when(traceQueryRepository.queryTraceListRows(
                100L, 200L, false, null, null, null, "default", Map.of(), false, 0, 20))
                .thenReturn(traceListPage(List.of(first, second)));
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> entityTraceQueryService.queryRecentTraces("default", 100L, 200L, 20));

        first.put("total_count", 1L);
        second.put("total_count", 1L);
        when(traceQueryRepository.queryTraceListRows(
                100L, 200L, false, null, null, null, "default", Map.of(), false, 0, 20))
                .thenReturn(traceListPage(List.of(first, second)));
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> entityTraceQueryService.queryRecentTraces("default", 100L, 200L, 20));
    }

    @Test
    void blankWorkspaceRejectsRecentTraceReadBeforeStorageCapabilityLookup() {
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> entityTraceQueryService.queryRecentTraces(" ", 100L, 200L, 20));

        verifyNoInteractions(traceQueryRepository);
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
                eq("default"),
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
                eq("default"), identityFilterCaptor.capture(), eq(false));
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
    void buildEntityTraceSummaryUsesResourceIdentityWhenEntityWasCreatedAfterOtlpTrace() {
        long now = System.currentTimeMillis();
        ObservedEntityContext entityContext = ObservedEntityContext.from(
                ObserveEntity.builder().id(658273243069696L).type("service")
                        .name("codex-pd-1369-novice-checkout").build(),
                List.of(
                        identity(658273243069696L, "service.name", "codex-pd-1369-novice-checkout", 90, true),
                        identity(658273243069696L, "service.namespace", "product-design-1369", 30, false),
                        identity(658273243069696L, "deployment.environment.name", "prod", 20, false)
                ));
        when(traceQueryRepository.supportsTraceSummaryRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceSummaryRows(
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyLong(),
                eq("codex-pd-1369-novice-checkout"), eq("product-design-1369"), eq("prod"),
                eq("default"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(false)))
                .thenReturn(Map.of(
                        "total_trace_count", 1L,
                        "error_trace_count", 0L,
                        "latest_observed_at", now - 20_000,
                        "latest_trace_id", "13691369136913691369136913691369"
                ));

        EntityTraceSummaryDto summary = entityTraceQueryService.buildEntityTraceSummary(entityContext);

        assertEquals(1, summary.getRecentTraceCount());
        assertEquals(0, summary.getRecentErrorTraceCount());
        assertEquals("13691369136913691369136913691369", summary.getLatestTraceId());
        ArgumentCaptor<Map<String, Set<String>>> identityFilterCaptor = ArgumentCaptor.forClass(Map.class);
        verify(traceQueryRepository).queryTraceSummaryRows(
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyLong(),
                eq("codex-pd-1369-novice-checkout"), eq("product-design-1369"), eq("prod"),
                eq("default"), identityFilterCaptor.capture(), eq(false));
        assertNull(identityFilterCaptor.getValue().get("hertzbeat.entity_id"));
        assertEquals(Set.of("codex-pd-1369-novice-checkout"),
                identityFilterCaptor.getValue().get("service.name"));
        assertEquals(Set.of("product-design-1369"),
                identityFilterCaptor.getValue().get("service.namespace"));
        assertEquals(Set.of("prod"),
                identityFilterCaptor.getValue().get("deployment.environment.name"));
    }

    @Test
    void getTraceGroupByStatsUsesStorageRowsAndMapsLatencyMetrics() {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(traceQueryRepository.supportsTraceGroupByRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceGroupByRows(
                eq(100L),
                eq(200L),
                eq(true),
                eq("checkout"),
                eq("commerce"),
                eq("prod"),
                eq("GET /checkout"),
                eq(100_000_000L),
                eq(500_000_000L),
                eq("team-a"),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(true),
                eq("entrypoint"),
                eq("resource:service.version"),
                eq("latency-p95-desc"),
                eq(5L),
                eq(7)
        )).thenReturn(List.of(Map.of(
                "group_value", "1.2.3",
                "trace_count", 12L,
                "error_trace_count", 2L,
                "latency_avg_ms", BigDecimal.valueOf(84.5d),
                "latency_p95_ms", "210.0"
        ), Map.of("group_value", "missing-duration", "trace_count", 1L, "error_trace_count", 0L),
                Map.of("group_value", "zero-duration", "trace_count", 1L, "error_trace_count", 0L,
                        "latency_avg_ms", 0D, "latency_p95_ms", 0D)));

        Map<String, Object> result = entityTraceQueryService.getTraceGroupByStats(
                null,
                100L,
                200L,
                null,
                true,
                "checkout",
                "commerce",
                "prod",
                "host.name IN (\"checkout-1\", 'checkout-2') and k8s.namespace.name:commerce",
                "GET /checkout",
                100L,
                500L,
                "resource:service.version",
                7,
                "latency-p95-desc",
                5,
                true,
                "entrypoint");

        assertEquals("resource:service.version", result.get("groupBy"));
        List<Map<String, Object>> groups = (List<Map<String, Object>>) result.get("groups");
        assertEquals(3, groups.size());
        assertEquals("1.2.3", groups.getFirst().get("value"));
        assertEquals(12L, groups.getFirst().get("traceCount"));
        assertEquals(2L, groups.getFirst().get("errorTraceCount"));
        assertEquals(84.5d, groups.getFirst().get("latencyAvgMs"));
        assertEquals(210.0d, groups.getFirst().get("latencyP95Ms"));
        assertNull(groups.get(1).get("latencyAvgMs"));
        assertNull(groups.get(1).get("latencyP95Ms"));
        assertEquals(0D, groups.get(2).get("latencyAvgMs"));
        assertEquals(0D, groups.get(2).get("latencyP95Ms"));

        ArgumentCaptor<Map<String, Set<String>>> filterCaptor = ArgumentCaptor.forClass(Map.class);
        verify(traceQueryRepository).queryTraceGroupByRows(
                eq(100L),
                eq(200L),
                eq(true),
                eq("checkout"),
                eq("commerce"),
                eq("prod"),
                eq("GET /checkout"),
                eq(100_000_000L),
                eq(500_000_000L),
                eq("team-a"),
                filterCaptor.capture(),
                eq(true),
                eq("entrypoint"),
                eq("resource:service.version"),
                eq("latency-p95-desc"),
                eq(5L),
                eq(7));
        assertEquals(Set.of("checkout-1", "checkout-2"), filterCaptor.getValue().get("host.name"));
        assertEquals(Set.of("commerce"), filterCaptor.getValue().get("k8s.namespace.name"));
    }

    @Test
    void groupByLatencySortKeepsMissingRootDurationLast() {
        long start = 1_700_000_000_000L;
        long end = start + 60_000L;
        Map<String, Object> missingDuration = traceRow("missing", "child", "unobserved-root", "missing duration",
                "checkout", "STATUS_CODE_OK", start + 1000L, 1L, Map.of("service.name", "checkout"));
        Map<String, Object> observedDuration = traceRow("observed", "root-observed", null, "observed duration",
                "checkout", "STATUS_CODE_OK", start + 2000L, 30_000_000L, Map.of("service.name", "checkout"));
        Map<String, Object> tiedDuration = traceRow("tied", "root-tied", null, "a tied duration",
                "checkout", "STATUS_CODE_OK", start + 3000L, 30_000_000L, Map.of("service.name", "checkout"));
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1500), eq(start), eq(end), eq("checkout"), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), eq("default"),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(false)))
                .thenReturn(List.of(missingDuration, observedDuration, tiedDuration));

        Map<String, Object> result = entityTraceQueryService.getTraceGroupByStats(
                null, start, end, null, false, "checkout", null, null, null, null, null, null,
                "operation.name", 20, "latency-p95-desc", 1, false, "all");

        List<Map<String, Object>> groups = (List<Map<String, Object>>) result.get("groups");
        assertEquals(List.of("a tied duration", "observed duration", "unknown"),
                groups.stream().map(group -> group.get("value")).toList());
        assertEquals(30D, groups.getFirst().get("latencyP95Ms"));
        assertNull(groups.getLast().get("latencyAvgMs"));
        assertNull(groups.getLast().get("latencyP95Ms"));
    }

    @Test
    void getTraceGroupByStatsGroupsBySpanAttributesWithRowFallback() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        Map<String, Object> checkoutRoot = traceRow("trace-checkout", "span-root-1", null, "GET /checkout",
                "checkout-service", "STATUS_CODE_OK", now - 10_000, 20_000_000L,
                Map.of("service.name", "checkout-service"));
        putFlattenedAttributes(checkoutRoot, "span_attributes.", Map.of("span.kind", "server"));
        Map<String, Object> checkoutChild = traceRow("trace-checkout", "span-child-1", "span-root-1", "GET /checkout/{id}",
                "checkout-service", "STATUS_CODE_OK", now - 9_000, 5_000_000L,
                Map.of("service.name", "checkout-service"));
        putFlattenedAttributes(checkoutChild, "span_attributes.", Map.of("http.route", "/checkout/{id}"));
        Map<String, Object> inventoryRoot = traceRow("trace-inventory", "span-root-2", null, "GET /inventory",
                "checkout-service", "STATUS_CODE_ERROR", now - 8_000, 30_000_000L,
                Map.of("service.name", "checkout-service"));
        putFlattenedAttributes(inventoryRoot, "span_attributes.", Map.of("http.route", "/inventory"));
        Map<String, Object> unknownRoot = traceRow("trace-unknown", "span-root-3", null, "GET /unknown",
                "checkout-service", "STATUS_CODE_OK", now - 7_000, 10_000_000L,
                Map.of("service.name", "checkout-service"));
        putFlattenedAttributes(unknownRoot, "span_attributes.", Map.of("span.kind", "server"));
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1500), eq(start), eq(end), eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("default"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(false))).thenReturn(List.of(checkoutRoot, checkoutChild, inventoryRoot, unknownRoot));

        Map<String, Object> result = entityTraceQueryService.getTraceGroupByStats(
                null,
                start,
                end,
                null,
                false,
                "checkout-service",
                null,
                null,
                null,
                null,
                null,
                null,
                "attribute:http.route",
                10,
                "trace-count-desc",
                1,
                false,
                "all");

        assertEquals("attribute:http.route", result.get("groupBy"));
        List<Map<String, Object>> groups = (List<Map<String, Object>>) result.get("groups");
        assertEquals(3, groups.size());
        assertEquals("/checkout/{id}", groups.get(0).get("value"));
        assertEquals(1L, groups.get(0).get("traceCount"));
        assertEquals(0L, groups.get(0).get("errorTraceCount"));
        assertEquals("/inventory", groups.get(1).get("value"));
        assertEquals(1L, groups.get(1).get("traceCount"));
        assertEquals(1L, groups.get(1).get("errorTraceCount"));
        assertEquals("unknown", groups.get(2).get("value"));
        assertEquals(1L, groups.get(2).get("traceCount"));
        verify(traceQueryRepository).queryRecentTraceRows(
                eq(1500), eq(start), eq(end), eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("default"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(false));
        verify(traceQueryRepository, never()).queryTraceGroupByRows(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyInt());
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

        when(workspaceQueryGateway.findEntityById("default", 1L)).thenReturn(Optional.of(entity));
        when(workspaceQueryGateway.findIdentitiesByEntityId("default", 1L)).thenReturn(List.of(
                identity(1L, "service.name", "checkout-service", 100, true)
        ));
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1501), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("default"),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(false))).thenReturn(listRows);
        when(traceQueryRepository.queryTraceRows(
                org.mockito.ArgumentMatchers.any(TraceRowQuery.class), eq(5000))).thenReturn(detailRows);

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
        assertEquals("1710000000000000123",
                detail.getSpans().getFirst().getEvents().getFirst().getTimeUnixNano());
        assertEquals("exception", detail.getSpans().getFirst().getEvents().getFirst().getName());
        assertEquals("java.lang.IllegalStateException",
                detail.getSpans().getFirst().getEvents().getFirst().getAttributes().get("exception.type"));
        assertEquals(1, detail.getSpans().getFirst().getLinks().size());
        assertEquals("fedcba0987654321fedcba0987654321", detail.getSpans().getFirst().getLinks().getFirst().getTraceId());
        assertEquals("follows_from", detail.getSpans().getFirst().getLinks().getFirst().getAttributes().get("link.kind"));
        ArgumentCaptor<TraceRowQuery> detailQueryCaptor = ArgumentCaptor.forClass(TraceRowQuery.class);
        verify(traceQueryRepository).queryTraceRows(detailQueryCaptor.capture(), eq(5000));
        assertEquals(Set.of("1"), detailQueryCaptor.getValue().resourceFilters().get("hertzbeat.entity_id"));
        assertEquals(Set.of("checkout-service"),
                detailQueryCaptor.getValue().resourceFilters().get("service.name"));
    }

    @Test
    void getTraceOverviewAggregatesErrorsAndRecentActivity() {
        long now = System.currentTimeMillis();
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1501), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("default"),
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
                eq(1501), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("default"),
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
                eq(1501), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("default"),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(true));
    }

    @Test
    void queryTraceListUsesRepositoryForTraceRows() {
        long now = System.currentTimeMillis();
        List<Map<String, Object>> rows = List.of(
                traceRow("trace-http", "span-root", null, "GET /checkout", "checkout-service", "STATUS_CODE_OK",
                        now - 5_000, 5_000_000L, Map.of("service.name", "checkout-service"))
        );
        when(traceQueryRepository.queryTraceRows(
                eq("trace-http"), eq(5001), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("default"),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(false))).thenReturn(rows);
        stubDefaultWorkspaceTraceRows("trace-http", rows);

        var page = entityTraceQueryService.queryTraceList(null, null, null, "trace-http", false, null, null, null, 0, 20, false);
        TraceOverviewDto overview = entityTraceQueryService.getTraceOverview(null, null, null, "trace-http", false, null, null, null, false);
        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-http");

        assertEquals(1, page.getTotalElements());
        assertEquals("trace-http", page.getContent().getFirst().getTraceId());
        assertEquals(1, overview.getTotalTraceCount());
        assertNotNull(detail);
        assertEquals("trace-http", detail.getTraceId());
        assertEquals(1, detail.getSpans().size());
        verify(traceQueryRepository, atLeastOnce()).queryTraceRows(
                eq("trace-http"), eq(5001), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("default"),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(false));
        verify(traceQueryRepository, never()).queryRecentTraceRows(1500, null, false);
    }

    @Test
    void missingRequestedEntityNeverFallsBackToGlobalTraceEvidence() {
        long missingEntityId = 404L;

        var page = entityTraceQueryService.queryTraceList(
                missingEntityId, null, null, null, false, null, null, null, 0, 20);
        TraceOverviewDto overview = entityTraceQueryService.getTraceOverview(
                missingEntityId, null, null, null, false, null, null, null, false);
        Map<String, Object> groups = entityTraceQueryService.getTraceGroupByStats(
                missingEntityId, null, null, null, false, null, null, null,
                null, null, null, null, "service.name", null, null, null, false, null);
        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(missingEntityId, "trace-shared");

        assertTrue(page.isEmpty());
        assertEquals(0, overview.getTotalTraceCount());
        assertTrue(((List<?>) groups.get("groups")).isEmpty());
        assertNull(detail);
        verifyNoInteractions(traceQueryRepository);
    }

    @Test
    void malformedTraceJsonLogDoesNotExposeTelemetryOrParserDetails() {
        String secretSentinel = "Bearer secret-token";
        Map<String, Object> row = traceRow(
                "trace-redacted", "span-redacted", null, "GET /checkout", "checkout",
                "STATUS_CODE_OK", System.currentTimeMillis(), 1_000_000L, Map.of());
        row.put("span_events", "[{\"body\":\"" + secretSentinel + "\"}");
        stubDefaultWorkspaceTraceRows("trace-redacted", List.of(row));
        Logger logger = (Logger) LoggerFactory.getLogger(EntityTraceQueryServiceImpl.class);
        Level previousLevel = logger.getLevel();
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        logger.setLevel(Level.DEBUG);
        try {
            assertNotNull(entityTraceQueryService.getTraceDetail(null, "trace-redacted"));
        } finally {
            logger.setLevel(previousLevel);
            logger.detachAppender(appender);
            appender.stop();
        }

        assertEquals(1, appender.list.size());
        ILoggingEvent event = appender.list.getFirst();
        assertEquals("Trace JSON list parse failed", event.getFormattedMessage());
        assertFalse(event.getFormattedMessage().contains(secretSentinel));
        assertNull(event.getThrowableProxy());
    }

    @Test
    void queryTraceListUsesRootSpanServiceWhenChildSpanAppearsFirst() {
        long now = System.currentTimeMillis();
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1501), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("recommendation"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("default"),
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
        assertEquals(2L, page.getContent().getFirst().getSpanCount());
        assertEquals(2, page.getContent().getFirst().getServiceStats().size());
        verify(traceQueryRepository).queryRecentTraceRows(
                eq(1501), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("recommendation"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("default"),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(true));
    }

    @Test
    void queryTraceListMatchesOperationNameAgainstChildSpansWithRowFallback() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1501), eq(start), eq(end), eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("SELECT cart"),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("default"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(true))).thenReturn(List.of(
                traceRow("trace-cart", "span-root", null, "GET /checkout", "checkout-service", "STATUS_CODE_OK",
                        now - 10_000, 5_000_000L,
                        Map.of("service.name", "checkout-service")),
                traceRow("trace-cart", "span-child", "span-root", "SELECT cart", "checkout-service", "STATUS_CODE_OK",
                        now - 9_000, 1_000_000L,
                        Map.of("service.name", "checkout-service"))
        ));

        var page = entityTraceQueryService.queryTraceList(null, start, end, null,
                false, "checkout-service", null, null,
                null, "SELECT cart", null, null, 0, 20, true);

        assertEquals(1, page.getTotalElements());
        assertEquals("trace-cart", page.getContent().getFirst().getTraceId());
        assertEquals("GET /checkout", page.getContent().getFirst().getRootSpanName());
        verify(traceQueryRepository).queryRecentTraceRows(
                eq(1501), eq(start), eq(end), eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("SELECT cart"),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("default"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(true));
    }

    @Test
    void queryTraceListPushesWorkspaceTimeEnvironmentAndEntityFiltersToRepository() {
        long now = System.currentTimeMillis();
        long start = now - 60_000;
        long end = now;
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        ObserveEntity entity = ObserveEntity.builder().id(1L).type("service").name("checkout-service").build();
        when(workspaceQueryGateway.findEntityById("team-a", 1L)).thenReturn(Optional.of(entity));
        when(workspaceQueryGateway.findIdentitiesByEntityId("team-a", 1L)).thenReturn(List.of(
                identity(1L, "service.name", "checkout-service", 100, true),
                identity(1L, "service.namespace", "commerce", 80, false),
                identity(1L, "host.name", "checkout-1", 50, false)
        ));
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1501), eq(start), eq(end), eq("checkout-service"), eq("commerce"),
                eq("prod"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("team-a"),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(true)))
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
                eq(1501), eq(start), eq(end), eq("checkout-service"), eq("commerce"),
                eq("prod"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("team-a"), identityFilterCaptor.capture(), eq(true));
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
        when(workspaceQueryGateway.findEntityById("team-a", 1L)).thenReturn(Optional.of(entity));
        when(workspaceQueryGateway.findIdentitiesByEntityId("team-a", 1L)).thenReturn(List.of(
                identity(1L, "service.name", "checkout-service", 100, true),
                identity(1L, "service.namespace", "commerce", 80, false)
        ));
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceListRows(
                eq(start), eq(end), eq(true), eq("checkout-service"), eq("commerce"),
                eq("prod"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(true), org.mockito.ArgumentMatchers.isNull(), eq(40), eq(20), eq(TraceSort.NEWEST), eq(false))).thenAnswer(ignored -> {
                    Map<String, Object> rootServiceRow = traceListRow(
                        "trace-page-3",
                        "span-root",
                        "/checkout",
                        "checkout-service",
                        "commerce",
                        "STATUS_CODE_ERROR",
                        now - 30_000,
                        8_000_000L,
                        2,
                        5,
                        41L,
                        Map.of("service.name", "checkout-service",
                                "service.namespace", "commerce",
                                "deployment.environment.name", "prod",
                                "hertzbeat.workspace_id", "team-a"));
                    rootServiceRow.put("service_span_count", 3L);
                    rootServiceRow.put("service_error_span_count", 1L);
                    rootServiceRow.put("service_row_count", 2L);
                    Map<String, Object> paymentServiceRow = new HashMap<>(rootServiceRow);
                    paymentServiceRow.put("root_span_id", null);
                    paymentServiceRow.put("root_span_name", null);
                    paymentServiceRow.put("service_name", null);
                    paymentServiceRow.put("service_namespace", null);
                    paymentServiceRow.put("timestamp", null);
                    paymentServiceRow.put("duration_nano", null);
                    paymentServiceRow.put("stats_service_name", "payment-service");
                    paymentServiceRow.put("service_span_count", 2L);
                    paymentServiceRow.put("service_error_span_count", 1L);
                    return traceListPage(List.of(rootServiceRow, paymentServiceRow));
                });

        var page = entityTraceQueryService.queryTraceList(1L, start, end, null,
                true, "checkout-service", "commerce", "prod", 2, 20, true);

        assertEquals(41L, page.getTotalElements());
        assertEquals(2, page.getNumber());
        assertEquals("trace-page-3", page.getContent().getFirst().getTraceId());
        assertEquals("checkout-service", page.getContent().getFirst().getServiceName());
        assertEquals("commerce", page.getContent().getFirst().getServiceNamespace());
        assertEquals("error", page.getContent().getFirst().getStatus());
        assertEquals(2, page.getContent().getFirst().getErrorSpanCount());
        assertEquals(5L, page.getContent().getFirst().getSpanCount());
        assertEquals(3L, page.getContent().getFirst().getServiceStats()
                .get("checkout-service").getSpanCount());
        assertEquals(1L, page.getContent().getFirst().getServiceStats()
                .get("checkout-service").getErrorCount());
        assertEquals(2L, page.getContent().getFirst().getServiceStats()
                .get("payment-service").getSpanCount());
        assertEquals(1L, page.getContent().getFirst().getServiceStats()
                .get("payment-service").getErrorCount());
        Map<String, Object> insufficientTotal = traceListRow(
                "trace-page-3", "span-root", "/checkout", "checkout-service", "commerce",
                "STATUS_CODE_ERROR", now - 30_000, 8_000_000L, 2, 5, 40L,
                Map.of("service.name", "checkout-service", "service.namespace", "commerce"));
        when(traceQueryRepository.queryTraceListRows(
                eq(start), eq(end), eq(true), eq("checkout-service"), eq("commerce"),
                eq("prod"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("team-a"),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(true), org.mockito.ArgumentMatchers.isNull(), eq(40), eq(20), eq(TraceSort.NEWEST), eq(false)))
                .thenReturn(traceListPage(List.of(insufficientTotal)));
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> entityTraceQueryService.queryTraceList(1L, start, end, null,
                        true, "checkout-service", "commerce", "prod", 2, 20, true));
        verify(traceQueryRepository, never()).queryRecentTraceRows(
                eq(1500), eq(start), eq(end), eq("checkout-service"), eq("commerce"),
                eq("prod"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("team-a"),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(true));
    }

    @Test
    void queryTraceListAppliesNegativeResourceFiltersWithRowFallback() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1501), eq(start), eq(end), eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("default"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(false))).thenReturn(List.of(
                traceRow("trace-stable", "span-root-1", null, "GET /checkout", "checkout-service", "STATUS_CODE_OK",
                        now - 10_000, 2_000_000L,
                        Map.of("service.name", "checkout-service",
                                "service.version", "1.2.3",
                                "host.name", "checkout-1",
                                "deployment.environment.name", "prod")),
                traceRow("trace-canary", "span-root-2", null, "GET /checkout", "checkout-service", "STATUS_CODE_OK",
                        now - 9_000, 2_000_000L,
                        Map.of("service.name", "checkout-service",
                                "service.version", "1.2.3",
                                "host.name", "checkout-canary",
                                "deployment.environment.name", "prod")),
                traceRow("trace-staging", "span-root-3", null, "GET /checkout", "checkout-service", "STATUS_CODE_OK",
                        now - 8_000, 2_000_000L,
                        Map.of("service.name", "checkout-service",
                                "service.version", "1.2.4",
                                "host.name", "checkout-2",
                                "deployment.environment.name", "staging")),
                traceRow("trace-other-version", "span-root-4", null, "GET /checkout", "checkout-service",
                        "STATUS_CODE_OK", now - 7_000, 2_000_000L,
                        Map.of("service.name", "checkout-service",
                                "service.version", "2.0.0",
                                "host.name", "checkout-3",
                                "deployment.environment.name", "prod"))
        ));

        var page = entityTraceQueryService.queryTraceList(null, start, end, null,
                false, "checkout-service", null, null,
                "service.version IN (\"1.2.3\", '1.2.4') and host.name NOT IN ('checkout-canary') "
                        + "and deployment.environment.name!=staging",
                null, null, null, 0, 20, false);

        assertEquals(1, page.getTotalElements());
        assertEquals("trace-stable", page.getContent().getFirst().getTraceId());
        ArgumentCaptor<Map<String, Set<String>>> pushedFilterCaptor = ArgumentCaptor.forClass(Map.class);
        verify(traceQueryRepository).queryRecentTraceRows(
                eq(1501), eq(start), eq(end), eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("default"), pushedFilterCaptor.capture(), eq(false));
        assertEquals(Set.of("1.2.3", "1.2.4"), pushedFilterCaptor.getValue().get("service.version"));
        verify(traceQueryRepository, never()).queryTraceListRows(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyInt(), eq(TraceSort.NEWEST));
    }

    @Test
    void queryTraceListAppliesContainsAndPresenceResourceFiltersWithRowFallback() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1501), eq(start), eq(end), eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("default"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(false))).thenReturn(List.of(
                traceRow("trace-stable", "span-root-1", null, "GET /checkout", "checkout-service", "STATUS_CODE_OK",
                        now - 10_000, 2_000_000L,
                        Map.of("service.name", "checkout-service",
                                "service.version", "1.2.3",
                                "host.name", "checkout-1",
                                "cloud.region", "us-east-1")),
                traceRow("trace-no-version", "span-root-2", null, "GET /checkout", "checkout-service", "STATUS_CODE_OK",
                        now - 9_000, 2_000_000L,
                        Map.of("service.name", "checkout-service",
                                "host.name", "checkout-2",
                                "cloud.region", "us-east-1")),
                traceRow("trace-env", "span-root-3", null, "GET /checkout", "checkout-service", "STATUS_CODE_OK",
                        now - 8_000, 2_000_000L,
                        Map.of("service.name", "checkout-service",
                                "service.version", "1.2.3",
                                "host.name", "checkout-3",
                                "deployment.environment.name", "prod",
                                "cloud.region", "us-east-1")),
                traceRow("trace-west", "span-root-4", null, "GET /checkout", "checkout-service", "STATUS_CODE_OK",
                        now - 7_000, 2_000_000L,
                        Map.of("service.name", "checkout-service",
                                "service.version", "1.2.3",
                                "host.name", "checkout-west",
                                "cloud.region", "us-west-2")),
                traceRow("trace-inventory", "span-root-5", null, "GET /inventory", "checkout-service", "STATUS_CODE_OK",
                        now - 6_000, 2_000_000L,
                        Map.of("service.name", "checkout-service",
                                "service.version", "1.2.3",
                                "host.name", "inventory-1",
                                "cloud.region", "us-east-1"))
        ));

        var page = entityTraceQueryService.queryTraceList(null, start, end, null,
                false, "checkout-service", null, null,
                "service.version=1.2.3 and host.name CONTAINS checkout "
                        + "and deployment.environment.name NOT EXISTS and cloud.region NOT CONTAINS west",
                null, null, null, 0, 20, false);

        assertEquals(1, page.getTotalElements());
        assertEquals("trace-stable", page.getContent().getFirst().getTraceId());
        ArgumentCaptor<Map<String, Set<String>>> pushedFilterCaptor = ArgumentCaptor.forClass(Map.class);
        verify(traceQueryRepository).queryRecentTraceRows(
                eq(1501), eq(start), eq(end), eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("default"), pushedFilterCaptor.capture(), eq(false));
        assertEquals(Map.of("service.version", Set.of("1.2.3")), pushedFilterCaptor.getValue());
        verify(traceQueryRepository, never()).queryTraceListRows(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyInt(), eq(TraceSort.NEWEST));
    }

    @Test
    void queryTraceListAppliesSpanAttributeFiltersWithRowFallback() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        Map<String, Object> matchingRow = traceRow("trace-checkout", "span-root-1", null, "GET /checkout",
                "checkout-service", "STATUS_CODE_OK", now - 10_000, 2_000_000L,
                Map.of("service.name", "checkout-service", "service.version", "1.2.3"));
        putFlattenedAttributes(matchingRow, "span_attributes.",
                Map.of("http.route", "/checkout/{id}", "span.kind", "server"));
        Map<String, Object> inventoryRow = traceRow("trace-inventory", "span-root-2", null, "GET /inventory",
                "checkout-service", "STATUS_CODE_OK", now - 9_000, 2_000_000L,
                Map.of("service.name", "checkout-service", "service.version", "1.2.3"));
        putFlattenedAttributes(inventoryRow, "span_attributes.",
                Map.of("http.route", "/inventory", "span.kind", "server"));
        Map<String, Object> databaseRow = traceRow("trace-db", "span-root-3", null, "GET /checkout",
                "checkout-service", "STATUS_CODE_OK", now - 8_000, 2_000_000L,
                Map.of("service.name", "checkout-service", "service.version", "1.2.3"));
        putFlattenedAttributes(databaseRow, "span_attributes.",
                Map.of("http.route", "/checkout/{id}", "db.system", "mysql"));
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1501), eq(start), eq(end), eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("default"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(false))).thenReturn(List.of(matchingRow, inventoryRow, databaseRow));

        var page = entityTraceQueryService.queryTraceList(null, start, end, null,
                false, "checkout-service", null, null,
                "service.version=1.2.3", null, null, null, 0, 20, false, null,
                "http.route CONTAINS checkout and db.system NOT EXISTS");

        assertEquals(1, page.getTotalElements());
        assertEquals("trace-checkout", page.getContent().getFirst().getTraceId());
        ArgumentCaptor<Map<String, Set<String>>> pushedFilterCaptor = ArgumentCaptor.forClass(Map.class);
        verify(traceQueryRepository).queryRecentTraceRows(
                eq(1501), eq(start), eq(end), eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("default"), pushedFilterCaptor.capture(), eq(false));
        assertEquals(Map.of("service.version", Set.of("1.2.3")), pushedFilterCaptor.getValue());
        verify(traceQueryRepository, never()).queryTraceListRows(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyInt(), eq(TraceSort.NEWEST));
    }

    @Test
    void queryTraceListMatchesSyntheticSpanNameAttributeFilters() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1501), eq(start), eq(end), eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("default"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(false))).thenReturn(List.of(
                traceRow("trace-checkout", "span-root-1", null, "POST /checkout",
                        "checkout-service", "STATUS_CODE_OK", now - 10_000, 2_000_000L,
                        Map.of("service.name", "checkout-service")),
                traceRow("trace-inventory", "span-root-2", null, "GET /inventory",
                        "checkout-service", "STATUS_CODE_OK", now - 9_000, 2_000_000L,
                        Map.of("service.name", "checkout-service"))
        ));

        var page = entityTraceQueryService.queryTraceList(null, start, end, null,
                false, "checkout-service", null, null,
                null, null, null, null, 0, 20, false, null,
                "span.name=\"POST /checkout\"");

        assertEquals(1, page.getTotalElements());
        assertEquals("trace-checkout", page.getContent().getFirst().getTraceId());
    }

    @Test
    void traceQueriesPreferEntityIdentityOverConflictingRouteContext() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        ObserveEntity entity = ObserveEntity.builder().id(1L).type("service").name("checkout-service").build();
        when(workspaceQueryGateway.findEntityById("team-a", 1L)).thenReturn(Optional.of(entity));
        when(workspaceQueryGateway.findIdentitiesByEntityId("team-a", 1L)).thenReturn(List.of(
                identity(1L, "service.name", "checkout-service", 100, true),
                identity(1L, "service.namespace", "commerce", 80, false),
                identity(1L, "deployment.environment.name", "prod", 70, false)
        ));
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        when(traceQueryRepository.supportsTraceOverviewRows()).thenReturn(true);
        when(traceQueryRepository.supportsTraceGroupByRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceListRows(
                eq(start), eq(end), eq(false), eq("checkout-service"), eq("commerce"),
                eq("prod"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(false), org.mockito.ArgumentMatchers.isNull(), eq(0), eq(20), eq(TraceSort.NEWEST), eq(false))).thenReturn(traceListPage(List.of(traceListRow(
                "trace-entity",
                "span-root",
                "/checkout",
                "checkout-service",
                "commerce",
                "STATUS_CODE_OK",
                now - 30_000,
                8_000_000L,
                0,
                1,
                1L,
                Map.of("service.name", "checkout-service",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod",
                        "hertzbeat.workspace_id", "team-a")))));
        when(traceQueryRepository.queryTraceOverviewRows(
                eq(start), eq(end), eq(false), eq("checkout-service"), eq("commerce"),
                eq("prod"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(false))).thenReturn(Map.of(
                "total_trace_count", 1L,
                "error_trace_count", 0L,
                "latest_observed_at", now - 30_000
        ));
        when(traceQueryRepository.queryTraceGroupByRows(
                eq(start), eq(end), eq(false), eq("checkout-service"), eq("commerce"),
                eq("prod"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(false), eq("service.name"), org.mockito.ArgumentMatchers.isNull(), eq(1L), eq(20)))
                .thenReturn(List.of(Map.of(
                        "group_value", "checkout-service",
                        "trace_count", 1L,
                        "error_trace_count", 0L,
                        "latency_avg_ms", 8.0d,
                        "latency_p95_ms", 8.0d
                )));

        String conflictingResourceFilter = "service.name=stale-route,deployment.environment.name=staging,http.route:/checkout";
        var page = entityTraceQueryService.queryTraceList(1L, start, end, null,
                false, "stale-route", "wrong-namespace", "staging",
                conflictingResourceFilter, null, null, null, 0, 20, false);
        TraceOverviewDto overview = entityTraceQueryService.getTraceOverview(1L, start, end, null,
                false, "stale-route", "wrong-namespace", "staging",
                conflictingResourceFilter, null, null, null, false);
        Map<String, Object> groups = entityTraceQueryService.getTraceGroupByStats(1L, start, end, null,
                false, "stale-route", "wrong-namespace", "staging",
                conflictingResourceFilter, null, null, null, "service.name", null, null, null, false);

        assertEquals("trace-entity", page.getContent().getFirst().getTraceId());
        assertEquals(1, overview.getTotalTraceCount());
        assertEquals(1, ((List<Map<String, Object>>) groups.get("groups")).size());
        ArgumentCaptor<Map<String, Set<String>>> listFilterCaptor = ArgumentCaptor.forClass(Map.class);
        verify(traceQueryRepository).queryTraceListRows(
                eq(start), eq(end), eq(false), eq("checkout-service"), eq("commerce"),
                eq("prod"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("team-a"), listFilterCaptor.capture(),
                eq(false), org.mockito.ArgumentMatchers.isNull(), eq(0), eq(20), eq(TraceSort.NEWEST), eq(false));
        assertEquals(Set.of("checkout-service"), listFilterCaptor.getValue().get("service.name"));
        assertEquals(Set.of("commerce"), listFilterCaptor.getValue().get("service.namespace"));
        assertEquals(Set.of("prod"), listFilterCaptor.getValue().get("deployment.environment.name"));
        assertEquals(Set.of("/checkout"), listFilterCaptor.getValue().get("http.route"));
    }

    @Test
    void queryTraceListCapsOversizedPageSizeBeforeRepositoryQuery() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceListRows(
                eq(start), eq(end), eq(false), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("default"),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(false), org.mockito.ArgumentMatchers.isNull(), eq(0), eq(1000), eq(TraceSort.NEWEST), eq(false)))
                .thenReturn(traceListPage(List.of(traceListRow(
                        "trace-capped",
                        "span-root",
                        "/checkout",
                        "checkout-service",
                        "commerce",
                        "STATUS_CODE_OK",
                        now - 30_000,
                        8_000_000L,
                        0,
                        1,
                        50_000L,
                        Map.of("service.name", "checkout-service")))));

        var page = entityTraceQueryService.queryTraceList(null, start, end, null,
                false, null, null, null, 0, 50_000, false);

        assertEquals(1000, page.getSize());
        assertEquals(0, page.getNumber());
        assertEquals(50_000L, page.getTotalElements());
        assertEquals("trace-capped", page.getContent().getFirst().getTraceId());
        verify(traceQueryRepository).queryTraceListRows(
                eq(start), eq(end), eq(false), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("default"),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(false), org.mockito.ArgumentMatchers.isNull(), eq(0), eq(1000), eq(TraceSort.NEWEST), eq(false));
    }

    @Test
    void queryTraceListNormalizesInvalidPaginationBeforeRepositoryQuery() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceListRows(
                eq(start), eq(end), eq(false), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("default"),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(false), org.mockito.ArgumentMatchers.isNull(), eq(0), eq(20), eq(TraceSort.NEWEST), eq(false)))
                .thenReturn(traceListPage(List.of(traceListRow(
                        "trace-normalized",
                        "span-root",
                        "/checkout",
                        "checkout-service",
                        "commerce",
                        "STATUS_CODE_OK",
                        now - 30_000,
                        8_000_000L,
                        0,
                        1,
                        1L,
                        Map.of("service.name", "checkout-service")))));

        var page = entityTraceQueryService.queryTraceList(null, start, end, null,
                false, null, null, null, -3, 0, false);

        assertEquals(20, page.getSize());
        assertEquals(0, page.getNumber());
        assertEquals("trace-normalized", page.getContent().getFirst().getTraceId());
        verify(traceQueryRepository).queryTraceListRows(
                eq(start), eq(end), eq(false), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("default"),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(false), org.mockito.ArgumentMatchers.isNull(), eq(0), eq(20), eq(TraceSort.NEWEST), eq(false));
    }

    @Test
    void getTraceOverviewUsesGreptimeAggregateWhenRepositorySupportsIt() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        ObserveEntity entity = ObserveEntity.builder().id(1L).type("service").name("checkout-service").build();
        when(workspaceQueryGateway.findEntityById("team-a", 1L)).thenReturn(Optional.of(entity));
        when(workspaceQueryGateway.findIdentitiesByEntityId("team-a", 1L)).thenReturn(List.of(
                identity(1L, "service.name", "checkout-service", 100, true),
                identity(1L, "service.namespace", "commerce", 80, false)
        ));
        when(traceQueryRepository.supportsTraceOverviewRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceOverviewRows(
                eq(start), eq(end), eq(true), eq("checkout-service"), eq("commerce"),
                eq("prod"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(true), eq("entrypoint"))).thenReturn(Map.of(
                "total_trace_count", 41L,
                "error_trace_count", 41L,
                "latest_observed_at", now - 30_000
        ));

        TraceOverviewDto overview = entityTraceQueryService.getTraceOverview(1L, start, end, null,
                true, "checkout-service", "commerce", "prod",
                null, null, null, null, true, "entrypoint");

        assertEquals(41, overview.getTotalTraceCount());
        assertEquals(41, overview.getErrorTraceCount());
        assertEquals(now - 30_000, overview.getLatestObservedAt());
        assertTrue(overview.isHasActiveTrace());
        ArgumentCaptor<Map<String, Set<String>>> identityFilterCaptor = ArgumentCaptor.forClass(Map.class);
        verify(traceQueryRepository).queryTraceOverviewRows(
                eq(start), eq(end), eq(true), eq("checkout-service"), eq("commerce"),
                eq("prod"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("team-a"), identityFilterCaptor.capture(), eq(true), eq("entrypoint"));
        assertEquals(Set.of("checkout-service"), identityFilterCaptor.getValue().get("service.name"));
        assertEquals(Set.of("commerce"), identityFilterCaptor.getValue().get("service.namespace"));
        verify(traceQueryRepository, never()).queryTraceListRows(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyInt(), eq(TraceSort.NEWEST));
        verify(traceQueryRepository, never()).queryRecentTraceRows(
                eq(1500), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void getTraceOverviewUsesGreptimeTraceIdAggregateWhenRepositorySupportsIt() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        ObserveEntity entity = ObserveEntity.builder().id(1L).type("service").name("checkout-service").build();
        when(workspaceQueryGateway.findEntityById("team-a", 1L)).thenReturn(Optional.of(entity));
        when(workspaceQueryGateway.findIdentitiesByEntityId("team-a", 1L)).thenReturn(List.of(
                identity(1L, "service.name", "checkout-service", 100, true),
                identity(1L, "service.namespace", "commerce", 80, false)
        ));
        when(traceQueryRepository.supportsTraceIdOverviewRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceIdOverviewRows(
                eq("trace-filtered"), eq(start), eq(end), eq(true), eq("checkout-service"), eq("commerce"),
                eq("prod"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(true), eq("root"))).thenReturn(Map.of(
                "total_trace_count", 1L,
                "error_trace_count", 1L,
                "latest_observed_at", now - 30_000
        ));

        TraceOverviewDto overview = entityTraceQueryService.getTraceOverview(1L, start, end, "trace-filtered",
                true, "checkout-service", "commerce", "prod",
                null, null, null, null, true, "root");

        assertEquals(1, overview.getTotalTraceCount());
        assertEquals(1, overview.getErrorTraceCount());
        assertEquals(now - 30_000, overview.getLatestObservedAt());
        assertTrue(overview.isHasActiveTrace());
        ArgumentCaptor<Map<String, Set<String>>> identityFilterCaptor = ArgumentCaptor.forClass(Map.class);
        verify(traceQueryRepository).queryTraceIdOverviewRows(
                eq("trace-filtered"), eq(start), eq(end), eq(true), eq("checkout-service"), eq("commerce"),
                eq("prod"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("team-a"), identityFilterCaptor.capture(), eq(true), eq("root"));
        assertEquals(Set.of("checkout-service"), identityFilterCaptor.getValue().get("service.name"));
        assertEquals(Set.of("commerce"), identityFilterCaptor.getValue().get("service.namespace"));
        verify(traceQueryRepository, never()).queryTraceRows(
                eq("trace-filtered"), eq(5000), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
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
        when(workspaceQueryGateway.findEntityById("team-a", 1L)).thenReturn(Optional.of(entity));
        when(workspaceQueryGateway.findIdentitiesByEntityId("team-a", 1L)).thenReturn(List.of(
                identity(1L, "service.name", "checkout-service", 100, true),
                identity(1L, "service.namespace", "commerce", 80, false)
        ));
        when(traceQueryRepository.queryTraceRows(
                eq("trace-filtered"), eq(5001), eq(start), eq(end), eq("checkout-service"), eq("commerce"),
                eq("prod"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("team-a"),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), eq(true)))
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
                eq("trace-filtered"), eq(5001), eq(start), eq(end), eq("checkout-service"), eq("commerce"),
                eq("prod"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), eq("team-a"), identityFilterCaptor.capture(), eq(true));
        assertEquals(Set.of("checkout-service"), identityFilterCaptor.getValue().get("service.name"));
        assertEquals(Set.of("commerce"), identityFilterCaptor.getValue().get("service.namespace"));
        verify(traceQueryRepository, never()).queryRecentTraceRows(
                eq(1501), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void queryTraceListPushesOperationAndDurationFiltersToRepository() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceListRows(
                eq(start), eq(end), eq(false), eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                eq("prod"), eq("POST /checkout"), eq(100_000_000L), eq(500_000_000L),
                eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(false), org.mockito.ArgumentMatchers.isNull(), eq(0), eq(20), eq(TraceSort.NEWEST), eq(false))).thenReturn(traceListPage(List.of(traceListRow(
                "trace-duration",
                "span-root",
                "POST /checkout",
                "checkout-service",
                null,
                "STATUS_CODE_OK",
                now - 30_000,
                250_000_000L,
                0,
                1,
                1L,
                Map.of("service.name", "checkout-service",
                        "deployment.environment.name", "prod",
                        "hertzbeat.workspace_id", "team-a")))));

        var page = entityTraceQueryService.queryTraceList(null, start, end, null,
                false, "checkout-service", null, "prod",
                "POST /checkout", 100L, 500L, 0, 20, false);

        assertEquals(1, page.getTotalElements());
        assertEquals("trace-duration", page.getContent().getFirst().getTraceId());
        verify(traceQueryRepository).queryTraceListRows(
                eq(start), eq(end), eq(false), eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                eq("prod"), eq("POST /checkout"), eq(100_000_000L), eq(500_000_000L),
                eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(false), org.mockito.ArgumentMatchers.isNull(), eq(0), eq(20), eq(TraceSort.NEWEST), eq(false));
        verify(traceQueryRepository, never()).queryRecentTraceRows(
                eq(1500), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void queryTraceListPushesSpanScopeToStorageRows() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceListRows(
                eq(start), eq(end), eq(false), eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                eq("prod"), eq("POST /checkout"), eq(100_000_000L), eq(500_000_000L),
                eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(false), eq("entrypoint"), eq(0), eq(20), eq(TraceSort.NEWEST), eq(false))).thenReturn(traceListPage(List.of(traceListRow(
                "trace-entry",
                "span-entry",
                "POST /checkout",
                "checkout-service",
                null,
                "STATUS_CODE_OK",
                now - 30_000,
                250_000_000L,
                0,
                1,
                1L,
                Map.of("service.name", "checkout-service",
                        "deployment.environment.name", "prod",
                        "hertzbeat.workspace_id", "team-a")))));

        var page = entityTraceQueryService.queryTraceList(null, start, end, null,
                false, "checkout-service", null, "prod",
                null, "POST /checkout", 100L, 500L, 0, 20, false, "entrypoint");

        assertEquals(1, page.getTotalElements());
        assertEquals("trace-entry", page.getContent().getFirst().getTraceId());
        verify(traceQueryRepository).queryTraceListRows(
                eq(start), eq(end), eq(false), eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                eq("prod"), eq("POST /checkout"), eq(100_000_000L), eq(500_000_000L),
                eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(false), eq("entrypoint"), eq(0), eq(20), eq(TraceSort.NEWEST), eq(false));
    }

    @Test
    void queryTraceListPushesResourceFilterToRepository() {
        long now = System.currentTimeMillis();
        long start = now - 120_000;
        long end = now;
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(traceQueryRepository.supportsTraceListRows()).thenReturn(true);
        when(traceQueryRepository.queryTraceListRows(
                eq(start), eq(end), eq(false), eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                eq("prod"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, Set<String>>>any(),
                eq(false), org.mockito.ArgumentMatchers.isNull(), eq(0), eq(20), eq(TraceSort.NEWEST), eq(false))).thenReturn(traceListPage(List.of(traceListRow(
                "trace-resource",
                "span-root",
                "POST /checkout",
                "checkout-service",
                null,
                "STATUS_CODE_OK",
                now - 30_000,
                250_000_000L,
                0,
                1,
                1L,
                Map.of("service.name", "checkout-service",
                        "service.version", "1.2.3",
                        "http.route", "/checkout",
                        "deployment.environment.name", "prod",
                        "hertzbeat.collector.id", "collector-a",
                        "hertzbeat.workspace_id", "team-a")))));

        var page = entityTraceQueryService.queryTraceList(null, start, end, null,
                false, "checkout-service", null, "prod",
                "service.version=1.2.3,http.route:/checkout,hertzbeat.collector.id=collector-a",
                null, null, null, 0, 20, false);

        assertEquals(1, page.getTotalElements());
        assertEquals("trace-resource", page.getContent().getFirst().getTraceId());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Set<String>>> filtersCaptor = ArgumentCaptor.forClass(Map.class);
        verify(traceQueryRepository).queryTraceListRows(
                eq(start), eq(end), eq(false), eq("checkout-service"), org.mockito.ArgumentMatchers.isNull(),
                eq("prod"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                eq("team-a"), filtersCaptor.capture(),
                eq(false), org.mockito.ArgumentMatchers.isNull(), eq(0), eq(20), eq(TraceSort.NEWEST), eq(false));
        Map<String, Set<String>> filters = filtersCaptor.getValue();
        assertEquals(Set.of("1.2.3"), filters.get("service.version"));
        assertEquals(Set.of("/checkout"), filters.get("http.route"));
        assertEquals(Set.of("collector-a"), filters.get("hertzbeat.collector.id"));
    }

    @Test
    void queryTraceListAndOverviewUseRequestWorkspaceContext() {
        long now = System.currentTimeMillis();
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(traceQueryRepository.queryRecentTraceRows(
                eq(1501), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), eq("team-a"),
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
                org.mockito.ArgumentMatchers.<TraceRowQuery>argThat(
                        query -> "trace-shared".equals(query.traceId()) && "team-a".equals(query.workspaceId())),
                eq(5000))).thenReturn(List.of(
                traceRow("trace-shared", "span-root-b", null, "GET /payment", "payment-service", "STATUS_CODE_OK",
                        now - 10_000, 2_000_000L,
                        Map.of("service.name", "payment-service", "hertzbeat.workspace_id", "team-b"))
        ));

        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-shared");

        assertNull(detail);
        assertTrue(entityTraceQueryService.getTraceSpans(null, "trace-shared").isEmpty());
    }

    @Test
    void getTraceDetailReadsOnlyFlattenedPhysicalAttributeColumns() {
        long now = System.currentTimeMillis();
        Map<String, Object> row = traceRow("trace-attribution", "span-root", null, "POST /checkout",
                "checkout", "STATUS_CODE_OK", now, 4_000_000L, Map.of());
        row.put("resource_attributes.service.namespace", "payments");
        row.put("resource_attributes.deployment.environment.name", "prod-east");
        row.put("resource_attributes.hertzbeat.entity_id", "4200");
        row.put("resource_attributes.hertzbeat.entity_name", "Checkout API");
        row.put("resource_attributes.hertzbeat.collector.id", "collector-a");
        row.put("resource_attributes.hertzbeat.template", "spring-boot");
        row.put("span_attributes.db.statement", "select 1");
        row.put("resource_attributes", Map.of("legacy.attribute", "must-not-be-read"));
        row.put("span_attributes", Map.of("legacy.attribute", "must-not-be-read"));
        stubDefaultWorkspaceTraceRows("trace-attribution", List.of(row));

        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-attribution");

        assertNotNull(detail);
        assertEquals("4200", detail.getResourceAttributes().get("hertzbeat.entity_id"));
        assertEquals("Checkout API", detail.getResourceAttributes().get("hertzbeat.entity_name"));
        assertEquals("collector-a", detail.getResourceAttributes().get("hertzbeat.collector.id"));
        assertEquals("spring-boot", detail.getResourceAttributes().get("hertzbeat.template"));
        assertEquals("payments", detail.getServiceNamespace());
        assertEquals("prod-east", detail.getResourceAttributes().get("deployment.environment.name"));
        assertEquals("select 1", detail.getSpans().getFirst().getSpanAttributes().get("db.statement"));
        assertFalse(detail.getResourceAttributes().containsKey("legacy.attribute"));
        assertFalse(detail.getSpans().getFirst().getSpanAttributes().containsKey("legacy.attribute"));
    }

    @Test
    void traceDetailRejectsUnsignedGreptimeDurationOutsideSupportedRange() {
        Map<String, Object> row = traceRow("trace-unsigned-duration", "span-root", null, "GET /checkout",
                "checkout-service", "STATUS_CODE_OK", System.currentTimeMillis(), 1L,
                Map.of("service.name", "checkout-service"));
        row.put("duration_nano", BigInteger.valueOf(Long.MAX_VALUE).add(BigInteger.ONE));
        stubDefaultWorkspaceTraceRows("trace-unsigned-duration", List.of(row));

        assertThrows(TelemetryStorageUnavailableException.class,
                () -> entityTraceQueryService.getTraceDetail(null, "trace-unsigned-duration"));
    }

    @Test
    void traceDetailRejectsDecimalGreptimeDurationOutsideSupportedRange() {
        Map<String, Object> row = traceRow("trace-decimal-duration", "span-root", null, "GET /checkout",
                "checkout-service", "STATUS_CODE_OK", System.currentTimeMillis(), 1L,
                Map.of("service.name", "checkout-service"));
        row.put("duration_nano", BigDecimal.valueOf(Long.MAX_VALUE).add(BigDecimal.ONE));
        stubDefaultWorkspaceTraceRows("trace-decimal-duration", List.of(row));

        assertThrows(TelemetryStorageUnavailableException.class,
                () -> entityTraceQueryService.getTraceDetail(null, "trace-decimal-duration"));
    }

    @Test
    void traceDetailRejectsNegativeGreptimeDurationWithoutFabricatingZero() {
        Map<String, Object> row = traceRow("trace-negative-duration", "span-root", null, "GET /checkout",
                "checkout-service", "STATUS_CODE_OK", System.currentTimeMillis(), 1L,
                Map.of("service.name", "checkout-service"));
        row.put("duration_nano", -1L);
        stubDefaultWorkspaceTraceRows("trace-negative-duration", List.of(row));

        assertThrows(TelemetryStorageUnavailableException.class,
                () -> entityTraceQueryService.getTraceDetail(null, "trace-negative-duration"));
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
        stubDefaultWorkspaceTraceRows("trace-dropped-count", List.of(row));

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
        stubDefaultWorkspaceTraceRows("trace-negative-dropped-count", List.of(row));

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
        stubDefaultWorkspaceTraceRows("trace-epoch-millis", List.of(row));

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
        stubDefaultWorkspaceTraceRows("trace-epoch-millis-string", List.of(row));

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
        stubDefaultWorkspaceTraceRows("trace-offset-timestamp", List.of(row));

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
        stubDefaultWorkspaceTraceRows("trace-zoned-timestamp", List.of(row));

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
        stubDefaultWorkspaceTraceRows("trace-sql-date-timestamp", List.of(row));

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
        stubDefaultWorkspaceTraceRows("trace-orphan", List.of(rootRow, orphanRow));

        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(null, "trace-orphan");

        assertNotNull(detail);
        assertEquals(2, detail.getSpans().size());
        assertEquals("span-root", detail.getSpans().getFirst().getSpanId());
        assertEquals("span-orphan", detail.getSpans().get(1).getSpanId());
        assertEquals(1, detail.getErrorSpanCount());
    }

    @Test
    void traceListFallbackUsesExactSourceTimeBeforeChoosingRepresentativeAndRounding() {
        String traceId = "0123456789abcdef0123456789abcdef";
        Map<String, Object> later = traceRow(traceId, "0000000000000001", "0000000000000003", "later", "checkout",
                "UNSET", 1_710_000_000_000L, 500_000L, Map.of("hertzbeat.workspace_id", "default"));
        Map<String, Object> earlier = traceRow(traceId, "0000000000000002", "0000000000000003", "earlier", "checkout",
                "UNSET", 1_710_000_000_000L, 1_000_000L, Map.of("hertzbeat.workspace_id", "default"));
        later.put("timestamp", Timestamp.from(Instant.parse("2024-03-09T16:00:00.000900Z")));
        later.put("span_status_code", "STATUS_CODE_OK");
        later.put("timestamp_end", Timestamp.from(Instant.parse("2024-03-09T16:00:00.001400Z")));
        earlier.put("timestamp", Timestamp.from(Instant.parse("2024-03-09T16:00:00.000100Z")));
        earlier.put("timestamp_end", Timestamp.from(Instant.parse("2024-03-09T16:00:00.001100Z")));
        when(traceQueryRepository.queryTraceRows(traceId, 5001, null, null, null, null, null, null, null, null,
                "default", Map.of(), false)).thenReturn(List.of(later, earlier));
        var item = entityTraceQueryService.queryTraceList("default", null, null, null, traceId, null,
                null, null, null, null, null, null, null, 0, 20, false, null, null).getContent().getFirst();
        assertEquals("0000000000000002", item.getRepresentativeSpan().spanId());
        assertEquals(1_710_000_000_000L, item.getObservedStartTime());
        assertEquals(1_710_000_000_002L, item.getObservedEndTime());
        assertNull(item.getRootSpanId());
        assertEquals("unset", item.getStatus());
    }

    @Test
    void analyticsFallbackUsesSameSpanPredicatesAndExactExclusiveBoundary() {
        var window = new org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics.Window(1000, 2000, true);
        var query = new org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService.AnalyticsQuery(
                "default", null, window, "matched_spans", null, false, "checkout", null, null,
                null, "db.statement=select 1", "GET /checkout", null, null, null, false);
        var rows = List.of(
                traceRow("0123456789abcdef0123456789abcdef", "0000000000000001", null, "GET /checkout", "checkout",
                        "OK", 1500, 1000, Map.of("hertzbeat.workspace_id", "default")),
                traceRow("0123456789abcdef0123456789abcdef", "0000000000000002", null, "GET /checkout", "checkout",
                        "ERROR", 2000, 1000, Map.of("hertzbeat.workspace_id", "default")),
                traceRow("fedcba9876543210fedcba9876543210", "0000000000000003", null, "POST /payment", "checkout",
                        "OK", 1600, 1000, Map.of("hertzbeat.workspace_id", "default")));
        when(traceQueryRepository.queryRecentTraceRows(org.mockito.ArgumentMatchers.any(TraceRowQuery.class), eq(1501)))
                .thenReturn(rows);
        var result = entityTraceQueryService.queryAnalytics(query,
                new org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics.Options("histogram", null, 20, 2, 0, 20, "newest"));
        assertEquals("ready", result.state());
        assertEquals("bounded", result.coverage().mode());
        assertEquals(3, result.coverage().scannedRows());
        var data = (org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics.Histogram) result.data();
        assertEquals(1, data.totalCount());
        assertEquals(0, data.errorCount());
    }

    private void stubDefaultWorkspaceTraceRows(String traceId, List<Map<String, Object>> rows) {
        when(traceQueryRepository.queryTraceRows(
                org.mockito.ArgumentMatchers.<TraceRowQuery>argThat(query -> traceId.equals(query.traceId())
                        && "default".equals(query.workspaceId())),
                eq(5000))).thenReturn(rows);
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
        putFlattenedAttributes(row, "resource_attributes.", resourceAttributes);
        putFlattenedAttributes(row, "span_attributes.", Map.of("db.statement", "select 1"));
        return row;
    }

    private void putFlattenedAttributes(Map<String, Object> row,
                                        String prefix,
                                        Map<String, String> attributes) {
        attributes.forEach((key, value) -> row.put(prefix + key, value));
    }

    private static TraceQueryRepository.TraceListPage traceListPage(List<Map<String, Object>> rows) {
        Object total = rows.isEmpty() ? null : rows.getFirst().get("total_count");
        return new TraceQueryRepository.TraceListPage(rows, total instanceof Number number ? number.longValue() : 0L);
    }

    private Map<String, Object> traceListRow(String traceId, String rootSpanId, String rootSpanName,
                                             String serviceName, String serviceNamespace, String status,
                                             long timestampMillis, long durationNanos, int errorSpanCount,
                                             int spanCount, long totalCount,
                                             Map<String, String> resourceAttributes) {
        Map<String, Object> row = traceRow(traceId, rootSpanId, null, rootSpanName, serviceName, status,
                timestampMillis, durationNanos, resourceAttributes);
        row.put("root_span_id", rootSpanId);
        row.put("root_span_name", rootSpanName);
        row.put("service_namespace", serviceNamespace);
        row.put("error_span_count", errorSpanCount);
        row.put("span_count", spanCount);
        row.put("root_span_count", 1L);
        row.put("representative_span_id", rootSpanId);
        row.put("representative_span_name", rootSpanName);
        row.put("representative_service_name", serviceName);
        row.put("representative_service_namespace", serviceNamespace);
        row.put("representative_start_nanos", timestampMillis * 1_000_000L);
        row.put("representative_duration_nano", durationNanos);
        row.put("observed_start_nanos", timestampMillis * 1_000_000L);
        row.put("observed_end_nanos", timestampMillis * 1_000_000L + durationNanos);
        row.put("evidence_span_count", (long) spanCount);
        row.put("evidence_distinct_span_count", (long) spanCount);
        row.put("invalid_span_count", 0L);
        row.put("stats_service_name", serviceName);
        row.put("service_span_count", (long) spanCount);
        row.put("service_error_span_count", (long) errorSpanCount);
        row.put("service_row_count", 1L);
        row.put("total_count", totalCount);
        return row;
    }
}
