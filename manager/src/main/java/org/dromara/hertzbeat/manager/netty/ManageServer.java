package org.dromara.hertzbeat.manager.netty;

import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.support.CommonThreadPool;
import org.dromara.hertzbeat.manager.netty.process.CollectCyclicDataProcessor;
import org.dromara.hertzbeat.manager.netty.process.CollectOneTimeDataProcessor;
import org.dromara.hertzbeat.manager.netty.process.CollectorOfflineProcessor;
import org.dromara.hertzbeat.manager.netty.process.CollectorOnlineProcessor;
import org.dromara.hertzbeat.manager.netty.process.HeartbeatProcessor;
import org.dromara.hertzbeat.manager.scheduler.CollectorAndJobScheduler;
import org.dromara.hertzbeat.manager.scheduler.SchedulerProperties;
import org.dromara.hertzbeat.remoting.RemotingServer;
import org.dromara.hertzbeat.remoting.event.NettyEventListener;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingServer;
import org.dromara.hertzbeat.remoting.netty.NettyServerConfig;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * manage server
 */
@Component
@ConditionalOnProperty(prefix = "scheduler.server",
        name = "enabled", havingValue = "true")
public class ManageServer {

    private final CollectorAndJobScheduler collectorAndJobScheduler;

    private RemotingServer remotingServer;

    public ManageServer(final SchedulerProperties schedulerProperties,
                        final CollectorAndJobScheduler collectorAndJobScheduler,
                        final CommonThreadPool threadPool) {
        this.collectorAndJobScheduler = collectorAndJobScheduler;
        this.init(schedulerProperties, threadPool);

        this.start();
    }

    public void init(final SchedulerProperties schedulerProperties, final CommonThreadPool threadPool) {
        NettyServerConfig nettyServerConfig = new NettyServerConfig();
        nettyServerConfig.setPort(schedulerProperties.getServer().getPort());
        NettyEventListener nettyEventListener = new ManageNettyEventListener(this);
        this.remotingServer = new NettyRemotingServer(nettyServerConfig, nettyEventListener, threadPool);

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

    public CollectorAndJobScheduler getCollectorAndJobScheduler() {
        return collectorAndJobScheduler;
    }
}
