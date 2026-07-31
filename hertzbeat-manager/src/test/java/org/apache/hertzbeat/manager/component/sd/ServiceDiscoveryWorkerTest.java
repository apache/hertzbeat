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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
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

    private Runnable captureTask(CommonDataQueue dataQueue) {
        ManagerWorkerPool workerPool = mock(ManagerWorkerPool.class);
        AtomicReference<Runnable> task = new AtomicReference<>();
        doAnswer(invocation -> {
            task.set(invocation.getArgument(0));
            return null;
        }).when(workerPool).executeLongRunning(org.mockito.ArgumentMatchers.any(Runnable.class));
        ServiceDiscoveryWorker worker = new ServiceDiscoveryWorker(
                mock(MonitorService.class),
                mock(ParamDao.class),
                mock(MonitorDao.class),
                mock(MonitorBindDao.class),
                mock(CollectorMonitorBindDao.class),
                dataQueue,
                workerPool);

        worker.afterPropertiesSet();
        return task.get();
    }
}
