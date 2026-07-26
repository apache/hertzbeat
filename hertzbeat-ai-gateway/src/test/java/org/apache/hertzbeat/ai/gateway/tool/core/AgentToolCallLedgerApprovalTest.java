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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Agent tool-call ledger approval lifecycle tests.
 */
@ExtendWith(MockitoExtension.class)
class AgentToolCallLedgerApprovalTest {

    private static final Map<String, Object> ARGUMENTS = Map.of("service", "nginx");
    private static final String INPUT_HASH = AgentToolPayloadHasher.normalizedArgumentsHash(ARGUMENTS);

    @Mock
    private AgentToolCallDao toolCallDao;

    private AgentToolCallLedgerService service;

    @BeforeEach
    void setUp() {
        service = new AgentToolCallLedgerService(toolCallDao);
    }

    @Test
    void approveShouldUpdatePendingToolCallApprovalState() {
        AgentToolCall toolCall = pendingToolCall();
        when(toolCallDao.findByApprovalId("agp_1")).thenReturn(Optional.of(toolCall));
        when(toolCallDao.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        AgentToolCall approved = service.approve("agp_1", actor("approver", "admin"));

        assertEquals(AgentApprovalStatus.APPROVED.name(), approved.getApprovalStatus());
        assertEquals("approver", approved.getApprovalActorId());
        assertNull(approved.getApprovalReason());
        assertNotNull(approved.getApprovalDecidedAt());
        assertEquals(AgentToolStatus.WAITING_APPROVAL.name(), approved.getStatus());
        verify(toolCallDao).save(toolCall);
    }

    @Test
    void rejectShouldPersistRejectedDecisionOnToolCall() {
        AgentToolCall toolCall = pendingToolCall();
        when(toolCallDao.findByApprovalId("agp_1")).thenReturn(Optional.of(toolCall));
        when(toolCallDao.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        AgentToolCall rejected = service.reject("agp_1", actor("approver", "admin"));

        assertEquals(AgentApprovalStatus.REJECTED.name(), rejected.getApprovalStatus());
        assertEquals(AgentToolStatus.DENIED.name(), rejected.getStatus());
        assertEquals("Agent tool approval rejected", rejected.getErrorMessage());
        assertNull(rejected.getApprovalReason());
    }

    @Test
    void nonAdminActorShouldNotApproveOrRejectAndShouldNotMutate() {
        AgentActor userOnly = actor("requester", "user");

        assertThrows(IllegalStateException.class, () -> service.approve("agc_1", userOnly));
        assertThrows(IllegalStateException.class, () -> service.reject("agc_1", userOnly));

        verifyNoInteractions(toolCallDao);
    }

    @Test
    void validateToolExecutionApprovalShouldApproveMatchingApprovedToolCall() {
        AgentToolCall toolCall = pendingToolCall();
        toolCall.setApprovalStatus(AgentApprovalStatus.APPROVED.name());
        when(toolCallDao.findByApprovalId("agp_1")).thenReturn(Optional.of(toolCall));

        AgentToolCall result = service.validateToolExecutionApproval(
            approvalRequest("agp_1", "agc_1", ARGUMENTS), changeDescriptor());

        assertEquals("agp_1", result.getApprovalId());
        assertEquals("agc_1", result.getToolCallId());
        assertEquals(AgentApprovalStatus.APPROVED.name(), result.getApprovalStatus());
        assertEquals(AgentToolStatus.WAITING_APPROVAL.name(), result.getStatus());
    }

    @Test
    void validateToolExecutionApprovalShouldKeepPendingToolCallWaiting() {
        when(toolCallDao.findByApprovalId("agp_1")).thenReturn(Optional.of(pendingToolCall()));

        AgentToolCall result = service.validateToolExecutionApproval(
            approvalRequest("agp_1", "agc_1", ARGUMENTS), changeDescriptor());

        assertEquals("agp_1", result.getApprovalId());
        assertEquals("agc_1", result.getToolCallId());
        assertEquals(AgentApprovalStatus.PENDING.name(), result.getApprovalStatus());
        assertEquals(AgentToolStatus.WAITING_APPROVAL.name(), result.getStatus());
    }

    @Test
    void validateToolExecutionApprovalShouldRejectMissingMismatchedAndExpireToolCalls() {
        when(toolCallDao.findByApprovalId("missing")).thenReturn(Optional.empty());

        AgentToolCall mismatch = pendingToolCall();
        mismatch.setApprovalStatus(AgentApprovalStatus.APPROVED.name());
        when(toolCallDao.findByApprovalId("agp_1")).thenReturn(Optional.of(mismatch));

        AgentToolCall expired = pendingToolCall();
        expired.setApprovalId("agp_expired");
        expired.setToolCallId("agc_expired");
        expired.setApprovalStatus(AgentApprovalStatus.APPROVED.name());
        expired.setApprovalExpiresAt(LocalDateTime.now().minusMinutes(1));
        when(toolCallDao.findByApprovalId("agp_expired")).thenReturn(Optional.of(expired));

        IllegalArgumentException missing = assertThrows(IllegalArgumentException.class,
            () -> service.validateToolExecutionApproval(
                approvalRequest("missing", "agc_1", ARGUMENTS), changeDescriptor()));
        IllegalStateException inputMismatch = assertThrows(IllegalStateException.class,
            () -> service.validateToolExecutionApproval(
                approvalRequest("agp_1", "agc_1", Map.of("service", "apache")), changeDescriptor()));
        AgentToolCall deniedExpired = service.validateToolExecutionApproval(
            approvalRequest("agp_expired", "agc_expired", ARGUMENTS), changeDescriptor());

        assertTrue(missing.getMessage().contains("not found"));
        assertTrue(inputMismatch.getMessage().contains("input hash"));
        assertEquals(AgentApprovalStatus.EXPIRED.name(), expired.getApprovalStatus());
        assertEquals(AgentToolStatus.DENIED.name(), expired.getStatus());
        assertEquals(AgentApprovalStatus.EXPIRED.name(), deniedExpired.getApprovalStatus());
        assertEquals(AgentToolStatus.DENIED.name(), deniedExpired.getStatus());
        verify(toolCallDao).save(expired);
    }

    private AgentToolCall pendingToolCall() {
        return AgentToolCall.builder()
            .id(30L)
            .approvalId("agp_1")
            .toolCallId("agc_1")
            .runId(10L)
            .runUid("run_1")
            .sessionId(20L)
            .sessionUid("ags_1")
            .toolName("ops.service_restart")
            .risk(AgentToolRisk.CHANGE.name())
            .policyDecision(AgentPolicyDecision.REQUIRE_APPROVAL.name())
            .status(AgentToolStatus.WAITING_APPROVAL.name())
            .inputJson("{\"service\":\"nginx\"}")
            .inputHash(INPUT_HASH)
            .approvalStatus(AgentApprovalStatus.PENDING.name())
            .approvalExpiresAt(LocalDateTime.now().plusMinutes(10))
            .build();
    }

    private AgentToolExecutionRequest approvalRequest(String approvalId, String toolCallId,
                                                      Map<String, Object> arguments) {
        return AgentToolExecutionRequest.builder()
            .sessionUid("ags_1")
            .runId(10L)
            .runUid("run_1")
            .runSessionId(20L)
            .actor(actor("requester", "admin"))
            .entryType(AgentRuntimeEntryType.USER_INPUT)
            .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
            .toolName("ops.service_restart")
            .approvalId(approvalId)
            .toolCallId(toolCallId)
            .arguments(arguments)
            .build();
    }

    private AgentToolDescriptor changeDescriptor() {
        return AgentToolDescriptor.builder()
            .name("ops.service_restart")
            .description("Restart service after approval")
            .inputSchema("{\"type\":\"object\"}")
            .risk(AgentToolRisk.CHANGE)
            .namespace("ops")
            .exposure(AgentToolExposure.MODEL_VISIBLE)
            .build();
    }

    private AgentActor actor(String id, String role) {
        return AgentActor.builder()
            .type("user")
            .id(id)
            .roles(List.of(role))
            .build();
    }
}
