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
import static org.junit.jupiter.api.Assertions.assertThrowsExactly;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionRequest;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Create operations must never accept a caller-owned entity primary key.
 */
@ExtendWith(MockitoExtension.class)
class EntityCreateIdAuthorityTest {

    private static final long FOREIGN_ENTITY_ID = 9001L;

    @InjectMocks
    private EntityMutationWorkflowService mutationWorkflowService;

    @Mock
    private EntityCoreWriteModelService coreWriteModelService;

    @Mock
    private EntityIdentityWriteModelService identityWriteModelService;

    @Mock
    private EntityMonitorBindService monitorBindService;

    @Mock
    private EntityRelationService relationService;

    @Mock
    private EntityStatusRefreshService statusRefreshService;

    @Mock
    private EntityActivityWriteModelService activityWriteModelService;

    @Mock
    private EntityDefinitionDraftService definitionDraftService;

    @Mock
    private EntityValidationService validationService;

    @Mock
    private EntityWorkspaceAccessService workspaceAccessService;

    @Test
    void manualCreateRejectsCallerIdBeforeCoreOrChildMutation() {
        EntityDto request = createRequest("attempted-manual");

        assertThrowsExactly(IllegalArgumentException.class, () -> mutationWorkflowService.addEntity(request));

        assertNoCreateWrites();
    }

    @Test
    void definitionCreateRejectsParsedCallerIdBeforeCoreOrChildMutation() {
        EntityDefinitionRequest definition = new EntityDefinitionRequest();
        definition.setContent("kind: Entity");
        EntityDto parsed = createRequest("attempted-definition");
        when(definitionDraftService.parseEntityDefinition(definition, null)).thenReturn(parsed);

        assertThrowsExactly(
                IllegalArgumentException.class,
                () -> mutationWorkflowService.addEntityByDefinition(definition));

        verify(definitionDraftService).parseEntityDefinition(definition, null);
        assertNoCreateWrites();
    }

    @Test
    void definitionBundleRejectsAnyCallerIdBeforeBulkCoreOrChildMutation() {
        EntityDefinitionRequest definition = new EntityDefinitionRequest();
        definition.setContent("kind: EntityBundle");
        EntityDto safe = createRequest(null, "safe-new");
        EntityDto forged = createRequest("attempted-bundle");
        when(definitionDraftService.parseEntityDefinitionBundle(definition)).thenReturn(List.of(safe, forged));

        assertThrowsExactly(
                IllegalArgumentException.class,
                () -> mutationWorkflowService.addEntitiesByDefinitionBundle(definition));

        verify(definitionDraftService).parseEntityDefinitionBundle(definition);
        assertNoCreateWrites();
    }

    @Test
    void definitionCreateWithoutCallerIdUsesServerCreatedEntity() {
        EntityDefinitionRequest definition = new EntityDefinitionRequest();
        definition.setContent("kind: Entity");
        EntityDto parsed = new EntityDto();
        ObserveEntity input = ObserveEntity.builder()
                .workspaceId("team-a")
                .type("service")
                .name("safe-definition")
                .build();
        parsed.setEntity(input);
        ObserveEntity created = ObserveEntity.builder()
                .id(7002L)
                .workspaceId("team-a")
                .type("service")
                .name("safe-definition")
                .build();
        when(definitionDraftService.parseEntityDefinition(definition, null)).thenReturn(parsed);
        when(coreWriteModelService.createEntity(any(ObserveEntity.class), anyString())).thenReturn(created);

        assertEquals(7002L, mutationWorkflowService.addEntityByDefinition(definition));

        verify(coreWriteModelService).createEntity(any(ObserveEntity.class), anyString());
        verify(identityWriteModelService).replaceIdentities(created, parsed.getIdentities());
        verify(monitorBindService).replaceMonitorBinds(7002L, parsed.getMonitorBinds());
        verify(relationService).replaceRelations(7002L, parsed.getRelations());
    }

    private EntityDto createRequest(String name) {
        return createRequest(FOREIGN_ENTITY_ID, name);
    }

    private EntityDto createRequest(Long id, String name) {
        EntityDto request = new EntityDto();
        request.setEntity(ObserveEntity.builder()
                .id(id)
                .workspaceId("team-a")
                .type("service")
                .name(name)
                .build());
        request.setIdentities(List.of(EntityIdentity.builder()
                .entityId(FOREIGN_ENTITY_ID)
                .identityKey("service.name")
                .identityValue(name)
                .build()));
        request.setMonitorBinds(List.of(EntityMonitorBind.builder()
                .entityId(FOREIGN_ENTITY_ID)
                .monitorId(71L)
                .build()));
        request.setRelations(List.of(EntityRelation.builder()
                .sourceEntityId(FOREIGN_ENTITY_ID)
                .targetEntityId(81L)
                .relationType("depends_on")
                .build()));
        return request;
    }

    private void assertNoCreateWrites() {
        verify(coreWriteModelService, never()).createEntity(any(ObserveEntity.class), anyString());
        verify(coreWriteModelService, never()).createEntities(any(), anyString());
        verifyNoInteractions(
                identityWriteModelService,
                monitorBindService,
                relationService,
                statusRefreshService,
                activityWriteModelService,
                workspaceAccessService);
    }
}
