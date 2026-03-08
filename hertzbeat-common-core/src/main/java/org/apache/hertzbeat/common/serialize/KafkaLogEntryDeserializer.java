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
import org.apache.kafka.common.serialization.Deserializer;

/**
 * Kafka LogEntry deserializer using JSON
 */
@Slf4j
public class KafkaLogEntryDeserializer implements Deserializer<LogEntry> {

    private final ObjectMapper objectMapper;

    public KafkaLogEntryDeserializer() {
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
        Deserializer.super.configure(configs, isKey);
    }

    @Override
    public LogEntry deserialize(String topic, byte[] data) {
        if (data == null || data.length == 0) {
            log.warn("Empty data received for topic: {}", topic);
            return null;
        }
        try {
            String jsonString = new String(data, StandardCharsets.UTF_8);
            return objectMapper.readValue(jsonString, LogEntry.class);
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize LogEntry from JSON for topic: {}", topic, e);
            return null;
        }
    }

    @Override
    public LogEntry deserialize(String topic, Headers headers, byte[] data) {
        return deserialize(topic, data);
    }

    @Override
    public void close() {
        Deserializer.super.close();
    }
} 