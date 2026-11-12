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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

class AgentWebsiteBatchProposalTest {
    @Test
    void invalidCandidatesReturnBoundedActionableFeedbackWithoutAcceptingDuplicates() {
        var result = AgentWebsiteBatchProposal.inspect(Map.of("domains", List.of("Apache.org", "apache.org", "mozilla.org")));
        assertEquals(false, result.get("valid"));
        assertEquals(true, result.get("repairable"));
        assertEquals("WEBSITE_PROPOSAL_DUPLICATE", result.get("code"));
        assertEquals(2, result.get("uniqueCount"));
        assertEquals(List.of("apache.org"), result.get("duplicateDomains"));
        assertThrows(IllegalArgumentException.class, () -> AgentWebsiteBatchProposal.describe(Map.of("domains", List.of("apache.org", "apache.org"))));
        var secret = AgentWebsiteBatchProposal.inspect(Map.of("domains", List.of("apache.org", "https://secret:password@example.org")));
        assertEquals(false, secret.get("valid"));
        assertFalse(secret.toString().contains("password"));
        assertEquals(List.of(1), secret.get("invalidIndices"));
        assertEquals(false, AgentWebsiteBatchProposal.inspect(Map.of("domains", List.of("apache.org", "apache.org"), "timeout", 0)).get("repairable"));
        assertEquals(true, AgentWebsiteBatchProposal.inspect(Map.of("domains", List.of("apache.org", "mozilla.org"))).get("valid"));
    }

    final Clock clock = Clock.fixed(Instant.parse("2026-10-22T16:00:00Z"), ZoneOffset.UTC);

    AgentRuntimeContext context(String text) {
        return new AgentExplicitManifestPlanTest()
                .context("owner", "workspace", "session", "run", text);
    }

    List<String> sites(int count) {
        return java.util.stream.IntStream.range(0, count)
                .mapToObj(i -> "site" + i + ".org")
                .toList();
    }

    AgentRuntimeToolCall call(Map<String, Object> args) {
        return AgentRuntimeToolCall.builder()
                .toolCallId("proposal")
                .toolName("monitor.plan_websites")
                .arguments(args)
                .build();
    }

    Map<String, Object> review(AgentWebsiteBatchProposal.Candidate candidate, int count) {
        return new LinkedHashMap<>(
                Map.of(
                        "proposalHash",
                        candidate.hash(),
                        "operation",
                        "CREATE",
                        "expectedCount",
                        count,
                        "intervals",
                        600,
                        "timeout",
                        3000,
                        "intervalExplicit",
                        false,
                        "timeoutExplicit",
                        false,
                        "constraintsSupported",
                        true));
    }

