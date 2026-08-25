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
import org.apache.hertzbeat.ai.gateway.application.AgentTraceTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTraceRef;
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

/** Exact grounding contract for one canonical Trace Explore detail scope. */
class AgentTraceGroundingTest {

    @Test
    void exactTraceReadShouldProduceFullyBoundProofAndRestoreFromLedger() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        AgentRuntimeToolCall call = call(arguments());
        AgentGroundingProof proof = evaluator.evaluate("run-trace", target(), call, result(output())).orElseThrow();

        assertEquals("target-trace", proof.getObservationKind());
        assertEquals("trace-42", proof.getTraceId());
        assertEquals("span-7", proof.getSpanId());
        assertEquals(1_000L, proof.getStart());
        assertEquals(2_000L, proof.getEnd());
        assertEquals(2, proof.getObservationCount());
        assertTrue(durableVerifier(proof, call, output()).hasDurableGrounding(run(), target()));
    }

    @Test
    void mismatchedScopeOrMalformedTraceMustNotGround() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        List<GroundingCase> cases = List.of(
                new GroundingCase("wrong trace argument", call(changed("traceId", "trace-43")), result(output())),
                new GroundingCase("missing span argument", call(without("spanId")), result(output())),
                new GroundingCase("overlay argument", call(changed("inputRef", "foreign")), result(output())),
                new GroundingCase("wrong output trace", call(arguments()), result(output()
                        .replace("\"traceId\":\"trace-42\"", "\"traceId\":\"trace-43\""))),
                new GroundingCase("selected span absent", call(arguments()), result(output()
                        .replace("\"spanId\":\"span-7\"", "\"spanId\":\"span-8\""))),
                new GroundingCase("service mismatch", call(arguments()), result(output()
                        .replace("\"serviceName\":\"checkout\"", "\"serviceName\":\"catalog\""))),
                new GroundingCase("environment mismatch", call(arguments()), result(output()
                        .replace("\"deployment.environment.name\":\"prod\"",
                                "\"deployment.environment.name\":\"stage\""))),
                new GroundingCase("resource filter mismatch", call(arguments()), result(output()
                        .replace("\"service.version\":\"1\"", "\"service.version\":\"2\""))),
                new GroundingCase("attribute filter mismatch", call(arguments()), result(output()
                        .replace("\"http.status_code\":\"503\"", "\"http.status_code\":\"200\""))),
                new GroundingCase("duration below filter", call(arguments()), result(output()
                        .replace("\"durationNanos\":15000000", "\"durationNanos\":9000000"))),
                new GroundingCase("outside window", call(arguments()), result(output()
                        .replace("\"startTime\":1500", "\"startTime\":2500"))),
                new GroundingCase("span count mismatch", call(arguments()), result(output()
                        .replace("\"spanCount\":2", "\"spanCount\":3"))),
                new GroundingCase("unknown output field", call(arguments()), result(output()
                        .replace("\"partial\":false", "\"partial\":false,\"unknown\":1"))),
                new GroundingCase("moved call", call(arguments()), result("other-call", "traces.get", output())),
                new GroundingCase("sibling tool", call("logs.query", arguments()),
                        result("call-trace", "logs.query", output())),
                new GroundingCase("failed result", call(arguments()), failedResult(output())));

        for (GroundingCase groundingCase : cases) {
            assertTrue(evaluator.evaluate("run-trace", target(), groundingCase.call(), groundingCase.result())
                    .isEmpty(), groundingCase.name());
        }
    }

    @Test
    void durableVerifierMustReevaluateTraceSemanticsAndExactTargetFingerprint() {
        AgentTargetGroundingEvaluator evaluator = new AgentTargetGroundingEvaluator();
        AgentRuntimeToolCall call = call(arguments());
        AgentGroundingProof proof = evaluator.evaluate("run-trace", target(), call, result(output())).orElseThrow();

        String wrongOutput = output().replace("\"spanCount\":2", "\"spanCount\":3");
        AgentGroundingProof wrongOutputProof = JsonUtil.fromJson(JsonUtil.toJson(proof), AgentGroundingProof.class);
        wrongOutputProof.setOutputHash(GatewayText.sha256(wrongOutput));
        assertTrue(!durableVerifier(wrongOutputProof, call, wrongOutput).hasDurableGrounding(run(), target()));

        AgentTargetRef changedTarget = target().toBuilder().trace(
                target().getTrace().toBuilder().attributeFilter("http.status_code=500").build()).build();
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
                .runId(2L).runUid("run-trace").toolCallId(call.getToolCallId()).toolName(call.getToolName())
                .risk(AgentToolRisk.READ.name()).status(AgentToolStatus.SUCCEEDED.name())
                .inputJson(JsonUtil.toJson(call.getArguments()))
                .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(call.getArguments()))
                .resultOutput(output).build()));
        return new AgentGroundingEvidenceVerifier(transcriptRecorder, toolCallDao);
    }

    private AgentRun run() {
        return AgentRun.builder().id(2L).runUid("run-trace")
                .entryType(AgentRuntimeEntryType.USER_INPUT.name()).build();
    }

    private AgentTargetRef target() {
        return AgentTargetRef.builder().version(AgentTraceTargetAuthorityService.TARGET_VERSION)
                .trace(AgentTraceRef.builder().traceId("trace-42").spanId("span-7")
                        .start(1_000L).end(2_000L).serviceName("checkout").serviceNamespace("commerce")
                        .environment("prod").resourceFilter("service.version=1")
                        .attributeFilter("http.status_code=503").minDurationMs(10L).maxDurationMs(20L).build())
                .authority(AgentTargetAuthority.builder()
                        .version(AgentTraceTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + "a".repeat(64)).build())
                .build();
    }

    private AgentRuntimeToolCall call(Map<String, Object> arguments) {
        return call("traces.get", arguments);
    }

    private AgentRuntimeToolCall call(String toolName, Map<String, Object> arguments) {
        return AgentRuntimeToolCall.builder().toolCallId("call-trace").toolName(toolName)
                .arguments(arguments).build();
    }

    private Map<String, Object> arguments() {
        Map<String, Object> arguments = new LinkedHashMap<>();
        arguments.put("traceId", "trace-42");
        arguments.put("spanId", "span-7");
        arguments.put("start", 1_000L);
        arguments.put("end", 2_000L);
        arguments.put("serviceName", "checkout");
        arguments.put("serviceNamespace", "commerce");
        arguments.put("environment", "prod");
        arguments.put("resourceFilter", "service.version=1");
        arguments.put("attributeFilter", "http.status_code=503");
        arguments.put("minDurationMs", 10L);
        arguments.put("maxDurationMs", 20L);
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
        return result("call-trace", "traces.get", output);
    }

    private AgentToolExecutionResult result(String callId, String toolName, String output) {
        return AgentToolExecutionResult.builder().toolCallId(callId).toolName(toolName)
                .status(AgentToolStatus.SUCCEEDED).risk(AgentToolRisk.READ)
                .decision(AgentPolicyDecision.ALLOW).approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output(output).build();
    }

    private AgentToolExecutionResult failedResult(String output) {
        return AgentToolExecutionResult.builder().toolCallId("call-trace").toolName("traces.get")
                .status(AgentToolStatus.FAILED).risk(AgentToolRisk.READ)
                .decision(AgentPolicyDecision.ALLOW).approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output(output).build();
    }

    private String output() {
        return "{\"traceId\":\"trace-42\",\"rootSpanId\":\"span-root\","
                + "\"serviceName\":\"checkout\",\"serviceNamespace\":\"commerce\","
                + "\"rootSpanName\":\"POST /checkout\",\"durationNanos\":15000000,"
                + "\"status\":\"ERROR\",\"startTime\":1500,\"errorSpanCount\":1,"
                + "\"resourceAttributes\":{\"deployment.environment.name\":\"prod\","
                + "\"service.version\":\"1\"},\"spans\":[{\"traceId\":\"trace-42\","
                + "\"spanId\":\"span-root\",\"parentSpanId\":null,\"spanName\":\"POST /checkout\","
                + "\"serviceName\":\"checkout\",\"status\":\"ERROR\",\"spanKind\":\"SERVER\","
                + "\"statusMessage\":null,\"durationNanos\":15000000,\"startTime\":1500,"
                + "\"resourceAttributes\":{},\"spanAttributes\":{}},{\"traceId\":\"trace-42\","
                + "\"spanId\":\"span-7\",\"parentSpanId\":\"span-root\",\"spanName\":\"charge\","
                + "\"serviceName\":\"checkout\",\"status\":\"ERROR\",\"spanKind\":\"CLIENT\","
                + "\"statusMessage\":\"unavailable\",\"durationNanos\":12000000,\"startTime\":1501,"
                + "\"resourceAttributes\":{},\"spanAttributes\":{\"http.status_code\":\"503\"}}],"
                + "\"spanCount\":2,\"partial\":false}";
    }

    private record GroundingCase(String name, AgentRuntimeToolCall call, AgentToolExecutionResult result) {
    }
}
