/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.service.entity;

import java.util.List;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.dto.entity.EntityOpsSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffsInfo;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffsRequest;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.gateway.EntityObservabilityGateway;
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;
import org.springframework.stereotype.Service;

/**
 * Builds response handoff read models for entity detail without owning signal-specific routing rules.
 */
@Service
public class EntityResponseHandoffReadModelService {

    private final EntityObservabilityGateway entityObservabilityGateway;

    public EntityResponseHandoffReadModelService(EntityObservabilityGateway entityObservabilityGateway) {
        this.entityObservabilityGateway = entityObservabilityGateway;
    }

    public EntityResponseHandoffsInfo buildResponseHandoffs(long entityId,
                                                            ObservedEntityContext entityContext,
                                                            List<SingleAlert> activeAlerts,
                                                            List<Monitor> monitors,
                                                            EntityLogSummaryInfo logSummary,
                                                            EntityTraceSummaryDto traceSummary,
                                                            List<MetricEvidence> metricEvidence,
                                                            List<LogEvidence> logEvidence,
                                                            List<TraceEvidence> traceEvidence,
                                                            List<EntityTraceQueryHintDto> traceQueryHints,
                                                            EntityOpsSummaryInfo opsSummary) {
        return entityObservabilityGateway.buildEntityResponseHandoffs(new EntityResponseHandoffsRequest(
                "/entities/" + entityId,
                entityObservabilityGateway.buildEntityReturnLabel(entityContext),
                entityContext == null || entityContext.getEntity() == null ? null : entityContext.getEntity().getOwner(),
                entityContext == null || entityContext.getEntity() == null ? null : entityContext.getEntity().getSystem(),
                entityContext == null || entityContext.getEntity() == null
                        ? null : entityContext.getEntity().getEnvironment(),
                entityContext == null || entityContext.getEntity() == null ? null : entityContext.getEntity().getSource(),
                entityContext,
                activeAlerts,
                monitors,
                logSummary,
                traceSummary,
                metricEvidence,
                logEvidence,
                traceEvidence,
                traceQueryHints,
                opsSummary != null && opsSummary.isOwnerReady(),
                opsSummary != null && opsSummary.isRunbookReady(),
                opsSummary != null && opsSummary.isRelationReady(),
                opsSummary != null && opsSummary.isTelemetryReady()
        ));
    }
}
