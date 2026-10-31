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

package org.apache.hertzbeat.ai.gateway.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.entity.AgentEntityManagementToolService;
import org.apache.hertzbeat.ai.gateway.tool.log.AgentLogToolService;
import org.apache.hertzbeat.ai.gateway.tool.metrics.AgentMetricsToolService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricLabelsDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsConsoleDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsInventoryDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpRelatedMetricsDto;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.apache.hertzbeat.manager.service.entity.EntityDiscoveryReadModelService;
import org.apache.hertzbeat.observability.ingestion.controller.OtlpIngestionController;
import org.apache.hertzbeat.observability.ingestion.red.OtlpIngestionRedSummaryService;
import org.apache.hertzbeat.observability.ingestion.service.OtlpIngestionWorkspaceService;
import org.apache.hertzbeat.observability.logs.controller.LogQueryController;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.observability.metrics.service.CollectorScopedMetricsQueryService;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.stream.Stream;

/**
 * Actual Spring tools/controllers and entity discovery service, with isolated signal and DAO
 * services.
 */
class AgentSignalDiscoveryContractTest {
    private final CollectorScopedMetricsQueryService metrics =
            mock(CollectorScopedMetricsQueryService.class);
    private final OtlpIngestionWorkspaceService workspace =
            mock(OtlpIngestionWorkspaceService.class);
    private final LogQueryService logs = mock(LogQueryService.class);
    private final MonitorService monitors = mock(MonitorService.class);
    private final ObserveEntityService entities = mock(ObserveEntityService.class);
    private AgentMetricsToolService metricsTool;
    private AgentLogToolService logTool;
    private AgentEntityManagementToolService entityTool;
    private boolean empty;

    static Stream<String> tools() {
        return Stream.of(
                "metrics.otlp_inventory",
                "metrics.otlp_labels",
                "metrics.otlp_related",
                "logs.facet_fields",
                "logs.facet_values",
                "entity.discovery");
    }

    private OtlpMetricsConsoleDto.Context context() {
        return new OtlpMetricsConsoleDto.Context(
                null, null, null, "checkout", null, null, null, null, null, null, 1000L, 2000L);
    }

    @BeforeEach
    void setup() {
        var admission = mock(ObservabilityQueryAdmissionService.class);
        when(admission.execute(anyString(), any()))
                .thenAnswer(i -> ((Supplier<?>) i.getArgument(1)).get());
        var controller =
                new OtlpIngestionController(
                        workspace, mock(OtlpIngestionRedSummaryService.class), metrics, admission);
        ObjectProvider<OtlpIngestionController> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(controller);
        metricsTool = new AgentMetricsToolService(null, null, null, provider);
        when(metrics.inventory(any()))
                .thenAnswer(
                        i ->
                                new OtlpMetricsInventoryDto(
                                        context(),
                                        "greptime-inventory",
                                        20,
                                        false,
                                        empty
                                                ? List.of()
                                                : List.of(
                                                        new OtlpMetricsInventoryDto.Item(
                                                                "http_requests_total",
                                                                "counter"))));
        when(metrics.labels(any()))
                .thenAnswer(
                        i ->
                                new OtlpMetricLabelsDto(
                                        context(),
                                        "greptime-labels",
                                        "ready",
                                        20,
                                        false,
                                        empty ? List.of() : List.of("method")));
        when(workspace.getRelatedMetrics(
                        eq("signal-test"),
                        any(),
                        any(),
                        any(),
                        any(),
                        any(),
                        any(),
                        any(),
                        any(),
                        any(),
                        any()))
                .thenAnswer(
                        i ->
                                new OtlpRelatedMetricsDto(
                                        context(),
                                        null,
                                        null,
                                        "backend-related-metrics",
                                        empty ? 0 : 1,
                                        List.of(),
                                        empty
                                                ? List.of()
                                                : List.of(
                                                        new OtlpRelatedMetricsDto.Candidate(
                                                                "http_requests_total",
                                                                "greptime",
                                                                "counter",
                                                                "observed",
                                                                List.of(),
                                                                Map.of()))));
        when(logs.facetFields(any()))
                .thenAnswer(i -> LogFacets.Fields.empty(new LogFacets.Window(1000, 2000)));
        when(logs.facetValues(any(), any(), anyInt(), any()))
                .thenAnswer(
                        i ->
                                new LogFacets.Values(
                                        "ready",
                                        new LogFacets.Window(1000, 2000),
                                        LogFacets.Field.parse("builtin:serviceName"),
                                        new LogFacets.FullCoverage("full_window"),
                                        empty ? 0L : 2L,
                                        0L,
                                        empty
                                                ? List.of()
                                                : List.of(new LogFacets.Value("checkout", 2)),
                                        false));
        logTool = new AgentLogToolService(logs, new LogQueryController(logs, admission, null));

        entityTool =
                new AgentEntityManagementToolService(
                        entities, new EntityDiscoveryReadModelService(monitors, entities));
    }

