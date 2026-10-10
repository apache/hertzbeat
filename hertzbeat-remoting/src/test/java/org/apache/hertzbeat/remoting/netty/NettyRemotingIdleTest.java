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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInboundHandlerAdapter;
import io.netty.channel.embedded.EmbeddedChannel;
import io.netty.handler.timeout.IdleStateEvent;
import org.apache.hertzbeat.common.support.CommonThreadPool;
import org.apache.hertzbeat.remoting.event.NettyEventListener;
import org.junit.jupiter.api.Test;

class NettyRemotingIdleTest {

    @Test
    void allIdleClosesAnUnregisteredChannelAndNotifiesTheListener() throws Exception {
        NettyEventListener listener = mock(NettyEventListener.class);
        EmbeddedChannel channel = channel(listener);
        try {
            channel.pipeline().fireUserEventTriggered(IdleStateEvent.ALL_IDLE_STATE_EVENT);
            assertFalse(channel.isOpen(), "An idle peer must close even when the listener has no registered client");
            verify(listener).onChannelIdle(channel);
        } finally {
            channel.finishAndReleaseAll();
        }
    }

    @Test
    void registeredListenerCanStillCloseAndReleaseItsChannel() throws Exception {
        NettyEventListener listener = mock(NettyEventListener.class);
        EmbeddedChannel channel = channel(listener);
        doAnswer(invocation -> channel.close()).when(listener).onChannelIdle(channel);
        try {
            channel.pipeline().fireUserEventTriggered(IdleStateEvent.ALL_IDLE_STATE_EVENT);
            assertFalse(channel.isOpen());
            verify(listener).onChannelIdle(channel);
            assertTrue(channel.closeFuture().isSuccess());
        } finally {
            channel.finishAndReleaseAll();
        }
    }

    @Test
    void readOrWriteIdleDoesNotCloseOrNotify() {
        NettyEventListener listener = mock(NettyEventListener.class);
        EmbeddedChannel channel = channel(listener);
        try {
            channel.pipeline().fireUserEventTriggered(IdleStateEvent.READER_IDLE_STATE_EVENT);
            channel.pipeline().fireUserEventTriggered(IdleStateEvent.WRITER_IDLE_STATE_EVENT);
            assertTrue(channel.isOpen());
            verifyNoInteractions(listener);
        } finally {
            channel.finishAndReleaseAll();
        }
    }

    @Test
    void absentListenerRetainsExistingIdlePolicy() {
        EmbeddedChannel channel = channel(null);
        try {
            channel.pipeline().fireUserEventTriggered(IdleStateEvent.ALL_IDLE_STATE_EVENT);
            assertTrue(channel.isOpen());
        } finally {
            channel.finishAndReleaseAll();
        }
    }

    private EmbeddedChannel channel(NettyEventListener listener) {
        NettyRemotingServer remoting = new NettyRemotingServer(
                new NettyServerConfig(), listener, new CommonThreadPool());
        return new EmbeddedChannel(new ChannelInboundHandlerAdapter() {
            @Override
            public void userEventTriggered(ChannelHandlerContext context, Object event) throws Exception {
                remoting.channelIdle(context, event);
            }
        });
    }
}
