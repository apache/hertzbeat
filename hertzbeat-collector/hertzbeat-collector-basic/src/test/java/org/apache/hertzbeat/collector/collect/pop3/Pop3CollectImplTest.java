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

package org.apache.hertzbeat.collector.collect.pop3;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.Pop3Protocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link Pop3CollectImpl}
 */
public class Pop3CollectImplTest {
    private Pop3CollectImpl pop3Collect;

    @BeforeEach
    void setUp() throws Exception {
        pop3Collect = new Pop3CollectImpl();
    }

    @Test
    void preCheck() throws Exception {
        // metrics is null
        assertThrows(IllegalArgumentException.class, () -> {
            pop3Collect.preCheck(null);
        });

        // protocol is null
        assertThrows(IllegalArgumentException.class, () -> {
            Metrics metrics = Metrics.builder().build();
            pop3Collect.preCheck(metrics);
        });

        // protocol is invalid
        assertThrows(IllegalArgumentException.class, () -> {
            Pop3Protocol pop3 = Pop3Protocol.builder().build();
            Metrics metrics = Metrics.builder().pop3(pop3).build();
            pop3Collect.preCheck(metrics);
        });

        // everything is ok
        assertDoesNotThrow(() -> {
            Pop3Protocol pop3 = Pop3Protocol.builder()
                .host("localhost")
                .port("110")
                .timeout("1")
                .ssl("true")
                .email("test@example.com")
                .authorize("auth")
                .build();
            Metrics metrics = Metrics.builder().pop3(pop3).build();
            pop3Collect.preCheck(metrics);
        });
    }

    @Test
    void collect() throws Exception {
        Pop3Protocol pop3 = Pop3Protocol.builder()
            .host("localhost")
            .port("110")
            .timeout("1")
            .ssl("true")
            .email("test@example.com")
            .authorize("auth")
            .build();
        Metrics metrics = Metrics.builder().pop3(pop3).build();

        assertDoesNotThrow(() -> {
            CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
            pop3Collect.collect(builder, metrics);
        });
    }

    @Test
    void supportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_POP3, pop3Collect.supportProtocol());
    }
}
