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

import io.lettuce.core.codec.RedisCodec;
import io.netty.buffer.Unpooled;
import lombok.extern.slf4j.Slf4j;
import org.apache.arrow.memory.BufferAllocator;
import org.apache.arrow.memory.RootAllocator;
import org.apache.arrow.vector.VectorSchemaRoot;
import org.apache.arrow.vector.ipc.ArrowStreamReader;
import org.apache.arrow.vector.ipc.ArrowStreamWriter;
import org.apache.hertzbeat.common.entity.message.CollectRep;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.Channels;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/**
 * redis metrics data codec
 */
@Slf4j
public class RedisMetricsDataCodec implements RedisCodec<String, CollectRep.MetricsData> {

    private final BufferAllocator allocator;

    public RedisMetricsDataCodec() {
        this.allocator = new RootAllocator();
    }

    @Override
    public String decodeKey(ByteBuffer byteBuffer) {
        return Unpooled.wrappedBuffer(byteBuffer).toString(StandardCharsets.UTF_8);
    }

    @Override
    public CollectRep.MetricsData decodeValue(ByteBuffer byteBuffer) {
        if (byteBuffer == null || !byteBuffer.hasRemaining()) {
            return null;
        }
        try {
            byte[] bytes;
            if (byteBuffer.hasArray()) {
                bytes = Arrays.copyOfRange(byteBuffer.array(),
                        byteBuffer.position(), byteBuffer.limit());
            } else {
                bytes = new byte[byteBuffer.remaining()];
                byteBuffer.get(bytes);
            }
            try (ByteArrayInputStream in = new ByteArrayInputStream(bytes);
                 ArrowStreamReader reader = new ArrowStreamReader(
                         Channels.newChannel(in), allocator)) {
                reader.loadNextBatch();
                VectorSchemaRoot root = reader.getVectorSchemaRoot();
                if (root == null || root.getRowCount() == 0) {
                    log.warn("Empty data received");
                    return null;
                }
                return new CollectRep.MetricsData(root);
            }
        } catch (Exception e) {
            log.error("Failed to decode metrics data", e);
            return null;
        }
    }

    @Override
    public ByteBuffer encodeKey(String s) {
        return ByteBuffer.wrap(s.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public ByteBuffer encodeValue(CollectRep.MetricsData metricsData) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             VectorSchemaRoot root = metricsData.toVectorSchemaRootAndRelease();
             ArrowStreamWriter writer = new ArrowStreamWriter(root,
                     null, Channels.newChannel(out))) {
            writer.start();
            writer.writeBatch();
            writer.end();
            return ByteBuffer.wrap(out.toByteArray());
        } catch (IOException e) {
            log.error("sendMetricsData error", e);
        }
        return null;
    }
}
