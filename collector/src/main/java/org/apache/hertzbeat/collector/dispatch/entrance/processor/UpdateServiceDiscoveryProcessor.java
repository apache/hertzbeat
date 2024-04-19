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

import io.netty.channel.ChannelHandlerContext;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.dispatch.entrance.CollectServer;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.entity.sd.ServiceDiscoveryProtocol;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.remoting.netty.NettyRemotingProcessor;

import java.util.Objects;

/**
 * handle updating sd cache message
 */
@Slf4j
public record UpdateServiceDiscoveryProcessor(CollectServer collectServer) implements NettyRemotingProcessor {
    @Override
    public ClusterMsg.Message handle(ChannelHandlerContext ctx, ClusterMsg.Message message) {
        ServiceDiscoveryProtocol protocol = JsonUtil.fromJson(message.getMsg(), ServiceDiscoveryProtocol.class);
        if (Objects.isNull(protocol)) {
            log.error("collector receive sd update task message is null");
            return null;
        }

        collectServer.getCollectJobService().updateServiceProvider(protocol);
        return null;
    }
}
