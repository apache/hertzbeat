package org.dromara.hertzbeat.remoting;

import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingProcessor;

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

}
