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

import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Structured review parsing and rejection diagnostics, with no model or business effects. */
class AgentInhibitIntentMismatchTest {
    private static final String NAME = "ai-e2e-proposal-ux-20261022-1519";

    private Map<String, Object> config() {
        return Map.of(
                "name",
                NAME,
                "enable",
                false,
                "sourceLabels",
                Map.of("severity", "critical"),
                "targetLabels",
                Map.of("severity", "warning"),
                "equalLabels",
                List.of("host"));
    }

    private AgentTaskAssessment.Goal goal() {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                AgentTaskAssessment.Operation.CREATE,
                "alert_inhibit",
                1,
                List.of(),
                Map.of("name", NAME, "enable", false));
    }

    private AgentRuntimeContext context() {
        return AgentRuntimeContext.builder()
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .channelId("web-ui")
                .traceId("isolated-trace")
                .workspaceId("isolated")
                .actor(
                        AgentActor.builder()
                                .type("user")
                                .id("alice")
                                .roles(List.of("admin"))
                                .build())
                .sessionUid("session")
                .runUid("run")
                .runId(2L)
                .runSessionId(1L)
                .receivedAt(1L)
                .currentTimeIso("2026-10-22T07:20:00Z")
                .userMessage("Create exactly one disabled inhibition policy named " + NAME)
                .preferredLanguage("en")
                .timezone("UTC")
                .chatHistory(List.of())
                .build();
    }

    @Test
    void parsedCreateWithFalseAndNoExistingIdIsPermitted() {
        String json =
                "{\"type\":\"CHANGE\",\"operation\":\"CREATE\",\"resourceType\":\"alert_inhibit\",\"expectedCount\":1,\"resourceIds\":[],\"expectedChanges\":{\"name\":\""
                        + NAME
                        + "\",\"enable\":false}}";
        var goal =
                AgentTaskCompletionReview.parseGoal(
                        AgentRuntimeModelResponse.finalAnswer(json, null));
        assertNotNull(goal);
        assertTrue(goal.valid());
        assertEquals(false, goal.expectedChanges().get("enable"));
        var args = Map.<String, Object>of("configuration", config());
        assertNull(AgentAlertInhibitMutationSemantics.mismatch(goal, "alert_inhibit.create", args));
        assertTrue(AgentApplicationMutationSemantics.permits(goal, "alert_inhibit.create", args));
        assertTrue(AgentTaskCheckpoint.forContext(context(), goal, 64).validFor(context()));
    }

    @Test
    void nestedConfigurationAndResourceAliasGetPreciseReasonsButRemainRejected() {
        var nested =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.CREATE,
                        "alert_inhibit",
                        1,
                        List.of(),
                        Map.of("configuration", config()));
        var args = Map.<String, Object>of("configuration", config());
        assertEquals(
                "EXPECTED_CHANGE_FIELDS_UNSUPPORTED",
                AgentAlertInhibitMutationSemantics.mismatch(nested, "alert_inhibit.create", args));
        assertFalse(
                AgentApplicationMutationSemantics.permits(nested, "alert_inhibit.create", args));
        var alias =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.CREATE,
                        "alert_inhibition_policy",
                        1,
                        List.of(),
                        goal().expectedChanges());
        assertEquals(
                "RESOURCE_TYPE_MISMATCH",
                AgentAlertInhibitMutationSemantics.mismatch(alias, "alert_inhibit.create", args));
        assertFalse(AgentApplicationMutationSemantics.permits(alias, "alert_inhibit.create", args));
    }

    @Test
    void wrongToolOrInventedExistingIdRemainDenied() {
        var args = Map.<String, Object>of("configuration", config());
        assertEquals(
                "OPERATION_MISMATCH",
                AgentAlertInhibitMutationSemantics.mismatch(goal(), "alert_inhibit.update", args));
        var withId =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.CREATE,
                        "alert_inhibit",
                        1,
                        List.of(100L),
                        goal().expectedChanges());
        assertEquals(
                "CREATE_IDS_MUST_BE_EMPTY",
                AgentAlertInhibitMutationSemantics.mismatch(withId, "alert_inhibit.create", args));
        assertFalse(
                AgentApplicationMutationSemantics.permits(withId, "alert_inhibit.create", args));
    }

    @Test
    void falseVersusTrueAndNameMismatchDoNotLeakValuesInReasons() {
        var changed = new LinkedHashMap<>(config());
        changed.put("enable", true);
        assertEquals(
                "FIELD_MISMATCH_ENABLE",
                AgentAlertInhibitMutationSemantics.mismatch(
                        goal(), "alert_inhibit.create", Map.of("configuration", changed)));
        changed = new LinkedHashMap<>(config());
        changed.put("name", "SYNTHETIC_PRIVATE_NAME");
        assertEquals(
                "CREATE_NAME_MISMATCH",
                AgentAlertInhibitMutationSemantics.mismatch(
                        goal(), "alert_inhibit.create", Map.of("configuration", changed)));
    }

    @Test
    void missingFalseOrWrongConfigurationNestingHasAnExactShapeReason() {
        var changed = new LinkedHashMap<>(config());
        changed.remove("enable");
        assertEquals(
                "CONFIGURATION_KEYS_MISMATCH",
                AgentAlertInhibitMutationSemantics.mismatch(
                        goal(), "alert_inhibit.create", Map.of("configuration", changed)));
        assertEquals(
                "ARGUMENT_KEYS_MISMATCH",
                AgentAlertInhibitMutationSemantics.mismatch(
                        goal(), "alert_inhibit.create", config()));
    }

    @Test
    void reviewContractExplicitlyRequiresFlatIntentAndPreservesFalse() {
        String prompt =
                AgentTaskCompletionReview.goalRequest(context()).getPrompt().getInstructions();
        assertTrue(prompt.contains("resourceType exactly alert_inhibit"));
        assertTrue(prompt.contains("CREATE requires empty resourceIds"));
        assertTrue(prompt.contains("expectedChanges is FLAT"));
        assertTrue(prompt.contains("enable:false as boolean false"));
    }

    @Test
    void structureContainsOnlyFixedFieldPresenceTypesAndEquality() {
        var config = new LinkedHashMap<>(config());
        config.put("name", "SYNTHETIC_PRIVATE_VALUE");
        String structure =
                org.apache.hertzbeat.common.util.JsonUtil.toJson(
                        AgentAlertInhibitMutationSemantics.mismatchStructure(
                                goal(), Map.of("configuration", config)));
        assertFalse(structure.contains("SYNTHETIC_PRIVATE_VALUE"));
        assertFalse(structure.contains(NAME));
        assertTrue(structure.contains("expectedPresent"));
        assertTrue(structure.contains("BOOLEAN"));
        var missingName =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.CREATE,
                        "alert_inhibit",
                        1,
                        List.of(),
                        Map.of("enable", false));
        assertEquals(
                "CREATE_ORIGINAL_NAME_REQUIRED",
                AgentAlertInhibitMutationSemantics.mismatch(
                        missingName, "alert_inhibit.create", Map.of("configuration", config())));
    }
}
