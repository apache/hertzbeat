package org.dromara.hertzbeat.collector.dispatch.entrance.netty;

import io.netty.bootstrap.Bootstrap;
import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.Channel;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.channel.socket.nio.NioSocketChannel;
import io.netty.handler.logging.LogLevel;
import io.netty.handler.logging.LoggingHandler;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.collector.dispatch.DispatchProperties;
import org.dromara.hertzbeat.common.util.IpDomainUtil;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * netty client for cluster slave collector
 * @author tom
 */
@Component
@ConditionalOnProperty(prefix = "collector.dispatch.entrance,netty",
        name = "enabled", havingValue = "true")
@Slf4j
public class SlaveCollector {
    
    public SlaveCollector(DispatchProperties properties) throws Exception {
        if (properties == null || properties.getEntrance() == null || properties.getEntrance().getNetty() == null) {
            log.error("init error, please config dispatch entrance netty props in application.yml");
            throw new IllegalArgumentException("please config dispatch entrance netty props");
        }
        DispatchProperties.EntranceProperties.NettyProperties nettyProperties = properties.getEntrance().getNetty();
        if (nettyProperties.getMasterIp() == null || nettyProperties.getMasterPort() == 0) {
            throw new IllegalArgumentException("please config dispatch entrance netty master ip and port");
        }
        if (!StringUtils.hasText(nettyProperties.getIdentity())) {
            String identity = IpDomainUtil.getCurrentHostName() + "-" +  IpDomainUtil.getLocalhostIp();
            log.info("user not config this collector identity, use [host name - host ip] default: {}.", identity);
        }
        collectorClientStartup(nettyProperties);
    }
    
    private void collectorClientStartup(DispatchProperties.EntranceProperties.NettyProperties properties) throws Exception {
        
        EventLoopGroup workerGroup = new NioEventLoopGroup();
        try {
            Bootstrap b = new Bootstrap();
            b.group(workerGroup)
                    .channel(NioSocketChannel.class)
                    .handler(new ProtoClientInitializer());
            Channel ch = b.connect(properties.getMasterIp(), properties.getMasterPort()).sync().channel();
            ch.closeFuture().sync();
        } finally {
            workerGroup.shutdownGracefully();
        }
    }
    
    
}
