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
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.ArrayList;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.contract.UserInput.Message;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionOrchestrator;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentTargetToolAuthorizer;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolCallLedgerService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolOutput;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
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
    void nonFatalErrorShouldConvergeToCauseFreeTerminalFailure() {
        AgentRuntimeModelClient modelClient = (modelRequest, control, textDeltaConsumer) -> {
            throw new AssertionError("sensitive handler detail");
        };

        List<AgentRuntimeEvent> events = service(runtimeProperties(), modelClient)
                .streamInvoke(request()).collectList().block();

        AgentRuntimeEvent terminal = events.stream()
                .filter(event -> event.getType() == AgentRuntimeEventType.ERROR)
                .findFirst().orElseThrow();
        assertEquals("Agent Gateway runtime failed.", terminal.getErrorMessage());
        assertEquals(AgentRuntimeEvent.EventStatus.FAILED, terminal.getStatus());
    }

    @Test
    void detachedFatalModelFailureMustTerminateTheRuntimeFlux() throws InterruptedException {
        CountDownLatch modelEntered = new CountDownLatch(1);
        CountDownLatch terminalObserved = new CountDownLatch(1);
        AtomicReference<Throwable> terminalFailure = new AtomicReference<>();
        AgentRuntimeModelClient modelClient = (modelRequest, control, textDeltaConsumer) -> {
            modelEntered.countDown();
            throw new LinkageError("fatal provider linkage");
        };

        service(runtimeProperties(), modelClient).streamInvoke(request()).subscribe(
                ignored -> { },
                failure -> {
                    terminalFailure.set(failure);
                    terminalObserved.countDown();
                },
                terminalObserved::countDown);

        assertTrue(modelEntered.await(2, TimeUnit.SECONDS));
        assertTrue(terminalObserved.await(2, TimeUnit.SECONDS));
        assertInstanceOf(LinkageError.class, terminalFailure.get());
    }

    @Test
    void handlerAssertionErrorShouldRestoreScopeAndConvergeToTerminalFailure() {
        AgentToolRegistry registry = new AgentToolRegistry();
        AtomicReference<String> handlerWorkspace = new AtomicReference<>();
        AtomicReference<String> restoredWorkspace = new AtomicReference<>("not-observed");
        registry.register(new AgentToolRegistry.RegisteredTool(readDescriptor(), context -> {
            handlerWorkspace.set(AuthTokenRequestContext.currentWorkspaceId());
            throw new AssertionError("sensitive handler detail");
        }));
        AgentPolicyService policy = mock(AgentPolicyService.class);
        AgentToolCallDao toolCallDao = mock(AgentToolCallDao.class);
        List<String> durableStatuses = new ArrayList<>();
        List<String> durableErrors = new ArrayList<>();
        when(toolCallDao.save(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> {
            AgentToolCall saved = invocation.getArgument(0);
            durableStatuses.add(saved.getStatus());
            durableErrors.add(saved.getErrorMessage());
            return saved;
        });
        AgentToolCallLedgerService ledger = new AgentToolCallLedgerService(toolCallDao);
        AgentInteractionInputService interaction = mock(AgentInteractionInputService.class);
        when(interaction.validateReference(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(interaction.mergeAndTake(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(policy.decide(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(AgentPolicyResult.builder().decision(AgentPolicyDecision.ALLOW)
                        .risk(AgentToolRisk.READ).reason("allowed").build());
        AgentToolExecutionOrchestrator orchestrator = new AgentToolExecutionOrchestrator(
                registry, policy, ledger, interaction, new AgentTargetToolAuthorizer()) {
            @Override
            public org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult execute(
                    AgentToolExecutionRequest request) {
                try {
                    return super.execute(request);
                } finally {
                    restoredWorkspace.set(AuthTokenRequestContext.currentWorkspaceId());
                }
            }
        };
        AgentRuntimeModelClient modelClient = (modelRequest, control, textDeltaConsumer) ->
                AgentRuntimeModelResponse.toolCalls("read monitor", List.of(AgentRuntimeToolCall.builder()
                        .toolCallId("call-1").toolName("monitor.get")
                        .arguments(Map.of("monitorId", 1L)).build()), null);
        AgentRuntimeService service = new AgentRuntimeService(runtimeProperties(),
                new AgentRuntimeContextBuilder(CLOCK, () -> "trace-service"),
                new AgentToolBridge(registry, orchestrator, new AgentRuntimeApprovalRegistry()),
                modelClient, new AgentRuntimeControlRegistry(), mock(AgentTranscriptRecorder.class), CLOCK);

        List<AgentRuntimeEvent> events = service.streamInvoke(request()).collectList().block();

        AgentRuntimeEvent terminal = events.stream()
                .filter(event -> event.getType() == AgentRuntimeEventType.ERROR)
                .findFirst().orElseThrow();
        assertEquals("default", handlerWorkspace.get());
        assertNull(restoredWorkspace.get());
        assertEquals("Agent Gateway runtime failed.", terminal.getErrorMessage());
        assertEquals(List.of("RUNNING", "FAILED"), durableStatuses);
        assertEquals("Agent tool execution failed.", durableErrors.getLast());
    }

    @Test
    void completionPersistenceFailureShouldConvergeToRecoveryRequired() {
        AgentToolRegistry registry = new AgentToolRegistry();
        registry.register(new AgentToolRegistry.RegisteredTool(readDescriptor(), context ->
                AgentToolOutput.builder().status(AgentToolStatus.SUCCEEDED).modelContent("observed").build()));
        AgentPolicyService policy = mock(AgentPolicyService.class);
        when(policy.decide(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(AgentPolicyResult.builder().decision(AgentPolicyDecision.ALLOW)
                        .risk(AgentToolRisk.READ).reason("allowed").build());
        AgentToolCallLedgerService ledger = mock(AgentToolCallLedgerService.class);
        AgentToolCall running = AgentToolCall.builder()
                .id(1L).sessionId(1L).sessionUid("ags-1").runId(2L).runUid("run-1")
                .toolCallId("call-1").toolName("monitor.get").risk(AgentToolRisk.READ.name())
                .policyDecision(AgentPolicyDecision.ALLOW.name()).status(AgentToolStatus.RUNNING.name())
                .approvalStatus("NOT_REQUIRED").inputJson("{}").build();
        when(ledger.recordToolStarted(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any())).thenReturn(running);
        org.mockito.Mockito.doThrow(new IllegalStateException("persistence detail"))
                .when(ledger).completeToolCall(org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(Long.class));
        AgentInteractionInputService interaction = mock(AgentInteractionInputService.class);
        when(interaction.validateReference(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(interaction.mergeAndTake(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        AgentToolExecutionOrchestrator orchestrator = new AgentToolExecutionOrchestrator(
                registry, policy, ledger, interaction, new AgentTargetToolAuthorizer());
        AgentRuntimeModelClient modelClient = (modelRequest, control, textDeltaConsumer) ->
                AgentRuntimeModelResponse.toolCalls("read monitor", List.of(AgentRuntimeToolCall.builder()
                        .toolCallId("call-1").toolName("monitor.get")
                        .arguments(Map.of("monitorId", 1L)).build()), null);
        AgentRuntimeService service = new AgentRuntimeService(runtimeProperties(),
                new AgentRuntimeContextBuilder(CLOCK, () -> "trace-service"),
                new AgentToolBridge(registry, orchestrator, new AgentRuntimeApprovalRegistry()),
                modelClient, new AgentRuntimeControlRegistry(), mock(AgentTranscriptRecorder.class), CLOCK);

        List<AgentRuntimeEvent> events = service.streamInvoke(request()).collectList().block();

        AgentRuntimeEvent terminal = events.stream()
                .filter(event -> event.getType() == AgentRuntimeEventType.ERROR)
                .findFirst().orElseThrow();
        assertEquals(AgentRuntimeEvent.EventStatus.RECOVERY_REQUIRED, terminal.getStatus());
        assertEquals("Agent tool completed but its durable outcome is indeterminate.", terminal.getErrorMessage());
        org.mockito.Mockito.verify(ledger, org.mockito.Mockito.never())
                .failToolCall(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any(Long.class));
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
        AgentTranscriptRecorder recorder = mock(AgentTranscriptRecorder.class);
        AgentToolCallDao toolCallDao = mock(AgentToolCallDao.class);
        List<TranscriptMessage> history = groundingHistory();
        when(recorder.findRunGroundingMessages(2L)).thenReturn(List.of(history.get(1)));
        Map<String, Object> arguments = Map.of("monitorId", 99L);
        when(toolCallDao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(AgentToolCall.builder()
                .runId(2L).runUid("run-1").toolCallId("call-grounding").toolName("monitor.get")
                .risk(AgentToolRisk.READ.name()).status(AgentToolStatus.SUCCEEDED.name())
                .inputJson("{\"monitorId\":99}")
                .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(arguments))
                .resultOutput("{\"monitorId\":99}").build()));
        return new AgentRuntimeService(properties,
                contextBuilder,
                new AgentToolBridge(new AgentToolRegistry(), new EmptyToolExecutionOrchestrator(),
                        new AgentRuntimeApprovalRegistry()),
                modelClient,
                new AgentRuntimeControlRegistry(),
                recorder,
                new AgentGroundingEvidenceVerifier(recorder, toolCallDao),
                CLOCK,
                List.of());
    }

    private AgentRuntimeProperties runtimeProperties() {
        return new AgentRuntimeProperties();
    }

    private AgentToolDescriptor readDescriptor() {
        return AgentToolDescriptor.builder().name("monitor.get").namespace("monitor")
                .description("Read monitor").inputSchema("{\"type\":\"object\"}")
                .risk(AgentToolRisk.READ).exposure(AgentToolExposure.MODEL_VISIBLE).build();
    }

    private AgentRuntimeRequest request() {
        return AgentRuntimeRequest.builder()
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .session(AgentSession.builder().id(1L).sessionUid("ags-1").build())
                .run(AgentRun.builder().id(2L).runUid("run-1").sessionId(1L)
                        .entryType(AgentRuntimeEntryType.USER_INPUT.name()).build())
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
                .chatHistory(groundingHistory())
                .build();
    }

    private List<TranscriptMessage> groundingHistory() {
        Map<String, Object> arguments = Map.of("monitorId", 99L);
        String output = "{\"monitorId\":99}";
        AgentGroundingProof proof = AgentGroundingProof.builder()
                .version(AgentReadGroundingEvaluator.VERSION)
                .runUid("run-1")
                .toolName("monitor.get")
                .toolCallId("call-grounding")
                .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(arguments))
                .outputHash(GatewayText.sha256(AgentRuntimeTextSanitizer.redact(output)))
                .observationKind("monitor")
                .observationCount(1)
                .build();
        return List.of(TranscriptMessage.assistantToolCalls("", List.of(
                        TranscriptContent.toolCall("call-grounding", "monitor.get", arguments)), null),
                TranscriptMessage.groundedToolResult(
                        "call-grounding", "monitor.get", output, null, proof));
    }

    private static final class EmptyToolExecutionOrchestrator extends AgentToolExecutionOrchestrator {

        private EmptyToolExecutionOrchestrator() {
            super(new AgentToolRegistry(), null, null, null,
                    new org.apache.hertzbeat.ai.gateway.tool.core.AgentTargetToolAuthorizer());
        }

        @Override
        public org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult execute(AgentToolExecutionRequest request) {
            throw new AssertionError("tool execution should not be called");
        }
    }
}
