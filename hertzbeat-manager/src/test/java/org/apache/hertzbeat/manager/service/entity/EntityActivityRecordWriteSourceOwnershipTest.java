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
 * Source contract that keeps persisted activity row writes behind a dedicated record boundary.
 */
class EntityActivityRecordWriteSourceOwnershipTest {

    private static final Path ENTITY_ACTIVITY_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityActivityWriteModelService.java");
    private static final Path ENTITY_ACTIVITY_RECORD_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityActivityRecordWriteModelService.java");

    @Test
    void activityWriteModelDelegatesRawRecordPersistenceToRecordBoundary() throws Exception {
        String activitySource = Files.readString(ENTITY_ACTIVITY_WRITE_MODEL_SERVICE);

        assertTrue(Files.exists(ENTITY_ACTIVITY_RECORD_WRITE_MODEL_SERVICE),
                "EntityActivityRecordWriteModelService should own raw activity row persistence");
        String recordSource = Files.readString(ENTITY_ACTIVITY_RECORD_WRITE_MODEL_SERVICE);

        assertFalse(activitySource.contains("import org.apache.hertzbeat.manager.dao.EntityDefinitionActivityDao"),
                "Activity write-model should not import the definition activity DAO");
        assertFalse(activitySource.contains("private final EntityDefinitionActivityDao entityDefinitionActivityDao"),
                "Activity write-model should not keep raw activity persistence state");
        assertFalse(activitySource.contains("entityDefinitionActivityDao."),
                "Activity write-model should not flush raw activity rows directly");
        assertFalse(activitySource.contains("private final EntityWorkspaceAccessService entityWorkspaceAccessService"),
                "Activity write-model should not own request-workspace lookup for persistence");
        assertFalse(activitySource.contains("currentRequestWorkspaceId()"),
                "Activity write-model should let the persisted record boundary bind current request workspace");
        assertFalse(activitySource.contains("findEntityById(entityId)"),
                "Activity write-model should not perform stored-entity workspace fallback lookup");

        assertTrue(activitySource.contains(
                "private final EntityActivityRecordWriteModelService entityActivityRecordWriteModelService"));
        assertTrue(activitySource.contains("entityActivityRecordWriteModelService.recordActivity("));
        assertTrue(activitySource.contains("entityActivityRecordWriteModelService.recordActivityForCurrentWorkspace("));

        assertTrue(recordSource.contains("import org.apache.hertzbeat.manager.dao.EntityDefinitionActivityDao"));
        assertTrue(recordSource.contains("private final EntityDefinitionActivityDao entityDefinitionActivityDao"));
        assertTrue(recordSource.contains("private final EntityWorkspaceAccessService entityWorkspaceAccessService"));
        assertTrue(recordSource.contains("entityWorkspaceAccessService.currentRequestWorkspaceId()"));
        assertTrue(recordSource.contains("entityWorkspaceAccessService.findEntityById(entityId)"));
        assertTrue(recordSource.contains("AuthTokenScopes.normalizeWorkspaceId("));
        assertTrue(recordSource.contains("entityDefinitionActivityDao.saveAndFlush("));
    }
}
