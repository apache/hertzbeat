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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.apache.hertzbeat.collector.dispatch.unit.UnitConvert;
import org.apache.hertzbeat.collector.timer.TimerDispatch;
import org.apache.hertzbeat.collector.timer.WheelTimerTask;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.timer.Timeout;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

class CommonDispatcherTest {

    @Mock
    private MetricsCollectorQueue jobRequestQueue;

    @Mock
    private TimerDispatch timerDispatch;

    @Mock
    private CommonDataQueue commonDataQueue;

    @Mock
    private WorkerPool workerPool;

    @Mock
    private CollectJobService collectJobService;

    @Mock
    private Timeout timeout;

    @Mock
    private WheelTimerTask wheelTimerTask;

    private List<UnitConvert> unitConvertList = List.of();

    private CommonDispatcher dispatcher;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(collectJobService.getCollectorIdentity()).thenReturn("test-collector");
        doNothing().when(workerPool).executeLongRunning(any());
        dispatcher = new CommonDispatcher(jobRequestQueue, timerDispatch, commonDataQueue, workerPool,
            collectJobService, unitConvertList);
    }

    @Test
    void dispatchCollectDataExecute_When_Priority0MetricsTimeout() throws Exception {
        Job job = buildCycleJobWithMetrics();
        job.constructPriorMetrics();
        Metrics availabilityMetrics = job.getMetrics().get(0);

        when(timeout.task()).thenReturn(wheelTimerTask);
        when(wheelTimerTask.getJob()).thenReturn(job);
        when(timeout.isCancelled()).thenReturn(false);

        Map<String, CommonDispatcher.MetricsTime> metricsTimeoutMonitorMap = getMetricsTimeoutMonitorMap();
        CommonDispatcher.MetricsTime metricsTime = new CommonDispatcher.MetricsTime(
            System.currentTimeMillis() - 300_000L,
            availabilityMetrics,
            timeout
        );
        metricsTimeoutMonitorMap.put(job.getId() + "-" + availabilityMetrics.getName(), metricsTime);

        invokeMonitorCollectTaskTimeout();

        verify(commonDataQueue).sendMetricsData(any());
    }


    @Test
    void monitorPipelineNotStall_When_Priority0MetricsTimeout() throws Exception {
        Job job = buildCycleJobWithMetrics();
        job.constructPriorMetrics();
        Metrics availabilityMetrics = job.getMetrics().get(0);

        when(timeout.task()).thenReturn(wheelTimerTask);
        when(wheelTimerTask.getJob()).thenReturn(job);
        when(timeout.isCancelled()).thenReturn(false);

        Map<String, CommonDispatcher.MetricsTime> metricsTimeoutMonitorMap = getMetricsTimeoutMonitorMap();
        CommonDispatcher.MetricsTime metricsTime = new CommonDispatcher.MetricsTime(
            System.currentTimeMillis() - 300_000L,
            availabilityMetrics,
            timeout
        );
        metricsTimeoutMonitorMap.put(job.getId() + "-" + availabilityMetrics.getName(), metricsTime);

        invokeMonitorCollectTaskTimeout();

        verify(timerDispatch).cyclicJob(any(WheelTimerTask.class));
    }

    @Test
    void monitorPipelineNotStall_When_Priority_gt_0_MetricsTimeout() throws Exception {
        Job job = buildCycleJobWithMetrics();
        job.constructPriorMetrics();
        Metrics availabilityMetrics = job.getMetrics().get(0);
        Metrics cpu = job.getMetrics().get(1);
        job.getNextCollectMetrics(availabilityMetrics, false);

        when(timeout.task()).thenReturn(wheelTimerTask);
        when(wheelTimerTask.getJob()).thenReturn(job);
        when(timeout.isCancelled()).thenReturn(false);

        Map<String, CommonDispatcher.MetricsTime> metricsTimeoutMonitorMap = getMetricsTimeoutMonitorMap();
        CommonDispatcher.MetricsTime metricsTime = new CommonDispatcher.MetricsTime(
            System.currentTimeMillis() - 300_000L,
            cpu,
            timeout
        );
        metricsTimeoutMonitorMap.put(job.getId() + "-" + cpu.getName(), metricsTime);

        invokeMonitorCollectTaskTimeout();

        verify(jobRequestQueue).addJob(any(MetricsCollect.class));
    }

    @SuppressWarnings("unchecked")
    private Map<String, CommonDispatcher.MetricsTime> getMetricsTimeoutMonitorMap() throws Exception {
        Field field = CommonDispatcher.class.getDeclaredField("metricsTimeoutMonitorMap");
        field.setAccessible(true);
        return (Map<String, CommonDispatcher.MetricsTime>) field.get(dispatcher);
    }

    private void invokeMonitorCollectTaskTimeout() throws Exception {
        Method method = CommonDispatcher.class.getDeclaredMethod("monitorCollectTaskTimeout");
        method.setAccessible(true);
        method.invoke(dispatcher);
    }

    private Job buildCycleJobWithMetrics() {
        return Job.builder()
            .id(1L)
            .monitorId(100L)
            .app("linux")
            .isCyclic(true)
            .isSd(false)
            .configmap(List.of())
            .metrics(List.of(
                Metrics.builder().name("availability").priority((byte) 0).interval(60L).build(),
                Metrics.builder().name("cpu").priority((byte) 1).interval(60L).build(),
                Metrics.builder().name("memory").priority((byte) 2).interval(60L).build()
            ))
            .build();
    }


}
