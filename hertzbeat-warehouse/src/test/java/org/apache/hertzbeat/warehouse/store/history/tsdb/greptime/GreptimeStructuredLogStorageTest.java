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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.anyString;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchQuery;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.warehouse.db.GreptimeQueryGuard;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;

class GreptimeStructuredLogStorageTest {
    @Test
    void nativeTextProjectionPreservesInfinityAndMalformedRowsFailExplicitly() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        when(executor.executeStrict(anyString())).thenAnswer(call -> {
            String sql = call.getArgument(0);
            assertTrue(sql.contains("json_to_string(log_attributes) AS log_attributes"));
            assertTrue(sql.contains("json_to_string(resource_attributes) AS resource_attributes"));
            return List.of(Map.of("body", "retained", "log_attributes", "{\"value\":inf,\"count\":2}",
                    "resource_attributes", "{\"service.name\":\"bound-service\"}"));
        });
        try (var guard = new GreptimeQueryGuard(1, Duration.ofSeconds(2), Duration.ofMillis(10))) {
            var storage = new GreptimeDbDataStorage(properties(), null, executor, guard);
            var rows = storage.queryStructuredLogs(query(), 0, 10, "newest");
            assertEquals(1, rows.size());
            assertEquals("retained", rows.getFirst().getBody());
            assertEquals(Double.POSITIVE_INFINITY, rows.getFirst().getAttributes().get("value"));
            assertEquals(2L, rows.getFirst().getAttributes().get("count"));
            org.mockito.Mockito.doReturn(List.of(Map.of("log_attributes", "{bad}")))
                    .when(executor).executeStrict(anyString());
            assertThrows(TelemetryStorageUnavailableException.class, () -> storage.queryStructuredLogs(query(), 0, 10, "newest"));
        }
    }

    @Test
    void allEndpointsApplySameAuthorizedTreeBeforeLimitsAndAggregates() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        var captured = new ArrayList<String>();
        when(executor.executeStrict(anyString())).thenAnswer(call -> {
            String sql = call.getArgument(0);
            captured.add(sql);
            if (sql.contains(" as totalCount")) {
                return List.of(Map.of("totalCount", 0L, "fatalCount", 0L, "errorCount", 0L,
                        "warnCount", 0L, "infoCount", 0L, "debugCount", 0L, "traceCount", 0L,
                        "withTrace", 0L, "withSpan", 0L, "withBothTraceAndSpan", 0L));
            }
            if (sql.startsWith("SELECT COUNT(*)")) { return List.of(Map.of("count", 0L)); }
            return List.of();
        });
        try (var guard = new GreptimeQueryGuard(1, Duration.ofSeconds(2), Duration.ofMillis(10))) {
            var storage = new GreptimeDbDataStorage(properties(), null, executor, guard);
            var query = query();
            assertEquals(List.of(), storage.queryStructuredLogs(query, 10, 10, "oldest"));
            assertEquals(0L, storage.countStructuredLogs(query));
            storage.structuredLogOverview(query);
            storage.structuredLogTraceCoverage(query);
            storage.structuredLogTrend(query, 60000);
            storage.structuredLogGroups(query, "serviceName", 100, "count-asc", 3);
            storage.structuredLogFacetFields(query);
            storage.structuredLogFacetValues(query, LogFacets.Field.parse("attribute:result"), 20);
            assertEquals(8, captured.size());
            assertTrue(captured.get(5).endsWith("GROUP BY groupValue HAVING COUNT(*) >= 3 ORDER BY count ASC, groupValue ASC LIMIT 100"));
            String tree = GreptimeStructuredLogPredicate.compile(query.expression());
            for (String sql : captured) {
                assertTrue(sql.contains("workspace-proof"));
                assertTrue(sql.contains("service_name = 'bound-service'"));
                assertTrue(sql.contains(" AND " + tree));
                assertTrue(sql.contains("request.kind"));
                int limit = sql.indexOf(" LIMIT ");
                assertTrue(limit < 0 || sql.indexOf(tree) < limit);
            }
            assertTrue(captured.getFirst().endsWith("ORDER BY timestamp ASC, log_record_uid ASC LIMIT 10 OFFSET 10"));
        }
    }

    @Test
    void exactSelectionIsAppliedBeforeEveryCompleteEndpointAggregation() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        var captured = new ArrayList<String>();
        when(executor.executeStrict(anyString())).thenAnswer(call -> {
            String sql = call.getArgument(0);
            captured.add(sql);
            if (sql.contains("ranked_total")) { return List.of(Map.of("matched", 0L, "ranked_count", 0L)); }
            if (sql.contains(" as totalCount")) {
                return List.of(Map.of("totalCount", 0L, "fatalCount", 0L, "errorCount", 0L,
                        "warnCount", 0L, "infoCount", 0L, "debugCount", 0L, "traceCount", 0L,
                        "withTrace", 0L, "withSpan", 0L, "withBothTraceAndSpan", 0L));
            }
            if (sql.startsWith("SELECT COUNT(*)")) { return List.of(Map.of("count", 0L)); }
            return List.of();
        });
        try (var guard = new GreptimeQueryGuard(1, Duration.ofSeconds(2), Duration.ofMillis(10))) {
            var storage = new GreptimeDbDataStorage(properties(), null, executor, guard);
            var selector = new org.apache.hertzbeat.common.observability.dto.log.LogGroupSelection(1, List.of(
                    new org.apache.hertzbeat.common.observability.dto.log.LogGroupSelection.Key(
                            LogFacets.Field.parse("attribute:proof.status"), "value", "2.0")));
            var selected = new LogSearchQuery(query().scope(), query().expression(), selector);
            storage.queryStructuredLogs(selected, 10, 10, "oldest");
            storage.countStructuredLogs(selected);
            storage.structuredLogOverview(selected);
            storage.structuredLogTraceCoverage(selected);
            storage.structuredLogTrend(selected, 60000);
            storage.structuredLogGroups(selected, "serviceName", 20, "count-desc", 1);
            storage.structuredLogFacetFields(selected);
            storage.structuredLogFacetValues(selected, LogFacets.Field.parse("attribute:result"), 20);
            storage.logAnalysis(selected, new org.apache.hertzbeat.common.observability.dto.log.LogAnalysis.Request(
                    null, "groups", 20, "count-desc", 1), 60000);
            assertEquals(9, captured.size());
            String predicate = GreptimeLogGroupProjection.selection(selector);
            for (String sql : captured) {
                assertTrue(sql.contains("workspace-proof"));
                assertTrue(sql.contains("service_name = 'bound-service'"));
                assertTrue(sql.contains(" AND " + predicate));
                int limit = sql.indexOf(" LIMIT ");
                assertTrue(limit < 0 || sql.indexOf(predicate) < limit);
            }
        }
    }

    @Test
    void unavailableNeverBecomesZeroAndLegacyReaderDoesNotPostFilter() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        when(executor.executeStrict(anyString())).thenThrow(new IllegalStateException("unavailable"));
        try (var guard = new GreptimeQueryGuard(1, Duration.ofSeconds(2), Duration.ofMillis(10))) {
            var storage = new GreptimeDbDataStorage(properties(), null, executor, guard);
            assertThrows(TelemetryStorageUnavailableException.class, () -> storage.countStructuredLogs(query()));
        }
        var legacy = mock(HistoryDataReader.class, org.mockito.Answers.CALLS_REAL_METHODS);
        assertThrows(UnsupportedOperationException.class, () -> legacy.queryStructuredLogs(query(), 0, 10, "newest"));
        assertThrows(UnsupportedOperationException.class, () -> legacy.countStructuredLogs(query()));
    }

    private static LogSearchQuery query() {
        var scope = new LogFacets.Scope("workspace-proof", 1000, 2000, null, null, null, null, null,
                "bound-service", null, null, Map.of(), Map.of("request.kind", "__hz_in__:read\u001Fwrite"), Set.of(), false, null);
        var left = new LogSearchExpression.Term(new LogSearchExpression.Field(LogSearchExpression.Domain.BUILTIN, "service"),
                LogSearchExpression.Operator.EQUALS, "other-service");
        return new LogSearchQuery(scope, new LogSearchExpression.Or(List.of(left, new LogSearchExpression.Not(left))));
    }

    private static GreptimeProperties properties() {
        var properties = mock(GreptimeProperties.class);
        when(properties.database()).thenReturn("hertzbeat");
        when(properties.grpcEndpoints()).thenReturn("127.0.0.1:4001");
        when(properties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
        return properties;
    }
}
