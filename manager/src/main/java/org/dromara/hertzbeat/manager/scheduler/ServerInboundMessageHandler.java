package org.dromara.hertzbeat.manager.scheduler;

import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelId;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.timeout.IdleState;
import io.netty.handler.timeout.IdleStateEvent;
import org.dromara.hertzbeat.common.entity.dto.CollectorInfo;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.springframework.util.StringUtils;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;


/**
 * netty inbound collector message handler
 * @author tom
 */
public class ServerInboundMessageHandler extends SimpleChannelInboundHandler<ClusterMsg.Message> {
    
    private final CollectorScheduling collectorScheduling;
    
    private final Map<ChannelId, String> channelCollectorMap = new ConcurrentHashMap<>(8);
    
    public ServerInboundMessageHandler(CollectorScheduling collectorScheduling) {
        super();
        this.collectorScheduling = collectorScheduling;
    }
    
    @Override
    protected void channelRead0(ChannelHandlerContext channelHandlerContext, ClusterMsg.Message message) throws Exception {
        Channel channel = channelHandlerContext.channel();
        String identity = message.getIdentity();
        channelCollectorMap.put(channel.id(), identity);
        collectorScheduling.holdCollectorChannel(identity, channel);
        switch (message.getType()) {
            case HEARTBEAT:
                channel.writeAndFlush(ClusterMsg.Message.newBuilder().setType(ClusterMsg.MessageType.HEARTBEAT).build());
                break;
            case GO_ONLINE:
                CollectorInfo collectorInfo = JsonUtil.fromJson(message.getMsg(), CollectorInfo.class);
                collectorScheduling.collectorGoOnline(identity, collectorInfo);
                break;
            case GO_OFFLINE:
                collectorScheduling.collectorGoOffline(identity);
                break;
        }
    }
    
    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
        IdleStateEvent event = (IdleStateEvent) evt;
        if (event.state() == IdleState.READER_IDLE) {
            // collector timeout
            ChannelId channelId = ctx.channel().id();
            String collector = channelCollectorMap.get(channelId);
            if (StringUtils.hasText(collector)) {
                collectorScheduling.collectorGoOffline(collector);
            }
        }
    }
}
