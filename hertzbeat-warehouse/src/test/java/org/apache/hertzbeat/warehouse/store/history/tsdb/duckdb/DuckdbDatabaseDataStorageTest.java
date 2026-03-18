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

package org.apache.hertzbeat.warehouse.store.history.tsdb.duckdb;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * Test case for {@link DuckdbDatabaseDataStorage}.
 */
class DuckdbDatabaseDataStorageTest {

    private TestDuckdbDatabaseDataStorage dataStorage;

    @TempDir
    Path tempDir;

    @AfterEach
    void tearDown() throws Exception {
        if (dataStorage != null) {
            dataStorage.destroy();
        }
    }

    @Test
    void dispatchExpiredDataCleanerRunsOnVirtualThread() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);
        dataStorage = new TestDuckdbDatabaseDataStorage(properties(), latch, virtualThread,
                null, null, null, null, null, null);

        dataStorage.dispatchExpiredDataCleaner();

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void dispatchExpiredDataCleanerDoesNotRunConcurrently() throws Exception {
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicInteger concurrent = new AtomicInteger();
        AtomicInteger maxConcurrent = new AtomicInteger();
        AtomicInteger invocations = new AtomicInteger();
        dataStorage = new TestDuckdbDatabaseDataStorage(properties(), null, null,
                firstStarted, releaseFirst, secondStarted, concurrent, maxConcurrent, invocations);

        dataStorage.dispatchExpiredDataCleaner();
        assertTrue(firstStarted.await(5, TimeUnit.SECONDS));

        dataStorage.dispatchExpiredDataCleaner();
        assertFalse(secondStarted.await(200, TimeUnit.MILLISECONDS));

        releaseFirst.countDown();
        assertTrue(secondStarted.await(5, TimeUnit.SECONDS));
        assertEquals(1, maxConcurrent.get());
    }

    private DuckdbProperties properties() {
        return new DuckdbProperties(true, "1d", tempDir.resolve("history.duckdb").toString());
    }

    private static final class TestDuckdbDatabaseDataStorage extends DuckdbDatabaseDataStorage {

        private final CountDownLatch virtualThreadLatch;
        private final AtomicBoolean virtualThread;
        private final CountDownLatch firstStarted;
        private final CountDownLatch releaseFirst;
        private final CountDownLatch secondStarted;
        private final AtomicInteger concurrent;
        private final AtomicInteger maxConcurrent;
        private final AtomicInteger invocations;

        private TestDuckdbDatabaseDataStorage(DuckdbProperties duckdbProperties,
                                              CountDownLatch virtualThreadLatch,
                                              AtomicBoolean virtualThread,
                                              CountDownLatch firstStarted,
                                              CountDownLatch releaseFirst,
                                              CountDownLatch secondStarted,
                                              AtomicInteger concurrent,
                                              AtomicInteger maxConcurrent,
                                              AtomicInteger invocations) {
            super(duckdbProperties, new VirtualThreadProperties(), false);
            this.virtualThreadLatch = virtualThreadLatch;
            this.virtualThread = virtualThread;
            this.firstStarted = firstStarted;
            this.releaseFirst = releaseFirst;
            this.secondStarted = secondStarted;
            this.concurrent = concurrent;
            this.maxConcurrent = maxConcurrent;
            this.invocations = invocations;
        }

        @Override
        void beforeExpiredDataCleanerRun() {
            if (virtualThreadLatch != null && virtualThread != null) {
                virtualThread.set(Thread.currentThread().isVirtual());
                virtualThreadLatch.countDown();
            }
            if (firstStarted == null || releaseFirst == null || secondStarted == null
                    || concurrent == null || maxConcurrent == null || invocations == null) {
                return;
            }
            int running = concurrent.incrementAndGet();
            maxConcurrent.accumulateAndGet(running, Math::max);
            int currentInvocation = invocations.incrementAndGet();
            try {
                if (currentInvocation == 1) {
                    firstStarted.countDown();
                    releaseFirst.await(5, TimeUnit.SECONDS);
                } else if (currentInvocation == 2) {
                    secondStarted.countDown();
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                concurrent.decrementAndGet();
            }
        }
    }
}
