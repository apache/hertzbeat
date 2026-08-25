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

/** Exact grounding contract for a canonical persisted single alert. */
class AgentSingleAlertGroundingTest {

    @Test
    void exactSingleAlertReadShouldProduceFullyBoundProofAndRestoreFromLedger() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        AgentGroundingProof proof = evaluator.evaluate("run-alert", target(), call(42L, "single"), result(output(42L)))
                .orElseThrow();

        assertEquals(42L, proof.getAlertId());
        assertEquals("single", proof.getAlertType());
        assertEquals("target-single-alert", proof.getObservationKind());
        assertEquals(1, proof.getObservationCount());
        assertTrue(durableVerifier(proof, call(42L, "single"), output(42L))
                .hasDurableGrounding(run(), target()));
    }

    @Test
    void everyPersistedSingleAlertStatusMustGroundWithTheExactProducerRow() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();

        for (String status : List.of("pending", "firing", "acknowledged", "resolved")) {
            String statusOutput = output(42L).replace("\"status\":\"firing\"", "\"status\":\"" + status + "\"");
            assertTrue(evaluator.evaluate("run-alert", target(), call(42L, "single"), result(statusOutput))
                    .isPresent(), status);
        }
    }

    @Test
    void wrongArgumentsToolOrOutputShapeMustNotGround() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        List<GroundingCase> cases = List.of(
                new GroundingCase("wrong id", call(43L, "single"), result(output(43L))),
                new GroundingCase("fractional id", call(42.5, "single"), result(output(42L))),
                new GroundingCase("wrong type", call(42L, "group"), result(output(42L))),
                new GroundingCase("extra arguments", call("alert.get", Map.of(
                        "alertId", 42L, "alertType", "single", "inputRef", "foreign")), result(output(42L))),
                new GroundingCase("wrong output id", call(42L, "single"), result(output(43L))),
                new GroundingCase("group sibling", call(42L, "single"), result(
                        "{\"alertId\":42,\"alertType\":\"single\",\"single\":{\"id\":42},\"group\":{}}")),
                new GroundingCase("group only", call(42L, "single"), result(
                        "{\"alertId\":42,\"alertType\":\"single\",\"group\":{\"id\":42}}")),
                new GroundingCase("empty single", call(42L, "single"), result(
                        "{\"alertId\":42,\"alertType\":\"single\",\"single\":{}}")),
                new GroundingCase("partial single", call(42L, "single"), result(
                        wrapSingle("{\"id\":42,\"status\":\"critical\"}"))),
                new GroundingCase("unsupported status", call(42L, "single"), result(
                        output(42L).replace("\"status\":\"firing\"", "\"status\":\"critical\""))),
                new GroundingCase("negative trigger count", call(42L, "single"), result(
                        output(42L).replace("\"triggerTimes\":2", "\"triggerTimes\":-1"))),
                new GroundingCase("overflow trigger count", call(42L, "single"), result(
                        output(42L).replace("\"triggerTimes\":2", "\"triggerTimes\":2147483648"))),
                new GroundingCase("negative start time", call(42L, "single"), result(
                        output(42L).replace("\"startAt\":1000", "\"startAt\":-1"))),
                new GroundingCase("negative active time", call(42L, "single"), result(
                        output(42L).replace("\"activeAt\":2000", "\"activeAt\":-1"))),
                new GroundingCase("negative end time", call(42L, "single"), result(
                        output(42L).replace("\"endAt\":null", "\"endAt\":-1"))),
                new GroundingCase("content beyond tool output bound", call(42L, "single"), result(
                        output(42L).replace("Latency exceeded", "a".repeat(3_000)))),
                new GroundingCase("arbitrary single", call(42L, "single"), result(
                        wrapSingle("{\"id\":42,\"arbitrary\":\"value\"}"))),
                new GroundingCase("extra single field", call(42L, "single"), result(
                        output(42L).replace("\"annotations\":{}", "\"annotations\":{},\"extra\":true"))),
                new GroundingCase("non-object labels", call(42L, "single"), result(
                        output(42L).replace("\"labels\":{}", "\"labels\":[]"))),
                new GroundingCase("query", call("alert.query", Map.of()), result(
                        "call-alert", "alert.query", "{\"content\":[{\"id\":42}]}")),
                new GroundingCase("summary", call("alert.summary", Map.of()), result(
                        "call-alert", "alert.summary", "{\"total\":1}")),
                new GroundingCase("moved call", call(42L, "single"), result(
                        "other-call", "alert.get", output(42L))));

        for (GroundingCase groundingCase : cases) {
            assertTrue(evaluator.evaluate("run-alert", target(), groundingCase.call(), groundingCase.result())
                    .isEmpty(), groundingCase.name());
        }
    }

    @Test
    void durableVerifierMustReevaluateExactAlertSemantics() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        AgentRuntimeToolCall call = call(42L, "single");
        AgentGroundingProof proof = evaluator.evaluate("run-alert", target(), call, result(output(42L)))
                .orElseThrow();

        String wrongOutput = output(43L);
        AgentGroundingProof selfConsistentWrongOutput = copy(proof);
        selfConsistentWrongOutput.setOutputHash(GatewayText.sha256(wrongOutput));
        assertTrue(!durableVerifier(selfConsistentWrongOutput, call, wrongOutput)
                .hasDurableGrounding(run(), target()));

        AgentRuntimeToolCall summaryCall = call("alert.summary", Map.of());
        String summaryOutput = "{\"total\":1}";
        AgentGroundingProof selfConsistentUnrelated = copy(proof);
        selfConsistentUnrelated.setToolName("alert.summary");
        selfConsistentUnrelated.setInputHash(AgentToolPayloadHasher.normalizedArgumentsHash(Map.of()));
        selfConsistentUnrelated.setOutputHash(GatewayText.sha256(summaryOutput));
        assertTrue(!durableVerifier(selfConsistentUnrelated, summaryCall, summaryOutput)
                .hasDurableGrounding(run(), target()));

        Map<String, Object> extraArguments = Map.of(
                "alertId", 42L, "alertType", "single", "extra", "value");
        AgentRuntimeToolCall extraCall = call("alert.get", extraArguments);
        AgentGroundingProof selfConsistentExtra = copy(proof);
        selfConsistentExtra.setInputHash(AgentToolPayloadHasher.normalizedArgumentsHash(extraArguments));
        assertTrue(!durableVerifier(selfConsistentExtra, extraCall, output(42L))
                .hasDurableGrounding(run(), target()));

        String partialOutput = wrapSingle("{\"id\":42,\"status\":\"critical\"}");
        AgentGroundingProof selfConsistentPartial = copy(proof);
        selfConsistentPartial.setOutputHash(GatewayText.sha256(partialOutput));
        assertTrue(!durableVerifier(selfConsistentPartial, call, partialOutput)
                .hasDurableGrounding(run(), target()));

        String unsupportedStatus = output(42L).replace("\"status\":\"firing\"", "\"status\":\"critical\"");
        AgentGroundingProof selfConsistentStatus = copy(proof);
        selfConsistentStatus.setOutputHash(GatewayText.sha256(unsupportedStatus));
        assertTrue(!durableVerifier(selfConsistentStatus, call, unsupportedStatus)
                .hasDurableGrounding(run(), target()));

        String overflowTrigger = output(42L).replace("\"triggerTimes\":2", "\"triggerTimes\":2147483648");
        AgentGroundingProof selfConsistentTrigger = copy(proof);
        selfConsistentTrigger.setOutputHash(GatewayText.sha256(overflowTrigger));
        assertTrue(!durableVerifier(selfConsistentTrigger, call, overflowTrigger)
                .hasDurableGrounding(run(), target()));
    }

    @Test
    void annotationBoundsMustMatchThePersistedProducer() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        String storedAnnotation = "a".repeat(3_000);
        String legitimateOutput = output(42L).replace(
                "\"annotations\":{}", "\"annotations\":{\"summary\":\"" + storedAnnotation + "\"}");

        assertTrue(evaluator.evaluate("run-alert", target(), call(42L, "single"), result(legitimateOutput))
                .isPresent());

        String oversizedAnnotation = output(42L).replace(
                "\"annotations\":{}", "\"annotations\":{\"summary\":\"" + "a".repeat(4_100) + "\"}");
        assertTrue(evaluator.evaluate("run-alert", target(), call(42L, "single"), result(oversizedAnnotation))
                .isEmpty());
    }

    @Test
    void persistedEmptyMapKeysMustRemainValidLiveAndDurably() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        AgentRuntimeToolCall call = call(42L, "single");
        String emptyKeyOutput = output(42L)
                .replace("\"labels\":{}", "\"labels\":{\"\":\"label-value\"}")
                .replace("\"annotations\":{}", "\"annotations\":{\"\":\"annotation-value\"}");

        AgentGroundingProof proof = evaluator.evaluate("run-alert", target(), call, result(emptyKeyOutput))
                .orElseThrow();
        assertTrue(durableVerifier(proof, call, emptyKeyOutput).hasDurableGrounding(run(), target()));
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
                .runId(2L).runUid("run-alert").toolCallId(call.getToolCallId()).toolName(call.getToolName())
                .risk(AgentToolRisk.READ.name()).status(AgentToolStatus.SUCCEEDED.name())
                .inputJson(JsonUtil.toJson(call.getArguments()))
                .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(call.getArguments()))
                .resultOutput(output).build()));
        return new AgentGroundingEvidenceVerifier(transcriptRecorder, toolCallDao);
    }

    private AgentRun run() {
        return AgentRun.builder().id(2L).runUid("run-alert")
                .entryType(AgentRuntimeEntryType.USER_INPUT.name()).build();
    }

    private AgentTargetRef target() {
        return AgentTargetRef.builder().version("single-alert.v1").alertId(42L).alertType("single")
                .authority(AgentTargetAuthority.builder().bindingId(42L)
                        .version("single-alert-authority.v1").hash("sha256:" + "a".repeat(64)).build())
                .build();
    }

    private AgentRuntimeToolCall call(Object alertId, String alertType) {
        return call("alert.get", Map.of("alertId", alertId, "alertType", alertType));
    }

    private AgentRuntimeToolCall call(String toolName, Map<String, Object> arguments) {
        return AgentRuntimeToolCall.builder().toolCallId("call-alert").toolName(toolName)
                .arguments(arguments).build();
    }

    private AgentToolExecutionResult result(String output) {
        return result("call-alert", "alert.get", output);
    }

    private AgentToolExecutionResult result(String callId, String toolName, String output) {
        return AgentToolExecutionResult.builder().toolCallId(callId).toolName(toolName)
                .status(AgentToolStatus.SUCCEEDED).risk(AgentToolRisk.READ)
                .decision(AgentPolicyDecision.ALLOW).approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output(output).build();
    }

    private String output(long alertId) {
        return wrapSingle(alertId, "{\"id\":" + alertId + ",\"fingerprint\":\"fingerprint-42\","
                + "\"status\":\"firing\",\"content\":\"Latency exceeded\",\"triggerTimes\":2,"
                + "\"startAt\":1000,\"activeAt\":2000,\"endAt\":null,\"labels\":{},\"annotations\":{}}");
    }

    private String wrapSingle(String single) {
        return wrapSingle(42L, single);
    }

    private String wrapSingle(long alertId, String single) {
        return "{\"alertId\":" + alertId + ",\"alertType\":\"single\",\"single\":" + single + "}";
    }

    private record GroundingCase(String name, AgentRuntimeToolCall call, AgentToolExecutionResult result) {
    }
}
