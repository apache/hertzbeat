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

import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.springframework.stereotype.Service;

/**
 * Loads the legacy entity detail DTO through a workspace-aware read boundary.
 */
@Service
public class EntityDetailReadModelService {

    private final EntityIdentityReadModelService entityIdentityReadModelService;
    private final EntityMonitorBindService entityMonitorBindService;
    private final EntityRelationService entityRelationService;
    private final EntityWorkspaceAccessService entityWorkspaceAccessService;

    public EntityDetailReadModelService(EntityIdentityReadModelService entityIdentityReadModelService,
                                        EntityMonitorBindService entityMonitorBindService,
                                        EntityRelationService entityRelationService,
                                        EntityWorkspaceAccessService entityWorkspaceAccessService) {
        this.entityIdentityReadModelService = entityIdentityReadModelService;
        this.entityMonitorBindService = entityMonitorBindService;
        this.entityRelationService = entityRelationService;
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
    }

    public EntityDto loadEntityDto(long entityId) {
        return buildEntityDto(entityId, entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(entityId));
    }

    public EntityDto loadEntityDto(long entityId, int relationPreviewLimit) {
        return buildEntityDto(
                entityId,
                entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(entityId),
                relationPreviewLimit);
    }

    public EntityDto loadEntityDto(long entityId, String requestWorkspaceId) {
        return buildEntityDto(entityId, entityWorkspaceAccessService.findAccessibleEntityById(
                entityId, requestWorkspaceId));
    }

    public EntityDto loadEntityDto(long entityId, String requestWorkspaceId, int relationPreviewLimit) {
        return buildEntityDto(
                entityId,
                entityWorkspaceAccessService.findAccessibleEntityById(entityId, requestWorkspaceId),
                relationPreviewLimit);
    }

    public long countEntityRelations(long entityId) {
        return entityRelationService.countEntityRelations(entityId);
    }

    private EntityDto buildEntityDto(long entityId, Optional<ObserveEntity> optional) {
        return buildEntityDto(entityId, optional, null);
    }

    private EntityDto buildEntityDto(long entityId, Optional<ObserveEntity> optional, Integer relationPreviewLimit) {
        if (optional.isEmpty()) {
            return null;
        }
        ObserveEntity entity = optional.get();
        EntityDto dto = new EntityDto();
        dto.setEntity(entity);
        dto.setIdentities(entityIdentityReadModelService.findIdentities(entityId));
        dto.setMonitorBinds(entityMonitorBindService.findMonitorBinds(entityId));
        dto.setRelations(relationPreviewLimit == null
                ? entityRelationService.findEntityRelations(entityId)
                : entityRelationService.findEntityRelations(entityId, relationPreviewLimit));
        return dto;
    }
}
