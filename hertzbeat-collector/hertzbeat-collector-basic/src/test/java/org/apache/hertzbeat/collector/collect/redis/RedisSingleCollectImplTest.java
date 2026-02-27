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

package org.apache.hertzbeat.collector.collect.redis;

import static org.apache.hertzbeat.common.constants.CommonConstants.TYPE_STRING;
import static org.junit.jupiter.api.Assertions.assertEquals;
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;
import io.lettuce.core.resource.ClientResources;
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.RedisProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link RedisCommonCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
class RedisSingleCollectImplTest {


    @Mock
    private RedisProtocol redisProtocol;

    @Mock
    private StatefulRedisConnection<String, String> connection;

    @Mock
    private RedisCommands<String, String> cmd;

    @Mock
    private RedisClient client;


    @InjectMocks
    private RedisCommonCollectImpl redisSingleCollect;

    @BeforeEach
    void setUp() {
        redisProtocol = RedisProtocol.builder()
                .host("192.168.77.100")
                .port("26379")
                .pattern("1")
                .build();
    }

    @AfterEach
    void setDown() {
        connection.close();
        client.shutdown();
    }

    @Test
    void getInstance() {
    }

    @Test
    void collect() {
        String info = """
                # CPU
                used_cpu_sys:0.544635
                used_cpu_user:0.330690
                """;
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        List<String> aliasField = new ArrayList<>();
        aliasField.add("used_cpu_sys");
        Metrics metrics = new Metrics();
        metrics.setRedis(redisProtocol);
        metrics.setName("cpu");
        metrics.setAliasFields(aliasField);
        metrics.setFields(List.of());

        MockedStatic<RedisClient> clientMockedStatic = Mockito.mockStatic(RedisClient.class);
        clientMockedStatic.when(() -> RedisClient.create(Mockito.any(ClientResources.class), Mockito.any(RedisURI.class)))
                .thenReturn(client);
        Mockito.when(client.connect()).thenReturn(connection);
        Mockito.when(connection.sync()).thenReturn(cmd);
        Mockito.when(cmd.info(metrics.getName())).thenReturn(info);
        redisSingleCollect.collect(builder, metrics);
        assertEquals(builder.getValues(0).getColumns(0), "0.544635");
        clientMockedStatic.close();
    }

    @Test
    void testCollect() {
        String redisInfoTemplate = """
                # Server
                redis_mode:%s
                redis_version:%s
                                """;
        String redisMode = "standalone";
        String version = "7.2.4";
        String redisInfo = String.format(redisInfoTemplate, redisMode, version);

        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        List<String> aliasField = new ArrayList<>();
        aliasField.add("redis_mode");
        aliasField.add("redis_version");

        List<Metrics.Field> fields = new ArrayList<>();
        fields.add(Metrics.Field.builder()
                .field("redis_mode")
                .type(TYPE_STRING)
                .build());
        fields.add(Metrics.Field.builder()
                .field("redis_version")
                .type(TYPE_STRING)
                .build());

        Metrics metrics = new Metrics();
        metrics.setName("server");
        metrics.setRedis(redisProtocol);
        metrics.setAliasFields(aliasField);
        metrics.setFields(fields);

        MockedStatic<RedisClient> clientMockedStatic = Mockito.mockStatic(RedisClient.class);
        clientMockedStatic.when(() -> RedisClient.create(Mockito.any(ClientResources.class), Mockito.any(RedisURI.class)))
                .thenReturn(client);

        Mockito.when(client.connect()).thenReturn(connection);
        Mockito.when(connection.sync()).thenReturn(cmd);
        Mockito.when(cmd.info(metrics.getName())).thenReturn(redisInfo);

        redisSingleCollect.preCheck(metrics);
        redisSingleCollect.collect(builder, metrics);
        assertEquals(builder.getCode(), CollectRep.Code.SUCCESS);
        for (CollectRep.ValueRow row : builder.getValuesList()) {
            assertEquals(row.getColumnsCount(), 2);
            assertEquals(row.getColumns(0), redisMode);
            assertEquals(row.getColumns(1), version);
        }
        clientMockedStatic.close();
        client.shutdown();
    }
}
