/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.ai.gateway.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.application.AgentTopologyTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTopologyRef;
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

/** Exact grounding contract for one canonical focused Topology scope. */
class AgentTopologyGroundingTest {

    @Test
    void exactSelectedNodeReadShouldProduceFullyBoundProofAndRestoreFromLedger() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        AgentRuntimeToolCall call = call(arguments());
        AgentGroundingProof proof = evaluator.evaluate(
                "run-topology", nodeTarget(), call, result(output())).orElseThrow();

        assertEquals(42L, proof.getEntityId());
        assertEquals("target-topology", proof.getObservationKind());
        assertEquals(1_000L, proof.getStart());
        assertEquals(2_000L, proof.getEnd());
        assertEquals(3, proof.getObservationCount());
        assertTrue(durableVerifier(proof, call, output()).hasDurableGrounding(run(), nodeTarget()));
    }

    @Test
    void exactSelectedEdgeReadShouldGroundOnlyWhenThatEdgeIsPresent() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();

        assertTrue(evaluator.evaluate("run-topology", edgeTarget(), call(arguments()), result(output())).isPresent());
        assertTrue(evaluator.evaluate("run-topology", edgeTarget("edge:missing"), call(arguments()), result(output()))
                .isEmpty());
    }

    @Test
    void mismatchedScopeEmptyGraphOrMalformedRowsMustNotGround() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        List<GroundingCase> cases = List.of(
                new GroundingCase("wrong root argument", call(changed("entityId", 43L)), result(output())),
                new GroundingCase("missing scope argument", call(without("sourceKind")), result(output())),
                new GroundingCase("overlay argument", call(changed("inputRef", "foreign")), result(output())),
                new GroundingCase("wrong output root", call(arguments()), result(output()
                        .replace("\"focusEntityId\":42", "\"focusEntityId\":43"))),
                new GroundingCase("wrong output depth", call(arguments()), result(output()
                        .replace("\"depth\":2", "\"depth\":1"))),
                new GroundingCase("wrong page", call(arguments()), result(output()
                        .replace("\"pageIndex\":0", "\"pageIndex\":1"))),
                new GroundingCase("empty nodes", call(arguments()), result(output()
                        .replace(nodesJson(), "[]"))),
                new GroundingCase("missing focused root", call(arguments()), result(output()
                        .replace("\"focus\":true", "\"focus\":false"))),
                new GroundingCase("selected node absent", call(arguments()), result(output()
                        .replace("\"id\":\"entity:42\"", "\"id\":\"entity:missing\""))),
                new GroundingCase("unknown node field", call(arguments()), result(output()
                        .replace("\"focus\":true", "\"focus\":true,\"unknown\":1"))),
                new GroundingCase("relation filter mismatch", call(arguments()), result(output()
                        .replace("\"relationType\":\"trace-call\"", "\"relationType\":\"depends-on\""))),
                new GroundingCase("moved call", call(arguments()), result(
                        "other-call", "topology.query", output())),
                new GroundingCase("sibling tool", call("entity.get", arguments()), result(
                        "call-topology", "entity.get", output())),
                new GroundingCase("failed result", call(arguments()), failedResult(output())));

        for (GroundingCase groundingCase : cases) {
            assertTrue(evaluator.evaluate("run-topology", nodeTarget(), groundingCase.call(), groundingCase.result())
                    .isEmpty(), groundingCase.name());
        }
    }

    @Test
    void durableVerifierMustReevaluateTopologySemanticsAndExactTargetFingerprint() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        AgentRuntimeToolCall call = call(arguments());
        AgentGroundingProof proof = evaluator.evaluate("run-topology", nodeTarget(), call, result(output()))
                .orElseThrow();

        String wrongOutput = output().replace("\"focusEntityId\":42", "\"focusEntityId\":43");
        AgentGroundingProof wrongOutputProof = copy(proof);
        wrongOutputProof.setOutputHash(GatewayText.sha256(wrongOutput));
        assertTrue(!durableVerifier(wrongOutputProof, call, wrongOutput)
                .hasDurableGrounding(run(), nodeTarget()));

        AgentTargetRef changedTarget = nodeTarget().toBuilder()
                .topology(nodeTarget().getTopology().toBuilder().pageSize(25).build()).build();
        assertTrue(!durableVerifier(proof, call, output()).hasDurableGrounding(run(), changedTarget));
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
                .runId(2L).runUid("run-topology").toolCallId(call.getToolCallId()).toolName(call.getToolName())
                .risk(AgentToolRisk.READ.name()).status(AgentToolStatus.SUCCEEDED.name())
                .inputJson(JsonUtil.toJson(call.getArguments()))
                .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(call.getArguments()))
                .resultOutput(output).build()));
        return new AgentGroundingEvidenceVerifier(transcriptRecorder, toolCallDao);
    }

    private AgentRun run() {
        return AgentRun.builder().id(2L).runUid("run-topology")
                .entryType(AgentRuntimeEntryType.USER_INPUT.name()).build();
    }

    private AgentTargetRef nodeTarget() {
        return target("entity:42", null);
    }

    private AgentTargetRef edgeTarget() {
        return edgeTarget("edge:42:43");
    }

    private AgentTargetRef edgeTarget(String edgeId) {
        return target(null, edgeId);
    }

    private AgentTargetRef target(String nodeId, String edgeId) {
        return AgentTargetRef.builder().version(AgentTopologyTargetAuthorityService.TARGET_VERSION).entityId(42L)
                .topology(AgentTopologyRef.builder()
                        .rootEntityId(42L).nodeId(nodeId).edgeId(edgeId).depth(2)
                        .environment("prod").sourceKind("otlp-trace-call")
                        .start(1_000L).end(2_000L).relationType("trace-call")
                        .hideInternal(true).pageIndex(0).pageSize(50).build())
                .authority(AgentTargetAuthority.builder().bindingId(42L)
                        .version(AgentTopologyTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + "a".repeat(64)).build())
                .build();
    }

    private AgentRuntimeToolCall call(Map<String, Object> arguments) {
        return call("topology.query", arguments);
    }

    private AgentRuntimeToolCall call(String toolName, Map<String, Object> arguments) {
        return AgentRuntimeToolCall.builder().toolCallId("call-topology").toolName(toolName)
                .arguments(arguments).build();
    }

    private Map<String, Object> arguments() {
        Map<String, Object> arguments = new LinkedHashMap<>();
        arguments.put("entityId", 42L);
        arguments.put("depth", 2);
        arguments.put("environment", "prod");
        arguments.put("sourceKind", "otlp-trace-call");
        arguments.put("start", 1_000L);
        arguments.put("end", 2_000L);
        arguments.put("relationType", "trace-call");
        arguments.put("hideInternal", true);
        arguments.put("pageIndex", 0);
        arguments.put("pageSize", 50);
        return arguments;
    }

    private Map<String, Object> changed(String field, Object value) {
        Map<String, Object> changed = new LinkedHashMap<>(arguments());
        changed.put(field, value);
        return changed;
    }

    private Map<String, Object> without(String field) {
        Map<String, Object> changed = new LinkedHashMap<>(arguments());
        changed.remove(field);
        return changed;
    }

    private AgentToolExecutionResult result(String output) {
        return result("call-topology", "topology.query", output);
    }

    private AgentToolExecutionResult result(String callId, String toolName, String output) {
        return AgentToolExecutionResult.builder().toolCallId(callId).toolName(toolName)
                .status(AgentToolStatus.SUCCEEDED).risk(AgentToolRisk.READ)
                .decision(AgentPolicyDecision.ALLOW).approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output(output).build();
    }

    private AgentToolExecutionResult failedResult(String output) {
        return AgentToolExecutionResult.builder().toolCallId("call-topology").toolName("topology.query")
                .status(AgentToolStatus.FAILED).risk(AgentToolRisk.READ)
                .decision(AgentPolicyDecision.ALLOW).approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output(output).build();
    }

    private String output() {
        return "{\"apiBacked\":true,\"focusEntityId\":42,\"depth\":2,"
                + "\"sourceKinds\":[\"otlp-trace-call\"],\"partial\":false,\"partialReasons\":[],"
                + "\"edgePage\":{\"pageIndex\":0,\"pageSize\":50,\"totalElements\":1,\"hasNext\":false},"
                + "\"nodes\":" + nodesJson() + ",\"edges\":[{\"id\":\"edge:42:43\",\"relationId\":1,"
                + "\"sourceNodeId\":\"entity:42\",\"targetNodeId\":\"entity:43\",\"sourceEntityId\":42,"
                + "\"targetEntityId\":43,\"targetRef\":null,\"sampleTraceId\":\"trace-1\","
                + "\"sampleSpanId\":\"span-1\",\"firstSeen\":null,\"lastSeen\":null,"
                + "\"relationType\":\"trace-call\",\"relationSource\":\"otlp-trace-call\","
                + "\"status\":\"confirmed\",\"score\":90,\"evidenceBadges\":[\"otlp-trace-call\"],"
                + "\"redMetrics\":" + redMetrics() + "}],\"impactTimeline\":[]}";
    }

    private String nodesJson() {
        return "[{\"id\":\"entity:42\",\"entityId\":42,\"entityName\":\"checkout\","
                + "\"entityType\":\"service\",\"namespace\":\"commerce\",\"environment\":\"prod\","
                + "\"health\":\"unknown\",\"focus\":true,\"evidenceBadges\":[\"entity-relation\"],"
                + "\"redMetrics\":" + redMetrics() + "},{\"id\":\"entity:43\",\"entityId\":43,"
                + "\"entityName\":\"catalog\",\"entityType\":\"service\",\"namespace\":\"commerce\","
                + "\"environment\":\"prod\",\"health\":\"unknown\",\"focus\":false,"
                + "\"evidenceBadges\":[\"otlp-trace-call\"],\"redMetrics\":" + redMetrics() + "}]";
    }

    private String redMetrics() {
        return "{\"requestRatePerSecond\":1.5,\"requestCount\":10,\"errorRate\":0.1,"
                + "\"errorCount\":1,\"latencyP95Ms\":20.0,\"latencyAvgMs\":10.0}";
    }

    private record GroundingCase(String name, AgentRuntimeToolCall call, AgentToolExecutionResult result) {
    }
}
