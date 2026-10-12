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

import java.util.HashMap;
import java.util.List;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.junit.jupiter.api.Test;

class GreptimeLogPercentileTest {
    @Test
    void acceptsOnlySixFixedPercentilesAndUsesNativeHundredCentroidGuard() {
        for (String function : List.of("p50", "p75", "p90", "p95", "p98", "p99")) {
            var measure = new LogAnalysis.Measure(function, "attribute:duration");
            String aggregate = GreptimeLogMeasurement.aggregate(measure, "raw.sample");
            assertTrue(aggregate.contains("APPROX_PERCENTILE_CONT(" + Integer.parseInt(function.substring(1)) / 100.0 + ", 100)"));
            assertTrue(aggregate.contains("SUM(ABS(raw.sample))"));
            assertTrue(aggregate.contains("MAX(raw.sample) - MIN(raw.sample)"));
            assertTrue(aggregate.contains("WITHIN GROUP (ORDER BY raw.sample)"));
            assertFalse(aggregate.contains(" ELSE 0"));
        }
        assertThrows(IllegalArgumentException.class, () -> new LogAnalysis.Measure("p96", "attribute:duration"));
        assertThrows(IllegalArgumentException.class, () -> new LogAnalysis.Measure("p95", "builtin:serviceName"));
    }

    @Test
    void everyRawPrefixBucketAndComparisonSourceUsesSameGuard() {
        var measure = new LogAnalysis.Measure("p95", "attribute:duration");
        var grouping = new LogAnalysis.Grouping(1, List.of(new LogAnalysis.Dimension("attribute:route", 2),
                new LogAnalysis.Dimension("attribute:status", 2)));
        var request = new LogAnalysis.Request(null, "timeseries", 4, "measure-desc", 1, measure, grouping);
        String sql = GreptimeLogComparison.sql(request, 60000, " WHERE workspace = 'bound' AND source = 'a'",
                " WHERE workspace = 'bound' AND source = 'b'", "logs");
        assertTrue(sql.contains("APPROX_PERCENTILE_CONT(0.95, 100) WITHIN GROUP (ORDER BY f.sample)"));
        assertTrue(sql.contains("SUM(ABS(f.sample))"));
        assertTrue(sql.contains("MAX(f.sample) - MIN(f.sample)"));
        assertFalse(sql.contains("ORDER BY s.measurement"));
        assertFalse(sql.contains("APPROX_PERCENTILE_CONT(0.95, 100) WITHIN GROUP (ORDER BY measurement)"));
    }

    @Test
    void guardedIndeterminateEstimateDoesNotBecomeNoSamplesOrZero() {
        var measure = new LogAnalysis.Measure("p95", "resource:duration");
        var row = new HashMap<String, Object>();
        row.put("samples", 2L);
        row.put("measurement", null);
        assertEquals(new LogAnalysis.Measurement("non_finite", 2, null), GreptimeLogMeasurement.read(row, "", measure));
        row.put("samples", 0L);
        assertEquals(new LogAnalysis.Measurement("no_samples", 0, null), GreptimeLogMeasurement.read(row, "", measure));
        row.put("samples", 1L);
        row.put("measurement", -7.0);
        assertEquals(new LogAnalysis.Measurement("ready", 1, -7.0), GreptimeLogMeasurement.read(row, "", measure));
        assertTrue(GreptimeLogMeasurement.sample(measure).contains("NOT COALESCE"));
        assertTrue(GreptimeLogMeasurement.sample(measure).contains("resource_attributes"));
    }
}
