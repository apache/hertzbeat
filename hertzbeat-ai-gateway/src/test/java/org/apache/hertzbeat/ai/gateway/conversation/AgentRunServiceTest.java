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
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.persistence.Column;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.contract.UserInput.Message;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

/**
 * Agent run service tests.
 */
@ExtendWith(MockitoExtension.class)
class AgentRunServiceTest {

    @Mock
    private AgentRunDao runDao;

    @Mock
    private EntityManager entityManager;

    @Test
    void createOrResumeRunShouldCreateRunInRunTableShape() throws NoSuchFieldException {
        AgentRunService service = new AgentRunService(runDao, entityManager);
        AgentSession session = AgentSession.builder().id(1L).sessionUid("ags_1").build();
        UserInput userInput = UserInput.builder()
            .messageId("msg_1")
            .conversationId("conversation-1")
            .message(Message.builder().text(" diagnose mysql ").build())
            .build();
        when(runDao.findBySessionIdAndMessageId(1L, "msg_1")).thenReturn(Optional.empty());
        AgentRun persisted = AgentRun.builder().id(2L).runUid("run_saved").build();
        when(runDao.saveAndFlush(any(AgentRun.class))).thenReturn(persisted);

        AgentRun result = service.createOrResumeRun(session, userInput);

        ArgumentCaptor<AgentRun> captor = ArgumentCaptor.forClass(AgentRun.class);
        verify(runDao).saveAndFlush(captor.capture());
        AgentRun saved = captor.getValue();
        assertEquals("hzb_agent_run", AgentRun.class.getAnnotation(Table.class).name());
        assertEquals("run_uid", AgentRun.class.getDeclaredField("runUid").getAnnotation(Column.class).name());
        assertTrue(AgentRun.class.getDeclaredField("resultSummary").isAnnotationPresent(Lob.class));
        assertFalse(Arrays.stream(AgentRun.class.getDeclaredFields()).anyMatch(this::isRunRiskField));
        assertFalse(Arrays.stream(AgentRun.class.getDeclaredFields())
            .anyMatch(field -> "phase".equals(field.getName()) || "errorCode".equals(field.getName())));
        assertTrue(saved.getRunUid().startsWith("run_"));
        assertSame(persisted, result);
        assertEquals(AgentRunStatus.CREATED.name(), saved.getStatus());
        assertEquals("msg_1", saved.getMessageId());
    }

    @Test
    void createOrResumeRunShouldResumeExistingRunBySessionMessage() {
        AgentRunService service = new AgentRunService(runDao, entityManager);
        AgentSession session = AgentSession.builder().id(1L).sessionUid("ags_1").build();
        UserInput userInput = UserInput.builder()
            .messageId("msg_1")
            .conversationId("conversation-1")
            .message(Message.builder().text("diagnose mysql").build())
            .build();
        AgentRun existed = AgentRun.builder().id(2L).runUid("run_1").messageId("msg_1").build();
        when(runDao.findBySessionIdAndMessageId(1L, "msg_1")).thenReturn(Optional.of(existed));

        AgentRun result = service.createOrResumeRun(session, userInput);

        assertSame(existed, result);
        verify(runDao, never()).saveAndFlush(any());
    }

    @Test
    void createOrResumeRunShouldRecoverExistingRunAfterSessionMessageUniqueConflict() {
        AgentRunService service = new AgentRunService(runDao, entityManager);
        AgentSession session = AgentSession.builder().id(1L).sessionUid("ags_1").build();
        UserInput userInput = UserInput.builder()
            .messageId("msg_1")
            .conversationId("conversation-1")
            .message(Message.builder().text("diagnose mysql").build())
            .build();
        AgentRun existed = AgentRun.builder().id(2L).runUid("run_1").messageId("msg_1").build();
        when(runDao.findBySessionIdAndMessageId(1L, "msg_1")).thenReturn(Optional.empty(), Optional.of(existed));
        when(runDao.saveAndFlush(any(AgentRun.class))).thenThrow(new DataIntegrityViolationException("duplicate"));

        AgentRun result = service.createOrResumeRun(session, userInput);

        assertSame(existed, result);
        verify(entityManager).clear();
    }

    @Test
    void findMethodsShouldDelegateToRunDao() {
        AgentRunService service = new AgentRunService(runDao, entityManager);
        AgentRun run = AgentRun.builder().id(1L).runUid("run_1").build();
        when(runDao.findByRunUid("run_1")).thenReturn(Optional.of(run));

        assertSame(run, service.findRun("run_1").orElseThrow());
    }

    @Test
    void lifecycleUpdatesShouldKeepSucceededResultRawAndSanitizeErrors() {
        AgentRunService service = new AgentRunService(runDao, entityManager);
        when(runDao.save(any(AgentRun.class))).thenAnswer(invocation -> invocation.getArgument(0));
        String finalAnswer = "ok password=hunter2 token=tok-secret " + "detail ".repeat(3000);

        AgentRun succeeded = service.markSucceeded(
            AgentRun.builder().id(1L).runUid("run_1").build(), finalAnswer);
        AgentRun failed = service.markFailed(
            AgentRun.builder().id(2L).runUid("run_2").build(),
            "failed authorization=Bearer auth-secret");

        assertEquals(finalAnswer, succeeded.getResultSummary());
        assertNoRawSecret(failed.getErrorMessage());
    }

    private void assertNoRawSecret(String text) {
        assertFalse(text.contains("hunter2"));
        assertFalse(text.contains("tok-secret"));
        assertFalse(text.contains("api-secret"));
        assertFalse(text.contains("auth-secret"));
        assertFalse(text.contains("denied-secret"));
        assertFalse(text.contains("approval-secret"));
    }

    private boolean isRunRiskField(Field field) {
        Column column = field.getAnnotation(Column.class);
        return field.getName().toLowerCase(Locale.ROOT).contains("risk")
            || (column != null && "risk".equalsIgnoreCase(column.name()));
    }
}
