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
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionRequest;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Coordinates entity write workflows while dedicated components own each write stage.
 */
@Service
public class EntityMutationWorkflowService {

    private static final String SOURCE_MANUAL = "manual";
    private static final String ACTIVITY_TYPE_DEFINITION_IMPORT = "definition_import";
    private static final String ACTIVITY_TYPE_DEFINITION_UPDATE = "definition_update";

    private final ConcurrentMap<String, ReentrantLock> mutationReferenceLocks = new ConcurrentHashMap<>();

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
        return withMutationReferenceLocks(List.of(entityDto), () -> {
            requireNewEntityReferences(List.of(entityDto));
            return addEntity(entityDto, true);
        });
    }

    public void modifyEntity(EntityDto entityDto) {
        modifyEntity(entityDto, true);
    }

    public long addEntityByDefinition(EntityDefinitionRequest definitionRequest) {
        EntityDto entityDto = entityDefinitionDraftService.parseEntityDefinition(definitionRequest, null);
        entityValidationService.validate(entityDto, false);
        return withMutationReferenceLocks(List.of(entityDto), () -> {
            requireNewEntityReferences(List.of(entityDto));
            long entityId = addEntity(entityDto, false);
            entityActivityWriteModelService.recordDefinitionActivity(
                    entityId,
                    ACTIVITY_TYPE_DEFINITION_IMPORT,
                    definitionRequest == null ? null : definitionRequest.getFormat(),
                    entityDto.getEntity());
            return entityId;
        });
    }

    public List<Long> addEntitiesByDefinitionBundle(EntityDefinitionRequest definitionRequest) {
        List<EntityDto> entityDtos = entityDefinitionDraftService.parseEntityDefinitionBundle(definitionRequest);
        if (CollectionUtils.isEmpty(entityDtos)) {
            return Collections.emptyList();
        }
        if (entityDtos.size() == 1) {
            EntityDto entityDto = entityDtos.getFirst();
            entityValidationService.validate(entityDto, false);
            return withMutationReferenceLocks(List.of(entityDto), () -> {
                requireNewEntityReferences(List.of(entityDto));
                return List.of(addEntity(entityDto));
            });
        }
        for (EntityDto entityDto : entityDtos) {
            entityValidationService.validate(entityDto, false);
        }
        return withMutationReferenceLocks(entityDtos, () -> {
            requireNewEntityReferences(entityDtos);
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
        });
    }

    private <T> T withMutationReferenceLocks(List<EntityDto> entityDtos, Supplier<T> supplier) {
        List<String> lockKeys = mutationLockKeys(entityDtos);
        if (lockKeys.isEmpty()) {
            return supplier.get();
        }
        List<ReentrantLock> locks = lockKeys.stream()
                .map(key -> mutationReferenceLocks.computeIfAbsent(key, ignored -> new ReentrantLock()))
                .toList();
        locks.forEach(ReentrantLock::lock);
        boolean releaseAfterTransaction = TransactionSynchronizationManager.isSynchronizationActive();
        if (releaseAfterTransaction) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    releaseMutationLocks(lockKeys, locks);
                }
            });
        }
        try {
            return supplier.get();
        } finally {
            if (!releaseAfterTransaction) {
                releaseMutationLocks(lockKeys, locks);
            }
        }
    }

    private void releaseMutationLocks(List<String> lockKeys, List<ReentrantLock> locks) {
        for (int index = locks.size() - 1; index >= 0; index--) {
            ReentrantLock lock = locks.get(index);
            String lockKey = lockKeys.get(index);
            try {
                lock.unlock();
            } finally {
                if (!lock.isLocked() && !lock.hasQueuedThreads()) {
                    mutationReferenceLocks.remove(lockKey, lock);
                }
            }
        }
    }

    private List<String> mutationLockKeys(List<EntityDto> entityDtos) {
        Set<String> lockKeys = new HashSet<>();
        for (EntityDto entityDto : entityDtos) {
            if (entityDto == null) {
                continue;
            }
            ObserveEntity entity = entityDto.getEntity();
            if (entity != null && StringUtils.hasText(entity.getType()) && StringUtils.hasText(entity.getName())) {
                lockKeys.add("entity:" + referenceKey(entity));
            }
            if (entity != null && StringUtils.hasText(entity.getName())) {
                lockKeys.add("entity-name:" + normalizeReferencePart(entity.getName()));
            }
            if (!CollectionUtils.isEmpty(entityDto.getIdentities())) {
                for (EntityIdentity identity : entityDto.getIdentities()) {
                    if (identity == null
                            || !identity.isPrimaryIdentity()
                            || !StringUtils.hasText(identity.getIdentityKey())) {
                        continue;
                    }
                    String identityValue = StringUtils.hasText(identity.getNormalizedValue())
                            ? identity.getNormalizedValue()
                            : identity.getIdentityValue();
                    if (StringUtils.hasText(identityValue)) {
                        lockKeys.add("primary-identity:"
                                + normalizeReferencePart(identity.getIdentityKey())
                                + '\n' + normalizeReferencePart(identityValue));
                    }
                }
            }
        }
        return lockKeys.stream().sorted().toList();
    }

    private void requireNewEntityReferences(List<EntityDto> entityDtos) {
        Set<String> submittedReferences = new HashSet<>();
        Set<String> submittedNames = new HashSet<>();
        for (EntityDto entityDto : entityDtos) {
            ObserveEntity entity = entityDto.getEntity();
            if (entity == null || !StringUtils.hasText(entity.getType()) || !StringUtils.hasText(entity.getName())) {
                continue;
            }
            String entityName = entity.getName().trim();
            String nameKey = normalizeReferencePart(entityName);
            if (!submittedNames.add(nameKey)) {
                throw new IllegalArgumentException("Entity already exists in definition bundle: " + entityName + ".");
            }
            if (entityWorkspaceAccessService.findAccessibleEntityByNameForRequestWorkspace(entityName).isPresent()) {
                throw new IllegalArgumentException("Entity already exists: " + entityName + ".");
            }
            String referenceKey = referenceKey(entity);
            if (!submittedReferences.add(referenceKey)) {
                throw new IllegalArgumentException("Entity already exists in definition bundle: " + displayReference(entity) + ".");
            }
            boolean exists = StringUtils.hasText(entity.getNamespace())
                    ? entityWorkspaceAccessService.findAccessibleEntityByReferenceForRequestWorkspace(
                            entity.getType(), entity.getNamespace(), entity.getName()).isPresent()
                    : entityWorkspaceAccessService.findAccessibleEntityByReferenceForRequestWorkspace(
                            entity.getType(), entity.getName()).isPresent();
            if (exists) {
                throw new IllegalArgumentException("Entity already exists: " + displayReference(entity) + ".");
            }
        }
    }

    private String referenceKey(ObserveEntity entity) {
        return normalizeReferencePart(entity.getType())
                + '\n' + normalizeReferencePart(entity.getNamespace())
                + '\n' + normalizeReferencePart(entity.getName());
    }

    private String displayReference(ObserveEntity entity) {
        String namespacePrefix = StringUtils.hasText(entity.getNamespace()) ? entity.getNamespace().trim() + "/" : "";
        return entity.getType().trim() + " " + namespacePrefix + entity.getName().trim();
    }

    private String normalizeReferencePart(String value) {
        return StringUtils.hasText(value) ? value.trim().toLowerCase(Locale.ROOT) : "";
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
