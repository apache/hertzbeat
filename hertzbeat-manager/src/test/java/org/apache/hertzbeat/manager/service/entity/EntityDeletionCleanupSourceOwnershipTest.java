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
 * Source contract that keeps deletion cleanup inside the owning entity boundaries.
 */
class EntityDeletionCleanupSourceOwnershipTest {

    private static final Path ENTITY_DELETION_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDeletionWriteModelService.java");
    private static final Path ENTITY_MONITOR_BIND_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMonitorBindService.java");
    private static final Path ENTITY_MONITOR_BIND_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMonitorBindWriteModelService.java");
    private static final Path ENTITY_RELATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityRelationService.java");
    private static final Path ENTITY_RELATION_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityRelationWriteModelService.java");

    @Test
    void deletionCleanupIsOwnedByMonitorBindAndRelationBoundaries() throws Exception {
        String deletionSource = Files.readString(ENTITY_DELETION_WRITE_MODEL_SERVICE);
        String monitorBindSource = Files.readString(ENTITY_MONITOR_BIND_SERVICE);
        String monitorBindWriteModelSource = Files.readString(ENTITY_MONITOR_BIND_WRITE_MODEL_SERVICE);
        String relationSource = Files.readString(ENTITY_RELATION_SERVICE);
        String relationWriteModelSource = Files.readString(ENTITY_RELATION_WRITE_MODEL_SERVICE);

        assertFalse(deletionSource.contains("EntityMonitorBindDao"),
                "Deletion write-model should not reach through to monitor-bind storage directly");
        assertFalse(deletionSource.contains("EntityRelationDao"),
                "Deletion write-model should not reach through to relation storage directly");
        assertTrue(deletionSource.contains("private final EntityMonitorBindService entityMonitorBindService"));
        assertTrue(deletionSource.contains("private final EntityRelationService entityRelationService"));
        assertTrue(deletionSource.contains("entityMonitorBindService.deleteMonitorBinds(entityId)"));
        assertTrue(deletionSource.contains("entityRelationService.deleteRelationsForEntity(entityId)"));

        assertTrue(monitorBindSource.contains("public void deleteMonitorBinds(Long entityId)"));
        assertTrue(monitorBindSource.contains("entityMonitorBindWriteModelService.deleteMonitorBinds(entityId)"));
        assertTrue(monitorBindWriteModelSource.contains("entityMonitorBindDao.deleteAllByEntityId(entityId)"));
        assertTrue(monitorBindWriteModelSource.contains("entityMonitorBindDao.flush()"));
        assertTrue(relationSource.contains("public void deleteRelationsForEntity(Long entityId)"));
        assertTrue(relationSource.contains("entityRelationWriteModelService.deleteIncomingAndOutgoingRelations(entityId)"));
        assertTrue(relationWriteModelSource.contains(
                "entityRelationDao.deleteAllBySourceEntityIdOrTargetEntityId(entityId, entityId)"));
    }
}
