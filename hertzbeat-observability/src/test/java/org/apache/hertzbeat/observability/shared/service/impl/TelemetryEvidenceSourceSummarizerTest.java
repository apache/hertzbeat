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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.observability.dto.binding.TelemetryIdentitySnapshot;
import org.apache.hertzbeat.common.observability.dto.binding.TelemetrySource;
import org.apache.hertzbeat.common.observability.dto.entity.EntityEvidenceSourceSummary;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.junit.jupiter.api.Test;

class TelemetryEvidenceSourceSummarizerTest {

    @Test
    void summarizeCountsEachTypedSignalAndKeepsLatestObservationBySource() {
        MetricEvidence monitorMetric = new MetricEvidence();
        monitorMetric.setSource(TelemetryIdentitySnapshot.SOURCE_MONITOR);
        monitorMetric.setObservedAt(100L);
        MetricEvidence otlpMetric = new MetricEvidence();
        otlpMetric.setSource(TelemetryIdentitySnapshot.SOURCE_OTLP);
        otlpMetric.setObservedAt(200L);
        LogEvidence otlpLog = new LogEvidence();
        otlpLog.setSource(TelemetryIdentitySnapshot.SOURCE_OTLP);
        otlpLog.setObservedAt(400L);
        TraceEvidence otlpTrace = new TraceEvidence();
        otlpTrace.setSource(TelemetryIdentitySnapshot.SOURCE_OTLP);
        otlpTrace.setObservedAt(300L);

        Map<TelemetrySource, EntityEvidenceSourceSummary> summaries =
                TelemetryEvidenceSourceSummarizer.summarize(
                                List.of(monitorMetric, otlpMetric), List.of(otlpLog), List.of(otlpTrace))
                        .stream()
                        .collect(Collectors.toMap(EntityEvidenceSourceSummary::getSource, summary -> summary));

        EntityEvidenceSourceSummary monitor = summaries.get(TelemetrySource.MONITOR);
        assertEquals(1L, monitor.getMetricEvidenceCount());
        assertEquals(0L, monitor.getLogEvidenceCount());
        assertEquals(0L, monitor.getTraceEvidenceCount());
        assertEquals(Long.valueOf(100L), monitor.getLatestObservedAt());
        EntityEvidenceSourceSummary otlp = summaries.get(TelemetrySource.OTLP);
        assertEquals(1L, otlp.getMetricEvidenceCount());
        assertEquals(1L, otlp.getLogEvidenceCount());
        assertEquals(1L, otlp.getTraceEvidenceCount());
        assertEquals(Long.valueOf(400L), otlp.getLatestObservedAt());
    }

    @Test
    void summarizeReturnsNoSourcesWithoutSupportedEvidence() {
        MetricEvidence unknownMetric = new MetricEvidence();
        unknownMetric.setSource("unknown");

        assertTrue(TelemetryEvidenceSourceSummarizer.summarize(
                List.of(unknownMetric), null, null).isEmpty());
    }
}
