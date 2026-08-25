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
import org.apache.hertzbeat.ai.gateway.application.AgentLogTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.contract.AgentLogRef;
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

/** Exact grounding contract for one canonical Log Explore page scope. */
class AgentLogGroundingTest {

    @Test
    void exactLogReadShouldProduceFullyBoundProofAndRestoreFromLedger() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        AgentRuntimeToolCall call = call(arguments());
        AgentGroundingProof proof = evaluator.evaluate("run-log", target(), call, result(output())).orElseThrow();

        assertEquals("target-log-page", proof.getObservationKind());
        assertEquals("trace-42", proof.getTraceId());
        assertEquals("span-7", proof.getSpanId());
        assertEquals(1_000L, proof.getStart());
        assertEquals(2_000L, proof.getEnd());
        assertEquals(1, proof.getObservationCount());
        assertTrue(durableVerifier(proof, call, output()).hasDurableGrounding(run(), target()));
    }

    @Test
    void mismatchedScopeEmptyOrMalformedPageMustNotGround() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        List<GroundingCase> cases = List.of(
                new GroundingCase("wrong argument", call(changed("search", "other")), result(output())),
                new GroundingCase("missing argument", call(without("hideNoise")), result(output())),
                new GroundingCase("overlay", call(changed("inputRef", "foreign")), result(output())),
                new GroundingCase("wrong page", call(arguments()), result(output().replace("\"pageIndex\":0", "\"pageIndex\":1"))),
                new GroundingCase("empty page", call(arguments()), result(output()
                        .replace("\"content\":[{", "\"content\":[],\"discarded\":[{")
                        .replace("}],\"pageIndex\"", "}],\"pageIndex\""))),
                new GroundingCase("total mismatch", call(arguments()), result(output()
                        .replace("\"totalElements\":1", "\"totalElements\":0"))),
                new GroundingCase("wrong trace", call(arguments()), result(output()
                        .replace("\"traceId\":\"trace-42\"", "\"traceId\":\"trace-43\""))),
                new GroundingCase("service mismatch", call(arguments()), result(output()
                        .replace("\\\"service.name\\\":\\\"checkout\\\"",
                                "\\\"service.name\\\":\\\"catalog\\\""))),
                new GroundingCase("environment mismatch", call(arguments()), result(output()
                        .replace("\\\"deployment.environment.name\\\":\\\"prod\\\"",
                                "\\\"deployment.environment.name\\\":\\\"stage\\\""))),
                new GroundingCase("resource filter mismatch", call(arguments()), result(output()
                        .replace("\\\"service.version\\\":\\\"1\\\"",
                                "\\\"service.version\\\":\\\"2\\\""))),
                new GroundingCase("attribute filter mismatch", call(arguments()), result(output()
                        .replace("\\\"http.route\\\":\\\"/pay\\\"",
                                "\\\"http.route\\\":\\\"/other\\\""))),
                new GroundingCase("body search mismatch", call(arguments()), result(output()
                        .replace("request failed", "request succeeded"))),
                new GroundingCase("outside window", call(arguments()), result(output()
                        .replace("1500000000", "2500000000")
                        .replace("1500000001", "2500000001"))),
                new GroundingCase("unknown output", call(arguments()), result(output()
                        .replace("\"end\":2000", "\"end\":2000,\"unknown\":1"))),
                new GroundingCase("unknown row", call(arguments()), result(output()
                        .replace("\"traceFlags\":1", "\"traceFlags\":1,\"unknown\":1"))),
                new GroundingCase("sibling", call("traces.get", arguments()), result("call-log", "traces.get", output())),
                new GroundingCase("failed", call(arguments()), failedResult(output())));

        for (GroundingCase groundingCase : cases) {
            assertTrue(evaluator.evaluate("run-log", target(), groundingCase.call(), groundingCase.result())
                    .isEmpty(), groundingCase.name());
        }
    }

    @Test
    void durableVerifierMustReevaluateLogSemanticsAndExactTargetFingerprint() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        AgentRuntimeToolCall call = call(arguments());
        AgentGroundingProof proof = evaluator.evaluate("run-log", target(), call, result(output())).orElseThrow();

        String wrongOutput = output().replace("\"totalElements\":1", "\"totalElements\":0");
        AgentGroundingProof wrongOutputProof = JsonUtil.fromJson(JsonUtil.toJson(proof), AgentGroundingProof.class);
        wrongOutputProof.setOutputHash(GatewayText.sha256(wrongOutput));
        assertTrue(!durableVerifier(wrongOutputProof, call, wrongOutput).hasDurableGrounding(run(), target()));

        AgentTargetRef changedTarget = target().toBuilder()
                .log(target().getLog().toBuilder().hideNoise(true).build()).build();
        assertTrue(!durableVerifier(proof, call, output()).hasDurableGrounding(run(), changedTarget));
    }

    private AgentGroundingEvidenceVerifier durableVerifier(AgentGroundingProof proof,
                                                            AgentRuntimeToolCall call, String output) {
        TranscriptMessage message = TranscriptMessage.groundedToolResult(
                call.getToolCallId(), call.getToolName(), output, null, proof);
        AgentTranscriptRecorder transcriptRecorder = Mockito.mock(AgentTranscriptRecorder.class);
        AgentToolCallDao toolCallDao = Mockito.mock(AgentToolCallDao.class);
        Mockito.when(transcriptRecorder.findRunGroundingMessages(2L)).thenReturn(List.of(message));
        Mockito.when(toolCallDao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(AgentToolCall.builder()
                .runId(2L).runUid("run-log").toolCallId(call.getToolCallId()).toolName(call.getToolName())
                .risk(AgentToolRisk.READ.name()).status(AgentToolStatus.SUCCEEDED.name())
                .inputJson(JsonUtil.toJson(call.getArguments()))
                .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(call.getArguments()))
                .resultOutput(output).build()));
        return new AgentGroundingEvidenceVerifier(transcriptRecorder, toolCallDao);
    }

    private AgentRun run() {
        return AgentRun.builder().id(2L).runUid("run-log")
                .entryType(AgentRuntimeEntryType.USER_INPUT.name()).build();
    }

    private AgentTargetRef target() {
        return AgentTargetRef.builder().version(AgentLogTargetAuthorityService.TARGET_VERSION)
                .log(AgentLogRef.builder().start(1_000L).end(2_000L).traceId("trace-42").spanId("span-7")
                        .severityNumber(17).severityText("ERROR").search("failed")
                        .serviceName("checkout").serviceNamespace("commerce").environment("prod")
                        .resourceFilter("service.version=1").attributeFilter("http.route=/pay")
                        .hideInternal(true).hideNoise(false).pageIndex(0).pageSize(20).build())
                .authority(AgentTargetAuthority.builder()
                        .version(AgentLogTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + "a".repeat(64)).build())
                .build();
    }

    private AgentRuntimeToolCall call(Map<String, Object> arguments) {
        return call("logs.query", arguments);
    }

    private AgentRuntimeToolCall call(String toolName, Map<String, Object> arguments) {
        return AgentRuntimeToolCall.builder().toolCallId("call-log").toolName(toolName)
                .arguments(arguments).build();
    }

    private Map<String, Object> arguments() {
        Map<String, Object> arguments = new LinkedHashMap<>();
        arguments.put("start", 1_000L);
        arguments.put("end", 2_000L);
        arguments.put("traceId", "trace-42");
        arguments.put("spanId", "span-7");
        arguments.put("severityNumber", 17);
        arguments.put("severityText", "ERROR");
        arguments.put("search", "failed");
        arguments.put("serviceName", "checkout");
        arguments.put("serviceNamespace", "commerce");
        arguments.put("environment", "prod");
        arguments.put("resourceFilter", "service.version=1");
        arguments.put("attributeFilter", "http.route=/pay");
        arguments.put("hideInternal", true);
        arguments.put("hideNoise", false);
        arguments.put("pageIndex", 0);
        arguments.put("pageSize", 20);
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
        return result("call-log", "logs.query", output);
    }

    private AgentToolExecutionResult result(String callId, String toolName, String output) {
        return AgentToolExecutionResult.builder().toolCallId(callId).toolName(toolName)
                .status(AgentToolStatus.SUCCEEDED).risk(AgentToolRisk.READ)
                .decision(AgentPolicyDecision.ALLOW).approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output(output).build();
    }

    private AgentToolExecutionResult failedResult(String output) {
        return AgentToolExecutionResult.builder().toolCallId("call-log").toolName("logs.query")
                .status(AgentToolStatus.FAILED).risk(AgentToolRisk.READ)
                .decision(AgentPolicyDecision.ALLOW).approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output(output).build();
    }

    private String output() {
        return "{\"content\":[{\"timeUnixNano\":1500000000,\"observedTimeUnixNano\":1500000001,"
                + "\"severityNumber\":17,\"severityText\":\"ERROR\",\"body\":\"request failed\","
                + "\"traceId\":\"trace-42\",\"spanId\":\"span-7\",\"traceFlags\":1,"
                + "\"attributes\":\"{\\\"http.route\\\":\\\"/pay\\\"}\","
                + "\"resource\":\"{\\\"service.name\\\":\\\"checkout\\\","
                + "\\\"service.namespace\\\":\\\"commerce\\\","
                + "\\\"deployment.environment.name\\\":\\\"prod\\\","
                + "\\\"service.version\\\":\\\"1\\\"}\"}],"
                + "\"pageIndex\":0,\"pageSize\":20,\"totalElements\":1,\"totalPages\":1,"
                + "\"start\":1000,\"end\":2000}";
    }

    private record GroundingCase(String name, AgentRuntimeToolCall call, AgentToolExecutionResult result) {
    }
}
