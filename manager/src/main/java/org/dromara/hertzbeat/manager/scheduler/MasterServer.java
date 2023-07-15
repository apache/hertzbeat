package org.dromara.hertzbeat.manager.scheduler;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.logging.LogLevel;
import io.netty.handler.logging.LoggingHandler;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.support.CommonThreadPool;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * netty server for cluster master
 * @author tom
 */
@Component
@ConditionalOnProperty(prefix = "scheduler.server",
        name = "enabled", havingValue = "true")
@Slf4j
public class MasterServer {
    
    
    private final CollectorScheduling collectorScheduling;
    
    private final CommonThreadPool commonThreadPool;
    
    public MasterServer(SchedulerProperties schedulerProperties, CollectorScheduling collectorScheduling, CommonThreadPool threadPool) throws Exception {
        if (schedulerProperties == null || schedulerProperties.getServer() == null) {
            log.error("init error, please config scheduler server props in application.yml");
            throw new IllegalArgumentException("please config scheduler server props");
        }
        this.collectorScheduling = collectorScheduling;
        this.commonThreadPool = threadPool;
        serverStartup(schedulerProperties);
    }
    
    public void serverStartup(SchedulerProperties properties) {
        commonThreadPool.execute(() -> {
            Thread.currentThread().setName("cluster netty server");
            int port = properties.getServer().getPort();
            EventLoopGroup bossGroup = new NioEventLoopGroup(1);
            EventLoopGroup workerGroup = new NioEventLoopGroup();
            try {
                ServerBootstrap b = new ServerBootstrap();
                b.group(bossGroup, workerGroup)
                        .channel(NioServerSocketChannel.class)
                        .handler(new LoggingHandler(LogLevel.INFO))
                        .childHandler(new ProtoServerInitializer(collectorScheduling));
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
    
    
}
