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

import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.KafkaProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Test case for {@link KafkaCollectImpl}
 */
public class KafkaCollectTest {
    private KafkaCollectImpl collect;

    @BeforeEach
    public void setUp() throws Exception {
        collect = new KafkaCollectImpl();
    }

    @Test
    void preCheck() {
        // metrics is null
        assertThrows(NullPointerException.class, () -> {
            collect.preCheck(null);
        });

        // kafka is null
        assertThrows(IllegalArgumentException.class, () -> {
            collect.preCheck(Metrics.builder().build());
        });

        // kafka srv host is null
        assertThrows(IllegalArgumentException.class, () -> {
            KafkaProtocol kafka = new KafkaProtocol();
            collect.preCheck(Metrics.builder().kclient(kafka).build());
        });

        // kafka port is null
        assertThrows(IllegalArgumentException.class, () -> {
            KafkaProtocol kafka = KafkaProtocol.builder().host("127.0.0.1").build();
            collect.preCheck(Metrics.builder().kclient(kafka).build());
        });

        // no exception throw
        assertDoesNotThrow(() -> {
            KafkaProtocol kafka = KafkaProtocol.builder().host("127.0.0.1").port("9092").build();
            collect.preCheck(Metrics.builder().kclient(kafka).build());
        });
    }

    @Test
    void collect() {
        // metrics is null
        assertThrows(NullPointerException.class, () -> {
            CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
            collect.collect(builder, 1L, "app", null);
        });

        assertDoesNotThrow(() -> {
            CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
            KafkaProtocol kafka = KafkaProtocol.builder().host("127.0.0.1").port("9092").build();
            Metrics metrics = Metrics.builder().kclient(kafka).build();
            collect.collect(builder, 1L, "app", metrics);
        });
    }

    @Test
    void supportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_KAFKA, collect.supportProtocol());
    }
}
