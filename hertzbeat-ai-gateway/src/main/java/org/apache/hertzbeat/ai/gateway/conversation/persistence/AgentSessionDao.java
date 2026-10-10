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

package org.apache.hertzbeat.ai.gateway.conversation.persistence;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

/**
 * Repository for Agent Gateway sessions.
 */
@Repository
public interface AgentSessionDao extends JpaRepository<AgentSession, Long> {

    /**
     * Find a session by deterministic session key.
     */
    Optional<AgentSession> findBySessionKey(String sessionKey);

    /**
     * Find a session by public session UID.
     */
    Optional<AgentSession> findBySessionUid(String sessionUid);

    Optional<AgentSession> findByIdAndWorkspaceIdAndChannelAndActorTypeAndActorIdAndOriginEntryType(
            Long id, String workspaceId, String channel, String actorType, String actorId, String originEntryType);

    Optional<AgentSession> findBySessionUidAndWorkspaceIdAndChannelAndActorTypeAndActorIdAndOriginEntryType(
            String sessionUid, String workspaceId, String channel, String actorType, String actorId,
            String originEntryType);

    Page<AgentSession> findByWorkspaceIdAndChannelAndActorTypeAndActorIdAndOriginEntryTypeOrderByGmtUpdateDesc(
            String workspaceId, String channel, String actorType, String actorId, String originEntryType,
            Pageable pageable);

    Page<AgentSession>
            findByWorkspaceIdAndChannelAndActorTypeAndActorIdAndOriginEntryTypeAndTitleContainingIgnoreCaseOrderByGmtUpdateDesc(
                    String workspaceId, String channel, String actorType, String actorId, String originEntryType,
                    String title, Pageable pageable);

    /**
     * Lock a session row while assigning transcript append sequence.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AgentSession> findFirstById(Long id);

    /**
     * Advance session activity without merging a stale session entity over transcript sequence or title updates.
     */
    @Modifying(flushAutomatically = true)
    @Query("""
            update AgentSession session
            set session.gmtUpdate = case
                when session.gmtUpdate is null or session.gmtUpdate < :transitionAt then :transitionAt
                else session.gmtUpdate
            end
            where session.id = :sessionId
            """)
    int advanceGmtUpdate(@Param("sessionId") Long sessionId,
                         @Param("transitionAt") java.time.LocalDateTime transitionAt);
}
