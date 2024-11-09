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

import com.fasterxml.jackson.core.type.TypeReference;
import io.netty.channel.ChannelHandlerContext;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.ProtoJsonUtil;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
import org.apache.hertzbeat.remoting.netty.NettyRemotingProcessor;

/**
 * handle one-time collect data response message
 */
@Slf4j
public class CollectOneTimeDataResponseProcessor implements NettyRemotingProcessor {

    private final ManageServer manageServer;

    public CollectOneTimeDataResponseProcessor(ManageServer manageServer) {
        this.manageServer = manageServer;
    }

    @Override
    public ClusterMsg.Message handle(ChannelHandlerContext ctx, ClusterMsg.Message message) {
        TypeReference<List<String>> typeReference = new TypeReference<>() {
        };
        List<String> jsonArr = JsonUtil.fromJson(message.getMsg(), typeReference);
        if (jsonArr == null) {
            log.error("netty receive response one time task data parse null error");
            return null;
        }
        List<CollectRep.MetricsData> metricsDataList = new ArrayList<>(jsonArr.size());
        for (String str : jsonArr) {
            CollectRep.MetricsData metricsData = (CollectRep.MetricsData) ProtoJsonUtil.toProtobuf(str,
                    CollectRep.MetricsData.newBuilder());
            if (metricsData != null) {
                metricsDataList.add(metricsData);
            }
        }
        this.manageServer.getCollectorAndJobScheduler().collectSyncJobResponse(metricsDataList);
        return null;
    }
}
