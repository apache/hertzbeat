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
 * Source contract that keeps entity summary monitor/relation counts behind their owning boundaries.
 */
class EntitySummaryCountEvidenceSourceOwnershipTest {

    private static final Path ENTITY_SUMMARY_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntitySummaryReadModelService.java");
    private static final Path ENTITY_MONITOR_BIND_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMonitorBindService.java");
    private static final Path ENTITY_MONITOR_BIND_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMonitorBindQueryService.java");
    private static final Path ENTITY_RELATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityRelationService.java");
    private static final Path ENTITY_RELATION_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityRelationQueryService.java");

    @Test
    void summaryReadModelUsesDomainBoundariesForMonitorAndRelationCounts() throws Exception {
        String summarySource = Files.readString(ENTITY_SUMMARY_READ_MODEL_SERVICE);
        String monitorBindSource = Files.readString(ENTITY_MONITOR_BIND_SERVICE);
        String monitorBindQuerySource = Files.readString(ENTITY_MONITOR_BIND_QUERY_SERVICE);
        String relationSource = Files.readString(ENTITY_RELATION_SERVICE);
        String relationQuerySource = Files.readString(ENTITY_RELATION_QUERY_SERVICE);

        assertFalse(summarySource.contains("EntityMonitorBindDao"),
                "Summary read-model should not reach into monitor-bind storage directly");
        assertFalse(summarySource.contains("EntityRelationDao"),
                "Summary read-model should not reach into relation storage directly");
        assertTrue(summarySource.contains("private final EntityMonitorBindService entityMonitorBindService"));
        assertTrue(summarySource.contains("private final EntityRelationService entityRelationService"));
        assertTrue(summarySource.contains("entityMonitorBindService.countMonitorBinds(entity.getId())"));
        assertTrue(summarySource.contains("entityRelationService.countEntityRelations(entity.getId())"));

        assertTrue(monitorBindSource.contains("public long countMonitorBinds(Long entityId)"));
        assertTrue(monitorBindSource.contains("entityMonitorBindQueryService.countMonitorBinds(entityId)"));
        assertTrue(monitorBindQuerySource.contains("entityMonitorBindDao.countByEntityId(entityId)"));
        assertTrue(relationSource.contains("public long countEntityRelations(Long entityId)"));
        assertTrue(relationSource.contains("entityRelationQueryService.countEntityRelations(entityId)"));
        assertTrue(relationQuerySource.contains(
                "entityRelationDao.countBySourceEntityIdOrTargetEntityId(entityId, entityId)"));
    }
}
