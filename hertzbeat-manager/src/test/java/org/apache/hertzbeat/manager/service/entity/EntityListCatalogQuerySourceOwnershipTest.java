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
 * Source contract that keeps catalog page query construction out of list summary assembly.
 */
class EntityListCatalogQuerySourceOwnershipTest {

    private static final Path ENTITY_LIST_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityListReadModelService.java");
    private static final Path ENTITY_CATALOG_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityCatalogQueryService.java");
    private static final Path ENTITY_WORKSPACE_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityWorkspaceQueryService.java");

    @Test
    void listReadModelDelegatesCatalogPageQueryToCatalogQueryBoundary() throws Exception {
        String listSource = Files.readString(ENTITY_LIST_READ_MODEL_SERVICE);

        assertFalse(listSource.contains("ObserveEntityDao"),
                "Entity list read-model should not own catalog storage access");
        assertFalse(listSource.contains("Specification<ObserveEntity>"),
                "Entity list read-model should not own JPA query specifications");
        assertFalse(listSource.contains("CriteriaBuilder"),
                "Entity list read-model should not build catalog filter predicates");
        assertFalse(listSource.contains("buildEntitySpecification"),
                "Entity list read-model should delegate catalog filtering");
        assertFalse(listSource.contains("buildSearchPredicates"),
                "Entity list read-model should delegate search predicate construction");
        assertFalse(listSource.contains("Longs.tryParse"),
                "Entity list read-model should not own numeric id search parsing");
        assertTrue(listSource.contains("private final EntityCatalogQueryService entityCatalogQueryService"));
        assertTrue(listSource.contains("entityCatalogQueryService.findEntityPage("));

        assertTrue(Files.exists(ENTITY_CATALOG_QUERY_SERVICE),
                "Catalog query boundary should own the entity page query contract");
        String querySource = Files.readString(ENTITY_CATALOG_QUERY_SERVICE);
        assertFalse(querySource.contains("import org.apache.hertzbeat.manager.dao.ObserveEntityDao"),
                "Catalog query should build the page contract but not own raw catalog-row DAO access");
        assertFalse(querySource.contains("private final ObserveEntityDao observeEntityDao"),
                "Raw catalog-row storage access should stay behind EntityWorkspaceQueryService");
        assertFalse(querySource.contains("observeEntityDao.findAll("),
                "Catalog query should delegate raw page query execution to the workspace query boundary");
        assertTrue(querySource.contains("private final EntityWorkspaceQueryService entityWorkspaceQueryService"));
        assertTrue(querySource.contains("public Page<ObserveEntity> findEntityPage("));
        assertTrue(querySource.contains("entityWorkspaceQueryService.findEntityPage("));
        assertTrue(querySource.contains("buildEntitySpecification"));
        assertTrue(querySource.contains("buildSearchPredicates"));
        assertTrue(querySource.contains("TYPE_API"));
        assertTrue(querySource.contains("TYPE_ENDPOINT"));
        assertTrue(querySource.contains("Longs.tryParse(search)"));

        String workspaceQuerySource = Files.readString(ENTITY_WORKSPACE_QUERY_SERVICE);
        assertTrue(workspaceQuerySource.contains("private final ObserveEntityDao observeEntityDao"));
        assertTrue(workspaceQuerySource.contains("public Page<ObserveEntity> findEntityPage("));
        assertTrue(workspaceQuerySource.contains("observeEntityDao.findAll(specification, pageable)"));
    }
}
