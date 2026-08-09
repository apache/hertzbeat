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

import io.netty.channel.Channel;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.calculate.CollectorAlertHandler;
import org.apache.hertzbeat.common.concurrent.BackgroundTaskExecutor;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.apache.hertzbeat.common.entity.dto.CollectorInfo;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.manager.scheduler.CollectorJobScheduler;
import org.apache.hertzbeat.manager.maintenance.CollectorLifecycleMaintenanceParticipant;
import org.apache.hertzbeat.manager.scheduler.SchedulerProperties;
import org.apache.hertzbeat.manager.scheduler.netty.process.CollectCyclicDataResponseProcessor;
import org.apache.hertzbeat.manager.scheduler.netty.process.CollectCyclicServiceDiscoveryDataResponseProcessor;
import org.apache.hertzbeat.manager.scheduler.netty.process.CollectOneTimeDataResponseProcessor;
import org.apache.hertzbeat.manager.scheduler.netty.process.CollectorOfflineProcessor;
import org.apache.hertzbeat.manager.scheduler.netty.process.CollectorOnlineProcessor;
import org.apache.hertzbeat.manager.scheduler.netty.process.HeartbeatProcessor;
import org.apache.hertzbeat.manager.scheduler.runtime.CollectorRuntimeConfigService;
import org.apache.hertzbeat.manager.scheduler.runtime.CollectorRuntimeStatusRegistry;
import org.apache.hertzbeat.remoting.RemotingServer;
import org.apache.hertzbeat.remoting.event.NettyEventListener;
import org.apache.hertzbeat.remoting.netty.NettyRemotingServer;
import org.apache.hertzbeat.remoting.netty.NettyServerConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

/**
 * manage server
 */
@Component
@Slf4j
public class ManageServer {

    private final CollectorJobScheduler collectorJobScheduler;

    private final CollectorAlertHandler collectorAlertHandler;

    private final CommonDataQueue commonDataQueue;

    private final CollectorRuntimeStatusRegistry runtimeStatusRegistry;

    private final CollectorRuntimeConfigService runtimeConfigService;

    private final CollectorLifecycleMaintenanceParticipant collectorLifecycleMaintenance;

    private ScheduledExecutorService channelSchedule;

    private ChannelCheckGeneration channelCheckGeneration;

    private final SchedulerProperties schedulerProperties;

    private final BackgroundTaskExecutor threadPool;

    private final VirtualThreadProperties virtualThreadProperties;

    private boolean channelChecksStopped;

    // Lifecycle writes must be visible to command threads; an in-flight command may finish on its captured server.
    private volatile RemotingServer remotingServer;

    private final Map<String, Channel> clientChannelTable = new ConcurrentHashMap<>(16);

    public ManageServer(final SchedulerProperties schedulerProperties,
                        final CollectorJobScheduler collectorJobScheduler,
                        final BackgroundTaskExecutor threadPool,
                        final CollectorAlertHandler collectorAlertHandler,
                        final CommonDataQueue commonDataQueue) {
        this(schedulerProperties, collectorJobScheduler, threadPool, collectorAlertHandler, commonDataQueue,
                VirtualThreadProperties.defaults());
    }

    public ManageServer(final SchedulerProperties schedulerProperties,
                        final CollectorJobScheduler collectorJobScheduler,
                        final BackgroundTaskExecutor threadPool,
                        final CollectorAlertHandler collectorAlertHandler,
                        final CommonDataQueue commonDataQueue,
                        final VirtualThreadProperties virtualThreadProperties) {
        this(schedulerProperties, collectorJobScheduler, threadPool, collectorAlertHandler, commonDataQueue,
                virtualThreadProperties, new CollectorRuntimeStatusRegistry(), null, null);
    }

    public ManageServer(final SchedulerProperties schedulerProperties,
                        final CollectorJobScheduler collectorJobScheduler,
                        final BackgroundTaskExecutor threadPool,
                        final CollectorAlertHandler collectorAlertHandler,
                        final CommonDataQueue commonDataQueue,
                        final VirtualThreadProperties virtualThreadProperties,
                        final CollectorRuntimeStatusRegistry runtimeStatusRegistry) {
        this(schedulerProperties, collectorJobScheduler, threadPool, collectorAlertHandler, commonDataQueue,
                virtualThreadProperties, runtimeStatusRegistry, null, null);
    }

