package org.dromara.hertzbeat.manager.scheduler;

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
public class ServerInboundMessageHandler extends SimpleChannelInboundHandler<ClusterMsg.Message> {
    
    private final ChannelGroup channelGroup = new DefaultChannelGroup(GlobalEventExecutor.INSTANCE);
    private final Map<String, ChannelId> collectorChannelMap = new ConcurrentHashMap<>(16);
    
    @Override
    protected void channelRead0(ChannelHandlerContext channelHandlerContext, ClusterMsg.Message message) throws Exception {
        Channel channel = channelHandlerContext.channel();
        String identity = message.getIdentity();
        collectorChannelMap.put(identity, channel.id());
        switch (message.getType()) {
            case HEARTBEAT:
                // todo 心跳
                channel.writeAndFlush(ClusterMsg.Message.newBuilder().setType(ClusterMsg.MessageType.HEARTBEAT).build());
                break;
            case GO_ONLINE:
                // todo 
                break;
            case GO_OFFLINE:
                // todo
                break;
        }
    }
    
    @Override
    public void channelActive(ChannelHandlerContext ctx) throws Exception {
        Channel channel = ctx.channel();
        channelGroup.add(channel);
    }
}
