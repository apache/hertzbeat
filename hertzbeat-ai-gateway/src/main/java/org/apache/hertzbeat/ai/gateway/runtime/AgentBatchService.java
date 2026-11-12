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

import org.apache.hertzbeat.ai.gateway.application.AgentRunRequestFingerprint;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

/** Rebuilds frozen batch progress from owner-bound checkpoints and the native ledger. */
@Service
public class AgentBatchService {
    private final AgentRunDao runs;
    private final AgentTranscriptRecorder transcripts;
    private final AgentGroundingEvidenceVerifier verifier;
    private final AgentRuntimeProperties properties;
    private final AgentRuntimeControlRegistry controls;
    private final AgentToolRegistry tools;
    private final AgentPolicyService policy;

    private AgentNativeBatchProgress nativeProgress;

    // Ledger-only hosting contexts keep the authoritative checkpoint view. The full app adds native
    // progress.
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setNativeProgress(AgentNativeBatchProgress nativeProgress) {
        this.nativeProgress = nativeProgress;
    }

    public AgentBatchService(
            AgentRunDao runs,
            AgentTranscriptRecorder transcripts,
            AgentGroundingEvidenceVerifier verifier,
            AgentRuntimeProperties properties,
            AgentRuntimeControlRegistry controls,
            AgentToolRegistry tools,
            AgentPolicyService policy) {
        this.runs = runs;
        this.transcripts = transcripts;
        this.verifier = verifier;
        this.properties = properties;
        this.controls = controls;
        this.tools = tools;
        this.policy = policy;
    }

    public void requireOwner(AgentSession session, AgentRun run, GatewayEnvelope envelope) {
        AgentActor actor = envelope.getActor();
        if (actor == null
                || !Objects.equals(session.getId(), run.getSessionId())
                || !Objects.equals(session.getWorkspaceId(), envelope.getWorkspaceId())
                || !Objects.equals(session.getChannel(), envelope.getChannelId())
                || !Objects.equals(session.getActorType(), actor.getType())
                || !Objects.equals(session.getActorId(), actor.getId())
                || !AgentRuntimeEntryType.USER_INPUT.name().equals(session.getOriginEntryType())
                || !AgentRuntimeEntryType.USER_INPUT.name().equals(run.getEntryType())) {
            throw new IllegalArgumentException("Batch run owner does not match");
        }
    }

    public Optional<AgentBatchProgress> progress(
            AgentSession session, AgentRun member, GatewayEnvelope envelope) {
        requireOwner(session, member, envelope);
        Frozen frozen = load(session, member, envelope);
        if (frozen == null) {
            return Optional.empty();
        }
        AgentRun latest = frozen.chain().getLast();
        Replayed replay = replay(frozen, frozen.chain().size());
        String action = action(frozen, replay, latest, envelope.getActor());
        String reason =
                expired(frozen)
                        ? "PLAN_EXPIRED"
                        : active(latest)
                                ? "ACTIVE"
                                : controls.isActive(latest.getRunUid())
                                        ? "STOPPING"
                                        : "NONE".equals(action) && !replay.batch().finished()
                                                ? "REVIEW_OR_PERMISSION_REQUIRED"
                                                : replay.batch().onlyPreflightFailuresRemain()
                                                        ? "PREFLIGHT_FAILED"
                                                        : null;
        AgentBatchProgress progress =
                AgentBatchProgress.from(
                        frozen.root().getRunUid(),
                        latest.getRunUid(),
                        latest.getBatchParentRunUid() == null
                                ? latest.getRunUid()
                                : latest.getBatchParentRunUid(),
                        ordinal(latest),
                        latest.getStatus(),
                        frozen.checkpoint().goal(),
                        replay.batch(),
                        attempts(latest, session).size(),
                        frozen.budget(),
                        action,
                        reason);
        if (nativeProgress != null && active(latest)) {
            progress =
                    nativeProgress.overlay(
                            progress,
                            frozen.checkpoint().goal(),
                            frozen.checkpoint().monitorBatch(),
                            envelope);
        }
        return Optional.of(progress);
    }

