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
import org.apache.hertzbeat.collector.metrics.HertzBeatMetricsCollector;
import org.apache.hertzbeat.collector.timer.TimerDispatch;
import org.apache.hertzbeat.collector.timer.WheelTimerTask;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.PrometheusProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.timer.Timeout;
import org.apache.hertzbeat.common.timer.Timer;
import org.apache.hertzbeat.common.timer.TimerTask;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Tests real dispatcher state transitions rather than overriding result dispatch. */
class CommonDispatcherTest {
    private CommonDispatcher dispatcher;
    private TimerDispatch timerDispatch;
    private CommonDataQueue dataQueue;
    private MetricsCollectorQueue requestQueue;
    private Map<String, CommonDispatcher.MetricsTime> pending;
    private Job job;
    private WheelTimerTask task;
    private CancellableTimeout timeout;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() throws Exception {
        timerDispatch = mock(TimerDispatch.class);
        dataQueue = mock(CommonDataQueue.class);
        requestQueue = mock(MetricsCollectorQueue.class);
        CollectJobService jobService = mock(CollectJobService.class);
        when(jobService.getCollectorIdentity()).thenReturn("test-collector");
        dispatcher = new CommonDispatcher(requestQueue, timerDispatch, dataQueue,
                mock(WorkerPool.class), jobService, List.of()) {
            @Override
            public void start() {
                // The test explicitly drives dispatch and timeout scans.
            }
        };
        Field field = CommonDispatcher.class.getDeclaredField("metricsTimeoutMonitorMap");
        field.setAccessible(true);
        pending = (Map<String, CommonDispatcher.MetricsTime>) field.get(dispatcher);
    }

    private void start(Metrics... metrics) {
        job = Job.builder().id(1).monitorId(1).app("test").isCyclic(true)
                .metadata(Collections.emptyMap()).labels(Collections.emptyMap())
                .annotations(Collections.emptyMap()).configmap(List.of()).metrics(List.of(metrics))
                .defaultInterval(30).build();
        task = new WheelTimerTask(job, dispatcher);
        timeout = new CancellableTimeout(task);
        dispatcher.dispatchMetricsTask(timeout);
    }

    private Metrics metric(String name, int priority) {
        return Metrics.builder().name(name).priority((byte) priority).build();
    }

    private Metrics current(String name) {
        return job.getMetrics().stream().filter(item -> item.getName().equals(name)).findFirst().orElseThrow();
    }

    private CollectRep.MetricsData success(String name) {
        return CollectRep.MetricsData.newBuilder().setMetrics(name).setCode(CollectRep.Code.SUCCESS).build();
    }

    private void complete(String name) {
        dispatcher.dispatchCollectData(timeout, current(name), success(name));
    }

    private void expire(String name) {
        pending.get("1-" + name).setStartTime(System.currentTimeMillis() - 300_000L);
    }

    private void scan() throws Exception {
        Method method = CommonDispatcher.class.getDeclaredMethod("monitorCollectTaskTimeout");
        method.setAccessible(true);
        method.invoke(dispatcher);
    }

    @Test
    void nonZeroTimeoutCompletesRoundAndSchedulesExactlyOnce() throws Exception {
        start(metric("availability", 0), metric("slow", 1));
        complete("availability");
        expire("slow");
        scan();
        scan();
        complete("slow");
        verify(timerDispatch, times(1)).cyclicJob(task);
        verify(dataQueue, times(2)).sendMetricsData(any());
        assertTrue(pending.isEmpty());
        assertFalse(timeout.isCancelled());
    }

    @Test
    void timeoutPreservesTenantAndExecutionContextAndRecordsOnce() throws Exception {
        HertzBeatMetricsCollector metricsCollector = mock(HertzBeatMetricsCollector.class);
        Field field = CommonDispatcher.class.getDeclaredField("metricsCollector");
        field.setAccessible(true);
        field.set(dispatcher, metricsCollector);
        start(metric("slow", 1));
        job.setTenantId(42L);
        job.setMetadata(Map.of("custom", "metadata"));
        expire("slow");
        long startedAt = pending.get("1-slow").getStartTime();

        scan();
        scan();
        complete("slow");

        ArgumentCaptor<CollectRep.MetricsData> result = ArgumentCaptor.forClass(CollectRep.MetricsData.class);
        verify(dataQueue).sendMetricsData(result.capture());
        assertEquals(42L, result.getValue().getTenantId());
        assertEquals(CollectRep.Code.TIMEOUT, result.getValue().getCode());
        assertEquals("metadata", result.getValue().getMetadataValue("custom"));
        assertEquals(String.valueOf(startedAt), result.getValue().getMetadataValue(MetricDataConstants.COLLECTION_STARTED_AT));
        assertEquals("test-collector", result.getValue().getMetadataValue(MetricDataConstants.COLLECTOR_ID));
        verify(metricsCollector).recordCollectMetrics(eq(job), anyLong(), eq("timeout"));
    }

