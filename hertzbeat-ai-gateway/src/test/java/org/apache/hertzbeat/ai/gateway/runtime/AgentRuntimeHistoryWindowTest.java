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

package org.apache.hertzbeat.ai.gateway.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link AgentRuntimeHistoryWindow}.
 */
class AgentRuntimeHistoryWindowTest {

    @Test
    void compactWithCheckpointShouldUseModelSummaryAndCutOnCompleteUserTurnBoundary() {
        List<TranscriptMessage> history = List.of(
            sequenced(1L, TranscriptMessage.userText("older request " + "alert ".repeat(80))),
            sequenced(2L, TranscriptMessage.assistantText("older answer " + "diagnosis ".repeat(80), null)),
            sequenced(3L, TranscriptMessage.userText("middle request " + "metric ".repeat(80))),
            sequenced(4L, TranscriptMessage.assistantText("middle answer " + "metric ".repeat(80), null)),
            sequenced(5L, TranscriptMessage.userText("recent request inspect monitor 42")),
            sequenced(6L, TranscriptMessage.assistantText("recent final answer", null)));
        AgentRuntimeHistoryWindow.Policy policy = new AgentRuntimeHistoryWindow.Policy(
            150, 80, 20);

        AgentRuntimeHistoryWindow.CompactionResult result =
            AgentRuntimeHistoryWindow.compactWithCheckpoint(history, policy,
                (messages, maxTokens) -> "Model summary for earlier diagnosis");

        assertEquals(TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY, result.messages().get(0).getRole());
        assertEquals(TranscriptMessage.TranscriptRole.USER, result.messages().get(1).getRole());
        assertTrue(result.messages().get(1).text().contains("recent request inspect monitor 42"));
        assertNotNull(result.checkpoint());
        assertEquals(4L, result.checkpoint().summarizedThroughSessionSequence());
        assertEquals(5L, result.checkpoint().firstKeptSessionSequence());
        assertEquals("Model summary for earlier diagnosis", result.checkpoint().message().text());
        assertTrue(result.messages().stream().allMatch(message -> message.getUsage() == null));
    }

    @Test
    void compactedCheckpointShouldInheritPriorSummaryBoundaryWithoutUsingCheckpointSequence() {
        List<TranscriptMessage> history = List.of(
            sequenced(20L, TranscriptMessage.compactionSummary(
                "prior summary " + "important context ".repeat(120), 10L, 11L)),
            sequenced(21L, TranscriptMessage.userText("recent request inspect monitor 42")),
            sequenced(22L, TranscriptMessage.assistantText("recent final answer", null)));
        AgentRuntimeHistoryWindow.Policy policy = new AgentRuntimeHistoryWindow.Policy(
            150, 80, 20);

        AgentRuntimeHistoryWindow.CompactionResult result =
            AgentRuntimeHistoryWindow.compactWithCheckpoint(history, policy,
                (messages, maxTokens) -> "Prior and recent diagnostic context");

        assertNotNull(result.checkpoint());
        assertEquals(10L, result.checkpoint().summarizedThroughSessionSequence());
        assertEquals(21L, result.checkpoint().firstKeptSessionSequence());
        assertEquals(10L, result.checkpoint().message().compactionSummarizedThroughSessionSequence());
    }

    private TranscriptMessage sequenced(Long sessionSequence, TranscriptMessage message) {
        return message.toBuilder()
            .sessionSequence(sessionSequence)
            .build();
    }
}
