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

package org.apache.hertzbeat.manager.scheduler.netty.process;

import io.netty.channel.ChannelHandlerContext;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.support.SpringContextHolder;
import org.apache.hertzbeat.common.util.ArrowUtil;
import org.apache.hertzbeat.remoting.netty.NettyRemotingProcessor;

/**
 * handle cyclic data response message
 */
@Slf4j
public class CollectCyclicDataResponseProcessor implements NettyRemotingProcessor {
    @Override
    public ClusterMsg.Message handle(ChannelHandlerContext ctx, ClusterMsg.Message message) {
        CommonDataQueue dataQueue = SpringContextHolder.getBean(CommonDataQueue.class);
        List<CollectRep.MetricsData> metricsDataList = ArrowUtil.deserializeMetricsData(message.getMsg().toByteArray());
        for (CollectRep.MetricsData metricsData : metricsDataList) {
            if (metricsData != null) {
                dataQueue.sendMetricsData(metricsData);
            }
        }
        return null;
    }
}
