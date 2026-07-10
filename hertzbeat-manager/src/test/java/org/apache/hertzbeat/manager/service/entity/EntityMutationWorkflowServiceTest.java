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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionRequest;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Contract for entity mutation workflow ordering across create, edit, and definition import paths.
 */
@ExtendWith(MockitoExtension.class)
class EntityMutationWorkflowServiceTest {

    @InjectMocks
    private EntityMutationWorkflowService entityMutationWorkflowService;

    @Mock
    private EntityCoreWriteModelService entityCoreWriteModelService;

    @Mock
    private EntityIdentityWriteModelService entityIdentityWriteModelService;

    @Mock
    private EntityMonitorBindService entityMonitorBindService;

    @Mock
    private EntityRelationService entityRelationService;

    @Mock
    private EntityStatusRefreshService entityStatusRefreshService;

    @Mock
    private EntityActivityWriteModelService entityActivityWriteModelService;

    @Mock
    private EntityDefinitionDraftService entityDefinitionDraftService;

    @Mock
    private EntityValidationService entityValidationService;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Test
    void addEntityRunsCatalogIdentitiesBindsRelationsStatusThenLifecycleActivity() {
        EntityDto entityDto = new EntityDto();
        ObserveEntity input = ObserveEntity.builder().name("checkout").build();
        entityDto.setEntity(input);
        EntityIdentity identity = EntityIdentity.builder().identityKey("service.name").identityValue("checkout").build();
        EntityMonitorBind monitorBind = EntityMonitorBind.builder().monitorId(11L).build();
        EntityRelation relation = EntityRelation.builder().targetEntityId(99L).relationType("depends_on").build();
        entityDto.setIdentities(List.of(identity));
        entityDto.setMonitorBinds(List.of(monitorBind));
        entityDto.setRelations(List.of(relation));
        ObserveEntity savedEntity = ObserveEntity.builder()
                .id(7L)
                .name("checkout")
                .source("manual")
                .workspaceId("team-a")
                .build();
        when(entityCoreWriteModelService.createEntity(input, "manual")).thenReturn(savedEntity);
        when(entityActivityWriteModelService.resolveCreateLifecycleActivityType(entityDto))
                .thenReturn("catalog_create");

        long entityId = entityMutationWorkflowService.addEntity(entityDto);

        assertEquals(7L, entityId);
        InOrder inOrder = inOrder(
                entityCoreWriteModelService,
                entityIdentityWriteModelService,
                entityMonitorBindService,
                entityRelationService,
                entityStatusRefreshService,
                entityActivityWriteModelService);
        inOrder.verify(entityCoreWriteModelService).createEntity(input, "manual");
        inOrder.verify(entityIdentityWriteModelService).replaceIdentities(savedEntity, List.of(identity));
        inOrder.verify(entityMonitorBindService).replaceMonitorBinds(7L, List.of(monitorBind));
        inOrder.verify(entityRelationService).replaceRelations(7L, List.of(relation));
        inOrder.verify(entityStatusRefreshService).refreshEntityStatus(savedEntity);
        inOrder.verify(entityActivityWriteModelService).resolveCreateLifecycleActivityType(entityDto);
        inOrder.verify(entityActivityWriteModelService)
                .recordEntityLifecycleActivity(7L, "catalog_create", savedEntity);
    }

    @Test
    void modifyEntityLoadsAccessibleEntityBeforeSavingAndRecordsLifecycleActivity() {
        EntityDto entityDto = new EntityDto();
        ObserveEntity update = ObserveEntity.builder().id(8L).name("checkout-api").source("otel_resource").build();
        entityDto.setEntity(update);
        EntityMonitorBind monitorBind = EntityMonitorBind.builder().monitorId(42L).build();
        entityDto.setMonitorBinds(List.of(monitorBind));
        ObserveEntity current = ObserveEntity.builder().id(8L).name("checkout").source("manual").build();
        when(entityWorkspaceAccessService.requireAccessibleEntityForMutation(8L)).thenReturn(current);
        when(entityActivityWriteModelService.resolveModifyLifecycleActivityType(current, update, List.of(monitorBind)))
                .thenReturn("source_update");

        entityMutationWorkflowService.modifyEntity(entityDto);

        InOrder inOrder = inOrder(
                entityWorkspaceAccessService,
                entityActivityWriteModelService,
                entityCoreWriteModelService,
                entityIdentityWriteModelService,
                entityMonitorBindService,
                entityRelationService,
                entityStatusRefreshService);
        inOrder.verify(entityWorkspaceAccessService).requireAccessibleEntityForMutation(8L);
        inOrder.verify(entityActivityWriteModelService)
                .resolveModifyLifecycleActivityType(current, update, List.of(monitorBind));
        inOrder.verify(entityCoreWriteModelService).saveEntityCore(current, update, "manual");
        inOrder.verify(entityIdentityWriteModelService).replaceIdentities(current, entityDto.getIdentities());
        inOrder.verify(entityMonitorBindService).replaceMonitorBinds(8L, List.of(monitorBind));
        inOrder.verify(entityRelationService).replaceRelations(8L, entityDto.getRelations());
        inOrder.verify(entityStatusRefreshService).refreshEntityStatus(current);
        inOrder.verify(entityActivityWriteModelService)
                .recordEntityLifecycleActivity(8L, "source_update", current);
    }

