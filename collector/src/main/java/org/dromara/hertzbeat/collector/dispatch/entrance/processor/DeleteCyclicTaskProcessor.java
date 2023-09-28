package org.dromara.hertzbeat.collector.dispatch.entrance.processor;

import com.fasterxml.jackson.core.type.TypeReference;
import io.netty.channel.ChannelHandlerContext;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.collector.dispatch.entrance.CollectServer;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingProcessor;

import java.util.List;

/**
 * handle delete cyclic task message
 */
@Slf4j
public class DeleteCyclicTaskProcessor implements NettyRemotingProcessor {
    private final CollectServer collectServer;

    public DeleteCyclicTaskProcessor(CollectServer collectServer) {
        this.collectServer = collectServer;
    }

    @Override
    public ClusterMsg.Message handle(ChannelHandlerContext ctx, ClusterMsg.Message message) {
        TypeReference<List<Long>> typeReference = new TypeReference<>() {};
        List<Long> jobIds = JsonUtil.fromJson(message.getMsg(), typeReference);
        if (jobIds == null || jobIds.isEmpty()) {
            log.error("collector receive delete cyclic task job ids is null");
            return null;
        }
        for (Long jobId : jobIds) {
            collectServer.getCollectJobService().cancelAsyncCollectJob(jobId);   
        }
        return null;
    }
}
