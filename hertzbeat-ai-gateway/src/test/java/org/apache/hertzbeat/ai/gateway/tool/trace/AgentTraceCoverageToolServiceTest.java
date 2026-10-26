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

package org.apache.hertzbeat.ai.gateway.tool.trace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.stream.IntStream;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolArguments.Clause;
import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolArguments.Field;
import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolArguments.GroupOrder;
import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolArguments.Population;
import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolArguments.Selection;
import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolArguments.SpanScope;
import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolArguments.SpanSort;
import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolArguments.Status;
import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolArguments.StructureSelection;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationReason;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationWindow;
import org.apache.hertzbeat.common.observability.dto.investigation.TraceInvestigationView;
import org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics;
import org.apache.hertzbeat.common.observability.dto.trace.TraceOverviewDto;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.observability.investigation.service.TraceInvestigationReadModelService;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.apache.hertzbeat.observability.traces.controller.TraceQueryController;
import org.apache.hertzbeat.observability.traces.dto.TraceListPageDto;
import org.apache.hertzbeat.observability.traces.dto.TraceStructureAnalysis;
import org.apache.hertzbeat.observability.traces.dto.TraceStructureQuery;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionException;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.apache.hertzbeat.warehouse.repository.TraceQueryRepository.TraceSort;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.data.domain.PageRequest;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;

/** Exercises the actual product controller boundary rather than a mocked HTTP adapter. */
class AgentTraceCoverageToolServiceTest {

    private static final String TRACE_ID = "0123456789abcdef0123456789abcdef";
    private EntityTraceQueryService queries;
    private TraceInvestigationReadModelService investigation;
    private ObservabilityQueryAdmissionService admission;
    private AgentTraceToolService tools;

    @BeforeEach
    void setUp() {
        AuthTokenRequestContext.bindWorkspaceId("team-b");
        queries = mock(EntityTraceQueryService.class);
        investigation = mock(TraceInvestigationReadModelService.class);
        admission = spy(new ObservabilityQueryAdmissionService(1, 1, 1, 1, 0, Duration.ZERO));
        tools = new AgentTraceToolService(queries, new TraceQueryController(queries, admission, investigation), admission);
    }

    @AfterEach
    void clearContext() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void shouldUseNativeAnalyticsScopingAdmissionAndPopulation() {
        Selection selection = new Selection(42L, "service", 1000L, 2000L, TRACE_ID, true,
                "checkout", "shop", "prod", "collector-1", "pod-1", "/orders/{id}",
                "service.version=1", "http.status_code=503", "GET /orders", 1L, 50L, SpanScope.root, true);
        doReturn(evidence(new TraceAnalytics.SpanPage(List.of(), 0, 0, 20, "oldest")))
                .when(queries).queryAnalytics(any(), any());

        Map<String, Object> result = invoke(() -> tools.spans(selection, 0, 20, SpanSort.oldest, true));

        ArgumentCaptor<EntityTraceQueryService.AnalyticsQuery> query = ArgumentCaptor.forClass(EntityTraceQueryService.AnalyticsQuery.class);
        ArgumentCaptor<TraceAnalytics.Options> options = ArgumentCaptor.forClass(TraceAnalytics.Options.class);
        verify(queries).queryAnalytics(query.capture(), options.capture());
        assertEquals("team-b", query.getValue().workspaceId());
        assertEquals(42L, query.getValue().entityId());
        assertEquals("matched_spans", query.getValue().population());
        assertTrue(query.getValue().window().endExclusive());
        assertTrue(query.getValue().resourceFilter().contains("hertzbeat.entity_type=\"service\""));
        assertTrue(query.getValue().resourceFilter().contains("hertzbeat.collector.id=\"collector-1\""));
        assertTrue(query.getValue().resourceFilter().contains("service.instance.id=\"pod-1\""));
        assertTrue(query.getValue().attributeFilter().contains("http.route=\"/orders/{id}\""));
        assertEquals("spans", options.getValue().shape());
        assertEquals("oldest", options.getValue().sort());
        assertEquals("ready", result.get("state"));
        assertEquals(false, result.get("outputTruncated"));
        verify(admission).execute(eq("traces"), any());
    }

