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

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeTextSanitizer;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Default run-centric tool call ledger service.
 */
@Service
public class AgentToolCallLedgerService {

    private static final int ERROR_LIMIT = 1024;
    private static final int DEFAULT_APPROVAL_EXPIRY_MINUTES = 30;

    private final AgentToolCallDao toolCallDao;

    public AgentToolCallLedgerService(AgentToolCallDao toolCallDao) {
        this.toolCallDao = toolCallDao;
    }

    @Transactional
    public AgentToolCall recordToolDenied(AgentToolExecutionRequest request, AgentToolDescriptor descriptor, AgentPolicyResult policy) {
        AgentToolCall toolCall = baseToolCall(request, descriptor, policy);
        toolCall.setStatus(AgentToolStatus.DENIED.name());
        toolCall.setApprovalStatus(AgentApprovalStatus.NOT_REQUIRED.name());
        toolCall.setErrorMessage(GatewayText.requireBounded(
                policy.getReason(), ERROR_LIMIT, "tool policy reason"));
        return toolCallDao.save(toolCall);
    }

    @Transactional
    public AgentToolCall recordToolStarted(AgentToolExecutionRequest request, AgentToolDescriptor descriptor, AgentPolicyResult policy) {
        AgentToolCall toolCall = baseToolCall(request, descriptor, policy);
        toolCall.setStatus(AgentToolStatus.RUNNING.name());
        toolCall.setApprovalStatus(AgentApprovalStatus.NOT_REQUIRED.name());
        return toolCallDao.save(toolCall);
    }

    @Transactional
    public AgentToolCall recordApprovedToolResumed(AgentToolExecutionRequest request, AgentToolDescriptor descriptor,
                                                   AgentPolicyResult policy) {
        AgentToolCall toolCall = approvedPendingToolCall(request, descriptor);
        String canonicalArgs = AgentToolPayloadHasher.canonicalArgumentsJson(request.getArguments());
        toolCall.setStatus(AgentToolStatus.RUNNING.name());
        toolCall.setRisk(policy.getRisk().name());
        toolCall.setPolicyDecision(policy.getDecision().name());
        toolCall.setExposure(descriptor.getExposure().name());
        toolCall.setInputJson(canonicalArgs);
        toolCall.setInputHash(AgentToolPayloadHasher.normalizedArgumentsHash(request.getArguments()));
        toolCall.setApprovalStatus(AgentApprovalStatus.APPROVED.name());
        toolCall.setResultOutput(null);
        toolCall.setElapsedMs(null);
        toolCall.setErrorMessage(null);
        return toolCallDao.save(toolCall);
    }

    @Transactional
    public AgentToolCall recordToolWaitingApproval(AgentToolExecutionRequest request, AgentToolDescriptor descriptor,
                                                   AgentPolicyResult policy) {
        AgentToolCall toolCall = baseToolCall(request, descriptor, policy);
        toolCall.setStatus(AgentToolStatus.WAITING_APPROVAL.name());
        toolCall.setApprovalId("agp_" + SnowFlakeIdGenerator.generateId());
        toolCall.setApprovalStatus(AgentApprovalStatus.PENDING.name());
        toolCall.setApprovalExpiresAt(LocalDateTime.now().plusMinutes(DEFAULT_APPROVAL_EXPIRY_MINUTES));
        return toolCallDao.save(toolCall);
    }

    @Transactional
    public AgentToolCall validateToolExecutionApproval(AgentToolExecutionRequest request,
                                                       AgentToolDescriptor descriptor) {
        String approvalId = request.getApprovalId();
        // Approval resume must target one existing approval row before using its lifecycle fields.
        if (!StringUtils.hasText(approvalId)) {
            throw new IllegalArgumentException("Agent tool approval id is required");
        }
        AgentToolCall toolCall = toolCallDao.findByApprovalId(approvalId)
            .orElseThrow(() -> new IllegalArgumentException("Agent tool approval not found"));
        String mismatch = approvalExecutionMismatch(toolCall, request, descriptor);
        if (mismatch != null) {
            throw new IllegalStateException(mismatch);
        }
        LocalDateTime now = LocalDateTime.now();
        if (isExpired(toolCall, now)) {
            expire(toolCall, now);
        }
        return toolCall;
    }

    @Transactional
    public AgentToolCall approve(String approvalId, AgentActor approvingActor) {
        return decide(approvalId, approvingActor, AgentApprovalDecision.APPROVED,
            AgentApprovalStatus.APPROVED, null);
    }

    @Transactional
    public AgentToolCall reject(String approvalId, AgentActor approvingActor) {
        return decide(approvalId, approvingActor, AgentApprovalDecision.REJECTED,
            AgentApprovalStatus.REJECTED, AgentToolStatus.DENIED);
    }

