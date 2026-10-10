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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.ai.gateway.runtime.AgentGroundingEvidenceVerifier;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Durable run replay projection tests.
 */
@ExtendWith(MockitoExtension.class)
class AgentRunSnapshotServiceTest {

    @Mock
    private AgentTranscriptRecorder transcriptRecorder;

    @Mock
    private AgentGroundingEvidenceVerifier groundingVerifier;

    @Test
    void legacyToolCallPreambleShouldNotBeReplayedAsTheFinalAnswer() {
        AgentRun run = succeededLegacyRun();

        AgentRunSnapshot snapshot = service().snapshot(session(), run);

        assertNull(snapshot.result());
        assertFalse(snapshot.replayAvailable());
    }

    @Test
    void succeededRunWithoutDurableGroundingMustNotReplayTheResult() {
        AgentRun run = succeededLegacyRun();

        AgentRunSnapshot snapshot = service().snapshot(session(), run);

        assertNull(snapshot.result());
        assertFalse(snapshot.replayAvailable());
    }

    @Test
    void succeededRunWithDurableGroundingCanReplayTheExactResult() {
        AgentRun run = succeededLegacyRun();
        when(groundingVerifier.hasDurableGrounding(run, null)).thenReturn(true);
        when(transcriptRecorder.findRunFinalAssistantMessage(2L)).thenReturn(Optional.of(
                TranscriptMessage.assistantText("Recovered final answer", null)));

        AgentRunSnapshot snapshot = service().snapshot(session(), run);

        assertEquals("Recovered final answer", snapshot.result());
        assertTrue(snapshot.replayAvailable());
    }

    @Test
    void recoveryRequiredRunShouldExposeReasonWithoutRetryRequest() {
        AgentRun run = AgentRun.builder()
                .id(2L).runUid("run-1").sessionId(1L).messageId("message-1")
                .status(AgentRunStatus.RECOVERY_REQUIRED.name())
                .errorMessage("Verify the target before continuing.")
                .build();

        AgentRunSnapshot snapshot = service().snapshot(session(), run);

        assertEquals(AgentRunStatus.RECOVERY_REQUIRED.name(), snapshot.status());
        assertEquals("Verify the target before continuing.", snapshot.errorMessage());
        assertTrue(snapshot.replayAvailable());
        assertNull(snapshot.retryRequest());
    }

    private AgentRunSnapshotService service() {
        return new AgentRunSnapshotService(transcriptRecorder, groundingVerifier);
    }

    private AgentSession session() {
        return AgentSession.builder().id(1L).sessionUid("session-1").build();
    }

    private AgentRun succeededLegacyRun() {
        return AgentRun.builder()
                .id(2L).runUid("run-1").sessionId(1L).messageId("message-1")
                .status(AgentRunStatus.SUCCEEDED.name()).resultSummary("Runtime completed.").build();
    }
}
