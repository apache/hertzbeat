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

package org.apache.hertzbeat.ai.gateway.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.contract.AgentAlertIncidentContext;
import org.apache.hertzbeat.ai.gateway.contract.AgentRunRequestSnapshot;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunStatus;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Transactional admission state-machine contracts.
 */
@ExtendWith(MockitoExtension.class)
class AgentRunAdmissionServiceTest {

    @Mock
    private AgentSessionService sessionService;
    @Mock
    private AgentRunAdmissionTransaction admissionTransaction;
    @Mock
    private AgentSessionDao sessionDao;
    @Mock
    private AgentRunDao runDao;
    @Mock
    private AgentRunService runService;
    @Mock
    private AgentTranscriptRecorder transcriptRecorder;
    @Mock
    private AgentTargetCanonicalizationService targetCanonicalizationService;

    private AgentSession session;

    @Test
    void serviceShouldResolveTheCanonicalSessionBeforeStartingTheAdmissionTransaction() {
        session = AgentSession.builder()
                .id(1L).sessionUid("session-1").channel("web-ui")
                .originEntryType(AgentRuntimeEntryType.USER_INPUT.name())
                .conversationId("conversation-1").actorType("user").actorId("admin").build();
        InvokeCommand command = command(ReplyMode.STREAM, "en-US", input("diagnose", List.of()));
        AgentRunAdmission expected = new AgentRunAdmission(AgentRunAdmission.Decision.REPLAY_ACTIVE,
                session, run(AgentRunStatus.RUNNING), AgentApprovalHandling.WAIT_FOR_DECISION, List.of());
        when(sessionService.findOrCreateSession(any(), any(), any())).thenReturn(session);
        when(admissionTransaction.admit(1L, command, command)).thenReturn(expected);

        AgentRunAdmission actual = new AgentRunAdmissionService(
                sessionService, admissionTransaction, runDao, targetCanonicalizationService).admit(command);

        assertSame(expected, actual);
        InOrder order = inOrder(sessionService, admissionTransaction);
        order.verify(sessionService).findOrCreateSession(command.envelope(), command.userInput(), command.entryType());
        order.verify(admissionTransaction).admit(1L, command, command);
    }

    @Test
    void newTargetedRequestShouldCanonicalizeBeforeCreatingOrLockingTheSession() {
        InvokeCommand source = command(ReplyMode.STREAM, "en-US", input("diagnose", List.of()));
        InvokeCommand canonical = copy(source, source.envelope(), source.entryType());
        session = AgentSession.builder().id(1L).workspaceId("default").build();
        AgentRunAdmission expected = new AgentRunAdmission(AgentRunAdmission.Decision.EXECUTE_NEW,
                session, run(AgentRunStatus.RUNNING), AgentApprovalHandling.WAIT_FOR_DECISION, List.of());
        when(targetCanonicalizationService.requiresCanonicalization(source)).thenReturn(true);
        when(sessionService.findSession(source.envelope(), "conversation-1")).thenReturn(Optional.empty());
        when(targetCanonicalizationService.canonicalize(source)).thenReturn(canonical);
        when(sessionService.findOrCreateSession(source.envelope(), source.userInput(), source.entryType()))
                .thenReturn(session);
        when(admissionTransaction.admit(1L, source, canonical)).thenReturn(expected);

        AgentRunAdmission actual = service().admit(source);

        assertSame(expected, actual);
        InOrder order = inOrder(targetCanonicalizationService, sessionService, admissionTransaction);
        order.verify(targetCanonicalizationService).canonicalize(source);
        order.verify(sessionService).findOrCreateSession(source.envelope(), source.userInput(), source.entryType());
        order.verify(admissionTransaction).admit(1L, source, canonical);
    }

    @Test
    void existingTargetedRunShouldReplayWithoutCanonicalizingCurrentAuthority() {
        InvokeCommand source = command(ReplyMode.STREAM, "en-US", input("diagnose", List.of()));
        session = AgentSession.builder().id(1L).build();
        AgentRun existing = run(AgentRunStatus.RUNNING);
        AgentRunAdmission expected = new AgentRunAdmission(AgentRunAdmission.Decision.REPLAY_ACTIVE,
                session, existing, AgentApprovalHandling.WAIT_FOR_DECISION, List.of());
        when(targetCanonicalizationService.requiresCanonicalization(source)).thenReturn(true);
        when(sessionService.findSession(source.envelope(), "conversation-1")).thenReturn(Optional.of(session));
        when(runDao.findBySessionIdAndMessageId(1L, "message-1")).thenReturn(Optional.of(existing));
        when(admissionTransaction.admit(1L, source, null)).thenReturn(expected);

        assertSame(expected, service().admit(source));
        verify(targetCanonicalizationService, never()).canonicalize(source);
    }

