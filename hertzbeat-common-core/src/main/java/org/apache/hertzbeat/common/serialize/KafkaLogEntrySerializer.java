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

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.kafka.common.header.Headers;
import org.apache.kafka.common.serialization.Serializer;

/**
 * Kafka LogEntry serializer using JSON
 */
@Slf4j
public class KafkaLogEntrySerializer implements Serializer<LogEntry> {

    private final ObjectMapper objectMapper;

    public KafkaLogEntrySerializer() {
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
        Serializer.super.configure(configs, isKey);
    }

    @Override
    public byte[] serialize(String topic, LogEntry logEntry) {
        if (logEntry == null) {
            log.warn("LogEntry is null for topic: {}", topic);
            return null;
        }
        try {
            String jsonString = objectMapper.writeValueAsString(logEntry);
            return jsonString.getBytes(StandardCharsets.UTF_8);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize LogEntry to JSON for topic: {}", topic, e);
            return null;
        }
    }

    @Override
    public byte[] serialize(String topic, Headers headers, LogEntry logEntry) {
        return serialize(topic, logEntry);
    }

    @Override
    public void close() {
        Serializer.super.close();
    }
} 