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

import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeApprovalRegistry;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolCallLedgerService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/** Owner-scoped approval recovery. Reads never decide, expire or reserve an approval. */
@Service
public class AgentPendingApprovalQuery {
    private static final int LIMIT = 64;
    private final AgentRunService runs;
    private final AgentSessionService sessions;
    private final AgentToolCallDao calls;
    private final AgentToolCallLedgerService ledger;
    private final AgentToolRegistry tools;
    private final AgentRuntimeApprovalRegistry waiters;

    public AgentPendingApprovalQuery(
            AgentRunService runs,
            AgentSessionService sessions,
            AgentToolCallDao calls,
            AgentToolCallLedgerService ledger,
            AgentToolRegistry tools,
            AgentRuntimeApprovalRegistry waiters) {
        this.runs = runs;
        this.sessions = sessions;
        this.calls = calls;
        this.ledger = ledger;
        this.tools = tools;
        this.waiters = waiters;
    }

    private org.apache.hertzbeat.ai.gateway.conversation.AgentApprovalProposalView proposalViews;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setProposalViews(
            org.apache.hertzbeat.ai.gateway.conversation.AgentApprovalProposalView views) {
        this.proposalViews = views;
    }

    private org.apache.hertzbeat.ai.gateway.conversation.AgentApprovalSummary proposalSummary(
            org.apache.hertzbeat.common.entity.agent.AgentToolCall row) {
        return proposalViews == null
                ? org.apache.hertzbeat.ai.gateway.conversation.AgentApprovalSummary.from(row)
                : proposalViews.summary(row);
    }

    private org.apache.hertzbeat.ai.gateway.tool.monitor.AgentInlineCollectionToolService inlineCollections;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setInlineCollections(org.apache.hertzbeat.ai.gateway.tool.monitor.AgentInlineCollectionToolService service) {
        inlineCollections = service;
    }

    @Transactional(readOnly = true)
    public View read(String runUid, GatewayEnvelope envelope) {
        var run =
                runs.findRun(runUid)
                        .filter(
                                value ->
                                        AgentRuntimeEntryType.USER_INPUT
                                                .name()
                                                .equals(value.getEntryType()))
                        .orElseThrow(AgentPendingApprovalQuery::notFound);
        var session =
                sessions.findOwnedSession(
                                String.valueOf(run.getSessionId()),
                                envelope,
                                AgentRuntimeEntryType.USER_INPUT)
                        .orElseThrow(AgentPendingApprovalQuery::notFound);
        var rows =
                calls.findByRunIdAndApprovalIdIsNotNullOrderByIdAsc(
                        run.getId(), PageRequest.of(0, LIMIT + 1));
        LocalDateTime now = LocalDateTime.now();
        List<Approval> approvals =
                rows.stream()
                        .limit(LIMIT)
                        .filter(
                                row ->
                                        Objects.equals(row.getRunId(), run.getId())
                                                && Objects.equals(row.getRunUid(), run.getRunUid())
                                                && Objects.equals(
                                                        row.getSessionId(), session.getId())
                                                && Objects.equals(
                                                        row.getSessionUid(),
                                                        session.getSessionUid()))
                        .map(row -> project(row, envelope, now, "RUNNING".equals(run.getStatus())))
                        .toList();
        return new View(run.getRunUid(), session.getSessionUid(), approvals, rows.size() > LIMIT);
    }

    private Approval project(
            AgentToolCall row, GatewayEnvelope envelope, LocalDateTime now, boolean running) {
        boolean pending =
                "REQUIRE_APPROVAL".equals(row.getPolicyDecision()) && "PENDING".equals(row.getApprovalStatus())
                        && "WAITING_APPROVAL".equals(row.getStatus());
        boolean expired =
                pending
                        && (row.getApprovalExpiresAt() == null
                                || !row.getApprovalExpiresAt().isAfter(now));
        boolean active =
                pending && !expired && running && waiters.isAwaitingDecision(row.getApprovalId());
        boolean canDecide =
                active
                        && tools.find(row.getToolName())
                                .filter(
                                        tool ->
                                                tool.descriptor()
                                                        .getRisk()
                                                        .name()
                                                        .equals(row.getRisk()))
                                .map(
                                        tool ->
                                                ledger.canDecide(
                                                        envelope.getActor(), tool.descriptor()))
                                .orElse(false);
        String status =
                expired
                        ? "EXPIRED"
                        : pending
                                ? active ? "WAITING_APPROVAL" : "UNAVAILABLE"
                                : row.getApprovalStatus();
        return new Approval(
                row.getApprovalId(),
                row.getToolCallId(),
                row.getToolName(),
                status,
                row.getApprovalExpiresAt(),
                canDecide && (!"monitor.collection_detect".equals(row.getToolName()) || inlineCollections != null && inlineCollections.approvalPreview(row, envelope) != null),
                proposalSummary(row).withCollection(inlineCollections == null ? null : inlineCollections.approvalPreview(row, envelope)));
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent run not found");
    }

    /** Bounded approval projection for exactly one owned run. */
    public record View(
            String runUid, String sessionUid, List<Approval> approvals, boolean truncated) {}

    /** Safe approval identity and decision capability, without tool inputs. */
    public record Approval(
            String approvalId,
            String toolCallId,
            String toolName,
            String status,
            LocalDateTime expiresAt,
            boolean canDecide, AgentApprovalSummary summary) {
        public Approval(String approvalId, String toolCallId, String toolName, String status,
                LocalDateTime expiresAt, boolean canDecide) {
            this(approvalId, toolCallId, toolName, status, expiresAt, canDecide, null);
        }
    }
}
