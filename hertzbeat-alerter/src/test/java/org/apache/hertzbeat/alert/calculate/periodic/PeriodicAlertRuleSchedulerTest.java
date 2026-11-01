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

package org.apache.hertzbeat.alert.calculate.periodic;

import static org.apache.hertzbeat.common.constants.CommonConstants.METRIC_ALERT_THRESHOLD_TYPE_PERIODIC;
import static org.apache.hertzbeat.common.constants.CommonConstants.TRACE_ALERT_THRESHOLD_TYPE_PERIODIC;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.alert.dao.AlertDefineDao;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Tests for {@link PeriodicAlertRuleScheduler}.
 */
@ExtendWith(MockitoExtension.class)
class PeriodicAlertRuleSchedulerTest {

    @Mock
    private MetricsPeriodicAlertCalculator metricsCalculator;

    @Mock
    private LogPeriodicAlertCalculator logCalculator;

    @Mock
    private TracePeriodicAlertCalculator traceCalculator;

    @Mock
    private AlertDefineDao alertDefineDao;

    private PeriodicAlertRuleScheduler scheduler;

    @BeforeEach
    void setUp() {
        scheduler = new PeriodicAlertRuleScheduler(metricsCalculator, logCalculator, traceCalculator, alertDefineDao,
                VirtualThreadProperties.defaults());
        scheduler.start();
    }

    @AfterEach
    void tearDown() {
        if (scheduler != null) {
            scheduler.stop();
        }
    }

    @Test
    void updateScheduleRunsPeriodicCalculationOnVirtualThread() throws InterruptedException {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);
        doAnswer(invocation -> {
            virtualThread.set(Thread.currentThread().isVirtual());
            latch.countDown();
            return null;
        }).when(metricsCalculator).calculate(any(AlertDefine.class));

        AlertDefine rule = metricRule(1L);
        scheduler.updateSchedule(rule);

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void updateScheduleKeepsSingleInFlightExecutionPerRule() throws InterruptedException {
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicInteger concurrent = new AtomicInteger();
        AtomicInteger maxConcurrent = new AtomicInteger();
        AtomicInteger invocations = new AtomicInteger();
        doAnswer(invocation -> {
            int active = concurrent.incrementAndGet();
            maxConcurrent.updateAndGet(current -> Math.max(current, active));
            int count = invocations.incrementAndGet();
            try {
                if (count == 1) {
                    firstStarted.countDown();
                    releaseFirst.await(5, TimeUnit.SECONDS);
                } else if (count == 2) {
                    secondStarted.countDown();
                }
            } finally {
                concurrent.decrementAndGet();
            }
            return null;
        }).when(metricsCalculator).calculate(any(AlertDefine.class));

        scheduler.updateSchedule(metricRule(2L));

        assertTrue(firstStarted.await(5, TimeUnit.SECONDS));
        Thread.sleep(1200L);
        assertEquals(1, maxConcurrent.get());

        releaseFirst.countDown();
        assertTrue(secondStarted.await(5, TimeUnit.SECONDS));
        assertEquals(1, maxConcurrent.get());
    }

    @Test
    void cancelScheduleInterruptsRunningVirtualTask() throws InterruptedException {
        CountDownLatch started = new CountDownLatch(1);
        CountDownLatch interrupted = new CountDownLatch(1);
        doAnswer(invocation -> {
            started.countDown();
            try {
                Thread.sleep(5000L);
            } catch (InterruptedException e) {
                interrupted.countDown();
                Thread.currentThread().interrupt();
            }
            return null;
        }).when(metricsCalculator).calculate(any(AlertDefine.class));

        AlertDefine rule = metricRule(3L);
        scheduler.updateSchedule(rule);

        assertTrue(started.await(5, TimeUnit.SECONDS));
        scheduler.cancelSchedule(rule.getId());
        assertTrue(interrupted.await(5, TimeUnit.SECONDS));
    }

