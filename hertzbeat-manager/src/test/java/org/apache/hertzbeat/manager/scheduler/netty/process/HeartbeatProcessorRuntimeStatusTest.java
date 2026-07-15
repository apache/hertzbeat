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

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.google.protobuf.ByteString;
import io.netty.channel.ChannelHandlerContext;
import java.time.Instant;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
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

    private ManagedOtelRuntimeStatus status() {
        return new ManagedOtelRuntimeStatus(
                ManagedOtelRuntimeStatus.CURRENT_SCHEMA_VERSION,
                true,
                ManagedOtelRuntimeStatus.RuntimeState.DEGRADED,
                3,
                2,
                ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED,
                1,
                Instant.parse("2026-07-15T06:00:00Z"),
                "runtime restarted"
        );
    }
}