    private Map<String, Object> args(String tool) {
        if (tool.equals("entity.discovery")) return Map.of("pageIndex", 0, "pageSize", 20);
        var q = new HashMap<String, Object>(Map.of("start", 1000, "end", 2000));
        if (tool.startsWith("metrics.")) {
            q.put("limit", "20");
            q.put("serviceName", "checkout");
            if (tool.equals("metrics.otlp_labels")) q.put("query", "http_requests_total");
        }
        if (tool.equals("logs.facet_values")) q.put("field", "builtin:serviceName");
        return Map.of("q", q);
    }

    private AgentReadObservationClassifier.Observation classify(
            String tool, Map<String, Object> args, Map<String, Object> result) {
        return new AgentReadObservationClassifier()
                .classify(
                        AgentRuntimeToolCall.builder()
                                .toolCallId("read")
                                .toolName(tool)
                                .arguments(args)
                                .build(),
                        JsonUtil.toJson(result));
    }

    @ParameterizedTest
    @MethodSource("tools")
    void completeAndEmptyNativeReadIsTyped(String tool) {
        arrangeDiscovery();
        var args = args(tool);
        var output = invoke(tool, args);
        assertNotNull(classify(tool, args, output), tool);
        var evidence = new AgentTaskEvidence();
        evidence.observe(
                "read",
                tool,
                AgentToolRisk.READ,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(output),
                true,
                AgentToolPayloadHasher.normalizedArgumentsHash(args));
        assertTrue(evidence.hasObservation());
        empty = true;
        arrangeDiscovery();
        var observation = classify(tool, args, invoke(tool, args));
        assertNotNull(observation);
        assertEquals(tool.equals("logs.facet_fields") ? 3 : 0, observation.count());
    }

    @ParameterizedTest
    @MethodSource("tools")
    void malformedFailureAndProjectionAreNotEvidence(String tool) {
        arrangeDiscovery();
        var args = args(tool);
        assertNull(classify(tool, args, Map.of("success", true)));
        var output = invoke(tool, args);
        if (tool.equals("entity.discovery")) {
            output.put("pageIndex", 2);
            assertNull(classify(tool, args, output));
        } else {
            output.put("projectionTruncated", true);
            assertNull(classify(tool, args, output));
        }
    }

    @ParameterizedTest
    @MethodSource("tools")
    void requestBoundsAndWrongWindowOrPageAreRejected(String tool) {
        arrangeDiscovery();
        var args = args(tool);
        var output = invoke(tool, args);
        if (tool.equals("entity.discovery")) args = Map.of("pageIndex", 1, "pageSize", 20);
        else {
            var q = new HashMap<>((Map<String, Object>) args.get("q"));
            q.put("start", 1500);
            args = Map.of("q", q);
        }
        assertNull(classify(tool, args, output));
    }

    @ParameterizedTest
    @MethodSource("tools")
    void forwardsNativeScopeAndNeverTreatsUnavailableAsEmpty(String tool) {
        arrangeDiscovery();
        var args = args(tool);
        invoke(tool, args);
        if (tool.equals("metrics.otlp_inventory")) {
            verify(metrics)
                    .inventory(
                            argThat(
                                    q ->
                                            "signal-test".equals(q.workspaceId())
                                                    && q.start() == 1000L
                                                    && q.end() == 2000L
                                                    && "checkout".equals(q.serviceName())
                                                    && "20".equals(q.limit())));
            when(metrics.inventory(any()))
                    .thenThrow(new IllegalStateException("isolated storage unavailable"));
        } else if (tool.equals("metrics.otlp_labels")) {
            verify(metrics)
                    .labels(
                            argThat(
                                    q ->
                                            "signal-test".equals(q.workspaceId())
                                                    && "http_requests_total".equals(q.query())
                                                    && "checkout".equals(q.serviceName())));
            when(metrics.labels(any()))
                    .thenThrow(new IllegalStateException("isolated storage unavailable"));
        } else if (tool.equals("metrics.otlp_related")) {
            verify(workspace)
                    .getRelatedMetrics(
                            "signal-test",
                            null,
                            null,
                            1000L,
                            2000L,
                            "checkout",
                            null,
                            null,
                            null,
                            null,
                            "20");
            when(workspace.getRelatedMetrics(
                            any(), any(), any(), any(), any(), any(), any(), any(), any(), any(),
                            any()))
                    .thenThrow(new IllegalStateException("isolated storage unavailable"));
        } else if (tool.equals("logs.facet_fields")) {
            verify(logs)
                    .facetFields(
                            argThat(
                                    q ->
                                            "signal-test".equals(q.workspaceId())
                                                    && q.start() == 1000L
                                                    && q.end() == 2000L));
            when(logs.facetFields(any()))
                    .thenReturn(LogFacets.Fields.unavailable(new LogFacets.Window(1000, 2000)));
            assertNull(classify(tool, args, invoke(tool, args)));
            return;
        } else if (tool.equals("logs.facet_values")) {
            verify(logs)
                    .facetValues(
                            argThat(q -> "signal-test".equals(q.workspaceId())),
                            eq(LogFacets.Field.parse("builtin:serviceName")),
                            eq(20),
                            eq(null));
            when(logs.facetValues(any(), any(), anyInt(), any()))
                    .thenReturn(
                            LogFacets.Values.unavailable(
                                    new LogFacets.Window(1000, 2000),
                                    LogFacets.Field.parse("builtin:serviceName"),
                                    null));
            assertNull(classify(tool, args, invoke(tool, args)));
            return;
        } else {
            doReturn(null)
                    .when(monitors)
                    .getMonitors(
                            any(), any(), any(), any(), any(), any(), anyInt(), anyInt(), any());
        }
        assertThrows(RuntimeException.class, () -> invoke(tool, args));
    }

