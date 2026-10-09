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

import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.apache.hertzbeat.collector.timer.WheelTimerTask;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.timer.Timeout;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Test case for {@link CommonDispatcher}.
 * Regression coverage for issue #4203 (duplicate dispatch on collection timeout).
 */
class CommonDispatcherTest {

    private static final long JOB_ID = 1L;

    /**
     * Minimal {@link Timeout} stub that tracks cancellation state and returns
     * a mock {@link WheelTimerTask} backed by a real {@link Job}.
     */
    private static class CancellableTimeout implements Timeout {

        private volatile boolean cancelled = false;

        @Override
        public boolean cancel() {
            cancelled = true;
            return true;
        }

        @Override
        public boolean isCancelled() {
            return cancelled;
        }

        @Override
        public boolean isExpired() {
            return false;
        }

        @Override
        public org.apache.hertzbeat.common.timer.Timer timer() {
            return null;
        }

        @Override
        public org.apache.hertzbeat.common.timer.TimerTask task() {
            WheelTimerTask task = mock(WheelTimerTask.class);
            Job job = Job.builder()
                    .id(JOB_ID)
                    .monitorId(JOB_ID)
                    .tenantId(0L)
                    .app("test-app")
                    .labels(Collections.emptyMap())
                    .annotations(Collections.emptyMap())
                    .metadata(Collections.emptyMap())
                    .build();
            when(task.getJob()).thenReturn(job);
            return task;
        }
    }

    private CancellableTimeout timeout;

    @BeforeEach
    void setUp() {
        timeout = new CancellableTimeout();
    }

    @Test
    void timeoutMonitor_priorityZero_dispatchesOnceAndCancels() throws Exception {
        long expiredStart = System.currentTimeMillis() - 300_000L;
        Metrics availability = Metrics.builder().name("availability").priority((byte) 0).build();
        CommonDispatcher.MetricsTime entry =
                new CommonDispatcher.MetricsTime(expiredStart, availability, timeout);

        AtomicInteger dispatchCount = new AtomicInteger(0);
        Map<String, CommonDispatcher.MetricsTime> monitorMap = new ConcurrentHashMap<>();
        monitorMap.put(JOB_ID + "-availability", entry);

        CommonDispatcher dispatcher = buildDispatcher(monitorMap, dispatchCount);
        invokeMonitorCollectTaskTimeout(dispatcher);

        assertEquals(1, dispatchCount.get(), "dispatchCollectData must be called exactly once");
        assertTrue(timeout.isCancelled(), "Timeout must be cancelled after dispatch");
        assertTrue(monitorMap.isEmpty(), "Map must be empty after timeout is handled");
    }

    @Test
    void timeoutMonitor_secondScan_doesNotDoubleDispatch() throws Exception {
        long expiredStart = System.currentTimeMillis() - 300_000L;
        Metrics availability = Metrics.builder().name("availability").priority((byte) 0).build();
        CommonDispatcher.MetricsTime entry =
                new CommonDispatcher.MetricsTime(expiredStart, availability, timeout);

        AtomicInteger dispatchCount = new AtomicInteger(0);
        Map<String, CommonDispatcher.MetricsTime> monitorMap = new ConcurrentHashMap<>();
        monitorMap.put(JOB_ID + "-availability", entry);

        CommonDispatcher dispatcher = buildDispatcher(monitorMap, dispatchCount);

        invokeMonitorCollectTaskTimeout(dispatcher);
        assertEquals(1, dispatchCount.get(), "First scan must dispatch once");

        invokeMonitorCollectTaskTimeout(dispatcher);
        assertEquals(1, dispatchCount.get(), "Second scan must not produce a duplicate dispatch");
    }

    @Test
    void timeoutMonitor_nonZeroPriority_cancelsWithoutDispatching() throws Exception {
        long expiredStart = System.currentTimeMillis() - 300_000L;
        Metrics cpu = Metrics.builder().name("cpu").priority((byte) 1).build();
        CommonDispatcher.MetricsTime entry =
                new CommonDispatcher.MetricsTime(expiredStart, cpu, timeout);

        AtomicInteger dispatchCount = new AtomicInteger(0);
        Map<String, CommonDispatcher.MetricsTime> monitorMap = new ConcurrentHashMap<>();
        monitorMap.put(JOB_ID + "-cpu", entry);

        CommonDispatcher dispatcher = buildDispatcher(monitorMap, dispatchCount);
        invokeMonitorCollectTaskTimeout(dispatcher);

        assertEquals(0, dispatchCount.get(), "Non-zero priority timeout must not dispatch");
        assertTrue(timeout.isCancelled(), "Timeout must be cancelled");
        assertTrue(monitorMap.isEmpty(), "Map must be empty after timeout is handled");
    }

    @Test
    void timeoutMonitor_nonExpiredEntry_isLeftUntouched() throws Exception {
        long recentStart = System.currentTimeMillis() - 60_000L;
        Metrics availability = Metrics.builder().name("availability").priority((byte) 0).build();
        CommonDispatcher.MetricsTime entry =
                new CommonDispatcher.MetricsTime(recentStart, availability, timeout);

        AtomicInteger dispatchCount = new AtomicInteger(0);
        Map<String, CommonDispatcher.MetricsTime> monitorMap = new ConcurrentHashMap<>();
        monitorMap.put(JOB_ID + "-availability", entry);

        CommonDispatcher dispatcher = buildDispatcher(monitorMap, dispatchCount);
        invokeMonitorCollectTaskTimeout(dispatcher);

        assertEquals(0, dispatchCount.get(), "Non-expired entry must not be dispatched");
        assertFalse(timeout.isCancelled(), "Non-expired timeout must not be cancelled");
        assertFalse(monitorMap.isEmpty(), "Non-expired entry must remain in the map");
    }

    private CommonDispatcher buildDispatcher(
            Map<String, CommonDispatcher.MetricsTime> monitorMap,
            AtomicInteger dispatchCount) throws Exception {

        CollectJobService jobService = mock(CollectJobService.class);
        when(jobService.getCollectorIdentity()).thenReturn("test-collector");
        WorkerPool workerPool = mock(WorkerPool.class);

        CommonDispatcher dispatcher = new CommonDispatcher(
                null, null, null, workerPool, jobService, null) {

            @Override
            public void start() {
            }

            @Override
            public void dispatchCollectData(Timeout t, Metrics m, CollectRep.MetricsData data) {
                WheelTimerTask task = (WheelTimerTask) t.task();
                String key = task.getJob().getId() + "-" + m.getName();
                if (monitorMap.remove(key) == null) {
                    return;
                }
                dispatchCount.incrementAndGet();
            }
        };

        Field mapField = CommonDispatcher.class.getDeclaredField("metricsTimeoutMonitorMap");
        mapField.setAccessible(true);
        mapField.set(dispatcher, monitorMap);

        return dispatcher;
    }

    private void invokeMonitorCollectTaskTimeout(CommonDispatcher dispatcher) throws Exception {
        Method method = CommonDispatcher.class.getDeclaredMethod("monitorCollectTaskTimeout");
        method.setAccessible(true);
        method.invoke(dispatcher);
    }
}
