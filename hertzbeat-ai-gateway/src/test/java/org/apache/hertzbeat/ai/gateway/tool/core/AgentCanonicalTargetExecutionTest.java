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

package org.apache.hertzbeat.ai.gateway.tool.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;
import org.apache.hertzbeat.ai.gateway.contract.AgentServiceRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry.RegisteredTool;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Pre-ledger and post-read authority checks for canonical target execution. */
@ExtendWith(MockitoExtension.class)
class AgentCanonicalTargetExecutionTest {

    @Mock
    private AgentPolicyService policyService;
    @Mock
    private AgentToolCallLedgerService ledgerService;
    @Mock
    private AgentInteractionInputService interactionInputService;
    @Mock
    private AgentEntityMonitorMetricAuthorityVerifier authorityVerifier;

    private final AtomicInteger handlerCalls = new AtomicInteger();
    private final AtomicBoolean authorityCurrent = new AtomicBoolean(true);
    private CountDownLatch handlerEntered;
    private CountDownLatch releaseHandler;
    private AgentToolExecutionOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        AgentToolRegistry registry = new AgentToolRegistry();
        registry.register(new RegisteredTool(descriptor(), context -> {
            handlerCalls.incrementAndGet();
            awaitAuthorityChange();
            return AgentToolOutput.builder().status(AgentToolStatus.SUCCEEDED).modelContent("history").build();
        }));
        registry.register(new RegisteredTool(descriptor("monitor.get", AgentToolRisk.READ), context -> {
            handlerCalls.incrementAndGet();
            awaitAuthorityChange();
            return AgentToolOutput.builder().status(AgentToolStatus.SUCCEEDED).modelContent("monitor").build();
        }));
        lenient().when(authorityVerifier.isCanonicalTarget(any())).thenReturn(true);
        lenient().when(interactionInputService.validateReference(any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(interactionInputService.mergeAndTake(any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(policyService.decide(any(), any())).thenReturn(AgentPolicyResult.builder()
                .decision(AgentPolicyDecision.ALLOW).risk(AgentToolRisk.READ).reason("allowed").build());
        lenient().when(ledgerService.recordToolStarted(any(), any(), any()))
                .thenReturn(call(AgentToolStatus.RUNNING));
        lenient().when(ledgerService.completeToolCall(any(), any(), any(Long.class)))
                .thenReturn(call(AgentToolStatus.SUCCEEDED));
        lenient().when(ledgerService.failToolCall(any(), any(), any(Long.class)))
                .thenReturn(call(AgentToolStatus.FAILED));
        orchestrator = new AgentToolExecutionOrchestrator(registry, policyService, ledgerService,
                interactionInputService, new AgentTargetToolAuthorizer(authorityVerifier));
    }

    @Test
    void staleAuthorityShouldDenyBeforeInteractionPolicyLedgerAndHandler() {
        when(authorityVerifier.verify("workspace-a", target())).thenReturn(false);

        AgentToolExecutionResult result = orchestrator.execute(request(arguments()));

        assertEquals(AgentToolStatus.DENIED, result.getStatus());
        assertEquals(0, handlerCalls.get());
        verify(interactionInputService, never()).validateReference(any());
        verify(policyService, never()).decide(any(), any());
        verify(ledgerService, never()).recordToolStarted(any(), any(), any());
    }

    @Test
    void wrongOrOverlayArgumentsShouldDenyWithoutReadingAuthorityOrLedger() {
        Map<String, Object> overlay = new java.util.LinkedHashMap<>(arguments());
        overlay.put("inputRef", "air-foreign");

        AgentToolExecutionResult result = orchestrator.execute(request(overlay));

        assertEquals(AgentToolStatus.DENIED, result.getStatus());
        verify(authorityVerifier, never()).verify(any(), any());
        verify(ledgerService, never()).recordToolStarted(any(), any(), any());
        assertEquals(0, handlerCalls.get());
    }

    @Test
    void authorityChangeDuringHistoryReadShouldDiscardOutputAndFailLedger() {
        handlerEntered = new CountDownLatch(1);
        releaseHandler = new CountDownLatch(1);
        when(authorityVerifier.verify("workspace-a", target())).thenAnswer(ignored -> authorityCurrent.get());

        CompletableFuture<AgentToolExecutionResult> execution = CompletableFuture.supplyAsync(
                () -> orchestrator.execute(request(arguments())));
        await(handlerEntered);
        authorityCurrent.set(false);
        releaseHandler.countDown();
        AgentToolExecutionResult result = execution.join();

        assertEquals(AgentToolStatus.FAILED, result.getStatus());
        assertEquals(null, result.getOutput());
        assertEquals(1, handlerCalls.get());
        verify(authorityVerifier, org.mockito.Mockito.times(2)).verify("workspace-a", target());
        verify(ledgerService).failToolCall(any(), any(), any(Long.class));
        verify(ledgerService, never()).completeToolCall(any(), any(), any(Long.class));
    }

    @Test
    void authorityChangeDuringMonitorReadShouldDiscardOutputAndFailLedger() {
        handlerEntered = new CountDownLatch(1);
        releaseHandler = new CountDownLatch(1);
        when(authorityVerifier.verify("workspace-a", target())).thenAnswer(ignored -> authorityCurrent.get());

        CompletableFuture<AgentToolExecutionResult> execution = CompletableFuture.supplyAsync(
                () -> orchestrator.execute(request("monitor.get", Map.of("monitorId", 42L))));
        await(handlerEntered);
        authorityCurrent.set(false);
        releaseHandler.countDown();
        AgentToolExecutionResult result = execution.join();

        assertEquals(AgentToolStatus.FAILED, result.getStatus());
        assertEquals(null, result.getOutput());
        assertEquals(1, handlerCalls.get());
        verify(ledgerService).failToolCall(any(), any(), any(Long.class));
        verify(ledgerService, never()).completeToolCall(any(), any(), any(Long.class));
    }

    @Test
    void postAuthorityDenialPersistenceRuntimeFailureShouldBeIndeterminate() {
        when(authorityVerifier.verify("workspace-a", target())).thenReturn(true, false);
        IllegalStateException persistenceFailure = new IllegalStateException("ledger unavailable");
        org.mockito.Mockito.doThrow(persistenceFailure).when(ledgerService)
                .failToolCall(any(), any(), any(Long.class));

        AgentToolCompletionIndeterminateException thrown = assertThrows(
                AgentToolCompletionIndeterminateException.class,
                () -> orchestrator.execute(request(arguments())));

        assertEquals(AgentToolCompletionIndeterminateException.MESSAGE, thrown.getMessage());
        assertSame(persistenceFailure, thrown.getSuppressed()[0]);
        verify(ledgerService, never()).completeToolCall(any(), any(), any(Long.class));
    }

    @Test
    void postAuthorityDenialPersistenceNonFatalErrorShouldBeIndeterminate() {
        when(authorityVerifier.verify("workspace-a", target())).thenReturn(true, false);
        AssertionError persistenceFailure = new AssertionError("ledger unavailable");
        org.mockito.Mockito.doThrow(persistenceFailure).when(ledgerService)
                .failToolCall(any(), any(), any(Long.class));

        AgentToolCompletionIndeterminateException thrown = assertThrows(
                AgentToolCompletionIndeterminateException.class,
                () -> orchestrator.execute(request(arguments())));

        assertSame(persistenceFailure, thrown.getSuppressed()[0]);
        verify(ledgerService, never()).completeToolCall(any(), any(), any(Long.class));
    }

    @ParameterizedTest
    @MethodSource("fatalPersistenceFailures")
    void postAuthorityDenialPersistenceFatalErrorShouldPropagate(Error persistenceFailure) {
        when(authorityVerifier.verify("workspace-a", target())).thenReturn(true, false);
        org.mockito.Mockito.doThrow(persistenceFailure).when(ledgerService)
                .failToolCall(any(), any(), any(Long.class));

        Error thrown = assertThrows(persistenceFailure.getClass(),
                () -> orchestrator.execute(request(arguments())));

        assertSame(persistenceFailure, thrown);
        verify(ledgerService, never()).completeToolCall(any(), any(), any(Long.class));
    }

    private static Stream<Error> fatalPersistenceFailures() {
        return Stream.of(new TestVirtualMachineError(), new ThreadDeath(), new LinkageError("ledger unavailable"));
    }

    @Test
    void canonicalTargetShouldAllowOnlyExactMonitorReadHistoryAndDiscovery() {
        when(authorityVerifier.verify("workspace-a", target())).thenReturn(true);
        AgentTargetToolAuthorizer authorizer = new AgentTargetToolAuthorizer(authorityVerifier);

        assertEquals(true, authorizer.denialReason(
                request(Map.of("monitorId", 42L)).toBuilder().toolName("monitor.get").build(),
                descriptor("monitor.get", AgentToolRisk.READ)).isEmpty());
        assertEquals(true, authorizer.denialReason(request(arguments()), descriptor()).isEmpty());
        assertEquals(true, authorizer.denialReason(
                request(Map.of("query", "metrics")).toBuilder().toolName("tool.search").build(),
                descriptor("tool.search", AgentToolRisk.READ)).isEmpty());
        assertEquals(AgentTargetToolAuthorizer.TARGET_DENIAL_REASON, authorizer.denialReason(
                request(Map.of("entityId", 7L)).toBuilder().toolName("entity.get").build(),
                descriptor("entity.get", AgentToolRisk.READ)).orElseThrow());
        assertEquals(AgentTargetToolAuthorizer.TARGET_DENIAL_REASON, authorizer.denialReason(
                request(arguments()).toBuilder().toolName("metrics.history")
                        .arguments(Map.of("monitorId", 42L, "metricKey", "basic.other",
                                "start", 1_000L, "end", 2_000L)).build(),
                descriptor()).orElseThrow());
    }

    @Test
    void stableAuthorityShouldAllowExactHistoryAndCompleteLedger() {
        when(authorityVerifier.verify("workspace-a", target())).thenReturn(true);

        AgentToolExecutionResult result = orchestrator.execute(request(arguments()));

        assertEquals(AgentToolStatus.SUCCEEDED, result.getStatus());
        assertEquals(1, handlerCalls.get());
        verify(authorityVerifier, org.mockito.Mockito.times(2)).verify("workspace-a", target());
        verify(ledgerService).completeToolCall(any(), any(), any(Long.class));
    }

    @Test
    void fatalAuthorityVerificationShouldPropagateAfterWorkspaceScopeRestoration() {
        when(authorityVerifier.verify("workspace-a", target())).thenThrow(new LinkageError("fatal"));
        AuthTokenRequestContext.bindWorkspaceId("previous-workspace");
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("previous-authenticated");
        AuthTokenRequestContext.bindCollectorId("previous-collector");
        try {
            assertThrows(LinkageError.class, () -> orchestrator.execute(request(arguments())));
            assertEquals("previous-workspace", AuthTokenRequestContext.currentWorkspaceId());
            assertEquals("previous-authenticated", AuthTokenRequestContext.currentAuthenticatedWorkspaceId());
            assertEquals("previous-collector", AuthTokenRequestContext.currentCollectorId());
            verify(ledgerService, never()).recordToolStarted(any(), any(), any());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    private AgentTargetRef target() {
        return AgentTargetRef.builder()
                .version("entity-monitor-metric.v1").entityId(7L).monitorId(42L)
                .service(AgentServiceRef.builder().name("checkout").namespace("commerce").environment("prod").build())
                .signal(AgentSignalRef.builder().type("metrics").query("basic.qps")
                        .start(1_000L).end(2_000L).timezone("UTC").build())
                .authority(AgentTargetAuthority.builder().bindingId(11L).version("2026-08-15T00:00")
                        .hash("sha256:" + "a".repeat(64)).build())
                .build();
    }

    private Map<String, Object> arguments() {
        return Map.of("monitorId", 42L, "metricKey", "basic.qps", "start", 1_000L, "end", 2_000L);
    }

    private AgentToolExecutionRequest request(Map<String, Object> arguments) {
        return request("metrics.history", arguments);
    }

    private AgentToolExecutionRequest request(String toolName, Map<String, Object> arguments) {
        return AgentToolExecutionRequest.builder().sessionUid("ags-1").runId(2L).runUid("run-1")
                .runSessionId(1L).workspaceId("workspace-a")
                .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION).effectiveTarget(target())
                .toolName(toolName).toolCallId("call-1").arguments(arguments).build();
    }

    private AgentToolDescriptor descriptor() {
        return descriptor("metrics.history", AgentToolRisk.READ);
    }

    private AgentToolDescriptor descriptor(String toolName, AgentToolRisk risk) {
        return AgentToolDescriptor.builder().name(toolName).namespace(toolName.substring(0, toolName.indexOf('.')))
                .description("Read exact metrics").inputSchema("{\"type\":\"object\"}")
                .risk(risk).exposure(AgentToolExposure.MODEL_VISIBLE).build();
    }

    private AgentToolCall call(AgentToolStatus status) {
        return AgentToolCall.builder().id(3L).sessionId(1L).sessionUid("ags-1").runId(2L).runUid("run-1")
                .toolCallId("call-1").toolName("metrics.history").risk(AgentToolRisk.READ.name())
                .policyDecision(AgentPolicyDecision.ALLOW.name()).status(status.name())
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED.name()).inputJson("{}").build();
    }

    private void awaitAuthorityChange() {
        if (handlerEntered == null) {
            return;
        }
        handlerEntered.countDown();
        await(releaseHandler);
    }

    private void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                throw new AssertionError("Timed out waiting for canonical authority test latch");
            }
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new AssertionError("Canonical authority test interrupted", interrupted);
        }
    }

    private static final class TestVirtualMachineError extends VirtualMachineError {
    }
}
