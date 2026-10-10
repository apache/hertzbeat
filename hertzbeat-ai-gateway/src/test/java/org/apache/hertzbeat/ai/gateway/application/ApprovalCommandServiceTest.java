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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ApprovalDecisionCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeApprovalRegistry;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolCallLedgerService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.junit.jupiter.api.Test;

/** Approval command coordination tests. */
class ApprovalCommandServiceTest {

    @Test
    void cancellationDuringDurableDecisionShouldFailAndCompensateUnconsumedApproval() throws Exception {
        AgentToolCallLedgerService ledger = mock(AgentToolCallLedgerService.class);
        AgentRuntimeApprovalRegistry registry = new AgentRuntimeApprovalRegistry();
        ApprovalCommandService service = new ApprovalCommandService(ledger, registry, Duration.ofSeconds(1));
        AgentToolCall approval = approval();
        AgentToolCall terminal = terminalApproval();
        var waiter = registry.register(approval.getApprovalId());
        CountDownLatch transactionEntered = new CountDownLatch(1);
        CountDownLatch allowCommit = new CountDownLatch(1);
        doAnswer(invocation -> {
            transactionEntered.countDown();
            assertTrue(allowCommit.await(5, TimeUnit.SECONDS));
            return approval;
        }).when(ledger).decideApproval(any(), any(), any(), any());
        when(ledger.terminalizeUnconsumedApproval(any(), any(), any(), any())).thenReturn(terminal);

        try (ExecutorService executor = Executors.newSingleThreadExecutor()) {
            var response = executor.submit(() -> service.decide(command()));
            assertTrue(transactionEntered.await(5, TimeUnit.SECONDS));
            assertFalse(waiter.cancel(false));
            allowCommit.countDown();
            assertEquals("failed", ((java.util.Map<?, ?>) response.get().body()).get("status"));
        }
        assertTrue(waiter.isCancelled());
        assertFalse(registry.isWaiting(approval.getApprovalId()));
        verify(ledger).terminalizeUnconsumedApproval(any(), any(), any(), any());
    }

    @Test
    void deliveredDecisionWithoutConsumptionShouldTimeoutAndCompensate() {
        AgentToolCallLedgerService ledger = mock(AgentToolCallLedgerService.class);
        AgentRuntimeApprovalRegistry registry = new AgentRuntimeApprovalRegistry();
        ApprovalCommandService service = new ApprovalCommandService(ledger, registry, Duration.ofMillis(20));
        AgentToolCall approval = approval();
        AgentToolCall terminal = terminalApproval();
        registry.register(approval.getApprovalId());
        when(ledger.decideApproval(any(), any(), any(), any())).thenReturn(approval);
        when(ledger.terminalizeUnconsumedApproval(any(), any(), any(), any())).thenReturn(terminal);

        var response = service.decide(command());

        assertEquals("failed", ((java.util.Map<?, ?>) response.body()).get("status"));
        assertFalse(registry.isWaiting(approval.getApprovalId()));
        assertTrue(registry.beginConsumption(
                approval.getApprovalId(), AgentApprovalDecision.APPROVED).isEmpty());
    }

    @Test
    void cancellationRequestedDuringReservationShouldBeRealizedOnRelease() {
        AgentRuntimeApprovalRegistry registry = new AgentRuntimeApprovalRegistry();
        var waiter = registry.register("approval-1");
        var reservation = registry.reserve("approval-1").orElseThrow();

        assertFalse(waiter.cancel(false));
        reservation.release();

        assertTrue(waiter.isCancelled());
        assertTrue(registry.reserve("approval-1").isEmpty());
    }

    @Test
    void runtimeFailureShouldReleaseReservationWithoutCompletingWaiter() {
        assertDecisionFailureReleasesReservation(new IllegalStateException("transaction failed"));
    }

    @Test
    void errorShouldReleaseReservationWithoutCompletingWaiter() {
        assertDecisionFailureReleasesReservation(new AssertionError("transaction failed"));
    }

    @Test
    void interruptedWaitShouldKeepCommittedConsumptionAndNeverCompensate() {
        AgentToolCallLedgerService ledger = mock(AgentToolCallLedgerService.class);
        InterruptAfterConsumptionRegistry registry = new InterruptAfterConsumptionRegistry();
        ApprovalCommandService service = new ApprovalCommandService(ledger, registry, Duration.ofSeconds(1));
        AgentToolCall approval = approval();
        registry.register(approval.getApprovalId());
        when(ledger.decideApproval(any(), any(), any(), any())).thenReturn(approval);

        try {
            var response = service.decide(command());

            assertEquals("completed", ((java.util.Map<?, ?>) response.body()).get("status"));
            assertTrue(Thread.currentThread().isInterrupted());
            assertFalse(registry.isWaiting(approval.getApprovalId()));
            verify(ledger, never()).terminalizeUnconsumedApproval(any(), any(), any(), any());
        } finally {
            Thread.interrupted();
        }
    }

    private void assertDecisionFailureReleasesReservation(Throwable failure) {
        AgentToolCallLedgerService ledger = mock(AgentToolCallLedgerService.class);
        AgentRuntimeApprovalRegistry registry = new AgentRuntimeApprovalRegistry();
        ApprovalCommandService service = new ApprovalCommandService(ledger, registry);
        var waiter = registry.register("approval-1");
        doThrow(failure).when(ledger).decideApproval(any(), any(), any(), any());

        assertThrows(failure.getClass(), () -> service.decide(command()));

        assertTrue(registry.isWaiting("approval-1"));
        assertFalse(waiter.isDone());
        var reservation = registry.reserve("approval-1").orElseThrow();
        reservation.release();
        assertTrue(waiter.cancel(false));
    }

    private ApprovalDecisionCommand command() {
        return ApprovalDecisionCommand.builder()
                .envelope(GatewayEnvelope.builder().channelId("web-ui").receivedAt(1L).workspaceId("default")
                        .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                        .build())
                .replyMode(ReplyMode.FINAL_ONLY)
                .commandId("command-1")
                .originEntryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalId("approval-1")
                .decision(AgentApprovalDecision.APPROVED)
                .build();
    }

    private AgentToolCall approval() {
        return AgentToolCall.builder().approvalId("approval-1").sessionUid("session-1").runUid("run-1").build();
    }

    private AgentToolCall terminalApproval() {
        return AgentToolCall.builder()
                .approvalId("approval-1")
                .sessionUid("session-1")
                .runUid("run-1")
                .status(AgentToolStatus.DENIED.name())
                .approvalStatus(AgentApprovalStatus.EXPIRED.name())
                .build();
    }

    private static final class InterruptAfterConsumptionRegistry extends AgentRuntimeApprovalRegistry {

        @Override
        protected CompletableFuture<Boolean> newConsumptionFuture() {
            return new CompletableFuture<>() {
                @Override
                public Boolean get(long timeout, TimeUnit unit) throws InterruptedException {
                    var claim = beginConsumption("approval-1", AgentApprovalDecision.APPROVED).orElseThrow();
                    if (!claim.complete()) {
                        throw new IllegalStateException("approval consumption must complete");
                    }
                    throw new InterruptedException("interrupt after completion");
                }
            };
        }
    }
}