    @Test
    void temporaryTimeoutCompletesAllMetricsAndRespondsOnce() throws Exception {
        start(metric("slow", 1), metric("peer", 1));
        job.setCyclic(false);
        expire("slow");
        scan();
        verify(timerDispatch, never()).responseSyncJobData(anyLong(), any());
        complete("peer");
        complete("slow");
        scan();
        verify(timerDispatch).responseSyncJobData(job.getId(), job.getResponseDataTemp());
        assertEquals(2, job.getResponseDataTemp().size());
        assertTrue(job.getResponseDataTemp().stream().anyMatch(result -> result.getCode() == CollectRep.Code.TIMEOUT));
        assertTrue(pending.isEmpty());
        assertFalse(timeout.isCancelled());
    }

    @Test
    void callbackBeforeTimeoutScanIsNotDispatchedAgain() throws Exception {
        start(metric("slow", 1));
        expire("slow");
        complete("slow");
        scan();
        verify(timerDispatch).cyclicJob(task);
        verify(dataQueue).sendMetricsData(any());
        assertTrue(pending.isEmpty());
        assertFalse(timeout.isCancelled());
    }

    @Test
    void timedOutSiblingDoesNotCancelPeersOrSkipFollowingPriority() throws Exception {
        start(metric("availability", 0), metric("slow", 1), metric("peer", 1), metric("last", 2));
        complete("availability");
        expire("slow");
        scan();
        verify(timerDispatch, never()).cyclicJob(task);
        assertFalse(timeout.isCancelled());
        assertTrue(pending.containsKey("1-peer"));
        complete("peer");
        assertTrue(pending.containsKey("1-last"));
        complete("last");
        verify(timerDispatch, times(1)).cyclicJob(task);
    }

    @Test
    void priorityZeroTimeoutSchedulesWithoutStartingFollowingPriority() throws Exception {
        start(metric("availability", 0), metric("slow", 1));
        expire("availability");
        scan();
        complete("availability");
        verify(timerDispatch, times(1)).cyclicJob(task);
        assertTrue(pending.isEmpty());
        verify(requestQueue, times(1)).addJob(any());
    }

    @Test
    void lateOldRoundCannotRemoveNewRoundEntryOrAdvanceItsState() throws Exception {
        start(metric("slow", 1));
        expire("slow");
        scan();
        CancellableTimeout old = timeout;
        timeout = new CancellableTimeout(task);
        current("slow").setCollectTime(0);
        dispatcher.dispatchMetricsTask(timeout);
        CommonDispatcher.MetricsTime next = pending.get("1-slow");
        dispatcher.dispatchCollectData(old, current("slow"), success("slow"));
        assertSame(next, pending.get("1-slow"));
        verify(timerDispatch, times(1)).cyclicJob(task);
        complete("slow");
        verify(timerDispatch, times(2)).cyclicJob(task);
    }

