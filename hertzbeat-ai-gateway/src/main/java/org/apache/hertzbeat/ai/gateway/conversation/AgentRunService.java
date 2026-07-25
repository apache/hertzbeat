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
import java.time.LocalDateTime;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Default run ledger service for Agent Gateway.
 */
@Service
public class AgentRunService {

    private final AgentRunDao runDao;
    private final EntityManager entityManager;

    public AgentRunService(AgentRunDao runDao, EntityManager entityManager) {
        this.runDao = runDao;
        this.entityManager = entityManager;
    }

    public AgentRun createOrResumeRun(AgentSession session, UserInput userInput) {
        String messageId = userInput.getMessageId();
        Optional<AgentRun> existingRun = runDao.findBySessionIdAndMessageId(session.getId(), messageId);
        if (existingRun.isPresent()) {
            return existingRun.get();
        }
        AgentRun run = buildRun(session, userInput, messageId);
        try {
            return runDao.saveAndFlush(run);
        } catch (DataIntegrityViolationException e) {
            entityManager.clear();
            return runDao.findBySessionIdAndMessageId(session.getId(), messageId)
                .orElseThrow(() -> e);
        }
    }

    @Transactional
    public AgentRun markRunning(AgentRun run) {
        run.setStatus(AgentRunStatus.RUNNING.name());
        run.setStartedAt(LocalDateTime.now());
        run.setCompletedAt(null);
        run.setErrorMessage(null);
        return runDao.save(run);
    }

    @Transactional
    public AgentRun markSucceeded(AgentRun run, String resultSummary) {
        run.setStatus(AgentRunStatus.SUCCEEDED.name());
        run.setResultSummary(resultSummary);
        run.setCompletedAt(LocalDateTime.now());
        return runDao.save(run);
    }

    @Transactional
    public AgentRun markFailed(AgentRun run, String errorMessage) {
        run.setStatus(AgentRunStatus.FAILED.name());
        run.setErrorMessage(GatewayText.safeSummary(errorMessage, 1024));
        run.setCompletedAt(LocalDateTime.now());
        return runDao.save(run);
    }

    @Transactional
    public AgentRun markCancelled(AgentRun run, String reason) {
        run.setStatus(AgentRunStatus.CANCELLED.name());
        run.setErrorMessage(GatewayText.safeSummary(reason, 1024));
        run.setCompletedAt(LocalDateTime.now());
        return runDao.save(run);
    }

    public Optional<AgentRun> findRun(String runUid) {
        // External run lookup values may contain surrounding whitespace; normalize before the persistence query.
        String normalized = GatewayText.normalize(runUid);
        if (normalized == null) {
            return Optional.empty();
        }
        return runDao.findByRunUid(normalized);
    }

    private AgentRun buildRun(AgentSession session, UserInput userInput, String messageId) {
        AgentTargetRef target = userInput.getTarget();
        return AgentRun.builder()
            .runUid("run_" + SnowFlakeIdGenerator.generateId())
            .sessionId(session.getId())
            .messageId(messageId)
            .targetMonitorId(target == null ? null : target.getMonitorId())
            .targetAlertId(target == null ? null : target.getAlertId())
            .targetCollector(target == null ? null : target.getCollector())
            .status(AgentRunStatus.CREATED.name())
            .build();
    }
}
