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
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentTranscriptEntryDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.contract.UserInput.Message;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeHistoryWindow;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptContent;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentSessionStatus;
import org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

/**
 * Agent session service tests.
 */
@ExtendWith(MockitoExtension.class)
class AgentSessionServiceTest {

    @Mock
    private AgentSessionDao sessionDao;

    @Mock
    private AgentTranscriptEntryDao transcriptEntryDao;

    @Mock
    private AgentSessionKeyBuilder sessionKeyBuilder;

    @Mock
    private EntityManager entityManager;

    @Test
    void findSessionsShouldApplyOptionalTitleFilter() {
        AgentSessionService service = new AgentSessionService(
            sessionDao, transcriptEntryDao, sessionKeyBuilder, entityManager);
        AgentActor actor = AgentActor.builder().type("service").id("alert-analysis").build();
        PageRequest pageRequest = PageRequest.of(0, 8);
        Page<AgentSession> page = Page.empty(pageRequest);
        when(sessionDao.findByChannelAndActorTypeAndActorIdAndTitleContainingIgnoreCaseOrderByGmtUpdateDesc(
            "alert", "service", "alert-analysis", "database", pageRequest)).thenReturn(page);

        assertSame(page, service.findSessions("alert", actor, "database", pageRequest));

        verify(sessionDao).findByChannelAndActorTypeAndActorIdAndTitleContainingIgnoreCaseOrderByGmtUpdateDesc(
            "alert", "service", "alert-analysis", "database", pageRequest);
    }

    @Test
    void findOrCreateSessionShouldReturnExistingSessionWithoutRefreshingMetadata() {
        AgentSessionService service = new AgentSessionService(
            sessionDao, transcriptEntryDao, sessionKeyBuilder, entityManager);
        AgentSession existing = AgentSession.builder()
            .id(1L)
            .sessionUid("ags-1")
            .sessionKey("key-1")
            .actorType("user")
            .actorId("alice")
            .actorRoles("[\"old-role\"]")
            .build();
        GatewayEnvelope envelope = GatewayEnvelope.builder()
            .channelId("web-ui")
            .receivedAt(100L)
            .actor(AgentActor.builder().type("user").id("alice").roles(List.of("new-role")).build())
            .build();
        UserInput userInput = UserInput.builder()
            .messageId("msg-2")
            .conversationId("chat-1")
            .message(Message.builder().text("diagnose").build())
            .build();
        when(sessionKeyBuilder.build(envelope, "chat-1")).thenReturn("key-1");
        when(sessionDao.findBySessionKey("key-1")).thenReturn(Optional.of(existing));

        AgentSession session = service.findOrCreateSession(envelope, userInput);

        assertSame(existing, session);
        assertEquals("[\"old-role\"]", existing.getActorRoles());
        verify(sessionDao, never()).save(any(AgentSession.class));
        verify(sessionDao, never()).saveAndFlush(any(AgentSession.class));
    }

