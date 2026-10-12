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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetSessionCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetRunCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetLatestSessionRunCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetSessionTranscriptCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListSessionsCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunListProjection;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunSnapshot;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunSnapshotService;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

/**
 * Gateway query authorization tests.
 */
@ExtendWith(MockitoExtension.class)
class GatewayQueryServiceTest {

    @Mock
    private AgentSessionService sessionService;

    @Mock
    private AgentRunService runService;

    @Mock
    private AgentRunSnapshotService snapshotService;

    @Test
    void listSessionsShouldUseEnvelopeChannelAndActor() {
        GatewayEnvelope envelope = envelope("bob");
        PageRequest pageRequest = PageRequest.of(0, 50);
        Page<AgentSession> sessions = Page.empty(pageRequest);
        when(sessionService.findSessions(
                envelope, AgentRuntimeEntryType.USER_INPUT, null, pageRequest)).thenReturn(sessions);
        ListSessionsCommand command = new ListSessionsCommand(
                envelope, ReplyMode.FINAL_ONLY, "list-sessions",
                AgentRuntimeEntryType.USER_INPUT, null, 0, 50);

        GatewayResponse.GatewaySingleResponse response = service().listSessions(command);

        assertEquals(Page.empty(pageRequest), response.body());
        verify(sessionService).findSessions(
                envelope, AgentRuntimeEntryType.USER_INPUT, null, pageRequest);
        verify(runService).findLatestRunProjections(List.of());
    }

    @Test
    void listSessionsShouldProjectTheLatestDurableRunStatus() {
        GatewayEnvelope envelope = envelope("bob");
        PageRequest pageRequest = PageRequest.of(0, 50);
        AgentSession session = webUiSession(2L, "ags-bob", "bob");
        session.setGmtUpdate(LocalDateTime.parse("2026-08-14T10:00:00"));
        Page<AgentSession> sessions = new PageImpl<>(List.of(session), pageRequest, 1);
        when(sessionService.findSessions(
                envelope, AgentRuntimeEntryType.USER_INPUT, null, pageRequest)).thenReturn(sessions);
        when(runService.findLatestRunProjections(List.of(2L))).thenReturn(java.util.Map.of(
                2L, new AgentRunListProjection("FAILED", LocalDateTime.parse("2026-08-14T11:00:00"))));
        ListSessionsCommand command = new ListSessionsCommand(
                envelope, ReplyMode.FINAL_ONLY, "list-sessions",
                AgentRuntimeEntryType.USER_INPUT, null, 0, 50);

        GatewayResponse.GatewaySingleResponse response = service().listSessions(command);

        Page<?> projected = (Page<?>) response.body();
        var projectedJson = JsonUtil.fromJson(JsonUtil.toJson(projected.getContent().getFirst()));
        assertEquals("FAILED", projectedJson.get("status").asText());
        assertEquals("2026-08-14T11:00:00", projectedJson.get("gmtUpdate").asText());
    }

    @Test
    void listSessionsShouldOrderThePageByLatestRunUpdate() {
        GatewayEnvelope envelope = envelope("bob");
        PageRequest pageRequest = PageRequest.of(0, 50);
        AgentSession staleFirst = webUiSession(2L, "ags-stale", "bob");
        AgentSession freshSecond = webUiSession(3L, "ags-fresh", "bob");
        Page<AgentSession> sessions = new PageImpl<>(List.of(staleFirst, freshSecond), pageRequest, 2);
        when(sessionService.findSessions(
                envelope, AgentRuntimeEntryType.USER_INPUT, null, pageRequest)).thenReturn(sessions);
        when(runService.findLatestRunProjections(List.of(2L, 3L))).thenReturn(java.util.Map.of(
                2L, new AgentRunListProjection("SUCCEEDED", LocalDateTime.parse("2026-08-14T10:00:00")),
                3L, new AgentRunListProjection("FAILED", LocalDateTime.parse("2026-08-14T12:00:00"))));
        ListSessionsCommand command = new ListSessionsCommand(
                envelope, ReplyMode.FINAL_ONLY, "list-sessions",
                AgentRuntimeEntryType.USER_INPUT, null, 0, 50);

        GatewayResponse.GatewaySingleResponse response = service().listSessions(command);

        Page<?> projected = (Page<?>) response.body();
        assertEquals(List.of("ags-fresh", "ags-stale"), projected.getContent().stream()
                .map(item -> JsonUtil.fromJson(JsonUtil.toJson(item)).get("sessionUid").asText())
                .toList());
    }

