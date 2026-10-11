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

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanNodeDto;
import org.apache.hertzbeat.observability.traces.dto.TraceStructureAnalysis;
import org.springframework.util.StringUtils;

/** Groups observed span shapes and cross-service parent edges without inferring missing relationships. */
final class TraceStructureAnalyzer {

    private static final int DISPLAY_LIMIT = 50;
    private static final int MEMBER_LIMIT = 20;

    private TraceStructureAnalyzer() { }

    record TraceGraph(String traceId, List<TraceSpanNodeDto> spans) { }

    static TraceStructureAnalysis analyze(List<TraceGraph> graphs, int rowLimit, int scannedRows, boolean truncated) {
        Map<List<TraceStructureAnalysis.SpanShape>, List<String>> patterns = new LinkedHashMap<>();
        Map<ServicePair, EdgeCount> edges = new LinkedHashMap<>();
        for (TraceGraph graph : graphs) {
            Map<String, TraceSpanNodeDto> observed = new HashMap<>();
            for (TraceSpanNodeDto span : graph.spans()) {
                if (StringUtils.hasText(span.getSpanId())) observed.put(span.getSpanId(), span);
            }
            List<TraceStructureAnalysis.SpanShape> shape = new ArrayList<>();
            for (TraceSpanNodeDto span : graph.spans()) {
                TraceSpanNodeDto parent = StringUtils.hasText(span.getParentSpanId())
                        ? observed.get(span.getParentSpanId()) : null;
                shape.add(new TraceStructureAnalysis.SpanShape(span.getServiceName(), span.getSpanName(),
                        span.getStatus(), parent == null ? null : parent.getServiceName(),
                        parent == null ? null : parent.getSpanName(),
                        StringUtils.hasText(span.getParentSpanId()) && parent == null));
                if (parent != null && StringUtils.hasText(span.getSpanId())
                        && StringUtils.hasText(parent.getServiceName())
                        && StringUtils.hasText(span.getServiceName())
                        && !parent.getServiceName().equals(span.getServiceName())) {
                    ServicePair pair = new ServicePair(parent.getServiceName(), span.getServiceName());
                    edges.computeIfAbsent(pair, ignored -> new EdgeCount(graph.traceId(),
                            parent.getSpanId(), span.getSpanId())).add(graph.traceId());
                }
            }
            shape.sort(Comparator.comparing(TraceStructureAnalysis.SpanShape::toString));
            patterns.computeIfAbsent(List.copyOf(shape), ignored -> new ArrayList<>()).add(graph.traceId());
        }
        List<TraceStructureAnalysis.Pattern> sortedPatterns = patterns.entrySet().stream()
                .sorted(Comparator.<Map.Entry<List<TraceStructureAnalysis.SpanShape>, List<String>>>comparingInt(
                        entry -> entry.getValue().size()).reversed().thenComparing(entry -> entry.getKey().toString()))
                .map(entry -> new TraceStructureAnalysis.Pattern(entry.getKey(), entry.getValue().size(),
                        List.copyOf(entry.getValue().subList(0, Math.min(MEMBER_LIMIT, entry.getValue().size()))),
                        entry.getValue().size() > MEMBER_LIMIT))
                .toList();
        List<TraceStructureAnalysis.FlowEdge> sortedEdges = edges.entrySet().stream()
                .sorted(Comparator.<Map.Entry<ServicePair, EdgeCount>>comparingInt(entry -> entry.getValue().spanCount)
                        .reversed().thenComparing(entry -> entry.getKey().toString()))
                .map(entry -> new TraceStructureAnalysis.FlowEdge(entry.getKey().source(), entry.getKey().target(),
                        entry.getValue().spanCount, entry.getValue().traceIds.size(), entry.getValue().exampleTraceId,
                        entry.getValue().exampleParentSpanId, entry.getValue().exampleChildSpanId))
                .toList();
        return new TraceStructureAnalysis(rowLimit, scannedRows, truncated, graphs.size(),
                sortedPatterns.subList(0, Math.min(DISPLAY_LIMIT, sortedPatterns.size())),
                sortedPatterns.size() > DISPLAY_LIMIT,
                sortedEdges.subList(0, Math.min(DISPLAY_LIMIT, sortedEdges.size())),
                sortedEdges.size() > DISPLAY_LIMIT);
    }

    private record ServicePair(String source, String target) { }

    private static final class EdgeCount {
        private final String exampleTraceId;
        private final String exampleParentSpanId;
        private final String exampleChildSpanId;
        private final Set<String> traceIds = new HashSet<>();
        private int spanCount;

        private EdgeCount(String traceId, String parentSpanId, String childSpanId) {
            this.exampleTraceId = traceId;
            this.exampleParentSpanId = parentSpanId;
            this.exampleChildSpanId = childSpanId;
        }

        private void add(String traceId) {
            spanCount++;
            traceIds.add(traceId);
        }
    }
}
