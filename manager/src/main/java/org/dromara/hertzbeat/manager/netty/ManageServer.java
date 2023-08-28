package org.dromara.hertzbeat.manager.netty;

import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.manager.netty.process.CollectCyclicDataProcessor;
import org.dromara.hertzbeat.manager.netty.process.CollectOneTimeDataProcessor;
import org.dromara.hertzbeat.manager.netty.process.CollectorOfflineProcessor;
import org.dromara.hertzbeat.manager.netty.process.CollectorOnlineProcessor;
import org.dromara.hertzbeat.manager.netty.process.HeartbeatProcessor;
import org.dromara.hertzbeat.manager.scheduler.CollectJobScheduling;
import org.dromara.hertzbeat.manager.scheduler.CollectorScheduling;
import org.dromara.hertzbeat.manager.scheduler.SchedulerProperties;
import org.dromara.hertzbeat.remoting.RemotingServer;
import org.dromara.hertzbeat.remoting.event.NettyEventListener;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingServer;
import org.dromara.hertzbeat.remoting.netty.NettyServerConfig;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.nio.channels.Channel;
import java.util.concurrent.ConcurrentHashMap;

/**
 * manage server
 */
@Component
@ConditionalOnProperty(prefix = "scheduler.server",
        name = "enabled", havingValue = "true")
public class ManageServer {

    private final ConcurrentHashMap<String, Channel> channelTable = new ConcurrentHashMap<>();

    private final CollectorScheduling collectorScheduling;

    private final CollectJobScheduling collectJobScheduling;

    private RemotingServer remotingServer;

    public ManageServer(final SchedulerProperties schedulerProperties,
                        final CollectorScheduling collectorScheduling,
                        final CollectJobScheduling collectJobScheduling) {
        this.collectorScheduling = collectorScheduling;
        this.collectJobScheduling = collectJobScheduling;
        this.init(schedulerProperties);

        this.start();
    }

    public void init(final SchedulerProperties schedulerProperties) {
        NettyServerConfig nettyServerConfig = new NettyServerConfig();
        nettyServerConfig.setPort(schedulerProperties.getServer().getPort());
        NettyEventListener nettyEventListener = new ManageNettyEventListener(this);
        this.remotingServer = new NettyRemotingServer(nettyServerConfig, nettyEventListener);

        // register processor
        this.remotingServer.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, new HeartbeatProcessor(this));
        this.remotingServer.registerProcessor(ClusterMsg.MessageType.GO_ONLINE, new CollectorOnlineProcessor(this));
        this.remotingServer.registerProcessor(ClusterMsg.MessageType.GO_OFFLINE, new CollectorOfflineProcessor(this));
        this.remotingServer.registerProcessor(ClusterMsg.MessageType.RESPONSE_ONE_TIME_TASK_DATA, new CollectOneTimeDataProcessor(this));
        this.remotingServer.registerProcessor(ClusterMsg.MessageType.RESPONSE_CYCLIC_TASK_DATA, new CollectCyclicDataProcessor());
    }

    public void start() {
        this.remotingServer.start();
    }

    public ConcurrentHashMap<String, Channel> getChannelTable() {
        return channelTable;
    }

    public CollectorScheduling getCollectorScheduling() {
        return collectorScheduling;
    }

    public CollectJobScheduling getCollectJobScheduling() {
        return collectJobScheduling;
    }
}
