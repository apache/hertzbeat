/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
