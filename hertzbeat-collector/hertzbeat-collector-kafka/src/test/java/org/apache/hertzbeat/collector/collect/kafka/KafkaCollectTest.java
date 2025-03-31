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

package org.apache.hertzbeat.collector.collect.kafka;

import org.apache.hertzbeat.collector.collect.kafka.constants.SupportedCommand;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.KafkaProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.ListTopicsOptions;
import org.apache.kafka.clients.admin.ListTopicsResult;
import org.apache.kafka.common.KafkaFuture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Test case for {@link KafkaCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
public class KafkaCollectTest {

    private static final String HOST = "127.0.0.1";
    private static final String PORT = "9092";

    private KafkaCollectImpl collect;

    @Mock
    private AdminClient adminClient;

    @BeforeEach
    public void setUp() throws Exception {
        collect = new KafkaCollectImpl(){
            @Override
            protected AdminClient getAdminClient(KafkaProtocol protocol) {
                return adminClient;
            }
        };
    }

    @Test
    void preCheck() {
        // metrics is null
        assertThrows(IllegalArgumentException.class, () -> {
            collect.preCheck(null);
        });

        // kafka is null
        assertThrows(IllegalArgumentException.class, () -> {
            collect.preCheck(Metrics.builder().build());
        });

        KafkaProtocol kafka = new KafkaProtocol();
        Metrics metric = Metrics.builder().kclient(kafka).build();
        // kafka srv host is null
        assertThrows(IllegalArgumentException.class, () -> {
            collect.preCheck(metric);
        });
        // kafka port is null
        assertThrows(IllegalArgumentException.class, () -> {
            kafka.setHost(HOST);
            collect.preCheck(metric);
        });
        // no exception throw
        assertDoesNotThrow(() -> {
            kafka.setPort(PORT);
            collect.preCheck(metric);
        });
    }

    @Test
    void testCollect() throws Exception {
        Set<String> topicSet = new HashSet<>();
        topicSet.add("test-topic");

        ListTopicsResult listTopicsResult = Mockito.mock(ListTopicsResult.class);
        KafkaFuture<Set<String>> future = Mockito.mock(KafkaFuture.class);

        Mockito.when(adminClient.listTopics(Mockito.any(ListTopicsOptions.class))).thenReturn(listTopicsResult);
        Mockito.when(listTopicsResult.names()).thenReturn(future);
        Mockito.when(future.get()).thenReturn(topicSet);

        KafkaProtocol kafka = KafkaProtocol.builder()
                .host(HOST)
                .port(PORT)
                .build();

        Metrics metrics = Metrics.builder()
                .kclient(kafka)
                .build();

        // test if not kafka command
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        collect.collect(builder, metrics);
        assertEquals(CollectRep.Code.FAIL, builder.getCode());

        //test kafka command
        kafka.setCommand(SupportedCommand.TOPIC_LIST.getCommand());
        builder.setCode(CollectRep.Code.forNumber(6));
        collect.collect(builder, metrics);

        assertEquals(CollectRep.Code.SUCCESS, builder.getCode());
        assertEquals(1, builder.getValuesList().size());
        assertEquals("test-topic", builder.getValues(0).getColumns(0));
        Mockito.verify(adminClient).listTopics(Mockito.any(ListTopicsOptions.class));
    }

    @Test
    void supportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_KAFKA, collect.supportProtocol());
    }
}
