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
 * Source contract that keeps request-workspace entity lookup behind the workspace-access boundary.
 */
class EntityIdentityCandidateWorkspaceSourceOwnershipTest {

    private static final Path ENTITY_IDENTITY_RESOLUTION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityIdentityResolutionService.java");
    private static final Path ENTITY_WORKSPACE_ACCESS_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityWorkspaceAccessService.java");
    private static final Path ENTITY_WORKSPACE_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityWorkspaceQueryService.java");

    @Test
    void identityResolutionDelegatesCandidateEntityLookupToWorkspaceAccessBoundary() throws Exception {
        String identitySource = Files.readString(ENTITY_IDENTITY_RESOLUTION_SERVICE);
        String workspaceSource = Files.readString(ENTITY_WORKSPACE_ACCESS_SERVICE);
        String querySource = Files.readString(ENTITY_WORKSPACE_QUERY_SERVICE);

        assertFalse(identitySource.contains("ObserveEntityDao"),
                "Identity resolution should not query entity rows directly while applying workspace scope");
        assertFalse(identitySource.contains("matchesRequestWorkspace("),
                "Identity resolution should not duplicate workspace matching logic");
        assertFalse(identitySource.contains("normalizeWorkspaceId("),
                "Identity resolution should not normalize workspace ids outside the workspace boundary");
        assertFalse(identitySource.contains("currentRequestWorkspaceId()"),
                "Identity resolution should not own default request workspace lookup");
        assertTrue(identitySource.contains("entityWorkspaceAccessService"));
        assertTrue(identitySource.contains(".findAccessibleEntitiesByIdsForRequestWorkspace("));
        assertTrue(identitySource.contains(".findAccessibleEntitiesByIds("));

        assertFalse(workspaceSource.contains("ObserveEntityDao"));
        assertTrue(workspaceSource.contains("private final EntityWorkspaceQueryService entityWorkspaceQueryService"));
        assertTrue(workspaceSource.contains("public List<ObserveEntity> findAccessibleEntitiesByIdsForRequestWorkspace("));
        assertTrue(workspaceSource.contains("public List<ObserveEntity> findAccessibleEntitiesByIds("));
        assertTrue(workspaceSource.contains("entityWorkspaceQueryService.findEntitiesByIds(acceptedEntityIds)"));
        assertTrue(workspaceSource.contains("filterEntitiesByRequestWorkspace("));
        assertTrue(querySource.contains("private final ObserveEntityDao observeEntityDao"));
        assertTrue(querySource.contains("observeEntityDao.findAllById(entityIds)"));
    }
}