    @Test
    void canonicalizationFailureShouldReprobeConcurrentWinnerBeforeFailing() {
        InvokeCommand source = command(ReplyMode.STREAM, "en-US", input("diagnose", List.of()));
        session = AgentSession.builder().id(1L).build();
        AgentRun existing = run(AgentRunStatus.RUNNING);
        AgentRunAdmission expected = new AgentRunAdmission(AgentRunAdmission.Decision.REPLAY_ACTIVE,
                session, existing, AgentApprovalHandling.WAIT_FOR_DECISION, List.of());
        when(targetCanonicalizationService.requiresCanonicalization(source)).thenReturn(true);
        when(sessionService.findSession(source.envelope(), "conversation-1"))
                .thenReturn(Optional.empty(), Optional.of(session));
        when(targetCanonicalizationService.canonicalize(source))
                .thenThrow(new IllegalArgumentException("Entity monitor metric target is unavailable"));
        when(runDao.findBySessionIdAndMessageId(1L, "message-1")).thenReturn(Optional.of(existing));
        when(admissionTransaction.admit(1L, source, null)).thenReturn(expected);

        assertSame(expected, service().admit(source));
    }

    private AgentRunAdmissionService service() {
        return new AgentRunAdmissionService(
                sessionService, admissionTransaction, runDao, targetCanonicalizationService);
    }

    private void initializeSession() {
        session = AgentSession.builder()
                .id(1L)
                .sessionUid("session-1")
                .channel("web-ui")
                .originEntryType(AgentRuntimeEntryType.USER_INPUT.name())
                .conversationId("conversation-1")
                .actorType("user")
                .actorId("admin")
                .build();
        when(sessionDao.findFirstById(1L)).thenReturn(Optional.of(session));
    }

    @Test
    void firstRequestShouldLockSessionThenPersistOneFingerprintAndClaimRunning() {
        initializeSession();
        InvokeCommand command = command(ReplyMode.STREAM, "en-US", input("diagnose", List.of("a", "b")));
        AgentRun created = run(AgentRunStatus.CREATED);
        when(runDao.findBySessionIdAndMessageId(1L, "message-1")).thenReturn(Optional.empty());
        when(transcriptRecorder.chatHistory(1L)).thenReturn(List.of());
        when(runService.createOrResumeRun(session, command.userInput(), command.entryType())).thenReturn(created);
        when(runService.markRunning(created)).thenAnswer(invocation -> {
            created.setStatus(AgentRunStatus.RUNNING.name());
            return created;
        });

        AgentRunAdmission admission = transaction().admit(1L, command);

        assertEquals(AgentRunAdmission.Decision.EXECUTE_NEW, admission.decision());
        assertEquals(AgentRunStatus.RUNNING.name(), admission.run().getStatus());
        ArgumentCaptor<String> version = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> fingerprint = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<AgentRunRequestSnapshot> request = ArgumentCaptor.forClass(AgentRunRequestSnapshot.class);
        verify(transcriptRecorder).recordUserTranscriptEntry(
                eq(session), eq(created), eq(command.userInput()), version.capture(), fingerprint.capture(),
                request.capture());
        assertEquals(AgentRunRequestFingerprint.VERSION, version.getValue());
        assertEquals(AgentRunRequestFingerprint.from(command, AgentApprovalHandling.WAIT_FOR_DECISION),
                fingerprint.getValue());
        assertEquals(command.userInput().getMessage().getAttachments(), request.getValue().attachments());
        InOrder order = inOrder(sessionDao, runDao, transcriptRecorder, runService);
        order.verify(sessionDao).findFirstById(1L);
        order.verify(runDao).findBySessionIdAndMessageId(1L, "message-1");
        order.verify(transcriptRecorder).chatHistory(1L);
        order.verify(runService).createOrResumeRun(session, command.userInput(), command.entryType());
        order.verify(transcriptRecorder).recordUserTranscriptEntry(
                eq(session), eq(created), eq(command.userInput()), any(), any(), any());
        order.verify(runService).markRunning(created);
    }

