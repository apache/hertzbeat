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
import java.math.BigInteger;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

/** Strict, bounded and workspace-derived investigation view for one persisted alert. */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record AlertInvestigationView(long alertId,
                                     Window window,
                                     AlertHeader alert,
                                     IdentityBlock identity,
                                     MetricsBlock metrics,
                                     LogsBlock logs,
                                     TracesBlock traces,
                                     TopologyBlock topology,
                                     CollectionBlock collection) {

    public static final int MAX_LOGS = 100;
    public static final int MAX_TRACES = 50;
    public static final int MAX_TOPOLOGY_EDGES = 100;
    private static final Pattern TRACE_ID = Pattern.compile("[0-9a-f]{32}");
    private static final Pattern DECIMAL = Pattern.compile("(?:0|[1-9][0-9]*)");
    private static final BigInteger LONG_MAX = BigInteger.valueOf(Long.MAX_VALUE);

    public AlertInvestigationView {
        if (alertId <= 0L) {
            throw new IllegalArgumentException("alertId must be positive");
        }
        window = Objects.requireNonNull(window, "window");
        alert = Objects.requireNonNull(alert, "alert");
        identity = Objects.requireNonNull(identity, "identity");
        metrics = Objects.requireNonNull(metrics, "metrics");
        logs = Objects.requireNonNull(logs, "logs");
        traces = Objects.requireNonNull(traces, "traces");
        topology = Objects.requireNonNull(topology, "topology");
        collection = Objects.requireNonNull(collection, "collection");
    }

    /** Exact start-inclusive/end-exclusive window and persisted alert anchor. */
    public record Window(long start, long end, long anchor) {
        public Window {
            new InvestigationWindow(start, end);
            if (anchor < start || anchor >= end) {
                throw new IllegalArgumentException("alert anchor must be inside the requested window");
            }
        }
    }

    /** Bounded persisted alert header, without derived or guessed values. */
    public record AlertHeader(String name,
                              String status,
                              String severity,
                              String summary,
                              String content,
                              Map<String, String> labels,
                              Map<String, String> annotations) {
        public AlertHeader {
            name = bounded(name, 256, "name");
            status = bounded(status, 64, "status");
            severity = bounded(severity, 64, "severity");
            summary = bounded(summary, 1_024, "summary");
            content = bounded(content, 4_096, "content");
            labels = boundedMap(labels, 1_024, "labels");
            annotations = boundedMap(annotations, 4_096, "annotations");
        }
    }

    /** Exact persisted correlation labels accepted from the alert. */
    public record AlertIdentity(String serviceName,
                                String serviceNamespace,
                                String deploymentEnvironment,
                                Long entityId,
                                String entityType,
                                Long monitorId,
                                String metricName,
                                String metricQuery) {
        public AlertIdentity {
            serviceName = bounded(serviceName, 256, "serviceName");
            serviceNamespace = bounded(serviceNamespace, 256, "serviceNamespace");
            deploymentEnvironment = bounded(deploymentEnvironment, 128, "deploymentEnvironment");
            entityType = bounded(entityType, 64, "entityType");
            metricName = bounded(metricName, 256, "metricName");
            metricQuery = bounded(metricQuery, 4_096, "metricQuery");
            positive(entityId, "entityId");
            positive(monitorId, "monitorId");
            if (serviceName == null && entityId == null && monitorId == null && metricName == null
                    && metricQuery == null) {
                throw new IllegalArgumentException("alert identity has no exact persisted evidence");
            }
        }
    }

    /** Availability and exact persisted alert identity. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record IdentityBlock(InvestigationEvidenceState state,
                                InvestigationReason reason,
                                InvestigationSource source,
                                AlertIdentity identity) {
        public IdentityBlock {
            validateState(state, reason, source, InvestigationSource.PERSISTED_ALERT);
            if ((state == InvestigationEvidenceState.READY) != (identity != null)) {
                throw new IllegalArgumentException("only ready identity evidence may carry identity");
            }
        }

        public static IdentityBlock ready(AlertIdentity identity) {
            return new IdentityBlock(InvestigationEvidenceState.READY, InvestigationReason.OBSERVED,
                    InvestigationSource.PERSISTED_ALERT, Objects.requireNonNull(identity));
        }

        public static IdentityBlock unavailable() {
            return unavailable(InvestigationReason.IDENTITY_UNAVAILABLE);
        }

        public static IdentityBlock unavailable(InvestigationReason reason) {
            return new IdentityBlock(InvestigationEvidenceState.UNAVAILABLE,
                    reason, InvestigationSource.PERSISTED_ALERT, null);
        }
    }

    /** Bounded metric evidence, when a safe persisted query strategy exists. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record MetricsBlock(InvestigationEvidenceState state,
                               InvestigationReason reason,
                               InvestigationSource source,
                               List<MetricSeries> series,
                               boolean truncated) {
        public MetricsBlock {
            validateListBlock(state, reason, source, InvestigationSource.OTLP_METRICS, series, truncated, 20);
            series = immutable(series);
        }

        public static MetricsBlock unavailable(InvestigationReason reason) {
            return new MetricsBlock(InvestigationEvidenceState.UNAVAILABLE, reason,
                    InvestigationSource.OTLP_METRICS, List.of(), false);
        }
    }

    /** One bounded metric series. */
    public record MetricSeries(String name, Map<String, String> labels, List<MetricPoint> points) {
        public MetricSeries {
            name = required(name, 256, "metric series name");
            labels = boundedMap(labels, 1_024, "metric labels");
            points = immutable(points);
            if (points.isEmpty() || points.size() > 1_440) {
                throw new IllegalArgumentException("metric points violate the bound");
            }
        }
    }

    /** One finite metric sample. */
    public record MetricPoint(long timestamp, double value) {
        public MetricPoint {
            if (timestamp <= 0L || !Double.isFinite(value)) {
                throw new IllegalArgumentException("metric point is invalid");
            }
        }
    }

    /** Bounded logs correlated through the exact persisted alert identity. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record LogsBlock(InvestigationEvidenceState state,
                            InvestigationReason reason,
                            InvestigationSource source,
                            List<InvestigationLogRecord> records,
                            boolean truncated) {
        public LogsBlock {
            validateListBlock(state, reason, source, InvestigationSource.GREPTIME_LOGS,
                    records, truncated, MAX_LOGS);
            records = immutable(records);
        }

        public static LogsBlock ready(List<InvestigationLogRecord> records) {
            return ready(records, false);
        }

        public static LogsBlock ready(List<InvestigationLogRecord> records, boolean truncated) {
            return new LogsBlock(InvestigationEvidenceState.READY, InvestigationReason.OBSERVED,
                    InvestigationSource.GREPTIME_LOGS, records, truncated);
        }

        public static LogsBlock empty() {
            return new LogsBlock(InvestigationEvidenceState.EMPTY, InvestigationReason.NO_DATA,
                    InvestigationSource.GREPTIME_LOGS, List.of(), false);
        }

        public static LogsBlock unavailable(InvestigationReason reason) {
            return new LogsBlock(InvestigationEvidenceState.UNAVAILABLE, reason,
                    InvestigationSource.GREPTIME_LOGS, List.of(), false);
        }
    }

    /** Bounded trace summaries correlated through the exact persisted alert identity. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record TracesBlock(InvestigationEvidenceState state,
                              InvestigationReason reason,
                              InvestigationSource source,
                              List<TraceSummary> traces,
                              boolean truncated) {
        public TracesBlock {
            validateListBlock(state, reason, source, InvestigationSource.GREPTIME_TRACES,
                    traces, truncated, MAX_TRACES);
            traces = immutable(traces);
        }

        public static TracesBlock ready(List<TraceSummary> traces) {
            return ready(traces, false);
        }

        public static TracesBlock ready(List<TraceSummary> traces, boolean truncated) {
            return new TracesBlock(InvestigationEvidenceState.READY, InvestigationReason.OBSERVED,
                    InvestigationSource.GREPTIME_TRACES, traces, truncated);
        }

        public static TracesBlock empty() {
            return new TracesBlock(InvestigationEvidenceState.EMPTY, InvestigationReason.NO_DATA,
                    InvestigationSource.GREPTIME_TRACES, List.of(), false);
        }

        public static TracesBlock unavailable(InvestigationReason reason) {
            return new TracesBlock(InvestigationEvidenceState.UNAVAILABLE, reason,
                    InvestigationSource.GREPTIME_TRACES, List.of(), false);
        }
    }

    /** Minimal trace summary for an alert investigation table. */
    public record TraceSummary(String traceId,
                               String startTimeUnixNano,
                               String durationNanos,
                               TraceStatus status,
                               int spanCount,
                               String serviceName) {
        public TraceSummary {
            if (traceId == null || !TRACE_ID.matcher(traceId).matches()) {
                throw new IllegalArgumentException("traceId is invalid");
            }
            decimal(startTimeUnixNano, true, "startTimeUnixNano");
            decimal(durationNanos, false, "durationNanos");
            status = Objects.requireNonNull(status, "status");
            if (spanCount <= 0 || spanCount > 5_000) {
                throw new IllegalArgumentException("spanCount is invalid");
            }
            serviceName = required(serviceName, 256, "serviceName");
        }
    }

    /** Honest aggregate trace status. */
    public enum TraceStatus {
        ERROR("error"), OK("ok"), UNSET("unset"), UNKNOWN("unknown");

        private final String code;

        TraceStatus(String code) {
            this.code = code;
        }

        @com.fasterxml.jackson.annotation.JsonValue
        public String code() {
            return code;
        }
    }

    /** Bounded semantic topology evidence. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record TopologyBlock(InvestigationEvidenceState state,
                                InvestigationReason reason,
                                InvestigationSource source,
                                List<TopologyEdge> edges,
                                boolean truncated) {
        public TopologyBlock {
            validateListBlock(state, reason, source, InvestigationSource.GREPTIME_SEMANTIC_GRAPH,
                    edges, truncated, MAX_TOPOLOGY_EDGES);
            edges = immutable(edges);
        }

        public static TopologyBlock ready(List<TopologyEdge> edges) {
            return new TopologyBlock(InvestigationEvidenceState.READY, InvestigationReason.OBSERVED,
                    InvestigationSource.GREPTIME_SEMANTIC_GRAPH, edges, false);
        }

        public static TopologyBlock empty() {
            return new TopologyBlock(InvestigationEvidenceState.EMPTY, InvestigationReason.NO_DATA,
                    InvestigationSource.GREPTIME_SEMANTIC_GRAPH, List.of(), false);
        }

        public static TopologyBlock unavailable(InvestigationReason reason) {
            return new TopologyBlock(InvestigationEvidenceState.UNAVAILABLE, reason,
                    InvestigationSource.GREPTIME_SEMANTIC_GRAPH, List.of(), false);
        }
    }

    /** One semantic topology edge. */
    public record TopologyEdge(long observedAt,
                               String sourceType,
                               String sourceId,
                               String targetType,
                               String targetId,
                               String relationType,
                               String provenance,
                               double confidence,
                               long requestCount,
                               long errorCount) {
        public TopologyEdge {
            if (observedAt <= 0L || requestCount < 0L || errorCount < 0L || errorCount > requestCount
                    || !Double.isFinite(confidence) || confidence < 0D || confidence > 1D) {
                throw new IllegalArgumentException("topology evidence numeric value is invalid");
            }
            sourceType = required(sourceType, 64, "sourceType");
            sourceId = required(sourceId, 512, "sourceId");
            targetType = required(targetType, 64, "targetType");
            targetId = required(targetId, 512, "targetId");
            relationType = required(relationType, 64, "relationType");
            provenance = required(provenance, 64, "provenance");
        }
    }

    /** Latest native collection evidence for an exact persisted Monitor identity. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record CollectionBlock(InvestigationEvidenceState state,
                                  InvestigationReason reason,
                                  InvestigationSource source,
                                  CollectionEvent event) {
        public CollectionBlock {
            validateState(state, reason, source, InvestigationSource.GREPTIME_COLLECTION_EVENTS);
            if ((state == InvestigationEvidenceState.READY) != (event != null)) {
                throw new IllegalArgumentException("only ready collection evidence may carry an event");
            }
        }

        public static CollectionBlock ready(CollectionEvent event) {
            return new CollectionBlock(InvestigationEvidenceState.READY, InvestigationReason.OBSERVED,
                    InvestigationSource.GREPTIME_COLLECTION_EVENTS, Objects.requireNonNull(event));
        }

        public static CollectionBlock empty() {
            return new CollectionBlock(InvestigationEvidenceState.EMPTY, InvestigationReason.NO_DATA,
                    InvestigationSource.GREPTIME_COLLECTION_EVENTS, null);
        }

        public static CollectionBlock unavailable(InvestigationReason reason) {
            return new CollectionBlock(InvestigationEvidenceState.UNAVAILABLE, reason,
                    InvestigationSource.GREPTIME_COLLECTION_EVENTS, null);
        }
    }

    /** Strictly typed native collection event. */
    public record CollectionEvent(long observedAt,
                                  long durationMillis,
                                  String outcome,
                                  String collectorId,
                                  String target,
                                  String metricSet,
                                  String failureClass,
                                  String phase,
                                  int fieldCount,
                                  int rowCount) {
        public CollectionEvent {
            if (observedAt <= 0L || durationMillis < -1L || fieldCount < 0 || rowCount < 0) {
                throw new IllegalArgumentException("collection event numeric value is invalid");
            }
            outcome = required(outcome, 32, "outcome");
            collectorId = bounded(collectorId, 128, "collectorId");
            target = bounded(target, 512, "target");
            metricSet = bounded(metricSet, 192, "metricSet");
            failureClass = bounded(failureClass, 32, "failureClass");
            phase = bounded(phase, 32, "phase");
        }
    }

    private static void validateState(InvestigationEvidenceState state,
                                      InvestigationReason reason,
                                      InvestigationSource source,
                                      InvestigationSource expectedSource) {
        InvestigationEvidenceState.validate(state, reason);
        if (source != expectedSource) {
            throw new IllegalArgumentException("evidence source is invalid");
        }
    }

    private static void validateListBlock(InvestigationEvidenceState state,
                                          InvestigationReason reason,
                                          InvestigationSource source,
                                          InvestigationSource expectedSource,
                                          List<?> values,
                                          boolean truncated,
                                          int maximum) {
        validateState(state, reason, source, expectedSource);
        int size = values == null ? 0 : values.size();
        if (size > maximum || state == InvestigationEvidenceState.READY && size == 0
                || state != InvestigationEvidenceState.READY && (size != 0 || truncated)
                || truncated && state != InvestigationEvidenceState.READY) {
            throw new IllegalArgumentException("evidence list contradicts its state or bound");
        }
    }

    private static <T> List<T> immutable(List<T> values) {
        return values == null ? List.of() : List.copyOf(values);
    }

    private static Map<String, String> boundedMap(Map<String, String> values, int valueLimit, String label) {
        if (values == null || values.isEmpty()) {
            return Map.of();
        }
        if (values.size() > 64) {
            throw new IllegalArgumentException(label + " exceeds its entry bound");
        }
        values.forEach((key, value) -> {
            if (key == null || key.isBlank() || key.length() > 128 || hasControl(key)
                    || value == null || value.length() > valueLimit || hasControl(value)) {
                throw new IllegalArgumentException(label + " contains an invalid value");
            }
        });
        return Map.copyOf(values);
    }

    private static String required(String value, int maximum, String label) {
        String normalized = bounded(value, maximum, label);
        if (normalized == null) {
            throw new IllegalArgumentException(label + " is required");
        }
        return normalized;
    }

    private static String bounded(String value, int maximum, String label) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.length() > maximum || hasControl(normalized)) {
            throw new IllegalArgumentException(label + " is invalid");
        }
        return normalized;
    }

    private static boolean hasControl(String value) {
        return value.codePoints().anyMatch(Character::isISOControl);
    }

    private static void positive(Long value, String label) {
        if (value != null && value <= 0L) {
            throw new IllegalArgumentException(label + " must be positive");
        }
    }

    private static void decimal(String value, boolean positive, String label) {
        if (value == null || !DECIMAL.matcher(value).matches()) {
            throw new IllegalArgumentException(label + " is invalid");
        }
        BigInteger parsed = new BigInteger(value);
        if (parsed.compareTo(LONG_MAX) > 0 || positive && parsed.signum() <= 0) {
            throw new IllegalArgumentException(label + " is invalid");
        }
    }
}
