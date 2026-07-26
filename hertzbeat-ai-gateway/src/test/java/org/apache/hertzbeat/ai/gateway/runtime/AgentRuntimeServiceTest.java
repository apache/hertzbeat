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

package org.apache.hertzbeat.ai.gateway.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.contract.UserInput.Message;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionOrchestrator;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.BaseSubscriber;

/**
 * Agent runtime service tests.
 */
class AgentRuntimeServiceTest {

    private static final Instant NOW = Instant.parse("2026-04-19T00:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    @Test
    void runtimeWithoutModelClientShouldReturnModelError() {
        AgentRuntimeProperties properties = runtimeProperties();
        AgentRuntimeService service = service(properties, null);

        List<AgentRuntimeEvent> events = service.streamInvoke(request()).collectList().block();

        assertTrue(events.stream()
                .anyMatch(event -> event.getType() == AgentRuntimeEventType.ERROR
                        && "Agent Gateway runtime model client is not configured.".equals(event.getErrorMessage())
                        && event.getStatus() == AgentRuntimeEvent.EventStatus.FAILED));
    }

    @Test
    void runtimeWithoutModelConfigurationShouldReturnMissingModelClientError() {
        AgentRuntimeService service = service(new AgentRuntimeProperties(), null);

        List<AgentRuntimeEvent> events = service.streamInvoke(request()).collectList().block();

        assertTrue(events.stream()
                .anyMatch(event -> event.getType() == AgentRuntimeEventType.ERROR
                        && "Agent Gateway runtime model client is not configured.".equals(event.getErrorMessage())
                        && event.getStatus() == AgentRuntimeEvent.EventStatus.FAILED));
    }

    @Test
    void runtimeShouldExecuteLoopThroughModelBoundary() {
        AgentRuntimeProperties properties = runtimeProperties();
        AgentRuntimeModelClient modelClient = (modelRequest, control, textDeltaConsumer) ->
                AgentRuntimeModelResponse.finalAnswer("monitor is healthy", null);
        AgentRuntimeService service = service(properties, modelClient);

        List<AgentRuntimeEvent> events = service.streamInvoke(request()).collectList().block();

        assertTrue(events.stream()
                .anyMatch(event -> event.getType() == AgentRuntimeEventType.ITEM_DELTA
                        && "monitor is healthy".equals(event.getDelta())));
        assertTrue(events.stream()
                .anyMatch(event -> event.getType() == AgentRuntimeEventType.ITEM_COMPLETED
                        && event.getItemKind() == AgentRuntimeItemKind.ASSISTANT_MESSAGE));
        assertTrue(events.stream()
                .anyMatch(event -> event.getType() == AgentRuntimeEventType.RUN_COMPLETED
                        && event.getStatus() == null));
    }

    @Test
    void terminalErrorShouldKeepRuntimeMessageUnbounded() {
        AgentRuntimeProperties properties = runtimeProperties();
        String failureMessage = "context builder failed with large runtime detail: " + "x".repeat(1500);
        AgentRuntimeContextBuilder contextBuilder = new AgentRuntimeContextBuilder(CLOCK, () -> "trace-service") {
            @Override
            public AgentRuntimeContext build(AgentRuntimeRequest request, AgentRuntimeProperties runtimeProperties) {
                throw new IllegalStateException(failureMessage);
            }
        };
        AgentRuntimeService service = service(properties, contextBuilder, null);

        List<AgentRuntimeEvent> events = service.streamInvoke(request()).collectList().block();

        AgentRuntimeEvent terminalEvent = events.stream()
                .filter(event -> event.getType() == AgentRuntimeEventType.ERROR)
                .findFirst()
                .orElseThrow();
        String expectedMessage = "Agent Gateway runtime failed: " + failureMessage;
        assertEquals(expectedMessage, terminalEvent.getErrorMessage());
    }

    @Test
    void streamInvokeShouldEmitTerminalErrorForBackpressureOverflow() throws InterruptedException {
        AgentRuntimeProperties properties = runtimeProperties();
        properties.getStream().setMaxBufferedEvents(1);
        CountDownLatch modelCalled = new CountDownLatch(1);
        AtomicBoolean stopObserved = new AtomicBoolean();
        AgentRuntimeModelClient modelClient = new AgentRuntimeModelClient() {

            @Override
            public AgentRuntimeModelResponse stream(
                    org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeModelRequest request,
                    org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeControl control,
                    java.util.function.Consumer<String> textDeltaConsumer) {
                textDeltaConsumer.accept("a");
                textDeltaConsumer.accept("b");
                stopObserved.set(control.isStopRequested());
                modelCalled.countDown();
                return AgentRuntimeModelResponse.finalAnswer("ab", null);
            }
        };
        AgentRuntimeService service = service(properties, modelClient);
        List<AgentRuntimeEvent> events = new CopyOnWriteArrayList<>();
        CountDownLatch completed = new CountDownLatch(1);
        AtomicReference<Throwable> error = new AtomicReference<>();
        AtomicReference<org.reactivestreams.Subscription> subscriptionRef = new AtomicReference<>();

        service.streamInvoke(request()).subscribe(new BaseSubscriber<>() {
            @Override
            protected void hookOnSubscribe(org.reactivestreams.Subscription subscription) {
                subscriptionRef.set(subscription);
                // Keep downstream demand at zero until the runtime exceeds the configured buffer.
            }

            @Override
            protected void hookOnNext(AgentRuntimeEvent value) {
                events.add(value);
            }

            @Override
            protected void hookOnComplete() {
                completed.countDown();
            }

            @Override
            protected void hookOnError(Throwable throwable) {
                error.set(throwable);
                completed.countDown();
            }
        });

        assertTrue(modelCalled.await(2, TimeUnit.SECONDS));
        assertTrue(stopObserved.get());
        subscriptionRef.get().request(16);
        assertTrue(completed.await(2, TimeUnit.SECONDS));
        assertNull(error.get());
        AgentRuntimeEvent backpressureError = events.stream()
                .filter(event -> event.getType() == AgentRuntimeEventType.ERROR
                        && "Runtime stream exceeded the buffered event limit.".equals(event.getErrorMessage()))
                .findFirst()
                .orElseThrow();
        assertEquals(AgentRuntimeEvent.EventStatus.FAILED, backpressureError.getStatus());
    }

    private AgentRuntimeService service(AgentRuntimeProperties properties, AgentRuntimeModelClient modelClient) {
        return service(properties, new AgentRuntimeContextBuilder(CLOCK, () -> "trace-service"), modelClient);
    }

    private AgentRuntimeService service(AgentRuntimeProperties properties, AgentRuntimeContextBuilder contextBuilder,
                                        AgentRuntimeModelClient modelClient) {
        return new AgentRuntimeService(properties,
                contextBuilder,
                new AgentToolBridge(new AgentToolRegistry(), new EmptyToolExecutionOrchestrator(),
                        new AgentRuntimeApprovalRegistry()),
                modelClient,
                new AgentRuntimeControlRegistry(),
                mock(AgentTranscriptRecorder.class),
                CLOCK);
    }

    private AgentRuntimeProperties runtimeProperties() {
        return new AgentRuntimeProperties();
    }

    private AgentRuntimeRequest request() {
        return AgentRuntimeRequest.builder()
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .session(AgentSession.builder().id(1L).sessionUid("ags-1").build())
                .run(AgentRun.builder().id(2L).runUid("run-1").sessionId(1L).build())
                .envelope(GatewayEnvelope.builder()
                        .channelId("web-ui")
                        .receivedAt(100L)
                        .actor(AgentActor.builder().type("user").id("alice").roles(List.of("user")).build())
                        .build())
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .userInput(UserInput.builder()
                        .conversationId("conversation-1")
                        .message(Message.builder().text("diagnose monitor").build())
                        .build())
                .build();
    }

    private static final class EmptyToolExecutionOrchestrator extends AgentToolExecutionOrchestrator {

        private EmptyToolExecutionOrchestrator() {
            super(new AgentToolRegistry(), null, null, null);
        }

        @Override
        public org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult execute(AgentToolExecutionRequest request) {
            throw new AssertionError("tool execution should not be called");
        }
    }
}
