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
 * Source contract that keeps raw catalog lookup behind the workspace query boundary.
 */
class EntityWorkspaceQuerySourceOwnershipTest {

    private static final Path ENTITY_WORKSPACE_ACCESS_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityWorkspaceAccessService.java");
    private static final Path ENTITY_WORKSPACE_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityWorkspaceQueryService.java");

    @Test
    void workspaceAccessDelegatesRawCatalogLookupToQueryBoundary() throws Exception {
        String accessSource = Files.readString(ENTITY_WORKSPACE_ACCESS_SERVICE);

        assertTrue(Files.exists(ENTITY_WORKSPACE_QUERY_SERVICE),
                "EntityWorkspaceQueryService should own raw entity catalog lookup");
        String querySource = Files.readString(ENTITY_WORKSPACE_QUERY_SERVICE);

        assertFalse(accessSource.contains("import org.apache.hertzbeat.manager.dao.ObserveEntityDao"),
                "Workspace access should not import the entity DAO directly");
        assertFalse(accessSource.contains("private final ObserveEntityDao observeEntityDao"),
                "Workspace access should not own raw catalog storage access");
        assertFalse(accessSource.contains("observeEntityDao."),
                "Workspace access should not call the entity DAO directly");

        assertTrue(accessSource.contains("private final EntityWorkspaceQueryService entityWorkspaceQueryService"));
        assertTrue(accessSource.contains("entityWorkspaceQueryService.findEntitiesByIds(acceptedEntityIds)"));
        assertTrue(accessSource.contains("entityWorkspaceQueryService.findEntities(normalizedWorkspaceId, sort)"));
        assertTrue(accessSource.contains("entityWorkspaceQueryService.findEntityById(entityId)"));
        assertTrue(accessSource.contains("entityWorkspaceQueryService.findEntityByReference("));
        assertTrue(accessSource.contains("entityWorkspaceQueryService.findEntityByName(normalizedWorkspaceId, name)"));
        assertTrue(accessSource.contains("normalizedWorkspaceId, type, namespace, name"));
        assertTrue(accessSource.contains("normalizedWorkspaceId, type, name"));

        assertTrue(querySource.contains("import org.apache.hertzbeat.manager.dao.ObserveEntityDao"));
        assertTrue(querySource.contains("private final ObserveEntityDao observeEntityDao"));
        assertTrue(querySource.contains("public List<ObserveEntity> findEntitiesByIds(Collection<Long> entityIds)"));
        assertTrue(querySource.contains("observeEntityDao.findAllById(entityIds)"));
        assertTrue(querySource.contains("public List<ObserveEntity> findEntities(String workspaceId, Sort sort)"));
        assertTrue(querySource.contains("observeEntityDao.findAllByWorkspaceId(workspaceId, sort)"));
        assertTrue(querySource.contains("observeEntityDao.findAll(sort)"));
        assertTrue(querySource.contains("public Optional<ObserveEntity> findEntityById(long entityId)"));
        assertTrue(querySource.contains("observeEntityDao.findById(entityId)"));
        assertTrue(querySource.contains("public Optional<ObserveEntity> findEntityByReference(String workspaceId,"));
        assertTrue(querySource.contains("String namespace,"));
        assertTrue(querySource.contains("observeEntityDao.findFirstByWorkspaceIdAndTypeAndNamespaceAndName("));
        assertTrue(querySource.contains("workspaceId, type, namespace, name"));
        assertTrue(querySource.contains("observeEntityDao.findFirstByTypeAndNamespaceAndName(type, namespace, name)"));
        assertTrue(querySource.contains(
                "public Optional<ObserveEntity> findEntityByReference(String workspaceId, String type, String name)"));
        assertTrue(querySource.contains(
                "observeEntityDao.findFirstByWorkspaceIdAndTypeAndName(workspaceId, type, name)"));
        assertTrue(querySource.contains("observeEntityDao.findFirstByTypeAndName(type, name)"));
        assertTrue(querySource.contains("public Optional<ObserveEntity> findEntityByName(String workspaceId, String name)"));
        assertTrue(querySource.contains("observeEntityDao.findFirstByWorkspaceIdAndName(workspaceId, name)"));
        assertTrue(querySource.contains("observeEntityDao.findFirstByName(name)"));
    }
}
