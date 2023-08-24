package org.dromara.hertzbeat.collector.dispatch.entrance.netty;

import com.fasterxml.jackson.core.type.TypeReference;
import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.collector.dispatch.CommonDispatcher;
import org.dromara.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.dromara.hertzbeat.common.entity.job.Job;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.support.SpringContextHolder;
import org.dromara.hertzbeat.common.util.JsonUtil;

import java.util.List;

/**
 * netty inbound collector message handler
 * @author tom
 */
@Slf4j
public class ClientInboundMessageHandler extends SimpleChannelInboundHandler<ClusterMsg.Message> {
    
    private final CollectJobService collectJobService;
    
    public ClientInboundMessageHandler(CollectJobService collectJobService) {
        this.collectJobService = collectJobService;
    }
    
    @Override
    protected void channelRead0(ChannelHandlerContext channelHandlerContext, ClusterMsg.Message message) throws Exception {
        Channel channel = channelHandlerContext.channel();
        CommonDispatcher commonDispatcher = SpringContextHolder.getBean(CommonDispatcher.class);
        switch (message.getType()) {
            case HEARTBEAT:
                log.info("collector receive manager server response heartbeat, time: {}. ", System.currentTimeMillis());
                break;
            case ISSUE_CYCLIC_TASK:
                Job job = JsonUtil.fromJson(message.getMsg(), Job.class);
                if (job == null) {
                    log.error("collector receive cyclic task job is null");
                    return;
                }
                collectJobService.addAsyncCollectJob(job);
                break;
            case ISSUE_ONE_TIME_TASK:
                Job oneTimeJob = JsonUtil.fromJson(message.getMsg(), Job.class);
                collectJobService.collectSyncJobData(oneTimeJob, channel);
                break;
            case DELETE_CYCLIC_TASK:
                TypeReference<List<Long>> typeReference = new TypeReference<>() {};
                List<Long> jobs = JsonUtil.fromJson(message.getMsg(), typeReference);
                if (jobs != null && !jobs.isEmpty()) {
                    for (Long jobId : jobs) {
                        collectJobService.cancelAsyncCollectJob(jobId);
                    }   
                }
                break;
            case GO_OFFLINE:
                commonDispatcher.close();
                log.info("offline collector success");
                break;
            case GO_ONLINE:
                commonDispatcher.start();
                log.info("online collector success");
                break;
        }
    }
    
    @Override
    public void channelActive(ChannelHandlerContext ctx) throws Exception {
        Channel channel = ctx.channel();
        // go online to cluster master
        collectJobService.collectorGoOnline(channel);
    }
}
