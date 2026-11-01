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

import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentBatchService;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

/**
 * One explicit child per source run, serialized across application instances by the session lock.
 */
@Service
public class AgentBatchContinuationAdmission {
    private final AgentSessionDao sessions;
    private final AgentRunDao runs;
    private final AgentRunService runService;
    private final AgentTranscriptRecorder transcripts;
    private final AgentBatchService batches;

    public AgentBatchContinuationAdmission(
            AgentSessionDao sessions,
            AgentRunDao runs,
            AgentRunService runService,
            AgentTranscriptRecorder transcripts,
            AgentBatchService batches) {
        this.sessions = sessions;
        this.runs = runs;
        this.runService = runService;
        this.transcripts = transcripts;
        this.batches = batches;
    }

    @Transactional
    public Admitted admit(String sourceUid, String hash, GatewayEnvelope envelope) {
        AgentRun initial = runs.findByRunUid(sourceUid).orElseThrow();
        AgentSession session = sessions.findFirstById(initial.getSessionId()).orElseThrow();
        AgentRun source = runs.findByRunUid(sourceUid).orElseThrow();
        var frozen = batches.validate(session, source, envelope, hash);
        if ("CANCELLED".equals(source.getStatus())) {
            throw new IllegalStateException("Cancelled batch runs cannot be continued");
        }
        var child = runs.findByBatchParentRunUid(sourceUid);
        if (child.isPresent()) {
            return replay(session, child.get(), envelope);
        }
        if (AgentBatchService.active(source)) {
            return replay(session, source, envelope);
        }
        frozen = batches.prepare(session, source, envelope, hash);
        if (runs.existsBySessionIdAndStatusIn(session.getId(), List.of("CREATED", "RUNNING"))) {
            throw new IllegalStateException("Another run is active in this session");
        }
        AgentRun root = frozen.root();
        if (root.getBatchRootRunUid() == null) {
            root.setBatchRootRunUid(root.getRunUid());
            root.setBatchSegment(0);
            root.setBatchReadOnly(false);
            runs.saveAndFlush(root);
        }
        int segment = (source.getBatchSegment() == null ? 0 : source.getBatchSegment()) + 1;
        boolean readOnly = batches.needsReconciliation(frozen);
        String messageId = "batch:" + sourceUid;
        UserInput input =
                UserInput.builder()
                        .conversationId(session.getConversationId())
                        .messageId(messageId)
                        .target(AgentRunService.targetFromRun(root))
                        .message(
                                UserInput.Message.builder()
                                        .text(
                                                java.util.ResourceBundle.getBundle(
                                                                "agent_task",
                                                                java.util.Locale.forLanguageTag(
                                                                        envelope
                                                                                                .getPreferredLanguage()
                                                                                        == null
                                                                                ? "en-US"
                                                                                : envelope
                                                                                        .getPreferredLanguage()))
                                                        .getString(
                                                                readOnly
                                                                        ? "batchReconcileRequest"
                                                                        : "batchContinueRequest"))
                                        .attachments(List.of())
                                        .build())
                        .build();
        var command = command(envelope, input);
        var history = transcripts.chatHistory(session.getId());
        AgentRun run =
                runService.createBatchSegment(
                        session, input, source, root.getRunUid(), segment, readOnly);
        var snapshot =
                AgentRunRequestFingerprint.snapshot(
                        command, AgentApprovalHandling.WAIT_FOR_DECISION);
        transcripts.recordUserTranscriptEntry(
                session,
                run,
                input,
                AgentRunRequestFingerprint.VERSION,
                AgentRunRequestFingerprint.from(snapshot),
                snapshot);
        run = runService.markRunning(run);
        return new Admitted(
                command,
                new AgentRunAdmission(
                        AgentRunAdmission.Decision.EXECUTE_NEW,
                        session,
                        run,
                        AgentApprovalHandling.WAIT_FOR_DECISION,
                        history));
    }

    private Admitted replay(AgentSession session, AgentRun run, GatewayEnvelope envelope) {
        batches.requireOwner(session, run, envelope);
        var marker = transcripts.findUniqueRunRequestMessage(run.getId()).orElseThrow();
        var snapshot = Objects.requireNonNull(marker.getRequestSnapshot());
        UserInput input =
                UserInput.builder()
                        .conversationId(session.getConversationId())
                        .messageId(run.getMessageId())
                        .target(snapshot.target())
                        .message(
                                UserInput.Message.builder()
                                        .text(snapshot.message())
                                        .attachments(snapshot.attachments())
                                        .build())
                        .build();
        var decision =
                AgentBatchService.active(run)
                        ? AgentRunAdmission.Decision.REPLAY_ACTIVE
                        : AgentRunAdmission.Decision.REPLAY_TERMINAL;
        return new Admitted(
                command(envelope, input),
                new AgentRunAdmission(
                        decision,
                        session,
                        run,
                        AgentApprovalHandling.WAIT_FOR_DECISION,
                        List.of()));
    }

    private GatewayCommand.InvokeCommand command(GatewayEnvelope envelope, UserInput input) {
        return new GatewayCommand.InvokeCommand(
                envelope, GatewayCommand.ReplyMode.STREAM, input.getMessageId(), input);
    }

    /** Canonical request paired with the sole durable execution admission. */
    public record Admitted(GatewayCommand.InvokeCommand command, AgentRunAdmission admission) {}
}
