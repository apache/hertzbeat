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

package org.apache.hertzbeat.manager.scheduler.netty;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

import io.netty.channel.Channel;
import io.netty.channel.ChannelFuture;
import io.netty.channel.DefaultEventLoopGroup;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.alert.calculate.CollectorAlertHandler;
import org.apache.hertzbeat.common.concurrent.BackgroundTaskExecutor;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.manager.scheduler.CollectorJobScheduler;
import org.apache.hertzbeat.manager.scheduler.SchedulerProperties;
import org.apache.hertzbeat.remoting.RemotingServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.support.GenericBeanDefinition;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Test case for {@link ManageServer}.
 */
@ExtendWith(MockitoExtension.class)
class ManageServerTest {

    @Mock
    private CollectorJobScheduler collectorJobScheduler;

    @Mock
    private BackgroundTaskExecutor commonThreadPool;

    @Mock
    private CollectorAlertHandler collectorAlertHandler;

    @Mock
    private CommonDataQueue commonDataQueue;

    private ManageServer manageServer;

    @BeforeEach
    void setUp() {
        manageServer = new ManageServer(schedulerProperties(), collectorJobScheduler, commonThreadPool,
                collectorAlertHandler, commonDataQueue, new VirtualThreadProperties());
        ReflectionTestUtils.setField(manageServer, "remotingServer", mock(RemotingServer.class));
    }

    @AfterEach
    void tearDown() {
        if (manageServer != null) {
            manageServer.shutdown();
        }
    }

