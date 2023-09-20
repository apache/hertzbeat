package org.dromara.hertzbeat.collector.dispatch.entrance.processor;

import io.netty.channel.ChannelHandlerContext;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingProcessor;

/**
 * handle heartbeat message
 */
@Slf4j
public class HeartbeatProcessor implements NettyRemotingProcessor {
    @Override
    public ClusterMsg.Message handle(ChannelHandlerContext ctx, ClusterMsg.Message message) {
        log.info("collector receive manager server response heartbeat, time: {}. ", System.currentTimeMillis());
        return null;
    }
}
