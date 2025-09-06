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

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.kafka.common.header.Headers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link KafkaLogEntrySerializer}
 */
@ExtendWith(MockitoExtension.class)
class KafkaLogEntrySerializerTest {

    private KafkaLogEntrySerializer serializer;

    @Mock
    private Map<String, ?> configs;

    @Mock
    private Headers headers;

    @BeforeEach
    void setUp() {
        serializer = new KafkaLogEntrySerializer();
    }

    @Test
    void testConfigure() {
        // Test that configure method doesn't throw any exceptions
        serializer.configure(configs, false);
        serializer.configure(configs, true);
    }

    @Test
    void testSerializeWithLogEntry() {
        // Create a comprehensive log entry for testing
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("service.name", "hertzbeat");
        attributes.put("service.version", "1.0.0");
        attributes.put("environment", "test");
        
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
                .body("Test log message for serialization")
                .attributes(attributes)
                .droppedAttributesCount(0)
                .traceId("1234567890abcdef1234567890abcdef")
                .spanId("1234567890abcdef")
                .traceFlags(1)
                .resource(resource)
                .instrumentationScope(scope)
                .build();

        byte[] bytes = serializer.serialize("test-topic", logEntry);

        assertNotNull(bytes);
        assertTrue(bytes.length > 0);
        
        // Verify the JSON contains expected fields
        String jsonString = new String(bytes, StandardCharsets.UTF_8);
        assertTrue(jsonString.contains("\"severityText\":\"INFO\""));
        assertTrue(jsonString.contains("\"body\":\"Test log message for serialization\""));
        assertTrue(jsonString.contains("\"traceId\":\"1234567890abcdef1234567890abcdef\""));
        assertTrue(jsonString.contains("\"spanId\":\"1234567890abcdef\""));
    }

    @Test
    void testSerializeWithSimpleLogEntry() {
        // Test with minimal log entry
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(System.currentTimeMillis() * 1_000_000L)
                .severityNumber(17) // ERROR level
                .severityText("ERROR")
                .body("Simple error message")
                .build();

        byte[] bytes = serializer.serialize("test-topic", logEntry);

        assertNotNull(bytes);
        assertTrue(bytes.length > 0);
        
        String jsonString = new String(bytes, StandardCharsets.UTF_8);
        assertTrue(jsonString.contains("\"severityText\":\"ERROR\""));
        assertTrue(jsonString.contains("\"body\":\"Simple error message\""));
        assertTrue(jsonString.contains("\"severityNumber\":17"));
    }

    @Test
    void testSerializeWithNullLogEntry() {
        // Test serialization with null log entry
        byte[] bytes = serializer.serialize("test-topic", null);

        assertNull(bytes);
    }

    @Test
    void testSerializeWithHeaders() {
        // Test serialization with headers
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(System.currentTimeMillis() * 1_000_000L)
                .severityNumber(13) // WARN level
                .severityText("WARN")
                .body("Warning message with headers")
                .build();

        byte[] bytes = serializer.serialize("test-topic", headers, logEntry);

        assertNotNull(bytes);
        assertTrue(bytes.length > 0);
        
        String jsonString = new String(bytes, StandardCharsets.UTF_8);
        assertTrue(jsonString.contains("\"severityText\":\"WARN\""));
        assertTrue(jsonString.contains("\"body\":\"Warning message with headers\""));
    }

    @Test
    void testSerializeWithNullLogEntryAndHeaders() {
        // Test serialization with null log entry and headers
        byte[] bytes = serializer.serialize("test-topic", headers, null);

        assertNull(bytes);
    }

    @Test
    void testSerializeWithComplexAttributes() {
        // Test with complex nested attributes
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("string_value", "test_string");
        attributes.put("numeric_value", 42);
        attributes.put("boolean_value", true);
        
        Map<String, Object> nestedMap = new HashMap<>();
        nestedMap.put("nested_key", "nested_value");
        attributes.put("nested_object", nestedMap);
        
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(System.currentTimeMillis() * 1_000_000L)
                .severityNumber(5) // DEBUG level
                .severityText("DEBUG")
                .body("Debug message with complex attributes")
                .attributes(attributes)
                .build();

        byte[] bytes = serializer.serialize("test-topic", logEntry);

        assertNotNull(bytes);
        assertTrue(bytes.length > 0);
        
        String jsonString = new String(bytes, StandardCharsets.UTF_8);
        assertTrue(jsonString.contains("\"severityText\":\"DEBUG\""));
        assertTrue(jsonString.contains("\"string_value\":\"test_string\""));
        assertTrue(jsonString.contains("\"numeric_value\":42"));
        assertTrue(jsonString.contains("\"boolean_value\":true"));
    }

    @Test
    void testClose() {
        // Test that close method doesn't throw any exceptions
        serializer.close();
    }
}