    @Test
    void nullCandidateQueryDoesNotBecomeSuccessfulNoCandidateDiscovery() {
        arrangeDiscovery();
        when(entities.getMonitorBindingCandidates(any())).thenReturn(null);
        assertThrows(
                RuntimeException.class, () -> invoke("entity.discovery", args("entity.discovery")));
    }

    @ParameterizedTest
    @MethodSource("tools")
    void duplicatesCountsAndScopeCannotBeForged(String tool) {
        arrangeDiscovery();
        var args = args(tool);
        var output = invoke(tool, args);
        if (tool.equals("entity.discovery")) {
            output.put("totalElements", 2);
            assertNull(classify(tool, args, output));
            return;
        }
        Map<String, Object> envelope = JsonUtil.fromJson((String) output.get("data"), Map.class);
        var data = (Map<String, Object>) envelope.get("data");
        if (tool.startsWith("metrics.")) {
            var context = (Map<String, Object>) data.get("context");
            context.put("serviceName", "foreign-service");
        } else if (tool.equals("logs.facet_fields")) {
            ((Map<String, Object>) data.get("coverage")).put("scannedRows", 1001);
        } else data.put("matchedCount", 1);
        output.put("data", JsonUtil.toJson(envelope));
        assertNull(classify(tool, args, output));
    }

    @ParameterizedTest
    @MethodSource("tools")
    void durableProofRejectsFailedForeignRunChangedScopeAndTamperedResponse(String tool) {
        arrangeDiscovery();
        var args = args(tool);
        var call =
                AgentRuntimeToolCall.builder()
                        .toolName(tool)
                        .toolCallId("proof")
                        .arguments(args)
                        .build();
        String output = JsonUtil.toJson(invoke(tool, args));
        var result =
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult.builder()
                        .toolName(tool)
                        .toolCallId("proof")
                        .status(AgentToolStatus.SUCCEEDED)
                        .risk(AgentToolRisk.READ)
                        .decision(
                                org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision.ALLOW)
                        .approvalStatus(
                                org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus
                                        .NOT_REQUIRED)
                        .output(output)
                        .build();
        var evaluator = new AgentReadGroundingEvaluator();
        var proof = evaluator.evaluate("signal-run", call, result).orElseThrow();
        var message =
                TranscriptMessage.builder()
                        .role(TranscriptMessage.TranscriptRole.TOOL_RESULT)
                        .toolName(tool)
                        .toolCallId("proof")
                        .content(List.of(TranscriptContent.text(output)))
                        .groundingProof(proof)
                        .build();
        assertTrue(evaluator.restores(message, "signal-run", args));
        org.junit.jupiter.api.Assertions.assertFalse(
                evaluator.restores(message, "another-run", args));
        org.junit.jupiter.api.Assertions.assertFalse(
                evaluator.restores(message, "signal-run", Map.of("changedScope", true)));
        org.junit.jupiter.api.Assertions.assertFalse(
                evaluator.restores(
                        message.toBuilder().content(List.of(TranscriptContent.text("{}"))).build(),
                        "signal-run",
                        args));
        assertTrue(
                evaluator
                        .evaluate(
                                "signal-run",
                                call,
                                result.toBuilder().status(AgentToolStatus.FAILED).build())
                        .isEmpty());
        assertTrue(
                evaluator
                        .evaluate(
                                "signal-run",
                                call,
                                result.toBuilder().toolCallId("foreign").build())
                        .isEmpty());
    }

