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
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.EntityDefinitionActivity;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.dao.EntityDefinitionActivityDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * Contract for raw definition activity lookup and workspace eligibility.
 */
@ExtendWith(MockitoExtension.class)
class EntityActivityQueryServiceTest {

    @InjectMocks
    private EntityActivityQueryService entityActivityQueryService;

    @Mock
    private EntityDefinitionActivityDao entityDefinitionActivityDao;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Test
    void findDefinitionActivitiesRejectsCrossWorkspaceEntityTimeline() {
        when(entityWorkspaceAccessService.isEntityAccessibleForRequestWorkspace(902L, "team-a"))
                .thenReturn(false);

        List<EntityDefinitionActivity> activities = entityActivityQueryService.findDefinitionActivities(
                902L, pageRequest(5), "team-a");

        assertEquals(List.of(), activities);
        verify(entityDefinitionActivityDao, never()).findAllByEntityId(anyLong(), any(Pageable.class));
    }

    @Test
    void findDefinitionActivitiesUsesCurrentRequestWorkspaceForDefaultCall() {
        EntityDefinitionActivity teamAlphaActivity = activity(701L, 301L, "team-a", "definition_update");
        EntityDefinitionActivity teamBetaActivity = activity(702L, 301L, "team-b", "definition_update");
        PageRequest pageRequest = pageRequest(5);
        when(entityWorkspaceAccessService.currentRequestWorkspaceId()).thenReturn("team-a");
        when(entityWorkspaceAccessService.isEntityAccessibleForRequestWorkspace(301L, "team-a"))
                .thenReturn(true);
        when(entityDefinitionActivityDao.findAllByEntityId(301L, pageRequest))
                .thenReturn(List.of(teamAlphaActivity, teamBetaActivity));

        List<EntityDefinitionActivity> activities = entityActivityQueryService.findDefinitionActivities(
                301L, pageRequest);

        assertEquals(List.of(teamAlphaActivity), activities);
        verify(entityWorkspaceAccessService).currentRequestWorkspaceId();
        verify(entityWorkspaceAccessService).isEntityAccessibleForRequestWorkspace(eq(301L), eq("team-a"));
    }

    @Test
    void findDefinitionActivitiesUsesWorkspaceScopedRowsAndFiltersResponse() {
        EntityDefinitionActivity teamAlphaActivity = activity(701L, 301L, "team-a", "definition_update");
        EntityDefinitionActivity teamBetaActivity = activity(702L, 302L, "team-b", "definition_update");
        PageRequest pageRequest = pageRequest(8);
        when(entityDefinitionActivityDao.findAllByWorkspaceId("team-a", pageRequest))
                .thenReturn(List.of(teamAlphaActivity, teamBetaActivity));

        List<EntityDefinitionActivity> activities = entityActivityQueryService.findDefinitionActivities(
                null, pageRequest, " team-a ");

        assertEquals(List.of(teamAlphaActivity), activities);
        verify(entityDefinitionActivityDao, never()).findAll(any(Pageable.class));
    }

    @Test
    void findDefinitionActivitiesKeepsDefaultWorkspaceCompatibilityForLegacyRows() {
        EntityDefinitionActivity legacyDefaultActivity = activity(
                801L, 401L, null, "definition_import");
        EntityDefinitionActivity teamAlphaActivity = activity(802L, 402L, "team-a", "definition_import");
        when(entityWorkspaceAccessService.isEntityAccessibleForRequestWorkspace(
                401L, AuthTokenScopes.DEFAULT_WORKSPACE_ID)).thenReturn(true);
        when(entityDefinitionActivityDao.findAllByEntityId(401L, pageRequest(12)))
                .thenReturn(List.of(legacyDefaultActivity, teamAlphaActivity));

        List<EntityDefinitionActivity> activities = entityActivityQueryService.findDefinitionActivities(
                401L, pageRequest(12), AuthTokenScopes.DEFAULT_WORKSPACE_ID);

        assertEquals(List.of(legacyDefaultActivity), activities);
    }

    @Test
    void findDefinitionActivitiesUsesUnscopedRecentRowsWhenWorkspaceIsAbsent() {
        EntityDefinitionActivity activity = activity(901L, 501L, "team-a", "definition_update");
        PageRequest pageRequest = pageRequest(8);
        when(entityDefinitionActivityDao.findAll(pageRequest)).thenReturn(new PageImpl<>(List.of(activity)));

        List<EntityDefinitionActivity> activities = entityActivityQueryService.findDefinitionActivities(
                null, pageRequest, null);

        assertEquals(List.of(activity), activities);
    }

    @Test
    void findLatestDefinitionActivitiesKeepsFirstDefinitionImportOrUpdatePerEntity() {
        EntityDefinitionActivity lifecycleActivity = activity(1L, 401L, "team-a", "catalog_create");
        EntityDefinitionActivity latestDefinitionActivity = activity(2L, 401L, "team-a", "definition_update");
        EntityDefinitionActivity olderDefinitionActivity = activity(3L, 401L, "team-a", "definition_import");
        EntityDefinitionActivity secondDefinitionActivity = activity(4L, 402L, "team-a", "definition_import");
        when(entityDefinitionActivityDao.findAllByEntityIdIn(
                List.of(401L, 402L),
                Sort.by(Sort.Order.desc("gmtCreate"), Sort.Order.desc("id"))
        )).thenReturn(List.of(
                lifecycleActivity,
                latestDefinitionActivity,
                olderDefinitionActivity,
                secondDefinitionActivity
        ));

        Map<Long, EntityDefinitionActivity> latestActivities =
                entityActivityQueryService.findLatestDefinitionActivities(List.of(401L, 402L));

        assertEquals(2, latestActivities.size());
        assertSame(latestDefinitionActivity, latestActivities.get(401L));
        assertSame(secondDefinitionActivity, latestActivities.get(402L));
    }

    @Test
    void findLatestDefinitionActivitiesAvoidsDaoLookupWhenEntityIdsAreEmpty() {
        Map<Long, EntityDefinitionActivity> latestActivities =
                entityActivityQueryService.findLatestDefinitionActivities(List.of());

        assertEquals(Map.of(), latestActivities);
        verifyNoInteractions(entityDefinitionActivityDao);
    }

    private PageRequest pageRequest(int size) {
        return PageRequest.of(0, size, Sort.by(Sort.Order.desc("gmtCreate"), Sort.Order.desc("id")));
    }

    private EntityDefinitionActivity activity(Long id, Long entityId, String workspaceId, String activityType) {
        return EntityDefinitionActivity.builder()
                .id(id)
                .entityId(entityId)
                .workspaceId(workspaceId)
                .activityType(activityType)
                .summary(activityType)
                .build();
    }
}
