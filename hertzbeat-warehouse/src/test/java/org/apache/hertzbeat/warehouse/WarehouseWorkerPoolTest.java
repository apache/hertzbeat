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

package org.apache.hertzbeat.warehouse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicBoolean;
import org.apache.hertzbeat.common.concurrent.AdmissionMode;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link WarehouseWorkerPool}
 */
class WarehouseWorkerPoolTest {

    private static final int NUMBER_OF_THREADS = 10;
    private WarehouseWorkerPool pool;

    @AfterEach
    void tearDown() throws Exception {
        if (pool != null) {
            pool.destroy();
        }
    }

    @Test
    void executeJob() throws InterruptedException {
        pool = new WarehouseWorkerPool();
        AtomicInteger counter = new AtomicInteger();
        CountDownLatch latch = new CountDownLatch(NUMBER_OF_THREADS);
        for (int i = 0; i < NUMBER_OF_THREADS; i++) {
            pool.executeJob(() -> {
                counter.incrementAndGet();
                latch.countDown();
            });
        }
        latch.await();

        assertEquals(NUMBER_OF_THREADS, counter.get());
    }

    @Test
    void executeJobRunsOnVirtualThread() throws InterruptedException {
        pool = new WarehouseWorkerPool();
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);

        pool.executeJob(() -> {
            virtualThread.set(Thread.currentThread().isVirtual());
            latch.countDown();
        });

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void executeJobRejectsWhenConcurrencyLimitReached() throws InterruptedException {
        VirtualThreadProperties properties = new VirtualThreadProperties();
        VirtualThreadProperties.PoolProperties warehouseProperties = new VirtualThreadProperties.PoolProperties();
        warehouseProperties.setMode(AdmissionMode.LIMIT_AND_REJECT);
        warehouseProperties.setMaxConcurrentJobs(1);
        properties.setWarehouse(warehouseProperties);
        pool = new WarehouseWorkerPool(properties);

        CountDownLatch started = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        pool.executeJob(() -> {
            started.countDown();
            try {
                release.await(5, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        assertTrue(started.await(5, TimeUnit.SECONDS));

        try {
            assertThrows(RejectedExecutionException.class, () -> pool.executeJob(() -> {
            }));
        } finally {
            release.countDown();
        }
    }
}
