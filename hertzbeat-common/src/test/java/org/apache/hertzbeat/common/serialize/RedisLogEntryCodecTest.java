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
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link RedisLogEntryCodec}
 */
@ExtendWith(MockitoExtension.class)
class RedisLogEntryCodecTest {

    private RedisLogEntryCodec codec;

    @BeforeEach
    void setUp() {
        codec = new RedisLogEntryCodec();
    }

    @Test
    void testEncodeDecodeKey() {
        String key = "test-log-key";
        
        // Test encoding
        ByteBuffer encodedKey = codec.encodeKey(key);
        assertNotNull(encodedKey);
        
        // Test decoding
        String decodedKey = codec.decodeKey(encodedKey);
        assertEquals(key, decodedKey);
    }

    @Test
    void testEncodeDecodeSimpleLogEntry() {
        // Create a simple log entry
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(System.currentTimeMillis() * 1_000_000L)
                .severityNumber(17) // ERROR level
                .severityText("ERROR")
                .body("Simple error message")
                .build();

        // Test encoding
        ByteBuffer encodedValue = codec.encodeValue(logEntry);
        assertNotNull(encodedValue);
        assertTrue(encodedValue.hasRemaining());
        
        // Test decoding
        LogEntry decodedLogEntry = codec.decodeValue(encodedValue);
        assertNotNull(decodedLogEntry);
        assertEquals(logEntry.getSeverityNumber(), decodedLogEntry.getSeverityNumber());
        assertEquals(logEntry.getSeverityText(), decodedLogEntry.getSeverityText());
        assertEquals(logEntry.getBody(), decodedLogEntry.getBody());
        assertEquals(logEntry.getTimeUnixNano(), decodedLogEntry.getTimeUnixNano());
    }

    @Test
    void testEncodeDecodeComplexLogEntry() {
        // Create a comprehensive log entry for testing
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("service.name", "hertzbeat");
        attributes.put("service.version", "1.0.0");
        attributes.put("environment", "test");
        attributes.put("numeric_value", 42);
        attributes.put("boolean_value", true);
        
        Map<String, Object> resource = new HashMap<>();
        resource.put("host.name", "localhost");
        resource.put("os.type", "linux");
        
        LogEntry.InstrumentationScope scope = LogEntry.InstrumentationScope.builder()
                .name("org.apache.hertzbeat.test")
                .version("1.0.0")
                .attributes(new HashMap<>())
                .droppedAttributesCount(0)
                .build();
        
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(Instant.now().toEpochMilli() * 1_000_000L)
                .observedTimeUnixNano(Instant.now().toEpochMilli() * 1_000_000L)
                .severityNumber(9) // INFO level
                .severityText("INFO")
                .body("Test log message for Redis codec")
                .attributes(attributes)
                .droppedAttributesCount(0)
                .traceId("1234567890abcdef1234567890abcdef")
                .spanId("1234567890abcdef")
                .traceFlags(1)
                .resource(resource)
                .instrumentationScope(scope)
                .build();

        // Test encoding
        ByteBuffer encodedValue = codec.encodeValue(logEntry);
        assertNotNull(encodedValue);
        assertTrue(encodedValue.hasRemaining());
        
        // Verify the JSON structure
        String jsonString = new String(encodedValue.array(), StandardCharsets.UTF_8);
        assertTrue(jsonString.contains("\"severityText\":\"INFO\""));
        assertTrue(jsonString.contains("\"body\":\"Test log message for Redis codec\""));
        assertTrue(jsonString.contains("\"traceId\":\"1234567890abcdef1234567890abcdef\""));
        assertTrue(jsonString.contains("\"spanId\":\"1234567890abcdef\""));
        
        // Test decoding
        LogEntry decodedLogEntry = codec.decodeValue(encodedValue);
        assertNotNull(decodedLogEntry);
        assertEquals(logEntry.getSeverityNumber(), decodedLogEntry.getSeverityNumber());
        assertEquals(logEntry.getSeverityText(), decodedLogEntry.getSeverityText());
        assertEquals(logEntry.getBody(), decodedLogEntry.getBody());
        assertEquals(logEntry.getTraceId(), decodedLogEntry.getTraceId());
        assertEquals(logEntry.getSpanId(), decodedLogEntry.getSpanId());
        assertEquals(logEntry.getTraceFlags(), decodedLogEntry.getTraceFlags());
    }

    @Test
    void testDecodeEmptyByteBuffer() {
        // Test decoding empty byte buffer
        ByteBuffer emptyBuffer = ByteBuffer.allocate(0);
        LogEntry decodedLogEntry = codec.decodeValue(emptyBuffer);
        assertNull(decodedLogEntry);
    }

    @Test
    void testDecodeInvalidJson() {
        // Test decoding invalid JSON
        String invalidJson = "{ invalid json }";
        ByteBuffer invalidBuffer = ByteBuffer.wrap(invalidJson.getBytes(StandardCharsets.UTF_8));
        
        LogEntry decodedLogEntry = codec.decodeValue(invalidBuffer);
        assertNull(decodedLogEntry);
    }
}
