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
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.entity.EntityAlertSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityEvidenceSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityMonitorSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityNextActionInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityObservabilityDetailBundle;
import org.apache.hertzbeat.common.observability.dto.entity.EntityOpsSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntitySignalEvidenceBundle;
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

    static final int ENTITY_DETAIL_RELATION_PREVIEW_LIMIT = 50;
    static final int ENTITY_DETAIL_BOUND_MONITOR_PREVIEW_LIMIT = 50;

    private final EntityDetailReadModelService entityDetailReadModelService;
    private final EntityStatusRefreshService entityStatusRefreshService;
    private final EntityObservabilityGateway entityObservabilityGateway;
    private final EntityResponseHandoffReadModelService entityResponseHandoffReadModelService;
    private final EntityNoiseControlReadModelService entityNoiseControlReadModelService;
    private final EntityActivityReadModelService entityActivityReadModelService;
    private final EntityWorkspaceAccessService entityWorkspaceAccessService;

    public EntityDetailObservabilityReadModelService(EntityDetailReadModelService entityDetailReadModelService,
                                                     EntityStatusRefreshService entityStatusRefreshService,
                                                     EntityObservabilityGateway entityObservabilityGateway,
                                                     EntityResponseHandoffReadModelService entityResponseHandoffReadModelService,
                                                     EntityNoiseControlReadModelService entityNoiseControlReadModelService,
                                                     EntityActivityReadModelService entityActivityReadModelService,
                                                     EntityWorkspaceAccessService entityWorkspaceAccessService) {
        this.entityDetailReadModelService = entityDetailReadModelService;
        this.entityStatusRefreshService = entityStatusRefreshService;
        this.entityObservabilityGateway = entityObservabilityGateway;
        this.entityResponseHandoffReadModelService = entityResponseHandoffReadModelService;
        this.entityNoiseControlReadModelService = entityNoiseControlReadModelService;
        this.entityActivityReadModelService = entityActivityReadModelService;
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
    }

    public EntityDetailDto buildEntityDetail(long entityId) {
        EntityDto entityDto = entityDetailReadModelService.loadEntityDto(
                entityId, ENTITY_DETAIL_RELATION_PREVIEW_LIMIT);
        if (entityDto == null) {
            return null;
        }
        return buildEntityDetail(entityDto, null, true, entityDetailReadModelService.countEntityRelations(entityId));
    }

    public EntityDetailDto buildEntityDetail(EntityDto entityDto) {
        return buildEntityDetail(entityDto, null, true, null);
    }

    public EntityDetailDto buildEntityDetail(EntityDto entityDto, String requestWorkspaceId) {
        return buildEntityDetail(entityDto, requestWorkspaceId, false, null);
    }

    private EntityDetailDto buildEntityDetail(EntityDto entityDto,
                                              String requestWorkspaceId,
                                              boolean resolveRequestWorkspaceAtEvidenceBoundaries,
                                              Long relationCountOverride) {
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
        List<MonitorInfo> boundMonitors = monitors.stream()
                .limit(ENTITY_DETAIL_BOUND_MONITOR_PREVIEW_LIMIT)
                .map(MonitorInfo::fromEntity)
                .toList();
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
        EntitySignalEvidenceBundle signalEvidence = EntitySignalEvidenceBundle.from(observabilityDetail);
        logSummary = observabilityDetail.getLogSummary();
        logQueryHints = observabilityDetail.getLogQueryHints();
        EntityTraceSummaryDto traceSummary = observabilityDetail.getTraceSummary();
        List<EntityTraceQueryHintDto> traceQueryHints = observabilityDetail.getTraceQueryHints();
        List<MetricEvidence> metricEvidence = observabilityDetail.getMetricEvidence();
        List<LogEvidence> logEvidence = observabilityDetail.getLogEvidence();
        List<TraceEvidence> traceEvidence = observabilityDetail.getTraceEvidence();
        EntityUnifiedEvidenceSummary unifiedEvidenceSummary = observabilityDetail.getUnifiedEvidenceSummary();
        EntityTriageRecommendation triageRecommendation = observabilityDetail.getTriageRecommendation();
        long relationCount = relationCountOverride == null
                ? CollectionUtils.isEmpty(entityDto.getRelations()) ? 0 : entityDto.getRelations().size()
                : relationCountOverride;
        EntityOpsSummaryInfo opsSummary = entityObservabilityGateway.buildEntityOpsSummary(
                entityDto.getEntity(), relationCount, evidenceSummary);
        List<EntityNextActionInfo> nextActions =
                entityObservabilityGateway.buildEntityNextActions(
                        entityDto.getEntity(), evidenceSummary, logSummary, opsSummary);
        EntityStatusPageSummaryInfo statusPageSummary =
                entityObservabilityGateway.buildEntityStatusPageSummary(entity, opsSummary);
        EntityResponseHandoffsInfo responseHandoffs = entityResponseHandoffReadModelService.buildResponseHandoffs(
                entityId, entityContext, activeAlerts, monitors, signalEvidence, opsSummary);
        EntityDetailDto.EntityNoiseControlSummaryInfo noiseControlSummary =
                resolveRequestWorkspaceAtEvidenceBoundaries
                        ? entityNoiseControlReadModelService.buildNoiseControlSummary(entityDto, monitors, activeAlerts)
                        : entityNoiseControlReadModelService.buildNoiseControlSummary(
                                entityDto, monitors, activeAlerts, requestWorkspaceId);
        List<EntityDefinitionActivityInfo> definitionActivities =
                resolveRequestWorkspaceAtEvidenceBoundaries
                        ? entityActivityReadModelService.getDefinitionActivities(entityId, 12)
                        : entityActivityReadModelService.getDefinitionActivities(entityId, 12, requestWorkspaceId);
        List<EntityDetailDto.EntityTopologyNeighborInfo> topologyNeighbors = buildTopologyNeighbors(
                entityId, entityDto.getRelations(), requestWorkspaceId, resolveRequestWorkspaceAtEvidenceBoundaries);
        return new EntityDetailDto(entityDto, statusInfo, evidenceSummary, alertSummary, monitorSummary, logSummary,
                traceSummary, metricEvidence, logEvidence, traceEvidence, signalEvidence, unifiedEvidenceSummary,
                triageRecommendation, opsSummary, nextActions, statusPageSummary, responseHandoffs,
                noiseControlSummary, boundMonitors, activeAlerts, logQueryHints, traceQueryHints,
                topologyNeighbors, definitionActivities);
    }

    private List<EntityDetailDto.EntityTopologyNeighborInfo> buildTopologyNeighbors(
            Long entityId,
            List<EntityRelation> relations,
            String requestWorkspaceId,
            boolean resolveRequestWorkspaceAtEvidenceBoundaries) {
        if (entityId == null || CollectionUtils.isEmpty(relations)) {
            return List.of();
        }
        Set<Long> neighborIds = new LinkedHashSet<>();
        for (EntityRelation relation : relations) {
            Long neighborId = neighborEntityId(entityId, relation);
            if (neighborId != null) {
                neighborIds.add(neighborId);
            }
        }
        List<ObserveEntity> neighbors = resolveRequestWorkspaceAtEvidenceBoundaries
                ? entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(neighborIds)
                : entityWorkspaceAccessService.findAccessibleEntitiesByIds(neighborIds, requestWorkspaceId);
        Map<Long, ObserveEntity> neighborById = neighbors.stream()
                .collect(LinkedHashMap::new, (map, neighbor) -> map.put(neighbor.getId(), neighbor), Map::putAll);
        return relations.stream()
                .map(relation -> toTopologyNeighbor(entityId, relation, neighborById))
                .filter(Objects::nonNull)
                .toList();
    }

    private EntityDetailDto.EntityTopologyNeighborInfo toTopologyNeighbor(
            Long entityId,
            EntityRelation relation,
            Map<Long, ObserveEntity> neighborById) {
        if (relation == null) {
            return null;
        }
        Long neighborId = neighborEntityId(entityId, relation);
        ObserveEntity neighbor = neighborId == null ? null : neighborById.get(neighborId);
        String fallbackName = relation.getTargetRef() == null ? null : relation.getTargetRef().trim();
        String entityName = neighbor == null ? fallbackName : defaultText(neighbor.getDisplayName(), neighbor.getName());
        if (neighborId == null && entityName == null) {
            return null;
        }
        return new EntityDetailDto.EntityTopologyNeighborInfo(
                relation.getId(),
                neighborId,
                entityName,
                neighbor == null ? null : neighbor.getType(),
                relationDirection(entityId, relation),
                relation.getRelationType(),
                relation.getRelationSource(),
                relation.getStatus(),
                relation.getScore(),
                fallbackName
        );
    }

    private Long neighborEntityId(Long entityId, EntityRelation relation) {
        if (relation == null || entityId == null) {
            return null;
        }
        if (Objects.equals(entityId, relation.getSourceEntityId())) {
            return relation.getTargetEntityId();
        }
        if (Objects.equals(entityId, relation.getTargetEntityId())) {
            return relation.getSourceEntityId();
        }
        return null;
    }

    private String relationDirection(Long entityId, EntityRelation relation) {
        if (relation == null || entityId == null) {
            return "related";
        }
        if (Objects.equals(entityId, relation.getSourceEntityId())) {
            return "outgoing";
        }
        if (Objects.equals(entityId, relation.getTargetEntityId())) {
            return "incoming";
        }
        return "related";
    }

    private String defaultText(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
