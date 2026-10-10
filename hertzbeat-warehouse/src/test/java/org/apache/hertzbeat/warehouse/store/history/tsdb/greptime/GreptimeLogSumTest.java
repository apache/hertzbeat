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

class GreptimeLogSumTest {
    private static final LogAnalysis.Measure SUM = new LogAnalysis.Measure("sum", "attribute:duration");

    @Test
    void sumUsesExistingFiniteNativeAdmissionAcrossRawRankingBucketsAndComparison() {
        assertEquals(GreptimeLogMeasurement.sample(new LogAnalysis.Measure("avg", "attribute:duration")),
                GreptimeLogMeasurement.sample(SUM));
        assertEquals("SUM(sample)", GreptimeLogMeasurement.aggregate(SUM, "sample"));
        var request = request(null, "timeseries", "throughput");
        String single = GreptimeLogAnalysis.sql(request, 1000, " WHERE workspace='bound'", "logs");
        assertTrue(single.contains("SUM(sample)"));
        assertTrue(single.contains("SUM(f.sample)"));
        assertTrue(single.contains("COUNT(sample)"));
        assertTrue(single.contains("measurement DESC NULLS LAST"));
        assertFalse(single.contains("/ 1000"));
        var grouping = new LogAnalysis.Grouping(1, List.of(new LogAnalysis.Dimension("attribute:group", 2),
                new LogAnalysis.Dimension("attribute:child", 2)));
        String multi = GreptimeLogAnalysis.sql(request(grouping, "timeseries", "throughput"), 1000, " WHERE workspace='bound'", "logs");
        assertTrue(multi.contains("SUM(f.sample)"));
        assertFalse(multi.contains("SUM(s.measurement)"));
        String paired = GreptimeLogComparison.sql(request, 1000, " WHERE a=true", " WHERE b=true", "logs");
        assertTrue(paired.contains("SUM(f.sample)"));
        assertTrue(paired.contains(" WHERE b=true"));
        assertTrue(GreptimeLogAdditionalMeasurements.aggregates(List.of(SUM)).contains("SUM(f.extra0)"));
    }

    @Test
    void sumDistinguishesMissingCancellationOverflowAndRetainsUnnormalizedBuckets() {
        for (String state : List.of("no_samples", "ready", "non_finite")) {
            Map<String, Object> row = new HashMap<>();
            row.put("matched", 2L);
            row.put("ranked_count", 1L);
            row.put("kind", "value");
            row.put("value", "group");
            row.put("count", 2L);
            row.put("samples", "no_samples".equals(state) ? 0L : 2L);
            row.put("measurement", "ready".equals(state) ? 0.0 : null);
            row.put("bucket", 1_000_000_000L);
            row.put("bucket_count", 2L);
            row.put("bucket_samples", row.get("samples"));
            row.put("bucket_measurement", row.get("measurement"));
            var executor = mock(GreptimeSqlQueryExecutor.class);
            when(executor.executeStrict(anyString())).thenReturn(List.of(row));
            var result = GreptimeLogAnalysis.read(executor, new LogFacets.Window(1000, 1999),
                    request(null, "timeseries", "throughput"), 1000, "");
            assertEquals("throughput", result.transform());
            var group = result.groups().getFirst();
            assertEquals(state, group.measurement().state());
            assertEquals(group.measurement(), group.buckets().getFirst().measurement());
            assertEquals(2L, group.buckets().getFirst().count());
        }
    }

    @Test
    void throughputMetadataDoesNotNormalizeRawCount() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        when(executor.executeStrict(anyString())).thenReturn(List.of(Map.of("matched", 120L, "ranked_count", 1L,
                "kind", "value", "value", "group", "count", 120L, "bucket", 0L, "bucket_count", 120L)));
        var request = new LogAnalysis.Request(LogFacets.Field.parse("attribute:group"), "timeseries", 2,
                "count-desc", 1, null, null, 60000L, null, "throughput");
        var result = GreptimeLogAnalysis.read(executor, new LogFacets.Window(1000, 59999), request, 60000, "");
        assertEquals("throughput", result.transform());
        assertEquals(120L, result.groups().getFirst().buckets().getFirst().count());
    }

    private LogAnalysis.Request request(LogAnalysis.Grouping grouping, String view, String transform) {
        return new LogAnalysis.Request(grouping == null ? LogFacets.Field.parse("attribute:group") : null,
                view, grouping == null ? 2 : grouping.limit(), "measure-desc", 1, SUM, grouping, 1000L, null, transform);
    }
}
