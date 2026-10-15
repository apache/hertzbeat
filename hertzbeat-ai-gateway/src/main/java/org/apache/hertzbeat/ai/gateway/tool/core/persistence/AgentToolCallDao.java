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

package org.apache.hertzbeat.ai.gateway.tool.core.persistence;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository for Agent Gateway tool calls.
 */
@Repository
public interface AgentToolCallDao extends JpaRepository<AgentToolCall, Long> {

    /**
     * Find tool calls for a run ordered by creation time.
     */
    List<AgentToolCall> findByRunIdOrderByGmtCreateAsc(Long runId);

    /**
     * Find tool calls for a session ordered by creation time.
     */
    List<AgentToolCall> findBySessionIdOrderByGmtCreateAsc(Long sessionId);

    /**
     * Find an approval-backed tool call by public approval ID.
     */
    Optional<AgentToolCall> findByApprovalId(String approvalId);

    /** Serialize runtime resume against approval compensation for the same ledger row. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select toolCall from AgentToolCall toolCall where toolCall.approvalId = :approvalId")
    Optional<AgentToolCall> findApprovalForRuntimeResume(@Param("approvalId") String approvalId);

    /** Serialize one approval decision lifecycle only after its session owner scope matches. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select toolCall from AgentToolCall toolCall, AgentSession session
            where toolCall.sessionId = session.id
              and toolCall.approvalId = :approvalId
              and session.workspaceId = :workspaceId
              and session.channel = :channel
              and session.actorType = :actorType
              and session.actorId = :actorId
              and session.originEntryType = :originEntryType
            """)
    Optional<AgentToolCall> findOwnedApprovalForUpdate(
            @Param("approvalId") String approvalId,
            @Param("workspaceId") String workspaceId,
            @Param("channel") String channel,
            @Param("actorType") String actorType,
            @Param("actorId") String actorId,
            @Param("originEntryType") String originEntryType);

    @Query("""
            select count(toolCall) > 0 from AgentToolCall toolCall, AgentSession session
            where toolCall.sessionId = session.id
              and toolCall.approvalId = :approvalId
              and session.workspaceId = :workspaceId
              and session.channel = :channel
              and session.actorType = :actorType
              and session.actorId = :actorId
              and session.originEntryType = :originEntryType
            """)
    boolean existsOwnedApproval(
            @Param("approvalId") String approvalId,
            @Param("workspaceId") String workspaceId,
            @Param("channel") String channel,
            @Param("actorType") String actorType,
            @Param("actorId") String actorId,
            @Param("originEntryType") String originEntryType);

}
