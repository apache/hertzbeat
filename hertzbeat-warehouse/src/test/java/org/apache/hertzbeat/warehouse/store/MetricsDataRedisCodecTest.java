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

package org.apache.hertzbeat.warehouse.store;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.fail;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.warehouse.store.realtime.redis.MetricsDataRedisCodec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

/**
 * Test case for {@link MetricsDataRedisCodec}
 */

@Slf4j
class MetricsDataRedisCodecTest {

    private MetricsDataRedisCodec codec;

    @BeforeEach
    void setUp() {

        codec = new MetricsDataRedisCodec();
    }

    @Test
    void testEncodeKey() {

        String key = "testKey";
        ByteBuffer encodedKey = codec.encodeKey(key);
        String decodedKey = StandardCharsets.UTF_8.decode(encodedKey).toString();

        assertEquals(key, decodedKey);
    }

    @Test
    void testDecodeKey() {

        String key = "testKey";
        ByteBuffer buffer = ByteBuffer.wrap(key.getBytes(StandardCharsets.UTF_8));
        String decodedKey = codec.decodeKey(buffer);

        assertEquals(key, decodedKey);
    }

    @Test
    void testEncodeValue() {

        CollectRep.MetricsData metricsData = Mockito.mock(CollectRep.MetricsData.class);
        byte[] bytes = new byte[]{1, 2, 3};
        Mockito.when(metricsData.toByteArray()).thenReturn(bytes);

        ByteBuffer encodedValue = codec.encodeValue(metricsData);
        assertArrayEquals(bytes, encodedValue.array());
    }

    @Test
    void testDecodeValue() {

        CollectRep.MetricsData metricsData = Mockito.mock(CollectRep.MetricsData.class);
        byte[] bytes = new byte[]{1, 2, 3};

        ByteBuffer buffer = ByteBuffer.wrap(bytes);

        try {
            Mockito.mockStatic(CollectRep.MetricsData.class);
            Mockito.when(CollectRep.MetricsData.parseFrom(buffer)).thenReturn(metricsData);

            CollectRep.MetricsData decodedValue = codec.decodeValue(buffer);

            assertEquals(metricsData, decodedValue);
        } catch (Exception e) {
            log.error(e.getMessage());
            fail("Exception thrown during decodeValue test");
        } finally {
            Mockito.clearAllCaches();
        }
    }

}
