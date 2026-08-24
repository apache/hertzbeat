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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.channels.Channels;
import java.util.List;
import org.apache.arrow.memory.BufferAllocator;
import org.apache.arrow.memory.RootAllocator;
import org.apache.arrow.vector.VectorSchemaRoot;
import org.apache.arrow.vector.ipc.ArrowStreamWriter;
import org.apache.arrow.vector.types.pojo.ArrowType;
import org.apache.arrow.vector.types.pojo.Field;
import org.apache.arrow.vector.types.pojo.Schema;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link RedisMetricsDataCodec}
 */
class RedisMetricsDataCodecTest {

    private RedisMetricsDataCodec codec;

    @BeforeEach
    void setUp() {
        codec = new RedisMetricsDataCodec();
    }

    @Test
    void encodeDecodePreservesRows() {
        CollectRep.MetricsData data = CollectRep.MetricsData.newBuilder()
                .setId(123L)
                .setApp("linux")
                .setMetrics("cpu")
                .setCode(CollectRep.Code.SUCCESS)
                .addField(CollectRep.Field.newBuilder().setName("usage").setType(0).build())
                .addValueRow(CollectRep.ValueRow.newBuilder().addColumn("42").build())
                .build();

        try (CollectRep.MetricsData decoded = codec.decodeValue(codec.encodeValue(data))) {
            assertNotNull(decoded);
            assertEquals(123L, decoded.getId());
            assertEquals(CollectRep.Code.SUCCESS, decoded.getCode());
            assertEquals(1, decoded.getValues().size());
            assertEquals("42", decoded.getValues().get(0).getColumns(0));
        }
    }

    @Test
    void encodeDecodeKeepsZeroRowTimeout() {
        CollectRep.MetricsData timeout = CollectRep.MetricsData.newBuilder()
                .setId(456L)
                .setApp("linux")
                .setMetrics("cpu")
                .setPriority(0)
                .setCode(CollectRep.Code.TIMEOUT)
                .setMsg("Collect Timeout No Response")
                .build();

        try (CollectRep.MetricsData decoded = codec.decodeValue(codec.encodeValue(timeout))) {
            assertNotNull(decoded);
            assertEquals(456L, decoded.getId());
            assertEquals(CollectRep.Code.TIMEOUT, decoded.getCode());
            assertEquals("Collect Timeout No Response", decoded.getMsg());
            assertEquals(0, decoded.getPriority());
            assertEquals(0, decoded.rowCount());
        }
    }

    @Test
    void decodeSchemaOnlyStreamReturnsNull() throws Exception {
        Schema schema = new Schema(List.of(Field.nullable("usage", new ArrowType.Utf8())));
        try (BufferAllocator allocator = new RootAllocator();
             VectorSchemaRoot root = VectorSchemaRoot.create(schema, allocator);
             ByteArrayOutputStream out = new ByteArrayOutputStream();
             ArrowStreamWriter writer = new ArrowStreamWriter(root, null, Channels.newChannel(out))) {
            writer.start();
            writer.end();

            assertNull(codec.decodeValue(ByteBuffer.wrap(out.toByteArray())));
        }
    }
}