    /** Read the original owner-checked native manifest; never performs continuation or writes. */
    public Optional<PlanView> plan(
            AgentSession session, AgentRun member, GatewayEnvelope envelope) {
        requireOwner(session, member, envelope);
        Frozen frozen = load(session, member, envelope);
        if (frozen == null
                || !"monitor-batch.v2".equals(frozen.checkpoint().monitorBatch().version())) {
            return Optional.empty();
        }
        var goal = frozen.checkpoint().goal();
        var snapshot = frozen.checkpoint().monitorBatch();
        List<java.util.Map<String, Object>> manifest = new java.util.ArrayList<>();
        for (int i = 0; i < snapshot.items().size(); i++) {
            var item = snapshot.items().get(i);
            String key = goal.createTargets().get(i).idempotencyKey();
            manifest.add(
                    AgentMonitorBulkArguments.item(
                            key == null ? item.id() : key, item.arguments()));
        }
        return Optional.of(
                new PlanView(
                        frozen.root().getRunUid(),
                        snapshot.planHash(),
                        goal.expectedCount(),
                        List.copyOf(manifest)));
    }

    /** Complete canonical replay identities from the frozen server-owned request. */
    public record PlanView(
            String rootRunUid,
            String planHash,
            Integer expectedCount,
            List<java.util.Map<String, Object>> items) {}

    public Frozen validate(
            AgentSession session, AgentRun source, GatewayEnvelope envelope, String planHash) {
        requireOwner(session, source, envelope);
        Frozen frozen =
                Objects.requireNonNull(
                        load(session, source, envelope), "A frozen batch plan is required");
        if (!Objects.equals(frozen.checkpoint().monitorBatch().planHash(), planHash)) {
            throw new IllegalArgumentException("Frozen batch plan differs");
        }
        requireUnexpired(frozen);
        return frozen;
    }

    public Frozen prepare(
            AgentSession session, AgentRun source, GatewayEnvelope envelope, String planHash) {
        requireOwner(session, source, envelope);
        Frozen frozen =
                Objects.requireNonNull(
                        load(session, source, envelope), "A frozen batch plan is required");
        if (!Objects.equals(frozen.checkpoint().monitorBatch().planHash(), planHash)) {
            throw new IllegalArgumentException("Frozen batch plan differs");
        }
        if (!Objects.equals(frozen.chain().getLast().getRunUid(), source.getRunUid())) {
            throw new IllegalArgumentException("Only the latest frozen batch segment may continue");
        }
        Replayed replay = replay(frozen, frozen.chain().size());
        if ("NONE".equals(action(frozen, replay, source, envelope.getActor()))) {
            throw new IllegalStateException("Batch continuation is not currently available");
        }
        return frozen;
    }

    public boolean needsReconciliation(Frozen frozen) {
        return replay(frozen, frozen.chain().size()).batch().reviewRequired();
    }

    AgentRuntimeContext contextForSegment(
            AgentRuntimeContext context, AgentSession session, AgentRun run) {
        if (run.getBatchParentRunUid() == null) {
            return context;
        }
        GatewayEnvelope envelope =
                GatewayEnvelope.builder()
                        .channelId(context.getChannelId())
                        .receivedAt(context.getReceivedAt())
                        .workspaceId(context.getWorkspaceId())
                        .actor(context.getActor())
                        .build();
        requireOwner(session, run, envelope);
        Frozen frozen =
                Objects.requireNonNull(load(session, run, envelope), "Missing frozen root plan");
        requireUnexpired(frozen);
        int index = -1;
        for (int i = 0; i < frozen.chain().size(); i++) {
            if (Objects.equals(run.getRunUid(), frozen.chain().get(i).getRunUid())) {
                index = i;
                break;
            }
        }
        if (index < 1 || index != ordinal(run)) {
            throw new IllegalStateException("Invalid batch lineage");
        }
        Replayed prior = replay(frozen, index);
        if (prior.batch().reviewRequired() && !Boolean.TRUE.equals(run.getBatchReadOnly())) {
            throw new IllegalStateException(
                    "Uncertain batch effects require read-only reconciliation");
        }
        return context.withBatchContinuation(
                new AgentBatchContinuation(
                        frozen.root().getRunUid(),
                        index,
                        frozen.checkpoint().goal(),
                        prior.batch().snapshot(),
                        prior.attempts(),
                        frozen.budget(),
                        Boolean.TRUE.equals(run.getBatchReadOnly()),
                        frozen.checkpoint().manifestReference()));
    }

