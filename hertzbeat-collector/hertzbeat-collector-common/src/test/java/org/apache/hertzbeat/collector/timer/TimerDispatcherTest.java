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

import java.lang.reflect.Field;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import org.apache.hertzbeat.collector.constants.ScheduleTypeEnum;
import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectResponseEventListener;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.timer.Timeout;
import org.apache.hertzbeat.common.timer.Timer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

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

    @AfterEach
    void tearDown() throws Exception {
        if (timerDispatcher != null) {
            timerDispatcher.destroy();
        }
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

    @Test
    void testAddCyclicJobCancelsPreviousTimeoutForSameJob() {
        Job firstJob = Job.builder()
                .id(1L)
                .app("test")
                .isCyclic(true)
                .configmap(List.of())
                .metrics(List.of(Metrics.builder().interval(60L).build()))
                .build();
        timerDispatcher.addJob(firstJob, null);

        Timeout firstTimeout = currentCyclicTaskMap().get(1L);

        Job updatedJob = Job.builder()
                .id(1L)
                .app("test")
                .isCyclic(true)
                .configmap(List.of())
                .metrics(List.of(Metrics.builder().interval(60L).build()))
                .build();
        timerDispatcher.addJob(updatedJob, null);

        Timeout updatedTimeout = currentCyclicTaskMap().get(1L);
        assertNotSame(firstTimeout, updatedTimeout);
        assertTrue(firstTimeout.isCancelled());
        assertFalse(updatedTimeout.isCancelled());
    }

    @Test
    void testAddTemporaryJobCancelsPreviousTimeoutForSameJob() {
        Job firstJob = Job.builder()
                .id(1L)
                .app("test")
                .isCyclic(false)
                .configmap(List.of())
                .metrics(List.of(Metrics.builder().interval(60L).build()))
                .build();
        timerDispatcher.addJob(firstJob, new CollectResponseEventListener() {
        });

        Timeout firstTimeout = currentTempTaskMap().get(1L);

        Job updatedJob = Job.builder()
                .id(1L)
                .app("test")
                .isCyclic(false)
                .configmap(List.of())
                .metrics(List.of(Metrics.builder().interval(60L).build()))
                .build();
        timerDispatcher.addJob(updatedJob, new CollectResponseEventListener() {
        });

        Timeout updatedTimeout = currentTempTaskMap().get(1L);
        assertNotSame(firstTimeout, updatedTimeout);
        assertTrue(firstTimeout.isCancelled());
        assertFalse(updatedTimeout.isCancelled());
    }

    @Test
    void testCyclicJobCancelsPreviousTimeoutForSameJob() {
        Job job = Job.builder()
                .id(1L)
                .app("test")
                .isCyclic(true)
                .configmap(List.of())
                .metrics(List.of(Metrics.builder().interval(60L).build()))
                .build();
        timerDispatcher.addJob(job, null);
        Timeout t0 = currentCyclicTaskMap().get(1L);

        WheelTimerTask timerTask = (WheelTimerTask) t0.task();

        timerDispatcher.cyclicJob(timerTask, 60L, TimeUnit.SECONDS);
        Timeout t1 = currentCyclicTaskMap().get(1L);

        timerDispatcher.cyclicJob(timerTask, 60L, TimeUnit.SECONDS);
        Timeout t2 = currentCyclicTaskMap().get(1L);

        assertNotSame(t0, t1);
        assertNotSame(t1, t2);
        assertFalse(t2.isCancelled());

        assertTrue(t0.isCancelled(), "T0 orphaned: overwritten by cyclicJob but never cancelled");
        assertTrue(t1.isCancelled(), "T1 orphaned: overwritten by cyclicJob but never cancelled");
    }

    @Test
    void deletedJobCannotBeRescheduled() {
        Job scheduled = scheduledJob();
        timerDispatcher.addJob(scheduled, null);
        WheelTimerTask task = (WheelTimerTask) currentCyclicTaskMap().get(1L).task();
        timerDispatcher.deleteJob(1L, true);
        timerDispatcher.cyclicJob(task, 60, TimeUnit.SECONDS);
        assertTrue(task.isCancelled());
        assertTrue(currentCyclicTaskMap().isEmpty());
    }

    @Test
    void deleteRetiresTaskEvenIfExpiredTimeoutCannotBeCancelled() {
        timerDispatcher.addJob(scheduledJob(), null);
        Timeout initial = currentCyclicTaskMap().get(1L);
        initial.cancel();
        WheelTimerTask task = (WheelTimerTask) initial.task();
        Timeout expired = mock(Timeout.class);
        when(expired.task()).thenReturn(task);
        when(expired.isExpired()).thenReturn(true);
        when(expired.cancel()).thenReturn(false);
        currentCyclicTaskMap().put(1L, expired);
        timerDispatcher.deleteJob(1L, true);
        assertTrue(task.isCancelled());
        assertFalse(expired.isCancelled());
        assertTrue(currentCyclicTaskMap().isEmpty());
    }

    @Test
    void oldJobCannotReplaceReaddedJob() {
        timerDispatcher.addJob(scheduledJob(), null);
        WheelTimerTask old = (WheelTimerTask) currentCyclicTaskMap().get(1L).task();
        timerDispatcher.addJob(scheduledJob(), null);
        Timeout replacement = currentCyclicTaskMap().get(1L);
        timerDispatcher.cyclicJob(old, 60, TimeUnit.SECONDS);
        assertSame(replacement, currentCyclicTaskMap().get(1L));
        assertTrue(old.isCancelled());
        assertFalse(((WheelTimerTask) replacement.task()).isCancelled());
    }

    @Test
    void offlineRetiresJobAndPreventsReschedulingAfterOnline() {
        timerDispatcher.addJob(scheduledJob(), null);
        WheelTimerTask old = (WheelTimerTask) currentCyclicTaskMap().get(1L).task();
        timerDispatcher.goOffline();
        timerDispatcher.goOnline();
        timerDispatcher.addJob(scheduledJob(), null);
        Timeout replacement = currentCyclicTaskMap().get(1L);
        timerDispatcher.cyclicJob(old, 60, TimeUnit.SECONDS);
        assertSame(replacement, currentCyclicTaskMap().get(1L));
        assertTrue(old.isCancelled());
    }

    @Test
    void concurrentDeleteCannotResurrectJob() throws Exception {
        timerDispatcher.addJob(scheduledJob(), null);
        Timeout previous = currentCyclicTaskMap().get(1L);
        WheelTimerTask task = (WheelTimerTask) previous.task();
        Timer wheel = mock(Timer.class);
        Timeout next = mock(Timeout.class);
        when(next.task()).thenReturn(task);
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(wheel.newTimeout(task, 60, TimeUnit.SECONDS)).thenAnswer(invocation -> {
            entered.countDown();
            assertTrue(release.await(5, TimeUnit.SECONDS));
            return next;
        });
        Field field = TimerDispatcher.class.getDeclaredField("wheelTimer");
        field.setAccessible(true);
        Timer original = (Timer) field.get(timerDispatcher);
        field.set(timerDispatcher, wheel);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var reschedule = executor.submit(() -> timerDispatcher.cyclicJob(task, 60, TimeUnit.SECONDS));
            assertTrue(entered.await(5, TimeUnit.SECONDS));
            var delete = executor.submit(() -> timerDispatcher.deleteJob(1L, true));
            release.countDown();
            reschedule.get(5, TimeUnit.SECONDS);
            delete.get(5, TimeUnit.SECONDS);
            assertTrue(currentCyclicTaskMap().isEmpty());
            assertTrue(task.isCancelled());
            verify(next).cancel();
        } finally {
            original.stop();
        }
    }

    private Job scheduledJob() {
        return Job.builder().id(1L).app("test").isCyclic(true).configmap(List.of())
                .metrics(List.of(Metrics.builder().interval(60L).build())).build();
    }

    @SuppressWarnings("unchecked")
    private Map<Long, Timeout> currentCyclicTaskMap() {
        try {
            Field field = TimerDispatcher.class.getDeclaredField("currentCyclicTaskMap");
            field.setAccessible(true);
            return (Map<Long, Timeout>) field.get(timerDispatcher);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<Long, Timeout> currentTempTaskMap() {
        try {
            Field field = TimerDispatcher.class.getDeclaredField("currentTempTaskMap");
            field.setAccessible(true);
            return (Map<Long, Timeout>) field.get(timerDispatcher);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }

    @Test
    void testFirstCyclicDelayJittersWithinInterval() {
        when(job.isCyclic()).thenReturn(true);
        when(job.getScheduleType()).thenReturn(null);
        when(job.getDispatchTime()).thenReturn(0L);
        when(job.getInterval()).thenReturn(600L);
        when(job.getId()).thenReturn(4242L);

        Set<Long> delays = new HashSet<>();
        for (int i = 0; i < 50; i++) {
            long delay = timerDispatcher.initialCyclicDelay(job);
            assertTrue(delay >= 1 && delay <= 600, "delay out of interval: " + delay);
            delays.add(delay);
        }
        assertTrue(delays.size() > 1, "no jitter observed across 50 samples");
    }

    @Test
    void testExecutedJobKeepsRemainingIntervalOnReAdd() {
        when(job.getScheduleType()).thenReturn(null);
        when(job.getDispatchTime()).thenReturn(System.currentTimeMillis() - 10_000L);
        when(job.getInterval()).thenReturn(600L);

        long expected = timerDispatcher.getNextExecutionInterval(job);
        long actual = timerDispatcher.initialCyclicDelay(job);
        assertTrue(Math.abs(actual - expected) <= 1, "remaining interval must not be jittered");
    }

    @Test
    void testCronScheduleKeepsFixedPhase() {
        when(job.getScheduleType()).thenReturn(ScheduleTypeEnum.CRON.getType());
        when(job.getCronExpression()).thenReturn("0 0 3 * * ?");
        long expected = timerDispatcher.getNextExecutionInterval(job);
        long actual = timerDispatcher.initialCyclicDelay(job);
        assertTrue(Math.abs(actual - expected) <= 1, "cron phase must not be jittered");
    }
}
