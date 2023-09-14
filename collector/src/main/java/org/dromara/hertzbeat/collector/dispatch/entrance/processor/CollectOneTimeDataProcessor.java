package org.dromara.hertzbeat.collector.dispatch.entrance.processor;

import io.netty.channel.ChannelHandlerContext;
import org.dromara.hertzbeat.collector.dispatch.entrance.CollectServer;
import org.dromara.hertzbeat.common.entity.job.Job;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingProcessor;

/**
 * handle one-time collect data response message
 */
public class CollectOneTimeDataProcessor implements NettyRemotingProcessor {
    private final CollectServer collectServer;

    public CollectOneTimeDataProcessor(final CollectServer collectServer) {
        this.collectServer = collectServer;
    }

    @Override
    public ClusterMsg.Message handle(ChannelHandlerContext ctx, ClusterMsg.Message message) {
        Job oneTimeJob = JsonUtil.fromJson(message.getMsg(), Job.class);
        collectServer.getCollectJobService().collectSyncOneTimeJobData(oneTimeJob);
        return null;
    }
}
