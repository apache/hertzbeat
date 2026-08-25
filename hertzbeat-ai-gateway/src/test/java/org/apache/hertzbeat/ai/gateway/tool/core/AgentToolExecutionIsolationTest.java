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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeApprovalRegistry;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeBlockingTaskRunner;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeControl;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry.RegisteredTool;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Tests execution-thread workspace scope and pre-ledger target enforcement.
 */
@ExtendWith(MockitoExtension.class)
class AgentToolExecutionIsolationTest {

    @Mock
    private AgentPolicyService policyService;

    @Mock
    private AgentToolCallLedgerService ledgerService;

    @Mock
    private AgentInteractionInputService interactionInputService;

    private final AtomicBoolean handlerCalled = new AtomicBoolean();
    private final AtomicReference<ScopeValues> handlerScope = new AtomicReference<>();
    private ToolMode mode;
    private AgentToolExecutionOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        AgentToolRegistry registry = new AgentToolRegistry();
        registry.register(new RegisteredTool(descriptor(), context -> executeHandler()));
        lenient().when(interactionInputService.validateReference(any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        orchestrator = new AgentToolExecutionOrchestrator(registry, policyService, ledgerService,
                interactionInputService, new AgentTargetToolAuthorizer());
    }

    @Test
    void mismatchedTargetShouldDenyBeforePolicyLedgerAndHandler() {
        mode = ToolMode.SUCCESS;
        AgentToolExecutionResult result = orchestrator.execute(request(43L).toBuilder()
                .arguments(Map.of("monitorId", 43L, "inputRef", "air-foreign"))
                .build());

        assertEquals(AgentToolStatus.DENIED, result.getStatus());
        assertEquals(AgentTargetToolAuthorizer.TARGET_DENIAL_REASON, result.getErrorMessage());
        assertEquals(false, handlerCalled.get());
        verify(policyService, never()).decide(any(), any());
        verify(ledgerService, never()).recordToolStarted(any(), any(), any());
        verify(ledgerService, never()).recordToolDenied(any(), any(), any());
        verify(interactionInputService, never()).validateReference(any());
    }

    @Test
    void actualTaskThreadShouldBindAndRestoreWorkspaceOnSuccessRuntimeErrorAndInterrupt() {
        assertScopedAndRestored(ToolMode.SUCCESS);
        assertScopedAndRestored(ToolMode.RUNTIME_EXCEPTION);
        assertScopedAndRestored(ToolMode.INTERRUPT);
    }

    @Test
    void actualTaskThreadShouldRestoreWorkspaceWhenHandlerThrowsError() {
        assertScopedAndRestored(ToolMode.ERROR);
    }

    @Test
    void fatalErrorsShouldPropagateWithoutBeingConvertedToToolFailure() {
        assertFatalScopedAndRestored(ToolMode.VIRTUAL_MACHINE_ERROR, TestVirtualMachineError.class);
        assertFatalScopedAndRestored(ToolMode.THREAD_DEATH, ThreadDeath.class);
        assertFatalScopedAndRestored(ToolMode.LINKAGE_ERROR, LinkageError.class);
        verify(ledgerService, never()).failToolCall(any(), any(), any(Long.class));
    }

    @Test
    void ordinaryInputMergeRuntimeFailureShouldTerminalizeLedgerBeforeHandler() {
        mode = ToolMode.SUCCESS;
        when(interactionInputService.mergeAndTake(any()))
                .thenThrow(new IllegalStateException("input already consumed"));

        AgentToolExecutionResult result = orchestrator.execute(request(42L));

        assertEquals(AgentToolStatus.FAILED, result.getStatus());
        assertEquals(false, handlerCalled.get());
        verify(ledgerService).failToolCall(any(), any(), any(Long.class));
    }

    @Test
    void ordinaryInputMergeErrorShouldTerminalizeLedgerAndPreservePrimaryError() {
        mode = ToolMode.SUCCESS;
        AssertionError primary = new AssertionError("merge error");
        when(interactionInputService.mergeAndTake(any())).thenThrow(primary);

        AssertionError thrown = assertThrows(AssertionError.class, () -> orchestrator.execute(request(42L)));

        assertEquals(primary, thrown);
        assertEquals(false, handlerCalled.get());
        verify(ledgerService).failToolCall(any(), any(), any(Long.class));
    }

    @Test
    void approvedInputMergeRuntimeFailureShouldNotAcknowledgeConsumptionOrExecuteHandler() {
        assertApprovedMergeFailure(new IllegalStateException("input already consumed"));
    }

    @Test
    void approvedInputMergeErrorShouldNotAcknowledgeConsumptionOrExecuteHandler() {
        assertApprovedMergeFailure(new AssertionError("merge error"));
    }

    @Test
    void approvedMergeRuntimeAndLedgerRuntimeFailureShouldStillReleaseConsumption() {
        IllegalStateException mergeFailure = new IllegalStateException("input already consumed");
        IllegalArgumentException ledgerFailure = new IllegalArgumentException("ledger unavailable");
        ApprovalFixture fixture = approvedFixture(mergeFailure);
        doThrow(ledgerFailure).when(ledgerService)
                .failApprovedToolBeforeExecution(any(), any(), any(Long.class));

        IllegalStateException thrown = assertThrows(IllegalStateException.class,
                () -> orchestrator.execute(fixture.request()));

        assertEquals(mergeFailure, thrown);
        assertEquals(ledgerFailure, thrown.getSuppressed()[0]);
        assertEquals(false, fixture.registry().isWaiting("approval-1"));
        assertEquals(false, handlerCalled.get());
    }

    @Test
    void fatalLedgerCleanupErrorsShouldWinAndRetainMergeFailure() {
        assertFatalLedgerCleanupWins(new TestVirtualMachineError());
        assertFatalLedgerCleanupWins(new ThreadDeath());
        assertFatalLedgerCleanupWins(new LinkageError("ledger linkage error"));
    }

    private void assertApprovedMergeFailure(Throwable failure) {
        mode = ToolMode.SUCCESS;
        AtomicBoolean acknowledged = new AtomicBoolean();
        AtomicBoolean released = new AtomicBoolean();
        AgentApprovalConsumption.Claim claim = new AgentApprovalConsumption.Claim() {
            @Override
            public boolean complete() {
                acknowledged.set(true);
                return true;
            }

            @Override
            public void release() {
                released.set(true);
            }
        };
        AgentToolExecutionRequest approvedRequest = prepareApprovedRequest(failure, () -> claim);
        lenient().when(ledgerService.failApprovedToolBeforeExecution(any(), any(), any(Long.class)))
                .thenAnswer(invocation -> {
                    AgentToolCall call = invocation.getArgument(0);
                    call.setStatus(AgentToolStatus.FAILED.name());
                    call.setErrorMessage(invocation.getArgument(1));
                    return call;
                });

        if (failure instanceof Error error) {
            assertEquals(error, assertThrows(error.getClass(), () -> orchestrator.execute(approvedRequest)));
        } else {
            assertEquals(AgentToolStatus.FAILED, orchestrator.execute(approvedRequest).getStatus());
        }

        assertEquals(false, acknowledged.get());
        assertEquals(true, released.get());
        assertEquals(false, handlerCalled.get());
        verify(ledgerService).failApprovedToolBeforeExecution(any(), any(), any(Long.class));
    }

    private void assertFatalLedgerCleanupWins(Error ledgerFailure) {
        IllegalStateException mergeFailure = new IllegalStateException("input already consumed");
        ApprovalFixture fixture = approvedFixture(mergeFailure);
        doThrow(ledgerFailure).when(ledgerService)
                .failApprovedToolBeforeExecution(any(), any(), any(Long.class));

        Error thrown = assertThrows(ledgerFailure.getClass(), () -> orchestrator.execute(fixture.request()));

        assertEquals(ledgerFailure, thrown);
        assertEquals(mergeFailure, thrown.getSuppressed()[0]);
        assertEquals(false, fixture.registry().isWaiting("approval-1"));
        assertEquals(false, handlerCalled.get());
    }

    private ApprovalFixture approvedFixture(Throwable mergeFailure) {
        AgentRuntimeApprovalRegistry registry = new AgentRuntimeApprovalRegistry();
        registry.register("approval-1");
        AgentRuntimeApprovalRegistry.ApprovalDelivery delivery = registry.reserve("approval-1")
                .orElseThrow()
                .deliver(AgentApprovalDecision.APPROVED);
        AgentToolExecutionRequest approvedRequest = prepareApprovedRequest(mergeFailure,
                () -> registry.beginConsumption("approval-1", AgentApprovalDecision.APPROVED).orElseThrow());
        return new ApprovalFixture(approvedRequest, registry, delivery);
    }

    private AgentToolExecutionRequest prepareApprovedRequest(Throwable mergeFailure,
                                                              AgentApprovalConsumption consumption) {
        AgentToolExecutionRequest approvedRequest = request(42L).toBuilder()
                .approvalId("approval-1")
                .approvalStatus(AgentApprovalStatus.APPROVED.name())
                .approvalConsumption(consumption)
                .build();
        AgentToolCall approvedCall = approvedCall(AgentToolStatus.WAITING_APPROVAL);
        when(policyService.decide(any(), any())).thenReturn(AgentPolicyResult.builder()
                .decision(AgentPolicyDecision.REQUIRE_APPROVAL)
                .risk(AgentToolRisk.READ)
                .reason("approval required")
                .build());
        when(ledgerService.validateToolExecutionApproval(any(), any())).thenReturn(approvedCall);
        when(ledgerService.recordApprovedToolResumed(any(), any(), any()))
                .thenReturn(approvedCall(AgentToolStatus.RUNNING));
        doThrow(mergeFailure).when(interactionInputService).mergeAndTake(any());
        return approvedRequest;
    }

    private void assertFatalScopedAndRestored(ToolMode executionMode, Class<? extends Error> errorType) {
        mode = executionMode;
        handlerCalled.set(false);
        handlerScope.set(null);
        AtomicReference<ScopeValues> restored = new AtomicReference<>();
        AgentRuntimeControl control = new AgentRuntimeControl("trace-1", "run-1", Clock.systemUTC());
        try {
            Error error = assertThrows(errorType, () -> new AgentRuntimeBlockingTaskRunner().run(
                    "workspace scope", Duration.ofSeconds(5), control, () -> {
                        AuthTokenRequestContext.bindWorkspaceId("previous-workspace");
                        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("previous-authenticated");
                        AuthTokenRequestContext.bindCollectorId("previous-collector");
                        try {
                            return orchestrator.execute(request(42L));
                        } finally {
                            restored.set(currentScope());
                            AuthTokenRequestContext.clear();
                        }
                    }));
            assertEquals(errorType, error.getClass());
        } finally {
            control.close();
        }
        assertEquals(new ScopeValues("workspace-a", "workspace-a", null), handlerScope.get());
        assertEquals(new ScopeValues("previous-workspace", "previous-authenticated", "previous-collector"),
                restored.get());
        assertEquals(true, handlerCalled.get());
    }

    private void assertScopedAndRestored(ToolMode executionMode) {
        mode = executionMode;
        handlerCalled.set(false);
        handlerScope.set(null);
        AtomicReference<ScopeValues> restored = new AtomicReference<>();
        AgentRuntimeBlockingTaskRunner runner = new AgentRuntimeBlockingTaskRunner();
        AgentRuntimeControl control = new AgentRuntimeControl("trace-1", "run-1", Clock.systemUTC());
        boolean errorPropagated = false;
        try {
            runner.run("workspace scope", Duration.ofSeconds(5), control, () -> {
                AuthTokenRequestContext.bindWorkspaceId("previous-workspace");
                AuthTokenRequestContext.bindAuthenticatedWorkspaceId("previous-authenticated");
                AuthTokenRequestContext.bindCollectorId("previous-collector");
                try {
                    return orchestrator.execute(request(42L));
                } finally {
                    restored.set(currentScope());
                    Thread.interrupted();
                    AuthTokenRequestContext.clear();
                }
            });
        } catch (AssertionError error) {
            errorPropagated = true;
            if (executionMode != ToolMode.ERROR) {
                throw error;
            }
        } finally {
            control.close();
        }
        assertEquals(new ScopeValues("workspace-a", "workspace-a", null), handlerScope.get());
        assertEquals(new ScopeValues("previous-workspace", "previous-authenticated", "previous-collector"),
                restored.get());
        assertEquals(true, handlerCalled.get());
        assertEquals(executionMode == ToolMode.ERROR, errorPropagated);
    }

    private AgentToolOutput executeHandler() {
        handlerCalled.set(true);
        handlerScope.set(currentScope());
        return switch (mode) {
            case SUCCESS -> AgentToolOutput.builder().status(AgentToolStatus.SUCCEEDED).modelContent("ok").build();
            case RUNTIME_EXCEPTION -> throw new IllegalStateException("handler failed");
            case ERROR -> throw new AssertionError("handler error");
            case VIRTUAL_MACHINE_ERROR -> throw new TestVirtualMachineError();
            case THREAD_DEATH -> throw new ThreadDeath();
            case LINKAGE_ERROR -> throw new LinkageError("handler linkage error");
            case INTERRUPT -> {
                Thread.currentThread().interrupt();
                yield AgentToolOutput.builder().status(AgentToolStatus.SUCCEEDED).modelContent("ok").build();
            }
        };
    }

    private ScopeValues currentScope() {
        return new ScopeValues(AuthTokenRequestContext.currentWorkspaceId(),
                AuthTokenRequestContext.currentAuthenticatedWorkspaceId(),
                AuthTokenRequestContext.currentCollectorId());
    }

    private AgentToolExecutionRequest request(long argumentMonitorId) {
        AgentTargetRef target = AgentTargetRef.builder()
                .monitorId(42L)
                .signal(AgentSignalRef.builder()
                        .type("metrics")
                        .query("basic.cpu")
                        .start(100L)
                        .end(200L)
                        .build())
                .build();
        return AgentToolExecutionRequest.builder()
                .sessionUid("ags-1")
                .runId(2L)
                .runUid("run-1")
                .runSessionId(1L)
                .workspaceId("workspace-a")
                .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .effectiveTarget(target)
                .toolName("monitor.get")
                .toolCallId("call-1")
                .arguments(Map.of("monitorId", argumentMonitorId))
                .build();
    }

    private AgentToolDescriptor descriptor() {
        return AgentToolDescriptor.builder()
                .name("monitor.get")
                .namespace("monitor")
                .description("Get monitor")
                .inputSchema("{\"type\":\"object\"}")
                .risk(AgentToolRisk.READ)
                .exposure(AgentToolExposure.MODEL_VISIBLE)
                .build();
    }

    private AgentToolCall runningCall() {
        return AgentToolCall.builder()
                .id(3L)
                .sessionId(1L)
                .sessionUid("ags-1")
                .runId(2L)
                .runUid("run-1")
                .toolCallId("call-1")
                .toolName("monitor.get")
                .risk(AgentToolRisk.READ.name())
                .policyDecision(AgentPolicyDecision.ALLOW.name())
                .status(AgentToolStatus.RUNNING.name())
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED.name())
                .inputJson("{}")
                .build();
    }

