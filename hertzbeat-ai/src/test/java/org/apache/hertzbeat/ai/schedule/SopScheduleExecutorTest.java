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

package org.apache.hertzbeat.ai.schedule;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.ai.dao.ChatMessageDao;
import org.apache.hertzbeat.ai.service.SopScheduleService;
import org.apache.hertzbeat.ai.sop.engine.SopEngine;
import org.apache.hertzbeat.ai.sop.model.SopDefinition;
import org.apache.hertzbeat.ai.sop.model.SopResult;
import org.apache.hertzbeat.ai.sop.registry.SkillRegistry;
import org.apache.hertzbeat.common.entity.ai.ChatMessage;
import org.apache.hertzbeat.common.entity.ai.SopSchedule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Verifies that due SOP schedules are isolated from each other and reject invalid parameters.
 */
@ExtendWith(MockitoExtension.class)
class SopScheduleExecutorTest {

    @Mock
    private SopScheduleService scheduleService;

    @Mock
    private SopEngine sopEngine;

    @Mock
    private SkillRegistry skillRegistry;

    @Mock
    private ChatMessageDao chatMessageDao;

    private SopScheduleExecutor executor;

    @BeforeEach
    void setUp() {
        executor = new SopScheduleExecutor(scheduleService, sopEngine, skillRegistry, chatMessageDao);
    }

    @Test
    void checkShouldContinueAfterOneScheduleFailsToUpdate() {
        SopSchedule first = schedule(1L, null);
        SopSchedule second = schedule(2L, null);
        SopDefinition definition = SopDefinition.builder().name("daily_inspection").build();
        SopResult result = SopResult.builder()
                .status("SUCCESS")
                .content("ok")
                .build();
        when(scheduleService.getDueSchedules()).thenReturn(List.of(first, second));
        when(skillRegistry.getSkill("daily_inspection")).thenReturn(definition);
        when(sopEngine.executeSync(any(SopDefinition.class), anyMap())).thenReturn(result);
        doThrow(new IllegalStateException("database unavailable"))
                .when(scheduleService).updateAfterExecution(1L);

        executor.checkAndExecuteDueSchedules();

        verify(sopEngine, times(2)).executeSync(any(SopDefinition.class), anyMap());
        verify(scheduleService).updateAfterExecution(2L);
    }

    @Test
    void checkShouldRejectInvalidScheduleParameters() {
        SopSchedule schedule = schedule(1L, "not-json");
        when(scheduleService.getDueSchedules()).thenReturn(List.of(schedule));
        when(skillRegistry.getSkill("daily_inspection"))
                .thenReturn(SopDefinition.builder().name("daily_inspection").build());

        executor.checkAndExecuteDueSchedules();

        verifyNoInteractions(sopEngine);
        verify(chatMessageDao).save(any(ChatMessage.class));
        verify(scheduleService).updateAfterExecution(1L);
    }

    private SopSchedule schedule(Long id, String params) {
        return SopSchedule.builder()
                .id(id)
                .conversationId(10L)
                .sopName("daily_inspection")
                .sopParams(params)
                .build();
    }
}
