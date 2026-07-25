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

import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentTranscriptEntryDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.contract.UserInput.Message;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeHistoryWindow;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentSessionStatus;
import org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Default session and transcript service for Agent Gateway.
 */
@Service
public class AgentSessionService {

    private static final int TRANSCRIPT_QUERY_PAGE_SIZE = 100;
    private static final int TRANSCRIPT_ROLE_LIMIT = 32;

    private final AgentSessionDao sessionDao;
    private final AgentTranscriptEntryDao transcriptEntryDao;
    private final AgentSessionKeyBuilder sessionKeyBuilder;
    private final EntityManager entityManager;

    public AgentSessionService(AgentSessionDao sessionDao, AgentTranscriptEntryDao transcriptEntryDao,
                               AgentSessionKeyBuilder sessionKeyBuilder, EntityManager entityManager) {
        this.sessionDao = sessionDao;
        this.transcriptEntryDao = transcriptEntryDao;
        this.sessionKeyBuilder = sessionKeyBuilder;
        this.entityManager = entityManager;
    }

    public AgentSession findOrCreateSession(GatewayEnvelope envelope, UserInput userInput) {
        AgentActor actor = envelope.getActor();
        String sessionKey = sessionKeyBuilder.build(envelope, userInput.getConversationId());
        Optional<AgentSession> existed = sessionDao.findBySessionKey(sessionKey);
        if (existed.isPresent()) {
            return existed.get();
        }
        Message message = userInput.getMessage();
        AgentSession session = AgentSession.builder()
            .sessionUid("ags_" + SnowFlakeIdGenerator.generateId())
            .sessionKey(sessionKey)
            .channel(envelope.getChannelId())
            .conversationId(userInput.getConversationId())
            .actorType(actor.getType())
            .actorId(actor.getId())
            .actorRoles(ActorSupport.rolesJson(actor))
            .status(AgentSessionStatus.ACTIVE)
            .title(GatewayText.safeSummary(message.getText(), 128))
            .build();
        try {
            return sessionDao.saveAndFlush(session);
        } catch (DataIntegrityViolationException e) {
            entityManager.clear();
            return sessionDao.findBySessionKey(sessionKey).orElseThrow(() -> e);
        }
    }

    @Transactional
    public AgentTranscriptEntry recordTranscriptEntry(AgentTranscriptEntry entry) {
        if (entry == null) {
            throw new IllegalArgumentException("Transcript entry must not be null");
        }
        if (entry.getSessionId() == null) {
            throw new IllegalArgumentException("Transcript session id must not be null");
        }
        String rawPayload = entry.getPayloadJson();
        if (!StringUtils.hasText(rawPayload)) {
            throw new IllegalArgumentException("Transcript payload JSON must not be blank");
        }
        // The role is the persisted discriminator used by checkpoint queries and cannot be inferred from SQL.
        if (!StringUtils.hasText(entry.getMessageRole())) {
            throw new IllegalArgumentException("Transcript message role must not be blank");
        }
        entry.setSessionSequence(nextSessionSequence(entry.getSessionId()));
        entry.setPayloadJson(rawPayload);
        entry.setMessageRole(GatewayText.requireBounded(
                entry.getMessageRole(), TRANSCRIPT_ROLE_LIMIT, "Transcript message role"));
        return transcriptEntryDao.save(entry);
    }

    public Optional<AgentSession> findSession(String sessionId) {
        // External session lookup values may contain surrounding whitespace; normalize before numeric/UID lookup.
        String normalized = GatewayText.normalize(sessionId);
        if (normalized == null) {
            return Optional.empty();
        }
        if (normalized.chars().allMatch(Character::isDigit)) {
            return sessionDao.findById(Long.parseLong(normalized));
        }
        return sessionDao.findBySessionUid(normalized);
    }

    public Page<AgentSession> findSessions(String channel, AgentActor actor, Pageable pageable) {
        return sessionDao.findByChannelAndActorTypeAndActorIdOrderByGmtUpdateDesc(
                channel, actor.getType(), actor.getId(), pageable);
    }

    public Page<AgentSession> findSessions(String channel, AgentActor actor, String title, Pageable pageable) {
        if (!StringUtils.hasText(title)) {
            return findSessions(channel, actor, pageable);
        }
        return sessionDao.findByChannelAndActorTypeAndActorIdAndTitleContainingIgnoreCaseOrderByGmtUpdateDesc(
                channel, actor.getType(), actor.getId(), title, pageable);
    }

    public Page<AgentTranscriptEntry> findTranscriptEntries(Long sessionId, Pageable pageable) {
        return transcriptEntryDao.findBySessionIdOrderBySessionSequenceAsc(sessionId, pageable);
    }

    @Transactional
    public List<TranscriptMessage> findRecentTranscriptMessages(Long sessionId) {
        if (sessionId == null) {
            return List.of();
        }
        Optional<TranscriptCheckpointSource> latestCheckpoint = latestCompactionCheckpoint(sessionId);
        List<TranscriptMessage> selected = latestCheckpoint
            .map(checkpoint -> transcriptMessagesSinceCheckpoint(sessionId, checkpoint))
            .orElseGet(() -> recentTranscriptMessages(sessionId));
        if (selected.isEmpty()) {
            return List.of();
        }
        return AgentRuntimeHistoryWindow.replayWindow(selected);
    }

    private List<TranscriptMessage> recentTranscriptMessages(Long sessionId) {
        List<AgentTranscriptEntry> recentEntries = recentTranscriptEntries(sessionId);
        if (recentEntries.isEmpty()) {
            return List.of();
        }
        Collections.reverse(recentEntries);
        return transcriptMessages(recentEntries, false);
    }

