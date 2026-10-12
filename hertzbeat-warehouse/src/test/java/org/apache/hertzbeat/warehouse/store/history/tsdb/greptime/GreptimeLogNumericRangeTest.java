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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogNumericRange;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchQuery;
import org.apache.hertzbeat.common.observability.dto.log.LogSort;
import org.apache.hertzbeat.warehouse.db.GreptimeQueryGuard;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;

class GreptimeLogNumericRangeTest {
    @Test
    void olderAnalysisReaderCannotSilentlyDropRange() {
        var reader = mock(HistoryDataReader.class, CALLS_REAL_METHODS);
        assertThrows(UnsupportedOperationException.class, () -> reader.logAnalysis(query(), request(), 60000));
        verify(reader, never()).logAnalysis(any(LogFacets.Scope.class), any(), any(), anyLong());
    }

    @Test
    void everyCompleteHistoryPathAppliesNativeRangeBeforeOrderingAndLimits() {
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
            if (sql.startsWith("WITH")) { return List.of(Map.of("matched", 0L, "ranked_count", 0L)); }
            return List.of();
        });
        var properties = mock(GreptimeProperties.class);
        when(properties.database()).thenReturn("public");
        when(properties.grpcEndpoints()).thenReturn("localhost:4001");
        when(properties.httpEndpoint()).thenReturn("http://localhost:4000");
        var query = query();
        try (var guard = new GreptimeQueryGuard(1, Duration.ofSeconds(2), Duration.ofMillis(10))) {
            var store = new GreptimeDbDataStorage(properties, null, executor, guard);
            store.queryStructuredLogs(query, 0, 10, "newest");
            store.countStructuredLogs(query);
            store.structuredLogOverview(query);
            store.structuredLogTraceCoverage(query);
            store.structuredLogTrend(query, 60000);
            store.structuredLogGroups(query, "serviceName", 20, "count-desc", 1);
            store.structuredLogFacetFields(query);
            store.structuredLogFacetValues(query, LogFacets.Field.parse("attribute:duration"), 20);
            store.logAnalysis(query, request(), 60000);
            var source = new LogComparison.Source(query.scope(), query.expression(), null);
            store.querySortedLogs(source, 0, 10, new LogSort(1, "attribute:duration", "number", "asc"));
            store.countSortedLogs(source);
        }
        assertEquals(11, captured.size());
        for (String sql : captured) {
            assertTrue(sql.contains("bound") && sql.contains("service_name = 'service'"));
            assertTrue(sql.contains(" BETWEEN 2.0 AND 6.0"), sql);
            assertTrue(sql.indexOf(" LIMIT ") < 0 || sql.indexOf(" BETWEEN 2.0 AND 6.0") < sql.indexOf(" LIMIT "));
        }
    }

    @Test
    void zeroBoundsCoverBothNativeSignsWithoutAdmittingOtherValues() throws Exception {
        var method = GreptimeDbDataStorage.class.getDeclaredMethod("facetWhere", LogFacets.Scope.class);
        method.setAccessible(true);
        var store = mock(GreptimeDbDataStorage.class, CALLS_REAL_METHODS);
        for (double zero : new double[] {-0.0, 0.0}) {
            var range = new LogNumericRange(1, LogFacets.Field.parse("attribute:duration"), zero, zero);
            var scope = new LogFacets.Scope("bound", 1000, 2000, null, null, null, null, null,
                    null, null, null, Map.of(), Map.of(), Set.of(), false, null, range);
            String sql = (String) method.invoke(store, scope);
            assertTrue(sql.contains(" BETWEEN -0.0 AND 0.0"), sql);
        }
    }

    private LogAnalysis.Request request() { return new LogAnalysis.Request(null, "groups", 20, "count-desc", 1); }

    private LogSearchQuery query() {
        var range = new LogNumericRange(1, LogFacets.Field.parse("attribute:duration"), 2, 6);
        var scope = new LogFacets.Scope("bound", 1000, 2000, null, null, null, null, "a OR b",
                "service", null, null, Map.of(), Map.of(), Set.of(), false, null, range);
        return new LogSearchQuery(scope, new LogSearchExpression.And(List.of()));
    }
}