    @Test
    void shouldDispatchHistogramFacetsAndGroupsToNativeOptions() {
        doReturn(evidence(new TraceAnalytics.Groups("serviceName", 0, "overlapping", "count-desc", List.of(), false)))
                .when(queries).queryAnalytics(any(), any());

        invoke(() -> tools.histogram(selection(), Population.matched_spans, 40, true));
        invoke(() -> tools.facetValues(selection(), Field.environment, Population.matched_traces, 30, false));
        invoke(() -> tools.groups(selection(), Field.operationName, Population.matched_traces, 10,
                GroupOrder.ERROR_COUNT_DESC, false));

        ArgumentCaptor<TraceAnalytics.Options> options = ArgumentCaptor.forClass(TraceAnalytics.Options.class);
        verify(queries, times(3)).queryAnalytics(any(), options.capture());
        assertEquals(List.of("histogram", "facets", "groups"), options.getAllValues().stream().map(TraceAnalytics.Options::shape).toList());
        assertEquals(40, options.getAllValues().get(0).bucketCount());
        assertEquals("environment", options.getAllValues().get(1).field());
        assertEquals("error-count-desc", options.getAllValues().get(2).sort());
        verify(admission, times(3)).execute(eq("traces"), any());
    }

    @Test
    void shouldPreserveNativeStructuralCoverageAndAnalysis() {
        StructureSelection selection = new StructureSelection(1000, 2000,
                new Clause("checkout", null, null), new Clause("cart", null, Status.ERROR),
                TraceStructureQuery.Relation.DIRECT, null, null);
        when(queries.queryTraceStructure(eq("team-b"), any())).thenReturn(emptyPage("bounded"));
        when(queries.queryTraceStructureAnalysis(eq("team-b"), any())).thenReturn(
                new TraceStructureAnalysis(1500, 1500, true, 42, List.of(), false, List.of(), false));

        Map<String, Object> page = invoke(() -> tools.structure(selection));
        Map<String, Object> analysis = invoke(() -> tools.structureAnalysis(selection));

        assertEquals("bounded", ((Map<?, ?>) page.get("query")).get("coverage"));
        assertEquals(1500, ((Map<?, ?>) page.get("query")).get("rowLimit"));
        assertEquals(true, page.get("partial"));
        assertEquals(42, analysis.get("matchedTraces"));
        assertEquals(true, analysis.get("truncated"));
        assertEquals(true, analysis.get("partial"));
        ArgumentCaptor<TraceStructureQuery> query = ArgumentCaptor.forClass(TraceStructureQuery.class);
        verify(queries).queryTraceStructure(eq("team-b"), query.capture());
        assertEquals("ERROR", query.getValue().right().status());
        assertEquals(TraceStructureQuery.Relation.DIRECT, query.getValue().relation());
        verify(admission, times(2)).execute(eq("traces"), any());
    }

    @Test
    void shouldDelegateFullListSortAndExclusiveBoundary() {
        when(queries.queryTraceList("team-b", null, 1000L, 2000L, null, null, null, null, null,
                null, null, null, null, 0, 20, null, null, null, TraceSort.DURATION_DESC, true))
                .thenReturn(emptyPage("window"));

        Map<String, Object> result = invoke(() -> tools.listTraces(selection(), null, null, TraceSort.DURATION_DESC, true));

        assertEquals(false, result.get("partial"));
        assertEquals("window", ((Map<?, ?>) result.get("query")).get("coverage"));
        verify(admission).execute(eq("traces"), any());
    }

    @Test
    void shouldDelegateOverviewAndLegacyAggregateWithoutClaimingCompleteCoverage() {
        when(queries.getTraceOverview("team-b", null, 1000L, 2000L, null, null, null, null, null,
                null, null, null, null, null, null, null)).thenReturn(new TraceOverviewDto(10, 2, 1900L, true));
        when(queries.getTraceGroupByStats("team-b", null, 1000L, 2000L, null, null, null, null, null,
                null, null, null, null, "resource:service.version", 20, "latency-p95-desc", 3, null, null, null))
                .thenReturn(Map.of("groups", List.of(Map.of("value", "1.2.3", "traceCount", 10))));

        Map<String, Object> overview = invoke(() -> tools.overview(selection()));
        Map<String, Object> groups = invoke(() -> tools.groupBy(selection(), "resource:service.version", null,
                GroupOrder.LATENCY_P95_DESC, 3));

        assertEquals(10, overview.get("totalTraceCount"));
        assertEquals("unspecified", overview.get("coverage"));
        assertEquals(true, overview.get("partial"));
        assertEquals(true, groups.get("partial"));
        assertEquals("1.2.3", ((Map<?, ?>) ((List<?>) groups.get("groups")).getFirst()).get("value"));
        verify(admission, times(2)).execute(eq("traces"), any());
    }