    private Optional<TranscriptCheckpointSource> latestCompactionCheckpoint(Long sessionId) {
        return transcriptEntryDao.findTopBySessionIdAndMessageRoleOrderBySessionSequenceDesc(
                sessionId, TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY.wireValue())
            .flatMap(entry -> {
                TranscriptMessage message = transcriptMessage(entry);
                if (message == null
                    || message.getRole() != TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY
                    || !message.hasReplayContent()) {
                    return Optional.empty();
                }
                return Optional.of(new TranscriptCheckpointSource(entry, message));
            });
    }

    private List<TranscriptMessage> transcriptMessagesSinceCheckpoint(Long sessionId,
                                                                      TranscriptCheckpointSource checkpoint) {
        List<TranscriptMessage> messages = new ArrayList<>();
        messages.add(checkpoint.message());
        Long firstKeptSessionSequence = checkpoint.message().compactionFirstKeptSessionSequence();
        if (firstKeptSessionSequence == null) {
            Long checkpointSessionSequence = checkpoint.entry().getSessionSequence();
            firstKeptSessionSequence = checkpointSessionSequence == null ? 1L : checkpointSessionSequence + 1L;
        }
        messages.addAll(transcriptMessages(transcriptEntriesFrom(sessionId, firstKeptSessionSequence), true));
        return messages;
    }

    private List<AgentTranscriptEntry> recentTranscriptEntries(Long sessionId) {
        List<AgentTranscriptEntry> entries = new ArrayList<>();
        for (int page = 0; ; page++) {
            List<AgentTranscriptEntry> pageEntries =
                transcriptEntryDao.findBySessionIdOrderBySessionSequenceDesc(
                    sessionId, PageRequest.of(page, TRANSCRIPT_QUERY_PAGE_SIZE));
            if (pageEntries.isEmpty()) {
                break;
            }
            entries.addAll(pageEntries);
            if (pageEntries.size() < TRANSCRIPT_QUERY_PAGE_SIZE) {
                break;
            }
        }
        return entries;
    }

    private List<AgentTranscriptEntry> transcriptEntriesFrom(Long sessionId, Long firstSessionSequence) {
        List<AgentTranscriptEntry> entries = new ArrayList<>();
        Long start = firstSessionSequence == null ? 1L : Math.max(1L, firstSessionSequence);
        for (int page = 0; ; page++) {
            List<AgentTranscriptEntry> pageEntries =
                transcriptEntryDao
                    .findBySessionIdAndSessionSequenceGreaterThanEqualOrderBySessionSequenceAsc(
                        sessionId, start,
                        PageRequest.of(page, TRANSCRIPT_QUERY_PAGE_SIZE));
            if (pageEntries.isEmpty()) {
                break;
            }
            entries.addAll(pageEntries);
            if (pageEntries.size() < TRANSCRIPT_QUERY_PAGE_SIZE) {
                break;
            }
        }
        return entries;
    }

    private List<TranscriptMessage> transcriptMessages(List<AgentTranscriptEntry> entries,
                                                       boolean skipCompactionSummaries) {
        List<TranscriptMessage> messages = new ArrayList<>(entries.size());
        for (AgentTranscriptEntry entry : entries) {
            TranscriptMessage message = transcriptMessage(entry);
            if (skipCompactionSummaries
                && message != null
                && message.getRole() == TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY) {
                continue;
            }
            if (!isEmptyTranscriptMessage(message)) {
                messages.add(message);
            }
        }
        return messages;
    }

    @Transactional
    public void persistCompactionCheckpoint(Long sessionId,
                                             AgentRuntimeHistoryWindow.CompactionCheckpoint checkpoint) {
        if (checkpoint == null || checkpoint.message() == null
            || checkpoint.summarizedThroughSessionSequence() == null
            || checkpoint.firstKeptSessionSequence() == null) {
            return;
        }
        Long latestSummarizedThrough = latestCompactionCheckpoint(sessionId)
            .map(TranscriptCheckpointSource::message)
            .map(TranscriptMessage::compactionSummarizedThroughSessionSequence)
            .orElse(null);
        if (latestSummarizedThrough != null
            && checkpoint.summarizedThroughSessionSequence() <= latestSummarizedThrough) {
            return;
        }
        recordTranscriptEntry(AgentTranscriptEntry.builder()
            .sessionId(sessionId)
            .payloadJson(JsonUtil.toJson(checkpoint.message()))
            .messageRole(TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY.wireValue())
            .build());
    }

    private long nextSessionSequence(Long sessionId) {
        AgentSession session = sessionDao.findFirstById(sessionId)
            .orElseThrow(() -> new IllegalArgumentException("Transcript session does not exist: " + sessionId));
        long nextSequence = Optional.ofNullable(session.getTranscriptSequence()).orElse(0L) + 1L;
        session.setTranscriptSequence(nextSequence);
        return nextSequence;
    }

    private TranscriptMessage transcriptMessage(AgentTranscriptEntry entry) {
        if (entry == null) {
            return null;
        }
        TranscriptMessage message = JsonUtil.fromJson(entry.getPayloadJson(), TranscriptMessage.class);
        if (message == null) {
            return null;
        }
        return message.toBuilder()
            .sessionSequence(entry.getSessionSequence())
            .build();
    }

    private boolean isEmptyTranscriptMessage(TranscriptMessage message) {
        return message == null
            || message.getRole() == null && !message.hasReplayContent();
    }

    private record TranscriptCheckpointSource(AgentTranscriptEntry entry, TranscriptMessage message) {
    }

}
