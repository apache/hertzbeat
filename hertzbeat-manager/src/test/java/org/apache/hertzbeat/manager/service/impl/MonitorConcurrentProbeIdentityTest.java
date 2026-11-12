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

package org.apache.hertzbeat.manager.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.collector.dispatch.DispatchProperties;
import org.apache.hertzbeat.collector.dispatch.MetricsTaskDispatch;
import org.apache.hertzbeat.collector.dispatch.WorkerPool;
import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.apache.hertzbeat.collector.timer.TimerDispatcher;
import org.apache.hertzbeat.collector.timer.WheelTimerTask;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.manager.scheduler.CollectJobScheduling;
import org.apache.hertzbeat.manager.service.AppService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Actual native detection and wheel timer must not replace another concurrent probe's waiter. */
class MonitorConcurrentProbeIdentityTest {
    @Test
    @SuppressWarnings("unchecked")
    void concurrentNativeProbesHaveIndependentLocalJobIdentities() throws Exception {
        var dispatch = new AtomicReference<TimerDispatcher>();
        var identities = java.util.concurrent.ConcurrentHashMap.<Long>newKeySet();
        MetricsTaskDispatch worker =
                timeout -> {
                    Job job = ((WheelTimerTask) timeout.task()).getJob();
                    identities.add(job.getId());
                    dispatch.get()
                            .responseSyncJobData(
                                    job.getId(),
                                    List.of(
                                            CollectRep.MetricsData.newBuilder()
                                                    .setCode(CollectRep.Code.SUCCESS)
                                                    .build()));
                };
        ObjectProvider<MetricsTaskDispatch> provider = mock(ObjectProvider.class);
        when(provider.getObject()).thenReturn(worker);
        var timer = new TimerDispatcher(provider);
        dispatch.set(timer);
        var collector =
                new CollectJobService(timer, new DispatchProperties(), mock(WorkerPool.class));
        var scheduler = mock(CollectJobScheduling.class);
        when(scheduler.collectSyncJobData(any()))
                .thenAnswer(call -> collector.collectSyncJobData(call.getArgument(0)));
        var apps = mock(AppService.class);
        when(apps.getAppDefine("website"))
                .thenAnswer(
                        call ->
                                Job.builder()
                                        .id(0)
                                        .app("website")
                                        .metrics(
                                                List.of(
                                                        Metrics.builder()
                                                                .name("summary")
                                                                .priority((byte) 0)
                                                                .interval(1L)
                                                                .build()))
                                        .build());
        var service = new MonitorServiceImpl();
        ReflectionTestUtils.setField(service, "appService", apps);
        ReflectionTestUtils.setField(service, "collectJobScheduling", scheduler);
        var barrier = new CyclicBarrier(10);
        var pool = Executors.newFixedThreadPool(10);
        var futures = new java.util.ArrayList<java.util.concurrent.Future<?>>();
        try {
            for (int i = 0; i < 10; i++) {
                final int index = i;
                futures.add(
                        pool.submit(
                                () -> {
                                    barrier.await(2, TimeUnit.SECONDS);
                                    service.detectMonitor(
                                            Monitor.builder()
                                                    .id(1000L + index)
                                                    .app("website")
                                                    .name("probe-" + index)
                                                    .instance("127.0.0.1")
                                                    .labels(Map.of())
                                                    .build(),
                                            List.of(),
                                            null);
                                    return null;
                                }));
            }
            for (var future : futures) future.get(4, TimeUnit.SECONDS);
            assertEquals(10, identities.size());
            assertTrue(identities.stream().allMatch(id -> id != 0));
        } finally {
            futures.forEach(future -> future.cancel(true));
            pool.shutdownNow();
            assertTrue(pool.awaitTermination(3, TimeUnit.SECONDS));
            timer.destroy();
        }
    }
}
