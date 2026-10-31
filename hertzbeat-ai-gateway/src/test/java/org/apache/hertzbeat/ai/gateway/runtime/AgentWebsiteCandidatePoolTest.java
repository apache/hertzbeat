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

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

class AgentWebsiteCandidatePoolTest {
    private AgentTaskAssessment.Goal goal(int count, int interval, int timeout) {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                AgentTaskAssessment.Operation.CREATE,
                "monitor",
                count,
                List.of(),
                Map.of(
                        "app",
                        "website",
                        "intervals",
                        interval,
                        "params",
                        Map.of("timeout", timeout)),
                IntStream.range(0, count)
                        .mapToObj(
                                index ->
                                        new AgentTaskAssessment.CreateTarget(
                                                "Site " + index,
                                                "https://site" + index + ".org/",
                                                interval,
                                                "key-" + index,
                                                timeout))
                        .toList());
    }

    private void sample(AgentWebsiteCandidatePool pool, int index, boolean existing) {
        pool.record(
                Map.of(
                        "domain",
                        "site" + index + ".org",
                        "state",
                        existing ? "EXISTING" : "NOT_CHECKED",
                        "reason",
                        existing ? "WEBSITE_ALREADY_MONITORED" : "APPROVAL_REQUIRED_NATIVE_PROBE"));
    }

    @Test
    void authorizedSnapshotExcludesCanonicalLegacyHostsWithoutOverridingInvalidNativeResults() {
        var pool = new AgentWebsiteCandidatePool(goal(2, 600, 3000));
        pool.record(
                Map.of(
                        "domain",
                        "www.example.org",
                        "state",
                        "NOT_CHECKED",
                        "reason",
                        "APPROVAL_REQUIRED_NATIVE_PROBE"),
                true);
        assertEquals(1, pool.checkedCount());
        assertEquals(2, pool.missingCount());
        var excluded = (List<Map<String, Object>>) pool.feedback().get("excludedCandidates");
        assertEquals("AUTHORIZED_EXCLUSION_SNAPSHOT", excluded.getFirst().get("source"));
        assertEquals("www.example.org", excluded.getFirst().get("domain"));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        pool.record(
                                Map.of(
                                        "domain",
                                        "unknown.org",
                                        "state",
                                        "NOT_CHECKED",
                                        "reason",
                                        "CANDIDATE_BUDGET_EXHAUSTED"),
                                true));
        assertEquals(1, pool.checkedCount());
    }

    @Test
    void realQaRowsReconcileSelectionAndExplicitUnexaminedOverflow() throws Exception {
        Map<?, ?> fixture;
        try (var input =
                getClass()
                        .getResourceAsStream("/fixtures/website-budget-run-697857938849024.json")) {
            fixture =
                    org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                            new String(
                                    input.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8),
                            Map.class);
        }
        var plans = (List<Map<String, Object>>) fixture.get("plans");
        var preflights = (List<Map<String, Object>>) fixture.get("preflights");
        var pool = new AgentWebsiteCandidatePool(goal(50, 600, 3000));
        for (var row : (List<Map<String, Object>>) preflights.getFirst().get("items"))
            pool.record(row);
        assertEquals(18, pool.feedback().get("retainedCount"));
        assertEquals(32, pool.feedback().get("existingCandidateCount"));
        assertEquals(50, pool.feedback().get("checkedCandidateCount"));
        assertTrue(
                !pool.feedback()
                        .get("retainedCount")
                        .equals(
                                ((Map<?, ?>) fixture.get("supersededQaSummary"))
                                        .get("notChecked")));
        var second = pool.selection(Map.of("domains", plans.get(1).get("domains")));
        assertEquals(18, second.alreadyCheckedCount());
        assertEquals(32, second.admitted().size());
        assertEquals(
                second.admitted(),
                ((List<Map<String, Object>>) preflights.get(1).get("items"))
                        .stream().map(row -> row.get("domain")).toList());
        for (var row : (List<Map<String, Object>>) preflights.get(1).get("items")) pool.record(row);
        assertEquals(43, pool.feedback().get("retainedCount"));
        assertEquals(39, pool.feedback().get("existingCandidateCount"));
        assertEquals(82, pool.checkedCount());
        var third = pool.selection(Map.of("domains", plans.get(2).get("domains")));
        assertEquals(50, third.freshCount());
        assertEquals(18, third.admitted().size());
        assertEquals(32, third.overflow().size());
        assertEquals(((List<?>) plans.get(2).get("domains")).subList(18, 50), third.overflow());
        assertEquals(false, third.feedback().get("creationProof"));
        assertFalse(third.feedback().containsKey("valid"));
        // Third preflight never occurred in the real run: this success branch is synthetic.
        for (String domain : third.admitted())
            pool.record(
                    Map.of(
                            "domain",
                            domain,
                            "state",
                            "NOT_CHECKED",
                            "reason",
                            "APPROVAL_REQUIRED_NATIVE_PROBE"));
        pool.rememberSelection(third);
        assertEquals(100, pool.checkedCount());
        assertEquals(50, ((List<?>) pool.arguments().get("domains")).size());
        assertEquals(11, pool.feedback().get("unselectedReadyCount"));
        assertTrue(
                ((List<?>) pool.arguments().get("domains"))
                        .stream().noneMatch(third.overflow()::contains));
        assertEquals(
                32,
                ((Map<?, ?>) pool.feedback().get("lastSelection")).get("overflowNotCheckedCount"));
        int checked = pool.checkedCount();
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        pool.record(
                                Map.of(
                                        "domain",
                                        "bad.org",
                                        "state",
                                        "UNKNOWN",
                                        "reason",
                                        "unverified")));
        assertEquals(checked, pool.checkedCount());
    }

    @Test
    void fiftyFreshSuggestionsUseOnlyEighteenRemainingMetadataSlots() {
        var pool = new AgentWebsiteCandidatePool(goal(50, 600, 3000));
        for (int i = 0; i < 50; i++) sample(pool, i, i < 32);
        for (int i = 50; i < 82; i++) sample(pool, i, i < 57);
        assertEquals(43, pool.feedback().get("retainedCount"));
        var returned = IntStream.range(82, 132).mapToObj(i -> "site" + i + ".org").toList();
        assertEquals(returned.subList(0, 18), pool.additions(Map.of("domains", returned)));
    }

    @Test
    void retainsTwentyFiveAcrossDuplicateRepairAndOneRemainingDomain() {
        var pool = new AgentWebsiteCandidatePool(goal(50, 600, 3000));
        for (int i = 0; i < 50; i++) sample(pool, i, i < 25);
        var proposal =
                new ArrayList<String>(
                        IntStream.range(0, 25).mapToObj(i -> "site" + i + ".org").toList());
        proposal.addAll(IntStream.range(50, 74).mapToObj(i -> "site" + i + ".org").toList());
        proposal.add("site50.org");
        var fresh = pool.additions(Map.of("domains", proposal));
        assertEquals(24, fresh.size());
        for (int i = 50; i < 74; i++) sample(pool, i, false);
        assertFalse(pool.complete());
        assertEquals(1, pool.feedback().get("requiredReplacementCount"));
        assertEquals(
                List.of("site74.org"), pool.additions(Map.of("domains", List.of("site74.org"))));
        sample(pool, 74, false);
        assertTrue(pool.complete());
        var domains = (List<?>) pool.arguments().get("domains");
        assertEquals(50, domains.size());
        assertEquals(50, domains.stream().distinct().count());
        assertTrue(
                domains.containsAll(
                        IntStream.range(25, 50).mapToObj(i -> "site" + i + ".org").toList()));
        assertTrue(domains.stream().noneMatch(d -> List.of("site0.org", "site24.org").contains(d)));
    }

    @Test
    void fullExistingListCannotBeReintroducedAndIncompletePoolCannotFreeze() {
        var pool = new AgentWebsiteCandidatePool(goal(50, 600, 3000));
        for (int i = 0; i < 50; i++) sample(pool, i, true);
        assertEquals(
                List.of(),
                pool.additions(
                        Map.of(
                                "domains",
                                IntStream.range(0, 50)
                                        .mapToObj(i -> "site" + i + ".org")
                                        .toList())));
        assertThrows(IllegalArgumentException.class, pool::arguments);
        assertEquals(50, pool.feedback().get("requiredReplacementCount"));
        for (int i = 50; i < 100; i++) sample(pool, i, false);
        assertTrue(pool.complete());
        assertThrows(IllegalArgumentException.class, () -> sample(pool, 100, false));
    }

    @Test
    void settingsAndInputShapeCannotChangeDuringSupplement() {
        var pool = new AgentWebsiteCandidatePool(goal(2, 30, 1000));
        for (var args :
                List.<Map<String, Object>>of(
                        Map.of("domains", List.of("new.org"), "intervals", 600),
                        Map.of("domains", List.of("new.org"), "timeout", 3000),
                        Map.of(
                                "domains",
                                List.of("new.org"),
                                "headers",
                                Map.of("Authorization", "not-a-real-secret")),
                        Map.of("domains", List.of("https://new.org/path")),
                        Map.of("domains", List.of("127.0.0.1")),
                        Map.of(
                                "domains",
                                IntStream.range(0, 51)
                                        .mapToObj(i -> "site" + i + ".org")
                                        .toList())))
            assertThrows(IllegalArgumentException.class, () -> pool.additions(args));
        assertEquals(
                List.of("new.org"),
                pool.additions(Map.of("domains", List.of("new.org", "NEW.org"))));
        sample(pool, 0, false);
        sample(pool, 1, false);
        assertEquals(30, pool.arguments().get("intervals"));
        assertEquals(1000, pool.arguments().get("timeout"));
        pool.validateGoal(goal(2, 30, 1000));
        assertThrows(IllegalArgumentException.class, () -> pool.validateGoal(goal(2, 60, 1000)));
        assertThrows(IllegalArgumentException.class, () -> pool.validateGoal(goal(2, 30, 3000)));
        assertThrows(IllegalArgumentException.class, () -> pool.validateGoal(goal(3, 30, 1000)));
    }

    @Test
    void unverifiedBudgetOrFailedChecksNeverBecomeApprovalReady() {
        var pool = new AgentWebsiteCandidatePool(goal(2, 600, 3000));
        for (String state : List.of("FAILED", "AVAILABLE", "UNKNOWN", "NOT_CHECKED"))
            assertThrows(
                    IllegalArgumentException.class,
                    () ->
                            pool.record(
                                    Map.of(
                                            "domain",
                                            "site0.org",
                                            "state",
                                            state,
                                            "reason",
                                            "CANDIDATE_BUDGET_EXHAUSTED")));
        assertEquals(0, pool.checkedCount(), "Rejected metadata cannot silently consume retained accounting");
        assertEquals(0, pool.feedback().get("unselectedReadyCount"));
        assertFalse(pool.complete());
        assertEquals(2, pool.feedback().get("requiredReplacementCount"));
    }

    @Test
    void fragmentDoesNotAuthorizeAnInitialIncompletePlanAndPoolsAreIsolated() {
        var result = AgentWebsiteBatchProposal.inspect(Map.of("domains", List.of("site0.org")));
        assertEquals(false, result.get("valid"));
        assertEquals(true, result.get("fragmentValid"));
        var first = new AgentWebsiteCandidatePool(goal(2, 600, 3000));
        var second = new AgentWebsiteCandidatePool(goal(2, 600, 3000));
        sample(first, 0, false);
        sample(first, 1, false);
        assertTrue(first.complete());
        assertFalse(second.complete());
        assertEquals(2, second.feedback().get("requiredReplacementCount"));
    }

    private AgentRuntimeModelRequest request(
            org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk risk) {
        var plan =
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor.builder()
                        .name("monitor.plan_websites")
                        .description("Original planning descriptor")
                        .inputSchema("{\"type\":\"object\"}")
                        .risk(risk)
                        .namespace("monitor")
                        .exposure(
                                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure
                                        .MODEL_VISIBLE)
                        .access(org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess.USER)
                        .build();
        return AgentRuntimeModelRequest.builder()
                .prompt(
                        RuntimePrompt.builder()
                                .instructions("Original system policy")
                                .blocks(List.of())
                                .build())
                .chatHistory(
                        List.of(
                                TranscriptMessage.userText("original"),
                                TranscriptMessage.userText("old full plan"),
                                TranscriptMessage.userText("old tool results")))
                .availableTools(List.of(plan))
                .temperature(0D)
                .build();
    }

    @Test
    void supplementProjectsOnlyBoundedReadToolAndFreshCompactState() {
        var pool = new AgentWebsiteCandidatePool(goal(50, 600, 3000));
        for (int i = 0; i < 50; i++) sample(pool, i, i < 30);
        for (int i = 50; i < 80; i++) sample(pool, i, i < 53);
        var original = request(org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk.READ);
        var projected =
                pool.supplementRequest(
                        original, "Choose fifty public domains and create website monitors");
        assertTrue(projected.isToolCallRequired());
        assertEquals(1, projected.getAvailableTools().size());
        assertEquals(2, projected.getChatHistory().size());
        assertEquals(3, original.getChatHistory().size());
        var descriptor = projected.getAvailableTools().getFirst();
        assertEquals(original.getAvailableTools().getFirst().getAccess(), descriptor.getAccess());
        assertEquals(original.getAvailableTools().getFirst().getRisk(), descriptor.getRisk());
        var schema =
                org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                        descriptor.getInputSchema(), Map.class);
        var properties = (Map<?, ?>) schema.get("properties");
        var domains = (Map<?, ?>) properties.get("domains");
        assertEquals(List.of("domains"), schema.get("required"));
        assertEquals(false, schema.get("additionalProperties"));
        assertEquals(20, domains.get("minItems"));
        assertEquals(20, domains.get("maxItems"));
        assertEquals(true, domains.get("uniqueItems"));
        var state =
                org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                        projected.getChatHistory().getLast().text(), Map.class);
        assertEquals(47, state.get("retainedCount"));
        assertEquals(3, state.get("requiredReplacementCount"));
        assertEquals(20, state.get("requestedCandidateCount"));
        assertEquals(20, state.get("remainingCandidateBudget"));
        assertEquals(null, projected.getMaxCompletionTokens());
        assertFalse(
                projected.getChatHistory().stream()
                        .anyMatch(message -> message.text().contains("old full plan")));
    }

    @Test
    void exhaustedCandidateBudgetAndNonReadDescriptorCannotBeProjected() {
        var pool = new AgentWebsiteCandidatePool(goal(50, 600, 3000));
        for (int i = 0; i < 100; i++) sample(pool, i, true);
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        pool.supplementRequest(
                                request(
                                        org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk
                                                .READ),
                                "Create fifty monitors"));
        var next = new AgentWebsiteCandidatePool(goal(2, 600, 3000));
        sample(next, 0, true);
        sample(next, 1, false);
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        next.supplementRequest(
                                request(
                                        org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk
                                                .CHANGE),
                                "Create two monitors"));
    }
}
