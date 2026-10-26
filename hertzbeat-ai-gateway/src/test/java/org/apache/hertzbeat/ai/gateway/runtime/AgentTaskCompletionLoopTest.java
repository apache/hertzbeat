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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

class AgentTaskCompletionLoopTest {
    private static final String RECEIPT =
            "{\"monitorId\":42,\"name\":\"demo\",\"app\":\"website\"}";
    private static final Map<String, Object> CREATE_ARGS =
            Map.of(
                    "name",
                    "demo",
                    "app",
                    "website",
                    "intervals",
                    600,
                    "params",
                    Map.of("host", "example.test", "port", 80, "ssl", false));

    @Test
    void unsupportedMutationMapRetainsRecoveryStateAndStopsRemainingWrites() {
        var goal =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.UPDATE,
                        "alert",
                        2,
                        List.of(42L, 43L),
                        Map.of("status", "resolved"));
        var assessment =
                new AgentTaskAssessment(goal, AgentTaskOutcome.Stage.COMPLETE, true, List.of());
        var calls =
                List.of(
                        AgentRuntimeToolCall.builder()
                                .toolCallId("first-alert")
                                .toolName("alert.resolve")
                                .arguments(Map.of("alertIds", List.of(42L)))
                                .build(),
                        AgentRuntimeToolCall.builder()
                                .toolCallId("second-alert")
                                .toolName("alert.resolve")
                                .arguments(Map.of("alertIds", List.of(43L)))
                                .build());
        var client = new Client(assessment, AgentRuntimeModelResponse.toolCalls("", calls, null));
        var proof =
                run(
                        "Resolve exactly alerts 42 and 43",
                        client,
                        List.of(
                                result(
                                        "first-alert",
                                        "alert.resolve",
                                        AgentToolRisk.CHANGE,
                                        AgentToolStatus.SUCCEEDED,
                                        "{\"operation\":\"resolve\",\"ids\":[42]}"),
                                result(
                                        "second-alert",
                                        "alert.resolve",
                                        AgentToolRisk.CHANGE,
                                        AgentToolStatus.SUCCEEDED,
                                        "{\"operation\":\"resolve\",\"ids\":[43]}")),
                        false,
                        false);
        assertEquals(1, proof.toolCalls());
        assertEquals(1, proof.effects());
        assertEquals(AgentTaskOutcome.Stage.RECOVERY_REQUIRED, proof.outcome().stage());
    }

    @Test
    void naturalGreetingPreservedWithoutTools() {
        var client =
                new Client(
                        AgentTaskCompletionPolicyTest.assessment(
                                AgentTaskAssessment.Type.GENERAL,
                                AgentTaskAssessment.Operation.EXPLAIN,
                                null,
                                AgentTaskOutcome.Stage.COMPLETE,
                                List.of()),
                        answer("Hello, how can I help?"));
        var proof = run("Hello", client, List.of(), false, false);
        assertEquals("Hello, how can I help?", proof.text());
        assertEquals(AgentTaskOutcome.Stage.COMPLETE, proof.outcome().stage());
        assertEquals(0, proof.toolCalls());
        assertEquals(2, client.requests.size());
        assertTrue(client.requests.getLast().getAvailableTools().isEmpty());
        assertFalse(
                client.requests
                        .getLast()
                        .getChatHistory()
                        .toString()
                        .contains("opaque private reasoning"));
    }

    @Test
    void sixMatchingAndOneReturnedKeepNaturalProseAndCorrectFacts() {
        var review =
                AgentTaskCompletionPolicyTest.assessment(
                        AgentTaskAssessment.Type.OBSERVATION,
                        AgentTaskAssessment.Operation.QUERY,
                        null,
                        AgentTaskOutcome.Stage.COMPLETE,
                        List.of(
                                new AgentTaskAssessment.Claim("query/matchingTotal", "6"),
                                new AgentTaskAssessment.Claim("query/returnedRows", "1")));
        var client =
                new Client(
                        review,
                        call("query", "monitor.query", Map.of("purpose", "COUNT")),
                        answer("There are 6 matching monitors; this page contains one sample."));
        var proof =
                run(
                        "How many monitors?",
                        client,
                        List.of(
                                result(
                                        "query",
                                        "monitor.query",
                                        AgentToolRisk.READ,
                                        AgentToolStatus.SUCCEEDED,
                                        "{\"content\":[{\"monitorId\":42}],\"totalElements\":6,\"pageIndex\":0,\"pageSize\":1,"
                                            + "\"queryMetadata\":{\"version\":\"monitor-query.v1\",\"purpose\":\"COUNT\",\"totalScope\":\"MATCHING_FILTERS\",\"totalIsExact\":true,\"filters\":{}}}")),
                        false,
                        false);
        assertEquals("There are 6 matching monitors; this page contains one sample.", proof.text());
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, proof.events().getLast().getType());
        assertEquals(3, client.requests.size());
    }

    @Test
    void creationFiftyCannotBeCompletedByEmptyDedupeAndGoalCannotShrink() {
        var client =
                new Client(
                        AgentTaskCompletionPolicyTest.create(50),
                        call("dedupe", "monitor.query", Map.of("app", "website")),
                        answer("No sites matched; the task is complete."),
                        answer("The task is complete."));
        var proof =
                run(
                        "Create 50 website monitors",
                        client,
                        List.of(
                                result(
                                        "dedupe",
                                        "monitor.query",
                                        AgentToolRisk.READ,
                                        AgentToolStatus.SUCCEEDED,
                                        "{\"content\":[],\"totalElements\":0}")),
                        false,
                        false);
        assertEquals(AgentRuntimeEventType.ERROR, proof.events().getLast().getType());
        assertEquals(AgentTaskOutcome.Stage.NOT_EXECUTED, proof.outcome().stage());
        assertEquals(50, proof.outcome().goal().expectedCount());
        assertEquals(0, proof.outcome().receiptCount());
        assertEquals(1, proof.toolCalls());
        assertFalse(proof.text().contains("No sites matched"));
        assertTrue(
                client.requests.stream()
                        .anyMatch(
                                r ->
                                        r.getPrompt()
                                                .getInstructions()
                                                .contains("ORIGINAL_TASK_NOT_COMPLETE")));
        assertEquals(5, client.requests.size());
    }

    @Test
    void uncertainWriteStopsBeforeSecondToolInSameTurnAndBeforeAnotherModelRequest() {
        var client =
                new Client(
                        AgentTaskCompletionPolicyTest.create(1),
                        AgentRuntimeModelResponse.toolCalls(
                                "",
                                List.of(
                                        tool("first", "monitor.create", CREATE_ARGS),
                                        tool("second", "monitor.get", Map.of("monitorId", 42))),
                                null));
        var proof =
                run(
                        "Create a monitor",
                        client,
                        List.of(
                                result(
                                        "first",
                                        "monitor.create",
                                        AgentToolRisk.CHANGE,
                                        AgentToolStatus.SUCCEEDED,
                                        "{}")),
                        false,
                        false);
        assertEquals(1, client.requests.size());
        assertEquals(1, proof.toolCalls());
        assertEquals(
                AgentRuntimeEvent.EventStatus.RECOVERY_REQUIRED,
                proof.events().getLast().getStatus());
        assertEquals(AgentTaskOutcome.Stage.RECOVERY_REQUIRED, proof.outcome().stage());
    }

    @Test
    void deniedMutationHasNoEffectAndStopsRemainingTools() {
        var client =
                new Client(
                        AgentTaskCompletionPolicyTest.create(1),
                        AgentRuntimeModelResponse.toolCalls(
                                "",
                                List.of(
                                        tool("first", "monitor.create", CREATE_ARGS),
                                        tool("second", "monitor.get", Map.of("monitorId", 42))),
                                null));
        var proof =
                run(
                        "Create a monitor",
                        client,
                        List.of(
                                result(
                                        "first",
                                        "monitor.create",
                                        AgentToolRisk.CHANGE,
                                        AgentToolStatus.DENIED,
                                        "{}")),
                        false,
                        false);
        assertEquals(1, proof.toolCalls());
        assertEquals(1, client.requests.size());
        assertEquals(AgentRuntimeEventType.ERROR, proof.events().getLast().getType());
        assertEquals(0, proof.effects());
    }

    @Test
    void unreviewedMutationTurnCannotPublishPrematureSuccessAndCorrectionUsageIsRetained() {
        var client =
                new Client(
                        AgentTaskCompletionPolicyTest.create(1),
                        call("dedupe", "monitor.query", Map.of("app", "website")),
                        AgentRuntimeModelResponse.finalAnswer(
                                "All created", new AgentRuntimeModelResponse.Usage(10, 2, 12)),
                        AgentRuntimeModelResponse.toolCalls(
                                "PREMATURE_SUCCESS",
                                List.of(tool("write", "monitor.create", CREATE_ARGS)),
                                null));
        var proof =
                run(
                        "Create one website monitor",
                        client,
                        List.of(
                                result(
                                        "dedupe",
                                        "monitor.query",
                                        AgentToolRisk.READ,
                                        AgentToolStatus.SUCCEEDED,
                                        "{\"content\":[],\"totalElements\":0}"),
                                result(
                                        "write",
                                        "monitor.create",
                                        AgentToolRisk.CHANGE,
                                        AgentToolStatus.FAILED,
                                        "{}")),
                        false,
                        false);
        assertEquals(
                12,
                proof.transcript().stream()
                        .filter(m -> m.getUsage() != null)
                        .mapToLong(m -> m.getUsage().totalTokens())
                        .sum());
        assertFalse(JsonUtil.toJson(proof.events()).contains("PREMATURE_SUCCESS"));
        assertFalse(JsonUtil.toJson(proof.transcript()).contains("PREMATURE_SUCCESS"));
        assertEquals(AgentTaskOutcome.Stage.FAILED, proof.outcome().stage());
    }

    @Test
    void failedMutationStopsRemainingToolsAndReportsFailureRatherThanNotExecuted() {
        var client =
                new Client(
                        AgentTaskCompletionPolicyTest.create(1),
                        AgentRuntimeModelResponse.toolCalls(
                                "",
                                List.of(
                                        tool("first", "monitor.create", CREATE_ARGS),
                                        tool("second", "monitor.get", Map.of("monitorId", 42))),
                                null));
        var proof =
                run(
                        "Create a monitor",
                        client,
                        List.of(
                                result(
                                        "first",
                                        "monitor.create",
                                        AgentToolRisk.CHANGE,
                                        AgentToolStatus.FAILED,
                                        "{}")),
                        false,
                        false);
        assertEquals(1, proof.toolCalls());
        assertEquals(1, client.requests.size());
        assertEquals(AgentTaskOutcome.Stage.FAILED, proof.outcome().stage());
        assertEquals(0, proof.effects());
    }

    @Test
    void cancelledBeforeExecutionHasNoEffect() {
        var client =
                new Client(
                        AgentTaskCompletionPolicyTest.create(1),
                        call("first", "monitor.create", CREATE_ARGS));
        var proof = run("Create a monitor", client, List.of(), true, false);
        assertEquals(0, proof.toolCalls());
        assertEquals(0, proof.effects());
        assertEquals(AgentRuntimeEvent.EventStatus.CANCELLED, proof.events().getLast().getStatus());
    }

    @Test
    void missingGoalCheckpointStopsBeforeAnyMutation() {
        var client =
                new Client(
                        AgentTaskCompletionPolicyTest.create(1),
                        call("first", "monitor.create", CREATE_ARGS),
                        answer("Created"));
        var proof =
                run(
                        "Create a monitor",
                        client,
                        List.of(
                                result(
                                        "first",
                                        "monitor.create",
                                        AgentToolRisk.CHANGE,
                                        AgentToolStatus.SUCCEEDED,
                                        RECEIPT)),
                        false,
                        true);
        assertEquals(0, proof.toolCalls());
        assertEquals(0, client.requests.size());
        assertEquals(AgentRuntimeEvent.EventStatus.FAILED, proof.events().getLast().getStatus());
    }

    @Test
    void successfulReceiptAndReadbackCompleteOnlyOriginalQuantity() {
        var client =
                new Client(
                        AgentTaskCompletionPolicyTest.create(1),
                        call("create", "monitor.create", CREATE_ARGS),
                        answer("Created demo and verified it by its saved ID."));
        var proof =
                run(
                        "Create one website monitor",
                        client,
                        List.of(
                                result(
                                        "create",
                                        "monitor.create",
                                        AgentToolRisk.CHANGE,
                                        AgentToolStatus.SUCCEEDED,
                                        RECEIPT),
                                result(
                                        "get",
                                        "monitor.get",
                                        AgentToolRisk.READ,
                                        AgentToolStatus.SUCCEEDED,
                                        RECEIPT)),
                        false,
                        false);
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, proof.events().getLast().getType());
        assertEquals(1, proof.outcome().receiptCount());
        assertEquals(1, proof.outcome().verifiedCount());
    }

    @Test
    void exhaustedModelBudgetCannotSkipFinalReviewOrMarkSuccess() {
        var client = new Client(AgentTaskCompletionPolicyTest.create(1), answer("Created"));
        client.maxSteps = 1;
        var proof = run("Create a monitor", client, List.of(), false, false);
        assertEquals(AgentRuntimeEventType.ERROR, proof.events().getLast().getType());
        assertEquals(1, client.requests.size());
        assertFalse(proof.text().contains("Created"));
    }

    static AgentRuntimeModelResponse answer(String value) {
        return AgentRuntimeModelResponse.finalAnswer(value, null);
    }

    static AgentRuntimeToolCall tool(String id, String name, Map<String, Object> args) {
        return AgentRuntimeToolCall.builder().toolCallId(id).toolName(name).arguments(args).build();
    }

    static AgentRuntimeModelResponse call(String id, String name, Map<String, Object> args) {
        return AgentRuntimeModelResponse.toolCalls("", List.of(tool(id, name, args)), null);
    }

    static AgentToolExecutionResult result(
            String id, String name, AgentToolRisk risk, AgentToolStatus status, String output) {
        if (RECEIPT.equals(output)) {
            Map<String, Object> fields =
                    Map.of(
                            "name",
                            "demo",
                            "app",
                            "website",
                            "intervals",
                            600,
                            "collectionState",
                            "enabled");
            Map<String, String> parameters =
                    Map.of("host", "example.test", "port", "80", "ssl", "false");
            output =
                    risk == AgentToolRisk.READ
                            ? JsonUtil.toJson(
                                    AgentMonitorMutationSemanticsTest.readback(
                                            42, fields, parameters))
                            : AgentMonitorMutationSemanticsTest.receipt(
                                    "monitor.create",
                                    CREATE_ARGS,
                                    new org.apache.hertzbeat.ai.gateway.tool.monitor
                                            .AgentMonitorMutationReceipt.Target(
                                            42L, fields, parameters));
        }
        return AgentToolExecutionResult.builder()
                .toolCallId(id)
                .toolName(name)
                .risk(risk)
                .status(status)
                .decision(org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision.ALLOW)
                .approvalStatus(
                        org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus.NOT_REQUIRED)
                .output(output)
                .build();
    }

    static final class Client implements AgentRuntimeModelClient {
        private final Deque<AgentRuntimeModelResponse> responses;
        final List<AgentRuntimeModelRequest> requests = new ArrayList<>();
        private final AgentTaskAssessment assessment;
        int maxSteps = 12;

        Client(AgentTaskAssessment assessment, AgentRuntimeModelResponse... responses) {
            this.assessment = assessment;
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
            if (request.getPrompt().getInstructions().contains("ORIGINAL_TASK_COMPLETION_REVIEW")) {
                return answer(JsonUtil.toJson(assessment));
            }
            return responses.removeFirst();
        }
    }

    private Proof run(
            String question,
            Client client,
            List<AgentToolExecutionResult> results,
            boolean cancel,
            boolean failPersistence) {
        var bridge = mock(AgentToolBridge.class);
        when(bridge.visibleTools()).thenReturn(List.of());
        when(bridge.discoverableTools(any(), any(), any())).thenReturn(List.of());
        var queue = new ArrayDeque<>(results);
        int[] toolCalls = {0};
        int[] effects = {0};
        when(bridge.execute(any(), any(), any(), any(), any()))
                .thenAnswer(
                        inv -> {
                            toolCalls[0]++;
                            var result = queue.removeFirst();
                            AgentRuntimeToolCall requested = inv.getArgument(2);
                            result =
                                    result.toBuilder()
                                            .toolCallId(requested.getToolCallId())
                                            .build();
                            if (result.getRisk() != AgentToolRisk.READ
                                    && result.getStatus() == AgentToolStatus.SUCCEEDED) {
                                effects[0]++;
                            }
                            return result;
                        });
        var context =
                AgentRuntimeContext.builder()
                        .entryType(AgentRuntimeEntryType.USER_INPUT)
                        .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                        .channelId("local-test")
                        .receivedAt(1L)
                        .actor(
                                AgentActor.builder()
                                        .type("user")
                                        .id("test")
                                        .roles(List.of("user"))
                                        .build())
                        .userMessage(question)
                        .preferredLanguage("en")
                        .workspaceId("default")
                        .sessionUid("test")
                        .runId(2L)
                        .runUid("completion-test")
                        .runSessionId(1L)
                        .currentTimeIso("2026-10-18T00:00:00Z")
                        .timezone("UTC")
                        .traceId("test")
                        .chatHistory(List.of())
                        .build();
        // These completion-policy fixtures start from an already persisted original goal and
        // discovery/probe history.
        // Fresh goal extraction, approvals and native lifecycle are covered by
        // AgentMonitorClosedLoopTest.
        if (client.assessment.goal().changesResources()) {
            context = org.mockito.Mockito.spy(context);
            var checkpoint = AgentTaskCheckpoint.forContext(context, client.assessment.goal(), 64);
            when(context.getTaskCheckpoint()).thenReturn(checkpoint);
            Map<String, Object> probeArgs =
                    Map.of(
                            "app",
                            "website",
                            "parameters",
                            Map.of("host", "example.test", "port", "80", "ssl", "false"));
            String probeHash =
                    org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                            .normalizedArgumentsHash(probeArgs);
            String probe =
                    JsonUtil.toJson(
                            Map.of(
                                    "app",
                                    "website",
                                    "probeVersion",
                                    "monitor-probe.v1",
                                    "inputHash",
                                    probeHash,
                                    "probeCompleted",
                                    true,
                                    "persisted",
                                    false,
                                    "parameters",
                                    probeArgs.get("parameters"),
                                    "collector",
                                    ""));
            when(context.budgetAttempts())
                    .thenReturn(
                            List.of(
                                    new AgentRuntimeReadBudget.Attempt(
                                            "prior-types",
                                            "monitor.types",
                                            AgentToolRisk.READ,
                                            AgentToolStatus.SUCCEEDED,
                                            Map.of(),
                                            "{\"website\":\"WEBSITE\"}",
                                            null),
                                    new AgentRuntimeReadBudget.Attempt(
                                            "prior-params",
                                            "monitor.type_params",
                                            AgentToolRisk.READ,
                                            AgentToolStatus.SUCCEEDED,
                                            Map.of("app", "website"),
                                            "[{\"field\":\"host\",\"required\":true},{\"field\":\"port\",\"required\":true,\"defaultValue\":80},{\"field\":\"ssl\",\"required\":true}]",
                                            null),
                                    new AgentRuntimeReadBudget.Attempt(
                                            "prior-probe",
                                            "monitor.detect_draft",
                                            AgentToolRisk.CHANGE,
                                            AgentToolStatus.SUCCEEDED,
                                            Map.of(),
                                            probe,
                                            null,
                                            probeHash)));
        }
        var events = new ArrayList<AgentRuntimeEvent>();
        var transcript = new ArrayList<TranscriptMessage>();
        var properties = new AgentRuntimeProperties();
        properties.setMaxSteps(client.maxSteps);
        try (var control = AgentRuntimeControl.forContext(context, Clock.systemUTC())) {
            if (cancel) {
                control.cancel("Cancelled by test");
            }
            new AgentRuntimeLoop(properties, client, bridge, Clock.systemUTC())
                    .run(
                            context,
                            control,
                            events::add,
                            m -> {
                                transcript.add(m);
                                return failPersistence ? null : (long) transcript.size();
                            });
        }
        return new Proof(events, transcript, toolCalls[0], effects[0]);
    }

    private record Proof(
            List<AgentRuntimeEvent> events,
            List<TranscriptMessage> transcript,
            int toolCalls,
            int effects) {
        String text() {
            return transcript.getLast().text();
        }

        AgentTaskOutcome outcome() {
            return transcript.getLast().getTaskOutcome();
        }
    }
}
