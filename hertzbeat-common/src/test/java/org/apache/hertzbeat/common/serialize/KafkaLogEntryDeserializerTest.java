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
import java.nio.charset.StandardCharsets;
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
 * Test case for {@link KafkaLogEntryDeserializer}
 */
@ExtendWith(MockitoExtension.class)
class KafkaLogEntryDeserializerTest {

    private KafkaLogEntryDeserializer deserializer;
    private KafkaLogEntrySerializer serializer;

    @Mock
    private Map<String, ?> configs;

    @Mock
    private Headers headers;

    @BeforeEach
    void setUp() {
        deserializer = new KafkaLogEntryDeserializer();
        serializer = new KafkaLogEntrySerializer();
    }

    @Test
    void testConfigure() {
        // Test that configure method doesn't throw any exceptions
        deserializer.configure(configs, false);
        deserializer.configure(configs, true);
    }

    @Test
    void testDeserializeWithValidLogEntry() {
        // Create a comprehensive log entry
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
        
        LogEntry originalLogEntry = LogEntry.builder()
                .timeUnixNano(1234567890123456789L)
                .observedTimeUnixNano(1234567890123456790L)
                .severityNumber(9) // INFO level
                .severityText("INFO")
                .body("Test log message for deserialization")
                .attributes(attributes)
                .droppedAttributesCount(0)
                .traceId("1234567890abcdef1234567890abcdef")
                .spanId("1234567890abcdef")
                .traceFlags(1)
                .resource(resource)
                .instrumentationScope(scope)
                .build();

        // Serialize the log entry to bytes
        byte[] bytes = serializer.serialize("test-topic", originalLogEntry);
        assertNotNull(bytes);

        // Deserialize the bytes back to log entry
        LogEntry deserializedLogEntry = deserializer.deserialize("test-topic", bytes);

        assertNotNull(deserializedLogEntry);
        assertEquals(originalLogEntry.getTimeUnixNano(), deserializedLogEntry.getTimeUnixNano());
        assertEquals(originalLogEntry.getObservedTimeUnixNano(), deserializedLogEntry.getObservedTimeUnixNano());
        assertEquals(originalLogEntry.getSeverityNumber(), deserializedLogEntry.getSeverityNumber());
        assertEquals(originalLogEntry.getSeverityText(), deserializedLogEntry.getSeverityText());
        assertEquals(originalLogEntry.getBody(), deserializedLogEntry.getBody());
        assertEquals(originalLogEntry.getTraceId(), deserializedLogEntry.getTraceId());
        assertEquals(originalLogEntry.getSpanId(), deserializedLogEntry.getSpanId());
        assertEquals(originalLogEntry.getTraceFlags(), deserializedLogEntry.getTraceFlags());
        assertEquals(originalLogEntry.getDroppedAttributesCount(), deserializedLogEntry.getDroppedAttributesCount());
        
        // Verify attributes
        assertNotNull(deserializedLogEntry.getAttributes());
        assertEquals("hertzbeat", deserializedLogEntry.getAttributes().get("service.name"));
        assertEquals("1.0.0", deserializedLogEntry.getAttributes().get("service.version"));
        assertEquals("test", deserializedLogEntry.getAttributes().get("environment"));
        
        // Verify resource
        assertNotNull(deserializedLogEntry.getResource());
        assertEquals("localhost", deserializedLogEntry.getResource().get("host.name"));
        assertEquals("linux", deserializedLogEntry.getResource().get("os.type"));
        
        // Verify instrumentation scope
        assertNotNull(deserializedLogEntry.getInstrumentationScope());
        assertEquals("org.apache.hertzbeat.test", deserializedLogEntry.getInstrumentationScope().getName());
        assertEquals("1.0.0", deserializedLogEntry.getInstrumentationScope().getVersion());
    }

    @Test
    void testDeserializeWithSimpleLogEntry() {
        // Test with minimal log entry
        LogEntry originalLogEntry = LogEntry.builder()
                .timeUnixNano(System.currentTimeMillis() * 1_000_000L)
                .severityNumber(17) // ERROR level
                .severityText("ERROR")
                .body("Simple error message")
                .build();

        // Serialize and deserialize
        byte[] bytes = serializer.serialize("test-topic", originalLogEntry);
        LogEntry deserializedLogEntry = deserializer.deserialize("test-topic", bytes);

        assertNotNull(deserializedLogEntry);
        assertEquals(originalLogEntry.getTimeUnixNano(), deserializedLogEntry.getTimeUnixNano());
        assertEquals(originalLogEntry.getSeverityNumber(), deserializedLogEntry.getSeverityNumber());
        assertEquals(originalLogEntry.getSeverityText(), deserializedLogEntry.getSeverityText());
        assertEquals(originalLogEntry.getBody(), deserializedLogEntry.getBody());
    }

