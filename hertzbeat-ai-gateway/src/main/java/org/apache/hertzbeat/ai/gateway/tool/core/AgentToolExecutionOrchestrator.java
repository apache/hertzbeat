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
import java.util.function.Supplier;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeStoppedException;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry.RegisteredTool;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
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
    private final AgentInteractionInputService interactionInputService;
    private final AgentTargetToolAuthorizer targetToolAuthorizer;

    public AgentToolExecutionOrchestrator(AgentToolRegistry registry, AgentPolicyService policyService,
                                           AgentToolCallLedgerService toolCallLedgerService,
                                           AgentInteractionInputService interactionInputService,
                                           AgentTargetToolAuthorizer targetToolAuthorizer) {
        this.registry = registry;
        this.policyService = policyService;
        this.toolCallLedgerService = toolCallLedgerService;
        this.interactionInputService = interactionInputService;
        this.targetToolAuthorizer = targetToolAuthorizer;
    }

    public AgentToolExecutionResult execute(AgentToolExecutionRequest request) {
        AgentToolExecutionRequest requiredRequest =
                Objects.requireNonNull(request, "Agent tool execution request is required");
        try (WorkspaceScope ignored = WorkspaceScope.bind(requiredRequest.getWorkspaceId())) {
            return executeScoped(requiredRequest);
        }
    }

    private AgentToolExecutionResult executeScoped(AgentToolExecutionRequest request) {
        PreparedToolExecution rawExecution = prepareRawExecution(request);
        var targetDenial = targetToolAuthorizer.denialReason(rawExecution.request(), rawExecution.descriptor());
        if (targetDenial.isPresent()) {
            return targetDenied(rawExecution, targetDenial.get());
        }
        PreparedToolExecution execution = validateInteractionReference(rawExecution);
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

    private PreparedToolExecution prepareRawExecution(AgentToolExecutionRequest request) {
        String toolName = request.getToolName();
        RegisteredTool handler = registry.find(toolName)
            .orElseThrow(() -> new IllegalArgumentException("Agent tool is not registered: " + toolName));
        return new PreparedToolExecution(request, handler, handler.descriptor());
    }

    private PreparedToolExecution validateInteractionReference(PreparedToolExecution execution) {
        AgentToolExecutionRequest validated = interactionInputService.validateReference(execution.request());
        return new PreparedToolExecution(validated, execution.handler(), execution.descriptor());
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
        return mergeAndExecuteHandler(execution, toolCall, AgentApprovalConsumption.Claim.NONE, false);
    }

    private AgentToolExecutionResult executeApprovedHandler(PreparedToolExecution execution, AgentPolicyResult policy) {
        AgentApprovalConsumption.Claim consumption = execution.request().beginApprovalConsumption();
        AgentToolCall toolCall;
        try {
            toolCall = toolCallLedgerService.recordApprovedToolResumed(execution.request(),
                    execution.descriptor(), policy);
        } catch (RuntimeException | Error failure) {
            consumption.release();
            throw failure;
        }
        return mergeAndExecuteHandler(execution, toolCall, consumption, true);
    }

    private AgentToolExecutionResult mergeAndExecuteHandler(PreparedToolExecution execution, AgentToolCall toolCall,
                                                             AgentApprovalConsumption.Claim consumption,
                                                             boolean approved) {
        long startedAt = System.currentTimeMillis();
        AgentToolExecutionRequest request;
        try {
            request = interactionInputService.mergeAndTake(execution.request());
        } catch (RuntimeException failure) {
            try {
                AgentToolCall failedCall = failBeforeHandler(
                        toolCall, failure.getMessage(), startedAt, approved, failure);
                return executionResult(failedCall);
            } finally {
                consumption.release();
            }
        } catch (Error error) {
            if (isFatal(error)) {
                consumption.release();
                throw error;
            }
            try {
                failBeforeHandler(toolCall, "Agent tool execution failed.", startedAt, approved, error);
            } finally {
                consumption.release();
            }
            throw error;
        }
        if (!consumption.complete()) {
            AgentRuntimeStoppedException stopped = new AgentRuntimeStoppedException(
                    "Approval runtime stopped before tool execution.");
            try {
                failBeforeHandler(toolCall, "Agent tool execution stopped before the handler started.",
                        startedAt, approved, stopped);
            } finally {
                consumption.release();
            }
            throw stopped;
        }
        return executeRecordedHandler(new PreparedToolExecution(request, execution.handler(), execution.descriptor()),
                toolCall);
    }

    private AgentToolCall failBeforeHandler(AgentToolCall toolCall, String errorMessage, long startedAt,
                                            boolean approved, Throwable primaryFailure) {
        try {
            long elapsedMs = System.currentTimeMillis() - startedAt;
            return approved
                    ? toolCallLedgerService.failApprovedToolBeforeExecution(toolCall, errorMessage, elapsedMs)
                    : toolCallLedgerService.failToolCall(toolCall, errorMessage, elapsedMs);
        } catch (RuntimeException ledgerFailure) {
            addSuppressed(primaryFailure, ledgerFailure);
            throw propagatePrimary(primaryFailure);
        } catch (Error ledgerFailure) {
            if (isFatal(ledgerFailure)) {
                addSuppressed(ledgerFailure, primaryFailure);
                throw ledgerFailure;
            }
            addSuppressed(primaryFailure, ledgerFailure);
            throw propagatePrimary(primaryFailure);
        }
    }

    private void addSuppressed(Throwable primary, Throwable secondary) {
        if (primary != secondary) {
            primary.addSuppressed(secondary);
        }
    }

    private RuntimeException propagatePrimary(Throwable primaryFailure) {
        if (primaryFailure instanceof RuntimeException runtimeException) {
            return runtimeException;
        }
        throw (Error) primaryFailure;
    }

    private AgentToolExecutionResult executeRecordedHandler(PreparedToolExecution execution, AgentToolCall toolCall) {
        AgentToolExecutionContext context = new AgentToolExecutionContext(execution.request(), toolCall);
        long startedAt = System.currentTimeMillis();
        AgentToolOutput output;
        try {
            output = execution.handler().execute(context);
        } catch (RuntimeException exception) {
            AgentToolCall failedCall = failAfterHandler(toolCall, exception.getMessage(), startedAt, exception);
            return executionResult(failedCall);
        } catch (Error error) {
            if (isFatal(error)) {
                throw error;
            }
            failAfterHandler(toolCall, "Agent tool execution failed.", startedAt, error);
            throw error;
        }
        var postExecutionDenial = targetToolAuthorizer.postExecutionDenialReason(
                execution.request(), execution.descriptor());
        if (postExecutionDenial.isPresent()) {
            AgentToolCall failedCall = persistTerminalOutcome(() -> toolCallLedgerService.failToolCall(toolCall,
                    postExecutionDenial.get(), System.currentTimeMillis() - startedAt));
            return executionResult(failedCall);
        }
        AgentToolCall savedCall = persistTerminalOutcome(() -> toolCallLedgerService.completeToolCall(toolCall,
                output, System.currentTimeMillis() - startedAt));
        return executionResult(savedCall);
    }

    private AgentToolCall persistTerminalOutcome(Supplier<AgentToolCall> persistence) {
        try {
            return persistence.get();
        } catch (RuntimeException failure) {
            throw new AgentToolCompletionIndeterminateException(failure);
        } catch (Error failure) {
            if (isFatal(failure)) {
                throw failure;
            }
            throw new AgentToolCompletionIndeterminateException(failure);
        }
    }

    private AgentToolCall failAfterHandler(AgentToolCall toolCall, String errorMessage, long startedAt,
                                           Throwable primaryFailure) {
        try {
            return toolCallLedgerService.failToolCall(
                    toolCall, errorMessage, System.currentTimeMillis() - startedAt);
        } catch (RuntimeException ledgerFailure) {
            addSuppressed(primaryFailure, ledgerFailure);
            throw propagatePrimary(primaryFailure);
        } catch (Error ledgerFailure) {
            if (isFatal(ledgerFailure)) {
                addSuppressed(ledgerFailure, primaryFailure);
                throw ledgerFailure;
            }
            addSuppressed(primaryFailure, ledgerFailure);
            throw propagatePrimary(primaryFailure);
        }
    }

    private boolean isFatal(Error error) {
        return error instanceof VirtualMachineError || error instanceof ThreadDeath || error instanceof LinkageError;
    }

    private AgentToolExecutionResult denied(PreparedToolExecution execution, AgentPolicyResult policy) {
        AgentToolCall deniedCall = toolCallLedgerService.recordToolDenied(execution.request(), execution.descriptor(),
            policy);
        return executionResult(deniedCall);
    }

    private AgentToolExecutionResult targetDenied(PreparedToolExecution execution, String reason) {
        return AgentToolExecutionResult.builder()
                .toolCallId(execution.request().getToolCallId())
                .toolName(execution.descriptor().getName())
                .status(AgentToolStatus.DENIED)
                .decision(AgentPolicyDecision.DENY)
                .risk(execution.descriptor().getRisk())
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output(reason)
                .errorMessage(reason)
                .build();
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

    private record WorkspaceScope(String workspaceId, String authenticatedWorkspaceId,
                                  String collectorId) implements AutoCloseable {

        private static WorkspaceScope bind(String workspaceId) {
            WorkspaceScope previous = new WorkspaceScope(
                    AuthTokenRequestContext.currentWorkspaceId(),
                    AuthTokenRequestContext.currentAuthenticatedWorkspaceId(),
                    AuthTokenRequestContext.currentCollectorId());
            AuthTokenRequestContext.bindWorkspaceId(workspaceId);
            AuthTokenRequestContext.bindAuthenticatedWorkspaceId(workspaceId);
            AuthTokenRequestContext.bindCollectorId(null);
            return previous;
        }

        @Override
        public void close() {
            AuthTokenRequestContext.bindWorkspaceId(workspaceId);
            AuthTokenRequestContext.bindAuthenticatedWorkspaceId(authenticatedWorkspaceId);
            AuthTokenRequestContext.bindCollectorId(collectorId);
        }
    }
}
