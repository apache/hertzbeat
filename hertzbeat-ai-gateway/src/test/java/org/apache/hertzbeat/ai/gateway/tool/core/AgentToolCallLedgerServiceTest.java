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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

/**
 * Agent tool-call ledger service tests.
 */
@ExtendWith(MockitoExtension.class)
class AgentToolCallLedgerServiceTest {

    @Mock
    private AgentToolCallDao toolCallDao;

    @Test
    void recordToolStartedShouldBindToolCallToRunSessionAndApprovalStatus() {
        AgentToolCallLedgerService service = new AgentToolCallLedgerService(toolCallDao);
        when(toolCallDao.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        AgentToolExecutionRequest request = request();

        AgentToolCall toolCall = service.recordToolStarted(request, readDescriptor(), allowPolicy());

        assertTrue(toolCall.getToolCallId().startsWith("agc_"));
        assertEquals(2L, toolCall.getRunId());
        assertEquals(1L, toolCall.getSessionId());
        assertEquals("run_1", toolCall.getRunUid());
        assertEquals("ags_1", toolCall.getSessionUid());
        assertEquals("monitor.get", toolCall.getToolName());
        assertEquals("ALLOW", toolCall.getPolicyDecision());
        assertEquals("READ", toolCall.getRisk());
        assertEquals("RUNNING", toolCall.getStatus());
        assertEquals(AgentApprovalStatus.NOT_REQUIRED.name(), toolCall.getApprovalStatus());
        assertTrue(toolCall.getInputJson().contains("\"pageSize\":1"));
        assertTrue(toolCall.getInputJson().contains("\"password\":\"hunter2\""));
        assertEquals(AgentToolPayloadHasher.normalizedArgumentsHash(request.getArguments()), toolCall.getInputHash());
        assertFalse(toolCall.getInputJson().contains("[REDACTED]"));
    }

    @Test
    void recordToolWaitingApprovalShouldBindRequiredApprovalBoundary() {
        AgentToolCallLedgerService service = new AgentToolCallLedgerService(toolCallDao);
        when(toolCallDao.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        AgentToolExecutionRequest request = request();

        AgentToolCall toolCall = service.recordToolWaitingApproval(request, changeDescriptor(), requireApprovalPolicy());

        assertEquals(AgentToolStatus.WAITING_APPROVAL.name(), toolCall.getStatus());
        assertEquals(AgentPolicyDecision.REQUIRE_APPROVAL.name(), toolCall.getPolicyDecision());
        assertEquals(AgentApprovalStatus.PENDING.name(), toolCall.getApprovalStatus());
        assertTrue(toolCall.getApprovalExpiresAt().isAfter(java.time.LocalDateTime.now()));
    }

    @Test
    void recordApprovedToolResumedShouldReuseApprovedPendingToolCall() {
        AgentToolCallLedgerService service = new AgentToolCallLedgerService(toolCallDao);
        AgentToolExecutionRequest request = request().toBuilder()
            .toolName("restart_monitor")
            .approvalId("agp_pending")
            .toolCallId("agc_pending")
            .approvalStatus(AgentApprovalStatus.APPROVED.name())
            .build();
        AgentToolCall pending = AgentToolCall.builder()
            .approvalId("agp_pending")
            .toolCallId("agc_pending")
            .runId(2L)
            .runUid("run_1")
            .sessionId(1L)
            .sessionUid("ags_1")
            .toolName("restart_monitor")
            .risk(AgentToolRisk.CHANGE.name())
            .policyDecision(AgentPolicyDecision.REQUIRE_APPROVAL.name())
            .status(AgentToolStatus.WAITING_APPROVAL.name())
            .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(request.getArguments()))
            .approvalStatus(AgentApprovalStatus.APPROVED.name())
            .build();
        when(toolCallDao.findByApprovalId("agp_pending")).thenReturn(Optional.of(pending));
        when(toolCallDao.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        AgentToolCall started = service.recordApprovedToolResumed(request, changeDescriptor(), approvedChangePolicy());

        assertSame(pending, started);
        assertEquals(AgentToolStatus.RUNNING.name(), started.getStatus());
        assertEquals("agp_pending", started.getApprovalId());
        assertEquals("agc_pending", started.getToolCallId());
        assertEquals(AgentApprovalStatus.APPROVED.name(), started.getApprovalStatus());
        assertEquals(AgentPolicyDecision.ALLOW.name(), started.getPolicyDecision());
        assertTrue(started.getInputJson().contains("\"pageSize\":1"));
    }

    @Test
    void findToolCallShouldDelegateRawUidToDao() {
        AgentToolCallLedgerService service = new AgentToolCallLedgerService(toolCallDao);
        AgentToolCall toolCall = AgentToolCall.builder().toolCallId(" agc_1 ").build();
        when(toolCallDao.findByRunIdAndToolCallId(1L, " agc_1 ")).thenReturn(Optional.of(toolCall));

        Optional<AgentToolCall> result = service.findToolCall(1L, " agc_1 ");

        assertSame(toolCall, result.orElseThrow());
        verify(toolCallDao).findByRunIdAndToolCallId(1L, " agc_1 ");
    }

    @Test
    void findRunToolCallsShouldQueryByRunId() {
        AgentToolCallLedgerService service = new AgentToolCallLedgerService(toolCallDao);
        PageRequest pageable = PageRequest.of(0, 20);
        AgentToolCall toolCall = AgentToolCall.builder()
            .toolCallId("agc_1")
            .runId(2L)
            .runUid("run_1")
            .build();
        Page<AgentToolCall> page = new PageImpl<>(List.of(toolCall), pageable, 1);
        when(toolCallDao.findByRunIdOrderByGmtCreateAsc(2L, pageable)).thenReturn(page);

        Page<AgentToolCall> result = service.findRunToolCalls(2L, pageable);

        assertSame(page, result);
        assertEquals("run_1", result.getContent().get(0).getRunUid());
    }

    @Test
    void completeAndFailShouldStoreModelOutputAndSafeErrors() {
        AgentToolCallLedgerService service = new AgentToolCallLedgerService(toolCallDao);
        when(toolCallDao.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        AgentToolCall completedCall = AgentToolCall.builder()
            .toolCallId("agc_1")
            .runId(2L)
            .runUid("run_1")
            .sessionId(1L)
            .build();
        AgentToolCall failedCall = AgentToolCall.builder()
            .toolCallId("agc_2")
            .runId(2L)
            .runUid("run_1")
            .sessionId(1L)
            .build();
        AgentToolCall failedOutputCall = AgentToolCall.builder()
            .toolCallId("agc_3")
            .runId(2L)
            .runUid("run_1")
            .sessionId(1L)
            .build();

        AgentToolCall completed = service.completeToolCall(completedCall, AgentToolOutput.builder()
            .status(AgentToolStatus.SUCCEEDED)
            .modelContent("ok password=hunter2")
            .build(), 10L);
        AgentToolCall failedOutput = service.completeToolCall(failedOutputCall, AgentToolOutput.builder()
            .status(AgentToolStatus.FAILED)
            .errorMessage("handler failed token=abc123")
            .build(), 12L);
        AgentToolCall failed = service.failToolCall(failedCall, "failed token=abc123", 11L);

        assertEquals(10L, completed.getElapsedMs());
        assertEquals(2L, completed.getRunId());
        assertEquals("run_1", completed.getRunUid());
        assertEquals(1L, completed.getSessionId());
        assertEquals("ok password=hunter2", completed.getResultOutput());
        assertEquals(AgentToolStatus.FAILED.name(), failedOutput.getStatus());
        assertFalse(failedOutput.getErrorMessage().contains("abc123"));
        assertEquals(2L, failed.getRunId());
        assertEquals("run_1", failed.getRunUid());
        assertFalse(failed.getErrorMessage().contains("abc123"));
    }

    private AgentToolExecutionRequest request() {
        Map<String, Object> arguments = new LinkedHashMap<>();
        arguments.put("pageSize", 1);
        arguments.put("password", "hunter2");
        return AgentToolExecutionRequest.builder()
            .sessionUid("ags_1")
            .runId(2L)
            .runUid("run_1")
            .runSessionId(1L)
            .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
            .entryType(AgentRuntimeEntryType.USER_INPUT)
            .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
            .toolName("monitor.get")
            .toolCallId("agc_monitor_get")
            .arguments(arguments)
            .build();
    }

    private AgentToolDescriptor readDescriptor() {
        return AgentToolDescriptor.builder()
            .name("monitor.get")
            .description("Read monitor data")
            .inputSchema("{\"type\":\"object\"}")
            .risk(AgentToolRisk.READ)
            .namespace("monitor")
            .exposure(AgentToolExposure.MODEL_VISIBLE)
            .build();
    }

    private AgentToolDescriptor changeDescriptor() {
        return AgentToolDescriptor.builder()
            .name("restart_monitor")
            .description("Restart monitor")
            .inputSchema("{\"type\":\"object\"}")
            .risk(AgentToolRisk.CHANGE)
            .namespace("restart")
            .exposure(AgentToolExposure.MODEL_VISIBLE)
            .build();
    }

    private AgentPolicyResult allowPolicy() {
        return AgentPolicyResult.builder()
            .decision(AgentPolicyDecision.ALLOW)
            .risk(AgentToolRisk.READ)
            .reason("allowed")
            .build();
    }

    private AgentPolicyResult requireApprovalPolicy() {
        return AgentPolicyResult.builder()
            .decision(AgentPolicyDecision.REQUIRE_APPROVAL)
            .risk(AgentToolRisk.CHANGE)
            .reason("approval required")
            .build();
    }

    private AgentPolicyResult approvedChangePolicy() {
        return AgentPolicyResult.builder()
            .decision(AgentPolicyDecision.ALLOW)
            .risk(AgentToolRisk.CHANGE)
            .reason("approved")
            .build();
    }
}
