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
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.CancelRunCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunStatus;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.ErrorPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.GatewayEventType;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.RunCompletedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.Meta;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewayStreamResponse;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeControlRegistry;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

/**
 * Run lifecycle commands. Cancellation never invokes runtime.
 */
@Service
public class RunCommandService {

    private final AgentRunService runService;
    private final AgentSessionService sessionService;
    private final AgentRuntimeControlRegistry controlRegistry;

    public RunCommandService(AgentRunService runService, AgentSessionService sessionService,
                             AgentRuntimeControlRegistry controlRegistry) {
        this.runService = runService;
        this.sessionService = sessionService;
        this.controlRegistry = controlRegistry;
    }

    public GatewayResponse cancel(CancelRunCommand command) {
        String runUid = requiredText(command.runUid(), "Agent run UID is required");
        String reason = GatewayText.isBlank(command.reason())
                ? "Runtime cancellation requested."
                : command.reason();
        Optional<AgentRun> runOptional = runService.findRun(runUid);
        if (runOptional.isEmpty()) {
            GatewayEvent error = errorEvent(command.commandId(), null, runUid, "Agent run not found.");
            return response(command, null, runUid, List.of(error));
        }
        AgentRun run = runOptional.get();
        AgentSession session = session(run);
        List<GatewayEvent> events;
        if (!ownedBy(command.envelope().getActor(), session)) {
            events = List.of(errorEvent(command.commandId(), null, runUid, "Agent run not found."));
        } else if (isTerminalRun(run)) {
            events = List.of(errorEvent(command.commandId(), session, runUid,
                    "Agent run is already stopped."));
        } else if (AgentRunStatus.RUNNING.name().equals(run.getStatus())) {
            boolean cancelled = controlRegistry.cancel(runUid, reason);
            events = cancelled ? List.of() : List.of(errorEvent(command.commandId(), session, runUid,
                    "Agent runtime run is not active or already stopped."));
        } else {
            AgentRun cancelledRun = runService.markCancelled(run, reason);
            events = List.of(runCompletedEvent(command.commandId(), session, cancelledRun,
                    "Agent run cancelled."));
        }
        return response(command, session, runUid, events);
    }

    private GatewayResponse response(CancelRunCommand command, AgentSession session, String runUid,
                                     List<GatewayEvent> events) {
        if (command.replyMode() == ReplyMode.STREAM) {
            return GatewayStreamResponse.builder()
                    .meta(Meta.builder()
                            .commandId(command.commandId())
                            .sessionUid(session == null ? null : session.getSessionUid())
                            .runUid(runUid)
                            .terminal(true)
                            .message("cancel")
                            .build())
                    .events(Flux.fromIterable(events))
                    .build();
        }
        return GatewaySingleResponse.builder()
                .meta(Meta.builder()
                        .commandId(command.commandId())
                        .sessionUid(session == null ? null : session.getSessionUid())
                        .runUid(runUid)
                        .terminal(true)
                        .message("cancel")
                        .build())
                .body(Map.of("runUid", runUid))
                .events(events)
                .build();
    }

    private GatewayEvent runCompletedEvent(String commandId, AgentSession session, AgentRun run, String message) {
        return GatewayEvent.builder()
                .type(GatewayEventType.RUN_COMPLETED)
                .eventId(commandId + ":run-completed")
                .sessionUid(session == null ? null : session.getSessionUid())
                .runUid(run == null ? null : run.getRunUid())
                .payload(RunCompletedPayload.builder().build())
                .timestamp(System.currentTimeMillis())
                .build();
    }

    private GatewayEvent errorEvent(String commandId, AgentSession session, String runUid, String message) {
        return GatewayEvent.builder()
                .type(GatewayEventType.ERROR)
                .eventId(commandId + ":error")
                .sessionUid(session == null ? null : session.getSessionUid())
                .runUid(runUid)
                .payload(ErrorPayload.builder()
                        .errorMessage(message)
                        .build())
                .timestamp(System.currentTimeMillis())
                .build();
    }

    private AgentSession session(AgentRun run) {
        if (run == null || run.getSessionId() == null) {
            return null;
        }
        return sessionService.findSession(String.valueOf(run.getSessionId())).orElse(null);
    }

    private boolean isTerminalRun(AgentRun run) {
        String status = run == null ? null : run.getStatus();
        return AgentRunStatus.SUCCEEDED.name().equals(status)
                || AgentRunStatus.FAILED.name().equals(status)
                || AgentRunStatus.CANCELLED.name().equals(status);
    }

    private boolean ownedBy(AgentActor actor, AgentSession session) {
        return actor != null && session != null
                && actor.getType().equals(session.getActorType())
                && actor.getId().equals(session.getActorId());
    }

    private String requiredText(String value, String message) {
        // Command identifiers originate in channel requests and may contain surrounding whitespace before lookup.
        String normalized = GatewayText.normalize(value);
        if (normalized == null) {
            throw new IllegalArgumentException(message);
        }
        return normalized;
    }

}
