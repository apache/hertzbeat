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

package org.apache.hertzbeat.collector.collect.common.cache;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Tests for {@link GlobalConnectionCache}.
 */
class GlobalConnectionCacheTest {

    private TestGlobalConnectionCache globalConnectionCache;

    @BeforeEach
    void setUp() {
        globalConnectionCache = new TestGlobalConnectionCache();
    }

    @AfterEach
    void tearDown() {
        if (globalConnectionCache != null) {
            globalConnectionCache.destroy();
        }
    }

    @Test
    void dispatchCleanupCacheRunsOnVirtualThread() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);
        globalConnectionCache.setVirtualThreadHook(latch, virtualThread);

        globalConnectionCache.dispatchCleanupCache();

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void dispatchCleanupCacheDoesNotRunConcurrently() throws Exception {
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicInteger maxConcurrent = new AtomicInteger();
        globalConnectionCache.setConcurrencyHook(firstStarted, releaseFirst, secondStarted, maxConcurrent);

        globalConnectionCache.dispatchCleanupCache();
        assertTrue(firstStarted.await(5, TimeUnit.SECONDS));

        globalConnectionCache.dispatchCleanupCache();
        assertFalse(secondStarted.await(200, TimeUnit.MILLISECONDS));

        releaseFirst.countDown();
        assertTrue(secondStarted.await(5, TimeUnit.SECONDS));
        assertEquals(1, maxConcurrent.get());
    }

    @Test
    void dispatchCleanupCacheClosesExpiredConnections() throws Exception {
        TestConnection connection = new TestConnection();
        globalConnectionCache.addCache("expired", connection, -1L);

        globalConnectionCache.dispatchCleanupCache();

        assertTrue(connection.closed.await(5, TimeUnit.SECONDS));
        assertEquals(1, connection.closeCount.get());
        assertTrue(globalConnectionCache.getCache("expired", false).isEmpty());
    }

    @Test
    void conditionalRemoveDoesNotCloseReplacement() {
        TestConnection old = new TestConnection();
        TestConnection replacement = new TestConnection();
        globalConnectionCache.addCache("key", old);
        globalConnectionCache.addCache("key", replacement);

        assertFalse(globalConnectionCache.removeCache("key", old));
        assertEquals(1, old.closeCount.get());
        assertSame(replacement, globalConnectionCache.getCache("key", false).orElseThrow());
        assertEquals(0, replacement.closeCount.get());
        assertTrue(globalConnectionCache.removeCache("key", replacement));
        assertEquals(1, replacement.closeCount.get());
        assertTrue(globalConnectionCache.getCache("key", false).isEmpty());
    }

    @Test
    void conditionalRemoveUsesIdentityEvenWhenConnectionsCompareEqual() {
        EqualConnection cached = new EqualConnection();
        EqualConnection other = new EqualConnection();
        globalConnectionCache.addCache("equal", cached);

        assertTrue(cached.equals(other));
        assertFalse(globalConnectionCache.removeCache("equal", other));
        assertSame(cached, globalConnectionCache.getCache("equal", false).orElseThrow());
        assertEquals(0, cached.closeCount.get());
        assertEquals(0, other.closeCount.get());
        assertTrue(globalConnectionCache.removeCache("equal", cached));
        assertEquals(1, cached.closeCount.get());
        assertEquals(0, other.closeCount.get());
    }

    @Test
    void staleConditionalRemoveDoesNotRemoveConcurrentEqualReplacement() throws Exception {
        EqualConnection old = new EqualConnection();
        EqualConnection replacement = new EqualConnection();
        globalConnectionCache.addCache("race", old);
        CountDownLatch replacementAdded = new CountDownLatch(1);
        var executor = Executors.newSingleThreadExecutor();
        try {
            var staleRemoval = executor.submit(() -> {
                assertTrue(replacementAdded.await(5, TimeUnit.SECONDS));
                return globalConnectionCache.removeCache("race", old);
            });
            globalConnectionCache.addCache("race", replacement);
            replacementAdded.countDown();
            assertFalse(staleRemoval.get(5, TimeUnit.SECONDS));
            assertSame(replacement, globalConnectionCache.getCache("race", false).orElseThrow());
            assertEquals(1, old.closeCount.get());
            assertEquals(0, replacement.closeCount.get());
        } finally {
            replacementAdded.countDown();
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));
            globalConnectionCache.removeCache("race");
        }
    }

    private static final class EqualConnection extends AbstractConnection<Object> {
        private final AtomicInteger closeCount = new AtomicInteger();

        @Override
        public Object getConnection() {
            return this;
        }

        @Override
        public void closeConnection() {
            closeCount.incrementAndGet();
        }

        @Override
        public boolean equals(Object other) {
            return other instanceof EqualConnection;
        }

        @Override
        public int hashCode() {
            return 1;
        }
    }

    private static final class TestGlobalConnectionCache extends GlobalConnectionCache {

        private CountDownLatch virtualThreadLatch;

        private AtomicBoolean virtualThread;

        private CountDownLatch firstStarted;

        private CountDownLatch releaseFirst;

        private CountDownLatch secondStarted;

        private AtomicInteger maxConcurrent;

        private final AtomicInteger concurrent = new AtomicInteger();

        private final AtomicInteger invocations = new AtomicInteger();

        private TestGlobalConnectionCache() {
            super(false);
        }

        private void setVirtualThreadHook(CountDownLatch latch, AtomicBoolean flag) {
            this.virtualThreadLatch = latch;
            this.virtualThread = flag;
        }

        private void setConcurrencyHook(CountDownLatch firstStarted, CountDownLatch releaseFirst,
                                        CountDownLatch secondStarted, AtomicInteger maxConcurrent) {
            this.firstStarted = firstStarted;
            this.releaseFirst = releaseFirst;
            this.secondStarted = secondStarted;
            this.maxConcurrent = maxConcurrent;
        }

        @Override
        void beforeCleanTimeoutOrUnHealthyCacheRun() {
            if (virtualThread != null) {
                virtualThread.set(Thread.currentThread().isVirtual());
            }
            if (virtualThreadLatch != null) {
                virtualThreadLatch.countDown();
            }
            if (maxConcurrent == null) {
                return;
            }
            int active = concurrent.incrementAndGet();
            maxConcurrent.accumulateAndGet(active, Math::max);
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

    private static final class TestConnection extends AbstractConnection<Object> {

        private final CountDownLatch closed = new CountDownLatch(1);

        private final AtomicInteger closeCount = new AtomicInteger();

        @Override
        public Object getConnection() {
            return new Object();
        }

        @Override
        public void closeConnection() {
            closeCount.incrementAndGet();
            closed.countDown();
        }
    }
}
