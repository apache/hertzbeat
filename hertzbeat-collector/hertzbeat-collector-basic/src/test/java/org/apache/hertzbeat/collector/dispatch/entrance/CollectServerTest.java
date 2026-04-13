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

package org.apache.hertzbeat.collector.dispatch.entrance;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import io.netty.channel.Channel;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.collector.dispatch.CollectorInfoProperties;
import org.apache.hertzbeat.collector.dispatch.DispatchProperties;
import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.apache.hertzbeat.collector.timer.TimerDispatch;
import org.apache.hertzbeat.common.concurrent.BackgroundTaskExecutor;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.remoting.RemotingClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * test case for {@link CollectServer}
 */

@ExtendWith(MockitoExtension.class)
class CollectServerTest {

    @Mock
    private CollectJobService collectJobService;

    @Mock
    private TimerDispatch timerDispatch;

    @Mock
    private DispatchProperties properties;

    @Mock
    private DispatchProperties.EntranceProperties entranceProperties;

    @Mock
    private DispatchProperties.EntranceProperties.NettyProperties nettyProperties;

    @Mock
    private BackgroundTaskExecutor threadPool;

    @Mock
    private CollectorInfoProperties infoProperties;

    private CollectServer collectServer;

    private CollectServer.CollectNettyEventListener collectNettyEventListener;

    @BeforeEach
    void setUp() {

        when(nettyProperties.getManagerHost()).thenReturn("127.0.0.1");
        when(nettyProperties.getManagerPort()).thenReturn(8080);
        when(entranceProperties.getNetty()).thenReturn(nettyProperties);
        when(properties.getEntrance()).thenReturn(entranceProperties);

        collectServer = new CollectServer(collectJobService, timerDispatch, properties, threadPool, infoProperties);
        collectNettyEventListener = collectServer.new CollectNettyEventListener();
    }

    @Test
    void testRun() throws Exception {

        RemotingClient remotingClient = mock(RemotingClient.class);
        ReflectionTestUtils.setField(collectServer, "remotingClient", remotingClient);

        collectServer.run();

        verify(remotingClient, times(1)).start();
    }

    @Test
    void testShutdown() {

        RemotingClient remotingClient = mock(RemotingClient.class);
        ReflectionTestUtils.setField(collectServer, "remotingClient", remotingClient);
        ReflectionTestUtils.setField(collectServer, "scheduledExecutor", mock(ScheduledExecutorService.class));

        collectServer.shutdown();

        ScheduledExecutorService scheduledExecutor = (ScheduledExecutorService) ReflectionTestUtils.getField(collectServer, "scheduledExecutor");
        verify((scheduledExecutor), times(1)).shutdownNow();
        verify(remotingClient, times(1)).shutdown();
    }

    @Test
    void testSendMsg() {

        RemotingClient remotingClient = mock(RemotingClient.class);
        ReflectionTestUtils.setField(collectServer, "remotingClient", remotingClient);
        ClusterMsg.Message message = mock(ClusterMsg.Message.class);

        collectServer.sendMsg(message);

        verify(remotingClient, times(1)).sendMsg(message);
    }

    @Test
    void testOnChannelActive() {

        RemotingClient remotingClient = mock(RemotingClient.class);
        ReflectionTestUtils.setField(collectServer, "remotingClient", remotingClient);

        Channel channel = mock(Channel.class);
        when(collectJobService.getCollectorIdentity()).thenReturn("collector1");
        when(collectJobService.getCollectorMode()).thenReturn("mode1");
        when(infoProperties.getIp()).thenReturn("127.0.0.1");
        when(infoProperties.getVersion()).thenReturn("1.0");

        collectNettyEventListener.onChannelActive(channel);

        verify(timerDispatch, times(1)).goOnline();
        verify(remotingClient, times(1)).sendMsg(any(ClusterMsg.Message.class));

        ScheduledExecutorService scheduledExecutor =
                (ScheduledExecutorService) ReflectionTestUtils.getField(collectServer, "scheduledExecutor");
        assertNotNull(scheduledExecutor);
    }

    @Test
    void testDispatchHeartbeatRunsOnVirtualThread() throws Exception {
        VirtualThreadProperties properties = new VirtualThreadProperties();
        collectServer = new CollectServer(collectJobService, timerDispatch, properties(), threadPool, infoProperties, properties);

        RemotingClient remotingClient = mock(RemotingClient.class);
        ReflectionTestUtils.setField(collectServer, "remotingClient", remotingClient);

        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);
        org.mockito.Mockito.doAnswer(invocation -> {
            virtualThread.set(Thread.currentThread().isVirtual());
            latch.countDown();
            return null;
        }).when(remotingClient).sendMsg(any(ClusterMsg.Message.class));

        collectServer.dispatchHeartbeat("collector1");

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void testDispatchHeartbeatDoesNotRunConcurrently() throws Exception {
        VirtualThreadProperties properties = new VirtualThreadProperties();
        collectServer = new CollectServer(collectJobService, timerDispatch, properties(), threadPool, infoProperties, properties);

        RemotingClient remotingClient = mock(RemotingClient.class);
        ReflectionTestUtils.setField(collectServer, "remotingClient", remotingClient);

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
            return null;
        }).when(remotingClient).sendMsg(any(ClusterMsg.Message.class));

        collectServer.dispatchHeartbeat("collector1");
        assertTrue(firstStarted.await(5, TimeUnit.SECONDS));

        collectServer.dispatchHeartbeat("collector1");
        assertFalse(secondStarted.await(200, TimeUnit.MILLISECONDS));

        releaseFirst.countDown();
        assertTrue(secondStarted.await(5, TimeUnit.SECONDS));
        assertEquals(1, maxConcurrent.get());
    }

    private DispatchProperties properties() {
        return properties;
    }

}
