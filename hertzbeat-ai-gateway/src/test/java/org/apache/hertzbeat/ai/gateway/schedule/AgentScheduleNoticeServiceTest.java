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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.notice.AlertNoticeDispatch;
import org.apache.hertzbeat.alert.service.NoticeConfigService;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Tests for {@link AgentScheduleNoticeService}.
 */
@ExtendWith(MockitoExtension.class)
class AgentScheduleNoticeServiceTest {

    @Mock
    private NoticeConfigService noticeConfigService;
    @Mock
    private AlertNoticeDispatch alertNoticeDispatch;
    @Mock
    private AlerterWorkerPool workerPool;

    @Test
    void shouldUseExistingAlertNoticeTransportWithoutDispatchingAnAlert() {
        NoticeReceiver receiver = NoticeReceiver.builder().id(10L).type((byte) 1).build();
        NoticeTemplate template = NoticeTemplate.builder().id(20L).type((byte) 1).build();
        when(noticeConfigService.getReceiverById(10L)).thenReturn(receiver);
        when(noticeConfigService.getOneTemplateById(20L)).thenReturn(template);
        doAnswer(invocation -> {
            invocation.<Runnable>getArgument(1).run();
            return null;
        }).when(workerPool).executeNotify(eq((byte) 1), any());
        AgentSchedule schedule = AgentSchedule.builder()
                .id(7L)
                .name("Daily inspection")
                .receiverIds(List.of(10L))
                .templateId(20L)
                .lastTriggerAt(100L)
                .build();
        AgentRun run = AgentRun.builder().runUid("run_1").build();

        new AgentScheduleNoticeService(noticeConfigService, alertNoticeDispatch, workerPool)
                .send(schedule, run, true, "Everything is healthy");

        ArgumentCaptor<GroupAlert> alert = ArgumentCaptor.forClass(GroupAlert.class);
        verify(alertNoticeDispatch).sendNoticeMsg(eq(receiver), eq(template), alert.capture());
        assertEquals("resolved", alert.getValue().getStatus());
        assertEquals("Everything is healthy", alert.getValue().getAlerts().getFirst().getContent());
    }
}
