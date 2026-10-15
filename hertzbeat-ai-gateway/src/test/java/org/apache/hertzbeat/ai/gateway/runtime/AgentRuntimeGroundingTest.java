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
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
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

/** Grounding contract for target-bound Agent Gateway runs. */
class AgentRuntimeGroundingTest {

    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-08-14T00:00:00Z"), ZoneOffset.UTC);
    private static final String GROUNDING_ERROR =
            "Investigation requires a successful HertzBeat data observation before a final answer.";
    private static final String TOOL_SEARCH = "tool.search";

    @Test
    void targetedRunShouldRejectAndHideAnUngroundedFinalAnswer() {
        AgentToolBridge bridge = bridge(List.of(readTool()));
        QueueModelClient modelClient = new QueueModelClient(List.of(finalAnswer("The monitor is healthy.")), true);
        List<TranscriptMessage> transcript = new ArrayList<>();

        List<AgentRuntimeEvent> events = run(targetedContext(), modelClient, bridge, transcript);

        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
        assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage());
        assertFalse(events.stream().anyMatch(event -> event.getType() == AgentRuntimeEventType.ITEM_DELTA));
        assertTrue(transcript.isEmpty());
        verify(bridge, never()).execute(any(), any(), any(), any(), any());
    }

    @Test
    void targetedRunShouldCompleteAfterSuccessfulReadObservation() {
        AgentToolBridge bridge = bridge(List.of(readTool()));
        when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(successfulRead());
        QueueModelClient modelClient = new QueueModelClient(List.of(
                toolCall("monitor.get"),
                finalAnswer("The observed monitor state is available.")), true);
        List<TranscriptMessage> transcript = new ArrayList<>();

        List<AgentRuntimeEvent> events = run(targetedContext(), modelClient, bridge, transcript);

        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, terminal(events).getType());
        assertTrue(events.stream().anyMatch(event -> event.getType() == AgentRuntimeEventType.ITEM_DELTA
                && "The observed monitor state is available.".equals(event.getDelta())));
        assertEquals(3, transcript.size());
        verify(bridge).execute(any(), any(), any(), any(), any());
    }

    @Test
    void targetedRunShouldNotTreatFailedReadAsGrounding() {
        AgentToolBridge bridge = bridge(List.of(readTool()));
        when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(failedRead());
        QueueModelClient modelClient = new QueueModelClient(List.of(
                toolCall("monitor.get"),
                finalAnswer("The monitor is healthy.")), true);

        List<AgentRuntimeEvent> events = run(targetedContext(), modelClient, bridge, new ArrayList<>());

        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
        assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage());
        assertFalse(events.stream().anyMatch(event -> event.getType() == AgentRuntimeEventType.ITEM_DELTA));
    }

    @Test
    void targetedRunShouldNotTreatEmptySuccessfulReadAsGrounding() {
        AgentToolBridge bridge = bridge(List.of(readTool()));
        when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(toolResult(
                AgentToolStatus.SUCCEEDED, null, ""));
        QueueModelClient modelClient = new QueueModelClient(List.of(
                toolCall("monitor.get"),
                finalAnswer("The monitor is healthy.")), true);

        List<AgentRuntimeEvent> events = run(targetedContext(), modelClient, bridge, new ArrayList<>());

        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
        assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage());
    }

    @Test
    void exactMonitorMetricTargetShouldRejectUnrelatedMismatchedAndSemanticEmptyReads() {
        List<GroundingCase> cases = List.of(
                new GroundingCase("wrong tool", "alert.summary", Map.of(), "{\"total\":1}"),
                new GroundingCase("wrong call id", "metrics.history", exactMetricArguments("metric.a"),
                        "{\"monitorId\":42,\"metricKey\":\"metric.a\",\"start\":1000,\"end\":2000,"
                                + "\"returnedPoints\":1}", "other-call"),
                new GroundingCase("wrong monitor", "monitor.get", Map.of("monitorId", 43L),
                        "{\"monitorId\":43}"),
                new GroundingCase("wrong metric", "metrics.history", exactMetricArguments("metric.b"),
                        "{\"returnedPoints\":1}"),
                new GroundingCase("window subset", "metrics.history",
                        exactMetricArguments("metric.a", 1_100L, 1_900L), "{\"returnedPoints\":1}"),
                new GroundingCase("window superset", "metrics.history",
                        exactMetricArguments("metric.a", 900L, 2_100L), "{\"returnedPoints\":1}"),
                new GroundingCase("fractional monitor", "metrics.history", Map.of(
                        "monitorId", 42.5, "metricKey", "metric.a", "start", 1_000L, "end", 2_000L),
                        "{\"monitorId\":42.5,\"metricKey\":\"metric.a\",\"start\":1000,\"end\":2000,"
                                + "\"returnedPoints\":1}"),
                new GroundingCase("fractional start", "metrics.history", Map.of(
                        "monitorId", 42L, "metricKey", "metric.a", "start", 1_000.5, "end", 2_000L),
                        "{\"monitorId\":42,\"metricKey\":\"metric.a\",\"start\":1000.5,\"end\":2000,"
                                + "\"returnedPoints\":1}"),
                new GroundingCase("fractional end", "metrics.history", Map.of(
                        "monitorId", 42L, "metricKey", "metric.a", "start", 1_000L, "end", 2_000.5),
                        "{\"monitorId\":42,\"metricKey\":\"metric.a\",\"start\":1000,\"end\":2000.5,"
                                + "\"returnedPoints\":1}"),
                new GroundingCase("semantic empty history", "metrics.history", exactMetricArguments("metric.a"),
                        "{\"returnedPoints\":0}"),
                new GroundingCase("negative point count", "metrics.history", exactMetricArguments("metric.a"),
                        "{\"returnedPoints\":-2147483648}"),
                new GroundingCase("malformed output", "metrics.history", exactMetricArguments("metric.a"), "{"),
                new GroundingCase("non object output", "metrics.history", exactMetricArguments("metric.a"), "[]"),
                new GroundingCase("semantic empty realtime", "metrics.realtime",
                        Map.of("monitorId", 42L, "metrics", "metric.a"), "{\"rowCount\":0}"));

        for (GroundingCase groundingCase : cases) {
            AgentToolBridge bridge = bridge(List.of(readTool(groundingCase.toolName())));
            when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(toolResult(
                    groundingCase.resultToolCallId(), groundingCase.toolName(), AgentToolStatus.SUCCEEDED,
                    AgentToolRisk.READ, null,
                    groundingCase.output()));
            QueueModelClient modelClient = new QueueModelClient(List.of(
                    toolCall(groundingCase.toolName(), groundingCase.arguments()),
                    finalAnswer("Unsupported conclusion.")), true);

            List<AgentRuntimeEvent> events = run(exactMetricContext(), modelClient, bridge, new ArrayList<>());

            assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType(), groundingCase.name());
            assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage(), groundingCase.name());
        }
    }

    @Test
    void exactMonitorMetricTargetShouldGroundLiveButRequireVerifierForRestoredProof() {
        AgentToolBridge bridge = bridge(List.of(readTool("metrics.history")));
        when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(toolResult(
                "metrics.history", AgentToolStatus.SUCCEEDED, AgentToolRisk.READ, null,
                "{\"monitorId\":42,\"metricKey\":\"metric.a\",\"start\":1000,\"end\":2000,"
                        + "\"returnedPoints\":2}"));
        QueueModelClient modelClient = new QueueModelClient(List.of(
                toolCall("metrics.history", exactMetricArguments("metric.a")),
                finalAnswer("Exact observation.")), true);
        List<TranscriptMessage> transcript = new ArrayList<>();

        List<AgentRuntimeEvent> initial = run(exactMetricContext(), modelClient, bridge, transcript);
        AgentToolBridge replayBridge = bridge(List.of(readTool("metrics.history")));
        List<AgentRuntimeEvent> replay = run(exactMetricContext("run-grounding", transcript),
                new QueueModelClient(List.of(finalAnswer("Exact replay.")), true), replayBridge, new ArrayList<>());

        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, terminal(initial).getType());
        assertEquals(AgentRuntimeEventType.ERROR, terminal(replay).getType());
        verify(replayBridge, never()).execute(any(), any(), any(), any(), any());
    }

    @Test
    void exactMonitorMetricTargetShouldNotRestoreLegacyRunUidOnlyMarker() {
        List<TranscriptMessage> legacy = List.of(TranscriptMessage.toolResult(
                "call-history", "metrics.history", "{\"returnedPoints\":2}", null, "run-grounding"));
        AgentToolBridge bridge = bridge(List.of(readTool("metrics.history")));

        List<AgentRuntimeEvent> events = run(exactMetricContext("run-grounding", legacy),
                new QueueModelClient(List.of(finalAnswer("Legacy replay.")), true), bridge, new ArrayList<>());

        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
        assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage());
        verify(bridge, never()).execute(any(), any(), any(), any(), any());
    }

    @Test
    void shouldRejectContradictoryTypedProofDuringReplay() {
        AgentToolBridge bridge = bridge(List.of(readTool("metrics.history")));
        when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(toolResult(
                "metrics.history", AgentToolStatus.SUCCEEDED, AgentToolRisk.READ, null,
                "{\"monitorId\":42,\"metricKey\":\"metric.a\",\"start\":1000,\"end\":2000,"
                        + "\"returnedPoints\":2}"));
        List<TranscriptMessage> transcript = new ArrayList<>();
        run(exactMetricContext(), new QueueModelClient(List.of(
                toolCall("metrics.history", exactMetricArguments("metric.a")), finalAnswer("Exact.")), true),
                bridge, transcript);
        transcript.stream().filter(message -> message.getGroundingProof() != null).findFirst().orElseThrow()
                .getGroundingProof().setToolName("alert.summary");
        List<AgentRuntimeEvent> replay = run(exactMetricContext("run-grounding", transcript),
                new QueueModelClient(List.of(finalAnswer("Contradictory replay.")), true),
                bridge(List.of(readTool("metrics.history"))), new ArrayList<>());
        assertEquals(AgentRuntimeEventType.ERROR, terminal(replay).getType());
    }

    @Test
    void targetedDirectLoopShouldNotRestoreTranscriptProofWithoutVerifier() {
        List<TranscriptMessage> durableHistory = interruptedTranscript("monitor.get", successfulRead());
        TranscriptMessage observation = durableHistory.stream()
                .filter(message -> message.getRole() == TranscriptMessage.TranscriptRole.TOOL_RESULT)
                .findFirst()
                .orElseThrow();
        AgentToolBridge replayBridge = bridge(List.of(readTool()));
        QueueModelClient replayModel = new QueueModelClient(List.of(
                finalAnswer("The durable observation supports this answer.")), true);

        List<AgentRuntimeEvent> events = run(
                targetedContext("run-grounding", durableHistory), replayModel, replayBridge, new ArrayList<>());

        assertEquals("run-grounding", observation.getGroundingProof().getRunUid());
        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
        verify(replayBridge, never()).execute(any(), any(), any(), any(), any());
    }

    @Test
    void targetedRunShouldNotReuseAnotherRunsSuccessfulReadObservation() {
        List<TranscriptMessage> durableHistory = interruptedTranscript("monitor.get", successfulRead());
        AgentToolBridge replayBridge = bridge(List.of(readTool()));

        List<AgentRuntimeEvent> events = run(
                targetedContext("run-other", durableHistory),
                new QueueModelClient(List.of(finalAnswer("The monitor is healthy.")), true),
                replayBridge,
                new ArrayList<>());

        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
        assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage());
        verify(replayBridge, never()).execute(any(), any(), any(), any(), any());
    }

    @Test
    void targetedRetryShouldFailClosedForLegacyAndNonReadObservations() {
        List<ReplayCase> cases = List.of(
                new ReplayCase("legacy", List.of(TranscriptMessage.toolResult(
                        "legacy-call", "monitor.get", "{\"monitorId\":99}", null))),
                new ReplayCase("compacted prose", List.of(TranscriptMessage.compactionSummary(
                        "monitor.get returned data for groundingRunUid run-grounding", 2L, 3L))),
                new ReplayCase("failed", interruptedTranscript("monitor.get", failedRead())),
                new ReplayCase("empty", interruptedTranscript("monitor.get", toolResult(
                        "monitor.get", AgentToolStatus.SUCCEEDED, AgentToolRisk.READ, null, ""))),
                new ReplayCase("search", interruptedTranscript(TOOL_SEARCH, toolResult(
                        TOOL_SEARCH, AgentToolStatus.SUCCEEDED, AgentToolRisk.READ, null, "{\"tools\":[]}"))),
                new ReplayCase("change", interruptedTranscript("monitor.disable", toolResult(
                        "monitor.disable", AgentToolStatus.SUCCEEDED, AgentToolRisk.CHANGE, null,
                        "{\"disabled\":true}"))));

        for (ReplayCase replayCase : cases) {
            AgentToolBridge replayBridge = bridge(List.of(readTool()));
            List<AgentRuntimeEvent> events = run(
                    targetedContext("run-grounding", replayCase.history()),
                    new QueueModelClient(List.of(finalAnswer("The monitor is healthy.")), true),
                    replayBridge,
                    new ArrayList<>());

            assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType(), replayCase.name());
            assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage(), replayCase.name());
            verify(replayBridge, never()).execute(any(), any(), any(), any(), any());
        }
    }

    @Test
    void untargetedConversationShouldRejectPlainFinalAnswerWithoutReadEvidence() {
        AgentToolBridge bridge = bridge(List.of(readTool()));
        QueueModelClient modelClient = new QueueModelClient(List.of(finalAnswer("I can explain my capabilities.")),
                true);

        List<AgentRuntimeEvent> events = run(untargetedContext(), modelClient, bridge, new ArrayList<>());

        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
        assertFalse(events.stream().anyMatch(event -> event.getType() == AgentRuntimeEventType.ITEM_DELTA));
    }

    private List<AgentRuntimeEvent> run(AgentRuntimeContext context, AgentRuntimeModelClient modelClient,
                                        AgentToolBridge bridge, List<TranscriptMessage> transcript) {
        AgentRuntimeProperties properties = new AgentRuntimeProperties();
        AgentRuntimeLoop loop = new AgentRuntimeLoop(properties, modelClient, bridge, CLOCK);
        List<AgentRuntimeEvent> events = new ArrayList<>();
        try (AgentRuntimeControl control = AgentRuntimeControl.forContext(context, CLOCK)) {
            loop.run(context, control, events::add, message -> {
                transcript.add(message);
                return (long) transcript.size();
            });
        }
        return events;
    }

    private AgentRuntimeContext targetedContext() {
        return targetedContext("run-grounding", List.of());
    }

    private AgentRuntimeContext targetedContext(String runUid, List<TranscriptMessage> chatHistory) {
        return context(AgentTargetRef.builder().monitorId(99L).build(), runUid, chatHistory);
    }

    private AgentRuntimeContext exactMetricContext() {
        return exactMetricContext("run-grounding", List.of());
    }

    private AgentRuntimeContext exactMetricContext(String runUid, List<TranscriptMessage> chatHistory) {
        return context(AgentTargetRef.builder()
                .monitorId(42L)
                .signal(AgentSignalRef.builder().type("metrics").query("metric.a")
                        .start(1_000L).end(2_000L).build())
                .build(), runUid, chatHistory);
    }

    private AgentRuntimeContext untargetedContext() {
        return context(null, "run-grounding", List.of());
    }

    private AgentRuntimeContext context(AgentTargetRef target, String runUid,
                                        List<TranscriptMessage> chatHistory) {
        return AgentRuntimeContext.builder()
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .channelId("web-ui")
                .receivedAt(1L)
                .actor(AgentActor.builder().type("user").id("alice").roles(List.of("user")).build())
                .userMessage("diagnose the monitor")
                .workspaceId("default")
                .sessionUid("session-grounding")
                .runId(2L)
                .runUid(runUid)
                .runSessionId(1L)
                .effectiveTarget(target)
                .currentTimeIso("2026-08-14T08:00:00+08:00")
                .timezone("Asia/Shanghai")
                .traceId("trace-grounding")
                .chatHistory(chatHistory)
                .build();
    }

    private List<TranscriptMessage> interruptedTranscript(String toolName, AgentToolExecutionResult result) {
        AgentToolBridge initialBridge = bridge(List.of(readTool()));
        when(initialBridge.execute(any(), any(), any(), any(), any())).thenReturn(result);
        QueueModelClient initialModel = new QueueModelClient(List.of(
                toolCall(toolName),
                AgentRuntimeModelResponse.invalidResponse("interrupted before final answer", null)), false);
        List<TranscriptMessage> transcript = new ArrayList<>();

        run(targetedContext(), initialModel, initialBridge, transcript);

        return transcript.stream()
                .map(message -> JsonUtil.fromJson(JsonUtil.toJson(message), TranscriptMessage.class))
                .toList();
    }

    private AgentToolBridge bridge(List<AgentToolDescriptor> tools) {
        AgentToolBridge bridge = mock(AgentToolBridge.class);
        when(bridge.visibleTools()).thenReturn(tools);
        when(bridge.discoverableTools(any(), any())).thenReturn(List.of());
        return bridge;
    }

    private AgentRuntimeEvent terminal(List<AgentRuntimeEvent> events) {
        return events.stream()
                .filter(event -> event.getType() == AgentRuntimeEventType.RUN_COMPLETED
                        || event.getType() == AgentRuntimeEventType.ERROR)
                .reduce((first, second) -> second)
                .orElseThrow();
    }

    private AgentToolDescriptor readTool() {
        return readTool("monitor.get");
    }

    private AgentToolDescriptor readTool(String name) {
        return AgentToolDescriptor.builder()
                .name(name)
                .description("Read one HertzBeat monitor.")
                .inputSchema("{\"type\":\"object\"}")
                .risk(AgentToolRisk.READ)
                .namespace("monitor")
                .exposure(AgentToolExposure.MODEL_VISIBLE)
                .build();
    }

    private AgentToolExecutionResult successfulRead() {
        return toolResult(AgentToolStatus.SUCCEEDED, null, "{\"monitorId\":99,\"status\":\"up\"}");
    }

    private AgentToolExecutionResult failedRead() {
        return toolResult(AgentToolStatus.FAILED, "read unavailable", "read unavailable");
    }

    private AgentToolExecutionResult toolResult(AgentToolStatus status, String error, String output) {
        return toolResult("monitor.get", status, AgentToolRisk.READ, error, output);
    }

    private AgentToolExecutionResult toolResult(String toolName, AgentToolStatus status, AgentToolRisk risk,
                                                String error, String output) {
        return toolResult("call-monitor-get", toolName, status, risk, error, output);
    }

    private AgentToolExecutionResult toolResult(String toolCallId, String toolName, AgentToolStatus status,
                                                AgentToolRisk risk, String error, String output) {
        return AgentToolExecutionResult.builder()
                .toolCallId(toolCallId)
                .toolName(toolName)
                .status(status)
                .decision(AgentPolicyDecision.ALLOW)
                .risk(risk)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output(output)
                .errorMessage(error)
                .elapsedMs(1L)
                .build();
    }

    private record ReplayCase(String name, List<TranscriptMessage> history) {
    }

    private AgentRuntimeModelResponse toolCall(String toolName) {
        return toolCall(toolName, Map.of("monitorId", 99L));
    }

    private AgentRuntimeModelResponse toolCall(String toolName, Map<String, Object> arguments) {
        return AgentRuntimeModelResponse.toolCalls("Checking current state.", List.of(
                AgentRuntimeToolCall.builder()
                        .toolCallId("call-monitor-get")
                        .toolName(toolName)
                        .arguments(arguments)
                        .build()), usage());
    }

    private Map<String, Object> exactMetricArguments(String metricKey) {
        return exactMetricArguments(metricKey, 1_000L, 2_000L);
    }

    private Map<String, Object> exactMetricArguments(String metricKey, long start, long end) {
        return Map.of("monitorId", 42L, "metricKey", metricKey, "start", start, "end", end);
    }

    private AgentRuntimeModelResponse finalAnswer(String answer) {
        return AgentRuntimeModelResponse.finalAnswer(answer, usage());
    }

    private AgentRuntimeModelResponse.Usage usage() {
        return AgentRuntimeModelResponse.Usage.builder()
                .promptTokens(5L)
                .completionTokens(4L)
                .totalTokens(9L)
                .build();
    }

    private static final class QueueModelClient implements AgentRuntimeModelClient {

        private final Queue<AgentRuntimeModelResponse> responses;
        private final boolean streamFinalAnswer;

        private QueueModelClient(List<AgentRuntimeModelResponse> responses, boolean streamFinalAnswer) {
            this.responses = new ArrayDeque<>(responses);
            this.streamFinalAnswer = streamFinalAnswer;
        }

        @Override
        public AgentRuntimeModelResponse stream(AgentRuntimeModelRequest request, AgentRuntimeControl control,
                                                Consumer<String> textDeltaConsumer) {
            AgentRuntimeModelResponse response = responses.remove();
            if (streamFinalAnswer
                    && response.getType() == AgentRuntimeModelResponse.ResponseType.FINAL_ANSWER) {
                textDeltaConsumer.accept(response.getFinalAnswer());
            }
            return response;
        }
    }

    private record GroundingCase(String name, String toolName, Map<String, Object> arguments, String output,
                                 String resultToolCallId) {

        private GroundingCase(String name, String toolName, Map<String, Object> arguments, String output) {
            this(name, toolName, arguments, output, "call-monitor-get");
        }
    }
}
