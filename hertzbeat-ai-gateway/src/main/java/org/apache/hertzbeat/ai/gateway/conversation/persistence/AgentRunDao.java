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

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository for Agent Gateway runs.
 */
@Repository
public interface AgentRunDao extends JpaRepository<AgentRun, Long> {

    /**
     * Find a run by public run UID.
     */
    Optional<AgentRun> findByRunUid(String runUid);

    /**
     * Find the existing run for a session event.
     */
    Optional<AgentRun> findBySessionIdAndMessageId(Long sessionId, String messageId);

    Optional<AgentRun> findTopBySessionIdOrderByIdDesc(Long sessionId);

    @Query("""
            select run from AgentRun run
            where run.id in (
                select max(candidate.id) from AgentRun candidate
                where candidate.sessionId in :sessionIds
                group by candidate.sessionId
            )
            """)
    List<AgentRun> findLatestBySessionIds(@Param("sessionIds") Collection<Long> sessionIds);

    Optional<AgentRun> findFirstBySessionIdAndStatusOrderByGmtCreateAsc(Long sessionId, String status);

    boolean existsBySessionIdAndStatusIn(Long sessionId, List<String> statuses);

    /** Cancel only a run that has not already reached a truthful terminal state. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update AgentRun run
            set run.status = :cancelledStatus,
                run.errorMessage = :reason,
                run.completedAt = :transitionAt,
                run.gmtUpdate = :transitionAt
            where run.id = :runId and run.status in :activeStatuses
            """)
    int cancelIfActive(@Param("runId") Long runId,
                       @Param("activeStatuses") Collection<String> activeStatuses,
                       @Param("cancelledStatus") String cancelledStatus,
                       @Param("reason") String reason,
                       @Param("transitionAt") java.time.LocalDateTime transitionAt);

}
