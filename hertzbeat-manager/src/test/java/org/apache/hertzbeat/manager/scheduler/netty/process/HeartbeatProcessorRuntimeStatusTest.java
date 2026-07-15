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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.google.protobuf.ByteString;
import io.netty.channel.ChannelHandlerContext;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
import org.apache.hertzbeat.manager.scheduler.runtime.CollectorRuntimeConfigService;
import org.apache.hertzbeat.manager.scheduler.runtime.CollectorRuntimeStatusRegistry;
import org.junit.jupiter.api.Test;

class HeartbeatProcessorRuntimeStatusTest {

    @Test
    void recordsRuntimeStatusWithoutChangingCollectorOnlineState() {
        ManageServer manageServer = mock(ManageServer.class);
        CollectorRuntimeStatusRegistry registry = mock(CollectorRuntimeStatusRegistry.class);
        when(manageServer.isChannelActive("edge-west")).thenReturn(true);
        when(manageServer.getRuntimeStatusRegistry()).thenReturn(registry);
        ManagedOtelRuntimeStatus status = status();
        ClusterMsg.Message heartbeat = ClusterMsg.Message.newBuilder()
                .setIdentity("edge-west")
                .setType(ClusterMsg.MessageType.HEARTBEAT)
                .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(status)))
                .build();

        new HeartbeatProcessor(manageServer).handle(mock(ChannelHandlerContext.class), heartbeat);

        verify(registry).report("edge-west", status);
    }

    @Test
    void acceptsLegacyHeartbeatWithoutRuntimeStatus() {
        ManageServer manageServer = mock(ManageServer.class);
        CollectorRuntimeStatusRegistry registry = mock(CollectorRuntimeStatusRegistry.class);
        when(manageServer.isChannelActive("legacy-edge")).thenReturn(true);
        when(manageServer.getRuntimeStatusRegistry()).thenReturn(registry);
        ClusterMsg.Message heartbeat = ClusterMsg.Message.newBuilder()
                .setIdentity("legacy-edge")
                .setType(ClusterMsg.MessageType.HEARTBEAT)
                .build();

        new HeartbeatProcessor(manageServer).handle(mock(ChannelHandlerContext.class), heartbeat);

        verifyNoInteractions(registry);
    }

    @Test
    void ignoresInvalidRuntimeStatusWithoutRejectingHeartbeat() {
        ManageServer manageServer = mock(ManageServer.class);
        CollectorRuntimeStatusRegistry registry = mock(CollectorRuntimeStatusRegistry.class);
        when(manageServer.isChannelActive("edge-invalid")).thenReturn(true);
        when(manageServer.getRuntimeStatusRegistry()).thenReturn(registry);
        ClusterMsg.Message heartbeat = ClusterMsg.Message.newBuilder()
                .setIdentity("edge-invalid")
                .setType(ClusterMsg.MessageType.HEARTBEAT)
                .setMsg(ByteString.copyFromUtf8("{not-json"))
                .build();

        new HeartbeatProcessor(manageServer).handle(mock(ChannelHandlerContext.class), heartbeat);

        verifyNoInteractions(registry);
    }

    @Test
    void returnsNewerDesiredRuntimeConfigOnExistingHeartbeatChannel() {
        ManageServer manageServer = mock(ManageServer.class);
        CollectorRuntimeStatusRegistry registry = mock(CollectorRuntimeStatusRegistry.class);
        CollectorRuntimeConfigService configService = mock(CollectorRuntimeConfigService.class);
        when(manageServer.isChannelActive("edge-config")).thenReturn(true);
        when(manageServer.getRuntimeStatusRegistry()).thenReturn(registry);
        when(manageServer.getRuntimeConfigService()).thenReturn(configService);
        ManagedOtelRuntimeConfig desired = new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION, 4, true, Duration.ofSeconds(30));
        when(configService.current("edge-config")).thenReturn(Optional.of(desired));
        ClusterMsg.Message heartbeat = ClusterMsg.Message.newBuilder()
                .setIdentity("edge-config")
                .setType(ClusterMsg.MessageType.HEARTBEAT)
                .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(status())))
                .build();

        ClusterMsg.Message response = new HeartbeatProcessor(manageServer)
                .handle(mock(ChannelHandlerContext.class), heartbeat);

        assertEquals(desired, JsonUtil.fromJson(
                response.getMsg().toStringUtf8(), ManagedOtelRuntimeConfig.class));
    }

    @Test
    void doesNotResendDesiredRuntimeConfigAlreadyObservedByCollector() {
        ManageServer manageServer = mock(ManageServer.class);
        CollectorRuntimeStatusRegistry registry = mock(CollectorRuntimeStatusRegistry.class);
        CollectorRuntimeConfigService configService = mock(CollectorRuntimeConfigService.class);
        when(manageServer.isChannelActive("edge-current")).thenReturn(true);
        when(manageServer.getRuntimeStatusRegistry()).thenReturn(registry);
        when(manageServer.getRuntimeConfigService()).thenReturn(configService);
        ManagedOtelRuntimeConfig desired = new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION, 4, true, Duration.ofSeconds(30));
        when(configService.current("edge-current")).thenReturn(Optional.of(desired));
        ClusterMsg.Message heartbeat = ClusterMsg.Message.newBuilder()
                .setIdentity("edge-current")
                .setType(ClusterMsg.MessageType.HEARTBEAT)
                .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(status(4))))
                .build();

        ClusterMsg.Message response = new HeartbeatProcessor(manageServer)
                .handle(mock(ChannelHandlerContext.class), heartbeat);

        assertEquals(ByteString.EMPTY, response.getMsg());
    }

    @Test
    void keepsHeartbeatAvailableWhenOptionalRuntimeConfigCannotBeLoaded() {
        ManageServer manageServer = mock(ManageServer.class);
        CollectorRuntimeStatusRegistry registry = mock(CollectorRuntimeStatusRegistry.class);
        CollectorRuntimeConfigService configService = mock(CollectorRuntimeConfigService.class);
        when(manageServer.isChannelActive("edge-storage-error")).thenReturn(true);
        when(manageServer.getRuntimeStatusRegistry()).thenReturn(registry);
        when(manageServer.getRuntimeConfigService()).thenReturn(configService);
        when(configService.current("edge-storage-error")).thenThrow(new IllegalStateException("storage unavailable"));
        ClusterMsg.Message heartbeat = ClusterMsg.Message.newBuilder()
                .setIdentity("edge-storage-error")
                .setType(ClusterMsg.MessageType.HEARTBEAT)
                .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(status())))
                .build();

        ClusterMsg.Message response = new HeartbeatProcessor(manageServer)
                .handle(mock(ChannelHandlerContext.class), heartbeat);

        assertEquals(ByteString.EMPTY, response.getMsg());
        verify(registry).report("edge-storage-error", status());
    }

    private ManagedOtelRuntimeStatus status() {
        return status(3);
    }

    private ManagedOtelRuntimeStatus status(long desiredRevision) {
        return new ManagedOtelRuntimeStatus(
                ManagedOtelRuntimeStatus.CURRENT_SCHEMA_VERSION,
                true,
                ManagedOtelRuntimeStatus.RuntimeState.DEGRADED,
                desiredRevision,
                2,
                ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED,
                1,
                Instant.parse("2026-07-15T06:00:00Z"),
                "runtime restarted"
        );
    }
}
