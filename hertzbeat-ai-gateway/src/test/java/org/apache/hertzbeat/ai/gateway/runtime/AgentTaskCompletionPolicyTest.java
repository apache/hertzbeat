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
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

class AgentTaskCompletionPolicyTest {
    static AgentTaskAssessment assessment(
            AgentTaskAssessment.Type type,
            AgentTaskAssessment.Operation operation,
            Integer count,
            AgentTaskOutcome.Stage stage,
            List<AgentTaskAssessment.Claim> claims) {
        return new AgentTaskAssessment(
                new AgentTaskAssessment.Goal(
                        type,
                        operation,
                        type == AgentTaskAssessment.Type.GENERAL ? "conversation" : "monitor",
                        count),
                stage,
                true,
                claims);
    }

    static AgentTaskAssessment create(int count) {
        return assessment(
                AgentTaskAssessment.Type.CHANGE,
                AgentTaskAssessment.Operation.CREATE,
                count,
                AgentTaskOutcome.Stage.COMPLETE,
                List.of());
    }

    static void read(
            AgentTaskEvidence evidence,
            String id,
            String tool,
            Map<String, Object> args,
            String output) {
        evidence.observe(
                id, tool, AgentToolRisk.READ, AgentToolStatus.SUCCEEDED, args, output, true);
    }

    @Test
    void greetingNeedsNoToolAndKeepsGeneralGoal() {
        var decision =
                new AgentTaskCompletionPolicy()
                        .assess(
                                assessment(
                                        AgentTaskAssessment.Type.GENERAL,
                                        AgentTaskAssessment.Operation.EXPLAIN,
                                        null,
                                        AgentTaskOutcome.Stage.COMPLETE,
                                        List.of()),
                                new AgentTaskEvidence(),
                                true,
                                true);
        assertEquals(AgentTaskOutcome.Stage.COMPLETE, decision.outcome().stage());
        assertTrue(decision.publishCandidate());
    }

    @Test
    void matchingTotalAndSampleRemainDistinct() {
        var evidence = new AgentTaskEvidence();
        read(
                evidence,
                "query",
                "monitor.query",
                Map.of(),
                "{\"content\":[{\"monitorId\":42}],\"totalElements\":6}");
        var original =
                assessment(
                        AgentTaskAssessment.Type.OBSERVATION,
                        AgentTaskAssessment.Operation.QUERY,
                        null,
                        AgentTaskOutcome.Stage.COMPLETE,
                        List.of(
                                new AgentTaskAssessment.Claim("query/matchingTotal", "6"),
                                new AgentTaskAssessment.Claim("query/returnedRows", "1")));
        assertEquals(
                AgentTaskOutcome.Stage.COMPLETE,
                new AgentTaskCompletionPolicy()
                        .assess(original, evidence, true, false)
                        .outcome()
                        .stage());
        var wrong =
                new AgentTaskAssessment(
                        original.goal(),
                        original.stage(),
                        true,
                        List.of(new AgentTaskAssessment.Claim("query/returnedRows", "6")));
        assertFalse(
                new AgentTaskCompletionPolicy()
                        .assess(wrong, evidence, true, false)
                        .publishCandidate());
    }

    @Test
    void createFiftyWithEmptyDedupeCannotCompleteAndOnlyOneCorrection() {
        var evidence = new AgentTaskEvidence();
        read(evidence, "query", "monitor.query", Map.of(), "{\"content\":[],\"totalElements\":0}");
        var policy = new AgentTaskCompletionPolicy();
        var first = policy.assess(create(50), evidence, true, true);
        assertEquals(AgentTaskOutcome.Stage.NOT_EXECUTED, first.outcome().stage());
        assertTrue(first.continuePlanning());
        assertFalse(first.publishCandidate());
        assertFalse(policy.assess(create(50), evidence, true, true).continuePlanning());
        assertEquals(50, first.outcome().goal().expectedCount());
    }

