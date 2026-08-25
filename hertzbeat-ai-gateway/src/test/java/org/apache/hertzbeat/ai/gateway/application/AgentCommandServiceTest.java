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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewayStreamResponse;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunStatus;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunSnapshot;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunSnapshotService;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvent;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeRequest;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeService;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Flux;
import reactor.core.publisher.BaseSubscriber;
import reactor.util.concurrent.Queues;
import reactor.core.scheduler.Schedulers;

@ExtendWith(MockitoExtension.class)
class AgentCommandServiceTest {
    @Mock
    private AgentRunAdmissionService admissionService;

    @Mock
    private AgentRunService runService;

    @Mock
    private AgentRuntimeService runtimeService;

    @Mock
    private AgentRunSnapshotService snapshotService;

    private final GatewayRuntimeEventProjector runtimeEventProjector = new GatewayRuntimeEventProjector();

    private AgentSession session;
    private AgentRun run;

    @BeforeEach
    void setUp() {
        session = AgentSession.builder().id(1L).sessionUid("session-1").build();
        run = AgentRun.builder().id(2L).runUid("run-1").sessionId(1L).build();
        lenient().when(admissionService.admit(any())).thenAnswer(invocation -> {
            InvokeCommand command = invocation.getArgument(0);
            return new AgentRunAdmission(
                    AgentRunAdmission.Decision.EXECUTE_NEW,
                    session,
                    run,
                    command.replyMode() == ReplyMode.STREAM
                            ? AgentApprovalHandling.WAIT_FOR_DECISION
                            : AgentApprovalHandling.DENY,
                    List.of());
        });
    }

    @Test
    void finalOnlyCommandShouldDenyExternalApprovalWaits() {
        InvokeCommand command = command(ReplyMode.FINAL_ONLY);
        AgentRuntimeRequest request = service().prepare(command, command.userInput());

        assertEquals(AgentApprovalHandling.DENY, request.getApprovalHandling());
    }

    @Test
    void streamCommandShouldWaitForExternalApprovalDecision() {
        InvokeCommand command = command(ReplyMode.STREAM);
        AgentRuntimeRequest request = service().prepare(command, command.userInput());

        assertEquals(AgentApprovalHandling.WAIT_FOR_DECISION, request.getApprovalHandling());
    }

