package org.dromara.hertzbeat.collector.dispatch.entrance.processor;

import io.netty.channel.ChannelHandlerContext;
import org.dromara.hertzbeat.collector.dispatch.entrance.CollectServer2;
import org.dromara.hertzbeat.common.entity.job.Job;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingProcessor;

/**
 * handle one-time collect data response message
 */
public class CollectOneTimeDataProcessor implements NettyRemotingProcessor {
    private final CollectServer2 collectServer2;

    public CollectOneTimeDataProcessor(final CollectServer2 collectServer2) {
        this.collectServer2 = collectServer2;
    }

    @Override
    public ClusterMsg.Message handle(ChannelHandlerContext ctx, ClusterMsg.Message message) {
        Job oneTimeJob = JsonUtil.fromJson(message.getMsg(), Job.class);
        collectServer2.getCollectJobService().collectSyncJobData(oneTimeJob, ctx.channel());
        return null;
    }
}
