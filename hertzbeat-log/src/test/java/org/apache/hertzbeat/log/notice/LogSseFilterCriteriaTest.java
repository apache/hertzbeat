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

package org.apache.hertzbeat.log.notice;

import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;


/**
 * Unit tests for LogSseFilterCriteria.
 */
class LogSseFilterCriteriaTest {

    private LogEntry testLogEntry;
    private LogSseFilterCriteria filterCriteria;

    @BeforeEach
    void setUp() {
        // Create test LogEntry
        testLogEntry = LogEntry.builder()
                .severityNumber(9)
                .severityText("INFO")
                .traceId("1234567890abcdef1234567890abcdef")
                .spanId("1234567890abcdef")
                .body("Test log message")
                .timeUnixNano(System.currentTimeMillis() * 1_000_000L)
                .build();
        
        filterCriteria = new LogSseFilterCriteria();
    }

    @Test
    void testMatchesWithNoFilters() {
        // Should match all logs when no filters are set
        assertTrue(filterCriteria.matches(testLogEntry));
    }

    @Test
    void testMatchesWithSeverityTextFilter() {
        // Test severity text filter - match
        filterCriteria.setSeverityText("INFO");
        assertTrue(filterCriteria.matches(testLogEntry));
        
        // Test severity text filter - no match
        filterCriteria.setSeverityText("ERROR");
        assertFalse(filterCriteria.matches(testLogEntry));
        
        // Test severity text filter - case insensitive
        filterCriteria.setSeverityText("info");
        assertTrue(filterCriteria.matches(testLogEntry));
    }

    @Test
    void testMatchesWithSeverityNumberFilter() {
        // Test severity number filter - match
        filterCriteria.setSeverityNumber(9);
        assertTrue(filterCriteria.matches(testLogEntry));
        
        // Test severity number filter - no match
        filterCriteria.setSeverityNumber(1);
        assertFalse(filterCriteria.matches(testLogEntry));
        
        // Test severity number filter - null value
        filterCriteria.setSeverityNumber(null);
        assertTrue(filterCriteria.matches(testLogEntry));
    }

    @Test
    void testMatchesWithTraceIdFilter() {
        // Test Trace ID filter - match
        filterCriteria.setTraceId("1234567890abcdef1234567890abcdef");
        assertTrue(filterCriteria.matches(testLogEntry));
        
        // Test Trace ID filter - no match
        filterCriteria.setTraceId("abcdef1234567890abcdef1234567890");
        assertFalse(filterCriteria.matches(testLogEntry));
        
        // Test Trace ID filter - case insensitive
        filterCriteria.setTraceId("1234567890ABCDEF1234567890ABCDEF");
        assertTrue(filterCriteria.matches(testLogEntry));
    }

    @Test
    void testMatchesWithSpanIdFilter() {
        // Test Span ID filter - match
        filterCriteria.setSpanId("1234567890abcdef");
        assertTrue(filterCriteria.matches(testLogEntry));
        
        // Test Span ID filter - no match
        filterCriteria.setSpanId("abcdef1234567890");
        assertFalse(filterCriteria.matches(testLogEntry));
        
        // Test Span ID filter - case insensitive
        filterCriteria.setSpanId("1234567890ABCDEF");
        assertTrue(filterCriteria.matches(testLogEntry));
    }

    @Test
    void testMatchesWithMultipleFilters() {
        // Test multiple filter combinations - all match
        filterCriteria.setSeverityText("INFO");
        filterCriteria.setSeverityNumber(9);
        filterCriteria.setTraceId("1234567890abcdef1234567890abcdef");
        filterCriteria.setSpanId("1234567890abcdef");
        assertTrue(filterCriteria.matches(testLogEntry));
        
        // Test multiple filter combinations - partial no match
        filterCriteria.setSeverityText("ERROR");
        assertFalse(filterCriteria.matches(testLogEntry));
    }

    @Test
    void testMatchesWithEmptyStringFilters() {
        // Test empty string filters
        filterCriteria.setSeverityText("");
        filterCriteria.setTraceId("");
        filterCriteria.setSpanId("");
        assertTrue(filterCriteria.matches(testLogEntry));
    }

    @Test
    void testMatchesWithLogEntryHavingNullValues() {
        // Create log entry with null values
        LogEntry logWithNulls = LogEntry.builder()
                .severityNumber(null)
                .severityText(null)
                .traceId(null)
                .spanId(null)
                .body("Test log with nulls")
                .build();
        
        // Set filter criteria
        filterCriteria.setSeverityNumber(9);
        filterCriteria.setSeverityText("INFO");
        filterCriteria.setTraceId("1234567890abcdef1234567890abcdef");
        filterCriteria.setSpanId("1234567890abcdef");
        
        // Should not match because log entry values are null
        assertFalse(filterCriteria.matches(logWithNulls));
    }

    @Test
    void testConstructorWithAllParameters() {
        // Test constructor with all parameters
        LogSseFilterCriteria criteria = new LogSseFilterCriteria(
                9, "INFO", "1234567890abcdef1234567890abcdef", "1234567890abcdef"
        );
        
        assertEquals(9, criteria.getSeverityNumber());
        assertEquals("INFO", criteria.getSeverityText());
        assertEquals("1234567890abcdef1234567890abcdef", criteria.getTraceId());
        assertEquals("1234567890abcdef", criteria.getSpanId());
        
        // Test matching
        assertTrue(criteria.matches(testLogEntry));
    }

    @Test
    void testNoArgsConstructorAndSetters() {
        // Test no-args constructor and setter methods
        LogSseFilterCriteria criteria = new LogSseFilterCriteria();
        
        criteria.setSeverityNumber(9);
        criteria.setSeverityText("INFO");
        criteria.setTraceId("1234567890abcdef1234567890abcdef");
        criteria.setSpanId("1234567890abcdef");
        
        assertEquals(9, criteria.getSeverityNumber());
        assertEquals("INFO", criteria.getSeverityText());
        assertEquals("1234567890abcdef1234567890abcdef", criteria.getTraceId());
        assertEquals("1234567890abcdef", criteria.getSpanId());
        
        // Test matching
        assertTrue(criteria.matches(testLogEntry));
    }
}
