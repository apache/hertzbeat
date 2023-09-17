package org.dromara.hertzbeat.manager.scheduler.netty.process;

import io.netty.channel.ChannelHandlerContext;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.queue.CommonDataQueue;
import org.dromara.hertzbeat.common.queue.impl.KafkaCommonDataQueue;
import org.dromara.hertzbeat.common.support.SpringContextHolder;
import org.dromara.hertzbeat.common.util.ProtoJsonUtil;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingProcessor;

/**
 * handle cyclic data response message
 */
@Slf4j
public class CollectCyclicDataResponseProcessor implements NettyRemotingProcessor {
    @Override
    public ClusterMsg.Message handle(ChannelHandlerContext ctx, ClusterMsg.Message message) {
        CommonDataQueue dataQueue = SpringContextHolder.getBean(CommonDataQueue.class);
        if (dataQueue instanceof KafkaCommonDataQueue) {
            log.error("netty receiver collector response collect data, but common data queue is kafka, please enable inMemory data queue.");
            return null;
        }
        CollectRep.MetricsData metricsData = (CollectRep.MetricsData) ProtoJsonUtil.toProtobuf(message.getMsg(),
                CollectRep.MetricsData.newBuilder());
        if (metricsData != null) {
            dataQueue.sendMetricsData(metricsData);
        }
        return null;
    }
}
