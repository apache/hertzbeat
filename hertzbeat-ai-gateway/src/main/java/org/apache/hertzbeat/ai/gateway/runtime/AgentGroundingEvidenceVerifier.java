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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import org.apache.hertzbeat.ai.gateway.application.AgentEntityInvestigationAuthorityService;
import org.apache.hertzbeat.ai.gateway.application.AgentIncidentTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Verifies that a durable grounding proof converges with the successful READ ledger row. */
@Service
public class AgentGroundingEvidenceVerifier {

    private static final ObjectMapper QUIET_JSON = JsonMapper.builder().build();

    private final AgentTranscriptRecorder transcriptRecorder;
    private final AgentToolCallDao toolCallDao;
    private final AgentIncidentTargetAuthorityService incidentAuthority;
    private final AgentEntityInvestigationAuthorityService investigationAuthority;
    private final AgentReadGroundingEvaluator readEvaluator = new AgentReadGroundingEvaluator();
    private final AgentTargetGroundingEvaluator targetEvaluator = new AgentTargetGroundingEvaluator();

    public AgentGroundingEvidenceVerifier(AgentTranscriptRecorder transcriptRecorder,
                                          AgentToolCallDao toolCallDao) {
        this(transcriptRecorder, toolCallDao, null, null);
    }

    @Autowired
    public AgentGroundingEvidenceVerifier(AgentTranscriptRecorder transcriptRecorder, AgentToolCallDao toolCallDao,
                                          AgentIncidentTargetAuthorityService incidentAuthority,
                                          AgentEntityInvestigationAuthorityService investigationAuthority) {
        this.transcriptRecorder = transcriptRecorder;
        this.toolCallDao = toolCallDao;
        this.incidentAuthority = incidentAuthority;
        this.investigationAuthority = investigationAuthority;
    }

    public boolean hasDurableGrounding(AgentRun run, AgentTargetRef target) {
        return !verifiedProofs(run, target).isEmpty();
    }

    /** Stable evidence comes only from matching durable transcript and successful READ ledger rows. */
    public List<AgentGroundingProof> verifiedProofs(AgentRun run, AgentTargetRef target) {
        if (run == null || run.getId() == null || GatewayText.isBlank(run.getRunUid())
                || !groundingEligible(run, target)) {
            return List.of();
        }
        List<TranscriptMessage> candidates = transcriptRecorder.findRunGroundingMessages(run.getId()).stream()
                .filter(Objects::nonNull)
                .filter(message -> message.getRole() == TranscriptMessage.TranscriptRole.TOOL_RESULT)
                .filter(message -> message.getGroundingProof() != null)
                .filter(message -> Objects.equals(run.getRunUid(), message.getGroundingProof().getRunUid()))
                .filter(this::isTypedProof)
                .toList();
        boolean incident = AgentIncidentTargetAuthorityService.isCanonicalTarget(target)
                || AgentEntityInvestigationAuthorityService.isCanonicalTarget(target);
        if (candidates.isEmpty() || !incident && candidates.size() != 1
                || candidates.stream().map(TranscriptMessage::getToolCallId).distinct().count() != candidates.size()) {
            return List.of();
        }
        List<AgentToolCall> ledger = toolCallDao.findByRunIdOrderByGmtCreateAsc(run.getId());
        for (TranscriptMessage message : candidates) {
            List<AgentToolCall> matching = ledger.stream().filter(Objects::nonNull)
                    .filter(call -> Objects.equals(message.getToolCallId(), call.getToolCallId())
                            && Objects.equals(message.getToolName(), call.getToolName())).toList();
            if (matching.size() != 1 || !ledgerMatches(run, target, message, matching.getFirst())) {
                return List.of();
            }
        }
        return candidates.stream().map(TranscriptMessage::getGroundingProof).toList();
    }

    public List<TranscriptMessage> verifiedHistory(AgentRun run, AgentTargetRef target,
                                                   List<TranscriptMessage> history) {
        return verifyHistory(run, target, history).messages();
    }

