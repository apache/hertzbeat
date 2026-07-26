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

package org.apache.hertzbeat.startup.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;

import jakarta.annotation.Resource;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentTranscriptEntryDao;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentSessionStatus;
import org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry;
import org.apache.hertzbeat.startup.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tests persistence mapping for Agent Gateway transcript entries.
 */
@Transactional
class AgentTranscriptEntryDaoTest extends AbstractSpringIntegrationTest {

    @Resource
    private AgentSessionDao sessionDao;

    @Resource
    private AgentTranscriptEntryDao transcriptEntryDao;

    @PersistenceContext
    private EntityManager entityManager;

    @Test
    void saveTranscriptEntryShouldPersistSessionId() {
        AgentSession session = sessionDao.saveAndFlush(AgentSession.builder()
            .sessionUid("persistence-test-session")
            .sessionKey("webui:user:persistence-test")
            .channel("webui")
            .actorType("user")
            .actorId("persistence-test")
            .status(AgentSessionStatus.ACTIVE)
            .title("Persistence test session")
            .build());
        transcriptEntryDao.saveAndFlush(AgentTranscriptEntry.builder()
            .sessionId(session.getId())
            .sessionSequence(1L)
            .payloadJson("{\"text\":\"persistence test message\"}")
            .messageRole("user")
            .build());
        entityManager.clear();

        List<AgentTranscriptEntry> entries = transcriptEntryDao
            .findBySessionIdOrderBySessionSequenceAsc(session.getId(), PageRequest.of(0, 10))
            .getContent();

        assertEquals(1, entries.size());
        assertEquals(session.getId(), entries.getFirst().getSessionId());
        assertEquals(1L, entries.getFirst().getSessionSequence());
    }
}
