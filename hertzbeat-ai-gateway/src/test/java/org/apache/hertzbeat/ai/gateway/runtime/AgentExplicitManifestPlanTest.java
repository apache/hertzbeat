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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

class AgentExplicitManifestPlanTest {
    final Clock clock = Clock.fixed(Instant.parse("2026-10-22T14:00:00Z"), ZoneOffset.UTC);

    @Test
    void exactPlanIsBoundToOwnerWorkspaceSessionRunQuestionAndGoalUntilExpiry() {
        var context = context("owner", "workspace", "session", "run", question());
        var draft = AgentExplicitManifestPlan.parse(context, clock);
        assertTrue(draft.reference().validFor(context, draft.goal(), clock));
        assertFalse(draft.reference().preflightComplete());
        assertTrue(draft.reference().completedPreflight().preflightComplete());
        for (var foreign :
                List.of(
                        context("foreign", "workspace", "session", "run", question()),
                        context("owner", "foreign", "session", "run", question()),
                        context("owner", "workspace", "foreign", "run", question()),
                        context("owner", "workspace", "session", "foreign", question()),
                        context("owner", "workspace", "session", "run", question() + " changed"))) {
            assertFalse(draft.reference().validFor(foreign, draft.goal(), clock));
        }
        assertFalse(
                draft.reference()
                        .validFor(
                                context,
                                draft.goal(),
                                Clock.offset(clock, java.time.Duration.ofMinutes(30))));
        var changed =
                new AgentTaskAssessment.Goal(
                        draft.goal().type(),
                        draft.goal().operation(),
                        "monitor",
                        2,
                        List.of(),
                        Map.of("intervals", 60),
                        draft.goal().createTargets());
        assertFalse(draft.reference().validFor(context, changed, clock));
        var checkpoint =
                new AgentTaskCheckpoint(
                        AgentTaskCheckpoint.MANIFEST_VERSION,
                        context.getRunUid(),
                        AgentTaskCheckpoint.binding(context),
                        draft.goal(),
                        64,
                        null,
                        1,
                        draft.reference().completedPreflight());
        var stored = JsonUtil.fromJson(JsonUtil.toJson(checkpoint), AgentTaskCheckpoint.class);
        assertTrue(stored.validFor(context, clock));
        var stripped = new AgentTaskCheckpoint(AgentTaskCheckpoint.MANIFEST_VERSION, context.getRunUid(),
                AgentTaskCheckpoint.binding(context), draft.goal(), 64, null, 1, null);
        assertFalse(stripped.validFor(context, clock), "Manifest metadata cannot be stripped or read by an older checkpoint executor");
        var incomplete = new AgentTaskCheckpoint(AgentTaskCheckpoint.MANIFEST_VERSION, context.getRunUid(),
                AgentTaskCheckpoint.binding(context), draft.goal(), 64, null, 1, draft.reference());
        assertFalse(incomplete.validFor(context, clock), "An interrupted preflight must never authorize resumption");
        var childContext = context("owner", "workspace", "session", "child-run", question());
        var child = draft.reference().completedPreflight().forContinuation(childContext, draft.goal());
        assertTrue(child.validFor(childContext, draft.goal(), clock));
        assertEquals(draft.reference().expiresAt(), child.expiresAt());
        assertThrows(IllegalArgumentException.class, () -> draft.reference().completedPreflight()
                .forContinuation(context("foreign", "workspace", "session", "child-run", question()), draft.goal()));
        assertFalse(child.validFor(childContext, draft.goal(), Clock.offset(clock, java.time.Duration.ofMinutes(30))));
        assertFalse(
                stored.validFor(context, Clock.offset(clock, java.time.Duration.ofMinutes(30))));
    }

