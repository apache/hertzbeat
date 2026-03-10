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
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
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
    private AlertDefineDao alertDefineDao;

    private PeriodicAlertRuleScheduler scheduler;

    @BeforeEach
    void setUp() {
        scheduler = new PeriodicAlertRuleScheduler(metricsCalculator, logCalculator, alertDefineDao,
                VirtualThreadProperties.defaults());
    }

    @AfterEach
    void tearDown() {
        if (scheduler != null) {
            scheduler.destroy();
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
        scheduler.destroy();
        scheduler = new PeriodicAlertRuleScheduler(metricsCalculator, logCalculator, alertDefineDao,
                periodicProperties(1));

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

    private AlertDefine metricRule(Long id) {
        return AlertDefine.builder()
                .id(id)
                .name("periodic-rule-" + id)
                .type(METRIC_ALERT_THRESHOLD_TYPE_PERIODIC)
                .period(1)
                .enable(true)
                .build();
    }

    private VirtualThreadProperties periodicProperties(int maxConcurrentJobs) {
        VirtualThreadProperties properties = VirtualThreadProperties.defaults();
        properties.getAlerter().setPeriodicMaxConcurrentJobs(maxConcurrentJobs);
        return properties;
    }
}
