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

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.contract.UserInput.Message;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link AgentRuntimeContextBuilder}.
 */
class AgentRuntimeContextBuilderTest {

    private static final Instant NOW = Instant.parse("2026-04-19T00:00:00Z");

    @Test
    void shouldUseDefaultConfigGeneratedTraceAndContextSnapshot() {
        UserInput userInput = UserInput.builder()
                .conversationId("conversation-1")
                .messageId("msg-1")
                .target(AgentTargetRef.builder().monitorId(10L).alertId(20L).collector("local").build())
                .message(Message.builder().text("diagnose password=hunter2").build())
                .build();
        AgentRuntimeRequest request = AgentRuntimeRequest.builder()
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .envelope(GatewayEnvelope.builder()
                        .channelId("web-ui")
                        .receivedAt(100L)
                        .preferredLanguage("pt-BR")
                        .actor(AgentActor.builder().type("user").id("alice").roles(List.of("user")).build())
                        .build())
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .userInput(userInput)
                .session(session())
                .run(run())
                .chatHistory(List.of(
                        chatMessage("user", "first"),
                        chatMessage("assistant", "second apiKey=history-key")))
                .build();

        AgentRuntimeContext context = builder("trace-generated").build(request, new AgentRuntimeProperties());

        assertEquals("trace-generated", context.getTraceId());
        assertEquals(AgentRuntimeEntryType.USER_INPUT, context.getEntryType());
        assertEquals(AgentApprovalHandling.WAIT_FOR_DECISION, context.getApprovalHandling());
        assertEquals("pt-BR", context.getPreferredLanguage());
        assertEquals("diagnose password=hunter2", context.getUserMessage());
        assertEquals(2, context.getChatHistory().size());
        assertTrue(context.getChatHistory().get(1).text().contains("history-key"));
        assertEquals(10L, context.getEffectiveTarget().getMonitorId());
    }

    @Test
    void shouldGenerateTraceAndPreserveHistory() {
        AgentRuntimeProperties config = new AgentRuntimeProperties();
        AgentRuntimeRequest request = AgentRuntimeRequest.builder()
                .envelope(envelope())
                .session(session())
                .run(run())
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .userInput(userInput("check token=visible-token"))
                .chatHistory(List.of(
                        chatMessage("user", "pruned question"),
                        chatMessage("assistant", "pruned answer"),
                        chatMessage("user", "oldest"),
                        chatMessage("assistant", "older"),
                        chatMessage("user", "recent question"),
                        assistantToolCall("call-1", "alert.history", "hunter2"),
                        TranscriptMessage.builder()
                                .role(TranscriptMessage.TranscriptRole.TOOL_RESULT)
                                .content(List.of(TranscriptContent.text("recent password=hunter2")))
                                .toolName("alert.history")
                                .toolCallId("call-1")
                                .build(),
                        chatMessage("assistant", "latest token=abc123")))
                .build();

        AgentRuntimeContext context = builder("trace-1").build(request, config);

        assertEquals("trace-1", context.getTraceId());
        assertEquals(8, context.getChatHistory().size());
        assertFalse(context.getChatHistory().get(0).isPruned());
        assertEquals(TranscriptMessage.TranscriptRole.USER, context.getChatHistory().get(0).getRole());
        assertEquals("pruned question", context.getChatHistory().get(0).text());
        assertEquals(TranscriptMessage.TranscriptRole.ASSISTANT, context.getChatHistory().get(5).getRole());
        assertEquals("call-1", context.getChatHistory().get(5).toolCalls().get(0).getId());
        assertEquals("hunter2", context.getChatHistory().get(5).toolCalls().get(0).getInput().get("password"));
        assertEquals(TranscriptMessage.TranscriptRole.TOOL_RESULT, context.getChatHistory().get(6).getRole());
        assertTrue(context.getChatHistory().get(6).text().contains("hunter2"));
        assertTrue(context.getChatHistory().get(7).text().contains("abc123"));
        assertThrows(UnsupportedOperationException.class, () -> context.getChatHistory().add(
                chatMessage("user", "mutate")));
    }

