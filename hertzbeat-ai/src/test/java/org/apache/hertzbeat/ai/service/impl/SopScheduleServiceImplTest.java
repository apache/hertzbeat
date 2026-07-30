/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to You under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.ai.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.util.Optional;
import org.apache.hertzbeat.ai.dao.ChatConversationDao;
import org.apache.hertzbeat.ai.dao.SopScheduleDao;
import org.apache.hertzbeat.common.entity.ai.ChatConversation;
import org.apache.hertzbeat.common.entity.ai.SopSchedule;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Ownership contracts for user-facing SOP schedule operations.
 */
@ExtendWith(MockitoExtension.class)
class SopScheduleServiceImplTest {

    @Mock
    private SopScheduleDao scheduleDao;

    @Mock
    private ChatConversationDao conversationDao;

    private SopScheduleServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new SopScheduleServiceImpl(scheduleDao, conversationDao);
        SubjectSum subject = mock(SubjectSum.class);
        lenient().when(subject.getPrincipal()).thenReturn("alice");
        SurenessContextHolder.bindSubject(subject);
    }

    @AfterEach
    void clearSubject() {
        SurenessContextHolder.clear();
    }

    @Test
    void createShouldNotTrustRequestCreator() {
        SopSchedule request = schedule(1L, "bob");
        when(conversationDao.findByIdAndCreator(10L, "alice"))
                .thenReturn(Optional.of(ChatConversation.builder()
                        .id(10L)
                        .creator("alice")
                        .build()));
        when(scheduleDao.save(any(SopSchedule.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        SopSchedule created = service.createSchedule(request);

        assertEquals("alice", created.getCreator());
    }

    @Test
    void getShouldHideAnotherCreatorsSchedule() {
        when(scheduleDao.findByIdAndCreator(1L, "alice")).thenReturn(Optional.empty());

        assertNull(service.getSchedule(1L));
    }

    @Test
    void listShouldRejectAnotherCreatorsConversation() {
        when(conversationDao.findByIdAndCreator(10L, "alice")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> service.getSchedulesByConversation(10L));
        verify(scheduleDao, never()).findByConversationIdAndCreator(10L, "alice");
    }

    @Test
    void deleteShouldNotRemoveAnotherCreatorsSchedule() {
        when(scheduleDao.findByIdAndCreator(1L, "alice")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.deleteSchedule(1L));
        verify(scheduleDao, never()).delete(any(SopSchedule.class));
    }

    @Test
    void updateAndToggleShouldNotModifyAnotherCreatorsSchedule() {
        when(scheduleDao.findByIdAndCreator(1L, "alice")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> service.updateSchedule(schedule(1L, "bob")));
        assertThrows(IllegalArgumentException.class,
                () -> service.toggleSchedule(1L, true));
        verify(scheduleDao, never()).save(any(SopSchedule.class));
    }

    @Test
    void backgroundExecutionShouldDisableMissingOwner() {
        SopSchedule schedule = schedule(1L, "legacy-owner");
        schedule.setEnabled(true);
        when(scheduleDao.findById(1L)).thenReturn(Optional.of(schedule));
        when(conversationDao.findByIdAndCreator(10L, "legacy-owner"))
                .thenReturn(Optional.empty());
        when(scheduleDao.save(schedule)).thenReturn(schedule);

        assertNull(service.getScheduleForExecution(1L));
        assertFalse(schedule.getEnabled());
        verify(scheduleDao).save(schedule);
    }

    @Test
    void backgroundExecutionUsesPersistedOwnerWithoutRequestSubject() {
        SurenessContextHolder.clear();
        SopSchedule schedule = schedule(1L, "alice");
        schedule.setEnabled(true);
        when(scheduleDao.findById(1L)).thenReturn(Optional.of(schedule));
        when(conversationDao.findByIdAndCreator(10L, "alice"))
                .thenReturn(Optional.of(ChatConversation.builder()
                        .id(10L)
                        .creator("alice")
                        .build()));

        assertSame(schedule, service.getScheduleForExecution(1L));
    }

    private SopSchedule schedule(Long id, String creator) {
        return SopSchedule.builder()
                .id(id)
                .conversationId(10L)
                .sopName("daily_inspection")
                .cronExpression("0 0 9 * * ?")
                .creator(creator)
                .build();
    }
}
