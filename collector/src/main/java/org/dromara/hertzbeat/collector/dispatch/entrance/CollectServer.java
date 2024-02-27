package org.dromara.hertzbeat.collector.dispatch.entrance;


import com.google.common.util.concurrent.ThreadFactoryBuilder;
import io.netty.channel.Channel;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.collector.dispatch.DispatchProperties;
import org.dromara.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.dromara.hertzbeat.collector.dispatch.entrance.processor.*;
import org.dromara.hertzbeat.collector.dispatch.timer.TimerDispatch;
import org.dromara.hertzbeat.common.entity.dto.CollectorInfo;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.support.CommonThreadPool;
import org.dromara.hertzbeat.common.util.IpDomainUtil;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.remoting.RemotingClient;
import org.dromara.hertzbeat.remoting.event.NettyEventListener;
import org.dromara.hertzbeat.remoting.netty.NettyClientConfig;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingClient;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;

/**
 * collect server
 */
@Component
@Order(value = Ordered.LOWEST_PRECEDENCE)
@ConditionalOnProperty(prefix = "collector.dispatch.entrance.netty",
        name = "enabled", havingValue = "true")
@Slf4j
public class CollectServer implements CommandLineRunner {

    private final CollectJobService collectJobService;

    private final TimerDispatch timerDispatch;

    private RemotingClient remotingClient;

    private ScheduledExecutorService scheduledExecutor;

    public CollectServer(final CollectJobService collectJobService,
                         final TimerDispatch timerDispatch,
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
        this.timerDispatch = timerDispatch;
        this.collectJobService.setCollectServer(this);
        this.init(properties, threadPool);
    }

    private void init(final DispatchProperties properties, final CommonThreadPool threadPool) {
        NettyClientConfig nettyClientConfig = new NettyClientConfig();
        DispatchProperties.EntranceProperties.NettyProperties nettyProperties = properties.getEntrance().getNetty();
        nettyClientConfig.setServerHost(nettyProperties.getManagerHost());
        nettyClientConfig.setServerPort(nettyProperties.getManagerPort());
        this.remotingClient = new NettyRemotingClient(nettyClientConfig, new CollectNettyEventListener(), threadPool);

        this.remotingClient.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, new HeartbeatProcessor());
        this.remotingClient.registerProcessor(ClusterMsg.MessageType.ISSUE_CYCLIC_TASK, new CollectCyclicDataProcessor(this));
        this.remotingClient.registerProcessor(ClusterMsg.MessageType.DELETE_CYCLIC_TASK, new DeleteCyclicTaskProcessor(this));
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

    @Override
    public void run(String... args) throws Exception {
        this.remotingClient.start();
    }

    public class CollectNettyEventListener implements NettyEventListener {

        @Override
        public void onChannelActive(Channel channel) {
            String identity = CollectServer.this.collectJobService.getCollectorIdentity();
            String mode = CollectServer.this.collectJobService.getCollectorMode();
            CollectorInfo collectorInfo = CollectorInfo.builder()
                    .name(identity)
                    .ip(IpDomainUtil.getLocalhostIp())
                    .mode(mode)
                    // todo more info
                    .build();
            timerDispatch.goOnline();
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
                    try {
                        ClusterMsg.Message heartbeat = ClusterMsg.Message.newBuilder()
                                .setIdentity(identity)
                                .setDirection(ClusterMsg.Direction.REQUEST)
                                .setType(ClusterMsg.MessageType.HEARTBEAT)
                                .build();
                        CollectServer.this.sendMsg(heartbeat);
                        log.info("collector send cluster server heartbeat, time: {}.", System.currentTimeMillis());   
                    } catch (Exception e) {
                        log.error("schedule send heartbeat to server error.{}", e.getMessage());
                    }
                }, 5, 5, TimeUnit.SECONDS);
            }
        }

        @Override
        public void onChannelIdle(Channel channel) {
            log.info("handle idle event triggered. collector is going offline.");
        }
    }
}
