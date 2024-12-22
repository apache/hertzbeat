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

package org.apache.hertzbeat.collector.collect.nebulagraph;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.NebulaGraphProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link NebulaGraphCollectImpl}
 */
public class NebulaGraphCollectImplTest {
    private NebulaGraphCollectImpl nebulaGraphCollect;
    private CollectRep.MetricsData.Builder builder;

    @BeforeEach
    void setUp() {
        nebulaGraphCollect = new NebulaGraphCollectImpl();
        builder = CollectRep.MetricsData.newBuilder();
    }

    @Test
    void preCheck() {
        // metrics is null
        assertThrows(IllegalArgumentException.class, () -> {
            nebulaGraphCollect.preCheck(null);
        });

        // nebulaGraph is null
        assertThrows(IllegalArgumentException.class, () -> {
            Metrics metrics = Metrics.builder().build();
            nebulaGraphCollect.preCheck(metrics);
        });

        // everything is ok
        assertDoesNotThrow(() -> {
            Metrics metrics = Metrics.builder().nebulaGraph(NebulaGraphProtocol.builder().build()).build();
            nebulaGraphCollect.preCheck(metrics);
        });
    }

    @Test
    void collect() {
        String[] validTimePeriods = new String[]{"5", "60", "600", "3600"};

        // valid time period without host
        for (String validTimePeriod : validTimePeriods) {
            builder = CollectRep.MetricsData.newBuilder();
            Metrics metrics = Metrics.builder().nebulaGraph(NebulaGraphProtocol.builder().timePeriod(validTimePeriod).build()).build();
            nebulaGraphCollect.collect(builder, metrics);
            Assertions.assertEquals(CollectRep.Code.FAIL, builder.getCode());
        }

        // invalid time period
        assertDoesNotThrow(() -> {
            builder = CollectRep.MetricsData.newBuilder();
            Metrics metrics = Metrics.builder().nebulaGraph(NebulaGraphProtocol.builder().timePeriod("invalid").build()).build();
            nebulaGraphCollect.collect(builder, metrics);
            Assertions.assertEquals(CollectRep.Code.FAIL, builder.getCode());
        });

        assertDoesNotThrow(() -> {
            // valid time period and host
            builder = CollectRep.MetricsData.newBuilder();
            Metrics metrics = Metrics.builder().nebulaGraph(NebulaGraphProtocol.builder()
                .timePeriod("5")
                .host("localhost")
                .port("9090")
                .url("example.com")
                .timeout("1")
                .build()).build();
            nebulaGraphCollect.collect(builder, metrics);
            Assertions.assertEquals(CollectRep.Code.FAIL, builder.getCode());
        });
    }

    @Test
    void supportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_NEBULAGRAPH, nebulaGraphCollect.supportProtocol());
    }
}
