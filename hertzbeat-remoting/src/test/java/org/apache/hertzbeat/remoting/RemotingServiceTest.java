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

package org.apache.hertzbeat.remoting;

import com.google.protobuf.ByteString;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.support.CommonThreadPool;
import org.apache.hertzbeat.remoting.netty.NettyClientConfig;
import org.apache.hertzbeat.remoting.netty.NettyRemotingClient;
import org.apache.hertzbeat.remoting.netty.NettyRemotingServer;
import org.apache.hertzbeat.remoting.netty.NettyServerConfig;
import org.assertj.core.util.Lists;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * test NettyRemotingClient and NettyRemotingServer
 */
public class RemotingServiceTest {

    private final CommonThreadPool threadPool = new CommonThreadPool();

    private RemotingServer remotingServer;

    private RemotingClient remotingClient;

    public RemotingServer createRemotingServer(int port) {
        NettyServerConfig nettyServerConfig = new NettyServerConfig();
        nettyServerConfig.setPort(port);
        // todo test NettyEventListener
        RemotingServer server = new NettyRemotingServer(nettyServerConfig, null, threadPool);
        server.start();
        return server;
    }

    public RemotingClient createRemotingClient(int port) {
        NettyClientConfig nettyClientConfig = new NettyClientConfig();
        nettyClientConfig.setServerHost("localhost");
        nettyClientConfig.setServerPort(port);
        RemotingClient client = new NettyRemotingClient(nettyClientConfig, null, threadPool);
        client.start();
        return client;
    }

    @BeforeEach
    public void setUp() throws InterruptedException {
        int port = 10000 + (int) (Math.random() * 10000);

        remotingServer = createRemotingServer(port);
        // await remotingServer start
        int count = 5;
        while (count-- > 0) {
            Thread.sleep(1000);
            if (remotingServer.isStart()) {
                break;
            }
        }

        if (count < 0) {
            throw new RuntimeException("remoting server start error");
        }

        remotingClient = createRemotingClient(port);
        // await remotingClient start
        count = 5;
        while (count-- > 0) {
            Thread.sleep(1000);
            if (remotingClient.isStart()) {
                break;
            }
        }

        if (count < 0) {
            throw new RuntimeException("remoting client start error");
        }
    }

    @AfterEach
    public void shutdown() {
        this.remotingClient.shutdown();
        this.remotingServer.shutdown();
    }

    @Test
    public void testSendMsg() {
        final String msg = "hello world";

        this.remotingServer.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, (ctx, message) -> {
            Assertions.assertEquals(msg, message.getMsg().toStringUtf8());
            return null;
        });

        ClusterMsg.Message request = ClusterMsg.Message.newBuilder()
                .setDirection(ClusterMsg.Direction.REQUEST)
                .setType(ClusterMsg.MessageType.HEARTBEAT)
                .setMsg(ByteString.copyFromUtf8(msg))
                .build();
        this.remotingClient.sendMsg(request);
    }

    @Test
    public void testSendMsgSync() {
        final String requestMsg = "request";
        final String responseMsg = "response";

        this.remotingServer.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, (ctx, message) -> {
            Assertions.assertEquals(requestMsg, message.getMsg().toStringUtf8());
            return ClusterMsg.Message.newBuilder()
                    .setDirection(ClusterMsg.Direction.RESPONSE)
                    .setMsg(ByteString.copyFromUtf8(responseMsg))
                    .build();
        });

        ClusterMsg.Message request = ClusterMsg.Message.newBuilder()
                .setDirection(ClusterMsg.Direction.REQUEST)
                .setType(ClusterMsg.MessageType.HEARTBEAT)
                .setMsg(ByteString.copyFromUtf8(requestMsg))
                .build();
        ClusterMsg.Message response = this.remotingClient.sendMsgSync(request, 3000);
        Assertions.assertEquals(responseMsg, response.getMsg().toStringUtf8());
    }

    @Test
    public void testNettyHook() {
        this.remotingServer.registerHook(Lists.newArrayList(
                (ctx, message) -> Assertions.assertEquals("hello world", message.getMsg().toStringUtf8())
        ));

        this.remotingServer.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, (ctx, message) ->
                ClusterMsg.Message.newBuilder()
                        .setDirection(ClusterMsg.Direction.RESPONSE)
                        .build());

        ClusterMsg.Message request = ClusterMsg.Message.newBuilder()
                .setDirection(ClusterMsg.Direction.REQUEST)
                .setType(ClusterMsg.MessageType.HEARTBEAT)
                .setMsg(ByteString.copyFromUtf8("hello world"))
                .build();
        this.remotingClient.sendMsg(request);
    }

}
