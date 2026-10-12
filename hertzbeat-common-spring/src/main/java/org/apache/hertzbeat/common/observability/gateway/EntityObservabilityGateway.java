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
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.entity.EntityAlertSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityEvidenceSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityMonitorSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityNextActionInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityObservabilityDetailBundle;
import org.apache.hertzbeat.common.observability.dto.entity.EntityOpsSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusPageSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffInfo;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffsRequest;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffsInfo;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogQueryHint;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;

/**
 * Entity-focused observability gateway that centralizes trace resolution and evidence.
 */
public interface EntityObservabilityGateway extends TelemetryEvidenceGateway {

    EntityTraceSummaryDto resolveEntityTraceSummary(ObservedEntityContext entityContext);

    List<EntityTraceQueryHintDto> resolveEntityTraceQueryHints(ObservedEntityContext entityContext);

    List<EntityLogQueryHint> buildEntityLogQueryHints(List<EntityIdentity> identities, List<Monitor> monitors);

    EntityLogSummaryInfo buildEntityLogSummary(List<EntityLogQueryHint> logQueryHints);

    EntityAlertSummaryInfo buildEntityAlertSummary(List<SingleAlert> activeAlerts);

    EntityMonitorSummaryInfo buildEntityMonitorSummary(List<Monitor> monitors);

    EntityEvidenceSummaryInfo buildEntityEvidenceSummary(ObserveEntity entity,
                                                         EntityStatusInfo statusInfo,
                                                         long identityCount,
                                                         int logHintCount,
                                                         List<Monitor> monitors,
                                                         List<SingleAlert> activeAlerts);

    EntityOpsSummaryInfo buildEntityOpsSummary(ObserveEntity entity,
                                               long relationCount,
                                               EntityEvidenceSummaryInfo evidenceSummary);

    List<EntityNextActionInfo> buildEntityNextActions(ObserveEntity entity,
                                                      EntityEvidenceSummaryInfo evidenceSummary,
                                                      EntityLogSummaryInfo logSummary,
                                                      EntityOpsSummaryInfo opsSummary);

    EntityStatusPageSummaryInfo buildEntityStatusPageSummary(ObserveEntity entity,
                                                             EntityOpsSummaryInfo opsSummary);

    String buildEntityReturnLabel(ObservedEntityContext entityContext);

    String buildEntityAlertSearchToken(ObservedEntityContext entityContext, List<SingleAlert> activeAlerts);

    EntityResponseHandoffInfo buildEntityAlertHandoff(String returnTo, String returnLabel,
                                                      ObservedEntityContext entityContext,
                                                      List<SingleAlert> activeAlerts);

    EntityResponseHandoffInfo buildEntityMonitorHandoff(String returnTo, String returnLabel,
                                                        List<Monitor> monitors,
                                                        String fallbackSearchToken,
                                                        MetricEvidence preferredMetricEvidence);

    EntityResponseHandoffInfo buildEntityLogHandoff(String returnTo, String returnLabel,
                                                    String logSearchToken,
                                                    List<SingleAlert> activeAlerts,
                                                    LogEvidence preferredLogEvidence,
                                                    EntityTraceSummaryDto traceSummary,
                                                    TraceEvidence preferredTraceEvidence,
                                                    List<EntityTraceQueryHintDto> traceQueryHints);

    EntityResponseHandoffInfo buildEntityTraceHandoff(String returnTo, String returnLabel,
                                                      String traceSearchToken,
                                                      EntityTraceSummaryDto traceSummary,
                                                      TraceEvidence preferredTraceEvidence);

    EntityResponseHandoffInfo buildEntityDiscoveryHandoff(String returnTo, String returnLabel,
                                                          String owner, String system,
                                                          String environment, String source,
                                                          String alertSearchToken, String logSearchToken,
                                                          String fallbackSearchToken);

    EntityResponseHandoffInfo buildEntityEditorHandoff(String returnTo, String returnLabel,
                                                       boolean ownerReady, boolean runbookReady,
                                                       boolean relationReady, boolean telemetryReady);

    EntityResponseHandoffsInfo buildEntityResponseHandoffs(EntityResponseHandoffsRequest request);

    String buildEntityLogSearchToken(ObservedEntityContext entityContext, EntityLogSummaryInfo logSummary);

    String buildEntityTraceSearchToken(ObservedEntityContext entityContext, EntityTraceSummaryDto traceSummary);

    EntityObservabilityDetailBundle resolveEntityDetailBundle(ObservedEntityContext entityContext,
                                                              EntityStatusInfo statusInfo,
                                                              EntityEvidenceSummaryInfo evidenceSummary,
                                                              EntityMonitorSummaryInfo monitorSummary,
                                                              EntityLogSummaryInfo logSummary,
                                                              List<Monitor> monitors,
                                                              List<EntityLogQueryHint> logQueryHints);

    List<EntityLogQueryHint> enrichEntityLogQueryHints(List<EntityLogQueryHint> originalHints,
                                                       List<org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence> logEvidence,
                                                       List<EntityTraceQueryHintDto> traceQueryHints);
}