    @Test
    void terminalRequestWithTheSameFingerprintShouldReplayWithoutWrites() {
        initializeSession();
        InvokeCommand command = command(ReplyMode.STREAM, "en-US", input("diagnose", List.of()));
        AgentRun succeeded = run(AgentRunStatus.SUCCEEDED);
        String fingerprint = AgentRunRequestFingerprint.from(command, AgentApprovalHandling.WAIT_FOR_DECISION);
        when(runDao.findBySessionIdAndMessageId(1L, "message-1")).thenReturn(Optional.of(succeeded));
        when(transcriptRecorder.findRunRequestMessage(2L)).thenReturn(Optional.of(
                TranscriptMessage.userText("diagnose", AgentRunRequestFingerprint.VERSION, fingerprint)));

        AgentRunAdmission admission = transaction().admit(1L, command);

        assertEquals(AgentRunAdmission.Decision.REPLAY_TERMINAL, admission.decision());
        verify(transcriptRecorder, never()).recordUserTranscriptEntry(any(), any(), any(), any(), any(), any());
        verify(runService, never()).markRunning(any());
    }

    @Test
    void recoveryRequiredRequestWithTheSameFingerprintShouldReplayWithoutWrites() {
        initializeSession();
        InvokeCommand command = command(ReplyMode.STREAM, "en-US", input("diagnose", List.of()));
        AgentRun recoveryRequired = run(AgentRunStatus.RECOVERY_REQUIRED);
        String fingerprint = AgentRunRequestFingerprint.from(command, AgentApprovalHandling.WAIT_FOR_DECISION);
        when(runDao.findBySessionIdAndMessageId(1L, "message-1")).thenReturn(Optional.of(recoveryRequired));
        when(transcriptRecorder.findRunRequestMessage(2L)).thenReturn(Optional.of(
                TranscriptMessage.userText("diagnose", AgentRunRequestFingerprint.VERSION, fingerprint)));

        AgentRunAdmission admission = transaction().admit(1L, command);

        assertEquals(AgentRunAdmission.Decision.REPLAY_TERMINAL, admission.decision());
        verify(transcriptRecorder, never()).recordUserTranscriptEntry(any(), any(), any(), any(), any(), any());
        verify(runService, never()).markRunning(any());
    }

    @Test
    void changedRequestWithTheSameMessageIdShouldRejectWithoutWrites() {
        initializeSession();
        InvokeCommand command = command(ReplyMode.STREAM, "en-US", input("new request", List.of()));
        AgentRun running = run(AgentRunStatus.RUNNING);
        when(runDao.findBySessionIdAndMessageId(1L, "message-1")).thenReturn(Optional.of(running));
        when(transcriptRecorder.findRunRequestMessage(2L)).thenReturn(Optional.of(
                TranscriptMessage.userText("old request", AgentRunRequestFingerprint.VERSION, "foreign")));

        AgentRunAdmission admission = transaction().admit(1L, command);

        assertEquals(AgentRunAdmission.Decision.REJECT_MISMATCH, admission.decision());
        verify(transcriptRecorder, never()).recordUserTranscriptEntry(any(), any(), any(), any(), any(), any());
        verify(runService, never()).markRunning(any());
    }

    @Test
    void fingerprintWriteFailureShouldPreventTheRuntimeClaim() {
        initializeSession();
        InvokeCommand command = command(ReplyMode.STREAM, "en-US", input("diagnose", List.of()));
        AgentRun created = run(AgentRunStatus.CREATED);
        when(runDao.findBySessionIdAndMessageId(1L, "message-1")).thenReturn(Optional.empty());
        when(transcriptRecorder.chatHistory(1L)).thenReturn(List.of());
        when(runService.createOrResumeRun(session, command.userInput(), command.entryType())).thenReturn(created);
        org.mockito.Mockito.doThrow(new IllegalStateException("write failed"))
                .when(transcriptRecorder).recordUserTranscriptEntry(
                        eq(session), eq(created), eq(command.userInput()), any(), any(), any());

        assertThrows(IllegalStateException.class, () -> transaction().admit(1L, command));

        verify(runService, never()).markRunning(any());
    }

    @Test
    void requestFingerprintShouldCoverExecutionSemanticsButNotReceiptTime() {
        InvokeCommand base = command(ReplyMode.STREAM, "en-US", input("diagnose", List.of("a", "b")));
        String fingerprint = fingerprint(base);

        assertEquals(fingerprint, fingerprint(copy(base,
                base.envelope().toBuilder().receivedAt(999L).build(), base.entryType())));
        assertNotEquals(fingerprint, fingerprint(command(
                ReplyMode.STREAM, "zh-CN", base.userInput())));
        assertNotEquals(fingerprint, fingerprint(command(
                ReplyMode.FINAL_ONLY, "en-US", base.userInput())));
        assertNotEquals(fingerprint, fingerprint(command(
                ReplyMode.STREAM, "en-US", input("investigate", List.of("a", "b")))));
        assertNotEquals(fingerprint, fingerprint(command(
                ReplyMode.STREAM, "en-US", input("diagnose", List.of("b", "a")))));
        assertNotEquals(fingerprint, fingerprint(command(
                ReplyMode.STREAM, "en-US", base.userInput().toBuilder()
                        .target(AgentTargetRef.builder().monitorId(10L).build()).build())));
        assertNotEquals(fingerprint, fingerprint(command(
                ReplyMode.STREAM, "en-US", base.userInput().toBuilder()
                        .alertIncident(AgentAlertIncidentContext.builder()
                                .analysisPolicyId(1L).alertIds(List.of(2L)).alertCount(1).windowStartedAt(3L).build())
                        .build())));
        assertNotEquals(fingerprint, AgentRunRequestFingerprint.from(
                copy(base, base.envelope(), AgentRuntimeEntryType.ALERT_TRIGGER),
                AgentApprovalHandling.WAIT_FOR_DECISION));
    }

