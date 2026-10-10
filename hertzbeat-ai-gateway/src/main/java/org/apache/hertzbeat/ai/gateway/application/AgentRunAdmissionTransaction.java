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

package org.apache.hertzbeat.ai.gateway.application;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.application.AgentRunAdmission.Decision;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunStatus;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.ai.gateway.contract.AgentRunRequestSnapshot;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** Serializes run admission after the canonical session has been resolved. */
@Service
public class AgentRunAdmissionTransaction {

    private final AgentSessionDao sessionDao;
    private final AgentRunDao runDao;
    private final AgentRunService runService;
    private final AgentTranscriptRecorder transcriptRecorder;
    private final AgentTargetCanonicalizationService targetCanonicalizationService;

    public AgentRunAdmissionTransaction(AgentSessionDao sessionDao, AgentRunDao runDao,
                                        AgentRunService runService, AgentTranscriptRecorder transcriptRecorder,
                                        AgentTargetCanonicalizationService targetCanonicalizationService) {
        this.sessionDao = sessionDao;
        this.runDao = runDao;
        this.runService = runService;
        this.transcriptRecorder = transcriptRecorder;
        this.targetCanonicalizationService = targetCanonicalizationService;
    }

    @Transactional
    public AgentRunAdmission admit(Long sessionId, InvokeCommand command) {
        return admit(sessionId, command, command);
    }

    @Transactional
    public AgentRunAdmission admit(Long sessionId, InvokeCommand sourceCommand, InvokeCommand executionCommand) {
        AgentSession session = sessionDao.findFirstById(sessionId)
                .orElseThrow(() -> new IllegalStateException("Agent run session disappeared during admission"));
        validateSessionIdentity(session, sourceCommand);
        AgentApprovalHandling approvalHandling = approvalHandling(sourceCommand.replyMode());
        Optional<AgentRun> existing = runDao.findBySessionIdAndMessageId(
                session.getId(), sourceCommand.userInput().getMessageId());
        if (existing.isPresent()) {
            InvokeCommand replayCommand = replayCommand(sourceCommand, existing.get(), executionCommand);
            if (replayCommand == null) {
                return admission(Decision.REJECT_MISMATCH, session, existing.get(), approvalHandling);
            }
            String fingerprint = AgentRunRequestFingerprint.from(replayCommand, approvalHandling);
            return admitExisting(session, existing.get(), replayCommand, approvalHandling, fingerprint);
        }
        if (executionCommand == null) {
            throw new IllegalStateException("Canonical target is required for a new Agent run");
        }
        AgentRunRequestSnapshot requestSnapshot = AgentRunRequestFingerprint.snapshot(
                executionCommand, approvalHandling);
        String fingerprint = AgentRunRequestFingerprint.from(requestSnapshot);
        return createAndAdmit(session, executionCommand, approvalHandling, fingerprint, requestSnapshot);
    }