    void requireRunning(AgentRun run) {
        AgentRun current = runs.findByRunUid(run.getRunUid()).orElseThrow();
        if (!Objects.equals(current.getId(), run.getId())
                || !"RUNNING".equals(current.getStatus())) {
            throw new AgentRuntimeStoppedException(
                    "Run is no longer active; explicit continuation is required", true);
        }
    }

    private Frozen load(AgentSession session, AgentRun member, GatewayEnvelope envelope) {
        String rootUid =
                member.getBatchRootRunUid() == null
                        ? member.getRunUid()
                        : member.getBatchRootRunUid();
        AgentRun root = runs.findByRunUid(rootUid).orElseThrow();
        requireOwner(session, root, envelope);
        AgentTaskCheckpoint checkpoint =
                transcripts
                        .findRunTaskCheckpoint(root.getId())
                        .map(TranscriptMessage::getTaskCheckpoint)
                        .orElse(null);
        if (checkpoint == null || checkpoint.monitorBatch() == null) {
            return null;
        }
        TranscriptMessage marker =
                transcripts.findUniqueRunRequestMessage(root.getId()).orElseThrow();
        var request = marker.getRequestSnapshot();
        if (marker.isPruned()
                || request == null
                || marker.getRole() != TranscriptMessage.TranscriptRole.USER
                || !Objects.equals(
                        AgentRunRequestFingerprint.VERSION, marker.getRequestFingerprintVersion())
                || !Objects.equals(
                        AgentRunRequestFingerprint.from(request), marker.getRequestFingerprint())
                || !Objects.equals(request.message(), marker.text())
                || !Objects.equals(request.conversationId(), session.getConversationId())
                || !Objects.equals(request.messageId(), root.getMessageId())
                || !Objects.equals(request.entryType(), root.getEntryType())
                || !Objects.equals(request.target(), AgentRunService.targetFromRun(root))) {
            throw new IllegalStateException("Original batch request is unavailable or differs");
        }
        AgentRuntimeContext original =
                AgentRuntimeContext.builder()
                        .entryType(AgentRuntimeEntryType.USER_INPUT)
                        .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                        .channelId(session.getChannel())
                        .workspaceId(session.getWorkspaceId())
                        .receivedAt(0L)
                        .actor(envelope.getActor())
                        .userMessage(request.message())
                        .sessionUid(session.getSessionUid())
                        .runId(root.getId())
                        .runUid(rootUid)
                        .runSessionId(session.getId())
                        .effectiveTarget(request.target())
                        .currentTimeIso("2000-01-01T00:00:00Z")
                        .timezone("UTC")
                        .traceId(rootUid)
                        .build();
        if (!checkpoint.validForObservation(original)) {
            throw new IllegalStateException("Invalid original batch binding");
        }
        new AgentMonitorBatch(rootUid).restore(checkpoint.goal(), checkpoint.monitorBatch());
        List<AgentRun> chain = new ArrayList<>();
        chain.add(root);
        for (AgentRun candidate : runs.findByBatchRootRunUidOrderByBatchSegmentAsc(rootUid)) {
            if (Objects.equals(candidate.getRunUid(), rootUid)) {
                continue;
            }
            requireOwner(session, candidate, envelope);
            if (chain.size() > 64
                    || ordinal(candidate) != chain.size()
                    || !Objects.equals(
                            candidate.getBatchParentRunUid(), chain.getLast().getRunUid())) {
                throw new IllegalStateException("Invalid frozen batch lineage");
            }
            chain.add(candidate);
        }
        if (chain.stream().noneMatch(run -> Objects.equals(member.getRunUid(), run.getRunUid()))) {
            throw new IllegalStateException("Run is outside the frozen batch lineage");
        }
        int budget =
                Math.min(
                        checkpoint.toolBudget(),
                        Math.min(properties.getMaxToolCalls(), properties.getMaxSteps()));
        return new Frozen(root, checkpoint, List.copyOf(chain), budget);
    }

