/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import java.util.ArrayList;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogQuerySet;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class GreptimeLogQuerySetTest {
    private final LogFacets.Window window = new LogFacets.Window(1, 119_999);

    @Test
    void buildsOneUnionDomainStatementInsteadOfAnchoringToA() {
        String sql = GreptimeLogQuerySet.sql(populations(), "timeseries", 60_000,
                List.of(" WHERE workspace = 'bound' AND status = 'a'", " WHERE workspace = 'bound' AND status = 'b'"), "fixture");
        assertTrue(sql.contains("domain_s0 AS (SELECT k1, v1 FROM selected_s0 UNION SELECT k1, v1 FROM selected_s1)"));
        assertTrue(sql.contains("cells_s0 AS"));
        assertTrue(sql.contains("cells_s1 AS"));
        assertTrue(sql.contains("UNION ALL"));
        assertTrue(sql.contains("LEFT JOIN domain_s0 d ON true"));
    }

    @Test
    void deduplicatesSelectedKeysAcrossTimeBucketsForSingleSourceDomain() {
        String sql = GreptimeLogQuerySet.sql(List.of(populations().getFirst()), "timeseries", 60_000,
                List.of(" WHERE true"), "fixture");
        assertTrue(sql.contains("selected_s0 AS (SELECT kind AS k1, value AS v1 FROM rank_s0"
                + " WHERE count IS NOT NULL GROUP BY kind, value)"));
    }

    @Test
    void retainsSecondSourceOnlyGroupAndHiddenSourceWithHonestEmptyBuckets() throws Exception {
        var result = GreptimeLogQuerySetMapper.map(List.of(row(0, 0, 0, null), row(1, 1, 1, 0L)),
                window, populations(), List.of(LogQuerySet.Formula.from("f1", "Total", true, "a+b", Set.of("a", "b"))),
                "timeseries", 60_000);
        assertEquals(1, result.sources().getFirst().groups().size());
        assertEquals(0, result.sources().getFirst().groups().getFirst().cell().count());
        assertEquals(1, result.sources().getLast().groups().getFirst().cell().count());
        assertFalse(result.sources().getLast().visible());
        assertEquals(0, result.sources().getLast().groups().getFirst().buckets().getLast().cell().count());
        var json = JsonMapper.builder().build().readTree(JsonMapper.builder().build().writeValueAsString(result));
        assertFalse(json.get("executed").get("formulas").get(0).has("dependsOn"));
        assertTrue(json.get("formulas").get(0).has("dependsOn"));
    }

    @Test
    void rejectsOverBudgetFormulaSeriesAsQueryError() {
        var rows = new ArrayList<Map<String, Object>>();
        for (int source = 0; source < 2; source++) {
            for (int group = 0; group < 25; group++) {
                var row = row(source, 25, 1, 0L);
                row.put("v1", "s" + source + "-" + group);
                rows.add(row);
            }
        }
        var executor = mock(GreptimeSqlQueryExecutor.class);
        when(executor.executeStrict(anyString())).thenReturn(rows);
        var formulas = List.of(LogQuerySet.Formula.from("f1", "F1", true, "a*2", Set.of("a")),
                LogQuerySet.Formula.from("f2", "F2", true, "b*2", Set.of("b")),
                LogQuerySet.Formula.from("f3", "F3", true, "a+b", Set.of("a", "b")));
        assertThrows(LogQuerySet.SeriesBudgetExceeded.class, () -> GreptimeLogQuerySet.read(executor, window,
                populations(), formulas, "timeseries", 60_000, List.of(" WHERE true", " WHERE true")));
    }

    @Test
    void treatsMalformedStorageRowsAsUnavailable() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        when(executor.executeStrict(anyString())).thenReturn(List.of(Map.of("source_order", 0)));
        assertThrows(TelemetryStorageUnavailableException.class, () -> GreptimeLogQuerySet.read(executor,
                window, populations(), List.of(), "timeseries", 60_000, List.of(" WHERE true", " WHERE true")));
    }

    @Test
    void missingUniqueSourceCellIsNoSamplesRatherThanZeroDistinctValues() {
        var scope = populations().getFirst().source();
        var unique = new LogQuerySet.Analysis("builtin:serviceName", null,
                new LogAnalysis.Measure("unique", "builtin:serviceName"), 25, "measure-desc", 1, null);
        var sources = List.of(new LogQuerySet.Population(
                new LogQuerySet.Query("a", "A", true, null, null, null, unique), scope), populations().getLast());
        var first = row(0, 0, 0, null);
        first.put("c_samples", 0);
        first.put("c_measurement", null);
        var result = GreptimeLogQuerySetMapper.map(List.of(first, row(1, 1, 1, 0L)),
                window, sources, List.of(), "timeseries", 60_000);
        var cell = result.sources().getFirst().groups().getFirst().cell();
        assertEquals("no_samples", cell.measurement().state());
        assertEquals(null, cell.measurement().value());
        assertEquals("no_samples", result.sources().getFirst().groups().getFirst().buckets().getLast()
                .cell().measurement().state());
        assertTrue(GreptimeLogQuerySet.sql(sources, "timeseries", 60_000,
                List.of(" WHERE true", " WHERE true"), "fixture")
                .contains("CASE WHEN c.count IS NULL THEN NULL ELSE c.measurement END"));
    }

    private List<LogQuerySet.Population> populations() {
        var scope = new LogFacets.Scope("bound", 1, 119_999, null, null, null, null, null, null,
                null, null, Map.of(), Map.of(), Set.of(), false, null);
        var source = new LogComparison.Source(scope, new LogSearchExpression.And(List.of()), null);
        var analysis = new LogQuerySet.Analysis("builtin:serviceName", null, null, 25, "count-desc", 1, null);
        return List.of(new LogQuerySet.Population(new LogQuerySet.Query("a", "A", true, null, null, null, analysis), source),
                new LogQuerySet.Population(new LogQuerySet.Query("b", "B", false, null, null, null, analysis), source));
    }

    private Map<String, Object> row(int index, long total, long count, Long bucket) {
        var row = new HashMap<String, Object>();
        row.putAll(Map.of("source_order", index, "matching_total", total, "truncated", 0,
                "k1", "value", "v1", "only-b", "k2", "all", "v2", "", "c_count", count));
        row.putAll(Map.of("k3", "all", "v3", "", "k4", "all", "v4", ""));
        row.put("c_samples", null);
        row.put("c_measurement", null);
        row.put("bucket", bucket == null ? null : Instant.ofEpochMilli(bucket).toString());
        row.put("b_count", bucket == null ? null : count);
        row.put("b_samples", null);
        row.put("b_measurement", null);
        return row;
    }
}
