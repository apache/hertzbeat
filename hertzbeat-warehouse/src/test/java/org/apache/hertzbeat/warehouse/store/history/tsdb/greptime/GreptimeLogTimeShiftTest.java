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

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;

import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.junit.jupiter.api.Test;

class GreptimeLogTimeShiftTest {
    @Test
    void explicitShiftHasSeparateValidatedBoundary() throws Exception {
        assertEquals(LogFacets.Window.class, LogComparison.class.getMethod("shiftedWindow", LogFacets.Window.class, long.class).getReturnType());
    }

    @Test
    void fixedOffsetsPreserveExactClosedWindowsAndTrustedScope() {
        var window = new LogFacets.Window(900000000, 900010000);
        for (long offset : List.of(3600000L, 86400000L, 604800000L)) {
            var previous = LogComparison.shiftedWindow(window, offset);
            assertEquals(window.start() - offset, previous.start());
            assertEquals(window.end() - offset, previous.end());
            var a = source(window, "bound");
            var b = source(previous, "bound");
            LogComparison.validateShiftedSources(a, b, offset);
            assertThrows(IllegalArgumentException.class, () -> LogComparison.validateSources(a, b));
            assertThrows(IllegalArgumentException.class, () -> LogComparison.validateShiftedSources(a, source(previous, "other"), offset));
            assertThrows(IllegalArgumentException.class, () -> LogComparison.validateShiftedSources(a, a, offset));
        }
        for (long offset : List.of(0L, -1L, 1L, Long.MAX_VALUE)) {
            assertThrows(IllegalArgumentException.class, () -> LogComparison.shiftedWindow(window, offset));
        }
        assertThrows(IllegalArgumentException.class, () -> LogComparison.shiftedWindow(new LogFacets.Window(1, 1000), 3600000));
    }

    @Test
    void emptyResultsEchoShiftAndOldJsonOmitsIt() throws Exception {
        var window = new LogFacets.Window(900000000, 900010000);
        var request = new LogAnalysis.Request(null, "groups", 1, "count-desc", 1);
        var old = new LogComparison.Result(window, request, 0, 0, false, null, List.of(), null);
        var json = new ObjectMapper().readTree(new ObjectMapper().writeValueAsString(old));
        assertTrue(!json.has("bWindow") && !json.has("bTimeShiftMs"));
        var result = new LogComparison.Result(window, request, 0, 0, false, null, List.of(), null,
                3600000L, LogComparison.shiftedWindow(window, 3600000));
        assertEquals(3600000L, result.timeShiftMs());
        var shiftedJson = new ObjectMapper().readTree(new ObjectMapper().writeValueAsString(result));
        assertEquals(3600000L, shiftedJson.get("bTimeShiftMs").asLong());
        assertTrue(shiftedJson.has("bWindow") && !shiftedJson.has("shiftedWindow") && !shiftedJson.has("timeShiftMs"));
        assertThrows(IllegalArgumentException.class, () -> new LogComparison.Result(window, request, 0, 0, false, null,
                List.of(), null, 3600000L, window));
        assertThrows(IllegalArgumentException.class, () -> new LogComparison.Result(window, request, 0, 0, false, null,
                List.of(), null, null, window));
    }

    @Test
    void shiftedPartitionUsesTranslatedOriginBeforeAggregation() {
        var request = new LogAnalysis.Request(null, "timeseries", 1, "count-desc", 1);
        String sql = GreptimeLogComparison.sql(request, 21600000, " WHERE a", " WHERE b", "logs", 3600000L);
        assertTrue(sql.contains("date_bin('21600 seconds', f.timestamp, to_timestamp_millis(-3600000)) + INTERVAL '3600 seconds'"));
        assertTrue(sql.contains("date_bin('21600 seconds', f.timestamp) AS bucket"));
        assertTrue(sql.contains("FROM b_raw f INNER JOIN selected s"));
        var explicit = new LogAnalysis.Request(null, "timeseries", 1, "count-desc", 1, null, null, 1000L);
        assertThrows(IllegalArgumentException.class, () -> GreptimeLogComparison.sql(explicit, 21600000,
                " WHERE a", " WHERE b", "logs", 3600000L));
    }

    private static LogComparison.Source source(LogFacets.Window window, String workspace) {
        var scope = new LogFacets.Scope(workspace, window.start(), window.end(), null, null, null, null, null,
                null, null, null, Map.of(), Map.of(), Set.of(), false, null);
        return new LogComparison.Source(scope, new LogSearchExpression.And(List.of()), null);
    }
}
