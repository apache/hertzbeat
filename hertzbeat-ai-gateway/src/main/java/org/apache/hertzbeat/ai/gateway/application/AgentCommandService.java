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
import java.util.concurrent.atomic.AtomicReference;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.ErrorPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.GatewayEventType;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.RunStatusPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewayStreamResponse;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.Meta;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunSnapshot;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunSnapshotService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunStatus;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvent;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvent.EventStatus;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEventType;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeItemKind;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeRequest;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeService;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
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

    private final AgentRunAdmissionService admissionService;
    private final AgentRunService runService;
    private final AgentRunSnapshotService snapshotService;
    private final AgentRuntimeService runtimeService;
    private final GatewayRuntimeEventProjector runtimeEventProjector;

    public AgentCommandService(AgentRunAdmissionService admissionService, AgentRunService runService,
                               AgentRunSnapshotService snapshotService,
                               AgentRuntimeService runtimeService,
                               GatewayRuntimeEventProjector runtimeEventProjector) {
        this.admissionService = admissionService;
        this.runService = runService;
        this.snapshotService = snapshotService;
        this.runtimeService = runtimeService;
        this.runtimeEventProjector = runtimeEventProjector;
    }

    public GatewayResponse handle(InvokeCommand command) {
        return invoke(command, command.userInput());
    }

    GatewaySingleResponse invokeFinal(GatewayCommand command, UserInput userInput) {
        AgentRunAdmission admission = admit(command);
        if (admission.decision() != AgentRunAdmission.Decision.EXECUTE_NEW) {
            return replayFinal(command, userInput, admission);
        }
        AgentRuntimeRequest request = runtimeRequest((InvokeCommand) command, admission);
        String conversationId = userInput.getConversationId();
        AtomicReference<String> reliableFinalResult = new AtomicReference<>();
        List<GatewayEvent> events = gatewayEvents(command, request, conversationId, reliableFinalResult)
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
                .body(body(finalMessage(terminalEvent, reliableFinalResult.get()), terminalStatus(terminalEvent)))
                .events(events)
                .build();
    }

    GatewayStreamResponse invokeStream(GatewayCommand command, UserInput userInput) {
        AgentRunAdmission admission = admit(command);
        if (admission.decision() != AgentRunAdmission.Decision.EXECUTE_NEW) {
            return replayStream(command, userInput, admission);
        }
        AgentRuntimeRequest request = runtimeRequest((InvokeCommand) command, admission);
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
                .events(gatewayEvents(command, request, conversationId, new AtomicReference<>()))
                .build();
    }

    AgentRuntimeRequest prepare(GatewayCommand command, UserInput userInput) {
        AgentRunAdmission admission = admit(command);
        if (admission.decision() != AgentRunAdmission.Decision.EXECUTE_NEW) {
            throw new IllegalStateException("Agent run admission did not authorize execution");
        }
        return runtimeRequest((InvokeCommand) command, admission);
    }

    private AgentRuntimeRequest runtimeRequest(InvokeCommand command, AgentRunAdmission admission) {
        return AgentRuntimeRequest.builder()
                .entryType(command.entryType())
                .approvalHandling(admission.approvalHandling())
                .envelope(command.envelope())
                .userInput(command.userInput())
                .session(admission.session())
                .run(admission.run())
                .chatHistory(admission.chatHistory())
                .build();
    }

    private AgentRunAdmission admit(GatewayCommand command) {
        AgentRunAdmission admission = admissionService.admit((InvokeCommand) command);
        if (admission.decision() == AgentRunAdmission.Decision.REJECT_MISMATCH) {
            throw new IllegalArgumentException("Agent message identity conflicts with the durable run");
        }
        return admission;
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
                                             String conversationId, AtomicReference<String> reliableFinalResult) {
        AtomicBoolean completed = new AtomicBoolean();
        AssistantCompletionTracker assistantCompletion = new AssistantCompletionTracker();
        AgentGatewayLifecycleRelay relay = new AgentGatewayLifecycleRelay(request.getRun().getRunUid());
        Flux<GatewayEvent> lifecycle = Flux.defer(() -> runtimeService.streamInvoke(request))
                .map(event -> {
                    GatewayEvent gatewayEvent = runtimeEventProjector.project(event, conversationId,
                            request.getSession().getSessionUid(), request.getRun().getRunUid());
                    assistantCompletion.observe(event);
                    try {
                        completeInvocationOnTerminalEvent(request.getRun(), event, completed,
                                assistantCompletion, reliableFinalResult);
                    } catch (Error error) {
                        if (isFatalJvmError(error)) {
                            completed.set(true);
                            relay.fail(error);
                        }
                        throw error;
                    }
                    return gatewayEvent;
                })
                .onErrorResume(exception -> {
                    if (exception instanceof Error error && isFatalJvmError(error)) {
                        completed.set(true);
                        return Flux.error(error);
                    }
                    if (exception instanceof RecoveryRequiredPersistenceException recoveryFailure) {
                        return Flux.just(recoveryRequiredErrorEvent(
                                command, request, conversationId, recoveryFailure.operatorMessage()));
                    }
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
        return relay.connect(lifecycle);
    }

    private void completeInvocationOnTerminalEvent(AgentRun run, AgentRuntimeEvent event,
                                                   AtomicBoolean completed, AssistantCompletionTracker assistantCompletion,
                                                   AtomicReference<String> reliableFinalResult) {
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
        String terminalMessage = StringUtils.hasText(event.getErrorMessage())
                ? event.getErrorMessage()
                : "Agent Gateway runtime failed.";
        try {
            if (event.getType() == AgentRuntimeEventType.RUN_COMPLETED) {
                if (!assistantCompletion.latestAssistantCompleted()) {
                    throw new IllegalStateException("Agent runtime completed without an assistant message completion");
                }
                if (!StringUtils.hasText(event.getResult())) {
                    throw new IllegalStateException("Agent runtime completed without a durable result");
                }
                AgentRun succeededRun = runService.markSucceeded(run, event.getResult());
                if (succeededRun == null || !StringUtils.hasText(succeededRun.getResultSummary())) {
                    throw new IllegalStateException("Succeeded agent run must expose its persisted result");
                }
                reliableFinalResult.compareAndSet(null, succeededRun.getResultSummary());
                return;
            }
            if (event.getStatus() == EventStatus.RECOVERY_REQUIRED) {
                runService.markRecoveryRequired(run, terminalMessage);
            } else {
                runService.markFailed(run, terminalMessage);
            }
        } catch (RuntimeException exception) {
            if (event.getStatus() == EventStatus.RECOVERY_REQUIRED) {
                throw new RecoveryRequiredPersistenceException(terminalMessage, exception);
            }
            completed.set(false);
            throw exception;
        } catch (Error error) {
            if (event.getStatus() == EventStatus.RECOVERY_REQUIRED && !isFatalJvmError(error)) {
                throw new RecoveryRequiredPersistenceException(terminalMessage, error);
            }
            completed.set(false);
            throw error;
        }
    }

    private boolean isFatalJvmError(Error error) {
        return error instanceof VirtualMachineError
                || error instanceof ThreadDeath
                || error instanceof LinkageError;
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

    private String finalMessage(GatewayEvent terminalEvent, String reliableFinalResult) {
        if (terminalEvent.type() == GatewayEventType.ERROR) {
            if (terminalEvent.payload() instanceof ErrorPayload payload
                    && StringUtils.hasText(payload.errorMessage())) {
                return payload.errorMessage();
            }
            return "Agent Gateway runtime failed.";
        }
        if (!StringUtils.hasText(reliableFinalResult)) {
            throw new IllegalStateException("Completed agent run must expose its reliable final result");
        }
        return reliableFinalResult;
    }

    private String terminalStatus(GatewayEvent terminalEvent) {
        if (terminalEvent.type() != GatewayEventType.ERROR) {
            return AgentRunStatus.SUCCEEDED.name();
        }
        if (terminalEvent.payload() instanceof ErrorPayload payload
                && EventStatus.RECOVERY_REQUIRED.externalName().equals(payload.status())) {
            return AgentRunStatus.RECOVERY_REQUIRED.name();
        }
        return AgentRunStatus.FAILED.name();
    }

    private boolean isTerminal(GatewayEvent event) {
        return event.type() == GatewayEventType.RUN_COMPLETED
                || event.type() == GatewayEventType.RUN_STATUS
                || event.type() == GatewayEventType.ERROR;
    }

    private GatewayStreamResponse replayStream(GatewayCommand command, UserInput userInput,
                                               AgentRunAdmission admission) {
        AgentRunSnapshot snapshot = snapshotService.snapshot(admission.session(), admission.run());
        boolean terminal = admission.decision() == AgentRunAdmission.Decision.REPLAY_TERMINAL;
        return GatewayStreamResponse.builder()
                .meta(replayMeta(command, userInput, snapshot, terminal))
                .events(Flux.just(runStatusEvent(command, userInput, snapshot)))
                .build();
    }

    private GatewaySingleResponse replayFinal(GatewayCommand command, UserInput userInput,
                                              AgentRunAdmission admission) {
        AgentRunSnapshot snapshot = snapshotService.snapshot(admission.session(), admission.run());
        boolean terminal = admission.decision() == AgentRunAdmission.Decision.REPLAY_TERMINAL;
        GatewayEvent event = runStatusEvent(command, userInput, snapshot);
        String message = StringUtils.hasText(snapshot.result()) ? snapshot.result() : snapshot.errorMessage();
        return GatewaySingleResponse.builder()
                .meta(replayMeta(command, userInput, snapshot, terminal))
                .body(body(message, snapshot.status()))
                .events(List.of(event))
                .build();
    }

    private Meta replayMeta(GatewayCommand command, UserInput userInput, AgentRunSnapshot snapshot,
                            boolean terminal) {
        return Meta.builder()
                .commandId(command.commandId())
                .conversationId(userInput.getConversationId())
                .sessionUid(snapshot.sessionUid())
                .runUid(snapshot.runUid())
                .terminal(terminal)
                .message(terminal ? "replayed" : "running")
                .build();
    }

    private GatewayEvent runStatusEvent(GatewayCommand command, UserInput userInput, AgentRunSnapshot snapshot) {
        return GatewayEvent.builder()
                .type(GatewayEventType.RUN_STATUS)
                .eventId(snapshot.runUid() + ":status:" + snapshot.status().toLowerCase(java.util.Locale.ROOT))
                .conversationId(userInput.getConversationId())
                .sessionUid(snapshot.sessionUid())
                .runUid(snapshot.runUid())
                .payload(RunStatusPayload.builder()
                        .status(snapshot.status())
                        .result(snapshot.result())
                        .errorMessage(snapshot.errorMessage())
                        .replayAvailable(snapshot.replayAvailable())
                        .build())
                .timestamp(System.currentTimeMillis())
                .build();
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

    private GatewayEvent recoveryRequiredErrorEvent(GatewayCommand command, AgentRuntimeRequest request,
                                                    String conversationId, String message) {
        return GatewayEvent.builder()
                .type(GatewayEventType.ERROR)
                .eventId(command.commandId() + ":recovery-required")
                .conversationId(conversationId)
                .sessionUid(request.getSession().getSessionUid())
                .runUid(request.getRun().getRunUid())
                .payload(ErrorPayload.builder()
                        .errorMessage(message)
                        .status(EventStatus.RECOVERY_REQUIRED.externalName())
                        .build())
                .timestamp(System.currentTimeMillis())
                .build();
    }

    private static final class RecoveryRequiredPersistenceException extends RuntimeException {

        private final String operatorMessage;

        private RecoveryRequiredPersistenceException(String operatorMessage, Throwable cause) {
            super("Agent recovery-required state could not be persisted", cause);
            this.operatorMessage = operatorMessage;
        }

        private String operatorMessage() {
            return operatorMessage;
        }
    }

    private static final class AssistantCompletionTracker {

        private String latestAssistantItemId;
        private String completedAssistantItemId;

        private void observe(AgentRuntimeEvent event) {
            if (event.getItemKind() == AgentRuntimeItemKind.TOOL_CALL) {
                invalidate();
                return;
            }
            if (event.getItemKind() != AgentRuntimeItemKind.ASSISTANT_MESSAGE) {
                return;
            }
            if (event.getType() == AgentRuntimeEventType.ITEM_STARTED) {
                latestAssistantItemId = event.getItemId();
                completedAssistantItemId = null;
            } else if (event.getType() == AgentRuntimeEventType.ITEM_DELTA
                    && !Objects.equals(latestAssistantItemId, event.getItemId())) {
                invalidate();
            } else if (event.getType() == AgentRuntimeEventType.ITEM_COMPLETED) {
                completedAssistantItemId = Objects.equals(latestAssistantItemId, event.getItemId())
                        ? event.getItemId()
                        : null;
            }
        }

        private void invalidate() {
            latestAssistantItemId = null;
            completedAssistantItemId = null;
        }

        private boolean latestAssistantCompleted() {
            return StringUtils.hasText(latestAssistantItemId)
                    && Objects.equals(latestAssistantItemId, completedAssistantItemId);
        }
    }

    private Map<String, Object> body(String message, String status) {
        return Map.of("message", StringUtils.hasText(message) ? message : "",
                "status", StringUtils.hasText(status) ? status : "");
    }

}
