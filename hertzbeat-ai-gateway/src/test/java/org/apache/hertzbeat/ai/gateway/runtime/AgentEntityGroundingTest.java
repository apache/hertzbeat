/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.ai.gateway.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.application.AgentEntityTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

/** Exact grounding contract for one canonical persisted Entity. */
class AgentEntityGroundingTest {

    @Test
    void exactEntityReadShouldProduceFullyBoundProofAndRestoreFromLedger() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        AgentGroundingProof proof = evaluator.evaluate(
                "run-entity", target(), call(42L), result(output(42L))).orElseThrow();

        assertEquals(42L, proof.getEntityId());
        assertEquals("target-entity", proof.getObservationKind());
        assertEquals(1, proof.getObservationCount());
        assertTrue(durableVerifier(proof, call(42L), output(42L))
                .hasDurableGrounding(run(), target()));
    }

    @Test
    void wrongArgumentsToolOrOutputShapeMustNotGround() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        List<GroundingCase> cases = List.of(
                new GroundingCase("wrong argument id", call(43L), result(output(43L))),
                new GroundingCase("fractional argument id", call(42.5), result(output(42L))),
                new GroundingCase("extra arguments", call("entity.get", Map.of(
                        "entityId", 42L, "inputRef", "foreign")), result(output(42L))),
                new GroundingCase("wrong output id", call(42L), result(output(43L))),
                new GroundingCase("empty entity", call(42L), result(wrap("{}"))),
                new GroundingCase("missing type", call(42L), result(
                        wrap("{\"id\":42,\"name\":\"checkout\",\"labels\":{},\"tags\":[]}"))),
                new GroundingCase("missing name", call(42L), result(
                        wrap("{\"id\":42,\"type\":\"service\",\"labels\":{},\"tags\":[]}"))),
                new GroundingCase("blank name", call(42L), result(
                        wrap("{\"id\":42,\"type\":\"service\",\"name\":\" \","
                                + "\"labels\":{},\"tags\":[]}"))),
                new GroundingCase("unknown entity field", call(42L), result(output(42L)
                        .replace("\"tags\":[\"prod\"]", "\"tags\":[\"prod\"],\"unknown\":true"))),
                new GroundingCase("unknown top-level field", call(42L), result(output(42L)
                        .replace("\"topologyNeighbors\":[]", "\"topologyNeighbors\":[],\"unknown\":true"))),
                new GroundingCase("non-map labels", call(42L), result(output(42L)
                        .replace("\"labels\":{}", "\"labels\":[]"))),
                new GroundingCase("non-list tags", call(42L), result(output(42L)
                        .replace("\"tags\":[\"prod\"]", "\"tags\":{}"))),
                new GroundingCase("non-list actions", call(42L), result(output(42L)
                        .replace("\"nextActions\":[]", "\"nextActions\":{}"))),
                new GroundingCase("non-list topology", call(42L), result(output(42L)
                        .replace("\"topologyNeighbors\":[]", "\"topologyNeighbors\":{}"))),
                new GroundingCase("query sibling", call("entity.query", Map.of()), result(
                        "call-entity", "entity.query", "{\"content\":[{\"id\":42}]}")),
                new GroundingCase("moved call", call(42L), result(
                        "other-call", "entity.get", output(42L))),
                new GroundingCase("failed result", call(42L), failedResult(output(42L))));

        for (GroundingCase groundingCase : cases) {
            assertTrue(evaluator.evaluate("run-entity", target(), groundingCase.call(), groundingCase.result())
                    .isEmpty(), groundingCase.name());
        }
    }

    @Test
    void durableVerifierMustReevaluateExactEntitySemantics() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        AgentRuntimeToolCall call = call(42L);
        AgentGroundingProof proof = evaluator.evaluate("run-entity", target(), call, result(output(42L)))
                .orElseThrow();

        String wrongOutput = output(43L);
        AgentGroundingProof selfConsistentWrongOutput = copy(proof);
        selfConsistentWrongOutput.setOutputHash(GatewayText.sha256(wrongOutput));
        assertTrue(!durableVerifier(selfConsistentWrongOutput, call, wrongOutput)
                .hasDurableGrounding(run(), target()));

        Map<String, Object> extraArguments = Map.of("entityId", 42L, "extra", "value");
        AgentRuntimeToolCall extraCall = call("entity.get", extraArguments);
        AgentGroundingProof selfConsistentExtra = copy(proof);
        selfConsistentExtra.setInputHash(AgentToolPayloadHasher.normalizedArgumentsHash(extraArguments));
        assertTrue(!durableVerifier(selfConsistentExtra, extraCall, output(42L))
                .hasDurableGrounding(run(), target()));

        String partialOutput = wrap("{\"id\":42,\"type\":\"service\",\"name\":\"checkout\"}");
        AgentGroundingProof selfConsistentPartial = copy(proof);
        selfConsistentPartial.setOutputHash(GatewayText.sha256(partialOutput));
        assertTrue(!durableVerifier(selfConsistentPartial, call, partialOutput)
                .hasDurableGrounding(run(), target()));
    }

    @Test
    void boundedProducerFieldsAndEmptyOptionalCollectionsRemainValid() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        String bounded = output(42L)
                .replace("checkout", "n".repeat(256))
                .replace("[\"prod\"]", "[\"" + "t".repeat(128) + "\"]");

        assertTrue(evaluator.evaluate("run-entity", target(), call(42L), result(bounded)).isPresent());
        assertTrue(evaluator.evaluate("run-entity", target(), call(42L), result(
                bounded.replace("n".repeat(256), "n".repeat(257)))).isEmpty());
        assertTrue(evaluator.evaluate("run-entity", target(), call(42L), result(
                bounded.replace("t".repeat(128), "t".repeat(129)))).isEmpty());
    }

    private AgentGroundingProof copy(AgentGroundingProof proof) {
        return JsonUtil.fromJson(JsonUtil.toJson(proof), AgentGroundingProof.class);
    }

    private AgentGroundingEvidenceVerifier durableVerifier(AgentGroundingProof proof,
                                                            AgentRuntimeToolCall call, String output) {
        TranscriptMessage message = TranscriptMessage.groundedToolResult(
                call.getToolCallId(), call.getToolName(), output, null, proof);
        AgentTranscriptRecorder transcriptRecorder = Mockito.mock(AgentTranscriptRecorder.class);
        AgentToolCallDao toolCallDao = Mockito.mock(AgentToolCallDao.class);
        Mockito.when(transcriptRecorder.findRunGroundingMessages(2L)).thenReturn(List.of(message));
        Mockito.when(toolCallDao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(AgentToolCall.builder()
                .runId(2L).runUid("run-entity").toolCallId(call.getToolCallId()).toolName(call.getToolName())
                .risk(AgentToolRisk.READ.name()).status(AgentToolStatus.SUCCEEDED.name())
                .inputJson(JsonUtil.toJson(call.getArguments()))
                .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(call.getArguments()))
                .resultOutput(output).build()));
        return new AgentGroundingEvidenceVerifier(transcriptRecorder, toolCallDao);
    }

    private AgentRun run() {
        return AgentRun.builder().id(2L).runUid("run-entity")
                .entryType(AgentRuntimeEntryType.USER_INPUT.name()).build();
    }

    private AgentTargetRef target() {
        return AgentTargetRef.builder().version(AgentEntityTargetAuthorityService.TARGET_VERSION).entityId(42L)
                .authority(AgentTargetAuthority.builder().bindingId(42L)
                        .version(AgentEntityTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + "a".repeat(64)).build())
                .build();
    }

    private AgentRuntimeToolCall call(Object entityId) {
        return call("entity.get", Map.of("entityId", entityId));
    }

    private AgentRuntimeToolCall call(String toolName, Map<String, Object> arguments) {
        return AgentRuntimeToolCall.builder().toolCallId("call-entity").toolName(toolName)
                .arguments(arguments).build();
    }

    private AgentToolExecutionResult result(String output) {
        return result("call-entity", "entity.get", output);
    }

    private AgentToolExecutionResult result(String callId, String toolName, String output) {
        return AgentToolExecutionResult.builder().toolCallId(callId).toolName(toolName)
                .status(AgentToolStatus.SUCCEEDED).risk(AgentToolRisk.READ)
                .decision(AgentPolicyDecision.ALLOW).approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output(output).build();
    }

    private AgentToolExecutionResult failedResult(String output) {
        return AgentToolExecutionResult.builder().toolCallId("call-entity").toolName("entity.get")
                .status(AgentToolStatus.FAILED).risk(AgentToolRisk.READ)
                .decision(AgentPolicyDecision.ALLOW).approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output(output).build();
    }

    private String output(long entityId) {
        return wrap("{\"id\":" + entityId + ",\"type\":\"service\",\"name\":\"checkout\","
                + "\"displayName\":\"Checkout API\",\"status\":\"online\","
                + "\"labels\":{},\"tags\":[\"prod\"]}");
    }

    private String wrap(String entity) {
        return "{\"entity\":" + entity + ",\"nextActions\":[],\"topologyNeighbors\":[]}";
    }

    private record GroundingCase(String name, AgentRuntimeToolCall call, AgentToolExecutionResult result) {
    }
}
