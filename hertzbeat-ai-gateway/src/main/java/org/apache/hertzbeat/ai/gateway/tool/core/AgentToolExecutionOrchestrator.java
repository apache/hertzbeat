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

import java.util.Objects;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry.RegisteredTool;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService;
import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorSensitiveParamService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Policy-first execution orchestrator for Agent tool handlers.
 */
@Service
public class AgentToolExecutionOrchestrator {

    static final String NON_INTERACTIVE_APPROVAL_DENIAL_REASON =
            "Tool execution requiring approval is denied for non-interactive Agent runs.";

    private final AgentToolRegistry registry;
    private final AgentPolicyService policyService;
    private final AgentToolCallLedgerService toolCallLedgerService;
    private final AgentMonitorSensitiveParamService sensitiveParamService;
    private final AgentInteractionInputService interactionInputService;

    public AgentToolExecutionOrchestrator(AgentToolRegistry registry, AgentPolicyService policyService,
                                           AgentToolCallLedgerService toolCallLedgerService,
                                           AgentMonitorSensitiveParamService sensitiveParamService,
                                           AgentInteractionInputService interactionInputService) {
        this.registry = registry;
        this.policyService = policyService;
        this.toolCallLedgerService = toolCallLedgerService;
        this.sensitiveParamService = sensitiveParamService;
        this.interactionInputService = interactionInputService;
    }

    public AgentToolExecutionResult execute(AgentToolExecutionRequest request) {
        PreparedToolExecution execution = prepareExecution(request);
        AgentPolicyResult policy = policyService.decide(execution.request().getActor(), execution.descriptor());

        if (execution.request().getEntryType() == AgentRuntimeEntryType.SCHEDULE_TRIGGER
                && execution.descriptor().getRisk() != AgentToolRisk.READ) {
            policy = AgentPolicyResult.builder()
                    .decision(AgentPolicyDecision.DENY)
                    .risk(execution.descriptor().getRisk())
                    .reason("Scheduled Agent runs allow READ tools only")
                    .build();
        }

        if (policy.requiresApproval()
                && execution.request().getApprovalHandling() == AgentApprovalHandling.DENY) {
            policy = AgentPolicyResult.builder()
                    .decision(AgentPolicyDecision.DENY)
                    .risk(policy.getRisk())
                    .reason(NON_INTERACTIVE_APPROVAL_DENIAL_REASON)
                    .build();
        }

        if (policy.denied()) {
            return denied(execution, policy);
        }
        if (policy.requiresApproval()) {
            return handleApproval(execution, policy);
        }
        return executeHandler(execution, policy);
    }

    private PreparedToolExecution prepareExecution(AgentToolExecutionRequest request) {
        // This public boundary must fail before creating ledger rows or invoking handlers with incomplete context.
        AgentToolExecutionRequest requiredRequest = sensitiveParamService.removeSensitiveArguments(
                Objects.requireNonNull(request, "Agent tool execution request is required"));
        requiredRequest = interactionInputService.validateReference(requiredRequest);
        String toolName = requiredRequest.getToolName();
        RegisteredTool handler = registry.find(toolName)
            .orElseThrow(() -> new IllegalArgumentException("Agent tool is not registered: " + toolName));
        return new PreparedToolExecution(requiredRequest, handler, handler.descriptor());
    }

    private AgentToolExecutionResult handleApproval(PreparedToolExecution execution, AgentPolicyResult policy) {
        AgentToolExecutionRequest request = execution.request();
        // Approval ID is the business signal for resuming an existing approval; blank means a fresh approval request.
        if (!StringUtils.hasText(request.getApprovalId())) {
            AgentToolCall waitingCall = toolCallLedgerService.recordToolWaitingApproval(request,
                execution.descriptor(), policy);
            return executionResult(waitingCall);
        }

        AgentToolCall approvalCall = toolCallLedgerService.validateToolExecutionApproval(request,
            execution.descriptor());
        if (isWaitingApproval(approvalCall)) {
            return executionResult(approvalCall);
        }
        if (isDeniedApproval(approvalCall)) {
            return executionResult(approvalCall);
        }
        if (!isApprovedApproval(approvalCall)) {
            throw new IllegalStateException("Agent approval is not approved");
        }
        AgentToolExecutionRequest approvedRequest = request.toBuilder()
            .approvalId(approvalCall.getApprovalId())
            .toolCallId(approvalCall.getToolCallId())
            .approvalStatus(approvalCall.getApprovalStatus())
            .build();
        AgentPolicyResult approvedPolicy = AgentPolicyResult.builder()
            .decision(AgentPolicyDecision.ALLOW)
            .risk(policy.getRisk())
            .reason("Approved change execution is allowed")
            .build();
        return executeApprovedHandler(new PreparedToolExecution(approvedRequest, execution.handler(), execution.descriptor()),
                approvedPolicy);
    }

