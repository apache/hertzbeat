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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

class AgentProposalRevisionStateTest {
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
    void cancelledRunMakesEveryPendingProposalUnavailableWithoutApprovingAny() {
        var second =
                AgentToolCall.builder()
                        .runId(1L)
                        .runUid("run_1")
                        .sessionId(2L)
                        .sessionUid("session_1")
                        .toolCallId("tool_2")
                        .toolName(row.getToolName())
                        .approvalId("approval_2")
                        .risk(row.getRisk())
                        .policyDecision("REQUIRE_APPROVAL")
                        .status("WAITING_APPROVAL")
                        .approvalStatus("PENDING")
                        .approvalExpiresAt(java.time.LocalDateTime.now().plusMinutes(5))
                        .inputJson(row.getInputJson())
                        .inputHash(row.getInputHash())
                        .build();
        when(calls.findByRunIdAndApprovalIdIsNotNullOrderByIdAsc(eq(1L), any()))
                .thenReturn(List.of(row, second));
        waiters.register("approval_1");
        waiters.register("approval_2");
        when(runs.findRun("run_1"))
                .thenReturn(
                        Optional.of(
                                AgentRun.builder()
                                        .id(1L)
                                        .runUid("run_1")
                                        .sessionId(2L)
                                        .entryType("USER_INPUT")
                                        .status("CANCELLED")
                                        .build()));
        var result = query.read("run_1", envelope);
        assertEquals(2, result.approvals().size());
        for (var item : result.approvals()) {
            assertFalse(item.canDecide());
            assertEquals("UNAVAILABLE", item.status());
        }
        assertEquals("PENDING", row.getApprovalStatus());
        assertEquals("PENDING", second.getApprovalStatus());
        verify(calls, never()).save(any());
        verifyNoInteractions(ledger);
    }

    @Test
    void expiredProposalCannotAcquireDecisionCapabilityDuringRecovery() {
        row.setApprovalExpiresAt(java.time.LocalDateTime.now().minusSeconds(1));
        waiters.register("approval_1");
        var result = query.read("run_1", envelope).approvals().getFirst();
        assertEquals("EXPIRED", result.status());
        assertFalse(result.canDecide());
        verifyNoInteractions(ledger);
        verify(calls, never()).save(any());
    }
}
