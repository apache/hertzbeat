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
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.EntityDefinitionActivity;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntitySummaryInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.stereotype.Service;

/**
 * Reads and enriches entity catalog list pages from persisted catalog and runtime evidence.
 */
@Service
public class EntityListReadModelService {

    private final EntityCatalogQueryService entityCatalogQueryService;
    private final EntityStatusRefreshService entityStatusRefreshService;
    private final EntitySummaryReadModelService entitySummaryReadModelService;

    public EntityListReadModelService(EntityCatalogQueryService entityCatalogQueryService,
                                      EntityStatusRefreshService entityStatusRefreshService,
                                      EntitySummaryReadModelService entitySummaryReadModelService) {
        this.entityCatalogQueryService = entityCatalogQueryService;
        this.entityStatusRefreshService = entityStatusRefreshService;
        this.entitySummaryReadModelService = entitySummaryReadModelService;
    }

    public Page<EntitySummaryInfo> getEntities(List<Long> entityIds, String type, String status, String search,
                                               String owner, String source, String environment, String lifecycle,
                                               String tier, String system, String sort, String order,
                                               int pageIndex, int pageSize) {
        Page<ObserveEntity> entityPage = entityCatalogQueryService.findEntityPage(
                entityIds, type, status, search, owner, source, environment, lifecycle, tier, system,
                sort, order, pageIndex, pageSize);
        return buildEntitySummaryPage(entityPage, null, false);
    }

    public Page<EntitySummaryInfo> getEntities(List<Long> entityIds, String type, String status, String search,
                                               String owner, String source, String environment, String lifecycle,
                                               String tier, String system, String sort, String order,
                                               int pageIndex, int pageSize, String requestWorkspaceId) {
        Page<ObserveEntity> entityPage = entityCatalogQueryService.findEntityPage(
                entityIds, type, status, search, owner, source, environment, lifecycle, tier, system,
                sort, order, pageIndex, pageSize, requestWorkspaceId);
        return buildEntitySummaryPage(entityPage, requestWorkspaceId, true);
    }

    private Page<EntitySummaryInfo> buildEntitySummaryPage(Page<ObserveEntity> entityPage,
                                                           String requestWorkspaceId,
                                                           boolean explicitWorkspace) {
        List<ObserveEntity> scopedEntities = entityPage.getContent();
        Map<Long, EntityDefinitionActivity> latestActivityMap =
                entitySummaryReadModelService.loadLatestDefinitionActivities(scopedEntities);
        List<EntitySummaryInfo> summaries = scopedEntities.stream()
                .map(entity -> explicitWorkspace
                        ? buildSummary(entity, latestActivityMap.get(entity.getId()), requestWorkspaceId)
                        : buildSummary(entity, latestActivityMap.get(entity.getId())))
                .toList();
        return new PageImpl<>(summaries, entityPage.getPageable(), entityPage.getTotalElements());
    }

    private EntitySummaryInfo buildSummary(ObserveEntity entity,
                                           EntityDefinitionActivity latestActivity) {
        EntityStatusRefreshService.EntityRuntimeStatusEvidence runtimeEvidence =
                entityStatusRefreshService.refreshEntityStatusWithEvidence(entity);
        List<Monitor> monitors = runtimeEvidence.monitors();
        EntityStatusInfo statusInfo = runtimeEvidence.statusInfo();
        return entitySummaryReadModelService.buildEntitySummary(entity, latestActivity, statusInfo, monitors);
    }

    private EntitySummaryInfo buildSummary(ObserveEntity entity,
                                           EntityDefinitionActivity latestActivity,
                                           String requestWorkspaceId) {
        EntityStatusRefreshService.EntityRuntimeStatusEvidence runtimeEvidence =
                entityStatusRefreshService.refreshEntityStatusWithEvidence(entity, requestWorkspaceId);
        List<Monitor> monitors = runtimeEvidence.monitors();
        EntityStatusInfo statusInfo = runtimeEvidence.statusInfo();
        return entitySummaryReadModelService.buildEntitySummary(entity, latestActivity, statusInfo, monitors);
    }
}
