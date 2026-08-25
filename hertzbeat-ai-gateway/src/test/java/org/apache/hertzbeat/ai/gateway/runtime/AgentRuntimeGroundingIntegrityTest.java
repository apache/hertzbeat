/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.ai.gateway.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
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
import org.apache.hertzbeat.ai.gateway.contract.AgentAlertIncidentContext;
import org.apache.hertzbeat.ai.gateway.contract.AgentServiceRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
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

/** Fail-closed integrity tests for mixed context and durable proof identity. */
class AgentRuntimeGroundingIntegrityTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-08-14T00:00:00Z"), ZoneOffset.UTC);

    @Test
    void mixedAlertIncidentShouldRejectLiveAndDurableMetricProof() {
        AgentRuntimeToolCall call = exactCall();
        AgentToolExecutionResult result = exactResult();
        AgentToolBridge liveBridge = bridge();
        when(liveBridge.execute(any(), any(), any(), any(), any())).thenReturn(result);

        List<AgentRuntimeEvent> live = run(context(true, List.of()),
                new QueueModelClient(List.of(toolCallResponse(call), finalAnswer())), liveBridge);
        AgentGroundingProof proof = new AgentTargetGroundingEvaluator()
                .evaluate("run-integrity", exactTarget(), call, result).orElseThrow();
        TranscriptMessage durable = TranscriptMessage.groundedToolResult(
                call.getToolCallId(), call.getToolName(), result.getOutput(), null, proof);
        List<AgentRuntimeEvent> replay = run(context(true, List.of(durable)),
                new QueueModelClient(List.of(finalAnswer())), bridge());

        assertEquals(AgentRuntimeEventType.ERROR, terminal(live).getType());
        assertEquals(AgentRuntimeEventType.ERROR, terminal(replay).getType());
    }

    @Test
    void movedProofShouldNotRestoreUnderDifferentTranscriptCallId() {
        AgentRuntimeToolCall call = exactCall();
        AgentToolExecutionResult result = exactResult();
        AgentGroundingProof proof = new AgentTargetGroundingEvaluator()
                .evaluate("run-integrity", exactTarget(), call, result).orElseThrow();
        TranscriptMessage moved = TranscriptMessage.groundedToolResult(
                "different-call", call.getToolName(), result.getOutput(), null, proof);

        List<AgentRuntimeEvent> events = run(context(false, List.of(moved)),
                new QueueModelClient(List.of(finalAnswer())), bridge());

        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
    }

    @Test
    void canonicalEntityMetricShouldGroundLiveButRequireVerifierForRestoredProof() {
        AgentRuntimeToolCall call = exactCall();
        AgentToolExecutionResult result = exactResult();
        AgentToolBridge liveBridge = bridge();
        when(liveBridge.execute(any(), any(), any(), any(), any())).thenReturn(result);

        List<AgentRuntimeEvent> live = run(canonicalContext(List.of()),
                new QueueModelClient(List.of(toolCallResponse(call), finalAnswer())), liveBridge);
        AgentGroundingProof proof = new AgentTargetGroundingEvaluator()
                .evaluate("run-integrity", canonicalTarget(), call, result).orElseThrow();
        TranscriptMessage durable = TranscriptMessage.groundedToolResult(
                call.getToolCallId(), call.getToolName(), result.getOutput(), null, proof);
        TranscriptMessage restored = JsonUtil.fromJson(JsonUtil.toJson(durable), TranscriptMessage.class);
        TranscriptMessage durableCall = TranscriptMessage.assistantToolCalls("Reading.", List.of(
                TranscriptContent.toolCall(call.getToolCallId(), call.getToolName(), call.getArguments())), usage());
        List<AgentRuntimeEvent> replay = run(canonicalContext(List.of(durableCall, restored)),
                new QueueModelClient(List.of(finalAnswer())), bridge());

        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, terminal(live).getType());
        assertEquals(AgentRuntimeEventType.ERROR, terminal(replay).getType());
        assertEquals("entity-monitor-metric.v1", proof.getTargetVersion());
        assertEquals(7L, proof.getEntityId());
        assertEquals("UTC", proof.getTimezone());
        assertEquals("sha256:" + "a".repeat(64), proof.getAuthorityHash());

        proof.setVersion("grounding.v1");
        assertEquals(false, new AgentTargetGroundingEvaluator()
                .restores(durable, "run-integrity", canonicalTarget(), call.getArguments()));
        proof.setVersion(AgentGroundingProof.VERSION);

        AgentTargetRef changedAuthority = canonicalTarget().toBuilder()
                .authority(AgentTargetAuthority.builder().bindingId(11L).version("changed")
                        .hash("sha256:" + "b".repeat(64)).build())
                .build();
        assertEquals(false, new AgentTargetGroundingEvaluator()
                .restores(durable, "run-integrity", changedAuthority, call.getArguments()));
    }

    @Test
    void canonicalTargetShouldNotGroundFromMonitorReadOrEmptyHistory() {
        AgentRuntimeToolCall monitorCall = AgentRuntimeToolCall.builder()
                .toolCallId("call-monitor").toolName("monitor.get").arguments(Map.of("monitorId", 42L)).build();
        AgentToolExecutionResult monitorResult = AgentToolExecutionResult.builder()
                .toolCallId("call-monitor").toolName("monitor.get").status(AgentToolStatus.SUCCEEDED)
                .decision(AgentPolicyDecision.ALLOW).risk(AgentToolRisk.READ)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED).output("{\"monitorId\":42}").build();
        AgentToolExecutionResult empty = exactResult().toBuilder()
                .output("{\"monitorId\":42,\"metricKey\":\"metric.a\",\"start\":1000,\"end\":2000,"
                        + "\"returnedPoints\":0}")
                .build();

        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        assertEquals(true, evaluator.evaluate("run-integrity", canonicalTarget(), monitorCall, monitorResult).isEmpty());
        assertEquals(true, evaluator.evaluate("run-integrity", canonicalTarget(), exactCall(), empty).isEmpty());
    }

    @Test
    void canonicalSingleAlertShouldCompleteOnlyAfterItsExactRead() {
        AgentRuntimeToolCall call = alertCall();
        AgentToolExecutionResult result = alertResult();
        AgentToolBridge bridge = bridge("alert.get");
        when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(result);

        List<AgentRuntimeEvent> events = run(alertContext(),
                new QueueModelClient(List.of(toolCallResponse(call), finalAnswer())), bridge);

        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, terminal(events).getType());
    }

    private List<AgentRuntimeEvent> run(AgentRuntimeContext context, AgentRuntimeModelClient modelClient,
                                        AgentToolBridge bridge) {
        List<AgentRuntimeEvent> events = new ArrayList<>();
        try (AgentRuntimeControl control = AgentRuntimeControl.forContext(context, CLOCK)) {
            new AgentRuntimeLoop(new AgentRuntimeProperties(), modelClient, bridge, CLOCK)
                    .run(context, control, events::add, message -> 1L);
        }
        return events;
    }

    private AgentRuntimeContext context(boolean withIncident, List<TranscriptMessage> history) {
        return AgentRuntimeContext.builder()
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .channelId("web-ui")
                .receivedAt(1L)
                .actor(AgentActor.builder().type("user").id("alice").roles(List.of("user")).build())
                .userMessage("investigate exact metric")
                .workspaceId("default")
                .sessionUid("session-integrity")
                .runId(2L)
                .runUid("run-integrity")
                .runSessionId(1L)
                .effectiveTarget(exactTarget())
                .alertIncident(withIncident ? AgentAlertIncidentContext.builder()
                        .analysisPolicyId(7L).triggerAlertId(8L).alertIds(List.of(8L))
                        .alertCount(1).windowStartedAt(1_000L).build() : null)
                .currentTimeIso("2026-08-14T08:00:00+08:00")
                .timezone("Asia/Shanghai")
                .traceId("trace-integrity")
                .chatHistory(history)
                .build();
    }

    private AgentRuntimeContext canonicalContext(List<TranscriptMessage> history) {
        return AgentRuntimeContext.builder()
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .channelId("web-ui").receivedAt(1L)
                .actor(AgentActor.builder().type("user").id("alice").roles(List.of("user")).build())
                .userMessage("investigate exact metric").workspaceId("workspace-a")
                .sessionUid("session-integrity").runId(2L).runUid("run-integrity").runSessionId(1L)
                .effectiveTarget(canonicalTarget()).currentTimeIso("2026-08-14T08:00:00+08:00")
                .timezone("Asia/Shanghai").traceId("trace-integrity").chatHistory(history).build();
    }

    private AgentRuntimeContext alertContext() {
        return AgentRuntimeContext.builder()
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .channelId("web-ui").receivedAt(1L)
                .actor(AgentActor.builder().type("user").id("alice").roles(List.of("user")).build())
                .userMessage("investigate exact alert").workspaceId("workspace-a")
                .sessionUid("session-integrity").runId(2L).runUid("run-integrity").runSessionId(1L)
                .effectiveTarget(alertTarget()).currentTimeIso("2026-08-14T08:00:00+08:00")
                .timezone("Asia/Shanghai").traceId("trace-integrity").chatHistory(List.of()).build();
    }

    private AgentTargetRef exactTarget() {
        return AgentTargetRef.builder().monitorId(42L)
                .signal(AgentSignalRef.builder().type("metrics").query("metric.a")
                        .start(1_000L).end(2_000L).build())
                .build();
    }

    private AgentTargetRef canonicalTarget() {
        return AgentTargetRef.builder().version("entity-monitor-metric.v1").entityId(7L).monitorId(42L)
                .service(AgentServiceRef.builder().name("checkout").namespace("commerce").environment("prod").build())
                .signal(AgentSignalRef.builder().type("metrics").query("metric.a")
                        .start(1_000L).end(2_000L).timezone("UTC").build())
                .authority(AgentTargetAuthority.builder().bindingId(11L).version("2026-08-15T00:00")
                        .hash("sha256:" + "a".repeat(64)).build())
                .build();
    }

    private AgentTargetRef alertTarget() {
        return AgentTargetRef.builder().version("single-alert.v1").alertId(42L).alertType("single")
                .authority(AgentTargetAuthority.builder().bindingId(42L).version("single-alert-authority.v1")
                        .hash("sha256:" + "a".repeat(64)).build())
                .build();
    }

    private AgentRuntimeToolCall exactCall() {
        return AgentRuntimeToolCall.builder().toolCallId("call-exact").toolName("metrics.history")
                .arguments(Map.of("monitorId", 42L, "metricKey", "metric.a", "start", 1_000L, "end", 2_000L))
                .build();
    }

    private AgentToolExecutionResult exactResult() {
        return AgentToolExecutionResult.builder().toolCallId("call-exact").toolName("metrics.history")
                .status(AgentToolStatus.SUCCEEDED).decision(AgentPolicyDecision.ALLOW).risk(AgentToolRisk.READ)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output("{\"monitorId\":42,\"metricKey\":\"metric.a\",\"start\":1000,\"end\":2000,"
                        + "\"returnedPoints\":1}")
                .elapsedMs(1L).build();
    }

    private AgentRuntimeToolCall alertCall() {
        return AgentRuntimeToolCall.builder().toolCallId("call-alert").toolName("alert.get")
                .arguments(Map.of("alertId", 42L, "alertType", "single")).build();
    }

    private AgentToolExecutionResult alertResult() {
        return AgentToolExecutionResult.builder().toolCallId("call-alert").toolName("alert.get")
                .status(AgentToolStatus.SUCCEEDED).decision(AgentPolicyDecision.ALLOW).risk(AgentToolRisk.READ)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output("{\"alertId\":42,\"alertType\":\"single\",\"single\":{\"id\":42,"
                        + "\"fingerprint\":\"fingerprint-42\",\"status\":\"firing\","
                        + "\"content\":\"Latency exceeded\",\"triggerTimes\":2,\"startAt\":1000,"
                        + "\"activeAt\":2000,\"endAt\":null,\"labels\":{},\"annotations\":{}}}")
                .elapsedMs(1L).build();
    }

    private AgentToolBridge bridge() {
        return bridge("metrics.history");
    }

    private AgentToolBridge bridge(String toolName) {
        AgentToolBridge bridge = mock(AgentToolBridge.class);
        when(bridge.visibleTools()).thenReturn(List.of(AgentToolDescriptor.builder()
                .name(toolName).description("Read exact target.").inputSchema("{\"type\":\"object\"}")
                .risk(AgentToolRisk.READ).namespace("target").exposure(AgentToolExposure.MODEL_VISIBLE).build()));
        when(bridge.discoverableTools(any(), any())).thenReturn(List.of());
        return bridge;
    }

    private AgentRuntimeModelResponse toolCallResponse(AgentRuntimeToolCall call) {
        return AgentRuntimeModelResponse.toolCalls("Reading.", List.of(call), usage());
    }

    private AgentRuntimeModelResponse finalAnswer() {
        return AgentRuntimeModelResponse.finalAnswer("Unsupported conclusion.", usage());
    }

    private AgentRuntimeModelResponse.Usage usage() {
        return AgentRuntimeModelResponse.Usage.builder()
                .promptTokens(2L).completionTokens(1L).totalTokens(3L).build();
    }

    private AgentRuntimeEvent terminal(List<AgentRuntimeEvent> events) {
        return events.stream().filter(event -> event.getType() == AgentRuntimeEventType.ERROR
                        || event.getType() == AgentRuntimeEventType.RUN_COMPLETED)
                .reduce((first, second) -> second).orElseThrow();
    }

    private static final class QueueModelClient implements AgentRuntimeModelClient {

        private final Queue<AgentRuntimeModelResponse> responses;

        private QueueModelClient(List<AgentRuntimeModelResponse> responses) {
            responses = List.copyOf(responses);
            this.responses = new ArrayDeque<>(responses);
        }

        @Override
        public AgentRuntimeModelResponse stream(AgentRuntimeModelRequest request, AgentRuntimeControl control,
                                                Consumer<String> textDeltaConsumer) {
            return responses.remove();
        }
    }
}
