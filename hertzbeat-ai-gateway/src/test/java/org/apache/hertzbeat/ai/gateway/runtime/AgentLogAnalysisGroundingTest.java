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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

class AgentLogAnalysisGroundingTest {
    private static final String DATA = """
            {"code":0,"data":{"window":{"start":1792321267091,"end":1792323067091},"field":null,
            "view":"groups","limit":20,"order":"count-desc","minCount":1,"matchingTotal":254,
            "truncated":false,"intervalMs":null,"groups":[{"kind":"all","value":null,"count":254,"buckets":[]}]},"msg":null}
            """;
    private static final String OUTPUT = JsonUtil.toJson(Map.of("data", DATA, "projectionTruncated", false,
            "partial", false, "format", "json_text", "maxCharacters", 24000));

    @Test
    void groundsTheRealWholeWindowAggregateWithoutServiceFilter() {
        var observed = classify(OUTPUT);
        assertNotNull(observed);
        assertEquals("log-aggregate", observed.kind());
        assertEquals(1, observed.count());
    }

    @Test
    void supportsOmittedCountMeasureAndCountsLargerThanInteger() {
        var query = query();
        query.remove("measure");
        assertNotNull(new AgentReadObservationClassifier().classify(call(query), OUTPUT.replace("254", "3000000000")));
    }

    @Test
    @SuppressWarnings("unchecked")
    void acceptsSuccessfulZeroCountWithoutInventingSamples() {
        var envelope = object(OUTPUT);
        var data = object((String) envelope.get("data"));
        var aggregate = (Map<String, Object>) data.get("data");
        aggregate.put("matchingTotal", 0);
        aggregate.put("groups", List.of());
        envelope.put("data", JsonUtil.toJson(data));
        var observation = classify(JsonUtil.toJson(envelope));
        assertNotNull(observation);
        assertEquals(0, observation.count());
    }

    @Test
    @SuppressWarnings("unchecked")
    void rejectsWrongWindowTruncatedProjectionOrWrongPopulation() {
        var query = query();
        query.put("end", 1792323067092L);
        assertNull(new AgentReadObservationClassifier().classify(call(query), OUTPUT));
        assertNull(classify(OUTPUT.replace("\"projectionTruncated\":false", "\"projectionTruncated\":true")));
        var envelope = object(OUTPUT);
        var data = object((String) envelope.get("data"));
        ((Map<String, Object>) data.get("data")).put("matchingTotal", 255);
        envelope.put("data", JsonUtil.toJson(data));
        assertNull(classify(JsonUtil.toJson(envelope)));
    }

    @Test
    void rejectsFractionalCountsAndMissingAggregateMetadata() {
        assertNull(classify(OUTPUT.replace("254", "254.5")));
        var envelope = object(OUTPUT);
        var data = object((String) envelope.get("data"));
        ((Map<?, ?>) data.get("data")).remove("matchingTotal");
        envelope.put("data", JsonUtil.toJson(data));
        assertNull(classify(JsonUtil.toJson(envelope)));
    }

    @Test
    void oneAggregateReadCompletesWithMockModelAndDurableProof() {
        var bridge = mock(AgentToolBridge.class);
        when(bridge.visibleTools()).thenReturn(List.of());
        when(bridge.discoverableTools(any(), any(), any())).thenReturn(List.of());
        when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(result());
        String answer = "There are 254 logs in the requested half-hour window.";
        var replies = new ArrayDeque<>(List.of(AgentRuntimeModelResponse.toolCalls("", List.of(call(query())), null),
                AgentRuntimeModelResponse.finalAnswer(answer, null)));
        int[] modelCalls = {0};
        AgentRuntimeModelClient model = (request, control, delta) -> {
            modelCalls[0]++;
            return replies.remove();
        };
        var context = context();
        var transcript = new ArrayList<TranscriptMessage>();
        var events = new ArrayList<AgentRuntimeEvent>();
        try (var control = AgentRuntimeControl.forContext(context, Clock.systemUTC())) {
            new AgentRuntimeLoop(new AgentRuntimeProperties(), AgentTaskCompletionTestClient.observation(model, "logs"), bridge, Clock.systemUTC())
                    .run(context, control, events::add, message -> {
                        transcript.add(message);
                        return (long) transcript.size();
                    });
        }
        assertEquals(2, modelCalls[0]);
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, events.getLast().getType());
        assertEquals(answer, transcript.getLast().text());
        var proof = transcript.stream().filter(message -> message.getGroundingProof() != null).findFirst().orElseThrow();
        var evaluator = new AgentReadGroundingEvaluator();
        assertTrue(evaluator.restores(proof, "local-count", call(query()).getArguments()));
        assertFalse(evaluator.restores(proof.toBuilder()
                .content(List.of(TranscriptContent.text(OUTPUT.replace("254", "255")))).build(),
                "local-count", call(query()).getArguments()));
        verify(bridge, times(1)).execute(any(), any(), any(), any(), any());
    }

    @Test
    void typedTaskEvidenceKeepsPopulation254SeparateFromOneAggregate() {
        var evidence = new AgentTaskEvidence();
        evidence.observe("log-count", "logs.analysis", AgentToolRisk.READ, AgentToolStatus.SUCCEEDED,
                Map.of("q", query()), OUTPUT, true);
        assertTrue(evidence.claimsMatch(List.of(new AgentTaskAssessment.Claim("log-count/matchingTotal", "254"),
                new AgentTaskAssessment.Claim("log-count/observationCount", "1"))));
        assertFalse(evidence.claimsMatch(List.of(new AgentTaskAssessment.Claim("log-count/observationCount", "254"))));
    }

    private AgentRuntimeContext context() {
        return AgentRuntimeContext.builder().entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION).channelId("local-replay")
                .workspaceId("default").receivedAt(1L)
                .actor(AgentActor.builder().type("user").id("local-replay").roles(List.of("user")).build())
                .userMessage("How many logs in the last half hour?").sessionUid("local-replay").runId(2L)
                .runUid("local-count").runSessionId(1L).currentTimeIso("2026-10-18T11:31:07Z").timezone("UTC")
                .traceId("local-replay").chatHistory(List.of()).build();
    }

    private AgentToolExecutionResult result() {
        return AgentToolExecutionResult.builder().toolCallId("log-count").toolName("logs.analysis")
                .risk(AgentToolRisk.READ).status(AgentToolStatus.SUCCEEDED).decision(AgentPolicyDecision.ALLOW)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED).output(OUTPUT).build();
    }

    private AgentRuntimeToolCall call(Map<String, Object> query) {
        return AgentRuntimeToolCall.builder().toolCallId("log-count").toolName("logs.analysis")
                .arguments(Map.of("q", query)).build();
    }

    private Map<String, Object> query() {
        return new LinkedHashMap<>(Map.of("start", 1792321267091L, "end", 1792323067091L,
                "measure", "{\"function\":\"count\"}"));
    }

    private AgentReadObservationClassifier.Observation classify(String output) {
        return new AgentReadObservationClassifier().classify(call(query()), output);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> object(String value) {
        return JsonUtil.fromJson(value, Map.class);
    }
}
