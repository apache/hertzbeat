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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.metrics.AgentMetricsToolService;
import org.apache.hertzbeat.ai.gateway.tool.system.AgentTelemetrySourceToolService;
import org.apache.hertzbeat.common.observability.dto.binding.OtlpEntityBindingSummaryDto;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionOverviewDto;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.observability.gateway.SelfTelemetryProperties;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.controller.TelemetrySourceController;
import org.apache.hertzbeat.observability.ingestion.audit.OtlpIngestionAuditEvent;
import org.apache.hertzbeat.observability.ingestion.audit.OtlpIngestionAuditService;
import org.apache.hertzbeat.observability.ingestion.controller.OtlpIngestionController;
import org.apache.hertzbeat.observability.ingestion.red.OtlpIngestionRedSummaryService;
import org.apache.hertzbeat.observability.ingestion.service.OtlpIngestionWorkspaceService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.support.GenericApplicationContext;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Real Spring tool callbacks and native controllers/RED computation; isolated audit and overview
 * fixtures.
 */
class AgentTelemetryIntakeContractTest {
    private final OtlpIngestionWorkspaceService workspace =
            mock(OtlpIngestionWorkspaceService.class);
    private final OtlpIngestionAuditService audit = mock(OtlpIngestionAuditService.class);
    private AgentMetricsToolService metrics;
    private AgentTelemetrySourceToolService sources;
    private static final Map<String, Object> WINDOW = Map.of("start", 1000L, "end", 6000L);

    @BeforeEach
    void setup() {
        AuthTokenRequestContext.bindWorkspaceId("isolated");
        var subject = mock(SubjectSum.class, org.mockito.Mockito.RETURNS_DEEP_STUBS);
        when(subject.getPrincipal()).thenReturn("admin");
        when(subject.getRoles()).thenReturn(List.of("admin"));
        when(subject.getPrincipalMap().getPrincipal(AuthTokenScopes.CLAIM_WORKSPACE_ID))
                .thenReturn("isolated");
        SurenessContextHolder.bindSubject(subject);
        when(workspace.getOverview("isolated")).thenReturn(overview());
        when(workspace.getBindingSummary("isolated")).thenReturn(bindings());
        when(audit.recentEvents()).thenReturn(List.of());
        var controller =
                new OtlpIngestionController(
                        workspace, new OtlpIngestionRedSummaryService(audit), null, null);
        ObjectProvider<OtlpIngestionController> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(controller);
        metrics = new AgentMetricsToolService(null, null, null, provider);
        var properties = new SelfTelemetryProperties();
        properties.setWorkspaceId("isolated");
        sources = new AgentTelemetrySourceToolService(new TelemetrySourceController(properties));
    }

    @AfterEach
    void clear() {
        AuthTokenRequestContext.clear();
        SurenessContextHolder.clear();
    }

    private OtlpIngestionOverviewDto overview() {
        return new OtlpIngestionOverviewDto(
                new OtlpIngestionOverviewDto.SignalOverview(
                        "metrics", false, 0, null, "otlp", "No sampled events"),
                new OtlpIngestionOverviewDto.SignalOverview(
                        "logs", false, 0, null, "otlp", "No sampled events"),
                new OtlpIngestionOverviewDto.SignalOverview(
                        "traces", false, 0, null, "otlp", "No sampled events"),
                0,
                null,
                0,
                0,
                List.of(),
                List.of());
    }

    private OtlpEntityBindingSummaryDto bindings() {
        return new OtlpEntityBindingSummaryDto(
                List.of("service.name"), List.of(), List.of(), List.of(), List.of());
    }

    private void register(ControlledMonitorTools env) {
        try (var context = new GenericApplicationContext()) {
            context.registerBean(AgentMetricsToolService.class, () -> metrics);
            context.registerBean(AgentTelemetrySourceToolService.class, () -> sources);
            context.refresh();
            var registry =
                    new AgentToolConfiguration()
                            .agentToolRegistry(context.getDefaultListableBeanFactory());
            for (var descriptor : registry.descriptors())
                env.registry.register(registry.find(descriptor.getName()).orElseThrow());
        }
    }

    private AgentToolExecutionResult read(
            ControlledMonitorTools env, String name, Map<String, Object> args) {
        return env.orchestrator.execute(env.request(name, args, ControlledMonitorTools.ADMIN));
    }

    private AgentReadObservationClassifier.Observation classify(
            String name, Map<String, Object> args, String out) {
        return new AgentReadObservationClassifier()
                .classify(
                        AgentRuntimeToolCall.builder()
                                .toolCallId("read")
                                .toolName(name)
                                .arguments(args)
                                .build(),
                        out);
    }

