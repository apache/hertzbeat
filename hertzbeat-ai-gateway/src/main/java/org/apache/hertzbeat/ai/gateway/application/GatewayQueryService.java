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

import java.util.List;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetSessionCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetSessionTranscriptCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListSessionsCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.Meta;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

/**
 * Gateway query commands. Query commands never invoke runtime.
 */
@Service
public class GatewayQueryService {

    private final AgentSessionService sessionService;

    public GatewayQueryService(AgentSessionService sessionService) {
        this.sessionService = sessionService;
    }

    public GatewaySingleResponse listSessions(ListSessionsCommand command) {
        Page<AgentSession> sessions = sessionService.findSessions(
                command.envelope(),
                command.title(),
                PageRequest.of(command.pageIndex(), command.pageSize()));
        return GatewaySingleResponse.builder()
                .meta(Meta.builder()
                        .commandId(command.commandId())
                        .terminal(true)
                        .message("sessions")
                        .build())
                .body(sessions)
                .events(List.of())
                .build();
    }

    public GatewaySingleResponse getSession(GetSessionCommand command) {
        return sessionService.findOwnedSession(command.sessionUid(), command.envelope())
                .<GatewaySingleResponse>map(session -> GatewaySingleResponse.builder()
                        .meta(Meta.builder()
                                .commandId(command.commandId())
                                .sessionUid(session.getSessionUid())
                                .terminal(true)
                                .message("session")
                                .build())
                        .body(session)
                        .events(List.of())
                        .build())
                .orElseGet(() -> GatewaySingleResponse.builder()
                        .meta(Meta.builder()
                                .commandId(command.commandId())
                                .sessionUid(command.sessionUid())
                                .terminal(true)
                                .message("Agent session not found")
                                .build())
                        .events(List.of())
                        .build());
    }

    public GatewaySingleResponse getSessionTranscript(GetSessionTranscriptCommand command) {
        PageRequest pageRequest = PageRequest.of(command.pageIndex(), command.pageSize());
        AgentSession session = sessionService.findOwnedSession(command.sessionUid(), command.envelope()).orElse(null);
        Page<AgentTranscriptEntry> transcript = session == null
                ? Page.empty(pageRequest)
                : sessionService.findTranscriptEntries(session.getId(), pageRequest);
        return GatewaySingleResponse.builder()
                .meta(Meta.builder()
                        .commandId(command.commandId())
                        .sessionUid(session == null ? command.sessionUid() : session.getSessionUid())
                        .terminal(true)
                        .message(session == null ? "Agent session not found" : "session-transcript")
                        .build())
                .body(transcript)
                .events(List.of())
                .build();
    }
}
