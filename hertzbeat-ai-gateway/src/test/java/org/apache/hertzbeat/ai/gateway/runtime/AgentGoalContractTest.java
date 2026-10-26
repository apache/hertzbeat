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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

class AgentGoalContractTest {
    private AgentTaskAssessment.Goal create(int count, int targets) {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                AgentTaskAssessment.Operation.CREATE,
                "monitor",
                count,
                List.of(),
                Map.of(),
                IntStream.range(0, targets)
                        .mapToObj(
                                i ->
                                        new AgentTaskAssessment.CreateTarget(
                                                "local-" + i, "http://127.0.0.1:1/" + i, 60))
                        .toList());
    }

    @Test
    void authorizedChoiceOfFiftyTargetsProducesValidFrozenCreatePlan() {
        var goal = create(50, 50);
        var parsed =
                AgentTaskCompletionReview.readGoal(
                        AgentRuntimeModelResponse.finalAnswer(JsonUtil.toJson(goal), null));
        assertEquals(goal, parsed.goal());
        assertTrue(parsed.goal().valid());
        var plan = new AgentMonitorBatch("contract-fifty");
        plan.initialize(parsed.goal());
        assertEquals(50, plan.snapshot().items().size());
        assertTrue(
                plan.snapshot().items().stream()
                        .allMatch(item -> item.status() == AgentMonitorBatch.Status.PENDING));
    }

    @Test
    void missingAndPartialPlansCannotAuthorizeAnIncompleteBatch() {
        for (int count : List.of(1, 10, 49)) {
            var goal = create(50, count);
            assertFalse(goal.valid());
            assertThrows(
                    IllegalArgumentException.class,
                    () -> new AgentMonitorBatch("contract-fifty").initialize(goal));
        }
        var empty = create(50, 0);
        assertTrue(empty.valid(), "An unresolved goal is distinct from an executable plan");
        assertThrows(
                IllegalArgumentException.class,
                () -> new AgentMonitorBatch("contract-fifty").initialize(empty));
    }

    @Test
    void generatedSchemaDescribesCrossFieldConstraintsAndDoesNotRequireIrrelevantDefaultFields() {
        var context =
                AgentMonitorMutationSemanticsTest.context(
                        "Create fifty website monitors; choose the websites yourself",
                        "owner",
                        "isolated",
                        "contract-run");
        String instructions =
                AgentTaskCompletionReview.goalRequest(context).getPrompt().getInstructions();
        int start = instructions.indexOf("```{") + 3;
        int end = instructions.lastIndexOf("}```") + 1;
        Map<String, Object> schema =
                JsonUtil.fromJson(instructions.substring(start, end), Map.class);
        var required = (List<?>) schema.get("required");
        assertFalse(
                required.contains("expectedCount"),
                "Ordinary questions allow an absent count; mutations still require one through"
                        + " Goal.valid");
        assertFalse(required.contains("createTargets"));
        assertFalse(required.contains("resourceIds"));
        assertFalse(required.contains("expectedChanges"));
        var properties = (Map<String, Map<String, Object>>) schema.get("properties");
        assertTrue(
                properties
                        .get("createTargets")
                        .get("description")
                        .toString()
                        .contains("expectedCount"));
        assertTrue(
                properties.get("resourceType").get("description").toString().contains("monitor"));
        assertTrue(instructions.contains("user-authorized target"));
        assertTrue(instructions.contains("original count"));
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.MethodSource("invalidStructures")
    void rejectedStructuresExposeFixedRulesWithoutTheirContents(
            AgentTaskAssessment.Goal goal, String expectedRule) {
        assertFalse(goal.valid());
        assertEquals(expectedRule, goal.validationFailure().name());
        assertFalse(goal.validationFailure().field().isBlank());
        assertTrue(
                goal.structure().values().stream()
                        .allMatch(value -> value instanceof Boolean || value instanceof Integer));
    }

    static java.util.stream.Stream<org.junit.jupiter.params.provider.Arguments>
            invalidStructures() {
        var t = new AgentGoalContractTest();
        var change = AgentTaskAssessment.Type.CHANGE;
        var create = AgentTaskAssessment.Operation.CREATE;
        var one = t.create(1, 1).createTargets();
        return java.util.stream.Stream.of(
                org.junit.jupiter.params.provider.Arguments.of(
                        new AgentTaskAssessment.Goal(null, create, "monitor", 1), "TYPE_REQUIRED"),
                org.junit.jupiter.params.provider.Arguments.of(
                        new AgentTaskAssessment.Goal(change, null, "monitor", 1),
                        "OPERATION_REQUIRED"),
                org.junit.jupiter.params.provider.Arguments.of(
                        new AgentTaskAssessment.Goal(
                                AgentTaskAssessment.Type.OBSERVATION, create, "monitor", 1),
                        "TYPE_OPERATION_MISMATCH"),
                org.junit.jupiter.params.provider.Arguments.of(
                        new AgentTaskAssessment.Goal(change, create, null, 1),
                        "RESOURCE_TYPE_REQUIRED"),
                org.junit.jupiter.params.provider.Arguments.of(
                        new AgentTaskAssessment.Goal(change, create, "x".repeat(81), 1),
                        "RESOURCE_TYPE_TOO_LONG"),
                org.junit.jupiter.params.provider.Arguments.of(
                        t.create(0, 0), "EXPECTED_COUNT_POSITIVE"),
                org.junit.jupiter.params.provider.Arguments.of(
                        new AgentTaskAssessment.Goal(change, create, "monitor", null),
                        "EXPECTED_COUNT_REQUIRED"),
                org.junit.jupiter.params.provider.Arguments.of(
                        t.create(51, 51), "CREATE_TARGET_LIMIT"),
                org.junit.jupiter.params.provider.Arguments.of(
                        new AgentTaskAssessment.Goal(
                                change,
                                AgentTaskAssessment.Operation.DELETE,
                                "monitor",
                                1,
                                List.of(),
                                Map.of(),
                                one),
                        "CREATE_TARGET_OPERATION"),
                org.junit.jupiter.params.provider.Arguments.of(
                        new AgentTaskAssessment.Goal(
                                change, create, "website", 1, List.of(), Map.of(), one),
                        "CREATE_TARGET_RESOURCE"),
                org.junit.jupiter.params.provider.Arguments.of(
                        t.create(50, 49), "CREATE_TARGET_COUNT"),
                org.junit.jupiter.params.provider.Arguments.of(
                        new AgentTaskAssessment.Goal(
                                change,
                                create,
                                "monitor",
                                1,
                                java.util.stream.LongStream.rangeClosed(1, 101).boxed().toList(),
                                Map.of()),
                        "RESOURCE_ID_LIMIT"),
                org.junit.jupiter.params.provider.Arguments.of(
                        new AgentTaskAssessment.Goal(
                                change, create, "monitor", 1, List.of(-1L), Map.of()),
                        "RESOURCE_ID_POSITIVE"),
                org.junit.jupiter.params.provider.Arguments.of(
                        new AgentTaskAssessment.Goal(
                                change, create, "monitor", 1, List.of(1L, 1L), Map.of()),
                        "RESOURCE_ID_DUPLICATE"),
                org.junit.jupiter.params.provider.Arguments.of(
                        new AgentTaskAssessment.Goal(
                                change,
                                AgentTaskAssessment.Operation.UPDATE,
                                "monitor",
                                2,
                                List.of(1L),
                                Map.of("intervals", 60)),
                        "RESOURCE_ID_COUNT"),
                org.junit.jupiter.params.provider.Arguments.of(
                        new AgentTaskAssessment.Goal(
                                change,
                                AgentTaskAssessment.Operation.UPDATE,
                                "monitor",
                                1,
                                List.of(1L),
                                Map.of()),
                        "EXPECTED_CHANGES_REQUIRED"));
    }

    @Test
    void omittedDefaultFieldsRemainSafeForQuestionsAndNewCreates() {
        var ordinary =
                AgentTaskCompletionReview.readGoal(
                        AgentRuntimeModelResponse.finalAnswer(
                                "{\"type\":\"GENERAL\",\"operation\":\"EXPLAIN\",\"resourceType\":\"general\"}",
                                null));
        assertTrue(ordinary.goal().valid());
        assertTrue(ordinary.goal().resourceIds().isEmpty());
        assertTrue(ordinary.goal().createTargets().isEmpty());
        var missingCount =
                AgentTaskCompletionReview.readGoal(
                        AgentRuntimeModelResponse.finalAnswer(
                                "{\"type\":\"CHANGE\",\"operation\":\"CREATE\",\"resourceType\":\"monitor\"}",
                                null));
        assertFalse(missingCount.goal().valid());
        assertEquals("EXPECTED_COUNT_REQUIRED", missingCount.goal().validationFailure().name());
    }
}