    @Test
    void shouldReturnNativeInvestigationEvidenceStates() {
        TraceInvestigationView view = new TraceInvestigationView(TRACE_ID, null, new InvestigationWindow(1000, 2000),
                TraceInvestigationView.GanttBlock.empty(), TraceInvestigationView.LogsBlock.empty(),
                TraceInvestigationView.RedBlock.unavailable(InvestigationReason.IDENTITY_UNAVAILABLE, null),
                TraceInvestigationView.MetricsBlock.empty(), TraceInvestigationView.DependenciesBlock.empty());
        when(investigation.query("team-b", TRACE_ID, null, 1000, 2000)).thenReturn(view);

        Map<String, Object> result = invoke(() -> tools.detail(TRACE_ID, null, 1000, 2000));

        assertEquals(TRACE_ID, result.get("traceId"));
        assertEquals("unavailable", ((Map<?, ?>) result.get("red")).get("state"));
        assertEquals("identity_unavailable", ((Map<?, ?>) result.get("red")).get("reason"));
        assertEquals("empty", ((Map<?, ?>) result.get("gantt")).get("state"));
        verify(admission).execute(eq("traces"), any());
    }

    @Test
    void shouldRedactAndBoundAllReturnedCollectionsAndText() {
        List<TraceAnalytics.Value> values = IntStream.range(0, 300)
                .mapToObj(index -> new TraceAnalytics.Value("authorization=secret " + "x".repeat(5000), index, 0)).toList();
        doReturn(new TraceAnalytics.Evidence<>("ready", new TraceAnalytics.Window(1000, 2000, false),
                "matched_traces", new TraceAnalytics.Coverage("bounded", 1500, 1500, true),
                new TraceAnalytics.Facets("serviceName", 300, 0, "overlapping", values, true)))
                .when(queries).queryAnalytics(any(), any());

        Map<String, Object> result = invoke(() -> tools.facetValues(selection(), Field.serviceName, null, 50, false));

        assertEquals(true, result.get("partial"));
        assertEquals(true, result.get("outputTruncated"));
        assertFalse(result.toString().contains("secret"));
        assertFalse(result.toString().contains("x".repeat(2049)));
        assertTrue(result.toString().length() < 40000);
        assertTrue(((List<?>) ((Map<?, ?>) result.get("data")).get("values")).size() <= 200);
    }

    @Test
    void shouldMarkPagedSpanEvidencePartialEvenWhenStorageCoverageIsComplete() {
        doReturn(evidence(new TraceAnalytics.SpanPage(List.of(), 100, 0, 20, "newest")))
                .when(queries).queryAnalytics(any(), any());
        Map<String, Object> result = invoke(() -> tools.spans(selection(), null, null, null, null));
        assertEquals(true, result.get("partial"));
        assertEquals(false, result.get("outputTruncated"));
        assertEquals("window", ((Map<?, ?>) result.get("coverage")).get("mode"));
    }

    @Test
    void shouldRejectMissingOrMismatchedInvocationWorkspaceBeforeBackendAccess() {
        assertThrows(IllegalArgumentException.class, () -> tools.overview(selection()));
        assertThrows(CommonException.class, () -> invoke("other-team", () -> tools.overview(selection())));
        AuthTokenRequestContext.clear();
        assertThrows(CommonException.class, () -> invoke(() -> tools.overview(selection())));
        verifyNoInteractions(queries, investigation, admission);
    }

    @Test
    void shouldFailClosedWhenTraceAdmissionLaneIsBusy() {
        assertThrows(ObservabilityQueryAdmissionException.class, () -> admission.execute("traces",
                () -> invoke(() -> tools.spans(selection(), null, null, null, null))));
        verifyNoInteractions(queries, investigation);
    }

