package org.dromara.hertzbeat.collector.dispatch.entrance.netty;

import io.netty.bootstrap.Bootstrap;
import io.netty.channel.Channel;
import io.netty.channel.ChannelOption;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioSocketChannel;
import io.netty.util.Attribute;
import io.netty.util.AttributeKey;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.collector.dispatch.DispatchProperties;
import org.dromara.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.dromara.hertzbeat.common.support.CommonThreadPool;
import org.dromara.hertzbeat.common.support.SpringContextHolder;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * collect server for cluster
 * @author tom
 */
@Component
@ConditionalOnProperty(prefix = "collector.dispatch.entrance.netty",
        name = "enabled", havingValue = "true")
@Slf4j
public class CollectServer {
    
    private final CollectJobService collectJobService;
    
    private final CommonThreadPool commonThreadPool;

    private EventLoopGroup workerGroup;

    private Channel channel;
    
    public CollectServer(DispatchProperties properties, CollectJobService jobService, CommonThreadPool threadPool) throws Exception {
        if (properties == null || properties.getEntrance() == null || properties.getEntrance().getNetty() == null) {
            log.error("init error, please config dispatch entrance netty props in application.yml");
            throw new IllegalArgumentException("please config dispatch entrance netty props");
        }
        DispatchProperties.EntranceProperties.NettyProperties nettyProperties = properties.getEntrance().getNetty();
        if (nettyProperties.getManagerIp() == null || nettyProperties.getManagerPort() == 0) {
            throw new IllegalArgumentException("please config dispatch entrance netty master ip and port");
        }
        this.collectJobService = jobService;
        this.commonThreadPool = threadPool;
        collectorClientStartup(nettyProperties);
    }
    
    private void collectorClientStartup(DispatchProperties.EntranceProperties.NettyProperties properties) throws Exception {
        commonThreadPool.execute(() -> {
            workerGroup = new NioEventLoopGroup();
            Bootstrap b = new Bootstrap();
            b.option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 10000);
            b.group(workerGroup)
                    .channel(NioSocketChannel.class)
                    .handler(new ProtoClientInitializer(collectJobService));
            this.channel = null;
            boolean first = true;
            while (first || this.channel == null || !this.channel.isActive()) {
                first = false;
                try {
                    this.channel = b.connect(properties.getManagerIp(), properties.getManagerPort()).sync().channel();
                    this.channel.closeFuture().sync();
                } catch (InterruptedException ignored) {
                    log.error("collector shutdown now!");
                } catch (Exception e2) {
                    log.error("collector connect cluster server error: {}. try after 10s." , e2.getMessage());
                    try {
                        Thread.sleep(10000);
                    } catch (InterruptedException ignored) {}
                }
            }
            workerGroup.shutdownGracefully();
        });
    }

    public void shutdown() {
        try {

            if (this.channel != null) {
                this.channel.close().addListener(future -> {
                    Attribute<Object> remoteAddrAttr = channel.attr(AttributeKey.valueOf("RemoteAddr"));
                    String remoteAddr = remoteAddrAttr.get() != null ? remoteAddrAttr.get().toString() : "";
                    log.info("close channel, close the connection to remote address {}", remoteAddr);
                });
            }

            this.workerGroup.shutdownGracefully();

            this.commonThreadPool.destroy();

            log.info("collect server close success");
        } catch (Exception e) {
            log.error("CollectServer shutdown exception, ", e);
        }
    }
    
}
