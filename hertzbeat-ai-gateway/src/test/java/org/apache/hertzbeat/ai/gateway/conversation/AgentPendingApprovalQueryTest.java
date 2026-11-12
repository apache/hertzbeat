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

package org.apache.hertzbeat.ai.gateway.conversation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeApprovalRegistry;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolCallLedgerService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

class AgentPendingApprovalQueryTest {
    private final AgentRunService runs = mock(AgentRunService.class);
    private final AgentSessionService sessions = mock(AgentSessionService.class);
    private final AgentToolCallDao calls = mock(AgentToolCallDao.class);
    private final AgentToolCallLedgerService ledger = mock(AgentToolCallLedgerService.class);
    private final AgentToolRegistry tools = new AgentToolRegistry();
    private final AgentRuntimeApprovalRegistry waiters = new AgentRuntimeApprovalRegistry();
    private final GatewayEnvelope envelope =
            GatewayEnvelope.builder()
                    .channelId("web_ui")
                    .receivedAt(System.currentTimeMillis())
                    .workspaceId("default")
                    .actor(
                            AgentActor.builder()
                                    .type("USER")
                                    .id("alice")
                                    .roles(List.of("user"))
                                    .build())
                    .build();
    private final AgentPendingApprovalQuery query =
            new AgentPendingApprovalQuery(runs, sessions, calls, ledger, tools, waiters);
    private AgentToolCall row;

    @BeforeEach
    void setup() {
        when(runs.findRun("run_1"))
                .thenReturn(
                        Optional.of(
                                AgentRun.builder()
                                        .id(1L)
                                        .runUid("run_1")
                                        .sessionId(2L)
                                        .entryType("USER_INPUT")
                                        .status("RUNNING")
                                        .build()));
        when(sessions.findOwnedSession("2", envelope, AgentRuntimeEntryType.USER_INPUT))
                .thenReturn(
                        Optional.of(AgentSession.builder().id(2L).sessionUid("session_1").build()));
        row =
                AgentToolCall.builder()
                        .runId(1L)
                        .runUid("run_1")
                        .sessionId(2L)
                        .sessionUid("session_1")
                        .toolCallId("tool_1")
                        .toolName("monitor.create_batch")
                        .approvalId("approval_1")
                        .risk("CHANGE")
                        .policyDecision("REQUIRE_APPROVAL")
                        .status("WAITING_APPROVAL")
                        .approvalStatus("PENDING")
                        .approvalExpiresAt(LocalDateTime.now().plusMinutes(2))
                        .inputJson("SECRET-INPUT")
                        .resultOutput("SECRET-RESULT")
                        .build();
        when(calls.findByRunIdAndApprovalIdIsNotNullOrderByIdAsc(eq(1L), any()))
                .thenReturn(List.of(row));
        tools.register(
                new AgentToolRegistry.RegisteredTool(
                        AgentToolDescriptor.builder()
                                .name("monitor.create_batch")
                                .namespace("monitor")
                                .description("bounded batch")
                                .inputSchema("{}")
                                .risk(AgentToolRisk.CHANGE)
                                .exposure(AgentToolExposure.MODEL_ON_DEMAND)
                                .build(),
                        ignored -> null));
        when(ledger.canDecide(any(), any())).thenReturn(true);
    }

    @Test
    void reloadedApprovalSummaryUsesOnlyTheStoredBoundInput() {
        var args =
                java.util.Map.<String, Object>of(
                        "items",
                        java.util.List.of(
                                java.util.Map.of(
                                        "name",
                                        "PRIVATE_FREE_TEXT",
                                        "idempotencyKey",
                                        "PRIVATE_KEY",
                                        "url",
                                        "https://example.com/",
                                        "intervals",
                                        600)));
        row.setInputJson(JsonUtil.toJson(args));
        row.setInputHash(
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                        .normalizedArgumentsHash(args));
        waiters.register("approval_1");
        var restored = query.read("run_1", envelope).approvals().getFirst();
        assertEquals(AgentApprovalSummary.from(row), restored.summary());
        assertEquals(row.getInputHash(), restored.summary().inputHash());
        assertTrue(restored.summary().complete());
        assertFalse(JsonUtil.toJson(restored).contains("PRIVATE_"));
        verify(calls, never()).save(any());
    }

