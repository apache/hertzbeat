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
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.support.CommonThreadPool;
import org.apache.hertzbeat.manager.scheduler.CollectorJobScheduler;
import org.apache.hertzbeat.manager.scheduler.SchedulerProperties;
import org.apache.hertzbeat.manager.scheduler.netty.process.CollectCyclicDataResponseProcessor;
import org.apache.hertzbeat.manager.scheduler.netty.process.CollectCyclicServiceDiscoveryDataResponseProcessor;
import org.apache.hertzbeat.manager.scheduler.netty.process.CollectOneTimeDataResponseProcessor;
import org.apache.hertzbeat.manager.scheduler.netty.process.CollectorOfflineProcessor;
import org.apache.hertzbeat.manager.scheduler.netty.process.CollectorOnlineProcessor;
import org.apache.hertzbeat.manager.scheduler.netty.process.HeartbeatProcessor;
import org.apache.hertzbeat.remoting.RemotingServer;
import org.apache.hertzbeat.remoting.event.NettyEventListener;
import org.apache.hertzbeat.remoting.netty.NettyRemotingServer;
import org.apache.hertzbeat.remoting.netty.NettyServerConfig;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * manage server
 */
@Component
@Order(value = Ordered.LOWEST_PRECEDENCE)
@ConditionalOnProperty(prefix = "scheduler.server",
        name = "enabled", havingValue = "true")
@Slf4j
public class ManageServer implements CommandLineRunner {

    private final CollectorJobScheduler collectorJobScheduler;

    private ScheduledExecutorService channelSchedule;

    private RemotingServer remotingServer;

    private final Map<String, Channel> clientChannelTable = new ConcurrentHashMap<>(16);

    public ManageServer(final SchedulerProperties schedulerProperties,
                        final CollectorJobScheduler collectorJobScheduler,
                        final CommonThreadPool threadPool) {
        this.collectorJobScheduler = collectorJobScheduler;
        this.collectorJobScheduler.setManageServer(this);
        this.init(schedulerProperties, threadPool);
    }

    private void init(final SchedulerProperties schedulerProperties, final CommonThreadPool threadPool) {
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
        this.remotingServer.registerProcessor(ClusterMsg.MessageType.RESPONSE_CYCLIC_TASK_DATA, new CollectCyclicDataResponseProcessor());
        this.remotingServer.registerProcessor(ClusterMsg.MessageType.RESPONSE_CYCLIC_TASK_SD_DATA, new CollectCyclicServiceDiscoveryDataResponseProcessor());

        this.channelSchedule = Executors.newSingleThreadScheduledExecutor();
    }

    public void start() {
        this.remotingServer.start();

        this.channelSchedule.scheduleAtFixedRate(() -> {
            try {
                this.clientChannelTable.forEach((collector, channel) -> {
                    if (!channel.isActive()) {
                        channel.closeFuture();
                        this.clientChannelTable.remove(collector);
                        this.collectorJobScheduler.collectorGoOffline(collector);
                    }
                });   
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }, 10, 3, TimeUnit.SECONDS);
    }

    public void shutdown() {
        this.remotingServer.shutdown();

        this.channelSchedule.shutdownNow();
    }

    public CollectorJobScheduler getCollectorAndJobScheduler() {
        return collectorJobScheduler;
    }

    public Channel getChannel(final String identity) {
        Channel channel = this.clientChannelTable.get(identity);
        if (channel == null || !channel.isActive()) {
            this.clientChannelTable.remove(identity);
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

    public void closeChannel(final String identity) {
        Channel channel = this.getChannel(identity);
        if (channel != null) {
            this.collectorJobScheduler.collectorGoOffline(identity);
            ClusterMsg.Message message = ClusterMsg.Message.newBuilder().setType(ClusterMsg.MessageType.GO_CLOSE).build();
            this.remotingServer.sendMsg(channel, message);
            this.clientChannelTable.remove(identity);
            log.info("close collect client success, identity: {}", identity);
        }
    }

    public boolean isChannelActive(final String identity) {
        Channel channel = this.clientChannelTable.get(identity);
        return channel != null && channel.isActive();
    }

    public boolean sendMsg(final String identityId, final ClusterMsg.Message message) {
        Channel channel = this.getChannel(identityId);
        if (channel != null) {
            this.remotingServer.sendMsg(channel, message);
            return true;
        }
        return false;
    }

    public ClusterMsg.Message sendMsgSync(final String identityId, final ClusterMsg.Message message) {
        Channel channel = this.getChannel(identityId);
        if (channel != null) {
            return this.remotingServer.sendMsgSync(channel, message, 3000);
        }
        return null;
    }

    @Override
    public void run(String... args) throws Exception {
        this.start();
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
                ManageServer.this.collectorJobScheduler.collectorGoOffline(identity);
                channel.close();
                log.info("handle idle event triggered. the client {} is going offline.", identity);
            }
        }
    }
}