    @Test
    void listSessionsShouldPresentSessionsWithoutRunsAsNotRunning() {
        GatewayEnvelope envelope = envelope("bob");
        PageRequest pageRequest = PageRequest.of(0, 50);
        AgentSession session = webUiSession(2L, "ags-empty", "bob");
        Page<AgentSession> sessions = new PageImpl<>(List.of(session), pageRequest, 1);
        when(sessionService.findSessions(
                envelope, AgentRuntimeEntryType.USER_INPUT, null, pageRequest)).thenReturn(sessions);
        when(runService.findLatestRunProjections(List.of(2L))).thenReturn(java.util.Map.of());
        ListSessionsCommand command = new ListSessionsCommand(
                envelope, ReplyMode.FINAL_ONLY, "list-sessions",
                AgentRuntimeEntryType.USER_INPUT, null, 0, 50);

        GatewayResponse.GatewaySingleResponse response = service().listSessions(command);

        Page<?> projected = (Page<?>) response.body();
        assertEquals("NO_RUN", JsonUtil.fromJson(JsonUtil.toJson(projected.getContent().getFirst()))
                .get("status").asText());
    }

    @Test
    void listSessionsShouldForwardAlertAnalysisEnvelopeAndTitle() {
        GatewayEnvelope envelope = GatewayEnvelope.builder()
                .channelId("system")
                .receivedAt(100L)
                .actor(AgentActor.alertAnalysisActor())
                .build();
        PageRequest pageRequest = PageRequest.of(0, 50);
        Page<AgentSession> sessions = Page.empty(pageRequest);
        when(sessionService.findSessions(
                envelope, AgentRuntimeEntryType.ALERT_TRIGGER, "database", pageRequest)).thenReturn(sessions);
        ListSessionsCommand command = new ListSessionsCommand(
                envelope, ReplyMode.FINAL_ONLY, "list-alert-sessions",
                AgentRuntimeEntryType.ALERT_TRIGGER, "database", 0, 50);

        GatewayResponse.GatewaySingleResponse response = service().listSessions(command);

        assertEquals(Page.empty(pageRequest), response.body());
        verify(sessionService).findSessions(
                envelope, AgentRuntimeEntryType.ALERT_TRIGGER, "database", pageRequest);
        verify(runService).findLatestRunProjections(List.of());
    }

    @Test
    void getSessionShouldHideAnotherWebUiActorsSession() {
        GatewayEnvelope envelope = envelope("bob");
        when(sessionService.findOwnedSession(
                "ags-alice", envelope, AgentRuntimeEntryType.USER_INPUT)).thenReturn(Optional.empty());
        GetSessionCommand command = new GetSessionCommand(
                envelope, ReplyMode.FINAL_ONLY, "get-session",
                AgentRuntimeEntryType.USER_INPUT, "ags-alice");

        GatewayResponse.GatewaySingleResponse response = service().getSession(command);

        assertNull(response.body());
        assertEquals("Agent session not found", response.meta().message());
        verify(sessionService, never()).findSession("ags-alice");
    }

    @Test
    void getTranscriptShouldNotLoadAnotherWebUiActorsEntries() {
        GatewayEnvelope envelope = envelope("bob");
        when(sessionService.findOwnedSession(
                "ags-alice", envelope, AgentRuntimeEntryType.USER_INPUT)).thenReturn(Optional.empty());
        GetSessionTranscriptCommand command = new GetSessionTranscriptCommand(
                envelope, ReplyMode.FINAL_ONLY, "get-transcript",
                AgentRuntimeEntryType.USER_INPUT, "ags-alice", 0, 50);

        GatewayResponse.GatewaySingleResponse response = service().getSessionTranscript(command);

        assertEquals(Page.empty(PageRequest.of(0, 50)), response.body());
        assertEquals("Agent session not found", response.meta().message());
        verify(sessionService, never()).findTranscriptEntries(1L, PageRequest.of(0, 50));
        verify(sessionService, never()).findSession("ags-alice");
    }

    @Test
    void getTranscriptShouldLoadOwnedSessionEntries() {
        GatewayEnvelope envelope = envelope("bob");
        AgentSession session = webUiSession(2L, "ags-bob", "bob");
        PageRequest pageRequest = PageRequest.of(0, 50);
        Page<AgentTranscriptEntry> transcript = new PageImpl<>(
                List.of(AgentTranscriptEntry.builder().sessionId(2L).build()), pageRequest, 1);
        when(sessionService.findOwnedSession(
                "ags-bob", envelope, AgentRuntimeEntryType.USER_INPUT)).thenReturn(Optional.of(session));
        when(sessionService.findTranscriptEntries(2L, pageRequest)).thenReturn(transcript);
        GetSessionTranscriptCommand command = new GetSessionTranscriptCommand(
                envelope, ReplyMode.FINAL_ONLY, "get-transcript",
                AgentRuntimeEntryType.USER_INPUT, "ags-bob", 0, 50);

        GatewayResponse.GatewaySingleResponse response = service().getSessionTranscript(command);

        assertSame(transcript, response.body());
        assertEquals("session-transcript", response.meta().message());
    }

