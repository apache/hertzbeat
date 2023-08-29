package org.dromara.hertzbeat.remoting.event;

import io.netty.channel.Channel;

/**
 * listen NettyEvent, then handle something
 */
public interface NettyEventListener {

    void onChannelIdle(final Channel channel);

}