    @Transactional
    public AgentToolCall completeToolCall(AgentToolCall toolCall, AgentToolOutput output, long elapsedMs) {
        toolCall.setStatus(output.getStatus().name());
        toolCall.setResultOutput(output.getModelContent());
        if (AgentToolStatus.SUCCEEDED.equals(output.getStatus())) {
            toolCall.setErrorMessage(null);
        } else {
            // Handler failure messages are persisted in the ledger, so redact secrets and bound the stored/API text.
            String safeErrorMessage = AgentRuntimeTextSanitizer.sanitizeAndLimit(output.getErrorMessage(),
                ERROR_LIMIT);
            toolCall.setErrorMessage(safeErrorMessage);
        }
        toolCall.setElapsedMs(elapsedMs);
        return toolCallDao.save(toolCall);
    }

    @Transactional
    public AgentToolCall failToolCall(AgentToolCall toolCall, String errorMessage, long elapsedMs) {
        toolCall.setStatus(AgentToolStatus.FAILED.name());
        // Runtime exception messages are persisted in the ledger, so redact secrets and bound the stored/API text.
        String safeErrorMessage = AgentRuntimeTextSanitizer.sanitizeAndLimit(errorMessage, ERROR_LIMIT);
        toolCall.setErrorMessage(safeErrorMessage);
        toolCall.setElapsedMs(elapsedMs);
        return toolCallDao.save(toolCall);
    }

    public Optional<AgentToolCall> findToolCall(Long runId, String toolCallId) {
        if (runId == null || toolCallId == null) {
            return Optional.empty();
        }
        return toolCallDao.findByRunIdAndToolCallId(runId, toolCallId);
    }

    public Optional<AgentToolCall> findApproval(String approvalId) {
        return toolCallDao.findByApprovalId(approvalId);
    }

    public Page<AgentToolCall> findRunToolCalls(Long runId, Pageable pageable) {
        // Query APIs may receive a missing run id after lookup failure; expose an empty page instead of querying null.
        if (runId == null) {
            return Page.empty(pageable);
        }
        return toolCallDao.findByRunIdOrderByGmtCreateAsc(runId, pageable);
    }

