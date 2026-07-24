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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Active approval waiters for currently running runtime loops.
 */
@Service
public class AgentRuntimeApprovalRegistry {

    private final ConcurrentMap<String, CompletableFuture<AgentApprovalDecision>> approvals = new ConcurrentHashMap<>();

    public CompletableFuture<AgentApprovalDecision> register(String approvalId) {
        // Approval IDs are persisted ledger identities and must be complete before a runtime waiter is registered.
        if (!StringUtils.hasText(approvalId)) {
            throw new IllegalArgumentException("Approval id is required");
        }
        CompletableFuture<AgentApprovalDecision> approval = new CompletableFuture<>();
        CompletableFuture<AgentApprovalDecision> existing = approvals.putIfAbsent(approvalId, approval);
        if (existing != null) {
            throw new IllegalStateException("Approval is already waiting: " + approvalId);
        }
        approval.whenComplete((decision, error) -> approvals.remove(approvalId, approval));
        return approval;
    }

    public boolean complete(String approvalId, AgentApprovalDecision decision) {
        // Command normalization supplies both values; a null completion would corrupt the waiting lifecycle.
        if (!StringUtils.hasText(approvalId)) {
            throw new IllegalArgumentException("Approval id is required");
        }
        Objects.requireNonNull(decision, "Approval decision is required");
        CompletableFuture<AgentApprovalDecision> approval = approvals.get(approvalId);
        return approval != null && approval.complete(decision);
    }

    public boolean isWaiting(String approvalId) {
        // Approval lookups use normalized command identities; blank values indicate a caller contract violation.
        if (!StringUtils.hasText(approvalId)) {
            throw new IllegalArgumentException("Approval id is required");
        }
        return approvals.containsKey(approvalId);
    }
}
