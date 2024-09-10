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

package org.apache.hertzbeat.collector.dispatch.entrance.internal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import org.apache.hertzbeat.collector.dispatch.DispatchProperties;
import org.apache.hertzbeat.collector.dispatch.WorkerPool;
import org.apache.hertzbeat.collector.dispatch.entrance.CollectServer;
import org.apache.hertzbeat.collector.dispatch.timer.TimerDispatch;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * Test case for {@link CollectJobService}
 */

class CollectJobServiceTest {

    @Mock
    private TimerDispatch timerDispatch;

    @Mock
    private WorkerPool workerPool;

    @Mock
    private CollectServer collectServer;

    @Mock
    private DispatchProperties properties;

    @InjectMocks
    private CollectJobService collectJobService;

    @BeforeEach
    public void setUp() {

        MockitoAnnotations.openMocks(this);

        DispatchProperties.EntranceProperties entrance = mock(DispatchProperties.EntranceProperties.class);
        DispatchProperties.EntranceProperties.NettyProperties netty = mock(DispatchProperties.EntranceProperties.NettyProperties.class);

        when(properties.getEntrance()).thenReturn(entrance);
        when(entrance.getNetty()).thenReturn(netty);
        when(netty.isEnabled()).thenReturn(true);
        when(netty.getMode()).thenReturn("test-mode");
        when(netty.getIdentity()).thenReturn("test-collector");

        collectJobService = spy(new CollectJobService(timerDispatch, properties, workerPool));
        collectJobService.setCollectServer(collectServer);
    }

    @Test
    public void testCollectSyncJobData() {

        Job job = mock(Job.class);
        List<CollectRep.MetricsData> metricsDataList = List.of(CollectRep.MetricsData.newBuilder().build());
        CountDownLatch latch = new CountDownLatch(1);

        doAnswer(invocation -> {
            CollectResponseEventListener listener = invocation.getArgument(1);
            listener.response(metricsDataList);
            latch.countDown();
            return null;
        }).when(timerDispatch).addJob(any(Job.class), any(CollectResponseEventListener.class));

        List<CollectRep.MetricsData> result = collectJobService.collectSyncJobData(job);

        assertEquals(metricsDataList, result);
    }

    @Test
    public void testCollectSyncOneTimeJobData() {

        Job job = mock(Job.class);
        List<CollectRep.MetricsData> metricsDataList = List.of(CollectRep.MetricsData.newBuilder().build());

        doAnswer(invocation -> {
            Runnable task = invocation.getArgument(0);
            task.run();
            return null;
        }).when(workerPool).executeJob(any(Runnable.class));

        doReturn(metricsDataList).when(collectJobService).collectSyncJobData(any(Job.class));

        collectJobService.collectSyncOneTimeJobData(job);

        verify(collectServer, times(1)).sendMsg(any(ClusterMsg.Message.class));
    }

    @Test
    public void testCancelAsyncCollectJob() {

        Long jobId = 123L;
        collectJobService.cancelAsyncCollectJob(jobId);

        verify(timerDispatch, times(1)).deleteJob(eq(jobId), eq(true));
    }

    @Test
    public void testSendAsyncCollectData() {

        CollectRep.MetricsData metricsData = CollectRep.MetricsData
                .newBuilder()
                .setMetrics("test")
                .build();
        collectJobService.sendAsyncCollectData(metricsData);

        verify(collectServer, times(1)).sendMsg(any(ClusterMsg.Message.class));
    }

    @Test
    public void testGetCollectorIdentity() {

        assertEquals("test-collector", collectJobService.getCollectorIdentity());
    }

    @Test
    public void testGetCollectorMode() {

        assertEquals("test-mode", collectJobService.getCollectorMode());
    }
}
