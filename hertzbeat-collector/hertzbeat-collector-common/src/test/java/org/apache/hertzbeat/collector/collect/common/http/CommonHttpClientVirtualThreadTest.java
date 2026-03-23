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

package org.apache.hertzbeat.collector.collect.common.http;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.http.impl.conn.PoolingHttpClientConnectionManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * Tests for CommonHttpClient cleanup dispatch.
 */
class CommonHttpClientVirtualThreadTest {

    private final PoolingHttpClientConnectionManager originalConnectionManager = CommonHttpClient.getConnectionManager();

    @AfterEach
    void tearDown() {
        CommonHttpClient.setBeforeCleanupHookForTest(null);
        CommonHttpClient.setConnectionManagerForTest(originalConnectionManager);
    }

    @Test
    void dispatchConnectionPoolCleanupRunsOnVirtualThread() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);
        PoolingHttpClientConnectionManager manager = mock(PoolingHttpClientConnectionManager.class);
        CommonHttpClient.setConnectionManagerForTest(manager);
        CommonHttpClient.setBeforeCleanupHookForTest(() -> {
            virtualThread.set(Thread.currentThread().isVirtual());
            latch.countDown();
        });

        CommonHttpClient.dispatchConnectionPoolCleanup();

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void dispatchConnectionPoolCleanupDoesNotRunConcurrently() throws Exception {
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicInteger concurrent = new AtomicInteger();
        AtomicInteger maxConcurrent = new AtomicInteger();
        AtomicInteger invocations = new AtomicInteger();
        PoolingHttpClientConnectionManager manager = mock(PoolingHttpClientConnectionManager.class);
        CommonHttpClient.setConnectionManagerForTest(manager);
        CommonHttpClient.setBeforeCleanupHookForTest(() -> {
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
        });

        CommonHttpClient.dispatchConnectionPoolCleanup();
        assertTrue(firstStarted.await(5, TimeUnit.SECONDS));

        CommonHttpClient.dispatchConnectionPoolCleanup();
        assertFalse(secondStarted.await(200, TimeUnit.MILLISECONDS));

        releaseFirst.countDown();
        assertTrue(secondStarted.await(5, TimeUnit.SECONDS));
        assertEquals(1, maxConcurrent.get());
    }

    @Test
    void dispatchConnectionPoolCleanupClosesExpiredAndIdleConnections() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        PoolingHttpClientConnectionManager manager = mock(PoolingHttpClientConnectionManager.class);
        doAnswer(invocation -> {
            latch.countDown();
            return null;
        }).when(manager).closeExpiredConnections();
        CommonHttpClient.setConnectionManagerForTest(manager);

        CommonHttpClient.dispatchConnectionPoolCleanup();

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        verify(manager, times(1)).closeExpiredConnections();
        verify(manager, times(1)).closeIdleConnections(40, TimeUnit.SECONDS);
    }
}