    @Test
    void resourceDiscoveryRetainsSearchPaginationAndDoesNotBecomeWholeCatalogEvidence() {
        arrangeDiscovery();
        var args = Map.<String, Object>of("search", " resource ", "pageIndex", 2, "pageSize", 1);
        var output = invoke("entity.discovery", args);
        assertNotNull(classify("entity.discovery", args, output));
        verify(monitors).getMonitors(null, null, "resource", null, "id", "desc", 2, 1, null);
        assertEquals(
                "entity-discovery-page-only", classify("entity.discovery", args, output).kind());
    }

    @Test
    void nativeSignalFiltersAreForwardedWithoutDroppingScope() {
        var inventory =
                new HashMap<>((Map<String, Object>) args("metrics.otlp_inventory").get("q"));
        inventory.put("search", "http");
        assertNotNull(
                classify(
                        "metrics.otlp_inventory",
                        Map.of("q", inventory),
                        invoke("metrics.otlp_inventory", Map.of("q", inventory))));
        verify(metrics)
                .inventory(
                        argThat(
                                q ->
                                        "http".equals(q.search())
                                                && "checkout".equals(q.serviceName())
                                                && q.start() == 1000L
                                                && q.end() == 2000L));
        var labels = new HashMap<>((Map<String, Object>) args("metrics.otlp_labels").get("q"));
        labels.put("filter", "method=\"GET\"");
        labels.put("label", "method");
        assertNotNull(
                classify(
                        "metrics.otlp_labels",
                        Map.of("q", labels),
                        invoke("metrics.otlp_labels", Map.of("q", labels))));
        verify(metrics)
                .labels(
                        argThat(
                                q ->
                                        "method=\"GET\"".equals(q.filter())
                                                && "method".equals(q.label())
                                                && "checkout".equals(q.serviceName())));
        var query =
                Map.<String, Object>of(
                        "start",
                        1000,
                        "end",
                        2000,
                        "serviceName",
                        "checkout",
                        "resourceFilter",
                        "service.name=checkout");
        assertNotNull(
                classify(
                        "logs.facet_fields",
                        Map.of("q", query),
                        invoke("logs.facet_fields", Map.of("q", query))));
        verify(logs)
                .facetFields(
                        argThat(
                                q ->
                                        "checkout".equals(q.serviceName())
                                                && "service.name=checkout"
                                                        .equals(q.resourceFilter())
                                                && "signal-test".equals(q.workspaceId())));
    }

    private void arrangeDiscovery() {
        doAnswer(
                        i ->
                                new PageImpl<>(
                                        empty
                                                ? List.of()
                                                : List.of(
                                                        Monitor.builder()
                                                                .id(7L)
                                                                .name("resource-monitor")
                                                                .app("website")
                                                                .status((byte) 0)
                                                                .build()),
                                        PageRequest.of(i.getArgument(6), i.getArgument(7)),
                                        empty ? 0 : 1))
                .when(monitors)
                .getMonitors(any(), any(), any(), any(), any(), any(), anyInt(), anyInt(), any());
        when(entities.getMonitorBindingCandidates(any())).thenReturn(Map.of());
    }

    private Map<String, Object> invoke(String name, Map<String, Object> args) {
        try (var spring = new GenericApplicationContext()) {
            spring.registerBean(AgentMetricsToolService.class, () -> metricsTool);
            spring.registerBean(AgentLogToolService.class, () -> logTool);
            spring.registerBean(AgentEntityManagementToolService.class, () -> entityTool);
            spring.refresh();
            var registry =
                    new AgentToolConfiguration()
                            .agentToolRegistry(spring.getDefaultListableBeanFactory());
            var req =
                    AgentToolExecutionRequest.builder()
                            .workspaceId("signal-test")
                            .sessionUid("signal-test")
                            .runId(1L)
                            .runUid("run-label")
                            .runSessionId(1L)
                            .actor(
                                    org.apache.hertzbeat.ai.gateway.identity.AgentActor.builder()
                                            .type("user")
                                            .id("metadata-user")
                                            .roles(List.of("admin"))
                                            .build())
                            .entryType(AgentRuntimeEntryType.USER_INPUT)
                            .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                            .toolCallId("call-label")
                            .toolName(name)
                            .arguments(args)
                            .build();
            AuthTokenRequestContext.bindWorkspaceId("signal-test");
            AuthTokenRequestContext.bindAuthenticatedWorkspaceId("signal-test");
            try {
                return JsonUtil.fromJson(
                        registry.find(name)
                                .orElseThrow()
                                .execute(
                                        new AgentToolExecutionContext(
                                                req, AgentToolCall.builder().build()))
                                .getModelContent(),
                        Map.class);
            } finally {
                AuthTokenRequestContext.clear();
            }
        }
    }
}
