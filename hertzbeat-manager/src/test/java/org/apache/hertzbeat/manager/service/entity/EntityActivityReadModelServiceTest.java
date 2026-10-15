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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.EntityDefinitionActivity;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionActivityInfo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

/**
 * Contract for the entity activity read-model component extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityActivityReadModelServiceTest {

    @InjectMocks
    private EntityActivityReadModelService activityReadModelService;

    @Mock
    private EntityActivityQueryService entityActivityQueryService;

    @Test
    void getDefinitionActivitiesUsesWorkspaceBoundaryAndBuildsReadModel() {
        LocalDateTime createdAt = LocalDateTime.of(2026, 5, 10, 1, 40);
        EntityDefinitionActivity activity = EntityDefinitionActivity.builder()
                .id(701L)
                .entityId(301L)
                .workspaceId("team-a")
                .activityType("definition_update")
                .format("yaml")
                .status("success")
                .summary("Definition updated")
                .detail("service: checkout-api")
                .creator("alice")
                .gmtCreate(createdAt)
                .build();
        when(entityActivityQueryService.findDefinitionActivities(isNull(), any(Pageable.class), eq("team-a")))
                .thenReturn(List.of(activity));

        List<EntityDefinitionActivityInfo> activities =
                activityReadModelService.getDefinitionActivities(null, 5, "team-a");

        assertEquals(1, activities.size());
        EntityDefinitionActivityInfo info = activities.getFirst();
        assertEquals(701L, info.getId());
        assertEquals(301L, info.getEntityId());
        assertEquals("definition_update", info.getActivityType());
        assertEquals("yaml", info.getFormat());
        assertEquals("success", info.getStatus());
        assertEquals("Definition updated", info.getSummary());
        assertEquals("service: checkout-api", info.getDetail());
        assertEquals("alice", info.getCreator());
        assertEquals(createdAt, info.getGmtCreate());
        verify(entityActivityQueryService).findDefinitionActivities(isNull(), any(Pageable.class), eq("team-a"));
    }

    @Test
    void getDefinitionActivitiesReturnsEmptyQueryResult() {
        when(entityActivityQueryService.findDefinitionActivities(eq(902L), any(Pageable.class), eq("team-a")))
                .thenReturn(List.of());

        List<EntityDefinitionActivityInfo> activities =
                activityReadModelService.getDefinitionActivities(902L, 5, "team-a");

        assertTrue(activities.isEmpty());
        verify(entityActivityQueryService).findDefinitionActivities(eq(902L), any(Pageable.class), eq("team-a"));
    }

    @Test
    void getDefinitionActivitiesUsesCurrentRequestWorkspaceForDefaultCall() {
        when(entityActivityQueryService.findDefinitionActivities(eq(301L), any(Pageable.class)))
                .thenReturn(List.of());

        List<EntityDefinitionActivityInfo> activities = activityReadModelService.getDefinitionActivities(301L, 5);

        assertTrue(activities.isEmpty());
        verify(entityActivityQueryService).findDefinitionActivities(eq(301L), any(Pageable.class));
    }

    @Test
    void findLatestDefinitionActivitiesDelegatesToQueryBoundary() {
        EntityDefinitionActivity latestDefinitionActivity = EntityDefinitionActivity.builder()
                .id(2L)
                .entityId(401L)
                .activityType("definition_update")
                .summary("Latest definition")
                .build();
        EntityDefinitionActivity secondDefinitionActivity = EntityDefinitionActivity.builder()
                .id(4L)
                .entityId(402L)
                .activityType("definition_import")
                .summary("Second definition")
                .build();
        Map<Long, EntityDefinitionActivity> expectedActivities = Map.of(
                401L, latestDefinitionActivity,
                402L, secondDefinitionActivity
        );
        when(entityActivityQueryService.findLatestDefinitionActivities(List.of(401L, 402L)))
                .thenReturn(expectedActivities);

        Map<Long, EntityDefinitionActivity> latestActivities =
                activityReadModelService.findLatestDefinitionActivities(List.of(401L, 402L));

        assertEquals(2, latestActivities.size());
        assertSame(latestDefinitionActivity, latestActivities.get(401L));
        assertSame(secondDefinitionActivity, latestActivities.get(402L));
    }

    @Test
    void findLatestDefinitionActivitiesAvoidsDaoLookupWhenEntityIdsAreEmpty() {
        Map<Long, EntityDefinitionActivity> latestActivities =
                activityReadModelService.findLatestDefinitionActivities(List.of());

        assertEquals(Map.of(), latestActivities);
        verify(entityActivityQueryService, never()).findLatestDefinitionActivities(any());
    }
}
