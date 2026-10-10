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
 * Source contract that keeps catalog suggestion entity lookup behind the workspace boundary.
 */
class EntityCatalogSuggestionsWorkspaceSourceOwnershipTest {

    private static final Path ENTITY_CATALOG_PROFILE_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityCatalogProfileService.java");
    private static final Path ENTITY_WORKSPACE_ACCESS_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityWorkspaceAccessService.java");
    private static final Path ENTITY_WORKSPACE_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityWorkspaceQueryService.java");

    @Test
    void catalogSuggestionsDelegateWorkspaceScopedEntityLookupToWorkspaceBoundary() throws Exception {
        String catalogSource = Files.readString(ENTITY_CATALOG_PROFILE_SERVICE);
        String workspaceAccessSource = Files.readString(ENTITY_WORKSPACE_ACCESS_SERVICE);
        String workspaceQuerySource = Files.readString(ENTITY_WORKSPACE_QUERY_SERVICE);

        assertFalse(catalogSource.contains("ObserveEntityDao"),
                "Catalog suggestions should not reach through to entity storage directly");
        assertFalse(catalogSource.contains("matchesRequestWorkspace("),
                "Catalog suggestions should not duplicate workspace access decisions");
        assertFalse(catalogSource.contains("normalizeWorkspaceId("),
                "Catalog suggestions should not normalize workspace ids outside the workspace boundary");
        assertFalse(catalogSource.contains("currentRequestWorkspaceId()"),
                "Catalog suggestions should not own default request workspace lookup");
        assertTrue(catalogSource.contains("private final EntityWorkspaceAccessService entityWorkspaceAccessService"));
        assertTrue(catalogSource.contains("entityWorkspaceAccessService.findAccessibleEntitiesForRequestWorkspace("));
        assertTrue(catalogSource.contains("entityWorkspaceAccessService.findAccessibleEntities("));

        assertTrue(workspaceAccessSource.contains("public List<ObserveEntity> findAccessibleEntitiesForRequestWorkspace("));
        assertTrue(workspaceAccessSource.contains("public List<ObserveEntity> findAccessibleEntities("));
        assertTrue(workspaceAccessSource.contains("entityWorkspaceQueryService.findEntities(normalizedWorkspaceId, sort)"));
        assertTrue(workspaceAccessSource.contains("filterEntitiesByRequestWorkspace("));
        assertTrue(workspaceQuerySource.contains("observeEntityDao.findAllByWorkspaceId(workspaceId, sort)"));
    }
}
