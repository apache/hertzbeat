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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.function.Consumer;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.contract.UserInput.Message;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolOutput;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionOrchestrator;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry.RegisteredTool;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link AgentRuntimeLoop}.
 */
class AgentRuntimeLoopTest {

    private static final Instant NOW = Instant.parse("2026-04-19T00:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    @Test
    void finalAnswerShouldNotExecuteTools() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        QueueModelClient modelClient = new QueueModelClient(List.of(finalResponse("No active problem.")));

        InvocationResult result = run(modelClient, catalog,
                runtime(config -> config.setMaxCompletionTokens(1234)));

        assertRuntimeSucceeded(result);
        assertEquals("No active problem.", result.getResponse());
        assertEquals(1, modelClient.requests.size());
        assertEquals(1234, modelClient.requests.get(0).getMaxCompletionTokens());
        assertEquals(0, catalog.executeCount);
    }

    @Test
    void persistedSequenceShouldBeAppliedToRuntimeMessage() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of());
        QueueModelClient modelClient = new QueueModelClient(List.of(finalResponse("Done.")));
        RuntimeFixture runtime = runtime(config -> { });
        List<TranscriptMessage> recordedMessages = new ArrayList<>();
        AgentRuntimeTranscriptSink transcriptSink = message -> {
            recordedMessages.add(message);
            return 42L;
        };

        try (AgentRuntimeControl control = AgentRuntimeControl.forContext(runtime.context(), CLOCK)) {
            loop(modelClient, catalog, runtime.config()).run(runtime.context(), control,
                AgentRuntimeLoop.EventPublisher.noop(), transcriptSink);
        }

        assertEquals(1, recordedMessages.size());
        assertEquals(42L, recordedMessages.get(0).getSessionSequence());
    }

    @Test
    void finalAnswerShouldKeepModelTextUnchanged() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        List<AgentRuntimeEvent> events = new ArrayList<>();
        String response = "raw apiKey=visible " + "x".repeat(1500);
        QueueModelClient modelClient = new QueueModelClient(List.of(finalResponse(response)));

        InvocationResult result = run(modelClient, catalog, runtime(config -> { }), events::add);

        assertRuntimeSucceeded(result);
        assertEquals(response, result.getResponse());
        assertTrue(events.stream()
                .anyMatch(event -> event.getType() == AgentRuntimeEventType.ITEM_DELTA
                        && response.equals(event.getDelta())));
        assertTrue(events.stream()
                .anyMatch(event -> event.getType() == AgentRuntimeEventType.RUN_COMPLETED
                        && event.getErrorMessage() == null));
    }

    @Test
    void invalidModelResponseShouldStopWithModelError() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        QueueModelClient modelClient = new QueueModelClient(List.of(AgentRuntimeModelResponse.invalidResponse(
                "empty_model_response",
                "Runtime model returned neither a final answer nor tool calls.",
                null)));

        InvocationResult result = run(modelClient, catalog, runtime(config -> { }));

        assertRuntimeFailed(result);
        assertEquals("Runtime model returned neither a final answer nor tool calls.",
                result.getError().getMessage());
        assertEquals(0, catalog.executeCount);
    }

    @Test
    void terminalErrorShouldKeepRuntimeMessageUnbounded() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        List<AgentRuntimeEvent> events = new ArrayList<>();
        String errorMessage = "Runtime model returned a large invalid response: " + "x".repeat(1500);
        QueueModelClient modelClient = new QueueModelClient(List.of(AgentRuntimeModelResponse.invalidResponse(
                "large_invalid_model_response",
                errorMessage,
                null)));

        InvocationResult result = run(modelClient, catalog, runtime(config -> { }), events::add);

        assertRuntimeFailed(result);
        assertEquals(errorMessage, result.getError().getMessage());
        AgentRuntimeEvent terminalEvent = terminalEvent(events);
        assertEquals(AgentRuntimeEventType.ERROR, terminalEvent.getType());
        assertEquals(errorMessage, terminalEvent.getErrorMessage());
    }

    @Test
    void finalAnswerShouldPublishTextDeltasBeforeCompletion() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        List<AgentRuntimeEvent> events = new ArrayList<>();
        AgentRuntimeModelClient modelClient = new AgentRuntimeModelClient() {
            @Override
            public AgentRuntimeModelResponse stream(AgentRuntimeModelRequest request, AgentRuntimeControl control,
                                                    java.util.function.Consumer<String> textDeltaConsumer) {
                textDeltaConsumer.accept("No ");
                textDeltaConsumer.accept("active problem.");
                return finalResponse("No active problem.");
            }
        };

        InvocationResult result = run(modelClient, catalog, runtime(config -> { }), events::add);

        assertRuntimeSucceeded(result);
        assertEquals(List.of(1L, 2L, 3L, 4L, 5L, 6L), events.stream()
                .map(AgentRuntimeEvent::getEventSequence)
                .toList());
        assertEquals(List.of("No ", "active problem."), events.stream()
                .filter(event -> event.getType() == AgentRuntimeEventType.ITEM_DELTA)
                .map(AgentRuntimeEvent::getDelta)
                .toList());
        assertEquals(List.of(0, 1), events.stream()
                .filter(event -> event.getType() == AgentRuntimeEventType.ITEM_DELTA)
                .map(AgentRuntimeEvent::getDeltaIndex)
                .toList());
        List<String> assistantItemIds = events.stream()
                .filter(event -> event.getItemKind() == AgentRuntimeItemKind.ASSISTANT_MESSAGE)
                .map(AgentRuntimeEvent::getItemId)
                .distinct()
                .toList();
        assertEquals(1, assistantItemIds.size());
        assertTrue(assistantItemIds.get(0).startsWith("msg_"));
        List<AgentRuntimeEventType> eventTypes = events.stream().map(AgentRuntimeEvent::getType).toList();
        assertTrue(eventTypes.indexOf(AgentRuntimeEventType.ITEM_DELTA)
                < eventTypes.lastIndexOf(AgentRuntimeEventType.ITEM_COMPLETED));
        assertTrue(eventTypes.indexOf(AgentRuntimeEventType.ITEM_DELTA)
                < eventTypes.indexOf(AgentRuntimeEventType.RUN_COMPLETED));
        assertTrue(events.stream()
                .anyMatch(event -> event.getType() == AgentRuntimeEventType.ITEM_COMPLETED
                        && event.getItemKind() == AgentRuntimeItemKind.ASSISTANT_MESSAGE));
    }

    @Test
    void toolCallAssistantTextShouldNotPublishAssistantMessageWithoutStartedStream() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        List<AgentRuntimeEvent> events = new ArrayList<>();
        QueueModelClient modelClient = new QueueModelClient(List.of(
                toolResponseWithAssistantText("needs tools", AgentRuntimeToolCall.builder()
                        .toolCallId("call-tool-turn")
                        .toolName("monitor.get")
                        .arguments(Map.of("pageSize", 1))
                        .build()),
                finalResponse("The monitor is healthy.")));

        InvocationResult result = run(modelClient, catalog, runtime(config -> { }), events::add);

        assertRuntimeSucceeded(result);
        AgentRuntimeEvent firstItemStarted = events.stream()
                .filter(event -> event.getType() == AgentRuntimeEventType.ITEM_STARTED)
                .findFirst()
                .orElseThrow();
        assertEquals(AgentRuntimeItemKind.TOOL_CALL, firstItemStarted.getItemKind());
    }

    @Test
    void streamedToolCallShouldCompleteAssistantMessageWhenAssistantTextIsBlank() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        List<AgentRuntimeEvent> events = new ArrayList<>();
        AgentRuntimeToolCall toolCall = AgentRuntimeToolCall.builder()
                .toolCallId("call-streamed")
                .toolName("monitor.get")
                .arguments(Map.of("pageSize", 1))
                .build();
        List<AgentRuntimeModelRequest> requests = new ArrayList<>();
        AgentRuntimeModelClient modelClient = new AgentRuntimeModelClient() {

            private int requestCount;

            @Override
            public AgentRuntimeModelResponse stream(AgentRuntimeModelRequest request, AgentRuntimeControl control,
                                                    java.util.function.Consumer<String> textDeltaConsumer) {
                requests.add(request);
                requestCount++;
                if (requestCount == 1) {
                    textDeltaConsumer.accept("Checking ");
                    return toolResponseWithAssistantText(" ", toolCall);
                }
                return finalResponse("The monitor is healthy.");
            }
        };

        InvocationResult result = run(modelClient, catalog, runtime(config -> { }), events::add);

        assertRuntimeSucceeded(result);
        AgentRuntimeEvent assistantDelta = events.stream()
                .filter(event -> event.getType() == AgentRuntimeEventType.ITEM_DELTA)
                .filter(event -> event.getItemKind() == AgentRuntimeItemKind.ASSISTANT_MESSAGE)
                .filter(event -> "Checking ".equals(event.getDelta()))
                .findFirst()
                .orElseThrow();
        AgentRuntimeEvent assistantCompleted = events.stream()
                .filter(event -> event.getType() == AgentRuntimeEventType.ITEM_COMPLETED)
                .filter(event -> assistantDelta.getItemId().equals(event.getItemId()))
                .findFirst()
                .orElseThrow();
        assertEquals(List.of(AgentRuntimeEventType.ITEM_STARTED, AgentRuntimeEventType.ITEM_DELTA,
                        AgentRuntimeEventType.ITEM_COMPLETED),
                events.stream()
                        .filter(event -> assistantCompleted.getItemId().equals(event.getItemId()))
                        .map(AgentRuntimeEvent::getType)
                        .toList());
        AgentRuntimeEvent toolStarted = events.stream()
                .filter(event -> event.getType() == AgentRuntimeEventType.ITEM_STARTED)
                .filter(event -> event.getItemKind() == AgentRuntimeItemKind.TOOL_CALL)
                .findFirst()
                .orElseThrow();
        assertTrue(events.indexOf(assistantCompleted) < events.indexOf(toolStarted));
        assertEquals("", requests.get(1).getChatHistory().get(1).text());
    }

    @Test
    void modelRequestShouldCarryStructuredHistoryFromContext() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        QueueModelClient modelClient = new QueueModelClient(List.of(finalResponse("No active problem.")));
        TranscriptMessage historyMessage = chatMessage("user", "previous question");

        InvocationResult result = run(modelClient, catalog, runtime(config -> { }, List.of(historyMessage)));

        assertRuntimeSucceeded(result);
        assertEquals(1, modelClient.requests.size());
        assertEquals(2, modelClient.requests.get(0).getChatHistory().size());
        TranscriptMessage forwardedHistoryMessage = modelClient.requests.get(0).getChatHistory().get(0);
        assertEquals(historyMessage.getRole(), forwardedHistoryMessage.getRole());
        assertEquals(historyMessage.text(), forwardedHistoryMessage.text());
        TranscriptMessage currentUserMessage = modelClient.requests.get(0).getChatHistory().get(1);
        assertEquals(TranscriptMessage.TranscriptRole.USER, currentUserMessage.getRole());
        assertEquals("diagnose monitor", currentUserMessage.text());
    }

    @Test
    void approvalResumeShouldReplayHistoryWithoutAppendingCurrentUserInput() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        QueueModelClient modelClient = new QueueModelClient(List.of(finalResponse("Resume completed.")));
        TranscriptMessage historyMessage = chatMessage("user", "previous approved request");

        InvocationResult result = run(modelClient, catalog, approvalResumeRuntime(List.of(historyMessage)));

        assertRuntimeSucceeded(result);
        assertEquals(1, modelClient.requests.size());
        assertEquals(1, modelClient.requests.get(0).getChatHistory().size());
        TranscriptMessage replayedMessage = modelClient.requests.get(0).getChatHistory().get(0);
        assertEquals(historyMessage.getRole(), replayedMessage.getRole());
        assertEquals(historyMessage.text(), replayedMessage.text());
    }

    @Test
    void knownReadOnlyToolShouldExecuteThroughCatalogOnceAndReturnFinalAnswer() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        catalog.results.add(AgentToolExecutionResult.builder()
                .toolCallId("agc-loop")
                .toolName("monitor.get")
                .status(AgentToolStatus.SUCCEEDED)
                .decision(AgentPolicyDecision.ALLOW)
                .risk(AgentToolRisk.READ)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output("monitor ok token=tool-secret " + "x".repeat(80))
                .build());
        QueueModelClient modelClient = new QueueModelClient(List.of(
                toolResponse(AgentRuntimeToolCall.builder()
                        .toolCallId("call-1")
                        .toolName("monitor.get")
                        .arguments(modelArguments())
                        .build()),
                finalResponse("The monitor is healthy.")));
        RuntimeFixture runtime = runtime(config -> { });
        AgentRuntimeContext context = runtime.context();

        InvocationResult result = run(modelClient, catalog, runtime);

        assertRuntimeSucceeded(result);
        assertEquals("The monitor is healthy.", result.getResponse());
        assertEquals(1, catalog.executeCount);
        assertEquals(context.getSessionUid(), catalog.lastRequest.getSessionUid());
        assertEquals(context.getRunId(), catalog.lastRequest.getRunId());
        assertEquals(context.getRunUid(), catalog.lastRequest.getRunUid());
        assertEquals(context.getRunSessionId(), catalog.lastRequest.getRunSessionId());
        assertSame(context.getActor(), catalog.lastRequest.getActor());
        assertEquals("monitor.get", catalog.lastRequest.getToolName());
        assertEquals(modelArguments(), catalog.lastRequest.getArguments());
        AgentRuntimeModelRequest secondRequest = modelClient.requests.get(1);
        String runtimeContext = runtimeContext(secondRequest.getPrompt());
        assertTrue(runtimeContext.contains("Current time: 2026-04-19T00:00:00Z"));
        assertFalse(runtimeContext.contains("Run: uid=run-context"));
        assertFalse(runtimeContext.contains("run-context"));
        assertFalse(runtimeContext.contains("session-context"));
        assertFalse(runtimeContext.contains("trace-loop"));
        assertFalse(runtimeContext.contains("content="));
        assertEquals(3, secondRequest.getChatHistory().size());
        TranscriptMessage currentUserMessage = secondRequest.getChatHistory().get(0);
        assertEquals(TranscriptMessage.TranscriptRole.USER, currentUserMessage.getRole());
        assertEquals("diagnose monitor", currentUserMessage.text());
        TranscriptMessage assistantToolCall = secondRequest.getChatHistory().get(1);
        assertEquals(TranscriptMessage.TranscriptRole.ASSISTANT, assistantToolCall.getRole());
        assertEquals("monitor.get", assistantToolCall.toolCalls().get(0).getName());
        assertEquals(modelArguments(), assistantToolCall.toolCalls().get(0).getInput());
        TranscriptMessage toolResult = secondRequest.getChatHistory().get(2);
        assertEquals(TranscriptMessage.TranscriptRole.TOOL_RESULT, toolResult.getRole());
        assertEquals("agc-loop", toolResult.getToolCallId());
        assertEquals("monitor ok token=tool-secret " + "x".repeat(80), toolResult.text());
    }

    @Test
    void oversizedHistoryShouldUseModelCompactionAndRecordCheckpoint() {
        List<TranscriptMessage> history = List.of(
                sequenced(1L, TranscriptMessage.userText("older request " + "alert ".repeat(500))),
                sequenced(2L, TranscriptMessage.assistantText("older answer " + "diagnosis ".repeat(500))),
                sequenced(3L, TranscriptMessage.userText("middle request " + "metric ".repeat(500))),
                sequenced(4L, TranscriptMessage.assistantText("middle answer " + "evidence ".repeat(500))),
                sequenced(5L, TranscriptMessage.userText("recent request inspect monitor 42")),
                sequenced(6L, TranscriptMessage.assistantText("recent answer")));
        RuntimeFixture runtime = runtime(config -> {
            config.setHistoryContextTokenBudget(1800);
            config.setHistoryReserveTokens(200);
            config.setHistoryRecentTokenBudget(300);
            config.setHistoryCompactionSummaryLimit(500);
        }, history);
        QueueModelClient modelClient = new QueueModelClient(List.of(
                finalResponse("## Goal\nDiagnose monitor 42 using prior alert evidence."),
                finalResponse("Diagnosis complete.")));
        List<AgentRuntimeHistoryWindow.CompactionCheckpoint> checkpoints = new ArrayList<>();
        AgentRuntimeTranscriptSink transcriptSink = new AgentRuntimeTranscriptSink() {
            @Override
            public Long recordMessage(TranscriptMessage message) {
                // This test observes only compaction checkpoints.
                return null;
            }

            @Override
            public void recordCompactionCheckpoint(AgentRuntimeHistoryWindow.CompactionCheckpoint checkpoint) {
                checkpoints.add(checkpoint);
            }

        };
        List<AgentRuntimeEvent> events = new ArrayList<>();
        try (AgentRuntimeControl control = AgentRuntimeControl.forContext(runtime.context(), CLOCK)) {
            loop(modelClient, new FakeToolCatalogService(List.of()), runtime.config())
                    .run(runtime.context(), control, events::add, transcriptSink);
        }

        assertNull(resultFromEvents(events).getError());
        assertEquals(2, modelClient.requests.size());
        assertTrue(modelClient.requests.get(0).getAvailableTools().isEmpty());
        assertTrue(modelClient.requests.get(0).getPrompt().getInstructions().contains("compact"));
        TranscriptMessage summary = modelClient.requests.get(1).getChatHistory().get(0);
        assertEquals(TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY, summary.getRole());
        assertEquals("## Goal\nDiagnose monitor 42 using prior alert evidence.", summary.text());
        assertEquals(1, checkpoints.size());
        assertEquals(4L, checkpoints.get(0).summarizedThroughSessionSequence());
        assertEquals(5L, checkpoints.get(0).firstKeptSessionSequence());
    }

    @Test
    void toolEventsShouldKeepModelCallIdAsStableItemId() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        List<AgentRuntimeEvent> events = new ArrayList<>();
        QueueModelClient modelClient = new QueueModelClient(List.of(
                toolResponse(AgentRuntimeToolCall.builder()
                        .toolCallId("call-model")
                        .toolName("monitor.get")
                        .arguments(Map.of("pageSize", 1))
                        .build()),
                finalResponse("The monitor is healthy.")));

        InvocationResult result = run(modelClient, catalog, runtime(config -> { }), events::add);

        assertRuntimeSucceeded(result);
        List<AgentRuntimeEvent> toolEvents = events.stream()
                .filter(event -> event.getItemKind() == AgentRuntimeItemKind.TOOL_CALL)
                .toList();
        assertEquals(2, toolEvents.size());
        assertEquals(toolEvents.get(0).getItemId(), toolEvents.get(1).getItemId());
        assertEquals("call-model", toolEvents.get(0).getItemId());
    }

    @Test
    void waitingApprovalToolResultShouldResumeAfterApprovalSignal() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(changeMonitorTool()));
        catalog.results.add(AgentToolExecutionResult.builder()
                .toolCallId("agc-wait")
                .approvalId("agp-wait")
                .toolName("monitor.get")
                .status(AgentToolStatus.WAITING_APPROVAL)
                .decision(AgentPolicyDecision.REQUIRE_APPROVAL)
                .risk(AgentToolRisk.CHANGE)
                .approvalStatus(AgentApprovalStatus.PENDING)
                .output("{\"status\":\"WAITING_APPROVAL\"}")
                .build());
        catalog.results.add(successResult("monitor.get", "approved ok"));
        QueueModelClient modelClient = new QueueModelClient(List.of(
                toolResponse(AgentRuntimeToolCall.builder()
                        .toolCallId("call-approval")
                        .toolName("monitor.get")
                        .arguments(Map.of("pageSize", 1))
                        .build()),
                finalResponse("Tool completed after approval.")));
        RuntimeFixture runtime = runtime(config -> { });
        AgentRuntimeApprovalRegistry approvalRegistry = new AgentRuntimeApprovalRegistry();
        List<AgentRuntimeEvent> events = new ArrayList<>();
        AgentRuntimeLoop.EventPublisher publisher = event -> {
            events.add(event);
            if (event.getType() == AgentRuntimeEventType.REQUESTED_ACTION) {
                assertTrue(approvalRegistry.complete(event.getApprovalId(), AgentApprovalDecision.APPROVED));
            }
        };

        try (AgentRuntimeControl control = AgentRuntimeControl.forContext(runtime.context(), CLOCK)) {
            new AgentRuntimeLoop(
                    runtime.config(),
                    modelClient,
                    new AgentToolBridge(catalog, CLOCK,
                            new AgentRuntimeBlockingTaskRunner(), catalog.orchestrator, approvalRegistry),
                    CLOCK)
                    .run(runtime.context(), control, publisher, AgentRuntimeTranscriptSink.noop());
        }
        InvocationResult result = resultFromEvents(events);

        assertRuntimeSucceeded(result);
        assertEquals("Tool completed after approval.", result.getResponse());
        assertEquals(2, catalog.executeCount);
        assertEquals(2, modelClient.requests.size());
        assertTrue(events.stream().anyMatch(event -> event.getType() == AgentRuntimeEventType.REQUESTED_ACTION
                && "agp-wait".equals(event.getApprovalId())));
        assertTrue(events.stream().anyMatch(event -> event.getType() == AgentRuntimeEventType.REQUEST_COMPLETED
                && "agp-wait".equals(event.getApprovalId())
                && AgentRuntimeEvent.EventStatus.APPROVED == event.getStatus()));
        assertEquals(List.of(AgentRuntimeEventType.ITEM_STARTED, AgentRuntimeEventType.REQUESTED_ACTION,
                        AgentRuntimeEventType.REQUEST_COMPLETED, AgentRuntimeEventType.ITEM_COMPLETED),
                events.stream()
                        .filter(event -> "call-approval".equals(event.getItemId()))
                        .map(AgentRuntimeEvent::getType)
                        .toList());
        AgentRuntimeEvent toolStarted = events.stream()
                .filter(event -> event.getType() == AgentRuntimeEventType.ITEM_STARTED)
                .filter(event -> "call-approval".equals(event.getItemId()))
                .findFirst()
                .orElseThrow();
        assertEquals(AgentRuntimeEvent.EventStatus.IN_PROGRESS, toolStarted.getStatus());
        TranscriptMessage toolResult = modelClient.requests.get(1).getChatHistory().get(2);
        assertEquals(TranscriptMessage.TranscriptRole.TOOL_RESULT, toolResult.getRole());
        assertEquals("approved ok", toolResult.text());
    }

    @Test
    void waitingApprovalToolResultShouldReturnDeniedAfterRejectionSignal() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(changeMonitorTool()));
        catalog.results.add(AgentToolExecutionResult.builder()
                .toolCallId("agc-reject")
                .approvalId("agp-reject")
                .toolName("monitor.get")
                .status(AgentToolStatus.WAITING_APPROVAL)
                .decision(AgentPolicyDecision.REQUIRE_APPROVAL)
                .risk(AgentToolRisk.CHANGE)
                .approvalStatus(AgentApprovalStatus.PENDING)
                .build());
        QueueModelClient modelClient = new QueueModelClient(List.of(
                toolResponse(AgentRuntimeToolCall.builder()
                        .toolCallId("call-reject")
                        .toolName("monitor.get")
                        .arguments(Map.of("pageSize", 1))
                        .build()),
                finalResponse("Tool was not executed.")));
        RuntimeFixture runtime = runtime(config -> { });
        AgentRuntimeApprovalRegistry approvalRegistry = new AgentRuntimeApprovalRegistry();
        List<AgentRuntimeEvent> events = new ArrayList<>();
        AgentRuntimeLoop.EventPublisher publisher = event -> {
            events.add(event);
            if (event.getType() == AgentRuntimeEventType.REQUESTED_ACTION) {
                assertTrue(approvalRegistry.complete(event.getApprovalId(), AgentApprovalDecision.REJECTED));
            }
        };

        try (AgentRuntimeControl control = AgentRuntimeControl.forContext(runtime.context(), CLOCK)) {
            new AgentRuntimeLoop(
                    runtime.config(),
                    modelClient,
                    new AgentToolBridge(catalog, CLOCK,
                            new AgentRuntimeBlockingTaskRunner(), catalog.orchestrator, approvalRegistry),
                    CLOCK)
                    .run(runtime.context(), control, publisher, AgentRuntimeTranscriptSink.noop());
        }
        InvocationResult result = resultFromEvents(events);

        assertRuntimeSucceeded(result);
        assertEquals(1, catalog.executeCount);
        assertTrue(events.stream().anyMatch(event -> event.getType() == AgentRuntimeEventType.REQUEST_COMPLETED
                && "agp-reject".equals(event.getApprovalId())
                && AgentRuntimeEvent.EventStatus.REJECTED == event.getStatus()));
        AgentRuntimeEvent toolCompleted = events.stream()
                .filter(event -> event.getType() == AgentRuntimeEventType.ITEM_COMPLETED)
                .filter(event -> "call-reject".equals(event.getItemId()))
                .findFirst()
                .orElseThrow();
        assertEquals(AgentRuntimeEvent.EventStatus.DECLINED, toolCompleted.getStatus());
        TranscriptMessage toolResult = modelClient.requests.get(1).getChatHistory().get(2);
        assertEquals("Tool execution rejected by approval decision.", toolResult.text());
    }

    @Test
    void unknownToolShouldReturnUnavailableObservationWithoutExecutingCatalog() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        QueueModelClient modelClient = new QueueModelClient(List.of(
                toolResponse(AgentRuntimeToolCall.builder()
                        .toolCallId("call-unknown")
                        .toolName("delete_everything")
                        .arguments(Map.of("force", true))
                        .build()),
                finalResponse("That tool is not available.")));

        InvocationResult result = run(modelClient, catalog, runtime(config -> { }));

        assertRuntimeSucceeded(result);
        assertEquals(0, catalog.executeCount);
        TranscriptMessage toolResult = modelClient.requests.get(1).getChatHistory().get(2);
        assertEquals(TranscriptMessage.TranscriptRole.TOOL_RESULT, toolResult.getRole());
        assertEquals("delete_everything", toolResult.getToolName());
        assertEquals("call-unknown", toolResult.getToolCallId());
    }

    @Test
    void searchShouldExposeOnDemandToolForDirectInvocationInFollowingRequests() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(searchTool(), onDemandJdbcTool()));
        catalog.results.add(successResult("tool.search", "{\"count\":1}"));
        catalog.results.add(successResult("jdbc.query", "[{\"value\":1}]"));
        QueueModelClient modelClient = new QueueModelClient(List.of(
            toolResponse(AgentRuntimeToolCall.builder()
                .toolCallId("call-search")
                .toolName("tool.search")
                .arguments(Map.of("namespace", "jdbc"))
                .build()),
            toolResponse(AgentRuntimeToolCall.builder()
                .toolCallId("call-query")
                .toolName("jdbc.query")
                .arguments(Map.of("monitorId", 99L, "sql", "select 1", "columns", List.of("value")))
                .build()),
            finalResponse("The query returned 1.")));

        InvocationResult result = run(modelClient, catalog, runtime(config -> { }));

        assertRuntimeSucceeded(result);
        assertEquals(List.of("tool.search"), modelClient.requests.get(0).getAvailableTools().stream()
            .map(AgentToolDescriptor::getName).toList());
        assertEquals(List.of("tool.search", "jdbc.query"), modelClient.requests.get(1).getAvailableTools().stream()
            .map(AgentToolDescriptor::getName).toList());
        assertEquals(List.of("tool.search", "jdbc.query"), modelClient.requests.get(2).getAvailableTools().stream()
            .map(AgentToolDescriptor::getName).toList());
        assertEquals(2, catalog.executeCount);
        assertEquals("jdbc.query", catalog.lastRequest.getToolName());
        assertEquals(99L, catalog.lastRequest.getArguments().get("monitorId"));
    }

    @Test
    void failedSearchShouldNotExposeOnDemandTools() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(searchTool(), onDemandJdbcTool()));
        catalog.results.add(AgentToolExecutionResult.builder()
            .toolCallId("agc-search-failed")
            .toolName("tool.search")
            .status(AgentToolStatus.FAILED)
            .decision(AgentPolicyDecision.ALLOW)
            .risk(AgentToolRisk.READ)
            .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
            .errorMessage("registry unavailable")
            .build());
        QueueModelClient modelClient = new QueueModelClient(List.of(
            toolResponse(AgentRuntimeToolCall.builder()
                .toolCallId("call-search-failed")
                .toolName("tool.search")
                .arguments(Map.of("namespace", "jdbc"))
                .build()),
            finalResponse("Search failed.")));

        InvocationResult result = run(modelClient, catalog, runtime(config -> { }));

        assertRuntimeSucceeded(result);
        assertEquals(List.of("tool.search"), modelClient.requests.get(1).getAvailableTools().stream()
            .map(AgentToolDescriptor::getName).toList());
    }

    @Test
    void successfulSearchHistoryShouldRestoreOnDemandTools() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(searchTool(), onDemandJdbcTool()));
        QueueModelClient modelClient = new QueueModelClient(List.of(finalResponse("Continue with JDBC.")));
        List<TranscriptMessage> history = List.of(
            TranscriptMessage.assistantToolCalls("", List.of(TranscriptContent.toolCall(
                "call-search-history", "tool.search", Map.of("namespace", "jdbc")))),
            TranscriptMessage.toolResult("call-search-history", "tool.search",
                "{\"count\":1}", null));

        InvocationResult result = run(modelClient, catalog, runtime(config -> { }, history));

        assertRuntimeSucceeded(result);
        assertEquals(List.of("tool.search", "jdbc.query"), modelClient.requests.getFirst().getAvailableTools().stream()
            .map(AgentToolDescriptor::getName).toList());
    }

    @Test
    void failedSearchHistoryShouldNotRestoreOnDemandTools() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(searchTool(), onDemandJdbcTool()));
        QueueModelClient modelClient = new QueueModelClient(List.of(finalResponse("Search again.")));
        List<TranscriptMessage> history = List.of(
            TranscriptMessage.assistantToolCalls("", List.of(TranscriptContent.toolCall(
                "call-search-history", "tool.search", Map.of("namespace", "jdbc")))),
            TranscriptMessage.toolResult("call-search-history", "tool.search", "",
                "registry unavailable"));

        InvocationResult result = run(modelClient, catalog, runtime(config -> { }, history));

        assertRuntimeSucceeded(result);
        assertEquals(List.of("tool.search"), modelClient.requests.getFirst().getAvailableTools().stream()
            .map(AgentToolDescriptor::getName).toList());
    }

    @Test
    void toolResultShouldExposeFailureMessage() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        catalog.results.add(AgentToolExecutionResult.builder()
                .toolCallId("agc-failed")
                .toolName("monitor.get")
                .status(AgentToolStatus.FAILED)
                .decision(AgentPolicyDecision.ALLOW)
                .risk(AgentToolRisk.READ)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .errorMessage("node result missing")
                .build());
        AgentToolBridge bridge = new AgentToolBridge(catalog, CLOCK,
                new AgentRuntimeBlockingTaskRunner(), catalog.orchestrator, new AgentRuntimeApprovalRegistry());
        RuntimeFixture runtime = runtime(config -> { });

        AgentToolExecutionResult result;
        try (AgentRuntimeControl control = AgentRuntimeControl.forContext(runtime.context(), CLOCK)) {
            result = bridge.execute(runtime.context(), runtime.config(),
                    AgentRuntimeToolCall.builder()
                        .toolCallId("call-monitor")
                            .toolName("monitor.get")
                            .arguments(Map.of("monitorId", 99L))
                            .build(),
                    control,
                    AgentToolBridge.ExecutionListener.noop());
        }

        assertEquals("node result missing", result.getOutput());
    }

    @Test
    void failedToolResultShouldRecordErrorForNextModelRequest() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        catalog.results.add(AgentToolExecutionResult.builder()
            .toolCallId("agc-failed-history")
            .toolName("monitor.get")
            .status(AgentToolStatus.FAILED)
            .decision(AgentPolicyDecision.ALLOW)
            .risk(AgentToolRisk.READ)
            .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
            .errorMessage("monitor connection failed")
            .build());
        QueueModelClient modelClient = new QueueModelClient(List.of(
            toolResponse(AgentRuntimeToolCall.builder()
                .toolCallId("call-failed-history")
                .toolName("monitor.get")
                .arguments(Map.of("monitorId", 99L))
                .build()),
            finalResponse("Failure analyzed.")));

        InvocationResult result = run(modelClient, catalog, runtime(config -> { }));

        assertRuntimeSucceeded(result);
        TranscriptMessage toolResult = modelClient.requests.get(1).getChatHistory().get(2);
        assertEquals("monitor connection failed", toolResult.getErrorMessage());
    }

    @Test
    void maxToolCallsShouldStopBeforeExecutingAdditionalToolCalls() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        catalog.results.add(successResult("monitor.get", "first"));
        List<AgentRuntimeEvent> events = new ArrayList<>();
        QueueModelClient modelClient = new QueueModelClient(List.of(
                toolResponse(
                        AgentRuntimeToolCall.builder().toolCallId("call-1")
                                .toolName("monitor.get").arguments(Map.of("pageSize", 1)).build(),
                        AgentRuntimeToolCall.builder().toolCallId("call-2")
                                .toolName("monitor.get").arguments(Map.of("pageSize", 2)).build())));

        InvocationResult result = run(modelClient, catalog, runtime(config -> config.setMaxToolCalls(1)), events::add);

        assertRuntimeFailed(result);
        assertEquals(1, catalog.executeCount);
        assertEquals(1, modelClient.requests.size());
        assertEquals(1, events.stream()
                .filter(event -> event.getType() == AgentRuntimeEventType.ITEM_STARTED)
                .filter(event -> event.getItemKind() == AgentRuntimeItemKind.TOOL_CALL)
                .count());
    }

    @Test
    void maxStepsShouldStopBeforeRequestingAnotherModelRound() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        catalog.results.add(successResult("monitor.get", "first"));
        QueueModelClient modelClient = new QueueModelClient(List.of(
                toolResponse(AgentRuntimeToolCall.builder()
                        .toolCallId("call-step-limit")
                        .toolName("monitor.get")
                        .arguments(Map.of("pageSize", 1))
                        .build())));

        InvocationResult result = run(modelClient, catalog, runtime(config -> config.setMaxSteps(1)));

        assertRuntimeFailed(result);
        assertEquals(1, catalog.executeCount);
        assertEquals(1, modelClient.requests.size());
    }

    @Test
    void timeoutSignalShouldStopBeforeModelOrToolExecution() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        QueueModelClient modelClient = new QueueModelClient(List.of());

        RuntimeFixture runtime = runtime(config -> { });
        AgentRuntimeContext context = runtime.context();
        List<AgentRuntimeEvent> events = new ArrayList<>();
        try (AgentRuntimeControl control = AgentRuntimeControl.forContext(context, CLOCK)) {
            control.stop("timeout by test");
            loop(modelClient, catalog, runtime.config())
                    .run(context, control, events::add, AgentRuntimeTranscriptSink.noop());
        }
        InvocationResult result = resultFromEvents(events);

        assertRuntimeFailed(result);
        assertEquals(0, modelClient.requests.size());
        assertEquals(0, catalog.executeCount);
    }

    @Test
    void cancelledControlShouldStopBeforeModelExecution() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        QueueModelClient modelClient = new QueueModelClient(List.of());
        RuntimeFixture runtime = runtime(config -> { });
        AgentRuntimeContext context = runtime.context();
        List<AgentRuntimeEvent> events = new ArrayList<>();
        try (AgentRuntimeControl control = AgentRuntimeControl.forContext(context, CLOCK)) {
            control.stop("cancelled by test");
            loop(modelClient, catalog, runtime.config())
                    .run(context, control, events::add, AgentRuntimeTranscriptSink.noop());
        }
        InvocationResult result = resultFromEvents(events);

        assertRuntimeFailed(result);
        assertEquals("cancelled by test", result.getError().getMessage());
        assertEquals(0, modelClient.requests.size());
        assertEquals(0, catalog.executeCount);
    }

    @Test
    void blockingModelShouldStopWhenModelRequestTimeoutExpires() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        BlockingModelClient modelClient = new BlockingModelClient(Duration.ofMillis(250));

        InvocationResult result = run(modelClient, catalog,
                runtime(config -> config.setModelRequestTimeout(Duration.ofMillis(25))));

        assertRuntimeFailed(result);
        assertTrue(result.getError().getMessage().contains("model request timed out."));
        assertTrue(modelClient.requests.size() <= 1);
        assertEquals(0, catalog.executeCount);
    }

    @Test
    void modelRequestTimeoutShouldNotActAsRuntimeDeadline() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        catalog.results.add(successResult("monitor.get", "tool output"));
        QueueModelClient modelClient = new QueueModelClient(List.of(
                toolResponse(AgentRuntimeToolCall.builder()
                        .toolCallId("call-slow-round")
                        .toolName("monitor.get")
                        .arguments(Map.of("pageSize", 1))
                        .build()),
                finalResponse("Completed after multiple model requests.")),
                Duration.ofMillis(90));

        InvocationResult result = run(modelClient, catalog,
                runtime(config -> config.setModelRequestTimeout(Duration.ofMillis(150))));

        assertRuntimeSucceeded(result);
        assertEquals("Completed after multiple model requests.", result.getResponse());
        assertEquals(2, modelClient.requests.size());
        assertEquals(1, catalog.executeCount);
    }

    @Test
    void blockingToolShouldReturnTimeoutObservationAndContinue() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        catalog.delay = Duration.ofMillis(200);
        QueueModelClient modelClient = new QueueModelClient(List.of(
                toolResponse(AgentRuntimeToolCall.builder()
                        .toolCallId("call-slow")
                        .toolName("monitor.get")
                        .arguments(Map.of("pageSize", 1))
                        .build()),
                finalResponse("Tool timed out.")));

        InvocationResult result = run(modelClient, catalog,
                runtime(config -> config.setToolTimeout(Duration.ofMillis(20))));

        assertRuntimeSucceeded(result);
        assertEquals("Tool timed out.", result.getResponse());
        assertEquals(1, catalog.executeCount);
        assertEquals(2, modelClient.requests.size());
        TranscriptMessage toolResult = modelClient.requests.get(1).getChatHistory().get(2);
        assertEquals(TranscriptMessage.TranscriptRole.TOOL_RESULT, toolResult.getRole());
        assertEquals("monitor.get", toolResult.getToolName());
        assertEquals("call-slow", toolResult.getToolCallId());
    }

    @Test
    void transientModelErrorShouldRetryThenSucceed() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        QueueModelClient modelClient = new QueueModelClient(List.of(
                transientFailure("temporarily unavailable"),
                finalResponse("Recovered.")));

        InvocationResult result = run(modelClient, catalog, runtime(config -> {
            config.getRetry().setMaxModelRetries(1);
            config.getRetry().setInitialBackoff(Duration.ofMillis(1));
        }));

        assertRuntimeSucceeded(result);
        assertEquals("Recovered.", result.getResponse());
        assertEquals(2, modelClient.requests.size());
        assertEquals(0, catalog.executeCount);
    }

    @Test
    void retryAfterToolObservationShouldNotReplayExecutedToolCall() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        catalog.results.add(successResult("monitor.get", "tool output"));
        QueueModelClient modelClient = new QueueModelClient(List.of(
                toolResponse(AgentRuntimeToolCall.builder()
                        .toolCallId("call-retry")
                        .toolName("monitor.get")
                        .arguments(Map.of("pageSize", 1))
                        .build()),
                transientFailure("second round failed once"),
                finalResponse("Tool result handled.")));

        InvocationResult result = run(modelClient, catalog, runtime(config -> {
            config.getRetry().setMaxModelRetries(1);
            config.getRetry().setInitialBackoff(Duration.ofMillis(1));
        }));

        assertRuntimeSucceeded(result);
        assertEquals(1, catalog.executeCount);
        assertEquals(3, modelClient.requests.size());
        assertEquals(3, modelClient.requests.get(1).getChatHistory().size());
        assertEquals(3, modelClient.requests.get(2).getChatHistory().size());
        assertEquals(TranscriptMessage.TranscriptRole.USER,
            modelClient.requests.get(1).getChatHistory().get(0).getRole());
        assertEquals(TranscriptMessage.TranscriptRole.ASSISTANT,
            modelClient.requests.get(1).getChatHistory().get(1).getRole());
        assertEquals(TranscriptMessage.TranscriptRole.TOOL_RESULT,
            modelClient.requests.get(1).getChatHistory().get(2).getRole());
    }

    @Test
    void retryExhaustedShouldReturnModelError() {
        FakeToolCatalogService catalog = new FakeToolCatalogService(List.of(queryTool()));
        QueueModelClient modelClient = new QueueModelClient(List.of(
                transientFailure("first failure"),
                transientFailure("second failure")));

        InvocationResult result = run(modelClient, catalog, runtime(config -> {
            config.getRetry().setMaxModelRetries(1);
            config.getRetry().setInitialBackoff(Duration.ofMillis(1));
        }));

        assertRuntimeFailed(result);
        assertEquals("Runtime model returned no response.", result.getError().getMessage());
        assertEquals(2, modelClient.requests.size());
        assertEquals(0, catalog.executeCount);
    }

    private InvocationResult run(AgentRuntimeModelClient modelClient, FakeToolCatalogService catalog,
                                   RuntimeFixture runtime) {
        return run(modelClient, catalog, runtime, AgentRuntimeLoop.EventPublisher.noop());
    }

    private InvocationResult run(AgentRuntimeModelClient modelClient, FakeToolCatalogService catalog,
                                   RuntimeFixture runtime,
                                   AgentRuntimeLoop.EventPublisher eventPublisher) {
        AgentRuntimeContext context = runtime.context();
        List<AgentRuntimeEvent> events = new ArrayList<>();
        AgentRuntimeLoop.EventPublisher safePublisher = eventPublisher == null
                ? AgentRuntimeLoop.EventPublisher.noop()
                : eventPublisher;
        AgentRuntimeLoop.EventPublisher collectingPublisher = event -> {
            events.add(event);
            safePublisher.publish(event);
        };
        try (AgentRuntimeControl control = AgentRuntimeControl.forContext(context, CLOCK)) {
            loop(modelClient, catalog, runtime.config())
                    .run(context, control, collectingPublisher, AgentRuntimeTranscriptSink.noop());
        }
        return resultFromEvents(events);
    }

    private InvocationResult resultFromEvents(List<AgentRuntimeEvent> events) {
        AgentRuntimeEvent terminalEvent = terminalEvent(events);
        if (terminalEvent == null) {
            fail("Runtime did not publish a terminal event.");
        }
        boolean error = terminalEvent.getType() == AgentRuntimeEventType.ERROR;
        String message = error ? terminalEvent.getErrorMessage() : finalAssistantText(events);
        return new InvocationResult(message, error ? new InvocationError(message) : null);
    }

    private String finalAssistantText(List<AgentRuntimeEvent> events) {
        String itemId = lastCompletedAssistantItemId(events);
        if (itemId == null || itemId.isBlank()) {
            return null;
        }
        StringBuilder text = new StringBuilder();
        for (AgentRuntimeEvent event : events) {
            if (event.getType() == AgentRuntimeEventType.ITEM_DELTA
                    && event.getItemKind() == AgentRuntimeItemKind.ASSISTANT_MESSAGE
                    && itemId.equals(event.getItemId())
                    && event.getDelta() != null) {
                text.append(event.getDelta());
            }
        }
        return text.length() == 0 ? null : text.toString();
    }

    private String lastCompletedAssistantItemId(List<AgentRuntimeEvent> events) {
        String itemId = null;
        for (AgentRuntimeEvent event : events) {
            if (event.getType() == AgentRuntimeEventType.ITEM_COMPLETED
                    && event.getItemKind() == AgentRuntimeItemKind.ASSISTANT_MESSAGE) {
                itemId = event.getItemId();
            }
        }
        return itemId;
    }

    private void assertRuntimeSucceeded(InvocationResult result) {
        assertNull(result.getError());
    }

    private void assertRuntimeFailed(InvocationResult result) {
        assertTrue(result.getError() != null);
    }

    private AgentRuntimeEvent terminalEvent(List<AgentRuntimeEvent> events) {
        for (int index = events.size() - 1; index >= 0; index--) {
            AgentRuntimeEvent event = events.get(index);
            if (event.getType() == AgentRuntimeEventType.RUN_COMPLETED
                    || event.getType() == AgentRuntimeEventType.ERROR) {
                return event;
            }
        }
        return null;
    }

    private AgentRuntimeLoop loop(AgentRuntimeModelClient modelClient, FakeToolCatalogService catalog,
                                  AgentRuntimeProperties config) {
        return new AgentRuntimeLoop(
                config,
                modelClient,
                new AgentToolBridge(catalog, CLOCK,
                        new AgentRuntimeBlockingTaskRunner(), catalog.orchestrator, new AgentRuntimeApprovalRegistry()),
                CLOCK);
    }

    private RuntimeFixture runtime(Consumer<AgentRuntimeProperties> customizer) {
        return runtime(customizer, List.of());
    }

    private RuntimeFixture runtime(Consumer<AgentRuntimeProperties> customizer,
                                   List<TranscriptMessage> chatHistory) {
        AgentRuntimeProperties config = new AgentRuntimeProperties();
        config.setModel("fake-model");
        customizer.accept(config);
        AgentRuntimeRequest request = AgentRuntimeRequest.builder()
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .session(AgentSession.builder().id(1L).sessionUid("session-context").build())
                .run(AgentRun.builder().id(2L).runUid("run-context").sessionId(1L)
                        .targetMonitorId(99L).build())
                .envelope(GatewayEnvelope.builder()
                        .channelId("web-ui")
                        .receivedAt(100L)
                        .actor(AgentActor.builder().type("user").id("alice").roles(List.of("user")).build())
                        .build())
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .userInput(UserInput.builder()
                        .conversationId("conversation-loop")
                        .message(Message.builder().text("diagnose monitor").build())
                        .build())
                .chatHistory(chatHistory)
                .build();
        AgentRuntimeContext context = new AgentRuntimeContextBuilder(CLOCK, () -> "trace-loop")
                .build(request, config);
        return new RuntimeFixture(context, config);
    }

    private RuntimeFixture approvalResumeRuntime(List<TranscriptMessage> chatHistory) {
        AgentRuntimeProperties config = new AgentRuntimeProperties();
        config.setModel("fake-model");
        AgentRuntimeRequest request = AgentRuntimeRequest.builder()
                .entryType(AgentRuntimeEntryType.ALERT_TRIGGER)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .session(AgentSession.builder().id(1L).sessionUid("session-context").build())
                .run(AgentRun.builder().id(2L).runUid("run-context").sessionId(1L)
                        .targetMonitorId(99L).build())
                .envelope(GatewayEnvelope.builder()
                        .channelId("alert")
                        .receivedAt(100L)
                        .actor(AgentActor.builder().type("user").id("alice").roles(List.of("user")).build())
                        .build())
                .userInput(UserInput.builder()
                        .conversationId("conversation-loop")
                        .message(Message.builder().text("resume approved tool").build())
                        .build())
                .chatHistory(chatHistory)
                .build();
        AgentRuntimeContext context = new AgentRuntimeContextBuilder(CLOCK, () -> "trace-loop")
                .build(request, config);
        return new RuntimeFixture(context, config);
    }

    private record RuntimeFixture(AgentRuntimeContext context, AgentRuntimeProperties config) {
    }

    private static AgentRuntimeModelResponse finalResponse(String answer) {
        return AgentRuntimeModelResponse.finalAnswer(answer,
                AgentRuntimeModelResponse.Usage.builder()
                        .promptTokens(4)
                        .completionTokens(3)
                        .totalTokens(7)
                        .build());
    }

    private static AgentRuntimeModelResponse toolResponse(AgentRuntimeToolCall... toolCalls) {
        return toolResponseWithAssistantText("needs tools", toolCalls);
    }

    private static AgentRuntimeModelResponse toolResponseWithAssistantText(String assistantText,
                                                                           AgentRuntimeToolCall... toolCalls) {
        return AgentRuntimeModelResponse.toolCalls(assistantText, List.of(toolCalls),
                AgentRuntimeModelResponse.Usage.builder()
                        .promptTokens(5)
                        .completionTokens(2)
                        .totalTokens(7)
                        .build());
    }

    private static AgentToolExecutionResult successResult(String toolName, String output) {
        return AgentToolExecutionResult.builder()
                .toolCallId("agc-" + toolName.replace('.', '-'))
                .toolName(toolName)
                .status(AgentToolStatus.SUCCEEDED)
                .decision(AgentPolicyDecision.ALLOW)
                .risk(AgentToolRisk.READ)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output(output)
                .build();
    }

    private static AgentToolDescriptor queryTool() {
        return AgentToolDescriptor.builder()
            .name("monitor.get")
            .description("Query monitors.")
            .inputSchema("{\"type\":\"object\"}")
            .risk(AgentToolRisk.READ)
            .namespace("monitor")
            .exposure(AgentToolExposure.MODEL_VISIBLE)
            .build();
    }

    private static AgentToolDescriptor changeMonitorTool() {
        return AgentToolDescriptor.builder()
                .name("monitor.get")
                .description("Change monitor state.")
                .inputSchema("{\"type\":\"object\"}")
                .risk(AgentToolRisk.CHANGE)
                .namespace("monitor")
                .exposure(AgentToolExposure.MODEL_VISIBLE)
                .build();
    }

    private static AgentToolDescriptor searchTool() {
        return AgentToolDescriptor.builder()
            .name("tool.search")
            .description("Search on-demand tools.")
            .inputSchema("{\"type\":\"object\"}")
            .risk(AgentToolRisk.READ)
            .namespace("tool")
            .exposure(AgentToolExposure.MODEL_VISIBLE)
            .build();
    }

    private static AgentToolDescriptor onDemandJdbcTool() {
        return AgentToolDescriptor.builder()
            .name("jdbc.query")
            .description("Execute a JDBC query.")
            .inputSchema("{\"type\":\"object\"}")
            .risk(AgentToolRisk.READ)
            .namespace("jdbc")
            .exposure(AgentToolExposure.MODEL_ON_DEMAND)
            .build();
    }

    private record InvocationResult(String response, InvocationError error) {

        private String getResponse() {
            return response;
        }

        private InvocationError getError() {
            return error;
        }
    }

    private record InvocationError(String message) {

        private String getMessage() {
            return message;
        }
    }

    private static Map<String, Object> modelArguments() {
        Map<String, Object> arguments = new LinkedHashMap<>();
        arguments.put("pageSize", 1);
        arguments.put("session", "model-session");
        arguments.put("sessionId", 99L);
        arguments.put("run", "model-run");
        arguments.put("runId", 88L);
        arguments.put("runUid", "model-run-uid");
        arguments.put("actor", "model-actor");
        arguments.put("actorId", "model-actor-id");
        arguments.put("target", "model-target");
        arguments.put("targetMonitorId", 77L);
        arguments.put("approvalStatus", "model-approved");
        return arguments;
    }

    private String runtimeContext(RuntimePrompt prompt) {
        return String.join(System.lineSeparator() + System.lineSeparator(), prompt.getBlocks().stream()
                .filter(block -> block.getFrame() == RuntimePrompt.Frame.RUNTIME)
                .map(RuntimePrompt.Block::getContent)
                .toList());
    }

    private static TranscriptMessage chatMessage(String role, String content) {
        return TranscriptMessage.builder()
                .role(TranscriptMessage.TranscriptRole.fromWireValue(role))
                .content(List.of(TranscriptContent.text(content)))
                .build();
    }

    private static TranscriptMessage sequenced(long sessionSequence, TranscriptMessage message) {
        return message.toBuilder().sessionSequence(sessionSequence).build();
    }

    private static AgentRuntimeModelException transientFailure(String message) {
        return new AgentRuntimeModelException(message, true);
    }

    private static final class QueueModelClient implements AgentRuntimeModelClient {

        private final Queue<Object> outcomes;
        private final List<AgentRuntimeModelRequest> requests = new ArrayList<>();
        private final Duration delay;

        private QueueModelClient(List<?> outcomes) {
            this(outcomes, Duration.ZERO);
        }

        private QueueModelClient(List<?> outcomes, Duration delay) {
            this.outcomes = new ArrayDeque<>(outcomes);
            this.delay = delay == null ? Duration.ZERO : delay;
        }

        @Override
        public AgentRuntimeModelResponse stream(AgentRuntimeModelRequest request, AgentRuntimeControl control,
                                                Consumer<String> textDeltaConsumer) {
            requests.add(request);
            if (!delay.isZero() && !delay.isNegative()) {
                try {
                    Thread.sleep(delay.toMillis());
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                }
            }
            if (outcomes.isEmpty()) {
                fail("unexpected model request");
            }
            Object outcome = outcomes.remove();
            if (outcome instanceof RuntimeException exception) {
                throw exception;
            }
            return (AgentRuntimeModelResponse) outcome;
        }
    }

    private static final class BlockingModelClient implements AgentRuntimeModelClient {

        private final Duration delay;
        private final List<AgentRuntimeModelRequest> requests = new ArrayList<>();

        private BlockingModelClient(Duration delay) {
            this.delay = delay;
        }

        @Override
        public AgentRuntimeModelResponse stream(AgentRuntimeModelRequest request, AgentRuntimeControl control,
                                                Consumer<String> textDeltaConsumer) {
            requests.add(request);
            try {
                Thread.sleep(delay.toMillis());
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            }
            return finalResponse("late");
        }
    }

    private static final class FakeToolCatalogService extends AgentToolRegistry {

        private final List<AgentToolDescriptor> descriptors;
        private final FakeToolExecutionOrchestrator orchestrator = new FakeToolExecutionOrchestrator(this);
        private final Queue<AgentToolExecutionResult> results = new ArrayDeque<>();
        private int executeCount;
        private AgentToolExecutionRequest lastRequest;
        private Duration delay = Duration.ZERO;

        private FakeToolCatalogService(List<AgentToolDescriptor> descriptors) {
            this.descriptors = descriptors;
            descriptors.forEach(descriptor -> register(new RegisteredTool(descriptor,
                context -> AgentToolOutput.builder().status(AgentToolStatus.SUCCEEDED).build())));
        }

        @Override
        public List<AgentToolDescriptor> descriptors() {
            return descriptors;
        }
    }

    private static final class FakeToolExecutionOrchestrator extends AgentToolExecutionOrchestrator {

        private final FakeToolCatalogService catalog;

        private FakeToolExecutionOrchestrator(FakeToolCatalogService catalog) {
            super(new AgentToolRegistry(), null, null, null, null);
            this.catalog = catalog;
        }

        @Override
        public AgentToolExecutionResult execute(AgentToolExecutionRequest request) {
            catalog.executeCount++;
            catalog.lastRequest = request;
            if (!catalog.delay.isZero() && !catalog.delay.isNegative()) {
                try {
                    Thread.sleep(catalog.delay.toMillis());
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                }
            }
            String toolName = request.getToolName();
            return catalog.results.isEmpty() ? successResult(toolName, "ok") : catalog.results.remove();
        }
    }
}
