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

package org.apache.hertzbeat.startup;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.junit.jupiter.api.Test;
import org.springframework.core.task.SimpleAsyncTaskExecutor;
import org.springframework.core.task.TaskRejectedException;

/**
 * Tests for {@link AsyncConfig}.
 */
class AsyncConfigTest {

    private final AsyncConfig asyncConfig = new AsyncConfig();

    @Test
    void taskExecutorRunsAsyncTasksOnVirtualThreads() throws Exception {
        VirtualThreadProperties properties = new VirtualThreadProperties();
        try (SimpleAsyncTaskExecutor executor = asyncConfig.taskExecutor(properties)) {
            CountDownLatch latch = new CountDownLatch(1);
            AtomicBoolean virtualThread = new AtomicBoolean(false);

            executor.execute(() -> {
                virtualThread.set(Thread.currentThread().isVirtual());
                latch.countDown();
            });

            assertTrue(latch.await(5, TimeUnit.SECONDS));
            assertTrue(virtualThread.get());
        }
    }

    @Test
    void taskExecutorRejectsWhenConcurrencyLimitReached() throws Exception {
        VirtualThreadProperties properties = new VirtualThreadProperties(
                true,
                VirtualThreadProperties.PoolProperties.collectorDefaults(),
                VirtualThreadProperties.PoolProperties.commonDefaults(),
                VirtualThreadProperties.PoolProperties.managerDefaults(),
                VirtualThreadProperties.AlerterProperties.defaults(),
                VirtualThreadProperties.PoolProperties.warehouseDefaults(),
                new VirtualThreadProperties.AsyncProperties(true, 1, true, 5000L));

        try (SimpleAsyncTaskExecutor executor = asyncConfig.taskExecutor(properties)) {
            CountDownLatch started = new CountDownLatch(1);
            CountDownLatch release = new CountDownLatch(1);

            executor.execute(() -> {
                started.countDown();
                try {
                    release.await(5, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
            assertTrue(started.await(5, TimeUnit.SECONDS));

            try {
                assertThrows(TaskRejectedException.class, () -> executor.execute(() -> {
                }));
            } finally {
                release.countDown();
            }
        }
    }
}
