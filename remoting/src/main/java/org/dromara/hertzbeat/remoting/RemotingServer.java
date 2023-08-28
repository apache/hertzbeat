package org.dromara.hertzbeat.remoting;

import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingProcessor;

/**
 * remoting server interface
 */
public interface RemotingServer extends RemotingService {

    void registerProcessor(final ClusterMsg.MessageType code, final NettyRemotingProcessor processor);

}