    @Test
    void closingSpringContextShutsDownTransportAndOwnedExecutors() {
        RemotingServer transport = (RemotingServer) ReflectionTestUtils.getField(manageServer, "remotingServer");
        ExecutorService scheduled = (ExecutorService) ReflectionTestUtils.getField(manageServer, "channelSchedule");
        ExecutorService checks = (ExecutorService) ReflectionTestUtils.getField(manageServer, "channelCheckExecutor");
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            GenericBeanDefinition definition = new GenericBeanDefinition();
            definition.setBeanClass(ManageServer.class);
            definition.setInstanceSupplier(() -> manageServer);
            // Match a scanned component: do not infer a destroy method from its name.
            definition.setDestroyMethodName(null);
            context.registerBeanDefinition("manageServer", definition);
            context.refresh();
            assertFalse(scheduled.isShutdown());
            assertFalse(checks.isShutdown());
        }
        verify(transport).shutdown();
        assertTrue(scheduled.isShutdown());
        assertTrue(checks.isShutdown());
    }

    @Test
    void realUnboundTransportAllowsTwoShutdownCalls() throws Exception {
        ManageServer server = new ManageServer(schedulerProperties(), collectorJobScheduler, commonThreadPool,
                collectorAlertHandler, commonDataQueue, new VirtualThreadProperties());
        initializeUnboundTransportGroups(server);
        assertDoesNotThrow(server::shutdown);
        assertDoesNotThrow(server::shutdown);
        verify(commonThreadPool, times(2)).destroy();
        assertTrue(((ExecutorService) ReflectionTestUtils.getField(server, "channelSchedule")).isShutdown());
        assertTrue(((ExecutorService) ReflectionTestUtils.getField(server, "channelCheckExecutor")).isShutdown());
    }

    @Test
    void manualShutdownThenSpringCloseAllowsRepeatedTransportShutdown() throws Exception {
        ManageServer server = new ManageServer(schedulerProperties(), collectorJobScheduler, commonThreadPool,
                collectorAlertHandler, commonDataQueue, new VirtualThreadProperties());
        initializeUnboundTransportGroups(server);
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            GenericBeanDefinition definition = new GenericBeanDefinition();
            definition.setBeanClass(ManageServer.class);
            definition.setInstanceSupplier(() -> server);
            definition.setDestroyMethodName(null);
            context.registerBeanDefinition("manageServer", definition);
            context.refresh();
            assertDoesNotThrow(server::shutdown);
        }
        verify(commonThreadPool, times(2)).destroy();
        assertTrue(((ExecutorService) ReflectionTestUtils.getField(server, "channelSchedule")).isShutdown());
        assertTrue(((ExecutorService) ReflectionTestUtils.getField(server, "channelCheckExecutor")).isShutdown());
    }

    @Test
    void transportFailureDoesNotSkipManagerExecutors() {
        RemotingServer transport = (RemotingServer) ReflectionTestUtils.getField(manageServer, "remotingServer");
        ExecutorService scheduled = (ExecutorService) ReflectionTestUtils.getField(manageServer, "channelSchedule");
        ExecutorService checks = (ExecutorService) ReflectionTestUtils.getField(manageServer, "channelCheckExecutor");
        doThrow(new IllegalStateException("fixture close failure")).doNothing().when(transport).shutdown();
        assertThrows(IllegalStateException.class, manageServer::shutdown);
        assertTrue(scheduled.isShutdown());
        assertTrue(checks.isShutdown());
    }

    @Test
    void schedulerFailureDoesNotSkipChannelCheckExecutor() {
        ExecutorService original = (ExecutorService) ReflectionTestUtils.getField(manageServer, "channelSchedule");
        original.shutdownNow();
        ScheduledExecutorService scheduled = mock(ScheduledExecutorService.class);
        ReflectionTestUtils.setField(manageServer, "channelSchedule", scheduled);
        ExecutorService checks = (ExecutorService) ReflectionTestUtils.getField(manageServer, "channelCheckExecutor");
        when(scheduled.shutdownNow()).thenThrow(new IllegalStateException("fixture close failure")).thenReturn(List.of());
        assertThrows(IllegalStateException.class, manageServer::shutdown);
        assertTrue(checks.isShutdown());
    }

    @Test
    void missingTransportAndSchedulerStillCloseCheckExecutor() {
        RemotingServer transport = (RemotingServer) ReflectionTestUtils.getField(manageServer, "remotingServer");
        ScheduledExecutorService scheduled = (ScheduledExecutorService) ReflectionTestUtils.getField(manageServer, "channelSchedule");
        scheduled.shutdownNow();
        ReflectionTestUtils.setField(manageServer, "remotingServer", null);
        ReflectionTestUtils.setField(manageServer, "channelSchedule", null);
        try {
            assertDoesNotThrow(manageServer::shutdown);
            assertTrue(((ExecutorService) ReflectionTestUtils.getField(manageServer, "channelCheckExecutor")).isShutdown());
        } finally {
            ReflectionTestUtils.setField(manageServer, "remotingServer", transport);
            ReflectionTestUtils.setField(manageServer, "channelSchedule", scheduled);
        }
    }

    private void initializeUnboundTransportGroups(ManageServer server) {
        RemotingServer transport = (RemotingServer) ReflectionTestUtils.getField(server, "remotingServer");
        // Exercise the real shutdown implementation without binding a server socket.
        ReflectionTestUtils.setField(transport, "bossGroup", new DefaultEventLoopGroup(1));
        ReflectionTestUtils.setField(transport, "workerGroup", new DefaultEventLoopGroup(1));
    }

    @Test
    void dispatchChannelHealthCheckRunsOnVirtualThread() throws Exception {
        Channel channel = mock(Channel.class);
        when(channel.isActive()).thenReturn(false);
        when(channel.closeFuture()).thenReturn(mock(ChannelFuture.class));
        clientChannelTable().put("collector-1", channel);

        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);
        org.mockito.Mockito.doAnswer(invocation -> {
            virtualThread.set(Thread.currentThread().isVirtual());
            latch.countDown();
            return null;
        }).when(collectorJobScheduler).collectorGoOffline(anyString());

        manageServer.dispatchChannelHealthCheck();

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void dispatchChannelHealthCheckDoesNotRunConcurrently() throws Exception {
        Channel channel = mock(Channel.class);
        clientChannelTable().put("collector-1", channel);

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
            return true;
        }).when(channel).isActive();

        manageServer.dispatchChannelHealthCheck();
        assertTrue(firstStarted.await(5, TimeUnit.SECONDS));

        manageServer.dispatchChannelHealthCheck();
        assertFalse(secondStarted.await(200, TimeUnit.MILLISECONDS));

        releaseFirst.countDown();
        assertTrue(secondStarted.await(5, TimeUnit.SECONDS));
        assertEquals(1, maxConcurrent.get());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Channel> clientChannelTable() {
        return (Map<String, Channel>) ReflectionTestUtils.getField(manageServer, "clientChannelTable");
    }

    private SchedulerProperties schedulerProperties() {
        SchedulerProperties schedulerProperties = new SchedulerProperties();
        SchedulerProperties.ServerProperties serverProperties = new SchedulerProperties.ServerProperties();
        serverProperties.setPort(1158);
        serverProperties.setIdleStateEventTriggerTime(100);
        schedulerProperties.setServer(serverProperties);
        return schedulerProperties;
    }
}
