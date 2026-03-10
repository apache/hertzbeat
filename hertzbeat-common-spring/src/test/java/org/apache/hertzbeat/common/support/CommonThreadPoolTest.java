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

package org.apache.hertzbeat.common.support;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.apache.hertzbeat.common.concurrent.AdmissionMode;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * Test for {@link CommonThreadPool}.
 */
class CommonThreadPoolTest {

    private CommonThreadPool commonThreadPool;

    @AfterEach
    void tearDown() throws Exception {
        if (commonThreadPool != null) {
            commonThreadPool.destroy();
        }
    }

    @Test
    void testExecuteRunsOnVirtualThread() throws Exception {
        commonThreadPool = new CommonThreadPool();
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);

        commonThreadPool.execute(() -> {
            virtualThread.set(Thread.currentThread().isVirtual());
            latch.countDown();
        });

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void testExecuteLongRunningRunsOnPlatformThread() throws Exception {
        commonThreadPool = new CommonThreadPool();
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(true);

        commonThreadPool.executeLongRunning(() -> {
            virtualThread.set(Thread.currentThread().isVirtual());
            latch.countDown();
        });

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertFalse(virtualThread.get());
    }

    @Test
    void testExecuteRejectsWhenConcurrencyLimitReached() throws Exception {
        VirtualThreadProperties properties = new VirtualThreadProperties();
        VirtualThreadProperties.PoolProperties commonProperties = new VirtualThreadProperties.PoolProperties();
        commonProperties.setMode(AdmissionMode.LIMIT_AND_REJECT);
        commonProperties.setMaxConcurrentJobs(1);
        properties.setCommon(commonProperties);
        commonThreadPool = new CommonThreadPool(properties);

        CountDownLatch started = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        commonThreadPool.execute(() -> {
            started.countDown();
            try {
                release.await(5, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        assertTrue(started.await(5, TimeUnit.SECONDS));

        try {
            assertThrows(RejectedExecutionException.class, () -> commonThreadPool.execute(() -> {
            }));
        } finally {
            release.countDown();
        }
    }
}
