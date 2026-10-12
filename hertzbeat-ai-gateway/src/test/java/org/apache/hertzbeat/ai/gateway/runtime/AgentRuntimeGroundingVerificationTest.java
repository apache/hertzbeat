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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionOrchestrator;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.junit.jupiter.api.Test;

/** Production runtime must consume only ledger-verified durable grounding history. */
class AgentRuntimeGroundingVerificationTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-08-15T00:00:00Z"), ZoneOffset.UTC);

    @Test
    void runtimeRejectsProofStrippedByDurableEvidenceVerification() {
        List<TranscriptMessage> history = List.of(
                TranscriptMessage.assistantToolCalls("Reading.", List.of(
                        TranscriptContent.toolCall("call-1", "monitor.get", Map.of("monitorId", 99L))), null),
                groundedResult());
        AgentTranscriptRecorder recorder = mock(AgentTranscriptRecorder.class);
        AgentToolCallDao ledgerDao = mock(AgentToolCallDao.class);
        when(recorder.findRunGroundingMessages(2L)).thenReturn(List.of());

        List<AgentRuntimeEvent> events = service(
                new AgentGroundingEvidenceVerifier(recorder, ledgerDao), recorder)
                .streamInvoke(request(history)).collectList().block();

        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
    }

    @Test
    void runtimeMayRestoreTheSameRunProofAfterDurableEvidenceVerification() {
        List<TranscriptMessage> history = List.of(
                TranscriptMessage.assistantToolCalls("Reading.", List.of(
                        TranscriptContent.toolCall("call-1", "monitor.get", Map.of("monitorId", 99L))), null),
                groundedResult());
        AgentTranscriptRecorder recorder = mock(AgentTranscriptRecorder.class);
        AgentToolCallDao ledgerDao = mock(AgentToolCallDao.class);
        when(recorder.findRunGroundingMessages(2L)).thenReturn(List.of(history.get(1)));
        when(ledgerDao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(groundedLedger()));

        List<AgentRuntimeEvent> events = service(
                new AgentGroundingEvidenceVerifier(recorder, ledgerDao), recorder)
                .streamInvoke(request(history)).collectList().block();

        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, terminal(events).getType());
    }

    @Test
    void runtimeRestoresSecretShapedProofOnlyFromMatchingRawLedgerHash() {
        Map<String, Object> rawArguments = Map.of(
                "monitorId", 99L, "authorization", "Bearer private-token");
        String rawHash = AgentToolPayloadHasher.normalizedArgumentsHash(rawArguments);
        List<TranscriptMessage> history = secretGroundedHistory(rawHash);
        AgentTranscriptRecorder recorder = mock(AgentTranscriptRecorder.class);
        AgentToolCallDao ledgerDao = mock(AgentToolCallDao.class);
        when(recorder.findRunGroundingMessages(2L)).thenReturn(List.of(history.get(1)));
        when(ledgerDao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(secretLedger(rawHash)));

        List<AgentRuntimeEvent> verified = service(
                new AgentGroundingEvidenceVerifier(recorder, ledgerDao), recorder)
                .streamInvoke(request(history)).collectList().block();
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, terminal(verified).getType());

        when(ledgerDao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(secretLedger("wrong")));
        List<AgentRuntimeEvent> rejected = service(
                new AgentGroundingEvidenceVerifier(recorder, ledgerDao), recorder)
                .streamInvoke(request(history)).collectList().block();
        assertEquals(AgentRuntimeEventType.ERROR, terminal(rejected).getType());
    }

    @Test
    void targetEvidenceMustRecomputeExactArgumentsAndOutputSemantics() {
        AgentTargetRef target = exactMetricTarget();
        Map<String, Object> exactArguments = exactMetricArguments();
        String exactOutput = exactMetricOutput(42L, 1_000L, 2_000L, 1);

        assertTrue(hasTargetEvidence(target, "metrics.history", exactArguments, exactOutput));
        assertFalse(hasTargetEvidence(target, "metrics.history", exactArguments,
                exactMetricOutput(43L, 1_000L, 2_000L, 1)));
        assertFalse(hasTargetEvidence(target, "metrics.history", exactArguments,
                exactMetricOutput(42L, 1_000L, 2_000L, 0)));
        assertFalse(hasTargetEvidence(target, "metrics.history", Map.of(
                        "monitorId", 42L, "metricKey", "metric.a", "start", 1_100L, "end", 2_000L),
                exactOutput));
        assertFalse(hasTargetEvidence(target, "metrics.history", Map.of(
                        "monitorId", 42.5, "metricKey", "metric.a", "start", 1_000L, "end", 2_000L),
                "{\"monitorId\":42.5,\"metricKey\":\"metric.a\",\"start\":1000,\"end\":2000,"
                        + "\"returnedPoints\":1}"));
        assertFalse(hasTargetEvidence(target, "metrics.history", Map.of(
                        "monitorId", 42L, "metricKey", "metric.a", "start", 1_000.5, "end", 2_000L),
                "{\"monitorId\":42,\"metricKey\":\"metric.a\",\"start\":1000.5,\"end\":2000,"
                        + "\"returnedPoints\":1}"));
        assertFalse(hasTargetEvidence(target, "metrics.history", Map.of(
                        "monitorId", 42L, "metricKey", "metric.a", "start", 1_000L, "end", 2_000.5),
                "{\"monitorId\":42,\"metricKey\":\"metric.a\",\"start\":1000,\"end\":2000.5,"
                        + "\"returnedPoints\":1}"));
        assertFalse(hasTargetEvidence(target, "alert.summary", Map.of(), "{\"total\":1}"));
    }

    @Test
    void runtimeMustNotTrustTranscriptProofWhenDurableVerifierIsAbsent() {
        List<TranscriptMessage> history = List.of(
                TranscriptMessage.assistantToolCalls("Reading.", List.of(
                        TranscriptContent.toolCall("call-1", "monitor.get", Map.of("monitorId", 99L))), null),
                groundedResult());

        List<AgentRuntimeEvent> events = service(null).streamInvoke(request(history)).collectList().block();

        assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
    }

    @Test
    void runtimeMayRestoreExactTargetOnlyAfterSemanticDurableVerification() {
        AgentTargetRef target = exactMetricTarget();
        Map<String, Object> arguments = exactMetricArguments();
        String output = exactMetricOutput(42L, 1_000L, 2_000L, 1);
        AgentRuntimeToolCall call = AgentRuntimeToolCall.builder().toolCallId("call-1")
                .toolName("metrics.history").arguments(arguments).build();
        var result = org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult.builder()
                .toolCallId("call-1").toolName("metrics.history")
                .status(AgentToolStatus.SUCCEEDED).risk(AgentToolRisk.READ)
                .decision(org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision.ALLOW)
                .approvalStatus(org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus.NOT_REQUIRED)
                .output(output).build();
        AgentGroundingProof proof = new AgentTargetGroundingEvaluator()
                .evaluate("run-1", target, call, result).orElseThrow();
        TranscriptMessage proofMessage = TranscriptMessage.groundedToolResult(
                "call-1", "metrics.history", output, null, proof);
        List<TranscriptMessage> history = List.of(
                TranscriptMessage.assistantToolCalls("Reading.", List.of(
                        TranscriptContent.toolCall("call-1", "metrics.history", arguments)), null),
                proofMessage);
        AgentTranscriptRecorder recorder = mock(AgentTranscriptRecorder.class);
        AgentToolCallDao ledgerDao = mock(AgentToolCallDao.class);
        when(recorder.findRunGroundingMessages(2L)).thenReturn(List.of(proofMessage));
        when(ledgerDao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(AgentToolCall.builder()
                .runId(2L).runUid("run-1").toolCallId("call-1").toolName("metrics.history")
                .risk(AgentToolRisk.READ.name()).status(AgentToolStatus.SUCCEEDED.name())
                .inputJson(JsonUtil.toJson(arguments)).inputHash(proof.getInputHash())
                .resultOutput(output).build()));

        List<AgentRuntimeEvent> events = service(
                new AgentGroundingEvidenceVerifier(recorder, ledgerDao), recorder)
                .streamInvoke(request(history, target)).collectList().block();

        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, terminal(events).getType());
    }

    @Test
    void runtimeMayRestoreExactSingleAlertOnlyAfterSemanticDurableVerification() {
        AgentTargetRef target = AgentTargetRef.builder().version("single-alert.v1")
                .alertId(42L).alertType("single")
                .authority(AgentTargetAuthority.builder().bindingId(42L)
                        .version("single-alert-authority.v1").hash("sha256:" + "a".repeat(64)).build())
                .build();
        Map<String, Object> arguments = Map.of("alertId", 42L, "alertType", "single");
        String output = "{\"alertId\":42,\"alertType\":\"single\",\"single\":{\"id\":42,"
                + "\"fingerprint\":\"fingerprint-42\",\"status\":\"firing\","
                + "\"content\":\"Latency exceeded\",\"triggerTimes\":2,\"startAt\":1000,"
                + "\"activeAt\":2000,\"endAt\":null,\"labels\":{},\"annotations\":{}}}";
        AgentRuntimeToolCall call = AgentRuntimeToolCall.builder().toolCallId("call-alert")
                .toolName("alert.get").arguments(arguments).build();
        var result = org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult.builder()
                .toolCallId("call-alert").toolName("alert.get")
                .status(AgentToolStatus.SUCCEEDED).risk(AgentToolRisk.READ)
                .decision(org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision.ALLOW)
                .approvalStatus(org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus.NOT_REQUIRED)
                .output(output).build();
        AgentGroundingProof proof = new AgentTargetGroundingEvaluator()
                .evaluate("run-1", target, call, result).orElseThrow();
        TranscriptMessage proofMessage = TranscriptMessage.groundedToolResult(
                "call-alert", "alert.get", output, null, proof);
        List<TranscriptMessage> history = List.of(
                TranscriptMessage.assistantToolCalls("", List.of(
                        TranscriptContent.toolCall("call-alert", "alert.get", arguments)), null),
                proofMessage);
        AgentTranscriptRecorder recorder = mock(AgentTranscriptRecorder.class);
        AgentToolCallDao ledgerDao = mock(AgentToolCallDao.class);
        when(recorder.findRunGroundingMessages(2L)).thenReturn(List.of(proofMessage));
        when(ledgerDao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(AgentToolCall.builder()
                .runId(2L).runUid("run-1").toolCallId("call-alert").toolName("alert.get")
                .risk(AgentToolRisk.READ.name()).status(AgentToolStatus.SUCCEEDED.name())
                .inputJson(JsonUtil.toJson(arguments)).inputHash(proof.getInputHash())
                .resultOutput(output).build()));

        List<AgentRuntimeEvent> events = service(
                new AgentGroundingEvidenceVerifier(recorder, ledgerDao), recorder)
                .streamInvoke(request(history, target)).collectList().block();

        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, terminal(events).getType());
    }

    private AgentRuntimeService service(AgentGroundingEvidenceVerifier verifier) {
        return service(verifier, mock(AgentTranscriptRecorder.class));
    }

    private AgentRuntimeService service(AgentGroundingEvidenceVerifier verifier,
                                        AgentTranscriptRecorder recorder) {
        AgentRuntimeModelClient model = (request, control, delta) ->
                AgentRuntimeModelResponse.finalAnswer("Verified observation.", null);
        return new AgentRuntimeService(new AgentRuntimeProperties(),
                new AgentRuntimeContextBuilder(CLOCK, () -> "trace-1"),
                new AgentToolBridge(new AgentToolRegistry(), new NoToolOrchestrator(),
                        new AgentRuntimeApprovalRegistry()),
                model, new AgentRuntimeControlRegistry(), recorder,
                verifier, CLOCK, List.of());
    }

    private AgentRuntimeRequest request(List<TranscriptMessage> history) {
        return request(history, null);
    }

    private AgentRuntimeRequest request(List<TranscriptMessage> history, AgentTargetRef target) {
        return AgentRuntimeRequest.builder()
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .session(AgentSession.builder().id(1L).sessionUid("session-1").workspaceId("default").build())
                .run(AgentRun.builder().id(2L).runUid("run-1").sessionId(1L)
                        .entryType(AgentRuntimeEntryType.USER_INPUT.name())
                        .targetContextJson(target == null ? null : JsonUtil.toJson(target)).build())
                .envelope(GatewayEnvelope.builder().channelId("web-ui").workspaceId("default").receivedAt(1L)
                        .actor(AgentActor.builder().type("user").id("alice").roles(List.of("user")).build()).build())
                .userInput(UserInput.builder().conversationId("conversation-1")
                        .message(UserInput.Message.builder().text("investigate").build()).build())
                .chatHistory(history)
                .build();
    }

    private boolean hasTargetEvidence(AgentTargetRef target, String toolName,
                                      Map<String, Object> arguments, String output) {
        AgentRuntimeToolCall exactCall = AgentRuntimeToolCall.builder().toolCallId("call-1")
                .toolName("metrics.history").arguments(exactMetricArguments()).build();
        var exactResult = org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult.builder()
                .toolCallId("call-1").toolName("metrics.history")
                .status(AgentToolStatus.SUCCEEDED).risk(AgentToolRisk.READ)
                .decision(org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision.ALLOW)
                .approvalStatus(org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus.NOT_REQUIRED)
                .output(exactMetricOutput(42L, 1_000L, 2_000L, 1)).build();
        AgentGroundingProof proof = new AgentTargetGroundingEvaluator()
                .evaluate("run-1", target, exactCall, exactResult).orElseThrow();
        proof.setToolName(toolName);
        proof.setInputHash(AgentToolPayloadHasher.normalizedArgumentsHash(arguments));
        proof.setOutputHash(org.apache.hertzbeat.ai.gateway.text.GatewayText.sha256(
                AgentRuntimeTextSanitizer.redact(output)));
        TranscriptMessage message = TranscriptMessage.groundedToolResult(
                "call-1", toolName, output, null, proof);
        AgentTranscriptRecorder recorder = mock(AgentTranscriptRecorder.class);
        AgentToolCallDao ledgerDao = mock(AgentToolCallDao.class);
        when(recorder.findRunGroundingMessages(2L)).thenReturn(List.of(message));
        when(ledgerDao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(AgentToolCall.builder()
                .runId(2L).runUid("run-1").toolCallId("call-1").toolName(toolName)
                .risk(AgentToolRisk.READ.name()).status(AgentToolStatus.SUCCEEDED.name())
                .inputJson(JsonUtil.toJson(arguments)).inputHash(proof.getInputHash())
                .resultOutput(output).build()));
        return new AgentGroundingEvidenceVerifier(recorder, ledgerDao)
                .hasDurableGrounding(AgentRun.builder().id(2L).runUid("run-1")
                        .entryType(AgentRuntimeEntryType.USER_INPUT.name()).build(), target);
    }

    private AgentTargetRef exactMetricTarget() {
        return AgentTargetRef.builder().monitorId(42L)
                .signal(AgentSignalRef.builder().type("metrics").query("metric.a")
                        .start(1_000L).end(2_000L).build())
                .build();
    }

    private Map<String, Object> exactMetricArguments() {
        return Map.of("monitorId", 42L, "metricKey", "metric.a", "start", 1_000L, "end", 2_000L);
    }

    private String exactMetricOutput(long monitorId, long start, long end, int returnedPoints) {
        return "{\"monitorId\":" + monitorId + ",\"metricKey\":\"metric.a\",\"start\":" + start
                + ",\"end\":" + end + ",\"returnedPoints\":" + returnedPoints + "}";
    }

    private TranscriptMessage groundedResult() {
        String output = "{\"monitorId\":99}";
        AgentRuntimeToolCall call = AgentRuntimeToolCall.builder().toolCallId("call-1")
                .toolName("monitor.get").arguments(Map.of("monitorId", 99L)).build();
        var result = org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult.builder()
                .toolCallId("call-1").toolName("monitor.get")
                .status(org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus.SUCCEEDED)
                .risk(org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk.READ)
                .decision(org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision.ALLOW)
                .approvalStatus(org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus.NOT_REQUIRED)
                .output(output).build();
        return TranscriptMessage.groundedToolResult(
                "call-1", "monitor.get", output, null,
                new AgentReadGroundingEvaluator().evaluate("run-1", call, result).orElseThrow());
    }

    private List<TranscriptMessage> secretGroundedHistory(String inputHash) {
        String output = "{\"monitorId\":99}";
        AgentGroundingProof proof = AgentGroundingProof.builder()
                .version(AgentReadGroundingEvaluator.VERSION).runUid("run-1")
                .toolName("monitor.get").toolCallId("call-1").inputHash(inputHash)
                .outputHash(org.apache.hertzbeat.ai.gateway.text.GatewayText.sha256(output))
                .observationKind("monitor").observationCount(1).build();
        return List.of(TranscriptMessage.assistantToolCalls("", List.of(TranscriptContent.toolCall(
                        "call-1", "monitor.get",
                        Map.of("monitorId", 99L, "authorization", "[REDACTED]"))), null),
                TranscriptMessage.groundedToolResult("call-1", "monitor.get", output, null, proof));
    }

    private AgentToolCall secretLedger(String inputHash) {
        return AgentToolCall.builder().runId(2L).runUid("run-1")
                .toolCallId("call-1").toolName("monitor.get")
                .risk(AgentToolRisk.READ.name()).status(AgentToolStatus.SUCCEEDED.name())
                .inputJson("{\"monitorId\":99,\"authorization\":\"[REDACTED]\"}")
                .inputHash(inputHash).resultOutput("{\"monitorId\":99}").build();
    }

    private AgentToolCall groundedLedger() {
        return AgentToolCall.builder().runId(2L).runUid("run-1")
                .toolCallId("call-1").toolName("monitor.get")
                .risk(AgentToolRisk.READ.name()).status(AgentToolStatus.SUCCEEDED.name())
                .inputJson("{\"monitorId\":99}")
                .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(Map.of("monitorId", 99L)))
                .resultOutput("{\"monitorId\":99}").build();
    }

    private AgentRuntimeEvent terminal(List<AgentRuntimeEvent> events) {
        return events.stream().filter(event -> event.getType() == AgentRuntimeEventType.ERROR
                        || event.getType() == AgentRuntimeEventType.RUN_COMPLETED)
                .reduce((left, right) -> right).orElseThrow();
    }

    private static final class NoToolOrchestrator extends AgentToolExecutionOrchestrator {

        private NoToolOrchestrator() {
            super(new AgentToolRegistry(), null, null, null,
                    new org.apache.hertzbeat.ai.gateway.tool.core.AgentTargetToolAuthorizer());
        }

        @Override
        public org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult execute(
                AgentToolExecutionRequest request) {
            throw new AssertionError("Tool execution must not be called");
        }
    }
}
