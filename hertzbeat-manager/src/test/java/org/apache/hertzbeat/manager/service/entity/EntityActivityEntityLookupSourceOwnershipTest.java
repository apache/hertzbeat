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
 * Source contract that keeps activity entity workspace fallback lookup behind the workspace boundary.
 */
class EntityActivityEntityLookupSourceOwnershipTest {

    private static final Path ENTITY_ACTIVITY_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityActivityWriteModelService.java");
    private static final Path ENTITY_ACTIVITY_RECORD_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityActivityRecordWriteModelService.java");
    private static final Path ENTITY_WORKSPACE_ACCESS_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityWorkspaceAccessService.java");
    private static final Path ENTITY_WORKSPACE_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityWorkspaceQueryService.java");

    @Test
    void activityWriteModelDelegatesStoredEntityLookupToWorkspaceAccessBoundary() throws Exception {
        String activitySource = Files.readString(ENTITY_ACTIVITY_WRITE_MODEL_SERVICE);
        String recordSource = Files.readString(ENTITY_ACTIVITY_RECORD_WRITE_MODEL_SERVICE);
        String workspaceSource = Files.readString(ENTITY_WORKSPACE_ACCESS_SERVICE);
        String querySource = Files.readString(ENTITY_WORKSPACE_QUERY_SERVICE);

        assertFalse(activitySource.contains("ObserveEntityDao"),
                "Activity write-model should not reach through to entity storage directly");
        assertFalse(activitySource.contains("observeEntityDao"),
                "Activity write-model should use the workspace access boundary for stored entity fallback lookup");
        assertFalse(activitySource.contains("entityWorkspaceAccessService.findEntityById(entityId)"),
                "Activity write-model should delegate stored entity fallback lookup to the record write boundary");
        assertTrue(activitySource.contains("private final EntityActivityRecordWriteModelService "
                + "entityActivityRecordWriteModelService"));

        assertTrue(recordSource.contains("private final EntityWorkspaceAccessService entityWorkspaceAccessService"));
        assertTrue(recordSource.contains("entityWorkspaceAccessService.findEntityById(entityId)"));

        assertTrue(workspaceSource.contains("public Optional<ObserveEntity> findEntityById(long entityId)"));
        assertTrue(workspaceSource.contains("entityWorkspaceQueryService.findEntityById(entityId)"));
        assertTrue(querySource.contains("observeEntityDao.findById(entityId)"));
    }
}
