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

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.protobuf.ByteString;
import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import org.apache.hertzbeat.common.entity.dto.CollectorInfo;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.scheduler.CollectorJobScheduler;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Security regression tests for {@link CollectorOnlineProcessor}.
 */
@ExtendWith(MockitoExtension.class)
class CollectorOnlineProcessorTest {

    @Mock
    private ManageServer manageServer;

    @Mock
    private CollectorJobScheduler collectorJobScheduler;

    @Mock
    private ChannelHandlerContext channelHandlerContext;

    @Mock
    private Channel channel;

    private CollectorOnlineProcessor processor;

    @BeforeEach
    void setUp() {
        when(channelHandlerContext.channel()).thenReturn(channel);
        when(manageServer.getCollectorAndJobScheduler()).thenReturn(collectorJobScheduler);
        processor = new CollectorOnlineProcessor(manageServer);
    }

    @Test
    void shouldNotReturnAesSecretWhenCollectorGoesOnline() {
        CollectorInfo collectorInfo = CollectorInfo.builder()
                .name("collector-1")
                .ip("127.0.0.1")
                .mode("public")
                .version("1.0.0")
                .build();
        ClusterMsg.Message request = ClusterMsg.Message.newBuilder()
                .setIdentity("collector-1")
                .setType(ClusterMsg.MessageType.GO_ONLINE)
                .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(collectorInfo)))
                .build();

        ClusterMsg.Message response = processor.handle(channelHandlerContext, request);

        assertTrue(response.getMsg().isEmpty());
        verify(manageServer).addChannel("collector-1", channel);
        verify(collectorJobScheduler).collectorGoOnline("collector-1", collectorInfo);
    }
}
