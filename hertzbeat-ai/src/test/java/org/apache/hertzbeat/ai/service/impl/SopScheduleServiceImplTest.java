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

package org.apache.hertzbeat.ai.service.impl;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;

import org.apache.hertzbeat.ai.dao.SopScheduleDao;
import org.apache.hertzbeat.common.entity.ai.SopSchedule;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Verifies that SOP schedules with no future execution time are not persisted.
 */
@ExtendWith(MockitoExtension.class)
class SopScheduleServiceImplTest {

    @Mock
    private SopScheduleDao sopScheduleDao;

    @InjectMocks
    private SopScheduleServiceImpl scheduleService;

    @Test
    void createScheduleShouldRejectCronWithoutFutureExecutionTime() {
        SopSchedule schedule = SopSchedule.builder()
                .conversationId(1L)
                .sopName("daily_inspection")
                .cronExpression("0 0 0 31 2 *")
                .build();

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class, () -> scheduleService.createSchedule(schedule));

        assertTrue(exception.getMessage().contains("no future execution time"));
        verifyNoInteractions(sopScheduleDao);
    }
}