    @Test
    void getRunShouldReturnTheSameNotFoundShapeForForeignOwner() {
        GatewayEnvelope envelope = envelope("bob");
        AgentRun run = AgentRun.builder().id(3L).runUid("run-alice").sessionId(9L)
                .entryType(AgentRuntimeEntryType.USER_INPUT.name()).build();
        when(runService.findRun("run-alice")).thenReturn(Optional.of(run));
        when(sessionService.findOwnedSession(
                "9", envelope, AgentRuntimeEntryType.USER_INPUT)).thenReturn(Optional.empty());
        GetRunCommand command = new GetRunCommand(
                envelope, ReplyMode.FINAL_ONLY, "get-run", AgentRuntimeEntryType.USER_INPUT, "run-alice");

        GatewayResponse.GatewaySingleResponse response = service().getRun(command);

        assertNull(response.body());
        assertEquals("Agent run not found", response.meta().message());
        verify(snapshotService, never()).snapshot(any(), any());
    }

    @Test
    void getRunShouldReturnOwnedDurableSnapshot() {
        GatewayEnvelope envelope = envelope("bob");
        AgentSession session = webUiSession(2L, "ags-bob", "bob");
        AgentRun run = AgentRun.builder().id(3L).runUid("run-bob").sessionId(2L)
                .entryType(AgentRuntimeEntryType.USER_INPUT.name()).build();
        AgentRunSnapshot snapshot = new AgentRunSnapshot(
                "run-bob", "ags-bob", "message-1", "RUNNING", null, null, null, true, null, null, null);
        when(runService.findRun("run-bob")).thenReturn(Optional.of(run));
        when(sessionService.findOwnedSession(
                "2", envelope, AgentRuntimeEntryType.USER_INPUT)).thenReturn(Optional.of(session));
        when(snapshotService.snapshot(session, run)).thenReturn(snapshot);
        GetRunCommand command = new GetRunCommand(
                envelope, ReplyMode.FINAL_ONLY, "get-run", AgentRuntimeEntryType.USER_INPUT, "run-bob");

        GatewayResponse.GatewaySingleResponse response = service().getRun(command);

        assertSame(snapshot, response.body());
        assertEquals("run", response.meta().message());
    }

    @Test
    void getLatestSessionRunShouldReturnTheOwnedLatestSnapshot() {
        GatewayEnvelope envelope = envelope("bob");
        AgentSession session = webUiSession(2L, "ags-bob", "bob");
        AgentRun run = AgentRun.builder().id(4L).runUid("run-latest").sessionId(2L)
                .entryType(AgentRuntimeEntryType.USER_INPUT.name()).build();
        AgentRunSnapshot snapshot = new AgentRunSnapshot(
                "run-latest", "ags-bob", "message-2", "FAILED", null, null,
                "Warehouse unavailable", true, null, null, null);
        when(sessionService.findOwnedSession(
                "ags-bob", envelope, AgentRuntimeEntryType.USER_INPUT)).thenReturn(Optional.of(session));
        when(runService.findLatestRun(2L)).thenReturn(Optional.of(run));
        when(snapshotService.snapshot(session, run)).thenReturn(snapshot);
        GetLatestSessionRunCommand command = new GetLatestSessionRunCommand(
                envelope, ReplyMode.FINAL_ONLY, "get-latest", AgentRuntimeEntryType.USER_INPUT, "ags-bob");

        GatewayResponse.GatewaySingleResponse response = service().getLatestSessionRun(command);

        assertSame(snapshot, response.body());
        assertEquals("run", response.meta().message());
    }

    @Test
    void getLatestSessionRunShouldFailClosedForForeignOrEmptySessions() {
        GatewayEnvelope envelope = envelope("bob");
        when(sessionService.findOwnedSession(
                "ags-alice", envelope, AgentRuntimeEntryType.USER_INPUT)).thenReturn(Optional.empty());
        GetLatestSessionRunCommand foreign = new GetLatestSessionRunCommand(
                envelope, ReplyMode.FINAL_ONLY, "get-latest", AgentRuntimeEntryType.USER_INPUT, "ags-alice");

        GatewayResponse.GatewaySingleResponse response = service().getLatestSessionRun(foreign);

        assertNull(response.body());
        assertEquals("Agent run not found", response.meta().message());
        verify(runService, never()).findLatestRun(any());
    }

    private GatewayQueryService service() {
        return new GatewayQueryService(sessionService, runService, snapshotService);
    }

    private GatewayEnvelope envelope(String actorId) {
        return GatewayEnvelope.builder()
                .channelId("web-ui")
                .receivedAt(100L)
                .actor(AgentActor.builder().type("user").id(actorId).roles(List.of("user")).build())
                .build();
    }

    private AgentSession webUiSession(Long id, String sessionUid, String actorId) {
        return AgentSession.builder()
                .id(id)
                .sessionUid(sessionUid)
                .channel("web-ui")
                .actorType("user")
                .actorId(actorId)
                .build();
    }
}