    @Test
    void scheduleReservationWithChangedTargetShouldRejectBeforeWritingTheFingerprint() {
        AgentActor actor = AgentActor.scheduleActor();
        session = AgentSession.builder()
                .id(1L).sessionUid("session-1").channel("system")
                .originEntryType(AgentRuntimeEntryType.SCHEDULE_TRIGGER.name())
                .conversationId("conversation-1").actorType(actor.getType()).actorId(actor.getId()).build();
        UserInput scheduledInput = input("diagnose", List.of()).toBuilder()
                .target(AgentTargetRef.builder().monitorId(20L).build()).build();
        InvokeCommand command = InvokeCommand.builder()
                .envelope(GatewayEnvelope.builder().channelId("system").receivedAt(100L)
                        .actor(actor).preferredLanguage("en-US").build())
                .replyMode(ReplyMode.FINAL_ONLY).commandId("message-1").userInput(scheduledInput)
                .entryType(AgentRuntimeEntryType.SCHEDULE_TRIGGER).build();
        AgentRun reserved = run(AgentRunStatus.CREATED);
        reserved.setEntryType(AgentRuntimeEntryType.SCHEDULE_TRIGGER.name());
        reserved.setTargetContextJson(org.apache.hertzbeat.common.util.JsonUtil.toJson(
                AgentTargetRef.builder().monitorId(10L).build()));
        when(sessionDao.findFirstById(1L)).thenReturn(Optional.of(session));
        when(runDao.findBySessionIdAndMessageId(1L, "message-1")).thenReturn(Optional.of(reserved));
        when(transcriptRecorder.findRunRequestMessage(2L)).thenReturn(Optional.empty());

        AgentRunAdmission admission = transaction().admit(1L, command);

        assertEquals(AgentRunAdmission.Decision.REJECT_MISMATCH, admission.decision());
        verify(transcriptRecorder, never()).recordUserTranscriptEntry(any(), any(), any(), any(), any());
        verify(runService, never()).markRunning(any());
    }

    private AgentRunAdmissionTransaction transaction() {
        return new AgentRunAdmissionTransaction(
                sessionDao, runDao, runService, transcriptRecorder, targetCanonicalizationService);
    }

    private String fingerprint(InvokeCommand command) {
        AgentApprovalHandling approval = command.replyMode() == ReplyMode.STREAM
                ? AgentApprovalHandling.WAIT_FOR_DECISION : AgentApprovalHandling.DENY;
        return AgentRunRequestFingerprint.from(command, approval);
    }

    private InvokeCommand command(ReplyMode mode, String language, UserInput input) {
        return InvokeCommand.builder()
                .envelope(GatewayEnvelope.builder()
                        .channelId("web-ui")
                        .receivedAt(100L)
                        .preferredLanguage(language)
                        .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                        .build())
                .replyMode(mode)
                .commandId("message-1")
                .userInput(input)
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .build();
    }

    private InvokeCommand copy(InvokeCommand source, GatewayEnvelope envelope, AgentRuntimeEntryType entryType) {
        return InvokeCommand.builder()
                .envelope(envelope)
                .replyMode(source.replyMode())
                .commandId(source.commandId())
                .userInput(source.userInput())
                .entryType(entryType)
                .build();
    }

    private UserInput input(String text, List<String> attachments) {
        return UserInput.builder()
                .messageId("message-1")
                .conversationId("conversation-1")
                .message(UserInput.Message.builder().text(text).attachments(attachments).build())
                .build();
    }

    private AgentRun run(AgentRunStatus status) {
        return AgentRun.builder()
                .id(2L)
                .runUid("run-1")
                .sessionId(1L)
                .messageId("message-1")
                .entryType(AgentRuntimeEntryType.USER_INPUT.name())
                .status(status.name())
                .build();
    }
}