    @Test
    void allFourRegisteredReadCallbacksRetainScopeAndExplicitSampleKinds() throws Exception {
        try (var env = new ControlledMonitorTools()) {
            register(env);
            for (String name :
                    List.of(
                            "telemetry.overview",
                            "telemetry.bindings",
                            "telemetry.intake_red_summary",
                            "telemetry.sources")) {
                var args =
                        name.equals("telemetry.intake_red_summary")
                                ? WINDOW
                                : Map.<String, Object>of();
                var result = read(env, name, args);
                assertEquals(
                        AgentToolStatus.SUCCEEDED, result.getStatus(), result.getErrorMessage());
                var proof = classify(name, args, result.getOutput());
                assertNotNull(proof, result.getOutput());
                var out = JsonUtil.fromJson(result.getOutput(), Map.class);
                assertEquals("isolated", out.get("workspaceId"));
                assertTrue(out.get("coverageKind").toString().startsWith("NATIVE_"));
                assertEquals(0, env.effects);
            }
            verify(workspace).getOverview("isolated");
            verify(workspace).getBindingSummary("isolated");
        }
    }

    @Test
    void nativeRedCalculationCountsOnlyWorkspaceWindowAndSupportedSignals() throws Exception {
        when(audit.recentEvents())
                .thenReturn(
                        List.of(
                                new OtlpIngestionAuditEvent(
                                        "logs",
                                        "http",
                                        "accepted",
                                        "OK",
                                        "isolated",
                                        null,
                                        "one",
                                        10,
                                        2L,
                                        null,
                                        3L,
                                        2000L),
                                new OtlpIngestionAuditEvent(
                                        "metrics",
                                        "grpc",
                                        "rejected",
                                        "INVALID_ARGUMENT",
                                        "isolated",
                                        null,
                                        "two",
                                        12,
                                        0L,
                                        "invalid",
                                        4L,
                                        3000L),
                                new OtlpIngestionAuditEvent(
                                        "logs",
                                        "http",
                                        "accepted",
                                        "OK",
                                        "foreign",
                                        null,
                                        "other",
                                        99,
                                        9L,
                                        null,
                                        1L,
                                        2000L),
                                new OtlpIngestionAuditEvent(
                                        "traces",
                                        "http",
                                        "accepted",
                                        "OK",
                                        "isolated",
                                        null,
                                        "outside",
                                        99,
                                        9L,
                                        null,
                                        1L,
                                        7000L)));
        try (var env = new ControlledMonitorTools()) {
            register(env);
            var result = read(env, "telemetry.intake_red_summary", WINDOW);
            assertEquals(AgentToolStatus.SUCCEEDED, result.getStatus());
            assertEquals(
                    2,
                    classify("telemetry.intake_red_summary", WINDOW, result.getOutput()).count());
            var data = data(result.getOutput());
            assertEquals(2, ((Number) data.get("requestCount")).intValue());
            assertEquals(1, ((Number) data.get("errorCount")).intValue());
            assertEquals(22, ((Number) data.get("requestBytes")).intValue());
        }
    }

    @Test
    void trustedWorkspaceAndNativeFailuresRemainDistinctFromEmptyResults() throws Exception {
        try (var env = new ControlledMonitorTools()) {
            register(env);
            AuthTokenRequestContext.bindWorkspaceId("foreign");
            assertEquals(
                    AgentToolStatus.SUCCEEDED,
                    read(env, "telemetry.overview", Map.of()).getStatus());
            verify(workspace).getOverview("isolated");
            verify(workspace, org.mockito.Mockito.never()).getOverview("foreign");
            assertEquals("foreign", AuthTokenRequestContext.currentWorkspaceId());
            AuthTokenRequestContext.bindWorkspaceId("isolated");
            when(workspace.getOverview("isolated"))
                    .thenThrow(new IllegalStateException("native_read_unavailable"));
            assertEquals(
                    AgentToolStatus.FAILED, read(env, "telemetry.overview", Map.of()).getStatus());
            metrics = new AgentMetricsToolService(null, null, null);
        }
        try (var env = new ControlledMonitorTools()) {
            register(env);
            assertEquals(
                    AgentToolStatus.FAILED, read(env, "telemetry.overview", Map.of()).getStatus());
        }
    }

    @Test
    void sourceAuthorizationRemainsPartialWithoutNativeWorkspaceSubject() throws Exception {
        SurenessContextHolder.clear();
        try (var env = new ControlledMonitorTools()) {
            register(env);
            var result = read(env, "telemetry.sources", Map.of());
            assertEquals(AgentToolStatus.SUCCEEDED, result.getStatus());
            assertTrue(result.getOutput().contains("authorizationEvidence"));
            assertNull(classify("telemetry.sources", Map.of(), result.getOutput()));
        }
    }

    @Test
    void changedArgumentsScopePartialTruncationAndMalformedOutputCannotGround() throws Exception {
        try (var env = new ControlledMonitorTools()) {
            register(env);
            for (String name :
                    List.of(
                            "telemetry.overview",
                            "telemetry.bindings",
                            "telemetry.intake_red_summary",
                            "telemetry.sources")) {
                Map<String, Object> args =
                        name.equals("telemetry.intake_red_summary") ? WINDOW : Map.of();
                String output = read(env, name, args).getOutput();
                for (Map<String, Object> changes :
                        List.<Map<String, Object>>of(
                                Map.of("partial", true),
                                Map.of("telemetryReadVersion", "unknown"),
                                Map.of("inputHash", "wrong"))) {
                    var out = JsonUtil.fromJson(output, Map.class);
                    out.putAll(changes);
                    assertNull(classify(name, args, JsonUtil.toJson(out)), name);
                }
                assertNull(classify(name, Map.of("workspaceId", "foreign"), output));
                assertNull(classify(name, args, "not-json"));
            }
        }
    }

