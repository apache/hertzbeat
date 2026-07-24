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
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.ErrorPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.GatewayEventType;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.MessageDeltaPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewayStreamResponse;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.Meta;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunStatus;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvent;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEventType;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeRequest;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeService;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Flux;
import reactor.core.publisher.SignalType;

/**
 * Agent command execution service. Only agent-message commands enter runtime.
 */
@Slf4j
@Service
public class AgentCommandService {

    private final AgentSessionService sessionService;
    private final AgentRunService runService;
    private final AgentRuntimeService runtimeService;
    private final AgentTranscriptRecorder transcriptRecorder;
    private final GatewayRuntimeEventProjector runtimeEventProjector;

    public AgentCommandService(AgentSessionService sessionService, AgentRunService runService,
                               AgentRuntimeService runtimeService,
                               AgentTranscriptRecorder transcriptRecorder,
                               GatewayRuntimeEventProjector runtimeEventProjector) {
        this.sessionService = sessionService;
        this.runService = runService;
        this.runtimeService = runtimeService;
        this.transcriptRecorder = transcriptRecorder;
        this.runtimeEventProjector = runtimeEventProjector;
    }

    public GatewayResponse handle(InvokeCommand command) {
        return invoke(command, command.userInput());
    }

    GatewaySingleResponse invokeFinal(GatewayCommand command, UserInput userInput) {
        AgentRuntimeRequest request = prepare(command, userInput);
        String conversationId = userInput.getConversationId();
        List<GatewayEvent> events = gatewayEvents(command, request, conversationId)
                .collectList()
                .block();
        GatewayEvent terminalEvent = terminalEvent(events);
        boolean failed = terminalEvent.type() == GatewayEventType.ERROR;
        return GatewaySingleResponse.builder()
                .meta(Meta.builder()
                        .commandId(command.commandId())
                        .conversationId(conversationId)
                        .sessionUid(request.getSession().getSessionUid())
                        .runUid(request.getRun().getRunUid())
                        .terminal(true)
                        .message(failed ? "error" : "completed")
                        .build())
                .body(body(finalMessage(events, terminalEvent), failed
                        ? AgentRunStatus.FAILED.name() : AgentRunStatus.SUCCEEDED.name()))
                .events(events)
                .build();
    }

    GatewayStreamResponse invokeStream(GatewayCommand command, UserInput userInput) {
        AgentRuntimeRequest request = prepare(command, userInput);
        String conversationId = userInput.getConversationId();
        return GatewayStreamResponse.builder()
                .meta(Meta.builder()
                        .commandId(command.commandId())
                        .conversationId(conversationId)
                        .sessionUid(request.getSession().getSessionUid())
                        .runUid(request.getRun().getRunUid())
                        .terminal(false)
                        .message("streaming")
                        .build())
                .events(gatewayEvents(command, request, conversationId))
                .build();
    }

    AgentRuntimeRequest prepare(GatewayCommand command, UserInput userInput) {
        GatewayEnvelope envelope = command.envelope();
        AgentSession session = sessionService.findOrCreateSession(envelope, userInput);
        AgentRun run = runService.createOrResumeRun(session, userInput);
        List<TranscriptMessage> chatHistory = transcriptRecorder.chatHistory(session.getId());
        transcriptRecorder.recordUserTranscriptEntry(session, run, userInput);
        AgentRun runningRun = runService.markRunning(run);
        return AgentRuntimeRequest.builder()
                .entryType(((InvokeCommand) command).entryType())
                .approvalHandling(command.replyMode() == ReplyMode.STREAM
                        ? AgentApprovalHandling.WAIT_FOR_DECISION
                        : AgentApprovalHandling.DENY)
                .envelope(envelope)
                .userInput(userInput)
                .session(session)
                .run(runningRun)
                .chatHistory(chatHistory)
                .build();
    }

    /**
     * Shared runtime entry after channel-specific commands have been normalized to UserInput while preserving
     * command metadata and runtime entry type for response IDs and tool exposure.
     */
    private GatewayResponse invoke(GatewayCommand command, UserInput userInput) {
        if (command.replyMode() == ReplyMode.STREAM) {
            return invokeStream(command, userInput);
        }
        return invokeFinal(command, userInput);
    }

    private Flux<GatewayEvent> gatewayEvents(GatewayCommand command, AgentRuntimeRequest request,
                                             String conversationId) {
        AtomicBoolean completed = new AtomicBoolean();
        return Flux.defer(() -> runtimeService.streamInvoke(request))
                .map(event -> {
                    GatewayEvent gatewayEvent = runtimeEventProjector.project(event, conversationId,
                            request.getSession().getSessionUid(), request.getRun().getRunUid());
                    completeInvocationOnTerminalEvent(request.getRun(), event, completed);
                    return gatewayEvent;
                })
                .onErrorResume(exception -> {
                    log.debug("Agent Gateway runtime failed for run {}", request.getRun().getRunUid(), exception);
                    failInvocationIfIncomplete(request.getRun(), completed, "Agent Gateway runtime failed.");
                    return Flux.just(errorEvent(command, request, conversationId,
                            "Agent Gateway runtime failed."));
                })
                .concatWith(Flux.defer(() -> {
                    if (completed.get()) {
                        return Flux.empty();
                    }
                    String message = "Agent Gateway runtime stream completed without a terminal event.";
                    failInvocationIfIncomplete(request.getRun(), completed, message);
                    return Flux.just(errorEvent(command, request, conversationId, message));
                }))
                .doFinally(signalType -> completeInvocationIfStreamFinishedWithoutTerminal(request.getRun(),
                        signalType, completed));
    }

