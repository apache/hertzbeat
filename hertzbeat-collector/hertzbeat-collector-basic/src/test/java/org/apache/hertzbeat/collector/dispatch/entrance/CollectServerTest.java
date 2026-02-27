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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import io.netty.channel.Channel;
import java.util.concurrent.ScheduledExecutorService;
import org.apache.hertzbeat.collector.dispatch.CollectorInfoProperties;
import org.apache.hertzbeat.collector.dispatch.DispatchProperties;
import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.apache.hertzbeat.collector.timer.TimerDispatch;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.support.CommonThreadPool;
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
    private CommonThreadPool threadPool;

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

}
