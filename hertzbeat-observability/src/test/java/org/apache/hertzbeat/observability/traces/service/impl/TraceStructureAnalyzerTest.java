/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
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
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanNodeDto;
import org.junit.jupiter.api.Test;

class TraceStructureAnalyzerTest {

    @Test
    void groupsObservedShapeAndCountsOnlySourceBackedCrossServiceEdges() {
        var first = graph("trace-a", "1111222233334444", "5555666677778888");
        var second = graph("trace-b", "9999aaaabbbbcccc", "ddddeeeeffff0000");
        var orphan = span("trace-c", "abcdabcdabcdabcd", "missingmissing12", "cart", "SELECT cart_items", "error");
        var analysis = TraceStructureAnalyzer.analyze(List.of(first, second,
                new TraceStructureAnalyzer.TraceGraph("trace-c", List.of(orphan))), 1500, 5, false);

        assertEquals(3, analysis.matchedTraces());
        assertEquals(2, analysis.patterns().getFirst().traceCount());
        assertEquals(List.of("trace-a", "trace-b"), analysis.patterns().getFirst().traceIds());
        assertEquals(1, analysis.edges().size());
        var edge = analysis.edges().getFirst();
        assertEquals("checkout", edge.sourceService());
        assertEquals("cart", edge.targetService());
        assertEquals(2, edge.spanCount());
        assertEquals(2, edge.traceCount());
        assertEquals("trace-a", edge.exampleTraceId());
        assertFalse(analysis.truncated());
    }

    @Test
    void missingSpanIdentityCannotBecomeAnInferredRootEdge() {
        var analysis = TraceStructureAnalyzer.analyze(List.of(new TraceStructureAnalyzer.TraceGraph("trace-x", List.of(
                span("trace-x", null, null, "checkout", "root", "ok"),
                span("trace-x", "2222222222222222", null, "cart", "child", "ok"),
                span("trace-x", "1111111111111111", null, "checkout", "root", "ok"),
                span("trace-x", null, "1111111111111111", "cart", "child", "ok")))), 1500, 4, false);
        assertEquals(0, analysis.edges().size());
    }

    private static TraceStructureAnalyzer.TraceGraph graph(String traceId, String rootId, String childId) {
        return new TraceStructureAnalyzer.TraceGraph(traceId, List.of(
                span(traceId, rootId, null, "checkout", "POST /checkout", "ok"),
                span(traceId, childId, rootId, "cart", "SELECT cart_items", "error")));
    }

    private static TraceSpanNodeDto span(String traceId, String id, String parentId, String service,
                                         String operation, String status) {
        var span = new TraceSpanNodeDto();
        span.setTraceId(traceId);
        span.setSpanId(id);
        span.setParentSpanId(parentId);
        span.setServiceName(service);
        span.setSpanName(operation);
        span.setStatus(status);
        span.setResourceAttributes(Map.of());
        span.setSpanAttributes(Map.of());
        return span;
    }
}
