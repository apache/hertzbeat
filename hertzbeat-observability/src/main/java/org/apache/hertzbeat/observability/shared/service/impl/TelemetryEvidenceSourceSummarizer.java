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

package org.apache.hertzbeat.observability.shared.service.impl;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.binding.TelemetrySource;
import org.apache.hertzbeat.common.observability.dto.entity.EntityEvidenceSourceSummary;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.springframework.util.CollectionUtils;

/**
 * Aggregates unified evidence counts and recency by source.
 */
final class TelemetryEvidenceSourceSummarizer {

    private TelemetryEvidenceSourceSummarizer() {
    }

    static List<EntityEvidenceSourceSummary> summarize(
            List<MetricEvidence> metricEvidence,
            List<LogEvidence> logEvidence,
            List<TraceEvidence> traceEvidence) {
        Map<TelemetrySource, EvidenceSourceAccumulator> accumulators = new EnumMap<>(TelemetrySource.class);
        accumulateMetrics(accumulators, metricEvidence);
        accumulateLogs(accumulators, logEvidence);
        accumulateTraces(accumulators, traceEvidence);
        return accumulators.entrySet().stream()
                .map(entry -> entry.getValue().toSummary(entry.getKey()))
                .toList();
    }

    private static void accumulateMetrics(Map<TelemetrySource, EvidenceSourceAccumulator> accumulators,
                                          List<MetricEvidence> evidence) {
        if (CollectionUtils.isEmpty(evidence)) {
            return;
        }
        for (MetricEvidence item : evidence) {
            if (item != null) {
                EvidenceSourceAccumulator accumulator = accumulatorFor(accumulators, item.getSource());
                if (accumulator != null) {
                    accumulator.addMetric(item.getObservedAt());
                }
            }
        }
    }

    private static void accumulateLogs(Map<TelemetrySource, EvidenceSourceAccumulator> accumulators,
                                       List<LogEvidence> evidence) {
        if (CollectionUtils.isEmpty(evidence)) {
            return;
        }
        for (LogEvidence item : evidence) {
            if (item != null) {
                EvidenceSourceAccumulator accumulator = accumulatorFor(accumulators, item.getSource());
                if (accumulator != null) {
                    accumulator.addLog(item.getObservedAt());
                }
            }
        }
    }

    private static void accumulateTraces(Map<TelemetrySource, EvidenceSourceAccumulator> accumulators,
                                         List<TraceEvidence> evidence) {
        if (CollectionUtils.isEmpty(evidence)) {
            return;
        }
        for (TraceEvidence item : evidence) {
            if (item != null) {
                EvidenceSourceAccumulator accumulator = accumulatorFor(accumulators, item.getSource());
                if (accumulator != null) {
                    accumulator.addTrace(item.getObservedAt());
                }
            }
        }
    }

    private static EvidenceSourceAccumulator accumulatorFor(
            Map<TelemetrySource, EvidenceSourceAccumulator> accumulators, String source) {
        TelemetrySource telemetrySource = TelemetrySource.fromValueOrNull(source);
        if (telemetrySource == null) {
            return null;
        }
        return accumulators.computeIfAbsent(telemetrySource, ignored -> new EvidenceSourceAccumulator());
    }

    private static final class EvidenceSourceAccumulator {

        private long metricEvidenceCount;
        private long logEvidenceCount;
        private long traceEvidenceCount;
        private Long latestObservedAt;

        private void addMetric(Long observedAt) {
            metricEvidenceCount++;
            observe(observedAt);
        }

        private void addLog(Long observedAt) {
            logEvidenceCount++;
            observe(observedAt);
        }

        private void addTrace(Long observedAt) {
            traceEvidenceCount++;
            observe(observedAt);
        }

        private void observe(Long observedAt) {
            if (observedAt != null && (latestObservedAt == null || observedAt > latestObservedAt)) {
                latestObservedAt = observedAt;
            }
        }

        private EntityEvidenceSourceSummary toSummary(TelemetrySource source) {
            return new EntityEvidenceSourceSummary(
                    source, metricEvidenceCount, logEvidenceCount, traceEvidenceCount, latestObservedAt);
        }
    }
}
