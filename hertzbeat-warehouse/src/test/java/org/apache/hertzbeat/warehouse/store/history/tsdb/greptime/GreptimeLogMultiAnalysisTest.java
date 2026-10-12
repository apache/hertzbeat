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
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

class GreptimeLogMultiAnalysisTest {
    private LogAnalysis.Grouping grouping() {
        return new LogAnalysis.Grouping(1, List.of(new LogAnalysis.Dimension("attribute:a", 2), new LogAnalysis.Dimension("attribute:b", 3)));
    }

    @Test
    void validatesProductsOrderedKeysAndLegacyConstructorCompatibility() {
        assertEquals(6, grouping().limit());
        assertThrows(IllegalArgumentException.class, () -> new LogAnalysis.Grouping(1,
                List.of(new LogAnalysis.Dimension("attribute:a", 11), new LogAnalysis.Dimension("attribute:b", 10))));
        assertThrows(IllegalArgumentException.class, () -> new LogAnalysis.Grouping(1,
                List.of(new LogAnalysis.Dimension("attribute:a", 1), new LogAnalysis.Dimension("attribute:a", 1))));
        assertThrows(IllegalArgumentException.class, () -> new LogAnalysis.Request(null, "groups", 5, "count-desc", 1, null, grouping()));
        var keys = List.of(new LogAnalysis.GroupKey("attribute:a", "value", "x"), new LogAnalysis.GroupKey("attribute:b", "null", null));
        var group = new LogAnalysis.Group(null, null, 2, List.of(), null, keys);
        var result = result(List.of(group));
        assertEquals(keys, result.groups().getFirst().keys());
        String json = JsonUtil.toJson(result);
        assertTrue(json.contains("\"kind\":null,\"value\":null"));
        assertTrue(json.contains("\"keys\":["));
        assertTrue(json.contains("\"grouping\":{\"version\":1,\"dimensions\":["));
        var reversed = new LogAnalysis.Group(null, null, 2, List.of(), null, keys.reversed());
        assertThrows(IllegalArgumentException.class, () -> result(List.of(reversed)));
        assertThrows(IllegalArgumentException.class, () -> result(List.of(group, group)));
        assertThrows(IllegalArgumentException.class, () -> new LogAnalysis.Group("value", "x", 2, List.of(), null, keys));
    }

    @Test
    void ranksRawPrefixesIndependentlyAndPreservesAncestorOrderingBeforeBuckets() {
        var request = new LogAnalysis.Request(null, "timeseries", 6, "measure-desc", 1,
                new LogAnalysis.Measure("avg", "attribute:m"), grouping());
        String sql = GreptimeLogAnalysis.sql(request, 60000, " WHERE workspace = 'bound'", "logs");
        assertTrue(sql.contains("ROW_NUMBER() OVER"));
        assertTrue(sql.contains("PARTITION BY k1, v1"));
        assertTrue(sql.contains("AVG(f.sample)"));
        assertTrue(sql.contains("WHERE ordinal2 <= 3"));
        assertTrue(sql.contains("WHERE ordinal1 <= 2 ORDER BY ordinal1 LIMIT 2"));
        assertTrue(sql.contains("WHERE ordinal2 <= 3 ORDER BY ordinal1, ordinal2 LIMIT 6"));
        assertTrue(sql.contains("ORDER BY s.ordinal1, s.ordinal2"));
        assertTrue(sql.indexOf("WHERE workspace") < sql.indexOf("GROUP BY"));
    }

    @Test
    void preservesTruncationWhenReachableParentsHaveNoEligibleLeaf() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        when(executor.executeStrict(anyString())).thenReturn(List.of(Map.of("matched", 12L, "ranked_count", 0L, "was_truncated", 1L)));
        var request = new LogAnalysis.Request(null, "groups", 6, "count-desc", 2, null, grouping());
        var result = GreptimeLogAnalysis.read(executor, new LogFacets.Window(1000, 120000), request, 60000, "");
        assertTrue(result.truncated());
        assertEquals(12L, result.matchingTotal());
        assertEquals(List.of(), result.groups());
    }

    @Test
    void mapsTupleIdentitiesWithoutJoinedStringCollisions() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        var row = new HashMap<String, Object>(Map.of("matched", 2L, "ranked_count", 1L, "was_truncated", 0L,
                "k1", "value", "v1", "x|y", "k2", "value", "v2", "z", "count", 2L));
        when(executor.executeStrict(anyString())).thenReturn(List.of(row));
        var request = new LogAnalysis.Request(null, "groups", 6, "count-desc", 1, null, grouping());
        var result = GreptimeLogAnalysis.read(executor, new LogFacets.Window(1000, 120000), request, 60000, "");
        assertEquals(List.of("x|y", "z"), result.groups().getFirst().keys().stream().map(LogAnalysis.GroupKey::value).toList());
    }

    private LogAnalysis.Result result(List<LogAnalysis.Group> groups) {
        return new LogAnalysis.Result(new LogFacets.Window(1000, 120000), null, "groups", 6, "count-desc", 1,
                10, false, null, groups, null, grouping());
    }
}