    @Test
    void nativeBoundsAndMalformedRedStatisticsAreRejected() throws Exception {
        try (var env = new ControlledMonitorTools()) {
            register(env);
            assertEquals(
                    AgentToolStatus.FAILED,
                    read(env, "telemetry.intake_red_summary", Map.of("start", -1L, "end", 10L))
                            .getStatus());
            assertEquals(
                    AgentToolStatus.FAILED,
                    read(
                                    env,
                                    "telemetry.intake_red_summary",
                                    Map.of("start", 1L, "end", 604800002L))
                            .getStatus());
            var good = read(env, "telemetry.intake_red_summary", WINDOW).getOutput();
            for (Map<String, Object> changes :
                    List.<Map<String, Object>>of(
                            Map.of("requestCount", 257),
                            Map.of("errorCount", 1),
                            Map.of("requestRatePerMinute", -1),
                            Map.of("errorRate", 2),
                            Map.of("workspaceId", "foreign"))) {
                var out = JsonUtil.fromJson(good, Map.class);
                var changed = data(good);
                changed.putAll(changes);
                out.put("data", JsonUtil.toJson(Map.of("code", 0, "data", changed)));
                assertNull(
                        classify("telemetry.intake_red_summary", WINDOW, JsonUtil.toJson(out)),
                        changes.keySet().toString());
            }
        }
    }

    @Test
    void durableReadProofCannotCrossRunWindowOrTamperedContent() throws Exception {
        try (var env = new ControlledMonitorTools()) {
            register(env);
            var result = read(env, "telemetry.intake_red_summary", WINDOW);
            var call =
                    AgentRuntimeToolCall.builder()
                            .toolName(result.getToolName())
                            .toolCallId(result.getToolCallId())
                            .arguments(WINDOW)
                            .build();
            var evaluator = new AgentReadGroundingEvaluator();
            var proof = evaluator.evaluate("isolated-read-run", call, result).orElseThrow();
            var message =
                    TranscriptMessage.builder()
                            .role(TranscriptMessage.TranscriptRole.TOOL_RESULT)
                            .toolName(call.getToolName())
                            .toolCallId(call.getToolCallId())
                            .content(List.of(TranscriptContent.text(result.getOutput())))
                            .groundingProof(proof)
                            .build();
            assertTrue(evaluator.restores(message, "isolated-read-run", WINDOW));
            assertFalse(evaluator.restores(message, "other-run", WINDOW));
            assertFalse(
                    evaluator.restores(
                            message, "isolated-read-run", Map.of("start", 1001L, "end", 6000L)));
            assertFalse(
                    evaluator.restores(
                            message.toBuilder()
                                    .content(
                                            List.of(
                                                    TranscriptContent.text(
                                                            result.getOutput()
                                                                    .replace(
                                                                            "NATIVE_AUDIT_SAMPLE_MAX_256",
                                                                            "NATIVE_AUDIT_SAMPLE_MAX_255"))))
                                    .build(),
                            "isolated-read-run",
                            WINDOW));
            assertTrue(
                    evaluator
                            .evaluate(
                                    "isolated-read-run",
                                    call,
                                    result.toBuilder().status(AgentToolStatus.FAILED).build())
                            .isEmpty());
        }
    }

    @Test
    void overviewKeepsSecretRedactionAndRejectsWorkspaceOverrides() throws Exception {
        var overview = overview();
        overview.setRecentEvents(
                List.of(
                        new OtlpIngestionOverviewDto.RecentSignalEvent(
                                "logs",
                                "fixture",
                                "Authorization: Bearer synthetic-private-secret",
                                null)));
        when(workspace.getOverview("isolated")).thenReturn(overview);
        try (var env = new ControlledMonitorTools()) {
            register(env);
            var result = read(env, "telemetry.overview", Map.of());
            assertEquals(AgentToolStatus.SUCCEEDED, result.getStatus());
            assertFalse(result.getOutput().contains("synthetic-private-secret"));
            assertNotNull(classify("telemetry.overview", Map.of(), result.getOutput()), result.getOutput());
            assertEquals(
                    AgentToolStatus.FAILED,
                    read(env, "telemetry.overview", Map.of("workspaceId", "foreign")).getStatus());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> data(String output) {
        var outer = JsonUtil.fromJson(output, Map.class);
        var envelope = JsonUtil.fromJson((String) outer.get("data"), Map.class);
        return new LinkedHashMap<>((Map<String, Object>) envelope.get("data"));
    }
}
