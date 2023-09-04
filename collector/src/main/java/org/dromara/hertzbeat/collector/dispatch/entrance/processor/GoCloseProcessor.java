package org.dromara.hertzbeat.collector.dispatch.entrance.processor;

import io.netty.channel.ChannelHandlerContext;
import org.dromara.hertzbeat.collector.dispatch.CommonDispatcher;
import org.dromara.hertzbeat.collector.dispatch.entrance.CollectServer2;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.support.SpringContextHolder;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingProcessor;

/**
 * handle collector close message
 * 注: 这里会关闭采集任务, 同时断开与Manager的连接
 */
public class GoCloseProcessor implements NettyRemotingProcessor {
    private final CollectServer2 collectServer2;

    public GoCloseProcessor(final CollectServer2 collectServer2) {
        this.collectServer2 = collectServer2;
    }

    @Override
    public ClusterMsg.Message handle(ChannelHandlerContext ctx, ClusterMsg.Message message) {
        CommonDispatcher commonDispatcher = SpringContextHolder.getBean(CommonDispatcher.class);
        commonDispatcher.shutdown();
        collectServer2.shutdown();
        return null;
    }
}
