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

package org.apache.hertzbeat.collector.timer;

import org.apache.hertzbeat.collector.constants.ScheduleTypeEnum;
import org.apache.hertzbeat.common.entity.job.Job;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

/**
 * Test class for TimerDispatcher's getNextExecutionInterval method
 */
public class TimerDispatcherTest {

    @InjectMocks
    private TimerDispatcher timerDispatcher;

    @Mock
    private Job job;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    /**
     * Test getNextExecutionInterval with valid CRON expression
     * Should return the calculated interval based on cron expression
     */
    @Test
    void testGetNextExecutionIntervalWithValidCron() {
        // Setup - Use a cron expression that runs every minute
        when(job.getScheduleType()).thenReturn(ScheduleTypeEnum.CRON.getType());
        when(job.getCronExpression()).thenReturn("0 * * * * ?");
        when(job.getInterval()).thenReturn(60L); // Default interval as fallback

        // Execute
        Long result = timerDispatcher.getNextExecutionInterval(job);

        // Verify - Result should be between 0 and 60 seconds
        // since the cron expression runs every minute
        assertEquals(true, result >= 0 && result <= 60);
    }

    /**
     * Test getNextExecutionInterval with invalid CRON expression
     * Should fall back to interval scheduling
     */
    @Test
    void testGetNextExecutionIntervalWithInvalidCron() {
        // Setup - Use an invalid cron expression
        when(job.getScheduleType()).thenReturn(ScheduleTypeEnum.CRON.getType());
        when(job.getCronExpression()).thenReturn("invalid-cron-expression");
        when(job.getInterval()).thenReturn(300L); // 5 minutes

        // Execute
        Long result = timerDispatcher.getNextExecutionInterval(job);

        // Verify - Should fall back to interval value
        assertEquals(300L, result);
    }

    /**
     * Test getNextExecutionInterval with empty CRON expression
     * Should fall back to interval scheduling
     */
    @Test
    void testGetNextExecutionIntervalWithEmptyCron() {
        // Setup - Use empty cron expression
        when(job.getScheduleType()).thenReturn(ScheduleTypeEnum.CRON.getType());
        when(job.getCronExpression()).thenReturn("");
        when(job.getInterval()).thenReturn(120L); // 2 minutes

        // Execute
        Long result = timerDispatcher.getNextExecutionInterval(job);

        // Verify - Should fall back to interval value
        assertEquals(120L, result);
    }

    /**
     * Test getNextExecutionInterval with INTERVAL schedule type and no dispatchTime
     * Should return the full interval value
     */
    @Test
    void testGetNextExecutionIntervalWithIntervalNoDispatchTime() {
        // Setup - Use interval schedule type with no dispatchTime
        when(job.getScheduleType()).thenReturn(ScheduleTypeEnum.INTERVAL.getType());
        when(job.getDispatchTime()).thenReturn(0L); // No dispatchTime set
        when(job.getInterval()).thenReturn(600L); // 10 minutes

        // Execute
        Long result = timerDispatcher.getNextExecutionInterval(job);

        // Verify - Should return the full interval value
        assertEquals(600L, result);
    }

    /**
     * Test getNextExecutionInterval with INTERVAL schedule type and dispatchTime
     * Should return the remaining interval time
     */
    @Test
    void testGetNextExecutionIntervalWithIntervalAndDispatchTime() {
        // Setup - Use interval schedule type with dispatchTime
        long interval = 600L; // 10 minutes in seconds
        long spendTime = 300000L; // 5 minutes in milliseconds
        long dispatchTime = System.currentTimeMillis() - spendTime;
        
        when(job.getScheduleType()).thenReturn(ScheduleTypeEnum.INTERVAL.getType());
        when(job.getDispatchTime()).thenReturn(dispatchTime);
        when(job.getInterval()).thenReturn(interval);

        // Execute
        Long result = timerDispatcher.getNextExecutionInterval(job);

        // Verify - Should return the remaining interval time (approximately 5 minutes)
        // Considering possible time differences during execution, we check a range
        assertEquals(true, result >= 295 && result <= 305);
    }

    /**
     * Test getNextExecutionInterval with INTERVAL schedule type and negative remaining time
     * Should return 0 to ensure non-negative value
     */
    @Test
    void testGetNextExecutionIntervalWithIntervalAndNegativeRemainingTime() {
        // Setup - Use interval schedule type with dispatchTime resulting in negative remaining time
        long interval = 600L; // 10 minutes in seconds
        long spendTime = 1200000L; // 20 minutes in milliseconds (more than interval)
        long dispatchTime = System.currentTimeMillis() - spendTime;
        
        when(job.getScheduleType()).thenReturn(ScheduleTypeEnum.INTERVAL.getType());
        when(job.getDispatchTime()).thenReturn(dispatchTime);
        when(job.getInterval()).thenReturn(interval);

        // Execute
        Long result = timerDispatcher.getNextExecutionInterval(job);

        // Verify - Should return 0 to ensure non-negative value
        assertEquals(0L, result);
    }

    /**
     * Test getNextExecutionInterval with CRON schedule type and null cronExpression
     * Should fall back to interval scheduling
     */
    @Test
    void testGetNextExecutionIntervalWithCronAndNullExpression() {
        // Setup - Use cron schedule type with null cronExpression
        when(job.getScheduleType()).thenReturn(ScheduleTypeEnum.CRON.getType());
        when(job.getCronExpression()).thenReturn(null);
        when(job.getInterval()).thenReturn(180L); // 3 minutes

        // Execute
        Long result = timerDispatcher.getNextExecutionInterval(job);

        // Verify - Should fall back to interval value
        assertEquals(180L, result);
    }
}