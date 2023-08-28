package org.dromara.hertzbeat.manager.netty;

import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.manager.scheduler.CollectorScheduling;
import org.dromara.hertzbeat.manager.scheduler.SchedulerProperties;
import org.dromara.hertzbeat.remoting.RemotingServer;
import org.dromara.hertzbeat.remoting.event.NettyEventListener;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingServer;
import org.dromara.hertzbeat.remoting.netty.NettyServerConfig;

import java.nio.channels.Channel;
import java.util.concurrent.ConcurrentHashMap;

/**
 * manage server
 */
public class ManageServer {

    private final ConcurrentHashMap<String, Channel> channelTable = new ConcurrentHashMap<>();

    private final CollectorScheduling collectorScheduling;

    private RemotingServer remotingServer;

    public ManageServer(final SchedulerProperties schedulerProperties,
                        final CollectorScheduling collectorScheduling) {
        this.collectorScheduling = collectorScheduling;
        this.init(schedulerProperties);
    }

    public void init(final SchedulerProperties schedulerProperties) {
        NettyServerConfig nettyServerConfig = new NettyServerConfig();
        nettyServerConfig.setPort(schedulerProperties.getServer().getPort());
        NettyEventListener nettyEventListener = new ManageNettyEventListener(this);
        this.remotingServer = new NettyRemotingServer(nettyServerConfig, nettyEventListener);

        this.remotingServer.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, new HeartbeatProcessor(this));
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
}
