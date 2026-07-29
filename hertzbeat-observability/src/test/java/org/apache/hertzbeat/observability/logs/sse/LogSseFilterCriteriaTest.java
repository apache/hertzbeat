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

package org.apache.hertzbeat.observability.logs.sse;

import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
        filterCriteria.setWorkspaceId("default");
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
    void severityNumberFilterRejectsLogWithoutSeverityNumber() {
        filterCriteria.setSeverityNumber(9);

        assertFalse(filterCriteria.matches(LogEntry.builder()
                .severityText("INFO")
                .body("missing severity number")
                .build()));
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
    void testMatchesWithLogContentFilter() {
        // Test log content filter - match
        filterCriteria.setLogContent("Test log");
        assertTrue(filterCriteria.matches(testLogEntry));

        // Test log content filter - no match
        filterCriteria.setLogContent("Error message");
        assertFalse(filterCriteria.matches(testLogEntry));

        // Test log content filter - case insensitive
        filterCriteria.setLogContent("test log");
        assertTrue(filterCriteria.matches(testLogEntry));

        // Test log content filter - partial match
        filterCriteria.setLogContent("message");
        assertTrue(filterCriteria.matches(testLogEntry));

        // Test log content filter with null body
        LogEntry nullBodyLog = LogEntry.builder()
                .severityNumber(9)
                .severityText("INFO")
                .body(null)
                .build();
        filterCriteria.setLogContent("test");
        assertFalse(filterCriteria.matches(nullBodyLog));
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
    void hideInternalMatchesHistoricalWorkspaceInfrastructureSemantics() {
        filterCriteria.setHideInternal(true);

        assertFalse(filterCriteria.matches(logFromService(null)));
        assertFalse(filterCriteria.matches(logFromService("otelcol-contrib")));
        assertFalse(filterCriteria.matches(logFromService("frontend-proxy")));
        assertTrue(filterCriteria.matches(logFromService("kafka")));
        assertTrue(filterCriteria.matches(logFromService("checkout")));
    }

    @Test
    void hideNoiseMatchesHistoricalInternalAndDemoInfrastructureSemantics() {
        filterCriteria.setHideNoise(true);

        assertFalse(filterCriteria.matches(logFromService(null)));
        assertFalse(filterCriteria.matches(logFromService("opentelemetry-collector")));
        assertFalse(filterCriteria.matches(logFromService("load-generator")));
        assertFalse(filterCriteria.matches(logFromService("postgresql")));
        assertTrue(filterCriteria.matches(logFromService("checkout")));
    }

    @Test
    void testMatchesWithServiceContextFilters() {
        LogEntry checkoutProdLog = LogEntry.builder()
                .severityText("INFO")
                .body("checkout log")
                .resource(java.util.Map.of(
                        "service.name", "checkout",
                        "service.namespace", "payments",
                        "deployment.environment.name", "prod",
                        "hertzbeat.entity_id", "42",
                        "hertzbeat.entity_type", "service"))
                .build();
        LogEntry paymentStagingLog = LogEntry.builder()
                .severityText("INFO")
                .body("payment log")
                .resource(java.util.Map.of(
                        "service.name", "payment",
                        "service.namespace", "payments",
                        "deployment.environment.name", "staging",
                        "hertzbeat.entity_id", "43",
                        "hertzbeat.entity_type", "service"))
                .build();

        filterCriteria.setServiceName("checkout");
        filterCriteria.setServiceNamespace("payments");
        filterCriteria.setEnvironment("prod");
        filterCriteria.setEntityId("42");
        filterCriteria.setEntityType("service");

        assertTrue(filterCriteria.matches(checkoutProdLog));
        assertFalse(filterCriteria.matches(paymentStagingLog));
    }

    @Test
    void matchesOnlyCanonicalCollectorResourceContext() {
        LogEntry selectedCollectorLog = LogEntry.builder()
                .resource(java.util.Map.of("hertzbeat.collector.id", "collector-a"))
                .build();
        LogEntry otherCollectorLog = LogEntry.builder()
                .resource(java.util.Map.of("hertzbeat.collector.id", "collector-b"))
                .build();
        LogEntry unscopedLog = LogEntry.builder().resource(java.util.Map.of()).build();

        filterCriteria.setCollectorId("collector-a");

        assertTrue(filterCriteria.matches(selectedCollectorLog));
        assertFalse(filterCriteria.matches(otherCollectorLog));
        assertFalse(filterCriteria.matches(unscopedLog));
    }

    @Test
    void matchesOnlyCanonicalInstanceAndHttpRouteContext() {
        LogEntry selectedLog = LogEntry.builder()
                .resource(java.util.Map.of("service.instance.id", "checkout-7d9"))
                .attributes(java.util.Map.of("http.route", "/checkout"))
                .build();
        LogEntry otherInstance = LogEntry.builder()
                .resource(java.util.Map.of("service.instance.id", "checkout-other"))
                .attributes(java.util.Map.of("http.route", "/checkout"))
                .build();
        LogEntry missingRoute = LogEntry.builder()
                .resource(java.util.Map.of("service.instance.id", "checkout-7d9"))
                .build();

        filterCriteria.setInstance("checkout-7d9");
        filterCriteria.setEndpoint("/checkout");

        assertTrue(filterCriteria.matches(selectedLog));
        assertFalse(filterCriteria.matches(otherInstance));
        assertFalse(filterCriteria.matches(missingRoute));
    }

    @Test
    void testMatchesWithResourceAndAttributeFilters() {
        LogEntry checkoutLog = LogEntry.builder()
                .severityText("INFO")
                .body("checkout log")
                .resource(java.util.Map.of(
                        "service.version", "1.2.3",
                        "cloud.region", "us-east-1"))
                .attributes(java.util.Map.of(
                        "http.route", "/checkout",
                        "error.message", "payment timeout"))
                .build();
        LogEntry cartLog = LogEntry.builder()
                .severityText("INFO")
                .body("cart log")
                .resource(java.util.Map.of(
                        "service.version", "1.2.4",
                        "cloud.region", "eu-west-1"))
                .attributes(java.util.Map.of(
                        "http.route", "/cart",
                        "error.message", "cart timeout"))
                .build();

        filterCriteria.setResourceFilter("service.version=1.2.3, cloud.region IN ('us-east-1')");
        filterCriteria.setAttributeFilter("http.route:/checkout and error.message CONTAINS payment");

        assertTrue(filterCriteria.matches(checkoutLog));
        assertFalse(filterCriteria.matches(cartLog));
    }

    @Test
    void matchesCompleteLiveTelemetryContextWithoutIgnoringAnyDimension() {
        LogEntry selectedLog = LogEntry.builder()
                .severityNumber(17)
                .severityText("ERROR")
                .traceId("trace-a")
                .spanId("span-a")
                .resource(java.util.Map.of(
                        "service_name", "checkout",
                        "service_namespace", "payments",
                        "deployment_environment_name", "prod",
                        "hertzbeat_collector_id", "collector-a",
                        "service_instance_id", "checkout-7d9",
                        "hertzbeat_workspace_id", "team-a",
                        "service_version", "1.2.3"))
                .attributes(java.util.Map.of(
                        "http_route", "/checkout",
                        "error_type", "Timeout"))
                .body("checkout failed")
                .build();
        filterCriteria.setSeverityNumber(17);
        filterCriteria.setSeverityText("ERROR");
        filterCriteria.setTraceId("trace-a");
        filterCriteria.setSpanId("span-a");
        filterCriteria.setServiceName("checkout");
        filterCriteria.setServiceNamespace("payments");
        filterCriteria.setEnvironment("prod");
        filterCriteria.setCollectorId("collector-a");
        filterCriteria.setInstance("checkout-7d9");
        filterCriteria.setEndpoint("/checkout");
        filterCriteria.setWorkspaceId("team-a");
        filterCriteria.setResourceFilter("service.version=1.2.3");
        filterCriteria.setAttributeFilter("error.type=Timeout");

        assertTrue(filterCriteria.matches(selectedLog));

        filterCriteria.setWorkspaceId("team-b");
        assertFalse(filterCriteria.matches(selectedLog));
        filterCriteria.setWorkspaceId("team-a");
        filterCriteria.setCollectorId("collector-b");
        assertFalse(filterCriteria.matches(selectedLog));
        filterCriteria.setCollectorId("collector-a");
        filterCriteria.setResourceFilter("service.version=2.0.0");
        assertFalse(filterCriteria.matches(selectedLog));
        filterCriteria.setResourceFilter("service.version=1.2.3");
        filterCriteria.setAttributeFilter("error.type=Database");
        assertFalse(filterCriteria.matches(selectedLog));
    }

    @Test
    void rejectsInvalidOrPartiallyInvalidAttributeFilterExpressions() {
        filterCriteria.setResourceFilter("not-a-filter");
        assertThrows(IllegalArgumentException.class, filterCriteria::validate);

        filterCriteria.setResourceFilter("service.version=1.2.3, not-a-filter");
        assertThrows(IllegalArgumentException.class, filterCriteria::validate);

        filterCriteria.setResourceFilter("service.version=1.2.3");
        filterCriteria.setAttributeFilter("http.route=/checkout, broken");
        assertThrows(IllegalArgumentException.class, filterCriteria::validate);
        assertThrows(IllegalArgumentException.class, () -> filterCriteria.matches(testLogEntry));
    }

    @Test
    void rejectsUnclosedQuotesParenthesesAndEmptyClauses() {
        filterCriteria.setResourceFilter("service.version='unterminated");
        assertThrows(IllegalArgumentException.class, filterCriteria::validate);

        filterCriteria.setResourceFilter("service.version=(1.2.3");
        assertThrows(IllegalArgumentException.class, filterCriteria::validate);

        filterCriteria.setResourceFilter("service.version=1.2.3,,cloud.region=us-east-1");
        assertThrows(IllegalArgumentException.class, filterCriteria::validate);
    }

    @Test
    void rejectsEmptyOrUnclosedListValues() {
        for (String invalidFilter : java.util.List.of(
                "service.version IN (a,,b)",
                "service.version IN (a,)",
                "service.version IN (,a)",
                "service.version IN ('unterminated,b)")) {
            filterCriteria.setResourceFilter(invalidFilter);
            assertThrows(IllegalArgumentException.class, filterCriteria::validate);
        }
    }

    @Test
    void rejectsDuplicateFilterKeys() {
        filterCriteria.setResourceFilter("service.version=1.2.3,service.version=1.2.4");
        assertThrows(IllegalArgumentException.class, filterCriteria::validate);

        filterCriteria.setResourceFilter("service.version=1.2.3");
        filterCriteria.setAttributeFilter("http.route EXISTS,http.route=/checkout");
        assertThrows(IllegalArgumentException.class, filterCriteria::validate);

        filterCriteria.setAttributeFilter(null);
        filterCriteria.setResourceFilter("service.version=1.2.3,service_version=1.2.4");
        assertThrows(IllegalArgumentException.class, filterCriteria::validate);
    }

    @Test
    void missingSubscriptionWorkspaceFailsClosed() {
        filterCriteria.setWorkspaceId(null);

        assertThrows(IllegalArgumentException.class, filterCriteria::validate);
        assertThrows(IllegalArgumentException.class, () -> filterCriteria.matches(LogEntry.builder()
                .resource(java.util.Map.of("hertzbeat_workspace_id", "default"))
                .build()));
    }

    @Test
    void workspaceBoundaryRecognizesOnlySupportedResourceAliases() {
        filterCriteria.setWorkspaceId("team-a");

        for (String key : java.util.List.of(
                "hertzbeat.workspace_id", "hertzbeat_workspace_id", "workspace_id", "workspace.id")) {
            assertTrue(filterCriteria.matches(LogEntry.builder()
                    .resource(java.util.Map.of(key, "team-a"))
                    .build()));
            assertFalse(filterCriteria.matches(LogEntry.builder()
                    .resource(java.util.Map.of(key, "team-b"))
                    .build()));
        }
    }

    @Test
    void testMatchesWithNegativeResourceAndAttributeFilters() {
        LogEntry checkoutLog = LogEntry.builder()
                .severityText("INFO")
                .body("checkout log")
                .resource(java.util.Map.of("service.version", "1.2.3"))
                .attributes(java.util.Map.of("http.route", "/checkout"))
                .build();
        LogEntry cartLog = LogEntry.builder()
                .severityText("INFO")
                .body("cart log")
                .resource(java.util.Map.of("service.version", "1.2.4"))
                .attributes(java.util.Map.of("http.route", "/cart"))
                .build();

        filterCriteria.setResourceFilter("service.version!=1.2.4");
        filterCriteria.setAttributeFilter("http.route NOT IN ('/cart') and error.message NOT EXISTS");

        assertTrue(filterCriteria.matches(checkoutLog));
        assertFalse(filterCriteria.matches(cartLog));
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
                9, "INFO", null, "1234567890abcdef1234567890abcdef", "1234567890abcdef"
        );
        criteria.setWorkspaceId("default");

        assertEquals(9, criteria.getSeverityNumber());
        assertEquals("INFO", criteria.getSeverityText());
        assertEquals(null, criteria.getLogContent());
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
        criteria.setLogContent("Test log");
        criteria.setTraceId("1234567890abcdef1234567890abcdef");
        criteria.setSpanId("1234567890abcdef");
        criteria.setWorkspaceId("default");

        assertEquals(9, criteria.getSeverityNumber());
        assertEquals("INFO", criteria.getSeverityText());
        assertEquals("Test log", criteria.getLogContent());
        assertEquals("1234567890abcdef1234567890abcdef", criteria.getTraceId());
        assertEquals("1234567890abcdef", criteria.getSpanId());

        // Test matching
        assertTrue(criteria.matches(testLogEntry));
    }

    private LogEntry logFromService(String serviceName) {
        java.util.Map<String, Object> resource = serviceName == null
                ? java.util.Map.of()
                : java.util.Map.of("service.name", serviceName);
        return LogEntry.builder()
                .resource(resource)
                .body("live log")
                .build();
    }
}
