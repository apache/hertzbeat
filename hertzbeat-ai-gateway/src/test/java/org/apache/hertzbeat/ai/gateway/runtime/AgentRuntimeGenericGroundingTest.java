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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.function.Consumer;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

/** Grounding contract for operational runs without an explicit target. */
class AgentRuntimeGenericGroundingTest {

    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-08-15T00:00:00Z"), ZoneOffset.UTC);
    private static final String GROUNDING_ERROR =
            java.util.ResourceBundle.getBundle("agent_reply", java.util.Locale.ENGLISH).getString("unverified");

    @Test
    void inheritedArgumentsDriveEvidenceWhileOriginalModelArgumentsRemainAuditable() {
        var bridge = bridge("monitor.get", AgentToolRisk.READ);
        String schema = "{\"type\":\"object\",\"properties\":{\"q\":{\"type\":\"object\",\"properties\":{"
                + "\"start\":{\"type\":\"integer\"},\"end\":{\"type\":\"integer\"},\"entityId\":{\"type\":\"integer\"}}}}}";
        var monitorDescriptor = bridge.visibleTools().getFirst();
        when(bridge.visibleTools()).thenReturn(List.of(monitorDescriptor, AgentToolDescriptor.builder()
                .name("metrics.otlp_inventory").description("Metric inventory").namespace("metrics")
                .risk(AgentToolRisk.READ).exposure(AgentToolExposure.MODEL_VISIBLE).inputSchema(schema).build()));
        var window = new AgentRequestedQueryWindow(1000, 901000);
        when(bridge.execute(any(), any(), any(), any(), any())).thenAnswer(invocation -> {
            AgentRuntimeToolCall call = invocation.getArgument(2);
            if (call.getToolName().equals("monitor.get")) {
                return result(call.getToolCallId(), call.getToolName(), AgentToolRisk.READ, "{\"monitorId\":42}");
            }
            return result(call.getToolCallId(), call.getToolName(), AgentToolRisk.READ, "{\"items\":[],\"truncated\":false}")
                    .toBuilder().effectiveArguments(window.inherit(call.getToolName(), call.getArguments(), schema))
                    .inheritedQueryWindow(window).build();
        });
        var inventory = AgentRuntimeToolCall.builder().toolCallId("inventory").toolName("metrics.otlp_inventory")
                .arguments(Map.of("q", Map.of("entityId", 42))).build();
        var client = new QueueModelClient(List.of(AgentRuntimeModelResponse.toolCalls("", List.of(
                AgentRuntimeToolCall.builder().toolCallId("monitor").toolName("monitor.get").arguments(Map.of("monitorId", 42)).build(),
                inventory), usage()), finalAnswer("Current evidence")), false);
        var ctx = org.mockito.Mockito.spy(context("inherited-proof", AgentRuntimeEntryType.USER_INPUT,
                List.of(), "cross-signal metrics"));
        when(ctx.getRequestedQueryWindow()).thenReturn(window);
        var events = new ArrayList<AgentRuntimeEvent>();
        var transcript = new ArrayList<TranscriptMessage>();
        try (var control = AgentRuntimeControl.forContext(ctx, CLOCK)) {
            new AgentRuntimeLoop(new AgentRuntimeProperties(), AgentTaskCompletionTestClient.observation(client, "platform"), bridge, CLOCK)
                    .run(ctx, control, events::add, message -> {
                        transcript.add(message);
                        return 1L;
                    });
        }
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, terminal(events).getType());
        var answer = transcript.getLast().text();
        assertEquals("Current evidence", answer);
        assertTrue(transcript.stream().anyMatch(message -> "metrics.otlp_inventory".equals(message.getToolName())
                && message.text().contains("\"items\":[]")));
        var inherited = window.inherit(inventory.getToolName(), inventory.getArguments(), schema);
        assertEquals(1000L, ((Map<?, ?>) inherited.get("q")).get("start"));
        assertEquals(901000L, ((Map<?, ?>) inherited.get("q")).get("end"));
        assertFalse(((Map<?, ?>) inventory.getArguments().get("q")).containsKey("start"));
        var advertised = client.requests.getFirst().getAvailableTools().stream()
                .filter(tool -> tool.getName().equals("metrics.otlp_inventory")).findFirst().orElseThrow();
        assertFalse(JsonUtil.fromJson(advertised.getInputSchema()).path("properties").path("q").path("properties").has("start"));
    }

    @Test
    void requestedBudgetIgnoresOrdinaryNumbersAndKeepsConfiguredMaximum() {
        for (String question : List.of("Inspect 15 minutes, show at most 3 observations and up to 5 alerts for monitor 5001",
                "Find at most 3 failed tool calls from yesterday", "Inspect monitor 4200 with 10 calls per minute",
                "Inspect at most 1.5 tool calls", "Inspect at most -2 tool calls",
                "Inspect at most 999999999999999999999 tool calls",
                java.util.ResourceBundle.getBundle("agent.budget-boundaries", java.util.Locale.ROOT).getString("normal"))) {
            assertEquals(64, AgentRequestedToolBudget.maximum(question, 64), question);
        }
        assertEquals(64, AgentRequestedToolBudget.maximum(null, 64));
        assertEquals(0, AgentRequestedToolBudget.maximum("Use at most 0 tool calls", 64));
        assertEquals(2, AgentRequestedToolBudget.maximum("Use up to 8 tool calls, maximum 2 tool calls", 64));
        assertEquals(3, AgentRequestedToolBudget.maximum("Use at most 30 tool calls", 3));
    }

    @Test
    void requestedBudgetCoversEveryEntryRiskAndFailedOrDeniedDispatch() {
        for (var entry : AgentRuntimeEntryType.values()) {
            for (var risk : AgentToolRisk.values()) {
                for (var status : List.of(AgentToolStatus.SUCCEEDED, AgentToolStatus.FAILED, AgentToolStatus.DENIED)) {
                    var bridge = bridge("example.action", risk);
                    var count = new java.util.concurrent.atomic.AtomicInteger();
                    when(bridge.execute(any(), any(), any(), any(), any())).thenAnswer(invocation -> {
                        AgentRuntimeToolCall call = invocation.getArgument(2);
                        count.incrementAndGet();
                        return AgentToolExecutionResult.builder().toolCallId(call.getToolCallId())
                                .toolName(call.getToolName()).risk(risk).status(status)
                                .decision(status == AgentToolStatus.DENIED ? AgentPolicyDecision.DENY : AgentPolicyDecision.ALLOW)
                                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED).output("{}").errorMessage("fixture").build();
                    });
                    var calls = List.of(toolCall("one", "example.action").getToolCalls().getFirst(),
                            toolCall("two", "example.action").getToolCalls().getFirst());
                    var client = new QueueModelClient(List.of(AgentRuntimeModelResponse.toolCalls("", calls, usage())), false);
                    var ctx = context("budget-matrix", entry, List.of(), "Use at most 1 tool call");
                    var events = new ArrayList<AgentRuntimeEvent>();
                    try (var control = AgentRuntimeControl.forContext(ctx, CLOCK)) {
                        new AgentRuntimeLoop(new AgentRuntimeProperties(), client, bridge, CLOCK)
                                .run(ctx, control, events::add, message -> 1L);
                    }
                    assertEquals(1, count.get(), entry + "/" + risk + "/" + status);
                    if (risk != AgentToolRisk.READ && status == AgentToolStatus.SUCCEEDED) {
                        assertEquals(AgentRuntimeEvent.EventStatus.RECOVERY_REQUIRED, terminal(events).getStatus());
                    } else if (risk != AgentToolRisk.READ && (status == AgentToolStatus.DENIED || status == AgentToolStatus.FAILED)) {
                        assertEquals(AgentRuntimeEvent.EventStatus.FAILED, terminal(events).getStatus());
                    } else {
                        assertTrue(terminal(events).getErrorMessage().contains("TOTAL_TOOL_BUDGET"));
                    }
                }
            }
        }
    }

    @Test
    void requestedBudgetCountsEarlierModelRoundsAndDurableAttempts() {
        var bridge = bridge("example.read", AgentToolRisk.READ);
        var count = new java.util.concurrent.atomic.AtomicInteger();
        when(bridge.execute(any(), any(), any(), any(), any())).thenAnswer(invocation -> {
            AgentRuntimeToolCall call = invocation.getArgument(2);
            count.incrementAndGet();
            return result(call.getToolCallId(), call.getToolName(), AgentToolRisk.READ, "{}");
        });
        var client = new QueueModelClient(List.of(toolCall("one", "example.read"),
                toolCall("two", "example.read"), toolCall("three", "example.read")), false);
        var ctx = context("budget-rounds", AgentRuntimeEntryType.USER_INPUT, List.of(), "Use at most 2 tool calls");
        var events = new ArrayList<AgentRuntimeEvent>();
        try (var control = AgentRuntimeControl.forContext(ctx, CLOCK)) {
            new AgentRuntimeLoop(new AgentRuntimeProperties(), client, bridge, CLOCK).run(ctx, control, events::add, message -> 1L);
        }
        assertEquals(2, count.get());
        assertTrue(terminal(events).getErrorMessage().contains("TOTAL_TOOL_BUDGET"));
        var resumed = org.mockito.Mockito.spy(context("budget-resume", AgentRuntimeEntryType.USER_INPUT,
                List.of(), "Use at most 1 tool call"));
        when(resumed.budgetAttempts()).thenReturn(List.of(new AgentRuntimeReadBudget.Attempt("old", "example.read",
                AgentToolRisk.READ, AgentToolStatus.FAILED, Map.of(), null, "previous failure")));
        var noModel = new QueueModelClient(List.of(), false);
        events.clear();
        try (var control = AgentRuntimeControl.forContext(resumed, CLOCK)) {
            new AgentRuntimeLoop(new AgentRuntimeProperties(), noModel, bridge, CLOCK)
                    .run(resumed, control, events::add, message -> 1L);
        }
        assertTrue(noModel.requests.isEmpty());
        assertEquals(2, count.get());
        assertTrue(terminal(events).getErrorMessage().contains("TOTAL_TOOL_BUDGET"));
    }

    @Test
    void requestedTotalBudgetCountsDiscoveryAndStopsBeforeExtraDispatch() {
        record BudgetCase(String question, int systemMaximum, int expected) { }

        for (var scenario : List.of(new BudgetCase("Inspect monitor state with at most 2 tool calls", 64, 2),
                new BudgetCase(java.util.ResourceBundle.getBundle("agent.final-audit", java.util.Locale.ROOT)
                        .getString("platform"), 64, 10),
                new BudgetCase("Inspect monitor state with at most 20 tool calls", 2, 2))) {
            var bridge = bridge("monitor.get", AgentToolRisk.READ);
            var monitor = bridge.visibleTools().getFirst();
            when(bridge.visibleTools()).thenReturn(List.of(monitor, AgentToolDescriptor.builder().name("tool.search")
                    .description("Discover read tools").inputSchema("{}").risk(AgentToolRisk.READ).namespace("tool")
                    .exposure(AgentToolExposure.MODEL_VISIBLE).build()));
            var executed = new java.util.concurrent.atomic.AtomicInteger();
            when(bridge.execute(any(), any(), any(), any(), any())).thenAnswer(invocation -> {
                AgentRuntimeToolCall call = invocation.getArgument(2);
                executed.incrementAndGet();
                return result(call.getToolCallId(), call.getToolName(), AgentToolRisk.READ,
                        call.getToolName().equals("tool.search") ? "{}"
                                : JsonUtil.toJson(Map.of("monitorId", call.getArguments().get("monitorId"))));
            });
            var calls = new ArrayList<AgentRuntimeToolCall>();
            calls.add(AgentRuntimeToolCall.builder().toolCallId("budget-0").toolName("tool.search")
                    .arguments(Map.of("namespace", "monitor", "query", "monitor.get")).build());
            for (int i = 1; i <= scenario.expected(); i++) {
                calls.add(AgentRuntimeToolCall.builder().toolCallId("budget-" + i).toolName("monitor.get")
                        .arguments(Map.of("monitorId", 42 + i)).build());
            }
            var limits = new AgentRuntimeProperties();
            limits.setMaxToolCalls(scenario.systemMaximum());
            limits.setMaxSteps(1);
            var model = new QueueModelClient(List.of(AgentRuntimeModelResponse.toolCalls("", calls, usage())), false);
            var ctx = context("budget-run", AgentRuntimeEntryType.USER_INPUT, List.of(), scenario.question());
            var events = new ArrayList<AgentRuntimeEvent>();
            try (var control = AgentRuntimeControl.forContext(ctx, CLOCK)) {
                new AgentRuntimeLoop(limits, model, bridge, CLOCK).run(ctx, control, events::add, message -> 1L);
            }
            assertEquals(scenario.expected(), executed.get());
            assertTrue(terminal(events).getErrorMessage().contains("TOTAL_TOOL_BUDGET"));
        }
    }

    @Test
    void repeatedQuestionAutomaticallyCorrectsHistoryOnlyFinalWithFreshRead() {
        var bridge = bridge("monitor.query", AgentToolRisk.READ);
        when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(result("monitor.query", AgentToolRisk.READ,
                "{\"content\":[{\"monitorId\":42}],\"totalElements\":1}"));
        var history = List.of(TranscriptMessage.userText("Investigate current monitors"),
                TranscriptMessage.assistantToolCalls("", List.of(TranscriptContent.toolCall("old", "monitor.query", Map.of())), null),
                TranscriptMessage.toolResult("old", "monitor.query", "old snapshot", null));
        var client = new QueueModelClient(List.of(finalAnswer("HISTORY_ONLY_CLAIM"),
                toolCall("monitor.query"), finalAnswer("Fresh observation")), true);
        var events = run(context("new-retry-run", history), client, bridge, entry -> 1L);
        assertEquals(List.of(false, true, false), client.requests.stream().map(AgentRuntimeModelRequest::isToolCallRequired).toList());
        assertFalse(client.requests.get(2).getPrompt().getInstructions().contains("FRESH_READ_REQUIRED"));
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, terminal(events).getType());
        verify(bridge).execute(any(), any(), any(), any(), any());
        assertFalse(JsonUtil.toJson(events).contains("HISTORY_ONLY_CLAIM"));
    }

    @Test
    void compactedOrAssistantOnlyHistoryStillGetsBoundedFreshReadCorrection() {
        var bridge = bridge("monitor.query", AgentToolRisk.READ);
        when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(result("monitor.query", AgentToolRisk.READ,
                "{\"content\":[{\"monitorId\":42}],\"totalElements\":1}"));
        var history = List.of(TranscriptMessage.userText("Investigate current monitors"),
                TranscriptMessage.assistantText("Historical monitor snapshot; no current observation", null));
        var client = new QueueModelClient(List.of(finalAnswer("HISTORY_ONLY_CLAIM"),
                toolCall("monitor.query"), finalAnswer("Fresh observation")), true);
        var durable = new ArrayList<TranscriptMessage>();
        var events = run(context("retry-summary", history), client, bridge, message -> {
            durable.add(message);
            return (long) durable.size();
        });
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, terminal(events).getType());
        assertTrue(client.requests.get(1).getChatHistory().getLast().text().contains("RUNTIME_READ_CORRECTION"));
        assertFalse(durable.stream().anyMatch(message -> message.text().contains("RUNTIME_READ_CORRECTION")));
        assertEquals(2, history.size());
    }

    @Test
    void failedAndDeniedResultsPersistTheirExactStatusWithoutGrounding() {
        for (AgentToolStatus status : List.of(AgentToolStatus.FAILED, AgentToolStatus.DENIED)) {
            AgentToolBridge bridge = bridge("metrics.history", AgentToolRisk.READ);
            when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(
                    result("metrics.history", AgentToolRisk.READ, "invalid query")
                            .toBuilder().status(status).errorMessage("Invalid range").build());
            List<TranscriptMessage> transcript = new ArrayList<>();
            List<AgentRuntimeEvent> events = run(context("run-failed", List.of()),
                    new QueueModelClient(List.of(toolCall("metrics.history"), finalAnswer("No data.")), true),
                    bridge, message -> {
                        transcript.add(message);
                        return (long) transcript.size();
                    });
            TranscriptMessage tool = transcript.stream()
                    .filter(message -> message.getRole() == TranscriptMessage.TranscriptRole.TOOL_RESULT)
                    .findFirst().orElseThrow();
            assertEquals(status, tool.getToolStatus());
            assertEquals(1L, tool.getToolElapsedMs());
            assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage());
        }
    }

    @Test
    void repeatedReadFailuresStopBeforeAnotherModelRequest() {
        AgentToolBridge bridge = bridge("metrics.history", AgentToolRisk.READ);
        when(bridge.execute(any(), any(), any(), any(), any())).thenAnswer(invocation -> {
            AgentRuntimeToolCall call = invocation.getArgument(2);
            return result(call.getToolCallId(), "metrics.history", AgentToolRisk.READ, "invalid query")
                    .toBuilder().status(AgentToolStatus.FAILED)
                    .errorMessage("metrics.history exact query requires start < end").build();
        });
        List<AgentRuntimeEvent> events = run(context("run-failed", List.of()),
                new QueueModelClient(List.of(
                        toolCall("call-1", "metrics.history"),
                        toolCall("call-2", "metrics.history"),
                        toolCall("call-3", "metrics.history"),
                        finalAnswer("All queries succeeded.")), true), bridge, message -> 1L);
        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
        assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage());
        assertFalse(events.stream().anyMatch(event -> "All queries succeeded.".equals(event.getDelta())));
    }

    @Test
    void successfulCallsBetweenFailuresCannotEraseSameRequestBudget() {
        AgentToolBridge bridge = bridge("metrics.history", AgentToolRisk.READ);
        when(bridge.execute(any(), any(), any(), any(), any())).thenAnswer(invocation -> {
            AgentRuntimeToolCall call = invocation.getArgument(2);
            var result = result(call.getToolCallId(), call.getToolName(), AgentToolRisk.READ, "{\"returnedPoints\":0,\"totalPoints\":0}");
            return call.getToolCallId().startsWith("fail")
                    ? result.toBuilder().status(AgentToolStatus.FAILED).errorMessage("Invalid query").build() : result;
        });
        List<AgentRuntimeModelResponse> turns = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            for (String prefix : List.of("fail", "success")) {
                turns.add(AgentRuntimeModelResponse.toolCalls("Read", List.of(AgentRuntimeToolCall.builder()
                        .toolCallId(prefix + i).toolName("metrics.history")
                        .arguments(Map.of("monitorId", "fail".equals(prefix) ? 42 : 100 + i)).build()), usage()));
            }
        }
        turns.add(finalAnswer("All requests succeeded."));
        List<TranscriptMessage> recorded = new ArrayList<>();
        var events = run(context("run-budget", List.of()), new QueueModelClient(turns, true), bridge, message -> {
            recorded.add(message);
            return (long) recorded.size();
        });
        org.junit.jupiter.api.Assertions.assertTrue(terminal(events).getErrorMessage().contains("READ_EQUIVALENT_REQUEST_BUDGET"));
        assertEquals(3, recorded.stream().filter(message -> message.getToolStatus() == AgentToolStatus.FAILED).count());
        assertEquals(5, recorded.stream().filter(message -> message.getRole() == TranscriptMessage.TranscriptRole.TOOL_RESULT).count());
        assertFalse(events.stream().anyMatch(event -> "All requests succeeded.".equals(event.getDelta())));
    }

    @Test
    void totalBudgetCountsSuccessfulChangedQueriesAndKeepsTheirTranscript() {
        AgentToolBridge bridge = bridge("monitor.query", AgentToolRisk.READ);
        when(bridge.execute(any(), any(), any(), any(), any())).thenAnswer(invocation -> {
            AgentRuntimeToolCall call = invocation.getArgument(2);
            return result(call.getToolCallId(), "monitor.query", AgentToolRisk.READ,
                    "{\"content\":[{\"id\":42}],\"totalElements\":1}");
        });
        List<AgentRuntimeModelResponse> turns = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            turns.add(AgentRuntimeModelResponse.toolCalls("Read", List.of(AgentRuntimeToolCall.builder()
                    .toolCallId("call-" + i).toolName("monitor.query").arguments(Map.of("pageIndex", i)).build()), usage()));
        }
        AgentRuntimeProperties limits = new AgentRuntimeProperties();
        limits.setMaxToolCalls(4);
        var loop = new AgentRuntimeLoop(limits, new QueueModelClient(turns, true), bridge, CLOCK);
        var context = context("run-total-budget", List.of());
        List<AgentRuntimeEvent> events = new ArrayList<>();
        List<TranscriptMessage> transcript = new ArrayList<>();
        try (AgentRuntimeControl control = AgentRuntimeControl.forContext(context, CLOCK)) {
            loop.run(context, control, events::add, message -> {
                transcript.add(message);
                return (long) transcript.size();
            });
        }
        org.junit.jupiter.api.Assertions.assertTrue(terminal(events).getErrorMessage().contains("PARTIAL: TOTAL_TOOL_BUDGET"));
        assertEquals(4, transcript.stream().filter(message -> message.getRole() == TranscriptMessage.TranscriptRole.TOOL_RESULT).count());
    }

    @Test
    void durableSameRunBudgetIsRestoredBeforeAnotherModelRequest() {
        var dao = mock(org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao.class);
        var run = org.apache.hertzbeat.common.entity.agent.AgentRun.builder().id(2L).runUid("run-restored")
                .sessionId(1L).entryType("USER_INPUT").status("RUNNING").build();
        var rows = java.util.stream.IntStream.range(0, 3).mapToObj(i ->
                org.apache.hertzbeat.common.entity.agent.AgentToolCall.builder().id((long) i + 1).runId(2L)
                        .runUid("run-restored").sessionId(1L).toolCallId("old-" + i).toolName("metrics.history")
                        .risk("READ").status("FAILED").inputJson("{\"monitorId\":42}").errorMessage("Invalid query").build()).toList();
        when(dao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(rows);
        var verifier = new AgentGroundingEvidenceVerifier(
                mock(org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder.class), dao);
        var restored = context("run-restored", List.of()).withVerifiedChatHistory(verifier.verifyHistory(run, null, List.of()));
        AgentToolBridge bridge = bridge("metrics.history", AgentToolRisk.READ);
        var events = run(restored, new QueueModelClient(List.of(), true), bridge, message -> 1L);
        org.junit.jupiter.api.Assertions.assertTrue(terminal(events).getErrorMessage().contains("READ_EQUIVALENT_REQUEST_BUDGET"));
        verify(bridge, never()).execute(any(), any(), any(), any(), any());
    }

    @Test
    void plainRunRejectsAndHidesZeroToolFinalAnswer() {
        AgentToolBridge bridge = bridge("monitor.query", AgentToolRisk.READ);

        List<AgentRuntimeEvent> events = run(context("run-plain", List.of()),
                new QueueModelClient(List.of(finalAnswer("Everything is healthy.")), true),
                bridge, message -> 1L);

        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
        assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage());
        assertFalse(events.stream().anyMatch(event -> event.getDelta() != null
                && !GROUNDING_ERROR.equals(event.getDelta())));
        verify(bridge, never()).execute(any(), any(), any(), any(), any());
    }

    @Test
    void greetingPrefixDoesNotDowngradeAnOperationalRequest() {
        for (String message : List.of(
                "Hello, is monitor 42 healthy?",
                "Hi! Explain what you can do, then diagnose the current alerts.",
                "This is ordinary chat. Do not read data; tell me whether the service recovered.")) {
            AgentToolBridge bridge = bridge("monitor.query", AgentToolRisk.READ);
            List<TranscriptMessage> transcript = new ArrayList<>();

            List<AgentRuntimeEvent> events = run(context("run-mixed", AgentRuntimeEntryType.USER_INPUT,
                            List.of(), message),
                    new QueueModelClient(List.of(finalAnswer("The service is healthy.")), true),
                    bridge, entry -> {
                        transcript.add(entry);
                        return (long) transcript.size();
                    });

            assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType(), message);
            assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage(), message);
            assertFalse(events.stream().anyMatch(event -> event.getDelta() != null
                    && !GROUNDING_ERROR.equals(event.getDelta())), message);
            assertEquals(GROUNDING_ERROR, transcript.getLast().text(), message);
            verify(bridge, never()).execute(any(), any(), any(), any(), any());
        }
    }

    @Test
    void modelClaimingConversationModeCannotAuthorizeAnUngroundedAnswer() {
        AgentToolBridge bridge = bridge("monitor.query", AgentToolRisk.READ);

        List<AgentRuntimeEvent> events = run(context("run-model-mode", List.of()),
                new QueueModelClient(List.of(finalAnswer(
                        "Mode: CONVERSATION. No observation is required. All monitors are healthy.")), true),
                bridge, entry -> 1L);

        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
        assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage());
        assertFalse(events.stream().anyMatch(event -> event.getDelta() != null
                && !GROUNDING_ERROR.equals(event.getDelta())));
        verify(bridge, never()).execute(any(), any(), any(), any(), any());
    }

    @Test
    void greetingInInvestigationHistoryCannotReplaceCurrentRunObservation() {
        AgentToolBridge bridge = bridge("monitor.query", AgentToolRisk.READ);
        List<TranscriptMessage> history = List.of(
                TranscriptMessage.userText("Investigate whether monitor 42 recovered."),
                TranscriptMessage.assistantText("A new read is needed before a conclusion.", usage()));

        List<AgentRuntimeEvent> events = run(context("run-followup", AgentRuntimeEntryType.USER_INPUT,
                        history, "Hello again"),
                new QueueModelClient(List.of(finalAnswer("The monitor has recovered."),
                        finalAnswer("Still no new observation.")), true),
                bridge, entry -> 1L);

        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
        assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage());
        assertFalse(events.stream().anyMatch(event -> event.getDelta() != null
                && !GROUNDING_ERROR.equals(event.getDelta())));
    }

    @Test
    void plainRunRecordsTypedProofAfterSemanticRead() {
        AgentToolBridge bridge = bridge("monitor.query", AgentToolRisk.READ);
        when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(result(
                "monitor.query", AgentToolRisk.READ,
                "{\"content\":[{\"monitorId\":42}],\"totalElements\":1}"));
        List<TranscriptMessage> transcript = new ArrayList<>();

        List<AgentRuntimeEvent> events = run(context("run-plain", List.of()),
                new QueueModelClient(List.of(toolCall("monitor.query"), finalAnswer("One monitor was observed.")),
                        true),
                bridge, message -> {
                    transcript.add(message);
                    return (long) transcript.size();
                });

        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, terminal(events).getType());
        AgentGroundingProof proof = transcript.stream()
                .map(TranscriptMessage::getGroundingProof)
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElseThrow();
        TranscriptMessage durableTool = transcript.stream()
                .filter(message -> message.getRole() == TranscriptMessage.TranscriptRole.TOOL_RESULT)
                .findFirst().orElseThrow();
        var durable = JsonUtil.fromJson(JsonUtil.toJson(durableTool));
        assertEquals("SUCCEEDED", durable.path("toolStatus").asText());
        assertEquals(1, durable.path("toolElapsedMs").asInt());
        assertEquals("read-grounding.v1", proof.getVersion());
        assertEquals("run-plain", proof.getRunUid());
        assertEquals("monitor.query", proof.getToolName());
        assertEquals("call-read", proof.getToolCallId());
        assertEquals(1, proof.getObservationCount());
        assertNotNull(proof.getInputHash());
        assertNotNull(proof.getOutputHash());
        assertNotNull(proof.getObservationKind());
    }

    @Test
    void alertTriggerWithoutIncidentCannotDowngradeToGenericGrounding() {
        AgentToolBridge bridge = bridge("monitor.query", AgentToolRisk.READ);
        when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(result(
                "monitor.query", AgentToolRisk.READ,
                "{\"content\":[{\"monitorId\":42}],\"totalElements\":1}"));

        List<AgentRuntimeEvent> events = run(context(
                        "run-alert", AgentRuntimeEntryType.ALERT_TRIGGER, List.of()),
                new QueueModelClient(List.of(toolCall("monitor.query"), finalAnswer("Observed.")), true),
                bridge, message -> 1L);

        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
        assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage());
    }

    @Test
    void scheduleRequiresAndAcceptsOnlySemanticReadGrounding() {
        AgentToolBridge positiveBridge = bridge("monitor.query", AgentToolRisk.READ);
        when(positiveBridge.execute(any(), any(), any(), any(), any())).thenReturn(result(
                "monitor.query", AgentToolRisk.READ,
                "{\"content\":[{\"monitorId\":42}],\"totalElements\":1}"));
        List<AgentRuntimeEvent> positive = run(context(
                        "run-schedule", AgentRuntimeEntryType.SCHEDULE_TRIGGER, List.of()),
                new QueueModelClient(List.of(toolCall("monitor.query"), finalAnswer("Observed.")), true),
                positiveBridge, message -> 1L);

        List<AgentRuntimeEvent> zeroRead = run(context(
                        "run-schedule-zero", AgentRuntimeEntryType.SCHEDULE_TRIGGER, List.of()),
                new QueueModelClient(List.of(finalAnswer("No read.")), true),
                bridge("monitor.query", AgentToolRisk.READ), message -> 1L);

        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, terminal(positive).getType());
        assertEquals(AgentRuntimeEventType.ERROR, terminal(zeroRead).getType());
        assertEquals(GROUNDING_ERROR, terminal(zeroRead).getErrorMessage());
    }

    @Test
    void monitorToolTurnTextRemainsSuppressedWhenServerFactsAreProjected() {
        AgentToolBridge bridge = bridge("monitor.query", AgentToolRisk.READ);
        when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(
                result("call-read", "monitor.query", AgentToolRisk.READ,
                        "{\"content\":[{\"monitorId\":42}],\"totalElements\":1}"),
                result("call-read-2", "monitor.query", AgentToolRisk.READ,
                        "{\"content\":[{\"monitorId\":43}],\"totalElements\":1}"));
        List<TranscriptMessage> transcript = new ArrayList<>();

        List<AgentRuntimeEvent> events = run(context("run-plain", List.of()),
                new QueueModelClient(List.of(
                        toolCall("call-read", "monitor.query", "Everything is healthy."),
                        toolCall("call-read-2", "monitor.query", "The first read found one monitor."),
                        finalAnswer("Both reads were observed.")), true),
                bridge, message -> {
                    transcript.add(message);
                    return (long) transcript.size();
                });

        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, terminal(events).getType());
        List<TranscriptMessage> assistantTurns = transcript.stream()
                .filter(message -> message.getRole() == TranscriptMessage.TranscriptRole.ASSISTANT)
                .filter(message -> !message.toolCalls().isEmpty())
                .toList();
        assertEquals("", assistantTurns.get(0).text());
        assertEquals("", assistantTurns.get(1).text());
    }

    @Test
    void plainRunRejectsUnknownMalformedAndNonReadResults() {
        List<ReadCase> cases = List.of(
                new ReadCase("unknown", "custom.read", AgentToolRisk.READ, "{\"content\":[1]}"),
                new ReadCase("search", "tool.search", AgentToolRisk.READ, "{\"tools\":[{\"name\":\"monitor.query\"}]}"),
                new ReadCase("count mismatch", "monitor.query", AgentToolRisk.READ,
                        "{\"content\":[{\"monitorId\":42}],\"totalElements\":0}"),
                new ReadCase("malformed", "monitor.query", AgentToolRisk.READ, "{"),
                new ReadCase("change", "monitor.query", AgentToolRisk.CHANGE,
                        "{\"content\":[{\"monitorId\":42}],\"totalElements\":1}"));
        for (ReadCase readCase : cases) {
            AgentToolBridge bridge = bridge(readCase.toolName(), readCase.risk());
            when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(result(
                    readCase.toolName(), readCase.risk(), readCase.output()));

            List<AgentRuntimeEvent> events = run(context("run-plain", List.of()),
                    new QueueModelClient(List.of(toolCall(readCase.toolName()), finalAnswer("Unsupported.")), true),
                    bridge, message -> 1L);

            assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType(), readCase.name());
            if (readCase.risk() != AgentToolRisk.READ) {
                assertEquals(AgentRuntimeEvent.EventStatus.RECOVERY_REQUIRED, terminal(events).getStatus());
            } else {
                assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage(), readCase.name());
            }
        }
    }

    @Test
    void proofPersistenceMustSucceedBeforeTheRunBecomesGrounded() {
        for (AgentRuntimeTranscriptSink sink : List.<AgentRuntimeTranscriptSink>of(
                message -> null,
                message -> { throw new IllegalStateException("storage unavailable"); })) {
            AgentToolBridge bridge = bridge("monitor.query", AgentToolRisk.READ);
            when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(result(
                    "monitor.query", AgentToolRisk.READ,
                    "{\"content\":[{\"monitorId\":42}],\"totalElements\":1}"));

            List<AgentRuntimeEvent> events = run(context("run-plain", List.of()),
                    new QueueModelClient(List.of(toolCall("monitor.query"), finalAnswer("Observed.")), true),
                    bridge, sink);

            assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
            assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage());
        }
    }

    @Test
    void directLoopDoesNotRestoreGenericProofWithoutDurableVerifier() {
        List<TranscriptMessage> transcript = groundedTranscript();
        AgentToolBridge replayBridge = bridge("monitor.query", AgentToolRisk.READ);
        List<AgentRuntimeEvent> replay = run(context("run-plain", transcript),
                new QueueModelClient(List.of(finalAnswer("Durable observation.")), true),
                replayBridge, message -> 1L);
        assertEquals(AgentRuntimeEventType.ERROR, terminal(replay).getType());
        verify(replayBridge, never()).execute(any(), any(), any(), any(), any());

        List<TranscriptMessage> foreign = copy(transcript);
        List<AgentRuntimeEvent> foreignReplay = run(context("run-other", foreign),
                new QueueModelClient(List.of(finalAnswer("Foreign observation.")), true),
                bridge("monitor.query", AgentToolRisk.READ), message -> 1L);
        assertEquals(AgentRuntimeEventType.ERROR, terminal(foreignReplay).getType());

        List<TranscriptMessage> moved = copy(transcript);
        moved.stream().filter(message -> message.getGroundingProof() != null).findFirst().orElseThrow()
                .setToolCallId("call-moved");
        List<AgentRuntimeEvent> movedReplay = run(context("run-plain", moved),
                new QueueModelClient(List.of(finalAnswer("Moved observation.")), true),
                bridge("monitor.query", AgentToolRisk.READ), message -> 1L);
        assertEquals(AgentRuntimeEventType.ERROR, terminal(movedReplay).getType());
    }

    @Test
    void multipleSuccessfulReadsPersistOnlyTheFirstGroundingProof() {
        AgentToolBridge bridge = bridge("monitor.query", AgentToolRisk.READ);
        when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(
                result("call-read", "monitor.query", AgentToolRisk.READ,
                        "{\"content\":[{\"monitorId\":42}],\"totalElements\":1}"),
                result("call-read-2", "monitor.query", AgentToolRisk.READ,
                        "{\"content\":[{\"monitorId\":43}],\"totalElements\":1}"));
        List<TranscriptMessage> transcript = new ArrayList<>();

        List<AgentRuntimeEvent> events = run(context("run-plain", List.of()),
                new QueueModelClient(List.of(
                        toolCall("call-read", "monitor.query"),
                        toolCall("call-read-2", "monitor.query"),
                        finalAnswer("Both reads were observed.")), true),
                bridge, message -> {
                    transcript.add(message);
                    return (long) transcript.size();
                });

        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, terminal(events).getType());
        assertEquals(1, transcript.stream().filter(message -> message.getGroundingProof() != null).count());
        List<AgentRuntimeEvent> replay = run(context("run-plain", copy(transcript)),
                new QueueModelClient(List.of(finalAnswer("Durable first proof.")), true),
                bridge("monitor.query", AgentToolRisk.READ), message -> 1L);
        assertEquals(AgentRuntimeEventType.ERROR, terminal(replay).getType());
    }

    private List<TranscriptMessage> groundedTranscript() {
        AgentToolBridge bridge = bridge("monitor.query", AgentToolRisk.READ);
        when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(result(
                "monitor.query", AgentToolRisk.READ,
                "{\"content\":[{\"monitorId\":42}],\"totalElements\":1}"));
        List<TranscriptMessage> transcript = new ArrayList<>();
        run(context("run-plain", List.of()),
                new QueueModelClient(List.of(toolCall("monitor.query"),
                        AgentRuntimeModelResponse.invalidResponse("interrupted", null)), false),
                bridge, message -> {
                    transcript.add(message);
                    return (long) transcript.size();
                });
        return copy(transcript);
    }

    private List<TranscriptMessage> copy(List<TranscriptMessage> transcript) {
        return transcript.stream()
                .map(message -> JsonUtil.fromJson(JsonUtil.toJson(message), TranscriptMessage.class))
                .toList();
    }

    private List<AgentRuntimeEvent> run(AgentRuntimeContext context, AgentRuntimeModelClient model,
                                        AgentToolBridge bridge, AgentRuntimeTranscriptSink sink) {
        AgentRuntimeLoop loop = new AgentRuntimeLoop(new AgentRuntimeProperties(), AgentTaskCompletionTestClient.observation(model, "platform"), bridge, CLOCK);
        List<AgentRuntimeEvent> events = new ArrayList<>();
        try (AgentRuntimeControl control = AgentRuntimeControl.forContext(context, CLOCK)) {
            loop.run(context, control, events::add, sink);
        }
        return events;
    }

    private AgentRuntimeContext context(String runUid, List<TranscriptMessage> history) {
        return context(runUid, AgentRuntimeEntryType.USER_INPUT, history);
    }

    private AgentRuntimeContext context(String runUid, AgentRuntimeEntryType entryType,
                                        List<TranscriptMessage> history) {
        return context(runUid, entryType, history, "investigate current state");
    }

    private AgentRuntimeContext context(String runUid, AgentRuntimeEntryType entryType,
                                        List<TranscriptMessage> history, String userMessage) {
        return AgentRuntimeContext.builder()
                .entryType(entryType)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .channelId("web-ui")
                .receivedAt(1L)
                .actor(AgentActor.builder().type("user").id("alice").roles(List.of("user")).build())
                .userMessage(userMessage)
                .workspaceId("default")
                .sessionUid("session-plain")
                .runId(2L)
                .runUid(runUid)
                .runSessionId(1L)
                .currentTimeIso("2026-08-15T08:00:00+08:00")
                .timezone("Asia/Shanghai")
                .traceId("trace-plain")
                .chatHistory(history)
                .build();
    }

    private AgentRuntimeModelResponse toolCall(String toolName) {
        return toolCall("call-read", toolName);
    }

    private AgentRuntimeModelResponse toolCall(String callId, String toolName) {
        return toolCall(callId, toolName, "Reading HertzBeat data.");
    }

    private AgentRuntimeModelResponse toolCall(String callId, String toolName, String assistantText) {
        return AgentRuntimeModelResponse.toolCalls(assistantText, List.of(
                AgentRuntimeToolCall.builder().toolCallId(callId).toolName(toolName)
                        .arguments(Map.of("pageSize", 1)).build()), usage());
    }

    private AgentRuntimeModelResponse finalAnswer(String answer) {
        return AgentRuntimeModelResponse.finalAnswer(answer, usage());
    }

    private AgentRuntimeModelResponse.Usage usage() {
        return AgentRuntimeModelResponse.Usage.builder()
                .promptTokens(5L).completionTokens(4L).totalTokens(9L).build();
    }

    private AgentToolBridge bridge(String toolName, AgentToolRisk risk) {
        AgentToolBridge bridge = mock(AgentToolBridge.class);
        when(bridge.visibleTools()).thenReturn(List.of(AgentToolDescriptor.builder()
                .name(toolName).description("Read HertzBeat data.").inputSchema("{\"type\":\"object\"}")
                .risk(risk).namespace("test").exposure(AgentToolExposure.MODEL_VISIBLE).build()));
        when(bridge.discoverableTools(any(), any())).thenReturn(List.of());
        return bridge;
    }

    private AgentToolExecutionResult result(String toolName, AgentToolRisk risk, String output) {
        return result("call-read", toolName, risk, output);
    }

    private AgentToolExecutionResult result(String callId, String toolName, AgentToolRisk risk, String output) {
        return AgentToolExecutionResult.builder()
                .toolCallId(callId).toolName(toolName).status(AgentToolStatus.SUCCEEDED)
                .decision(AgentPolicyDecision.ALLOW).risk(risk)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED).output(output).elapsedMs(1L).build();
    }

    private AgentRuntimeEvent terminal(List<AgentRuntimeEvent> events) {
        return events.stream()
                .filter(event -> event.getType() == AgentRuntimeEventType.RUN_COMPLETED
                        || event.getType() == AgentRuntimeEventType.ERROR)
                .reduce((left, right) -> right)
                .orElseThrow();
    }

    private record ReadCase(String name, String toolName, AgentToolRisk risk, String output) {
    }

    private static final class QueueModelClient implements AgentRuntimeModelClient {

        private final Queue<AgentRuntimeModelResponse> responses;
        private final boolean streamFinal;
        private final List<AgentRuntimeModelRequest> requests = new ArrayList<>();

        private QueueModelClient(List<AgentRuntimeModelResponse> responses, boolean streamFinal) {
            this.responses = new ArrayDeque<>(responses);
            this.streamFinal = streamFinal;
        }

        @Override
        public AgentRuntimeModelResponse stream(AgentRuntimeModelRequest request, AgentRuntimeControl control,
                                                Consumer<String> deltaConsumer) {
            requests.add(request);
            AgentRuntimeModelResponse response = responses.remove();
            if (streamFinal && response.getType() == AgentRuntimeModelResponse.ResponseType.FINAL_ANSWER) {
                deltaConsumer.accept(response.getFinalAnswer());
            }
            return response;
        }
    }
}
