package org.dromara.hertzbeat.collector.dispatch.entrance.netty;

import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;

/**
 * netty inbound collector message handler
 * @author tom
 */
@Slf4j
public class ClientInboundMessageHandler extends SimpleChannelInboundHandler<ClusterMsg.Message> {
    
    private final CollectJobService collectJobService;
    
    public ClientInboundMessageHandler(CollectJobService collectJobService) {
        this.collectJobService = collectJobService;
    }
    
    @Override
    protected void channelRead0(ChannelHandlerContext channelHandlerContext, ClusterMsg.Message message) throws Exception {
        Channel channel = channelHandlerContext.channel();
        switch (message.getType()) {
            case HEARTBEAT:
                log.info("collector receive master server response heartbeat, time: {}. ", System.currentTimeMillis());
                break;
            case ISSUE_CYCLIC_TASK:
                // todo 
                break;
            case ISSUE_ONE_TIME_TASK:
                // todo
                break;
        }
    }
    
    @Override
    public void channelActive(ChannelHandlerContext ctx) throws Exception {
        Channel channel = ctx.channel();
        // go online to cluster master
        collectJobService.collectorGoOnline(channel);
    }
}
