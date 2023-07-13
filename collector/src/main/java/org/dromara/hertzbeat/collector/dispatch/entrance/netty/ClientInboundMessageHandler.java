package org.dromara.hertzbeat.collector.dispatch.entrance.netty;

import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;

/**
 * netty inbound collector message handler
 * @author tom
 */
public class ClientInboundMessageHandler extends SimpleChannelInboundHandler<ClusterMsg.Message> {
    
    @Override
    protected void channelRead0(ChannelHandlerContext channelHandlerContext, ClusterMsg.Message message) throws Exception {
        Channel channel = channelHandlerContext.channel();
        switch (message.getType()) {
            case HEARTBEAT:
                // todo 心跳
                channel.writeAndFlush(ClusterMsg.Message.newBuilder().setType(ClusterMsg.MessageType.HEARTBEAT).build());
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
        channel.writeAndFlush(ClusterMsg.Message.newBuilder()
                                      .setIdentity("tom").setType(ClusterMsg.MessageType.HEARTBEAT).build());
    }
}
