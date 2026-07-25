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

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for Agent Gateway transcript entries.
 */
@Repository
public interface AgentTranscriptEntryDao extends JpaRepository<AgentTranscriptEntry, Long> {

    /**
     * Find transcript entries for a session in append order.
     */
    Page<AgentTranscriptEntry> findBySessionIdOrderBySessionSequenceAsc(Long sessionId, Pageable pageable);

    /**
     * Find recent transcript entries for a session in reverse append order.
     */
    List<AgentTranscriptEntry> findBySessionIdOrderBySessionSequenceDesc(Long sessionId, Pageable pageable);

    /**
     * Find the latest transcript entry for a session and role.
     */
    Optional<AgentTranscriptEntry> findTopBySessionIdAndMessageRoleOrderBySessionSequenceDesc(
        Long sessionId, String messageRole);

    /**
     * Find transcript entries from a session sequence in append order.
     */
    List<AgentTranscriptEntry> findBySessionIdAndSessionSequenceGreaterThanEqualOrderBySessionSequenceAsc(
        Long sessionId, Long sessionSequence, Pageable pageable);

    /**
     * Find transcript entries for a run in session append order.
     */
    Page<AgentTranscriptEntry> findByRunIdOrderBySessionSequenceAsc(Long runId, Pageable pageable);
}
