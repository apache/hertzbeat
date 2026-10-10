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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.junit.jupiter.api.Test;

class GreptimeLogAnalysisTest {
    @Test
    void boundsRankMetadataFromEligibleGroupsWithoutCountingLimitedSharedCte() {
        for (String view : List.of("groups", "timeseries")) {
            for (boolean measured : List.of(false, true)) {
                var measure = measured ? new LogAnalysis.Measure("avg", "attribute:value") : null;
                var request = new LogAnalysis.Request(LogFacets.Field.parse("attribute:result"), view, 20,
                        measured ? "measure-desc" : "count-desc", 2, measure);
                for (boolean anchor : List.of(false, true)) {
                    String sql = GreptimeLogAnalysis.sql(request, 60000, " WHERE workspace = 'bound'", "hertzbeat_logs", anchor);
                    assertTrue(sql.contains("ranked_total AS (SELECT LEAST(COUNT(*), 21) AS ranked_count FROM normalized)"));
                    assertTrue(sql.contains("HAVING COUNT(*) >= 2"));
                    assertTrue(sql.contains("LIMIT 21"));
                    assertTrue(sql.contains("LIMIT 20"));
                    assertTrue(sql.indexOf("WHERE workspace") < sql.indexOf("GROUP BY"));
                }
            }
        }
    }

    @Test
    void preservesMissingNullEmptyAndLiteralUnknownWithWholePopulationTotal() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        when(executor.executeStrict(anyString())).thenReturn(List.of(
                row("missing", "", 4), row("null", "", 3), row("value", "", 2), row("value", "unknown", 1)));
        var request = new LogAnalysis.Request(LogFacets.Field.parse("attribute:result"), "groups", 4, "count-desc", 1);
        var result = GreptimeLogAnalysis.read(executor, new LogFacets.Window(1000, 120000), request, 60000,
                " WHERE trusted = 'workspace'");
        assertEquals(10, result.matchingTotal());
        assertEquals(List.of("missing", "null", "value", "value"), result.groups().stream().map(LogAnalysis.Group::kind).toList());
        assertEquals("", result.groups().get(2).value());
        assertEquals("unknown", result.groups().get(3).value());
    }

    @Test
    void ranksGloballyBeforeSelectingBucketsAndUsesExtraGroupForTruncation() {
        var request = new LogAnalysis.Request(LogFacets.Field.parse("attribute:result"), "timeseries", 3, "count-asc", 2);
        String sql = GreptimeLogAnalysis.sql(request, 60000, " WHERE workspace = 'bound'", "hertzbeat_logs");
        assertTrue(sql.contains("HAVING COUNT(*) >= 2"));
        assertTrue(sql.contains("LIMIT 4"));
        assertTrue(sql.contains("selected AS"));
        assertTrue(sql.indexOf("WHERE workspace") < sql.indexOf("GROUP BY"));
        assertTrue(sql.contains("INNER JOIN selected"));
        assertTrue(sql.contains("ORDER BY count ASC"));
    }

    @Test
    void rejectsMalformedAggregateInsteadOfReportingZero() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        when(executor.executeStrict(anyString())).thenReturn(List.of());
        var request = new LogAnalysis.Request(null, "groups", 20, "count-desc", 1);
        assertThrows(RuntimeException.class, () -> GreptimeLogAnalysis.read(executor,
                new LogFacets.Window(1000, 120000), request, 60000, " WHERE trusted = 'workspace'"));
        assertThrows(IllegalArgumentException.class, () -> new LogAnalysis.Request(null, "groups", 101, "count-desc", 1));
    }

    @Test
    void mapsExactBucketTimesAndRejectsIncompleteGroupCounts() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        var first = row("value", "winner", 3);
        first.put("matched", 3L);
        first.put("ranked_count", 1L);
        first.put("bucket", "1970-01-01T00:00:00Z");
        first.put("bucket_count", 1L);
        var second = new HashMap<>(first);
        second.put("bucket", "1970-01-01T00:01:00Z");
        second.put("bucket_count", 2L);
        when(executor.executeStrict(anyString())).thenReturn(List.of(first, second));
        var request = new LogAnalysis.Request(LogFacets.Field.parse("attribute:result"), "timeseries", 2, "count-desc", 1);
        var result = GreptimeLogAnalysis.read(executor, new LogFacets.Window(1000, 120000), request, 60000, " WHERE trusted = 'workspace'");
        assertEquals(List.of(0L, 60000L), result.groups().getFirst().buckets().stream()
                .map(LogAnalysis.Bucket::start).toList());
        second.put("bucket_count", 1L);
        assertThrows(RuntimeException.class, () -> GreptimeLogAnalysis.read(executor,
                new LogFacets.Window(1000, 120000), request, 60000, " WHERE trusted = 'workspace'"));
    }

    @Test
    void zeroPopulationIsDifferentFromMissingAggregateResponse() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        when(executor.executeStrict(anyString())).thenReturn(List.of(Map.of("matched", 0L, "ranked_count", 0L)));
        var request = new LogAnalysis.Request(null, "groups", 20, "count-desc", 1);
        assertEquals(0L, GreptimeLogAnalysis.read(executor, new LogFacets.Window(1000, 120000), request, 60000,
                " WHERE trusted = 'workspace'").matchingTotal());
    }

    private static Map<String, Object> row(String kind, String value, long count) {
        var row = new HashMap<String, Object>();
        row.put("matched", 10L);
        row.put("ranked_count", 4L);
        row.put("kind", kind);
        row.put("value", value);
        row.put("count", count);
        return row;
    }
}
