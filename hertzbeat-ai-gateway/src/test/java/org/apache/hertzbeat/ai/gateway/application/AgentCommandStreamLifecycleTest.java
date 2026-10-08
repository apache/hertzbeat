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

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunSnapshot;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunStatus;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunSnapshotService;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvent;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeRequest;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeService;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeToolCall;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.reactivestreams.Subscription;
import reactor.core.publisher.BaseSubscriber;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;
import reactor.util.concurrent.Queues;

/**
 * Tests the shared runtime stream's subscription and demand boundaries.
 */
@ExtendWith(MockitoExtension.class)
class AgentCommandStreamLifecycleTest {

    @Mock
    private AgentRunAdmissionService admissionService;

    @Mock
    private AgentRunService runService;

    @Mock
    private AgentRuntimeService runtimeService;

    @Mock
    private AgentRunSnapshotService snapshotService;

    private AgentSession session;
    private AgentRun run;

    @BeforeEach
    void setUp() {
        session = AgentSession.builder().id(1L).sessionUid("session-1").build();
        run = AgentRun.builder().id(2L).runUid("run-1").sessionId(1L).build();
        lenient().when(admissionService.admit(any())).thenReturn(new AgentRunAdmission(
                AgentRunAdmission.Decision.EXECUTE_NEW, session, run,
                AgentApprovalHandling.WAIT_FOR_DECISION, List.of()));
    }

