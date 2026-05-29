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

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.apache.hertzbeat.common.entity.manager.EntityDefinitionActivity;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.entity.EntityEvidenceSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityNextActionInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityOpsSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;
import org.apache.hertzbeat.common.observability.gateway.EntityObservabilityGateway;
import org.apache.hertzbeat.manager.pojo.dto.EntityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntitySummaryInfo;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Builds entity list summary read models from persisted catalog and runtime evidence.
 */
@Service
public class EntitySummaryReadModelService {

    private final EntityActivityReadModelService entityActivityReadModelService;
    private final EntityIdentityReadModelService entityIdentityReadModelService;
    private final EntityMonitorBindService entityMonitorBindService;
    private final EntityRelationService entityRelationService;
    private final EntityObservabilityGateway entityObservabilityGateway;

    public EntitySummaryReadModelService(EntityActivityReadModelService entityActivityReadModelService,
                                         EntityIdentityReadModelService entityIdentityReadModelService,
                                         EntityMonitorBindService entityMonitorBindService,
                                         EntityRelationService entityRelationService,
                                         EntityObservabilityGateway entityObservabilityGateway) {
        this.entityActivityReadModelService = entityActivityReadModelService;
        this.entityIdentityReadModelService = entityIdentityReadModelService;
        this.entityMonitorBindService = entityMonitorBindService;
        this.entityRelationService = entityRelationService;
        this.entityObservabilityGateway = entityObservabilityGateway;
    }

    public EntitySummaryInfo buildEntitySummary(ObserveEntity entity,
                                                EntityDefinitionActivity latestDefinitionActivity,
                                                EntityStatusInfo statusInfo,
                                                List<Monitor> monitors) {
        List<Monitor> safeMonitors = CollectionUtils.isEmpty(monitors) ? Collections.emptyList() : monitors;
        long monitorBindCount = entityMonitorBindService.countMonitorBinds(entity.getId());
        long identityCount = entityIdentityReadModelService.countIdentities(entity.getId());
        long relationCount = entityRelationService.countEntityRelations(entity.getId());
        EntityEvidenceSummaryInfo evidenceSummary = entityObservabilityGateway.buildEntityEvidenceSummary(
                entity,
                statusInfo,
                identityCount,
                0,
                safeMonitors,
                Collections.emptyList()
        );
        EntityOpsSummaryInfo opsSummary = entityObservabilityGateway.buildEntityOpsSummary(
                entity, relationCount, evidenceSummary
        );
        EntityNextActionInfo nextAction = entityObservabilityGateway.buildEntityNextActions(
                entity, evidenceSummary, null, opsSummary
        ).stream().findFirst().orElse(null);
        return new EntitySummaryInfo(
                EntityInfo.fromEntity(entity),
                identityCount,
                monitorBindCount,
                relationCount,
                statusInfo.getActiveAlertCount(),
                statusInfo,
                opsSummary,
                nextAction,
                evidenceSummary.getLastEvidenceAt(),
                latestDefinitionActivity != null,
                latestDefinitionActivity == null ? null : latestDefinitionActivity.getStatus(),
                latestDefinitionActivity == null ? null : latestDefinitionActivity.getSummary(),
                latestDefinitionActivity == null ? null : latestDefinitionActivity.getFormat(),
                latestDefinitionActivity == null ? null : latestDefinitionActivity.getGmtCreate()
        );
    }

    public Map<Long, EntityDefinitionActivity> loadLatestDefinitionActivities(List<ObserveEntity> entities) {
        if (CollectionUtils.isEmpty(entities)) {
            return Collections.emptyMap();
        }
        List<Long> entityIds = entities.stream()
                .map(ObserveEntity::getId)
                .filter(Objects::nonNull)
                .toList();
        if (CollectionUtils.isEmpty(entityIds)) {
            return Collections.emptyMap();
        }
        return entityActivityReadModelService.findLatestDefinitionActivities(entityIds);
    }
}
