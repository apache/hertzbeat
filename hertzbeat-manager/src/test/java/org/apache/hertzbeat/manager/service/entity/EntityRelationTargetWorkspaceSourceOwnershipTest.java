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
 * Source contract that keeps relation target lookup behind the workspace boundary.
 */
class EntityRelationTargetWorkspaceSourceOwnershipTest {

    private static final Path ENTITY_RELATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityRelationService.java");
    private static final Path ENTITY_WORKSPACE_ACCESS_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityWorkspaceAccessService.java");
    private static final Path ENTITY_WORKSPACE_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityWorkspaceQueryService.java");

    @Test
    void relationTargetLookupDelegatesEntityStorageAndWorkspaceChecks() throws Exception {
        String relationSource = Files.readString(ENTITY_RELATION_SERVICE);
        String workspaceAccessSource = Files.readString(ENTITY_WORKSPACE_ACCESS_SERVICE);
        String workspaceQuerySource = Files.readString(ENTITY_WORKSPACE_QUERY_SERVICE);

        assertFalse(relationSource.contains("ObserveEntityDao"),
                "Relation boundary should not reach through to entity storage directly");
        assertFalse(relationSource.contains("matchesRequestWorkspace("),
                "Relation boundary should not duplicate workspace access decisions");
        assertFalse(relationSource.contains("normalizeWorkspaceId("),
                "Relation boundary should not normalize workspace ids outside the workspace boundary");
        assertTrue(relationSource.contains("private final EntityWorkspaceAccessService entityWorkspaceAccessService"));
        assertTrue(relationSource.contains("entityWorkspaceAccessService.findAccessibleEntityById("));
        assertTrue(relationSource.contains("entityWorkspaceAccessService.findAccessibleEntityByReference("));
        assertTrue(relationSource.contains("entityWorkspaceAccessService.findEntityById("));

        assertTrue(workspaceAccessSource.contains("public Optional<ObserveEntity> findAccessibleEntityByReference("));
        assertTrue(workspaceAccessSource.contains("public Optional<ObserveEntity> findEntityById("));
        assertTrue(workspaceAccessSource.contains("entityWorkspaceQueryService.findEntityByReference("));
        assertTrue(workspaceQuerySource.contains("observeEntityDao.findFirstByWorkspaceIdAndTypeAndNamespaceAndName("));
        assertTrue(workspaceQuerySource.contains("observeEntityDao.findFirstByWorkspaceIdAndTypeAndName("));
    }
}
