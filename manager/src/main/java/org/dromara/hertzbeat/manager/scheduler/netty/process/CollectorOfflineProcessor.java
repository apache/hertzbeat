package org.dromara.hertzbeat.manager.scheduler.netty.process;

import io.netty.channel.ChannelHandlerContext;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.manager.scheduler.netty.ManageServer;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingProcessor;

/**
 * handle collector offline message
 */
@Slf4j
public class CollectorOfflineProcessor implements NettyRemotingProcessor {

    private final ManageServer manageServer;

    public CollectorOfflineProcessor(final ManageServer manageServer) {
        this.manageServer = manageServer;
    }

    @Override
    public ClusterMsg.Message handle(ChannelHandlerContext ctx, ClusterMsg.Message message) {
        String collector = message.getIdentity();
        log.info("the collector {} actively requests to go offline.", collector);
        this.manageServer.getCollectorAndJobScheduler().collectorGoOffline(collector);
        return null;
    }
}