    private AgentToolCall approvedCall(AgentToolStatus status) {
        return AgentToolCall.builder()
                .id(3L)
                .sessionId(1L)
                .sessionUid("ags-1")
                .runId(2L)
                .runUid("run-1")
                .toolCallId("call-1")
                .toolName("monitor.get")
                .risk(AgentToolRisk.READ.name())
                .policyDecision(AgentPolicyDecision.REQUIRE_APPROVAL.name())
                .status(status.name())
                .approvalId("approval-1")
                .approvalStatus(AgentApprovalStatus.APPROVED.name())
                .inputJson("{}")
                .build();
    }

    @BeforeEach
    void stubAllowedExecution() {
        lenient().when(policyService.decide(any(), any())).thenReturn(AgentPolicyResult.builder()
                .decision(AgentPolicyDecision.ALLOW)
                .risk(AgentToolRisk.READ)
                .reason("allowed")
                .build());
        lenient().when(ledgerService.recordToolStarted(any(), any(), any())).thenAnswer(invocation -> runningCall());
        lenient().when(ledgerService.completeToolCall(any(), any(), any(Long.class))).thenAnswer(invocation -> {
            AgentToolCall call = invocation.getArgument(0);
            AgentToolOutput output = invocation.getArgument(1);
            call.setStatus(output.getStatus().name());
            call.setResultOutput(output.getModelContent());
            return call;
        });
        lenient().when(ledgerService.failToolCall(any(), any(), any(Long.class))).thenAnswer(invocation -> {
            AgentToolCall call = invocation.getArgument(0);
            call.setStatus(AgentToolStatus.FAILED.name());
            call.setErrorMessage(invocation.getArgument(1));
            return call;
        });
        lenient().when(interactionInputService.mergeAndTake(any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private enum ToolMode {
        SUCCESS,
        RUNTIME_EXCEPTION,
        ERROR,
        VIRTUAL_MACHINE_ERROR,
        THREAD_DEATH,
        LINKAGE_ERROR,
        INTERRUPT
    }

    private static final class TestVirtualMachineError extends VirtualMachineError {
    }

    private record ScopeValues(String workspaceId, String authenticatedWorkspaceId, String collectorId) {
    }

    private record ApprovalFixture(AgentToolExecutionRequest request, AgentRuntimeApprovalRegistry registry,
                                   AgentRuntimeApprovalRegistry.ApprovalDelivery delivery) {
    }
}
