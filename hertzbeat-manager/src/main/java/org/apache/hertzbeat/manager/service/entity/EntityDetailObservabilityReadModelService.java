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
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.entity.EntityAlertSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityEvidenceSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityMonitorSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityNextActionInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityObservabilityDetailBundle;
import org.apache.hertzbeat.common.observability.dto.entity.EntityOpsSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusPageSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityTriageRecommendation;
import org.apache.hertzbeat.common.observability.dto.entity.EntityUnifiedEvidenceSummary;
import org.apache.hertzbeat.common.observability.dto.entity.MonitorInfo;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffsInfo;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogQueryHint;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.gateway.EntityObservabilityGateway;
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDetailDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Assembles the entity detail observability payload behind a dedicated read-model boundary.
 */
@Service
public class EntityDetailObservabilityReadModelService {

    private final EntityDetailReadModelService entityDetailReadModelService;
    private final EntityStatusRefreshService entityStatusRefreshService;
    private final EntityObservabilityGateway entityObservabilityGateway;
    private final EntityResponseHandoffReadModelService entityResponseHandoffReadModelService;
    private final EntityNoiseControlReadModelService entityNoiseControlReadModelService;
    private final EntityActivityReadModelService entityActivityReadModelService;

    public EntityDetailObservabilityReadModelService(EntityDetailReadModelService entityDetailReadModelService,
                                                     EntityStatusRefreshService entityStatusRefreshService,
                                                     EntityObservabilityGateway entityObservabilityGateway,
                                                     EntityResponseHandoffReadModelService entityResponseHandoffReadModelService,
                                                     EntityNoiseControlReadModelService entityNoiseControlReadModelService,
                                                     EntityActivityReadModelService entityActivityReadModelService) {
        this.entityDetailReadModelService = entityDetailReadModelService;
        this.entityStatusRefreshService = entityStatusRefreshService;
        this.entityObservabilityGateway = entityObservabilityGateway;
        this.entityResponseHandoffReadModelService = entityResponseHandoffReadModelService;
        this.entityNoiseControlReadModelService = entityNoiseControlReadModelService;
        this.entityActivityReadModelService = entityActivityReadModelService;
    }

    public EntityDetailDto buildEntityDetail(long entityId) {
        EntityDto entityDto = entityDetailReadModelService.loadEntityDto(entityId);
        if (entityDto == null) {
            return null;
        }
        return buildEntityDetail(entityDto);
    }

    public EntityDetailDto buildEntityDetail(EntityDto entityDto) {
        return buildEntityDetail(entityDto, null, true);
    }

    public EntityDetailDto buildEntityDetail(EntityDto entityDto, String requestWorkspaceId) {
        return buildEntityDetail(entityDto, requestWorkspaceId, false);
    }

