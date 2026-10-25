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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInboundHandlerAdapter;
import io.netty.channel.embedded.EmbeddedChannel;
import io.netty.handler.timeout.IdleStateEvent;
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.remoting.event.NettyEventListener;
import org.junit.jupiter.api.Test;

class RemotingResponseIdleContractTest {

    @Test
    void timeoutRemovalBetweenLookupStepsDoesNotThrow() throws Exception {
        Transport transport = new Transport(mock(NettyEventListener.class));
        CountDownLatch beforeLookup = new CountDownLatch(1);
        CountDownLatch releaseLookup = new CountDownLatch(1);
        transport.responseTable = new ConcurrentHashMap<>() {
            @Override
            public boolean containsKey(Object key) {
                boolean present = super.get(key) != null;
                pause(beforeLookup, releaseLookup);
                return present;
            }

            @Override
            public ResponseFuture get(Object key) {
                pause(beforeLookup, releaseLookup);
                return super.get(key);
            }
        };
        transport.responseTable.put("fixture", new ResponseFuture());
        NettyRemotingProcessor async = mock(NettyRemotingProcessor.class);
        transport.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, async);
        EmbeddedChannel channel = new EmbeddedChannel(new ChannelInboundHandlerAdapter());
        var worker = Executors.newSingleThreadExecutor();
        try {
            var response = message();
            var result = worker.submit(() -> transport.processResponseMsg(channel.pipeline().firstContext(), response));
            assertTrue(beforeLookup.await(3, TimeUnit.SECONDS));
            transport.responseTable.remove("fixture");
            releaseLookup.countDown();
            assertDoesNotThrow(() -> result.get(3, TimeUnit.SECONDS));
            verify(async).handle(channel.pipeline().firstContext(), response);
        } finally {
            releaseLookup.countDown();
            worker.shutdownNow();
            assertTrue(worker.awaitTermination(3, TimeUnit.SECONDS));
            channel.finishAndReleaseAll();
        }
    }

    @Test
    void futureCapturedBeforeRemovalCanStillReceiveItsResponse() throws Exception {
        Transport transport = new Transport(mock(NettyEventListener.class));
        CountDownLatch captured = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        ResponseFuture expected = new ResponseFuture();
        transport.responseTable = new ConcurrentHashMap<>() {
            @Override
            public ResponseFuture get(Object key) {
                ResponseFuture value = super.get(key);
                pause(captured, release);
                return value;
            }
        };
        transport.responseTable.put("fixture", expected);
        EmbeddedChannel channel = new EmbeddedChannel(new ChannelInboundHandlerAdapter());
        var worker = Executors.newSingleThreadExecutor();
        try {
            var response = message();
            var result = worker.submit(() -> transport.processResponseMsg(channel.pipeline().firstContext(), response));
            assertTrue(captured.await(3, TimeUnit.SECONDS));
            transport.responseTable.remove("fixture");
            release.countDown();
            assertDoesNotThrow(() -> result.get(3, TimeUnit.SECONDS));
            assertSame(response, expected.waitResponse(0));
        } finally {
            release.countDown();
            worker.shutdownNow();
            assertTrue(worker.awaitTermination(3, TimeUnit.SECONDS));
            channel.finishAndReleaseAll();
        }
    }

    @Test
    void normalSyncResponseCompletesFutureWithoutAsyncDispatch() throws Exception {
        Transport transport = new Transport(mock(NettyEventListener.class));
        ResponseFuture expected = new ResponseFuture();
        transport.responseTable.put("fixture", expected);
        NettyRemotingProcessor async = mock(NettyRemotingProcessor.class);
        transport.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, async);
        EmbeddedChannel channel = new EmbeddedChannel(new ChannelInboundHandlerAdapter());
        try {
            var response = message();
            transport.processResponseMsg(channel.pipeline().firstContext(), response);
            assertSame(response, expected.waitResponse(0));
            assertSame(expected, transport.responseTable.get("fixture"));
            verify(async, never()).handle(any(), any());
        } finally {
            channel.finishAndReleaseAll();
        }
    }

    @Test
    void normalAsyncResponseKeepsExistingReplyDispatch() {
        Transport transport = new Transport(mock(NettyEventListener.class));
        NettyRemotingProcessor processor = mock(NettyRemotingProcessor.class);
        var response = message();
        var reply = ClusterMsg.Message.newBuilder().setIdentity("reply").build();
        EmbeddedChannel channel = new EmbeddedChannel(new ChannelInboundHandlerAdapter());
        try {
            when(processor.handle(channel.pipeline().firstContext(), response)).thenReturn(reply);
            transport.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, processor);
            transport.processResponseMsg(channel.pipeline().firstContext(), response);
            assertSame(reply, channel.readOutbound());
        } finally {
            channel.finishAndReleaseAll();
        }
    }

    @Test
    void allIdleActuallyClosesEmbeddedChannelAndNotifiesListener() throws Exception {
        NettyEventListener listener = mock(NettyEventListener.class);
        Transport transport = new Transport(listener);
        EmbeddedChannel channel = new EmbeddedChannel(new ChannelInboundHandlerAdapter());
        try {
            assertTrue(channel.isOpen());
            transport.channelIdle(channel.pipeline().firstContext(), IdleStateEvent.ALL_IDLE_STATE_EVENT);
            assertFalse(channel.isOpen());
            verify(listener).onChannelIdle(channel);
        } finally {
            channel.finishAndReleaseAll();
        }
    }

    @Test
    void idleListenerSeesOpenChannelBeforeFallbackClose() throws Exception {
        NettyEventListener listener = mock(NettyEventListener.class);
        AtomicBoolean openDuringCallback = new AtomicBoolean();
        doAnswer(invocation -> {
            openDuringCallback.set(((Channel) invocation.getArgument(0)).isOpen());
            return null;
        }).when(listener).onChannelIdle(any());
        EmbeddedChannel channel = new EmbeddedChannel(new ChannelInboundHandlerAdapter());
        try {
            new Transport(listener).channelIdle(channel.pipeline().firstContext(), IdleStateEvent.ALL_IDLE_STATE_EVENT);
            assertTrue(openDuringCallback.get());
            assertFalse(channel.isOpen());
            verify(listener).onChannelIdle(channel);
        } finally {
            channel.finishAndReleaseAll();
        }
    }

    @Test
    void listenerOwnCloseAndFallbackCloseOnlyFireCloseCallbacksOnce() throws Exception {
        AtomicInteger inactiveEvents = new AtomicInteger();
        AtomicInteger closeCallbacks = new AtomicInteger();
        NettyEventListener listener = mock(NettyEventListener.class);
        doAnswer(invocation -> {
            ((Channel) invocation.getArgument(0)).close();
            return null;
        }).when(listener).onChannelIdle(any());
        EmbeddedChannel channel = new EmbeddedChannel(new ChannelInboundHandlerAdapter() {
            @Override
            public void channelInactive(ChannelHandlerContext context) throws Exception {
                inactiveEvents.incrementAndGet();
                super.channelInactive(context);
            }
        });
        channel.closeFuture().addListener(future -> closeCallbacks.incrementAndGet());
        try {
            new Transport(listener).channelIdle(channel.pipeline().firstContext(), IdleStateEvent.ALL_IDLE_STATE_EVENT);
            channel.runPendingTasks();
            assertFalse(channel.isOpen());
            assertEquals(1, inactiveEvents.get());
            assertEquals(1, closeCallbacks.get());
            verify(listener).onChannelIdle(channel);
        } finally {
            channel.finishAndReleaseAll();
        }
    }

    @Test
    void listenerFailureStillClosesChannelWithoutMaskingItsException() throws Exception {
        NettyEventListener listener = mock(NettyEventListener.class);
        IOException failure = new IOException("fixture listener failure");
        doThrow(failure).when(listener).onChannelIdle(any());
        EmbeddedChannel channel = new EmbeddedChannel(new ChannelInboundHandlerAdapter());
        try {
            assertSame(failure, assertThrows(IOException.class, () -> new Transport(listener)
                    .channelIdle(channel.pipeline().firstContext(), IdleStateEvent.ALL_IDLE_STATE_EVENT)));
            assertFalse(channel.isOpen());
        } finally {
            channel.finishAndReleaseAll();
        }
    }

    @Test
    void readerIdleAndMissingListenerKeepExistingBehavior() throws Exception {
        NettyEventListener listener = mock(NettyEventListener.class);
        EmbeddedChannel channel = new EmbeddedChannel(new ChannelInboundHandlerAdapter());
        try {
            new Transport(listener).channelIdle(channel.pipeline().firstContext(), IdleStateEvent.READER_IDLE_STATE_EVENT);
            assertTrue(channel.isOpen());
            verify(listener, never()).onChannelIdle(any());
            new Transport(null).channelIdle(channel.pipeline().firstContext(), IdleStateEvent.ALL_IDLE_STATE_EVENT);
            assertTrue(channel.isOpen());
        } finally {
            channel.finishAndReleaseAll();
        }
    }

    private static void pause(CountDownLatch reached, CountDownLatch release) {
        reached.countDown();
        try {
            if (!release.await(3, TimeUnit.SECONDS)) {
                throw new AssertionError("fixture lookup gate timed out");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AssertionError(e);
        }
    }

    private ClusterMsg.Message message() {
        return ClusterMsg.Message.newBuilder().setIdentity("fixture").setDirection(ClusterMsg.Direction.RESPONSE)
                .setType(ClusterMsg.MessageType.HEARTBEAT).build();
    }

    private static final class Transport extends NettyRemotingAbstract {
        private Transport(NettyEventListener listener) {
            super(listener);
        }

        @Override
        public void start() {
        }

        @Override
        public void shutdown() {
        }

        @Override
        public boolean isStart() {
            return false;
        }
    }
}
