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
        assertTrue(querySource.contains("for (String normalizedSearch : normalizeSearchTextVariants(search))"),
                "Catalog search should normalize exact copied endpoint names before predicate construction");
        assertTrue(querySource.contains("URLDecoder.decode(trimmedSearch, StandardCharsets.UTF_8)"),
                "Catalog search should tolerate URL-encoded copied endpoint names from the BFF boundary");
        assertTrue(querySource.contains("normalizedSearch.replace(\"localhost\", \"127.0.0.1\")"),
                "Catalog search should treat localhost and loopback endpoint names as equivalent");
        assertTrue(querySource.contains("criteriaBuilder.equal(criteriaBuilder.lower(root.get(\"name\")), normalizedSearch)"),
                "Catalog search should exact-match entity names such as copied endpoint IP:port values");
        assertTrue(querySource.contains(
                "criteriaBuilder.equal(criteriaBuilder.lower(root.get(\"displayName\")), normalizedSearch)"),
                "Catalog search should exact-match display names before falling back to fuzzy LIKE");
        assertTrue(querySource.contains("normalizedSearch.split(\"[^a-z0-9]+\")"),
                "Catalog search should tokenize copied endpoint names such as 127.0.0.1:18608");
        assertTrue(querySource.contains("criteriaBuilder.and(nameTokenPredicates.toArray(new Predicate[0]))"),
                "Catalog search should require all copied endpoint name tokens to match the same field");
        assertTrue(querySource.contains("TYPE_API"));
        assertTrue(querySource.contains("TYPE_ENDPOINT"));
        assertTrue(querySource.contains("Longs.tryParse(search)"));

        String workspaceQuerySource = Files.readString(ENTITY_WORKSPACE_QUERY_SERVICE);
        assertTrue(workspaceQuerySource.contains("private final ObserveEntityDao observeEntityDao"));
        assertTrue(workspaceQuerySource.contains("public Page<ObserveEntity> findEntityPage("));
        assertTrue(workspaceQuerySource.contains("observeEntityDao.findAll(specification, pageable)"));
    }
}
