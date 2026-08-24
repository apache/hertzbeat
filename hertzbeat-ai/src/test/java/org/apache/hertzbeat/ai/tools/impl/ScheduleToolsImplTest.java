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

package org.apache.hertzbeat.ai.tools.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.ai.service.SopScheduleService;
import org.apache.hertzbeat.ai.sop.model.SopDefinition;
import org.apache.hertzbeat.ai.sop.model.SopParameter;
import org.apache.hertzbeat.ai.sop.registry.SkillRegistry;
import org.apache.hertzbeat.common.entity.ai.SopSchedule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Verifies that AI-created SOP schedules validate and persist skill parameters.
 */
@ExtendWith(MockitoExtension.class)
class ScheduleToolsImplTest {

    private static final String CRON = "0 0 9 * * ?";

    @Mock
    private SopScheduleService scheduleService;

    @Mock
    private SkillRegistry skillRegistry;

    private ScheduleToolsImpl scheduleTools;

    @BeforeEach
    void setUp() {
        scheduleTools = new ScheduleToolsImpl(scheduleService, skillRegistry);
    }

    @Test
    void createScheduleShouldPersistSkillParameters() {
        when(skillRegistry.getSkill("diagnosis")).thenReturn(parameterizedSkill());
        when(scheduleService.getSchedulesByConversation(7L)).thenReturn(List.of());
        when(scheduleService.createSchedule(any())).thenAnswer(invocation -> {
            SopSchedule schedule = invocation.getArgument(0);
            schedule.setId(9L);
            return schedule;
        });

        String result = scheduleTools.createScheduleWithConversation(
                7L, "diagnosis", CRON, "daily diagnosis", "{\"monitorId\":42}");

        ArgumentCaptor<SopSchedule> captor = ArgumentCaptor.forClass(SopSchedule.class);
        verify(scheduleService).createSchedule(captor.capture());
        assertEquals("{\"monitorId\":42}", captor.getValue().getSopParams());
        assertTrue(result.contains("9"));
    }

    @Test
    void createScheduleShouldAllowDifferentParametersAtTheSameTime() {
        SopSchedule existing = SopSchedule.builder()
                .sopName("diagnosis")
                .cronExpression(CRON)
                .sopParams("{\"monitorId\":41}")
                .build();
        when(skillRegistry.getSkill("diagnosis")).thenReturn(parameterizedSkill());
        when(scheduleService.getSchedulesByConversation(7L)).thenReturn(List.of(existing));
        when(scheduleService.createSchedule(any())).thenAnswer(invocation -> invocation.getArgument(0));

        scheduleTools.createScheduleWithConversation(
                7L, "diagnosis", CRON, null, "{\"monitorId\":42}");

        verify(scheduleService).createSchedule(any());
    }

    @Test
    void createScheduleShouldRejectMissingRequiredParameter() {
        when(skillRegistry.getSkill("diagnosis")).thenReturn(parameterizedSkill());

        String result = scheduleTools.createScheduleWithConversation(
                7L, "diagnosis", CRON, null, "{}");

        assertTrue(result.contains("monitorId"));
        verify(scheduleService, never()).createSchedule(any());
    }

    @Test
    void createScheduleShouldRejectInvalidParameterJson() {
        when(skillRegistry.getSkill("diagnosis")).thenReturn(parameterizedSkill());

        String result = scheduleTools.createScheduleWithConversation(
                7L, "diagnosis", CRON, null, "not-json");

        assertTrue(result.contains("valid JSON object"));
        verify(scheduleService, never()).createSchedule(any());
    }

    private SopDefinition parameterizedSkill() {
        SopParameter monitorId = SopParameter.builder()
                .name("monitorId")
                .required(true)
                .build();
        return SopDefinition.builder()
                .name("diagnosis")
                .parameters(List.of(monitorId))
                .build();
    }
}