    @Test
    void noManifestKeepsOrdinaryPlanningAndInvalidDataFailsClosed() {
        assertNull(
                AgentExplicitManifestPlan.parse(
                        context(
                                "owner",
                                "workspace",
                                "session",
                                "run",
                                "Create fifty websites you choose"),
                        clock));
        for (String invalid :
                List.of(
                        question().replace("\"intervals\":600", "\"intervals\":\"600\""),
                        question().replace("site-b", "site-a"),
                        question()
                                .replace(
                                        "http://example-b.test",
                                        "http://user:password@example-b.test"),
                        question()
                                .replace(
                                        "\"retryPreflightFailures\":false",
                                        "\"retryPreflightFailures\":true"),
                        question() + "{}",
                question().replace("\"retryPreflightFailures\":false", "\"shell\":\"unrelated\",\"retryPreflightFailures\":false"),
                "Create {\"items\":[],\"items\":[]}")) {
            assertThrows(
                    IllegalArgumentException.class,
                    () ->
                            AgentExplicitManifestPlan.parse(
                                    context("owner", "workspace", "session", "run", invalid),
                                    clock));
        }
    }

    @Test
    void compactReviewNeverReturnsOrAcceptsAlternativeTargetData() {
        var context = context("owner", "workspace", "session", "run", question());
        var draft = AgentExplicitManifestPlan.parse(context, clock);
        var request = draft.reviewRequest(null);
        assertEquals("MANIFEST_INTENT", AgentRuntimeSafeTrace.phase(request));
        assertNull(request.getMaxCompletionTokens());
        assertTrue(request.getAvailableTools().isEmpty());
        assertFalse(request.getChatHistory().getFirst().text().contains("http://example"));
        var reply =
                new java.util.LinkedHashMap<String, Object>(
                        Map.of(
                                "planId",
                                draft.reference().planId(),
                                "planHash",
                                draft.reference().goalHash(),
                                "resourceType",
                                "monitor",
                                "expectedCount",
                                2,
                                "operation",
                                "CREATE",
                                "constraintsSupported",
                                true));
        assertEquals(
                "CREATE",
                draft.review(
                        AgentRuntimeModelResponse.finalAnswer(JsonUtil.toJson(reply), null),
                        context,
                        clock));
        reply.put("items", List.of(Map.of("url", "http://evil.test")));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        draft.review(
                                AgentRuntimeModelResponse.finalAnswer(JsonUtil.toJson(reply), null),
                                context,
                                clock));
        reply.remove("items");
        reply.put("expectedCount", 50);
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        draft.review(
                                AgentRuntimeModelResponse.finalAnswer(JsonUtil.toJson(reply), null),
                                context,
                                clock));
    }

    @Test
    void expiryIsEnforcedByTheSameControlUsedForApprovalAndNativeWriteGuards() {
        try (var control = new AgentRuntimeControl("trace", "run", clock)) {
            assertThrows(
                    AgentRuntimeStoppedException.class,
                    () -> control.bindManifestExpiry(clock.instant()));
            assertThrows(AgentRuntimeStoppedException.class, control::checkpoint);
            assertTrue(control.requiresExplicitConfirmation());
        }
    }

    String question() {
        return "Create two new websites with manual approval "
                   + "{\"items\":[{\"idempotencyKey\":\"site-a\",\"name\":\"site-a\",\"url\":\"http://example-a.test\",\"intervals\":600},{\"idempotencyKey\":\"site-b\",\"name\":\"site-b\",\"url\":\"http://example-b.test\",\"intervals\":600}],\"retryPreflightFailures\":false}";
    }

    AgentRuntimeContext context(
            String actor, String workspace, String session, String run, String question) {
        return AgentRuntimeContext.builder()
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .channelId("web-ui")
                .workspaceId(workspace)
                .actor(AgentActor.builder().id(actor).type("user").roles(List.of("user")).build())
                .userMessage(question)
                .sessionUid(session)
                .runUid(run)
                .runId(2L)
                .runSessionId(1L)
                .traceId("trace")
                .receivedAt(1L)
                .currentTimeIso(clock.instant().toString())
                .timezone("UTC")
                .preferredLanguage("en")
                .chatHistory(List.of())
                .build();
    }
}
