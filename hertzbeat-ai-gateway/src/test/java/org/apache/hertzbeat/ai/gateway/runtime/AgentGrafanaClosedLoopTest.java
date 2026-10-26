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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.application.AgentGrafanaDraft;
import org.apache.hertzbeat.ai.gateway.tool.application.AgentGrafanaToolService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.grafana.config.GrafanaProperties;
import org.apache.hertzbeat.grafana.service.ConditionalDashboardService;
import org.apache.hertzbeat.grafana.service.DashboardService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Real runtime and Spring callbacks with a fake human decision and isolated native service; no live
 * model/Grafana.
 */
class AgentGrafanaClosedLoopTest {
    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-10-21T00:00:00Z"), ZoneOffset.UTC);
    private static final String DOCUMENT = "{\"title\":\"AI fixture\",\"panels\":[]}";
    private final ConditionalDashboardService nativeService =
            mock(ConditionalDashboardService.class);
    private final DashboardService bindings = mock(DashboardService.class);
    private final MonitorService monitors = mock(MonitorService.class);

    private Map<String, Object> previewArgs() {
        return new HashMap<>(
                Map.of("operation", "create", "monitorId", 7L, "dashboardJson", DOCUMENT));
    }

    private Map<String, Object> saveArgs() {
        var args = previewArgs();
        args.put(
                "previewHash",
                AgentGrafanaDraft.fromArguments("grafana.dashboard_save", args).previewHash());
        return args;
    }

