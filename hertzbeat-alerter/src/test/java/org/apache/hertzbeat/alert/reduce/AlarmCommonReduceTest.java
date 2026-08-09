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

package org.apache.hertzbeat.alert.reduce;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.apache.hertzbeat.common.concurrent.ManagedExecutor;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * test case for {@link AlarmCommonReduce}
 */

@ExtendWith(MockitoExtension.class)
class AlarmCommonReduceTest {

    @Mock
    private AlarmGroupReduce alarmGroupReduce;

    private AlarmCommonReduce alarmCommonReduce;

    private SingleAlert testAlert;

    @BeforeEach
    void setUp() {
        testAlert = SingleAlert.builder().labels(new HashMap<>(Map.of("alertname", "test"))).build();
        alarmCommonReduce = new AlarmCommonReduce(alarmGroupReduce);
    }

    @AfterEach
    void tearDown() {
        if (alarmCommonReduce != null) {
            alarmCommonReduce.destroy();
        }
    }

    @Test
    void testReduceAndSendAlarm() {
        alarmCommonReduce.reduceAndSendAlarm(testAlert);
    }

    @Test
    void testReduceAndSendAlarmRunsOnVirtualThread() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);
        doAnswer(invocation -> {
            virtualThread.set(Thread.currentThread().isVirtual());
            latch.countDown();
            return null;
        }).when(alarmGroupReduce).processGroupAlert(any(SingleAlert.class));

        alarmCommonReduce.reduceAndSendAlarm(testAlert);

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void testReduceAndSendAlarmQueuesWhenConcurrencyLimitReached() throws Exception {
        VirtualThreadProperties properties = new VirtualThreadProperties(
                true,
                VirtualThreadProperties.PoolProperties.collectorDefaults(),
                VirtualThreadProperties.PoolProperties.commonDefaults(),
                VirtualThreadProperties.PoolProperties.managerDefaults(),
                new VirtualThreadProperties.AlerterProperties(
                        VirtualThreadProperties.PoolProperties.alerterNotifyDefaults(),
                        10,
                        VirtualThreadProperties.QueueProperties.logWorkerDefaults(),
                        new VirtualThreadProperties.QueueProperties(1, 0),
                        VirtualThreadProperties.QueueProperties.windowEvaluatorDefaults(),
                        4),
                VirtualThreadProperties.PoolProperties.warehouseDefaults(),
                VirtualThreadProperties.AsyncProperties.defaults());
        alarmCommonReduce.destroy();
        alarmCommonReduce = new AlarmCommonReduce(alarmGroupReduce, properties);

        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicInteger invocationOrder = new AtomicInteger();
        doAnswer(invocation -> {
            int order = invocationOrder.incrementAndGet();
            if (order == 1) {
                firstStarted.countDown();
                try {
                    releaseFirst.await(5, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            } else if (order == 2) {
                secondStarted.countDown();
            }
            return null;
        }).when(alarmGroupReduce).processGroupAlert(any(SingleAlert.class));

        alarmCommonReduce.reduceAndSendAlarm(SingleAlert.builder()
                .labels(new HashMap<>(Map.of("name", "first"))).build());
        assertTrue(firstStarted.await(5, TimeUnit.SECONDS));

        alarmCommonReduce.reduceAndSendAlarm(SingleAlert.builder()
                .labels(new HashMap<>(Map.of("name", "second"))).build());
        assertFalse(secondStarted.await(200, TimeUnit.MILLISECONDS));

        releaseFirst.countDown();
        assertTrue(secondStarted.await(5, TimeUnit.SECONDS));
    }

    @Test
    void pauseDefersNewReducersAndReplaysEachOnceAfterDrain() throws Exception {
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch resumedStarted = new CountDownLatch(1);
        AtomicInteger invocations = new AtomicInteger();
        doAnswer(invocation -> {
            int current = invocations.incrementAndGet();
            if (current == 1) {
                firstStarted.countDown();
                releaseFirst.await();
            } else {
                resumedStarted.countDown();
            }
            return null;
        }).when(alarmGroupReduce).processGroupAlert(any(SingleAlert.class));

        alarmCommonReduce.reduceAndSendAlarm(testAlert);
        assertTrue(firstStarted.await(5, TimeUnit.SECONDS));

        alarmCommonReduce.pauseAdmission();
        assertThrows(TimeoutException.class, () -> alarmCommonReduce.awaitDrained(0));
        alarmCommonReduce.reduceAndSendAlarm(testAlert);
        releaseFirst.countDown();
        alarmCommonReduce.awaitDrained(TimeUnit.SECONDS.toNanos(1));
        verify(alarmGroupReduce, times(1)).processGroupAlert(any(SingleAlert.class));

        alarmCommonReduce.resumeAdmission();
        assertTrue(resumedStarted.await(5, TimeUnit.SECONDS));
        verify(alarmGroupReduce, times(2)).processGroupAlert(any(SingleAlert.class));
    }

    @Test
    void pauseCannotLetDeferredWaiterOvertakeReservedSubmission() throws Exception {
        CountDownLatch permitReserved = new CountDownLatch(1);
        CountDownLatch releaseSubmission = new CountDownLatch(1);
        alarmCommonReduce.destroy();
        alarmCommonReduce = new TestAlarmCommonReduce(
                alarmGroupReduce, permitReserved, releaseSubmission);
        CountDownLatch firstRunning = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondRunning = new CountDownLatch(1);
        AtomicInteger invocations = new AtomicInteger();
        doAnswer(invocation -> {
            if (invocations.incrementAndGet() == 1) {
                firstRunning.countDown();
                releaseFirst.await();
            } else {
                secondRunning.countDown();
            }
            return null;
        }).when(alarmGroupReduce).processGroupAlert(any(SingleAlert.class));

        Thread admitted = Thread.ofPlatform().start(() -> alarmCommonReduce.reduceAndSendAlarm(testAlert));
        assertTrue(permitReserved.await(1, TimeUnit.SECONDS));
        Thread pause = Thread.ofPlatform().start(alarmCommonReduce::pauseAdmission);
        while (!alarmCommonReduce.hasQueuedMaintenanceThread(pause)) {
            Thread.onSpinWait();
        }
        Thread deferred = Thread.ofPlatform().start(() -> alarmCommonReduce.reduceAndSendAlarm(testAlert));
        releaseSubmission.countDown();
        admitted.join(1_000);
        pause.join(1_000);
        deferred.join(1_000);
        assertTrue(firstRunning.await(1, TimeUnit.SECONDS));

        assertThrows(TimeoutException.class, () -> alarmCommonReduce.awaitDrained(0));
        releaseFirst.countDown();
        alarmCommonReduce.awaitDrained(TimeUnit.SECONDS.toNanos(1));
        verify(alarmGroupReduce, times(1)).processGroupAlert(any(SingleAlert.class));

        alarmCommonReduce.resumeAdmission();
        assertTrue(secondRunning.await(1, TimeUnit.SECONDS));
        verify(alarmGroupReduce, times(2)).processGroupAlert(any(SingleAlert.class));
    }

    @Test
    void maintenanceDeferralNeverBlocksProducerAtWorkerQueueCapacity() throws Exception {
        ManagedExecutor executor = org.mockito.Mockito.mock(ManagedExecutor.class);
        org.mockito.Mockito.doAnswer(invocation -> {
            ((Runnable) invocation.getArgument(0)).run();
            return null;
        }).when(executor).execute(any(Runnable.class));
        alarmCommonReduce.destroy();
        alarmCommonReduce = new AlarmCommonReduce(alarmGroupReduce, executor);
        alarmCommonReduce.pauseAdmission();
        alarmCommonReduce.reduceAndSendAlarm(testAlert);
        CountDownLatch callerContinued = new CountDownLatch(1);
        Thread second = Thread.ofPlatform().start(() -> {
            alarmCommonReduce.reduceAndSendAlarm(testAlert);
            callerContinued.countDown();
        });
        assertTrue(callerContinued.await(1, TimeUnit.SECONDS));
        second.join(1_000);

        verify(executor, times(0)).execute(any(Runnable.class));
        assertEquals(2, alarmCommonReduce.deferredTaskCount());

        alarmCommonReduce.resumeAdmission();
        verify(alarmGroupReduce, times(2)).processGroupAlert(any(SingleAlert.class));
    }

    @Test
    void replayQueueRejectionRetainsEveryUnsubmittedDeferredTask() {
        ManagedExecutor executor = org.mockito.Mockito.mock(ManagedExecutor.class);
        AtomicInteger submissions = new AtomicInteger();
        org.mockito.Mockito.doAnswer(invocation -> {
            if (submissions.incrementAndGet() == 2) {
                throw new RejectedExecutionException();
            }
            ((Runnable) invocation.getArgument(0)).run();
            return null;
        }).when(executor).execute(any(Runnable.class));
        alarmCommonReduce.destroy();
        alarmCommonReduce = new AlarmCommonReduce(alarmGroupReduce, executor);
        alarmCommonReduce.pauseAdmission();
        alarmCommonReduce.reduceAndSendAlarm(testAlert);
        alarmCommonReduce.reduceAndSendAlarm(testAlert);

        assertThrows(RejectedExecutionException.class, alarmCommonReduce::resumeAdmission);
        assertEquals(1, alarmCommonReduce.deferredTaskCount());

        org.mockito.Mockito.doAnswer(invocation -> {
            ((Runnable) invocation.getArgument(0)).run();
            return null;
        }).when(executor).execute(any(Runnable.class));
        alarmCommonReduce.resumeAdmission();

        assertEquals(0, alarmCommonReduce.deferredTaskCount());
        verify(alarmGroupReduce, times(2)).processGroupAlert(any(SingleAlert.class));
    }

    @Test
    void rejectedReplayRemainsDeferredForOneRetry() {
        ManagedExecutor executor = org.mockito.Mockito.mock(ManagedExecutor.class);
        org.mockito.Mockito.doThrow(new RejectedExecutionException()).when(executor).execute(any(Runnable.class));
        alarmCommonReduce.destroy();
        alarmCommonReduce = new AlarmCommonReduce(alarmGroupReduce, executor);
        alarmCommonReduce.pauseAdmission();
        alarmCommonReduce.reduceAndSendAlarm(testAlert);

        assertThrows(RejectedExecutionException.class,
                alarmCommonReduce::resumeAdmission);
        assertEquals(1, alarmCommonReduce.deferredTaskCount());

        org.mockito.Mockito.doAnswer(invocation -> {
            ((Runnable) invocation.getArgument(0)).run();
            return null;
        }).when(executor).execute(any(Runnable.class));
        alarmCommonReduce.resumeAdmission();

        assertEquals(0, alarmCommonReduce.deferredTaskCount());
        verify(alarmGroupReduce, times(1)).processGroupAlert(any(SingleAlert.class));
    }

    private static final class TestAlarmCommonReduce extends AlarmCommonReduce {

        private final CountDownLatch permitReserved;
        private final CountDownLatch releaseSubmission;
        private final AtomicBoolean first = new AtomicBoolean(true);

        private TestAlarmCommonReduce(
                AlarmGroupReduce alarmGroupReduce,
                CountDownLatch permitReserved,
                CountDownLatch releaseSubmission) {
            super(alarmGroupReduce, singleWorkerProperties());
            this.permitReserved = permitReserved;
            this.releaseSubmission = releaseSubmission;
        }

        @Override
        void beforeAdmittedSubmission() {
            if (first.compareAndSet(true, false)) {
                permitReserved.countDown();
                try {
                    releaseSubmission.await();
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                }
            }
        }
    }

    private static VirtualThreadProperties singleWorkerProperties() {
        return singleWorkerProperties(1);
    }

    private static VirtualThreadProperties singleWorkerProperties(int queueCapacity) {
        return new VirtualThreadProperties(
                true,
                VirtualThreadProperties.PoolProperties.collectorDefaults(),
                VirtualThreadProperties.PoolProperties.commonDefaults(),
                VirtualThreadProperties.PoolProperties.managerDefaults(),
                new VirtualThreadProperties.AlerterProperties(
                        VirtualThreadProperties.PoolProperties.alerterNotifyDefaults(),
                        10,
                        VirtualThreadProperties.QueueProperties.logWorkerDefaults(),
                        new VirtualThreadProperties.QueueProperties(1, queueCapacity),
                        VirtualThreadProperties.QueueProperties.windowEvaluatorDefaults(),
                        4),
                VirtualThreadProperties.PoolProperties.warehouseDefaults(),
                VirtualThreadProperties.AsyncProperties.defaults());
    }

}
