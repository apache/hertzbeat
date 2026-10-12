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

package org.apache.hertzbeat.observability.traces.dto;

import java.util.List;

/** Deterministic patterns and observed cross-service edges from one bounded structural population. */
public record TraceStructureAnalysis(int rowLimit, int scannedRows, boolean truncated, int matchedTraces,
                                     List<Pattern> patterns, boolean patternsTruncated,
                                     List<FlowEdge> edges, boolean edgesTruncated) {

    /** One observed span and its immediate parent label, if present in the scan. */
    public record SpanShape(String serviceName, String operationName, String status,
                            String parentServiceName, String parentOperationName, boolean missingParent) { }

    /** Exact members are capped for display; traceCount covers all members in the scan. */
    public record Pattern(List<SpanShape> shape, int traceCount, List<String> traceIds,
                          boolean traceIdsTruncated) { }

    /** Every counted edge is an observed parent-child relationship across distinct services. */
    public record FlowEdge(String sourceService, String targetService, int spanCount, int traceCount,
                           String exampleTraceId, String exampleParentSpanId, String exampleChildSpanId) { }
}
