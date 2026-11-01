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
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;

import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.LoggerFactory;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/** Offline failure diagnostics must never authorize a write or expose model/request content. */
class AgentGoalReviewDiagnosticsTest {
    private static final String PRIVATE_MARKER = "private-fixture-content";

    @ParameterizedTest
    @ValueSource(
            strings = {
                "REQUEST_TOO_LARGE",
                "REVIEW_UNAVAILABLE",
                "MODEL_BUDGET_EXHAUSTED",
                "CALL_FAILED",
                "CALL_TIMEOUT",
                "EMPTY_RESPONSE",
                "UNEXPECTED_RESPONSE",
                "MALFORMED_RESPONSE",
                "INVALID_GOAL"
            })
    void failuresHaveSafeRunCorrelatedReasonsAndNeverWrite(String reason) throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(AgentRuntimeLoop.class);
        ListAppender<ILoggingEvent> capture = new ListAppender<>();
        capture.start();
        logger.addAppender(capture);
        AtomicInteger reviews = new AtomicInteger();
        try (var tools = new ControlledMonitorTools()) {
            AgentRuntimeModelClient client =
                    new AgentRuntimeModelClient() {
                        @Override
                        public boolean supportsReplyReview() {
                            return !reason.equals("REVIEW_UNAVAILABLE");
                        }

                        @Override
                        public AgentRuntimeModelResponse stream(
                                AgentRuntimeModelRequest request,
                                AgentRuntimeControl control,
                                java.util.function.Consumer<String> delta) {
                            if (!request.getPrompt()
                                    .getInstructions()
                                    .contains("ORIGINAL_TASK_GOAL_ONLY")) {
                                return AgentRuntimeModelResponse.toolCalls(
                                        "",
                                        List.of(
                                                AgentRuntimeToolCall.builder()
                                                        .toolCallId("new-create")
                                                        .toolName("monitor.create")
                                                        .arguments(tools.createArguments())
                                                        .build()),
                                        null);
                            }
                            reviews.incrementAndGet();
                            return switch (reason) {
                                case "CALL_FAILED" ->
                                        throw new IllegalStateException(PRIVATE_MARKER);
                                case "CALL_TIMEOUT" ->
                                        throw new AgentRuntimeOperationTimeoutException(
                                                PRIVATE_MARKER, Duration.ofMillis(1));
                                case "EMPTY_RESPONSE" -> null;
                                case "UNEXPECTED_RESPONSE" ->
                                        AgentRuntimeModelResponse.invalidResponse(
                                                PRIVATE_MARKER, null);
                                case "MALFORMED_RESPONSE" ->
                                        AgentRuntimeModelResponse.finalAnswer(PRIVATE_MARKER, null);
                                case "INVALID_GOAL" ->
                                        AgentRuntimeModelResponse.finalAnswer(
                                                JsonUtil.toJson(
                                                        new AgentTaskAssessment.Goal(
                                                                AgentTaskAssessment.Type.CHANGE,
                                                                AgentTaskAssessment.Operation
                                                                        .CREATE,
                                                                "monitor",
                                                                0)),
                                                null);
                                default ->
                                        throw new AssertionError(
                                                "A skipped review must not execute");
                            };
                        }
                    };
            var context =
                    AgentMonitorMutationSemanticsTest.context(
                            reason.equals("REQUEST_TOO_LARGE")
                                    ? "Create monitors " + PRIVATE_MARKER.repeat(900)
                                    : "Create one local monitor " + PRIVATE_MARKER,
                            "owner",
                            "isolated",
                            "run-safe-diagnostic");
            var properties = new AgentRuntimeProperties();
            if (reason.equals("MODEL_BUDGET_EXHAUSTED")) properties.setMaxSteps(1);
            var events = new ArrayList<AgentRuntimeEvent>();
            var transcript = new ArrayList<TranscriptMessage>();
            var bridge =
                    new AgentToolBridge(
                            tools.registry, tools.orchestrator, new AgentRuntimeApprovalRegistry());
            try (var control = AgentRuntimeControl.forContext(context, Clock.systemUTC())) {
                new AgentRuntimeLoop(properties, client, bridge, Clock.systemUTC())
                        .run(
                                context,
                                control,
                                events::add,
                                message -> {
                                    transcript.add(message);
                                    return (long) transcript.size();
                                });
            }
            assertEquals(AgentRuntimeEventType.ERROR, events.getLast().getType());
            assertEquals(0, tools.effects);
            assertEquals(0, tools.probes);
            assertTrue(tools.rows.isEmpty());
            assertEquals(
                    reason.equals("REQUEST_TOO_LARGE")
                                    || reason.equals("REVIEW_UNAVAILABLE")
                                    || reason.equals("MODEL_BUDGET_EXHAUSTED")
                            ? 0
                            : 1,
                    reviews.get());
            var matching =
                    capture.list.stream()
                            .filter(
                                    event ->
                                            event.getFormattedMessage()
                                                    .contains("reason=" + reason))
                            .toList();
            assertEquals(1, matching.size(), "Distinct safe diagnostic reason must be logged");
            if (reason.equals("INVALID_GOAL")) {
                assertTrue(
                        matching.getFirst()
                                .getFormattedMessage()
                                .contains("rule=EXPECTED_COUNT_POSITIVE"));
                assertTrue(
                        matching.getFirst().getFormattedMessage().contains("field=expectedCount"));
                assertTrue(
                        matching.getFirst().getFormattedMessage().contains("createTargetCount=0"));
            }
            assertTrue(matching.getFirst().getFormattedMessage().contains("run-safe-diagnostic"));
            assertNull(
                    matching.getFirst().getThrowableProxy(),
                    "Do not attach upstream exception messages");
            assertFalse(matching.getFirst().getFormattedMessage().contains(PRIVATE_MARKER));
            String reply =
                    transcript.stream()
                            .filter(m -> m.getRole() == TranscriptMessage.TranscriptRole.ASSISTANT)
                            .map(TranscriptMessage::text)
                            .filter(t -> t != null && !t.isBlank())
                            .reduce((a, b) -> b)
                            .orElseThrow();
            assertEquals(AgentTaskCompletionReview.message(context, "goalReview." + reason), reply);
            assertFalse(reply.contains(PRIVATE_MARKER));
        } finally {
            logger.detachAppender(capture);
            capture.stop();
        }
    }

    @org.junit.jupiter.api.Test
    void validGoalStillCompletesThroughApprovalAndExactReadbackWithoutFailureLog()
            throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(AgentRuntimeLoop.class);
        ListAppender<ILoggingEvent> capture = new ListAppender<>();
        capture.start();
        logger.addAppender(capture);
        try (var tools = new ControlledMonitorTools()) {
            var goal =
                    new AgentTaskAssessment.Goal(
                            AgentTaskAssessment.Type.CHANGE,
                            AgentTaskAssessment.Operation.CREATE,
                            "monitor",
                            1);
            Map<String, String> parameters = new java.util.LinkedHashMap<>();
            tools.params().forEach((key, value) -> parameters.put(key, String.valueOf(value)));
            var responses =
                    new java.util.ArrayDeque<>(
                            List.of(
                                    call("types", "monitor.types", Map.of()),
                                    call("params", "monitor.type_params", Map.of("app", "website")),
                                    call(
                                            "probe",
                                            "monitor.detect_draft",
                                            Map.of("app", "website", "parameters", parameters)),
                                    call("create", "monitor.create", tools.createArguments()),
                                    AgentRuntimeModelResponse.finalAnswer(
                                            "The local monitor is saved and verified.", null)));
            AgentRuntimeModelClient client =
                    new AgentRuntimeModelClient() {
                        @Override
                        public boolean supportsReplyReview() {
                            return true;
                        }

                        @Override
                        public AgentRuntimeModelResponse stream(
                                AgentRuntimeModelRequest request,
                                AgentRuntimeControl control,
                                java.util.function.Consumer<String> delta) {
                            if (request.getPrompt()
                                    .getInstructions()
                                    .contains("ORIGINAL_TASK_GOAL_ONLY")) {
                                return AgentRuntimeModelResponse.finalAnswer(
                                        JsonUtil.toJson(goal), null);
                            }
                            if (request.getPrompt()
                                    .getInstructions()
                                    .contains("ORIGINAL_TASK_COMPLETION_REVIEW")) {
                                return AgentRuntimeModelResponse.finalAnswer(
                                        JsonUtil.toJson(
                                                new AgentTaskAssessment(
                                                        goal,
                                                        AgentTaskOutcome.Stage.COMPLETE,
                                                        true,
                                                        List.of())),
                                        null);
                            }
                            return responses.removeFirst();
                        }
                    };
            var context =
                    AgentMonitorMutationSemanticsTest.context(
                            "Create one local monitor", "owner", "isolated", "run-valid-goal");
            var events = new ArrayList<AgentRuntimeEvent>();
            var approvals = new AgentRuntimeApprovalRegistry();
            var bridge = new AgentToolBridge(tools.registry, tools.orchestrator, approvals);
            try (var control = AgentRuntimeControl.forContext(context, Clock.systemUTC())) {
                new AgentRuntimeLoop(
                                new AgentRuntimeProperties(), client, bridge, Clock.systemUTC())
                        .run(
                                context,
                                control,
                                event -> {
                                    events.add(event);
                                    if (event.getType() == AgentRuntimeEventType.REQUESTED_ACTION) {
                                        var decision =
                                                org.apache.hertzbeat.ai.gateway.tool.core
                                                        .AgentApprovalDecision.APPROVED;
                                        tools.ledger.decideApproval(
                                                event.getApprovalId(),
                                                tools.envelope(),
                                                AgentRuntimeEntryType.USER_INPUT,
                                                decision);
                                        approvals.complete(event.getApprovalId(), decision);
                                    }
                                },
                                message -> 1L);
            }
            assertEquals(AgentRuntimeEventType.RUN_COMPLETED, events.getLast().getType());
            assertEquals(1, tools.effects);
            assertEquals(1, tools.probes);
            assertTrue(
                    capture.list.stream()
                            .noneMatch(
                                    event ->
                                            event.getFormattedMessage()
                                                    .contains(
                                                            "Monitor goal verification rejected")));
        } finally {
            logger.detachAppender(capture);
            capture.stop();
        }
    }

    private static AgentRuntimeModelResponse call(
            String id, String name, Map<String, Object> arguments) {
        return AgentRuntimeModelResponse.toolCalls(
                "",
                List.of(
                        AgentRuntimeToolCall.builder()
                                .toolCallId(id)
                                .toolName(name)
                                .arguments(arguments)
                                .build()),
                null);
    }

    @ParameterizedTest
    @ValueSource(strings = {"en", "zh-CN"})
    void eachReasonHasDistinctLocalizedMessage(String language) {
        var bundle =
                java.util.ResourceBundle.getBundle(
                        "agent_task", java.util.Locale.forLanguageTag(language));
        var messages = new java.util.HashSet<String>();
        for (var reason : AgentGoalReviewFailure.values()) {
            String message = bundle.getString(reason.messageKey());
            assertFalse(message.isBlank());
            assertTrue(
                    messages.add(message),
                    "Failure reasons must have distinguishable user messages");
        }
    }
}
