/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.warehouse.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics;
import org.junit.jupiter.api.Test;

class GreptimeTraceAnalyticsTest {
    @Test
    void histogramCountsTraceRepresentativesAndKeepsHalfOpenWindow() {
        var result = GreptimeTraceAnalytics.query(sql -> {
            assertTrue(sql.contains("WHERE workspace_guard AND exact_predicates"));
            assertTrue(sql.contains("WHERE trace_error = 1"));
            assertTrue(sql.contains("WHERE match_position=1"));
            return List.of(Map.of("bucket", 0L, "count", 2L, "errors", 1L));
        }, scope("matched_traces"), options("histogram"), "workspace_guard AND exact_predicates");
        var histogram = (TraceAnalytics.Histogram) result.data();
        assertEquals("window", result.coverage().mode());
        assertEquals(2, histogram.totalCount());
        assertTrue(histogram.buckets().getLast().endExclusive());
    }

    @Test
    void malformedCountsAndStorageFailureCarryNoDataOrCoverage() {
        var malformed = GreptimeTraceAnalytics.query(sql -> List.of(Map.of("bucket", 0, "count", 1, "errors", 2)),
                scope("matched_spans"), options("histogram"), "workspace_guard");
        assertEquals("unavailable", malformed.state());
        assertNull(malformed.data());
        assertNull(malformed.coverage());
        var failed = GreptimeTraceAnalytics.query(sql -> { throw new IllegalStateException("storage down"); },
                scope("matched_spans"), options("histogram"), "workspace_guard");
        assertEquals("unavailable", failed.state());
    }

    @Test
    void traceFacetsUseDistinctMembershipsAndKeepEmptyValues() {
        var result = GreptimeTraceAnalytics.query(sql -> {
            assertTrue(sql.contains("SELECT DISTINCT trace_id AS member_id,service_name AS value"));
            assertTrue(sql.contains("COUNT(DISTINCT trace_id)"));
            assertTrue(sql.contains("WHERE value IS NOT NULL"));
            return List.of(Map.of("total", 2, "missing_count", 1, "value", "", "count", 1, "errors", 0));
        }, scope("matched_traces"), options("facets"), "workspace_guard");
        var facets = (TraceAnalytics.Facets) result.data();
        assertEquals(1, facets.missingCount());
        assertEquals("", facets.values().getFirst().value());
    }

    @Test
    void facetLimitAppliesAfterTheAggregateJoin() {
        var result = GreptimeTraceAnalytics.query(sql -> {
            assertTrue(sql.endsWith("LIMIT 21"));
            return java.util.stream.IntStream.rangeClosed(1, 21)
                    .mapToObj(index -> Map.<String, Object>of("total", 30, "missing_count", 0,
                            "value", "operation-" + index, "count", 1, "errors", 0)).toList();
        }, scope("matched_traces"), new TraceAnalytics.Options("facets", "operationName", 20, 2, 0, 20, "newest"), "workspace_guard");
        assertEquals("ready", result.state());
        var facets = (TraceAnalytics.Facets) result.data();
        assertEquals(20, facets.values().size());
        assertTrue(facets.truncated());
    }

    @Test
    void spanOrderingAndCountHappenBeforePageOffset() {
        var calls = new java.util.ArrayList<String>();
        var result = GreptimeTraceAnalytics.query(sql -> {
            calls.add(sql);
            return sql.contains("LIMIT") ? List.of() : List.of(Map.of("total", 7));
        }, scope("matched_spans"), new TraceAnalytics.Options("spans", null, 20, 10, 2, 20, "duration_desc"), "workspace_guard");
        assertTrue(calls.getFirst().contains("duration_nanos DESC NULLS LAST"));
        assertTrue(calls.getFirst().contains("trace_id ASC,span_id ASC LIMIT 20 OFFSET 40"));
        assertEquals(7, ((TraceAnalytics.SpanPage) result.data()).totalElements());
    }

    @Test
    void impossibleEmptyPageDoesNotMasqueradeAsReadyEvidence() {
        var result = GreptimeTraceAnalytics.query(sql -> sql.contains("LIMIT") ? List.of() : List.of(Map.of("total", 1)),
                scope("matched_spans"), options("spans"), "workspace_guard");
        assertEquals("unavailable", result.state());
        assertNull(result.data());
    }

    private TraceAnalytics.Scope scope(String population) {
        return new TraceAnalytics.Scope(new TraceAnalytics.Window(1000, 2000, true), "team-a", null, true,
                population, null, null, null, null, null, null, null, false, Map.of(), Map.of());
    }

    private TraceAnalytics.Options options(String shape) {
        return new TraceAnalytics.Options(shape, "serviceName", 20, 2, 0, 20, "newest");
    }
}