    private EntityDetailDto buildEntityDetail(EntityDto entityDto,
                                              String requestWorkspaceId,
                                              boolean resolveRequestWorkspaceAtEvidenceBoundaries) {
        if (entityDto == null || entityDto.getEntity() == null) {
            return null;
        }
        ObserveEntity entity = entityDto.getEntity();
        Long entityId = entity.getId();
        if (entityId == null) {
            return null;
        }
        EntityStatusRefreshService.EntityRuntimeStatusEvidence runtimeEvidence =
                resolveRequestWorkspaceAtEvidenceBoundaries
                        ? entityStatusRefreshService.refreshEntityStatusWithEvidence(entity)
                        : entityStatusRefreshService.refreshEntityStatusWithEvidence(entity, requestWorkspaceId);
        List<Monitor> monitors = runtimeEvidence.monitors();
        List<SingleAlert> activeAlerts = runtimeEvidence.activeAlerts();
        EntityStatusInfo statusInfo = runtimeEvidence.statusInfo();
        entityDto.setEntity(entity);
        ObservedEntityContext entityContext = ObservedEntityContext.from(
                entityDto.getEntity(), entityDto.getIdentities(),
                entityDto.getEntityInfo() == null ? null : entityDto.getEntityInfo().getHertzbeat()
        );
        List<MonitorInfo> boundMonitors = monitors.stream().map(MonitorInfo::fromEntity).toList();
        List<EntityLogQueryHint> logQueryHints =
                entityObservabilityGateway.buildEntityLogQueryHints(entityDto.getIdentities(), monitors);
        EntityEvidenceSummaryInfo evidenceSummary = entityObservabilityGateway.buildEntityEvidenceSummary(
                entityDto.getEntity(),
                statusInfo,
                CollectionUtils.isEmpty(entityDto.getIdentities()) ? 0 : entityDto.getIdentities().size(),
                logQueryHints == null ? 0 : logQueryHints.size(),
                monitors,
                activeAlerts
        );
        EntityAlertSummaryInfo alertSummary = entityObservabilityGateway.buildEntityAlertSummary(activeAlerts);
        EntityMonitorSummaryInfo monitorSummary = entityObservabilityGateway.buildEntityMonitorSummary(monitors);
        EntityLogSummaryInfo logSummary = entityObservabilityGateway.buildEntityLogSummary(logQueryHints);
        EntityObservabilityDetailBundle observabilityDetail = entityObservabilityGateway.resolveEntityDetailBundle(
                entityContext, statusInfo, evidenceSummary, monitorSummary, logSummary, monitors, logQueryHints);
        logSummary = observabilityDetail.getLogSummary();
        logQueryHints = observabilityDetail.getLogQueryHints();
        EntityTraceSummaryDto traceSummary = observabilityDetail.getTraceSummary();
        List<EntityTraceQueryHintDto> traceQueryHints = observabilityDetail.getTraceQueryHints();
        List<MetricEvidence> metricEvidence = observabilityDetail.getMetricEvidence();
        List<LogEvidence> logEvidence = observabilityDetail.getLogEvidence();
        List<TraceEvidence> traceEvidence = observabilityDetail.getTraceEvidence();
        EntityUnifiedEvidenceSummary unifiedEvidenceSummary = observabilityDetail.getUnifiedEvidenceSummary();
        EntityTriageRecommendation triageRecommendation = observabilityDetail.getTriageRecommendation();
        long relationCount = CollectionUtils.isEmpty(entityDto.getRelations()) ? 0 : entityDto.getRelations().size();
        EntityOpsSummaryInfo opsSummary = entityObservabilityGateway.buildEntityOpsSummary(
                entityDto.getEntity(), relationCount, evidenceSummary);
        List<EntityNextActionInfo> nextActions =
                entityObservabilityGateway.buildEntityNextActions(
                        entityDto.getEntity(), evidenceSummary, logSummary, opsSummary);
        EntityStatusPageSummaryInfo statusPageSummary =
                entityObservabilityGateway.buildEntityStatusPageSummary(entity, opsSummary);
        EntityResponseHandoffsInfo responseHandoffs =
                entityResponseHandoffReadModelService.buildResponseHandoffs(
                        entityId, entityContext, activeAlerts, monitors, logSummary, traceSummary,
                        metricEvidence, logEvidence, traceEvidence, traceQueryHints, opsSummary);
        EntityDetailDto.EntityNoiseControlSummaryInfo noiseControlSummary =
                resolveRequestWorkspaceAtEvidenceBoundaries
                        ? entityNoiseControlReadModelService.buildNoiseControlSummary(entityDto, monitors, activeAlerts)
                        : entityNoiseControlReadModelService.buildNoiseControlSummary(
                                entityDto, monitors, activeAlerts, requestWorkspaceId);
        List<EntityDefinitionActivityInfo> definitionActivities =
                resolveRequestWorkspaceAtEvidenceBoundaries
                        ? entityActivityReadModelService.getDefinitionActivities(entityId, 12)
                        : entityActivityReadModelService.getDefinitionActivities(entityId, 12, requestWorkspaceId);
        return new EntityDetailDto(entityDto, statusInfo, evidenceSummary, alertSummary, monitorSummary, logSummary,
                traceSummary, metricEvidence, logEvidence, traceEvidence, unifiedEvidenceSummary,
                triageRecommendation, opsSummary, nextActions, statusPageSummary, responseHandoffs,
                noiseControlSummary, boundMonitors, activeAlerts, logQueryHints, traceQueryHints,
                definitionActivities);
    }
}
