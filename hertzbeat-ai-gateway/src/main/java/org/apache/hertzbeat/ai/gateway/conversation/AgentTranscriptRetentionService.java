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

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Objects;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentTranscriptEntryDao;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Deletes durable Agent Gateway transcript entries after their configured retention period.
 */
@Service
public class AgentTranscriptRetentionService {

    private final AgentTranscriptEntryDao transcriptEntryDao;
    private final AgentRuntimeProperties properties;
    private final Clock clock;

    @Autowired
    public AgentTranscriptRetentionService(AgentTranscriptEntryDao transcriptEntryDao,
                                           AgentRuntimeProperties properties) {
        this(transcriptEntryDao, properties, Clock.systemUTC());
    }

    AgentTranscriptRetentionService(AgentTranscriptEntryDao transcriptEntryDao,
                                    AgentRuntimeProperties properties,
                                    Clock clock) {
        this.transcriptEntryDao = Objects.requireNonNull(
            transcriptEntryDao, "transcriptEntryDao must not be null");
        this.properties = Objects.requireNonNull(properties, "properties must not be null");
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
    }

    /**
     * Purge transcript entries whose creation timestamp is older than the retention boundary.
     *
     * @return number of deleted transcript entries
     */
    @Scheduled(cron = "${hertzbeat.agent.runtime.transcript-retention-cron:0 30 2 * * *}")
    @Transactional
    public long purgeExpiredTranscripts() {
        LocalDateTime cutoff = LocalDateTime.ofInstant(
            clock.instant().minus(properties.getTranscriptRetention()), clock.getZone());
        return transcriptEntryDao.deleteByGmtCreateBefore(cutoff);
    }
}
