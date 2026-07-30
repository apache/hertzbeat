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

package org.apache.hertzbeat.remoting.netty;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.params.provider.Arguments.arguments;

import com.google.protobuf.ByteString;
import java.io.IOException;
import java.net.ServerSocket;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import org.apache.hertzbeat.common.concurrent.BackgroundTaskExecutor;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.remoting.RemotingClient;
import org.apache.hertzbeat.remoting.RemotingServer;
import org.apache.hertzbeat.remoting.event.NettyEventListener;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class NettyRemotingCompatibilityTest {

    private static final String SHARED_SECRET = "cluster-authentication-secret-32!!";

    @ParameterizedTest(name = "{0}")
    @MethodSource("compatibleVersionPairs")
    void shouldExchangeMessagesAcrossRollingUpgradePairs(
            String description,
            ClusterMessageAuthConfig.Mode serverMode,
            ClusterMessageAuthConfig.Mode clientMode) throws Exception {
        int port = availablePort();
        BackgroundTaskExecutor serverExecutor = executor();
        BackgroundTaskExecutor clientExecutor = executor();
        CountDownLatch clientReady = new CountDownLatch(1);
        RemotingServer server = server(port, serverMode, serverExecutor);
        RemotingClient client = client(port, clientMode, clientExecutor, clientReady);
        server.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, (ctx, message) ->
                ClusterMsg.Message.newBuilder()
                        .setIdentity(message.getIdentity())
                        .setDirection(ClusterMsg.Direction.RESPONSE)
                        .setType(ClusterMsg.MessageType.HEARTBEAT)
                        .setMsg(ByteString.copyFromUtf8("response"))
                        .build());

        try {
            server.start();
            assertTrue(awaitStarted(server));
            client.start();
            assertTrue(awaitStarted(client));
            assertTrue(clientReady.await(3, TimeUnit.SECONDS));

            ClusterMsg.Message response = client.sendMsgSync(
                    ClusterMsg.Message.newBuilder()
                            .setIdentity("collector-1")
                            .setDirection(ClusterMsg.Direction.REQUEST)
                            .setType(ClusterMsg.MessageType.HEARTBEAT)
                            .setMsg(ByteString.copyFromUtf8("request"))
                            .build(),
                    3000);

            assertNotNull(response);
            assertEquals("response", response.getMsg().toStringUtf8());
        } finally {
            client.shutdown();
            server.shutdown();
        }
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("requiredModeLegacyPairs")
    void shouldRejectLegacyPeerAfterRequiredModeCutover(
            String description,
            ClusterMessageAuthConfig.Mode serverMode,
            ClusterMessageAuthConfig.Mode clientMode) throws Exception {
        int port = availablePort();
        BackgroundTaskExecutor serverExecutor = executor();
        BackgroundTaskExecutor clientExecutor = executor();
        CountDownLatch clientReady = new CountDownLatch(1);
        RemotingServer server = server(port, serverMode, serverExecutor);
        RemotingClient client = client(port, clientMode, clientExecutor, clientReady);
        server.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, (ctx, message) ->
                ClusterMsg.Message.newBuilder()
                        .setIdentity(message.getIdentity())
                        .setDirection(ClusterMsg.Direction.RESPONSE)
                        .setType(ClusterMsg.MessageType.HEARTBEAT)
                        .build());

        try {
            server.start();
            assertTrue(awaitStarted(server));
            client.start();
            assertTrue(awaitStarted(client));
            if (clientMode == ClusterMessageAuthConfig.Mode.REQUIRED) {
                assertFalse(clientReady.await(1, TimeUnit.SECONDS));
                return;
            }
            assertTrue(clientReady.await(1, TimeUnit.SECONDS));

            ClusterMsg.Message response = client.sendMsgSync(
                    ClusterMsg.Message.newBuilder()
                            .setIdentity("collector-1")
                            .setDirection(ClusterMsg.Direction.REQUEST)
                            .setType(ClusterMsg.MessageType.HEARTBEAT)
                            .build(),
                    1000);

            assertNull(response);
        } finally {
            client.shutdown();
            server.shutdown();
        }
    }

    private static Stream<Arguments> compatibleVersionPairs() {
        return Stream.of(
                arguments("old manager and old collector", null, null),
                arguments("old manager and new optional collector", null,
                        ClusterMessageAuthConfig.Mode.OPTIONAL),
                arguments("new optional manager and old collector",
                        ClusterMessageAuthConfig.Mode.OPTIONAL, null),
                arguments("new optional manager and new optional collector",
                        ClusterMessageAuthConfig.Mode.OPTIONAL,
                        ClusterMessageAuthConfig.Mode.OPTIONAL),
                arguments("new required manager and new required collector",
                        ClusterMessageAuthConfig.Mode.REQUIRED,
                        ClusterMessageAuthConfig.Mode.REQUIRED));
    }

    private static Stream<Arguments> requiredModeLegacyPairs() {
        return Stream.of(
                arguments("old manager and new required collector", null,
                        ClusterMessageAuthConfig.Mode.REQUIRED),
                arguments("new required manager and old collector",
                        ClusterMessageAuthConfig.Mode.REQUIRED, null));
    }

    private RemotingServer server(
            int port,
            ClusterMessageAuthConfig.Mode mode,
            BackgroundTaskExecutor executor) {
        NettyServerConfig config = new NettyServerConfig();
        config.setPort(port);
        return mode == null
                ? new NettyRemotingServer(config, null, executor)
                : new NettyRemotingServer(config, null, executor, authConfig(mode), () -> SHARED_SECRET);
    }

    private RemotingClient client(
            int port,
            ClusterMessageAuthConfig.Mode mode,
            BackgroundTaskExecutor executor,
            CountDownLatch ready) {
        NettyClientConfig config = new NettyClientConfig();
        config.setServerHost("127.0.0.1");
        config.setServerPort(port);
        NettyEventListener listener = new NettyEventListener() {
            @Override
            public void onChannelActive(io.netty.channel.Channel channel) {
                ready.countDown();
            }
        };
        return mode == null
                ? new NettyRemotingClient(config, listener, executor)
                : new NettyRemotingClient(
                        config,
                        listener,
                        executor,
                        authConfig(mode),
                        () -> SHARED_SECRET);
    }

    private ClusterMessageAuthConfig authConfig(ClusterMessageAuthConfig.Mode mode) {
        ClusterMessageAuthConfig config = new ClusterMessageAuthConfig();
        config.setMode(mode);
        config.setActiveKeyId("active");
        config.setHandshakeTimeout(Duration.ofMillis(200));
        return config;
    }

    private BackgroundTaskExecutor executor() {
        return new BackgroundTaskExecutor() {
            private final ExecutorService delegate = Executors.newCachedThreadPool();

            @Override
            public void execute(Runnable runnable) {
                delegate.execute(runnable);
            }

            @Override
            public void executeLongRunning(Runnable runnable) {
                delegate.execute(runnable);
            }

            @Override
            public void destroy() {
                delegate.shutdownNow();
            }
        };
    }

    private boolean awaitStarted(org.apache.hertzbeat.remoting.RemotingService service)
            throws InterruptedException {
        for (int attempt = 0; attempt < 50; attempt++) {
            if (service.isStart()) {
                return true;
            }
            Thread.sleep(50);
        }
        return false;
    }

    private int availablePort() throws IOException {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        }
    }
}