    private AgentTaskAssessment.Goal goal(long id) {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                AgentTaskAssessment.Operation.CREATE,
                "grafana_dashboard",
                1,
                List.of(id),
                Map.of("title", "AI fixture"));
    }

    private AgentRuntimeModelResponse tool(String name, Map<String, Object> args, String callId) {
        return AgentRuntimeModelResponse.toolCalls(
                "",
                List.of(
                        AgentRuntimeToolCall.builder()
                                .toolName(name)
                                .arguments(args)
                                .toolCallId(callId)
                                .build()),
                null);
    }

    @Test
    void exactApprovedTaskCompletesFromNativeReadbackWithoutModelSuccessProse() {
        arrangeNative();
        var events = execute(true, false, goal(7), true);
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, terminal(events).getType());
        assertTrue(terminal(events).getResult().contains("hb-monitor-7"));
        verify(nativeService).save(eq(7L), eq(DOCUMENT), eq(null), eq(null), any());
        verify(nativeService).inspect(7L, "hb-monitor-7", 1L);
    }

    @Test
    void explicitApprovalRejectionNeverCallsNativeMutation() {
        arrangeNative();
        var events = execute(false, false, goal(7), true);
        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
        verify(nativeService, never()).save(any(), any(), any(), any(), any());
    }

    @Test
    void differentOriginalBindingAndMissingCheckpointBothStopBeforeWrite() {
        arrangeNative();
        assertEquals(
                AgentRuntimeEventType.ERROR,
                terminal(execute(true, false, goal(8), true)).getType());
        assertEquals(
                AgentRuntimeEventType.ERROR,
                terminal(execute(true, true, goal(7), true)).getType());
        verify(nativeService, never()).save(any(), any(), any(), any(), any());
    }

    @Test
    void noPersistedPreviewRejectsInventedModelHash() {
        arrangeNative();
        assertEquals(
                AgentRuntimeEventType.ERROR,
                terminal(execute(true, false, goal(7), false)).getType());
        verify(nativeService, never()).save(any(), any(), any(), any(), any());
    }

    @Test
    void unknownReadbackStopsAndDoesNotIssueAnotherWrite() {
        arrangeNative();
        when(nativeService.inspect(7L, "hb-monitor-7", 1L))
                .thenThrow(new IllegalStateException("GRAFANA_SNAPSHOT_UNAVAILABLE"));
        var events = execute(true, false, goal(7), true);
        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
        verify(nativeService).save(eq(7L), eq(DOCUMENT), eq(null), eq(null), any());
        assertTrue(terminal(events).getErrorMessage().contains("Automatic retry is stopped"));
    }

    private void arrangeNative() {
        when(monitors.getMonitor(7L)).thenReturn(Monitor.builder().id(7L).build());
        when(nativeService.save(eq(7L), eq(DOCUMENT), eq(null), eq(null), any()))
                .thenReturn(
                        new ConditionalDashboardService.SaveReceipt(
                                7L, "hb-monitor-7", 1L, true, true, false));
        when(nativeService.inspect(7L, "hb-monitor-7", 1L))
                .thenReturn(
                        new ConditionalDashboardService.Snapshot(
                                7L,
                                "hb-monitor-7",
                                1L,
                                "{\"id\":19,\"uid\":\"hb-monitor-7\",\"version\":1,\"title\":\"AI"
                                        + " fixture\",\"panels\":[]}"));
    }

    private List<AgentRuntimeEvent> execute(
            boolean approved,
            boolean dropCheckpoint,
            AgentTaskAssessment.Goal goal,
            boolean preview) {
        try (var spring = new GenericApplicationContext()) {
            spring.registerBean(
                    AgentGrafanaToolService.class,
                    () ->
                            new AgentGrafanaToolService(
                                    nativeService,
                                    bindings,
                                    monitors,
                                    new GrafanaProperties(
                                            true,
                                            "http://grafana.invalid",
                                            "http://grafana.invalid",
                                            "fixture",
                                            "fixture")));
            spring.refresh();
            var registry =
                    new AgentToolConfiguration()
                            .agentToolRegistry(spring.getDefaultListableBeanFactory());
            var bridge = mock(AgentToolBridge.class);
            when(bridge.visibleTools()).thenReturn(registry.descriptors());
            when(bridge.discoverableTools(any(), any())).thenReturn(List.of());
            when(bridge.execute(any(), any(), any(), any(), any()))
                    .thenAnswer(
                            invocation -> {
                                AgentRuntimeContext context = invocation.getArgument(0);
                                AgentRuntimeToolCall call = invocation.getArgument(2);
                                var handler = registry.find(call.getToolName()).orElseThrow();
                                var descriptor = handler.descriptor();
                                var policy =
                                        new AgentPolicyService()
                                                .decide(context.getActor(), descriptor);
                                boolean dangerous = descriptor.getRisk() == AgentToolRisk.DANGEROUS;
                                if (dangerous && !approved)
                                    return AgentToolExecutionResult.builder()
                                            .toolCallId(call.getToolCallId())
                                            .toolName(call.getToolName())
                                            .status(AgentToolStatus.DENIED)
                                            .risk(descriptor.getRisk())
                                            .decision(AgentPolicyDecision.DENY)
                                            .approvalStatus(AgentApprovalStatus.REJECTED)
                                            .build();
                                if (dangerous)
                                    assertEquals(
                                            AgentPolicyDecision.REQUIRE_APPROVAL,
                                            policy.getDecision());
                                var request =
                                        AgentToolExecutionRequest.builder()
                                                .sessionUid(context.getSessionUid())
                                                .runId(context.getRunId())
                                                .runUid(context.getRunUid())
                                                .runSessionId(context.getRunSessionId())
                                                .workspaceId(context.getWorkspaceId())
                                                .actor(context.getActor())
                                                .entryType(context.getEntryType())
                                                .approvalHandling(
                                                        AgentApprovalHandling.WAIT_FOR_DECISION)
                                                .approvalStatus(
                                                        dangerous ? "APPROVED" : "NOT_REQUIRED")
                                                .toolName(call.getToolName())
                                                .toolCallId(call.getToolCallId())
                                                .arguments(call.getArguments())
                                                .build();
                                var ledger =
                                        AgentToolCall.builder()
                                                .inputHash(
                                                        AgentToolPayloadHasher
                                                                .normalizedArgumentsHash(
                                                                        call.getArguments()))
                                                .approvalStatus(
                                                        dangerous ? "APPROVED" : "NOT_REQUIRED")
                                                .build();
                                AuthTokenRequestContext.bindWorkspaceId(context.getWorkspaceId());
                                try {
                                    var result =
                                            handler.execute(
                                                    new AgentToolExecutionContext(request, ledger));
                                    return AgentToolExecutionResult.builder()
                                            .toolCallId(call.getToolCallId())
                                            .toolName(call.getToolName())
                                            .status(result.getStatus())
                                            .risk(descriptor.getRisk())
                                            .decision(AgentPolicyDecision.ALLOW)
                                            .approvalStatus(
                                                    dangerous
                                                            ? AgentApprovalStatus.APPROVED
                                                            : AgentApprovalStatus.NOT_REQUIRED)
                                            .output(result.getModelContent())
                                            .errorMessage(result.getErrorMessage())
                                            .build();
                                } finally {
                                    AuthTokenRequestContext.clear();
                                }
                            });
            var replies = new ArrayDeque<AgentRuntimeModelResponse>();
            if (preview) replies.add(tool("grafana.dashboard_preview", previewArgs(), "preview"));
            replies.add(tool("grafana.dashboard_save", saveArgs(), "save"));
            AgentRuntimeModelClient client =
                    new AgentRuntimeModelClient() {
                        public boolean supportsReplyReview() {
                            return true;
                        }

                        public AgentRuntimeModelResponse stream(
                                AgentRuntimeModelRequest request,
                                AgentRuntimeControl control,
                                java.util.function.Consumer<String> delta) {
                            if (request.getPrompt()
                                    .getInstructions()
                                    .contains("ORIGINAL_TASK_GOAL_ONLY"))
                                return AgentRuntimeModelResponse.finalAnswer(
                                        JsonUtil.toJson(goal), null);
                            if (request.getPrompt()
                                    .getInstructions()
                                    .contains("ORIGINAL_TASK_COMPLETION_REVIEW"))
                                return AgentRuntimeModelResponse.finalAnswer(
                                        JsonUtil.toJson(
                                                new AgentTaskAssessment(
                                                        goal,
                                                        AgentTaskOutcome.Stage.COMPLETE,
                                                        true,
                                                        List.of())),
                                        null);
                            return replies.isEmpty()
                                    ? AgentRuntimeModelResponse.finalAnswer(
                                            "No verified write is available.", null)
                                    : replies.remove();
                        }
                    };
            var context =
                    AgentRuntimeContext.builder()
                            .entryType(AgentRuntimeEntryType.USER_INPUT)
                            .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                            .channelId("web-ui")
                            .workspaceId("grafana-test")
                            .receivedAt(CLOCK.millis())
                            .preferredLanguage("en")
                            .actor(
                                    AgentActor.builder()
                                            .type("user")
                                            .id("grafana-test-user")
                                            .roles(List.of("admin"))
                                            .build())
                            .userMessage(
                                    "Create one Grafana dashboard for monitor 7 named AI fixture.")
                            .sessionUid("grafana-session")
                            .runId(2L)
                            .runUid("grafana-run")
                            .runSessionId(1L)
                            .currentTimeIso(CLOCK.instant().toString())
                            .timezone("UTC")
                            .traceId("grafana-trace")
                            .chatHistory(List.of())
                            .build();
            List<AgentRuntimeEvent> events = new ArrayList<>();
            List<TranscriptMessage> transcript = new ArrayList<>();
            try (var control = AgentRuntimeControl.forContext(context, CLOCK)) {
                new AgentRuntimeLoop(new AgentRuntimeProperties(), client, bridge, CLOCK)
                        .run(
                                context,
                                control,
                                events::add,
                                message -> {
                                    transcript.add(message);
                                    return dropCheckpoint && message.getTaskCheckpoint() != null
                                            ? null
                                            : (long) transcript.size();
                                });
            }
            return events;
        }
    }

    private AgentRuntimeEvent terminal(List<AgentRuntimeEvent> events) {
        return events.stream()
                .filter(
                        e ->
                                e.getType() == AgentRuntimeEventType.RUN_COMPLETED
                                        || e.getType() == AgentRuntimeEventType.ERROR)
                .reduce((a, b) -> b)
                .orElseThrow();
    }
}
