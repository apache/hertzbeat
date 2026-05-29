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
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionRequest;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Coordinates entity write workflows while dedicated components own each write stage.
 */
@Service
public class EntityMutationWorkflowService {

    private static final String SOURCE_MANUAL = "manual";
    private static final String ACTIVITY_TYPE_DEFINITION_IMPORT = "definition_import";
    private static final String ACTIVITY_TYPE_DEFINITION_UPDATE = "definition_update";

    private final EntityCoreWriteModelService entityCoreWriteModelService;
    private final EntityIdentityWriteModelService entityIdentityWriteModelService;
    private final EntityMonitorBindService entityMonitorBindService;
    private final EntityRelationService entityRelationService;
    private final EntityStatusRefreshService entityStatusRefreshService;
    private final EntityActivityWriteModelService entityActivityWriteModelService;
    private final EntityDefinitionDraftService entityDefinitionDraftService;
    private final EntityValidationService entityValidationService;
    private final EntityWorkspaceAccessService entityWorkspaceAccessService;

    public EntityMutationWorkflowService(EntityCoreWriteModelService entityCoreWriteModelService,
                                         EntityIdentityWriteModelService entityIdentityWriteModelService,
                                         EntityMonitorBindService entityMonitorBindService,
                                         EntityRelationService entityRelationService,
                                         EntityStatusRefreshService entityStatusRefreshService,
                                         EntityActivityWriteModelService entityActivityWriteModelService,
                                         EntityDefinitionDraftService entityDefinitionDraftService,
                                         EntityValidationService entityValidationService,
                                         EntityWorkspaceAccessService entityWorkspaceAccessService) {
        this.entityCoreWriteModelService = entityCoreWriteModelService;
        this.entityIdentityWriteModelService = entityIdentityWriteModelService;
        this.entityMonitorBindService = entityMonitorBindService;
        this.entityRelationService = entityRelationService;
        this.entityStatusRefreshService = entityStatusRefreshService;
        this.entityActivityWriteModelService = entityActivityWriteModelService;
        this.entityDefinitionDraftService = entityDefinitionDraftService;
        this.entityValidationService = entityValidationService;
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
    }

    public long addEntity(EntityDto entityDto) {
        return addEntity(entityDto, true);
    }

    public void modifyEntity(EntityDto entityDto) {
        modifyEntity(entityDto, true);
    }

    public long addEntityByDefinition(EntityDefinitionRequest definitionRequest) {
        EntityDto entityDto = entityDefinitionDraftService.parseEntityDefinition(definitionRequest, null);
        entityValidationService.validate(entityDto, false);
        long entityId = addEntity(entityDto, false);
        entityActivityWriteModelService.recordDefinitionActivity(
                entityId,
                ACTIVITY_TYPE_DEFINITION_IMPORT,
                definitionRequest == null ? null : definitionRequest.getFormat(),
                entityDto.getEntity());
        return entityId;
    }

    public List<Long> addEntitiesByDefinitionBundle(EntityDefinitionRequest definitionRequest) {
        List<EntityDto> entityDtos = entityDefinitionDraftService.parseEntityDefinitionBundle(definitionRequest);
        if (CollectionUtils.isEmpty(entityDtos)) {
            return Collections.emptyList();
        }
        if (entityDtos.size() == 1) {
            EntityDto entityDto = entityDtos.getFirst();
            entityValidationService.validate(entityDto, false);
            return List.of(addEntity(entityDto));
        }
        for (EntityDto entityDto : entityDtos) {
            entityValidationService.validate(entityDto, false);
        }
        List<ObserveEntity> entities = entityCoreWriteModelService.createEntities(
                entityDtos.stream().map(EntityDto::getEntity).toList(), SOURCE_MANUAL);
        for (int index = 0; index < entities.size(); index++) {
            ObserveEntity entity = entities.get(index);
            EntityDto entityDto = entityDtos.get(index);
            entityIdentityWriteModelService.replaceIdentities(entity, entityDto.getIdentities());
            entityMonitorBindService.replaceMonitorBinds(entity.getId(), entityDto.getMonitorBinds());
        }
        for (int index = 0; index < entities.size(); index++) {
            ObserveEntity entity = entities.get(index);
            EntityDto entityDto = entityDtos.get(index);
            entityRelationService.replaceRelations(entity.getId(), entityDto.getRelations());
            entityStatusRefreshService.refreshEntityStatus(entity);
            entityActivityWriteModelService.recordDefinitionActivity(
                    entity.getId(),
                    ACTIVITY_TYPE_DEFINITION_IMPORT,
                    definitionRequest == null ? null : definitionRequest.getFormat(),
                    entity);
        }
        return entities.stream().map(ObserveEntity::getId).toList();
    }

    public void modifyEntityByDefinition(long entityId, EntityDefinitionRequest definitionRequest) {
        entityWorkspaceAccessService.requireAccessibleEntityForBoundWorkspace(entityId);
        try {
            EntityDto entityDto = entityDefinitionDraftService.parseEntityDefinition(definitionRequest, entityId);
            entityValidationService.validate(entityDto, true);
            modifyEntity(entityDto, false);
            entityActivityWriteModelService.recordDefinitionActivity(
                    entityId,
                    ACTIVITY_TYPE_DEFINITION_UPDATE,
                    definitionRequest == null ? null : definitionRequest.getFormat(),
                    entityDto.getEntity());
        } catch (RuntimeException ex) {
            entityActivityWriteModelService.recordDefinitionActivityFailure(
                    entityId,
                    ACTIVITY_TYPE_DEFINITION_UPDATE,
                    definitionRequest == null ? null : definitionRequest.getFormat(),
                    ex);
            throw ex;
        }
    }

    private long addEntity(EntityDto entityDto, boolean recordLifecycleActivity) {
        ObserveEntity input = entityDto.getEntity();
        ObserveEntity entity = entityCoreWriteModelService.createEntity(input, SOURCE_MANUAL);
        entityIdentityWriteModelService.replaceIdentities(entity, entityDto.getIdentities());
        entityMonitorBindService.replaceMonitorBinds(entity.getId(), entityDto.getMonitorBinds());
        entityRelationService.replaceRelations(entity.getId(), entityDto.getRelations());
        entityStatusRefreshService.refreshEntityStatus(entity);
        if (recordLifecycleActivity) {
            entityActivityWriteModelService.recordEntityLifecycleActivity(
                    entity.getId(),
                    entityActivityWriteModelService.resolveCreateLifecycleActivityType(entityDto),
                    entity);
        }
        return entity.getId();
    }

    private void modifyEntity(EntityDto entityDto, boolean recordLifecycleActivity) {
        ObserveEntity update = entityDto.getEntity();
        ObserveEntity entity = entityWorkspaceAccessService.requireAccessibleEntityForMutation(update.getId());
        String lifecycleActivityType = recordLifecycleActivity
                ? entityActivityWriteModelService.resolveModifyLifecycleActivityType(
                        entity, update, entityDto.getMonitorBinds())
                : null;
        entityCoreWriteModelService.saveEntityCore(entity, update, entity.getSource());
        entityIdentityWriteModelService.replaceIdentities(entity, entityDto.getIdentities());
        entityMonitorBindService.replaceMonitorBinds(entity.getId(), entityDto.getMonitorBinds());
        entityRelationService.replaceRelations(entity.getId(), entityDto.getRelations());
        entityStatusRefreshService.refreshEntityStatus(entity);
        if (recordLifecycleActivity && lifecycleActivityType != null) {
            entityActivityWriteModelService.recordEntityLifecycleActivity(
                    entity.getId(), lifecycleActivityType, entity);
        }
    }
}