    private void completeInvocationOnTerminalEvent(AgentRun run, AgentRuntimeEvent event,
                                                   AtomicBoolean completed) {
        if (completed.get()) {
            return;
        }
        if (event.getType() != AgentRuntimeEventType.RUN_COMPLETED
                && event.getType() != AgentRuntimeEventType.ERROR) {
            return;
        }
        if (!completed.compareAndSet(false, true)) {
            return;
        }
        try {
            if (event.getType() == AgentRuntimeEventType.RUN_COMPLETED) {
                runService.markSucceeded(run, "Runtime completed.");
                return;
            }
            runService.markFailed(run, StringUtils.hasText(event.getErrorMessage())
                    ? event.getErrorMessage()
                    : "Agent Gateway runtime failed.");
        } catch (RuntimeException exception) {
            completed.set(false);
            throw exception;
        }
    }

    private void failInvocationIfIncomplete(AgentRun run, AtomicBoolean completed, String message) {
        if (!completed.compareAndSet(false, true)) {
            return;
        }
        try {
            runService.markFailed(run, message);
        } catch (RuntimeException exception) {
            completed.set(false);
            throw exception;
        }
    }

    private void completeInvocationIfStreamFinishedWithoutTerminal(AgentRun run, SignalType signalType,
                                                                   AtomicBoolean completed) {
        if (!completed.compareAndSet(false, true)) {
            return;
        }
        if (signalType == SignalType.CANCEL) {
            runService.markCancelled(run, "Runtime stream client disconnected.");
            return;
        }
        if (signalType == SignalType.ON_ERROR) {
            runService.markFailed(run, "Agent Gateway runtime failed.");
            return;
        }
        runService.markFailed(run, "Agent Gateway runtime stream completed without a terminal event.");
    }

    private GatewayEvent terminalEvent(List<GatewayEvent> events) {
        for (int index = events.size() - 1; index >= 0; index--) {
            GatewayEvent event = events.get(index);
            if (isTerminal(event)) {
                return event;
            }
        }
        throw new IllegalStateException("Mapped runtime events must contain a terminal event");
    }

    private String finalMessage(List<GatewayEvent> events, GatewayEvent terminalEvent) {
        if (terminalEvent.type() == GatewayEventType.ERROR) {
            if (terminalEvent.payload() instanceof ErrorPayload payload
                    && StringUtils.hasText(payload.errorMessage())) {
                return payload.errorMessage();
            }
            return "Agent Gateway runtime failed.";
        }
        String itemId = lastCompletedAssistantItemId(events);
        if (!StringUtils.hasText(itemId)) {
            return "Runtime completed.";
        }
        StringBuilder text = new StringBuilder();
        for (GatewayEvent event : events) {
            if (event.type() == GatewayEventType.MESSAGE_DELTA
                    && Objects.equals(itemId, event.itemId())
                    && event.payload() instanceof MessageDeltaPayload payload
                    && payload.delta() != null) {
                text.append(payload.delta());
            }
        }
        return text.length() == 0 ? "Runtime completed." : text.toString();
    }

    private String lastCompletedAssistantItemId(List<GatewayEvent> events) {
        String itemId = null;
        for (GatewayEvent event : events) {
            if (event.type() == GatewayEventType.MESSAGE_COMPLETED) {
                itemId = event.itemId();
            }
        }
        return itemId;
    }

    private boolean isTerminal(GatewayEvent event) {
        return event.type() == GatewayEventType.RUN_COMPLETED
                || event.type() == GatewayEventType.ERROR;
    }

    private GatewayEvent errorEvent(GatewayCommand command, AgentRuntimeRequest request, String conversationId,
                                    String message) {
        return GatewayEvent.builder()
                .type(GatewayEventType.ERROR)
                .eventId(command.commandId() + ":error")
                .conversationId(conversationId)
                .sessionUid(request.getSession().getSessionUid())
                .runUid(request.getRun().getRunUid())
                .payload(ErrorPayload.builder()
                        .errorMessage(message)
                        .build())
                .timestamp(System.currentTimeMillis())
                .build();
    }

    private Map<String, Object> body(String message, String status) {
        return Map.of("message", StringUtils.hasText(message) ? message : "",
                "status", StringUtils.hasText(status) ? status : "");
    }

}
