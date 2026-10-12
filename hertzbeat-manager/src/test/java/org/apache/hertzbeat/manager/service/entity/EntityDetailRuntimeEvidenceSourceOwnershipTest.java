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
 * Source contract that keeps entity detail runtime evidence collection behind the status refresh boundary.
 */
class EntityDetailRuntimeEvidenceSourceOwnershipTest {

    private static final Path ENTITY_DETAIL_OBSERVABILITY_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDetailObservabilityReadModelService.java");
    private static final Path ENTITY_STATUS_REFRESH_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityStatusRefreshService.java");

    @Test
    void detailObservabilityReadModelUsesStatusRefreshBoundaryForRuntimeEvidence() throws Exception {
        String detailSource = Files.readString(ENTITY_DETAIL_OBSERVABILITY_READ_MODEL_SERVICE);
        String statusRefreshSource = Files.readString(ENTITY_STATUS_REFRESH_SERVICE);

        assertFalse(detailSource.contains("private final EntityMonitorBindService entityMonitorBindService"),
                "Detail observability assembly should not own bound-monitor lookup");
        assertFalse(detailSource.contains("private final EntityAlertEvidenceReadModelService entityAlertEvidenceReadModelService"),
                "Detail observability assembly should not own active-alert lookup");
        assertFalse(detailSource.contains("private final EntityRuntimeHealthService entityRuntimeHealthService"),
                "Detail observability assembly should not own runtime-health persistence");
        assertFalse(detailSource.contains("entityMonitorBindService.findEntityMonitors(entityId)"));
        assertFalse(detailSource.contains("entityAlertEvidenceReadModelService.queryActiveAlerts("));
        assertFalse(detailSource.contains("entityRuntimeHealthService.refreshEntityStatus(entity, monitors, activeAlerts)"));

        assertTrue(detailSource.contains("private final EntityStatusRefreshService entityStatusRefreshService"));
        assertTrue(detailSource.contains("EntityStatusRefreshService.EntityRuntimeStatusEvidence runtimeEvidence"));
        assertTrue(detailSource.contains("entityStatusRefreshService.refreshEntityStatusWithEvidence(entity, requestWorkspaceId)"));
        assertTrue(detailSource.contains("runtimeEvidence.monitors()"));
        assertTrue(detailSource.contains("runtimeEvidence.activeAlerts()"));
        assertTrue(detailSource.contains("runtimeEvidence.statusInfo()"));

        assertTrue(statusRefreshSource.contains("public EntityRuntimeStatusEvidence refreshEntityStatusWithEvidence("));
        assertTrue(statusRefreshSource.contains("public record EntityRuntimeStatusEvidence("));
        assertTrue(statusRefreshSource.contains("List<Monitor> monitors"));
        assertTrue(statusRefreshSource.contains("List<SingleAlert> activeAlerts"));
        assertTrue(statusRefreshSource.contains("EntityStatusInfo statusInfo"));
    }
}
