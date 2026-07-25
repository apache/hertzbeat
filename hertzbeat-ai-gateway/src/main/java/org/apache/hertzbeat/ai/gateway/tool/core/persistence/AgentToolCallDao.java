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

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
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
     * Find paged tool calls for a run ordered by creation time.
     */
    Page<AgentToolCall> findByRunIdOrderByGmtCreateAsc(Long runId, Pageable pageable);

    /**
     * Find tool calls for a session ordered by creation time.
     */
    List<AgentToolCall> findBySessionIdOrderByGmtCreateAsc(Long sessionId);

    /**
     * Find a tool call by its run-scoped model identifier.
     */
    Optional<AgentToolCall> findByRunIdAndToolCallId(Long runId, String toolCallId);

    /**
     * Find an approval-backed tool call by public approval ID.
     */
    Optional<AgentToolCall> findByApprovalId(String approvalId);

}
