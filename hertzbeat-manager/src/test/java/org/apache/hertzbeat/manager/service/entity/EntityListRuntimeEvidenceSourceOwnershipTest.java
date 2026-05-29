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
 * Source contract that keeps entity list runtime evidence collection behind the status refresh boundary.
 */
class EntityListRuntimeEvidenceSourceOwnershipTest {

    private static final Path ENTITY_LIST_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityListReadModelService.java");
    private static final Path ENTITY_STATUS_REFRESH_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityStatusRefreshService.java");

    @Test
    void listReadModelUsesStatusRefreshBoundaryForRuntimeEvidence() throws Exception {
        String listSource = Files.readString(ENTITY_LIST_READ_MODEL_SERVICE);
        String statusRefreshSource = Files.readString(ENTITY_STATUS_REFRESH_SERVICE);

        assertFalse(listSource.contains("private final EntityMonitorBindService entityMonitorBindService"),
                "List read-model should not own bound-monitor lookup");
        assertFalse(listSource.contains("private final EntityAlertEvidenceReadModelService entityAlertEvidenceReadModelService"),
                "List read-model should not own active-alert lookup");
        assertFalse(listSource.contains("private final EntityRuntimeHealthService entityRuntimeHealthService"),
                "List read-model should not own runtime-health persistence");
        assertFalse(listSource.contains("entityMonitorBindService.findEntityMonitors(entity.getId())"));
        assertFalse(listSource.contains("entityAlertEvidenceReadModelService.queryActiveAlerts("));
        assertFalse(listSource.contains("entityRuntimeHealthService.refreshEntityStatus(entity, monitors, activeAlerts)"));

        assertTrue(listSource.contains("private final EntityStatusRefreshService entityStatusRefreshService"));
        assertTrue(listSource.contains("EntityStatusRefreshService.EntityRuntimeStatusEvidence runtimeEvidence"));
        assertTrue(listSource.contains("entityStatusRefreshService.refreshEntityStatusWithEvidence(entity, requestWorkspaceId)"));
        assertTrue(listSource.contains("runtimeEvidence.monitors()"));
        assertTrue(listSource.contains("runtimeEvidence.statusInfo()"));

        assertTrue(statusRefreshSource.contains("public EntityRuntimeStatusEvidence refreshEntityStatusWithEvidence("));
        assertTrue(statusRefreshSource.contains("public record EntityRuntimeStatusEvidence("));
        assertTrue(statusRefreshSource.contains("List<Monitor> monitors"));
        assertTrue(statusRefreshSource.contains("List<SingleAlert> activeAlerts"));
        assertTrue(statusRefreshSource.contains("EntityStatusInfo statusInfo"));
    }
}
