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

package org.apache.hertzbeat.collector.dispatch;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.apache.hertzbeat.common.concurrent.AdmissionMode;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link WorkerPool}
 */
class WorkerPoolTest {

    private WorkerPool workerPool;

    @AfterEach
    void tearDown() throws Exception {
        if (workerPool != null) {
            workerPool.destroy();
        }
    }

    @Test
    void testExecuteJobRunsOnVirtualThread() throws Exception {
        workerPool = new WorkerPool();
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);

        workerPool.executeJob(() -> {
            virtualThread.set(Thread.currentThread().isVirtual());
            latch.countDown();
        });

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void testExecuteJobRejectsWhenConcurrencyLimitReached() throws Exception {
        VirtualThreadProperties properties = new VirtualThreadProperties();
        VirtualThreadProperties.PoolProperties collectorProperties = new VirtualThreadProperties.PoolProperties();
        collectorProperties.setMode(AdmissionMode.LIMIT_AND_REJECT);
        collectorProperties.setMaxConcurrentJobs(1);
        properties.setCollector(collectorProperties);
        workerPool = new WorkerPool(properties);

        CountDownLatch started = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        workerPool.executeJob(() -> {
            started.countDown();
            try {
                release.await(5, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        assertTrue(started.await(5, TimeUnit.SECONDS));

        try {
            assertThrows(RejectedExecutionException.class, () -> workerPool.executeJob(() -> {
            }));
        } finally {
            release.countDown();
        }
    }
}
