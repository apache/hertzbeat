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

package org.apache.hertzbeat.collector.collect.http;

import static org.junit.jupiter.api.Assertions.assertThrows;

import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link HttpCollectImpl}
 */
class HttpCollectImplTest {
    private HttpCollectImpl httpCollectImpl;

    @BeforeEach
    void setUp() {
        httpCollectImpl = new HttpCollectImpl();
    }

    @Test
    void preCheck() {
        assertThrows(IllegalArgumentException.class, () -> {
            httpCollectImpl.preCheck(null);
        });
        
        assertThrows(IllegalArgumentException.class, () -> {
            Metrics metrics = Metrics.builder().build();
            httpCollectImpl.preCheck(metrics);
        });
    }

    @Test
    void collect() {
        HttpProtocol http = HttpProtocol.builder().build();
        http.setMethod("POST");
        Metrics metrics = Metrics.builder()
                .http(http)
                .build();
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();

        httpCollectImpl.collect(builder, 1L, "app", metrics);
    }

    @Test
    void supportProtocol() {
        String protocol = httpCollectImpl.supportProtocol();
        assert "http".equals(protocol);
    }
}