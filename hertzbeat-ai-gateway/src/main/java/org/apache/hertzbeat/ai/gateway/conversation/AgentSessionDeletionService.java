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
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import org.apache.hertzbeat.ai.gateway.channel.core.ChannelId;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Owner-scoped, atomic history deletion; active sessions retain their runtime and audit records. */
@Service
public class AgentSessionDeletionService {
    private static final int MAX_BATCH = 1_000;
    private final AgentSessionService sessions;
    private final AgentSessionDao sessionDao;
    private final AgentRunDao runDao;
    private final EntityManager entityManager;

    public AgentSessionDeletionService(AgentSessionService sessions, AgentSessionDao sessionDao,
                                       AgentRunDao runDao, EntityManager entityManager) {
        this.sessions = sessions;
        this.sessionDao = sessionDao;
        this.runDao = runDao;
        this.entityManager = entityManager;
    }

    /** Exact owner-scoped selection shown before a bulk deletion. */
    public record Preview(List<String> sessionUids, int activeCount) { }

    /** Explicit confirmation applies only to the selected public session UIDs. */
    public record Request(List<String> sessionUids, boolean confirmed) { }

    /** Number of complete conversations deleted in this transaction. */
    public record Result(int deletedCount) { }

    @Transactional(readOnly = true)
    public Preview preview(GatewayEnvelope envelope) {
        requireOwner(envelope);
        var page = sessions.findSessions(envelope, AgentRuntimeEntryType.USER_INPUT, null, PageRequest.of(0, MAX_BATCH));
        if (page.getTotalElements() > MAX_BATCH) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Delete smaller batches first");
        }
        List<AgentSession> owned = page.getContent();
        List<Long> ids = owned.stream().map(AgentSession::getId).toList();
        int active = ids.isEmpty() ? 0 : runDao.findActiveSessionIds(ids).size();
        return new Preview(owned.stream().map(AgentSession::getSessionUid).toList(), active);
    }

    @Transactional
    public Result delete(GatewayEnvelope envelope, Request request) {
        requireOwner(envelope);
        requireRequest(request);
        var owned = new ArrayList<AgentSession>();
        for (String uid : request.sessionUids()) {
            owned.add(sessions.findOwnedSession(uid, envelope, AgentRuntimeEntryType.USER_INPUT)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found")));
        }
        owned.sort(Comparator.comparing(AgentSession::getId));
        List<Long> ids = new ArrayList<>();
        for (AgentSession candidate : owned) {
            AgentSession locked = sessionDao.findFirstById(candidate.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
            if (!sameOwner(locked, envelope)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found");
            }
            ids.add(locked.getId());
        }
        // Run admission takes the same session lock, so a new run cannot race this active check and deletion.
        if (!runDao.findActiveSessionIds(ids).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Stop active conversations before deleting");
        }
        entityManager.flush();
        deleteRecords("AgentTranscriptEntry", "sessionId", ids);
        entityManager.createQuery("delete from AgentToolCall entry where entry.sessionId in :ids or "
                + "(entry.sessionId is null and entry.runId in (select run.id from AgentRun run where run.sessionId in :ids))")
                .setParameter("ids", ids).executeUpdate();
        deleteRecords("AgentRun", "sessionId", ids);
        int deleted = deleteRecords("AgentSession", "id", ids);
        if (deleted != ids.size()) { throw new IllegalStateException("Session deletion did not match its locked scope"); }
        entityManager.clear();
        return new Result(deleted);
    }

    private int deleteRecords(String entity, String field, List<Long> ids) {
        return entityManager.createQuery("delete from " + entity + " entry where entry." + field + " in :ids")
                .setParameter("ids", ids).executeUpdate();
    }

    private void requireRequest(Request request) {
        if (request == null || !request.confirmed() || request.sessionUids() == null || request.sessionUids().isEmpty()
                || request.sessionUids().size() > MAX_BATCH || new HashSet<>(request.sessionUids()).size() != request.sessionUids().size()
                || request.sessionUids().stream().anyMatch(uid -> uid == null || !uid.matches("ags_[0-9]{1,30}"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An explicit bounded session selection and confirmation are required");
        }
    }

    private void requireOwner(GatewayEnvelope envelope) {
        if (envelope == null || !ActorSupport.hasIdentity(envelope.getActor()) || envelope.getWorkspaceId() == null
                || envelope.getWorkspaceId().isBlank() || !ChannelId.WEB_UI.id().equals(envelope.getChannelId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "WebUI owner identity is required");
        }
    }

    private boolean sameOwner(AgentSession session, GatewayEnvelope envelope) {
        return Objects.equals(session.getWorkspaceId(), envelope.getWorkspaceId())
                && Objects.equals(session.getChannel(), ChannelId.WEB_UI.id())
                && Objects.equals(session.getActorType(), envelope.getActor().getType())
                && Objects.equals(session.getActorId(), envelope.getActor().getId())
                && Objects.equals(session.getOriginEntryType(), AgentRuntimeEntryType.USER_INPUT.name());
    }
}