    @Autowired
    public ManageServer(final SchedulerProperties schedulerProperties,
                        final CollectorJobScheduler collectorJobScheduler,
                        final BackgroundTaskExecutor threadPool,
                        final CollectorAlertHandler collectorAlertHandler,
                        final CommonDataQueue commonDataQueue,
                        final VirtualThreadProperties virtualThreadProperties,
                        final CollectorRuntimeStatusRegistry runtimeStatusRegistry,
                        final CollectorRuntimeConfigService runtimeConfigService,
                        @Nullable final CollectorLifecycleMaintenanceParticipant collectorLifecycleMaintenance) {
        this.collectorJobScheduler = collectorJobScheduler;
        this.collectorJobScheduler.setManageServer(this);
        this.collectorAlertHandler = collectorAlertHandler;
        this.commonDataQueue = commonDataQueue;
        this.runtimeStatusRegistry = runtimeStatusRegistry;
        this.runtimeConfigService = runtimeConfigService;
        this.collectorLifecycleMaintenance = collectorLifecycleMaintenance;
        this.schedulerProperties = schedulerProperties;
        this.threadPool = threadPool;
        this.virtualThreadProperties = virtualThreadProperties == null
                ? VirtualThreadProperties.defaults() : virtualThreadProperties;
    }

    private void init(final SchedulerProperties schedulerProperties, final BackgroundTaskExecutor threadPool) {
        NettyServerConfig nettyServerConfig = new NettyServerConfig();
        nettyServerConfig.setPort(schedulerProperties.getServer().getPort());
        nettyServerConfig.setIdleStateEventTriggerTime(schedulerProperties.getServer().getIdleStateEventTriggerTime());
        NettyEventListener nettyEventListener = new ManageNettyEventListener();
        this.remotingServer = new NettyRemotingServer(nettyServerConfig, nettyEventListener, threadPool);

        // register processor
        this.remotingServer.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, new HeartbeatProcessor(this));
        this.remotingServer.registerProcessor(ClusterMsg.MessageType.GO_ONLINE, new CollectorOnlineProcessor(this));
        this.remotingServer.registerProcessor(ClusterMsg.MessageType.GO_OFFLINE, new CollectorOfflineProcessor(this));
        this.remotingServer.registerProcessor(ClusterMsg.MessageType.RESPONSE_ONE_TIME_TASK_DATA, new CollectOneTimeDataResponseProcessor(this));
        this.remotingServer.registerProcessor(ClusterMsg.MessageType.RESPONSE_CYCLIC_TASK_DATA,
                new CollectCyclicDataResponseProcessor(commonDataQueue));
        this.remotingServer.registerProcessor(ClusterMsg.MessageType.RESPONSE_CYCLIC_TASK_SD_DATA,
                new CollectCyclicServiceDiscoveryDataResponseProcessor(commonDataQueue));

