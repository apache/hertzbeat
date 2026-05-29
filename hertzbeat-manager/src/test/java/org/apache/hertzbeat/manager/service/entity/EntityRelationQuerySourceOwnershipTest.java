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
 * Source contract that keeps persisted relation read evidence behind a query boundary.
 */
class EntityRelationQuerySourceOwnershipTest {

    private static final Path ENTITY_RELATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityRelationService.java");
    private static final Path ENTITY_RELATION_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityRelationQueryService.java");

    @Test
    void relationReadAndCountLookupBelongToRelationQueryBoundary() throws Exception {
        String relationSource = Files.readString(ENTITY_RELATION_SERVICE);
        assertTrue(Files.exists(ENTITY_RELATION_QUERY_SERVICE),
                "EntityRelationQueryService should own raw persisted relation lookup");
        String querySource = Files.readString(ENTITY_RELATION_QUERY_SERVICE);

        assertTrue(relationSource.contains("private final EntityRelationQueryService entityRelationQueryService"));
        assertTrue(relationSource.contains("entityRelationQueryService.findEntityRelations(entityId)"));
        assertTrue(relationSource.contains("entityRelationQueryService.countEntityRelations(entityId)"));
        assertFalse(relationSource.contains(
                        "entityRelationDao.findBySourceEntityIdOrTargetEntityId(entityId, entityId)"),
                "Relation domain service should not own raw relation evidence lookup");
        assertFalse(relationSource.contains(
                        "entityRelationDao.countBySourceEntityIdOrTargetEntityId(entityId, entityId)"),
                "Relation domain service should not own raw relation count lookup");

        assertTrue(querySource.contains("private final EntityRelationDao entityRelationDao"));
        assertTrue(querySource.contains("public List<EntityRelation> findEntityRelations(Long entityId)"));
        assertTrue(querySource.contains("entityRelationDao.findBySourceEntityIdOrTargetEntityId(entityId, entityId)"));
        assertTrue(querySource.contains("public long countEntityRelations(Long entityId)"));
        assertTrue(querySource.contains("entityRelationDao.countBySourceEntityIdOrTargetEntityId(entityId, entityId)"));
    }
}