    @Test
    void truthfulPlanRemainsNaturalButCannotBecomeBusinessCompletion() {
        var plan =
                new AgentTaskAssessment(
                        create(50).goal(), AgentTaskOutcome.Stage.PLANNED, true, List.of());
        var evidence = new AgentTaskEvidence();
        var policy = new AgentTaskCompletionPolicy();
        assertTrue(policy.assess(plan, evidence, true, true).continuePlanning());
        var finalPlan = policy.assess(plan, evidence, true, true);
        assertEquals(AgentTaskOutcome.Stage.PLANNED, finalPlan.outcome().stage());
        assertTrue(finalPlan.publishCandidate());
        assertFalse(finalPlan.continuePlanning());
        assertEquals(0, finalPlan.outcome().receiptCount());
    }

    @Test
    void discoveryAndNativeNavigationAreNotMutationReceipts() {
        var evidence = new AgentTaskEvidence();
        read(evidence, "search", "tool.search", Map.of(), "{}");
        read(
                evidence,
                "native",
                "native.monitor_import",
                Map.of(),
                "{\"delivery\":\"native_handoff\",\"executionStatus\":\"NOT_EXECUTED\"}");
        assertEquals(
                List.of(AgentTaskEvidence.Kind.DISCOVERY, AgentTaskEvidence.Kind.NATIVE_HANDOFF),
                evidence.facts().stream().map(AgentTaskEvidence.Fact::kind).toList());
        assertEquals(
                0,
                new AgentTaskCompletionPolicy()
                        .assess(create(50), evidence, true, false)
                        .outcome()
                        .receiptCount());
    }

    @Test
    void receiptAndExactLaterReadbackBothRequiredAndDuplicateIdsDoNotInflateCount() {
        var evidence = new AgentTaskEvidence();
        var args = AgentMonitorMutationSemanticsTest.CREATE;
        var target =
                new org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorMutationReceipt.Target(
                        42L,
                        AgentMonitorMutationSemanticsTest.FIELDS,
                        AgentMonitorMutationSemanticsTest.SAFE_PARAMS);
        String receipt = AgentMonitorMutationSemanticsTest.receipt("monitor.create", args, target);
        String readback =
                org.apache.hertzbeat.common.util.JsonUtil.toJson(
                        AgentMonitorMutationSemanticsTest.readback(
                                42, target.fields(), target.parameters()));
        read(evidence, "before", "monitor.get", Map.of("monitorId", 42), readback);
        evidence.observe(
                "create",
                "monitor.create",
                AgentToolRisk.CHANGE,
                AgentToolStatus.SUCCEEDED,
                args,
                receipt,
                true);
        assertEquals(0, evidence.verifiedCount());
        assertEquals(
                AgentTaskOutcome.Stage.PARTIAL,
                new AgentTaskCompletionPolicy()
                        .assess(create(1), evidence, true, true)
                        .outcome()
                        .stage());
        read(
                evidence,
                "unrelated",
                "monitor.get",
                Map.of("monitorId", 43),
                readback.replace("42", "43"));
        assertEquals(0, evidence.verifiedCount());
        read(evidence, "after", "monitor.get", Map.of("monitorId", 42), readback);
        evidence.observe(
                "duplicate",
                "monitor.create",
                AgentToolRisk.CHANGE,
                AgentToolStatus.SUCCEEDED,
                args,
                receipt,
                true);
        assertEquals(1, evidence.receiptCount());
        assertEquals(0, evidence.verifiedCount());
        read(evidence, "after-duplicate", "monitor.get", Map.of("monitorId", 42), readback);
        assertEquals(
                AgentTaskOutcome.Stage.COMPLETE,
                new AgentTaskCompletionPolicy()
                        .assess(create(1), evidence, true, false)
                        .outcome()
                        .stage());
        assertEquals(
                AgentTaskOutcome.Stage.COMPLETE,
                new AgentTaskCompletionPolicy()
                        .assess(create(1), evidence, false, false)
                        .outcome()
                        .stage());
        assertEquals(
                AgentTaskOutcome.Stage.PARTIAL,
                new AgentTaskCompletionPolicy()
                        .assess(create(50), evidence, true, true)
                        .outcome()
                        .stage());
    }

