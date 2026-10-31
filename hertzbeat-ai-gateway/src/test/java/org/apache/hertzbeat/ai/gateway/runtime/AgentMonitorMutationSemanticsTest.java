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
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorMutationReceipt;
import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorMutationReceipt.Target;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

class AgentMonitorMutationSemanticsTest {
    static final Map<String, Object> PARAMS =
            Map.of("host", "127.0.0.1", "port", 18080, "ssl", false, "uri", "/health");
    static final Map<String, Object> CREATE =
            Map.of("name", "local-site", "app", "website", "intervals", 30, "params", PARAMS);
    static final Map<String, Object> FIELDS =
            Map.of(
                    "name",
                    "local-site",
                    "app",
                    "website",
                    "intervals",
                    30,
                    "collectionState",
                    "enabled");
    static final Map<String, String> SAFE_PARAMS =
            Map.of("host", "127.0.0.1", "port", "18080", "ssl", "false", "uri", "/health");

    static String receipt(String tool, Map<String, Object> args, Target... targets) {
        return JsonUtil.toJson(
                Map.of(
                        "mutation",
                        new AgentMonitorMutationReceipt(
                                AgentMonitorMutationReceipt.VERSION,
                                tool,
                                AgentToolPayloadHasher.normalizedArgumentsHash(args),
                                List.of(targets))));
    }

    static Map<String, Object> object(String json) {
        return JsonUtil.fromJson(json, Map.class);
    }

    static Map<String, Object> readback(
            long id, Map<String, Object> fields, Map<String, String> parameters) {
        var output = new LinkedHashMap<String, Object>(fields);
        output.put("monitorId", id);
        output.put("readbackVersion", AgentMonitorMutationReceipt.READBACK_VERSION);
        output.put("parameters", parameters);
        return output;
    }

    @Test
    void laterUnresolvedOrFailedChangeInvalidatesPriorVerification() {
        for (var status :
                List.of(
                        AgentToolStatus.RUNNING,
                        AgentToolStatus.FAILED,
                        AgentToolStatus.SUCCEEDED)) {
            var evidence = new AgentTaskEvidence();
            evidence.observe(
                    "create",
                    "monitor.create",
                    AgentToolRisk.CHANGE,
                    AgentToolStatus.SUCCEEDED,
                    CREATE,
                    receipt("monitor.create", CREATE, new Target(42L, FIELDS, SAFE_PARAMS)),
                    true);
            evidence.observe(
                    "get",
                    "monitor.get",
                    AgentToolRisk.READ,
                    AgentToolStatus.SUCCEEDED,
                    Map.of("monitorId", 42),
                    JsonUtil.toJson(readback(42, FIELDS, SAFE_PARAMS)),
                    true);
            assertEquals(1, evidence.verifiedCount());
            evidence.observe(
                    "later",
                    "monitor.update",
                    AgentToolRisk.CHANGE,
                    status,
                    Map.of("monitorId", 42, "updates", Map.of("intervals", 60)),
                    null,
                    false);
            assertEquals(0, evidence.verifiedCount());
        }
    }

    @Test
    void canonicalCreationReceiptRequiresEveryFieldParameterAndExactSavedId() {
        var target = new Target(42L, FIELDS, SAFE_PARAMS);
        String json = receipt("monitor.create", CREATE, target);
        var contract =
                AgentMonitorMutationSemantics.parse(
                        "monitor.create",
                        object(json),
                        AgentToolPayloadHasher.normalizedArgumentsHash(CREATE));
        assertNotNull(contract);
        assertTrue(AgentMonitorMutationSemantics.matchesRequest(contract, CREATE));
        var output = readback(42, FIELDS, SAFE_PARAMS);
        assertTrue(AgentMonitorMutationSemantics.matchesReadback(target, output));
        output.put("intervals", 60);
        assertFalse(AgentMonitorMutationSemantics.matchesReadback(target, output));
        output.put("intervals", 30);
        output.put("monitorId", 43L);
        assertFalse(AgentMonitorMutationSemantics.matchesReadback(target, output));
        output.put("monitorId", 42L);
        output.put(
                "parameters",
                Map.of("host", "other", "port", "18080", "ssl", "false", "uri", "/health"));
        assertFalse(AgentMonitorMutationSemantics.matchesReadback(target, output));
    }