    @Test
    void restoresLiveApprovalWithoutDecidingOrLeakingInputs() {
        var waiter = waiters.register("approval_1");
        var view = query.read("run_1", envelope);
        assertTrue(view.approvals().getFirst().canDecide());
        assertEquals("WAITING_APPROVAL", view.approvals().getFirst().status());
        assertFalse(waiter.isDone());
        String json = JsonUtil.toJson(view);
        assertFalse(json.contains("SECRET"));
        assertFalse(json.contains("inputJson"));
        query.read("run_1", envelope);
        assertFalse(waiter.isDone());
        assertEquals("PENDING", row.getApprovalStatus());
        verify(calls, never()).save(any());
        verify(ledger, times(2)).canDecide(any(), any());
        verifyNoMoreInteractions(ledger);
    }

    @Test
    void rejectsForeignOwnerBeforeLedgerRead() {
        when(sessions.findOwnedSession("2", envelope, AgentRuntimeEntryType.USER_INPUT))
                .thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class, () -> query.read("run_1", envelope));
        verifyNoInteractions(calls, ledger);
    }

    @Test
    void unknownOrNonUserRunDoesNotReadLedger() {
        when(runs.findRun("run_1")).thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class, () -> query.read("run_1", envelope));
        verifyNoInteractions(sessions, calls, ledger);
    }

    @Test
    void missingWaiterIsVisibleButNotDecidable() {
        var approval = query.read("run_1", envelope).approvals().getFirst();
        assertEquals("UNAVAILABLE", approval.status());
        assertFalse(approval.canDecide());
        verifyNoInteractions(ledger);
    }

    @Test
    void expiryIsReadOnlyAndNeverEnablesDecision() {
        waiters.register("approval_1");
        row.setApprovalExpiresAt(LocalDateTime.now().minusSeconds(1));
        var approval = query.read("run_1", envelope).approvals().getFirst();
        assertEquals("EXPIRED", approval.status());
        assertFalse(approval.canDecide());
        assertEquals("PENDING", row.getApprovalStatus());
        verify(calls, never()).save(any());
        verifyNoInteractions(ledger);
    }

    @Test
    void missingExpiryAndTerminalRunFailClosed() {
        waiters.register("approval_1");
        row.setApprovalExpiresAt(null);
        assertFalse(query.read("run_1", envelope).approvals().getFirst().canDecide());
        row.setApprovalExpiresAt(LocalDateTime.now().plusMinutes(1));
        when(runs.findRun("run_1"))
                .thenReturn(
                        Optional.of(
                                AgentRun.builder()
                                        .id(1L)
                                        .runUid("run_1")
                                        .sessionId(2L)
                                        .entryType("USER_INPUT")
                                        .status("FAILED")
                                        .build()));
        assertEquals("UNAVAILABLE", query.read("run_1", envelope).approvals().getFirst().status());
    }

    @Test
    void changedPermissionOrPolicyCannotApprove() {
        waiters.register("approval_1");
        when(ledger.canDecide(any(), any())).thenReturn(false);
        assertFalse(query.read("run_1", envelope).approvals().getFirst().canDecide());
        row.setRisk("DANGEROUS");
        assertFalse(query.read("run_1", envelope).approvals().getFirst().canDecide());
    }

    @Test
    void foreignLedgerIdentityAndDecidedApprovalNeverBecomePending() {
        row.setSessionUid("other-session");
        assertTrue(query.read("run_1", envelope).approvals().isEmpty());
        row.setSessionUid("session_1");
        row.setApprovalStatus("REJECTED");
        var approval = query.read("run_1", envelope).approvals().getFirst();
        assertEquals("REJECTED", approval.status());
        assertFalse(approval.canDecide());
    }

    @Test
    void cancelledWaiterCannotBeRevivedByRecoveryOrLateApproval() {
        var waiter = waiters.register("approval_1");
        assertTrue(waiter.cancel(false));
        assertFalse(
                waiter.complete(
                        org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision.APPROVED));
        var view = query.read("run_1", envelope);
        assertEquals("UNAVAILABLE", view.approvals().getFirst().status());
        assertFalse(view.approvals().getFirst().canDecide());
        assertEquals("PENDING", row.getApprovalStatus());
        verifyNoInteractions(ledger);
        verify(calls, never()).save(any());
    }

    @Test
    void limitsProjectionAndFlagsTruncation() {
        when(calls.findByRunIdAndApprovalIdIsNotNullOrderByIdAsc(eq(1L), any()))
                .thenReturn(java.util.Collections.nCopies(65, row));
        var view = query.read("run_1", envelope);
        assertEquals(64, view.approvals().size());
        assertTrue(view.truncated());
    }
}