    @Test
    void addEntitiesByDefinitionBundlePreservesBundleOrderAcrossWriteStages() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        EntityDto firstDto = new EntityDto();
        ObserveEntity firstInput = ObserveEntity.builder().name("frontend").build();
        firstDto.setEntity(firstInput);
        EntityDto secondDto = new EntityDto();
        ObserveEntity secondInput = ObserveEntity.builder().name("backend").build();
        secondDto.setEntity(secondInput);
        ObserveEntity firstSaved = ObserveEntity.builder().id(101L).name("frontend").build();
        ObserveEntity secondSaved = ObserveEntity.builder().id(102L).name("backend").build();
        when(entityDefinitionDraftService.parseEntityDefinitionBundle(request))
                .thenReturn(List.of(firstDto, secondDto));
        when(entityCoreWriteModelService.createEntities(List.of(firstInput, secondInput), "manual"))
                .thenReturn(List.of(firstSaved, secondSaved));

        List<Long> entityIds = entityMutationWorkflowService.addEntitiesByDefinitionBundle(request);

        assertEquals(List.of(101L, 102L), entityIds);
        InOrder inOrder = inOrder(
                entityDefinitionDraftService,
                entityValidationService,
                entityCoreWriteModelService,
                entityIdentityWriteModelService,
                entityMonitorBindService,
                entityRelationService,
                entityStatusRefreshService,
                entityActivityWriteModelService);
        inOrder.verify(entityDefinitionDraftService).parseEntityDefinitionBundle(request);
        inOrder.verify(entityValidationService).validate(firstDto, false);
        inOrder.verify(entityValidationService).validate(secondDto, false);
        inOrder.verify(entityCoreWriteModelService).createEntities(List.of(firstInput, secondInput), "manual");
        inOrder.verify(entityIdentityWriteModelService).replaceIdentities(firstSaved, firstDto.getIdentities());
        inOrder.verify(entityMonitorBindService).replaceMonitorBinds(101L, firstDto.getMonitorBinds());
        inOrder.verify(entityIdentityWriteModelService).replaceIdentities(secondSaved, secondDto.getIdentities());
        inOrder.verify(entityMonitorBindService).replaceMonitorBinds(102L, secondDto.getMonitorBinds());
        inOrder.verify(entityRelationService).replaceRelations(101L, firstDto.getRelations());
        inOrder.verify(entityStatusRefreshService).refreshEntityStatus(firstSaved);
        inOrder.verify(entityActivityWriteModelService)
                .recordDefinitionActivity(101L, "definition_import", "yaml", firstSaved);
        inOrder.verify(entityRelationService).replaceRelations(102L, secondDto.getRelations());
        inOrder.verify(entityStatusRefreshService).refreshEntityStatus(secondSaved);
        inOrder.verify(entityActivityWriteModelService)
                .recordDefinitionActivity(102L, "definition_import", "yaml", secondSaved);
    }

    @Test
    void addEntityByDefinitionRejectsExistingEntityReferenceBeforeWrite() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        EntityDto entityDto = new EntityDto();
        ObserveEntity input = ObserveEntity.builder()
                .type("service")
                .namespace("product-design")
                .name("checkout")
                .build();
        entityDto.setEntity(input);
        when(entityDefinitionDraftService.parseEntityDefinition(request, null)).thenReturn(entityDto);
        when(entityWorkspaceAccessService.findAccessibleEntityByReferenceForRequestWorkspace(
                "service", "product-design", "checkout"))
                .thenReturn(Optional.of(ObserveEntity.builder().id(44L).build()));

        IllegalArgumentException thrown = assertThrows(IllegalArgumentException.class,
                () -> entityMutationWorkflowService.addEntityByDefinition(request));

        assertEquals("Entity already exists: service product-design/checkout.", thrown.getMessage());
        verify(entityCoreWriteModelService, never()).createEntity(input, "manual");
    }

    @Test
    void addEntityRejectsExistingEntityReferenceBeforeWrite() {
        EntityDto entityDto = new EntityDto();
        ObserveEntity input = ObserveEntity.builder()
                .type("service")
                .namespace("product-design")
                .name("checkout")
                .build();
        entityDto.setEntity(input);
        when(entityWorkspaceAccessService.findAccessibleEntityByNameForRequestWorkspace("checkout"))
                .thenReturn(Optional.of(ObserveEntity.builder()
                        .id(44L)
                        .type("endpoint")
                        .name("checkout")
                        .build()));

        IllegalArgumentException thrown = assertThrows(IllegalArgumentException.class,
                () -> entityMutationWorkflowService.addEntity(entityDto));

        assertEquals("Entity already exists: checkout.", thrown.getMessage());
        verify(entityCoreWriteModelService, never()).createEntity(input, "manual");
    }

    @Test
    void addEntitiesByDefinitionBundleRejectsDuplicateSubmittedReferenceBeforeWrite() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        EntityDto firstDto = new EntityDto();
        ObserveEntity firstInput = ObserveEntity.builder()
                .type("service")
                .namespace("product-design")
                .name("checkout")
                .build();
        firstDto.setEntity(firstInput);
        EntityDto secondDto = new EntityDto();
        ObserveEntity secondInput = ObserveEntity.builder()
                .type("service")
                .namespace("product-design")
                .name("checkout")
                .build();
        secondDto.setEntity(secondInput);
        when(entityDefinitionDraftService.parseEntityDefinitionBundle(request))
                .thenReturn(List.of(firstDto, secondDto));

        IllegalArgumentException thrown = assertThrows(IllegalArgumentException.class,
                () -> entityMutationWorkflowService.addEntitiesByDefinitionBundle(request));

        assertEquals("Entity already exists in definition bundle: checkout.", thrown.getMessage());
        verify(entityCoreWriteModelService, never()).createEntities(List.of(firstInput, secondInput), "manual");
    }

    @Test
    void addEntitiesByDefinitionBundleHoldsSameReferenceLockUntilTransactionCompletion() throws Exception {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        EntityDto firstDto = new EntityDto();
        ObserveEntity firstInput = ObserveEntity.builder()
                .type("service")
                .namespace("product-design")
                .name("checkout")
                .build();
        firstDto.setEntity(firstInput);
        EntityDto secondDto = new EntityDto();
        ObserveEntity secondInput = ObserveEntity.builder()
                .type("service")
                .namespace("product-design")
                .name("payments")
                .build();
        secondDto.setEntity(secondInput);
        ObserveEntity firstSaved = ObserveEntity.builder().id(101L).name("checkout").build();
        ObserveEntity secondSaved = ObserveEntity.builder().id(102L).name("payments").build();
        when(entityDefinitionDraftService.parseEntityDefinitionBundle(request))
                .thenReturn(List.of(firstDto, secondDto));
        when(entityWorkspaceAccessService.findAccessibleEntityByReferenceForRequestWorkspace(
                "service", "product-design", "checkout"))
                .thenReturn(Optional.empty());
        when(entityWorkspaceAccessService.findAccessibleEntityByReferenceForRequestWorkspace(
                "service", "product-design", "payments"))
                .thenReturn(Optional.empty());
        when(entityCoreWriteModelService.createEntities(List.of(firstInput, secondInput), "manual"))
                .thenReturn(List.of(firstSaved, secondSaved));
        ExecutorService executor = Executors.newSingleThreadExecutor();

        TransactionSynchronizationManager.initSynchronization();
        try {
            assertEquals(List.of(101L, 102L), entityMutationWorkflowService.addEntitiesByDefinitionBundle(request));
            Future<List<Long>> blockedImport = executor.submit(
                    () -> entityMutationWorkflowService.addEntitiesByDefinitionBundle(request));

            TimeUnit.MILLISECONDS.sleep(150);
            assertFalse(blockedImport.isDone());

            TransactionSynchronizationManager.getSynchronizations()
                    .forEach(synchronization -> synchronization.afterCompletion(TransactionSynchronization.STATUS_COMMITTED));
            TransactionSynchronizationManager.clearSynchronization();

            assertEquals(List.of(101L, 102L), blockedImport.get(2, TimeUnit.SECONDS));
        } finally {
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.clearSynchronization();
            }
            executor.shutdownNow();
        }
    }

    @Test
    void modifyEntityByDefinitionRecordsFailureActivityBeforeRethrow() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("json");
        IllegalArgumentException parseFailure = new IllegalArgumentException("bad definition");
        when(entityDefinitionDraftService.parseEntityDefinition(request, 9L)).thenThrow(parseFailure);

        IllegalArgumentException thrown = assertThrows(IllegalArgumentException.class,
                () -> entityMutationWorkflowService.modifyEntityByDefinition(9L, request));

        assertSame(parseFailure, thrown);
        InOrder inOrder = inOrder(entityWorkspaceAccessService, entityDefinitionDraftService, entityActivityWriteModelService);
        inOrder.verify(entityWorkspaceAccessService).requireAccessibleEntityForBoundWorkspace(9L);
        inOrder.verify(entityDefinitionDraftService).parseEntityDefinition(request, 9L);
        inOrder.verify(entityActivityWriteModelService)
                .recordDefinitionActivityFailure(9L, "definition_update", "json", parseFailure);
    }
}