    @Test
    void testDeserializeWithNullData() {
        // Test deserialization with null data
        LogEntry logEntry = deserializer.deserialize("test-topic", null);

        assertNull(logEntry);
    }

    @Test
    void testDeserializeWithEmptyData() {
        // Test deserialization with empty data
        byte[] emptyData = new byte[0];
        LogEntry logEntry = deserializer.deserialize("test-topic", emptyData);

        assertNull(logEntry);
    }

    @Test
    void testDeserializeWithInvalidData() {
        // Test deserialization with invalid JSON data
        byte[] invalidData = "invalid json data".getBytes(StandardCharsets.UTF_8);
        LogEntry logEntry = deserializer.deserialize("test-topic", invalidData);

        assertNull(logEntry);
    }

    @Test
    void testDeserializeWithMalformedJson() {
        // Test deserialization with malformed JSON
        String malformedJson = "{\"severityText\":\"INFO\",\"body\":\"test\","; // Missing closing brace
        byte[] malformedData = malformedJson.getBytes(StandardCharsets.UTF_8);
        LogEntry logEntry = deserializer.deserialize("test-topic", malformedData);

        assertNull(logEntry);
    }

    @Test
    void testDeserializeWithHeaders() {
        // Test deserialization with headers
        LogEntry originalLogEntry = LogEntry.builder()
                .timeUnixNano(System.currentTimeMillis() * 1_000_000L)
                .severityNumber(13) // WARN level
                .severityText("WARN")
                .body("Warning message with headers")
                .build();

        // Serialize and deserialize with headers
        byte[] bytes = serializer.serialize("test-topic", headers, originalLogEntry);
        LogEntry deserializedLogEntry = deserializer.deserialize("test-topic", headers, bytes);

        assertNotNull(deserializedLogEntry);
        assertEquals(originalLogEntry.getSeverityText(), deserializedLogEntry.getSeverityText());
        assertEquals(originalLogEntry.getBody(), deserializedLogEntry.getBody());
        assertEquals(originalLogEntry.getSeverityNumber(), deserializedLogEntry.getSeverityNumber());
    }

    @Test
    void testDeserializeWithComplexAttributes() {
        // Test with complex nested attributes
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("string_value", "test_string");
        attributes.put("numeric_value", 42);
        attributes.put("boolean_value", true);
        
        // Note: Nested objects will be deserialized as LinkedHashMap by Jackson
        Map<String, Object> nestedMap = new HashMap<>();
        nestedMap.put("nested_key", "nested_value");
        attributes.put("nested_object", nestedMap);
        
        LogEntry originalLogEntry = LogEntry.builder()
                .timeUnixNano(System.currentTimeMillis() * 1_000_000L)
                .severityNumber(5) // DEBUG level
                .severityText("DEBUG")
                .body("Debug message with complex attributes")
                .attributes(attributes)
                .build();

        // Serialize and deserialize
        byte[] bytes = serializer.serialize("test-topic", originalLogEntry);
        LogEntry deserializedLogEntry = deserializer.deserialize("test-topic", bytes);

        assertNotNull(deserializedLogEntry);
        assertEquals(originalLogEntry.getSeverityText(), deserializedLogEntry.getSeverityText());
        assertEquals(originalLogEntry.getBody(), deserializedLogEntry.getBody());
        
        // Verify complex attributes
        assertNotNull(deserializedLogEntry.getAttributes());
        assertEquals("test_string", deserializedLogEntry.getAttributes().get("string_value"));
        assertEquals(42, deserializedLogEntry.getAttributes().get("numeric_value"));
        assertEquals(true, deserializedLogEntry.getAttributes().get("boolean_value"));
        
        // Verify nested object (will be LinkedHashMap after JSON deserialization)
        Object nestedObject = deserializedLogEntry.getAttributes().get("nested_object");
        assertNotNull(nestedObject);
    }

    @Test
    void testDeserializeWithPartialLogEntry() {
        // Test with valid JSON but partial log entry structure
        String partialJson = "{\"severityText\":\"INFO\",\"body\":\"partial log entry\"}";
        byte[] partialData = partialJson.getBytes(StandardCharsets.UTF_8);
        LogEntry logEntry = deserializer.deserialize("test-topic", partialData);

        assertNotNull(logEntry);
        assertEquals("INFO", logEntry.getSeverityText());
        assertEquals("partial log entry", logEntry.getBody());
        assertNull(logEntry.getSeverityNumber()); // Not provided in JSON
        assertNull(logEntry.getTimeUnixNano()); // Not provided in JSON
    }

    @Test
    void testClose() {
        // Test that close method doesn't throw any exceptions
        deserializer.close();
    }
}
