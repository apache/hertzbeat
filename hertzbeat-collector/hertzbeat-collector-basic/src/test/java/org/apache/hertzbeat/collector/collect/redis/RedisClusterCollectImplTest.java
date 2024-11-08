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
import io.lettuce.core.RedisURI;
import io.lettuce.core.cluster.RedisClusterClient;
import io.lettuce.core.cluster.api.StatefulRedisClusterConnection;
import io.lettuce.core.cluster.api.sync.RedisAdvancedClusterCommands;
import io.lettuce.core.cluster.models.partitions.Partitions;
import io.lettuce.core.cluster.models.partitions.RedisClusterNode;
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
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link RedisCommonCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
public class RedisClusterCollectImplTest {

    @InjectMocks
    private RedisCommonCollectImpl redisClusterCollect;


    @Mock
    private StatefulRedisClusterConnection<String, String> connection;

    @Mock
    private RedisAdvancedClusterCommands<String, String> cmd;

    @Mock
    private RedisClusterClient client;

    @BeforeEach
    void setUp() {
    }

    @AfterEach
    void setDown() {
        connection.close();
        client.shutdown();
    }

    @Test
    void testCollect() {
        RedisProtocol redisProtocol = RedisProtocol.builder()
                .host("127.0.0.1")
                .port("6379")
                .pattern("3")
                .build();
        String infoTemp = """
                # Cluster
                cluster_enabled:%s
                """;
        String clusterEnabled = "1";
        String info = String.format(infoTemp, clusterEnabled);

        String clusterKnownNodes = "2";
        String clusterInfoTemp = """
                cluster_slots_fail:0
                cluster_known_nodes:%s
                """;
        String clusterInfo = String.format(clusterInfoTemp, clusterKnownNodes);
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        List<String> aliasField = new ArrayList<>();
        aliasField.add("cluster_known_nodes");
        aliasField.add("cluster_enabled");
        aliasField.add("identity");
        List<Metrics.Field> fields = new ArrayList<>();
        fields.add(Metrics.Field.builder()
                .field("cluster_enabled")
                .type(TYPE_STRING)
                .build());
        fields.add(Metrics.Field.builder()
                .field("cluster_known_nodes")
                .type(TYPE_STRING)
                .build());

        Metrics metrics = new Metrics();
        metrics.setName("cluster");
        metrics.setRedis(redisProtocol);
        metrics.setAliasFields(aliasField);
        metrics.setFields(fields);


        Mockito.mockStatic(RedisClusterClient.class).when(() -> RedisClusterClient.create(Mockito.any(ClientResources.class),
                Mockito.any(RedisURI.class))).thenReturn(client);
        Mockito.when(client.connect()).thenReturn(connection);

        Partitions partitions = new Partitions();
        RedisClusterNode node = new RedisClusterNode();
        String uri1 = "127.0.0.1:6379";
        node.setUri(RedisURI.create("redis://" + uri1));
        partitions.add(node);
        RedisClusterNode node2 = new RedisClusterNode();
        String uri2 = "127.0.0.2:6379";
        node2.setUri(RedisURI.create("redis://" + uri2));
        partitions.add(node2);

        Mockito.when(connection.getPartitions()).thenReturn(partitions);

        Mockito.when(connection.sync()).thenReturn(cmd);
        Mockito.when(cmd.info(metrics.getName())).thenReturn(info);
        Mockito.when(cmd.clusterInfo()).thenReturn(clusterInfo);

        redisClusterCollect.preCheck(metrics);
        redisClusterCollect.collect(builder, 1L, "test", metrics);

        assertEquals(builder.getCode(), CollectRep.Code.SUCCESS);
        assertEquals(builder.getValuesCount(), 2);
        for (int i = 0; i < builder.getValuesList().size(); i++) {
            CollectRep.ValueRow row = builder.getValues(i);
            assertEquals(row.getColumnsCount(), 3);
            assertEquals(row.getColumns(0), clusterKnownNodes);
            assertEquals(row.getColumns(1), clusterEnabled);
            if (i == 0) {
                assertEquals(row.getColumns(2), uri1);
            } else {
                assertEquals(row.getColumns(2), uri2);
            }
        }

    }
}
