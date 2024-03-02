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
import org.dromara.hertzbeat.collector.dispatch.entrance.CollectServer;
import org.dromara.hertzbeat.collector.dispatch.timer.TimerDispatch;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.support.SpringContextHolder;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingProcessor;
import org.springframework.boot.SpringApplication;

/**
 * handle collector close message
 * 注: 这里会关闭采集任务, 同时断开与Manager的连接
 */
@Slf4j
public class GoCloseProcessor implements NettyRemotingProcessor {
    private final CollectServer collectServer;
    private TimerDispatch timerDispatch;

    public GoCloseProcessor(final CollectServer collectServer) {
        this.collectServer = collectServer;
    }

    @Override
    public ClusterMsg.Message handle(ChannelHandlerContext ctx, ClusterMsg.Message message) {
        if (this.timerDispatch == null) {
            this.timerDispatch = SpringContextHolder.getBean(TimerDispatch.class);
        }
        if (message.getMsg().contains(CommonConstants.COLLECTOR_AUTH_FAILED)) {
            log.error("[Auth Failed]receive client auth failed message and go close. {}", message.getMsg());
        }
        this.timerDispatch.goOffline();
        this.collectServer.shutdown();
        SpringApplication.exit(SpringContextHolder.getApplicationContext(), () -> 0);
        SpringContextHolder.shutdown();
        log.info("receive offline message and close success");
        return null;
    }
}