    @Test
    void updateScheduleHonorsConfiguredGlobalPeriodicConcurrencyLimit() throws InterruptedException {
        scheduler.stop();
        scheduler = new PeriodicAlertRuleScheduler(metricsCalculator, logCalculator, traceCalculator, alertDefineDao,
                periodicProperties(1));
        scheduler.start();

        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicInteger concurrent = new AtomicInteger();
        AtomicInteger maxConcurrent = new AtomicInteger();
        doAnswer(invocation -> {
            int active = concurrent.incrementAndGet();
            maxConcurrent.updateAndGet(current -> Math.max(current, active));
            AlertDefine rule = invocation.getArgument(0);
            try {
                if (rule.getId().equals(4L)) {
                    firstStarted.countDown();
                    releaseFirst.await(5, TimeUnit.SECONDS);
                } else if (rule.getId().equals(5L)) {
                    secondStarted.countDown();
                }
            } finally {
                concurrent.decrementAndGet();
            }
            return null;
        }).when(metricsCalculator).calculate(any(AlertDefine.class));

        scheduler.updateSchedule(metricRule(4L));
        assertTrue(firstStarted.await(5, TimeUnit.SECONDS));

        scheduler.updateSchedule(metricRule(5L));
        Thread.sleep(200L);
        assertEquals(1, maxConcurrent.get());
        assertEquals(1L, secondStarted.getCount());

        releaseFirst.countDown();
        assertTrue(secondStarted.await(5, TimeUnit.SECONDS));
        assertEquals(1, maxConcurrent.get());
    }

    @Test
    void startLoadsPeriodicTraceRulesAtStartup() {
        scheduler.stop();
        clearInvocations(alertDefineDao);
        when(alertDefineDao.findAlertDefinesByTypeAndEnableTrue(METRIC_ALERT_THRESHOLD_TYPE_PERIODIC))
                .thenReturn(java.util.List.of());
        when(alertDefineDao.findAlertDefinesByTypeAndEnableTrue(
                org.apache.hertzbeat.common.constants.CommonConstants.LOG_ALERT_THRESHOLD_TYPE_PERIODIC))
                .thenReturn(java.util.List.of());
        when(alertDefineDao.findAlertDefinesByTypeAndEnableTrue(TRACE_ALERT_THRESHOLD_TYPE_PERIODIC))
                .thenReturn(java.util.List.of(traceRule(6L)));

        scheduler.start();

        verify(alertDefineDao).findAlertDefinesByTypeAndEnableTrue(TRACE_ALERT_THRESHOLD_TYPE_PERIODIC);
    }

    @Test
    void updateScheduleRunsPeriodicTraceCalculation() throws InterruptedException {
        CountDownLatch latch = new CountDownLatch(1);
        doAnswer(invocation -> {
            latch.countDown();
            return null;
        }).when(traceCalculator).calculate(any(AlertDefine.class));

        scheduler.updateSchedule(traceRule(7L));

        assertTrue(latch.await(5, TimeUnit.SECONDS));
    }

    @Test
    void stopDuringPendingExecutionIsIdempotentAndDoesNotResubmit() throws InterruptedException {
        CountDownLatch started = new CountDownLatch(1);
        CountDownLatch interrupted = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicInteger invocations = new AtomicInteger();
        doAnswer(invocation -> {
            int current = invocations.incrementAndGet();
            if (current == 1) {
                started.countDown();
                try {
                    Thread.sleep(5000L);
                } catch (InterruptedException e) {
                    interrupted.countDown();
                    Thread.currentThread().interrupt();
                }
            } else {
                secondStarted.countDown();
            }
            return null;
        }).when(metricsCalculator).calculate(any(AlertDefine.class));

        scheduler.updateSchedule(metricRule(8L));
        assertTrue(started.await(5, TimeUnit.SECONDS));
        Thread.sleep(1200L);

        scheduler.stop();
        scheduler.stop();

        assertTrue(interrupted.await(5, TimeUnit.SECONDS));
        assertFalse(secondStarted.await(1500, TimeUnit.MILLISECONDS));
        assertEquals(1, invocations.get());
    }

    @Test
    void pauseDrainsAnEnteredPeriodicCalculationWithoutStoppingScheduler() throws Exception {
        CountDownLatch started = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch resumed = new CountDownLatch(1);
        AtomicInteger invocations = new AtomicInteger();
        doAnswer(invocation -> {
            if (invocations.incrementAndGet() == 1) {
                started.countDown();
                release.await();
            } else {
                resumed.countDown();
            }
            return null;
        }).when(metricsCalculator).calculate(any(AlertDefine.class));
        scheduler.updateSchedule(metricRule(9L));
        assertTrue(started.await(5, TimeUnit.SECONDS));

        scheduler.pauseAdmission();
        assertThrows(TimeoutException.class, () -> scheduler.awaitDrained(0));
        release.countDown();
        scheduler.awaitDrained(TimeUnit.SECONDS.toNanos(1));

        scheduler.resumeAdmission();
        scheduler.updateSchedule(metricRule(10L));
        assertTrue(resumed.await(5, TimeUnit.SECONDS));
    }

    @Test
    void pausedTicksCoalescePerRuleAndResumeOnceWithVirtualExecutor() throws Exception {
        assertPausedTicksResumeOnce(periodicProperties(true, 1));
    }