    private InvokeCommand replayCommand(InvokeCommand sourceCommand, AgentRun run, InvokeCommand executionCommand) {
        if (!targetCanonicalizationService.requiresCanonicalization(sourceCommand)) {
            return executionCommand == null ? sourceCommand : executionCommand;
        }
        try {
            return targetCanonicalizationService.replayCommand(sourceCommand, AgentRunService.targetFromRun(run));
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private AgentRunAdmission createAndAdmit(AgentSession session, InvokeCommand command,
                                             AgentApprovalHandling approvalHandling, String fingerprint,
                                             AgentRunRequestSnapshot requestSnapshot) {
        List<TranscriptMessage> history = transcriptRecorder.chatHistory(session.getId());
        AgentRun run = runService.createOrResumeRun(session, command.userInput(), command.entryType());
        transcriptRecorder.recordUserTranscriptEntry(session, run, command.userInput(),
                AgentRunRequestFingerprint.VERSION, fingerprint, requestSnapshot);
        AgentRun running = runService.markRunning(run);
        return new AgentRunAdmission(Decision.EXECUTE_NEW, session, running, approvalHandling, history);
    }

    private AgentRunAdmission admitExisting(AgentSession session, AgentRun run, InvokeCommand command,
                                            AgentApprovalHandling approvalHandling, String fingerprint) {
        if (!sameRunIdentity(session, run, command)) {
            return admission(Decision.REJECT_MISMATCH, session, run, approvalHandling);
        }
        Optional<TranscriptMessage> requestMessage = transcriptRecorder.findRunRequestMessage(run.getId());
        if (requestMessage.isEmpty()) {
            if (isScheduleReservation(run, command)) {
                return admitScheduleReservation(session, run, command, approvalHandling, fingerprint);
            }
            return admission(Decision.REJECT_MISMATCH, session, run, approvalHandling);
        }
        if (!matchesFingerprint(requestMessage.get(), fingerprint)) {
            return admission(Decision.REJECT_MISMATCH, session, run, approvalHandling);
        }
        AgentRunStatus status = status(run);
        if (status == AgentRunStatus.RUNNING) {
            return admission(Decision.REPLAY_ACTIVE, session, run, approvalHandling);
        }
        if (status == AgentRunStatus.SUCCEEDED
                || status == AgentRunStatus.FAILED
                || status == AgentRunStatus.CANCELLED
                || status == AgentRunStatus.RECOVERY_REQUIRED) {
            return admission(Decision.REPLAY_TERMINAL, session, run, approvalHandling);
        }
        return admission(Decision.REJECT_MISMATCH, session, run, approvalHandling);
    }

    private AgentRunAdmission admitScheduleReservation(AgentSession session, AgentRun run, InvokeCommand command,
                                                       AgentApprovalHandling approvalHandling, String fingerprint) {
        List<TranscriptMessage> history = transcriptRecorder.chatHistory(session.getId());
        transcriptRecorder.recordUserTranscriptEntry(session, run, command.userInput(),
                AgentRunRequestFingerprint.VERSION, fingerprint);
        AgentRun running = runService.markRunning(run);
        return new AgentRunAdmission(Decision.EXECUTE_NEW, session, running, approvalHandling, history);
    }

    private boolean matchesFingerprint(TranscriptMessage requestMessage, String fingerprint) {
        return Objects.equals(AgentRunRequestFingerprint.VERSION, requestMessage.getRequestFingerprintVersion())
                && Objects.equals(fingerprint, requestMessage.getRequestFingerprint());
    }

    private boolean sameRunIdentity(AgentSession session, AgentRun run, InvokeCommand command) {
        return Objects.equals(session.getId(), run.getSessionId())
                && Objects.equals(command.userInput().getMessageId(), run.getMessageId())
                && Objects.equals(command.entryType().name(), run.getEntryType());
    }

    private boolean isScheduleReservation(AgentRun run, InvokeCommand command) {
        return status(run) == AgentRunStatus.CREATED
                && command.entryType() == AgentRuntimeEntryType.SCHEDULE_TRIGGER
                && Objects.equals(AgentRuntimeEntryType.SCHEDULE_TRIGGER.name(), run.getEntryType())
                && Objects.equals(AgentRunService.targetFromRun(run), command.userInput().getTarget());
    }

    private AgentRunAdmission admission(Decision decision, AgentSession session, AgentRun run,
                                        AgentApprovalHandling approvalHandling) {
        return new AgentRunAdmission(decision, session, run, approvalHandling, List.of());
    }

    private AgentRunStatus status(AgentRun run) {
        if (!StringUtils.hasText(run.getStatus())) {
            throw new IllegalStateException("Agent run status is required during admission");
        }
        return AgentRunStatus.valueOf(run.getStatus());
    }

    private AgentApprovalHandling approvalHandling(ReplyMode replyMode) {
        return replyMode == ReplyMode.STREAM
                ? AgentApprovalHandling.WAIT_FOR_DECISION
                : AgentApprovalHandling.DENY;
    }

    private void validateSessionIdentity(AgentSession session, InvokeCommand command) {
        AgentActor actor = command.envelope().getActor();
        boolean matches = actor != null
                && Objects.equals(session.getWorkspaceId(), command.envelope().getWorkspaceId())
                && Objects.equals(session.getChannel(), command.envelope().getChannelId())
                && Objects.equals(session.getActorType(), actor.getType())
                && Objects.equals(session.getActorId(), actor.getId())
                && Objects.equals(session.getOriginEntryType(), command.entryType().name())
                && Objects.equals(session.getConversationId(), command.userInput().getConversationId());
        if (!matches) {
            throw new IllegalArgumentException("Agent run session identity does not match the command");
        }
    }
}
