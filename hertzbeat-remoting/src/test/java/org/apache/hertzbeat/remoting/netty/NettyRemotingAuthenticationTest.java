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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.micrometer.core.instrument.Metrics;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicBoolean;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class NettyRemotingAuthenticationTest {

    private static final String SHARED_SECRET = "cluster-authentication-secret-32!!";

    @Test
    void shouldRejectMissingAuthenticationSettingsForClusterEndpoint() {
        assertThrows(
                NullPointerException.class,
                () -> new TestRemoting(null));
    }

    @Test
    void shouldCloseChannelBeforeDispatchingUnsignedMessage() {
        TestRemoting remoting = new TestRemoting(ClusterMessageAuthConfig.Mode.REQUIRED);
        AtomicBoolean processed = new AtomicBoolean();
        remoting.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, (ctx, message) -> {
            processed.set(true);
            return null;
        });
        ChannelHandlerContext context = context();
        SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
        Metrics.addRegistry(meterRegistry);

        try {
            remoting.receive(context, request());

            verify(context).close();
            verify(context, never()).writeAndFlush(any());
            assertFalse(processed.get());
            assertEquals(
                    1.0,
                    meterRegistry.get("hertzbeat.cluster.message.authentication.rejected")
                            .tags("endpoint", "server", "reason", "unsigned")
                            .counter()
                            .count());
        } finally {
            Metrics.removeRegistry(meterRegistry);
            meterRegistry.close();
        }
    }

    @Test
    void shouldDispatchUnsignedMessageInOptionalRolloutMode() {
        TestRemoting remoting = new TestRemoting(ClusterMessageAuthConfig.Mode.OPTIONAL);
        AtomicBoolean processed = new AtomicBoolean();
        remoting.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, (ctx, message) -> {
            processed.set(true);
            return null;
        });
        ChannelHandlerContext context = context();

        remoting.receive(context, request());

        assertTrue(processed.get());
        verify(context, never()).close();
    }

    @Test
    void shouldVerifyInboundAndSignProcessorResponse() {
        TestRemoting remoting = new TestRemoting(ClusterMessageAuthConfig.Mode.OPTIONAL);
        remoting.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, (ctx, message) ->
                ClusterMsg.Message.newBuilder()
                        .setDirection(ClusterMsg.Direction.RESPONSE)
                        .setType(ClusterMsg.MessageType.HEARTBEAT)
                        .build());
        ClusterMessageAuthenticator sender =
                new ClusterMessageAuthenticator(config(ClusterMessageAuthConfig.Mode.OPTIONAL), () -> null);
        ClusterMessageAuthenticator receiver =
                new ClusterMessageAuthenticator(config(ClusterMessageAuthConfig.Mode.OPTIONAL), () -> null);
        ChannelHandlerContext context = context();

        remoting.receive(context, sender.sign(request(), com.google.protobuf.ByteString.EMPTY));

        ArgumentCaptor<ClusterMsg.Message> response = ArgumentCaptor.forClass(ClusterMsg.Message.class);
        verify(context).writeAndFlush(response.capture());
        assertTrue(receiver.verify(response.getValue(), com.google.protobuf.ByteString.EMPTY).accepted());
        verify(context, never()).close();
    }

    private ChannelHandlerContext context() {
        Channel channel = mock(Channel.class);
        when(channel.remoteAddress()).thenReturn(new InetSocketAddress("127.0.0.1", 1158));
        ChannelHandlerContext context = mock(ChannelHandlerContext.class);
        when(context.channel()).thenReturn(channel);
        return context;
    }

    private ClusterMsg.Message request() {
        return ClusterMsg.Message.newBuilder()
                .setIdentity("collector-1")
                .setDirection(ClusterMsg.Direction.REQUEST)
                .setType(ClusterMsg.MessageType.HEARTBEAT)
                .build();
    }

    private static class TestRemoting extends NettyRemotingAbstract {

        TestRemoting(ClusterMessageAuthConfig.Mode mode) {
            super(null, EndpointRole.SERVER, mode == null ? null : config(mode), () -> null);
        }

        void receive(ChannelHandlerContext context, ClusterMsg.Message message) {
            processReceiveMsg(context, message);
        }

        @Override
        public void start() {
        }

        @Override
        public void shutdown() {
        }

        @Override
        public boolean isStart() {
            return true;
        }
    }

    private static ClusterMessageAuthConfig config(ClusterMessageAuthConfig.Mode mode) {
        ClusterMessageAuthConfig config = new ClusterMessageAuthConfig();
        config.setMode(mode);
        config.setActiveKeyId("active");
        config.setActiveSecret(SHARED_SECRET);
        return config;
    }
}
