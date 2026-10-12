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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalConsumption;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionOrchestrator;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolOutput;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.junit.jupiter.api.Test;

/** Approval delivery must remain provisional until durable tool resume starts. */
class AgentToolBridgeApprovalConsumptionTest {

    @Test
    void stopAfterDeliveryBeforeResumeShouldRejectConsumptionAndNeverExecuteAgain() throws Exception {
        AgentToolRegistry tools = new AgentToolRegistry();
        tools.register(new AgentToolRegistry.RegisteredTool(descriptor(), ignored -> AgentToolOutput.builder()
                .status(AgentToolStatus.SUCCEEDED)
                .modelContent("ok")
                .build()));
        AgentToolExecutionOrchestrator orchestrator = mock(AgentToolExecutionOrchestrator.class);
        when(orchestrator.execute(any())).thenReturn(waitingResult());
        AgentRuntimeApprovalRegistry approvals = new AgentRuntimeApprovalRegistry();
        AgentToolBridge bridge = new AgentToolBridge(tools, Clock.systemUTC(),
                new AgentRuntimeBlockingTaskRunner(), orchestrator, approvals);
        AgentRuntimeContext context = context();
        AgentRuntimeControl control = AgentRuntimeControl.forContext(context, Clock.systemUTC());
        CountDownLatch requested = new CountDownLatch(1);
        AgentToolBridge.ExecutionListener listener = new AgentToolBridge.ExecutionListener() {
            @Override
            public void approvalRequested(AgentRuntimeToolCall toolCall, AgentToolExecutionResult result) {
                requested.countDown();
            }

            @Override
            public void approvalCompleted(AgentRuntimeToolCall toolCall, AgentToolExecutionResult result,
                                          AgentApprovalDecision decision) {
                control.stop("stopped before durable resume");
            }

            @Override
            public void toolEvent(AgentRuntimeToolCall toolCall, AgentRuntimeEvent event) {
            }
        };

        try (control; var executor = Executors.newSingleThreadExecutor()) {
            var runtime = executor.submit(() -> bridge.execute(context, new AgentRuntimeProperties(), toolCall(),
                    control, listener));
            assertTrue(requested.await(5, TimeUnit.SECONDS));
            var reservation = approvals.reserve("approval-1").orElseThrow();
            var delivery = reservation.deliver(AgentApprovalDecision.APPROVED);

            assertTrue(delivery.accepted());
            assertThrows(ExecutionException.class, () -> runtime.get(5, TimeUnit.SECONDS));
            assertFalse(delivery.awaitConsumption(Duration.ofMillis(100)));
        }

        verify(orchestrator, times(1)).execute(any());
        assertFalse(approvals.isWaiting("approval-1"));
    }

    @Test
    void rejectedDecisionCancelledAfterClaimShouldReleaseAndStop() throws Exception {
        AgentToolRegistry tools = new AgentToolRegistry();
        tools.register(new AgentToolRegistry.RegisteredTool(descriptor(), ignored -> AgentToolOutput.builder()
                .status(AgentToolStatus.SUCCEEDED)
                .modelContent("ok")
                .build()));
        AgentToolExecutionOrchestrator orchestrator = mock(AgentToolExecutionOrchestrator.class);
        when(orchestrator.execute(any())).thenReturn(waitingResult());
        CancelAfterClaimRegistry approvals = new CancelAfterClaimRegistry();
        AgentToolBridge bridge = new AgentToolBridge(tools, Clock.systemUTC(),
                new AgentRuntimeBlockingTaskRunner(), orchestrator, approvals);
        AgentRuntimeContext context = context();
        AgentRuntimeControl control = AgentRuntimeControl.forContext(context, Clock.systemUTC());
        CountDownLatch requested = new CountDownLatch(1);
        AgentToolBridge.ExecutionListener listener = new AgentToolBridge.ExecutionListener() {
            @Override
            public void approvalRequested(AgentRuntimeToolCall toolCall, AgentToolExecutionResult result) {
                requested.countDown();
            }

            @Override
            public void approvalCompleted(AgentRuntimeToolCall toolCall, AgentToolExecutionResult result,
                                          AgentApprovalDecision decision) {
            }

            @Override
            public void toolEvent(AgentRuntimeToolCall toolCall, AgentRuntimeEvent event) {
            }
        };

        try (control; var executor = Executors.newSingleThreadExecutor()) {
            var runtime = executor.submit(() -> bridge.execute(context, new AgentRuntimeProperties(), toolCall(),
                    control, listener));
            assertTrue(requested.await(5, TimeUnit.SECONDS));
            var delivery = approvals.reserve("approval-1").orElseThrow()
                    .deliver(AgentApprovalDecision.REJECTED);

            assertTrue(delivery.accepted());
            assertThrows(ExecutionException.class, () -> runtime.get(5, TimeUnit.SECONDS));
            assertFalse(delivery.awaitConsumption(Duration.ofMillis(100)));
        }

        verify(orchestrator, times(1)).execute(any());
        assertFalse(approvals.isWaiting("approval-1"));
    }

    private AgentRuntimeContext context() {
        return AgentRuntimeContext.builder()
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .channelId("web-ui")
                .workspaceId("default")
                .receivedAt(1L)
                .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                .userMessage("run approved tool")
                .sessionUid("session-1")
                .runId(1L)
                .runUid("run-1")
                .runSessionId(1L)
                .currentTimeIso("2026-08-14T00:00:00Z")
                .timezone("UTC")
                .traceId("trace-1")
                .build();
    }

    private AgentRuntimeToolCall toolCall() {
        return AgentRuntimeToolCall.builder()
                .toolCallId("call-1")
                .toolName("monitor.change")
                .arguments(Map.of())
                .build();
    }

    private AgentToolDescriptor descriptor() {
        return AgentToolDescriptor.builder()
                .name("monitor.change")
                .description("Change monitor state.")
                .inputSchema("{\"type\":\"object\"}")
                .risk(AgentToolRisk.CHANGE)
                .namespace("monitor")
                .exposure(AgentToolExposure.MODEL_VISIBLE)
                .build();
    }

    private AgentToolExecutionResult waitingResult() {
        return AgentToolExecutionResult.builder()
                .toolCallId("call-1")
                .approvalId("approval-1")
                .toolName("monitor.change")
                .status(AgentToolStatus.WAITING_APPROVAL)
                .decision(AgentPolicyDecision.REQUIRE_APPROVAL)
                .risk(AgentToolRisk.CHANGE)
                .approvalStatus(AgentApprovalStatus.PENDING)
                .build();
    }

    private static final class CancelAfterClaimRegistry extends AgentRuntimeApprovalRegistry {

        private CompletableFuture<AgentApprovalDecision> waiter;

        @Override
        public CompletableFuture<AgentApprovalDecision> register(String approvalId) {
            waiter = super.register(approvalId);
            return waiter;
        }

        @Override
        public Optional<AgentApprovalConsumption.Claim> beginConsumption(
                String approvalId, AgentApprovalDecision decision) {
            Optional<AgentApprovalConsumption.Claim> consumption = super.beginConsumption(approvalId, decision);
            waiter.cancel(false);
            return consumption;
        }
    }
}
