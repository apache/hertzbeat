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

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.junit.jupiter.api.Test;

class GreptimeLogComparisonTest {
    @Test
    void retainsZeroComparisonAndRejectsIncompletePairedBuckets() {
        var request = new LogAnalysis.Request(null, "timeseries", 20, "count-desc", 1);
        var a = new LogComparison.Cell(2, null);
        var b = new LogComparison.Cell(0, null);
        var group = new LogComparison.Group(List.of(), a, b, List.of(new LogComparison.Bucket(60_000, a, b)));
        assertEquals(0, new LogComparison.Result(new LogFacets.Window(1, 119_999), request, 2, 0, false,
                60_000L, List.of(group), null).groups().getFirst().b().count());
        var incomplete = new LogComparison.Group(List.of(), a, b, List.of(new LogComparison.Bucket(60_000,
                new LogComparison.Cell(1, null), b)));
        assertThrows(IllegalArgumentException.class, () -> new LogComparison.Result(new LogFacets.Window(1, 119_999),
                request, 2, 0, false, 60_000L, List.of(incomplete), null));
    }

    @Test
    void buildsCompleteComparisonWithKindJoinsAndAnchorOrdinals() {
        var grouping = new LogAnalysis.Grouping(1, List.of(new LogAnalysis.Dimension("attribute:a", 1),
                new LogAnalysis.Dimension("attribute:b", 2)));
        var request = new LogAnalysis.Request(null, "timeseries", 2, "count-desc", 1, null, grouping);
        String sql = GreptimeLogComparison.sql(request, 60_000, " WHERE workspace = 'bound'",
                " WHERE workspace = 'bound' AND error = true", "fixture");
        assertTrue(sql.contains("s.k1 = f.k1 AND s.v1 = f.v1"));
        assertTrue(sql.contains(" UNION "));
        assertTrue(sql.contains("ORDER BY s.ordinal1, s.ordinal2"));
    }

    @Test
    void keepsLegacySearchAndRejectsScopeWideningAndUnsupportedReaders() {
        var scope = new LogFacets.Scope("bound", 1, 119_999, null, null, null, null, "a OR b", null,
                null, null, Map.of(), Map.of(), Set.of(), false, null);
        var a = new LogComparison.Source(scope, new LogSearchExpression.And(List.of()), null);
        LogComparison.validateSources(a, a);
        assertEquals("a OR b", a.scope().search());
        var other = new LogFacets.Scope("other", 1, 119_999, null, null, null, null, null, null,
                null, null, Map.of(), Map.of(), Set.of(), false, null);
        assertThrows(IllegalArgumentException.class, () -> LogComparison.validateSources(a,
                new LogComparison.Source(other, new LogSearchExpression.And(List.of()), null)));
        assertThrows(UnsupportedOperationException.class, () -> mock(HistoryDataReader.class, CALLS_REAL_METHODS)
                .logComparison(a, a, new LogAnalysis.Request(null, "groups", 20, "count-desc", 1), 60_000, null));
    }

    @Test
    void validatesSparseUnionBeforeFillingAndPreservesUniqueZero() {
        var request = new LogAnalysis.Request(null, "timeseries", 20, "count-desc", 1);
        var first = row(0, 2, 0);
        var second = row(60_000, 0, 1);
        var result = GreptimeLogComparisonMapper.map(List.of(first, second), new LogFacets.Window(1, 179_999), request, 60_000, "100*b/a");
        assertEquals(3, result.groups().getFirst().buckets().size());
        assertEquals(0, result.groups().getFirst().buckets().getLast().a().count());
        assertThrows(IllegalArgumentException.class, () -> GreptimeLogComparisonMapper.map(List.of(first),
                new LogFacets.Window(1, 179_999), request, 60_000, null));
        assertThrows(IllegalArgumentException.class, () -> GreptimeLogComparisonMapper.map(List.of(second, first),
                new LogFacets.Window(1, 179_999), request, 60_000, null));
        var unique = new LogAnalysis.Measure("unique", "attribute:m");
        var empty = new LogComparison.Cell(0, new LogAnalysis.Measurement("ready", 0, 0.0));
        var a = new LogComparison.Cell(1, new LogAnalysis.Measurement("ready", 1, 1.0));
        var group = new LogComparison.Group(List.of(), a, empty, List.of());
        assertEquals(0, new LogComparison.Result(new LogFacets.Window(1, 119_999),
                new LogAnalysis.Request(null, "groups", 20, "measure-desc", 1, unique), 1, 0, false, null,
                List.of(group), null).groups().getFirst().b().measurement().value());
    }

    private Map<String, Object> row(long bucket, long a, long b) {
        var result = new HashMap<String, Object>();
        result.putAll(Map.of("matching_a", 2, "matching_b", 1, "selected_count", 1, "truncated", 0,
                "k1", "all", "v1", "", "ordinal1", 1, "a_count", 2, "b_count", 1));
        result.put("bucket", java.time.Instant.ofEpochMilli(bucket).toString());
        result.put("ba_count", a);
        result.put("bb_count", b);
        return result;
    }

}
