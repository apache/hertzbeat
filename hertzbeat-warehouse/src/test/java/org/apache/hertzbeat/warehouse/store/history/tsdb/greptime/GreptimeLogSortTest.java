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
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.mock;

import org.apache.hertzbeat.common.observability.dto.log.LogSort;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;

class GreptimeLogSortTest {
    @Test
    void rejectsInvalidTypesAndBuiltinsWithoutInferringValues() {
        assertEquals("number", new LogSort(1, "attribute:duration", "number", "desc").type());
        assertThrows(IllegalArgumentException.class, () -> new LogSort(2, "attribute:v", "text", "asc"));
        assertThrows(IllegalArgumentException.class, () -> new LogSort(1, "attribute:v", null, "asc"));
        assertThrows(IllegalArgumentException.class, () -> new LogSort(1, "attribute:v", "number", "invalid"));
        assertThrows(IllegalArgumentException.class, () -> new LogSort(1, "builtin:serviceName", "number", "asc"));
        assertThrows(IllegalArgumentException.class, () -> new LogSort(1, "attribute:v'", "text", "asc"));
    }

    @Test
    void bothDirectionsPutMissingLastAndKeepFixedPersistedTiesBeforePaging() {
        for (String direction : java.util.List.of("asc", "desc")) {
            var sql = GreptimeLogSort.suffix(new LogSort(1, "attribute:duration", "number", direction), 20, 10);
            assertTrue(GreptimeLogSort.projection(new LogSort(1, "attribute:duration", "number", direction)).contains("TRY_CAST("));
            assertTrue(GreptimeLogSort.projection(new LogSort(1, "attribute:duration", "number", direction)).contains("1.7976931348623157e308"));
            assertTrue(sql.endsWith(direction.toUpperCase(java.util.Locale.ROOT)
                    + " NULLS LAST, timestamp DESC, log_record_uid DESC LIMIT 10 OFFSET 20"));
            var text = GreptimeLogSort.projection(new LogSort(1, "resource:version", "text", direction));
            assertTrue(text.contains("CASE WHEN COALESCE("));
            assertTrue(text.contains("resource_attributes"));
        }
        var sort = new LogSort(1, "builtin:serviceName", "text", "asc");
        assertEquals("service_name AS raw_sort_value", GreptimeLogSort.projection(sort));
        assertThrows(IllegalArgumentException.class, () -> GreptimeLogSort.suffix(sort, -1, 1));
        assertThrows(IllegalArgumentException.class, () -> GreptimeLogSort.suffix(sort, 0, 1001));
    }

    @Test
    void sortedRowsAndCountShareLiteralSearchSelectorAndTrustedScope() {
        var executor = mock(org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor.class);
        var captured = new java.util.ArrayList<String>();
        org.mockito.Mockito.when(executor.executeStrict(org.mockito.Mockito.anyString())).thenAnswer(call -> {
            String sql = call.getArgument(0);
            captured.add(sql);
            return sql.startsWith("SELECT COUNT(*)") ? java.util.List.of(java.util.Map.of("count", 7L)) : java.util.List.of();
        });
        var properties = mock(GreptimeProperties.class);
        org.mockito.Mockito.when(properties.database()).thenReturn("public");
        org.mockito.Mockito.when(properties.grpcEndpoints()).thenReturn("127.0.0.1:4001");
        org.mockito.Mockito.when(properties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
        var scope = new org.apache.hertzbeat.common.observability.dto.log.LogFacets.Scope("bound", 1000, 2000,
                null, null, null, null, "a OR b", "service", null, null, java.util.Map.of(), java.util.Map.of(),
                java.util.Set.of(), false, null);
        var selection = new org.apache.hertzbeat.common.observability.dto.log.LogGroupSelection(1, java.util.List.of(
                new org.apache.hertzbeat.common.observability.dto.log.LogGroupSelection.Key(
                        org.apache.hertzbeat.common.observability.dto.log.LogFacets.Field.parse("attribute:v"), "value", "2.0")));
        var source = new org.apache.hertzbeat.common.observability.dto.log.LogComparison.Source(scope,
                new org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.And(java.util.List.of()), selection);
        try (var guard = new org.apache.hertzbeat.warehouse.db.GreptimeQueryGuard(1,
                java.time.Duration.ofSeconds(2), java.time.Duration.ofMillis(10))) {
            var storage = new GreptimeDbDataStorage(properties, null, executor, guard);
            assertEquals(java.util.List.of(), storage.querySortedLogs(source, 10, 10, new LogSort(1, "attribute:v", "number", "desc")));
            assertEquals(7L, storage.countSortedLogs(source));
        }
        assertTrue(captured.get(0).contains(" AS raw_sort_value FROM hertzbeat_logs"));
        assertTrue(captured.get(0).contains(" ORDER BY raw_sort_value DESC NULLS LAST"));
        String rowsWhere = captured.get(0).split(" FROM hertzbeat_logs", 2)[1].split(" ORDER BY ", 2)[0];
        assertEquals(rowsWhere, captured.get(1).split(" FROM hertzbeat_logs", 2)[1]);
        assertTrue(rowsWhere.contains("bound") && rowsWhere.contains("a OR b") && rowsWhere.contains("2.0"));
    }

    @Test
    void unsupportedReadersNeverFallBackToCappedPageSorting() {
        var reader = mock(HistoryDataReader.class, CALLS_REAL_METHODS);
        assertThrows(UnsupportedOperationException.class, () -> reader.querySortedLogs(null, 0, 10, null));
        assertThrows(UnsupportedOperationException.class, () -> reader.countSortedLogs(null));
    }
}
