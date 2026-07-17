/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.remoting.netty;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.protobuf.ByteString;
import java.net.ServerSocket;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.BooleanSupplier;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.support.CommonThreadPool;
import org.apache.hertzbeat.remoting.RemotingServer;
import org.junit.jupiter.api.Test;

class NettyRemotingClientReconnectTest {

    @Test
    void reconnectsAfterManagerRestartWithinConfiguredRetryWindow() throws Exception {
        int port = freePort();
        CommonThreadPool clientPool = new CommonThreadPool();
        NettyClientConfig clientConfig = new NettyClientConfig();
        clientConfig.setServerHost("127.0.0.1");
        clientConfig.setServerPort(port);
        clientConfig.setReconnectDelayMillis(100);
        NettyRemotingClient client = new NettyRemotingClient(clientConfig, null, clientPool);
        RemotingServer manager = manager(port, new CommonThreadPool(), null);
        try {
            manager.start();
            await(manager::isStart, Duration.ofSeconds(5));
            client.start();
            await(client::isStart, Duration.ofSeconds(5));

            manager.shutdown();
            await(() -> !client.isStart(), Duration.ofSeconds(5));

            CountDownLatch heartbeat = new CountDownLatch(1);
            manager = manager(port, new CommonThreadPool(), heartbeat);
            manager.start();
            await(manager::isStart, Duration.ofSeconds(5));
            await(client::isStart, Duration.ofSeconds(5));
            client.sendMsg(ClusterMsg.Message.newBuilder()
                    .setDirection(ClusterMsg.Direction.REQUEST)
                    .setType(ClusterMsg.MessageType.HEARTBEAT)
                    .setMsg(ByteString.copyFromUtf8("reconnected"))
                    .build());

            assertTrue(heartbeat.await(5, TimeUnit.SECONDS),
                    "The existing client must resume messages after the manager restarts");
        } finally {
            client.shutdown();
            manager.shutdown();
        }
    }

    private RemotingServer manager(int port, CommonThreadPool pool, CountDownLatch heartbeat) {
        NettyServerConfig serverConfig = new NettyServerConfig();
        serverConfig.setPort(port);
        RemotingServer manager = new NettyRemotingServer(serverConfig, null, pool);
        if (heartbeat != null) {
            manager.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, (context, message) -> {
                if ("reconnected".equals(message.getMsg().toStringUtf8())) {
                    heartbeat.countDown();
                }
                return null;
            });
        }
        return manager;
    }

    private int freePort() throws Exception {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        }
    }

    private void await(BooleanSupplier condition, Duration timeout) throws Exception {
        long deadline = System.nanoTime() + timeout.toNanos();
        while (!condition.getAsBoolean() && System.nanoTime() < deadline) {
            Thread.sleep(25);
        }
        assertTrue(condition.getAsBoolean(), "condition did not become true before deadline");
    }
}
