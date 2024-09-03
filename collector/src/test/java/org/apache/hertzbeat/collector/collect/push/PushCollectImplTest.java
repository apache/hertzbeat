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

package org.apache.hertzbeat.collector.collect.push;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.PushProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link PushCollectImpl}
 */
public class PushCollectImplTest {
    private PushCollectImpl pushCollect;
    private PushProtocol push;
    private CollectRep.MetricsData.Builder builder;

    @BeforeEach
    public void setup() {
        pushCollect = new PushCollectImpl();
        push = PushProtocol.builder().uri("/metrics").host("example.com").port("60").build();
        builder = CollectRep.MetricsData.newBuilder();
    }

    @Test
    void preCheck() throws Exception {
        // metrics is null
        assertThrows(IllegalArgumentException.class, () -> pushCollect.preCheck(null));

        // protocol is null
        assertThrows(IllegalArgumentException.class, () -> pushCollect.preCheck(new Metrics()));

        // everyting is ok
        assertDoesNotThrow(() -> {
            pushCollect.preCheck(Metrics.builder().push(push).build());
        });
    }

    @Test
    void collect() throws Exception {
        assertDoesNotThrow(() -> {
            pushCollect.collect(builder, 1L, "app", Metrics.builder().push(push).build());
            assertEquals(CollectRep.Code.FAIL, builder.getCode());
        });
    }

    @Test
    void supportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_PUSH, pushCollect.supportProtocol());
    }
}
