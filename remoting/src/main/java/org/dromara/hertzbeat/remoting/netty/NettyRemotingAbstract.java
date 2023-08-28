package org.dromara.hertzbeat.remoting.netty;

import io.netty.channel.Channel;
import io.netty.channel.epoll.Epoll;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.util.NetworkUtil;
import org.dromara.hertzbeat.remoting.RemotingService;
import org.dromara.hertzbeat.remoting.event.NettyEvent;
import org.dromara.hertzbeat.remoting.event.NettyEventExecutor;
import org.dromara.hertzbeat.remoting.event.NettyEventListener;

import java.util.HashMap;
import java.util.Map;

/**
 * netty remote abstract
 */
public abstract class NettyRemotingAbstract implements RemotingService {
    protected Map<ClusterMsg.MessageType, NettyRemotingProcessor> processorTable = new HashMap<>();

    protected final NettyEventExecutor nettyEventExecutor;

    protected NettyRemotingAbstract(NettyEventListener nettyEventListener) {
        this.nettyEventExecutor = new NettyEventExecutor(nettyEventListener);
    }

    public void registerProcessor(final ClusterMsg.MessageType messageType, final NettyRemotingProcessor processor) {
        this.processorTable.put(messageType, processor);
    }

    protected void addEvent(Channel channel) {
        NettyEvent nettyEvent = new NettyEvent(channel);
        this.nettyEventExecutor.addEvent(nettyEvent);
    }

    protected boolean useEpoll() {
        return NetworkUtil.isLinuxPlatform()
                && Epoll.isAvailable();
    }

}