    @Test
    void receiptCannotChangeToolHashOrTargetSet() {
        var target = new Target(42L, FIELDS, SAFE_PARAMS);
        String json = receipt("monitor.create", CREATE, target);
        assertNull(
                AgentMonitorMutationSemantics.parse(
                        "monitor.update",
                        object(json),
                        AgentToolPayloadHasher.normalizedArgumentsHash(CREATE)));
        assertNull(AgentMonitorMutationSemantics.parse("monitor.create", object(json), "wrong"));
        assertNull(
                AgentMonitorMutationSemantics.parse(
                        "monitor.create",
                        object(receipt("monitor.create", CREATE, target, target)),
                        AgentToolPayloadHasher.normalizedArgumentsHash(CREATE)));
    }

    @Test
    void updateAndPauseResumeAreBoundToOriginalExactIdsAndValues() {
        var goal =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.UPDATE,
                        "monitor",
                        1,
                        List.of(42L),
                        Map.of("intervals", 30));
        assertTrue(
                AgentMonitorMutationSemantics.permits(
                        goal,
                        "monitor.update",
                        Map.of("monitorId", 42, "updates", Map.of("intervals", 30))));
        assertFalse(
                AgentMonitorMutationSemantics.permits(
                        goal,
                        "monitor.update",
                        Map.of("monitorId", 43, "updates", Map.of("intervals", 30))));
        assertFalse(
                AgentMonitorMutationSemantics.permits(
                        goal,
                        "monitor.update",
                        Map.of("monitorId", 42, "updates", Map.of("intervals", 60))));
        assertFalse(
                AgentMonitorMutationSemantics.permits(
                        goal,
                        "monitor.update",
                        Map.of(
                                "monitorId",
                                42,
                                "updates",
                                Map.of("intervals", 30, "name", "extra"))));
        for (var op :
                List.of(
                        AgentTaskAssessment.Operation.PAUSE,
                        AgentTaskAssessment.Operation.RESUME)) {
            var exact =
                    new AgentTaskAssessment.Goal(
                            AgentTaskAssessment.Type.CHANGE,
                            op,
                            "monitor",
                            1,
                            List.of(42L),
                            Map.of());
            String tool = "monitor." + op.name().toLowerCase(java.util.Locale.ROOT);
            assertTrue(
                    AgentMonitorMutationSemantics.permits(
                            exact, tool, Map.of("monitorIds", List.of(42))));
            assertFalse(
                    AgentMonitorMutationSemantics.permits(
                            exact, tool, Map.of("monitorIds", List.of(42, 43))));
            var target =
                    new Target(
                            42L,
                            Map.of(
                                    "collectionState",
                                    op == AgentTaskAssessment.Operation.PAUSE
                                            ? "paused"
                                            : "enabled"),
                            Map.of());
            assertTrue(
                    AgentMonitorMutationSemantics.matchesReadback(
                            target, readback(42, target.fields(), Map.of())));
        }
    }

    @Test
    void typedMutationNeedsLaterCompleteReadbackAndLegacyIdentityNeverPromotes() {
        var evidence = new AgentTaskEvidence();
        String legacy = "{\"monitorId\":42,\"name\":\"local-site\",\"app\":\"website\"}";
        evidence.observe(
                "create",
                "monitor.create",
                AgentToolRisk.CHANGE,
                AgentToolStatus.SUCCEEDED,
                CREATE,
                legacy,
                true);
        evidence.observe(
                "get",
                "monitor.get",
                AgentToolRisk.READ,
                AgentToolStatus.SUCCEEDED,
                Map.of("monitorId", 42),
                legacy,
                true);
        assertEquals(0, evidence.verifiedCount());
        var typed = new AgentTaskEvidence();
        typed.observe(
                "create",
                "monitor.create",
                AgentToolRisk.CHANGE,
                AgentToolStatus.SUCCEEDED,
                CREATE,
                receipt("monitor.create", CREATE, new Target(42L, FIELDS, SAFE_PARAMS)),
                true);
        assertEquals(0, typed.verifiedCount());
        typed.observe(
                "get",
                "monitor.get",
                AgentToolRisk.READ,
                AgentToolStatus.SUCCEEDED,
                Map.of("monitorId", 42),
                JsonUtil.toJson(readback(42, FIELDS, SAFE_PARAMS)),
                true);
        assertEquals(1, typed.verifiedCount());
        assertTrue(
                typed.completes(
                        new AgentTaskAssessment.Goal(
                                AgentTaskAssessment.Type.CHANGE,
                                AgentTaskAssessment.Operation.CREATE,
                                "monitor",
                                1)));
    }

    @Test
    void discoveryAndExactUnsavedProbeArePrerequisitesNotCreationReceipts() {
        var evidence = new AgentTaskEvidence();
        assertNotNull(evidence.monitorCreatePrerequisite(CREATE));
        evidence.observe(
                "types",
                "monitor.types",
                AgentToolRisk.READ,
                AgentToolStatus.SUCCEEDED,
                Map.of(),
                "{\"website\":\"WEBSITE\"}",
                true);
        evidence.observe(
                "params",
                "monitor.type_params",
                AgentToolRisk.READ,
                AgentToolStatus.SUCCEEDED,
                Map.of("app", "website"),
                "[{\"field\":\"host\",\"required\":true},{\"field\":\"port\",\"required\":true,\"defaultValue\":80},{\"field\":\"ssl\",\"required\":true}]",
                true);
        assertNotNull(evidence.monitorCreatePrerequisite(CREATE));
        Map<String, Object> probeArgs = Map.of("app", "website", "parameters", SAFE_PARAMS);
        evidence.observe(
                "probe",
                "monitor.detect_draft",
                AgentToolRisk.CHANGE,
                AgentToolStatus.SUCCEEDED,
                probeArgs,
                JsonUtil.toJson(
                        Map.of(
                                "app",
                                "website",
                                "probeVersion",
                                "monitor-probe.v1",
                                "inputHash",
                                AgentToolPayloadHasher.normalizedArgumentsHash(probeArgs),
                                "probeCompleted",
                                true,
                                "persisted",
                                false,
                                "parameters",
                                SAFE_PARAMS,
                                "collector",
                                "")),
                true);
        assertNull(evidence.monitorCreatePrerequisite(CREATE));
        assertFalse(evidence.mutationAttempted());
        assertEquals(0, evidence.receiptCount());
        assertEquals(0, evidence.verifiedCount());
        var other = new LinkedHashMap<String, Object>(CREATE);
        other.put(
                "params",
                Map.of("host", "127.0.0.2", "port", 18080, "ssl", false, "uri", "/health"));
        assertNotNull(evidence.monitorCreatePrerequisite(other));
    }

    @Test
    void taskCheckpointBindsActorWorkspaceRunAndQuestionAndKeepsLegacyUnknown() {
        var ctx = context("original", "actor", "workspace", "run");
        var goal =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.CREATE,
                        "monitor",
                        1);
        var checkpoint = AgentTaskCheckpoint.forContext(ctx, goal, 64);
        assertTrue(checkpoint.validFor(ctx));
        assertFalse(checkpoint.validFor(context("changed", "actor", "workspace", "run")));
        assertFalse(checkpoint.validFor(context("original", "other", "workspace", "run")));
        assertFalse(checkpoint.validFor(context("original", "actor", "other", "run")));
        assertFalse(checkpoint.validFor(context("original", "actor", "workspace", "other")));
        var legacy =
                JsonUtil.fromJson(
                        "{\"role\":\"assistant\",\"content\":[]}", TranscriptMessage.class);
        assertNull(legacy.getTaskCheckpoint());
        legacy.setTaskCheckpoint(checkpoint);
        assertEquals(
                checkpoint,
                JsonUtil.fromJson(JsonUtil.toJson(legacy), TranscriptMessage.class)
                        .getTaskCheckpoint());
    }

    @Test
    void structuredGoalRejectsFractionalCountsAndResourceIdsInsteadOfTruncating() {
        String goal =
                "{\"type\":\"CHANGE\",\"operation\":\"UPDATE\",\"resourceType\":\"monitor\",\"expectedCount\":1,\"resourceIds\":[42],\"expectedChanges\":{\"intervals\":30}}";
        assertNotNull(
                AgentTaskCompletionReview.parseGoal(
                        AgentRuntimeModelResponse.finalAnswer(goal, null)));
        assertNull(
                AgentTaskCompletionReview.parseGoal(
                        AgentRuntimeModelResponse.finalAnswer(
                                goal.replace("[42]", "[42.5]"), null)));
        assertNull(
                AgentTaskCompletionReview.parseGoal(
                        AgentRuntimeModelResponse.finalAnswer(
                                goal.replace("\"expectedCount\":1", "\"expectedCount\":1.5"),
                                null)));
    }

    static AgentRuntimeContext context(
            String question, String actor, String workspace, String run) {
        return AgentRuntimeContext.builder()
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .channelId("isolated")
                .workspaceId(workspace)
                .actor(AgentActor.builder().type("user").id(actor).roles(List.of("user")).build())
                .userMessage(question)
                .sessionUid("session")
                .runUid(run)
                .runId(2L)
                .runSessionId(1L)
                .receivedAt(1L)
                .traceId("trace")
                .currentTimeIso("2026-10-18T00:00:00Z")
                .timezone("UTC")
                .chatHistory(List.of())
                .build();
    }
}
