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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/** Production-shaped contract fixtures, not a storage or remote-model integration test. */
class AgentNativeReadGroundingTest {
    private static final ObjectMapper JSON = new ObjectMapper();

    static Stream<Map<String, Object>> fixtures() throws Exception {
        try (var input =
                AgentNativeReadGroundingTest.class.getResourceAsStream(
                        "/native-read-contracts.json")) {
            return ((List<?>) JSON.readValue(input, List.class))
                    .stream().map(AgentNativeReadGroundingTest::map);
        }
    }

    @ParameterizedTest(name = "valid {index}")
    @MethodSource("fixtures")
    void acceptsTypedObservation(Map<String, Object> fixture) throws Exception {
        var observation = classify(fixture, map(fixture.get("args")), map(fixture.get("output")));
        assertNotNull(observation, fixture.get("tool").toString());
        assertEquals(((Number) fixture.get("count")).intValue(), observation.count());
    }

    @ParameterizedTest(name = "empty {index}")
    @MethodSource("fixtures")
    void acceptsSuccessfulEmptyScope(Map<String, Object> fixture) throws Exception {
        var observation =
                classify(fixture, map(fixture.get("args")), map(fixture.get("emptyOutput")));
        assertNotNull(observation, fixture.get("tool").toString());
        assertEquals(((Number) fixture.get("emptyCount")).intValue(), observation.count());
    }

    @ParameterizedTest(name = "projection {index}")
    @MethodSource("fixtures")
    void rejectsTruncatedOrAbsentProjection(Map<String, Object> fixture) throws Exception {
        var output = new LinkedHashMap<>(map(fixture.get("output")));
        String kind = fixture.get("kind").toString();
        String flag = kind.equals("log") ? "projectionTruncated" : kind.equals("management") ? "partial" : "outputTruncated";
        output.put(flag, true);
        assertNull(classify(fixture, map(fixture.get("args")), output));
        assertNull(classify(fixture, map(fixture.get("args")), Map.of()));
    }

    @ParameterizedTest(name = "identity {index}")
    @MethodSource("fixtures")
    void rejectsWrongRequestIdentityOrWindow(Map<String, Object> fixture) throws Exception {
        var args = new LinkedHashMap<>(map(fixture.get("args")));
        String tool = fixture.get("tool").toString();
        if (args.containsKey("selection") || args.containsKey("q")) {
            String key = args.containsKey("selection") ? "selection" : "q";
            var query = new LinkedHashMap<>(map(args.get(key)));
            query.put("start", 110000);
            query.put("end", 100000);
            args.put(key, query);
        } else if (args.containsKey("monitorId")) {
            args.put("monitorId", 99);
        } else if (args.containsKey("alertId")) {
            args.put("alertId", 99);
        } else if (args.containsKey("ids")) {
            args.put("ids", List.of(99));
        } else if (args.containsKey("pageSize")) {
            args.put("pageSize", 5);
        } else if (args.containsKey("traceId")) {
            args.put("traceId", "a".repeat(32));
        } else if (tool.equals("logs.compare")) {
            args.put("source", "{}");
        } else {
            args.put("representativeUid", "wrong-record");
        }
        assertNull(classify(fixture, args, map(fixture.get("output"))), tool);
    }

    @ParameterizedTest(name = "proof {index}")
    @MethodSource("fixtures")
    void bindsAndRestoresOnlyMatchingSuccessfulRead(Map<String, Object> fixture) throws Exception {
        var call = call(fixture, map(fixture.get("args")));
        String output = JSON.writeValueAsString(fixture.get("output"));
        var result =
                AgentToolExecutionResult.builder()
                        .toolCallId(call.getToolCallId())
                        .toolName(call.getToolName())
                        .decision(AgentPolicyDecision.ALLOW)
                        .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                        .risk(AgentToolRisk.READ)
                        .status(AgentToolStatus.SUCCEEDED)
                        .output(output)
                        .build();
        var evaluator = new AgentReadGroundingEvaluator();
        var proof = evaluator.evaluate("native-contract-run", call, result).orElseThrow();
        var message =
                TranscriptMessage.builder()
                        .role(TranscriptMessage.TranscriptRole.TOOL_RESULT)
                        .toolCallId(call.getToolCallId())
                        .toolName(call.getToolName())
                        .content(List.of(TranscriptContent.text(output)))
                        .groundingProof(proof)
                        .build();
        assertTrue(evaluator.restores(message, "native-contract-run", call.getArguments()));
        assertFalse(evaluator.restores(message.toBuilder()
                .content(List.of(TranscriptContent.text("{\"tampered\":true," + output.substring(1)))).build(), "native-contract-run", call.getArguments()));
        assertFalse(evaluator.restores(message, "another-run", call.getArguments()));
        assertFalse(evaluator.restores(message, "native-contract-run", Map.of("tampered", true)));
        assertTrue(
                evaluator
                        .evaluate(
                                "native-contract-run",
                                call,
                                result.toBuilder().risk(AgentToolRisk.CHANGE).build())
                        .isEmpty());
        assertTrue(
                evaluator
                        .evaluate(
                                "native-contract-run",
                                call,
                                result.toBuilder().status(AgentToolStatus.FAILED).build())
                        .isEmpty());
        assertTrue(
                evaluator
                        .evaluate(
                                "native-contract-run",
                                call,
                                result.toBuilder().toolCallId("another-call").build())
                        .isEmpty());
    }

    static AgentReadObservationClassifier.Observation classify(
            Map<String, Object> fixture, Map<String, Object> args, Map<String, Object> output)
            throws Exception {
        return new AgentReadObservationClassifier()
                .classify(call(fixture, args), JSON.writeValueAsString(output));
    }

    static AgentRuntimeToolCall call(Map<String, Object> fixture, Map<String, Object> args) {
        return AgentRuntimeToolCall.builder()
                .toolCallId("native-contract-call")
                .toolName(fixture.get("tool").toString())
                .arguments(args)
                .build();
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> map(Object value) {
        return (Map<String, Object>) value;
    }
}
