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
 * Source contract that keeps entity detail access lookup behind the workspace boundary.
 */
class EntityDetailEntityAccessSourceOwnershipTest {

    private static final Path ENTITY_DETAIL_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDetailReadModelService.java");
    private static final Path ENTITY_WORKSPACE_ACCESS_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityWorkspaceAccessService.java");
    private static final Path ENTITY_WORKSPACE_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityWorkspaceQueryService.java");

    @Test
    void detailReadModelDelegatesEntityLookupToWorkspaceBoundaryBeforeChildEvidence() throws Exception {
        String detailSource = Files.readString(ENTITY_DETAIL_READ_MODEL_SERVICE);
        String workspaceAccessSource = Files.readString(ENTITY_WORKSPACE_ACCESS_SERVICE);
        String workspaceQuerySource = Files.readString(ENTITY_WORKSPACE_QUERY_SERVICE);

        assertFalse(detailSource.contains("ObserveEntityDao"),
                "Detail read-model should not reach through to entity storage directly");
        assertFalse(detailSource.contains(".matchesRequestWorkspace("),
                "Detail read-model should not duplicate workspace access decisions");
        assertFalse(detailSource.contains("currentRequestWorkspaceId()"),
                "Detail read-model should not own current request workspace lookup");
        assertTrue(detailSource.contains("private final EntityWorkspaceAccessService entityWorkspaceAccessService"));
        assertTrue(detailSource.contains("entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace("));
        assertTrue(detailSource.contains("entityWorkspaceAccessService.findAccessibleEntityById("));
        int entityAccessIndex = detailSource.indexOf("entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(");
        assertTrue(entityAccessIndex < detailSource.indexOf("entityIdentityReadModelService.findIdentities(entityId)"));
        assertTrue(entityAccessIndex < detailSource.indexOf("entityMonitorBindService.findMonitorBinds(entityId)"));
        assertTrue(entityAccessIndex < detailSource.indexOf("entityRelationService.findEntityRelations(entityId)"));

        assertTrue(workspaceAccessSource.contains("public Optional<ObserveEntity> findAccessibleEntityForRequestWorkspace("));
        assertTrue(workspaceAccessSource.contains("public Optional<ObserveEntity> findAccessibleEntityById("));
        assertTrue(workspaceAccessSource.contains("entityWorkspaceQueryService.findEntityById(entityId)"));
        assertTrue(workspaceQuerySource.contains("observeEntityDao.findById(entityId)"));
    }
}
