package org.dromara.hertzbeat.manager.scheduler;

import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelId;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.channel.group.ChannelGroup;
import io.netty.channel.group.DefaultChannelGroup;
import io.netty.util.concurrent.GlobalEventExecutor;
import org.dromara.hertzbeat.common.entity.dto.CollectorInfo;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.manager.service.CollectorService;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * netty inbound collector message handler
 * @author tom
 */
public class ServerInboundMessageHandler extends SimpleChannelInboundHandler<ClusterMsg.Message> {
    
    private final CollectorService collectorService;
    
    public ServerInboundMessageHandler(CollectorService collectorService) {
        super();
        this.collectorService = collectorService;
    }
    
    @Override
    protected void channelRead0(ChannelHandlerContext channelHandlerContext, ClusterMsg.Message message) throws Exception {
        Channel channel = channelHandlerContext.channel();
        String identity = message.getIdentity();
        collectorService.holdCollectorChannel(identity, channel);
        switch (message.getType()) {
            case HEARTBEAT:
                collectorService.collectorHeartbeat(identity);
                channel.writeAndFlush(ClusterMsg.Message.newBuilder().setType(ClusterMsg.MessageType.HEARTBEAT).build());
                break;
            case GO_ONLINE:
                CollectorInfo collectorInfo = JsonUtil.fromJson(message.getMsg(), CollectorInfo.class);
                collectorService.collectorGoOnline(identity, collectorInfo);
                break;
            case GO_OFFLINE:
                collectorService.collectorGoOffline(identity);
                break;
        }
    }
}