    @Test
    void shouldRejectInvalidBoundsEnumsUnknownFieldsAndDuplicateSourceScope() {
        assertThrows(IllegalArgumentException.class, () -> tools.spans(selection(), 0, 51, null, false));
        assertThrows(IllegalArgumentException.class, () -> tools.histogram(selection(), null, 61, false));
        assertThrows(IllegalArgumentException.class, () -> tools.groups(selection(), Field.serviceName, null, 20,
                GroupOrder.LATENCY_P95_DESC, false));
        assertThrows(IllegalArgumentException.class, () -> new StructureSelection(1000, 2000,
                new Clause("checkout", null, null), new Clause("cart", null, null), TraceStructureQuery.Relation.DIRECT, 0, 51));
        var mapper = JsonMapper.builder().disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).build();
        assertThrows(Exception.class, () -> mapper.readValue("{\"start\":1000,\"end\":2000,\"workspaceId\":\"other\"}", Selection.class));
        assertThrows(Exception.class, () -> mapper.readValue("{\"start\":1000,\"end\":2000,\"spanScope\":\"invalid\"}", Selection.class));
        Selection duplicate = new Selection(null, null, 1000, 2000, null, null, null, null, null,
                "collector-1", null, null, "hertzbeat.collector.id=other", null, null, null, null, null, null);
        assertThrows(ObservabilityQueryRequestException.class, () -> invoke(() -> tools.spans(duplicate, null, null, null, false)));
        Selection tooWide = new Selection(null, null, 1000, 1000 + Duration.ofDays(2).toMillis(), null, null,
                null, null, null, null, null, null, null, null, null, null, null, null, null);
        assertThrows(ObservabilityQueryRequestException.class, () -> invoke(() -> tools.histogram(tooWide, null, 30, false)));
        verifyNoInteractions(queries, investigation, admission);
    }

    @Test
    void shouldRegisterTypedReadOnlyTraceCoverageSchemas() {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(AgentTraceToolService.class, () -> tools);
            context.refresh();
            var registry = new AgentToolConfiguration().agentToolRegistry(context.getDefaultListableBeanFactory());
            for (String name : List.of("list", "structure", "structure_analysis", "spans", "histogram",
                    "facet_values", "groups", "overview", "group_by", "detail")) {
                var descriptor = registry.find("traces." + name).orElseThrow().descriptor();
                assertEquals(AgentToolRisk.READ, descriptor.getRisk());
                assertEquals(AgentToolExposure.MODEL_ON_DEMAND, descriptor.getExposure());
                assertFalse(descriptor.getInputSchema().contains("workspaceId"));
                assertFalse(descriptor.getInputSchema().contains("additionalParameters"));
                assertNotNull(descriptor.getInputSchema());
            }
            assertTrue(registry.find("traces.structure").orElseThrow().descriptor().getInputSchema().contains("DIRECT"));
            assertTrue(registry.find("traces.spans").orElseThrow().descriptor().getInputSchema().contains("oldest"));
        }
    }

    private Selection selection() {
        return new Selection(null, null, 1000, 2000, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null);
    }

    private TraceAnalytics.Evidence<?> evidence(Object data) {
        return new TraceAnalytics.Evidence<>("ready", new TraceAnalytics.Window(1000, 2000, false), "matched_spans",
                new TraceAnalytics.Coverage("window", null, null, false), data);
    }

    private TraceListPageDto emptyPage(String coverage) {
        return new TraceListPageDto(List.of(), PageRequest.of(0, 20), 0,
                new TraceListPageDto.Query("newest", coverage, 1500, false));
    }

    private <T> T invoke(Supplier<T> action) {
        return invoke("team-b", action);
    }

    private <T> T invoke(String workspace, Supplier<T> action) {
        AgentToolExecutionRequest request = AgentToolExecutionRequest.builder()
                .sessionUid("session-trace").runId(1L).runUid("run-trace").runSessionId(1L).workspaceId(workspace)
                .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                .entryType(AgentRuntimeEntryType.USER_INPUT).approvalHandling(AgentApprovalHandling.DENY)
                .toolName("traces.spans").toolCallId("call-trace").arguments(Map.of()).build();
        return AgentToolContextSupport.withInvocation(new AgentToolExecutionContext(request,
                AgentToolCall.builder().toolCallId("call-trace").build()), action);
    }
}