    @Test
    void synchronousSourceMustNotOutrunTheFirstSubscriberRequest() throws InterruptedException {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        CountDownLatch sourceFinished = new CountDownLatch(1);
        CountDownLatch subscriberInstalled = new CountDownLatch(1);
        CountDownLatch subscriberFinished = new CountDownLatch(1);
        List<GatewayEvent.GatewayEventType> received = new CopyOnWriteArrayList<>();
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class))).thenReturn(Flux.concat(
                Flux.just(AgentRuntimeEvent.runStarted("trace-1", timestamp),
                        AgentRuntimeEvent.assistantMessageStarted("assistant-1", "trace-1", timestamp),
                        AgentRuntimeEvent.assistantMessageCompleted("assistant-1", "trace-1", timestamp)),
                Flux.just(AgentRuntimeEvent.runCompleted("trace-1", timestamp, "final result")))
                .doFinally(ignored -> sourceFinished.countDown()));
        when(runService.markSucceeded(run, "final result")).thenAnswer(invocation -> {
            run.setStatus(AgentRunStatus.SUCCEEDED.name());
            run.setResultSummary(invocation.getArgument(1));
            return run;
        });

        Flux<GatewayEvent> events = service().invokeStream(command(), userInput()).events();
        Thread subscriberThread = Thread.ofPlatform().start(() -> events.subscribe(new BaseSubscriber<>() {
            @Override
            protected void hookOnSubscribe(Subscription subscription) {
                subscriberInstalled.countDown();
                await(sourceFinished);
                requestUnbounded();
            }

            @Override
            protected void hookOnNext(GatewayEvent event) {
                received.add(event.type());
            }

            @Override
            protected void hookOnComplete() {
                subscriberFinished.countDown();
            }
        }));

        assertTrue(subscriberInstalled.await(2, TimeUnit.SECONDS));
        assertTrue(subscriberFinished.await(2, TimeUnit.SECONDS));
        subscriberThread.join(2_000);
        assertEquals(List.of(GatewayEvent.GatewayEventType.RUN_STARTED,
                GatewayEvent.GatewayEventType.MESSAGE_STARTED,
                GatewayEvent.GatewayEventType.MESSAGE_COMPLETED,
                GatewayEvent.GatewayEventType.RUN_COMPLETED), received);
    }

    @Test
    void durableLifecycleMustFinishPastPrefetchWithoutAnyClientDemand() throws InterruptedException {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        AtomicInteger runtimeSubscriptions = new AtomicInteger();
        CountDownLatch sourceFinished = new CountDownLatch(1);
        CountDownLatch subscriberInstalled = new CountDownLatch(1);
        CountDownLatch allowDemand = new CountDownLatch(1);
        CountDownLatch subscriberFinished = new CountDownLatch(1);
        CountDownLatch terminalPersisted = new CountDownLatch(1);
        List<GatewayEvent.GatewayEventType> received = new CopyOnWriteArrayList<>();
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class))).thenReturn(Flux.defer(() -> {
            runtimeSubscriptions.incrementAndGet();
            return Flux.concat(
                    Flux.just(AgentRuntimeEvent.runStarted("trace-1", timestamp)),
                    Flux.range(0, Queues.SMALL_BUFFER_SIZE + 32).map(index ->
                            AgentRuntimeEvent.toolStarted("tool-" + index, "trace-1", toolCall(), timestamp)),
                    Flux.just(AgentRuntimeEvent.assistantMessageStarted("assistant-1", "trace-1", timestamp),
                            AgentRuntimeEvent.assistantMessageCompleted("assistant-1", "trace-1", timestamp),
                            AgentRuntimeEvent.runCompleted("trace-1", timestamp, "final result")))
                    .doFinally(ignored -> sourceFinished.countDown());
        }));
        when(runService.markSucceeded(run, "final result")).thenAnswer(invocation -> {
            run.setStatus(AgentRunStatus.SUCCEEDED.name());
            run.setResultSummary(invocation.getArgument(1));
            terminalPersisted.countDown();
            return run;
        });

        Flux<GatewayEvent> events = service().invokeStream(command(), userInput()).events();
        Thread subscriberThread = Thread.ofPlatform().start(() -> events.subscribe(new BaseSubscriber<>() {
            @Override
            protected void hookOnSubscribe(Subscription subscription) {
                subscriberInstalled.countDown();
                awaitRelease(allowDemand);
                requestUnbounded();
            }

            @Override
            protected void hookOnNext(GatewayEvent event) {
                received.add(event.type());
            }

            @Override
            protected void hookOnComplete() {
                subscriberFinished.countDown();
            }
        }));

        assertTrue(subscriberInstalled.await(2, TimeUnit.SECONDS));
        boolean sourceFinishedWithoutDemand = sourceFinished.await(500, TimeUnit.MILLISECONDS);
        boolean persistedWithoutDemand = terminalPersisted.getCount() == 0;
        allowDemand.countDown();
        assertTrue(subscriberFinished.await(2, TimeUnit.SECONDS));
        subscriberThread.join(2_000);
        assertTrue(sourceFinishedWithoutDemand);
        assertTrue(persistedWithoutDemand);
        assertEquals(GatewayEvent.GatewayEventType.RUN_STARTED, received.getFirst());
        assertEquals(GatewayEvent.GatewayEventType.RUN_COMPLETED, received.getLast());
        assertEquals(Queues.SMALL_BUFFER_SIZE + 2, received.size());
        assertEquals(1, runtimeSubscriptions.get());
    }

    @Test
    void finalOnlyMustUseTheReliableCompletedResultAfterLiveRelayOverflow() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        String finalResult = "authoritative complete response";
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class))).thenReturn(Flux.concat(
                Flux.just(AgentRuntimeEvent.runStarted("trace-1", timestamp)),
                Flux.range(0, Queues.SMALL_BUFFER_SIZE + 32).map(index ->
                        AgentRuntimeEvent.toolStarted("tool-" + index, "trace-1", toolCall(), timestamp)),
                Flux.just(AgentRuntimeEvent.assistantMessageStarted("assistant-1", "trace-1", timestamp),
                        AgentRuntimeEvent.assistantMessageCompleted("assistant-1", "trace-1", timestamp),
                        AgentRuntimeEvent.runCompleted("trace-1", timestamp, finalResult))));
        when(runService.markSucceeded(run, finalResult)).thenAnswer(invocation -> {
            run.setStatus(AgentRunStatus.SUCCEEDED.name());
            run.setResultSummary(invocation.getArgument(1));
            return run;
        });

        GatewayResponse.GatewaySingleResponse response = service().invokeFinal(finalCommand(), userInput());

        assertEquals(Map.of("message", finalResult, "status", AgentRunStatus.SUCCEEDED.name()), response.body());
    }

    @Test
    void finalOnlyMustFailWhenTheRuntimeOmitsAssistantMessageCompletion() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class))).thenReturn(Flux.just(
                AgentRuntimeEvent.runStarted("trace-1", timestamp),
                AgentRuntimeEvent.runCompleted("trace-1", timestamp, "orphan result")));
        when(runService.markFailed(any(), any())).thenAnswer(invocation -> {
            run.setStatus(AgentRunStatus.FAILED.name());
            return run;
        });

        GatewayResponse.GatewaySingleResponse response = service().invokeFinal(finalCommand(), userInput());

        assertEquals(Map.of("message", "Agent Gateway runtime failed.",
                "status", AgentRunStatus.FAILED.name()), response.body());
        verify(runService).markFailed(run, "Agent Gateway runtime failed.");
    }

    @Test
    void laterIncompleteAssistantMustInvalidateAnEarlierCompletedAssistant() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class))).thenReturn(Flux.just(
                AgentRuntimeEvent.runStarted("trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageStarted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageCompleted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageStarted("assistant-2", "trace-1", timestamp),
                AgentRuntimeEvent.runCompleted("trace-1", timestamp, "orphan second response")));
        failRunCauseFree();

        GatewayResponse.GatewaySingleResponse response = service().invokeFinal(finalCommand(), userInput());

        assertEquals(Map.of("message", "Agent Gateway runtime failed.",
                "status", AgentRunStatus.FAILED.name()), response.body());
        verify(runService, never()).markSucceeded(any(), any());
    }

    @Test
    void toolLifecycleAfterAssistantCompletionMustRequireNewerFinalAssistant() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class))).thenReturn(Flux.just(
                AgentRuntimeEvent.runStarted("trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageStarted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageCompleted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.toolStarted("tool-item-1", "trace-1", toolCall(), timestamp),
                AgentRuntimeEvent.toolCompleted("tool-item-1", "trace-1", toolResult(), timestamp),
                AgentRuntimeEvent.runCompleted("trace-1", timestamp, "orphan tool-loop response")));
        failRunCauseFree();

        GatewayResponse.GatewaySingleResponse response = service().invokeFinal(finalCommand(), userInput());

        assertEquals(AgentRunStatus.FAILED.name(), ((Map<?, ?>) response.body()).get("status"));
        verify(runService, never()).markSucceeded(any(), any());
    }

    @Test
    void delayedCompletionFromBeforeToolTurnMustNotRearmTheOldAssistant() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class))).thenReturn(Flux.just(
                AgentRuntimeEvent.runStarted("trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageStarted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageCompleted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.toolStarted("tool-item-1", "trace-1", toolCall(), timestamp),
                AgentRuntimeEvent.toolCompleted("tool-item-1", "trace-1", toolResult(), timestamp),
                AgentRuntimeEvent.assistantMessageCompleted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.runCompleted("trace-1", timestamp, "stale response")));
        failRunCauseFree();

        GatewayResponse.GatewaySingleResponse response = service().invokeFinal(finalCommand(), userInput());

        assertEquals(AgentRunStatus.FAILED.name(), ((Map<?, ?>) response.body()).get("status"));
        verify(runService, never()).markSucceeded(any(), any());
    }

    @Test
    void assistantDeltaWithoutNewerStartMustNotRearmTheOldAssistant() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class))).thenReturn(Flux.just(
                AgentRuntimeEvent.runStarted("trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageStarted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageCompleted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageDelta("assistant-2", "trace-1", 0, "late delta", timestamp),
                AgentRuntimeEvent.runCompleted("trace-1", timestamp, "orphan response")));
        failRunCauseFree();

        GatewayResponse.GatewaySingleResponse response = service().invokeFinal(finalCommand(), userInput());

        assertEquals(AgentRunStatus.FAILED.name(), ((Map<?, ?>) response.body()).get("status"));
        verify(runService, never()).markSucceeded(any(), any());
    }

    @Test
    void completedAssistantAfterToolTurnMustRemainValidFinalResponse() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        String finalResult = "grounded final response";
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class))).thenReturn(Flux.just(
                AgentRuntimeEvent.runStarted("trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageStarted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageCompleted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.toolStarted("tool-item-1", "trace-1", toolCall(), timestamp),
                AgentRuntimeEvent.toolCompleted("tool-item-1", "trace-1", toolResult(), timestamp),
                AgentRuntimeEvent.assistantMessageStarted("assistant-2", "trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageDelta(
                        "assistant-2", "trace-1", 0, finalResult, timestamp),
                AgentRuntimeEvent.assistantMessageCompleted("assistant-2", "trace-1", timestamp),
                AgentRuntimeEvent.runCompleted("trace-1", timestamp, finalResult)));
        when(runService.markSucceeded(run, finalResult)).thenAnswer(invocation -> {
            run.setStatus(AgentRunStatus.SUCCEEDED.name());
            run.setResultSummary(invocation.getArgument(1));
            return run;
        });

        GatewayResponse.GatewaySingleResponse response = service().invokeFinal(finalCommand(), userInput());

        assertEquals(Map.of("message", finalResult, "status", AgentRunStatus.SUCCEEDED.name()), response.body());
    }

    @Test
    void fatalRuntimeFluxFailureMustEscapeWithoutPersistingOrdinaryFailure() {
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class)))
                .thenReturn(Flux.error(new LinkageError("fatal provider linkage")));

        assertThrows(LinkageError.class, () -> service().invokeFinal(finalCommand(), userInput()));
        verify(runService, never()).markFailed(any(), any());
    }

    @Test
    void firstFinalResponseAndReplayMustUseTheSamePersistedRedactedResult() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        String rawResult = "authorization=Bearer abc";
        String safeResult = "authorization=[REDACTED]";
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class))).thenReturn(Flux.just(
                AgentRuntimeEvent.runStarted("trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageStarted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageCompleted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.runCompleted("trace-1", timestamp, rawResult)));
        when(runService.markSucceeded(run, rawResult)).thenAnswer(invocation -> {
            run.setStatus(AgentRunStatus.SUCCEEDED.name());
            run.setResultSummary(safeResult);
            return run;
        });

        GatewayResponse.GatewaySingleResponse first = service().invokeFinal(finalCommand(), userInput());
        doReturn(new AgentRunAdmission(AgentRunAdmission.Decision.REPLAY_TERMINAL, session, run,
                AgentApprovalHandling.DENY, List.of())).when(admissionService).admit(any());
        when(snapshotService.snapshot(session, run)).thenReturn(new AgentRunSnapshot(
                "run-1", "session-1", "message-1", AgentRunStatus.SUCCEEDED.name(),
                null, safeResult, null, true, null, null, null));

        GatewayResponse.GatewaySingleResponse replay = service().invokeFinal(finalCommand(), userInput());

        assertEquals(Map.of("message", safeResult, "status", AgentRunStatus.SUCCEEDED.name()), first.body());
        assertEquals(first.body(), replay.body());
    }

    @Test
    void splitSecretsMustBeRedactedBeforeAnyOutboundMessageDelta() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        String rawResult = "Observed password=output-sentinel; token=output-token";
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class))).thenReturn(Flux.just(
                AgentRuntimeEvent.runStarted("trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageStarted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageDelta("assistant-1", "trace-1", 0, "Observed pass", timestamp),
                AgentRuntimeEvent.assistantMessageDelta("assistant-1", "trace-1", 1,
                        "word=output-sentinel; token=output-token", timestamp),
                AgentRuntimeEvent.assistantMessageCompleted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.runCompleted("trace-1", timestamp, rawResult)));
        when(runService.markSucceeded(run, rawResult)).thenAnswer(invocation -> {
            run.setResultSummary(GatewayText.redactSecrets(invocation.getArgument(1)));
            return run;
        });

        List<GatewayEvent> events = service().invokeStream(command(), userInput()).events().collectList().block();
        List<String> deltas = events.stream().filter(event -> event.payload() instanceof GatewayEvent.MessageDeltaPayload)
                .map(event -> ((GatewayEvent.MessageDeltaPayload) event.payload()).delta()).toList();

        assertEquals(List.of(GatewayText.redactSecrets(rawResult)), deltas);
        assertEquals(List.of(GatewayEvent.GatewayEventType.RUN_STARTED,
                GatewayEvent.GatewayEventType.MESSAGE_STARTED, GatewayEvent.GatewayEventType.MESSAGE_DELTA,
                GatewayEvent.GatewayEventType.MESSAGE_COMPLETED, GatewayEvent.GatewayEventType.RUN_COMPLETED),
                events.stream().map(GatewayEvent::type).toList());
        assertEquals(events.size(), events.stream().map(GatewayEvent::eventId).distinct().count());
    }

    @Test
    void incompleteTextIsNeverEmittedWhenRuntimeStopsTimesOutOrEndsWithoutCompletion() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        failRunCauseFree();
        for (Flux<AgentRuntimeEvent> ending : List.of(
                Flux.just(AgentRuntimeEvent.runError("trace-1", "Runtime cancelled", timestamp)),
                Flux.just(AgentRuntimeEvent.runError("trace-1", "Model request timed out", timestamp)),
                Flux.<AgentRuntimeEvent>error(new IllegalStateException("password=synthetic-sentinel")),
                Flux.<AgentRuntimeEvent>empty())) {
            when(runtimeService.streamInvoke(any())).thenReturn(Flux.concat(
                    Flux.just(AgentRuntimeEvent.runStarted("trace-1", timestamp),
                            AgentRuntimeEvent.assistantMessageStarted("assistant-1", "trace-1", timestamp),
                            AgentRuntimeEvent.assistantMessageDelta("assistant-1", "trace-1", 0,
                                    "password=synthetic-sentinel", timestamp)), ending));
            List<GatewayEvent> events = service().invokeStream(command(), userInput()).events().collectList().block();
            assertTrue(events.stream().noneMatch(event -> event.type() == GatewayEvent.GatewayEventType.MESSAGE_DELTA));
            assertEquals(GatewayEvent.GatewayEventType.ERROR, events.getLast().type());
        }
        verify(runService, never()).markSucceeded(any(), any());
    }

    @Test
    void oversizedRawMessageFailsClosedEvenWhenRedactionWouldShortenIt() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        failRunCauseFree();
        when(runtimeService.streamInvoke(any())).thenReturn(Flux.just(
                AgentRuntimeEvent.runStarted("trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageStarted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageDelta("assistant-1", "trace-1", 0,
                        "-----BEGIN PRIVATE KEY-----" + "x".repeat(65_535) + "-----END PRIVATE KEY-----", timestamp),
                AgentRuntimeEvent.assistantMessageCompleted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.runCompleted("trace-1", timestamp, "ignored")));

        List<GatewayEvent> events = service().invokeStream(command(), userInput()).events().collectList().block();

        assertTrue(events.stream().noneMatch(event -> event.type() == GatewayEvent.GatewayEventType.MESSAGE_DELTA));
        assertEquals(GatewayEvent.GatewayEventType.ERROR, events.getLast().type());
        verify(runService).markFailed(run, "Agent Gateway runtime failed.");
        verify(runService, never()).markSucceeded(any(), any());
    }

    @Test
    void concurrentInvocationsKeepMessageBuffersSeparateWhileToolProgressContinues() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        Sinks.Many<AgentRuntimeEvent> first = Sinks.many().unicast().onBackpressureBuffer();
        Sinks.Many<AgentRuntimeEvent> second = Sinks.many().unicast().onBackpressureBuffer();
        when(runtimeService.streamInvoke(any())).thenReturn(first.asFlux(), second.asFlux());
        failRunCauseFree();
        AgentCommandService service = service();
        List<GatewayEvent> firstEvents = new CopyOnWriteArrayList<>();
        List<GatewayEvent> secondEvents = new CopyOnWriteArrayList<>();
        service.invokeStream(command(), userInput()).events().subscribe(firstEvents::add);
        service.invokeStream(command(), userInput()).events().subscribe(secondEvents::add);
        for (Sinks.Many<AgentRuntimeEvent> source : List.of(first, second)) {
            source.tryEmitNext(AgentRuntimeEvent.runStarted("trace-1", timestamp));
            source.tryEmitNext(AgentRuntimeEvent.assistantMessageStarted("assistant-1", "trace-1", timestamp));
        }
        first.tryEmitNext(AgentRuntimeEvent.assistantMessageDelta("assistant-1", "trace-1", 0, "pass", timestamp));
        second.tryEmitNext(AgentRuntimeEvent.assistantMessageDelta("assistant-1", "trace-1", 0, "safe second", timestamp));
        first.tryEmitNext(AgentRuntimeEvent.toolStarted("tool-item", "trace-1", toolCall(), timestamp));
        assertEquals(GatewayEvent.GatewayEventType.TOOL_STARTED, firstEvents.getLast().type());
        assertTrue(firstEvents.stream().noneMatch(event -> event.type() == GatewayEvent.GatewayEventType.MESSAGE_DELTA));
        first.tryEmitNext(AgentRuntimeEvent.assistantMessageDelta("assistant-1", "trace-1", 1,
                "word=synthetic-sentinel", timestamp));
        second.tryEmitNext(AgentRuntimeEvent.assistantMessageCompleted("assistant-1", "trace-1", timestamp));
        first.tryEmitNext(AgentRuntimeEvent.assistantMessageCompleted("assistant-1", "trace-1", timestamp));
        assertEquals(List.of("password=[REDACTED]"), messageTexts(firstEvents));
        assertEquals(List.of("safe second"), messageTexts(secondEvents));
        for (Sinks.Many<AgentRuntimeEvent> source : List.of(first, second)) {
            source.tryEmitNext(AgentRuntimeEvent.runError("trace-1", "Runtime cancelled", timestamp));
            source.tryEmitComplete();
        }
    }

    @Test
    void runtimeErrorEventMustRedactBeforeOutboundWhileDiscardingPartialMessage() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        String rawError = "Provider failed password=synthetic-sentinel";
        when(runtimeService.streamInvoke(any())).thenReturn(Flux.just(
                AgentRuntimeEvent.runStarted("trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageStarted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageDelta("assistant-1", "trace-1", 0,
                        "password=partial-sentinel", timestamp),
                AgentRuntimeEvent.runError("trace-1", rawError, timestamp)));
        when(runService.markFailed(run, rawError)).thenAnswer(invocation -> {
            run.setStatus(AgentRunStatus.FAILED.name());
            run.setErrorMessage(GatewayText.redactSecrets(invocation.getArgument(1)));
            return run;
        });

        List<GatewayEvent> events = service().invokeStream(command(), userInput()).events().collectList().block();

        assertEquals(List.of(), messageTexts(events));
        GatewayEvent.ErrorPayload error = (GatewayEvent.ErrorPayload) events.getLast().payload();
        assertEquals(GatewayText.redactSecrets(rawError), run.getErrorMessage());
        assertEquals(run.getErrorMessage(), error.errorMessage());
        assertEquals("failed", error.status());
    }

    private List<String> messageTexts(List<GatewayEvent> events) {
        return events.stream().filter(event -> event.payload() instanceof GatewayEvent.MessageDeltaPayload)
                .map(event -> ((GatewayEvent.MessageDeltaPayload) event.payload()).delta()).toList();
    }

    private void failRunCauseFree() {
        when(runService.markFailed(any(), any())).thenAnswer(invocation -> {
            run.setStatus(AgentRunStatus.FAILED.name());
            return run;
        });
    }

    private AgentRuntimeToolCall toolCall() {
        return AgentRuntimeToolCall.builder()
                .toolCallId("tool-call-1")
                .toolName("metrics.history")
                .arguments(Map.of())
                .build();
    }

    private AgentToolExecutionResult toolResult() {
        return AgentToolExecutionResult.builder()
                .toolCallId("tool-call-1")
                .toolName("metrics.history")
                .status(AgentToolStatus.SUCCEEDED)
                .decision(AgentPolicyDecision.ALLOW)
                .risk(AgentToolRisk.READ)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .elapsedMs(1L)
                .build();
    }

    private void await(CountDownLatch latch) {
        try {
            latch.await(250, TimeUnit.MILLISECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Subscriber interrupted", exception);
        }
    }

    private void awaitRelease(CountDownLatch latch) {
        try {
            if (!latch.await(2, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Subscriber release timed out");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Subscriber interrupted", exception);
        }
    }

    private AgentCommandService service() {
        return new AgentCommandService(admissionService, runService, snapshotService, runtimeService,
                new GatewayRuntimeEventProjector());
    }

    private InvokeCommand command() {
        return InvokeCommand.builder()
                .envelope(GatewayEnvelope.builder()
                        .channelId("web-ui")
                        .receivedAt(100L)
                        .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                        .build())
                .replyMode(ReplyMode.STREAM)
                .commandId("message-1")
                .userInput(userInput())
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .build();
    }

    private InvokeCommand finalCommand() {
        return InvokeCommand.builder()
                .envelope(command().envelope())
                .replyMode(ReplyMode.FINAL_ONLY)
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
