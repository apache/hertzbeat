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

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.google.protobuf.ByteString;
import java.time.Duration;
import java.util.Optional;
import org.apache.hertzbeat.collector.dispatch.CollectorRuntimeConfigApplier;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

class HeartbeatProcessorRuntimeConfigTest {

    @Test
    void appliesVersionedDesiredConfigFromHeartbeatResponse() {
        CollectorRuntimeConfigApplier applier = mock(CollectorRuntimeConfigApplier.class);
        ManagedOtelRuntimeConfig config = new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION, 2, true, Duration.ofSeconds(30));
        ClusterMsg.Message response = ClusterMsg.Message.newBuilder()
                .setType(ClusterMsg.MessageType.HEARTBEAT)
                .setDirection(ClusterMsg.Direction.RESPONSE)
                .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(config)))
                .build();

        new HeartbeatProcessor(Optional.of(applier)).handle(null, response);

        verify(applier).apply(config);
    }

    @Test
    void ignoresMalformedOptionalConfig() {
        CollectorRuntimeConfigApplier applier = mock(CollectorRuntimeConfigApplier.class);
        ClusterMsg.Message response = ClusterMsg.Message.newBuilder()
                .setType(ClusterMsg.MessageType.HEARTBEAT)
                .setMsg(ByteString.copyFromUtf8("{invalid"))
                .build();

        new HeartbeatProcessor(Optional.of(applier)).handle(null, response);

        verifyNoInteractions(applier);
    }
}
