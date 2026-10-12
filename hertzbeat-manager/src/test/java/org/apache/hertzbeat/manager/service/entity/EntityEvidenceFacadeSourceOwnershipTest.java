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
 * Source contract that keeps entity evidence read orchestration out of the large API facade.
 */
class EntityEvidenceFacadeSourceOwnershipTest {

    private static final Path OBSERVE_ENTITY_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/ObserveEntityServiceImpl.java");
    private static final Path ENTITY_EVIDENCE_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityEvidenceReadModelService.java");

    @Test
    void observeEntityServiceImplDelegatesEvidenceReadBoundaryWithoutMonitorLookupChoreography() throws Exception {
        String source = Files.readString(OBSERVE_ENTITY_SERVICE_IMPL);
        String evidenceSource = Files.readString(ENTITY_EVIDENCE_READ_MODEL_SERVICE);

        assertTrue(source.contains("EntityEvidenceReadModelService"));
        assertTrue(source.contains("entityEvidenceReadModelService.getEntityAlerts("));
        assertTrue(source.contains("entityEvidenceReadModelService.getEntityMonitors("));

        assertTrue(evidenceSource.contains("EntityMonitorBindService"));
        assertTrue(evidenceSource.contains("EntityAlertEvidenceReadModelService"));
        assertTrue(evidenceSource.contains("EntityMonitorEvidenceReadModelService"));
        assertTrue(evidenceSource.contains("entityWorkspaceAccessService.isEntityAccessibleForRequestWorkspace(entityId)"));
        assertTrue(evidenceSource.contains("entityMonitorBindService.findEntityMonitors(entityId)"));

        assertFalse(source.contains("EntityAlertEvidenceReadModelService"));
        assertFalse(source.contains("EntityMonitorEvidenceReadModelService"));
        assertFalse(source.contains("EntityMonitorBindService"));
        assertFalse(source.contains("entityMonitorBindService.findEntityMonitors("));
        assertFalse(source.contains("entityAlertEvidenceReadModelService.buildEntityAlertPage("));
        assertFalse(source.contains("entityMonitorEvidenceReadModelService.buildEntityMonitorPage("));
        assertFalse(source.contains("private boolean isEntityAccessibleForRequestWorkspace("));
        assertFalse(source.contains("private PageRequest normalizePageRequest("));
    }
}
