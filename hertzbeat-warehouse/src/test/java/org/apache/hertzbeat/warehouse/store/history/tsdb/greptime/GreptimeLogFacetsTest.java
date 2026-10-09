/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.anyString;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.junit.jupiter.api.Test;
import org.apache.hertzbeat.warehouse.db.GreptimeQueryGuard;

class GreptimeLogFacetsTest {
    @Test
    void retainsNativeUnicodeRankBeforeDiscardingSentinel() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        String first = new String(Character.toChars(0xe000));
        String second = new String(Character.toChars(0x10000));
        when(executor.executeStrict(anyString())).thenReturn(List.of(
                Map.of("matched", 2L, "missing", 0L, "searched", 2L, "value", "prefix" + first, "count", 1L),
                Map.of("matched", 2L, "missing", 0L, "searched", 2L, "value", "prefix" + second, "count", 1L)));
        for (String search : new String[] {null, "prefix"}) {
            var result = GreptimeLogFacets.values(executor, scope(), LogFacets.Field.parse("attribute:proof.facet"),
                    1, " WHERE true", search);
            assertEquals("ready", result.state());
            assertTrue(result.truncated());
            assertEquals("prefix" + first, result.values().getFirst().value());
        }
    }

    @Test
    void validatesLookupAndNeverFallsBackToUnsearchedReader() throws Exception {
        var reader = mock(org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader.class,
                org.mockito.Mockito.CALLS_REAL_METHODS);
        var field = LogFacets.Field.parse("attribute:proof.facet");
        org.junit.jupiter.api.Assertions.assertThrows(UnsupportedOperationException.class,
                () -> reader.logFacetValues(scope(), field, 20, "rare"));
        verify(reader, org.mockito.Mockito.never()).logFacetValues(scope(), field, 20);
        assertEquals(" ", LogFacets.normalizeValueSearch(" "));
        org.junit.jupiter.api.Assertions.assertNull(LogFacets.normalizeValueSearch(""));
        assertEquals(256, LogFacets.normalizeValueSearch("x".repeat(256)).length());
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> LogFacets.normalizeValueSearch("x".repeat(257)));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> LogFacets.normalizeValueSearch(String.valueOf((char) 0xd800)));
        assertEquals(2, LogFacets.normalizeValueSearch(new String(Character.toChars(0x1f600))).length());
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        assertFalse(mapper.writeValueAsString(LogFacets.Values.empty(scope().window(), field)).contains("search"));
        assertEquals(0L, LogFacets.Values.empty(scope().window(), field, "rare").search().matchedCount());
        org.junit.jupiter.api.Assertions.assertNull(LogFacets.Values.unavailable(scope().window(), field, "rare").search().matchedCount());
    }

    @Test
    void searchedNoMatchKeepsPopulationAndMalformedCountsFailClosed() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        var field = LogFacets.Field.parse("attribute:proof.facet");
        when(executor.executeStrict(anyString())).thenReturn(List.of(Map.of("matched", 44L, "missing", 1L, "searched", 0L)));
        var result = GreptimeLogFacets.values(executor, scope(), field, 20, " WHERE true", "absent");
        assertEquals("ready", result.state());
        assertEquals(44L, result.matchedCount());
        assertEquals(0L, result.search().matchedCount());
        for (long invalid : List.of(44L, 1L)) {
            when(executor.executeStrict(anyString())).thenReturn(List.of(Map.of("matched", 44L, "missing", 1L, "searched", invalid)));
            var failed = GreptimeLogFacets.values(executor, scope(), field, 20, " WHERE true", "absent");
            assertEquals("unavailable", failed.state());
            assertEquals("absent", failed.search().query());
            org.junit.jupiter.api.Assertions.assertNull(failed.search().matchedCount());
        }
    }

    @Test
    void searchesBeforeRankingAndKeepsFullPopulation() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        when(executor.executeStrict(anyString())).thenReturn(List.of(
                Map.of("matched", 44L, "missing", 1L, "searched", 1L, "value", "Rare%_tail", "count", 1L)));
        var field = LogFacets.Field.parse("attribute:proof.facet");
        var result = GreptimeLogFacets.values(executor, scope(), field, 20, " WHERE true", "rare%_");
        assertEquals("ready", result.state());
        assertEquals(44L, result.matchedCount());
        assertEquals(1L, result.search().matchedCount());
        assertEquals("rare%_", result.search().query());
        var captured = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(executor).executeStrict(captured.capture());
        assertTrue(captured.getValue().contains("strpos(lower(facet_value), lower('rare%_')) > 0"));
        assertTrue(captured.getValue().indexOf("strpos(") < captured.getValue().indexOf("GROUP BY"));
    }

    @Test
    void fieldDiscoveryRetainsNativeInfinityAndRejectsMalformedJson() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        var scope = new LogFacets.Scope("workspace-proof", 1000, 2000, null, null, null,
                null, null, null, null, null, Map.of(), Map.of(), Set.of(), false, null);
        when(executor.executeStrict(anyString())).thenReturn(List.of(Map.of("attribute_json", "{\"proof.value\":inf}")));
        var fields = GreptimeLogFacets.fields(executor, scope, " WHERE true");
        assertEquals("ready", fields.state());
        assertTrue(fields.fields().stream().anyMatch(field -> field.id().equals("attribute:proof.value")));
        when(executor.executeStrict(anyString())).thenReturn(List.of(Map.of("attribute_json", "{bad}")));
        assertEquals("unavailable", GreptimeLogFacets.fields(executor, scope, " WHERE true").state());
    }

    @Test
    void countsFullScopedWindowWithoutCollapsingEmptyOrMissing() {
        var sql = mock(GreptimeSqlQueryExecutor.class);
        var properties = mock(GreptimeProperties.class);
        when(properties.database()).thenReturn("hertzbeat");
        when(properties.grpcEndpoints()).thenReturn("127.0.0.1:4001");
        when(properties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
        when(sql.executeStrict(anyString())).thenReturn(List.of(
                Map.of("value", "", "count", 2L, "matched", 5L, "missing", 1L),
                Map.of("value", "unknown", "count", 2L, "matched", 5L, "missing", 1L)));
        try (var guard = new GreptimeQueryGuard(1, Duration.ofSeconds(2), Duration.ofMillis(10))) {
            var storage = new GreptimeDbDataStorage(properties, null, sql, guard);
            var scope = new LogFacets.Scope("workspace-proof", 1000, 2000, null, null, null,
                    null, null, "checkout", "shop", "prod", Map.of("service.version", "v1"),
                    Map.of(), Set.of(), false, null);
            var result = storage.logFacetValues(scope, LogFacets.Field.parse("resource:service.version"), 20);
            assertEquals("ready", result.state());
            assertEquals(5L, result.matchedCount());
            assertEquals(1L, result.missingOrNullCount());
            assertEquals("", result.values().getFirst().value());
            var query = org.mockito.ArgumentCaptor.forClass(String.class);
            verify(sql).executeStrict(query.capture());
            assertTrue(query.getValue().contains("workspace-proof"));
            assertTrue(query.getValue().contains("service.version"));
            assertTrue(query.getValue().contains("LIMIT 21"));
            assertTrue(query.getValue().contains("search_totals AS (SELECT matched - missing AS searched FROM totals)"));
            assertFalse(query.getValue().contains("'unknown'"));
        }
    }

    @Test
    void malformedAggregatesAndStorageFailureHaveNoCounts() {
        var sql = mock(GreptimeSqlQueryExecutor.class);
        var field = LogFacets.Field.parse("builtin:serviceName");
        for (var row : List.<Map<String, Object>>of(Map.of("matched", -1L, "missing", 0L),
                Map.of("matched", 1L, "missing", 2L), Map.of("matched", 1L, "missing", 0L, "value", "a", "count", 2L))) {
            when(sql.executeStrict(anyString())).thenReturn(List.of(row));
            var result = GreptimeLogFacets.values(sql, scope(), field, 20, " WHERE true");
            assertEquals("unavailable", result.state());
            org.junit.jupiter.api.Assertions.assertNull(result.matchedCount());
            assertTrue(result.values().isEmpty());
        }
        when(sql.executeStrict(anyString())).thenThrow(new IllegalStateException("storage"));
        assertEquals("unavailable", GreptimeLogFacets.values(sql, scope(), field, 20, " WHERE true").state());
    }

    @Test
    void topValuesUseCountThenValueOrderAndIndependentSentinel() {
        var sql = mock(GreptimeSqlQueryExecutor.class);
        when(sql.executeStrict(anyString())).thenReturn(List.of(
                Map.of("matched", 3L, "missing", 0L, "value", "a", "count", 1L),
                Map.of("matched", 3L, "missing", 0L, "value", "b", "count", 1L)));
        var result = GreptimeLogFacets.values(sql, scope(), LogFacets.Field.parse("builtin:serviceName"), 1, " WHERE true");
        assertTrue(result.truncated());
        assertEquals("a", result.values().getFirst().value());
        assertEquals(3L, result.matchedCount());
    }

    @Test
    void discoveryReportsRowSentinelAndNeverReadsItsKeys() {
        var sql = mock(GreptimeSqlQueryExecutor.class);
        var rows = new java.util.ArrayList<Map<String, Object>>();
        for (int index = 0; index < 1000; index++) {
            rows.add(Map.of("resource_json", "{\"service.name\":\"checkout\"}"));
        }
        rows.add(Map.of("attribute_json", "{\"sentinel.only\":1}"));
        when(sql.executeStrict(anyString())).thenReturn(rows);
        var result = GreptimeLogFacets.fields(sql, scope(), " WHERE true");
        assertEquals("ready", result.state());
        assertEquals(1000, result.coverage().scannedRows());
        assertTrue(result.coverage().hasMore());
        assertFalse(result.truncated());
        assertTrue(result.fields().stream().anyMatch(field -> field.id().equals("resource:service.name")));
        assertFalse(result.fields().stream().anyMatch(field -> field.key().equals("sentinel.only")));
        verify(sql).executeStrict(org.mockito.ArgumentMatchers.contains("LIMIT 1001"));
    }

    @Test
    void marksOnlyObservedJsonScalarFieldsEligibleForMetricRanking() {
        var sql = mock(GreptimeSqlQueryExecutor.class);
        when(sql.executeStrict(anyString())).thenReturn(List.of(
                Map.of("resource_json", "{\"scalar\":\"value\",\"object\":{\"nested\":1},\"array\":[1],\"mixed\":[1]}"),
                Map.of("resource_json", "{\"mixed\":\"value\",\"nullOnly\":null}")));

        var result = GreptimeLogFacets.fields(sql, scope(), " WHERE true");

        assertTrue(result.fields().stream().filter(field -> field.id().equals("resource:scalar"))
                .findFirst().orElseThrow().scalar());
        assertFalse(result.fields().stream().filter(field -> field.id().equals("resource:object"))
                .findFirst().orElseThrow().scalar());
        assertFalse(result.fields().stream().filter(field -> field.id().equals("resource:array"))
                .findFirst().orElseThrow().scalar());
        assertTrue(result.fields().stream().filter(field -> field.id().equals("resource:mixed"))
                .findFirst().orElseThrow().scalar());
        assertFalse(result.fields().stream().filter(field -> field.id().equals("resource:nullOnly"))
                .findFirst().orElseThrow().scalar());
    }

    @Test
    void discoveryKeyLimitDoesNotClaimMoreRowsAndMalformedJsonIsUnavailable() {
        var sql = mock(GreptimeSqlQueryExecutor.class);
        String json = java.util.stream.IntStream.range(0, 220).mapToObj(index -> "\"key" + index + "\":1")
                .collect(java.util.stream.Collectors.joining(",", "{", "}"));
        when(sql.executeStrict(anyString())).thenReturn(List.of(Map.of("attribute_json", json)));
        var result = GreptimeLogFacets.fields(sql, scope(), " WHERE true");
        assertTrue(result.truncated());
        assertFalse(result.coverage().hasMore());
        assertEquals(200, result.fields().size());
        when(sql.executeStrict(anyString())).thenReturn(List.of(Map.of("attribute_json", "not-json")));
        assertEquals("unavailable", GreptimeLogFacets.fields(sql, scope(), " WHERE true").state());
    }

    @Test
    void complexPredicatesKeepPresenceAndCaseInsensitiveFallbackSemantics() {
        String presence = GreptimeLogFilterPredicate.condition("resource_attributes", "service.name", "__hz_exists__");
        assertTrue(presence.contains("json_path_exists"));
        assertTrue(presence.contains("$[\"service.name\"]"));
        String contains = GreptimeLogFilterPredicate.condition("log_attributes", "detail", "__hz_contains__:O'Reilly,%");
        assertTrue(contains.contains("O''Reilly,%"));
        assertTrue(contains.contains("strpos(LOWER("));
        assertFalse(contains.contains(" LIKE "));
        String excluded = GreptimeLogFilterPredicate.condition("resource_attributes", "version", "__hz_not_in__:A\u001FB");
        assertTrue(excluded.startsWith("NOT COALESCE("));
        assertTrue(excluded.contains("LOWER('A'), LOWER('B')"));
        assertTrue(GreptimeLogFilterPredicate.condition("resource_attributes", "version", "V1").contains("LOWER('V1')"));
    }

    @Test
    void nativeLogOrderUsesUidTieBreakerBeforeOffsetAndLimit() {
        var sql = mock(GreptimeSqlQueryExecutor.class);
        var properties = mock(GreptimeProperties.class);
        when(properties.database()).thenReturn("hertzbeat");
        when(properties.grpcEndpoints()).thenReturn("127.0.0.1:4001");
        when(properties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
        when(sql.executeStrict(anyString())).thenReturn(List.of());
        try (var guard = new GreptimeQueryGuard(1, Duration.ofSeconds(2), Duration.ofMillis(10))) {
            var storage = new GreptimeDbDataStorage(properties, null, sql, guard);
            for (String order : List.of("oldest", "newest")) {
                storage.queryLogsByMultipleConditionsWithPagination(1000L, 2000L, null, null, null, null, null,
                        20, 20, Set.of(), false, "workspace-proof", null, null, null, Map.of(), Map.of(), null, order);
            }
            var query = org.mockito.ArgumentCaptor.forClass(String.class);
            verify(sql, org.mockito.Mockito.times(2)).executeStrict(query.capture());
            assertTrue(query.getAllValues().getFirst().contains("ORDER BY timestamp ASC, log_record_uid ASC LIMIT 20 OFFSET 20"));
            assertTrue(query.getAllValues().getLast().contains("ORDER BY timestamp DESC, log_record_uid DESC LIMIT 20 OFFSET 20"));
        }
    }

    @Test
    void complexFacetScopeKeepsAllCanonicalAndAttributePredicates() {
        var sql = mock(GreptimeSqlQueryExecutor.class);
        var properties = mock(GreptimeProperties.class);
        when(properties.database()).thenReturn("hertzbeat");
        when(properties.grpcEndpoints()).thenReturn("127.0.0.1:4001");
        when(properties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
        var empty = new java.util.HashMap<String, Object>();
        empty.put("matched", 0L);
        empty.put("missing", 0L);
        when(sql.executeStrict(anyString())).thenReturn(List.of(empty));
        try (var guard = new GreptimeQueryGuard(1, Duration.ofSeconds(2), Duration.ofMillis(10))) {
            var storage = new GreptimeDbDataStorage(properties, null, sql, guard);
            var scoped = new LogFacets.Scope("workspace-proof", 1000, 2000, "trace-proof", "span-proof", null,
                    "SEVERE", "failure", "checkout", "shop", "prod", Map.of("version", "__hz_in__:v1\u001Fv2"),
                    Map.of("detail", "__hz_not_contains__:ignored"), Set.of("noise"), true,
                    org.apache.hertzbeat.common.observability.dto.log.LogSeverityCategory.ERROR);
            assertEquals("ready", storage.logFacetValues(scoped, LogFacets.Field.parse("builtin:severityCategory"), 20).state());
            var query = org.mockito.ArgumentCaptor.forClass(String.class);
            verify(sql).executeStrict(query.capture());
            String text = query.getValue();
            for (String expected : List.of("workspace-proof", "trace_id = 'trace-proof'", "span_id = 'span-proof'",
                    "severity_number >= 17", "severity_number <= 20", "severity_text = 'SEVERE'", "matches_term(body, 'failure')",
                    "service_name = 'checkout'", "'shop'", "'prod'", "LOWER('v1'), LOWER('v2')", "NOT COALESCE(strpos")) {
                assertTrue(text.contains(expected), expected);
            }
            assertFalse(text.contains("__hz_"));
        }
    }

    private LogFacets.Scope scope() {
        return new LogFacets.Scope("workspace-proof", 1000, 2000, null, null, null,
                null, null, "checkout", "shop", "prod", Map.of(), Map.of(), Set.of(), false, null);
    }
}
