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
import static org.junit.jupiter.api.Assertions.assertFalse;
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
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.junit.jupiter.api.Test;

class GreptimeLogMeasurementTest {
    private LogAnalysis.Request request(String function, String view) {
        return new LogAnalysis.Request(LogFacets.Field.parse("attribute:group"), view, 20, "measure-desc", 1,
                new LogAnalysis.Measure(function, "attribute:duration"));
    }

    @Test
    void ranksGlobalRawMeasureBeforeLimitAndAggregatesSelectedBucketsIndependently() {
        String sql = GreptimeLogAnalysis.sql(request("avg", "timeseries"), 60000, " WHERE workspace = 'bound'", "logs");
        assertTrue(sql.contains("AVG(sample)"));
        assertTrue(sql.contains("COUNT(sample)"));
        assertTrue(sql.contains("measurement DESC NULLS LAST"));
        assertTrue(sql.indexOf("WHERE workspace") < sql.indexOf("GROUP BY"));
        assertTrue(sql.indexOf("LIMIT 21") < sql.indexOf("buckets AS"));
        assertTrue(sql.contains("AVG(f.sample)"));
        assertFalse(sql.contains("AVG(s.measurement)"));
    }

    @Test
    void distinguishesNoSamplesZeroAndFiniteSourceOverflow() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        for (var state : List.of("no_samples", "ready", "non_finite")) {
            var row = row();
            row.put("samples", "no_samples".equals(state) ? 0L : 2L);
            row.put("measurement", "ready".equals(state) ? 0.0 : null);
            when(executor.executeStrict(anyString())).thenReturn(List.of(row));
            var result = GreptimeLogAnalysis.read(executor, new LogFacets.Window(1000, 120000), request("avg", "groups"), 60000, "");
            assertEquals(state, result.groups().getFirst().measurement().state());
            assertEquals(3L, result.groups().getFirst().count());
            assertEquals(request("avg", "groups").measure(), result.measure());
        }
    }

    @Test
    void uniqueUsesExactScalarProjectionAndEmptyCardinalityIsReady() {
        String sql = GreptimeLogAnalysis.sql(request("unique", "groups"), 60000, "", "logs");
        assertTrue(sql.contains("COUNT(DISTINCT sample)"));
        var executor = mock(GreptimeSqlQueryExecutor.class);
        var row = row();
        row.put("samples", 0L);
        row.put("measurement", 0L);
        when(executor.executeStrict(anyString())).thenReturn(List.of(row));
        var result = GreptimeLogAnalysis.read(executor, new LogFacets.Window(1000, 120000), request("unique", "groups"), 60000, "");
        assertEquals(new LogAnalysis.Measurement("ready", 0, 0.0), result.groups().getFirst().measurement());
    }

    @Test
    void preservesCountJsonAndRejectsIncompatibleControlsAndImpossibleSamples() {
        var group = new LogAnalysis.Group("all", null, 1, List.of());
        var count = new LogAnalysis.Result(new LogFacets.Window(1000, 120000), null, "groups", 20, "count-desc", 1, 1, false, null, List.of(group));
        String json = JsonUtil.toJson(count);
        assertFalse(json.contains("measure"));
        assertFalse(json.contains("keys"));
        assertFalse(json.contains("grouping"));
        assertTrue(json.contains("\"buckets\":[]"));
        assertThrows(IllegalArgumentException.class, () -> new LogAnalysis.Measure("avg", "builtin:serviceName"));
        assertThrows(IllegalArgumentException.class, () -> new LogAnalysis.Request(null, "groups", 20, "count-desc", 1,
                new LogAnalysis.Measure("avg", "attribute:m")));
        assertThrows(IllegalArgumentException.class, () -> new LogAnalysis.Measurement("ready", 0, Double.NaN));
        assertThrows(IllegalArgumentException.class, () -> new LogAnalysis.Group("all", null, 1, List.of(),
                new LogAnalysis.Measurement("ready", 2, 1.0)));
    }

    @Test
    void resultRejectsIncompleteBucketsAndSampleTotalsWithoutSummingUniqueValues() {
        var measure = new LogAnalysis.Measure("unique", "attribute:m");
        var one = new LogAnalysis.Measurement("ready", 1, 1.0);
        var group = new LogAnalysis.Group("all", null, 2, List.of(new LogAnalysis.Bucket(0, 1, one)),
                new LogAnalysis.Measurement("ready", 2, 1.0));
        assertThrows(IllegalArgumentException.class, () -> measuredResult(group, measure));
        var zeroCardinality = new LogAnalysis.Group("all", null, 2,
                List.of(new LogAnalysis.Bucket(0, 2, new LogAnalysis.Measurement("ready", 2, 0.0))),
                new LogAnalysis.Measurement("ready", 2, 0.0));
        assertThrows(IllegalArgumentException.class, () -> measuredResult(zeroCardinality, measure));
        var incompleteSamples = new LogAnalysis.Group("all", null, 2, List.of(new LogAnalysis.Bucket(0, 2, one)),
                new LogAnalysis.Measurement("ready", 2, 1.0));
        assertThrows(IllegalArgumentException.class, () -> measuredResult(incompleteSamples, measure));
        var complete = new LogAnalysis.Group("all", null, 2,
                List.of(new LogAnalysis.Bucket(0, 1, one), new LogAnalysis.Bucket(60000, 1, one)),
                new LogAnalysis.Measurement("ready", 2, 1.0));
        assertEquals(1.0, measuredResult(complete, measure).groups().getFirst().measurement().value());
    }

    private LogAnalysis.Result measuredResult(LogAnalysis.Group group, LogAnalysis.Measure measure) {
        return new LogAnalysis.Result(new LogFacets.Window(1000, 120000), null, "timeseries", 20,
                "measure-desc", 1, 2, false, 60000L, List.of(group), measure);
    }

    private Map<String, Object> row() {
        var row = new HashMap<String, Object>();
        row.put("matched", 3L);
        row.put("ranked_count", 1L);
        row.put("kind", "value");
        row.put("value", "group");
        row.put("count", 3L);
        return row;
    }
}
