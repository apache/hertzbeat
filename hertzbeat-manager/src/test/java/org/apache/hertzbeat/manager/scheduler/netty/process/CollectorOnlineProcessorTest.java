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

package org.apache.hertzbeat.manager.scheduler.netty.process;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.google.protobuf.ByteString;
import io.netty.channel.embedded.EmbeddedChannel;
import org.apache.hertzbeat.alert.calculate.CollectorAlertHandler;
import org.apache.hertzbeat.common.concurrent.BackgroundTaskExecutor;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.apache.hertzbeat.common.entity.dto.CollectorInfo;
import org.apache.hertzbeat.common.entity.dto.ServerInfo;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.scheduler.CollectorJobScheduler;
import org.apache.hertzbeat.manager.scheduler.SchedulerProperties;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
import org.apache.hertzbeat.manager.scheduler.runtime.CollectorRuntimeStatusRegistry;
import org.apache.hertzbeat.remoting.netty.NettyRemotingServer;
import org.apache.hertzbeat.remoting.netty.NettyServerConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Test case for {@link CollectorOnlineProcessor}.
 */
class CollectorOnlineProcessorTest {

    private static final String COLLECTOR = "collector-1";

    private static final String SECRET = "online1SecretKey";

    private String previousSecret;

    @BeforeEach
    void setUp() {
        previousSecret = AesUtil.getDefaultSecretKey();
        AesUtil.setDefaultSecretKey(SECRET);
    }

    @AfterEach
    void tearDown() {
        AesUtil.setDefaultSecretKey(previousSecret);
    }

    @Test
    void aesSecretReachesCollectorBeforeJobsDispatchedWhileGoingOnline() {
        CollectorJobScheduler scheduler = mock(CollectorJobScheduler.class);
        ManageServer manageServer = new ManageServer(new SchedulerProperties(), scheduler,
                mock(BackgroundTaskExecutor.class), mock(CollectorAlertHandler.class), mock(CommonDataQueue.class),
                new VirtualThreadProperties(), new CollectorRuntimeStatusRegistry());
        NettyRemotingServer remotingServer = new NettyRemotingServer(new NettyServerConfig(), null,
                mock(BackgroundTaskExecutor.class));
        remotingServer.registerProcessor(ClusterMsg.MessageType.GO_ONLINE, new CollectorOnlineProcessor(manageServer));
        ReflectionTestUtils.setField(manageServer, "remotingServer", remotingServer);
        ClusterMsg.Message cyclicTask = ClusterMsg.Message.newBuilder()
                .setDirection(ClusterMsg.Direction.REQUEST)
                .setType(ClusterMsg.MessageType.ISSUE_CYCLIC_TASK)
                .setMsg(ByteString.copyFromUtf8("{\"id\":1}"))
                .build();
        // Going online rebalances and restores pinned jobs, which the scheduler sends on the same channel.
        doAnswer(invocation -> manageServer.sendMsg(COLLECTOR, cyclicTask))
                .when(scheduler).collectorGoOnline(eq(COLLECTOR), any(CollectorInfo.class));
        CollectorInfo collectorInfo = CollectorInfo.builder()
                .name(COLLECTOR).ip("10.0.0.2").mode("public").version("test").build();
        ClusterMsg.Message goOnline = ClusterMsg.Message.newBuilder()
                .setIdentity(COLLECTOR)
                .setDirection(ClusterMsg.Direction.REQUEST)
                .setType(ClusterMsg.MessageType.GO_ONLINE)
                .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(collectorInfo)))
                .build();
        EmbeddedChannel channel = new EmbeddedChannel(remotingServer.new NettyServerHandler());
        try {
            channel.writeInbound(goOnline);

            ClusterMsg.Message first = channel.readOutbound();
            assertNotNull(first);
            assertEquals(ClusterMsg.MessageType.GO_ONLINE, first.getType());
            assertEquals(ClusterMsg.Direction.RESPONSE, first.getDirection());
            assertEquals(COLLECTOR, first.getIdentity());
            ServerInfo serverInfo = JsonUtil.fromJson(first.getMsg().toStringUtf8(), ServerInfo.class);
            assertNotNull(serverInfo);
            assertEquals(SECRET, serverInfo.getAesSecret());
            ClusterMsg.Message second = channel.readOutbound();
            assertEquals(cyclicTask, second);
            assertNull(channel.readOutbound());
            verify(scheduler).collectorGoOnline(eq(COLLECTOR), any(CollectorInfo.class));
        } finally {
            channel.finishAndReleaseAll();
        }
    }
}
