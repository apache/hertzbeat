///*
// * Licensed to the Apache Software Foundation (ASF) under one or more
// * contributor license agreements.  See the NOTICE file distributed with
// * this work for additional information regarding copyright ownership.
// * The ASF licenses this file to You under the Apache License, Version 2.0
// * (the "License"); you may not use this file except in compliance with
// * the License.  You may obtain a copy of the License at
// *
// *     http://www.apache.org/licenses/LICENSE-2.0
// *
// * Unless required by applicable law or agreed to in writing, software
// * distributed under the License is distributed on an "AS IS" BASIS,
// * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// * See the License for the specific language governing permissions and
// * limitations under the License.
// */
//
//package org.apache.hertzbeat.collector.dispatch;
//
//import static org.mockito.ArgumentMatchers.any;
//import static org.mockito.Mockito.doAnswer;
//import static org.mockito.Mockito.mock;
//import static org.mockito.Mockito.times;
//import static org.mockito.Mockito.verify;
//import static org.mockito.Mockito.when;
//import java.util.List;
//import java.util.Set;
//import java.util.concurrent.ExecutorService;
//import java.util.concurrent.Executors;
//import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
//import org.apache.hertzbeat.collector.dispatch.timer.Timeout;
//import org.apache.hertzbeat.collector.dispatch.timer.TimerDispatch;
//import org.apache.hertzbeat.collector.dispatch.timer.WheelTimerTask;
//import org.apache.hertzbeat.common.entity.job.Job;
//import org.apache.hertzbeat.common.entity.job.Metrics;
//import org.apache.hertzbeat.common.entity.message.CollectRep;
//import org.apache.hertzbeat.common.queue.CommonDataQueue;
//import org.junit.jupiter.api.BeforeEach;
//import org.junit.jupiter.api.Test;
//import org.mockito.InjectMocks;
//import org.mockito.Mock;
//import org.mockito.MockitoAnnotations;
//
///**
// * Test case for {@link CommonDispatcher}
// */
//class CommonDispatcherTest {
//
//    @Mock
//    private MetricsCollectorQueue jobRequestQueue;
//
//    @Mock
//    private TimerDispatch timerDispatch;
//
//    @Mock
//    private CommonDataQueue commonDataQueue;
//
//    @Mock
//    private WorkerPool workerPool;
//
//    @InjectMocks
//    private CommonDispatcher commonDispatcher;
//
//    @Mock
//    private CollectJobService collectJobService;
//
//    @BeforeEach
//    void setUp() {
//
//        MockitoAnnotations.openMocks(this);
//
//        ExecutorService executorService = Executors.newFixedThreadPool(2);
//        doAnswer(invocation -> {
//            Runnable task = invocation.getArgument(0);
//            executorService.submit(task);
//            return null;
//        }).when(workerPool).executeJob(any(Runnable.class));
//    }
//
//    @Test
//    void testDispatchMetricsTask() {
//
//        Timeout timeout = mock(Timeout.class);
//        WheelTimerTask timerTask = mock(WheelTimerTask.class);
//
//        Job job = mock(Job.class);
//        Set<Metrics> metricsSet = mock(Set.class);
//
//        when(timeout.task()).thenReturn(timerTask);
//        when(timerTask.getJob()).thenReturn(job);
//        when(job.getNextCollectMetrics(null, true)).thenReturn(metricsSet);
//
//        commonDispatcher.dispatchMetricsTask(timeout);
//
//        verify(job, times(1)).getNextCollectMetrics(null, true);
//    }
//
//    @Test
//    public void testDispatchCollectDataTimeoutMetricsCollectRepMetricsData() {
//
//        Timeout timeout = mock(Timeout.class);
//        Metrics metrics = mock(Metrics.class);
//        WheelTimerTask timerTask = mock(WheelTimerTask.class);
//        Job job = mock(Job.class);
//        CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder().setMetrics("metrics").build();
//
//        when(timeout.task()).thenReturn(timerTask);
//        when(timerTask.getJob()).thenReturn(job);
//        when(job.getNextCollectMetrics(metrics, false)).thenReturn(null);
//        when(timeout.task()).thenReturn(timerTask);
//        when(timerTask.getJob()).thenReturn(job);
//        when(job.getNextCollectMetrics(metrics, false)).thenReturn(null);
//        when(metrics.isHasSubTask()).thenReturn(false);
//
//        commonDispatcher.dispatchCollectData(timeout, metrics, metricsData);
//
//        verify(commonDataQueue, times(0)).sendMetricsData(metricsData);
//    }
//
//    @Test
//    void testDispatchCollectDataTimeoutMetricsListOfCollectRepMetricsData() {
//        Timeout timeout = mock(Timeout.class);
//        Metrics metrics = mock(Metrics.class);
//        CollectRep.MetricsData metricsData1 = CollectRep.MetricsData.newBuilder().build();
//        CollectRep.MetricsData metricsData2 = CollectRep.MetricsData.newBuilder().build();
//        List<CollectRep.MetricsData> metricsDataList = List.of(metricsData1, metricsData2);
//        WheelTimerTask timerTask = mock(WheelTimerTask.class);
//        Job job = mock(Job.class);
//
//        when(timeout.task()).thenReturn(timerTask);
//        when(timerTask.getJob()).thenReturn(job);
//        when(job.isCyclic()).thenReturn(true);
//
//        commonDispatcher.dispatchCollectData(timeout, metrics, metricsDataList);
//
//        verify(commonDataQueue, times(2)).sendMetricsData(any(CollectRep.MetricsData.class));
//    }
//
//    @Test
//    void testStart() {
//
//        commonDispatcher.start();
//
//        verify(workerPool, times(2)).executeJob(any(Runnable.class));
//    }
//
//}
