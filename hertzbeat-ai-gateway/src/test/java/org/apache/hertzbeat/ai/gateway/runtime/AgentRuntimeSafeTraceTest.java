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

import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

/** Structural trace never records raw prompts, arbitrary names, claims or argument values. */
class AgentRuntimeSafeTraceTest {
    @Test
    void modelShapeDropsSensitiveTextUnknownToolArgumentsAndFinishReason() {
        var request =
                AgentRuntimeModelRequest.builder()
                        .prompt(
                                RuntimePrompt.builder()
                                        .instructions("PRIVATE_PROMPT")
                                        .blocks(List.of())
                                        .build())
                        .chatHistory(List.of(TranscriptMessage.userText("PRIVATE_REQUEST")))
                        .availableTools(List.of())
                        .maxCompletionTokens(2048)
                        .build();
        var response =
                AgentRuntimeModelResponse.toolCalls(
                        "PRIVATE_RESPONSE",
                        List.of(
                                AgentRuntimeToolCall.builder()
                                        .toolCallId("private-id")
                                        .toolName("PRIVATE_TOOL")
                                        .arguments(Map.of("PRIVATE_ARGUMENT", "PRIVATE_VALUE"))
                                        .build()),
                        null);
        String value =
                JsonUtil.toJson(
                        AgentRuntimeSafeTrace.modelShape(request, response, "PRIVATE_FINISH"));
        for (String privatePart : List.of("PRIVATE_", "private-id"))
            assertFalse(value.contains(privatePart));
        assertTrue(value.contains("UNADVERTISED"));
        assertTrue(value.contains("argumentCount"));
        assertEquals("OTHER", AgentRuntimeSafeTrace.finishReason("PRIVATE_FINISH"));
        assertEquals("length", AgentRuntimeSafeTrace.finishReason("LENGTH"));
        assertEquals("NOT_ADVERTISED", AgentRuntimeSafeTrace.finishReason(null));
    }

    @Test
    void reviewShapeKeepsReasonsAndGoalEqualityWithoutValuesOrClaims() {
        var goal =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.UPDATE,
                        "PRIVATE_RESOURCE",
                        1,
                        List.of(918273L),
                        Map.of("name", "PRIVATE_NAME"));
        var assessment =
                new AgentTaskAssessment(
                        goal, AgentTaskOutcome.Stage.NOT_EXECUTED, false, List.of());
        String shape = JsonUtil.toJson(AgentRuntimeSafeTrace.assessmentShape(assessment, goal));
        assertFalse(shape.contains("PRIVATE_"));
        assertFalse(shape.contains("918273"));
        assertTrue(shape.contains("boundGoalMatches"));
        assertTrue(shape.contains("NOT_EXECUTED"));
    }

    @Test
    void completionParserDistinguishesMalformedUnexpectedAndInvalidWithoutChangingParseBehavior() {
        assertEquals("EMPTY_RESPONSE", AgentTaskCompletionReview.readAssessment(null).failure());
        var malformed = AgentRuntimeModelResponse.finalAnswer("PRIVATE_INVALID_JSON", null);
        assertEquals(
                "MALFORMED_ASSESSMENT",
                AgentTaskCompletionReview.readAssessment(malformed).failure());
        assertEquals(null, AgentTaskCompletionReview.parse(malformed));
        var tools =
                AgentRuntimeModelResponse.toolCalls(
                        "",
                        List.of(
                                AgentRuntimeToolCall.builder()
                                        .toolCallId("call")
                                        .toolName("tool.search")
                                        .arguments(Map.of())
                                        .build()),
                        null);
        assertEquals(
                "UNEXPECTED_RESPONSE_TYPE",
                AgentTaskCompletionReview.readAssessment(tools).failure());
    }

    @Test
    void rawReviewJsonAndRequestStructuresNeverExposeValuesOrUnknownKeys() {
        String raw =
                JsonUtil.toJson(
                        Map.of(
                                "goal",
                                Map.of(
                                        "expectedChanges",
                                        Map.of("name", "PRIVATE_VALUE"),
                                        "resourceIds",
                                        List.of(918273L)),
                                "PRIVATE_KEY",
                                "PRIVATE_VALUE",
                                "stage",
                                "PRIVATE_STAGE"));
        String shape = JsonUtil.toJson(AgentRuntimeSafeTrace.reviewJsonShape(raw));
        assertFalse(shape.contains("PRIVATE_"));
        assertFalse(shape.contains("918273"));
        assertTrue(shape.contains("expectedChanges"));
        String request =
                JsonUtil.toJson(
                        Map.of(
                                "originalQuestion",
                                "PRIVATE_QUESTION",
                                "candidateAnswer",
                                "PRIVATE_ANSWER",
                                "facts",
                                List.of(
                                        Map.of(
                                                "kind",
                                                "OBSERVATION",
                                                "PRIVATE_KEY",
                                                "PRIVATE_VALUE"))));
        String requestShape = JsonUtil.toJson(AgentRuntimeSafeTrace.reviewRequestShape(request));
        assertFalse(requestShape.contains("PRIVATE_"));
        assertTrue(requestShape.contains("OBSERVATION"));
        assertTrue(requestShape.contains("factCount"));
    }
}
