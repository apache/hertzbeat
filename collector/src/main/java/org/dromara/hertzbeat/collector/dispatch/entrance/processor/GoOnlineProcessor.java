package org.dromara.hertzbeat.collector.dispatch.entrance.processor;

import io.netty.channel.ChannelHandlerContext;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.collector.dispatch.timer.TimerDispatch;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.support.SpringContextHolder;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingProcessor;

/**
 * handle collector online message
 * 注: 这里不是重新打开与Manager的连接, 也做不到, 只是重新开启采集功能
 */
@Slf4j
public class GoOnlineProcessor implements NettyRemotingProcessor {
    
    private TimerDispatch timerDispatch;
    
    @Override
    public ClusterMsg.Message handle(ChannelHandlerContext ctx, ClusterMsg.Message message) {
        if (this.timerDispatch == null) {
            this.timerDispatch = SpringContextHolder.getBean(TimerDispatch.class);
        }
        timerDispatch.goOnline();
        log.info("receive online message and handle success");
        return ClusterMsg.Message.newBuilder()
                .setIdentity(message.getIdentity())
                .setDirection(ClusterMsg.Direction.RESPONSE)
                .setMsg(String.valueOf(CommonConstants.SUCCESS_CODE))
                .build();
    }
}
