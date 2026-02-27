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

package org.apache.hertzbeat.collector.collect.jmx;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.JmxProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link JmxCollectImpl}
 */
class JmxCollectImplTest {
    private JmxCollectImpl jmxCollect;

    @BeforeEach
    void setUp() throws Exception {
        jmxCollect = new JmxCollectImpl();
    }

    @Test
    void preCheck() throws IllegalArgumentException {
        // metrics is null, will throw exception
        assertThrows(IllegalArgumentException.class, () -> {
            jmxCollect.preCheck(null);
        });

        // should not contain /stub/
        assertThrows(IllegalArgumentException.class, () -> {
            JmxProtocol jmx = JmxProtocol.builder().build();
            jmx.setUrl("/stub/");
            Metrics metrics = Metrics.builder().jmx(jmx).build();
            
            jmxCollect.preCheck(metrics);
        });
    }

    @Test
    void collect() {
        // metrics is null
        assertDoesNotThrow(() -> {
            CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
            jmxCollect.collect(builder, null);
        });
    }

    @Test
    void supportProtocol() {
        assert DispatchConstants.PROTOCOL_JMX.equals(jmxCollect.supportProtocol());
    }
}