    private AgentToolCall baseToolCall(AgentToolExecutionRequest request, AgentToolDescriptor descriptor, AgentPolicyResult policy) {
        String canonicalArgs = AgentToolPayloadHasher.canonicalArgumentsJson(request.getArguments());
        return AgentToolCall.builder()
            .toolCallId(GatewayText.requireBounded(request.getToolCallId(), 128, "tool call id"))
            .runId(request.getRunId())
            .sessionId(request.getRunSessionId())
            .runUid(request.getRunUid())
            .sessionUid(request.getSessionUid())
            .toolName(descriptor.getName())
            .exposure(descriptor.getExposure().name())
            .risk(policy.getRisk().name())
            .policyDecision(policy.getDecision().name())
            .inputJson(canonicalArgs)
            .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(request.getArguments()))
            .build();
    }

    private AgentToolCall approvedPendingToolCall(AgentToolExecutionRequest request, AgentToolDescriptor descriptor) {
        String approvalId = request.getApprovalId();
        // Approval resume must target one existing approval row before mutating it to RUNNING.
        if (!StringUtils.hasText(approvalId)) {
            throw new IllegalArgumentException("Approved Agent tool approval id is required");
        }
        AgentToolCall toolCall = toolCallDao.findByApprovalId(approvalId)
            .orElseThrow(() -> new IllegalArgumentException("Approved Agent tool approval was not found"));
        verifyApprovedPendingToolCall(request, descriptor, toolCall);
        return toolCall;
    }

    private void verifyApprovedPendingToolCall(AgentToolExecutionRequest request, AgentToolDescriptor descriptor,
                                               AgentToolCall toolCall) {
        if (!AgentApprovalStatus.APPROVED.name().equals(request.getApprovalStatus())) {
            throw new IllegalStateException("Agent tool call approval has not been validated");
        }
        if (!AgentApprovalStatus.APPROVED.name().equals(toolCall.getApprovalStatus())) {
            throw new IllegalStateException("Agent tool call approval is not approved");
        }
        if (!AgentToolStatus.WAITING_APPROVAL.name().equals(toolCall.getStatus())) {
            throw new IllegalStateException("Agent tool call is not waiting for approval");
        }
        String mismatch = approvalExecutionMismatch(toolCall, request, descriptor);
        if (mismatch != null) {
            throw new IllegalStateException(mismatch);
        }
    }

    private AgentToolCall decide(String approvalId, AgentActor approvingActor,
                                 AgentApprovalDecision decision, AgentApprovalStatus approvalStatus,
                                 AgentToolStatus terminalStatus) {
        requireChangeCapableActor(approvingActor, "Approval decision");
        AgentToolCall toolCall = toolCallDao.findByApprovalId(approvalId)
            .orElseThrow(() -> new IllegalArgumentException("Agent tool approval not found"));
        LocalDateTime now = LocalDateTime.now();
        if (isExpired(toolCall, now)) {
            expire(toolCall, now);
            throw new IllegalStateException("Agent tool approval is expired");
        }
        requirePending(toolCall);
        toolCall.setApprovalActorType(approvingActor.getType());
        toolCall.setApprovalActorId(approvingActor.getId());
        toolCall.setApprovalStatus(approvalStatus.name());
        toolCall.setApprovalDecidedAt(LocalDateTime.now());
        toolCall.setApprovalReason(null);
        if (terminalStatus != null) {
            toolCall.setStatus(terminalStatus.name());
            toolCall.setErrorMessage("Agent tool approval " + decision.name().toLowerCase(Locale.ROOT));
        }
        return toolCallDao.save(toolCall);
    }

    private String approvalExecutionMismatch(AgentToolCall toolCall, AgentToolExecutionRequest request,
                                             AgentToolDescriptor descriptor) {
        if (!Objects.equals(toolCall.getApprovalId(), request.getApprovalId())) {
            return "Approval ID does not match";
        }
        if (request.getToolCallId() != null
            && !Objects.equals(toolCall.getToolCallId(), request.getToolCallId())) {
            return "Tool-call UID does not match approval";
        }
        if (!AgentPolicyDecision.REQUIRE_APPROVAL.name().equals(toolCall.getPolicyDecision())) {
            return "Tool call was not created by an approval-required policy decision";
        }
        boolean terminalApproval = AgentToolStatus.DENIED.name().equals(toolCall.getStatus())
            && (AgentApprovalStatus.REJECTED.name().equals(toolCall.getApprovalStatus())
            || AgentApprovalStatus.EXPIRED.name().equals(toolCall.getApprovalStatus()));
        if (!AgentToolStatus.WAITING_APPROVAL.name().equals(toolCall.getStatus()) && !terminalApproval) {
            return "Tool call is not waiting for approval";
        }
        if (!Objects.equals(toolCall.getRunId(), request.getRunId())
            || !Objects.equals(toolCall.getRunUid(), request.getRunUid())) {
            return "Tool-call run context does not match";
        }
        if (!Objects.equals(toolCall.getSessionId(), request.getRunSessionId())
            || !Objects.equals(toolCall.getSessionUid(), request.getSessionUid())) {
            return "Tool-call session context does not match";
        }
        if (!Objects.equals(toolCall.getToolName(), descriptor.getName())) {
            return "Tool-call tool name does not match";
        }
        if (!Objects.equals(toolCall.getRisk(), descriptor.getRisk().name())) {
            return "Tool-call risk does not match";
        }
        String currentHash = AgentToolPayloadHasher.normalizedArgumentsHash(request.getArguments());
        if (!Objects.equals(toolCall.getInputHash(), currentHash)) {
            return "Tool-call input hash does not match the approved input";
        }
        return null;
    }

    private void requirePending(AgentToolCall toolCall) {
        if (!AgentToolStatus.WAITING_APPROVAL.name().equals(toolCall.getStatus())
            || !AgentApprovalStatus.PENDING.name().equals(toolCall.getApprovalStatus())) {
            throw new IllegalStateException("Agent tool approval is not pending");
        }
    }

    private boolean isExpired(AgentToolCall toolCall, LocalDateTime now) {
        return toolCall.getApprovalExpiresAt() != null && !toolCall.getApprovalExpiresAt().isAfter(now);
    }

    private void expire(AgentToolCall toolCall, LocalDateTime now) {
        String status = toolCall.getApprovalStatus();
        if (!AgentApprovalStatus.PENDING.name().equals(status)
            && !AgentApprovalStatus.APPROVED.name().equals(status)) {
            return;
        }
        toolCall.setApprovalStatus(AgentApprovalStatus.EXPIRED.name());
        toolCall.setApprovalDecidedAt(now);
        toolCall.setApprovalReason(AgentApprovalStatus.PENDING.name().equals(status)
            ? "Approval expired before a decision was recorded."
            : "Approved tool execution expired before it was resumed.");
        toolCall.setStatus(AgentToolStatus.DENIED.name());
        toolCall.setErrorMessage("Agent tool approval expired.");
        toolCallDao.save(toolCall);
    }

    private void requireChangeCapableActor(AgentActor actor, String operation) {
        // Approval decisions mutate tool execution state, so this boundary requires an authenticated actor.
        if (!ActorSupport.hasIdentity(actor)) {
            throw new IllegalStateException(operation + " requires a trusted actor");
        }
        // Only admins may change approval state.
        if (!actor.getRoles().contains(ActorSupport.ROLE_ADMIN)) {
            throw new IllegalStateException(operation + " requires a change-capable actor");
        }
    }
}
