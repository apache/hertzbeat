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

package org.apache.hertzbeat.manager.component.status;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;

import java.util.Collections;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.apache.hertzbeat.manager.config.StatusProperties;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.StatusPageComponentDao;
import org.apache.hertzbeat.manager.dao.StatusPageHistoryDao;
import org.apache.hertzbeat.manager.dao.StatusPageOrgDao;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link CalculateStatus}.
 */
@ExtendWith(MockitoExtension.class)
class CalculateStatusTest {

    @Mock
    private StatusPageOrgDao statusPageOrgDao;

    @Mock
    private StatusPageComponentDao statusPageComponentDao;

    @Mock
    private StatusPageHistoryDao statusPageHistoryDao;

    @Mock
    private MonitorDao monitorDao;

    private CalculateStatus calculateStatus;

    @BeforeEach
    void setUp() {
        calculateStatus = new CalculateStatus(statusPageOrgDao, statusPageComponentDao, statusProperties(),
                statusPageHistoryDao, monitorDao, new VirtualThreadProperties(), false);
    }

    @AfterEach
    void tearDown() {
        if (calculateStatus != null) {
            calculateStatus.destroy();
        }
    }

    @Test
    void dispatchCalculateRunsOnVirtualThread() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);
        org.mockito.Mockito.doAnswer(invocation -> {
            virtualThread.set(Thread.currentThread().isVirtual());
            latch.countDown();
            return Collections.emptyList();
        }).when(statusPageOrgDao).findAll();

        calculateStatus.dispatchCalculate();

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void dispatchCombineHistoryRunsOnVirtualThread() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);
        org.mockito.Mockito.doAnswer(invocation -> {
            virtualThread.set(Thread.currentThread().isVirtual());
            latch.countDown();
            return Collections.emptyList();
        }).when(statusPageHistoryDao).findStatusPageHistoriesByTimestampBetween(anyLong(), anyLong());

        calculateStatus.dispatchCombineHistory();

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void dispatchCalculateDoesNotRunConcurrently() throws Exception {
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicInteger concurrent = new AtomicInteger();
        AtomicInteger maxConcurrent = new AtomicInteger();
        AtomicInteger invocations = new AtomicInteger();
        org.mockito.Mockito.doAnswer(invocation -> {
            int running = concurrent.incrementAndGet();
            maxConcurrent.accumulateAndGet(running, Math::max);
            int currentInvocation = invocations.incrementAndGet();
            if (currentInvocation == 1) {
                firstStarted.countDown();
                releaseFirst.await(5, TimeUnit.SECONDS);
            } else if (currentInvocation == 2) {
                secondStarted.countDown();
            }
            concurrent.decrementAndGet();
            return Collections.emptyList();
        }).when(statusPageOrgDao).findAll();

        calculateStatus.dispatchCalculate();
        assertTrue(firstStarted.await(5, TimeUnit.SECONDS));

        calculateStatus.dispatchCalculate();
        assertFalse(secondStarted.await(200, TimeUnit.MILLISECONDS));

        releaseFirst.countDown();
        assertTrue(secondStarted.await(5, TimeUnit.SECONDS));
        assertEquals(1, maxConcurrent.get());
    }

    private StatusProperties statusProperties() {
        StatusProperties statusProperties = new StatusProperties();
        StatusProperties.CalculateProperties calculateProperties = new StatusProperties.CalculateProperties();
        calculateProperties.setInterval(300);
        statusProperties.setCalculate(calculateProperties);
        return statusProperties;
    }
}
