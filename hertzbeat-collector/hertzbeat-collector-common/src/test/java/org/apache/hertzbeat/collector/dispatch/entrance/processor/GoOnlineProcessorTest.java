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

import com.google.common.collect.Lists;
import com.google.protobuf.ByteString;
import io.netty.channel.ChannelHandlerContext;
import org.apache.hertzbeat.collector.timer.TimerDispatch;
import org.apache.hertzbeat.collector.timer.TimerDispatcher;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.support.SpringContextHolder;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;

import java.lang.reflect.Field;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Test for GoOnlineProcessor
 */
class GoOnlineProcessorTest {

    private GoOnlineProcessor goOnlineProcessor;
    private TimerDispatcher timerDispatcher;

    @Mock
    private ChannelHandlerContext channelHandlerContext;

    private MockedStatic<SpringContextHolder> springContextHolderMockedStatic;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        goOnlineProcessor = new GoOnlineProcessor();
        timerDispatcher = new TimerDispatcher();
        springContextHolderMockedStatic = Mockito.mockStatic(SpringContextHolder.class);
        springContextHolderMockedStatic.when(() -> SpringContextHolder.getBean(TimerDispatch.class)).thenReturn(timerDispatcher);
    }

    @AfterEach
    void tearDown() throws Exception {
        springContextHolderMockedStatic.close();
        timerDispatcher.destroy();
    }

    @Test
    void verifyTaskMapPreservation() throws Exception {
        Job job = Job.builder()
            .app("test")
            .id(12345L)
            .metrics(Lists.newArrayList(Metrics.builder().interval(100L).build()))
            .configmap(Lists.newArrayList())
            .isCyclic(true)
            .build();
        timerDispatcher.addJob(job, null);

        Field cyclicTaskMapField = TimerDispatcher.class.getDeclaredField("currentCyclicTaskMap");
        cyclicTaskMapField.setAccessible(true);
        Map<?, ?> currentCyclicTaskMap = (Map<?, ?>) cyclicTaskMapField.get(timerDispatcher);
        assertEquals(1, currentCyclicTaskMap.size(), "Task map should have 1 job initially");

        ClusterMsg.Message responseMsg = ClusterMsg.Message.newBuilder()
            .setType(ClusterMsg.MessageType.GO_ONLINE)
            .setDirection(ClusterMsg.Direction.RESPONSE)
            .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(job)))
            .setIdentity("test-identity")
            .build();
        goOnlineProcessor.handle(channelHandlerContext, responseMsg);
        assertEquals(1, currentCyclicTaskMap.size(), "Task map should still have 1 job after receiving RESPONSE");

        ClusterMsg.Message requestMsg = ClusterMsg.Message.newBuilder()
            .setType(ClusterMsg.MessageType.GO_ONLINE)
            .setDirection(ClusterMsg.Direction.REQUEST)
            .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(job)))
            .setIdentity("test-identity")
            .build();
        goOnlineProcessor.handle(channelHandlerContext, requestMsg);
        assertEquals(0, currentCyclicTaskMap.size(), "Task map should be empty after receiving REQUEST");
    }
}
