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

package org.apache.hertzbeat.common.observability.dto.investigation;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.apache.hertzbeat.common.observability.model.CodeNavigationHint;
import org.apache.hertzbeat.common.observability.dto.trace.TraceRepresentativeSpanDto;

/** Bounded multi-signal investigation view for one exact trace. */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record TraceInvestigationView(String traceId,
                                     String selectedSpanId,
                                     InvestigationWindow window,
                                     GanttBlock gantt,
                                     LogsBlock sameTraceLogs,
                                     RedBlock red,
                                     MetricsBlock metrics,
                                     DependenciesBlock dependencies) {

    public TraceInvestigationView {
        requireText(traceId, "traceId");
        Objects.requireNonNull(window, "window");
        Objects.requireNonNull(gantt, "gantt");
        Objects.requireNonNull(sameTraceLogs, "sameTraceLogs");
        Objects.requireNonNull(red, "red");
        Objects.requireNonNull(metrics, "metrics");
        Objects.requireNonNull(dependencies, "dependencies");
    }

    /** Valid observed Gantt evidence, including incomplete forests. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record GanttBlock(InvestigationEvidenceState state,
                             InvestigationReason reason,
                             InvestigationSource source,
                             TraceDetail detail) {

        public GanttBlock {
            validateBlock(state, reason, source, InvestigationSource.GREPTIME_TRACES);
            if ((state == InvestigationEvidenceState.READY) != (detail != null)) {
                throw new IllegalArgumentException("Only ready Gantt evidence may carry trace detail");
            }
        }

        public static GanttBlock ready(TraceDetail detail) {
            return new GanttBlock(InvestigationEvidenceState.READY, InvestigationReason.OBSERVED,
                    InvestigationSource.GREPTIME_TRACES, Objects.requireNonNull(detail, "detail"));
        }

        public static GanttBlock empty() {
            return empty(InvestigationReason.NO_DATA);
        }

        public static GanttBlock empty(InvestigationReason reason) {
            return new GanttBlock(InvestigationEvidenceState.EMPTY, reason,
                    InvestigationSource.GREPTIME_TRACES, null);
        }

        public static GanttBlock unavailable(InvestigationReason reason) {
            return new GanttBlock(InvestigationEvidenceState.UNAVAILABLE, reason,
                    InvestigationSource.GREPTIME_TRACES, null);
        }
    }

    /** Bounded logs carrying the selected trace ID. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record LogsBlock(InvestigationEvidenceState state,
                            InvestigationReason reason,
                            InvestigationSource source,
                            boolean truncated,
                            List<InvestigationLogRecord> logs) {

        public LogsBlock {
            validateBlock(state, reason, source, InvestigationSource.GREPTIME_LOGS);
            logs = immutable(logs);
            validateListEvidence(state, logs, "same-trace logs");
            if (state != InvestigationEvidenceState.READY && truncated) {
                throw new IllegalArgumentException("Non-ready logs cannot be truncated");
            }
        }

        public static LogsBlock ready(List<InvestigationLogRecord> logs, boolean truncated) {
            return new LogsBlock(InvestigationEvidenceState.READY, InvestigationReason.OBSERVED,
                    InvestigationSource.GREPTIME_LOGS, truncated, logs);
        }

        public static LogsBlock empty() {
            return new LogsBlock(InvestigationEvidenceState.EMPTY, InvestigationReason.NO_DATA,
                    InvestigationSource.GREPTIME_LOGS, false, List.of());
        }

        public static LogsBlock unavailable(InvestigationReason reason) {
            return new LogsBlock(InvestigationEvidenceState.UNAVAILABLE, reason,
                    InvestigationSource.GREPTIME_LOGS, false, List.of());
        }
    }

    /** Flow-owned RED evidence for the selected service identity. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record RedBlock(InvestigationEvidenceState state,
                           InvestigationReason reason,
                           InvestigationSource source,
                           int resolutionSeconds,
                           InvestigationServiceIdentity identity,
                           RedSummary summary,
                           List<RedPoint> series) {

        private static final int RESOLUTION_SECONDS = 60;

        public RedBlock {
            validateBlock(state, reason, source, InvestigationSource.GREPTIME_FLOW);
            series = immutable(series);
            if (resolutionSeconds != RESOLUTION_SECONDS) {
                throw new IllegalArgumentException("RED resolution is invalid");
            }
            boolean hasEvidence = summary != null && !series.isEmpty();
            if ((state == InvestigationEvidenceState.READY) != hasEvidence) {
                throw new IllegalArgumentException("Ready RED evidence requires summary and series");
            }
            if (state != InvestigationEvidenceState.READY && (summary != null || !series.isEmpty())) {
                throw new IllegalArgumentException("Non-ready RED evidence cannot carry values");
            }
        }

        public static RedBlock ready(InvestigationServiceIdentity identity,
                                     RedSummary summary,
                                     List<RedPoint> series) {
            return new RedBlock(InvestigationEvidenceState.READY, InvestigationReason.OBSERVED,
                    InvestigationSource.GREPTIME_FLOW, RESOLUTION_SECONDS, identity, summary, series);
        }

        public static RedBlock empty(InvestigationServiceIdentity identity) {
            return new RedBlock(InvestigationEvidenceState.EMPTY, InvestigationReason.NO_DATA,
                    InvestigationSource.GREPTIME_FLOW, RESOLUTION_SECONDS, identity, null, List.of());
        }

        public static RedBlock unavailable(InvestigationReason reason, InvestigationServiceIdentity identity) {
            return new RedBlock(InvestigationEvidenceState.UNAVAILABLE, reason,
                    InvestigationSource.GREPTIME_FLOW, RESOLUTION_SECONDS, identity, null, List.of());
        }
    }

    /** Persistent OTLP metric series for the selected service. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record MetricsBlock(InvestigationEvidenceState state,
                               InvestigationReason reason,
                               InvestigationSource source,
                               boolean truncated,
                               List<MetricSeries> series) {

        public MetricsBlock {
            validateBlock(state, reason, source, InvestigationSource.OTLP_METRICS);
            series = immutable(series);
            validateListEvidence(state, series, "metrics");
            if (state != InvestigationEvidenceState.READY && truncated) {
                throw new IllegalArgumentException("Non-ready metrics cannot be truncated");
            }
        }

        public static MetricsBlock ready(List<MetricSeries> series, boolean truncated) {
            return new MetricsBlock(InvestigationEvidenceState.READY, InvestigationReason.OBSERVED,
                    InvestigationSource.OTLP_METRICS, truncated, series);
        }

        public static MetricsBlock empty() {
            return new MetricsBlock(InvestigationEvidenceState.EMPTY, InvestigationReason.NO_DATA,
                    InvestigationSource.OTLP_METRICS, false, List.of());
        }

        public static MetricsBlock unavailable(InvestigationReason reason) {
            return new MetricsBlock(InvestigationEvidenceState.UNAVAILABLE, reason,
                    InvestigationSource.OTLP_METRICS, false, List.of());
        }
    }

    /** Cross-service edges derived only from the complete selected trace. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record DependenciesBlock(InvestigationEvidenceState state,
                                    InvestigationReason reason,
                                    InvestigationSource source,
                                    boolean truncated,
                                    List<DependencyEdge> edges) {

        public DependenciesBlock {
            validateBlock(state, reason, source, InvestigationSource.GREPTIME_TRACES);
            edges = immutable(edges);
            validateListEvidence(state, edges, "dependencies");
            if (state != InvestigationEvidenceState.READY && truncated) {
                throw new IllegalArgumentException("Non-ready dependencies cannot be truncated");
            }
        }

        public static DependenciesBlock ready(List<DependencyEdge> edges, boolean truncated) {
            return new DependenciesBlock(InvestigationEvidenceState.READY, InvestigationReason.OBSERVED,
                    InvestigationSource.GREPTIME_TRACES, truncated, edges);
        }

        public static DependenciesBlock empty() {
            return new DependenciesBlock(InvestigationEvidenceState.EMPTY, InvestigationReason.NO_DATA,
                    InvestigationSource.GREPTIME_TRACES, false, List.of());
        }

        public static DependenciesBlock unavailable(InvestigationReason reason) {
            return new DependenciesBlock(InvestigationEvidenceState.UNAVAILABLE, reason,
                    InvestigationSource.GREPTIME_TRACES, false, List.of());
        }
    }

    /** Validated observed trace detail; root metadata is authoritative only for a unique root. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record TraceDetail(String rootSpanId,
                              String serviceName,
                              String serviceNamespace,
                              String deploymentEnvironment,
                              String entityId,
                              String entityType,
                              String rootSpanName,
                              String durationNanos,
                              String status,
                              Long startTime,
                              int errorSpanCount,
                              Map<String, String> resourceAttributes,
                              List<Span> spans,
                              String rootState,
                              long rootSpanCount,
                              TraceRepresentativeSpanDto representativeSpan,
                              long observedStartTime,
                              long observedEndTime,
                              int missingParentCount,
                              boolean partial) {

        public TraceDetail {
            String expectedState = rootSpanCount == 0 ? "missing" : rootSpanCount == 1 ? "unique" : "ambiguous";
            if (rootSpanCount < 0 || !expectedState.equals(rootState)) {
                throw new IllegalArgumentException("Trace root evidence is inconsistent");
            }
            if (rootSpanCount == 1) {
                requireText(rootSpanId, "rootSpanId");
                requireText(status, "status");
                validateNonNegativeDecimal(durationNanos, "durationNanos");
                if (startTime == null || startTime < 0L) {
                    throw new IllegalArgumentException("Root start time is invalid");
                }
            } else if (rootSpanId != null || serviceName != null || serviceNamespace != null
                    || deploymentEnvironment != null || entityId != null || entityType != null
                    || rootSpanName != null || durationNanos != null || status != null || startTime != null) {
                throw new IllegalArgumentException("Non-unique roots cannot carry root metadata");
            }
            if (errorSpanCount < 0 || missingParentCount < 0 || observedStartTime < 0L
                    || observedEndTime < observedStartTime || observedEndTime > 9_007_199_254_740_991L) {
                throw new IllegalArgumentException("Trace detail numeric value is invalid");
            }
            Objects.requireNonNull(representativeSpan, "representativeSpan");
            if (rootSpanCount != 1 && resourceAttributes != null) {
                throw new IllegalArgumentException("Non-unique roots cannot carry resource attributes");
            }
            resourceAttributes = rootSpanCount == 1 ? immutable(resourceAttributes) : null;
            spans = immutable(spans);
            if (spans.isEmpty()) {
                throw new IllegalArgumentException("Trace detail requires spans");
            }
        }
    }

    /** One validated span in the selected trace. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record Span(String spanId,
                       String parentSpanId,
                       String spanName,
                       String serviceName,
                       String serviceNamespace,
                       String deploymentEnvironment,
                       String entityId,
                       String entityType,
                       String status,
                       String statusMessage,
                       String spanKind,
                       String traceState,
                       String scopeName,
                       String scopeVersion,
                       String durationNanos,
                       long startTime,
                       String startTimeUnixNano,
                       boolean highlighted,
                       Map<String, String> resourceAttributes,
                       Map<String, String> spanAttributes,
                       List<SpanEvent> events,
                       List<SpanLink> links,
                       CodeNavigationHint codeNavigationHint) {

        public Span {
            requireText(spanId, "spanId");
            requireText(status, "status");
            validateNonNegativeDecimal(durationNanos, "durationNanos");
            validateNonNegativeDecimal(startTimeUnixNano, "startTimeUnixNano");
            if (startTime < 0L || startTime > 9_007_199_254_740_991L) {
                throw new IllegalArgumentException("Span numeric value is invalid");
            }
            if (Long.parseLong(startTimeUnixNano) / 1_000_000L != startTime) {
                throw new IllegalArgumentException("Span timestamps must describe the same instant");
            }
            resourceAttributes = immutable(resourceAttributes);
            spanAttributes = immutable(spanAttributes);
            events = immutable(events);
            links = immutable(links);
        }
    }

    /** Bounded span event preserving its lossless epoch-nanosecond timestamp. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record SpanEvent(String timeUnixNano,
                            String name,
                            Map<String, String> attributes,
                            Integer droppedAttributesCount) {
        public SpanEvent {
            if (timeUnixNano == null || !timeUnixNano.matches("[1-9][0-9]*")) {
                throw new IllegalArgumentException("Span event timestamp is invalid");
            }
            attributes = immutable(attributes);
            if (droppedAttributesCount != null && droppedAttributesCount < 0) {
                throw new IllegalArgumentException("Dropped event attributes count is invalid");
            }
        }
    }

    /** Bounded link to another trace and span. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record SpanLink(String traceId,
                           String spanId,
                           String traceState,
                           Map<String, String> attributes,
                           Integer droppedAttributesCount) {
        public SpanLink {
            requireText(traceId, "linked traceId");
            requireText(spanId, "linked spanId");
            attributes = immutable(attributes);
            if (droppedAttributesCount != null && droppedAttributesCount < 0) {
                throw new IllegalArgumentException("Dropped link attributes count is invalid");
            }
        }
    }

    /** RED values aggregated over the exact requested window. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record RedSummary(long requestCount,
                             long errorCount,
                             double requestRatePerSecond,
                             double errorRate,
                             Double latencyAverageMs,
                             Double latencyP95Ms) {
    }

    /** One Flow-owned minute bucket. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record RedPoint(long timestamp,
                           long requestCount,
                           long errorCount,
                           double requestRatePerSecond,
                           double errorRate,
                           Double latencyAverageMs,
                           Double latencyP95Ms) {
    }

    /** One bounded persistent OTLP metric series. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record MetricSeries(String metricName,
                               String unit,
                               Map<String, String> labels,
                               List<MetricPoint> points) {

        public MetricSeries {
            requireText(metricName, "metricName");
            labels = immutable(labels);
            points = immutable(points);
            if (points.isEmpty()) {
                throw new IllegalArgumentException("Metric series requires points");
            }
        }
    }

    /** One finite metric sample. */
    public record MetricPoint(long timestamp, double value) {
        public MetricPoint {
            if (timestamp <= 0L || !Double.isFinite(value)) {
                throw new IllegalArgumentException("Metric point is invalid");
            }
        }
    }

    /** One cross-service parent-child edge from the complete trace. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record DependencyEdge(String sourceServiceName,
                                 String targetServiceName,
                                 String sourceEntityId,
                                 String targetEntityId,
                                 String spanId,
                                 String status,
                                 double durationMillis) {

        public DependencyEdge {
            requireText(sourceServiceName, "sourceServiceName");
            requireText(targetServiceName, "targetServiceName");
            requireText(spanId, "spanId");
            requireText(status, "status");
            if (!Double.isFinite(durationMillis) || durationMillis < 0D) {
                throw new IllegalArgumentException("Dependency duration is invalid");
            }
        }
    }

    private static void validateBlock(InvestigationEvidenceState state,
                                      InvestigationReason reason,
                                      InvestigationSource source,
                                      InvestigationSource expectedSource) {
        InvestigationEvidenceState.validate(state, reason);
        if (source != expectedSource) {
            throw new IllegalArgumentException("Investigation source is invalid");
        }
    }

    private static void validateListEvidence(InvestigationEvidenceState state, List<?> values, String label) {
        if ((state == InvestigationEvidenceState.READY) == values.isEmpty()) {
            throw new IllegalArgumentException("Ready " + label + " evidence requires values");
        }
    }

    private static void requireText(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(label + " is required");
        }
    }

    private static void validateNonNegativeDecimal(String value, String label) {
        if (value == null || !value.matches("0|[1-9][0-9]*")) {
            throw new IllegalArgumentException(label + " must be a non-negative decimal string");
        }
        try {
            Long.parseLong(value);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(label + " exceeds the supported range", exception);
        }
    }

    private static <T> List<T> immutable(List<T> values) {
        return values == null ? List.of() : List.copyOf(values);
    }

    private static <K, V> Map<K, V> immutable(Map<K, V> values) {
        return values == null ? Map.of() : Map.copyOf(values);
    }
}
