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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry.RegisteredTool;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for the Agent tool registry and execution orchestrator.
 */
@ExtendWith(MockitoExtension.class)
class AgentToolRegistryExecutionTest {

    private static final LocalDateTime APPROVAL_EXPIRES_AT = LocalDateTime.parse("2026-04-20T12:00:00");

    @Mock
    private AgentPolicyService policyService;

    @Mock
    private AgentToolCallLedgerService toolCallLedgerService;

    @Mock
    private AgentInteractionInputService interactionInputService;

    private final AtomicReference<AgentToolExecutionContext> monitorContext = new AtomicReference<>();
    private final AtomicBoolean changeExecuted = new AtomicBoolean();
    private AgentToolRegistry registry;
    private AgentToolExecutionOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        lenient().when(interactionInputService.validateReference(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(interactionInputService.mergeAndTake(any())).thenAnswer(invocation -> invocation.getArgument(0));
        registry = new AgentToolRegistry();
        registry.register(handler(
            descriptor("monitor.get", "Get monitor summary.", AgentToolRisk.READ),
            invocation -> {
                monitorContext.set(invocation);
                return output(AgentToolStatus.SUCCEEDED, "{\"status\":\"monitor-ok\"}");
            }));
        registry.register(handler(
            descriptor("remote.probe_port", "Probe target port.", AgentToolRisk.READ),
            invocation -> output(AgentToolStatus.SUCCEEDED, "{\"status\":\"remote-ok\"}")));
        registry.register(handler(
            descriptor("ops.alert_silence", "Create approved alert silence.", AgentToolRisk.CHANGE),
            invocation -> {
                changeExecuted.set(true);
                return output(AgentToolStatus.SUCCEEDED, "{\"status\":\"change-ok\"}");
            }));
        orchestrator = new AgentToolExecutionOrchestrator(
                registry, policyService, toolCallLedgerService, interactionInputService);
        stubLedger();
    }

    @Test
    void listToolsShouldExposeOnlyRegisteredOperationsCatalog() {
        Map<String, AgentToolDescriptor> descriptors = registry.descriptors().stream()
            .collect(java.util.stream.Collectors.toMap(AgentToolDescriptor::getName, descriptor -> descriptor));

        assertEquals(List.of("monitor.get", "remote.probe_port", "ops.alert_silence"),
            registry.descriptors().stream().map(AgentToolDescriptor::getName).toList());
        assertFalse(descriptors.containsKey("legacy.monitor_query"));
        assertFalse(descriptors.containsKey("legacy.service_restart"));
        AgentToolDescriptor remote = descriptors.get("remote.probe_port");
        assertNotNull(remote);
        assertEquals("remote", remote.getNamespace());
        assertEquals(AgentToolRisk.READ, remote.getRisk());
        assertEquals(AgentToolExposure.MODEL_VISIBLE, remote.getExposure());

        AgentToolDescriptor change = descriptors.get("ops.alert_silence");
        assertNotNull(change);
        assertEquals(AgentToolRisk.CHANGE, change.getRisk());
    }

    @Test
    void orchestratorShouldExecuteRegisteredHandler() {
        when(policyService.decide(any(AgentActor.class), any(AgentToolDescriptor.class)))
            .thenReturn(policy(AgentPolicyDecision.ALLOW, AgentToolRisk.READ, "allowed"));

        AgentToolExecutionResult result = orchestrator.execute(invocation("monitor.get", Map.of("monitorId", 10L)));

        assertEquals(AgentToolStatus.SUCCEEDED, result.getStatus());
        assertEquals(AgentPolicyDecision.ALLOW, result.getDecision());
        assertEquals("monitor.get", result.getToolName());
        assertEquals("{\"status\":\"monitor-ok\"}", result.getOutput());
        AgentToolExecutionContext context = monitorContext.get();
        assertNotNull(context);
        assertEquals("monitor.get", context.getRequest().getToolName());
        assertEquals(10L, context.getRequest().getArguments().get("monitorId"));
        verify(toolCallLedgerService).recordToolStarted(any(), any(), any());
        verify(toolCallLedgerService).completeToolCall(any(), any(), any(Long.class));
    }

    @Test
    void orchestratorShouldReturnSavedFailedToolCallWhenHandlerOutputFails() {
        registry.register(handler(
            descriptor("ops.fail_check", "Return a failed tool output.", AgentToolRisk.READ),
            invocation -> AgentToolOutput.builder()
                .status(AgentToolStatus.FAILED)
                .errorMessage("handler failed")
                .build()));
        when(policyService.decide(any(AgentActor.class), any(AgentToolDescriptor.class)))
            .thenReturn(policy(AgentPolicyDecision.ALLOW, AgentToolRisk.READ, "allowed"));

        AgentToolExecutionResult result = orchestrator.execute(invocation("ops.fail_check", Map.of()));

        assertEquals(AgentToolStatus.FAILED, result.getStatus());
        assertEquals(AgentPolicyDecision.ALLOW, result.getDecision());
        assertEquals("handler failed", result.getErrorMessage());
        verify(toolCallLedgerService).completeToolCall(any(), any(), any(Long.class));
        verify(toolCallLedgerService, never()).failToolCall(any(), any(), any(Long.class));
    }

    @Test
    void changeToolShouldRecordWaitingApprovalBeforeExecutingHandler() {
        when(policyService.decide(any(AgentActor.class), any(AgentToolDescriptor.class)))
            .thenReturn(policy(AgentPolicyDecision.REQUIRE_APPROVAL, AgentToolRisk.CHANGE, "approval required"));

        AgentToolExecutionResult result = orchestrator.execute(invocation("ops.alert_silence",
            Map.of("alertId", 20L)));

        assertEquals(AgentToolStatus.WAITING_APPROVAL, result.getStatus());
        assertEquals(AgentPolicyDecision.REQUIRE_APPROVAL, result.getDecision());
        assertEquals("agc_ops_alert_silence", result.getToolCallId());
        assertEquals(AgentApprovalStatus.PENDING, result.getApprovalStatus());
        assertFalse(changeExecuted.get());
        verify(toolCallLedgerService).recordToolWaitingApproval(any(), any(), any());
        verify(toolCallLedgerService, never()).validateToolExecutionApproval(any(), any());
    }

    @Test
    void nonInteractiveRunShouldDenyApprovalRequiredToolWithoutCreatingApproval() {
        when(policyService.decide(any(AgentActor.class), any(AgentToolDescriptor.class)))
            .thenReturn(policy(AgentPolicyDecision.REQUIRE_APPROVAL, AgentToolRisk.CHANGE, "approval required"));
        AgentToolExecutionRequest request = invocation("ops.alert_silence", Map.of("alertId", 20L)).toBuilder()
            .approvalHandling(AgentApprovalHandling.DENY)
            .build();

        AgentToolExecutionResult result = orchestrator.execute(request);

        assertEquals(AgentToolStatus.DENIED, result.getStatus());
        assertEquals(AgentPolicyDecision.DENY, result.getDecision());
        assertEquals(AgentApprovalStatus.NOT_REQUIRED, result.getApprovalStatus());
        assertNull(result.getApprovalId());
        assertEquals(AgentToolExecutionOrchestrator.NON_INTERACTIVE_APPROVAL_DENIAL_REASON,
            result.getErrorMessage());
        assertFalse(changeExecuted.get());
        verify(toolCallLedgerService).recordToolDenied(any(), any(), any());
        verify(toolCallLedgerService, never()).recordToolWaitingApproval(any(), any(), any());
        verify(toolCallLedgerService, never()).validateToolExecutionApproval(any(), any());
    }

    @Test
    void scheduledRunShouldDenyChangeToolWithoutRequestingApproval() {
        when(policyService.decide(any(AgentActor.class), any(AgentToolDescriptor.class)))
            .thenReturn(policy(AgentPolicyDecision.REQUIRE_APPROVAL, AgentToolRisk.CHANGE, "approval required"));
        AgentToolExecutionRequest request = invocation("ops.alert_silence", Map.of("alertId", 20L)).toBuilder()
            .entryType(AgentRuntimeEntryType.SCHEDULE_TRIGGER)
            .build();

        AgentToolExecutionResult result = orchestrator.execute(request);

        assertEquals(AgentToolStatus.DENIED, result.getStatus());
        assertEquals(AgentPolicyDecision.DENY, result.getDecision());
        assertEquals("Scheduled Agent runs allow READ tools only", result.getErrorMessage());
        assertFalse(changeExecuted.get());
        verify(toolCallLedgerService).recordToolDenied(any(), any(), any());
        verify(toolCallLedgerService, never()).recordToolWaitingApproval(any(), any(), any());
    }

    @Test
    void blankApprovalIdShouldCreateFreshWaitingApprovalRequest() {
        when(policyService.decide(any(AgentActor.class), any(AgentToolDescriptor.class)))
            .thenReturn(policy(AgentPolicyDecision.REQUIRE_APPROVAL, AgentToolRisk.CHANGE, "approval required"));

        AgentToolExecutionResult result = orchestrator.execute(invocation("ops.alert_silence",
            Map.of("alertId", 20L)).toBuilder()
            .approvalId(" ")
            .build());

        assertEquals(AgentToolStatus.WAITING_APPROVAL, result.getStatus());
        assertEquals(AgentPolicyDecision.REQUIRE_APPROVAL, result.getDecision());
        assertEquals(AgentApprovalStatus.PENDING, result.getApprovalStatus());
        assertFalse(changeExecuted.get());
        verify(toolCallLedgerService).recordToolWaitingApproval(any(), any(), any());
        verify(toolCallLedgerService, never()).validateToolExecutionApproval(any(), any());
    }

    @Test
    void approvalResumeShouldValidateApprovalBeforeExecutingChangeHandler() {
        when(policyService.decide(any(AgentActor.class), any(AgentToolDescriptor.class)))
            .thenReturn(policy(AgentPolicyDecision.REQUIRE_APPROVAL, AgentToolRisk.CHANGE, "approval required"));
        when(toolCallLedgerService.validateToolExecutionApproval(any(), any()))
            .thenReturn(approvalToolCall(AgentToolStatus.WAITING_APPROVAL, AgentApprovalStatus.APPROVED, null));

        AgentToolExecutionResult result = orchestrator.execute(approvalResumeInvocation());

        assertEquals(AgentToolStatus.SUCCEEDED, result.getStatus());
        assertEquals(AgentPolicyDecision.ALLOW, result.getDecision());
        assertEquals("agp_ops_alert_silence", result.getApprovalId());
        assertEquals("agc_ops_alert_silence", result.getToolCallId());
        assertTrue(changeExecuted.get());
        verify(toolCallLedgerService).validateToolExecutionApproval(any(), any());
        verify(toolCallLedgerService).recordApprovedToolResumed(any(), any(), any());
        verify(toolCallLedgerService, never()).recordToolStarted(any(), any(), any());
    }

    @Test
    void approvalResumeShouldReturnExistingWaitingApprovalWithoutCreatingAnotherToolCall() {
        when(policyService.decide(any(AgentActor.class), any(AgentToolDescriptor.class)))
            .thenReturn(policy(AgentPolicyDecision.REQUIRE_APPROVAL, AgentToolRisk.CHANGE, "approval required"));
        when(toolCallLedgerService.validateToolExecutionApproval(any(), any()))
            .thenReturn(approvalToolCall(AgentToolStatus.WAITING_APPROVAL, AgentApprovalStatus.PENDING, null));

        AgentToolExecutionResult result = orchestrator.execute(approvalResumeInvocation());

        assertEquals(AgentToolStatus.WAITING_APPROVAL, result.getStatus());
        assertEquals(AgentPolicyDecision.REQUIRE_APPROVAL, result.getDecision());
        assertEquals("agp_ops_alert_silence", result.getApprovalId());
        assertEquals("agc_ops_alert_silence", result.getToolCallId());
        assertEquals(AgentApprovalStatus.PENDING, result.getApprovalStatus());
        assertNull(result.getOutput());
        assertFalse(changeExecuted.get());
        verify(toolCallLedgerService).validateToolExecutionApproval(any(), any());
        verify(toolCallLedgerService, never()).recordToolWaitingApproval(any(), any(), any());
        verify(toolCallLedgerService, never()).recordToolDenied(any(), any(), any());
        verify(toolCallLedgerService, never()).recordToolStarted(any(), any(), any());
        verify(toolCallLedgerService, never()).recordApprovedToolResumed(any(), any(), any());
    }

    @Test
    void approvalResumeShouldDenyBeforeStartingToolWhenApprovalValidationFails() {
        when(policyService.decide(any(AgentActor.class), any(AgentToolDescriptor.class)))
            .thenReturn(policy(AgentPolicyDecision.REQUIRE_APPROVAL, AgentToolRisk.CHANGE, "approval required"));
        when(toolCallLedgerService.validateToolExecutionApproval(any(), any()))
            .thenReturn(approvalToolCall(AgentToolStatus.DENIED, AgentApprovalStatus.REJECTED,
                "Agent approval is REJECTED"));

        AgentToolExecutionResult result = orchestrator.execute(approvalResumeInvocation());

        assertEquals(AgentToolStatus.DENIED, result.getStatus());
        assertEquals(AgentPolicyDecision.DENY, result.getDecision());
        assertEquals("agp_ops_alert_silence", result.getApprovalId());
        assertEquals("agc_ops_alert_silence", result.getToolCallId());
        assertEquals("Agent approval is REJECTED", result.getErrorMessage());
        assertFalse(changeExecuted.get());
        verify(toolCallLedgerService, never()).recordToolStarted(any(), any(), any());
        verify(toolCallLedgerService, never()).recordApprovedToolResumed(any(), any(), any());
        verify(toolCallLedgerService, never()).recordToolDenied(any(), any(), any());
    }

    @Test
    void unregisteredToolShouldThrowAtOrchestratorBoundary() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
            () -> orchestrator.execute(invocation("legacy.service_restart", Map.of())));

