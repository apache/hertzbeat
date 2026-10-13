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

package org.apache.hertzbeat.common.observability.gateway;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.dto.binding.TelemetryIdentitySnapshot;
import org.apache.hertzbeat.common.observability.dto.entity.EntityEvidenceSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityMonitorSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityTriageRecommendation;
import org.apache.hertzbeat.common.observability.dto.entity.EntityUnifiedEvidenceSummary;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogQueryHint;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.metrics.MetricCorrelationHint;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.model.CodeNavigationHint;
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;

/**
 * Shared gateway for telemetry-derived evidence and triage read models.
 */
public interface TelemetryEvidenceGateway extends ObservabilitySignalIntakeGateway {

    List<MetricEvidence> buildMetricEvidence(ObservedEntityContext entityContext, EntityStatusInfo statusInfo, List<Monitor> monitors);

    List<LogEvidence> buildLogEvidence(ObservedEntityContext entityContext, EntityLogSummaryInfo logSummary,
                                       List<EntityLogQueryHint> logQueryHints);

    EntityTraceSummaryDto buildTraceSummary(ObservedEntityContext entityContext);

    List<EntityTraceQueryHintDto> buildTraceQueryHints(ObservedEntityContext entityContext);

    List<TraceEvidence> buildTraceEvidence(ObservedEntityContext entityContext, EntityTraceSummaryDto traceSummary,
                                           List<EntityTraceQueryHintDto> traceQueryHints);

    EntityUnifiedEvidenceSummary buildUnifiedEvidenceSummary(EntityEvidenceSummaryInfo evidenceSummary,
                                                             EntityMonitorSummaryInfo monitorSummary,
                                                             EntityLogSummaryInfo logSummary,
                                                             EntityTraceSummaryDto traceSummary,
                                                             List<MetricEvidence> metricEvidence,
                                                             List<LogEvidence> logEvidence,
                                                             List<TraceEvidence> traceEvidence);

    EntityTriageRecommendation buildTriageRecommendation(EntityEvidenceSummaryInfo evidenceSummary,
                                                         EntityMonitorSummaryInfo monitorSummary,
                                                         EntityLogSummaryInfo logSummary,
                                                         EntityTraceSummaryDto traceSummary,
                                                         List<MetricEvidence> metricEvidence,
                                                         List<LogEvidence> logEvidence,
                                                         List<TraceEvidence> traceEvidence);

    MetricCorrelationHint buildMetricCorrelationHint(ObservedEntityContext entityContext,
                                                     TelemetryIdentitySnapshot identitySnapshot,
                                                     Long observedAt,
                                                     String metricName);

    CodeNavigationHint buildCodeNavigationHint(ObservedEntityContext entityContext,
                                               Map<String, String> resourceAttributes,
                                               Map<String, String> signalAttributes,
                                               List<String> fallbackSearchTerms,
                                               String fallbackTitle);
}
