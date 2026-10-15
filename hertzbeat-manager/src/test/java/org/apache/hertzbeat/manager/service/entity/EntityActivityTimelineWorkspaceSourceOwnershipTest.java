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

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/**
 * Source contract that keeps entity activity timeline access behind the workspace boundary.
 */
class EntityActivityTimelineWorkspaceSourceOwnershipTest {

    private static final Path ENTITY_ACTIVITY_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityActivityReadModelService.java");
    private static final Path ENTITY_ACTIVITY_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityActivityQueryService.java");
    private static final Path ENTITY_WORKSPACE_ACCESS_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityWorkspaceAccessService.java");
    private static final Path ENTITY_WORKSPACE_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityWorkspaceQueryService.java");

    @Test
    void activityReadModelDelegatesEntityWorkspaceLookupToWorkspaceBoundary() throws Exception {
        String activitySource = Files.readString(ENTITY_ACTIVITY_READ_MODEL_SERVICE);
        String querySource = Files.readString(ENTITY_ACTIVITY_QUERY_SERVICE);
        String workspaceAccessSource = Files.readString(ENTITY_WORKSPACE_ACCESS_SERVICE);
        String workspaceQuerySource = Files.readString(ENTITY_WORKSPACE_QUERY_SERVICE);

        assertFalse(activitySource.contains("ObserveEntityDao"),
                "Activity read-model should not reach through to entity storage for access checks");
        assertFalse(activitySource.contains("EntityWorkspaceAccessService"),
                "Activity read-model should not own current request workspace lookup");
        assertFalse(activitySource.contains("currentRequestWorkspaceId()"),
                "Activity read-model should delegate default request workspace lookup to the query boundary");
        assertFalse(activitySource.contains("matchesEntityWorkspace("),
                "Activity read-model should not duplicate entity workspace matching");
        assertFalse(activitySource.contains("entityWorkspaceAccessService.findAccessibleEntityById("));
        assertTrue(activitySource.contains("private final EntityActivityQueryService entityActivityQueryService"));
        assertTrue(activitySource.contains("entityActivityQueryService.findDefinitionActivities("));
        assertTrue(activitySource.contains("entityActivityQueryService.findDefinitionActivities(entityId, pageRequest)"));

        assertTrue(querySource.contains("private final EntityWorkspaceAccessService entityWorkspaceAccessService"));
        assertTrue(querySource.contains(
                "public List<EntityDefinitionActivity> findDefinitionActivities(Long entityId, Pageable pageRequest)"));
        assertTrue(querySource.contains("entityWorkspaceAccessService.currentRequestWorkspaceId()"));
        assertTrue(querySource.contains("entityWorkspaceAccessService.isEntityAccessibleForRequestWorkspace("));

        assertTrue(workspaceAccessSource.contains("public Optional<ObserveEntity> findAccessibleEntityById("));
        assertTrue(workspaceAccessSource.contains("entityWorkspaceQueryService.findEntityById(entityId)"));
        assertTrue(workspaceAccessSource.contains("matchesRequestWorkspace(entity, requestWorkspaceId)"));
        assertTrue(workspaceAccessSource.contains(
                "public boolean isEntityAccessibleForRequestWorkspace(long entityId, String requestWorkspaceId)"));
        assertTrue(workspaceAccessSource.contains("return findAccessibleEntityById(entityId, requestWorkspaceId).isPresent()"));
        assertTrue(workspaceQuerySource.contains("observeEntityDao.findById(entityId)"));
    }
}