    @Test
    void shouldLeaveCompactionToRuntimeLoop() {
        AgentRuntimeProperties config = new AgentRuntimeProperties();
        AgentRuntimeRequest request = AgentRuntimeRequest.builder()
                .envelope(envelope())
                .session(session())
                .run(run())
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .userInput(userInput("current request"))
                .chatHistory(List.of(
                        chatMessage("user", "older request alertId=1001 monitorId=2001"),
                        chatMessage("assistant", "older answer with decision context"),
                        chatMessage("user", "middle request asking for remediation"),
                        chatMessage("assistant", "middle answer with detailed remediation"),
                        chatMessage("user", "recent request inspect monitor 42"),
                        assistantToolCall("call-42", "query_metrics", "monitorId=42"),
                        TranscriptMessage.toolResult("call-42", "query_metrics",
                                "metric rows " + "raw-fragment ".repeat(200), null),
                        chatMessage("assistant", "recent conclusion keep this tail")))
                .build();

        AgentRuntimeContext context = builder("trace").build(request, config);

        List<TranscriptMessage> history = context.getChatHistory();
        assertEquals(8, history.size());
        assertEquals(TranscriptMessage.TranscriptRole.USER, history.get(0).getRole());
        assertTrue(history.get(0).text().contains("older request alertId=1001"));
        assertTrue(history.stream().anyMatch(message -> message.text().contains("recent request inspect monitor 42")));
        assertTrue(history.stream().anyMatch(message -> message.text().contains("recent conclusion keep this tail")));
        assertTrue(history.stream().anyMatch(message -> message.text().contains("raw-fragment ".repeat(20))));
    }

    @Test
    void shouldFallbackTargetFromRunWhenMessageTargetIsMissing() {
        AgentRun run = AgentRun.builder()
                .id(2L)
                .runUid("run-target")
                .sessionId(1L)
                .targetMonitorId(100L)
                .targetAlertId(200L)
                .targetCollector("collector-a")
                .build();
        AgentRuntimeRequest request = AgentRuntimeRequest.builder()
                .envelope(envelope())
                .session(session())
                .run(run)
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .userInput(userInput("diagnose target from run"))
                .build();

        AgentRuntimeContext context = builder("trace").build(request, new AgentRuntimeProperties());

        assertEquals(AgentRuntimeEntryType.USER_INPUT, context.getEntryType());
        assertEquals(2L, context.getRunId());
        assertEquals("run-target", context.getRunUid());
        assertNull(request.getUserInput().getTarget());
        assertEquals(100L, context.getEffectiveTarget().getMonitorId());
        assertEquals(200L, context.getEffectiveTarget().getAlertId());
        assertEquals("collector-a", context.getEffectiveTarget().getCollector());
    }

    private AgentRuntimeContextBuilder builder(String traceId) {
        return new AgentRuntimeContextBuilder(Clock.fixed(NOW, ZoneOffset.UTC), () -> traceId);
    }

    private GatewayEnvelope envelope() {
        return GatewayEnvelope.builder()
                .channelId("web-ui")
                .receivedAt(100L)
                .actor(AgentActor.builder().type("user").id("alice").roles(List.of("user")).build())
                .build();
    }

    private AgentSession session() {
        return AgentSession.builder().id(1L).sessionUid("session-context").build();
    }

    private AgentRun run() {
        return AgentRun.builder().id(2L).runUid("run-context").sessionId(1L).build();
    }

    private UserInput userInput(String text) {
        return UserInput.builder()
                .conversationId("conversation-1")
                .message(Message.builder().text(text).build())
                .build();
    }

    private TranscriptMessage chatMessage(String role, String content) {
        return TranscriptMessage.builder()
                .role(TranscriptMessage.TranscriptRole.fromWireValue(role))
                .content(List.of(TranscriptContent.text(content)))
                .build();
    }

    private TranscriptMessage assistantToolCall(String toolCallId, String toolName, String password) {
        return TranscriptMessage.assistantToolCalls(null, List.of(
                TranscriptContent.toolCall(toolCallId, toolName, Map.of("alertId", 1001, "password", password))), null);
    }
}
