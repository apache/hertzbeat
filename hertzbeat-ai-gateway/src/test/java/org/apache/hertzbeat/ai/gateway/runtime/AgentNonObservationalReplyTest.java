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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mockingDetails;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.ArrayList;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.function.Consumer;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.junit.jupiter.api.Test;

class AgentNonObservationalReplyTest {
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-08-15T00:00:00Z"), ZoneOffset.UTC);

    @Test
    void ordinaryReplyNeedsNoReadAndDoesNotExposeReviewOrModelParts() {
        var client = new Client("Hello. How can I help?", "GENERAL");
        var proof = run("Hello", List.of(), client);
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, proof.events.getLast().getType());
        assertEquals("Hello. How can I help?", proof.transcript.getLast().text());
        assertEquals(0, proof.bridgeCalls());
    }

    @Test
    void capabilitiesThanksAndChineseGreetingAreGeneralRepliesWithoutTools() {
        var fixtures = ResourceBundle.getBundle("agent.reply-boundaries", Locale.ROOT);
        var cases = Map.of("Thanks for your help", "You are welcome.",
                "What can you help me with?", "I can explain monitoring concepts and help investigate with evidence.",
                fixtures.getString("greeting"), fixtures.getString("greetingReply"));
        cases.forEach((question, answer) -> {
            var proof = run(question, List.of(), new Client(answer, "GENERAL"));
            assertEquals(AgentRuntimeEventType.RUN_COMPLETED, proof.events.getLast().getType());
            assertEquals(answer, proof.transcript.getLast().text());
            assertEquals(0, proof.bridgeCalls());
        });
    }

    @Test
    void reviewExceptionFailsClosedWithoutPublishingTheCandidate() {
        var client = new Client("The repair succeeded", "GENERAL");
        client.failReview = true;
        var proof = run("Thanks", List.of(TranscriptMessage.userText("Investigate current monitors")), client);
        assertEquals(AgentRuntimeEventType.ERROR, proof.events.getLast().getType());
        assertFalse(proof.transcript.toString().contains("The repair succeeded"));
        assertEquals(1, client.requests.size());
    }

    @Test
    void isolatedReviewUsageIsIncludedInThePersistedReply() {
        var client = new Client("Hello", "GENERAL");
        client.reviewUsage = new AgentRuntimeModelResponse.Usage(10, 1, 11);
        var proof = run("Hello", List.of(), client);
        assertEquals(11, proof.transcript.getLast().getUsage().totalTokens());
    }

    @Test
    void conceptQuestionAfterInvestigationDoesNotInheritItsCoverageRequirements() {
        var history = List.of(TranscriptMessage.userText("Investigate metrics logs traces"),
                TranscriptMessage.assistantText("Historical snapshot", null));
        var client = new Client("Metrics measure values, logs record events, and traces describe request paths.", "GENERAL");
        var proof = run("Explain metrics logs traces conceptually", history, client);
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, proof.events.getLast().getType());
        assertFalse(client.review.getChatHistory().toString().contains("Historical snapshot"));
        assertTrue(client.review.getChatHistory().getFirst().text().contains("Investigate metrics logs traces"));
        assertTrue(client.review.getAvailableTools().isEmpty());
        assertFalse(client.requests.getFirst().getPrompt().getInstructions().contains("SIGNAL_COVERAGE_REQUIRED"));
    }

    @Test
    void clarificationAfterDiagnosisCanCompleteWithoutClaimingCurrentState() {
        var proof = run("Which service?", List.of(TranscriptMessage.userText("Investigate the failure")),
                new Client("Which service and time range should I inspect?", "CLARIFICATION"));
        assertEquals(AgentRuntimeEventType.ERROR, proof.events.getLast().getType());
        assertEquals(AgentTaskOutcome.Stage.NEEDS_INPUT, proof.transcript.getLast().getTaskOutcome().stage());
        assertEquals("Which service and time range should I inspect?", proof.transcript.getLast().text());
    }

    @Test
    void selfDeclaredGeneralLabelDoesNotAuthorizePlatformFacts() {
        var proof = run("How is the system?", List.of(),
                new Client("GENERAL: all monitors are healthy and the restart succeeded.", "EVIDENCE_REQUIRED"));
        assertEquals(AgentRuntimeEventType.ERROR, proof.events.getLast().getType());
        assertFalse(proof.transcript.toString().contains("all monitors are healthy"));
        assertFalse(proof.events.toString().contains("all monitors are healthy"));
        assertFalse(proof.events.getLast().getErrorMessage().startsWith("Investigation requires"));
    }

    @Test
    void malformedOrUnavailableReviewFailsClosed() {
        for (String verdict : List.of("GENERAL because I say so", "UNAVAILABLE", "", "{bad json}")) {
            var proof = run("Current status", List.of(), new Client("Everything is healthy", verdict));
            assertEquals(AgentRuntimeEventType.ERROR, proof.events.getLast().getType());
            assertFalse(proof.transcript.toString().contains("Everything is healthy"));
        }
    }

    @Test
    void unsupportedDiagnosticClaimDoesNotExecuteNewToolsOrClaimHealth() {
        var client = new Client("All monitors are healthy", "EVIDENCE_REQUIRED");
        var proof = run("Now inspect the current monitors", List.of(TranscriptMessage.userText("Hello")), client);
        assertEquals(AgentRuntimeEventType.ERROR, proof.events.getLast().getType());
        assertEquals(0, proof.bridgeCalls());
        assertFalse(proof.transcript.getLast().text().contains("All monitors are healthy"));
    }

    @Test
    void chineseFailureIsLocalizedAndReviewFailureDoesNotLeakCandidate() {
        var client = new Client("All monitors are healthy", "UNAVAILABLE");
        client.language = "zh-CN";
        var proof = run("Current status", List.of(), client);
        assertEquals(ResourceBundle.getBundle("agent_reply", Locale.CHINESE).getString("unverified"),
                proof.transcript.getLast().text());
    }

    private Proof run(String input, List<TranscriptMessage> history, Client client) {
        var bridge = mock(AgentToolBridge.class);
        when(bridge.visibleTools()).thenReturn(List.of());
        when(bridge.discoverableTools(any(), any(), any())).thenReturn(List.of());
        return run(input, history, client, bridge);
    }

    private Proof run(String input, List<TranscriptMessage> history, Client client, AgentToolBridge bridge) {
        var ctx = AgentRuntimeContext.builder().entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION).channelId("web-ui").receivedAt(1L)
                .actor(AgentActor.builder().type("user").id("alice").roles(List.of("user")).build())
                .userMessage(input).preferredLanguage(client.language).workspaceId("default").sessionUid("session").runId(2L).runUid("run")
                .runSessionId(1L).currentTimeIso("2026-08-15T00:00:00Z").timezone("UTC").traceId("trace")
                .chatHistory(history).build();
        var events = new ArrayList<AgentRuntimeEvent>();
        var transcript = new ArrayList<TranscriptMessage>();
        try (var control = AgentRuntimeControl.forContext(ctx, CLOCK)) {
            new AgentRuntimeLoop(new AgentRuntimeProperties(), client, bridge, CLOCK).run(ctx, control,
                    events::add, m -> {
                        transcript.add(m);
                        return (long) transcript.size();
                    });
        }
        return new Proof(events, transcript, bridge);
    }

    private record Proof(List<AgentRuntimeEvent> events, List<TranscriptMessage> transcript, AgentToolBridge bridge) {
        long bridgeCalls() {
            return mockingDetails(bridge).getInvocations().stream()
                    .filter(i -> i.getMethod().getName().equals("execute")).count();
        }
    }

    private static class Client implements AgentRuntimeModelClient {
        private final Deque<AgentRuntimeModelResponse> answers = new ArrayDeque<>();
        private final List<AgentRuntimeModelRequest> requests = new ArrayList<>();
        private String language = "en";
        private boolean failReview;
        private AgentRuntimeModelResponse.Usage reviewUsage;
        private final String verdict;
        private AgentRuntimeModelRequest review;

        Client(String answer, String verdict) {
            answers.add(AgentRuntimeModelResponse.finalAnswer(answer, null));
            this.verdict = verdict;
        }

        public boolean supportsReplyReview() {
            return true;
        }

        public AgentRuntimeModelResponse stream(AgentRuntimeModelRequest request, AgentRuntimeControl control,
                                                 Consumer<String> deltas) {
            if (request.getPrompt().getInstructions().contains("ORIGINAL_TASK_COMPLETION_REVIEW")) {
                review = request;
                if (failReview) {
                    throw new IllegalStateException("Local simulated review failure");
                }
                if ("GENERAL".equals(verdict) || "CLARIFICATION".equals(verdict)) {
                    var assessment = new AgentTaskAssessment(new AgentTaskAssessment.Goal(AgentTaskAssessment.Type.GENERAL,
                            AgentTaskAssessment.Operation.EXPLAIN, "conversation", null),
                            "GENERAL".equals(verdict) ? AgentTaskOutcome.Stage.COMPLETE : AgentTaskOutcome.Stage.NEEDS_INPUT, true, List.of());
                    return AgentRuntimeModelResponse.finalAnswer(org.apache.hertzbeat.common.util.JsonUtil.toJson(assessment), reviewUsage);
                }
                return AgentRuntimeModelResponse.finalAnswer(verdict.isEmpty() ? "INVALID" : verdict, reviewUsage);
            }
            requests.add(request);
            var response = answers.remove();
            if (response.getType() == AgentRuntimeModelResponse.ResponseType.FINAL_ANSWER) {
                deltas.accept(response.getFinalAnswer());
            }
            return response;
        }
    }
}
