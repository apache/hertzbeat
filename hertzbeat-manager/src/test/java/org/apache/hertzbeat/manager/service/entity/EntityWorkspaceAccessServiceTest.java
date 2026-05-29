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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

/**
 * Contract for the entity workspace-access component extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityWorkspaceAccessServiceTest {

    @InjectMocks
    private EntityWorkspaceAccessService workspaceAccessService;

    @Mock
    private EntityWorkspaceQueryService entityWorkspaceQueryService;

    @AfterEach
    void tearDownRequestContext() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void filterEntitiesByRequestWorkspaceKeepsOnlyMatchingWorkspaceAndDefaultRows() {
        ObserveEntity defaultEntity = ObserveEntity.builder()
                .id(101L)
                .name("default-service")
                .build();
        ObserveEntity explicitDefaultEntity = ObserveEntity.builder()
                .id(102L)
                .name("explicit-default-service")
                .workspaceId(AuthTokenScopes.DEFAULT_WORKSPACE_ID)
                .build();
        ObserveEntity teamEntity = ObserveEntity.builder()
                .id(103L)
                .name("team-service")
                .workspaceId("team-a")
                .build();

        List<ObserveEntity> scopedEntities = workspaceAccessService.filterEntitiesByRequestWorkspace(
                List.of(defaultEntity, explicitDefaultEntity, teamEntity),
                AuthTokenScopes.DEFAULT_WORKSPACE_ID
        );

        assertEquals(List.of(defaultEntity, explicitDefaultEntity), scopedEntities);
        assertTrue(workspaceAccessService.matchesRequestWorkspace(defaultEntity, AuthTokenScopes.DEFAULT_WORKSPACE_ID));
        assertFalse(workspaceAccessService.matchesRequestWorkspace(defaultEntity, "team-a"));
    }

    @Test
    void findAccessibleEntitiesByIdsLoadsAndFiltersRowsAtWorkspaceBoundary() {
        ObserveEntity defaultEntity = ObserveEntity.builder()
                .id(301L)
                .name("default-service")
                .build();
        ObserveEntity teamAlphaEntity = ObserveEntity.builder()
                .id(302L)
                .name("checkout")
                .workspaceId("team-a")
                .build();
        ObserveEntity teamBetaEntity = ObserveEntity.builder()
                .id(303L)
                .name("billing")
                .workspaceId("team-b")
                .build();
        when(entityWorkspaceQueryService.findEntitiesByIds(new LinkedHashSet<>(List.of(301L, 302L, 303L))))
                .thenReturn(List.of(defaultEntity, teamAlphaEntity, teamBetaEntity));

        List<ObserveEntity> teamAlphaEntities = workspaceAccessService.findAccessibleEntitiesByIds(
                List.of(301L, 302L, 303L), " team-a ");
        List<ObserveEntity> unscopedEntities = workspaceAccessService.findAccessibleEntitiesByIds(
                List.of(301L, 302L, 303L), null);

        assertEquals(List.of(teamAlphaEntity), teamAlphaEntities);
        assertEquals(List.of(defaultEntity, teamAlphaEntity, teamBetaEntity), unscopedEntities);
        assertEquals(List.of(), workspaceAccessService.findAccessibleEntitiesByIds(List.of(), "team-a"));
    }

    @Test
    void findAccessibleEntitiesByIdsNormalizesIdsBeforeQueryBoundary() {
        ObserveEntity firstEntity = ObserveEntity.builder()
                .id(301L)
                .name("checkout")
                .workspaceId("team-a")
                .build();
        ObserveEntity secondEntity = ObserveEntity.builder()
                .id(302L)
                .name("billing")
                .workspaceId("team-a")
                .build();
        when(entityWorkspaceQueryService.findEntitiesByIds(new LinkedHashSet<>(List.of(301L, 302L))))
                .thenReturn(List.of(firstEntity, secondEntity));

        List<ObserveEntity> entities = workspaceAccessService.findAccessibleEntitiesByIds(
                java.util.Arrays.asList(null, 301L, 302L, 301L), "team-a");

        assertEquals(List.of(firstEntity, secondEntity), entities);
    }

    @Test
    void findAccessibleEntitiesByIdsForRequestWorkspaceUsesCurrentRequestScope() {
        ObserveEntity teamAlphaEntity = ObserveEntity.builder()
                .id(321L)
                .name("checkout")
                .workspaceId("team-a")
                .build();
        ObserveEntity teamBetaEntity = ObserveEntity.builder()
                .id(322L)
                .name("billing")
                .workspaceId("team-b")
                .build();
        when(entityWorkspaceQueryService.findEntitiesByIds(new LinkedHashSet<>(List.of(321L, 322L))))
                .thenReturn(List.of(teamAlphaEntity, teamBetaEntity));
        AuthTokenRequestContext.bindWorkspaceId(" team-a ");

        List<ObserveEntity> entities = workspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(
                List.of(321L, 322L));

        assertEquals(List.of(teamAlphaEntity), entities);
    }

    @Test
    void findAccessibleEntitiesLoadsSortedWorkspaceRowsAndDefensivelyFiltersThem() {
        Sort sort = Sort.by(Sort.Order.desc("gmtUpdate"), Sort.Order.desc("id"));
        ObserveEntity teamAlphaEntity = ObserveEntity.builder()
                .id(401L)
                .name("checkout")
                .workspaceId("team-a")
                .build();
        ObserveEntity teamBetaEntity = ObserveEntity.builder()
                .id(402L)
                .name("billing")
                .workspaceId("team-b")
                .build();
        when(entityWorkspaceQueryService.findEntities("team-a", sort))
                .thenReturn(List.of(teamAlphaEntity, teamBetaEntity));
        when(entityWorkspaceQueryService.findEntities(null, sort)).thenReturn(List.of(teamAlphaEntity, teamBetaEntity));

        List<ObserveEntity> teamAlphaEntities = workspaceAccessService.findAccessibleEntities(" team-a ", sort);
        List<ObserveEntity> unscopedEntities = workspaceAccessService.findAccessibleEntities(null, sort);

        assertEquals(List.of(teamAlphaEntity), teamAlphaEntities);
        assertEquals(List.of(teamAlphaEntity, teamBetaEntity), unscopedEntities);
    }

    @Test
    void findAccessibleEntitiesForRequestWorkspaceUsesCurrentRequestScope() {
        Sort sort = Sort.by(Sort.Order.desc("gmtUpdate"), Sort.Order.desc("id"));
        ObserveEntity teamAlphaEntity = ObserveEntity.builder()
                .id(411L)
                .name("checkout")
                .workspaceId("team-a")
                .build();
        ObserveEntity teamBetaEntity = ObserveEntity.builder()
                .id(412L)
                .name("billing")
                .workspaceId("team-b")
                .build();
        when(entityWorkspaceQueryService.findEntities("team-a", sort)).thenReturn(List.of(teamAlphaEntity, teamBetaEntity));
        AuthTokenRequestContext.bindWorkspaceId(" team-a ");

        List<ObserveEntity> entities = workspaceAccessService.findAccessibleEntitiesForRequestWorkspace(sort);

        assertEquals(List.of(teamAlphaEntity), entities);
    }

    @Test
    void findAccessibleEntityUsesCurrentRequestWorkspaceAndRejectsCrossWorkspaceRows() {
        ObserveEntity teamAlphaEntity = ObserveEntity.builder()
                .id(201L)
                .name("checkout")
                .workspaceId("team-a")
                .build();
        ObserveEntity teamBetaEntity = ObserveEntity.builder()
                .id(202L)
                .name("billing")
                .workspaceId("team-b")
                .build();
        when(entityWorkspaceQueryService.findEntityById(201L)).thenReturn(Optional.of(teamAlphaEntity));
        when(entityWorkspaceQueryService.findEntityById(202L)).thenReturn(Optional.of(teamBetaEntity));
        AuthTokenRequestContext.bindWorkspaceId(" team-a ");

        Optional<ObserveEntity> accessibleEntity = workspaceAccessService.findAccessibleEntityForRequestWorkspace(201L);
        Optional<ObserveEntity> inaccessibleEntity = workspaceAccessService.findAccessibleEntityForRequestWorkspace(202L);
        Optional<ObserveEntity> explicitlyAccessibleEntity =
                workspaceAccessService.findAccessibleEntityById(201L, " team-a ");
        Optional<ObserveEntity> explicitlyInaccessibleEntity =
                workspaceAccessService.findAccessibleEntityById(202L, "team-a");

        assertEquals("team-a", workspaceAccessService.currentRequestWorkspaceId());
        assertTrue(accessibleEntity.isPresent());
        assertSame(teamAlphaEntity, accessibleEntity.get());
        assertTrue(inaccessibleEntity.isEmpty());
        assertTrue(explicitlyAccessibleEntity.isPresent());
        assertSame(teamAlphaEntity, explicitlyAccessibleEntity.get());
        assertTrue(explicitlyInaccessibleEntity.isEmpty());
        assertTrue(workspaceAccessService.isEntityAccessibleForRequestWorkspace(201L));
        assertFalse(workspaceAccessService.isEntityAccessibleForRequestWorkspace(202L));
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> workspaceAccessService.requireAccessibleEntityForMutation(202L));
        assertEquals("Entity not exist.", exception.getMessage());
    }

    @Test
    void findAccessibleEntityByReferenceForRequestWorkspaceUsesCurrentRequestScope() {
        ObserveEntity teamAlphaEntity = ObserveEntity.builder()
                .id(431L)
                .type("service")
                .namespace("commerce")
                .name("checkout")
                .workspaceId("team-a")
                .build();
        when(entityWorkspaceQueryService.findEntityByReference("team-a", "service", "commerce", "checkout"))
                .thenReturn(Optional.of(teamAlphaEntity));
        AuthTokenRequestContext.bindWorkspaceId(" team-a ");

        Optional<ObserveEntity> accessibleEntity =
                workspaceAccessService.findAccessibleEntityByReferenceForRequestWorkspace(
                        "service", "commerce", "checkout");

        assertTrue(accessibleEntity.isPresent());
        assertSame(teamAlphaEntity, accessibleEntity.get());
    }

    @Test
    void findAccessibleEntityByShortReferenceForRequestWorkspaceUsesCurrentRequestScope() {
        ObserveEntity teamAlphaEntity = ObserveEntity.builder()
                .id(432L)
                .type("service")
                .name("checkout")
                .workspaceId("team-a")
                .build();
        when(entityWorkspaceQueryService.findEntityByReference("team-a", "service", "checkout"))
                .thenReturn(Optional.of(teamAlphaEntity));
        AuthTokenRequestContext.bindWorkspaceId(" team-a ");

        Optional<ObserveEntity> accessibleEntity =
                workspaceAccessService.findAccessibleEntityByReferenceForRequestWorkspace("service", "checkout");

        assertTrue(accessibleEntity.isPresent());
        assertSame(teamAlphaEntity, accessibleEntity.get());
    }

    @Test
    void resolveWriteWorkspaceIdPrefersRequestThenSourceThenCurrentThenDefault() {
        AuthTokenRequestContext.bindWorkspaceId(" team-a ");
        assertEquals("team-a", workspaceAccessService.resolveWriteWorkspaceId("team-b", "team-c"));

        AuthTokenRequestContext.clear();
        assertEquals("team-b", workspaceAccessService.resolveWriteWorkspaceId(" team-b ", "team-c"));
        assertEquals("team-c", workspaceAccessService.resolveWriteWorkspaceId(null, " team-c "));
        assertEquals(AuthTokenScopes.DEFAULT_WORKSPACE_ID, workspaceAccessService.resolveWriteWorkspaceId(null, null));
    }
}
