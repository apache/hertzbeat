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

import com.fasterxml.jackson.databind.ObjectMapper;
import io.lettuce.core.codec.RedisCodec;
import io.netty.buffer.Unpooled;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.log.LogEntry;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;

/**
 * Redis LogEntry codec using JSON serialization
 */
@Slf4j
public class RedisLogEntryCodec implements RedisCodec<String, LogEntry> {

    private final ObjectMapper objectMapper;

    public RedisLogEntryCodec() {
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public String decodeKey(ByteBuffer byteBuffer) {
        return Unpooled.wrappedBuffer(byteBuffer).toString(StandardCharsets.UTF_8);
    }

    @Override
    public LogEntry decodeValue(ByteBuffer byteBuffer) {
        if (byteBuffer == null || !byteBuffer.hasRemaining()) {
            return null;
        }
        try {
            String jsonString = Unpooled.wrappedBuffer(byteBuffer).toString(StandardCharsets.UTF_8);
            return objectMapper.readValue(jsonString, LogEntry.class);
        } catch (Exception e) {
            log.error("Failed to decode LogEntry from JSON: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public ByteBuffer encodeKey(String s) {
        return ByteBuffer.wrap(s.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public ByteBuffer encodeValue(LogEntry logEntry) {
        try {
            String jsonString = objectMapper.writeValueAsString(logEntry);
            return ByteBuffer.wrap(jsonString.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("Failed to encode LogEntry to JSON: {}", e.getMessage());
            return null;
        }
    }
} 