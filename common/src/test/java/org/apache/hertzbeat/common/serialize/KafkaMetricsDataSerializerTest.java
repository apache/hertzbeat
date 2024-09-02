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

package org.apache.hertzbeat.common.serialize;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import java.util.Map;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.kafka.common.header.Headers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * test case for {@link KafkaMetricsDataSerializer}
 */

class KafkaMetricsDataSerializerTest {

    private KafkaMetricsDataSerializer serializer;

    @Mock
    private Map<String, ?> configs;

    @Mock
    private Headers headers;

    @BeforeEach
    void setUp() {

        MockitoAnnotations.openMocks(this);

        serializer = new KafkaMetricsDataSerializer();
    }

    @Test
    void testConfigure() {

        serializer.configure(configs, false);
    }

    @Test
    void testSerializeWithMetricsData() {

        CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                .setMetrics("someValue")
                .setApp("linux")
                .build();
        byte[] bytes = serializer.serialize("", metricsData);

        assertNotNull(bytes);
        assertArrayEquals(metricsData.toByteArray(), bytes);
    }

    @Test
    void testSerializeWithNullMetricsData() {

        byte[] bytes = serializer.serialize("", null);

        assertNull(bytes);
    }

    @Test
    void testSerializeWithHeaders() {

        CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                .setMetrics("someValue")
                .setApp("linux")
                .build();
        byte[] expectedBytes = metricsData.toByteArray();
        byte[] bytes = serializer.serialize("topic", headers, metricsData);

        assertArrayEquals(expectedBytes, bytes);
    }

    @Test
    void testClose() {

        serializer.close();
    }

}