    @Test
    void findOrCreateSessionShouldCreateActiveSession() {
        AgentSessionService service = new AgentSessionService(
            sessionDao, transcriptEntryDao, sessionKeyBuilder, entityManager);
        GatewayEnvelope envelope = GatewayEnvelope.builder()
            .channelId("web-ui")
            .receivedAt(100L)
            .actor(AgentActor.builder().type("user").id("alice").roles(List.of("user")).build())
            .build();
        UserInput userInput = UserInput.builder()
            .messageId("msg-1")
            .conversationId("chat-1")
            .message(Message.builder().text("diagnose").build())
            .build();
        when(sessionKeyBuilder.build(envelope, "chat-1")).thenReturn("key-1");
        when(sessionDao.findBySessionKey("key-1")).thenReturn(Optional.empty());
        when(sessionDao.saveAndFlush(any(AgentSession.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        AgentSession session = service.findOrCreateSession(envelope, userInput);

        assertEquals(AgentSessionStatus.ACTIVE, session.getStatus());
        assertEquals("ACTIVE", session.getStatus().name());
    }

    @Test
    void recordTranscriptEntryShouldAssignSessionSequence() {
        AgentSessionService service = new AgentSessionService(
            sessionDao, transcriptEntryDao, sessionKeyBuilder, entityManager);
        AgentSession session = AgentSession.builder().id(1L).transcriptSequence(6L).build();
        when(sessionDao.findFirstById(1L)).thenReturn(Optional.of(session));
        when(transcriptEntryDao.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        TranscriptMessage message = TranscriptMessage.toolResult("call-model-1", "diagnose_alert",
            "status=SUCCEEDED alertId=1001", null);
        AgentTranscriptEntry entry = service.recordTranscriptEntry(AgentTranscriptEntry.builder()
            .sessionId(1L)
            .runId(2L)
            .payloadJson(JsonUtil.toJson(message))
            .messageRole(message.getRole().wireValue())
            .build());

        assertEquals("toolResult", entry.getMessageRole());
        assertEquals(7L, entry.getSessionSequence());
        assertEquals(7L, session.getTranscriptSequence());
        assertTrue(entry.getPayloadJson().contains("alertId=1001"));
    }

    @Test
    void recordTranscriptEntryShouldRejectMissingRole() {
        AgentSessionService service = new AgentSessionService(
            sessionDao, transcriptEntryDao, sessionKeyBuilder, entityManager);
        AgentTranscriptEntry entry = AgentTranscriptEntry.builder()
            .sessionId(1L)
            .payloadJson(JsonUtil.toJson(TranscriptMessage.userText("hello")))
            .build();

        assertThrows(IllegalArgumentException.class, () -> service.recordTranscriptEntry(entry));
        verify(transcriptEntryDao, never()).save(any());
    }

    @Test
    void findTranscriptEntriesShouldQuerySessionTranscriptInOrder() {
        AgentSessionService service = new AgentSessionService(
            sessionDao, transcriptEntryDao, sessionKeyBuilder, entityManager);
        PageRequest pageable = PageRequest.of(0, 20);
        AgentTranscriptEntry entry = transcriptEntry(4L, TranscriptMessage.assistantText("done"));
        Page<AgentTranscriptEntry> page = new PageImpl<>(List.of(entry), pageable, 1);
        when(transcriptEntryDao.findBySessionIdOrderBySessionSequenceAsc(eq(1L), eq(pageable)))
            .thenReturn(page);

        Page<AgentTranscriptEntry> result = service.findTranscriptEntries(1L, pageable);

        assertSame(page, result);
        assertEquals(4L, result.getContent().get(0).getSessionSequence());
    }

    @Test
    void findRunTranscriptEntriesShouldQueryRunTranscriptInOrder() {
        AgentSessionService service = new AgentSessionService(
            sessionDao, transcriptEntryDao, sessionKeyBuilder, entityManager);
        PageRequest pageable = PageRequest.of(0, 20);
        AgentTranscriptEntry entry = transcriptEntry(2L, assistantToolCall("call-1", "alert.history", "alertId=1001"));
        Page<AgentTranscriptEntry> page = new PageImpl<>(List.of(entry), pageable, 1);
        when(transcriptEntryDao.findByRunIdOrderBySessionSequenceAsc(eq(2L), eq(pageable)))
            .thenReturn(page);

        Page<AgentTranscriptEntry> result = service.findRunTranscriptEntries(2L, pageable);

        assertSame(page, result);
        assertEquals(2L, result.getContent().get(0).getRunId());
    }

    @Test
    void persistCompactionCheckpointShouldAppendDerivedSummary() {
        AgentSessionService service = new AgentSessionService(
            sessionDao, transcriptEntryDao, sessionKeyBuilder, entityManager);
        TranscriptMessage message = TranscriptMessage.compactionSummary(
            "model generated summary", 4L, 5L);
        AgentRuntimeHistoryWindow.CompactionCheckpoint checkpoint =
            new AgentRuntimeHistoryWindow.CompactionCheckpoint(message, 4L, 5L);
        when(sessionDao.findFirstById(1L)).thenReturn(Optional.of(AgentSession.builder()
            .id(1L)
            .transcriptSequence(8L)
            .build()));
        when(transcriptEntryDao.findTopBySessionIdAndMessageRoleOrderBySessionSequenceDesc(
            1L, TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY.wireValue()))
            .thenReturn(Optional.empty());
        when(transcriptEntryDao.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.persistCompactionCheckpoint(1L, checkpoint);

        ArgumentCaptor<AgentTranscriptEntry> entryCaptor = ArgumentCaptor.forClass(AgentTranscriptEntry.class);
        verify(transcriptEntryDao).save(entryCaptor.capture());
        AgentTranscriptEntry entry = entryCaptor.getValue();
        assertEquals(TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY.wireValue(), entry.getMessageRole());
        assertEquals("model generated summary",
            JsonUtil.fromJson(entry.getPayloadJson(), TranscriptMessage.class).text());
    }

    @Test
    void findRecentTranscriptMessagesShouldPreserveTypedMessages() {
        AgentSessionService service = new AgentSessionService(
            sessionDao, transcriptEntryDao, sessionKeyBuilder, entityManager);
        arrangeRecentTranscriptEntries(List.of(
            transcriptEntry(4L, TranscriptMessage.assistantText("The alert is CPU related.")),
            transcriptEntry(3L, TranscriptMessage.toolResult("call-1", "alert.history",
                "partial alert data", "alert history query failed")),
            transcriptEntry(2L, assistantToolCall("call-1", "alert.history", "alertId=1001")),
            transcriptEntry(1L, TranscriptMessage.userText("Why did alert 1001 fire?"))));

        List<TranscriptMessage> history = service.findRecentTranscriptMessages(1L);

        assertEquals(4, history.size());
        assertEquals(TranscriptMessage.TranscriptRole.USER, history.get(0).getRole());
        assertEquals("Why did alert 1001 fire?", history.get(0).text());
        assertEquals(TranscriptMessage.TranscriptRole.ASSISTANT, history.get(1).getRole());
        assertEquals("alert.history", history.get(1).toolCalls().get(0).getName());
        assertEquals(Map.of("alertId", 1001), history.get(1).toolCalls().get(0).getInput());
        assertEquals(TranscriptMessage.TranscriptRole.TOOL_RESULT, history.get(2).getRole());
        assertEquals("call-1", history.get(2).getToolCallId());
        assertEquals("partial alert data", history.get(2).text());
        assertEquals("alert history query failed", history.get(2).getErrorMessage());
        assertEquals("The alert is CPU related.", history.get(3).text());
    }

    @Test
    void findRecentTranscriptMessagesShouldPreserveToolOutput() {
        AgentSessionService service = new AgentSessionService(
            sessionDao, transcriptEntryDao, sessionKeyBuilder, entityManager);
        String oversizedOutput = "alertId=42 monitorId=24 " + "raw-output-fragment ".repeat(300);
        arrangeRecentTranscriptEntries(List.of(
            transcriptEntry(3L, TranscriptMessage.toolResult("call-1", "alert.history",
                oversizedOutput, null)),
            transcriptEntry(2L, assistantToolCall("call-1", "alert.history", "alertId=42")),
            transcriptEntry(1L, TranscriptMessage.userText("Why did alert 42 fire?"))));

        List<TranscriptMessage> history = service.findRecentTranscriptMessages(1L);

        assertEquals(3, history.size());
        TranscriptMessage message = history.get(2);
        assertEquals(oversizedOutput, message.text());
        assertFalse(message.isPruned());
    }

    @Test
    void findRecentTranscriptMessagesShouldLeaveCompactionToRuntime() {
        AgentSessionService service = new AgentSessionService(
            sessionDao, transcriptEntryDao, sessionKeyBuilder, entityManager);
        arrangeRecentTranscriptEntries(List.of(
            transcriptEntry(8L, TranscriptMessage.assistantText("recent final answer")),
            transcriptEntry(7L, toolResult("call-2", "monitorId=42 " + "recent-metric ".repeat(120))),
            transcriptEntry(6L, assistantToolCall("call-2", "query_metrics", "monitorId=42")),
            transcriptEntry(5L, TranscriptMessage.userText("recent request inspect monitor 42")),
            transcriptEntry(4L, TranscriptMessage.assistantText("middle answer")),
            transcriptEntry(3L, TranscriptMessage.userText("middle request")),
            transcriptEntry(2L, TranscriptMessage.assistantText("older answer")),
            transcriptEntry(1L, TranscriptMessage.userText("older request alertId=1001"))));
        List<TranscriptMessage> history = service.findRecentTranscriptMessages(1L);

        assertEquals(8, history.size());
        assertEquals(TranscriptMessage.TranscriptRole.USER, history.get(0).getRole());
        assertTrue(history.get(0).text().contains("older request alertId=1001"));
        assertTrue(history.stream().anyMatch(message -> message.text().contains("recent request inspect monitor 42")));
        assertTrue(history.stream().anyMatch(message -> message.text().contains("recent-metric ".repeat(20))));
        verify(transcriptEntryDao, never()).save(any());
    }

    @Test
    void findRecentTranscriptMessagesShouldDropOrphanToolResults() {
        AgentSessionService service = new AgentSessionService(
            sessionDao, transcriptEntryDao, sessionKeyBuilder, entityManager);
        arrangeRecentTranscriptEntries(List.of(
            transcriptEntry(1L, toolResult("call-1", "orphan result"))));

        List<TranscriptMessage> history = service.findRecentTranscriptMessages(1L);

        assertTrue(history.isEmpty());
    }

    @Test
    void findRecentTranscriptMessagesShouldPageUntilAllMessagesAreLoaded() {
        AgentSessionService service = new AgentSessionService(
            sessionDao, transcriptEntryDao, sessionKeyBuilder, entityManager);
        List<AgentTranscriptEntry> firstPage = new ArrayList<>();
        for (long sequence = 101L; sequence >= 2L; sequence--) {
            firstPage.add(transcriptEntry(sequence, TranscriptMessage.userText("message " + sequence)));
        }
        when(transcriptEntryDao.findBySessionIdOrderBySessionSequenceDesc(
            eq(1L), eq(PageRequest.of(0, 100))))
            .thenReturn(firstPage);
        when(transcriptEntryDao.findBySessionIdOrderBySessionSequenceDesc(
            eq(1L), eq(PageRequest.of(1, 100))))
            .thenReturn(List.of(transcriptEntry(1L, TranscriptMessage.userText("message 1"))));

        List<TranscriptMessage> history = service.findRecentTranscriptMessages(1L);

        assertEquals(101, history.size());
        assertEquals("message 1", history.get(0).text());
        assertEquals("message 101", history.get(100).text());
        verify(transcriptEntryDao, times(2)).findBySessionIdOrderBySessionSequenceDesc(
            eq(1L), any(PageRequest.class));
    }

    @Test
    void findRecentTranscriptMessagesShouldRestoreCheckpointAndRawTailFromFirstKeptSequence() {
        AgentSessionService service = new AgentSessionService(
            sessionDao, transcriptEntryDao, sessionKeyBuilder, entityManager);
        TranscriptMessage checkpoint = TranscriptMessage.compactionSummary(
            "summary before sequence 11", 10L, 11L);
        AgentTranscriptEntry checkpointEntry = transcriptEntry(20L, checkpoint);
        when(transcriptEntryDao.findTopBySessionIdAndMessageRoleOrderBySessionSequenceDesc(
            1L, TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY.wireValue()))
            .thenReturn(Optional.of(checkpointEntry));
        when(transcriptEntryDao.findBySessionIdAndSessionSequenceGreaterThanEqualOrderBySessionSequenceAsc(
            eq(1L), eq(11L), eq(PageRequest.of(0, 100))))
            .thenReturn(List.of(
                transcriptEntry(11L, TranscriptMessage.userText("tail question 1")),
                transcriptEntry(12L, TranscriptMessage.assistantText("tail answer 1")),
                checkpointEntry,
                transcriptEntry(21L, TranscriptMessage.userText("tail question 2"))));

        List<TranscriptMessage> history = service.findRecentTranscriptMessages(1L);

        assertEquals(4, history.size());
        assertEquals(TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY, history.get(0).getRole());
        assertEquals("summary before sequence 11", history.get(0).text());
        assertEquals("tail question 1", history.get(1).text());
        assertEquals("tail answer 1", history.get(2).text());
        assertEquals("tail question 2", history.get(3).text());
        assertEquals(1, history.stream()
            .filter(message -> message.getRole() == TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY)
            .count());
        verify(transcriptEntryDao, never()).findBySessionIdOrderBySessionSequenceDesc(
            eq(1L), any(PageRequest.class));
    }

    private void arrangeRecentTranscriptEntries(List<AgentTranscriptEntry> entries) {
        when(transcriptEntryDao.findBySessionIdOrderBySessionSequenceDesc(
            eq(1L), eq(PageRequest.of(0, 100))))
            .thenReturn(entries);
    }

    private AgentTranscriptEntry transcriptEntry(Long id, TranscriptMessage message) {
        return AgentTranscriptEntry.builder()
            .id(id)
            .sessionId(1L)
            .runId(2L)
            .sessionSequence(id)
            .payloadJson(JsonUtil.toJson(message))
            .messageRole(message.getRole().wireValue())
            .gmtCreate(LocalDateTime.parse("2026-04-19T00:00:00").plusSeconds(id))
            .build();
    }

    private TranscriptMessage assistantToolCall(String callId, String toolName, String inputValue) {
        return TranscriptMessage.assistantToolCalls("", List.of(
            TranscriptContent.toolCall(callId, toolName, toolInput(inputValue))));
    }

    private Map<String, Object> toolInput(String inputValue) {
        if (inputValue != null && inputValue.startsWith("alertId=")) {
            return Map.of("alertId", Integer.parseInt(inputValue.substring("alertId=".length())));
        }
        if (inputValue != null && inputValue.startsWith("monitorId=")) {
            return Map.of("monitorId", Integer.parseInt(inputValue.substring("monitorId=".length())));
        }
        return Map.of("input", inputValue);
    }

    private TranscriptMessage assistantToolCalls(String... callIds) {
        List<TranscriptContent> toolCalls = new ArrayList<>();
        for (String callId : callIds) {
            toolCalls.add(TranscriptContent.toolCall(callId, "alert.history", Map.of("callId", callId)));
        }
        return TranscriptMessage.assistantToolCalls("", toolCalls);
    }

    private TranscriptMessage toolResult(String callId, String text) {
        return TranscriptMessage.toolResult(callId, "alert.history", text, null);
    }
}
