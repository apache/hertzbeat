package org.dromara.hertzbeat.remoting.netty;

import io.netty.channel.ChannelHandlerContext;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;

/**
 * netty remoting processor
 */
public interface NettyRemotingProcessor {

    ClusterMsg.Message handle(ChannelHandlerContext ctx, ClusterMsg.Message message);

}
