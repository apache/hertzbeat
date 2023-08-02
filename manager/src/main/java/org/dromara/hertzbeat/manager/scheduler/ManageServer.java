package org.dromara.hertzbeat.manager.scheduler;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.epoll.Epoll;
import io.netty.channel.epoll.EpollEventLoopGroup;
import io.netty.channel.epoll.EpollServerSocketChannel;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.logging.LogLevel;
import io.netty.handler.logging.LoggingHandler;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.support.CommonThreadPool;
import org.dromara.hertzbeat.common.util.NetworkUtil;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * manage server for cluster
 *
 */
@Component
@ConditionalOnProperty(prefix = "scheduler.server",
        name = "enabled", havingValue = "true")
@Slf4j
public class ManageServer {
    
    
    private final CollectorScheduling collectorScheduling;
    
    private final CollectJobScheduling collectJobScheduling;
    
    private final CommonThreadPool commonThreadPool;
    
    public ManageServer(SchedulerProperties schedulerProperties, CollectorScheduling collectorScheduling,
                        CollectJobScheduling collectJobScheduling, CommonThreadPool threadPool) throws Exception {
        if (schedulerProperties == null || schedulerProperties.getServer() == null) {
            log.error("init error, please config scheduler server props in application.yml");
            throw new IllegalArgumentException("please config scheduler server props");
        }
        this.collectorScheduling = collectorScheduling;
        this.collectJobScheduling = collectJobScheduling;
        this.commonThreadPool = threadPool;
        serverStartup(schedulerProperties);
    }
    
    public void serverStartup(SchedulerProperties properties) {
        commonThreadPool.execute(() -> {
            Thread.currentThread().setName("cluster netty server");
            int port = properties.getServer().getPort();
            EventLoopGroup bossGroup;
            EventLoopGroup workerGroup;

            if (this.useEpoll()) {
                bossGroup = new EpollEventLoopGroup(1);
                workerGroup = new EpollEventLoopGroup();
            } else {
                bossGroup = new NioEventLoopGroup(1);
                workerGroup = new NioEventLoopGroup();
            }

            try {
                ServerBootstrap b = new ServerBootstrap();
                b.group(bossGroup, workerGroup)
                        .channel(this.useEpoll() ? EpollServerSocketChannel.class : NioServerSocketChannel.class)
                        .handler(new LoggingHandler(LogLevel.INFO))
                        .childHandler(new ProtoServerInitializer(collectorScheduling, collectJobScheduling));
                b.bind(port).sync().channel().closeFuture().sync();
            } catch (Exception e) {
                log.error(e.getMessage());
                throw new RuntimeException(e);
            } finally {
                bossGroup.shutdownGracefully();
                workerGroup.shutdownGracefully();
            } 
        });
    }
    
    private boolean useEpoll() {
        return NetworkUtil.isLinuxPlatform()
                && Epoll.isAvailable();
    }
}
