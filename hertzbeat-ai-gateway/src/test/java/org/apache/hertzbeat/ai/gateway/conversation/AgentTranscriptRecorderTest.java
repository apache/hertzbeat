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

package org.apache.hertzbeat.ai.gateway.conversation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.contract.AgentRunRequestSnapshot;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.contract.UserInput.Message;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptContent;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Agent transcript persistence tests.
 */
@ExtendWith(MockitoExtension.class)
class AgentTranscriptRecorderTest {

    @Mock
    private AgentSessionService sessionService;

    @Test
    void shouldPersistFullTranscriptTextWithSecretsRedacted() {
        when(sessionService.recordTranscriptEntry(any())).thenAnswer(invocation -> invocation.getArgument(0));
        AgentTranscriptRecorder recorder = new AgentTranscriptRecorder(sessionService);
        AgentSession session = AgentSession.builder().id(1L).sessionUid("session-1").build();
        AgentRun run = AgentRun.builder().id(2L).runUid("run-1").sessionId(1L).build();
        String userText = "diagnose token=user-secret " + "detail ".repeat(500);
        UserInput userInput = UserInput.builder()
            .messageId("message-1")
            .conversationId("conversation-1")
            .message(Message.builder().text(userText).build())
            .build();

        AgentTranscriptEntry userEntry = recorder.recordUserTranscriptEntry(session, run, userInput);
        String toolText = "{\"token\":\"tool-secret\",\"rows\":\"" + "x".repeat(3000) + "\"}";
        String toolError = "remote command failed";
        AgentTranscriptEntry toolEntry = recorder.recordRunMessage(
            session, run, TranscriptMessage.toolResult("call-1", "monitor.get", toolText, toolError));

        assertTrue(message(userEntry).text().contains("detail ".repeat(500)));
        assertFalse(message(userEntry).text().contains("user-secret"));
        assertTrue(message(userEntry).text().contains("token=[REDACTED]"));
        assertFalse(message(toolEntry).text().contains("tool-secret"));
        assertTrue(message(toolEntry).text().contains("\"token\":\"[REDACTED]\""));
        assertEquals(toolError, message(toolEntry).getErrorMessage());
        assertEquals("call-1", message(toolEntry).getToolCallId());
    }

    @Test
    void shouldRedactNestedToolArgumentsBeforePersistence() {
        when(sessionService.recordTranscriptEntry(any())).thenAnswer(invocation -> invocation.getArgument(0));
        AgentTranscriptRecorder recorder = new AgentTranscriptRecorder(sessionService);
        AgentSession session = AgentSession.builder().id(1L).sessionUid("session-1").build();
        AgentRun run = AgentRun.builder().id(2L).runUid("run-1").sessionId(1L).build();
        TranscriptMessage message = TranscriptMessage.assistantToolCalls(null, List.of(
                TranscriptContent.toolCall("call-1", "database.connect", Map.of(
                        "username", "operator",
                        "credentials", Map.of("password", "nested-secret")))), null);

        AgentTranscriptEntry entry = recorder.recordRunMessage(session, run, message);
        Map<String, Object> input = message(entry).toolCalls().getFirst().getInput();

        assertEquals("operator", input.get("username"));
        assertFalse(entry.getPayloadJson().contains("nested-secret"));
        assertTrue(entry.getPayloadJson().contains("[REDACTED]"));
    }

    @Test
    void shouldBoundAndRedactEveryRetrySnapshotFieldBeforePersistence() {
        when(sessionService.recordTranscriptEntry(any())).thenAnswer(invocation -> invocation.getArgument(0));
        AgentTranscriptRecorder recorder = new AgentTranscriptRecorder(sessionService);
        AgentSession session = AgentSession.builder().id(1L).sessionUid("session-1").build();
        AgentRun run = AgentRun.builder().id(2L).runUid("run-1").sessionId(1L).build();
        UserInput userInput = UserInput.builder().messageId("message-1").conversationId("conversation-1")
                .message(Message.builder().text("inspect token=message-secret")
                        .attachments(List.of("https://example.invalid/data?token=attachment-secret")).build())
                .build();
        AgentRunRequestSnapshot request = AgentRunRequestSnapshot.builder()
                .version(AgentRunRequestSnapshot.VERSION)
                .conversationId("conversation-1")
                .messageId("message-1")
                .entryType("USER_INPUT")
                .target(AgentTargetRef.builder().collector("token=target-secret").build())
                .message(userInput.getMessage().getText())
                .attachments(userInput.getMessage().getAttachments())
                .preferredLanguage("en-US")
                .approvalHandling("WAIT_FOR_DECISION")
                .replyMode("STREAM")
                .build();

        AgentTranscriptEntry entry = recorder.recordUserTranscriptEntry(
                session, run, userInput, "1", "original-fingerprint", request);
        TranscriptMessage persisted = message(entry);

        assertFalse(entry.getPayloadJson().contains("message-secret"));
        assertFalse(entry.getPayloadJson().contains("attachment-secret"));
        assertFalse(entry.getPayloadJson().contains("target-secret"));
        assertTrue(persisted.getRequestSnapshot().message().contains("[REDACTED]"));
        assertTrue(persisted.getRequestSnapshot().attachments().getFirst().contains("[REDACTED]"));
        assertTrue(persisted.getRequestSnapshot().target().getCollector().contains("[REDACTED]"));
        assertEquals("original-fingerprint", persisted.getRequestFingerprint());
    }

    @Test
    void shouldOmitRecoverySnapshotWhenFinalUtf8PayloadWouldExceedTextBudget() {
        when(sessionService.recordTranscriptEntry(any())).thenAnswer(invocation -> invocation.getArgument(0));
        AgentTranscriptRecorder recorder = new AgentTranscriptRecorder(sessionService);
        AgentSession session = AgentSession.builder().id(1L).sessionUid("session-1").build();
        AgentRun run = AgentRun.builder().id(2L).runUid("run-1").sessionId(1L).build();
        String messageText = "\uD83D\uDD2D".repeat(4096);
        List<String> attachments = List.of(
                "\uD83D\uDCCA".repeat(4096), "\uD83D\uDCC8".repeat(4096));
        UserInput userInput = UserInput.builder().messageId("message-1").conversationId("conversation-1")
                .message(Message.builder().text(messageText).attachments(attachments).build()).build();
        AgentRunRequestSnapshot request = AgentRunRequestSnapshot.builder()
                .version(AgentRunRequestSnapshot.VERSION)
                .conversationId("conversation-1")
                .messageId("message-1")
                .entryType("USER_INPUT")
                .message(messageText)
                .attachments(attachments)
                .preferredLanguage("en-US")
                .approvalHandling("WAIT_FOR_DECISION")
                .replyMode("STREAM")
                .build();

        AgentTranscriptEntry entry = recorder.recordUserTranscriptEntry(
                session, run, userInput, "1", "original-fingerprint", request);
        TranscriptMessage persisted = message(entry);

        assertEquals(messageText, persisted.text());
        assertEquals("original-fingerprint", persisted.getRequestFingerprint());
        assertNull(persisted.getRequestSnapshot());
        assertTrue(entry.getPayloadJson().getBytes(java.nio.charset.StandardCharsets.UTF_8).length < 65535);
    }

    private TranscriptMessage message(AgentTranscriptEntry entry) {
        return JsonUtil.fromJson(entry.getPayloadJson(), TranscriptMessage.class);
    }
}
