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

package org.apache.hertzbeat.observability.traces.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import java.util.List;
import org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics;
import org.junit.jupiter.api.Test;

class TraceAnalyticsAggregatorTest {
    @Test
    void populationsAndHalfOpenBucketsCountTheSameMatchingEvidence() {
        var window = new TraceAnalytics.Window(1000, 2000, true);
        var rows = List.of(span("a", "1", "checkout", "1000000000", "OK"),
                span("a", "2", "payment", "1500000000", "ERROR"), span("b", "3", "checkout", "1999999999", "OK"));
        var traces = TraceAnalyticsAggregator.histogram(rows, window, "matched_traces", false, 2);
        var spans = TraceAnalyticsAggregator.histogram(rows, window, "matched_spans", false, 2);
        assertEquals(2, traces.totalCount());
        assertEquals(3, spans.totalCount());
        assertEquals(1, traces.buckets().getFirst().count());
        assertEquals(2, spans.buckets().getLast().count());
        var groups = TraceAnalyticsAggregator.facets(rows, "matched_traces", false, "serviceName", 20);
        assertEquals(2, groups.totalCount());
        assertEquals(3, groups.values().stream().mapToLong(TraceAnalytics.Value::count).sum());
        assertEquals("multiple", groups.membership());
    }

    @Test
    void traceErrorQualificationKeepsItsNonErrorMatchingMembers() {
        var rows = List.of(span("a", "1", "checkout", "1000000000", "OK"),
                span("a", "2", "payment", "1500000000", "ERROR"), span("b", "3", "other", "1900000000", "OK"));
        var traces = TraceAnalyticsAggregator.facets(rows, "matched_traces", true, "serviceName", 20);
        var spans = TraceAnalyticsAggregator.facets(rows, "matched_spans", true, "serviceName", 20);
        assertEquals(1, traces.totalCount());
        assertEquals(List.of("checkout", "payment"), traces.values().stream().map(TraceAnalytics.Value::value).toList());
        assertEquals(List.of("payment"), spans.values().stream().map(TraceAnalytics.Value::value).toList());
    }

    @Test
    void missingEmptyAndUnknownRemainDifferentAndNullSortsLast() {
        var rows = List.of(span("a", "1", null, "1000000000", "OK"),
                span("b", "2", "", "1500000000", "ERROR"), span("c", "3", "unknown", "1900000000", "OK"));
        var facets = TraceAnalyticsAggregator.facets(rows, "matched_spans", false, "serviceName", 20);
        assertEquals(1, facets.missingCount());
        assertEquals(List.of("", "unknown"), facets.values().stream().map(TraceAnalytics.Value::value).toList());
        var groups = TraceAnalyticsAggregator.groups(rows, "matched_spans", false, "serviceName", 20, "count-desc");
        assertEquals(null, groups.groups().getLast().value());
    }

    @Test
    void spanOrderingPrecedesPaginationAndUnknownDurationIsLast() {
        var rows = List.of(span("b", "2", "checkout", "1000000000", "OK"),
                new TraceAnalytics.SpanRow("a", "1", null, "checkout", null, null, null, null, "OK", "1900000000", null),
                span("c", "3", "payment", "1800000000", "ERROR"));
        var page = TraceAnalyticsAggregator.spans(rows, false, 1, 1, "duration_desc");
        assertEquals(3, page.totalElements());
        assertEquals("b", page.content().getFirst().traceId());
        assertEquals("a", TraceAnalyticsAggregator.spans(rows, false, 2, 1, "duration_desc").content().getFirst().traceId());
    }

    private TraceAnalytics.SpanRow span(String trace, String span, String service, String start, String status) {
        return new TraceAnalytics.SpanRow(trace, span, null, service, "shop", "prod", "GET /checkout", "SERVER", status, start, "1000000");
    }
}
