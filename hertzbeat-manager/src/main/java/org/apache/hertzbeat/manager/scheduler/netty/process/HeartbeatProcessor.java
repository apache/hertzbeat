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

import com.google.protobuf.ByteString;
import io.netty.channel.ChannelHandlerContext;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
import org.apache.hertzbeat.remoting.netty.NettyRemotingProcessor;

/**
 * handle heartbeat message
 */
@Slf4j
public class HeartbeatProcessor implements NettyRemotingProcessor {

    private static final ByteString LEGACY_RUNTIME_STATUS_PLACEHOLDER = ByteString.copyFromUtf8("0");

    private final ManageServer manageServer;

    public HeartbeatProcessor(final ManageServer manageServer) {
        this.manageServer = manageServer;
    }

    @Override
    public ClusterMsg.Message handle(ChannelHandlerContext ctx, ClusterMsg.Message message) {
        String identity = message.getIdentity();
        boolean isChannelActive = this.manageServer.isChannelActive(identity);
        if (!isChannelActive) {
            this.manageServer.addChannel(identity, ctx.channel());
            isChannelActive = this.manageServer.isChannelActive(identity);
            if (!isChannelActive) {
                log.info("the collector {} is not online.", identity);
                return null;
            } else {
                this.manageServer.getCollectorAndJobScheduler().collectorGoOnline(identity, null);
            }
        }
        if (log.isDebugEnabled()) {
            log.debug("server receive collector {} heartbeat", message.getIdentity());
        }
        ManagedOtelRuntimeStatus status = reportRuntimeStatus(identity, message);
        ClusterMsg.Message.Builder response = ClusterMsg.Message.newBuilder()
                .setIdentity(identity)
                .setDirection(ClusterMsg.Direction.RESPONSE)
                .setType(ClusterMsg.MessageType.HEARTBEAT);
        desiredConfig(identity, status).ifPresent(config -> response.setMsg(
                ByteString.copyFromUtf8(JsonUtil.toJson(config))));
        return response.build();
    }

    private ManagedOtelRuntimeStatus reportRuntimeStatus(String identity, ClusterMsg.Message message) {
        if (message.getMsg().isEmpty() || LEGACY_RUNTIME_STATUS_PLACEHOLDER.equals(message.getMsg())) {
            return null;
        }
        try {
            ManagedOtelRuntimeStatus status = JsonUtil.fromJson(
                    message.getMsg().toStringUtf8(), ManagedOtelRuntimeStatus.class);
            if (status != null) {
                manageServer.getRuntimeStatusRegistry().report(identity, status);
            }
            return status;
        } catch (RuntimeException error) {
            log.warn("Ignoring invalid telemetry runtime status from Collector {}: {}", identity, error.getMessage());
            return null;
        }
    }

    private Optional<ManagedOtelRuntimeConfig> desiredConfig(
            String identity, ManagedOtelRuntimeStatus status) {
        if (manageServer.getRuntimeConfigService() == null) {
            return Optional.empty();
        }
        try {
            return manageServer.getRuntimeConfigService().current(identity)
                    .filter(config -> status == null || config.revision() > status.desiredRevision());
        } catch (RuntimeException error) {
            log.warn("Unable to load optional telemetry runtime configuration for Collector {}: {}",
                    identity, error.getMessage());
            return Optional.empty();
        }
    }
}
