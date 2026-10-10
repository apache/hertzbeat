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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for the entity relation boundary extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityRelationServiceTest {

    @InjectMocks
    private EntityRelationService entityRelationService;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Mock
    private EntityRelationQueryService entityRelationQueryService;

    @Mock
    private EntityRelationWriteModelService entityRelationWriteModelService;

    @Test
    void deleteRelationsForEntityDeletesIncomingAndOutgoingRows() {
        entityRelationService.deleteRelationsForEntity(10L);

        verify(entityRelationWriteModelService).deleteIncomingAndOutgoingRelations(10L);
    }

    @Test
    void findEntityRelationsReturnsIncomingAndOutgoingRows() {
        EntityRelation relation = EntityRelation.builder()
                .id(21L)
                .sourceEntityId(10L)
                .targetEntityId(20L)
                .relationType("depends_on")
                .build();
        when(entityRelationQueryService.findEntityRelations(10L)).thenReturn(List.of(relation));

        List<EntityRelation> relations = entityRelationService.findEntityRelations(10L);

        assertEquals(List.of(relation), relations);
    }

    @Test
    void findEntityRelationsWithLimitDelegatesToPreviewQuery() {
        EntityRelation relation = EntityRelation.builder()
                .id(31L)
                .sourceEntityId(10L)
                .targetEntityId(30L)
                .relationType("calls")
                .build();
        when(entityRelationQueryService.findEntityRelations(10L, 50)).thenReturn(List.of(relation));

        List<EntityRelation> relations = entityRelationService.findEntityRelations(10L, 50);

        assertEquals(List.of(relation), relations);
    }

    @Test
    void countEntityRelationsReturnsIncomingAndOutgoingCount() {
        when(entityRelationQueryService.countEntityRelations(10L)).thenReturn(3L);

        assertEquals(3L, entityRelationService.countEntityRelations(10L));
    }

    @Test
    @SuppressWarnings("unchecked")
    void replaceRelationsResolvesWorkspaceScopedReferencesAndPersistsNormalizedUniqueRows() {
        when(entityWorkspaceAccessService.findAccessibleEntityByReference(
                "team-a", "service", "commerce", "payment-api"))
                .thenReturn(Optional.of(ObserveEntity.builder()
                        .id(20L)
                        .workspaceId("team-a")
                        .type("service")
                        .namespace("commerce")
                        .name("payment-api")
                        .build()));
        EntityRelation byRef = EntityRelation.builder()
                .targetRef("service:commerce/payment-api")
                .relationSource("definition_import")
                .attributes(Map.of("edge", "critical-path"))
                .build();
        EntityRelation duplicate = EntityRelation.builder()
                .targetEntityId(20L)
                .targetRef("service:commerce/payment-api")
                .build();
        EntityRelation wrongSource = EntityRelation.builder()
                .sourceEntityId(99L)
                .targetRef("service:commerce/payment-api")
                .build();
        EntityRelation selfLoop = EntityRelation.builder()
                .targetEntityId(10L)
                .build();

        entityRelationService.replaceRelations(10L, List.of(byRef, duplicate, wrongSource, selfLoop), "team-a");

        ArgumentCaptor<List<EntityRelation>> rowsCaptor = ArgumentCaptor.forClass(List.class);
        verify(entityRelationWriteModelService).replaceSourceRelations(eq(10L), rowsCaptor.capture());
        List<EntityRelation> rows = rowsCaptor.getValue();
        assertEquals(1, rows.size());
        EntityRelation saved = rows.getFirst();
        assertEquals(10L, saved.getSourceEntityId());
        assertEquals(20L, saved.getTargetEntityId());
        assertEquals("service:commerce/payment-api", saved.getTargetRef());
        assertEquals("depends_on", saved.getRelationType());
        assertEquals("definition_import", saved.getRelationSource());
        assertEquals("confirmed", saved.getStatus());
        assertEquals(100, saved.getScore());
        assertEquals(Map.of("edge", "critical-path"), saved.getAttributes());
    }

    @Test
    @SuppressWarnings("unchecked")
    void replaceRelationsUsesRequestWorkspaceBoundaryForDefaultCalls() {
        when(entityWorkspaceAccessService.findAccessibleEntityByReferenceForRequestWorkspace(
                "service", "commerce", "payment-api"))
                .thenReturn(Optional.of(ObserveEntity.builder()
                        .id(20L)
                        .workspaceId("team-a")
                        .type("service")
                        .namespace("commerce")
                        .name("payment-api")
                        .build()));
        EntityRelation byRef = EntityRelation.builder()
                .targetRef("service:commerce/payment-api")
                .build();

        entityRelationService.replaceRelations(10L, List.of(byRef));

        ArgumentCaptor<List<EntityRelation>> rowsCaptor = ArgumentCaptor.forClass(List.class);
        verify(entityRelationWriteModelService).replaceSourceRelations(eq(10L), rowsCaptor.capture());
        EntityRelation saved = rowsCaptor.getValue().getFirst();
        assertEquals(10L, saved.getSourceEntityId());
        assertEquals(20L, saved.getTargetEntityId());
        assertEquals("service:commerce/payment-api", saved.getTargetRef());
        verify(entityWorkspaceAccessService).findAccessibleEntityByReferenceForRequestWorkspace(
                "service", "commerce", "payment-api");
        verify(entityWorkspaceAccessService, never()).currentRequestWorkspaceId();
    }

    @Test
    void resolveEntityReferenceRejectsDirectIdsOutsideRequestWorkspace() {
        when(entityWorkspaceAccessService.findAccessibleEntityById(44L, "team-a")).thenReturn(Optional.empty());

        Long resolved = entityRelationService.resolveEntityReference("44", "team-a");

        assertNull(resolved);
        verify(entityWorkspaceAccessService).findAccessibleEntityById(44L, "team-a");
    }

    @Test
    void resolveEntityReferenceForRequestWorkspaceRejectsInaccessibleDirectIds() {
        when(entityWorkspaceAccessService.isEntityAccessibleForRequestWorkspace(44L)).thenReturn(false);

        Long resolved = entityRelationService.resolveEntityReferenceForRequestWorkspace("44");

        assertNull(resolved);
        verify(entityWorkspaceAccessService).isEntityAccessibleForRequestWorkspace(44L);
        verify(entityWorkspaceAccessService, never()).currentRequestWorkspaceId();
    }

    @Test
    void buildEntityReferenceMapsEntityTypeToDefinitionKind() {
        when(entityWorkspaceAccessService.findEntityById(31L)).thenReturn(Optional.of(ObserveEntity.builder()
                .id(31L)
                .type("database")
                .namespace("prod")
                .name("mysql-primary")
                .build()));

        String reference = entityRelationService.buildEntityReference(31L);

        assertEquals("datastore:prod/mysql-primary", reference);
    }
}
