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
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/**
 * Source contract that keeps entity list workspace scoping inside the catalog query boundary.
 */
class EntityListWorkspaceSourceOwnershipTest {

    private static final Path ENTITY_LIST_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityListReadModelService.java");
    private static final Path ENTITY_CATALOG_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityCatalogQueryService.java");

    @Test
    void listReadModelDelegatesDefaultWorkspaceResolutionToCatalogQueryBoundary() throws Exception {
        String listSource = Files.readString(ENTITY_LIST_READ_MODEL_SERVICE);
        String querySource = Files.readString(ENTITY_CATALOG_QUERY_SERVICE);

        assertFalse(listSource.contains("private final EntityWorkspaceAccessService entityWorkspaceAccessService"),
                "Entity list read-model should not own request-workspace lookup");
        assertFalse(listSource.contains("entityWorkspaceAccessService.currentRequestWorkspaceId()"),
                "Entity list read-model should not thread raw request workspace ids");
        assertFalse(listSource.contains("entityWorkspaceAccessService.filterEntitiesByRequestWorkspace"),
                "Entity list read-model should not post-filter persisted catalog rows");

        assertEquals(2, listSource.split("entityCatalogQueryService\\.findEntityPage\\(", -1).length - 1,
                "Both entity-list overloads should delegate to the catalog query boundary");
        assertTrue(listSource.contains("int safePageIndex = normalizePageIndex(pageIndex);"),
                "Entity list read-model should normalize page indexes before catalog queries");
        assertTrue(listSource.contains("int safePageSize = normalizePageSize(pageSize);"),
                "Entity list read-model should normalize page sizes before catalog queries");

        assertTrue(querySource.contains("private final EntityWorkspaceAccessService entityWorkspaceAccessService"),
                "Catalog query boundary should own request-workspace lookup for entity list pages");
        assertTrue(querySource.contains("entityWorkspaceAccessService.currentRequestWorkspaceId()"),
                "Catalog query boundary should bind default entity list pages to the current request workspace");
        assertTrue(querySource.contains("entityWorkspaceAccessService.filterEntitiesByRequestWorkspace"),
                "Catalog query boundary should own workspace-safe page row filtering");
    }
}
