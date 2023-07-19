package org.dromara.hertzbeat.manager.scheduler;

import com.fasterxml.jackson.core.type.TypeReference;
import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelId;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.timeout.IdleState;
import io.netty.handler.timeout.IdleStateEvent;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.dto.CollectorInfo;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.queue.CommonDataQueue;
import org.dromara.hertzbeat.common.queue.impl.KafkaCommonDataQueue;
import org.dromara.hertzbeat.common.support.SpringContextHolder;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.common.util.ProtoJsonUtil;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;


/**
 * netty inbound collector message handler
 *
 * @author tom
 */
@Slf4j
public class ServerInboundMessageHandler extends SimpleChannelInboundHandler<ClusterMsg.Message> {

    private final CollectorScheduling collectorScheduling;

    private final CollectJobScheduling collectJobScheduling;

    private final Map<ChannelId, String> channelCollectorMap = new ConcurrentHashMap<>(8);

    public ServerInboundMessageHandler(CollectorScheduling collectorScheduling, CollectJobScheduling collectJobScheduling) {
        super();
        this.collectorScheduling = collectorScheduling;
        this.collectJobScheduling = collectJobScheduling;
    }

    @Override
    protected void channelRead0(ChannelHandlerContext channelHandlerContext, ClusterMsg.Message message) throws Exception {
        Channel channel = channelHandlerContext.channel();
        String identity = message.getIdentity();
        boolean isCollectorChannelExist = collectorScheduling.isCollectorChannelExist(identity);
        channelCollectorMap.put(channel.id(), identity);
        collectorScheduling.holdCollectorChannel(identity, channel);
        switch (message.getType()) {
            case HEARTBEAT:
                // 用于处理collector连接断开后重连
                if (!isCollectorChannelExist) {
                    collectorScheduling.collectorGoOnline(identity);
                }
                channel.writeAndFlush(ClusterMsg.Message.newBuilder().setType(ClusterMsg.MessageType.HEARTBEAT).build());
                break;
            case GO_ONLINE:
                CollectorInfo collectorInfo = JsonUtil.fromJson(message.getMsg(), CollectorInfo.class);
                collectorScheduling.collectorGoOnline(identity, collectorInfo);
                break;
            case GO_OFFLINE:
                collectorScheduling.collectorGoOffline(identity);
                break;
            case RESPONSE_ONE_TIME_TASK_DATA:
                try {
                    TypeReference<List<String>> typeReference = new TypeReference<>() {
                    };
                    List<String> jsonArr = JsonUtil.fromJson(message.getMsg(), typeReference);
                    List<CollectRep.MetricsData> metricsDataList = new ArrayList<>(jsonArr.size());
                    for (String str : jsonArr) {
                        CollectRep.MetricsData metricsData = (CollectRep.MetricsData) ProtoJsonUtil.toProtobuf(str,
                                CollectRep.MetricsData.newBuilder());
                        if (metricsData != null) {
                            metricsDataList.add(metricsData);
                        }
                    }
                    collectJobScheduling.collectSyncJobResponse(metricsDataList);
                } catch (Exception e) {
                    log.error(e.getMessage(), e);
                }
                break;
            case RESPONSE_CYCLIC_TASK_DATA:
                CommonDataQueue dataQueue = SpringContextHolder.getBean(CommonDataQueue.class);
                if (dataQueue instanceof KafkaCommonDataQueue) {
                    log.error("netty receiver collector response collect data, but common data queue is kafka, please enable inMemory data queue.");
                    return;
                }
                CollectRep.MetricsData metricsData = (CollectRep.MetricsData) ProtoJsonUtil.toProtobuf(message.getMsg(),
                        CollectRep.MetricsData.newBuilder());
                if (metricsData != null) {
                    dataQueue.sendMetricsData(metricsData);
                }
                break;
        }
    }

    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) {
        IdleStateEvent event = (IdleStateEvent) evt;
        if (event.state() == IdleState.READER_IDLE) {
            // collector timeout
            ChannelId channelId = ctx.channel().id();
            String collector = channelCollectorMap.get(channelId);
            if (StringUtils.hasText(collector)) {
                collectorScheduling.collectorGoOffline(collector);
            }
            ctx.channel().closeFuture();
        }
    }
}
