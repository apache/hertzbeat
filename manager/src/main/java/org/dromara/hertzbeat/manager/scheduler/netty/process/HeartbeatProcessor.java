package org.dromara.hertzbeat.manager.scheduler.netty.process;

import io.netty.channel.ChannelHandlerContext;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.manager.scheduler.netty.ManageServer;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingProcessor;

/**
 * handle heartbeat message
 */
@Slf4j
public class HeartbeatProcessor implements NettyRemotingProcessor {

    private final ManageServer manageServer;

    public HeartbeatProcessor(final ManageServer manageServer) {
        this.manageServer = manageServer;
    }

    @Override
    public ClusterMsg.Message handle(ChannelHandlerContext ctx, ClusterMsg.Message message) {
        String identity = message.getIdentity();
        boolean isChannelExist = this.manageServer.isChannelExist(identity);
        if (!isChannelExist) {
            log.info("the collector {} has reconnected and to go online.", identity);
            this.manageServer.getCollectorAndJobScheduler().collectorGoOnline(identity, null);
        }
        if (log.isDebugEnabled()) {
            log.debug("server receive collector heartbeat");
        }
        return ClusterMsg.Message.newBuilder()
                .setType(ClusterMsg.MessageType.HEARTBEAT)
                .build();
    }
}
