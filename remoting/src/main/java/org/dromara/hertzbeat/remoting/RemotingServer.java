package org.dromara.hertzbeat.remoting;

import io.netty.channel.Channel;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.remoting.netty.NettyHook;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingProcessor;

import java.util.List;

/**
 * remoting server interface
 */
public interface RemotingServer extends RemotingService {

    /**
     * register remoting processor
     * 根据不同的type注册不同的processor
     * @param messageType type
     * @param processor remoting processor
     */
    void registerProcessor(final ClusterMsg.MessageType messageType, final NettyRemotingProcessor processor);

    /**
     * send message to client
     * @param channel client channel
     * @param request request message
     */
    void sendMsg(final Channel channel, final ClusterMsg.Message request);

    /**
     * send message to client and receive client message
     * @param channel client channel
     * @param request request message
     * @param timeoutMillis timeout millis
     * @return response message
     */
    ClusterMsg.Message sendMsgSync(final Channel channel, final ClusterMsg.Message request, final  int timeoutMillis);

    void registerHook(List<NettyHook> nettyHookList);
}
