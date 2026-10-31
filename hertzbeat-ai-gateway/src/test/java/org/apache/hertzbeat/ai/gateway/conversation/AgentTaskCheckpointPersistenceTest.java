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

import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentTranscriptEntryDao;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeHistoryWindow;
import org.apache.hertzbeat.ai.gateway.runtime.AgentTaskAssessment;
import org.apache.hertzbeat.ai.gateway.runtime.AgentTaskCheckpoint;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptContent;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentSessionStatus;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import java.util.List;
import java.util.Map;

/**
 * Real isolated H2 transcript persistence proof. It never uses the development database or a model
 * endpoint.
 */
@SpringJUnitConfig(AgentSessionDeletionIntegrationTest.TestApplication.class)
class AgentTaskCheckpointPersistenceTest {
    @Autowired AgentSessionService sessions;
    @Autowired AgentSessionDao sessionDao;
    @Autowired AgentRunDao runDao;
    @Autowired AgentTranscriptEntryDao entries;
    @Autowired AgentToolCallDao tools;

    @AfterEach
    void clearIsolatedData() {
        entries.deleteAll();
        tools.deleteAll();
        runDao.deleteAll();
        sessionDao.deleteAll();
    }

    @Test
    void goalCheckpointSurvivesCompactionAndRemainsBoundToItsExactRun() {
        var session =
                sessionDao.saveAndFlush(
                        AgentSession.builder()
                                .sessionUid("checkpoint-session")
                                .sessionKey("checkpoint-session")
                                .workspaceId("isolated")
                                .channel("web-ui")
                                .actorType("user")
                                .actorId("owner")
                                .originEntryType("USER_INPUT")
                                .status(AgentSessionStatus.ACTIVE)
                                .build());
        var run =
                runDao.saveAndFlush(
                        AgentRun.builder()
                                .sessionId(session.getId())
                                .runUid("checkpoint-run")
                                .messageId("one")
                                .entryType("USER_INPUT")
                                .status("RUNNING")
                                .build());
        var recorder = new AgentTranscriptRecorder(sessions);
        var goal =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.UPDATE,
                        "monitor",
                        1,
                        List.of(42L),
                        Map.of("intervals", 30));
        var checkpoint =
                new AgentTaskCheckpoint(
                        AgentTaskCheckpoint.VERSION, run.getRunUid(), "request-binding", goal, 64);
        var message =
                TranscriptMessage.assistantToolCalls(
                        "",
                        List.of(
                                TranscriptContent.toolCall(
                                        "update", "monitor.update", Map.of("monitorId", 42))),
                        null);
        message.setTaskCheckpoint(checkpoint);
        var first = recorder.recordRunMessage(session, run, message);
        recorder.recordRunMessage(
                session,
                run,
                TranscriptMessage.toolResult("update", "monitor.update", "saved", null));
        var summary =
                TranscriptMessage.compactionSummary(
                        "Earlier planning was compacted.",
                        first.getSessionSequence(),
                        first.getSessionSequence() + 1);
        recorder.recordCompactionCheckpoint(
                session,
                new AgentRuntimeHistoryWindow.CompactionCheckpoint(
                        summary, first.getSessionSequence(), first.getSessionSequence() + 1));
        assertFalse(
                recorder.chatHistory(session.getId()).stream()
                        .anyMatch(m -> m.getTaskCheckpoint() != null));
        assertEquals(
                checkpoint,
                recorder.findRunTaskCheckpoint(run.getId()).orElseThrow().getTaskCheckpoint());
        var other =
                runDao.saveAndFlush(
                        AgentRun.builder()
                                .sessionId(session.getId())
                                .runUid("other-run")
                                .messageId("two")
                                .entryType("USER_INPUT")
                                .status("RUNNING")
                                .build());
        assertTrue(recorder.findRunTaskCheckpoint(other.getId()).isEmpty());
    }

    @Test
    void fiftyItemSnapshotAndModelBudgetPersistInRealH2() {
        var session =
                sessionDao.saveAndFlush(
                        AgentSession.builder()
                                .sessionUid("batch-50")
                                .sessionKey("batch-50")
                                .workspaceId("isolated")
                                .channel("web-ui")
                                .actorType("user")
                                .actorId("owner")
                                .originEntryType("USER_INPUT")
                                .status(AgentSessionStatus.ACTIVE)
                                .build());
        var run =
                runDao.saveAndFlush(
                        AgentRun.builder()
                                .sessionId(session.getId())
                                .runUid("batch-50-run")
                                .messageId("batch")
                                .entryType("USER_INPUT")
                                .status("RUNNING")
                                .build());
        var targets =
                java.util.stream.IntStream.range(0, 50)
                        .mapToObj(
                                i ->
                                        new AgentTaskAssessment.CreateTarget(
                                                "site-" + i,
                                                "http://127.0.0.1:18080/health/" + i,
                                                600))
                        .toList();
        var goal =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.CREATE,
                        "monitor",
                        50,
                        List.of(),
                        Map.of(),
                        targets);
        var items =
                java.util.stream.IntStream.range(0, 50)
                        .mapToObj(
                                i ->
                                        new org.apache.hertzbeat.ai.gateway.runtime
                                                .AgentMonitorBatch.Item(
                                                "item-" + i,
                                                "hash-" + i,
                                                Map.<String, Object>of("name", "site-" + i),
                                                org.apache.hertzbeat.ai.gateway.runtime
                                                        .AgentMonitorBatch.Status.PENDING,
                                                null))
                        .toList();
        var snapshot =
                new org.apache.hertzbeat.ai.gateway.runtime.AgentMonitorBatch.Snapshot(
                        "monitor-batch.v1", "binding", "hash", items);
        var checkpoint =
                new AgentTaskCheckpoint(
                        AgentTaskCheckpoint.VERSION,
                        run.getRunUid(),
                        "request-binding",
                        goal,
                        64,
                        snapshot,
                        4);
        var message = TranscriptMessage.assistantText("Twenty verified, thirty pending.", null);
        message.setTaskCheckpoint(checkpoint);
        message.setRole(TranscriptMessage.TranscriptRole.TASK_CHECKPOINT);
        message.setContent(List.of());
        var recorder = new AgentTranscriptRecorder(sessions);
        recorder.recordRunMessage(session, run, message);
        assertEquals(
                checkpoint,
                recorder.findRunTaskCheckpoint(run.getId()).orElseThrow().getTaskCheckpoint());
        assertTrue(
                sessions.findConversationTranscriptEntries(
                                session.getId(),
                                org.springframework.data.domain.PageRequest.of(0, 20))
                        .isEmpty());
        assertFalse(message.hasReplayContent());
        assertTrue(
                JsonUtil.toJson(message).getBytes(java.nio.charset.StandardCharsets.UTF_8).length
                        < 65535);
    }

    @Test
    void legacyMessagesNeverGainTaskCompletionOrGoalAuthority() {
        var session =
                sessionDao.saveAndFlush(
                        AgentSession.builder()
                                .sessionUid("legacy")
                                .sessionKey("legacy")
                                .workspaceId("isolated")
                                .channel("web-ui")
                                .actorType("user")
                                .actorId("owner")
                                .originEntryType("USER_INPUT")
                                .status(AgentSessionStatus.ACTIVE)
                                .build());
        var run =
                runDao.saveAndFlush(
                        AgentRun.builder()
                                .sessionId(session.getId())
                                .runUid("legacy-run")
                                .messageId("old")
                                .entryType("USER_INPUT")
                                .status("SUCCEEDED")
                                .build());
        var recorder = new AgentTranscriptRecorder(sessions);
        recorder.recordRunMessage(
                session, run, TranscriptMessage.assistantText("The old run completed.", null));
        assertTrue(recorder.findRunTaskCheckpoint(run.getId()).isEmpty());
        var history = recorder.chatHistory(session.getId());
        assertEquals(1, history.size());
        assertNull(history.getFirst().getTaskCheckpoint());
        assertNull(history.getFirst().getTaskOutcome());
    }
}
