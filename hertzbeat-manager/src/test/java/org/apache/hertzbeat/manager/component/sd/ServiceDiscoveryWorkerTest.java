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

package org.apache.hertzbeat.manager.component.sd;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenanceErrorCode;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenanceException;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenancePhase;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.apache.hertzbeat.manager.scheduler.ManagerWorkerPool;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class ServiceDiscoveryWorkerTest {

    @Test
    void expectedPollInterruptionRestoresStatusAndStopsWithoutErrorDetail() throws Exception {
        CommonDataQueue dataQueue = mock(CommonDataQueue.class);
        when(dataQueue.pollServiceDiscoveryData())
                .thenThrow(new InterruptedException("private-interrupt-detail"))
                .thenAnswer(invocation -> {
                    Thread.currentThread().interrupt();
                    return null;
                });
        Runnable task = captureTask(dataQueue);
        Logger logger = (Logger) LoggerFactory.getLogger(ServiceDiscoveryWorker.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);

        Thread worker = Thread.ofPlatform().unstarted(task);
        try {
            worker.start();
            worker.join(1_000);

            assertFalse(worker.isAlive());
            assertTrue(worker.isInterrupted());
            verify(dataQueue, times(1)).pollServiceDiscoveryData();
            assertTrue(appender.list.stream().noneMatch(event ->
                    event.getLevel() == Level.ERROR
                            || event.getFormattedMessage().contains("private-interrupt-detail")));
            assertTrue(appender.list.stream().allMatch(event -> event.getThrowableProxy() == null));
        } finally {
            if (worker.isAlive()) {
                worker.interrupt();
                worker.join(1_000);
            }
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    @Test
    void unexpectedPollFailureRemainsLoggedAndWorkerContinues() throws Exception {
        CommonDataQueue dataQueue = mock(CommonDataQueue.class);
        when(dataQueue.pollServiceDiscoveryData())
                .thenThrow(new IllegalStateException("queue failure"))
                .thenAnswer(invocation -> {
                    Thread.currentThread().interrupt();
                    return null;
                });
        Runnable task = captureTask(dataQueue);
        Logger logger = (Logger) LoggerFactory.getLogger(ServiceDiscoveryWorker.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);

        Thread worker = Thread.ofPlatform().unstarted(task);
        try {
            worker.start();
            worker.join(1_000);

            assertFalse(worker.isAlive());
            verify(dataQueue, times(2)).pollServiceDiscoveryData();
            assertTrue(appender.list.stream().anyMatch(event ->
                    event.getLevel() == Level.ERROR
                            && event.getFormattedMessage().contains("queue failure")
                            && event.getThrowableProxy() != null));
        } finally {
            if (worker.isAlive()) {
                worker.interrupt();
                worker.join(1_000);
            }
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    @Test
    void quiesceWakesBlockedPollAndResumeKeepsOneConsumerLoop() throws Exception {
        CommonDataQueue dataQueue = mock(CommonDataQueue.class);
        CountDownLatch firstPoll = new CountDownLatch(1);
        CollectRep.MetricsData resumedData = mock(CollectRep.MetricsData.class);
        when(resumedData.getId()).thenReturn(42L);
        when(dataQueue.pollServiceDiscoveryData())
                .thenAnswer(invocation -> {
                    firstPoll.countDown();
                    new CountDownLatch(1).await();
                    return null;
                })
                .thenReturn(resumedData)
                .thenAnswer(invocation -> {
                    new CountDownLatch(1).await();
                    return null;
                });
        MonitorDao monitorDao = mock(MonitorDao.class);
        CountDownLatch consumedAfterResume = new CountDownLatch(1);
        when(monitorDao.findById(42L)).thenAnswer(invocation -> {
            consumedAfterResume.countDown();
            return Optional.empty();
        });
        WorkerHarness harness = captureHarness(dataQueue, monitorDao);
        Thread consumer = Thread.ofPlatform().unstarted(harness.task());
        consumer.start();
        assertThat(firstPoll.await(1, TimeUnit.SECONDS)).isTrue();

        harness.worker().quiesce(Duration.ofSeconds(1));

        verify(dataQueue, times(1)).pollServiceDiscoveryData();
        assertThat(consumer.isAlive()).isTrue();
        verify(harness.workerPool(), times(1)).executeLongRunning(any(Runnable.class));
        harness.worker().resume();
        assertThat(consumedAfterResume.await(1, TimeUnit.SECONDS)).isTrue();
        consumer.interrupt();
        consumer.join(1_000);
        assertThat(consumer.isAlive()).isFalse();
        verify(harness.workerPool(), times(1)).executeLongRunning(any(Runnable.class));
    }

    @Test
    void quiesceWaitsForEnteredMessageAndStartsNoNewWork() throws Exception {
        CommonDataQueue dataQueue = mock(CommonDataQueue.class);
        CollectRep.MetricsData data = mock(CollectRep.MetricsData.class);
        when(data.getId()).thenReturn(42L);
        when(dataQueue.pollServiceDiscoveryData()).thenReturn(data).thenAnswer(invocation -> {
            new CountDownLatch(1).await();
            return null;
        });
        MonitorDao monitorDao = mock(MonitorDao.class);
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(monitorDao.findById(42L)).thenAnswer(invocation -> {
            entered.countDown();
            release.await();
            return Optional.empty();
        });
        WorkerHarness harness = captureHarness(dataQueue, monitorDao);
        Thread consumer = Thread.ofPlatform().unstarted(harness.task());
        consumer.start();
        assertThat(entered.await(1, TimeUnit.SECONDS)).isTrue();
        CountDownLatch quiesced = new CountDownLatch(1);
        AtomicReference<Throwable> failure = new AtomicReference<>();
        Thread controller = Thread.ofPlatform().unstarted(() -> {
            try {
                harness.worker().quiesce(Duration.ofSeconds(5));
            } catch (Throwable throwable) {
                failure.set(throwable);
            } finally {
                quiesced.countDown();
            }
        });
        controller.start();

        awaitPhase(harness.worker(), MetadataMaintenancePhase.QUIESCING);
        assertThat(quiesced.getCount()).isOne();
        release.countDown();
        assertThat(quiesced.await(1, TimeUnit.SECONDS)).isTrue();
        assertThat(failure.get()).isNull();
        verify(dataQueue, times(1)).pollServiceDiscoveryData();
        verify(data, times(1)).close();

        harness.worker().resume();
        consumer.interrupt();
        consumer.join(1_000);
        assertThat(consumer.isAlive()).isFalse();
    }

    @Test
    void zeroTimeoutRestoresConsumptionAfterSafeFailure() throws Exception {
        CommonDataQueue dataQueue = mock(CommonDataQueue.class);
        CollectRep.MetricsData firstData = mock(CollectRep.MetricsData.class);
        CollectRep.MetricsData secondData = mock(CollectRep.MetricsData.class);
        when(firstData.getId()).thenReturn(42L);
        when(secondData.getId()).thenReturn(43L);
        when(dataQueue.pollServiceDiscoveryData()).thenReturn(firstData, secondData).thenAnswer(invocation -> {
            new CountDownLatch(1).await();
            return null;
        });
        MonitorDao monitorDao = mock(MonitorDao.class);
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch consumedAfterTimeout = new CountDownLatch(1);
        when(monitorDao.findById(42L)).thenAnswer(invocation -> {
            entered.countDown();
            release.await();
            return Optional.empty();
        });
        when(monitorDao.findById(43L)).thenAnswer(invocation -> {
            consumedAfterTimeout.countDown();
            return Optional.empty();
        });
        WorkerHarness harness = captureHarness(dataQueue, monitorDao);
        Thread consumer = Thread.ofPlatform().unstarted(harness.task());
        consumer.start();
        assertThat(entered.await(1, TimeUnit.SECONDS)).isTrue();

        assertThatThrownBy(() -> harness.worker().quiesce(Duration.ZERO))
                .isInstanceOfSatisfying(MetadataMaintenanceException.class, exception ->
                        assertThat(exception.code()).isEqualTo(MetadataMaintenanceErrorCode.QUIESCE_TIMEOUT));

        release.countDown();
        assertThat(consumedAfterTimeout.await(1, TimeUnit.SECONDS)).isTrue();
        verify(dataQueue, atLeast(2)).pollServiceDiscoveryData();
        consumer.interrupt();
        consumer.join(1_000);
        assertThat(consumer.isAlive()).isFalse();
    }

    @Test
    void terminalDestroyStopsQuiescedLoopAndResumeCannotReviveIt() throws Exception {
        CommonDataQueue dataQueue = mock(CommonDataQueue.class);
        CountDownLatch pollEntered = new CountDownLatch(1);
        when(dataQueue.pollServiceDiscoveryData()).thenAnswer(invocation -> {
            pollEntered.countDown();
            new CountDownLatch(1).await();
            return null;
        });
        WorkerHarness harness = captureHarness(dataQueue, mock(MonitorDao.class));
        Thread consumer = Thread.ofPlatform().unstarted(harness.task());
        consumer.start();
        assertThat(pollEntered.await(1, TimeUnit.SECONDS)).isTrue();
        harness.worker().quiesce(Duration.ofSeconds(1));
        assertThat(consumer.isAlive()).isTrue();

        harness.worker().destroy();
        harness.worker().destroy();
        consumer.join(1_000);
        assertThat(consumer.isAlive()).isFalse();

        harness.worker().resume();
        harness.worker().resume();
        verify(dataQueue, times(1)).pollServiceDiscoveryData();
        verify(harness.workerPool(), times(1)).executeLongRunning(any(Runnable.class));
    }

    private Runnable captureTask(CommonDataQueue dataQueue) {
        return captureHarness(dataQueue, mock(MonitorDao.class)).task();
    }

    private WorkerHarness captureHarness(CommonDataQueue dataQueue, MonitorDao monitorDao) {
        ManagerWorkerPool workerPool = mock(ManagerWorkerPool.class);
        AtomicReference<Runnable> task = new AtomicReference<>();
        doAnswer(invocation -> {
            task.set(invocation.getArgument(0));
            return null;
        }).when(workerPool).executeLongRunning(org.mockito.ArgumentMatchers.any(Runnable.class));
        ServiceDiscoveryWorker worker = new ServiceDiscoveryWorker(
                mock(MonitorService.class),
                mock(ParamDao.class),
                monitorDao,
                mock(MonitorBindDao.class),
                mock(CollectorMonitorBindDao.class),
                dataQueue,
                workerPool);

        worker.afterPropertiesSet();
        return new WorkerHarness(worker, task.get(), workerPool);
    }

    private void awaitPhase(ServiceDiscoveryWorker worker, MetadataMaintenancePhase expected) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(1);
        while (worker.maintenancePhase() != expected && System.nanoTime() < deadline) {
            Thread.onSpinWait();
        }
        assertThat(worker.maintenancePhase()).isEqualTo(expected);
    }

    private record WorkerHarness(
            ServiceDiscoveryWorker worker, Runnable task, ManagerWorkerPool workerPool) {
    }
}