    @Test
    void singleReviewJsonFencePreservesStrictObjectAndAuthorizationChecks() {
        var candidate =
                AgentWebsiteBatchProposal.parse(
                        context("Choose two public sites and create monitors"),
                        call(Map.of("domains", sites(2))));
        String valid = JsonUtil.toJson(review(candidate, 2));
        for (String text :
                List.of(valid, "```json\n" + valid + "\n```", "```\n" + valid + "\n```")) {
            assertEquals(
                    2,
                    candidate
                            .freeze(AgentRuntimeModelResponse.finalAnswer(text, null), clock)
                            .goal()
                            .createTargets()
                            .size());
        }
        for (String text :
                List.of(
                        "Explanation\n" + valid,
                        "```json\n" + valid + "\n``` extra",
                        "```json\n" + valid + "\n```\n```json\n" + valid + "\n```",
                        "```javascript\n" + valid + "\n```",
                        "[" + valid + "]",
                        JsonUtil.toJson(valid),
                        "```json\n" + valid + valid + "\n```",
                        "```json\n" + valid.substring(0, valid.length() - 1) + "\n```")) {
            assertThrows(
                    IllegalArgumentException.class,
                    () ->
                            candidate.freeze(
                                    AgentRuntimeModelResponse.finalAnswer(text, null), clock));
        }
        for (String field : List.of("proposalHash", "operation", "constraintsSupported")) {
            var denied = review(candidate, 2);
            denied.put(field, field.equals("constraintsSupported") ? false : "NOT_AUTHORIZED");
            assertThrows(
                    IllegalArgumentException.class,
                    () ->
                            candidate.freeze(
                                    AgentRuntimeModelResponse.finalAnswer(
                                            "```json\n" + JsonUtil.toJson(denied) + "\n```", null),
                                    clock));
        }
        String duplicated = valid.substring(0, valid.length() - 1) + ",\"operation\":\"CREATE\"}";
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        candidate.freeze(
                                AgentRuntimeModelResponse.finalAnswer(
                                        "```json\n" + duplicated + "\n```", null),
                                clock));
    }

    @Test
    void varyingCountsAndPhrasingsUseCompactTargetsAndNativeDefaults() {
        for (int n : List.of(2, 3, 7, 17, 50)) {
            for (String question :
                    List.of(
                            "Pick any " + n + " public websites and create monitors.",
                            "Please select " + n + " different public domains to monitor.")) {
                var ctx = context(question);
                var candidate =
                        AgentWebsiteBatchProposal.parse(ctx, call(Map.of("domains", sites(n))));
                var request = candidate.reviewRequest(null);
                assertEquals("WEBSITE_PROPOSAL_INTENT", AgentRuntimeSafeTrace.phase(request));
                assertFalse(request.getChatHistory().getFirst().text().contains("idempotencyKey"));
                var draft =
                        candidate.freeze(
                                AgentRuntimeModelResponse.finalAnswer(
                                        JsonUtil.toJson(review(candidate, n)), null),
                                clock);
                assertEquals(n, draft.goal().createTargets().size());
                assertTrue(draft.reference().validFor(ctx, draft.goal(), clock));
                assertFalse(draft.reference().preflightComplete());
                assertTrue(
                        draft.goal().createTargets().stream()
                                .allMatch(t -> t.intervals() == 600 && t.timeout() == 3000));
            }
        }
    }

    @Test
    void explicitUserSettingsOverrideProposedDefaultsBeforeFreezing() {
        var candidate =
                AgentWebsiteBatchProposal.parse(
                        context(
                                "Choose 3 public sites; interval120seconds, timeout2000ms; create"
                                        + " monitors."),
                        call(Map.of("domains", sites(3))));
        var reply = review(candidate, 3);
        reply.put("intervals", 120);
        reply.put("timeout", 2000);
        reply.put("intervalExplicit", true);
        reply.put("timeoutExplicit", true);
        var draft =
                candidate.freeze(
                        AgentRuntimeModelResponse.finalAnswer(JsonUtil.toJson(reply), null), clock);
        assertTrue(
                draft.goal().createTargets().stream()
                        .allMatch(t -> t.intervals() == 120 && t.timeout() == 2000));
        assertEquals(120, draft.goal().expectedChanges().get("intervals"));
    }

    @Test
    void selectedTargetsCannotReplaceExplicitUserAddressesOrPaths() {
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        AgentWebsiteBatchProposal.parse(
                                context("Monitor127.0.0.1 and apache.org"),
                                call(Map.of("domains", List.of("apache.org", "mozilla.org")))));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        AgentWebsiteBatchProposal.parse(
                                context("Monitor https://user:fixture@apache.org/ and mozilla.org"),
                                call(Map.of("domains", List.of("apache.org", "mozilla.org")))));

        assertThrows(
                IllegalArgumentException.class,
                () ->
                        AgentWebsiteBatchProposal.parse(
                                context("Monitor apache.org and mozilla.org"),
                                call(Map.of("domains", sites(2)))));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        AgentWebsiteBatchProposal.parse(
                                context(
                                        "Create monitors for https://apache.org/custom and"
                                                + " mozilla.org"),
                                call(Map.of("domains", List.of("apache.org", "mozilla.org")))));
        assertNotNull(
                AgentWebsiteBatchProposal.parse(
                        context("Monitor apache.org and mozilla.org"),
                        call(Map.of("domains", List.of("apache.org", "mozilla.org")))));
    }

    @Test
    void unavailableUnsupportedAmbiguousOrWrongCountReviewNeverAuthorizes() {
        var candidate =
                AgentWebsiteBatchProposal.parse(
                        context("Choose 3 sites and create monitors"),
                        call(Map.of("domains", sites(3))));
        for (String field :
                List.of(
                        "proposalHash",
                        "operation",
                        "expectedCount",
                        "constraintsSupported",
                        "timeout",
                        "intervals")) {
            var bad = review(candidate, 3);
            Object replacement =
                    Map.of(
                                    "proposalHash",
                                    "foreign",
                                    "operation",
                                    "NOT_CREATE",
                                    "expectedCount",
                                    4,
                                    "constraintsSupported",
                                    false,
                                    "timeout",
                                    0,
                                    "intervals",
                                    0)
                            .get(field);
            bad.put(field, replacement);
            assertThrows(
                    IllegalArgumentException.class,
                    () ->
                            candidate.freeze(
                                    AgentRuntimeModelResponse.finalAnswer(
                                            JsonUtil.toJson(bad), null),
                                    clock));
        }
        assertThrows(
                IllegalArgumentException.class,
                () -> candidate.freeze(AgentRuntimeModelResponse.finalAnswer("{", null), clock));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        candidate.freeze(
                                AgentRuntimeModelResponse.finalAnswer(
                                        JsonUtil.toJson(review(candidate, 3)) + "{}", null),
                                clock));
    }

    @Test
    void legacyFullBatchProposalUsesCompactReviewWithoutRequiringUserManifest() {
        var ctx = context("Choose two public domains and create monitors");
        var full =
                AgentRuntimeToolCall.builder()
                        .toolCallId("legacy")
                        .toolName("monitor.create_batch")
                        .arguments(
                                Map.of(
                                        "items",
                                        List.of(
                                                Map.of(
                                                        "idempotencyKey",
                                                        "original-a",
                                                        "name",
                                                        "selected-a",
                                                        "url",
                                                        "https://apache.org/",
                                                        "intervals",
                                                        600),
                                                Map.of(
                                                        "idempotencyKey",
                                                        "original-b",
                                                        "name",
                                                        "selected-b",
                                                        "url",
                                                        "https://mozilla.org/",
                                                        "intervals",
                                                        600))))
                        .build();
        var candidate = AgentWebsiteBatchProposal.parse(ctx, full);
        var draft =
                candidate.freeze(
                        AgentRuntimeModelResponse.finalAnswer(
                                JsonUtil.toJson(review(candidate, 2)), null),
                        clock);
        assertEquals("original-a", draft.goal().createTargets().getFirst().idempotencyKey());
        assertEquals("selected-a", draft.goal().createTargets().getFirst().name());
        assertEquals("https://apache.org/", draft.goal().createTargets().getFirst().url());
        assertFalse(
                candidate
                        .reviewRequest(null)
                        .getChatHistory()
                        .getFirst()
                        .text()
                        .contains("original-a"));
    }

    @Test
    void planningAcknowledgementIsNotPlatformReadOrCreationEvidence() {
        var input = call(Map.of("domains", sites(2)));
        var output = AgentWebsiteBatchProposal.describe(input.getArguments());
        assertEquals(
                "planning-only-not-platform-evidence",
                AgentReadContractCatalog.disposition(input.getToolName()));
        org.junit.jupiter.api.Assertions.assertNull(
                new AgentReadObservationClassifier().classify(input, JsonUtil.toJson(output)));
    }

    @Test
    void malformedDuplicatePrivateAndOverLimitCandidatesAreNotPlans() {
        for (Object values :
                List.of(
                        List.of("localhost", "apache.org"),
                        List.of("127.0.0.1", "apache.org"),
                        List.of("apache.org", "Apache.org"),
                        List.of("https://apache.org/", "mozilla.org"),
                        List.of("foo.internal", "apache.org"),
                        sites(51),
                        List.of("apache.org"))) {
            assertThrows(
                    IllegalArgumentException.class,
                    () -> AgentWebsiteBatchProposal.describe(Map.of("domains", values)));
        }
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        AgentWebsiteBatchProposal.describe(
                                Map.of("domains", sites(2), "shell", "never")));
    }
}