        this.channelSchedule = Executors.newSingleThreadScheduledExecutor();
    }

    public synchronized void start() {
        if (remotingServer != null) {
            return;
        }
        try {
            init(schedulerProperties, threadPool);
            channelChecksStopped = false;
            this.remotingServer.start();
            this.channelSchedule.scheduleAtFixedRate(this::dispatchChannelHealthCheck, 10, 3, TimeUnit.SECONDS);
        } catch (RuntimeException | Error e) {
            try {
                shutdown();
            } catch (RuntimeException | Error cleanupFailure) {
                e.addSuppressed(cleanupFailure);
            }
            throw e;
        }
    }

    public synchronized void shutdown() {
        RemotingServer currentServer = this.remotingServer;
        this.remotingServer = null;
        try {
            if (currentServer != null) {
                currentServer.shutdown();
            }
        } finally {
            if (this.channelSchedule != null) {
                this.channelSchedule.shutdownNow();
                this.channelSchedule = null;
            }
            channelChecksStopped = true;
            if (this.channelCheckGeneration != null) {
                this.channelCheckGeneration.stop();
                this.channelCheckGeneration = null;
            }
        }
    }

    public CollectorJobScheduler getCollectorAndJobScheduler() {
        return collectorJobScheduler;
    }

    public CollectorRuntimeStatusRegistry getRuntimeStatusRegistry() {
        return runtimeStatusRegistry;
    }

    public CollectorRuntimeConfigService getRuntimeConfigService() {
        return runtimeConfigService;
    }

    public Channel getChannel(final String identity) {
        Channel channel = this.clientChannelTable.get(identity);
        if (channel == null || !channel.isActive()) {
            this.clientChannelTable.remove(identity);
            this.runtimeStatusRegistry.remove(identity);
            log.error("client {} offline now", identity);
        }
        return channel;
    }

    public void addChannel(final String identity, Channel channel) {
        Channel preChannel = this.clientChannelTable.get(identity);
        if (preChannel != null && channel.isActive()) {
            preChannel.close();
        }
        this.clientChannelTable.put(identity, channel);
    }

    public void collectorOnline(String identity, CollectorInfo collectorInfo, boolean submitAlert) {
        if (collectorLifecycleMaintenance != null) {
            collectorLifecycleMaintenance.collectorOnline(identity, collectorInfo, submitAlert);
        } else {
            if (submitAlert) {
                collectorAlertHandler.online(identity);
            }
            collectorJobScheduler.collectorGoOnline(identity, collectorInfo);
        }
    }

    public void collectorOffline(String identity, boolean submitAlert) {
        if (collectorLifecycleMaintenance != null) {
            collectorLifecycleMaintenance.collectorOffline(identity, submitAlert);
        } else {
            collectorJobScheduler.collectorGoOffline(identity);
            if (submitAlert) {
                collectorAlertHandler.offline(identity);
            }
        }
    }

    public void closeChannel(final String identity) {
        RemotingServer currentServer = this.remotingServer;
        if (currentServer == null) {
            return;
        }
        this.runtimeStatusRegistry.remove(identity);
        Channel channel = this.getChannel(identity);
        if (channel != null) {
            ClusterMsg.Message message = ClusterMsg.Message.newBuilder().setType(ClusterMsg.MessageType.GO_CLOSE).build();
            currentServer.sendMsg(channel, message);
            this.clientChannelTable.remove(identity);
            collectorOffline(identity, false);
            log.info("close collect client success, identity: {}", identity);
        }
    }

    public boolean isChannelActive(final String identity) {
        Channel channel = this.clientChannelTable.get(identity);
        return channel != null && channel.isActive();
    }

    public boolean sendMsg(final String identityId, final ClusterMsg.Message message) {
        RemotingServer currentServer = this.remotingServer;
        if (currentServer == null) {
            return false;
        }
        Channel channel = this.getChannel(identityId);
        if (channel != null) {
            currentServer.sendMsg(channel, message);
            return true;
        }
        return false;
    }

    public ClusterMsg.Message sendMsgSync(final String identityId, final ClusterMsg.Message message) {
        RemotingServer currentServer = this.remotingServer;
        if (currentServer == null) {
            return null;
        }
        Channel channel = this.getChannel(identityId);
        if (channel != null) {
            return currentServer.sendMsgSync(channel, message, 3000);
        }
        return null;
    }

    synchronized void dispatchChannelHealthCheck() {
        if (channelChecksStopped) {
            return;
        }
        if (!virtualThreadProperties.enabled()) {
            runChannelHealthCheck();
            return;
        }
        if (channelCheckGeneration == null) {
            ExecutorService executor = createChannelCheckExecutor(virtualThreadProperties);
            channelCheckGeneration = new ChannelCheckGeneration(executor);
        }
        channelCheckGeneration.dispatch();
    }

    /**
     * manage netty event listener
     */
    public class ManageNettyEventListener implements NettyEventListener {

        @Override
        public void onChannelIdle(Channel channel) {
            String identity = null;
            for (Map.Entry<String, Channel> entry : ManageServer.this.clientChannelTable.entrySet()) {
                if (entry.getValue().equals(channel)) {
                    identity = entry.getKey();
                    break;
                }
            }
            if (identity != null) {
                ManageServer.this.clientChannelTable.remove(identity);
                ManageServer.this.runtimeStatusRegistry.remove(identity);
                ManageServer.this.collectorOffline(identity, false);
                channel.close();
                log.info("handle idle event triggered. the client {} is going offline.", identity);
            }
        }
    }

    private ExecutorService createChannelCheckExecutor(VirtualThreadProperties virtualThreadProperties) {
        VirtualThreadProperties properties =
                virtualThreadProperties == null ? VirtualThreadProperties.defaults() : virtualThreadProperties;
        if (!properties.enabled()) {
            return null;
        }
        return Executors.newThreadPerTaskExecutor(Thread.ofVirtual()
                .name("manager-channel-check-vt-", 0)
                .uncaughtExceptionHandler((thread, throwable) -> log.error("Channel checker has uncaughtException.", throwable))
                .factory());
    }

    private final class ChannelCheckGeneration {

        private final ExecutorService executor;
        private boolean running;
        private boolean pending;
        private boolean stopped;

        private ChannelCheckGeneration(ExecutorService executor) {
            this.executor = executor;
        }

        private synchronized void dispatch() {
            if (stopped) {
                return;
            }
            if (running) {
                pending = true;
                return;
            }
            running = true;
            submitLocked();
        }

        private void submitLocked() {
            executor.execute(() -> {
                try {
                    runChannelHealthCheck();
                } finally {
                    onComplete();
                }
            });
        }

        private synchronized void onComplete() {
            if (stopped) {
                running = false;
                pending = false;
                return;
            }
            if (pending) {
                pending = false;
                submitLocked();
                return;
            }
            running = false;
        }

        private synchronized void stop() {
            stopped = true;
            pending = false;
            executor.shutdownNow();
        }
    }

    private void runChannelHealthCheck() {
        try {
            this.clientChannelTable.forEach((collector, channel) -> {
                if (!channel.isActive()) {
                    channel.closeFuture();
                    this.clientChannelTable.remove(collector);
                    this.runtimeStatusRegistry.remove(collector);
                    this.collectorOffline(collector, true);
                }
            });
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }
}
