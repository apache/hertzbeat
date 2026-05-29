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
 * Source contract that keeps raw request-workspace lookup out of evidence facade orchestration.
 */
class EntityEvidenceWorkspaceSourceOwnershipTest {

    private static final Path ENTITY_EVIDENCE_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityEvidenceReadModelService.java");
    private static final Path ENTITY_ALERT_EVIDENCE_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityAlertEvidenceReadModelService.java");
    private static final Path ENTITY_ALERT_EVIDENCE_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityAlertEvidenceQueryService.java");

    @Test
    void evidenceFacadeDelegatesWorkspaceLookupToAlertEvidenceBoundary() throws Exception {
        String evidenceSource = Files.readString(ENTITY_EVIDENCE_READ_MODEL_SERVICE);
        String alertEvidenceSource = Files.readString(ENTITY_ALERT_EVIDENCE_READ_MODEL_SERVICE);
        String alertQuerySource = Files.readString(ENTITY_ALERT_EVIDENCE_QUERY_SERVICE);

        assertTrue(evidenceSource.contains("entityWorkspaceAccessService.isEntityAccessibleForRequestWorkspace(entityId)"));
        assertTrue(evidenceSource.contains("entityMonitorBindService.findEntityMonitors(entityId)"));
        assertFalse(evidenceSource.contains("currentRequestWorkspaceId()"),
                "EntityEvidenceReadModelService should not thread raw request workspace ids");
        assertTrue(evidenceSource.contains("entityAlertEvidenceReadModelService.buildEntityAlertPage(\n"
                + "                monitors, status, severity, pageIndex, pageSize)"));
        assertFalse(evidenceSource.contains("entityAlertEvidenceReadModelService.buildEntityAlertPage(\n"
                + "                monitors, status, severity, pageIndex, pageSize,"),
                "Evidence facade should use the alert evidence request-workspace overload");

        assertFalse(alertEvidenceSource.contains("EntityWorkspaceAccessService"),
                "Alert evidence read model should not own current request workspace lookup");
        assertFalse(alertEvidenceSource.contains("currentRequestWorkspaceId()"),
                "Alert evidence read model should delegate default request workspace lookup to the query boundary");
        assertTrue(alertEvidenceSource.contains("buildEntityAlertPage(List<Monitor> monitors, String status, "
                + "String severity,\n"
                + "                                                  int pageIndex, int pageSize)"));
        assertTrue(alertQuerySource.contains("EntityWorkspaceAccessService"));
        assertTrue(alertQuerySource.contains("entityWorkspaceAccessService.currentRequestWorkspaceId()"));
    }
}
