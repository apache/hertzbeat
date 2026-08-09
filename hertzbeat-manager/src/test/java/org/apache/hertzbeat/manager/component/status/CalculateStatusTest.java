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

package org.apache.hertzbeat.manager.component.status;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verifyNoInteractions;

import java.time.Duration;
import java.util.Collections;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.apache.hertzbeat.manager.config.StatusProperties;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.StatusPageComponentDao;
import org.apache.hertzbeat.manager.dao.StatusPageHistoryDao;
import org.apache.hertzbeat.manager.dao.StatusPageOrgDao;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenancePhase;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link CalculateStatus}.
 */
@ExtendWith(MockitoExtension.class)
class CalculateStatusTest {

    @Mock
    private StatusPageOrgDao statusPageOrgDao;

    @Mock
    private StatusPageComponentDao statusPageComponentDao;

    @Mock
    private StatusPageHistoryDao statusPageHistoryDao;

    @Mock
    private MonitorDao monitorDao;

    private CalculateStatus calculateStatus;

    @BeforeEach
    void setUp() {
        calculateStatus = new CalculateStatus(statusPageOrgDao, statusPageComponentDao, statusProperties(),
                statusPageHistoryDao, monitorDao, new VirtualThreadProperties());
    }

    @Test
    void constructorIsPassive() {
        assertFalse(calculateStatus.isStarted());
        verifyNoInteractions(statusPageOrgDao, statusPageComponentDao, statusPageHistoryDao, monitorDao);
    }

    @Test
    void lifecycleIsIdempotent() {
        calculateStatus.start();
        calculateStatus.start();

        assertTrue(calculateStatus.isStarted());

        calculateStatus.destroy();
        calculateStatus.destroy();

        assertFalse(calculateStatus.isStarted());
        verifyNoInteractions(statusPageOrgDao, statusPageComponentDao, statusPageHistoryDao, monitorDao);
    }

    @Test
    void disabledVirtualThreadsStillReachStartedState() {
        calculateStatus.destroy();
        calculateStatus = new CalculateStatus(statusPageOrgDao, statusPageComponentDao, statusProperties(),
                statusPageHistoryDao, monitorDao,
                new VirtualThreadProperties(false, null, null, null, null, null, null));

        calculateStatus.start();

        assertTrue(calculateStatus.isStarted());
    }

    @Test
    void dispatchAfterDestroyIsSafeNoOp() {
        calculateStatus.start();
        calculateStatus.destroy();

        calculateStatus.dispatchCalculate();
        calculateStatus.dispatchCombineHistory();

        verifyNoInteractions(statusPageOrgDao, statusPageComponentDao, statusPageHistoryDao, monitorDao);
    }

    @AfterEach
    void tearDown() {
        if (calculateStatus != null) {
            calculateStatus.destroy();
        }
    }

    @Test
    void dispatchCalculateRunsOnVirtualThread() throws Exception {
        calculateStatus.start();
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);
        org.mockito.Mockito.doAnswer(invocation -> {
            virtualThread.set(Thread.currentThread().isVirtual());
            latch.countDown();
            return Collections.emptyList();
        }).when(statusPageOrgDao).findAll();

        calculateStatus.dispatchCalculate();

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void dispatchCombineHistoryRunsOnVirtualThread() throws Exception {
        calculateStatus.start();
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);
        org.mockito.Mockito.doAnswer(invocation -> {
            virtualThread.set(Thread.currentThread().isVirtual());
            latch.countDown();
            return Collections.emptyList();
        }).when(statusPageHistoryDao).findStatusPageHistoriesByTimestampBetween(anyLong(), anyLong());

        calculateStatus.dispatchCombineHistory();

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void dispatchCalculateDoesNotRunConcurrently() throws Exception {
        calculateStatus.start();
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicInteger concurrent = new AtomicInteger();
        AtomicInteger maxConcurrent = new AtomicInteger();
        AtomicInteger invocations = new AtomicInteger();
        org.mockito.Mockito.doAnswer(invocation -> {
            int running = concurrent.incrementAndGet();
            maxConcurrent.accumulateAndGet(running, Math::max);
            int currentInvocation = invocations.incrementAndGet();
            if (currentInvocation == 1) {
                firstStarted.countDown();
                releaseFirst.await(5, TimeUnit.SECONDS);
            } else if (currentInvocation == 2) {
                secondStarted.countDown();
            }
            concurrent.decrementAndGet();
            return Collections.emptyList();
        }).when(statusPageOrgDao).findAll();

        calculateStatus.dispatchCalculate();
        assertTrue(firstStarted.await(5, TimeUnit.SECONDS));

        calculateStatus.dispatchCalculate();
        assertFalse(secondStarted.await(200, TimeUnit.MILLISECONDS));

        releaseFirst.countDown();
        assertTrue(secondStarted.await(5, TimeUnit.SECONDS));
        assertEquals(1, maxConcurrent.get());
    }

    @Test
    void destroyWhileCalculateIsRunningDropsPendingDispatch() throws Exception {
        calculateStatus.start();
        CountDownLatch started = new CountDownLatch(1);
        CountDownLatch interrupted = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicInteger invocations = new AtomicInteger();
        org.mockito.Mockito.doAnswer(invocation -> {
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
            return Collections.emptyList();
        }).when(statusPageOrgDao).findAll();

        calculateStatus.dispatchCalculate();
        assertTrue(started.await(5, TimeUnit.SECONDS));
        calculateStatus.dispatchCalculate();

        calculateStatus.destroy();
        calculateStatus.dispatchCalculate();

        assertTrue(interrupted.await(5, TimeUnit.SECONDS));
        assertFalse(secondStarted.await(500, TimeUnit.MILLISECONDS));
        assertEquals(1, invocations.get());
    }

