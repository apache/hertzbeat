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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * Same-loop scripted model plus real controlled native tools, without remote model access or
 * existing data.
 */
class AgentMonitorClosedLoopTest {
    @Test
    void canonicalLegacyUrlExclusionStillBlocksAnIgnoredDomainBeforeApproval() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.existingWebsiteHosts.add("https://www.example.org/");
            tools.enableNativeBulk();
            tools.enableWebsiteExclusions();
            var first = new ArrayList<String>();
            first.add("www.example.org");
            for (int n = 0; n < 49; n++) first.add("new" + n + ".com");
            var replacements =
                    java.util.stream.IntStream.range(0, 50)
                            .mapToObj(n -> "replacement" + n + ".org")
                            .toList();
            var client =
                    new Client(
                            new AgentTaskAssessment.Goal(
                                    AgentTaskAssessment.Type.CHANGE,
                                    AgentTaskAssessment.Operation.CREATE,
                                    "monitor",
                                    50),
                            call("exclusion", AgentWebsiteExclusions.TOOL, Map.of()),
                            call("first", "monitor.plan_websites", Map.of("domains", first)),
                            call(
                                    "replace",
                                    "monitor.plan_websites",
                                    Map.of("domains", replacements)));
            var proof =
                    run(
                            operationContext(
                                    "Choose any 50 public domains and create website monitors",
                                    ControlledMonitorTools.USER),
                            tools,
                            client,
                            false,
                            true,
                            false,
                            false);
            assertEquals(0, tools.effects);
            assertEquals(0, tools.probes);
            var frozen =
                    proof.transcript().stream()
                            .filter(m -> m.getTaskCheckpoint() != null)
                            .map(m -> m.getTaskCheckpoint().goal())
                            .filter(goal -> goal.expectedCount() == 50)
                            .findFirst()
                            .orElseThrow();
            assertEquals(50, frozen.createTargets().size());
            assertFalse(
                    frozen.createTargets().stream()
                            .anyMatch(target -> target.url().contains("www.example.org")));
            assertTrue(
                    client.requests.stream()
                            .anyMatch(
                                    req ->
                                            (req.getPrompt().getInstructions()
                                                            + req.getChatHistory().stream()
                                                                    .map(TranscriptMessage::text)
                                                                    .toList())
                                                    .contains("AUTHORIZED_EXCLUSION_SNAPSHOT")));
        }
    }

    @Test
    void authorizedExistingDomainContextPrecedesPlanningAndSurvivesIgnoredExclusions()
            throws Exception {
        Map<?, ?> fixture;
        try (var input =
                getClass()
                        .getResourceAsStream(
                                "/fixtures/website-existing-run-697869576273152.json")) {
            assertNotNull(input);
            fixture =
                    JsonUtil.fromJson(
                            new String(
                                    input.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8),
                            Map.class);
        }
        for (String scenario : List.of("respect", "ignore", "reject", "cancel", "oversized")) {
            try (var tools = new ControlledMonitorTools()) {
                var receipts = (List<Map<String, Object>>) fixture.get("preflights");
                for (var receipt : receipts)
                    for (var row : (List<Map<String, Object>>) receipt.get("items"))
                        if ("EXISTING".equals(row.get("state")))
                            tools.existingWebsiteHosts.add((String) row.get("domain"));
                if (scenario.equals("oversized"))
                    java.util.stream.IntStream.range(0, 513)
                            .forEach(n -> tools.existingWebsiteHosts.add("old" + n + ".com"));
                tools.enableNativeBulk();
                tools.enableWebsiteExclusions();
                var responses = new ArrayList<AgentRuntimeModelResponse>();
                responses.add(call("exclusions", AgentWebsiteExclusions.TOOL, Map.of()));
                if (scenario.equals("ignore")) {
                    for (int n = 0; n < 2; n++) {
                        var oldPlan = (Map<String, Object>) ((List<?>) fixture.get("plans")).get(n);
                        responses.add(
                                call(
                                        "ignored-" + n,
                                        "monitor.plan_websites",
                                        Map.of(
                                                "domains",
                                                oldPlan.containsKey("domains")
                                                        ? oldPlan.get("domains")
                                                        : oldPlan.get("validUniqueDomains"))));
                    }
                } else {
                    responses.add(
                            call(
                                    "fresh-plan",
                                    "monitor.plan_websites",
                                    Map.of(
                                            "domains",
                                            java.util.stream.IntStream.range(0, 50)
                                                    .mapToObj(n -> "fresh" + n + ".com")
                                                    .toList())));
                }
                var client =
                        new Client(
                                new AgentTaskAssessment.Goal(
                                        AgentTaskAssessment.Type.CHANGE,
                                        AgentTaskAssessment.Operation.CREATE,
                                        "monitor",
                                        50),
                                responses.toArray(AgentRuntimeModelResponse[]::new));
                var proof =
                        run(
                                operationContext(
                                        (String) fixture.get("userMessage"),
                                        ControlledMonitorTools.USER),
                                tools,
                                client,
                                false,
                                scenario.equals("reject"),
                                scenario.equals("cancel"),
                                false);
                assertFalse(
                        client.requests.getFirst().getAvailableTools().stream()
                                .anyMatch(tool -> tool.getName().equals("monitor.plan_websites")));
                assertEquals(0, tools.probes);
                assertEquals(scenario.equals("respect") ? 50 : 0, tools.effects);
                if (!scenario.equals("oversized")) {
                    var planningRequests =
                            client.requests.stream()
                                    .filter(
                                            req ->
                                                    !req.getPrompt()
                                                                    .getInstructions()
                                                                    .startsWith(
                                                                            "WEBSITE_BATCH_PROPOSAL_INTENT")
                                                            && req != client.requests.getFirst())
                                    .toList();
                    assertFalse(planningRequests.isEmpty());
                    for (var req : planningRequests) {
                        assertTrue(
                                req.getPrompt()
                                        .getInstructions()
                                        .contains("WEBSITE_SELECTION_EXCLUSIONS"));
                        assertTrue(req.getPrompt().getInstructions().contains("google.com"));
                    }
                }
                if (scenario.equals("ignore")) {
                    assertTrue(proof.transcript().getLast().text().contains("32/50"));
                    assertTrue(proof.transcript().getLast().text().contains("92"));
                }
                if (scenario.equals("oversized")) {
                    assertEquals(1, client.requests.size());
                    assertTrue(
                            proof.transcript()
                                    .getLast()
                                    .text()
                                    .contains("WEBSITE_EXCLUSIONS_UNAVAILABLE"));
                }
            }
        }
    }

    @Test
    void
            websiteLifecycleRunsThroughDiscoveryProbeConfirmationCreateAndReadbackAndRestoresWithoutRecreation()
                    throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var goal =
                    new AgentTaskAssessment.Goal(
                            AgentTaskAssessment.Type.CHANGE,
                            AgentTaskAssessment.Operation.CREATE,
                            "monitor",
                            1);
            var client = new Client(goal, steps(tools));
            var context = context();
            var first = run(context, tools, client, false, false);
            assertEquals(AgentRuntimeEventType.RUN_COMPLETED, first.events().getLast().getType());
            assertEquals(1, tools.effects);
            assertEquals(1, tools.probes);
            assertEquals(1, first.transcript().getLast().getTaskOutcome().verifiedCount());
            var checkpointMessage =
                    first.transcript().stream()
                            .filter(m -> m.getTaskCheckpoint() != null)
                            .findFirst()
                            .orElseThrow();
            assertTrue(checkpointMessage.getTaskCheckpoint().validFor(context));
            assertEquals("monitor.create", checkpointMessage.toolCalls().getFirst().getName());
            var recorder = mock(AgentTranscriptRecorder.class);
            when(recorder.findRunTaskCheckpoint(2L))
                    .thenReturn(java.util.Optional.of(checkpointMessage));
            when(recorder.findRunGroundingMessages(2L))
                    .thenReturn(
                            first.transcript().stream()
                                    .filter(
                                            m ->
                                                    m.getRole()
                                                            == TranscriptMessage.TranscriptRole
                                                                    .TOOL_RESULT)
                                    .toList());
            var verified =
                    new AgentGroundingEvidenceVerifier(recorder, tools.dao)
                            .verifyHistory(
                                    AgentRun.builder()
                                            .id(2L)
                                            .sessionId(1L)
                                            .runUid("run")
                                            .entryType("USER_INPUT")
                                            .build(),
                                    null,
                                    List.of());
            assertEquals(5, verified.budgetAttempts().size());
            var resumed = context.withVerifiedChatHistory(verified);
            var finalOnly =
                    new Client(
                            goal,
                            AgentRuntimeModelResponse.finalAnswer(
                                    "The original local site is saved and verified.", null));
            var restored = run(resumed, tools, finalOnly, false, false);
            assertEquals(
                    AgentRuntimeEventType.RUN_COMPLETED, restored.events().getLast().getType());
            assertEquals(1, tools.effects);
            assertEquals(1, tools.probes);
            assertEquals(
                    0,
                    finalOnly.requests.stream()
                            .filter(
                                    r ->
                                            r.getPrompt()
                                                    .getInstructions()
                                                    .contains("ORIGINAL_TASK_GOAL_ONLY"))
                            .count());
            assertEquals(1, restored.transcript().getLast().getTaskOutcome().verifiedCount());
        }
    }

    @Test
    void missingDurableGoalCheckpointStopsBeforeCreateEvenAfterValidProbe() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var client =
                    new Client(
                            new AgentTaskAssessment.Goal(
                                    AgentTaskAssessment.Type.CHANGE,
                                    AgentTaskAssessment.Operation.CREATE,
                                    "monitor",
                                    1),
                            steps(tools));
            var proof = run(context(), tools, client, true, false);
            assertEquals(AgentRuntimeEventType.ERROR, proof.events().getLast().getType());
            assertEquals(0, tools.effects);
            assertEquals(1, tools.probes);
            assertTrue(tools.monitors.isEmpty());
        }
    }

    @Test
    void originalExactUpdateIdBlocksDifferentModelProposedIdBeforeApprovalOrEffect()
            throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var goal =
                    new AgentTaskAssessment.Goal(
                            AgentTaskAssessment.Type.CHANGE,
                            AgentTaskAssessment.Operation.UPDATE,
                            "monitor",
                            1,
                            List.of(1L),
                            Map.of("intervals", 30));
            var client =
                    new Client(
                            goal,
                            call(
                                    "update",
                                    "monitor.update",
                                    Map.of("monitorId", 2, "updates", Map.of("intervals", 30))));
            var proof = run(context(), tools, client, false, false);
            assertEquals(AgentRuntimeEventType.ERROR, proof.events().getLast().getType());
            assertEquals(0, tools.effects);
            assertTrue(tools.rows.isEmpty());
            assertFalse(
                    proof.events().stream()
                            .anyMatch(e -> e.getType() == AgentRuntimeEventType.REQUESTED_ACTION));
        }
    }

    @Test
    void rejectedProbePreventsCreationAndCannotAuthorizeLaterSave() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var client =
                    new Client(
                            new AgentTaskAssessment.Goal(
                                    AgentTaskAssessment.Type.CHANGE,
                                    AgentTaskAssessment.Operation.CREATE,
                                    "monitor",
                                    1),
                            steps(tools));
            client.maxSteps = 8;
            var proof = run(context(), tools, client, false, true);
            assertEquals(0, tools.effects);
            assertEquals(0, tools.probes);
            assertEquals(AgentRuntimeEventType.ERROR, proof.events().getLast().getType());
        }
    }

    @Test
    void exactIntervalPauseAndResumeCompleteOnlyAfterTheirOwnReadback() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.approved(
                    tools.request(
                            "monitor.create",
                            tools.createArguments(),
                            ControlledMonitorTools.USER));
            var update =
                    new AgentTaskAssessment.Goal(
                            AgentTaskAssessment.Type.CHANGE,
                            AgentTaskAssessment.Operation.UPDATE,
                            "monitor",
                            1,
                            List.of(1L),
                            Map.of("intervals", 45));
            var updated =
                    run(
                            operationContext(
                                    "Update monitor 1 interval to 45 seconds",
                                    ControlledMonitorTools.USER),
                            tools,
                            new Client(
                                    update,
                                    call(
                                            "update",
                                            "monitor.update",
                                            Map.of(
                                                    "monitorId",
                                                    1,
                                                    "updates",
                                                    Map.of("intervals", 45))),
                                    AgentRuntimeModelResponse.finalAnswer(
                                            "The interval is saved and verified.", null)),
                            false,
                            false);
            assertEquals(AgentRuntimeEventType.RUN_COMPLETED, updated.events().getLast().getType());
            assertEquals(45, tools.monitors.get(1L).getMonitor().getIntervals());
            for (var operation :
                    List.of(
                            AgentTaskAssessment.Operation.PAUSE,
                            AgentTaskAssessment.Operation.RESUME)) {
                var actor =
                        operation == AgentTaskAssessment.Operation.PAUSE
                                ? ControlledMonitorTools.ADMIN
                                : ControlledMonitorTools.USER;
                var goal =
                        new AgentTaskAssessment.Goal(
                                AgentTaskAssessment.Type.CHANGE,
                                operation,
                                "monitor",
                                1,
                                List.of(1L),
                                Map.of());
                String tool = "monitor." + operation.name().toLowerCase(java.util.Locale.ROOT);
                var proof =
                        run(
                                operationContext(operation.name() + " monitor 1", actor),
                                tools,
                                new Client(
                                        goal,
                                        call(
                                                operation.name(),
                                                tool,
                                                Map.of("monitorIds", List.of(1))),
                                        call(
                                                "verify-" + operation.name(),
                                                "monitor.get",
                                                Map.of("monitorId", 1)),
                                        AgentRuntimeModelResponse.finalAnswer(
                                                "The collection state was saved and verified.",
                                                null)),
                                false,
                                false);
                assertEquals(
                        AgentRuntimeEventType.RUN_COMPLETED, proof.events().getLast().getType());
                assertEquals(1, proof.transcript().getLast().getTaskOutcome().verifiedCount());
            }
        }
    }

    @Test
    void cancellationDuringApprovalHasNoProbeOrCreateEffects() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var goal =
                    new AgentTaskAssessment.Goal(
                            AgentTaskAssessment.Type.CHANGE,
                            AgentTaskAssessment.Operation.CREATE,
                            "monitor",
                            1);
            var proof =
                    run(
                            context(),
                            tools,
                            new Client(goal, steps(tools)),
                            false,
                            false,
                            true,
                            false);
            assertEquals(0, tools.effects);
            assertEquals(0, tools.probes);
            assertTrue(
                    proof.events().stream()
                            .anyMatch(e -> e.getType() == AgentRuntimeEventType.REQUESTED_ACTION));
        }
    }

    @Test
    void interruptionAfterDurableCreateRestoresReceiptAndReadsBeforeAnyModelRequest()
            throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var goal =
                    new AgentTaskAssessment.Goal(
                            AgentTaskAssessment.Type.CHANGE,
                            AgentTaskAssessment.Operation.CREATE,
                            "monitor",
                            1);
            var first =
                    run(
                            context(),
                            tools,
                            new Client(goal, steps(tools)),
                            false,
                            false,
                            false,
                            true);
            assertEquals(1, tools.effects);
            assertFalse(
                    first.transcript().stream()
                            .anyMatch(m -> "monitor.get".equals(m.getToolName())));
            var recorder = mock(AgentTranscriptRecorder.class);
            when(recorder.findRunTaskCheckpoint(2L))
                    .thenReturn(
                            first.transcript().stream()
                                    .filter(m -> m.getTaskCheckpoint() != null)
                                    .findFirst());
            when(recorder.findRunGroundingMessages(2L))
                    .thenReturn(
                            first.transcript().stream()
                                    .filter(
                                            m ->
                                                    m.getRole()
                                                            == TranscriptMessage.TranscriptRole
                                                                    .TOOL_RESULT)
                                    .toList());
            var history =
                    new AgentGroundingEvidenceVerifier(recorder, tools.dao)
                            .verifyHistory(
                                    AgentRun.builder()
                                            .id(2L)
                                            .sessionId(1L)
                                            .runUid("run")
                                            .entryType("USER_INPUT")
                                            .build(),
                                    null,
                                    List.of());
            var client =
                    new Client(
                            goal,
                            AgentRuntimeModelResponse.finalAnswer("Saved and verified.", null));
            var resumed =
                    run(context().withVerifiedChatHistory(history), tools, client, false, false);
            assertEquals(AgentRuntimeEventType.RUN_COMPLETED, resumed.events().getLast().getType());
            assertEquals(1, tools.effects);
            assertEquals(1, tools.probes);
            assertEquals(
                    "monitor.get",
                    resumed.events().stream()
                            .filter(e -> e.getToolName() != null)
                            .findFirst()
                            .orElseThrow()
                            .getToolName());
            assertEquals(1, resumed.transcript().getLast().getTaskOutcome().verifiedCount());
        }
    }

    @Test
    void fiftyWebsiteItemsStopAtTwentyVerifiedUnderOriginalBudgetAndRestoreWithoutRepeating()
            throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var goal = batchGoal(tools, 50);
            var ctx =
                    operationContext(
                            "Create fifty local website monitors at interval 600 seconds",
                            ControlledMonitorTools.USER);
            var client =
                    new Client(
                            goal,
                            call("initial", "monitor.create", tools.createArguments()),
                            AgentRuntimeModelResponse.finalAnswer(
                                    "Twenty monitors were saved and verified; thirty remain"
                                            + " pending.",
                                    null));
            var proof = run(ctx, tools, client, false, false);
            assertEquals(20, tools.effects);
            assertEquals(20, tools.probes);
            assertEquals(62, tools.rows.size());
            assertEquals(4, client.requests.size());
            var last = proof.transcript().getLast();
            assertEquals(AgentTaskOutcome.Stage.PARTIAL, last.getTaskOutcome().stage());
            assertEquals(20, last.getTaskOutcome().verifiedCount());
            assertEquals(50, last.getTaskCheckpoint().monitorBatch().items().size());
            assertEquals(
                    20,
                    last.getTaskCheckpoint().monitorBatch().items().stream()
                            .filter(i -> i.status() == AgentMonitorBatch.Status.VERIFIED)
                            .count());
            assertEquals(
                    30,
                    last.getTaskCheckpoint().monitorBatch().items().stream()
                            .filter(i -> i.status() == AgentMonitorBatch.Status.PENDING)
                            .count());
            assertTrue(
                    JsonUtil.toJson(last).getBytes(java.nio.charset.StandardCharsets.UTF_8).length
                            < 65535);
            var resumedContext = restored(ctx, proof, tools);
            var resumedClient =
                    new Client(
                            goal,
                            AgentRuntimeModelResponse.finalAnswer(
                                    "Twenty verified; thirty pending with insufficient budget.",
                                    null));
            var resumed = run(resumedContext, tools, resumedClient, false, false);
            assertEquals(20, tools.effects);
            assertEquals(62, tools.rows.size());
            assertEquals(
                    AgentTaskOutcome.Stage.PARTIAL,
                    resumed.transcript().getLast().getTaskOutcome().stage());
            assertEquals(6, resumed.transcript().getLast().getTaskCheckpoint().modelRequests());
            var exhaustedClient = new Client(goal);
            exhaustedClient.maxSteps = 4;
            run(resumedContext, tools, exhaustedClient, false, false);
            assertEquals(0, exhaustedClient.requests.size());
            assertEquals(20, tools.effects);

            assertEquals(
                    last.getTaskCheckpoint().monitorBatch().planHash(),
                    resumed.transcript().getLast().getTaskCheckpoint().monitorBatch().planHash());
        }
    }

    @Test
    void twoItemBatchRestoresAfterFirstReceiptAndVerifiesBeforeNextCreate() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var goal = batchGoal(tools, 2);
            var ctx =
                    operationContext(
                            "Create two local website monitors", ControlledMonitorTools.USER);
            var first =
                    run(
                            ctx,
                            tools,
                            new Client(
                                    goal,
                                    call("initial", "monitor.create", tools.createArguments())),
                            false,
                            false,
                            false,
                            true);
            assertEquals(1, tools.effects);
            var resumed =
                    run(
                            restored(ctx, first, tools),
                            tools,
                            new Client(
                                    goal,
                                    AgentRuntimeModelResponse.finalAnswer(
                                            "Both original websites are saved and verified.",
                                            null)),
                            false,
                            false);
            assertEquals(2, tools.effects);
            assertEquals(2, tools.probes);
            assertEquals(8, tools.rows.size());
            assertEquals(
                    "monitor.get",
                    resumed.events().stream()
                            .filter(e -> e.getToolName() != null)
                            .findFirst()
                            .orElseThrow()
                            .getToolName());
            assertEquals(
                    AgentTaskOutcome.Stage.COMPLETE,
                    resumed.transcript().getLast().getTaskOutcome().stage());
        }
    }

    @Test
    void unknownBatchWriteCannotBeRetriedOrFollowedByAnotherWrite() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var goal = batchGoal(tools, 2);
            var ctx =
                    operationContext(
                            "Create two local website monitors", ControlledMonitorTools.USER);
            var first =
                    run(
                            ctx,
                            tools,
                            new Client(
                                    goal,
                                    call("initial", "monitor.create", tools.createArguments())),
                            false,
                            false,
                            false,
                            true);
            tools.rows.values().stream()
                    .filter(row -> "monitor.create".equals(row.getToolName()))
                    .forEach(
                            row -> {
                                row.setStatus("RUNNING");
                                row.setResultOutput(null);
                            });
            var client = new Client(goal);
            run(restored(ctx, first, tools), tools, client, false, false);
            assertEquals(1, tools.effects);
            assertEquals(1, tools.probes);
            assertEquals(0, client.requests.size());
        }
    }

    @Test
    void canceledBatchApprovalKeepsAllItemsAndHasNoEffects() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var goal = batchGoal(tools, 2);
            var ctx =
                    operationContext(
                            "Create two local website monitors", ControlledMonitorTools.USER);
            var proof =
                    run(
                            ctx,
                            tools,
                            new Client(
                                    goal,
                                    call("initial", "monitor.create", tools.createArguments())),
                            false,
                            false,
                            true,
                            false);
            assertEquals(0, tools.effects);
            assertEquals(0, tools.probes);
            assertEquals(
                    2,
                    proof.transcript().stream()
                            .filter(m -> m.getTaskCheckpoint() != null)
                            .findFirst()
                            .orElseThrow()
                            .getTaskCheckpoint()
                            .monitorBatch()
                            .items()
                            .size());
        }
    }

    @Test
    void batchUpdatesAndCollectionStateChangesRetainExactIdsAndExistingRoles() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.approved(
                    tools.request(
                            "monitor.create",
                            tools.createArguments(),
                            ControlledMonitorTools.USER));
            var other = new java.util.LinkedHashMap<String, Object>(tools.createArguments());
            other.put("name", "second-site");
            tools.approved(tools.request("monitor.create", other, ControlledMonitorTools.USER));
            for (var operation :
                    List.of(
                            AgentTaskAssessment.Operation.UPDATE,
                            AgentTaskAssessment.Operation.PAUSE,
                            AgentTaskAssessment.Operation.RESUME)) {
                var goal =
                        new AgentTaskAssessment.Goal(
                                AgentTaskAssessment.Type.CHANGE,
                                operation,
                                "monitor",
                                2,
                                List.of(1L, 2L),
                                operation == AgentTaskAssessment.Operation.UPDATE
                                        ? Map.of("intervals", 45)
                                        : Map.of());
                String name = "monitor." + operation.name().toLowerCase(java.util.Locale.ROOT);
                Map<String, Object> args =
                        operation == AgentTaskAssessment.Operation.UPDATE
                                ? Map.of("monitorId", 1, "updates", Map.of("intervals", 45))
                                : Map.of("monitorIds", List.of(1));
                var actor =
                        operation == AgentTaskAssessment.Operation.PAUSE
                                ? ControlledMonitorTools.ADMIN
                                : ControlledMonitorTools.USER;
                var proof =
                        run(
                                operationContext(
                                        "Apply " + operation + " to exactly monitor IDs 1 and 2",
                                        actor),
                                tools,
                                new Client(
                                        goal,
                                        call("initial", name, args),
                                        AgentRuntimeModelResponse.finalAnswer(
                                                "Both exact requested monitor states were saved and"
                                                        + " verified.",
                                                null)),
                                false,
                                false);
                assertEquals(
                        AgentTaskOutcome.Stage.COMPLETE,
                        proof.transcript().getLast().getTaskOutcome().stage());
                assertEquals(2, proof.transcript().getLast().getTaskOutcome().verifiedCount());
            }
            var goal =
                    new AgentTaskAssessment.Goal(
                            AgentTaskAssessment.Type.CHANGE,
                            AgentTaskAssessment.Operation.PAUSE,
                            "monitor",
                            2,
                            List.of(1L, 2L),
                            Map.of());
            int effects = tools.effects;
            run(
                    operationContext(
                            "Pause exactly monitors 1 and 2 as USER", ControlledMonitorTools.USER),
                    tools,
                    new Client(
                            goal,
                            call("initial", "monitor.pause", Map.of("monitorIds", List.of(1, 2)))),
                    false,
                    false);
            assertEquals(effects, tools.effects);
        }
    }

    @Test
    void fiftyControlledItemsCompleteWithExplicitSufficientBudgetAndConstantModelCalls()
            throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var goal = batchGoal(tools, 50);
            var ctx =
                    operationContext(
                            "Create fifty local monitors; tool budget 160",
                            ControlledMonitorTools.USER);
            var client =
                    new Client(
                            goal,
                            call("initial", "monitor.create", tools.createArguments()),
                            AgentRuntimeModelResponse.finalAnswer(
                                    "All fifty original website monitors were saved and their"
                                            + " configurations verified.",
                                    null));
            client.maxToolCalls = 160;
            var proof = run(ctx, tools, client, false, false);
            assertEquals(50, tools.effects);
            assertEquals(50, tools.probes);
            assertEquals(152, tools.rows.size());
            assertEquals(4, client.requests.size());
            org.junit.jupiter.api.Assertions.assertNotNull(
                    proof.transcript().getLast().getTaskOutcome(),
                    () ->
                            "Missing final outcome; model requests: "
                                    + JsonUtil.toJson(
                                            client.requests.stream()
                                                    .map(
                                                            r ->
                                                                    Map.of(
                                                                            "goal",
                                                                            r.getPrompt()
                                                                                    .getInstructions()
                                                                                    .contains(
                                                                                            "ORIGINAL_TASK_GOAL_ONLY"),
                                                                            "review",
                                                                            r.getPrompt()
                                                                                    .getInstructions()
                                                                                    .contains(
                                                                                            "ORIGINAL_TASK_COMPLETION_REVIEW"),
                                                                            "prefix",
                                                                            r.getPrompt()
                                                                                    .getInstructions()
                                                                                    .substring(
                                                                                            0,
                                                                                            Math
                                                                                                    .min(
                                                                                                            160,
                                                                                                            r.getPrompt()
                                                                                                                    .getInstructions()
                                                                                                                    .length()))))
                                                    .toList()));
            assertEquals(
                    AgentTaskOutcome.Stage.COMPLETE,
                    proof.transcript().getLast().getTaskOutcome().stage());
            assertEquals(50, proof.transcript().getLast().getTaskOutcome().verifiedCount());
            assertTrue(
                    proof.transcript().getLast().getTaskCheckpoint().monitorBatch().items().stream()
                            .allMatch(i -> i.status() == AgentMonitorBatch.Status.VERIFIED));
        }
    }

    @Test
    void modelReservationSurvivesInterruptionBeforeFinalResponseAndCannotResetOnRestore()
            throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var goal = batchGoal(tools, 2);
            var ctx =
                    operationContext(
                            "Create two local websites and verify them",
                            ControlledMonitorTools.USER);
            var interrupted =
                    new Client(goal, call("initial", "monitor.create", tools.createArguments()));
            interrupted.stopWhenEmpty = true;
            var proof = run(ctx, tools, interrupted, false, false);
            var latest = proof.transcript().getLast();
            assertEquals(TranscriptMessage.TranscriptRole.TASK_CHECKPOINT, latest.getRole());
            assertEquals(3, latest.getTaskCheckpoint().modelRequests());
            assertFalse(latest.hasReplayContent());
            var resumedClient = new Client(goal);
            resumedClient.maxSteps = 3;
            run(restored(ctx, proof, tools), tools, resumedClient, false, false);
            assertEquals(0, resumedClient.requests.size());
            assertEquals(2, tools.effects);
            assertEquals(2, tools.probes);
        }
    }

    @Test
    void modelCannotRepeatAnAlreadyReceiptedExactUpdate() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.approved(
                    tools.request(
                            "monitor.create",
                            tools.createArguments(),
                            ControlledMonitorTools.USER));
            int before = tools.effects;
            var goal =
                    new AgentTaskAssessment.Goal(
                            AgentTaskAssessment.Type.CHANGE,
                            AgentTaskAssessment.Operation.UPDATE,
                            "monitor",
                            1,
                            List.of(1L),
                            Map.of("intervals", 45));
            var args = Map.<String, Object>of("monitorId", 1, "updates", Map.of("intervals", 45));
            var proof =
                    run(
                            operationContext(
                                    "Update monitor 1 interval to 45 seconds",
                                    ControlledMonitorTools.USER),
                            tools,
                            new Client(
                                    goal,
                                    call("update", "monitor.update", args),
                                    call("repeat", "monitor.update", args)),
                            false,
                            false);
            assertEquals(before + 1, tools.effects);
            assertEquals(AgentRuntimeEventType.ERROR, proof.events().getLast().getType());
        }
    }

    @Test
    void repeatedToolCallIdAcrossModelTurnsCannotRepeatAnApprovedProbe() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var goal =
                    new AgentTaskAssessment.Goal(
                            AgentTaskAssessment.Type.CHANGE,
                            AgentTaskAssessment.Operation.CREATE,
                            "monitor",
                            1);
            Map<String, String> parameters = new java.util.LinkedHashMap<>();
            tools.params().forEach((key, value) -> parameters.put(key, String.valueOf(value)));
            var client =
                    new Client(
                            goal,
                            call("types", "monitor.types", Map.of()),
                            call("params", "monitor.type_params", Map.of("app", "website")),
                            call(
                                    "reused",
                                    "monitor.detect_draft",
                                    Map.of("app", "website", "parameters", parameters)),
                            call(
                                    "reused",
                                    "monitor.detect_draft",
                                    Map.of("app", "website", "parameters", parameters)));
            var proof = run(context(), tools, client, false, false);
            assertEquals(1, tools.probes);
            assertEquals(0, tools.effects);
            assertEquals(3, tools.rows.size());
            assertEquals(AgentRuntimeEventType.ERROR, proof.events().getLast().getType());
        }
    }

    @Test
    void duplicateIdsInOneModelTurnAreRejectedBeforeEitherProbeExecutes() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var goal =
                    new AgentTaskAssessment.Goal(
                            AgentTaskAssessment.Type.CHANGE,
                            AgentTaskAssessment.Operation.CREATE,
                            "monitor",
                            1);
            Map<String, String> parameters = new java.util.LinkedHashMap<>();
            tools.params().forEach((key, value) -> parameters.put(key, String.valueOf(value)));
            var duplicate =
                    AgentRuntimeToolCall.builder()
                            .toolCallId("duplicate")
                            .toolName("monitor.detect_draft")
                            .arguments(Map.of("app", "website", "parameters", parameters))
                            .build();
            var proof =
                    run(
                            context(),
                            tools,
                            new Client(
                                    goal,
                                    call("types", "monitor.types", Map.of()),
                                    call("params", "monitor.type_params", Map.of("app", "website")),
                                    AgentRuntimeModelResponse.toolCalls(
                                            "", List.of(duplicate, duplicate), null)),
                            false,
                            false);
            assertEquals(0, tools.probes);
            assertEquals(0, tools.effects);
            assertEquals(2, tools.rows.size());
            assertEquals(AgentRuntimeEventType.ERROR, proof.events().getLast().getType());
        }
    }

    @Test
    void cancelBeforeTwentyFifthCreateStopsRemainingFiftyItemPlan() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var goal = batchGoal(tools, 50);
            var client =
                    new Client(goal, call("initial", "monitor.create", tools.createArguments()));
            client.maxToolCalls = 160;
            client.cancelAtCreateCount = 24;
            var proof =
                    run(
                            operationContext(
                                    "Create fifty local sites; tool budget 160",
                                    ControlledMonitorTools.USER),
                            tools,
                            client,
                            false,
                            false);
            assertEquals(24, tools.effects);
            assertEquals(25, tools.probes);
            assertEquals(24, tools.monitors.size());
            var checkpoint =
                    proof.transcript().reversed().stream()
                            .filter(m -> m.getTaskCheckpoint() != null)
                            .findFirst()
                            .orElseThrow()
                            .getTaskCheckpoint();
            assertEquals(50, checkpoint.monitorBatch().items().size());
            assertEquals(
                    24,
                    checkpoint.monitorBatch().items().stream()
                            .filter(i -> i.status() == AgentMonitorBatch.Status.VERIFIED)
                            .count());
            assertEquals(
                    25,
                    checkpoint.monitorBatch().items().stream()
                            .filter(i -> i.status() == AgentMonitorBatch.Status.PENDING)
                            .count());
            assertEquals(
                    1,
                    tools.rows.values().stream()
                            .filter(
                                    row ->
                                            "monitor.create".equals(row.getToolName())
                                                    && "DENIED".equals(row.getStatus())
                                                    && "REJECTED".equals(row.getApprovalStatus())
                                                    && "CANCELLED_BEFORE_APPROVAL_NOT_EXECUTED"
                                                            .equals(row.getErrorMessage()))
                            .count());
            assertEquals(
                    0,
                    tools.rows.values().stream()
                            .filter(row -> "WAITING_APPROVAL".equals(row.getStatus()))
                            .count());
        }
    }

    @Test
    void exactUserJsonPreservesKeysAndReplayingAcrossRunsDoesNotCreateAgain() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.enableNativeBulk();
            var goal = batchGoal(tools, 3);
            var items = new ArrayList<Map<String, Object>>();
            for (int i = 0; i < 3; i++) {
                var target = goal.createTargets().get(i);
                items.add(
                        Map.of(
                                "idempotencyKey",
                                "ai-e2e-explicit-" + i,
                                "name",
                                target.name(),
                                "url",
                                target.url(),
                                "intervals",
                                target.intervals(),
                                "timeout",
                                1000 * (i + 1)));
            }
            String json =
                    org.apache.hertzbeat.common.util.JsonUtil.toJson(
                            Map.of("items", items, "retryPreflightFailures", false));
            // Match the real rejected review shape: shared params were incorrectly projected from
            // one item.
            goal =
                    new AgentTaskAssessment.Goal(
                            goal.type(),
                            goal.operation(),
                            goal.resourceType(),
                            goal.expectedCount(),
                            List.of(),
                            Map.of(
                                    "app",
                                    "website",
                                    "intervals",
                                    600,
                                    "params",
                                    Map.of("timeout", 10000, "uri", "/wrong-shared-projection")),
                            goal.createTargets());
            var first =
                    run(
                            operationContext(
                                    "Create this exact website batch: " + json,
                                    ControlledMonitorTools.USER),
                            tools,
                            new Client(
                                    goal,
                                    call("initial", "monitor.create", tools.createArguments())),
                            false,
                            false);
            assertEquals(3, tools.effects);
            assertEquals(0, tools.probes);
            var checkpoint = first.transcript().getLast().getTaskCheckpoint();
            assertEquals(
                    "ai-e2e-explicit-0",
                    checkpoint.goal().createTargets().getFirst().idempotencyKey());
            var replay =
                    run(
                            operationContext(
                                    "Replay this exact create_batch, preserving all keys and"
                                            + " parameters: "
                                            + json,
                                    ControlledMonitorTools.USER),
                            tools,
                            new Client(
                                    goal,
                                    AgentRuntimeModelResponse.finalAnswer(
                                            "The earlier batch was partial; I cannot claim it"
                                                    + " completed.",
                                            null),
                                    AgentRuntimeModelResponse.finalAnswer(
                                            "No new tool execution was performed.", null)),
                            false,
                            false);
            assertEquals(3, tools.effects);
            assertEquals(0, tools.probes);
            assertEquals(
                    2,
                    tools.rows.values().stream()
                            .filter(row -> "monitor.create_batch".equals(row.getToolName()))
                            .count());
            for (var row :
                    tools.rows.values().stream()
                            .filter(row -> "monitor.create_batch".equals(row.getToolName()))
                            .toList()) {
                var output =
                        org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                                row.getResultOutput(), Map.class);
                var returned = (List<?>) ((Map<?, ?>) output.get("batch")).get("items");
                for (int i = 0; i < 3; i++) {
                    assertEquals(
                            "ai-e2e-explicit-" + i,
                            ((Map<?, ?>) returned.get(i)).get("idempotencyKey"));
                }
            }
            assertEquals(
                    AgentTaskOutcome.Stage.COMPLETE,
                    replay.transcript().getLast().getTaskOutcome().stage());
            assertTrue(replay.transcript().getLast().text().contains("No new monitors"));
        }
    }

    @Test
    void reviewedExplicitBatchStillRequiresApprovalAndNeverTreatsReadOnlyIntentAsWrite()
            throws Exception {
        for (boolean readOnly : List.of(false, true)) {
            try (var tools = new ControlledMonitorTools()) {
                tools.enableNativeBulk();
                var create = batchGoal(tools, 2);
                var goal =
                        readOnly
                                ? new AgentTaskAssessment.Goal(
                                        AgentTaskAssessment.Type.OBSERVATION,
                                        AgentTaskAssessment.Operation.QUERY,
                                        "monitor_batch",
                                        null)
                                : create;
                var proof =
                        run(
                                operationContext(
                                        (readOnly
                                                        ? "Read only existing batch status; do not"
                                                              + " create: "
                                                        : "Create these exact new website monitors"
                                                              + " and require manual approval: ")
                                                + explicitBatchJson(create),
                                        ControlledMonitorTools.USER),
                                tools,
                                new Client(
                                        goal,
                                        AgentRuntimeModelResponse.finalAnswer(
                                                "The original task has not completed.", null),
                                        AgentRuntimeModelResponse.finalAnswer(
                                                "No writes are verified.", null)),
                                false,
                                true);
                assertEquals(0, tools.effects);
                assertEquals(0, tools.probes);
                assertEquals(
                        readOnly ? 0 : 1,
                        tools.rows.values().stream()
                                .filter(row -> "monitor.create_batch".equals(row.getToolName()))
                                .count());
                assertEquals(
                        readOnly ? 0 : 1,
                        proof.events().stream()
                                .filter(
                                        event ->
                                                event.getType()
                                                        == AgentRuntimeEventType.REQUESTED_ACTION)
                                .count());
                assertTrue(
                        tools.rows.values().stream()
                                .filter(row -> "monitor.create_batch".equals(row.getToolName()))
                                .allMatch(row -> "DENIED".equals(row.getStatus())));
                if (!readOnly)
                    assertEquals(
                            AgentTaskOutcome.Stage.FAILED,
                            proof.transcript().getLast().getTaskOutcome().stage());
            }
        }
    }

    @Test
    void completionReviewCannotActivateAnExplicitPlanWithConflictingSemanticCount()
            throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.enableNativeBulk();
            var goal = batchGoal(tools, 3);
            run(
                    operationContext(
                            "Replay the exact request: " + explicitBatchJson(batchGoal(tools, 2)),
                            ControlledMonitorTools.USER),
                    tools,
                    new Client(
                            goal,
                            AgentRuntimeModelResponse.finalAnswer("Cannot claim success.", null),
                            AgentRuntimeModelResponse.finalAnswer("No action taken.", null)),
                    false,
                    false);
            assertEquals(0, tools.effects);
            assertEquals(0, tools.probes);
            assertEquals(0, tools.rows.size());
        }
    }

    private String explicitBatchJson(AgentTaskAssessment.Goal goal) {
        var items =
                goal.createTargets().stream()
                        .map(
                                target ->
                                        Map.of(
                                                "idempotencyKey",
                                                "ai-e2e-zero-tool-" + target.name(),
                                                "name",
                                                target.name(),
                                                "url",
                                                target.url(),
                                                "intervals",
                                                target.intervals(),
                                                "timeout",
                                                1000))
                        .toList();
        return JsonUtil.toJson(Map.of("items", items, "retryPreflightFailures", false));
    }

    @Test
    void rejectedNativeBatchApprovalCreatesNothingAndDoesNotAdvanceOtherGroups() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.enableNativeBulk();
            var goal = batchGoal(tools, 50);
            var context =
                    operationContext(
                            "Create fifty local website monitors at interval 600 seconds",
                            ControlledMonitorTools.USER);
            var proof =
                    run(
                            context,
                            tools,
                            new Client(
                                    goal,
                                    call("initial", "monitor.create", tools.createArguments())),
                            false,
                            true);
            assertEquals(0, tools.effects);
            assertEquals(0, tools.probes);
            assertEquals(1, tools.rows.size());
            assertEquals("DENIED", tools.rows.values().iterator().next().getStatus());
            assertEquals(
                    AgentTaskOutcome.Stage.FAILED,
                    proof.transcript().getLast().getTaskOutcome().stage());
        }
    }

    @Test
    void nativeBulkCreatesFrozenFiftyWithOneApprovedCallAndNoPerItemRoundTrips() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.enableNativeBulk();
            var goal = batchGoal(tools, 50);
            var context =
                    operationContext(
                            "Create fifty local website monitors at interval 600 seconds",
                            ControlledMonitorTools.USER);
            var client =
                    new Client(goal, call("initial", "monitor.create", tools.createArguments()));
            var proof = run(context, tools, client, false, false);
            assertEquals(
                    50,
                    tools.effects,
                    () ->
                            org.apache.hertzbeat.common.util.JsonUtil.toJson(
                                    Map.of(
                                            "last",
                                            proof.transcript().getLast(),
                                            "rows",
                                            tools.rows.values())));
            assertEquals(0, tools.probes);
            assertEquals(1, tools.rows.size());
            Map<String, Object> submitted =
                    org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                            tools.rows.values().iterator().next().getInputJson(), Map.class);
            assertEquals(50, AgentMonitorBulkArguments.items(submitted).size());
            assertTrue(AgentMonitorBulkArguments.permits(goal, submitted));
            assertTrue(
                    tools.rows.values().stream()
                            .allMatch(
                                    row ->
                                            "monitor.create_batch".equals(row.getToolName())
                                                    && "SUCCEEDED".equals(row.getStatus())));
            assertEquals(2, client.requests.size());
            var last = proof.transcript().getLast();
            assertEquals(AgentTaskOutcome.Stage.COMPLETE, last.getTaskOutcome().stage());
            assertEquals("monitor-batch.v2", last.getTaskCheckpoint().monitorBatch().version());
            assertEquals(
                    50,
                    last.getTaskCheckpoint().monitorBatch().items().stream()
                            .filter(item -> item.status() == AgentMonitorBatch.Status.VERIFIED)
                            .count());
        }
    }

    @Test
    void nativeBulkCreatesUnavailableTargetsWithoutClaimingHealthAndReplaysOnlyReceipts()
            throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.enableNativeBulk();
            var requests = new java.util.concurrent.atomic.AtomicInteger();
            tools.http.createContext(
                    "/denied",
                    exchange -> {
                        requests.incrementAndGet();
                        exchange.sendResponseHeaders(403, -1);
                        exchange.close();
                    });
            var source = batchGoal(tools, 50);
            var targets = new ArrayList<>(source.createTargets());
            var first = targets.getFirst();
            targets.set(
                    0,
                    new AgentTaskAssessment.CreateTarget(
                            first.name(),
                            "http://127.0.0.1:" + tools.http.getAddress().getPort() + "/denied",
                            600));
            var goal =
                    new AgentTaskAssessment.Goal(
                            source.type(),
                            source.operation(),
                            source.resourceType(),
                            source.expectedCount(),
                            source.resourceIds(),
                            source.expectedChanges(),
                            targets);
            var proof =
                    run(
                            operationContext(
                                    "Create fifty local website monitors at interval 600 seconds",
                                    ControlledMonitorTools.USER),
                            tools,
                            new Client(
                                    goal,
                                    call("initial", "monitor.create", tools.createArguments())),
                            false,
                            false);
            assertEquals(50, tools.effects);
            assertEquals(0, tools.probes);
            assertEquals(0, requests.get());
            assertEquals(
                    AgentTaskOutcome.Stage.COMPLETE,
                    proof.transcript().getLast().getTaskOutcome().stage());
            assertEquals(50, proof.transcript().getLast().getTaskOutcome().verifiedCount());
            assertTrue(
                    proof.transcript().stream()
                            .anyMatch(
                                    message ->
                                            message.text() != null
                                                    && message.text()
                                                            .contains("\"healthVerified\":false")));
            var ids = java.util.Set.copyOf(tools.monitors.keySet());
            var items =
                    proof.transcript().getLast().getTaskCheckpoint().monitorBatch().items().stream()
                            .map(
                                    item ->
                                            AgentMonitorBulkArguments.item(
                                                    item.id(), item.arguments()))
                            .toList();
            var replay =
                    run(
                            operationContext(
                                    "Replay this exact create_batch: "
                                            + JsonUtil.toJson(
                                                    Map.of(
                                                            "items",
                                                            items,
                                                            "retryPreflightFailures",
                                                            false)),
                                    ControlledMonitorTools.USER),
                            tools,
                            new Client(goal),
                            false,
                            false);
            assertEquals(50, tools.effects);
            assertEquals(0, tools.probes);
            assertEquals(0, requests.get());
            assertEquals(ids, tools.monitors.keySet());
            assertEquals(
                    AgentTaskOutcome.Stage.COMPLETE,
                    replay.transcript().getLast().getTaskOutcome().stage());
        }
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(ints = {0, 1, 2})
    void explicitSegmentsFinishFrozenFiftyWithoutResettingAnyRunBudgetOrCallingModel(
            int sharedShape) throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var goal = batchGoal(tools, 50);
            if (sharedShape > 0) {
                goal =
                        new AgentTaskAssessment.Goal(
                                goal.type(),
                                goal.operation(),
                                goal.resourceType(),
                                goal.expectedCount(),
                                goal.resourceIds(),
                                sharedShape == 1
                                        ? Map.of("params", Map.of("timeout", 10000))
                                        : Map.of(
                                                "app",
                                                "website",
                                                "intervals",
                                                600,
                                                "protocol",
                                                "HTTP",
                                                "scheme",
                                                "http",
                                                "port",
                                                tools.http.getAddress().getPort(),
                                                "timeout",
                                                10000),
                                goal.createTargets());
            }

            var firstContext =
                    operationContext(
                            "Create fifty local website monitors at interval 600 seconds",
                            ControlledMonitorTools.USER);
            var first =
                    run(
                            firstContext,
                            tools,
                            new Client(
                                    goal,
                                    call("initial", "monitor.create", tools.createArguments()),
                                    AgentRuntimeModelResponse.finalAnswer(
                                            "Twenty verified, thirty pending.", null)),
                            false,
                            false);
            assertEquals(20, tools.effects);
            var frozen = first.transcript().getLast().getTaskCheckpoint().monitorBatch();
            var history = new ArrayList<>(restored(firstContext, first, tools).budgetAttempts());
            for (int segment = 1; segment <= 2; segment++) {
                var context =
                        operationContext(
                                        "Continue frozen batch segment " + segment,
                                        ControlledMonitorTools.USER)
                                .withBatchContinuation(
                                        new AgentBatchContinuation(
                                                firstContext.getRunUid(),
                                                segment,
                                                goal,
                                                frozen,
                                                List.copyOf(history),
                                                64,
                                                false));
                var client = new Client(goal);
                var proof = run(context, tools, client, false, false);
                assertEquals(0, client.requests.size());
                var attempts = restored(context, proof, tools).budgetAttempts();
                assertTrue(attempts.size() <= 64);
                history.addAll(attempts);
                assertEquals(segment == 1 ? 40 : 50, tools.effects);
                assertEquals(
                        segment == 1
                                ? AgentTaskOutcome.Stage.PARTIAL
                                : AgentTaskOutcome.Stage.COMPLETE,
                        proof.transcript().getLast().getTaskOutcome().stage());
            }
            if (sharedShape > 0) {
                for (var monitor : tools.monitors.values()) {
                    assertTrue(
                            monitor.getParams().stream()
                                    .anyMatch(
                                            param ->
                                                    "timeout".equals(param.getField())
                                                            && "10000"
                                                                    .equals(
                                                                            param
                                                                                    .getParamValue())));
                }
            }
            assertEquals(50, tools.monitors.size());
            assertEquals(50, tools.probes);
            assertEquals(156, tools.rows.size());
        }
    }

    @Test
    void unknownCreateContinuationOnlyLooksUpAndReadsMatchingResourceWithoutRecreating()
            throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var goal = batchGoal(tools, 2);
            var root =
                    operationContext(
                            "Create two local website monitors", ControlledMonitorTools.USER);
            var first =
                    run(
                            root,
                            tools,
                            new Client(
                                    goal,
                                    call("initial", "monitor.create", tools.createArguments())),
                            false,
                            false,
                            false,
                            true);
            tools.rows.values().stream()
                    .filter(row -> "monitor.create".equals(row.getToolName()))
                    .forEach(
                            row -> {
                                row.setStatus("RUNNING");
                                row.setResultOutput(null);
                            });
            var checkpoint =
                    first.transcript().reversed().stream()
                            .filter(m -> m.getTaskCheckpoint() != null)
                            .findFirst()
                            .orElseThrow()
                            .getTaskCheckpoint();
            var history = restored(root, first, tools).budgetAttempts();
            var context =
                    operationContext("Reconcile frozen batch", ControlledMonitorTools.USER)
                            .withBatchContinuation(
                                    new AgentBatchContinuation(
                                            root.getRunUid(),
                                            1,
                                            goal,
                                            checkpoint.monitorBatch(),
                                            history,
                                            64,
                                            true));
            var client = new Client(goal);
            var proof = run(context, tools, client, false, false);
            assertEquals(1, tools.effects);
            assertEquals(1, tools.probes);
            assertEquals(0, client.requests.size());
            assertTrue(
                    proof.events().stream().anyMatch(e -> "monitor.query".equals(e.getToolName())));
            assertTrue(
                    proof.events().stream().anyMatch(e -> "monitor.get".equals(e.getToolName())));
            assertEquals(
                    AgentTaskOutcome.Stage.RECOVERY_REQUIRED,
                    proof.transcript().getLast().getTaskOutcome().stage());
            assertEquals(
                    AgentMonitorBatch.Status.MATCHED_REVIEW,
                    proof.transcript()
                            .getLast()
                            .getTaskCheckpoint()
                            .monitorBatch()
                            .items()
                            .getFirst()
                            .status());
        }
    }

    private static AgentTaskAssessment.Goal batchGoal(ControlledMonitorTools tools, int count) {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                AgentTaskAssessment.Operation.CREATE,
                "monitor",
                count,
                List.of(),
                Map.of(),
                java.util.stream.IntStream.range(0, count)
                        .mapToObj(
                                i ->
                                        new AgentTaskAssessment.CreateTarget(
                                                "local-" + i,
                                                "http://127.0.0.1:"
                                                        + tools.http.getAddress().getPort()
                                                        + "/health/"
                                                        + i,
                                                600))
                        .toList());
    }

    private AgentRuntimeContext restored(
            AgentRuntimeContext ctx, Proof proof, ControlledMonitorTools tools) {
        var recorder = mock(AgentTranscriptRecorder.class);
        when(recorder.findRunTaskCheckpoint(ctx.getRunId()))
                .thenReturn(
                        proof.transcript().reversed().stream()
                                .filter(m -> m.getTaskCheckpoint() != null)
                                .findFirst());
        when(recorder.findRunGroundingMessages(ctx.getRunId()))
                .thenReturn(
                        proof.transcript().stream()
                                .filter(
                                        m ->
                                                m.getRole()
                                                        == TranscriptMessage.TranscriptRole
                                                                .TOOL_RESULT)
                                .toList());
        var history =
                new AgentGroundingEvidenceVerifier(recorder, tools.dao)
                        .verifyHistory(
                                AgentRun.builder()
                                        .id(ctx.getRunId())
                                        .sessionId(ctx.getRunSessionId())
                                        .runUid(ctx.getRunUid())
                                        .entryType("USER_INPUT")
                                        .build(),
                                null,
                                List.of());
        return ctx.withVerifiedChatHistory(history);
    }

    @Test
    void namedTemplateCreationUsesNativePreviewWriteReadbackAndExactGoal() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var nativeService =
                    org.mockito.Mockito.mock(
                            org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionService
                                    .class);
            String app = "ai-e2e-template";
            String yaml = "app: ai-e2e-template\nname: {en-US: Test}\n";
            org.mockito.Mockito.when(nativeService.validate(org.mockito.ArgumentMatchers.any()))
                    .thenReturn(
                            new org.apache.hertzbeat.manager.monitor.definition
                                    .MonitorDefinitionValidationResponse(
                                    1,
                                    true,
                                    app,
                                    org.apache.hertzbeat.manager.monitor.definition
                                            .MonitorDefinitionOrigin.CUSTOM));
            org.mockito.Mockito.when(nativeService.detail(app, "en-US"))
                    .thenReturn(
                            new org.apache.hertzbeat.manager.monitor.definition
                                    .MonitorDefinitionDetailResponse(
                                    1,
                                    app,
                                    "Test",
                                    org.apache.hertzbeat.manager.monitor.definition
                                            .MonitorDefinitionOrigin.CUSTOM,
                                    true,
                                    true,
                                    false,
                                    yaml,
                                    "a".repeat(64)));
            tools.enableDefinitions(nativeService);
            var goal =
                    new AgentTaskAssessment.Goal(
                            AgentTaskAssessment.Type.CHANGE,
                            AgentTaskAssessment.Operation.CREATE,
                            "monitor_definition",
                            1,
                            List.of(),
                            Map.of("app", app));
            String hash =
                    org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorDefinitionDraft
                            .previewHash("create", app, null, yaml);
            var proof =
                    run(
                            operationContext(
                                    "Create the ai-e2e-template monitor template",
                                    ControlledMonitorTools.ADMIN),
                            tools,
                            new Client(
                                    goal,
                                    call(
                                            "preview",
                                            "monitor.definition_preview",
                                            Map.of(
                                                    "operation",
                                                    "create",
                                                    "app",
                                                    app,
                                                    "definition",
                                                    yaml)),
                                    call(
                                            "save",
                                            "monitor.definition_create",
                                            Map.of(
                                                    "app",
                                                    app,
                                                    "definition",
                                                    yaml,
                                                    "previewHash",
                                                    hash)),
                                    AgentRuntimeModelResponse.finalAnswer(
                                            "Unsupported claim: every monitored host is healthy.",
                                            null)),
                            false,
                            false);
            org.mockito.Mockito.verify(nativeService)
                    .create(
                            new org.apache.hertzbeat.manager.monitor.definition
                                    .MonitorDefinitionWriteRequest(yaml),
                            "en-US");
            assertEquals(
                    AgentTaskOutcome.Stage.COMPLETE,
                    proof.transcript().getLast().getTaskOutcome().stage());
            assertEquals(1, proof.transcript().getLast().getTaskOutcome().verifiedCount());
            assertEquals(0, tools.effects);
            assertTrue(
                    proof.transcript().getLast().text().contains("Saved template ai-e2e-template"));
            assertFalse(
                    proof.transcript()
                            .getLast()
                            .text()
                            .contains("every monitored host is healthy"));
        }
    }

    @Test
    void templateMutationWithoutDurablePreviewDoesNotWrite() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var nativeService =
                    org.mockito.Mockito.mock(
                            org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionService
                                    .class);
            tools.enableDefinitions(nativeService);
            String app = "ai-e2e-template";
            String yaml = "app: ai-e2e-template\nname: {en-US: Test}\n";
            var goal =
                    new AgentTaskAssessment.Goal(
                            AgentTaskAssessment.Type.CHANGE,
                            AgentTaskAssessment.Operation.CREATE,
                            "monitor_definition",
                            1,
                            List.of(),
                            Map.of("app", app));
            String hash =
                    org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorDefinitionDraft
                            .previewHash("create", app, null, yaml);
            run(
                    operationContext(
                            "Create ai-e2e-template monitor template",
                            ControlledMonitorTools.ADMIN),
                    tools,
                    new Client(
                            goal,
                            call(
                                    "save",
                                    "monitor.definition_create",
                                    Map.of("app", app, "definition", yaml, "previewHash", hash)),
                            AgentRuntimeModelResponse.finalAnswer(
                                    "Cannot save before native validation.", null)),
                    false,
                    false);
            org.mockito.Mockito.verifyNoInteractions(nativeService);
        }
    }

    @Test
    void templateUpdateKeepsExplicitApprovalAndConditionalRevision() throws Exception {
        for (boolean rejected : List.of(false, true)) {
            try (var tools = new ControlledMonitorTools()) {
                var nativeService =
                        org.mockito.Mockito.mock(
                                org.apache.hertzbeat.manager.monitor.definition
                                        .MonitorDefinitionService.class);
                String app = "ai-e2e-template";
                String yaml = "app: ai-e2e-template\nname: {en-US: Updated}\n";
                String revision = "a".repeat(64);
                var old =
                        new org.apache.hertzbeat.manager.monitor.definition
                                .MonitorDefinitionDetailResponse(
                                1,
                                app,
                                "Old",
                                org.apache.hertzbeat.manager.monitor.definition
                                        .MonitorDefinitionOrigin.CUSTOM,
                                true,
                                true,
                                false,
                                "app: ai-e2e-template\n",
                                revision);
                var saved =
                        new org.apache.hertzbeat.manager.monitor.definition
                                .MonitorDefinitionDetailResponse(
                                1,
                                app,
                                "Updated",
                                old.origin(),
                                true,
                                true,
                                false,
                                yaml,
                                "b".repeat(64));
                org.mockito.Mockito.when(nativeService.detail(app, "en-US"))
                        .thenReturn(old, old, saved);
                org.mockito.Mockito.when(nativeService.validate(org.mockito.ArgumentMatchers.any()))
                        .thenReturn(
                                new org.apache.hertzbeat.manager.monitor.definition
                                        .MonitorDefinitionValidationResponse(
                                        1, true, app, old.origin()));
                tools.enableDefinitions(nativeService);
                var goal =
                        new AgentTaskAssessment.Goal(
                                AgentTaskAssessment.Type.CHANGE,
                                AgentTaskAssessment.Operation.UPDATE,
                                "monitor_definition",
                                1,
                                List.of(),
                                Map.of("app", app));
                String hash =
                        org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorDefinitionDraft
                                .previewHash("update", app, revision, yaml);
                var proof =
                        run(
                                operationContext(
                                        "Update only ai-e2e-template",
                                        ControlledMonitorTools.ADMIN),
                                tools,
                                new Client(
                                        goal,
                                        call(
                                                "preview",
                                                "monitor.definition_preview",
                                                Map.of(
                                                        "operation",
                                                        "update",
                                                        "app",
                                                        app,
                                                        "revision",
                                                        revision,
                                                        "definition",
                                                        yaml)),
                                        call(
                                                "update",
                                                "monitor.definition_update",
                                                Map.of(
                                                        "app",
                                                        app,
                                                        "revision",
                                                        revision,
                                                        "definition",
                                                        yaml,
                                                        "previewHash",
                                                        hash)),
                                        AgentRuntimeModelResponse.finalAnswer(
                                                "The requested template was updated.", null)),
                                false,
                                rejected);
                assertTrue(
                        proof.events().stream()
                                .anyMatch(
                                        e ->
                                                e.getType()
                                                        == AgentRuntimeEventType.REQUESTED_ACTION));
                if (rejected) {
                    org.mockito.Mockito.verify(nativeService, org.mockito.Mockito.never())
                            .update(
                                    org.mockito.ArgumentMatchers.anyString(),
                                    org.mockito.ArgumentMatchers.anyString(),
                                    org.mockito.ArgumentMatchers.any(),
                                    org.mockito.ArgumentMatchers.anyString());
                } else {
                    org.mockito.Mockito.verify(nativeService)
                            .update(
                                    app,
                                    "\"" + revision + "\"",
                                    new org.apache.hertzbeat.manager.monitor.definition
                                            .MonitorDefinitionWriteRequest(yaml),
                                    "en-US");
                    assertEquals(
                            AgentTaskOutcome.Stage.COMPLETE,
                            proof.transcript().getLast().getTaskOutcome().stage());
                }
            }
        }
    }

    @Test
    void realBatchStatusPathReportsPartialReceiptsWithoutInventingNewWrites() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.enableNativeBulk();
            var deniedRequests = new java.util.concurrent.atomic.AtomicInteger();
            tools.http.createContext(
                    "/denied",
                    exchange -> {
                        deniedRequests.incrementAndGet();
                        exchange.sendResponseHeaders(403, -1);
                        exchange.close();
                    });
            org.mockito.Mockito.doAnswer(
                            invocation -> {
                                if ("local-denied"
                                        .equals(
                                                invocation
                                                        .<org.apache.hertzbeat.manager.pojo.dto
                                                                        .MonitorDto>
                                                                getArgument(0)
                                                        .getMonitor()
                                                        .getName()))
                                    throw new IllegalArgumentException(
                                            "Invalid native configuration");
                                return null;
                            })
                    .when(tools.domain)
                    .validate(
                            org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
            var source = batchGoal(tools, 3);
            var targets = new ArrayList<>(source.createTargets());
            targets.set(
                    1,
                    new AgentTaskAssessment.CreateTarget(
                            "local-denied",
                            "http://127.0.0.1:" + tools.http.getAddress().getPort() + "/denied",
                            600));
            var goal =
                    new AgentTaskAssessment.Goal(
                            source.type(),
                            source.operation(),
                            source.resourceType(),
                            3,
                            List.of(),
                            source.expectedChanges(),
                            targets);
            var created =
                    run(
                            operationContext(
                                    "Create the three frozen local website items",
                                    ControlledMonitorTools.USER),
                            tools,
                            new Client(
                                    goal,
                                    call("create", "monitor.create", tools.createArguments())),
                            false,
                            false);
            assertEquals(2, tools.effects);
            int probes = tools.probes;
            var items =
                    created
                            .transcript()
                            .getLast()
                            .getTaskCheckpoint()
                            .monitorBatch()
                            .items()
                            .stream()
                            .map(
                                    item ->
                                            AgentMonitorBulkArguments.item(
                                                    item.id(), item.arguments()))
                            .toList();
            var replay =
                    run(
                            operationContext(
                                    "Replay this exact create_batch: "
                                            + JsonUtil.toJson(
                                                    Map.of(
                                                            "items",
                                                            items,
                                                            "retryPreflightFailures",
                                                            false)),
                                    ControlledMonitorTools.USER),
                            tools,
                            new Client(
                                    goal,
                                    AgentRuntimeModelResponse.finalAnswer(
                                            "The earlier task was partial.", null),
                                    AgentRuntimeModelResponse.finalAnswer(
                                            "No tools were called.", null)),
                            false,
                            false);
            assertEquals(2, tools.effects);
            assertEquals(probes, tools.probes);
            assertEquals(0, deniedRequests.get());
            assertEquals(
                    AgentTaskOutcome.Stage.PARTIAL,
                    replay.transcript().getLast().getTaskOutcome().stage());
            assertEquals(2, replay.transcript().getLast().getTaskOutcome().verifiedCount());
            assertTrue(replay.transcript().getLast().text().contains("preflight"));
            assertFalse(replay.transcript().getLast().text().contains("budget"));
            var readGoal =
                    new AgentTaskAssessment.Goal(
                            AgentTaskAssessment.Type.OBSERVATION,
                            AgentTaskAssessment.Operation.QUERY,
                            "monitor_batch",
                            3);
            var proof =
                    run(
                            operationContext(
                                    "Read only the existing native batch receipts; do not create or"
                                            + " retry",
                                    ControlledMonitorTools.USER),
                            tools,
                            new Client(
                                    readGoal,
                                    call(
                                            "status",
                                            "monitor.batch_status",
                                            Map.of(
                                                    "items",
                                                    items,
                                                    "retryPreflightFailures",
                                                    false)),
                                    AgentRuntimeModelResponse.finalAnswer(
                                            "No trustworthy data is available", null)),
                            false,
                            false);
            assertEquals(2, tools.effects);
            assertEquals(probes, tools.probes);
            assertEquals(
                    AgentTaskOutcome.Stage.COMPLETE,
                    proof.transcript().getLast().getTaskOutcome().stage());
            assertTrue(
                    proof.transcript().getLast().text().contains("2/3 verified"),
                    proof.transcript().getLast().text());
            assertTrue(proof.transcript().getLast().text().contains("1 failed"));
            assertTrue(proof.transcript().getLast().text().contains("performed no writes"));
            assertEquals(0, proof.transcript().getLast().getTaskOutcome().receiptCount());
        }
    }

    @Test
    void shortDelegatedWebsiteRequestFreezesFiftyAndUsesOneNativeApprovedBatch() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.enableNativeBulk();
            org.mockito.Mockito.doAnswer(
                            invocation -> {
                                tools.probes++;
                                return null;
                            })
                    .when(tools.domain)
                    .detectMonitor(
                            org.mockito.ArgumentMatchers.any(),
                            org.mockito.ArgumentMatchers.any(),
                            org.mockito.ArgumentMatchers.any());
            var domains =
                    java.util.stream.IntStream.range(0, 50)
                            .mapToObj(i -> "site" + i + ".org")
                            .toList();
            var client =
                    new Client(
                            new AgentTaskAssessment.Goal(
                                    AgentTaskAssessment.Type.CHANGE,
                                    AgentTaskAssessment.Operation.CREATE,
                                    "monitor",
                                    50),
                            call(
                                    "compact-websites",
                                    "monitor.plan_websites",
                                    Map.of("domains", domains)));
            var proof =
                    run(
                            operationContext(
                                    "Pick any fifty public domains and create website monitors.",
                                    ControlledMonitorTools.USER),
                            tools,
                            client,
                            false,
                            false);
            assertEquals(
                    AgentRuntimeEventType.RUN_COMPLETED,
                    proof.events().getLast().getType(),
                    () -> proof.transcript().getLast().text());
            assertEquals(50, tools.effects);
            assertEquals(0, tools.probes);
            assertEquals(2, client.requests.size());
            assertEquals(
                    1,
                    tools.rows.values().stream()
                            .filter(row -> "monitor.create_batch".equals(row.getToolName()))
                            .count());
            assertEquals(
                    1,
                    proof.events().stream()
                            .filter(
                                    event ->
                                            event.getType()
                                                    == AgentRuntimeEventType.REQUESTED_ACTION)
                            .count());
            assertTrue(
                    proof.transcript()
                            .getLast()
                            .getTaskCheckpoint()
                            .manifestReference()
                            .preflightComplete());
        }
    }

    @Test
    void wrongTypeWebsiteDomainsAreCorrectedWithoutCoercionOrUnboundedRetries() throws Exception {
        for (Object invalid :
                List.of(
                        "site0.org,site1.org",
                        "[\"site0.org\"]",
                        Map.of("host", "site0.org"),
                        50)) {
            for (boolean correct : List.of(true, false)) {
                try (var tools = new ControlledMonitorTools()) {
                    tools.enableNativeBulk();
                    var domains =
                            java.util.stream.IntStream.range(0, 50)
                                    .mapToObj(i -> "site" + i + ".org")
                                    .toList();
                    var client =
                            new Client(
                                    new AgentTaskAssessment.Goal(
                                            AgentTaskAssessment.Type.CHANGE,
                                            AgentTaskAssessment.Operation.CREATE,
                                            "monitor",
                                            50),
                                    call(
                                            "wrong-type",
                                            "monitor.plan_websites",
                                            Map.of("domains", invalid)),
                                    call(
                                            "repair-one",
                                            "monitor.plan_websites",
                                            Map.of("domains", correct ? domains : invalid)),
                                    call(
                                            "repair-two",
                                            "monitor.plan_websites",
                                            Map.of("domains", invalid)));
                    var proof =
                            run(
                                    operationContext(
                                            "Choose fifty public domains and create website"
                                                + " monitors",
                                            ControlledMonitorTools.USER),
                                    tools,
                                    client,
                                    false,
                                    false);
                    assertEquals(correct ? 50 : 0, tools.effects);
                    assertEquals(0, tools.probes);
                    assertEquals(3, client.requests.size());
                    assertEquals(
                            correct ? 1 : 0,
                            proof.events().stream()
                                    .filter(
                                            event ->
                                                    event.getType()
                                                            == AgentRuntimeEventType
                                                                    .REQUESTED_ACTION)
                                    .count());
                    assertEquals(
                            correct
                                    ? AgentRuntimeEventType.RUN_COMPLETED
                                    : AgentRuntimeEventType.ERROR,
                            proof.events().getLast().getType());
                    assertTrue(
                            proof.transcript().stream()
                                    .anyMatch(
                                            message ->
                                                    message.text()
                                                            .contains(
                                                                    "Tool argument domains must"
                                                                        + " have JSON type"
                                                                        + " array")));
                    assertTrue(
                            client.requests.stream()
                                    .anyMatch(
                                            request ->
                                                    request.getPrompt()
                                                            .getInstructions()
                                                            .contains(
                                                                    "WEBSITE_PROPOSAL_DOMAINS_ARRAY_REQUIRED")));
                }
            }
        }
    }

    @Test
    void correctedWebsiteSchemaStillRequiresFullApprovalWithRetainedCandidatePool()
            throws Exception {
        for (boolean supplement : List.of(false, true)) {
            for (String decision : List.of("approve", "reject", "cancel")) {
                try (var tools = new ControlledMonitorTools()) {
                    if (supplement)
                        for (int i = 0; i < 25; i++)
                            tools.existingWebsiteHosts.add("site" + i + ".org");
                    tools.enableNativeBulk();
                    var initial =
                            java.util.stream.IntStream.range(0, 50)
                                    .mapToObj(i -> "site" + i + ".org")
                                    .toList();
                    var replacements =
                            java.util.stream.IntStream.range(50, 75)
                                    .mapToObj(i -> "site" + i + ".org")
                                    .toList();
                    var responses = new ArrayList<AgentRuntimeModelResponse>();
                    if (supplement)
                        responses.add(
                                call(
                                        "initial",
                                        "monitor.plan_websites",
                                        Map.of("domains", initial)));
                    responses.add(
                            call(
                                    "wrong-type",
                                    "monitor.plan_websites",
                                    Map.of("domains", "not-an-array")));
                    responses.add(
                            call(
                                    "correct-type",
                                    "monitor.plan_websites",
                                    Map.of("domains", supplement ? replacements : initial)));
                    var client =
                            new Client(
                                    new AgentTaskAssessment.Goal(
                                            AgentTaskAssessment.Type.CHANGE,
                                            AgentTaskAssessment.Operation.CREATE,
                                            "monitor",
                                            50),
                                    responses.toArray(AgentRuntimeModelResponse[]::new));
                    var proof =
                            run(
                                    operationContext(
                                            "Choose fifty public domains and create website"
                                                + " monitors",
                                            ControlledMonitorTools.USER),
                                    tools,
                                    client,
                                    false,
                                    "reject".equals(decision),
                                    "cancel".equals(decision),
                                    false);
                    assertEquals("approve".equals(decision) ? 50 : 0, tools.effects);
                    assertEquals(0, tools.probes);
                    assertEquals(supplement ? 5 : 3, client.requests.size());
                    assertEquals(
                            1,
                            proof.events().stream()
                                    .filter(
                                            event ->
                                                    event.getType()
                                                            == AgentRuntimeEventType
                                                                    .REQUESTED_ACTION)
                                    .count());
                }
            }
        }
    }

    @Test
    void unrelatedWebsiteSchemaFailuresDoNotGainDomainTypeRepair() throws Exception {
        for (var arguments :
                List.<Map<String, Object>>of(
                        Map.of("domains", List.of("site0.org"), "timeout", "3000"),
                        Map.of("domains", "site0.org", "unregisteredField", true))) {
            try (var tools = new ControlledMonitorTools()) {
                tools.enableNativeBulk();
                var client =
                        new Client(
                                new AgentTaskAssessment.Goal(
                                        AgentTaskAssessment.Type.CHANGE,
                                        AgentTaskAssessment.Operation.CREATE,
                                        "monitor",
                                        50),
                                call("unrelated-schema-error", "monitor.plan_websites", arguments));
                var proof =
                        run(
                                operationContext(
                                        "Choose fifty public domains and create website monitors",
                                        ControlledMonitorTools.USER),
                                tools,
                                client,
                                false,
                                false);
                assertEquals(0, tools.effects);
                assertEquals(0, tools.probes);
                assertEquals(1, client.requests.size());
                assertTrue(
                        proof.events().stream()
                                .noneMatch(
                                        event ->
                                                event.getType()
                                                        == AgentRuntimeEventType.REQUESTED_ACTION));
                assertEquals(AgentRuntimeEventType.ERROR, proof.events().getLast().getType());
            }
        }
    }

    @Test
    void duplicateWebsiteProposalIsCorrectedBeforeOneFullApprovalOrStopsAfterTwoCorrections()
            throws Exception {
        for (boolean correct : List.of(true, false)) {
            try (var tools = new ControlledMonitorTools()) {
                tools.enableNativeBulk();
                org.mockito.Mockito.doAnswer(
                                invocation -> {
                                    tools.probes++;
                                    return null;
                                })
                        .when(tools.domain)
                        .detectMonitor(
                                org.mockito.ArgumentMatchers.any(),
                                org.mockito.ArgumentMatchers.any(),
                                org.mockito.ArgumentMatchers.any());
                var domains =
                        java.util.stream.IntStream.range(0, 50)
                                .mapToObj(i -> "site" + i + ".org")
                                .toList();
                var duplicate = new java.util.ArrayList<>(domains);
                duplicate.set(49, "SITE0.ORG");
                var client =
                        new Client(
                                new AgentTaskAssessment.Goal(
                                        AgentTaskAssessment.Type.CHANGE,
                                        AgentTaskAssessment.Operation.CREATE,
                                        "monitor",
                                        50),
                                call(
                                        "bad-first",
                                        "monitor.plan_websites",
                                        Map.of("domains", duplicate)),
                                call(
                                        "correction-one",
                                        "monitor.plan_websites",
                                        Map.of("domains", correct ? domains : duplicate)),
                                call(
                                        "correction-two",
                                        "monitor.plan_websites",
                                        Map.of("domains", duplicate)));
                var proof =
                        run(
                                operationContext(
                                        "Choose fifty public domains and create website monitors",
                                        ControlledMonitorTools.USER),
                                tools,
                                client,
                                false,
                                false);
                assertEquals(correct ? 50 : 0, tools.effects);
                assertEquals(0, tools.probes);
                assertEquals(3, client.requests.size());
                assertEquals(
                        correct ? 1 : 0,
                        proof.events().stream()
                                .filter(
                                        event ->
                                                event.getType()
                                                        == AgentRuntimeEventType.REQUESTED_ACTION)
                                .count());
                assertEquals(
                        correct ? AgentRuntimeEventType.RUN_COMPLETED : AgentRuntimeEventType.ERROR,
                        proof.events().getLast().getType());
                assertTrue(
                        proof.transcript().stream()
                                .anyMatch(
                                        message ->
                                                message.text()
                                                        .contains("WEBSITE_PROPOSAL_DUPLICATE")));
            }
        }
    }

    @Test
    void websiteCorrectionCannotReplaceExplicitTargetsAndCountMismatchRequiresNewReview()
            throws Exception {
        for (boolean explicit : List.of(true, false)) {
            try (var tools = new ControlledMonitorTools()) {
                tools.enableNativeBulk();
                org.mockito.Mockito.doAnswer(
                                invocation -> {
                                    tools.probes++;
                                    return null;
                                })
                        .when(tools.domain)
                        .detectMonitor(
                                org.mockito.ArgumentMatchers.any(),
                                org.mockito.ArgumentMatchers.any(),
                                org.mockito.ArgumentMatchers.any());
                var client =
                        new Client(
                                new AgentTaskAssessment.Goal(
                                        AgentTaskAssessment.Type.CHANGE,
                                        AgentTaskAssessment.Operation.CREATE,
                                        "monitor",
                                        3),
                                call(
                                        "initial",
                                        "monitor.plan_websites",
                                        Map.of(
                                                "domains",
                                                explicit
                                                        ? List.of(
                                                                "apache.org",
                                                                "apache.org",
                                                                "mozilla.org")
                                                        : List.of("apache.org", "mozilla.org"))),
                                call(
                                        "revised",
                                        "monitor.plan_websites",
                                        Map.of(
                                                "domains",
                                                List.of(
                                                        "mozilla.org",
                                                        "python.org",
                                                        "rust-lang.org"))));
                var proof =
                        run(
                                operationContext(
                                        explicit
                                                ? "Create three public monitors including"
                                                        + " apache.org; choose the others"
                                                : "Choose three public domains and create monitors",
                                        ControlledMonitorTools.USER),
                                tools,
                                client,
                                false,
                                false);
                assertEquals(explicit ? 0 : 3, tools.effects);
                assertEquals(0, tools.probes);
                assertEquals(
                        explicit ? 0 : 1,
                        proof.events().stream()
                                .filter(
                                        event ->
                                                event.getType()
                                                        == AgentRuntimeEventType.REQUESTED_ACTION)
                                .count());
                assertEquals(explicit ? 2 : 4, client.requests.size());
            }
        }
    }

    @Test
    void existingCandidatesAreReplacedBeforeApprovalAndOnlyApprovedNativeProbesRun()
            throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            for (int index = 0; index < 24; index++)
                tools.existingWebsiteHosts.add("site" + index + ".org");
            tools.enableNativeBulk();
            org.mockito.Mockito.doAnswer(
                            invocation -> {
                                tools.probes++;
                                org.apache.hertzbeat.common.entity.manager.Monitor monitor =
                                        invocation.getArgument(0);
                                int site =
                                        Integer.parseInt(
                                                monitor.getInstance()
                                                        .substring(
                                                                4,
                                                                monitor.getInstance()
                                                                        .indexOf('.')));
                                if (site >= 5 && site < 13)
                                    throw new IllegalArgumentException("StatusCode 403");
                                return null;
                            })
                    .when(tools.domain)
                    .detectMonitor(
                            org.mockito.ArgumentMatchers.any(),
                            org.mockito.ArgumentMatchers.any(),
                            org.mockito.ArgumentMatchers.any());
            var initial =
                    java.util.stream.IntStream.range(0, 50)
                            .mapToObj(index -> "site" + index + ".org")
                            .toList();
            var revised =
                    java.util.stream.IntStream.range(24, 74)
                            .mapToObj(index -> "site" + index + ".org")
                            .toList();
            var client =
                    new Client(
                            new AgentTaskAssessment.Goal(
                                    AgentTaskAssessment.Type.CHANGE,
                                    AgentTaskAssessment.Operation.CREATE,
                                    "monitor",
                                    50),
                            call(
                                    "sample-first",
                                    "monitor.plan_websites",
                                    Map.of("domains", initial)),
                            call(
                                    "replace-before-approval",
                                    "monitor.plan_websites",
                                    Map.of("domains", revised)));
            client.malformedWebsiteReviewAt = 2;
            var proof =
                    run(
                            operationContext(
                                    "Choose fifty public sites and create website monitors",
                                    ControlledMonitorTools.USER),
                            tools,
                            client,
                            false,
                            false);
            assertEquals(
                    AgentRuntimeEventType.RUN_COMPLETED,
                    proof.events().getLast().getType(),
                    () -> proof.transcript().getLast().text());
            assertEquals(50, tools.effects);
            assertEquals(0, tools.probes);
            assertEquals(5, client.requests.size());
            assertEquals(3, client.websiteReviewCount);
            var reviews =
                    client.requests.stream()
                            .filter(
                                    request ->
                                            request.getPrompt()
                                                    .getInstructions()
                                                    .startsWith("WEBSITE_BATCH_PROPOSAL_INTENT"))
                            .toList();
            assertFalse(reviews.get(1).getPrompt().getInstructions().contains("WEBSITE_REVIEW_PROTOCOL_FORMAT_REPAIR"));
            assertTrue(reviews.get(2).getPrompt().getInstructions().contains("WEBSITE_REVIEW_PROTOCOL_FORMAT_REPAIR"));
            assertEquals(
                    JsonUtil.fromJson(reviews.get(1).getChatHistory().getLast().text(), Map.class),
                    JsonUtil.fromJson(reviews.get(2).getChatHistory().getLast().text(), Map.class));
            var correction =
                    client.requests.stream()
                            .map(request -> request.getPrompt().getInstructions())
                            .filter(
                                    instructions ->
                                            instructions.contains("requiredReplacementCount"))
                            .findFirst()
                            .orElseThrow();
            assertTrue(correction.contains("WEBSITE_PROPOSAL_CANDIDATES_REQUIRE_REPLACEMENT"));
            assertTrue(correction.contains("\"requiredReplacementCount\":24"));
            assertTrue(correction.contains("NOT_CHECKED_REQUIRES_APPROVAL"));
            assertTrue(correction.contains("not an unavailable site"));
            assertFalse(correction.contains("CANDIDATES_UNAVAILABLE"));
            assertEquals(
                    1,
                    proof.events().stream()
                            .filter(
                                    event ->
                                            event.getType()
                                                    == AgentRuntimeEventType.REQUESTED_ACTION)
                            .count());
            assertEquals(
                    1,
                    tools.rows.values().stream()
                            .filter(row -> "monitor.create_batch".equals(row.getToolName()))
                            .count());
            assertTrue(
                    proof.transcript().stream()
                            .anyMatch(
                                    message ->
                                            message.text().contains("WEBSITE_ALREADY_MONITORED")
                                                    && message.text()
                                                            .contains(
                                                                    "APPROVAL_REQUIRED_NATIVE_PROBE")));
        }
    }

    @Test
    void retainedCandidatePoolHandlesRealDuplicateSequenceAndOneDomainGapWithoutPreapprovalNetwork()
            throws Exception {
        for (String decision : List.of("approve", "reject", "cancel")) {
            try (var tools = new ControlledMonitorTools()) {
                for (int i = 0; i < 25; i++) tools.existingWebsiteHosts.add("site" + i + ".org");
                tools.enableNativeBulk();
                org.mockito.Mockito.doAnswer(
                                invocation -> {
                                    tools.probes++;
                                    return null;
                                })
                        .when(tools.domain)
                        .detectMonitor(
                                org.mockito.ArgumentMatchers.any(),
                                org.mockito.ArgumentMatchers.any(),
                                org.mockito.ArgumentMatchers.any());
                var initial =
                        java.util.stream.IntStream.range(0, 50)
                                .mapToObj(i -> "site" + i + ".org")
                                .toList();
                var duplicateRepair =
                        new ArrayList<String>(
                                java.util.stream.IntStream.range(0, 25)
                                        .mapToObj(i -> "site" + i + ".org")
                                        .toList());
                duplicateRepair.addAll(
                        java.util.stream.IntStream.range(50, 74)
                                .mapToObj(i -> "site" + i + ".org")
                                .toList());
                duplicateRepair.add("site50.org");
                var client =
                        new Client(
                                new AgentTaskAssessment.Goal(
                                        AgentTaskAssessment.Type.CHANGE,
                                        AgentTaskAssessment.Operation.CREATE,
                                        "monitor",
                                        50),
                                call(
                                        "initial",
                                        "monitor.plan_websites",
                                        Map.of("domains", initial)),
                                call(
                                        "duplicate-repair",
                                        "monitor.plan_websites",
                                        Map.of("domains", duplicateRepair)),
                                call(
                                        "one-gap",
                                        "monitor.plan_websites",
                                        Map.of("domains", List.of("site74.org"))));
                var proof =
                        run(
                                operationContext(
                                        "Choose fifty public domains and create website monitors",
                                        ControlledMonitorTools.USER),
                                tools,
                                client,
                                false,
                                "reject".equals(decision),
                                "cancel".equals(decision),
                                false);
                boolean approved = "approve".equals(decision);
                assertEquals(approved ? 50 : 0, tools.effects);
                assertEquals(0, tools.probes);
                assertEquals(5, client.requests.size());
                assertEquals(
                        1,
                        proof.events().stream()
                                .filter(
                                        event ->
                                                event.getType()
                                                        == AgentRuntimeEventType.REQUESTED_ACTION)
                                .count());
                if (approved)
                    assertEquals(
                            AgentRuntimeEventType.RUN_COMPLETED,
                            proof.events().getLast().getType());
                else
                    assertTrue(
                            proof.events().getLast().getType()
                                    != AgentRuntimeEventType.RUN_COMPLETED);
                assertTrue(
                        client.requests.stream()
                                .anyMatch(
                                        request ->
                                                request.getPrompt()
                                                        .getInstructions()
                                                        .contains("WEBSITE_CANDIDATE_SUPPLEMENT")));
                assertTrue(
                        tools.monitors.values().stream()
                                .noneMatch(
                                        monitor ->
                                                tools.existingWebsiteHosts.contains(
                                                        monitor.getMonitor().getInstance())));
            }
        }
    }

    @Test
    void fullyExistingCandidatePoolIsReplacedWithinOriginalHundredCandidateCap() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            for (int i = 0; i < 50; i++) tools.existingWebsiteHosts.add("site" + i + ".org");
            tools.enableNativeBulk();
            org.mockito.Mockito.doAnswer(
                            invocation -> {
                                tools.probes++;
                                return null;
                            })
                    .when(tools.domain)
                    .detectMonitor(
                            org.mockito.ArgumentMatchers.any(),
                            org.mockito.ArgumentMatchers.any(),
                            org.mockito.ArgumentMatchers.any());
            var client =
                    new Client(
                            new AgentTaskAssessment.Goal(
                                    AgentTaskAssessment.Type.CHANGE,
                                    AgentTaskAssessment.Operation.CREATE,
                                    "monitor",
                                    50),
                            call(
                                    "initial",
                                    "monitor.plan_websites",
                                    Map.of(
                                            "domains",
                                            java.util.stream.IntStream.range(0, 50)
                                                    .mapToObj(i -> "site" + i + ".org")
                                                    .toList())),
                            call(
                                    "replacement",
                                    "monitor.plan_websites",
                                    Map.of(
                                            "domains",
                                            java.util.stream.IntStream.range(50, 100)
                                                    .mapToObj(i -> "site" + i + ".org")
                                                    .toList())));
            var proof =
                    run(
                            operationContext(
                                    "Choose fifty public domains and create website monitors",
                                    ControlledMonitorTools.USER),
                            tools,
                            client,
                            false,
                            false);
            assertEquals(AgentRuntimeEventType.RUN_COMPLETED, proof.events().getLast().getType());
            assertEquals(50, tools.effects);
            assertEquals(0, tools.probes);
            assertEquals(
                    1,
                    proof.events().stream()
                            .filter(
                                    event ->
                                            event.getType()
                                                    == AgentRuntimeEventType.REQUESTED_ACTION)
                            .count());
        }
    }

    @Test
    void actualRetainedFortySevenSequenceRequiresScopedCandidateToolAndCompactState()
            throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            for (int i = 0; i < 30; i++) tools.existingWebsiteHosts.add("site" + i + ".org");
            for (int i = 50; i < 53; i++) tools.existingWebsiteHosts.add("site" + i + ".org");
            tools.enableNativeBulk();
            org.mockito.Mockito.doAnswer(
                            invocation -> {
                                tools.probes++;
                                return null;
                            })
                    .when(tools.domain)
                    .detectMonitor(
                            org.mockito.ArgumentMatchers.any(),
                            org.mockito.ArgumentMatchers.any(),
                            org.mockito.ArgumentMatchers.any());
            var initial =
                    java.util.stream.IntStream.range(0, 50)
                            .mapToObj(i -> "site" + i + ".org")
                            .toList();
            var client =
                    new Client(
                            new AgentTaskAssessment.Goal(
                                    AgentTaskAssessment.Type.CHANGE,
                                    AgentTaskAssessment.Operation.CREATE,
                                    "monitor",
                                    50),
                            call("initial", "monitor.plan_websites", Map.of("domains", initial)),
                            call(
                                    "recorded-thirty",
                                    "monitor.plan_websites",
                                    Map.of(
                                            "domains",
                                            java.util.stream.IntStream.range(50, 80)
                                                    .mapToObj(i -> "site" + i + ".org")
                                                    .toList())),
                            call(
                                    "recorded-known-full-list",
                                    "monitor.plan_websites",
                                    Map.of("domains", initial)));
            client.schemaAwareSupplement = true;
            client.malformedWebsiteReviewAt = 1;
            var proof =
                    run(
                            operationContext(
                                    "Choose fifty public domains and create website monitors",
                                    ControlledMonitorTools.USER),
                            tools,
                            client,
                            false,
                            false);
            assertEquals(
                    AgentRuntimeEventType.RUN_COMPLETED,
                    proof.events().getLast().getType(),
                    () -> proof.transcript().getLast().text());
            assertEquals(50, tools.effects);
            assertEquals(0, tools.probes);
            assertEquals(6, client.requests.size());
            var supplements =
                    client.requests.stream()
                            .filter(
                                    request ->
                                            request.getPrompt()
                                                    .getInstructions()
                                                    .contains("WEBSITE_CANDIDATE_SUPPLEMENT"))
                            .toList();
            assertEquals(2, supplements.size());
            for (var request : supplements) {
                assertTrue(request.isToolCallRequired());
                assertFalse(
                        request.getPrompt()
                                .getInstructions()
                                .contains("Supply ONLY requiredReplacementCount"));
                assertEquals(1, request.getAvailableTools().size());
                assertEquals(2, request.getChatHistory().size());
            }
            var state =
                    JsonUtil.fromJson(
                            supplements.getLast().getChatHistory().getLast().text(), Map.class);
            assertEquals(47, state.get("retainedCount"));
            assertEquals(3, state.get("requiredReplacementCount"));
            assertEquals(20, state.get("requestedCandidateCount"));
            assertEquals(
                    List.of(
                            "monitor.plan_websites",
                            "monitor.preflight_websites",
                            "monitor.plan_websites",
                            "monitor.preflight_websites",
                            "monitor.plan_websites",
                            "monitor.preflight_websites"),
                    tools.rows.values().stream()
                            .map(row -> row.getToolName())
                            .filter(
                                    name ->
                                            name.equals("monitor.plan_websites")
                                                    || name.equals("monitor.preflight_websites"))
                            .toList());
            assertEquals(
                    1,
                    proof.events().stream()
                            .filter(
                                    event ->
                                            event.getType()
                                                    == AgentRuntimeEventType.REQUESTED_ACTION)
                            .count());
        }
    }

    @Test
    void boundedSelectionFailureReportsCountsAndNoMutation() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.existingWebsiteHosts.addAll(List.of("apache.org", "mozilla.org"));
            tools.enableNativeBulk();
            var args = Map.<String, Object>of("domains", List.of("apache.org", "mozilla.org"));
            var client =
                    new Client(
                            new AgentTaskAssessment.Goal(
                                    AgentTaskAssessment.Type.CHANGE,
                                    AgentTaskAssessment.Operation.CREATE,
                                    "monitor",
                                    2),
                            call("initial", "monitor.plan_websites", args),
                            call("known-again", "monitor.plan_websites", args),
                            call("known-last", "monitor.plan_websites", args));
            var proof =
                    run(
                            operationContext(
                                    "Choose any two public domains and create website monitors",
                                    ControlledMonitorTools.USER),
                            tools,
                            client,
                            false,
                            false);
            assertEquals(AgentRuntimeEventType.ERROR, proof.events().getLast().getType());
            assertEquals(0, tools.effects);
            assertEquals(0, tools.probes);
            assertEquals(3, client.requests.size());
            assertTrue(
                    proof.events().stream()
                            .noneMatch(
                                    event ->
                                            event.getType()
                                                    == AgentRuntimeEventType.REQUESTED_ACTION));
            var expected =
                    java.text.MessageFormat.format(
                            java.util.ResourceBundle.getBundle(
                                            "agent_task", java.util.Locale.ENGLISH)
                                    .getString("websiteNoNewCandidates"),
                            0,
                            2,
                            2,
                            2,
                            98);
            assertEquals(expected, proof.transcript().getLast().text());
        }
    }

    @Test
    void activeCandidateSupplementCannotDispatchAnotherTool() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.existingWebsiteHosts.add("apache.org");
            tools.enableNativeBulk();
            var client =
                    new Client(
                            new AgentTaskAssessment.Goal(
                                    AgentTaskAssessment.Type.CHANGE,
                                    AgentTaskAssessment.Operation.CREATE,
                                    "monitor",
                                    2),
                            call(
                                    "initial",
                                    "monitor.plan_websites",
                                    Map.of("domains", List.of("apache.org", "mozilla.org"))),
                            call(
                                    "out-of-supplement-scope",
                                    "monitor.query",
                                    Map.of("app", "website")));
            var proof =
                    run(
                            operationContext(
                                    "Choose two public domains and create website monitors",
                                    ControlledMonitorTools.USER),
                            tools,
                            client,
                            false,
                            false);
            assertEquals(AgentRuntimeEventType.ERROR, proof.events().getLast().getType());
            assertEquals(0, tools.effects);
            assertEquals(0, tools.probes);
            assertEquals(3, client.requests.size());
            assertTrue(
                    tools.rows.values().stream()
                            .noneMatch(row -> "monitor.query".equals(row.getToolName())));
            assertTrue(
                    proof.events().stream()
                            .noneMatch(
                                    event ->
                                            event.getType()
                                                    == AgentRuntimeEventType.REQUESTED_ACTION));
        }
    }

    @Test
    void recordedOverQuotaThirdPlanUsesRemainingEighteenOrReportsNoNewCandidates()
            throws Exception {
        Map<?, ?> fixture;
        try (var input =
                getClass()
                        .getResourceAsStream("/fixtures/website-budget-run-697857938849024.json")) {
            assertNotNull(input);
            fixture =
                    JsonUtil.fromJson(
                            new String(
                                    input.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8),
                            Map.class);
        }
        var plans = (List<Map<String, Object>>) fixture.get("plans");
        var preflights = (List<Map<String, Object>>) fixture.get("preflights");
        for (String scenario :
                List.of(
                        "approve",
                        "reject",
                        "cancel",
                        "partial-existing",
                        "all-repeat",
                        "short-last")) {
            try (var tools = new ControlledMonitorTools()) {
                for (var receipt : preflights)
                    for (var row : (List<Map<String, Object>>) receipt.get("items"))
                        if (row.get("state").equals("EXISTING"))
                            tools.existingWebsiteHosts.add((String) row.get("domain"));
                var third = (List<String>) plans.get(2).get("domains");
                if (scenario.equals("partial-existing"))
                    tools.existingWebsiteHosts.addAll(third.subList(0, 12));
                tools.enableNativeBulk();
                var responses = new ArrayList<AgentRuntimeModelResponse>();
                for (int i = 0; i < 3; i++) {
                    var domains =
                            scenario.equals("all-repeat") && i == 2
                                    ? plans.getFirst().get("domains")
                                    : plans.get(i).get("domains");
                    if (scenario.equals("short-last") && i == 2) domains = third.subList(0, 5);
                    if ((!scenario.equals("all-repeat") && !scenario.equals("short-last")) || i < 2)
                        assertEquals(
                                plans.get(i).get("inputHash"),
                                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                                        .normalizedArgumentsHash(Map.of("domains", domains)));
                    responses.add(
                            call(
                                    "recorded-plan-" + i,
                                    "monitor.plan_websites",
                                    Map.of("domains", domains)));
                }
                var client =
                        new Client(
                                new AgentTaskAssessment.Goal(
                                        AgentTaskAssessment.Type.CHANGE,
                                        AgentTaskAssessment.Operation.CREATE,
                                        "monitor",
                                        50),
                                responses.toArray(AgentRuntimeModelResponse[]::new));
                var proof =
                        run(
                                operationContext(
                                        (String) fixture.get("userMessage"),
                                        ControlledMonitorTools.USER),
                                tools,
                                client,
                                false,
                                scenario.equals("reject"),
                                scenario.equals("cancel"),
                                false);
                boolean reachesApproval =
                        !scenario.equals("partial-existing")
                                && !scenario.equals("all-repeat")
                                && !scenario.equals("short-last");
                assertEquals(scenario.equals("approve") ? 50 : 0, tools.effects);
                assertEquals(0, tools.probes);
                assertEquals(
                        reachesApproval ? 1 : 0,
                        proof.events().stream()
                                .filter(e -> e.getType() == AgentRuntimeEventType.REQUESTED_ACTION)
                                .count());
                var sizes =
                        tools.rows.values().stream()
                                .filter(
                                        row ->
                                                row.getToolName()
                                                        .equals("monitor.preflight_websites"))
                                .map(
                                        row ->
                                                ((List<?>)
                                                                JsonUtil.fromJson(
                                                                                row.getInputJson(),
                                                                                Map.class)
                                                                        .get("items"))
                                                        .size())
                                .toList();
                assertEquals(
                        scenario.equals("all-repeat")
                                ? List.of(50, 32)
                                : scenario.equals("short-last")
                                        ? List.of(50, 32, 5)
                                        : List.of(50, 32, 18),
                        sizes);
                assertTrue(sizes.stream().mapToInt(Integer::intValue).sum() <= 100);
                var supplements =
                        client.requests.stream()
                                .filter(
                                        req ->
                                                req.getPrompt()
                                                        .getInstructions()
                                                        .contains("WEBSITE_CANDIDATE_SUPPLEMENT"))
                                .toList();
                assertEquals(2, supplements.size());
                assertEquals(
                        18,
                        ((Map<?, ?>)
                                        ((Map<?, ?>)
                                                        JsonUtil.fromJson(
                                                                        supplements
                                                                                .getLast()
                                                                                .getAvailableTools()
                                                                                .getFirst()
                                                                                .getInputSchema(),
                                                                        Map.class)
                                                                .get("properties"))
                                                .get("domains"))
                                .get("maxItems"));
                if (scenario.equals("all-repeat")) {
                    assertTrue(
                            proof.transcript()
                                    .getLast()
                                    .text()
                                    .contains("WEBSITE_PROPOSAL_NO_NEW_CANDIDATES"));
                    assertEquals(4, client.requests.size());
                } else if (scenario.equals("short-last")) {
                    assertTrue(
                            proof.transcript()
                                    .getLast()
                                    .text()
                                    .contains("WEBSITE_PROPOSAL_SUPPLEMENT_ROUND_LIMIT"));
                    assertEquals(4, client.requests.size());
                } else {
                    var overflow = third.subList(18, 50);
                    var notice =
                            proof.transcript().stream()
                                    .filter(
                                            msg ->
                                                    msg.getRole()
                                                            == TranscriptMessage.TranscriptRole
                                                                    .ASSISTANT)
                                    .filter(
                                            msg ->
                                                    overflow.stream()
                                                            .allMatch(
                                                                    domain ->
                                                                            msg.text()
                                                                                    .contains(
                                                                                            domain)))
                                    .findFirst()
                                    .orElseThrow();
                    assertEquals(null, notice.getTaskOutcome());
                    assertTrue(notice.text().contains("18"));
                    assertTrue(notice.text().contains("32"));
                    assertEquals(reachesApproval ? 5 : 4, client.requests.size());
                }
                if (reachesApproval) {
                    var checkpoint =
                            proof.transcript().stream()
                                    .map(TranscriptMessage::getTaskCheckpoint)
                                    .filter(java.util.Objects::nonNull)
                                    .findFirst()
                                    .orElseThrow();
                    assertEquals(50, checkpoint.goal().createTargets().size());
                    var approvedHosts =
                            checkpoint.goal().createTargets().stream()
                                    .map(target -> java.net.URI.create(target.url()).getHost())
                                    .toList();
                    assertEquals(50, approvedHosts.stream().distinct().count());
                    assertTrue(approvedHosts.stream().noneMatch(third.subList(18, 50)::contains));
                    assertTrue(
                            approvedHosts.stream().noneMatch(tools.existingWebsiteHosts::contains));
                    assertTrue(
                            checkpoint.goal().createTargets().stream()
                                    .allMatch(
                                            target ->
                                                    target.intervals() == 600
                                                            && target.timeout() == 3000));
                }
                if (scenario.equals("approve"))
                    assertEquals(
                            AgentRuntimeEventType.RUN_COMPLETED,
                            proof.events().getLast().getType());
                if (scenario.equals("partial-existing")) {
                    assertTrue(proof.transcript().getLast().text().contains("49"));
                    assertTrue(proof.transcript().getLast().text().contains("100"));
                }
            }
        }
    }

    @Test
    void realValidPlanNonObjectReviewSequenceGetsBoundedRepairOrAccurateTerminalFailure()
            throws Exception {
        Map<String, Object> fixture;
        try (var input =
                getClass()
                        .getResourceAsStream("/fixtures/website-review-run-697852016286976.json")) {
            assertNotNull(input);
            fixture =
                    JsonUtil.fromJson(
                            new String(
                                    input.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8),
                            Map.class);
        }
        var arguments = Map.<String, Object>of("domains", fixture.get("domains"));
        assertEquals(
                fixture.get("inputHash"),
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                        .normalizedArgumentsHash(arguments));
        for (String transport : List.of("non-object", "repair", "fenced", "semantic-denial")) {
            try (var tools = new ControlledMonitorTools()) {
                tools.enableNativeBulk();
                var client =
                        new Client(
                                new AgentTaskAssessment.Goal(
                                        AgentTaskAssessment.Type.CHANGE,
                                        AgentTaskAssessment.Operation.CREATE,
                                        "monitor",
                                        50),
                                call("recorded-valid-plan", "monitor.plan_websites", arguments));
                client.malformedWebsiteReviewText =
                        "synthetic-non-json-wire-response ".repeat(12).substring(0, 276);
                client.malformedWebsiteReviewAlways = transport.equals("non-object");
                client.repairOnlyWebsiteReview = transport.equals("repair");
                client.fencedWebsiteReview =
                        transport.equals("fenced") || transport.equals("semantic-denial");
                if (transport.equals("semantic-denial")) client.manifestOperation = "NOT_CREATE";
                var proof =
                        run(
                                operationContext(
                                        (String) fixture.get("userMessage"),
                                        ControlledMonitorTools.USER),
                                tools,
                                client,
                                false,
                                true);
                assertEquals(0, tools.effects);
                assertEquals(0, tools.probes);
                boolean ready = transport.equals("repair") || transport.equals("fenced");
                assertEquals(
                        ready ? 1 : 0,
                        proof.events().stream()
                                .filter(e -> e.getType() == AgentRuntimeEventType.REQUESTED_ACTION)
                                .count());
                assertEquals(
                        ready,
                        tools.rows.values().stream()
                                .anyMatch(
                                        row ->
                                                row.getToolName()
                                                        .equals("monitor.preflight_websites")));
                assertEquals(
                        transport.equals("non-object") || transport.equals("repair") ? 2 : 1,
                        client.websiteReviewCount);
                var reviews =
                        client.requests.stream()
                                .filter(
                                        req ->
                                                req.getPrompt()
                                                        .getInstructions()
                                                        .startsWith(
                                                                "WEBSITE_BATCH_PROPOSAL_INTENT"))
                                .toList();
                if (reviews.size() == 2) {
                    assertEquals(
                            reviews.getFirst().getChatHistory().getFirst().text(),
                            reviews.getLast().getChatHistory().getFirst().text());
                    assertTrue(
                            reviews.getLast()
                                    .getPrompt()
                                    .getInstructions()
                                    .contains("WEBSITE_REVIEW_PROTOCOL_FORMAT_REPAIR"));
                    assertTrue(reviews.getLast().getAvailableTools().isEmpty());
                }
                if (transport.equals("non-object")) {
                    assertEquals(3, client.requests.size());
                    assertEquals(AgentRuntimeEventType.ERROR, proof.events().getLast().getType());
                    assertTrue(
                            proof.transcript()
                                    .getLast()
                                    .text()
                                    .contains("WEBSITE_PROPOSAL_REVIEW_INVALID"));
                    assertEquals(
                            List.of("monitor.plan_websites"),
                            tools.rows.values().stream().map(row -> row.getToolName()).toList());
                }
            }
        }
    }

    @Test
    void repeatedMalformedWebsiteReviewCannotCreateApproveProbeOrLoopWithoutBound()
            throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.enableNativeBulk();
            var client =
                    new Client(
                            new AgentTaskAssessment.Goal(
                                    AgentTaskAssessment.Type.CHANGE,
                                    AgentTaskAssessment.Operation.CREATE,
                                    "monitor",
                                    2),
                            call(
                                    "plan",
                                    "monitor.plan_websites",
                                    Map.of("domains", List.of("apache.org", "mozilla.org"))));
            client.malformedWebsiteReviewAlways = true;
            var proof =
                    run(
                            operationContext(
                                    "Choose any two public domains and create website monitors",
                                    ControlledMonitorTools.USER),
                            tools,
                            client,
                            false,
                            false);
            assertEquals(2, client.websiteReviewCount);
            assertEquals(3, client.requests.size());
            assertEquals(0, tools.effects);
            assertEquals(0, tools.probes);
            assertTrue(
                    proof.events().stream()
                            .noneMatch(
                                    event ->
                                            event.getType()
                                                    == AgentRuntimeEventType.REQUESTED_ACTION));
            assertEquals(AgentRuntimeEventType.ERROR, proof.events().getLast().getType());
        }
    }

    @Test
    void rejectedAndCancelledCandidatePlansNeverResolveOrProbeAndApprovalUsesNativeNetworking()
            throws Exception {
        for (String decision : List.of("approve", "reject", "cancel")) {
            try (var tools = new ControlledMonitorTools()) {
                tools.enableNativeBulk();
                org.mockito.Mockito.doAnswer(
                                invocation -> {
                                    tools.probes++;
                                    return null;
                                })
                        .when(tools.domain)
                        .detectMonitor(
                                org.mockito.ArgumentMatchers.any(),
                                org.mockito.ArgumentMatchers.any(),
                                org.mockito.ArgumentMatchers.any());
                var original = List.of("apache.org", "mozilla.org");
                var client =
                        new Client(
                                new AgentTaskAssessment.Goal(
                                        AgentTaskAssessment.Type.CHANGE,
                                        AgentTaskAssessment.Operation.CREATE,
                                        "monitor",
                                        2),
                                call("plan", "monitor.plan_websites", Map.of("domains", original)));
                var proof =
                        run(
                                operationContext(
                                        "Choose any two public domains and create website monitors",
                                        ControlledMonitorTools.USER),
                                tools,
                                client,
                                false,
                                "reject".equals(decision),
                                "cancel".equals(decision),
                                false);
                boolean approved = "approve".equals(decision);
                assertEquals(
                        0,
                        tools.probes,
                        () ->
                                decision
                                        + ": "
                                        + tools.rows.values().stream()
                                                .map(
                                                        row ->
                                                                row.getToolName()
                                                                        + ":"
                                                                        + row.getStatus()
                                                                        + ":"
                                                                        + row.getErrorMessage())
                                                .toList());
                assertEquals(approved ? 2 : 0, tools.effects);
                assertEquals(
                        1,
                        proof.events().stream()
                                .filter(
                                        event ->
                                                event.getType()
                                                        == AgentRuntimeEventType.REQUESTED_ACTION)
                                .count());
                assertEquals(2, client.requests.size());
                assertTrue(
                        proof.transcript().stream()
                                .anyMatch(
                                        message ->
                                                message.text()
                                                        .contains(
                                                                "APPROVAL_REQUIRED_NATIVE_PROBE")));
            }
        }
    }

    @Test
    void nativeBatchCreatesExplicitUnavailableTargetsButNeverClaimsHealth() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.enableNativeBulk();
            org.mockito.Mockito.doAnswer(
                            invocation -> {
                                tools.probes++;
                                throw new IllegalArgumentException("StatusCode 403");
                            })
                    .when(tools.domain)
                    .detectMonitor(
                            org.mockito.ArgumentMatchers.any(),
                            org.mockito.ArgumentMatchers.any(),
                            org.mockito.ArgumentMatchers.any());
            var client =
                    new Client(
                            new AgentTaskAssessment.Goal(
                                    AgentTaskAssessment.Type.CHANGE,
                                    AgentTaskAssessment.Operation.CREATE,
                                    "monitor",
                                    2),
                            call(
                                    "plan",
                                    "monitor.plan_websites",
                                    Map.of("domains", List.of("apache.org", "mozilla.org"))));
            var proof =
                    run(
                            operationContext(
                                    "Create monitors for apache.org and mozilla.org",
                                    ControlledMonitorTools.USER),
                            tools,
                            client,
                            false,
                            false);
            assertEquals(2, tools.effects);
            assertEquals(0, tools.probes);
            assertEquals(
                    1,
                    proof.events().stream()
                            .filter(
                                    event ->
                                            event.getType()
                                                    == AgentRuntimeEventType.REQUESTED_ACTION)
                            .count());
            assertEquals(2, client.requests.size());
            assertTrue(
                    proof.transcript().stream()
                            .anyMatch(
                                    message ->
                                            message.text() != null
                                                    && message.text()
                                                            .contains("\"healthVerified\":false")));
            assertEquals(AgentRuntimeEventType.RUN_COMPLETED, proof.events().getLast().getType());
        }
    }

    @Test
    void delegatedWebsitePlanCannotWriteWithoutDurablePlanAndHumanApproval() throws Exception {
        for (int mode = 0; mode < 3; mode++) {
            try (var tools = new ControlledMonitorTools()) {
                tools.enableNativeBulk();
                org.mockito.Mockito.doAnswer(
                                invocation -> {
                                    tools.probes++;
                                    return null;
                                })
                        .when(tools.domain)
                        .detectMonitor(
                                org.mockito.ArgumentMatchers.any(),
                                org.mockito.ArgumentMatchers.any(),
                                org.mockito.ArgumentMatchers.any());
                var client =
                        new Client(
                                new AgentTaskAssessment.Goal(
                                        AgentTaskAssessment.Type.CHANGE,
                                        AgentTaskAssessment.Operation.CREATE,
                                        "monitor",
                                        2),
                                call(
                                        "compact-reject",
                                        "monitor.plan_websites",
                                        Map.of("domains", List.of("apache.org", "mozilla.org"))));
                var proof =
                        run(
                                operationContext(
                                        "Choose two public sites and create monitors",
                                        ControlledMonitorTools.USER),
                                tools,
                                client,
                                mode == 0,
                                mode == 1,
                                mode == 2,
                                false);
                assertEquals(0, tools.effects);
                assertEquals(0, tools.probes);
                assertTrue(
                        proof.events().getLast().getType() != AgentRuntimeEventType.RUN_COMPLETED);
            }
        }
    }

    @Test
    void independentWebsiteIntentRejectionCannotBecomeAnApprovedPlan() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.enableNativeBulk();
            var client = new Client(new AgentTaskAssessment.Goal(AgentTaskAssessment.Type.CHANGE,
                    AgentTaskAssessment.Operation.CREATE, "monitor", 2),
                    call("compact-no-consent", "monitor.plan_websites", Map.of("domains", List.of("apache.org", "mozilla.org"))));
            client.manifestOperation = "NOT_CREATE";
            var proof = run(operationContext("Explain two public website monitors, do not create them", ControlledMonitorTools.USER),
                    tools, client, false, false);
            assertEquals(0, tools.effects);
            assertEquals(0, tools.probes);
            assertEquals(0, proof.events().stream().filter(event -> event.getType() == AgentRuntimeEventType.REQUESTED_ACTION).count());
        }
    }

    @Test
    void explicitFiftyManifestNeedsOnlyOneCompactIntentAndOneFullApproval() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.enableNativeBulk();
            var context =
                    operationContext(manifestQuestion(tools, 50), ControlledMonitorTools.USER);
            var client =
                    new Client(
                            new AgentTaskAssessment.Goal(
                                    AgentTaskAssessment.Type.CHANGE,
                                    AgentTaskAssessment.Operation.CREATE,
                                    "monitor",
                                    50));
            var proof = run(context, tools, client, false, false);
            assertEquals(
                    AgentRuntimeEventType.RUN_COMPLETED,
                    proof.events().getLast().getType(),
                    () ->
                            JsonUtil.toJson(
                                    Map.of(
                                            "last",
                                            proof.transcript().getLast().text(),
                                            "toolResults",
                                            proof.transcript().stream()
                                                    .filter(
                                                            message ->
                                                                    message.getRole()
                                                                            == TranscriptMessage
                                                                                    .TranscriptRole
                                                                                    .TOOL_RESULT)
                                                    .map(TranscriptMessage::text)
                                                    .toList())));
            assertEquals(50, tools.effects);
            assertEquals(0, tools.probes);
            assertEquals(1, client.requests.size());
            assertTrue(
                    client.requests.getFirst().getChatHistory().getLast().text().length() < 4000);
            assertFalse(
                    client.requests
                            .getFirst()
                            .getChatHistory()
                            .getLast()
                            .text()
                            .contains("/manifest-site/"));
            assertEquals(
                    1,
                    proof.events().stream()
                            .filter(e -> e.getType() == AgentRuntimeEventType.REQUESTED_ACTION)
                            .count());
            assertEquals(
                    1,
                    tools.rows.values().stream()
                            .filter(row -> "monitor.create_batch".equals(row.getToolName()))
                            .count());
            var last = proof.transcript().getLast().getTaskCheckpoint();
            assertEquals(
                    50,
                    last.monitorBatch().items().stream()
                            .filter(i -> i.status() == AgentMonitorBatch.Status.VERIFIED)
                            .count());
            assertTrue(last.manifestReference().preflightComplete());
            assertTrue(last.validFor(context));
        }
    }

    @Test
    void truncatedIntentOrCrossPlanReferenceNeverReachesApproval() throws Exception {
        for (boolean malformed : List.of(true, false)) {
            try (var tools = new ControlledMonitorTools()) {
                tools.enableNativeBulk();
                var client =
                        new Client(
                                new AgentTaskAssessment.Goal(
                                        AgentTaskAssessment.Type.CHANGE,
                                        AgentTaskAssessment.Operation.CREATE,
                                        "monitor",
                                        2));
                client.manifestMalformed = malformed;
                client.wrongManifestReference = !malformed;
                var proof =
                        run(
                                operationContext(
                                        manifestQuestion(tools, 2), ControlledMonitorTools.USER),
                                tools,
                                client,
                                false,
                                false);
                assertEquals(0, tools.effects);
                assertEquals(0, tools.probes);
                assertEquals(1, client.requests.size());
                assertFalse(
                        proof.events().stream()
                                .anyMatch(
                                        e ->
                                                e.getType()
                                                        == AgentRuntimeEventType.REQUESTED_ACTION));
            }
        }
    }

    @Test
    void manifestCancellationAndLostCheckpointNeverExecute() throws Exception {
        for (boolean missingCheckpoint : List.of(false, true)) {
            try (var tools = new ControlledMonitorTools()) {
                tools.enableNativeBulk();
                var client =
                        new Client(
                                new AgentTaskAssessment.Goal(
                                        AgentTaskAssessment.Type.CHANGE,
                                        AgentTaskAssessment.Operation.CREATE,
                                        "monitor",
                                        2));
                var proof =
                        run(
                                operationContext(
                                        manifestQuestion(tools, 2), ControlledMonitorTools.USER),
                                tools,
                                client,
                                missingCheckpoint,
                                false,
                                !missingCheckpoint,
                                false);
                assertEquals(0, tools.effects);
                assertEquals(0, tools.probes);
                assertEquals(
                        missingCheckpoint ? 0 : 1,
                        proof.events().stream()
                                .filter(e -> e.getType() == AgentRuntimeEventType.REQUESTED_ACTION)
                                .count());
            }
        }
    }

    private String manifestQuestion(ControlledMonitorTools tools, int count) {
        var items =
                java.util.stream.IntStream.rangeClosed(1, count)
                        .mapToObj(
                                i ->
                                        Map.of(
                                                "idempotencyKey",
                                                "manifest-site-" + i,
                                                "name",
                                                "manifest-site-" + i,
                                                "url",
                                                "http://127.0.0.1:"
                                                        + tools.http.getAddress().getPort()
                                                        + "/health/manifest-site/"
                                                        + i,
                                                "intervals",
                                                600,
                                                "timeout",
                                                2000))
                        .toList();
        return "Create exactly these new website monitors. Read-only duplicate check first; stop on"
                + " a match. Require one manual approval. "
                + JsonUtil.toJson(Map.of("items", items, "retryPreflightFailures", false));
    }

    private static AgentRuntimeContext operationContext(
            String question, org.apache.hertzbeat.ai.gateway.identity.AgentActor actor) {
        return AgentRuntimeContext.builder()
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .channelId("web-ui")
                .workspaceId("isolated")
                .actor(actor)
                .userMessage(question)
                .sessionUid("session")
                .runUid("operation-" + Integer.toUnsignedString(question.hashCode()))
                .runId(Math.abs((long) question.hashCode()) + 3)
                .runSessionId(1L)
                .traceId("trace")
                .receivedAt(1L)
                .currentTimeIso("2026-10-18T00:00:00Z")
                .timezone("UTC")
                .preferredLanguage("en")
                .chatHistory(List.of())
                .build();
    }

    private static AgentRuntimeModelResponse[] steps(ControlledMonitorTools tools) {
        Map<String, String> parameters = new java.util.LinkedHashMap<>();
        tools.params().forEach((key, value) -> parameters.put(key, String.valueOf(value)));
        return new AgentRuntimeModelResponse[] {
            call("types", "monitor.types", Map.of()),
            call("params", "monitor.type_params", Map.of("app", "website")),
            call(
                    "probe",
                    "monitor.detect_draft",
                    Map.of("app", "website", "parameters", parameters)),
            call("create", "monitor.create", tools.createArguments()),
            AgentRuntimeModelResponse.finalAnswer(
                    "The local website monitor is saved and its requested configuration was read"
                            + " back.",
                    null)
        };
    }

    private static AgentRuntimeModelResponse call(
            String id, String name, Map<String, Object> args) {
        return AgentRuntimeModelResponse.toolCalls(
                "",
                List.of(
                        AgentRuntimeToolCall.builder()
                                .toolCallId(id)
                                .toolName(name)
                                .arguments(args)
                                .build()),
                null);
    }

    private static AgentRuntimeContext context() {
        return AgentRuntimeContext.builder()
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .channelId("web-ui")
                .workspaceId("isolated")
                .actor(ControlledMonitorTools.USER)
                .userMessage("Create one local website monitor")
                .sessionUid("session")
                .runUid("run")
                .runId(2L)
                .runSessionId(1L)
                .traceId("trace")
                .receivedAt(1L)
                .currentTimeIso("2026-10-18T00:00:00Z")
                .timezone("UTC")
                .preferredLanguage("en")
                .chatHistory(List.of())
                .build();
    }

    private Proof run(
            AgentRuntimeContext context,
            ControlledMonitorTools tools,
            Client client,
            boolean failCheckpoint,
            boolean reject) {
        return run(context, tools, client, failCheckpoint, reject, false, false);
    }

    private Proof run(
            AgentRuntimeContext context,
            ControlledMonitorTools tools,
            Client client,
            boolean failCheckpoint,
            boolean reject,
            boolean cancelApproval,
            boolean stopAfterCreate) {
        var events = new ArrayList<AgentRuntimeEvent>();
        var transcript = new ArrayList<TranscriptMessage>();
        var approvals = new AgentRuntimeApprovalRegistry();
        var bridge = new AgentToolBridge(tools.registry, tools.orchestrator, approvals);
        var properties = new AgentRuntimeProperties();
        properties.setMaxSteps(client.maxSteps);
        properties.setMaxToolCalls(client.maxToolCalls);
        try (var control = AgentRuntimeControl.forContext(context, Clock.systemUTC())) {
            new AgentRuntimeLoop(properties, client, bridge, Clock.systemUTC())
                    .run(
                            context,
                            control,
                            event -> {
                                events.add(event);
                                if (client.cancelAtCreateCount >= 0
                                        && tools.effects == client.cancelAtCreateCount
                                        && event.getType() == AgentRuntimeEventType.REQUESTED_ACTION
                                        && "monitor.create".equals(event.getToolName())) {
                                    control.cancel("Canceled at a later item approval");
                                    return;
                                }

                                if (stopAfterCreate
                                        && event.getType() == AgentRuntimeEventType.ITEM_COMPLETED
                                        && "monitor.create".equals(event.getToolName())) {
                                    control.stop("Simulated interruption after durable receipt");
                                }
                                if (cancelApproval
                                        && event.getType()
                                                == AgentRuntimeEventType.REQUESTED_ACTION) {
                                    control.cancel("Canceled while approval is pending");
                                    return;
                                }
                                if (event.getType() == AgentRuntimeEventType.REQUESTED_ACTION) {
                                    AgentApprovalDecision decision =
                                            reject
                                                    ? AgentApprovalDecision.REJECTED
                                                    : AgentApprovalDecision.APPROVED;
                                    tools.ledger.decideApproval(
                                            event.getApprovalId(),
                                            tools.envelope(context.getActor()),
                                            AgentRuntimeEntryType.USER_INPUT,
                                            decision);
                                    approvals.complete(event.getApprovalId(), decision);
                                }
                            },
                            message -> {
                                transcript.add(message);
                                return failCheckpoint && message.getTaskCheckpoint() != null
                                        ? null
                                        : (long) transcript.size();
                            });
        }
        return new Proof(events, transcript);
    }

    private record Proof(List<AgentRuntimeEvent> events, List<TranscriptMessage> transcript) {}

    private static final class Client implements AgentRuntimeModelClient {
        final AgentTaskAssessment.Goal goal;
        final Deque<AgentRuntimeModelResponse> responses;
        final List<AgentRuntimeModelRequest> requests = new ArrayList<>();
        int maxSteps = 24;
        int maxToolCalls = 64;
        int malformedWebsiteReviewAt = -1;
        boolean malformedWebsiteReviewAlways;
        String malformedWebsiteReviewText = "invalid-review-protocol";
        boolean repairOnlyWebsiteReview;
        boolean fencedWebsiteReview;
        int websiteReviewCount;
        boolean schemaAwareSupplement;
        boolean stopWhenEmpty;
        boolean manifestMalformed;
        boolean wrongManifestReference;
        String manifestOperation;
        int cancelAtCreateCount = -1;

        Client(AgentTaskAssessment.Goal goal, AgentRuntimeModelResponse... responses) {
            this.goal = goal;
            this.responses = new ArrayDeque<>(List.of(responses));
        }

        public boolean supportsReplyReview() {
            return true;
        }

        public AgentRuntimeModelResponse stream(
                AgentRuntimeModelRequest request,
                AgentRuntimeControl control,
                Consumer<String> delta) {
            requests.add(request);
            if (request.getPrompt().getInstructions().startsWith("WEBSITE_BATCH_PROPOSAL_INTENT")) {
                websiteReviewCount++;
                if (malformedWebsiteReviewAlways || websiteReviewCount == malformedWebsiteReviewAt
                        || repairOnlyWebsiteReview && !request.getPrompt().getInstructions().contains("WEBSITE_REVIEW_PROTOCOL_FORMAT_REPAIR"))
                    return AgentRuntimeModelResponse.finalAnswer(malformedWebsiteReviewText, null);
                Map<?, ?> payload = JsonUtil.fromJson(request.getChatHistory().getLast().text(), Map.class);
                String reviewJson = JsonUtil.toJson(
                                Map.of(
                                        "proposalHash",
                                        payload.get("proposalHash"),
                                        "operation",
                                        manifestOperation != null ? manifestOperation : goal.changesResources() ? "CREATE" : "NOT_CREATE",
                                        "expectedCount",
                                        goal.expectedCount() == null ? ((List<?>) payload.get("candidateTargets")).size() : goal.expectedCount(),
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
                return AgentRuntimeModelResponse.finalAnswer(fencedWebsiteReview ? "```json\n" + reviewJson + "\n```" : reviewJson, null);
            }
            if (request.getPrompt().getInstructions().startsWith("EXPLICIT_MANIFEST_INTENT")) {
                Map<?, ?> payload =
                        JsonUtil.fromJson(request.getChatHistory().getLast().text(), Map.class);
                Map<?, ?> manifest = (Map<?, ?>) payload.get("validatedManifest");
                if (manifestMalformed)
                    return AgentRuntimeModelResponse.finalAnswer("{\"planId\":", null);
                String operation =
                        !goal.changesResources()
                                ? "NOT_CREATE"
                                : manifestOperation != null
                                        ? manifestOperation
                                        : request.getChatHistory()
                                                        .getLast()
                                                        .text()
                                                        .toLowerCase(java.util.Locale.ROOT)
                                                        .contains("replay")
                                                ? "REPLAY"
                                                : "CREATE";
                return AgentRuntimeModelResponse.finalAnswer(
                        JsonUtil.toJson(
                                Map.of(
                                        "planId",
                                        wrongManifestReference
                                                ? "manifest_00000000000000000000000000000000"
                                                : manifest.get("planId"),
                                        "planHash",
                                        manifest.get("planHash"),
                                        "operation",
                                        operation,
                                        "resourceType",
                                        "monitor",
                                        "expectedCount",
                                        goal.expectedCount() == null
                                                ? manifest.get("itemCount")
                                                : goal.expectedCount(),
                                        "constraintsSupported",
                                        true)),
                        null);
            }
            if (request.getPrompt().getInstructions().contains("ORIGINAL_TASK_GOAL_ONLY")) {
                return AgentRuntimeModelResponse.finalAnswer(JsonUtil.toJson(goal), null);
            }
            if (request.getPrompt().getInstructions().contains("ORIGINAL_TASK_COMPLETION_REVIEW")) {
                return AgentRuntimeModelResponse.finalAnswer(
                        JsonUtil.toJson(
                                new AgentTaskAssessment(
                                        goal, AgentTaskOutcome.Stage.COMPLETE, true, List.of())),
                        null);
            }
            if (schemaAwareSupplement
                    && request.getPrompt().getInstructions().contains("WEBSITE_CANDIDATE_SUPPLEMENT")) {
                Map<?, ?> state =
                        JsonUtil.fromJson(request.getChatHistory().getLast().text(), Map.class);
                if (Integer.valueOf(47).equals(state.get("retainedCount"))) {
                    Map<?, ?> schema =
                            JsonUtil.fromJson(
                                    request.getAvailableTools().getFirst().getInputSchema(), Map.class);
                    Map<?, ?> properties = (Map<?, ?>) schema.get("properties");
                    Map<?, ?> domains = (Map<?, ?>) properties.get("domains");
                    int count = ((Number) domains.get("maxItems")).intValue();
                    responses.removeFirst();
                    return call(
                            "schema-bound-last-supplement",
                            "monitor.plan_websites",
                            Map.of(
                                    "domains",
                                    java.util.stream.IntStream.range(80, 80 + count)
                                            .mapToObj(i -> "site" + i + ".org")
                                            .toList()));
                }
            }
            if (stopWhenEmpty && responses.isEmpty()) {
                control.stop("Simulated interruption during a reserved final model request");
                control.checkpoint();
            }
            return responses.removeFirst();
        }
    }
}
