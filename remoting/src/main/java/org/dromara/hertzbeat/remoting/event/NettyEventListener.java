package org.dromara.hertzbeat.remoting.event;

import io.netty.channel.Channel;

/**
 */
public interface NettyEventListener {

    void onChannelIdle(final Channel channel);

}
