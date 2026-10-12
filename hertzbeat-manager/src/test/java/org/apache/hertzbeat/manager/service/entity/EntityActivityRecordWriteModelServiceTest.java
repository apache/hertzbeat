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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.EntityDefinitionActivity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.dao.EntityDefinitionActivityDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for persisted activity row writes and workspace fallback routing.
 */
@ExtendWith(MockitoExtension.class)
class EntityActivityRecordWriteModelServiceTest {

    @InjectMocks
    private EntityActivityRecordWriteModelService entityActivityRecordWriteModelService;

    @Mock
    private EntityDefinitionActivityDao entityDefinitionActivityDao;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Test
    void recordActivityForCurrentWorkspaceBindsTheRequestWorkspace() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(21L)
                .workspaceId("team-b")
                .build();
        when(entityWorkspaceAccessService.currentRequestWorkspaceId()).thenReturn("team-a");

        entityActivityRecordWriteModelService.recordActivityForCurrentWorkspace(
                21L, "catalog_update", "yaml", "success", "Catalog entity updated",
                "service: checkout-api", entity);

        ArgumentCaptor<EntityDefinitionActivity> activityCaptor =
                ArgumentCaptor.forClass(EntityDefinitionActivity.class);
        verify(entityDefinitionActivityDao).saveAndFlush(activityCaptor.capture());
        EntityDefinitionActivity activity = activityCaptor.getValue();
        assertEquals(21L, activity.getEntityId());
        assertEquals("team-a", activity.getWorkspaceId());
        assertEquals("catalog_update", activity.getActivityType());
        assertEquals("yaml", activity.getFormat());
        assertEquals("success", activity.getStatus());
        assertEquals("Catalog entity updated", activity.getSummary());
        assertEquals("service: checkout-api", activity.getDetail());
    }

    @Test
    void recordActivityFallsBackToStoredEntityWorkspace() {
        ObserveEntity storedEntity = ObserveEntity.builder()
                .id(22L)
                .workspaceId("team-b")
                .build();
        when(entityWorkspaceAccessService.findEntityById(22L)).thenReturn(Optional.of(storedEntity));

        entityActivityRecordWriteModelService.recordActivity(
                22L, "definition_update", "yaml", "error", "Definition update failed",
                "Entity name can not be blank", null, null);

        ArgumentCaptor<EntityDefinitionActivity> activityCaptor =
                ArgumentCaptor.forClass(EntityDefinitionActivity.class);
        verify(entityDefinitionActivityDao).saveAndFlush(activityCaptor.capture());
        assertEquals("team-b", activityCaptor.getValue().getWorkspaceId());
    }
}
