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

package org.apache.hertzbeat.collector.dispatch.entrance.processor;

import com.google.protobuf.ByteString;
import io.netty.channel.ChannelHandlerContext;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.timer.TimerDispatch;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.support.SpringContextHolder;
import org.apache.hertzbeat.remoting.netty.NettyRemotingProcessor;

/**
 * handle collector offline message
 * Note: The connection to Manager is not closed here, only the capture function is turned off
 */
@Slf4j
public class GoOfflineProcessor implements NettyRemotingProcessor {
    
    private TimerDispatch timerDispatch;
    
    @Override
    public ClusterMsg.Message handle(ChannelHandlerContext ctx, ClusterMsg.Message message) {
        if (this.timerDispatch == null) {
            this.timerDispatch = SpringContextHolder.getBean(TimerDispatch.class);
        }
        timerDispatch.goOffline();
        log.info("receive offline message and handle success");
        if (message.getMsg().toStringUtf8().contains(CommonConstants.COLLECTOR_AUTH_FAILED)) {
            log.error("[Auth Failed]receive client auth failed message and go offline. {}", message.getMsg());
            return null;
        }
        return ClusterMsg.Message.newBuilder()
                .setIdentity(message.getIdentity())
                .setDirection(ClusterMsg.Direction.RESPONSE)
                .setMsg(ByteString.copyFromUtf8(String.valueOf(CommonConstants.SUCCESS_CODE)))
                .build();
    }
}
