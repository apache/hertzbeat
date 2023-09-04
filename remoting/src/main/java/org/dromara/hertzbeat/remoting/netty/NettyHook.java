package org.dromara.hertzbeat.remoting.netty;

import io.netty.channel.ChannelHandlerContext;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;

/**
 * hook interface, handle something before request processor
 */
public interface NettyHook {

    void doBeforeRequest(ChannelHandlerContext ctx, ClusterMsg.Message message);

}
