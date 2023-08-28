package org.dromara.hertzbeat.remoting.netty;

import org.dromara.hertzbeat.common.entity.message.ClusterMsg;

/**
 * netty remoting processor
 */
public interface NettyRemotingProcessor {

    ClusterMsg.Message handle(ClusterMsg.Message message);

}
