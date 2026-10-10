/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.ai.gateway.schedule;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.alert.service.NoticeConfigService;
import org.apache.hertzbeat.ai.gateway.channel.core.ChannelId;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Tests for {@link AgentScheduleService}.
 */
@ExtendWith(MockitoExtension.class)
class AgentScheduleServiceTest {

    @Mock
    private AgentScheduleDao scheduleDao;
    @Mock
    private AgentSessionService sessionService;
    @Mock
    private AgentRunService runService;
    @Mock
    private NoticeConfigService noticeConfigService;

    private AgentScheduleService service;

    @BeforeEach
    void setUp() {
        service = new AgentScheduleService(scheduleDao, sessionService, runService, noticeConfigService);
    }

    @Test
    void shouldCreateFixedSystemScheduleSession() {
        AgentSchedule input = schedule();
        stubNoticeConfiguration();
        when(scheduleDao.saveAndFlush(input)).thenAnswer(invocation -> {
            AgentSchedule saved = invocation.getArgument(0);
            saved.setId(7L);
            return saved;
        });
        when(sessionService.findOrCreateSession(any(), any(), any()))
                .thenReturn(AgentSession.builder().id(21L).build());
        when(scheduleDao.save(input)).thenReturn(input);

        AgentSchedule saved = service.create(input);

        assertEquals(21L, saved.getSessionId());
        assertNotNull(saved.getNextTriggerAt());
        ArgumentCaptor<GatewayEnvelope> envelope = ArgumentCaptor.forClass(GatewayEnvelope.class);
        ArgumentCaptor<UserInput> userInput = ArgumentCaptor.forClass(UserInput.class);
        ArgumentCaptor<AgentRuntimeEntryType> entryType = ArgumentCaptor.forClass(AgentRuntimeEntryType.class);
        verify(sessionService).findOrCreateSession(
                envelope.capture(), userInput.capture(), entryType.capture());
        assertEquals(ChannelId.SYSTEM.id(), envelope.getValue().getChannelId());
        assertEquals(AgentRuntimeEntryType.SCHEDULE_TRIGGER, entryType.getValue());
        assertEquals(ActorSupport.TYPE_SYSTEM, envelope.getValue().getActor().getType());
        assertEquals(ActorSupport.ID_SCHEDULE, envelope.getValue().getActor().getId());
        assertEquals("schedule:7", userInput.getValue().getConversationId());
    }

    @Test
    void shouldRejectSubMinuteCron() {
        AgentSchedule input = schedule();
        input.setCronExpression("5 * * * * *");
        stubNoticeConfiguration();

        assertThrows(IllegalArgumentException.class, () -> service.create(input));
        verify(scheduleDao, never()).saveAndFlush(any());
    }

    @Test
    void shouldRequireExistingReceivers() {
        AgentSchedule input = schedule();
        input.setReceiverIds(List.of(99L));

        assertThrows(IllegalArgumentException.class, () -> service.create(input));
    }

    @Test
    void shouldNotEnableMigratedScheduleWithoutReceiverConfiguration() {
        AgentSchedule migrated = persistedSchedule();
        migrated.setEnabled(false);
        migrated.setReceiverIds(List.of());
        when(scheduleDao.findById(7L)).thenReturn(Optional.of(migrated));

        assertThrows(IllegalArgumentException.class, () -> service.toggle(7L, true));
    }

    @Test
    void shouldSkipCronTriggerWhileRunIsActive() {
        AgentSchedule schedule = persistedSchedule();
        when(scheduleDao.findById(7L)).thenReturn(Optional.of(schedule));
        when(runService.hasActiveRun(21L)).thenReturn(true);

        Optional<AgentRun> run = service.claimCronRun(7L, System.currentTimeMillis());

        assertFalse(run.isPresent());
        verify(runService, never()).createOrResumeRun(any(), any(), any());
        verify(scheduleDao).save(schedule);
    }

    @Test
    void shouldUsePlannedTimeInCronMessageId() {
        AgentSchedule schedule = persistedSchedule();
        long plannedAt = schedule.getNextTriggerAt();
        AgentSession session = AgentSession.builder().id(21L).build();
        when(scheduleDao.findById(7L)).thenReturn(Optional.of(schedule));
        when(sessionService.findSession("21")).thenReturn(Optional.of(session));
        when(runService.createOrResumeRun(any(), any(), any())).thenAnswer(invocation -> {
            UserInput input = invocation.getArgument(1);
            return AgentRun.builder().messageId(input.getMessageId()).build();
        });

        AgentRun run = service.claimCronRun(7L, System.currentTimeMillis()).orElseThrow();

        assertEquals("schedule:7:cron:" + plannedAt, run.getMessageId());
    }

    private AgentSchedule schedule() {
        return AgentSchedule.builder()
                .name("Daily health inspection")
                .instruction("Inspect all unhealthy monitors")
                .cronExpression("0 0 9 * * *")
                .enabled(true)
                .receiverIds(List.of(10L))
                .build();
    }

    private AgentSchedule persistedSchedule() {
        AgentSchedule schedule = schedule();
        schedule.setId(7L);
        schedule.setSessionId(21L);
        schedule.setNextTriggerAt(System.currentTimeMillis() - 1_000L);
        return schedule;
    }

    private void stubNoticeConfiguration() {
        when(noticeConfigService.getReceiverById(10L))
                .thenReturn(NoticeReceiver.builder().id(10L).type((byte) 1).build());
        when(noticeConfigService.getDefaultNoticeTemplateByType((byte) 1))
                .thenReturn(NoticeTemplate.builder().type((byte) 1).build());
    }
}
