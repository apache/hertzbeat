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

import com.fasterxml.jackson.annotation.JsonIgnore;

import lombok.Builder;
import lombok.Getter;

import org.apache.hertzbeat.ai.gateway.runtime.AgentRequestedQueryWindow;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/** Tool execution state shared by orchestration and runtime layers. */
@Getter
public class AgentToolExecutionResult {

    private final String toolCallId;

    private final String approvalId;

    private final String toolName;

    private final AgentToolStatus status;

    private final AgentPolicyDecision decision;

    private final AgentToolRisk risk;

    private final AgentApprovalStatus approvalStatus;

    private final String output;

    private final String errorMessage;

    private final long elapsedMs;

    private final Boolean canDecide;

    private final org.apache.hertzbeat.ai.gateway.conversation.AgentApprovalSummary approvalSummary;

    @JsonIgnore private final java.time.LocalDateTime approvalExpiresAt;

    /** Internal effective arguments only; never serialized into public events or API results. */
    @JsonIgnore private final Map<String, Object> effectiveArguments;

    @JsonIgnore private final AgentRequestedQueryWindow inheritedQueryWindow;

    @Builder(toBuilder = true)
    private AgentToolExecutionResult(
            String toolCallId,
            String approvalId,
            String toolName,
            AgentToolStatus status,
            AgentPolicyDecision decision,
            AgentToolRisk risk,
            AgentApprovalStatus approvalStatus,
            String output,
            String errorMessage,
            long elapsedMs,
            Boolean canDecide,
            org.apache.hertzbeat.ai.gateway.conversation.AgentApprovalSummary approvalSummary,
            java.time.LocalDateTime approvalExpiresAt,
            Map<String, Object> effectiveArguments,
            AgentRequestedQueryWindow inheritedQueryWindow) {
        // Tool execution results are emitted to runtime and event layers with stable ledger
        // identifiers.
        Objects.requireNonNull(toolCallId, "toolCallId must not be null");
        if (!StringUtils.hasText(toolCallId)) {
            throw new IllegalArgumentException("toolCallId must not be blank");
        }
        this.approvalId = approvalId;
        // Tool execution results are emitted to runtime and event layers with stable catalog names.
        Objects.requireNonNull(toolName, "toolName must not be null");
        if (!StringUtils.hasText(toolName)) {
            throw new IllegalArgumentException("toolName must not be blank");
        }
        this.toolCallId = toolCallId;
        this.toolName = toolName;
        // Execution lifecycle state is consumed without fallbacks by runtime and ledger
        // projections.
        this.status = Objects.requireNonNull(status, "status must not be null");
        this.decision = Objects.requireNonNull(decision, "decision must not be null");
        this.risk = Objects.requireNonNull(risk, "risk must not be null");
        this.approvalStatus =
                Objects.requireNonNull(approvalStatus, "approvalStatus must not be null");
        if ((status == AgentToolStatus.WAITING_APPROVAL
                        || decision == AgentPolicyDecision.REQUIRE_APPROVAL
                        || approvalStatus == AgentApprovalStatus.PENDING)
                && !StringUtils.hasText(approvalId)) {
            throw new IllegalArgumentException(
                    "approvalId is required while tool execution awaits approval");
        }
        if (elapsedMs < 0) {
            throw new IllegalArgumentException("elapsedMs must not be negative");
        }
        this.output = output;
        this.errorMessage = errorMessage;
        this.elapsedMs = elapsedMs;
        this.canDecide = canDecide;
        this.approvalSummary = approvalSummary;
        this.approvalExpiresAt = approvalExpiresAt;
        this.effectiveArguments =
                effectiveArguments == null
                        ? null
                        : Collections.unmodifiableMap(new LinkedHashMap<>(effectiveArguments));
        this.inheritedQueryWindow = inheritedQueryWindow;
    }
}