    @Test
    void conflictingReceiptCannotReuseEarlierReadbackOrClaimGeneralCompletion() {
        var evidence = new AgentTaskEvidence();
        String receipt = "{\"monitorId\":42,\"name\":\"demo\",\"app\":\"website\"}";
        var args = Map.<String, Object>of("name", "demo", "app", "website");
        evidence.observe(
                "create",
                "monitor.create",
                AgentToolRisk.CHANGE,
                AgentToolStatus.SUCCEEDED,
                args,
                receipt,
                true);
        read(evidence, "get", "monitor.get", Map.of("monitorId", 42), receipt);
        var general =
                assessment(
                        AgentTaskAssessment.Type.GENERAL,
                        AgentTaskAssessment.Operation.EXPLAIN,
                        null,
                        AgentTaskOutcome.Stage.COMPLETE,
                        List.of());
        assertFalse(
                new AgentTaskCompletionPolicy()
                        .assess(general, evidence, true, true)
                        .publishCandidate());
        evidence.observe(
                "conflict",
                "monitor.create",
                AgentToolRisk.CHANGE,
                AgentToolStatus.SUCCEEDED,
                Map.of("name", "other", "app", "website"),
                receipt.replace("demo", "other"),
                true);
        assertEquals(
                AgentTaskOutcome.Stage.RECOVERY_REQUIRED,
                new AgentTaskCompletionPolicy()
                        .assess(create(1), evidence, true, true)
                        .outcome()
                        .stage());
    }

    @Test
    void indeterminateOrUndurableMutationNeverRetries() {
        for (boolean durable : List.of(true, false)) {
            var evidence = new AgentTaskEvidence();
            evidence.observe(
                    "write",
                    "monitor.create",
                    AgentToolRisk.CHANGE,
                    AgentToolStatus.SUCCEEDED,
                    Map.of(),
                    "{}",
                    durable);
            var decision = new AgentTaskCompletionPolicy().assess(create(1), evidence, true, true);
            assertEquals(AgentTaskOutcome.Stage.RECOVERY_REQUIRED, decision.outcome().stage());
            assertFalse(decision.continuePlanning());
        }
    }

    @Test
    void deniedAndPendingHaveNoReceiptAndCannotRetryOrClaimCompletion() {
        for (var status :
                List.of(
                        AgentToolStatus.DENIED,
                        AgentToolStatus.WAITING_APPROVAL,
                        AgentToolStatus.FAILED)) {
            var evidence = new AgentTaskEvidence();
            evidence.observe(
                    "write", "monitor.create", AgentToolRisk.CHANGE, status, Map.of(), "{}", true);
            var decision = new AgentTaskCompletionPolicy().assess(create(1), evidence, true, true);
            assertNotEquals(AgentTaskOutcome.Stage.COMPLETE, decision.outcome().stage());
            assertEquals(0, decision.outcome().receiptCount());
            assertFalse(decision.continuePlanning());
        }
    }

    @Test
    void goalCannotShrinkAfterCorrectionAndInvalidReviewFailsClosed() {
        var policy = new AgentTaskCompletionPolicy();
        policy.assess(create(50), new AgentTaskEvidence(), true, true);
        assertEquals(
                AgentTaskOutcome.Stage.UNKNOWN,
                policy.assess(create(1), new AgentTaskEvidence(), true, true).outcome().stage());
        assertFalse(
                new AgentTaskCompletionPolicy()
                        .assess(null, new AgentTaskEvidence(), true, true)
                        .publishCandidate());
    }

    @Test
    void legacyHistoryHasUnknownTaskOutcomeAndNewOutcomeRoundTrips() {
        var legacy =
                JsonUtil.fromJson(
                        "{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"Old"
                                + " answer\"}]}",
                        TranscriptMessage.class);
        assertNull(legacy.getTaskOutcome());
        assertFalse(JsonUtil.toJson(legacy).contains("taskOutcome"));
        legacy.setTaskOutcome(
                new AgentTaskOutcome(create(50).goal(), AgentTaskOutcome.Stage.NOT_EXECUTED, 0, 0));
        assertEquals(
                legacy.getTaskOutcome(),
                JsonUtil.fromJson(JsonUtil.toJson(legacy), TranscriptMessage.class)
                        .getTaskOutcome());
    }

    @Test
    void springAiStructuredConverterParsesTypedAssessmentAndRejectsMalformed() {
        assertEquals(
                create(50),
                AgentTaskCompletionReview.parse(
                        AgentRuntimeModelResponse.finalAnswer(JsonUtil.toJson(create(50)), null)));
        assertNull(
                AgentTaskCompletionReview.parse(
                        AgentRuntimeModelResponse.finalAnswer("invalid", null)));
    }
}
