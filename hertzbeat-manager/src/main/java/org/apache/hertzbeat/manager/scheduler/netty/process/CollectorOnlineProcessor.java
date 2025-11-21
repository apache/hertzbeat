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
import java.net.InetSocketAddress;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.dto.CollectorInfo;
import org.apache.hertzbeat.common.entity.dto.ServerInfo;
import org.apache.hertzbeat.common.entity.message.ClusterMessage;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
import org.apache.hertzbeat.remoting.netty.NettyRemotingProcessor;

/**
 * handle collector online message
 */
@Slf4j
public class CollectorOnlineProcessor implements NettyRemotingProcessor {
    private final ManageServer manageServer;

    public CollectorOnlineProcessor(final ManageServer manageServer) {
        this.manageServer = manageServer;
    }

    @Override
    public ClusterMessage handle(ChannelHandlerContext ctx, ClusterMessage message) {
        String collector = message.getIdentity();
        log.info("the collector {} actively requests to go online.", collector);
        String msg = message.getMsgString();
        CollectorInfo collectorInfo = JsonUtil.fromJson(msg, CollectorInfo.class);
        if (collectorInfo != null && StringUtils.isBlank(collectorInfo.getIp())) {
            // fetch remote ip address
            InetSocketAddress socketAddress = (InetSocketAddress) ctx.channel().remoteAddress();
            String clientIP = socketAddress.getAddress().getHostAddress();
            collectorInfo.setIp(clientIP);
        }
        this.manageServer.addChannel(collector, ctx.channel());
        this.manageServer.getCollectorAndJobScheduler().collectorGoOnline(collector, collectorInfo);
        ServerInfo serverInfo = ServerInfo.builder().aesSecret(AesUtil.getDefaultSecretKey()).build();
        return ClusterMessage.builder()
                .identity(message.getIdentity())
                .direction(ClusterMessage.Direction.RESPONSE)
                .msg(JsonUtil.toJsonBytes(serverInfo))
                .type(ClusterMessage.MessageType.GO_ONLINE)
                .build();
    }
}
