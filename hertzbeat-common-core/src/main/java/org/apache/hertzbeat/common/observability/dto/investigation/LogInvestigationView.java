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
import java.util.Objects;

/** Bounded multi-signal investigation view for one exact persisted log record. */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record LogInvestigationView(String logRecordUid,
                                   InvestigationWindow window,
                                   SelectedLogBlock selectedLog,
                                   TraceBlock trace,
                                   MetricsBlock metrics,
                                   NearbyLogsBlock nearbyLogs) {

    public LogInvestigationView {
        if (logRecordUid == null || logRecordUid.isBlank()) {
            throw new IllegalArgumentException("logRecordUid is required");
        }
        Objects.requireNonNull(window, "window");
        Objects.requireNonNull(selectedLog, "selectedLog");
        Objects.requireNonNull(trace, "trace");
        Objects.requireNonNull(metrics, "metrics");
        Objects.requireNonNull(nearbyLogs, "nearbyLogs");
    }

    /** Exact selected persisted log evidence. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record SelectedLogBlock(InvestigationEvidenceState state,
                                   InvestigationReason reason,
                                   InvestigationSource source,
                                   InvestigationLogRecord log) {

        public SelectedLogBlock {
            validateBlock(state, reason, source, InvestigationSource.GREPTIME_LOGS);
            if ((state == InvestigationEvidenceState.READY) != (log != null)) {
                throw new IllegalArgumentException("Only ready selected-log evidence may carry a log");
            }
        }

        public static SelectedLogBlock ready(InvestigationLogRecord log) {
            return new SelectedLogBlock(InvestigationEvidenceState.READY, InvestigationReason.OBSERVED,
                    InvestigationSource.GREPTIME_LOGS, Objects.requireNonNull(log, "log"));
        }

        public static SelectedLogBlock empty() {
            return new SelectedLogBlock(InvestigationEvidenceState.EMPTY, InvestigationReason.NOT_FOUND,
                    InvestigationSource.GREPTIME_LOGS, null);
        }

        public static SelectedLogBlock unavailable(InvestigationReason reason) {
            return new SelectedLogBlock(InvestigationEvidenceState.UNAVAILABLE, reason,
                    InvestigationSource.GREPTIME_LOGS, null);
        }
    }

    /** Trace correlated by the selected persisted log. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record TraceBlock(InvestigationEvidenceState state,
                             InvestigationReason reason,
                             InvestigationSource source,
                             TraceInvestigationView.TraceDetail detail) {

        public TraceBlock {
            validateBlock(state, reason, source, InvestigationSource.GREPTIME_TRACES);
            if ((state == InvestigationEvidenceState.READY) != (detail != null)) {
                throw new IllegalArgumentException("Only ready trace evidence may carry detail");
            }
        }

        public static TraceBlock ready(TraceInvestigationView.TraceDetail detail) {
            return new TraceBlock(InvestigationEvidenceState.READY, InvestigationReason.OBSERVED,
                    InvestigationSource.GREPTIME_TRACES, Objects.requireNonNull(detail, "detail"));
        }

        public static TraceBlock empty(InvestigationReason reason) {
            return new TraceBlock(InvestigationEvidenceState.EMPTY, reason,
                    InvestigationSource.GREPTIME_TRACES, null);
        }

        public static TraceBlock unavailable(InvestigationReason reason) {
            return new TraceBlock(InvestigationEvidenceState.UNAVAILABLE, reason,
                    InvestigationSource.GREPTIME_TRACES, null);
        }
    }

    /** Persistent OTLP metrics for the selected log service. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record MetricsBlock(InvestigationEvidenceState state,
                               InvestigationReason reason,
                               InvestigationSource source,
                               boolean truncated,
                               List<TraceInvestigationView.MetricSeries> series) {

        public MetricsBlock {
            validateBlock(state, reason, source, InvestigationSource.OTLP_METRICS);
            series = series == null ? List.of() : List.copyOf(series);
            if ((state == InvestigationEvidenceState.READY) == series.isEmpty()) {
                throw new IllegalArgumentException("Ready metric evidence requires series");
            }
            if (state != InvestigationEvidenceState.READY && truncated) {
                throw new IllegalArgumentException("Non-ready metrics cannot be truncated");
            }
        }

        public static MetricsBlock ready(List<TraceInvestigationView.MetricSeries> series, boolean truncated) {
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

    /** Bounded logs immediately before and after the selected log. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record NearbyLogsBlock(InvestigationEvidenceState state,
                                  InvestigationReason reason,
                                  InvestigationSource source,
                                  boolean hasMoreBefore,
                                  boolean hasMoreAfter,
                                  List<InvestigationLogRecord> before,
                                  List<InvestigationLogRecord> after) {

        public NearbyLogsBlock {
            validateBlock(state, reason, source, InvestigationSource.GREPTIME_LOGS);
            before = before == null ? List.of() : List.copyOf(before);
            after = after == null ? List.of() : List.copyOf(after);
            boolean hasValues = !before.isEmpty() || !after.isEmpty();
            if ((state == InvestigationEvidenceState.READY) != hasValues) {
                throw new IllegalArgumentException("Ready nearby-log evidence requires rows");
            }
            if (state != InvestigationEvidenceState.READY && (hasMoreBefore || hasMoreAfter)) {
                throw new IllegalArgumentException("Non-ready nearby logs cannot have more rows");
            }
        }

        public static NearbyLogsBlock ready(List<InvestigationLogRecord> before,
                                            List<InvestigationLogRecord> after,
                                            boolean hasMoreBefore,
                                            boolean hasMoreAfter) {
            return new NearbyLogsBlock(InvestigationEvidenceState.READY, InvestigationReason.OBSERVED,
                    InvestigationSource.GREPTIME_LOGS, hasMoreBefore, hasMoreAfter, before, after);
        }

        public static NearbyLogsBlock empty() {
            return new NearbyLogsBlock(InvestigationEvidenceState.EMPTY, InvestigationReason.NO_DATA,
                    InvestigationSource.GREPTIME_LOGS, false, false, List.of(), List.of());
        }

        public static NearbyLogsBlock unavailable(InvestigationReason reason) {
            return new NearbyLogsBlock(InvestigationEvidenceState.UNAVAILABLE, reason,
                    InvestigationSource.GREPTIME_LOGS, false, false, List.of(), List.of());
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
}
