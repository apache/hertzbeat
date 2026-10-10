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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for the entity detail DTO read-model extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityDetailReadModelServiceTest {

    @InjectMocks
    private EntityDetailReadModelService entityDetailReadModelService;

    @Mock
    private EntityIdentityReadModelService entityIdentityReadModelService;
    @Mock
    private EntityMonitorBindService entityMonitorBindService;
    @Mock
    private EntityRelationService entityRelationService;
    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Test
    void loadEntityDtoAssemblesAcceptedEntityChildEvidenceInStableOrder() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(801L)
                .name("checkout-api")
                .workspaceId("team-a")
                .build();
        EntityIdentity serviceIdentity = EntityIdentity.builder()
                .id(901L)
                .entityId(801L)
                .identityKey("service.name")
                .identityValue("checkout")
                .priority(100)
                .build();
        EntityMonitorBind monitorBind = EntityMonitorBind.builder()
                .id(902L)
                .entityId(801L)
                .monitorId(1001L)
                .bindType("manual")
                .build();
        EntityRelation relation = EntityRelation.builder()
                .id(903L)
                .sourceEntityId(801L)
                .targetEntityId(802L)
                .relationType("depends_on")
                .build();
        when(entityWorkspaceAccessService.findAccessibleEntityById(801L, "team-a"))
                .thenReturn(Optional.of(entity));
        when(entityIdentityReadModelService.findIdentities(801L)).thenReturn(List.of(serviceIdentity));
        when(entityMonitorBindService.findMonitorBinds(801L)).thenReturn(List.of(monitorBind));
        when(entityRelationService.findEntityRelations(801L)).thenReturn(List.of(relation));

        EntityDto dto = entityDetailReadModelService.loadEntityDto(801L, "team-a");

        assertEquals(entity.getId(), dto.getEntity().getId());
        assertEquals(entity.getName(), dto.getEntity().getName());
        assertEquals(entity.getWorkspaceId(), dto.getEntity().getWorkspaceId());
        assertEquals(List.of(serviceIdentity), dto.getIdentities());
        assertEquals(List.of(monitorBind), dto.getMonitorBinds());
        assertEquals(List.of(relation), dto.getRelations());
    }

    @Test
    void loadEntityDtoUsesRequestScopedWorkspaceBoundaryBeforeChildEvidence() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(805L)
                .name("checkout-worker")
                .workspaceId("team-a")
                .build();
        EntityIdentity serviceIdentity = EntityIdentity.builder()
                .id(906L)
                .entityId(805L)
                .identityKey("service.name")
                .identityValue("checkout-worker")
                .priority(100)
                .build();
        when(entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(805L))
                .thenReturn(Optional.of(entity));
        when(entityIdentityReadModelService.findIdentities(805L)).thenReturn(List.of(serviceIdentity));
        when(entityMonitorBindService.findMonitorBinds(805L)).thenReturn(List.of());
        when(entityRelationService.findEntityRelations(805L)).thenReturn(List.of());

        EntityDto dto = entityDetailReadModelService.loadEntityDto(805L);

        assertEquals(entity.getId(), dto.getEntity().getId());
        assertEquals(List.of(serviceIdentity), dto.getIdentities());
        assertEquals(List.of(), dto.getMonitorBinds());
        assertEquals(List.of(), dto.getRelations());
    }

    @Test
    void loadEntityDtoWithRelationPreviewLimitKeepsDefinitionLoadsSeparateFromDetailPreviewLoads() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(807L)
                .name("checkout-graph")
                .workspaceId("team-a")
                .build();
        EntityRelation relation = EntityRelation.builder()
                .id(907L)
                .sourceEntityId(807L)
                .targetEntityId(808L)
                .relationType("calls")
                .build();
        when(entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(807L))
                .thenReturn(Optional.of(entity));
        when(entityIdentityReadModelService.findIdentities(807L)).thenReturn(List.of());
        when(entityMonitorBindService.findMonitorBinds(807L)).thenReturn(List.of());
        when(entityRelationService.findEntityRelations(807L, 50)).thenReturn(List.of(relation));

        EntityDto dto = entityDetailReadModelService.loadEntityDto(807L, 50);

        assertEquals(List.of(relation), dto.getRelations());
        verify(entityRelationService).findEntityRelations(807L, 50);
    }

    @Test
    void countEntityRelationsDelegatesToRelationBoundary() {
        when(entityRelationService.countEntityRelations(807L)).thenReturn(99L);

        assertEquals(99L, entityDetailReadModelService.countEntityRelations(807L));
    }

    @Test
    void loadEntityDtoReturnsNullBeforeChildLookupsWhenWorkspaceRejectsEntity() {
        when(entityWorkspaceAccessService.findAccessibleEntityById(811L, "team-a"))
                .thenReturn(Optional.empty());

        assertNull(entityDetailReadModelService.loadEntityDto(811L, "team-a"));
        verifyNoInteractions(entityIdentityReadModelService, entityMonitorBindService, entityRelationService);
    }

    @Test
    void loadEntityDtoReturnsNullWithoutChildLookupsWhenEntityIsMissing() {
        when(entityWorkspaceAccessService.findAccessibleEntityById(821L, "team-a"))
                .thenReturn(Optional.empty());

        assertNull(entityDetailReadModelService.loadEntityDto(821L, "team-a"));
        verifyNoInteractions(entityIdentityReadModelService, entityMonitorBindService, entityRelationService);
    }
}