    @Test
    void pausedTicksCoalescePerRuleAndResumeOnceWithScheduledExecutor() throws Exception {
        assertPausedTicksResumeOnce(periodicProperties(false, 1));
    }

    private void assertPausedTicksResumeOnce(VirtualThreadProperties properties) throws Exception {
        scheduler.stop();
        CountDownLatch thirdTickAtHook = new CountDownLatch(1);
        CountDownLatch releaseThirdTick = new CountDownLatch(1);
        AtomicInteger scheduledTicks = new AtomicInteger();
        scheduler = new PeriodicAlertRuleScheduler(
                metricsCalculator, logCalculator, traceCalculator, alertDefineDao, properties) {
            @Override
            void beforeRuleTrigger(AlertDefine rule) {
                if (!Thread.currentThread().getName().startsWith("periodic-alert-threshold-worker-")) {
                    return;
                }
                if (scheduledTicks.incrementAndGet() == 3) {
                    thirdTickAtHook.countDown();
                    boolean interrupted = false;
                    while (releaseThirdTick.getCount() != 0) {
                        try {
                            releaseThirdTick.await();
                        } catch (InterruptedException e) {
                            interrupted = true;
                        }
                    }
                    if (interrupted) {
                        Thread.currentThread().interrupt();
                    }
                }
            }
        };
        scheduler.start();
        ScheduledExecutorService scheduled = (ScheduledExecutorService) ReflectionTestUtils.getField(scheduler, "scheduledExecutor");
        ExecutorService periodic = (ExecutorService) ReflectionTestUtils.getField(scheduler, "periodicExecutor");
        CountDownLatch calculated = new CountDownLatch(1);
        AtomicInteger invocations = new AtomicInteger();
        doAnswer(invocation -> {
            invocations.incrementAndGet();
            calculated.countDown();
            return null;
        }).when(metricsCalculator).calculate(any(AlertDefine.class));
        AlertDefine rule = metricRule(11L);
        try {
            scheduler.pauseAdmission();
            scheduler.updateSchedule(rule);
            // Fixed-rate executions of one task do not overlap; two earlier paused ticks completed.
            assertTrue(thirdTickAtHook.await(5, TimeUnit.SECONDS));
            scheduler.awaitDrained(0);
            scheduler.resumeAdmission();
            scheduler.resumeAdmission();
            assertTrue(calculated.await(5, TimeUnit.SECONDS));
            scheduler.awaitDrained(TimeUnit.SECONDS.toNanos(5));
            scheduler.cancelSchedule(rule.getId());
            assertEquals(1, invocations.get());
        } finally {
            scheduler.cancelSchedule(rule.getId());
            releaseThirdTick.countDown();
            scheduler.stop();
            boolean scheduledTerminated = scheduled.awaitTermination(5, TimeUnit.SECONDS);
            boolean periodicTerminated = periodic == null || periodic.awaitTermination(5, TimeUnit.SECONDS);
            assertTrue(scheduledTerminated);
            assertTrue(periodicTerminated);
        }
    }

    private AlertDefine metricRule(Long id) {
        return AlertDefine.builder()
                .id(id)
                .name("periodic-rule-" + id)
                .type(METRIC_ALERT_THRESHOLD_TYPE_PERIODIC)
                .period(1)
                .enable(true)
                .build();
    }

    private AlertDefine traceRule(Long id) {
        return AlertDefine.builder()
                .id(id)
                .name("periodic-trace-rule-" + id)
                .type(TRACE_ALERT_THRESHOLD_TYPE_PERIODIC)
                .period(1)
                .enable(true)
                .build();
    }

    private VirtualThreadProperties periodicProperties(int maxConcurrentJobs) {
        return periodicProperties(true, maxConcurrentJobs);
    }

    private VirtualThreadProperties periodicProperties(boolean enabled, int maxConcurrentJobs) {
        return new VirtualThreadProperties(
                enabled,
                VirtualThreadProperties.PoolProperties.collectorDefaults(),
                VirtualThreadProperties.PoolProperties.commonDefaults(),
                VirtualThreadProperties.PoolProperties.managerDefaults(),
                new VirtualThreadProperties.AlerterProperties(
                        VirtualThreadProperties.PoolProperties.alerterNotifyDefaults(),
                        maxConcurrentJobs,
                        VirtualThreadProperties.QueueProperties.logWorkerDefaults(),
                        VirtualThreadProperties.QueueProperties.reduceDefaults(),
                        VirtualThreadProperties.QueueProperties.windowEvaluatorDefaults(),
                        4),
                VirtualThreadProperties.PoolProperties.warehouseDefaults(),
                VirtualThreadProperties.AsyncProperties.defaults());
    }
}
