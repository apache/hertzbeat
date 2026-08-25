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

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetSessionCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetRunCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetLatestSessionRunCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetSessionTranscriptCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListSessionsCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.Meta;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionListItem;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunListProjection;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunSnapshotService;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

/**
 * Gateway query commands. Query commands never invoke runtime.
 */
@Service
public class GatewayQueryService {

    private final AgentSessionService sessionService;
    private final AgentRunService runService;
    private final AgentRunSnapshotService snapshotService;

    public GatewayQueryService(AgentSessionService sessionService, AgentRunService runService,
                               AgentRunSnapshotService snapshotService) {
        this.sessionService = sessionService;
        this.runService = runService;
        this.snapshotService = snapshotService;
    }

    public GatewaySingleResponse listSessions(ListSessionsCommand command) {
        Page<AgentSession> sessions = sessionService.findSessions(
                command.envelope(),
                command.originEntryType(),
                command.title(),
                PageRequest.of(command.pageIndex(), command.pageSize()));
        List<Long> sessionIds = sessions.stream().map(AgentSession::getId).toList();
        Map<Long, AgentRunListProjection> latestRuns = runService.findLatestRunProjections(sessionIds);
        List<AgentSessionListItem> projectedContent = sessions.stream()
                .map(session -> AgentSessionListItem.from(session, latestRuns.get(session.getId())))
                .sorted(Comparator.comparing(
                        AgentSessionListItem::gmtUpdate,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        Page<AgentSessionListItem> projectedSessions = new PageImpl<>(
                projectedContent, sessions.getPageable(), sessions.getTotalElements());
        return GatewaySingleResponse.builder()
                .meta(Meta.builder()
                        .commandId(command.commandId())
                        .terminal(true)
                        .message("sessions")
                        .build())
                .body(projectedSessions)
                .events(List.of())
                .build();
    }

    public GatewaySingleResponse getSession(GetSessionCommand command) {
        return sessionService.findOwnedSession(
                        command.sessionUid(), command.envelope(), command.originEntryType())
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

    public GatewaySingleResponse getRun(GetRunCommand command) {
        return runService.findRun(command.runUid())
                .filter(run -> command.originEntryType().name().equals(run.getEntryType()))
                .flatMap(run -> sessionService.findOwnedSession(
                                String.valueOf(run.getSessionId()), command.envelope(), command.originEntryType())
                        .map(session -> snapshotService.snapshot(session, run)))
                .<GatewaySingleResponse>map(snapshot -> GatewaySingleResponse.builder()
                        .meta(Meta.builder()
                                .commandId(command.commandId())
                                .sessionUid(snapshot.sessionUid())
                                .runUid(snapshot.runUid())
                                .terminal(true)
                                .message("run")
                                .build())
                        .body(snapshot)
                        .events(List.of())
                        .build())
                .orElseGet(() -> GatewaySingleResponse.builder()
                        .meta(Meta.builder()
                                .commandId(command.commandId())
                                .runUid(command.runUid())
                                .terminal(true)
                                .message("Agent run not found")
                                .build())
                        .events(List.of())
                        .build());
    }

    public GatewaySingleResponse getLatestSessionRun(GetLatestSessionRunCommand command) {
        return sessionService.findOwnedSession(
                        command.sessionUid(), command.envelope(), command.originEntryType())
                .flatMap(session -> runService.findLatestRun(session.getId())
                        .filter(run -> command.originEntryType().name().equals(run.getEntryType()))
                        .map(run -> snapshotService.snapshot(session, run)))
                .<GatewaySingleResponse>map(snapshot -> GatewaySingleResponse.builder()
                        .meta(Meta.builder()
                                .commandId(command.commandId())
                                .sessionUid(snapshot.sessionUid())
                                .runUid(snapshot.runUid())
                                .terminal(true)
                                .message("run")
                                .build())
                        .body(snapshot)
                        .events(List.of())
                        .build())
                .orElseGet(() -> GatewaySingleResponse.builder()
                        .meta(Meta.builder()
                                .commandId(command.commandId())
                                .sessionUid(command.sessionUid())
                                .terminal(true)
                                .message("Agent run not found")
                                .build())
                        .events(List.of())
                        .build());
    }

    public GatewaySingleResponse getSessionTranscript(GetSessionTranscriptCommand command) {
        PageRequest pageRequest = PageRequest.of(command.pageIndex(), command.pageSize());
        AgentSession session = sessionService.findOwnedSession(
                command.sessionUid(), command.envelope(), command.originEntryType()).orElse(null);
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
