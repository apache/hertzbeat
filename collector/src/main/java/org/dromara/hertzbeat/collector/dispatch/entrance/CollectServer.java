package org.dromara.hertzbeat.collector.dispatch.entrance;


import io.netty.channel.Channel;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.collector.dispatch.DispatchProperties;
import org.dromara.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.dromara.hertzbeat.collector.dispatch.entrance.processor.CollectCyclicDataProcessor;
import org.dromara.hertzbeat.collector.dispatch.entrance.processor.CollectOneTimeDataProcessor;
import org.dromara.hertzbeat.collector.dispatch.entrance.processor.GoCloseProcessor;
import org.dromara.hertzbeat.collector.dispatch.entrance.processor.GoOfflineProcessor;
import org.dromara.hertzbeat.collector.dispatch.entrance.processor.GoOnlineProcessor;
import org.dromara.hertzbeat.collector.dispatch.entrance.processor.HeartbeatProcessor;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.support.CommonThreadPool;
import org.dromara.hertzbeat.remoting.RemotingClient;
import org.dromara.hertzbeat.remoting.event.NettyEventListener;
import org.dromara.hertzbeat.remoting.netty.NettyClientConfig;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * collect server
 */
@Component
@ConditionalOnProperty(prefix = "collector.dispatch.entrance.netty",
        name = "enabled", havingValue = "true")
@Slf4j
public class CollectServer {

    private final CollectJobService collectJobService;

    private RemotingClient remotingClient;

    public CollectServer(final CollectJobService collectJobService,
                         final DispatchProperties properties,
                         final CommonThreadPool threadPool) {
        if (properties == null || properties.getEntrance() == null || properties.getEntrance().getNetty() == null) {
            log.error("init error, please config dispatch entrance netty props in application.yml");
            throw new IllegalArgumentException("please config dispatch entrance netty props");
        }
        DispatchProperties.EntranceProperties.NettyProperties nettyProperties = properties.getEntrance().getNetty();
        if (nettyProperties.getManagerHost() == null || nettyProperties.getManagerPort() == 0) {
            throw new IllegalArgumentException("please config dispatch entrance netty master host and port");
        }
        this.collectJobService = collectJobService;

        this.init(properties, threadPool);
        this.remotingClient.start();
    }

    private void init(final DispatchProperties properties, final CommonThreadPool threadPool) {
        NettyClientConfig nettyClientConfig = new NettyClientConfig();
        DispatchProperties.EntranceProperties.NettyProperties nettyProperties = properties.getEntrance().getNetty();
        nettyClientConfig.setServerIp(nettyProperties.getManagerHost());
        nettyClientConfig.setServerPort(nettyProperties.getManagerPort());
        this.remotingClient = new NettyRemotingClient(nettyClientConfig, new CollectNettyEventListener(), threadPool);

        this.remotingClient.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, new HeartbeatProcessor());
        this.remotingClient.registerProcessor(ClusterMsg.MessageType.ISSUE_CYCLIC_TASK, new CollectCyclicDataProcessor(this));
        this.remotingClient.registerProcessor(ClusterMsg.MessageType.ISSUE_ONE_TIME_TASK, new CollectOneTimeDataProcessor(this));
        this.remotingClient.registerProcessor(ClusterMsg.MessageType.GO_OFFLINE, new GoOfflineProcessor());
        this.remotingClient.registerProcessor(ClusterMsg.MessageType.GO_ONLINE, new GoOnlineProcessor());
        this.remotingClient.registerProcessor(ClusterMsg.MessageType.GO_CLOSE, new GoCloseProcessor(this));
    }

    public void shutdown() {
        this.remotingClient.shutdown();
    }

    public CollectJobService getCollectJobService() {
        return collectJobService;
    }

    public class CollectNettyEventListener implements NettyEventListener {

        @Override
        public void onChannelActive(Channel channel) {
            CollectServer.this.collectJobService.collectorGoOnline(channel);
        }
    }
}
