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

package org.apache.hertzbeat.common.queue.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;
import org.apache.hertzbeat.common.config.CommonProperties;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.serialize.RedisMetricsDataCodec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * test for {@link RedisCommonDataQueue}
 */

@ExtendWith(MockitoExtension.class)
class RedisCommonDataQueueTest {

    @Mock
    private StatefulRedisConnection<String, CollectRep.MetricsData> connection;

    @Mock
    private RedisCommands<String, CollectRep.MetricsData> syncCommands;
    
    private RedisClient redisClient;
    private CommonProperties commonProperties;
    private CommonProperties.RedisProperties redisProperties;
    private RedisCommonDataQueue redisCommonDataQueue;

    @BeforeEach
    public void setUp() {
        redisClient = mock(RedisClient.class);
        commonProperties = mock(CommonProperties.class);
        redisProperties = mock(CommonProperties.RedisProperties.class);
        CommonProperties.DataQueueProperties dataQueueProperties = mock(CommonProperties.DataQueueProperties.class);

        when(commonProperties.getQueue()).thenReturn(dataQueueProperties);
        when(dataQueueProperties.getRedis()).thenReturn(redisProperties);
        when(redisProperties.getMetricsDataQueueNameToAlerter()).thenReturn("metricsDataQueueToAlerter");
        when(redisProperties.getRedisHost()).thenReturn("localhost");
        when(redisProperties.getRedisPort()).thenReturn(6379);

        try (MockedStatic<RedisClient> mockedRedisClient = mockStatic(RedisClient.class)) {
            mockedRedisClient.when(() -> RedisClient.create(any(RedisURI.class))).thenReturn(redisClient);
            when(redisClient.connect(any(RedisMetricsDataCodec.class))).thenReturn(connection);
            when(connection.sync()).thenReturn(syncCommands);

            redisCommonDataQueue = new RedisCommonDataQueue(commonProperties);
        }
    }

    @Test
    public void testPollMetricsDataToAlerter() throws Exception {
        CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                .setMetrics("test metrics")
                .build();

        when(syncCommands.rpop("metricsDataQueueToAlerter")).thenReturn(metricsData);

        CollectRep.MetricsData actualMetricsData = redisCommonDataQueue.pollMetricsDataToAlerter();
        assertEquals(metricsData, actualMetricsData);
    }

    @Test
    public void testSendMetricsData() throws Exception {
        CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                .setMetrics("test metrics")
                .build();

        redisCommonDataQueue.sendMetricsData(metricsData);

        verify(syncCommands).lpush("metricsDataQueueToAlerter", metricsData);
    }

    @Test
    public void testDestroy() {
        redisCommonDataQueue.destroy();
        verify(connection).close();
        verify(redisClient).shutdown();
    }
}
