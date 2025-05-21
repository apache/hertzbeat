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

package org.apache.hertzbeat.collector.collect.sd;

import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.ZookeeperSdProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.zookeeper.ZooKeeper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedConstruction;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;


@ExtendWith(MockitoExtension.class)
class ZookeeperSdCollectImplTest {

    private ZookeeperSdCollectImpl zookeeperSdCollect;

    private Metrics metrics;
    private ZookeeperSdProtocol protocol;
    private CollectRep.MetricsData.Builder builder;

    @BeforeEach
    void setUp() {
        zookeeperSdCollect = new ZookeeperSdCollectImpl();

        protocol = ZookeeperSdProtocol.builder()
                .url("localhost:2181")
                .pathPrefix("/services")
                .build();

        metrics = Metrics.builder()
                .zookeeper_sd(protocol)
                .build();

        builder = CollectRep.MetricsData.newBuilder();
    }

    @Test
    void testPreCheckWithNullConfig() {
        Metrics invalid = Metrics.builder().build();
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> zookeeperSdCollect.preCheck(invalid));
        assertEquals("Zookeeper SD configuration cannot be null", e.getMessage());
    }

    @Test
    void testPreCheckWithEmptyUrl() {
        ZookeeperSdProtocol badProtocol = ZookeeperSdProtocol.builder().url("").pathPrefix("/path").build();
        Metrics m = Metrics.builder().zookeeper_sd(badProtocol).build();
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> zookeeperSdCollect.preCheck(m));
        assertEquals("Zookeeper URL cannot be null or empty", e.getMessage());
    }

    @Test
    void testPreCheckWithEmptyPath() {
        ZookeeperSdProtocol badProtocol = ZookeeperSdProtocol.builder().url("host").pathPrefix("").build();
        Metrics m = Metrics.builder().zookeeper_sd(badProtocol).build();
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> zookeeperSdCollect.preCheck(m));
        assertEquals("Zookeeper path prefix cannot be null or empty", e.getMessage());
    }

    @Test
    void testPreCheckValid() {
        assertDoesNotThrow(() -> zookeeperSdCollect.preCheck(metrics));
    }

    @Test
    void testSupportProtocol() {
        assertEquals("zookeeper_sd", zookeeperSdCollect.supportProtocol());
    }

    @Test
    void testCollectSuccess() throws Exception {
        try (MockedConstruction<ZooKeeper> mocked = Mockito.mockConstruction(ZooKeeper.class,
                (mock, context) -> Mockito.when(mock.getChildren("/services", false)).thenReturn(List.of("host1:8080", "host2:9090")))) {

            zookeeperSdCollect.collect(builder, metrics);

            assertEquals(2, builder.getValuesCount());
            assertEquals("host1", builder.getValues(0).getColumns(0));
            assertEquals("8080", builder.getValues(0).getColumns(1));
            assertEquals("host2", builder.getValues(1).getColumns(0));
            assertEquals("9090", builder.getValues(1).getColumns(1));
        }
    }
}
