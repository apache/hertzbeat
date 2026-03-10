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

package org.apache.hertzbeat.alert;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.common.concurrent.AdmissionMode;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link AlerterWorkerPool}
 */
class AlerterWorkerPoolTest {

    private static final int NUMBER_OF_TASKS = 10;

    private AlerterWorkerPool pool;

    @AfterEach
    void tearDown() {
        if (pool != null) {
            pool.destroy();
        }
    }

    @Test
    void executeJob() throws InterruptedException {
        pool = new AlerterWorkerPool();
        AtomicInteger counter = new AtomicInteger();
        CountDownLatch latch = new CountDownLatch(NUMBER_OF_TASKS);

        for (int i = 0; i < NUMBER_OF_TASKS; i++) {
            pool.executeJob(() -> {
                counter.incrementAndGet();
                latch.countDown();
            });
        }

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertEquals(NUMBER_OF_TASKS, counter.get());
    }

    @Test
    void executeNotifyRunsOnVirtualThread() throws Exception {
        pool = new AlerterWorkerPool();
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);

        pool.executeNotify((byte) 1, () -> {
            virtualThread.set(Thread.currentThread().isVirtual());
            latch.countDown();
        });

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void executeNotifyRejectsWhenGlobalConcurrencyLimitReached() throws Exception {
        VirtualThreadProperties properties = new VirtualThreadProperties();
        VirtualThreadProperties.AlerterProperties alerterProperties = new VirtualThreadProperties.AlerterProperties();
        VirtualThreadProperties.PoolProperties notifyProperties = new VirtualThreadProperties.PoolProperties();
        notifyProperties.setMode(AdmissionMode.LIMIT_AND_REJECT);
        notifyProperties.setMaxConcurrentJobs(1);
        alerterProperties.setNotify(notifyProperties);
        alerterProperties.setNotifyMaxConcurrentPerChannel(8);
        properties.setAlerter(alerterProperties);
        pool = new AlerterWorkerPool(properties);

        CountDownLatch started = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        pool.executeNotify((byte) 1, () -> {
            started.countDown();
            try {
                release.await(5, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        assertTrue(started.await(5, TimeUnit.SECONDS));

        try {
            assertThrows(RejectedExecutionException.class, () -> pool.executeNotify((byte) 2, () -> {
            }));
        } finally {
            release.countDown();
        }
    }

    @Test
    void executeNotifyRejectsWhenChannelLimitReached() throws Exception {
        VirtualThreadProperties properties = new VirtualThreadProperties();
        VirtualThreadProperties.AlerterProperties alerterProperties = new VirtualThreadProperties.AlerterProperties();
        VirtualThreadProperties.PoolProperties notifyProperties = new VirtualThreadProperties.PoolProperties();
        notifyProperties.setMode(AdmissionMode.LIMIT_AND_REJECT);
        notifyProperties.setMaxConcurrentJobs(8);
        alerterProperties.setNotify(notifyProperties);
        alerterProperties.setNotifyMaxConcurrentPerChannel(1);
        properties.setAlerter(alerterProperties);
        pool = new AlerterWorkerPool(properties);

        CountDownLatch started = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        pool.executeNotify((byte) 1, () -> {
            started.countDown();
            try {
                release.await(5, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        assertTrue(started.await(5, TimeUnit.SECONDS));

        try {
            assertThrows(RejectedExecutionException.class, () -> pool.executeNotify((byte) 1, () -> {
            }));
        } finally {
            release.countDown();
        }
    }

    @Test
    void executeLogJob() throws InterruptedException {
        pool = new AlerterWorkerPool();
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);

        pool.executeLogJob(() -> {
            virtualThread.set(Thread.currentThread().isVirtual());
            latch.countDown();
        });
        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void executeLogJobRejectsWhenQueueCapacityReached() throws InterruptedException {
        VirtualThreadProperties properties = new VirtualThreadProperties();
        VirtualThreadProperties.AlerterProperties alerterProperties = new VirtualThreadProperties.AlerterProperties();
        VirtualThreadProperties.QueueProperties logWorkerProperties = new VirtualThreadProperties.QueueProperties();
        logWorkerProperties.setMaxConcurrentJobs(1);
        logWorkerProperties.setQueueCapacity(1);
        alerterProperties.setLogWorker(logWorkerProperties);
        properties.setAlerter(alerterProperties);
        pool = new AlerterWorkerPool(properties);

        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        pool.executeLogJob(() -> {
            firstStarted.countDown();
            try {
                releaseFirst.await(5, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        assertTrue(firstStarted.await(5, TimeUnit.SECONDS));

        pool.executeLogJob(secondStarted::countDown);
        assertFalse(secondStarted.await(200, TimeUnit.MILLISECONDS));
        try {
            assertThrows(RejectedExecutionException.class, () -> pool.executeLogJob(() -> {
            }));
        } finally {
            releaseFirst.countDown();
        }
        assertTrue(secondStarted.await(5, TimeUnit.SECONDS));
    }
}
