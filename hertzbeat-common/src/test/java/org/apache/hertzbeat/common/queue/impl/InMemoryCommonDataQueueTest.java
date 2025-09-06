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

package org.apache.hertzbeat.common.queue.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link InMemoryCommonDataQueue}
 */
class InMemoryCommonDataQueueTest {

    private InMemoryCommonDataQueue queue;

    @BeforeEach
    void setUp() {
        queue = new InMemoryCommonDataQueue();
    }

    @Test
    void testMetricsData() throws InterruptedException {

        var metricsData = CollectRep.MetricsData.newBuilder().build();

        queue.sendMetricsData(metricsData);

        CollectRep.MetricsData polledMetricsData = queue.pollMetricsDataToAlerter();

        assertNotNull(polledMetricsData);
        assertEquals(metricsData, polledMetricsData);
    }

    @Test
    void testLogEntry() throws InterruptedException {
        
        // Create a test log entry with comprehensive data
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("service.name", "hertzbeat");
        attributes.put("service.version", "1.0.0");
        
        Map<String, Object> resource = new HashMap<>();
        resource.put("host.name", "localhost");
        resource.put("os.type", "linux");
        
        LogEntry.InstrumentationScope scope = LogEntry.InstrumentationScope.builder()
                .name("org.apache.hertzbeat.test")
                .version("1.0.0")
                .build();
        
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(Instant.now().toEpochMilli() * 1_000_000L)
                .observedTimeUnixNano(Instant.now().toEpochMilli() * 1_000_000L)
                .severityNumber(9) // INFO level
                .severityText("INFO")
                .body("Test log message for hertzbeat queue")
                .attributes(attributes)
                .resource(resource)
                .instrumentationScope(scope)
                .traceId("1234567890abcdef1234567890abcdef")
                .spanId("1234567890abcdef")
                .traceFlags(1)
                .build();
        
        // Test sending and polling log entry
        queue.sendLogEntry(logEntry);
        
        LogEntry polledLogEntry = queue.pollLogEntry();
        
        assertNotNull(polledLogEntry);
        assertEquals(logEntry.getSeverityText(), polledLogEntry.getSeverityText());
        assertEquals(logEntry.getBody(), polledLogEntry.getBody());
        assertEquals(logEntry.getTraceId(), polledLogEntry.getTraceId());
        assertEquals(logEntry.getSpanId(), polledLogEntry.getSpanId());
    }
    
    @Test
    void testLogEntryToStorage() throws InterruptedException {
        
        // Create a simple log entry for storage test
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(Instant.now().toEpochMilli() * 1_000_000L)
                .severityNumber(17) // ERROR level
                .severityText("ERROR")
                .body("Error log message for storage")
                .build();
        
        // Test sending and polling log entry to storage
        queue.sendLogEntryToStorage(logEntry);
        
        LogEntry polledLogEntry = queue.pollLogEntryToStorage();
        
        assertNotNull(polledLogEntry);
        assertEquals(logEntry.getSeverityText(), polledLogEntry.getSeverityText());
        assertEquals(logEntry.getBody(), polledLogEntry.getBody());
        assertEquals(logEntry.getSeverityNumber(), polledLogEntry.getSeverityNumber());
    }

    @Test
    void testGetQueueSizeMetricsInfo() {

        Map<String, Integer> metricsInfo = queue.getQueueSizeMetricsInfo();
        
        assertEquals(0, metricsInfo.get("metricsDataToAlertQueue"));
        assertEquals(0, metricsInfo.get("metricsDataToStorageQueue"));
        assertEquals(0, metricsInfo.get("logEntryQueue"));
        assertEquals(0, metricsInfo.get("logEntryToStorageQueue"));
        
        // Add metrics data and log entries
        queue.sendMetricsData(CollectRep.MetricsData.newBuilder().build());
        queue.sendLogEntry(LogEntry.builder().body("Test log").build());
        queue.sendLogEntryToStorage(LogEntry.builder().body("Storage log").build());

        metricsInfo = queue.getQueueSizeMetricsInfo();
        
        assertEquals(1, metricsInfo.get("metricsDataToAlertQueue"));
        assertEquals(0, metricsInfo.get("metricsDataToStorageQueue"));
        assertEquals(1, metricsInfo.get("logEntryQueue"));
        assertEquals(1, metricsInfo.get("logEntryToStorageQueue"));
    }

    @Test
    void testDestroy() {
        
        // Add both metrics data and log entries before destroy
        queue.sendMetricsData(CollectRep.MetricsData.newBuilder().build());
        queue.sendLogEntry(LogEntry.builder().body("Test log").build());
        queue.sendLogEntryToStorage(LogEntry.builder().body("Storage log").build());

        queue.destroy();

        Map<String, Integer> metricsInfo = queue.getQueueSizeMetricsInfo();
        
        assertEquals(0, metricsInfo.get("metricsDataToAlertQueue"));
        assertEquals(0, metricsInfo.get("metricsDataToStorageQueue"));
        assertEquals(0, metricsInfo.get("logEntryQueue"));
        assertEquals(0, metricsInfo.get("logEntryToStorageQueue"));
    }

}
