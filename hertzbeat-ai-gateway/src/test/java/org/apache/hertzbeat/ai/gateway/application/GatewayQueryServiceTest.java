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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetSessionCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetSessionTranscriptCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListSessionsCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry;
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

    @Test
    void listSessionsShouldUseEnvelopeChannelAndActor() {
        GatewayEnvelope envelope = envelope("bob");
        PageRequest pageRequest = PageRequest.of(0, 50);
        Page<AgentSession> sessions = Page.empty(pageRequest);
        when(sessionService.findSessions(envelope, null, pageRequest)).thenReturn(sessions);
        ListSessionsCommand command = new ListSessionsCommand(
                envelope, ReplyMode.FINAL_ONLY, "list-sessions", null, 0, 50);

        GatewayResponse.GatewaySingleResponse response = service().listSessions(command);

        assertSame(sessions, response.body());
        verify(sessionService).findSessions(envelope, null, pageRequest);
    }

    @Test
    void listSessionsShouldForwardAlertAnalysisEnvelopeAndTitle() {
        GatewayEnvelope envelope = GatewayEnvelope.builder()
                .channelId("alert")
                .receivedAt(100L)
                .actor(AgentActor.alertAnalysisActor())
                .build();
        PageRequest pageRequest = PageRequest.of(0, 50);
        Page<AgentSession> sessions = Page.empty(pageRequest);
        when(sessionService.findSessions(envelope, "database", pageRequest)).thenReturn(sessions);
        ListSessionsCommand command = new ListSessionsCommand(
                envelope, ReplyMode.FINAL_ONLY, "list-alert-sessions", "database", 0, 50);

        GatewayResponse.GatewaySingleResponse response = service().listSessions(command);

        assertSame(sessions, response.body());
        verify(sessionService).findSessions(envelope, "database", pageRequest);
    }

    @Test
    void getSessionShouldHideAnotherWebUiActorsSession() {
        GatewayEnvelope envelope = envelope("bob");
        when(sessionService.findOwnedSession("ags-alice", envelope)).thenReturn(Optional.empty());
        GetSessionCommand command = new GetSessionCommand(
                envelope, ReplyMode.FINAL_ONLY, "get-session", "ags-alice");

        GatewayResponse.GatewaySingleResponse response = service().getSession(command);

        assertNull(response.body());
        assertEquals("Agent session not found", response.meta().message());
        verify(sessionService, never()).findSession("ags-alice");
    }

    @Test
    void getTranscriptShouldNotLoadAnotherWebUiActorsEntries() {
        GatewayEnvelope envelope = envelope("bob");
        when(sessionService.findOwnedSession("ags-alice", envelope)).thenReturn(Optional.empty());
        GetSessionTranscriptCommand command = new GetSessionTranscriptCommand(
                envelope, ReplyMode.FINAL_ONLY, "get-transcript", "ags-alice", 0, 50);

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
        when(sessionService.findOwnedSession("ags-bob", envelope)).thenReturn(Optional.of(session));
        when(sessionService.findTranscriptEntries(2L, pageRequest)).thenReturn(transcript);
        GetSessionTranscriptCommand command = new GetSessionTranscriptCommand(
                envelope, ReplyMode.FINAL_ONLY, "get-transcript", "ags-bob", 0, 50);

        GatewayResponse.GatewaySingleResponse response = service().getSessionTranscript(command);

        assertSame(transcript, response.body());
        assertEquals("session-transcript", response.meta().message());
    }

    private GatewayQueryService service() {
        return new GatewayQueryService(sessionService);
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
