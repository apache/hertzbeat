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

import java.util.Objects;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.application.AgentRunRequestFingerprint;
import org.apache.hertzbeat.ai.gateway.application.AgentTargetCanonicalizationService;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand;
import org.apache.hertzbeat.ai.gateway.channel.core.ChannelId;
import org.apache.hertzbeat.ai.gateway.contract.AgentRunRequestSnapshot;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.runtime.AgentGroundingEvidenceVerifier;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Builds the durable result/error projection used by replay and run queries.
 */
@Service
public class AgentRunSnapshotService {

    private static final String LEGACY_COMPLETION_SUMMARY = "Runtime completed.";

    private final AgentTranscriptRecorder transcriptRecorder;
    private final AgentGroundingEvidenceVerifier groundingVerifier;

    public AgentRunSnapshotService(AgentTranscriptRecorder transcriptRecorder,
                                   AgentGroundingEvidenceVerifier groundingVerifier) {
        this.transcriptRecorder = transcriptRecorder;
        this.groundingVerifier = groundingVerifier;
    }

    public AgentRunSnapshot snapshot(AgentSession session, AgentRun run) {
        AgentRunStatus status = AgentRunStatus.valueOf(run.getStatus());
        String result = successfulResult(run, status);
        String error = terminalError(run, status, result);
        boolean replayAvailable = switch (status) {
            case SUCCEEDED -> StringUtils.hasText(result);
            case FAILED, CANCELLED, RECOVERY_REQUIRED -> StringUtils.hasText(error);
            case CREATED, RUNNING -> true;
        };
        return new AgentRunSnapshot(
                run.getRunUid(),
                session.getSessionUid(),
                run.getMessageId(),
                run.getStatus(),
                AgentRunService.targetFromRun(run),
                result,
                error,
                replayAvailable,
                run.getStartedAt(),
                run.getCompletedAt(),
                retryRequest(session, run, status));
    }

    private AgentRetryRequest retryRequest(AgentSession session, AgentRun run, AgentRunStatus status) {
        if (status == AgentRunStatus.SUCCEEDED || status == AgentRunStatus.RECOVERY_REQUIRED
                || !Objects.equals(session.getId(), run.getSessionId())
                || !Objects.equals(ChannelId.WEB_UI.id(), session.getChannel())
                || !Objects.equals(AgentRuntimeEntryType.USER_INPUT.name(), session.getOriginEntryType())
                || !Objects.equals(AgentRuntimeEntryType.USER_INPUT.name(), run.getEntryType())) {
            return null;
        }
        Optional<TranscriptMessage> marker = transcriptRecorder.findUniqueRunRequestMessage(run.getId());
        if (marker.isEmpty()) {
            return null;
        }
        TranscriptMessage message = marker.get();
        AgentRunRequestSnapshot request = message.getRequestSnapshot();
        if (message.getRole() != TranscriptMessage.TranscriptRole.USER || message.isPruned() || request == null
                || !Objects.equals(AgentRunRequestSnapshot.VERSION, request.version())
                || !Objects.equals(AgentRunRequestFingerprint.VERSION, message.getRequestFingerprintVersion())
                || !Objects.equals(session.getConversationId(), request.conversationId())
                || !Objects.equals(run.getMessageId(), request.messageId())
                || !Objects.equals(run.getEntryType(), request.entryType())
                || !Objects.equals(AgentRunService.targetFromRun(run), request.target())
                || request.alertIncident() != null
                || !Objects.equals(message.text(), request.message())
                || !Objects.equals(AgentApprovalHandling.WAIT_FOR_DECISION.name(), request.approvalHandling())
                || !Objects.equals(GatewayCommand.ReplyMode.STREAM.name(), request.replyMode())
                || !StringUtils.hasText(request.message())
                || !StringUtils.hasText(request.preferredLanguage())
                || request.attachments().stream().anyMatch(value -> !StringUtils.hasText(value))) {
            return null;
        }
        try {
            if (!Objects.equals(message.getRequestFingerprint(), AgentRunRequestFingerprint.from(request))) {
                return null;
            }
        } catch (RuntimeException ignored) {
            return null;
        }
        return new AgentRetryRequest(request.conversationId(), request.messageId(), request.message(),
                AgentTargetCanonicalizationService.retrySourceIntent(request.target()),
                request.attachments(), request.preferredLanguage());
    }

    private String terminalError(AgentRun run, AgentRunStatus status, String result) {
        if (status == AgentRunStatus.SUCCEEDED && !StringUtils.hasText(result)) {
            return "Agent run result is no longer available.";
        }
        if ((status == AgentRunStatus.FAILED || status == AgentRunStatus.CANCELLED
                || status == AgentRunStatus.RECOVERY_REQUIRED)
                && !StringUtils.hasText(run.getErrorMessage())) {
            return "Agent run terminal reason is no longer available.";
        }
        return status == AgentRunStatus.FAILED || status == AgentRunStatus.CANCELLED
                || status == AgentRunStatus.RECOVERY_REQUIRED
                ? run.getErrorMessage() : null;
    }

    private String successfulResult(AgentRun run, AgentRunStatus status) {
        if (status != AgentRunStatus.SUCCEEDED) {
            return null;
        }
        if (!groundingVerifier.hasDurableGrounding(run, AgentRunService.targetFromRun(run))) {
            return null;
        }
        if (StringUtils.hasText(run.getResultSummary())
                && !LEGACY_COMPLETION_SUMMARY.equals(run.getResultSummary())) {
            return run.getResultSummary();
        }
        return transcriptRecorder.findRunFinalAssistantMessage(run.getId())
                .filter(message -> message.toolCalls().isEmpty())
                .map(TranscriptMessage::text)
                .filter(StringUtils::hasText)
                .orElse(null);
    }
}
