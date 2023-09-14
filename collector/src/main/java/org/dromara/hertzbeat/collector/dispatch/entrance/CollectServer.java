package org.dromara.hertzbeat.collector.dispatch.entrance;


import com.google.common.util.concurrent.ThreadFactoryBuilder;
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
import org.dromara.hertzbeat.common.entity.dto.CollectorInfo;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.support.CommonThreadPool;
import org.dromara.hertzbeat.common.util.IpDomainUtil;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.remoting.RemotingClient;
import org.dromara.hertzbeat.remoting.event.NettyEventListener;
import org.dromara.hertzbeat.remoting.netty.NettyClientConfig;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;

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

    private ScheduledExecutorService scheduledExecutor;

    public CollectServer(final CollectJobService collectJobService,
                         final DispatchProperties properties,
                         final CommonThreadPool threadPool) {
        if (properties == null || properties.getEntrance() == null || properties.getEntrance().getNetty() == null) {
            log.error("init error, please config dispatch entrance netty props in application.yml");
            throw new IllegalArgumentException("please config dispatch entrance netty props");
        }
        DispatchProperties.EntranceProperties.NettyProperties nettyProperties = properties.getEntrance().getNetty();
        if (nettyProperties.getManagerIp() == null || nettyProperties.getManagerPort() == 0) {
            throw new IllegalArgumentException("please config dispatch entrance netty master ip and port");
        }
        this.collectJobService = collectJobService;
        this.collectJobService.setCollectServer(this);

        this.init(properties, threadPool);
        this.remotingClient.start();
    }

    private void init(final DispatchProperties properties, final CommonThreadPool threadPool) {
        NettyClientConfig nettyClientConfig = new NettyClientConfig();
        DispatchProperties.EntranceProperties.NettyProperties nettyProperties = properties.getEntrance().getNetty();
        nettyClientConfig.setServerIp(nettyProperties.getManagerIp());
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
        this.scheduledExecutor.shutdownNow();

        this.remotingClient.shutdown();
    }

    public CollectJobService getCollectJobService() {
        return collectJobService;
    }

    public void sendMsg(final ClusterMsg.Message message) {
        this.remotingClient.sendMsg(message);
    }

    public class CollectNettyEventListener implements NettyEventListener {

        @Override
        public void onChannelActive(Channel channel) {
            String identity = CollectServer.this.collectJobService.getCollectorIdentity();
            CollectorInfo collectorInfo = CollectorInfo.builder()
                    .name(identity)
                    .ip(IpDomainUtil.getLocalhostIp())
                    // todo more info
                    .build();
            // send online message
            ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                    .setIdentity(identity)
                    .setType(ClusterMsg.MessageType.GO_ONLINE)
                    .setMsg(JsonUtil.toJson(collectorInfo))
                    .build();
            CollectServer.this.sendMsg(message);

            if (scheduledExecutor == null) {
                ThreadFactory threadFactory = new ThreadFactoryBuilder()
                        .setUncaughtExceptionHandler((thread, throwable) -> {
                            log.error("HeartBeat Scheduler has uncaughtException.");
                            log.error(throwable.getMessage(), throwable);
                        })
                        .setDaemon(true)
                        .setNameFormat("heartbeat-worker-%d")
                        .build();
                scheduledExecutor = Executors.newSingleThreadScheduledExecutor(threadFactory);
                // schedule send heartbeat message
                scheduledExecutor.scheduleAtFixedRate(() -> {
                    ClusterMsg.Message heartbeat = ClusterMsg.Message.newBuilder()
                            .setIdentity(identity)
                            .setType(ClusterMsg.MessageType.HEARTBEAT)
                            .build();
                    CollectServer.this.sendMsg(heartbeat);
                    log.info("collector send cluster server heartbeat, time: {}.", System.currentTimeMillis());
                }, 5, 5, TimeUnit.SECONDS);
            }
        }

        @Override
        public void onChannelIdle(Channel channel) {
            log.info("handle idle event triggered. collector is going offline.");
        }
    }
}