    @Test
    void finalOnlyShouldCollectTheSameMappedEventsAsStream() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        List<AgentRuntimeEvent> runtimeEvents = List.of(
                AgentRuntimeEvent.runStarted("trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageStarted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageDelta("assistant-1", "trace-1", 0, "Hello ", timestamp),
                AgentRuntimeEvent.assistantMessageDelta("assistant-1", "trace-1", 1, "world", timestamp),
                AgentRuntimeEvent.assistantMessageCompleted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.runCompleted("trace-1", timestamp, "Hello world"));
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class)))
                .thenReturn(Flux.fromIterable(runtimeEvents));
        when(runService.markSucceeded(any(), any())).thenAnswer(invocation -> {
            AgentRun completedRun = invocation.getArgument(0);
            completedRun.setStatus(AgentRunStatus.SUCCEEDED.name());
            completedRun.setResultSummary(invocation.getArgument(1));
            return completedRun;
        });

        InvokeCommand finalCommand = command(ReplyMode.FINAL_ONLY);
        GatewaySingleResponse finalResponse = service().invokeFinal(finalCommand, finalCommand.userInput());
        InvokeCommand streamCommand = command(ReplyMode.STREAM);
        GatewayStreamResponse streamResponse = service().invokeStream(streamCommand, streamCommand.userInput());
        List<GatewayEvent> streamedEvents = streamResponse.events().collectList().block();

        assertEquals(streamedEvents, finalResponse.events());
        assertEquals("completed", finalResponse.meta().message());
        assertEquals(Map.of("message", "Hello world", "status", AgentRunStatus.SUCCEEDED.name()),
                finalResponse.body());
    }

    @Test
    void finalOnlyShouldMapMissingTerminalEventToTheSharedErrorContract() {
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class)))
                .thenReturn(Flux.just(
                        AgentRuntimeEvent.runStarted("trace-1", Instant.parse("2026-07-16T00:00:00Z"))));
        when(runService.markFailed(any(), any())).thenAnswer(invocation -> {
            AgentRun failedRun = invocation.getArgument(0);
            failedRun.setStatus(AgentRunStatus.FAILED.name());
            return failedRun;
        });

        InvokeCommand command = command(ReplyMode.FINAL_ONLY);
        GatewaySingleResponse response = service().invokeFinal(command, command.userInput());

        assertEquals(List.of(GatewayEvent.GatewayEventType.RUN_STARTED, GatewayEvent.GatewayEventType.ERROR),
                response.events().stream().map(GatewayEvent::type).toList());
        assertEquals("error", response.meta().message());
        assertEquals(Map.of(
                "message", "Agent Gateway runtime stream completed without a terminal event.",
                "status", AgentRunStatus.FAILED.name()), response.body());
    }

    @Test
    void modelNoResponseShouldPersistFailedBeforePublishingTheTerminalError() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class)))
                .thenReturn(Flux.just(
                        AgentRuntimeEvent.runStarted("trace-1", timestamp),
                        AgentRuntimeEvent.runError("trace-1", "Runtime model returned no response.", timestamp)));
        when(runService.markFailed(any(), any())).thenAnswer(invocation -> {
            AgentRun failedRun = invocation.getArgument(0);
            failedRun.setStatus(AgentRunStatus.FAILED.name());
            failedRun.setErrorMessage(invocation.getArgument(1));
            return failedRun;
        });

        InvokeCommand command = command(ReplyMode.STREAM);
        List<GatewayEvent> events = service().invokeStream(command, command.userInput())
                .events().collectList().block();

        assertEquals(List.of(GatewayEvent.GatewayEventType.RUN_STARTED, GatewayEvent.GatewayEventType.ERROR),
                events.stream().map(GatewayEvent::type).toList());
        assertEquals(AgentRunStatus.FAILED.name(), run.getStatus());
        assertEquals("Runtime model returned no response.", run.getErrorMessage());
        verify(runService).markFailed(run, "Runtime model returned no response.");
    }

    @Test
    void genericRuntimeErrorShouldPersistCauseFreeFailedState() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class)))
                .thenReturn(Flux.just(AgentRuntimeEvent.runError(
                        "trace-1", "Agent Gateway runtime failed.", timestamp)));
        when(runService.markFailed(any(), any())).thenAnswer(invocation -> {
            AgentRun failedRun = invocation.getArgument(0);
            failedRun.setStatus(AgentRunStatus.FAILED.name());
            failedRun.setErrorMessage(invocation.getArgument(1));
            return failedRun;
        });

        InvokeCommand command = command(ReplyMode.STREAM);
        service().invokeStream(command, command.userInput()).events().collectList().block();

        assertEquals(AgentRunStatus.FAILED.name(), run.getStatus());
        assertEquals("Agent Gateway runtime failed.", run.getErrorMessage());
        verify(runService).markFailed(run, "Agent Gateway runtime failed.");
    }

    @Test
    void indeterminateToolCompletionShouldPersistRecoveryRequiredAndNeverMarkFailed() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        String message = "Agent tool completed but its durable outcome is indeterminate.";
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class)))
                .thenReturn(Flux.just(AgentRuntimeEvent.runRecoveryRequired("trace-1", message, timestamp)));
        when(runService.markRecoveryRequired(any(), any())).thenAnswer(invocation -> {
            AgentRun recoveryRun = invocation.getArgument(0);
            recoveryRun.setStatus(AgentRunStatus.RECOVERY_REQUIRED.name());
            recoveryRun.setErrorMessage(invocation.getArgument(1));
            return recoveryRun;
        });

        InvokeCommand command = command(ReplyMode.FINAL_ONLY);
        GatewaySingleResponse response = service().invokeFinal(command, command.userInput());

        assertEquals(AgentRunStatus.RECOVERY_REQUIRED.name(), run.getStatus());
        assertEquals(Map.of("message", message, "status", AgentRunStatus.RECOVERY_REQUIRED.name()),
                response.body());
        verify(runService).markRecoveryRequired(run, message);
        verify(runService, never()).markFailed(any(), any());
    }

    @Test
    void recoveryRequiredPersistenceFailureShouldNeverDowngradeToFailed() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        String message = "Agent tool completed but its durable outcome is indeterminate.";
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class)))
                .thenReturn(Flux.just(AgentRuntimeEvent.runRecoveryRequired("trace-1", message, timestamp)));
        org.mockito.Mockito.doThrow(new IllegalStateException("recovery persistence unavailable"))
                .when(runService).markRecoveryRequired(run, message);

        InvokeCommand command = command(ReplyMode.FINAL_ONLY);
        GatewaySingleResponse response = service().invokeFinal(command, command.userInput());

        assertEquals(Map.of("message", message, "status", AgentRunStatus.RECOVERY_REQUIRED.name()),
                response.body());
        verify(runService).markRecoveryRequired(run, message);
        verify(runService, never()).markFailed(any(), any());
    }

    @Test
    void recoveryRequiredPersistenceErrorShouldStayCauseFreeWhileFatalErrorsEscape() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        String message = "Agent tool completed but its durable outcome is indeterminate.";
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class)))
                .thenReturn(Flux.just(AgentRuntimeEvent.runRecoveryRequired("trace-1", message, timestamp)));
        org.mockito.Mockito.doThrow(new AssertionError("provider detail must stay private"))
                .when(runService).markRecoveryRequired(run, message);

        InvokeCommand command = command(ReplyMode.FINAL_ONLY);
        GatewaySingleResponse response = service().invokeFinal(command, command.userInput());

        assertEquals(Map.of("message", message, "status", AgentRunStatus.RECOVERY_REQUIRED.name()),
                response.body());
        verify(runService, never()).markFailed(any(), any());

        org.mockito.Mockito.reset(runService);
        org.mockito.Mockito.doThrow(new LinkageError("fatal linkage failure"))
                .when(runService).markRecoveryRequired(run, message);
        assertThrows(LinkageError.class, () -> service().invokeFinal(command, command.userInput()));
        verify(runService, never()).markFailed(any(), any());
    }

    @Test
    void disconnectedClientMustNotBackpressureDurableTerminalConvergence() throws InterruptedException {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        String message = "Agent tool completed but its durable outcome is indeterminate.";
        AtomicInteger runtimeSubscriptions = new AtomicInteger();
        CountDownLatch firstEventReceived = new CountDownLatch(1);
        CountDownLatch terminalPersisted = new CountDownLatch(1);
        Flux<AgentRuntimeEvent> runtimeEvents = Flux.defer(() -> {
            runtimeSubscriptions.incrementAndGet();
            Flux<AgentRuntimeEvent> bufferedEvents = Flux.range(0, Queues.SMALL_BUFFER_SIZE + 32)
                    .map(index -> AgentRuntimeEvent.assistantMessageDelta(
                            "assistant-1", "trace-1", index, "token", timestamp));
            return Flux.concat(
                    Flux.just(AgentRuntimeEvent.runStarted("trace-1", timestamp)),
                    bufferedEvents,
                    Flux.just(AgentRuntimeEvent.runRecoveryRequired("trace-1", message, timestamp)));
        }).subscribeOn(Schedulers.boundedElastic());
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class))).thenReturn(runtimeEvents);
        when(runService.markRecoveryRequired(run, message)).thenAnswer(invocation -> {
            run.setStatus(AgentRunStatus.RECOVERY_REQUIRED.name());
            terminalPersisted.countDown();
            return run;
        });

        InvokeCommand command = command(ReplyMode.STREAM);
        Flux<GatewayEvent> events = service().invokeStream(command, command.userInput()).events();
        events.subscribe(new BaseSubscriber<>() {
            @Override
            protected void hookOnNext(GatewayEvent value) {
                firstEventReceived.countDown();
                cancel();
            }
        });

        assertTrue(firstEventReceived.await(2, TimeUnit.SECONDS));
        assertTrue(terminalPersisted.await(2, TimeUnit.SECONDS));
        assertEquals(AgentRunStatus.RECOVERY_REQUIRED.name(), run.getStatus());
        List<GatewayEvent> lateEvents = events.collectList().block(Duration.ofSeconds(2));
        assertEquals(List.of(GatewayEvent.GatewayEventType.ERROR),
                lateEvents.stream().map(GatewayEvent::type).toList());
        assertEquals(1, runtimeSubscriptions.get());
        verify(runService, never()).markCancelled(any(), any());
        verify(runService, never()).markFailed(any(), any());
    }

    @Test
    void downstreamCancellationAfterSideEffectShouldNotHideRecoveryRequired() throws InterruptedException {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        String message = "Agent tool completed but its durable outcome is indeterminate.";
        CountDownLatch sideEffectOccurred = new CountDownLatch(1);
        CountDownLatch releaseCompletionFailure = new CountDownLatch(1);
        CountDownLatch recoveryPersisted = new CountDownLatch(1);
        Flux<AgentRuntimeEvent> runtimeEvents = Flux.<AgentRuntimeEvent>create(sink -> {
            sideEffectOccurred.countDown();
            try {
                if (!releaseCompletionFailure.await(2, TimeUnit.SECONDS)) {
                    sink.error(new IllegalStateException("completion failure was not released"));
                    return;
                }
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                sink.error(exception);
                return;
            }
            sink.next(AgentRuntimeEvent.runRecoveryRequired("trace-1", message, timestamp));
            sink.complete();
        }).subscribeOn(Schedulers.boundedElastic());
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class))).thenReturn(runtimeEvents);
        when(runService.markRecoveryRequired(run, message)).thenAnswer(invocation -> {
            run.setStatus(AgentRunStatus.RECOVERY_REQUIRED.name());
            recoveryPersisted.countDown();
            return run;
        });

        InvokeCommand command = command(ReplyMode.STREAM);
        BaseSubscriber<GatewayEvent> downstream = new BaseSubscriber<>() { };
        service().invokeStream(command, command.userInput()).events().subscribe(downstream);
        assertTrue(sideEffectOccurred.await(2, TimeUnit.SECONDS));
        downstream.dispose();
        releaseCompletionFailure.countDown();

        assertTrue(recoveryPersisted.await(2, TimeUnit.SECONDS));
        assertEquals(AgentRunStatus.RECOVERY_REQUIRED.name(), run.getStatus());
        verify(runService, never()).markCancelled(any(), any());
        verify(runService, never()).markFailed(any(), any());
    }

    @Test
    void disconnectedClientMustNotHideSuccessfulTerminalAfterBufferPressure() throws InterruptedException {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        AtomicInteger runtimeSubscriptions = new AtomicInteger();
        CountDownLatch terminalPersisted = new CountDownLatch(1);
        Flux<AgentRuntimeEvent> runtimeEvents = Flux.defer(() -> {
            runtimeSubscriptions.incrementAndGet();
            return Flux.concat(
                    Flux.just(AgentRuntimeEvent.runStarted("trace-1", timestamp),
                            AgentRuntimeEvent.assistantMessageStarted("assistant-1", "trace-1", timestamp)),
                    Flux.range(0, Queues.SMALL_BUFFER_SIZE + 32).map(index ->
                            AgentRuntimeEvent.assistantMessageDelta(
                                    "assistant-1", "trace-1", index, "token", timestamp)),
                    Flux.just(AgentRuntimeEvent.assistantMessageCompleted("assistant-1", "trace-1", timestamp),
                            AgentRuntimeEvent.runCompleted("trace-1", timestamp, "final result")));
        }).subscribeOn(Schedulers.boundedElastic());
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class))).thenReturn(runtimeEvents);
        when(runService.markSucceeded(run, "final result")).thenAnswer(invocation -> {
            run.setStatus(AgentRunStatus.SUCCEEDED.name());
            run.setResultSummary(invocation.getArgument(1));
            terminalPersisted.countDown();
            return run;
        });

        Flux<GatewayEvent> events = service().invokeStream(command(ReplyMode.STREAM), userInput()).events();
        events.subscribe(new BaseSubscriber<>() {
            @Override
            protected void hookOnNext(GatewayEvent value) {
                cancel();
            }
        });

        assertTrue(terminalPersisted.await(2, TimeUnit.SECONDS));
        assertEquals(AgentRunStatus.SUCCEEDED.name(), run.getStatus());
        List<GatewayEvent> lateEvents = events.collectList().block(Duration.ofSeconds(2));
        assertEquals(List.of(GatewayEvent.GatewayEventType.RUN_COMPLETED),
                lateEvents.stream().map(GatewayEvent::type).toList());
        assertEquals(1, runtimeSubscriptions.get());
        verify(runService, never()).markCancelled(any(), any());
    }

    @Test
    void terminalReplayShouldNotAppendUserOrRestartRuntime() {
        run.setStatus(AgentRunStatus.SUCCEEDED.name());
        run.setResultSummary("Durable final answer");
        doReturn(new AgentRunAdmission(
                AgentRunAdmission.Decision.REPLAY_TERMINAL, session, run,
                AgentApprovalHandling.WAIT_FOR_DECISION, List.of()))
                .when(admissionService).admit(any());
        when(snapshotService.snapshot(session, run)).thenReturn(new AgentRunSnapshot(
                "run-1", "session-1", "message-1", AgentRunStatus.SUCCEEDED.name(),
                null, "Durable final answer", null, true, null, null, null));

        InvokeCommand command = command(ReplyMode.STREAM);
        service().invokeStream(command, command.userInput()).events().collectList().block();

        verify(runService, never()).markRunning(any());
        verify(runtimeService, never()).streamInvoke(any());
    }

    @Test
    void recoveryRequiredReplayShouldNotRestartRuntime() {
        run.setStatus(AgentRunStatus.RECOVERY_REQUIRED.name());
        run.setErrorMessage("Check the target state before continuing.");
        doReturn(new AgentRunAdmission(
                AgentRunAdmission.Decision.REPLAY_TERMINAL, session, run,
                AgentApprovalHandling.WAIT_FOR_DECISION, List.of()))
                .when(admissionService).admit(any());
        when(snapshotService.snapshot(session, run)).thenReturn(new AgentRunSnapshot(
                "run-1", "session-1", "message-1", AgentRunStatus.RECOVERY_REQUIRED.name(),
                null, null, "Check the target state before continuing.", true, null, null, null));

        InvokeCommand command = command(ReplyMode.STREAM);
        List<GatewayEvent> events = service().invokeStream(command, command.userInput())
                .events().collectList().block();

        assertEquals(AgentRunStatus.RECOVERY_REQUIRED.name(),
                ((GatewayEvent.RunStatusPayload) events.getFirst().payload()).status());
        verify(runtimeService, never()).streamInvoke(any());
        verify(runService, never()).markRunning(any());
    }

    @Test
    void activeReplayShouldExposeTheSameRunWithoutRestartingRuntime() {
        run.setStatus(AgentRunStatus.RUNNING.name());
        doReturn(new AgentRunAdmission(
                AgentRunAdmission.Decision.REPLAY_ACTIVE, session, run,
                AgentApprovalHandling.WAIT_FOR_DECISION, List.of()))
                .when(admissionService).admit(any());
        when(snapshotService.snapshot(session, run)).thenReturn(new AgentRunSnapshot(
                "run-1", "session-1", "message-1", AgentRunStatus.RUNNING.name(),
                null, null, null, true, null, null, null));

        InvokeCommand command = command(ReplyMode.STREAM);
        List<GatewayEvent> events = service().invokeStream(command, command.userInput())
                .events().collectList().block();

        assertEquals(List.of(GatewayEvent.GatewayEventType.RUN_STATUS),
                events.stream().map(GatewayEvent::type).toList());
        assertEquals(AgentRunStatus.RUNNING.name(),
                ((GatewayEvent.RunStatusPayload) events.getFirst().payload()).status());
        verify(runtimeService, never()).streamInvoke(any());
    }

    private AgentCommandService service() {
        return new AgentCommandService(admissionService, runService, snapshotService, runtimeService,
                runtimeEventProjector);
    }

    private InvokeCommand command(ReplyMode replyMode) {
        return InvokeCommand.builder()
                .envelope(GatewayEnvelope.builder()
                        .channelId("web-ui")
                        .receivedAt(100L)
                        .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                        .build())
                .replyMode(replyMode)
                .commandId("message-1")
                .userInput(userInput())
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .build();
    }

    private UserInput userInput() {
        return UserInput.builder()
                .messageId("message-1")
                .conversationId("conversation-1")
                .message(UserInput.Message.builder().text("diagnose monitor").build())
                .build();
    }
}