    private AgentToolExecutionResult executeHandler(PreparedToolExecution execution, AgentPolicyResult policy) {
        AgentToolCall toolCall = toolCallLedgerService.recordToolStarted(execution.request(), execution.descriptor(),
            policy);
        AgentToolExecutionRequest request = interactionInputService.mergeAndTake(execution.request());
        return executeRecordedHandler(new PreparedToolExecution(request, execution.handler(), execution.descriptor()),
                toolCall);
    }

    private AgentToolExecutionResult executeApprovedHandler(PreparedToolExecution execution, AgentPolicyResult policy) {
        AgentToolCall toolCall = toolCallLedgerService.recordApprovedToolResumed(execution.request(),
            execution.descriptor(), policy);
        AgentToolExecutionRequest request = sensitiveParamService.mergeAndTake(execution.request());
        request = interactionInputService.mergeAndTake(request);
        return executeRecordedHandler(new PreparedToolExecution(request, execution.handler(), execution.descriptor()),
                toolCall);
    }

    private AgentToolExecutionResult executeRecordedHandler(PreparedToolExecution execution, AgentToolCall toolCall) {
        AgentToolExecutionContext context = new AgentToolExecutionContext(execution.request(), toolCall);
        long startedAt = System.currentTimeMillis();
        try {
            AgentToolOutput output = execution.handler().execute(context);
            AgentToolCall savedCall = toolCallLedgerService.completeToolCall(toolCall, output,
                System.currentTimeMillis() - startedAt);
            return executionResult(savedCall);
        } catch (RuntimeException exception) {
            AgentToolCall failedCall = toolCallLedgerService.failToolCall(toolCall, exception.getMessage(),
                System.currentTimeMillis() - startedAt);
            return executionResult(failedCall);
        }
    }

    private AgentToolExecutionResult denied(PreparedToolExecution execution, AgentPolicyResult policy) {
        AgentToolCall deniedCall = toolCallLedgerService.recordToolDenied(execution.request(), execution.descriptor(),
            policy);
        return executionResult(deniedCall);
    }

    private AgentToolExecutionResult executionResult(AgentToolCall toolCall) {
        return AgentToolExecutionResult.builder()
            .toolCallId(toolCall.getToolCallId())
            .approvalId(toolCall.getApprovalId())
            .toolName(toolCall.getToolName())
            .status(AgentToolStatus.valueOf(toolCall.getStatus()))
            .decision(AgentToolStatus.DENIED.name().equals(toolCall.getStatus())
                ? AgentPolicyDecision.DENY
                : AgentPolicyDecision.valueOf(toolCall.getPolicyDecision()))
            .risk(AgentToolRisk.valueOf(toolCall.getRisk()))
            .approvalStatus(AgentApprovalStatus.valueOf(toolCall.getApprovalStatus()))
            .output(toolCall.getResultOutput())
            .errorMessage(toolCall.getErrorMessage())
            .build();
    }

    private boolean isApprovedApproval(AgentToolCall toolCall) {
        return AgentToolStatus.WAITING_APPROVAL.name().equals(toolCall.getStatus())
            && AgentApprovalStatus.APPROVED.name().equals(toolCall.getApprovalStatus());
    }

    private boolean isWaitingApproval(AgentToolCall toolCall) {
        return AgentToolStatus.WAITING_APPROVAL.name().equals(toolCall.getStatus())
            && AgentApprovalStatus.PENDING.name().equals(toolCall.getApprovalStatus());
    }

    private boolean isDeniedApproval(AgentToolCall toolCall) {
        return AgentToolStatus.DENIED.name().equals(toolCall.getStatus())
            || AgentApprovalStatus.REJECTED.name().equals(toolCall.getApprovalStatus())
            || AgentApprovalStatus.EXPIRED.name().equals(toolCall.getApprovalStatus());
    }

    /**
     * Tool execution context after the public boundary has validated required request and catalog state.
     */
    private record PreparedToolExecution(AgentToolExecutionRequest request, RegisteredTool handler,
                                         AgentToolDescriptor descriptor) {
    }
}