    @Test
    void quiesceAtomicallyDropsPendingRunAndWaitsForInFlightCompletion() throws Exception {
        calculateStatus.start();
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch quiesced = new CountDownLatch(1);
        AtomicInteger invocations = new AtomicInteger();
        org.mockito.Mockito.doAnswer(invocation -> {
            invocations.incrementAndGet();
            entered.countDown();
            release.await();
            return Collections.emptyList();
        }).when(statusPageOrgDao).findAll();

        calculateStatus.dispatchCalculate();
        assertThat(entered.await(1, TimeUnit.SECONDS)).isTrue();
        calculateStatus.dispatchCalculate();
        Thread controller = Thread.ofPlatform().unstarted(() -> {
            calculateStatus.quiesce(Duration.ofSeconds(5));
            quiesced.countDown();
        });
        controller.start();

        awaitPhase(MetadataMaintenancePhase.QUIESCING);
        assertThat(quiesced.getCount()).isOne();
        release.countDown();
        assertThat(quiesced.await(1, TimeUnit.SECONDS)).isTrue();
        assertThat(invocations).hasValue(1);

        calculateStatus.dispatchCalculate();
        assertThat(invocations).hasValue(1);
    }

    @Test
    void resumeCoalescesPausedCalculateDispatchesIntoOneRun() throws Exception {
        calculateStatus.start();
        calculateStatus.quiesce(Duration.ofSeconds(1));
        CountDownLatch invoked = new CountDownLatch(1);
        AtomicInteger invocations = new AtomicInteger();
        org.mockito.Mockito.doAnswer(invocation -> {
            invocations.incrementAndGet();
            invoked.countDown();
            return Collections.emptyList();
        }).when(statusPageOrgDao).findAll();

        calculateStatus.dispatchCalculate();
        calculateStatus.dispatchCalculate();
        calculateStatus.resume();
        calculateStatus.resume();

        assertThat(invoked.await(1, TimeUnit.SECONDS)).isTrue();
        assertThat(invocations).hasValue(1);
    }

    @Test
    void resumeCoalescesMissedDailyCombineIntoOneRun() throws Exception {
        calculateStatus.start();
        calculateStatus.quiesce(Duration.ofSeconds(1));
        CountDownLatch invoked = new CountDownLatch(1);
        AtomicInteger invocations = new AtomicInteger();
        org.mockito.Mockito.doAnswer(invocation -> {
            invocations.incrementAndGet();
            invoked.countDown();
            return Collections.emptyList();
        }).when(statusPageHistoryDao).findStatusPageHistoriesByTimestampBetween(anyLong(), anyLong());

        calculateStatus.dispatchCombineHistory();
        calculateStatus.dispatchCombineHistory();
        calculateStatus.resume();
        calculateStatus.resume();

        assertThat(invoked.await(1, TimeUnit.SECONDS)).isTrue();
        assertThat(invocations).hasValue(1);
    }

    @Test
    void runningDailyCombinePreservesOnePendingDueRunAcrossMaintenance() throws Exception {
        calculateStatus.start();
        CountDownLatch firstEntered = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondEntered = new CountDownLatch(1);
        AtomicInteger invocations = new AtomicInteger();
        org.mockito.Mockito.doAnswer(invocation -> {
            int invocationNumber = invocations.incrementAndGet();
            if (invocationNumber == 1) {
                firstEntered.countDown();
                releaseFirst.await();
            } else {
                secondEntered.countDown();
            }
            return Collections.emptyList();
        }).when(statusPageHistoryDao).findStatusPageHistoriesByTimestampBetween(anyLong(), anyLong());

        calculateStatus.dispatchCombineHistory();
        assertThat(firstEntered.await(1, TimeUnit.SECONDS)).isTrue();
        calculateStatus.dispatchCombineHistory();
        CountDownLatch quiesced = new CountDownLatch(1);
        Thread controller = Thread.ofPlatform().unstarted(() -> {
            calculateStatus.quiesce(Duration.ofSeconds(5));
            quiesced.countDown();
        });
        controller.start();
        awaitPhase(MetadataMaintenancePhase.QUIESCING);
        assertThat(quiesced.getCount()).isOne();

        releaseFirst.countDown();
        assertThat(quiesced.await(1, TimeUnit.SECONDS)).isTrue();
        assertThat(invocations).hasValue(1);
        calculateStatus.resume();

        assertThat(secondEntered.await(1, TimeUnit.SECONDS)).isTrue();
        assertThat(invocations).hasValue(2);
    }

    @Test
    void quiesceCanBeRepeatedWithoutDestroyingSchedulers() {
        calculateStatus.start();

        calculateStatus.quiesce(Duration.ofSeconds(1));
        calculateStatus.quiesce(Duration.ofSeconds(1));
        calculateStatus.resume();
        calculateStatus.resume();

        assertThat(calculateStatus.isStarted()).isTrue();
        verifyNoInteractions(statusPageOrgDao, statusPageComponentDao, statusPageHistoryDao, monitorDao);
    }

    private void awaitPhase(MetadataMaintenancePhase expected) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(1);
        while (calculateStatus.maintenancePhase() != expected && System.nanoTime() < deadline) {
            Thread.onSpinWait();
        }
        assertThat(calculateStatus.maintenancePhase()).isEqualTo(expected);
    }

    private StatusProperties statusProperties() {
        StatusProperties statusProperties = new StatusProperties();
        StatusProperties.CalculateProperties calculateProperties = new StatusProperties.CalculateProperties();
        calculateProperties.setInterval(300);
        statusProperties.setCalculate(calculateProperties);
        return statusProperties;
    }
}
