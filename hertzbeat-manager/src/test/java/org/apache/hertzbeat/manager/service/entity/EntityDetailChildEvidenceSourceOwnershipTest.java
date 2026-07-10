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
 * Source contract that keeps entity detail child evidence behind the owning boundaries.
 */
class EntityDetailChildEvidenceSourceOwnershipTest {

    private static final Path ENTITY_DETAIL_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDetailReadModelService.java");
    private static final Path ENTITY_MONITOR_BIND_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMonitorBindService.java");
    private static final Path ENTITY_MONITOR_BIND_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMonitorBindQueryService.java");
    private static final Path ENTITY_RELATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityRelationService.java");
    private static final Path ENTITY_RELATION_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityRelationQueryService.java");

    @Test
    void detailReadModelUsesMonitorBindAndRelationBoundariesForChildEvidence() throws Exception {
        String detailSource = Files.readString(ENTITY_DETAIL_READ_MODEL_SERVICE);
        String monitorBindSource = Files.readString(ENTITY_MONITOR_BIND_SERVICE);
        String monitorBindQuerySource = Files.readString(ENTITY_MONITOR_BIND_QUERY_SERVICE);
        String relationSource = Files.readString(ENTITY_RELATION_SERVICE);
        String relationQuerySource = Files.readString(ENTITY_RELATION_QUERY_SERVICE);

        assertFalse(detailSource.contains("EntityMonitorBindDao"),
                "Detail read-model should not reach through to monitor-bind storage directly");
        assertFalse(detailSource.contains("EntityRelationDao"),
                "Detail read-model should not reach through to relation storage directly");
        assertTrue(detailSource.contains("private final EntityMonitorBindService entityMonitorBindService"));
        assertTrue(detailSource.contains("private final EntityRelationService entityRelationService"));
        assertTrue(detailSource.contains("entityMonitorBindService.findMonitorBinds(entityId)"));
        assertTrue(detailSource.contains("entityRelationService.findEntityRelations(entityId)"));
        assertTrue(detailSource.contains("entityRelationService.findEntityRelations(entityId, relationPreviewLimit)"));
        assertTrue(detailSource.contains("entityRelationService.countEntityRelations(entityId)"));

        assertTrue(monitorBindSource.contains("public List<EntityMonitorBind> findMonitorBinds(Long entityId)"));
        assertTrue(monitorBindSource.contains("entityMonitorBindQueryService.findMonitorBinds(entityId)"));
        assertTrue(monitorBindQuerySource.contains("entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(entityId)"));
        assertTrue(relationSource.contains("public List<EntityRelation> findEntityRelations(Long entityId)"));
        assertTrue(relationSource.contains("public List<EntityRelation> findEntityRelations(Long entityId, int limit)"));
        assertTrue(relationSource.contains("entityRelationQueryService.findEntityRelations(entityId)"));
        assertTrue(relationSource.contains("entityRelationQueryService.findEntityRelations(entityId, limit)"));
        assertTrue(relationQuerySource.contains(
                "entityRelationDao.findBySourceEntityIdOrTargetEntityId(entityId, entityId)"));
        assertTrue(relationQuerySource.contains("PageRequest.of(0, limit"));
    }
}