    private Replayed replay(Frozen frozen, int count) {
        AgentMonitorBatch batch = new AgentMonitorBatch(frozen.root().getRunUid());
        batch.restore(frozen.checkpoint().goal(), frozen.checkpoint().monitorBatch());
        List<AgentRuntimeReadBudget.Attempt> all = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            AgentRun run = frozen.chain().get(i);
            if (i > 0) {
                batch.startSegment(i, Boolean.TRUE.equals(run.getBatchReadOnly()));
            }
            for (var attempt : attempts(run, null)) {
                var call =
                        AgentRuntimeToolCall.builder()
                                .toolCallId(attempt.toolCallId())
                                .toolName(attempt.toolName())
                                .arguments(attempt.arguments())
                                .build();
                batch.observe(
                        call,
                        attempt.risk(),
                        attempt.status(),
                        attempt.output(),
                        attempt.trustedInputHash(),
                        true);
                batch.recordApproval(call, attempt.approvalId());
                if (active(run) && attempt.status() == AgentToolStatus.RUNNING) {
                    batch.noteStarted(call);
                }
                all.add(attempt);
            }
            AgentTaskCheckpoint saved =
                    transcripts
                            .findRunTaskCheckpoint(run.getId())
                            .map(TranscriptMessage::getTaskCheckpoint)
                            .orElse(null);
            if (saved != null && saved.monitorBatch() != null) {
                if (!Objects.equals(saved.goal(), frozen.checkpoint().goal())
                        || !Objects.equals(saved.runUid(), run.getRunUid())) {
                    throw new IllegalStateException("Segment checkpoint differs from frozen goal");
                }
                new AgentMonitorBatch(frozen.root().getRunUid())
                        .restore(frozen.checkpoint().goal(), saved.monitorBatch());
                batch.reconcileSaved(saved.monitorBatch());
            }
        }
        return new Replayed(batch, List.copyOf(all));
    }

    private List<AgentRuntimeReadBudget.Attempt> attempts(AgentRun run, AgentSession session) {
        return verifier.verifyHistory(
                        run,
                        AgentRunService.targetFromRun(run),
                        List.of(),
                        session == null ? null : session.getWorkspaceId())
                .budgetAttempts();
    }

    private String action(Frozen frozen, Replayed replay, AgentRun latest, AgentActor actor) {
        if (expired(frozen)
                || "CANCELLED".equals(latest.getStatus())
                || active(latest)
                || controls.isActive(latest.getRunUid())
                || replay.batch().finished()
                || ordinal(latest) >= 64
                || frozen.budget() < 5) {
            return "NONE";
        }
        boolean review = replay.batch().reviewRequired();
        boolean nativeBulk =
                "monitor-batch.v2".equals(frozen.checkpoint().monitorBatch().version());
        String tool =
                nativeBulk
                        ? review ? "monitor.batch_status" : "monitor.create_batch"
                        : review
                                ? "monitor.get"
                                : "monitor."
                                        + frozen.checkpoint()
                                                .goal()
                                                .operation()
                                                .name()
                                                .toLowerCase(Locale.ROOT);
        var descriptor =
                tools.find(tool).map(AgentToolRegistry.RegisteredTool::descriptor).orElse(null);
        if (policy.decide(actor, descriptor).getDecision() == AgentPolicyDecision.DENY) {
            return "NONE";
        }
        return review ? "RECONCILE" : replay.batch().hasPending() ? "CONTINUE" : "NONE";
    }

    private boolean expired(Frozen frozen) {
        var reference = frozen.checkpoint().manifestReference();
        return reference != null && System.currentTimeMillis() >= reference.expiresAt();
    }

    private void requireUnexpired(Frozen frozen) {
        if (expired(frozen))
            throw new IllegalStateException("Frozen batch execution authorization expired");
    }

    public static boolean active(AgentRun run) {
        return List.of("CREATED", "RUNNING").contains(run.getStatus());
    }

    private static int ordinal(AgentRun run) {
        return run.getBatchSegment() == null ? 0 : run.getBatchSegment();
    }

    /** Validated server-owned source; not a client request type. */
    public record Frozen(
            AgentRun root, AgentTaskCheckpoint checkpoint, List<AgentRun> chain, int budget) {}

    private record Replayed(
            AgentMonitorBatch batch, List<AgentRuntimeReadBudget.Attempt> attempts) {}
}
