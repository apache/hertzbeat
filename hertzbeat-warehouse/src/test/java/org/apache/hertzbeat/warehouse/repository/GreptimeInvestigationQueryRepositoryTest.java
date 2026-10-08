/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.warehouse.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.LogQuery;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.IdentityQuery;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.NearbyQuery;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.Status;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.TraceQuery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

@ExtendWith(MockitoExtension.class)
class GreptimeInvestigationQueryRepositoryTest {

    private static final long START = 1_787_934_874_000L;
    private static final long END = START + 60_000L;

    @Mock
    private ObjectProvider<GreptimeSqlQueryExecutor> executorProvider;

    @Mock
    private GreptimeSqlQueryExecutor executor;

    private GreptimeInvestigationQueryRepository repository;

    @BeforeEach
    void setUp() {
        repository = new GreptimeInvestigationQueryRepository(executorProvider);
    }

    @Test
    void queriesCompleteTraceWithExplicitProjectionAndExclusiveEnd() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(traceRow()));

        var result = repository.trace(new TraceQuery(
                "team-a", "0123456789abcdef0123456789abcdef", START, END));

        assertEquals(Status.AVAILABLE, result.status());
        assertEquals(1, result.rows().size());
        assertEquals(START, result.rows().getFirst().startTime());
        assertTrue(result.rows().getFirst().spanAttributes().isEmpty());
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(executor).executeStrict(sql.capture());
        assertTrue(sql.getValue().startsWith("SELECT CAST(timestamp AS BIGINT) / 1000000 AS start_time"));
        assertFalse(sql.getValue().contains("span_attributes."));
        assertTrue(sql.getValue().contains("timestamp >= to_timestamp_millis(" + START + ")"));
        assertTrue(sql.getValue().contains("timestamp < to_timestamp_millis(" + END + ")"));
        assertFalse(sql.getValue().contains("timestamp <="));
        assertTrue(sql.getValue().endsWith("ORDER BY timestamp ASC, span_id ASC LIMIT 5001"));
    }

    @Test
    void retainsSelectedSpanOutsideBoundedBaseRead() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        List<Map<String, Object>> rows = traceRows(5_001);
        Map<String, Object> selected = new HashMap<>(traceRow());
        selected.put("span_id", String.format("%016x", 6_000));
        when(executor.executeStrict(anyString())).thenReturn(rows, List.of(selected));

        var result = repository.trace(new TraceQuery("team-a", "0123456789abcdef0123456789abcdef", START, END,
                String.format("%016x", 6_000)));

        assertEquals(Status.AVAILABLE, result.status());
        assertTrue(result.truncated());
        assertEquals(5_001, result.rows().size());
        assertEquals(String.format("%016x", 6_000), result.rows().getLast().spanId());
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(executor, org.mockito.Mockito.times(2)).executeStrict(sql.capture());
        assertTrue(sql.getAllValues().getFirst().endsWith("ORDER BY timestamp ASC, span_id ASC LIMIT 5001"));
        assertTrue(sql.getAllValues().getLast().contains("span_id = '" + String.format("%016x", 6_000) + "'"));
        assertTrue(sql.getAllValues().getLast().contains("\"resource_attributes.hertzbeat.workspace_id\" = 'team-a'"));
        assertTrue(sql.getAllValues().getLast().contains("timestamp >= to_timestamp_millis(" + START + ")"));
        assertTrue(sql.getAllValues().getLast().contains("timestamp < to_timestamp_millis(" + END + ")"));
    }

    @Test
    void readAtMaximumSpanCountDoesNotNeedAnExtraLookup() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(traceRows(5_000));

        var result = repository.trace(new TraceQuery("team-a", "0123456789abcdef0123456789abcdef", START, END));

        assertEquals(Status.AVAILABLE, result.status());
        assertFalse(result.truncated());
        assertEquals(5_000, result.rows().size());
        verify(executor).executeStrict(anyString());
    }

    @Test
    void oversizedReadWithoutSelectionReturnsOnlyTheBoundedBase() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(traceRows(5_001));

        var result = repository.trace(new TraceQuery("team-a", "0123456789abcdef0123456789abcdef", START, END));

        assertEquals(Status.AVAILABLE, result.status());
        assertTrue(result.truncated());
        assertEquals(5_000, result.rows().size());
        verify(executor).executeStrict(anyString());
    }

    @Test
    void selectedSpanAlreadyInBaseDoesNotNeedAnExtraLookup() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(traceRows(5_001));

        var result = repository.trace(new TraceQuery("team-a", "0123456789abcdef0123456789abcdef", START, END,
                String.format("%016x", 4_000)));

        assertEquals(Status.AVAILABLE, result.status());
        assertTrue(result.truncated());
        assertEquals(5_000, result.rows().size());
        assertTrue(result.rows().stream().anyMatch(span -> span.spanId().equals(String.format("%016x", 4_000))));
        verify(executor).executeStrict(anyString());
    }

    @Test
    void absentSelectedLookupDoesNotMakeBaseReadMalformed() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(traceRows(5_001), List.of());

        var result = repository.trace(new TraceQuery("team-a", "0123456789abcdef0123456789abcdef", START, END,
                String.format("%016x", 6_000)));

        assertEquals(Status.AVAILABLE, result.status());
        assertTrue(result.truncated());
        assertEquals(5_000, result.rows().size());
        org.mockito.Mockito.verify(executor, org.mockito.Mockito.times(2)).executeStrict(anyString());
    }

    @Test
    void duplicateSelectedLookupIsMalformed() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        Map<String, Object> duplicate = new HashMap<>(traceRow());
        duplicate.put("span_id", String.format("%016x", 6_000));
        when(executor.executeStrict(anyString())).thenReturn(traceRows(5_001), List.of(duplicate, duplicate));

        var result = repository.trace(new TraceQuery("team-a", "0123456789abcdef0123456789abcdef", START, END,
                String.format("%016x", 6_000)));

        assertEquals(Status.MALFORMED_DATA, result.status());
        assertTrue(result.rows().isEmpty());
    }

    @Test
    void completeReadDoesNotAppendSelectionOutsideItsSnapshot() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(traceRow()));

        var result = repository.trace(new TraceQuery("team-a", "0123456789abcdef0123456789abcdef", START, END,
                "3333333333333333"));

        assertEquals(Status.AVAILABLE, result.status());
        assertFalse(result.truncated());
        assertEquals(1, result.rows().size());
        verify(executor).executeStrict(anyString());
    }

    @Test
    void preservesCompleteObservedAttributesAndSubMillisecondEnvelope() {
        Map<String, Object> row = new HashMap<>(traceRow());
        row.put("start_time_unix_nano", START * 1_000_000L + 900_000L);
        row.put("end_time_unix_nano", START * 1_000_000L + 1_100_000L);
        row.put("duration_nano", 200_000L);
        row.put("span_attributes.http.request.method", "GET");
        row.put("span_attributes.http.response.status_code", 200L);
        row.put("resource_attributes.host.arch", "aarch64");
        row.put("resource_attributes.process.command_args", List.of("java", "-jar", "app.jar"));
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(row));
        var result = repository.trace(new TraceQuery("team-a", "0123456789abcdef0123456789abcdef", START, END));
        assertEquals(Status.AVAILABLE, result.status());
        var span = result.rows().getFirst();
        assertEquals("GET", span.spanAttributes().get("http.request.method"));
        assertEquals("200", span.spanAttributes().get("http.response.status_code"));
        assertEquals("aarch64", span.resourceAttributes().get("host.arch"));
        assertEquals("[\"java\",\"-jar\",\"app.jar\"]", span.resourceAttributes().get("process.command_args"));
        assertEquals(START + 2, span.observedEndTime());
    }

    @Test
    void traceRejectsInconsistentExplicitEndInsteadOfChangingDuration() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        for (long offset : List.of(-1L, 1L)) {
            Map<String, Object> row = new HashMap<>(traceRow());
            row.put("end_time_unix_nano", START * 1_000_000L + 2_000_000L + offset);
            when(executor.executeStrict(anyString())).thenReturn(List.of(row));
            var result = repository.trace(new TraceQuery("team-a", "0123456789abcdef0123456789abcdef", START, END));
            assertEquals(Status.MALFORMED_DATA, result.status());
            assertTrue(result.rows().isEmpty());
        }
    }

    @Test
    void nativeGreptimeEventTimePreservesNanoseconds() {
        Map<String, Object> row = new HashMap<>(traceRow());
        row.put("span_events", List.of(Map.of("name", "exception", "time", "2026-09-08 14:03:30.644257+0000",
                "attributes", Map.of("exception.type", "ProofException"))));
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(row));
        var result = repository.trace(new TraceQuery("team-a", "0123456789abcdef0123456789abcdef", START, END));
        assertEquals(Status.AVAILABLE, result.status());
        assertEquals("1788876210644257000", result.rows().getFirst().spanEvents().getFirst().timeUnixNano());
        assertEquals("ProofException", result.rows().getFirst().spanEvents().getFirst().attributes().get("exception.type"));
    }

    @Test
    void nativeGreptimeEventAndBothLinksDecodeTogether() {
        Map<String, Object> row = new HashMap<>(traceRow());
        row.put("span_events", """
                [{"attributes":{"exception.message":"Local relation proof only",
                  "exception.stacktrace":"ProofHandler.call(ProofHandler.java:1)","exception.type":"ProofException"},
                  "name":"exception","time":"2026-09-08 14:03:30.644257+0000"}]
                """);
        row.put("span_links", """
                [{"attributes":{"proof.link":"same-trace"},"span_id":"6ac72aa8fd4349fc",
                  "trace_id":"d3bb09f2cc144e23acc717df6f5d485b","trace_state":""},
                 {"attributes":{"proof.link":"unobserved-trace"},"span_id":"10479680800745e6",
                  "trace_id":"cae12db98f5c4787bdaf0c655e37cfb8","trace_state":""}]
                """);
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(row));
        var result = repository.trace(new TraceQuery("team-a", "0123456789abcdef0123456789abcdef", START, END));
        assertEquals(Status.AVAILABLE, result.status());
        var span = result.rows().getFirst();
        assertEquals("1788876210644257000", span.spanEvents().getFirst().timeUnixNano());
        assertEquals(2, span.spanLinks().size());
        assertEquals("", span.spanLinks().getFirst().traceState());
        assertEquals("", span.spanLinks().getLast().traceState());
        assertEquals("same-trace", span.spanLinks().getFirst().attributes().get("proof.link"));
        assertEquals("unobserved-trace", span.spanLinks().getLast().attributes().get("proof.link"));
    }

    @Test
    void nativeLinkTraceStateRetainsLengthBound() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        for (int length : List.of(0, 512, 513)) {
            Map<String, Object> row = new HashMap<>(traceRow());
            row.put("span_links", List.of(Map.of("trace_id", "d3bb09f2cc144e23acc717df6f5d485b",
                    "span_id", "6ac72aa8fd4349fc", "trace_state", "a".repeat(length))));
            when(executor.executeStrict(anyString())).thenReturn(List.of(row));
            var result = repository.trace(new TraceQuery("team-a", "0123456789abcdef0123456789abcdef", START, END));
            assertEquals(length <= 512 ? Status.AVAILABLE : Status.MALFORMED_DATA, result.status());
            if (length <= 512) {
                assertEquals("a".repeat(length), result.rows().getFirst().spanLinks().getFirst().traceState());
            } else {
                assertTrue(result.rows().isEmpty());
            }
        }
    }

    @ParameterizedTest
    @CsvSource({
            "2026-09-08 14:03:30.644257123+0000, 1788876210644257123",
            "2026-09-08 22:03:30.644257123+0800, 1788876210644257123",
            "2026-09-08 14:03:30+0000, 1788876210000000000"
    })
    void nativeGreptimeEventFractionsAndOffsetsAreExact(String timestamp, String expected) {
        var result = eventResult(Map.of("name", "event", "time", timestamp));
        assertEquals(Status.AVAILABLE, result.status());
        assertEquals(expected, result.rows().getFirst().spanEvents().getFirst().timeUnixNano());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "not-a-time", "2026-02-30 14:03:30+0000", "2026-09-08 14:03:30",
            "2026-09-08 14:03:30.1234567890+0000", "2026-09-08 14:03:30.+0000",
            "1969-12-31 23:59:59+0000", "2500-01-01 00:00:00+0000"})
    void malformedNativeEventTimeNeverReceivesDefaultTimestamp(String timestamp) {
        var result = eventResult(Map.of("name", "event", "time", timestamp));
        assertEquals(Status.MALFORMED_DATA, result.status());
        assertTrue(result.rows().isEmpty());
    }

    @Test
    void explicitNumericEventTimeHasStrictPrecedence() {
        for (String field : List.of("time_unix_nano", "timeUnixNano")) {
            var valid = eventResult(Map.of("name", "event", field, "1788876210644257123", "time", "invalid"));
            assertEquals(Status.AVAILABLE, valid.status());
            assertEquals("1788876210644257123", valid.rows().getFirst().spanEvents().getFirst().timeUnixNano());
            for (Object invalid : List.of("invalid", 0L, -1L, "1.5")) {
                var rejected = eventResult(Map.of("name", "event", field, invalid,
                        "time", "2026-09-08 14:03:30.644257+0000"));
                assertEquals(Status.MALFORMED_DATA, rejected.status());
            }
            Map<String, Object> nullNumeric = new HashMap<>();
            nullNumeric.put(field, null);
            nullNumeric.put("time", "2026-09-08 14:03:30.644257+0000");
            assertEquals(Status.MALFORMED_DATA, eventResult(nullNumeric).status());
        }
        assertEquals(Status.MALFORMED_DATA, eventResult(Map.of("name", "event")).status());
        assertEquals(Status.MALFORMED_DATA, eventResult(Map.of("name", "event", "time", 1788876210644257123L)).status());
    }

    private InvestigationQueryRepository.RowsResult<InvestigationQueryRepository.TraceSpanRow> eventResult(Map<String, Object> event) {
        Map<String, Object> row = new HashMap<>(traceRow());
        row.put("span_events", List.of(event));
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(row));
        return repository.trace(new TraceQuery("team-a", "0123456789abcdef0123456789abcdef", START, END));
    }

    @Test
    void selectedLogUsesWorkspaceAndUidLimitTwoAndPreservesNanoseconds() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(logRow("event-7")));

        var result = repository.selectedLog(new LogQuery("team-a", "event-7", START, END));

        assertEquals(Status.AVAILABLE, result.status());
        assertEquals("1787934874782123456", result.rows().getFirst().timeUnixNano());
        assertEquals(null, result.rows().getFirst().observedTimeUnixNano());
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(executor).executeStrict(sql.capture());
        assertTrue(sql.getValue().contains(" FROM hertzbeat_logs WHERE "));
        assertFalse(sql.getValue().contains(" FROM hzb_logs "));
        assertTrue(sql.getValue().contains("log_record_uid = 'event-7'"));
        assertTrue(sql.getValue().contains("hertzbeat_workspace_id = 'team-a'"));
        assertTrue(sql.getValue().contains("timestamp < to_timestamp_millis(" + END + ")"));
        assertFalse(sql.getValue().contains("observed_time_unix_nano"));
        assertTrue(sql.getValue().endsWith("ORDER BY timestamp ASC, log_record_uid ASC LIMIT 2"));
    }

    @Test
    void duplicateSelectedUidIsMalformedInsteadOfPickingFirst() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(logRow("event-7"), logRow("event-7")));

        var result = repository.selectedLog(new LogQuery("team-a", "event-7", START, END));

        assertEquals(Status.MALFORMED_DATA, result.status());
        assertTrue(result.rows().isEmpty());
    }

    @Test
    void providerResolutionFailureIsUnavailable() {
        when(executorProvider.getIfAvailable()).thenThrow(new IllegalStateException("bean failure"));

        var result = repository.trace(new TraceQuery(
                "team-a", "0123456789abcdef0123456789abcdef", START, END));

        assertEquals(Status.STORAGE_UNAVAILABLE, result.status());
        assertTrue(result.rows().isEmpty());
    }

    @Test
    void rejectsUppercaseQueryAndPersistedSpanIdentifiers() {
        assertThrows(IllegalArgumentException.class, () -> new TraceQuery(
                "team-a", "0123456789ABCDEF0123456789ABCDEF", START, END));

        Map<String, Object> uppercaseSpanRow = new HashMap<>(traceRow());
        uppercaseSpanRow.put("span_id", "0123456789ABCDEF");
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(uppercaseSpanRow));

        var result = repository.trace(new TraceQuery(
                "team-a", "0123456789abcdef0123456789abcdef", START, END));

        assertEquals(Status.MALFORMED_DATA, result.status());
        assertTrue(result.rows().isEmpty());
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 2, 13, 25, 26})
    void nearbyLogsReverseImmutableMappedRowsWithoutLosingEitherSide(int beforeCount) {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        var before = java.util.stream.IntStream.range(0, beforeCount)
                .mapToObj(index -> logRow("before-" + (beforeCount - index))).toList();
        when(executor.executeStrict(anyString())).thenReturn(before,
                List.of(logRow("after-1"), logRow("after-2")));

        var result = repository.nearbyLogs(new NearbyQuery("team-a", "event-7", 1_787_934_874_782_123_456L,
                "checkout", "7", "service", "payments", "prod", START, END));

        assertEquals(Status.AVAILABLE, result.status());
        assertEquals(Math.min(beforeCount, 25), result.before().size());
        assertEquals(beforeCount > 25, result.hasMoreBefore());
        assertFalse(result.hasMoreAfter());
        assertEquals(List.of("after-1", "after-2"), result.after().stream().map(row -> row.logRecordUid()).toList());
        if (beforeCount > 0) {
            assertEquals("before-" + Math.max(1, beforeCount - 24), result.before().getFirst().logRecordUid());
            assertEquals("before-" + beforeCount, result.before().getLast().logRecordUid());
        }
    }

    @Test
    void nearbyLogsUseTimestampAndUidTieBreakersInBothDirections() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of());
        long selectedTime = 1_787_934_874_782_123_456L;

        repository.nearbyLogs(new NearbyQuery("team-a", "event-7", selectedTime, "checkout", "7",
                "service", "payments", "prod", START, END));

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(executor, org.mockito.Mockito.times(2)).executeStrict(sql.capture());
        assertTrue(sql.getAllValues().stream().allMatch(value -> value.contains(" FROM hertzbeat_logs WHERE ")));
        assertTrue(sql.getAllValues().get(0).contains("(CAST(timestamp AS BIGINT) < " + selectedTime
                + " OR (CAST(timestamp AS BIGINT) = " + selectedTime
                + " AND log_record_uid < 'event-7'))"));
        assertTrue(sql.getAllValues().get(0).endsWith("ORDER BY timestamp DESC, log_record_uid DESC LIMIT 26"));
        assertTrue(sql.getAllValues().get(1).contains("(CAST(timestamp AS BIGINT) > " + selectedTime
                + " OR (CAST(timestamp AS BIGINT) = " + selectedTime
                + " AND log_record_uid > 'event-7'))"));
        assertTrue(sql.getAllValues().get(1).endsWith("ORDER BY timestamp ASC, log_record_uid ASC LIMIT 26"));
    }

    @Test
    void nearbyLogsCanUseOnlyPersistedResourceHostAndServiceAsFallbackScope() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of());

        repository.nearbyLogs(new NearbyQuery("team-a", "event-7", 1_787_934_874_782_123_456L,
                "checkout", null, null, "payments", "prod", START, END, "node-1"));

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(executor, org.mockito.Mockito.times(2)).executeStrict(sql.capture());
        for (String statement : sql.getAllValues()) {
            assertTrue(statement.contains("hertzbeat_workspace_id = 'team-a'"));
            assertTrue(statement.contains("service_name = 'checkout'"));
            assertTrue(statement.contains("json_get_string(resource_attributes, '$[\"host.name\"]')"));
            assertTrue(statement.contains("json_get_string(resource_attributes, '$[\"host\"][\"name\"]')"));
            assertTrue(statement.contains("= 'node-1'"));
            assertTrue(statement.contains("json_get_string(resource_attributes, '$[\"service.namespace\"]') = 'payments'"));
            assertTrue(statement.contains("COALESCE(CASE WHEN TRIM(json_get_string(resource_attributes, "
                    + "'$[\"deployment.environment.name\"]')) = '' THEN NULL ELSE "
                    + "json_get_string(resource_attributes, '$[\"deployment.environment.name\"]') END, "
                    + "CASE WHEN TRIM(json_get_string(resource_attributes, '$[\"deployment.environment\"]')) "
                    + "= '' THEN NULL ELSE json_get_string(resource_attributes, '$[\"deployment.environment\"]') END, "
                    + "json_get_string(resource_attributes, '$[\"env\"]')) = 'prod'"));
            assertFalse(statement.contains("hertzbeat_entity_id ="));
            assertFalse(statement.contains("json_get_string(log_attributes"));
        }
    }

    @Test
    void nearbyQueryRejectsServiceOnlyOrPartialEntityIdentityScopes() {
        assertThrows(IllegalArgumentException.class, () -> new NearbyQuery("team-a", "event-7", 1_787_934_874_782_123_456L,
                "checkout", null, null, null, null, START, END));
        assertThrows(IllegalArgumentException.class, () -> new NearbyQuery("team-a", "event-7", 1_787_934_874_782_123_456L,
                "checkout", "7", null, null, null, START, END, "node-1"));
    }

    @Test
    void selectedLogCanonicalizesFlatAndNestedResourceHostButIgnoresLogAttributeHost() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        Map<String, Object> flat = hostLogRow("event-flat", Map.of("host.name", "node-flat"), Map.of());
        Map<String, Object> nested = hostLogRow("event-nested", Map.of("host", Map.of("name", "node-nested")), Map.of());
        Map<String, Object> spaced = hostLogRow("event-spaced", Map.of("host.name", " node-spaced "), Map.of());
        Map<String, Object> attributesOnly = hostLogRow("event-attributes", Map.of(), Map.of("host.name", "spoof"));
        when(executor.executeStrict(anyString())).thenReturn(List.of(flat, nested, spaced, attributesOnly));

        var result = repository.identityLogs(new IdentityQuery("team-a", null, "checkout", null, null, START, END));

        assertEquals(Status.AVAILABLE, result.status());
        assertEquals("node-flat", result.rows().get(0).resourceAttributes().get("host.name"));
        assertEquals("node-nested", result.rows().get(1).resourceAttributes().get("host.name"));
        assertEquals(" node-spaced ", result.rows().get(2).resourceAttributes().get("host.name"));
        assertFalse(result.rows().get(3).resourceAttributes().containsKey("host.name"));
        assertEquals("checkout", result.rows().get(0).resourceAttributes().get("service.name"));
    }

    @Test
    void sameTraceLogsUseTheCanonicalPipelineTable() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of());

        repository.sameTraceLogs(new InvestigationQueryRepository.TraceLogsQuery(
                "team-a", "0123456789abcdef0123456789abcdef", START, END));

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(executor).executeStrict(sql.capture());
        assertTrue(sql.getValue().contains(" FROM hertzbeat_logs WHERE "));
        assertFalse(sql.getValue().contains(" FROM hzb_logs "));
    }

    @Test
    void sameTraceLogsPreviewOversizedAttributesAndReportTheirScope() {
        Map<String, Object> row = new HashMap<>(logRow("event-large"));
        String value = "a".repeat(4_095) + "😀tail";
        row.put("log_attributes", Map.of("arguments", value, "short", "ok", "exact", "e".repeat(4_096)));
        row.put("resource_attributes", Map.of("deployment", "r".repeat(4_097)));
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(row));

        var result = repository.sameTraceLogs(new InvestigationQueryRepository.TraceLogsQuery(
                "team-a", "0123456789abcdef0123456789abcdef", START, END));

        assertEquals(Status.AVAILABLE, result.status());
        var record = result.rows().getFirst();
        assertEquals("a".repeat(4_095), record.attributes().get("arguments"));
        assertEquals("ok", record.attributes().get("short"));
        assertEquals("e".repeat(4_096), record.attributes().get("exact"));
        assertEquals("r".repeat(4_096), record.resourceAttributes().get("deployment"));
        assertEquals(Map.of("attributes", List.of("arguments"), "resourceAttributes", List.of("deployment")),
                record.truncatedFields());
    }

    @Test
    void alertLogsUseExactWorkspaceIdentityExclusiveWindowAndLimitPlusOne() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(logRow("event-7")));

        var result = repository.identityLogs(new IdentityQuery(
                "team-a", "7", "checkout", "payments", "prod", START, END));

        assertEquals(Status.AVAILABLE, result.status());
        assertEquals(1, result.rows().size());
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(executor).executeStrict(sql.capture());
        assertTrue(sql.getValue().contains(" FROM hertzbeat_logs WHERE hertzbeat_workspace_id = 'team-a'"));
        assertTrue(sql.getValue().contains("hertzbeat_entity_id = '7'"));
        assertTrue(sql.getValue().contains("service_name = 'checkout'"));
        assertTrue(sql.getValue().contains("timestamp < to_timestamp_millis(" + END + ")"));
        assertTrue(sql.getValue().endsWith("ORDER BY timestamp DESC, log_record_uid DESC LIMIT 101"));
    }

    @Test
    void alertTraceSummariesStayLosslessAndAreBoundedByExactIdentity() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(Map.of(
                "trace_id", "0123456789abcdef0123456789abcdef",
                "start_time_unix_nano", "1787934874782123456",
                "duration_nanos", 42_000L,
                "span_count", 2L,
                "service_name", "checkout",
                "error_count", 1L,
                "ok_count", 1L,
                "unset_count", 0L)));

        var result = repository.identityTraces(new IdentityQuery(
                "team-a", "7", "checkout", "payments", "prod", START, END));

        assertEquals(Status.AVAILABLE, result.status());
        assertEquals("1787934874782123456", result.rows().getFirst().startTimeUnixNano());
        assertEquals("42000", result.rows().getFirst().durationNanos());
        assertEquals("error", result.rows().getFirst().status());
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(executor).executeStrict(sql.capture());
        assertTrue(sql.getValue().contains("FROM hzb_traces"));
        assertTrue(sql.getValue().contains("\"resource_attributes.hertzbeat.workspace_id\" = 'team-a'"));
        assertTrue(sql.getValue().contains("\"resource_attributes.hertzbeat.entity_id\" = '7'"));
        assertTrue(sql.getValue().contains("timestamp < to_timestamp_millis(" + END + ")"));
        assertTrue(sql.getValue().endsWith("ORDER BY start_time_unix_nano DESC LIMIT 51"));
    }

    @Test
    void missingOptionalAlertLabelsDoNotInventNullPredicates() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of());

        repository.identityLogs(new IdentityQuery(
                "team-a", null, "checkout", null, null, START, END));

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(executor).executeStrict(sql.capture());
        assertFalse(sql.getValue().contains("hertzbeat_entity_id IS NULL"));
        assertFalse(sql.getValue().contains("service.namespace\"]') IS NULL"));
        assertFalse(sql.getValue().contains("deployment.environment.name\"]') IS NULL"));
        assertTrue(sql.getValue().contains("service_name = 'checkout'"));
    }

    @Test
    void alertSignalQueriesReturnBoundedRowsWithHonestTruncation() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString()))
                .thenReturn(java.util.Collections.nCopies(101, logRow("event-7")))
                .thenReturn(java.util.Collections.nCopies(51, Map.of(
                        "trace_id", "0123456789abcdef0123456789abcdef",
                        "start_time_unix_nano", "1787934874782123456",
                        "duration_nanos", 42_000L,
                        "span_count", 2L,
                        "service_name", "checkout",
                        "error_count", 0L,
                        "ok_count", 2L,
                        "unset_count", 0L)));
        IdentityQuery query = new IdentityQuery(
                "team-a", "7", "checkout", "payments", "prod", START, END);

        var logs = repository.identityLogs(query);
        var traces = repository.identityTraces(query);

        assertEquals(100, logs.rows().size());
        assertTrue(logs.truncated());
        assertEquals(50, traces.rows().size());
        assertTrue(traces.truncated());
    }

    private Map<String, Object> traceRow() {
        return Map.ofEntries(
                Map.entry("start_time", START),
                Map.entry("start_time_unix_nano", START * 1_000_000L),
                Map.entry("trace_id", "0123456789abcdef0123456789abcdef"),
                Map.entry("span_id", "0123456789abcdef"),
                Map.entry("parent_span_id", ""),
                Map.entry("span_name", "GET /checkout"),
                Map.entry("service_name", "checkout"),
                Map.entry("span_status_code", "STATUS_CODE_OK"),
                Map.entry("span_kind", "SPAN_KIND_SERVER"),
                Map.entry("duration_nano", 2_000_000L),
                Map.entry("workspace_id", "team-a"),
                Map.entry("entity_id", "7"),
                Map.entry("entity_type", "service"),
                Map.entry("service_namespace", "payments"),
                Map.entry("deployment_environment", "prod"));
    }

    private List<Map<String, Object>> traceRows(int count) {
        List<Map<String, Object>> rows = new java.util.ArrayList<>(count);
        for (int i = 1; i <= count; i++) {
            Map<String, Object> row = new HashMap<>(traceRow());
            row.put("span_id", String.format("%016x", i));
            rows.add(row);
        }
        return rows;
    }

    private Map<String, Object> logRow(String uid) {
        return Map.ofEntries(
                Map.entry("time_unix_nano", 1_787_934_874_782_123_456L),
                Map.entry("log_record_uid", uid),
                Map.entry("severity_number", 17),
                Map.entry("severity_text", "ERROR"),
                Map.entry("body", "checkout failed"),
                Map.entry("trace_id", "0123456789abcdef0123456789abcdef"),
                Map.entry("span_id", "0123456789abcdef"),
                Map.entry("hertzbeat_workspace_id", "team-a"),
                Map.entry("hertzbeat_entity_id", "7"),
                Map.entry("hertzbeat_entity_type", "service"),
                Map.entry("service_name", "checkout"),
                Map.entry("service_namespace", "payments"),
                Map.entry("deployment_environment", "prod"));
    }

    private Map<String, Object> hostLogRow(String uid, Map<String, Object> resources, Map<String, Object> attributes) {
        Map<String, Object> row = new HashMap<>(logRow(uid));
        row.remove("hertzbeat_entity_id");
        row.remove("hertzbeat_entity_type");
        row.put("resource_attributes", resources);
        row.put("log_attributes", attributes);
        return row;
    }
}
