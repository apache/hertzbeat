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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import io.netty.channel.DefaultEventLoopGroup;
import io.netty.channel.EventLoopGroup;
import java.lang.reflect.Field;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.RejectedExecutionException;
import org.apache.hertzbeat.common.support.CommonThreadPool;
import org.apache.hertzbeat.common.concurrent.BackgroundTaskExecutor;
import org.apache.hertzbeat.remoting.event.NettyEventListener;
import org.junit.jupiter.api.Test;

class NettyRemotingServerShutdownTest {

    @Test
    void unstartedServerStillClosesOwnedExecutorTwiceSafely() throws Exception {
        BackgroundTaskExecutor executor = mock(BackgroundTaskExecutor.class);
        NettyRemotingServer server = server(executor);
        assertDoesNotThrow(server::shutdown);
        assertDoesNotThrow(server::shutdown);
        verify(executor, times(2)).destroy();
    }

    @Test
    void bossOnlyInitializationStillClosesRemainingResources() throws Exception {
        BackgroundTaskExecutor executor = mock(BackgroundTaskExecutor.class);
        NettyRemotingServer server = server(executor);
        EventLoopGroup boss = new DefaultEventLoopGroup(1);
        try {
            field(server, "bossGroup", boss);
            assertDoesNotThrow(server::shutdown);
            assertTrue(boss.isShuttingDown());
            verify(executor).destroy();
        } finally {
            boss.shutdownGracefully();
        }
    }

    @Test
    void workerOnlyInitializationStillClosesRemainingResources() throws Exception {
        BackgroundTaskExecutor executor = mock(BackgroundTaskExecutor.class);
        NettyRemotingServer server = server(executor);
        EventLoopGroup worker = new DefaultEventLoopGroup(1);
        try {
            field(server, "workerGroup", worker);
            assertDoesNotThrow(server::shutdown);
            assertTrue(worker.isShuttingDown());
            verify(executor).destroy();
        } finally {
            worker.shutdownGracefully();
        }
    }

    @Test
    void bossFailureDoesNotSkipWorkerOrExecutor() throws Exception {
        BackgroundTaskExecutor executor = mock(BackgroundTaskExecutor.class);
        NettyRemotingServer server = server(executor);
        EventLoopGroup boss = mock(EventLoopGroup.class);
        EventLoopGroup worker = new DefaultEventLoopGroup(1);
        try {
            doThrow(new IllegalStateException("fixture close failure")).when(boss).shutdownGracefully();
            field(server, "bossGroup", boss);
            field(server, "workerGroup", worker);
            assertDoesNotThrow(server::shutdown);
            assertTrue(worker.isShuttingDown());
            verify(executor).destroy();
        } finally {
            worker.shutdownGracefully();
        }
    }

    @Test
    void workerFailureDoesNotSkipExecutor() throws Exception {
        BackgroundTaskExecutor executor = mock(BackgroundTaskExecutor.class);
        NettyRemotingServer server = server(executor);
        EventLoopGroup boss = mock(EventLoopGroup.class);
        EventLoopGroup worker = mock(EventLoopGroup.class);
        doThrow(new IllegalStateException("fixture close failure")).when(worker).shutdownGracefully();
        field(server, "bossGroup", boss);
        field(server, "workerGroup", worker);
        assertDoesNotThrow(server::shutdown);
        verify(boss).shutdownGracefully();
        verify(executor).destroy();
    }

    @Test
    void executorFailureDoesNotEscapeOrPreventRepeatedGroupClose() throws Exception {
        BackgroundTaskExecutor executor = mock(BackgroundTaskExecutor.class);
        NettyRemotingServer server = server(executor);
        EventLoopGroup boss = mock(EventLoopGroup.class);
        EventLoopGroup worker = mock(EventLoopGroup.class);
        doThrow(new IllegalStateException("fixture close failure")).doNothing().when(executor).destroy();
        field(server, "bossGroup", boss);
        field(server, "workerGroup", worker);
        assertDoesNotThrow(server::shutdown);
        assertDoesNotThrow(server::shutdown);
        verify(boss, times(2)).shutdownGracefully();
        verify(worker, times(2)).shutdownGracefully();
        verify(executor, times(2)).destroy();
    }

    @Test
    void shutdownClosesActualCommonPoolWorkerAndLongRunningLanes() throws Exception {
        CommonThreadPool executor = new CommonThreadPool();
        NettyRemotingServer server = server(executor);
        CountDownLatch started = new CountDownLatch(2);
        CountDownLatch interrupted = new CountDownLatch(2);
        CountDownLatch release = new CountDownLatch(1);
        Runnable task = () -> {
            started.countDown();
            try {
                release.await();
            } catch (InterruptedException e) {
                interrupted.countDown();
                Thread.currentThread().interrupt();
            }
        };
        try {
            executor.execute(task);
            executor.executeLongRunning(task);
            assertTrue(started.await(2, TimeUnit.SECONDS));
            server.shutdown();
            assertTrue(interrupted.await(2, TimeUnit.SECONDS));
            assertThrows(RejectedExecutionException.class, () -> executor.execute(() -> { }));
            assertThrows(RejectedExecutionException.class, () -> executor.executeLongRunning(() -> { }));
            assertDoesNotThrow(server::shutdown);
        } finally {
            release.countDown();
            executor.destroy();
        }
    }

    private NettyRemotingServer server(BackgroundTaskExecutor executor) {
        return new NettyRemotingServer(new NettyServerConfig(), mock(NettyEventListener.class), executor);
    }

    private void field(NettyRemotingServer server, String name, Object value) throws Exception {
        Field field = NettyRemotingServer.class.getDeclaredField(name);
        field.setAccessible(true);
        field.set(server, value);
    }
}
