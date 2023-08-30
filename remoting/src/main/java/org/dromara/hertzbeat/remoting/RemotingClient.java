package org.dromara.hertzbeat.remoting;

import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingProcessor;

/**
 * remoting client interface
 */
public interface RemotingClient extends RemotingService {

    /**
     * register remoting processor
     * 根据不同的type注册不同的processor
     * @param messageType type
     * @param processor remoting processor
     */
    void registerProcessor(final ClusterMsg.MessageType messageType, final NettyRemotingProcessor processor);

    /**
     * send message to server
     * @param request request message
     */
    void sendMsg(final ClusterMsg.Message request);

    /**
     * send message to server and receive server message
     * @param request request message
     * @param timeoutMillis timeout millis
     * @return response message
     */
    ClusterMsg.Message sendMsgSync(final ClusterMsg.Message request, final  int timeoutMillis);
}
