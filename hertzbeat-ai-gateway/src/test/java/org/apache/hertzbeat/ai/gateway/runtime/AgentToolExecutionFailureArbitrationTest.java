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
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentTargetToolAuthorizer;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolCallLedgerService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolCompletionIndeterminateException;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionOrchestrator;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolOutput;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.junit.jupiter.api.Test;

/** Verifies handler and durable completion failures through the real bridge boundary. */
class AgentToolExecutionFailureArbitrationTest {

    @Test
    void handlerErrorShouldRemainPrimaryWhenFailurePersistenceAlsoFails() {
        AssertionError handlerFailure = new AssertionError("handler error");
        IllegalStateException ledgerFailure = new IllegalStateException("ledger unavailable");
        Harness harness = harness(AgentToolRisk.READ, ignored -> {
            throw handlerFailure;
        });
        doThrow(ledgerFailure).when(harness.ledger()).failToolCall(any(), any(), any(Long.class));

        AssertionError thrown = assertThrows(AssertionError.class, harness::execute);

        assertSame(handlerFailure, thrown);
        assertSame(ledgerFailure, thrown.getSuppressed()[0]);
    }

    @Test
    void fatalLedgerCleanupErrorsShouldWinOverHandlerError() {
        assertFatalCleanupWins(new TestVirtualMachineError());
        assertFatalCleanupWins(new ThreadDeath());
        assertFatalCleanupWins(new LinkageError("ledger linkage error"));
    }

    @Test
    void readCompletionPersistenceFailureShouldBeIndeterminateAndNeverMarkedFailed() {
        assertCompletionFailureIsIndeterminate(AgentToolRisk.READ);
    }

    @Test
    void changeCompletionPersistenceFailureShouldBeIndeterminateAndNeverMarkedFailed() {
        assertCompletionFailureIsIndeterminate(AgentToolRisk.CHANGE);
    }

    private void assertFatalCleanupWins(Error ledgerFailure) {
        AssertionError handlerFailure = new AssertionError("handler error");
        Harness harness = harness(AgentToolRisk.READ, ignored -> {
            throw handlerFailure;
        });
        doThrow(ledgerFailure).when(harness.ledger()).failToolCall(any(), any(), any(Long.class));

        Error thrown = assertThrows(ledgerFailure.getClass(), harness::execute);

        assertSame(ledgerFailure, thrown);
        assertSame(handlerFailure, thrown.getSuppressed()[0]);
    }

    private void assertCompletionFailureIsIndeterminate(AgentToolRisk risk) {
        AtomicInteger executions = new AtomicInteger();
        Harness harness = harness(risk, ignored -> {
            executions.incrementAndGet();
            return AgentToolOutput.builder().status(AgentToolStatus.SUCCEEDED).modelContent("ok").build();
        });
        IllegalStateException persistenceFailure = new IllegalStateException("completion unavailable");
        doThrow(persistenceFailure).when(harness.ledger()).completeToolCall(any(), any(), any(Long.class));

        AgentToolCompletionIndeterminateException thrown = assertThrows(
                AgentToolCompletionIndeterminateException.class, harness::execute);

        assertEquals(AgentToolCompletionIndeterminateException.MESSAGE, thrown.getMessage());
        assertSame(persistenceFailure, thrown.getSuppressed()[0]);
        assertEquals(1, executions.get());
        verify(harness.ledger(), never()).failToolCall(any(), any(), any(Long.class));
    }

    private Harness harness(AgentToolRisk risk,
                            Function<AgentToolExecutionContext, AgentToolOutput> handler) {
        String toolName = risk == AgentToolRisk.CHANGE ? "test.change" : "test.read";
        AgentToolDescriptor descriptor = AgentToolDescriptor.builder()
                .name(toolName)
                .namespace("test")
                .description("Test tool")
                .inputSchema("{\"type\":\"object\"}")
                .risk(risk)
                .exposure(AgentToolExposure.MODEL_VISIBLE)
                .build();
        AgentToolRegistry registry = new AgentToolRegistry();
        registry.register(new AgentToolRegistry.RegisteredTool(descriptor, handler));
        AgentPolicyService policy = mock(AgentPolicyService.class);
        when(policy.decide(any(), any())).thenReturn(AgentPolicyResult.builder()
                .decision(AgentPolicyDecision.ALLOW)
                .risk(risk)
                .reason("allowed")
                .build());
        AgentToolCallLedgerService ledger = mock(AgentToolCallLedgerService.class);
        when(ledger.recordToolStarted(any(), any(), any())).thenReturn(runningCall(toolName, risk));
        AgentInteractionInputService input = mock(AgentInteractionInputService.class);
        when(input.validateReference(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(input.mergeAndTake(any())).thenAnswer(invocation -> invocation.getArgument(0));
        AgentToolExecutionOrchestrator orchestrator = new AgentToolExecutionOrchestrator(
                registry, policy, ledger, input, new AgentTargetToolAuthorizer());
        AgentToolBridge bridge = new AgentToolBridge(registry, Clock.systemUTC(),
                new AgentRuntimeBlockingTaskRunner(), orchestrator, new AgentRuntimeApprovalRegistry());
        return new Harness(bridge, ledger, context(), toolCall(toolName),
                AgentRuntimeControl.forContext(context(), Clock.systemUTC()));
    }

    private AgentRuntimeContext context() {
        return AgentRuntimeContext.builder()
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .channelId("web-ui")
                .workspaceId("default")
                .receivedAt(1L)
                .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                .userMessage("execute tool")
                .sessionUid("session-1")
                .runId(1L)
                .runUid("run-1")
                .runSessionId(1L)
                .currentTimeIso("2026-08-14T00:00:00Z")
                .timezone("UTC")
                .traceId("trace-1")
                .build();
    }

    private AgentRuntimeToolCall toolCall(String toolName) {
        return AgentRuntimeToolCall.builder()
                .toolCallId("call-1")
                .toolName(toolName)
                .arguments(Map.of())
                .build();
    }

    private AgentToolCall runningCall(String toolName, AgentToolRisk risk) {
        return AgentToolCall.builder()
                .id(1L)
                .sessionId(1L)
                .sessionUid("session-1")
                .runId(1L)
                .runUid("run-1")
                .toolCallId("call-1")
                .toolName(toolName)
                .risk(risk.name())
                .policyDecision(AgentPolicyDecision.ALLOW.name())
                .status(AgentToolStatus.RUNNING.name())
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED.name())
                .inputJson("{}")
                .build();
    }

    private static AgentToolBridge.ExecutionListener listener() {
        return new AgentToolBridge.ExecutionListener() {
            @Override
            public void approvalRequested(AgentRuntimeToolCall toolCall,
                                          org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult result) {
            }

            @Override
            public void approvalCompleted(AgentRuntimeToolCall toolCall,
                                          org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult result,
                                          org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision decision) {
            }

            @Override
            public void toolEvent(AgentRuntimeToolCall toolCall, AgentRuntimeEvent event) {
            }
        };
    }

    private record Harness(AgentToolBridge bridge, AgentToolCallLedgerService ledger,
                           AgentRuntimeContext context, AgentRuntimeToolCall toolCall,
                           AgentRuntimeControl control) {

        private org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult execute() {
            try (control) {
                return bridge.execute(context, new AgentRuntimeProperties(), toolCall, control, listener());
            }
        }
    }

    private static final class TestVirtualMachineError extends VirtualMachineError {
    }
}
