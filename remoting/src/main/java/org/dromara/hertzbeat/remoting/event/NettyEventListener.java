package org.dromara.hertzbeat.remoting.event;

import io.netty.channel.Channel;

/**
 * listen NettyEvent, then handle something
 */
public interface NettyEventListener {

    default void onChannelActive(final Channel channel) {
    }

    default void onChannelIdle(final Channel channel) {
    }
}
