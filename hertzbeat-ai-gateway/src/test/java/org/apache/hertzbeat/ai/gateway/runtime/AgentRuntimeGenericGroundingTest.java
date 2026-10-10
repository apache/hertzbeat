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
            "Investigation requires a successful HertzBeat data observation before a final answer.";

    @Test
    void plainRunRejectsAndHidesZeroToolFinalAnswer() {
        AgentToolBridge bridge = bridge("monitor.query", AgentToolRisk.READ);

        List<AgentRuntimeEvent> events = run(context("run-plain", List.of()),
                new QueueModelClient(List.of(finalAnswer("Everything is healthy.")), true),
                bridge, message -> 1L);

        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
        assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage());
        assertFalse(events.stream().anyMatch(event -> event.getType() == AgentRuntimeEventType.ITEM_DELTA));
        verify(bridge, never()).execute(any(), any(), any(), any(), any());
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
    void toolTurnTextIsPersistedOnlyAfterReadGroundsTheRun() {
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
        assertEquals("The first read found one monitor.", assistantTurns.get(1).text());
    }

    @Test
    void plainRunRejectsUnknownEmptyMalformedAndNonReadResults() {
        List<ReadCase> cases = List.of(
                new ReadCase("unknown", "custom.read", AgentToolRisk.READ, "{\"content\":[1]}"),
                new ReadCase("search", "tool.search", AgentToolRisk.READ, "{\"tools\":[{\"name\":\"monitor.query\"}]}"),
                new ReadCase("empty", "monitor.query", AgentToolRisk.READ,
                        "{\"content\":[],\"totalElements\":0}"),
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
            assertEquals(GROUNDING_ERROR, terminal(events).getErrorMessage(), readCase.name());
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
        AgentRuntimeLoop loop = new AgentRuntimeLoop(new AgentRuntimeProperties(), model, bridge, CLOCK);
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
        return AgentRuntimeContext.builder()
                .entryType(entryType)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .channelId("web-ui")
                .receivedAt(1L)
                .actor(AgentActor.builder().type("user").id("alice").roles(List.of("user")).build())
                .userMessage("investigate current state")
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

        private QueueModelClient(List<AgentRuntimeModelResponse> responses, boolean streamFinal) {
            this.responses = new ArrayDeque<>(responses);
            this.streamFinal = streamFinal;
        }

        @Override
        public AgentRuntimeModelResponse stream(AgentRuntimeModelRequest request, AgentRuntimeControl control,
                                                Consumer<String> deltaConsumer) {
            AgentRuntimeModelResponse response = responses.remove();
            if (streamFinal && response.getType() == AgentRuntimeModelResponse.ResponseType.FINAL_ANSWER) {
                deltaConsumer.accept(response.getFinalAnswer());
            }
            return response;
        }
    }
}