    public VerifiedHistory verifyHistory(AgentRun run, AgentTargetRef target,
                                         List<TranscriptMessage> history) {
        return verifyHistory(run, target, history, null);
    }

    public VerifiedHistory verifyHistory(AgentRun run, AgentTargetRef target,
                                         List<TranscriptMessage> history, String workspaceId) {
        List<TranscriptMessage> bounded = history == null ? List.of() : List.copyOf(history);
        if (hasDurableGrounding(run, target) && currentAuthorityMatches(workspaceId, target)) {
            return new VerifiedHistory(bounded, true, budgetAttempts(run), taskCheckpoint(run));
        }
        return new VerifiedHistory(
                bounded.stream().map(message -> clearCurrentRunProof(run, message)).toList(),
                false,
                budgetAttempts(run),
                taskCheckpoint(run));
    }

    private boolean currentAuthorityMatches(String workspaceId, AgentTargetRef target) {
        // A historical snapshot proves what was read then. Resuming execution must revalidate the current scope.
        if (AgentIncidentTargetAuthorityService.isCanonicalTarget(target)) {
            return incidentAuthority != null && incidentAuthority.verify(workspaceId, target);
        }
        if (AgentEntityInvestigationAuthorityService.isCanonicalTarget(target)) {
            return investigationAuthority != null && investigationAuthority.verify(workspaceId, target);
        }
        return true;
    }

    private boolean ledgerMatches(AgentRun run, AgentTargetRef target, TranscriptMessage message,
                                  AgentToolCall ledger) {
        AgentGroundingProof proof = message.getGroundingProof();
        if (!(Objects.equals(run.getId(), ledger.getRunId())
                && Objects.equals(run.getRunUid(), ledger.getRunUid())
                && Objects.equals(AgentToolStatus.SUCCEEDED.name(), ledger.getStatus())
                && Objects.equals(AgentToolRisk.READ.name(), ledger.getRisk())
                && Objects.equals(proof.getInputHash(), ledger.getInputHash())
                && Objects.equals(proof.getOutputHash(), outputHash(ledger.getResultOutput()))
                && Objects.equals(proof.getOutputHash(), outputHash(message.text())))) {
            return false;
        }
        Map<String, Object> arguments = arguments(ledger.getInputJson());
        if (arguments == null) {
            return false;
        }
        return target == null
                ? readEvaluator.restores(message, run.getRunUid(), arguments, ledger.getInputHash())
                : targetEvaluator.restoresVerifiedResult(
                        message, run.getRunUid(), target, arguments, ledger.getInputHash());
    }

    private boolean groundingEligible(AgentRun run, AgentTargetRef target) {
        if (Objects.equals(AgentRuntimeEntryType.ALERT_TRIGGER.name(), run.getEntryType())) {
            return AgentIncidentTargetAuthorityService.isCanonicalTarget(target);
        }
        return Objects.equals(AgentRuntimeEntryType.USER_INPUT.name(), run.getEntryType())
                || Objects.equals(AgentRuntimeEntryType.SCHEDULE_TRIGGER.name(), run.getEntryType());
    }

    private boolean isTypedProof(TranscriptMessage message) {
        String version = message.getGroundingProof().getVersion();
        return Objects.equals(AgentGroundingProof.VERSION, version)
                || Objects.equals(AgentReadGroundingEvaluator.VERSION, version);
    }

    private TranscriptMessage clearCurrentRunProof(AgentRun run, TranscriptMessage message) {
        if (message == null || message.getGroundingProof() == null
                || !Objects.equals(run.getRunUid(), message.getGroundingProof().getRunUid())) {
            return message;
        }
        return message.toBuilder().groundingProof(null).groundingRunUid(null).build();
    }

