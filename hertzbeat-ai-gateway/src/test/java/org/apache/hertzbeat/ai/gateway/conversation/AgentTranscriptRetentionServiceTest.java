/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.ai.gateway.conversation;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentTranscriptEntryDao;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Retention contracts for durable Agent Gateway transcripts. */
@ExtendWith(MockitoExtension.class)
class AgentTranscriptRetentionServiceTest {

    @Mock
    private AgentTranscriptEntryDao transcriptEntryDao;

    @Test
    void purgeUsesTheConfiguredAbsoluteRetentionCutoff() {
        AgentRuntimeProperties properties = new AgentRuntimeProperties();
        properties.setTranscriptRetention(Duration.ofDays(7));
        Clock clock = Clock.fixed(Instant.parse("2026-08-13T12:00:00Z"), ZoneOffset.UTC);

        new AgentTranscriptRetentionService(transcriptEntryDao, properties, clock)
                .purgeExpiredTranscripts();

        verify(transcriptEntryDao).deleteByGmtCreateBefore(
                LocalDateTime.of(2026, 8, 6, 12, 0));
    }

    @Test
    void retentionCannotBeDisabledAccidentally() {
        AgentRuntimeProperties properties = new AgentRuntimeProperties();

        assertThrows(IllegalArgumentException.class,
                () -> properties.setTranscriptRetention(Duration.ZERO));
    }
}
