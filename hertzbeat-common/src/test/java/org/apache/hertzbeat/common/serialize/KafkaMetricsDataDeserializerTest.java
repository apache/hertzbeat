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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.channels.Channels;
import java.util.Map;
import org.apache.arrow.vector.VectorSchemaRoot;
import org.apache.arrow.vector.ipc.ArrowStreamWriter;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.kafka.common.header.Headers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * test case for {@link KafkaMetricsDataDeserializer}
 */

class KafkaMetricsDataDeserializerTest {

    private KafkaMetricsDataDeserializer deserializer;

    @Mock
    private Map<String, ?> configs;

    @Mock
    private Headers headers;

    @BeforeEach
    void setUp() {

        MockitoAnnotations.openMocks(this);

        deserializer = new KafkaMetricsDataDeserializer();
    }

    @Test
    void testConfigure() {

        deserializer.configure(configs, false);
    }

    @Test
    void testDeserializeWithBytes() {

        CollectRep.MetricsData expectedMetricsData = CollectRep.MetricsData.newBuilder()
                .setMetrics("someValue")
                .setApp("linux")
                .build();
        byte[] bytes = null;
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             VectorSchemaRoot root = expectedMetricsData.toVectorSchemaRootAndRelease();
             ArrowStreamWriter writer = new ArrowStreamWriter(root,
                     null, Channels.newChannel(out))) {
            writer.start();
            writer.writeBatch();
            writer.end();
            bytes = out.toByteArray();
        } catch (IOException ignored) {}

        CollectRep.MetricsData actualMetricsData = deserializer.deserialize("", bytes);

        assertEquals(expectedMetricsData.rowCount(), actualMetricsData.rowCount());
    }

    @Test
    void testDeserializeWithInvalidBytes() {

        byte[] invalidBytes = "invalid data".getBytes();

        assertThrows(RuntimeException.class, () -> deserializer.deserialize("", invalidBytes));
    }

    @Test
    void testDeserializeWithHeaders() {

        CollectRep.MetricsData expectedMetricsData = CollectRep.MetricsData.newBuilder()
                .setMetrics("someValue")
                .setApp("linux")
                .build();
        byte[] bytes = null;
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             VectorSchemaRoot root = expectedMetricsData.toVectorSchemaRootAndRelease();
             ArrowStreamWriter writer = new ArrowStreamWriter(root,
                     null, Channels.newChannel(out))) {
            writer.start();
            writer.writeBatch();
            writer.end();
            bytes = out.toByteArray();
        } catch (IOException ignored) {}

        CollectRep.MetricsData actualMetricsData = deserializer.deserialize("topic", headers, bytes);

        assertEquals(expectedMetricsData.rowCount(), actualMetricsData.rowCount());
    }

    @Test
    void testClose() {

        deserializer.close();
    }

}