    private String outputHash(String output) {
        return GatewayText.sha256(AgentRuntimeTextSanitizer.redact(output));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> arguments(String json) {
        try {
            Object value = QUIET_JSON.readValue(json, Object.class);
            return value instanceof Map<?, ?> map ? (Map<String, Object>) map : null;
        } catch (IOException | RuntimeException ignored) {
            return null;
        }
    }

    private List<AgentRuntimeReadBudget.Attempt> budgetAttempts(AgentRun run) {
        List<AgentToolCall> rows = toolCallDao.findByRunIdOrderByGmtCreateAsc(run.getId());
        if (rows == null
                || rows.stream()
                        .anyMatch(
                                row ->
                                        row == null
                                                || !Objects.equals(run.getId(), row.getRunId())
                                                || !Objects.equals(run.getRunUid(), row.getRunUid())
                                                || !Objects.equals(
                                                        run.getSessionId(), row.getSessionId())
                                                || GatewayText.isBlank(row.getToolCallId()))
                || rows.stream().map(AgentToolCall::getToolCallId).distinct().count()
                        != rows.size()) {
            throw new IllegalStateException(
                    "Current-run budget ledger is unavailable or has invalid ownership");
        }
        return rows.stream()
                .map(
                        row -> {
                            AgentToolRisk risk =
                                    row.getRisk() == null
                                            ? null
                                            : AgentToolRisk.valueOf(row.getRisk());
                            AgentToolStatus status =
                                    row.getStatus() == null
                                            ? null
                                            : AgentToolStatus.valueOf(row.getStatus());
                            Map<String, Object> input =
                                    risk == AgentToolRisk.READ
                                            ? arguments(row.getInputJson())
                                            : Map.of();
                            if (input == null) {
                                throw new IllegalStateException(
                                        "Current-run read arguments cannot restore budget"
                                                + " accounting");
                            }
                            return new AgentRuntimeReadBudget.Attempt(
                                    row.getToolCallId(),
                                    row.getToolName(),
                                    risk,
                                    status,
                                    input,
                                    risk == AgentToolRisk.READ
                                                    || AgentMonitorMutationSemantics
                                                            .restoresSafeResult(row.getToolName())
                                            ? row.getResultOutput()
                                            : null,
                                    row.getErrorMessage(),
                                    AgentMonitorMutationSemantics.restoresSafeResult(
                                                    row.getToolName())
                                            ? row.getInputHash()
                                            : null,
                                    row.getApprovalId());
                        })
                .toList();
    }

    private AgentTaskCheckpoint taskCheckpoint(AgentRun run) {
        return transcriptRecorder
                .findRunTaskCheckpoint(run.getId())
                .map(TranscriptMessage::getTaskCheckpoint)
                .filter(checkpoint -> Objects.equals(run.getRunUid(), checkpoint.runUid()))
                .orElse(null);
    }

    /** History projection plus the trusted durable-grounding decision made from proof and ledger together. */
    static final class VerifiedHistory {

        private final List<TranscriptMessage> messages;
        private final boolean grounded;
        private final AgentTaskCheckpoint taskCheckpoint;
        private final List<AgentRuntimeReadBudget.Attempt> budgetAttempts;

        private VerifiedHistory(
                List<TranscriptMessage> messages,
                boolean grounded,
                List<AgentRuntimeReadBudget.Attempt> budgetAttempts,
                AgentTaskCheckpoint taskCheckpoint) {
            this.taskCheckpoint = taskCheckpoint;
            this.messages = messages == null ? List.of() : List.copyOf(messages);
            this.grounded = grounded;
            this.budgetAttempts = List.copyOf(budgetAttempts);
        }

        List<TranscriptMessage> messages() {
            return messages;
        }

        List<AgentRuntimeReadBudget.Attempt> budgetAttempts() {
            return budgetAttempts;
        }

        AgentTaskCheckpoint taskCheckpoint() {
            return taskCheckpoint;
        }

        boolean grounded() {
            return grounded;
        }
    }
}
