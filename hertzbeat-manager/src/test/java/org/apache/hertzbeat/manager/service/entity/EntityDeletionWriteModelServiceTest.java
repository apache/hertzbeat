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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for the entity deletion write-model boundary.
 */
@ExtendWith(MockitoExtension.class)
class EntityDeletionWriteModelServiceTest {

    private EntityDeletionWriteModelService deletionWriteModelService;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Mock
    private EntityIdentityWriteModelService entityIdentityWriteModelService;

    @Mock
    private EntityMonitorBindService entityMonitorBindService;

    @Mock
    private EntityRelationService entityRelationService;

    @Mock
    private EntityCoreWriteModelService entityCoreWriteModelService;

    @BeforeEach
    void setUp() {
        deletionWriteModelService = new EntityDeletionWriteModelService(
                entityWorkspaceAccessService,
                entityIdentityWriteModelService,
                entityMonitorBindService,
                entityRelationService,
                entityCoreWriteModelService);
    }

    @Test
    void deleteEntitySkipsSideEffectsWhenEntityIsNotAccessible() {
        when(entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(81L)).thenReturn(Optional.empty());

        boolean deleted = deletionWriteModelService.deleteEntity(81L);

        assertFalse(deleted);
        verifyNoInteractions(entityIdentityWriteModelService, entityMonitorBindService, entityRelationService,
                entityCoreWriteModelService);
    }

    @Test
    void deleteEntityChecksAccessThenDeletesDependentRowsBeforeCatalogRow() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(82L)
                .type("service")
                .name("checkout-api")
                .workspaceId("team-a")
                .build();
        when(entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(82L)).thenReturn(Optional.of(entity));

        boolean deleted = deletionWriteModelService.deleteEntity(82L);

        assertTrue(deleted);
        InOrder inOrder = inOrder(
                entityWorkspaceAccessService,
                entityIdentityWriteModelService,
                entityMonitorBindService,
                entityRelationService,
                entityCoreWriteModelService);
        inOrder.verify(entityWorkspaceAccessService).findAccessibleEntityForRequestWorkspace(82L);
        inOrder.verify(entityIdentityWriteModelService).deleteIdentities(82L);
        inOrder.verify(entityMonitorBindService).deleteMonitorBinds(82L);
        inOrder.verify(entityRelationService).deleteRelationsForEntity(82L);
        inOrder.verify(entityCoreWriteModelService).deleteEntityById(82L);
    }
}