        assertTrue(exception.getMessage().contains("not registered"));
        verify(policyService, never()).decide(any(AgentActor.class), any(AgentToolDescriptor.class));
        verify(toolCallLedgerService, never()).recordToolDenied(any(), any(), any());
    }

    @Test
    void nullRequestShouldThrowAtOrchestratorBoundary() {
        NullPointerException exception = assertThrows(NullPointerException.class,
            () -> orchestrator.execute(null));

        assertTrue(exception.getMessage().contains("request is required"));
        verify(policyService, never()).decide(any(AgentActor.class), any(AgentToolDescriptor.class));
        verify(toolCallLedgerService, never()).recordToolDenied(any(), any(), any());
        verify(toolCallLedgerService, never()).recordToolStarted(any(), any(), any());
        verify(toolCallLedgerService, never()).recordApprovedToolResumed(any(), any(), any());
    }

    @Test
    void blankToolNameShouldThrowAtRequestBoundary() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
            () -> invocation(" ", Map.of()));

        assertTrue(exception.getMessage().contains("tool name is required"));
        verify(policyService, never()).decide(any(AgentActor.class), any(AgentToolDescriptor.class));
        verify(toolCallLedgerService, never()).recordToolStarted(any(), any(), any());
        verify(toolCallLedgerService, never()).recordApprovedToolResumed(any(), any(), any());
    }

    @Test
    void missingRunIdShouldThrowAtRequestBoundary() {
        NullPointerException exception = assertThrows(NullPointerException.class,
            () -> invocation("monitor.get", Map.of()).toBuilder()
                .runId(null)
                .build());

        assertTrue(exception.getMessage().contains("run id is required"));
        verify(policyService, never()).decide(any(AgentActor.class), any(AgentToolDescriptor.class));
        verify(toolCallLedgerService, never()).recordToolStarted(any(), any(), any());
        verify(toolCallLedgerService, never()).recordApprovedToolResumed(any(), any(), any());
    }

    @Test
    void approvalResumeWithoutSessionUidShouldThrowAtRequestBoundary() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
            () -> approvalResumeInvocation().toBuilder()
                .sessionUid(" ")
                .build());

        assertTrue(exception.getMessage().contains("session uid is required"));
        verify(policyService, never()).decide(any(AgentActor.class), any(AgentToolDescriptor.class));
        verify(toolCallLedgerService, never()).validateToolExecutionApproval(any(), any());
        verify(toolCallLedgerService, never()).recordToolStarted(any(), any(), any());
        verify(toolCallLedgerService, never()).recordApprovedToolResumed(any(), any(), any());
    }

    private AgentToolExecutionRequest invocation(String toolName, Map<String, Object> arguments) {
        return request(toolName, arguments);
    }

    private AgentToolExecutionRequest approvalResumeInvocation() {
        return approvalResumeRequest();
    }

    private AgentToolExecutionRequest request(String toolName, Map<String, Object> arguments) {
        return AgentToolExecutionRequest.builder()
            .sessionUid("ags_1")
            .runId(2L)
            .runUid("run_1")
            .runSessionId(1L)
            .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
            .entryType(AgentRuntimeEntryType.USER_INPUT)
            .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
            .toolName(toolName)
            .toolCallId("agc_" + toolName.strip().toLowerCase(java.util.Locale.ROOT).replace('.', '_'))
            .arguments(arguments)
            .build();
    }

    private AgentToolExecutionRequest approvalResumeRequest() {
        return AgentToolExecutionRequest.builder()
            .sessionUid("ags_1")
            .runId(2L)
            .runUid("run_1")
            .runSessionId(1L)
            .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
            .entryType(AgentRuntimeEntryType.USER_INPUT)
            .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
            .toolName("ops.alert_silence")
            .approvalId("agp_ops_alert_silence")
            .toolCallId("agc_ops_alert_silence")
            .arguments(Map.of("alertId", 20L))
            .approvalStatus(AgentApprovalStatus.APPROVED.name())
            .build();
    }

    private AgentPolicyResult policy(AgentPolicyDecision decision, AgentToolRisk risk, String reason) {
        return AgentPolicyResult.builder()
            .decision(decision)
            .risk(risk)
            .reason(reason)
            .build();
    }

    private AgentToolOutput output(AgentToolStatus status, String modelContent) {
        return AgentToolOutput.builder()
            .status(status)
            .modelContent(modelContent)
            .build();
    }

    private RegisteredTool handler(AgentToolDescriptor descriptor,
                                   Function<AgentToolExecutionContext, AgentToolOutput> executor) {
        return new RegisteredTool(descriptor, executor);
    }

    private AgentToolDescriptor descriptor(String name, String description, AgentToolRisk risk) {
        return AgentToolDescriptor.builder()
            .name(name)
            .description(description)
            .inputSchema("{\"type\":\"object\"}")
            .namespace(name.substring(0, name.indexOf('.')))
            .risk(risk)
            .exposure(AgentToolExposure.MODEL_VISIBLE)
            .build();
    }

    private void stubLedger() {
        lenient().when(toolCallLedgerService.recordToolStarted(any(), any(), any())).thenAnswer(invocation -> {
            AgentToolExecutionRequest request = invocation.getArgument(0);
            AgentToolDescriptor descriptor = invocation.getArgument(1);
            AgentPolicyResult policy = invocation.getArgument(2);
            return toolCall(request, descriptor, policy, AgentToolStatus.RUNNING);
        });
        lenient().when(toolCallLedgerService.recordApprovedToolResumed(any(), any(), any())).thenAnswer(invocation -> {
            AgentToolExecutionRequest request = invocation.getArgument(0);
            AgentToolDescriptor descriptor = invocation.getArgument(1);
            AgentPolicyResult policy = invocation.getArgument(2);
            return toolCall(request, descriptor, policy, AgentToolStatus.RUNNING);
        });
        lenient().when(toolCallLedgerService.recordToolWaitingApproval(any(), any(), any())).thenAnswer(invocation -> {
            AgentToolExecutionRequest request = invocation.getArgument(0);
            AgentToolDescriptor descriptor = invocation.getArgument(1);
            AgentPolicyResult policy = invocation.getArgument(2);
            AgentToolCall call = toolCall(request, descriptor, policy, AgentToolStatus.WAITING_APPROVAL);
            call.setApprovalId("agp_" + call.getToolCallId().substring("agc_".length()));
            call.setApprovalStatus(AgentApprovalStatus.PENDING.name());
            call.setApprovalExpiresAt(APPROVAL_EXPIRES_AT);
            return call;
        });
        lenient().when(toolCallLedgerService.recordToolDenied(any(), any(), any())).thenAnswer(invocation -> {
            AgentToolExecutionRequest request = invocation.getArgument(0);
            AgentToolDescriptor descriptor = invocation.getArgument(1);
            AgentPolicyResult policy = invocation.getArgument(2);
            AgentToolCall call = toolCall(request, descriptor, policy, AgentToolStatus.DENIED);
            call.setPolicyDecision(AgentPolicyDecision.DENY.name());
            call.setErrorMessage(policy == null ? null : policy.getReason());
            return call;
        });
        lenient().when(toolCallLedgerService.completeToolCall(any(), any(), any(Long.class))).thenAnswer(invocation -> {
            AgentToolCall call = invocation.getArgument(0);
            AgentToolOutput output = invocation.getArgument(1);
            call.setStatus(output.getStatus().name());
            call.setResultOutput(output.getModelContent());
            if (AgentToolStatus.SUCCEEDED.equals(output.getStatus())) {
                call.setErrorMessage(null);
            } else {
                call.setErrorMessage(output.getErrorMessage());
            }
            return call;
        });
        lenient().when(toolCallLedgerService.failToolCall(any(), any(), any(Long.class))).thenAnswer(invocation -> {
            AgentToolCall call = invocation.getArgument(0);
            call.setStatus(AgentToolStatus.FAILED.name());
            call.setErrorMessage(invocation.getArgument(1));
            return call;
        });
    }

    private AgentToolCall toolCall(AgentToolExecutionRequest request, AgentToolDescriptor descriptor,
                                   AgentPolicyResult policy, AgentToolStatus status) {
        String toolName = descriptor.getName();
        return AgentToolCall.builder()
            .id(3L)
            .approvalId(request.getApprovalId())
            .toolCallId(request.getToolCallId())
            .runId(2L)
            .sessionId(1L)
            .runUid("run_1")
            .sessionUid("ags_1")
            .toolName(toolName)
            .risk(policy.getRisk().name())
            .policyDecision(policy.getDecision().name())
            .status(status.name())
            .inputJson("{\"input\":\"summary\"}")
            .approvalStatus(request.getApprovalStatus() == null
                ? AgentApprovalStatus.NOT_REQUIRED.name()
                : request.getApprovalStatus())
            .build();
    }

    private AgentToolCall approvalToolCall(AgentToolStatus status, AgentApprovalStatus approvalStatus,
                                           String errorMessage) {
        return AgentToolCall.builder()
            .id(4L)
            .approvalId("agp_ops_alert_silence")
            .toolCallId("agc_ops_alert_silence")
            .runId(2L)
            .sessionId(1L)
            .runUid("run_1")
            .sessionUid("ags_1")
            .toolName("ops.alert_silence")
            .risk(AgentToolRisk.CHANGE.name())
            .policyDecision(AgentPolicyDecision.REQUIRE_APPROVAL.name())
            .status(status.name())
            .inputJson("{\"input\":\"summary\"}")
            .approvalStatus(approvalStatus.name())
            .approvalExpiresAt(APPROVAL_EXPIRES_AT)
            .errorMessage(errorMessage)
            .build();
    }
}
