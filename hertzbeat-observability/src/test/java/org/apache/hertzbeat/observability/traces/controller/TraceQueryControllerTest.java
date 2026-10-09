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

package org.apache.hertzbeat.observability.traces.controller;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceRepresentativeSpanDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceOverviewDto;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.observability.traces.dto.TraceListPageDto;
import org.apache.hertzbeat.observability.traces.dto.TraceStructureQuery;
import org.apache.hertzbeat.observability.traces.dto.TraceStructureAnalysis;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.apache.hertzbeat.warehouse.repository.TraceQueryRepository.TraceSort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class TraceQueryControllerTest {

    private static final String VALID_TRACE_ID = "0123456789abcdef0123456789abcdef";
    private static final String SECOND_VALID_TRACE_ID = "fedcba9876543210fedcba9876543210";

    private MockMvc mockMvc;

    @Mock
    private EntityTraceQueryService entityTraceQueryService;

    @Mock
    private org.apache.hertzbeat.observability.investigation.service.TraceInvestigationReadModelService
            investigationReadModelService;

    @BeforeEach
    void setUp() {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        TraceQueryController controller = new TraceQueryController(entityTraceQueryService,
                new ObservabilityQueryAdmissionService(8, 8, 8, 4, 8, Duration.ofMillis(100)),
                investigationReadModelService);
        this.mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @AfterEach
    void tearDown() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void structuralQueryForwardsExactClausesAndRejectsUnknownScope() throws Exception {
        var query = new TraceStructureQuery(1000L, 2000L,
                new TraceStructureQuery.Clause("checkout", null, null),
                new TraceStructureQuery.Clause("cart", null, "ERROR"), TraceStructureQuery.Relation.DIRECT, 0, 20);
        when(entityTraceQueryService.queryTraceStructure("team-a", query))
                .thenReturn(new TraceListPageDto(List.of(), PageRequest.of(0, 20), 0,
                        new TraceListPageDto.Query("newest", "bounded", 1500, false)));

        mockMvc.perform(get("/api/traces/structure").param("start", "1000").param("end", "2000")
                        .param("aServiceName", "checkout").param("bServiceName", "cart")
                        .param("bStatus", "ERROR").param("relation", "direct"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.query.coverage").value("bounded"))
                .andExpect(jsonPath("$.data.query.rowLimit").value(1500));
        verify(entityTraceQueryService).queryTraceStructure("team-a", query);

        for (String invalid : List.of("/api/traces/structure?start=1000&end=2000&aServiceName=checkout&relation=direct",
                "/api/traces/structure?start=1000&end=2000&aServiceName=checkout&bServiceName=cart&relation=not",
                "/api/traces/structure?start=1000&end=2000&aServiceName=checkout&bServiceName=cart&relation=direct&workspaceId=other")) {
            assertThrows(Exception.class, () -> mockMvc.perform(get(invalid)));
        }
    }

    @Test
    void structuralAnalysisUsesTheSameValidatedPopulationAndReportsCoverage() throws Exception {
        var query = new TraceStructureQuery(1000L, 2000L,
                new TraceStructureQuery.Clause("checkout", null, null),
                new TraceStructureQuery.Clause("cart", null, "ERROR"), TraceStructureQuery.Relation.DIRECT, 0, 20);
        when(entityTraceQueryService.queryTraceStructureAnalysis("team-a", query))
                .thenReturn(new TraceStructureAnalysis(1500, 6, false, 2, List.of(), false, List.of(), false));
        mockMvc.perform(get("/api/traces/structure/analysis").param("start", "1000").param("end", "2000")
                        .param("aServiceName", "checkout").param("bServiceName", "cart")
                        .param("bStatus", "ERROR").param("relation", "direct"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scannedRows").value(6))
                .andExpect(jsonPath("$.data.matchedTraces").value(2));
        verify(entityTraceQueryService).queryTraceStructureAnalysis("team-a", query);
        assertThrows(Exception.class, () -> mockMvc.perform(get("/api/traces/structure/analysis")
                .param("start", "1000").param("end", "2000").param("aServiceName", "checkout")
                .param("bServiceName", "cart").param("relation", "direct").param("serviceName", "outside")));
    }

    @Test
    void externalTraceReadsFailClosedWithoutTrustedWorkspace() {
        AuthTokenRequestContext.clear();

        for (String path : List.of(
                "/api/traces/list",
                "/api/traces/stats/overview",
                "/api/traces/stats/group-by?groupBy=service",
                "/api/traces/0123456789abcdef0123456789abcdef?start=1000&end=2000")) {
            Exception exception = assertThrows(Exception.class, () -> mockMvc.perform(get(path)));
            Throwable rootCause = exception;
            while (rootCause.getCause() != null) {
                rootCause = rootCause.getCause();
            }
            assertInstanceOf(TelemetryStorageUnavailableException.class, rootCause);
        }
        verifyNoInteractions(entityTraceQueryService);
    }

    @Test
    void forwardsDurationOrderingAndSerializesExplicitQueryCoverageAlongsidePageFields() throws Exception {
        when(entityTraceQueryService.queryTraceList("team-a", null, null, null, null, null,
                null, null, null, null, null, null, null, 0, 20, null, null, null, TraceSort.DURATION_DESC, false))
                .thenReturn(new TraceListPageDto(
                        List.of(), PageRequest.of(0, 20), 0,
                        new TraceListPageDto.Query(
                                "duration_desc", "window", null, false)));

        mockMvc.perform(get("/api/traces/list").param("sort", "duration_desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isEmpty())
                .andExpect(jsonPath("$.data.totalElements").value(0))
                .andExpect(jsonPath("$.data.query.sort").value("duration_desc"))
                .andExpect(jsonPath("$.data.query.coverage").value("window"))
                .andExpect(jsonPath("$.data.query.truncated").value(false))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .string(org.hamcrest.Matchers.containsString("\"rowLimit\":null")));
    }

    @Test
    void rejectsUnknownTraceSortBeforeQueryingStorage() {
        Exception exception = assertThrows(Exception.class,
                () -> mockMvc.perform(get("/api/traces/list").param("sort", "oldest")));
        Throwable cause = exception;
        while (cause.getCause() != null) {
            cause = cause.getCause();
        }
        assertInstanceOf(org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException.class, cause);
        verifyNoInteractions(entityTraceQueryService);
    }

    @Test
    void rejectsNonLowerHexSelectionBeforeInvestigationQuery() {
        assertThrows(Exception.class, () -> mockMvc.perform(get(
                "/api/traces/0123456789ABCDEF0123456789ABCDEF?start=1000&end=2000")));

        verifyNoInteractions(investigationReadModelService);
    }

    @Test
    void shouldForwardHideInternalFilterToTraceListQuery() throws Exception {
        TraceListItemDto item = new TraceListItemDto(
                VALID_TRACE_ID,
                "0123456789abcdef",
                "checkout",
                "commerce",
                "GET /checkout",
                2_000_000L,
                "STATUS_CODE_OK",
                1_710_000_000_000L,
                0,
                4L,
                Map.of("checkout", new org.apache.hertzbeat.common.observability.dto.trace.TraceServiceStatsDto(4, 0)),
                Map.of("service.name", "checkout"), "unique", 1L,
                representativeSpan(), 1_710_000_000_000L, 1_710_000_000_002L, null
        );
        when(entityTraceQueryService.queryTraceList(
                "team-a", 1L, 100L, 200L, VALID_TRACE_ID, true, "checkout", "commerce", "prod",
                "service.version=1.2.3 and hertzbeat.entity_type=\"service\" and hertzbeat.collector.id=\"collector-a\"", "GET /checkout",
                100L, 500L, 2, 50, true, null, "http.route CONTAINS checkout", TraceSort.NEWEST, false))
                .thenReturn(new PageImpl<>(List.of(item), PageRequest.of(2, 50), 1));

        mockMvc.perform(get("/api/traces/list")
                        .param("entityId", "1")
                        .param("start", "100")
                        .param("end", "200")
                        .param("traceId", VALID_TRACE_ID)
                        .param("entityType", "service")
                        .param("errorOnly", "true")
                        .param("serviceName", "checkout")
                        .param("serviceNamespace", "commerce")
                        .param("environment", "prod")
                        .param("collectorId", "collector-a")
                        .param("resourceFilter", "service.version=1.2.3")
                        .param("attributeFilter", "http.route CONTAINS checkout")
                        .param("operationName", "GET /checkout")
                        .param("minDurationMs", "100")
                        .param("maxDurationMs", "500")
                        .param("hideInternal", "true")
                        .param("pageIndex", "2")
                        .param("pageSize", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.content[0].traceId").value(VALID_TRACE_ID))
                .andExpect(jsonPath("$.data.content[0].serviceName").value("checkout"))
                .andExpect(jsonPath("$.data.content[0].spanCount").value(4));

        verify(entityTraceQueryService).queryTraceList(
                "team-a", 1L, 100L, 200L, VALID_TRACE_ID, true, "checkout", "commerce", "prod",
                "service.version=1.2.3 and hertzbeat.entity_type=\"service\" and hertzbeat.collector.id=\"collector-a\"", "GET /checkout",
                100L, 500L, 2, 50, true, null, "http.route CONTAINS checkout", TraceSort.NEWEST, false);
    }

    @Test
    void shouldForwardSpanScopeToTraceListQuery() throws Exception {
        TraceListItemDto item = new TraceListItemDto(
                SECOND_VALID_TRACE_ID,
                "0123456789abcdef",
                "checkout",
                "commerce",
                "POST /checkout",
                2_000_000L,
                "STATUS_CODE_OK",
                1_710_000_000_000L,
                0,
                1L,
                Map.of("checkout", new org.apache.hertzbeat.common.observability.dto.trace.TraceServiceStatsDto(1, 0)),
                Map.of("service.name", "checkout"), "unique", 1L,
                representativeSpan(), 1_710_000_000_000L, 1_710_000_000_002L, null
        );
        when(entityTraceQueryService.queryTraceList(
                "team-a", null, 100L, 200L, null, false, "checkout", null, "prod",
                null, "POST /checkout", 100L, 500L, 0, 20, null, "entrypoint", null, TraceSort.NEWEST, false))
                .thenReturn(new PageImpl<>(List.of(item), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/traces/list")
                        .param("start", "100")
                        .param("end", "200")
                        .param("errorOnly", "false")
                        .param("serviceName", "checkout")
                        .param("environment", "prod")
                        .param("operationName", "POST /checkout")
                        .param("minDurationMs", "100")
                        .param("maxDurationMs", "500")
                        .param("spanScope", "entrypoint"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.content[0].traceId").value(SECOND_VALID_TRACE_ID));

        verify(entityTraceQueryService).queryTraceList(
                "team-a", null, 100L, 200L, null, false, "checkout", null, "prod",
                null, "POST /checkout", 100L, 500L, 0, 20, null, "entrypoint", null, TraceSort.NEWEST, false);
    }

    @Test
    void traceListFailsClosedWhenSpanCompletenessEvidenceIsMissing() {
        TraceListItemDto incomplete = new TraceListItemDto(
                VALID_TRACE_ID,
                "span-root",
                "checkout",
                "commerce",
                "GET /checkout",
                2_000_000L,
                "STATUS_CODE_OK",
                1_710_000_000_000L,
                0,
                null,
                null,
                Map.of("service.name", "checkout"), "unique", 1L,
                representativeSpan(), 1_710_000_000_000L, 1_710_000_000_002L, null
        );
        when(entityTraceQueryService.queryTraceList(
                "team-a", null, 100L, 200L, null, null, null, null, null,
                null, null, null, null, 0, 20, null, null, null, TraceSort.NEWEST, false))
                .thenReturn(new PageImpl<>(List.of(incomplete), PageRequest.of(0, 20), 1));

        Exception exception = assertThrows(Exception.class, () -> mockMvc.perform(get("/api/traces/list")
                .param("start", "100")
                .param("end", "200")));

        assertInstanceOf(TelemetryStorageUnavailableException.class, rootCause(exception));
    }

    @Test
    void traceListFailsClosedWhenServiceStatsDoNotMatchTraceTotals() {
        TraceListItemDto inconsistent = new TraceListItemDto(
                VALID_TRACE_ID,
                "span-root",
                "checkout",
                "commerce",
                "GET /checkout",
                2_000_000L,
                "STATUS_CODE_ERROR",
                1_710_000_000_000L,
                1,
                3L,
                Map.of("checkout",
                        new org.apache.hertzbeat.common.observability.dto.trace.TraceServiceStatsDto(2, 1)),
                Map.of("service.name", "checkout"), "unique", 1L,
                representativeSpan(), 1_710_000_000_000L, 1_710_000_000_002L, null
        );
        when(entityTraceQueryService.queryTraceList(
                "team-a", null, 100L, 200L, null, null, null, null, null,
                null, null, null, null, 0, 20, null, null, null, TraceSort.NEWEST, false))
                .thenReturn(new PageImpl<>(List.of(inconsistent), PageRequest.of(0, 20), 1));

        Exception exception = assertThrows(Exception.class, () -> mockMvc.perform(get("/api/traces/list")
                .param("start", "100")
                .param("end", "200")));

        assertInstanceOf(TelemetryStorageUnavailableException.class, rootCause(exception));
    }

    @Test
    void traceListFailsClosedWhenCountsCannotBeRepresentedByStrictWireContract() {
        TraceListItemDto oversized = new TraceListItemDto(
                VALID_TRACE_ID,
                "span-root",
                "checkout",
                "commerce",
                "GET /checkout",
                2_000_000L,
                "STATUS_CODE_OK",
                1_710_000_000_000L,
                0,
                Long.MAX_VALUE,
                Map.of("checkout",
                        new org.apache.hertzbeat.common.observability.dto.trace.TraceServiceStatsDto(
                                Long.MAX_VALUE, 0)),
                Map.of("service.name", "checkout"), "unique", 1L,
                representativeSpan(), 1_710_000_000_000L, 1_710_000_000_002L, null
        );
        when(entityTraceQueryService.queryTraceList(
                "team-a", null, 100L, 200L, null, null, null, null, null,
                null, null, null, null, 0, 20, null, null, null, TraceSort.NEWEST, false))
                .thenReturn(new PageImpl<>(List.of(oversized), PageRequest.of(0, 20), 1));

        Exception exception = assertThrows(Exception.class, () -> mockMvc.perform(get("/api/traces/list")
                .param("start", "100")
                .param("end", "200")));

        assertInstanceOf(TelemetryStorageUnavailableException.class, rootCause(exception));
    }

    @Test
    void traceListFailsClosedWhenIdentityOrTimingCannotSatisfyStrictWireContract() {
        TraceListItemDto uppercaseTraceId = completeTraceListItem();
        uppercaseTraceId.setTraceId("0123456789ABCDEF0123456789ABCDEF");
        TraceListItemDto shortTraceId = completeTraceListItem();
        shortTraceId.setTraceId("0123456789abcdef");
        TraceListItemDto blankRootName = completeTraceListItem();
        blankRootName.setRootSpanName(" ");
        TraceListItemDto missingStart = completeTraceListItem();
        missingStart.setStartTime(null);
        TraceListItemDto nonPositiveStart = completeTraceListItem();
        nonPositiveStart.setStartTime(0L);
        TraceListItemDto oversizedStart = completeTraceListItem();
        oversizedStart.setStartTime(9_007_199_254_740_992L);
        TraceListItemDto missingDuration = completeTraceListItem();
        missingDuration.setDurationNanos(null);
        TraceListItemDto negativeDuration = completeTraceListItem();
        negativeDuration.setDurationNanos(-1L);
        TraceListItemDto oversizedDuration = completeTraceListItem();
        oversizedDuration.setDurationNanos(9_007_199_254_740_992L);

        for (TraceListItemDto malformed : List.of(
                uppercaseTraceId, shortTraceId, blankRootName, missingStart, nonPositiveStart,
                oversizedStart, missingDuration, negativeDuration, oversizedDuration)) {
            when(entityTraceQueryService.queryTraceList(
                    "team-a", null, 100L, 200L, null, null, null, null, null,
                    null, null, null, null, 0, 20, null, null, null, TraceSort.NEWEST, false))
                    .thenReturn(new PageImpl<>(List.of(malformed), PageRequest.of(0, 20), 1));

            Exception exception = assertThrows(Exception.class, () -> mockMvc.perform(get("/api/traces/list")
                    .param("start", "100")
                    .param("end", "200")));

            assertInstanceOf(TelemetryStorageUnavailableException.class, rootCause(exception));
        }
    }

    @Test
    void shouldMapInstanceAndHttpRouteToStrictTraceFilters() throws Exception {
        when(entityTraceQueryService.queryTraceList(
                "team-a", null, 100L, 200L, null, false, "checkout", "commerce", "prod",
                "service.instance.id=\"checkout-7d9\"", null, null, null, 0, 20, null, null,
                "http.route=\"/checkout\"", TraceSort.NEWEST, false))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        mockMvc.perform(get("/api/traces/list")
                        .param("start", "100")
                        .param("end", "200")
                        .param("errorOnly", "false")
                        .param("serviceName", "checkout")
                        .param("serviceNamespace", "commerce")
                        .param("environment", "prod")
                        .param("instance", "checkout-7d9")
                        .param("endpoint", "/checkout"))
                .andExpect(status().isOk());

        verify(entityTraceQueryService).queryTraceList(
                "team-a", null, 100L, 200L, null, false, "checkout", "commerce", "prod",
                "service.instance.id=\"checkout-7d9\"", null, null, null, 0, 20, null, null,
                "http.route=\"/checkout\"", TraceSort.NEWEST, false);
    }

    private static Throwable rootCause(Throwable throwable) {
        Throwable result = throwable;
        while (result.getCause() != null) {
            result = result.getCause();
        }
        return result;
    }

    private static TraceListItemDto completeTraceListItem() {
        return new TraceListItemDto(
                VALID_TRACE_ID,
                "0123456789abcdef",
                "checkout",
                "commerce",
                "GET /checkout",
                0L,
                "STATUS_CODE_OK",
                1_710_000_000_000L,
                0,
                1L,
                Map.of("checkout",
                        new org.apache.hertzbeat.common.observability.dto.trace.TraceServiceStatsDto(1, 0)),
                Map.of("service.name", "checkout"), "unique", 1L,
                representativeSpan(), 1_710_000_000_000L, 1_710_000_000_002L, null
        );
    }

    private static TraceRepresentativeSpanDto representativeSpan() {
        return new TraceRepresentativeSpanDto("0123456789abcdef", "GET /checkout", "checkout", "commerce",
                1_710_000_000_000L, 2_000_000L);
    }

    @Test
    void traceListAcceptsPartialEvidenceAndUnknownNamesWithoutInventingRoots() throws Exception {
        TraceListItemDto unique = completeTraceListItem();
        unique.setServiceName(null);
        unique.setRootSpanName(null);
        TraceListItemDto missing = completeTraceListItem();
        missing.setTraceId(SECOND_VALID_TRACE_ID);
        missing.setRootState("missing");
        missing.setRootSpanCount(0);
        clearRoot(missing);
        missing.setServiceStats(Map.of());
        missing.setUnattributedServiceStats(new org.apache.hertzbeat.common.observability.dto.trace.TraceServiceStatsDto(1, 0));
        TraceListItemDto ambiguous = completeTraceListItem();
        ambiguous.setTraceId("abcdef0123456789abcdef0123456789");
        ambiguous.setRootState("ambiguous");
        ambiguous.setRootSpanCount(2);
        ambiguous.setSpanCount(2L);
        ambiguous.setServiceStats(Map.of("checkout",
                new org.apache.hertzbeat.common.observability.dto.trace.TraceServiceStatsDto(2, 0)));
        clearRoot(ambiguous);
        when(entityTraceQueryService.queryTraceList(
                "team-a", null, 100L, 200L, null, null, null, null, null,
                null, null, null, null, 0, 20, null, null, null, TraceSort.NEWEST, false))
                .thenReturn(new PageImpl<>(List.of(unique, missing, ambiguous), PageRequest.of(0, 20), 3));
        mockMvc.perform(get("/api/traces/list").param("start", "100").param("end", "200"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(3))
                .andExpect(jsonPath("$.data.content[1].rootState").value("missing"))
                .andExpect(jsonPath("$.data.content[1].rootSpanId").isEmpty())
                .andExpect(jsonPath("$.data.content[1].resourceAttributes").isEmpty())
                .andExpect(jsonPath("$.data.content[1].representativeSpan.spanId").value("0123456789abcdef"))
                .andExpect(jsonPath("$.data.content[2].rootState").value("ambiguous"));
    }

    private static void clearRoot(TraceListItemDto item) {
        item.setRootSpanId(null);
        item.setRootSpanName(null);
        item.setServiceName(null);
        item.setServiceNamespace(null);
        item.setStartTime(null);
        item.setDurationNanos(null);
        item.setResourceAttributes(null);
    }

    @Test
    void shouldForwardHideInternalFilterToTraceOverviewQuery() throws Exception {
        TraceOverviewDto overview = new TraceOverviewDto(2, 1, 1_710_000_000_000L, true);
        when(entityTraceQueryService.getTraceOverview(
                "team-a", 9L, 100L, 200L, "trace-9", false, "payments", "core", "stage",
                "service.version=2.0.0", "POST /pay", 200L, 900L, true, null, null))
                .thenReturn(overview);

        mockMvc.perform(get("/api/traces/stats/overview")
                        .param("entityId", "9")
                        .param("start", "100")
                        .param("end", "200")
                        .param("traceId", "trace-9")
                        .param("errorOnly", "false")
                        .param("serviceName", "payments")
                        .param("serviceNamespace", "core")
                        .param("environment", "stage")
                        .param("resourceFilter", "service.version=2.0.0")
                        .param("operationName", "POST /pay")
                        .param("minDurationMs", "200")
                        .param("maxDurationMs", "900")
                        .param("hideInternal", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.totalTraceCount").value(2))
                .andExpect(jsonPath("$.data.errorTraceCount").value(1))
                .andExpect(jsonPath("$.data.hasActiveTrace").value(true));

        verify(entityTraceQueryService).getTraceOverview(
                "team-a", 9L, 100L, 200L, "trace-9", false, "payments", "core", "stage",
                "service.version=2.0.0", "POST /pay", 200L, 900L, true, null, null);
    }

    @Test
    void shouldForwardSpanScopeToTraceOverviewQuery() throws Exception {
        TraceOverviewDto overview = new TraceOverviewDto(3, 0, 1_710_000_000_000L, true);
        when(entityTraceQueryService.getTraceOverview(
                "team-a", null, 100L, 200L, null, false, "checkout", null, "prod",
                null, "POST /checkout", 100L, 500L, null, "entrypoint", null))
                .thenReturn(overview);

        mockMvc.perform(get("/api/traces/stats/overview")
                        .param("start", "100")
                        .param("end", "200")
                        .param("errorOnly", "false")
                        .param("serviceName", "checkout")
                        .param("environment", "prod")
                        .param("operationName", "POST /checkout")
                        .param("minDurationMs", "100")
                        .param("maxDurationMs", "500")
                        .param("spanScope", "entrypoint"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.totalTraceCount").value(3));

        verify(entityTraceQueryService).getTraceOverview(
                "team-a", null, 100L, 200L, null, false, "checkout", null, "prod",
                null, "POST /checkout", 100L, 500L, null, "entrypoint", null);
    }

    @Test
    void shouldForwardTraceGroupByStatsFiltersToService() throws Exception {
        Map<String, Object> result = Map.of(
                "groupBy", "resource:service.version",
                "groups", List.of(Map.of(
                        "value", "1.2.3",
                        "traceCount", 12L,
                        "errorTraceCount", 2L,
                        "latencyAvgMs", 84.5d,
                        "latencyP95Ms", 210.0d
                ))
        );
        when(entityTraceQueryService.getTraceGroupByStats(
                "team-a", 3L, 100L, 200L, "trace-3", true, "checkout", "commerce", "prod",
                "host.name=checkout-1", "GET /checkout", 100L, 500L,
                "resource:service.version", 7, "latency-p95-desc", 5, true, "entrypoint", null))
                .thenReturn(result);

        mockMvc.perform(get("/api/traces/stats/group-by")
                        .param("entityId", "3")
                        .param("start", "100")
                        .param("end", "200")
                        .param("traceId", "trace-3")
                        .param("errorOnly", "true")
                        .param("serviceName", "checkout")
                        .param("serviceNamespace", "commerce")
                        .param("environment", "prod")
                        .param("resourceFilter", "host.name=checkout-1")
                        .param("operationName", "GET /checkout")
                        .param("minDurationMs", "100")
                        .param("maxDurationMs", "500")
                        .param("groupBy", "resource:service.version")
                        .param("limit", "7")
                        .param("orderBy", "latency-p95-desc")
                        .param("minCount", "5")
                        .param("spanScope", "entrypoint")
                        .param("hideInternal", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.groupBy").value("resource:service.version"))
                .andExpect(jsonPath("$.data.groups[0].value").value("1.2.3"))
                .andExpect(jsonPath("$.data.groups[0].traceCount").value(12))
                .andExpect(jsonPath("$.data.groups[0].errorTraceCount").value(2))
                .andExpect(jsonPath("$.data.groups[0].latencyAvgMs").value(84.5))
                .andExpect(jsonPath("$.data.groups[0].latencyP95Ms").value(210.0));

        verify(entityTraceQueryService).getTraceGroupByStats(
                "team-a", 3L, 100L, 200L, "trace-3", true, "checkout", "commerce", "prod",
                "host.name=checkout-1", "GET /checkout", 100L, 500L,
                "resource:service.version", 7, "latency-p95-desc", 5, true, "entrypoint", null);
    }
}