    @Test
    void concurrentTimeoutAndCompletionsAdvanceOnlyOnce() throws Exception {
        start(metric("a", 1), metric("b", 1), metric("last", 2));
        expire("a");
        expire("b");
        CountDownLatch ready = new CountDownLatch(3);
        CountDownLatch go = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(3)) {
            var futures = List.of(
                    executor.submit(() -> race(ready, go, () -> complete("a"))),
                    executor.submit(() -> race(ready, go, () -> complete("b"))),
                    executor.submit(() -> race(ready, go, this::scan)));
            assertTrue(ready.await(5, TimeUnit.SECONDS));
            go.countDown();
            for (var future : futures) {
                future.get(5, TimeUnit.SECONDS);
            }
        }
        assertEquals(1, pending.size());
        assertTrue(pending.containsKey("1-last"));
        verify(requestQueue, times(3)).addJob(any());
        complete("last");
        verify(timerDispatch, times(1)).cyclicJob(task);
    }

    @Test
    void cancellationOrDeletionNeverReschedulesOrExports() throws Exception {
        start(metric("slow", 1));
        expire("slow");
        timeout.cancel();
        scan();
        complete("slow");
        verify(timerDispatch, never()).cyclicJob(task);
        verify(dataQueue, never()).sendMetricsData(any());
        assertTrue(pending.isEmpty());
    }

    @Test
    void deletionOfAlreadyExpiredWheelTaskIsRespected() throws Exception {
        start(metric("slow", 1));
        expire("slow");
        task.cancel();
        assertFalse(timeout.isCancelled());
        scan();
        complete("slow");
        verify(timerDispatch, never()).cyclicJob(task);
        verify(dataQueue, never()).sendMetricsData(any());
    }

    @Test
    void subtaskTimeoutAndLateReturnConsumeResponseExactlyOnce() throws Exception {
        start(metric("group", 1));
        pending.clear();
        AtomicInteger remaining = new AtomicInteger(2);
        AtomicReference<CollectRep.MetricsData.Builder> result = new AtomicReference<>();
        Metrics first = metric("group", 1);
        Metrics second = metric("group", 1);
        first.setSubTaskNum(remaining);
        second.setSubTaskNum(remaining);
        first.setSubTaskDataRef(result);
        second.setSubTaskDataRef(result);
        first.setSubTaskId(0);
        second.setSubTaskId(1);
        pending.put("1-group-sub-0", new CommonDispatcher.MetricsTime(0, first, timeout));
        pending.put("1-group-sub-1", new CommonDispatcher.MetricsTime(System.currentTimeMillis(), second, timeout));
        scan();
        assertEquals(1, remaining.get(), "Timeout must consume the first subtask");
        assertFalse(pending.containsKey("1-group-sub-0"));
        dispatcher.dispatchCollectData(timeout, first, success("group"));
        assertEquals(1, remaining.get(), "Late result must not consume that subtask again");
        dispatcher.dispatchCollectData(timeout, second, success("group"));
        assertEquals(0, remaining.get());
        verify(timerDispatch, times(1)).cyclicJob(task);
        assertTrue(pending.isEmpty());
    }

    @Test
    void prometheusLateListCannotCompleteNewRound() throws Exception {
        Metrics prometheus = metric("prometheus", 0);
        prometheus.setPrometheus(new PrometheusProtocol());
        start(prometheus);
        pending.get("1").setStartTime(0);
        scan();
        CancellableTimeout old = timeout;
        timeout = new CancellableTimeout(task);
        current("prometheus").setCollectTime(0);
        dispatcher.dispatchMetricsTask(timeout);
        CommonDispatcher.MetricsTime next = pending.get("1");
        dispatcher.dispatchCollectData(old, current("prometheus"), List.of(success("late")));
        assertSame(next, pending.get("1"));
        dispatcher.dispatchCollectData(timeout, current("prometheus"), List.of(success("fresh")));
        dispatcher.dispatchCollectData(timeout, current("prometheus"), List.of(success("duplicate")));
        verify(timerDispatch, times(2)).cyclicJob(task);
        verify(dataQueue, times(2)).sendMetricsData(any());
        assertTrue(pending.isEmpty());
    }

    @Test
    void nonExpiredMetricRemainsPending() throws Exception {
        start(metric("slow", 1));
        scan();
        assertEquals(1, pending.size());
        verify(timerDispatch, never()).cyclicJob(task);
        verify(dataQueue, never()).sendMetricsData(any());
    }

    @Test
    void resultCanCompleteImmediatelyWhenEnqueued() {
        doAnswer(invocation -> {
            MetricsCollect collect = invocation.getArgument(0);
            dispatcher.dispatchCollectData(collect.timeout, collect.metrics, success(collect.metrics.getName()));
            return null;
        }).when(requestQueue).addJob(any());
        start(metric("only", 1));
        verify(timerDispatch, times(1)).cyclicJob(task);
        assertTrue(pending.isEmpty());
    }

    private void race(CountDownLatch ready, CountDownLatch go, CheckedAction action) {
        ready.countDown();
        try {
            if (!go.await(5, TimeUnit.SECONDS)) {
                throw new AssertionError("Concurrent start timed out");
            }
            action.run();
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }

    private interface CheckedAction {
        void run() throws Exception;
    }

    private static final class CancellableTimeout implements Timeout {
        private final WheelTimerTask task;
        private volatile boolean cancelled;

        private CancellableTimeout(WheelTimerTask task) {
            this.task = task;
        }

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
            return true;
        }

        @Override
        public Timer timer() {
            return null;
        }

        @Override
        public TimerTask task() {
            return task;
        }
    }
}
