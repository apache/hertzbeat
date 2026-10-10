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
 * Source contract that keeps raw relation persistence behind a write-model boundary.
 */
class EntityRelationWriteModelSourceOwnershipTest {

    private static final Path ENTITY_RELATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityRelationService.java");
    private static final Path ENTITY_RELATION_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityRelationWriteModelService.java");

    @Test
    void relationPersistenceBelongsToRelationWriteModelBoundary() throws Exception {
        String relationSource = Files.readString(ENTITY_RELATION_SERVICE);
        assertTrue(Files.exists(ENTITY_RELATION_WRITE_MODEL_SERVICE),
                "EntityRelationWriteModelService should own raw relation persistence");
        String writeModelSource = Files.readString(ENTITY_RELATION_WRITE_MODEL_SERVICE);

        assertTrue(relationSource.contains("private final EntityRelationWriteModelService entityRelationWriteModelService"));
        assertTrue(relationSource.contains("entityRelationWriteModelService.deleteIncomingAndOutgoingRelations(entityId)"));
        assertTrue(relationSource.contains("entityRelationWriteModelService.replaceSourceRelations(entityId, rows)"));
        assertFalse(relationSource.contains("EntityRelationDao"),
                "Relation domain service should not import raw relation storage");
        assertFalse(relationSource.contains("entityRelationDao."),
                "Relation domain service should not call raw relation storage");

        assertTrue(writeModelSource.contains("private final EntityRelationDao entityRelationDao"));
        assertTrue(writeModelSource.contains("public void deleteIncomingAndOutgoingRelations(Long entityId)"));
        assertTrue(writeModelSource.contains("entityRelationDao.deleteAllBySourceEntityIdOrTargetEntityId(entityId, entityId)"));
        assertTrue(writeModelSource.contains("public void replaceSourceRelations(Long entityId, List<EntityRelation> rows)"));
        assertTrue(writeModelSource.contains("entityRelationDao.deleteAllBySourceEntityId(entityId)"));
        assertTrue(writeModelSource.contains("entityRelationDao.flush()"));
        assertTrue(writeModelSource.contains("entityRelationDao.saveAll(rows)"));
    }
}
