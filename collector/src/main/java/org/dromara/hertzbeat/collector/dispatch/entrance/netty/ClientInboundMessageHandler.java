package org.dromara.hertzbeat.collector.dispatch.entrance.netty;

import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelId;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.channel.group.ChannelGroup;
import io.netty.channel.group.DefaultChannelGroup;
import io.netty.util.concurrent.GlobalEventExecutor;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

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
        
    }
}
