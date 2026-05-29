/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
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
 * Source contract that keeps request-workspace lookup at entity evidence boundaries.
 */
class EntityDetailObservabilityWorkspaceSourceOwnershipTest {

    private static final Path ENTITY_DETAIL_OBSERVABILITY_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDetailObservabilityReadModelService.java");
    private static final Path ENTITY_NOISE_CONTROL_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityNoiseControlReadModelService.java");

    @Test
    void detailObservabilityAssemblyDoesNotOwnRequestWorkspaceLookup() throws Exception {
        String detailSource = Files.readString(ENTITY_DETAIL_OBSERVABILITY_READ_MODEL_SERVICE);
        String noiseSource = Files.readString(ENTITY_NOISE_CONTROL_READ_MODEL_SERVICE);

        assertFalse(detailSource.contains("private final EntityWorkspaceAccessService entityWorkspaceAccessService"),
                "Entity detail observability assembly should not own request-workspace lookup");
        assertFalse(detailSource.contains("entityWorkspaceAccessService.currentRequestWorkspaceId()"),
                "Entity detail observability assembly should not thread raw request workspace ids");

        assertTrue(detailSource.contains("entityStatusRefreshService.refreshEntityStatusWithEvidence(entity)"),
                "Runtime evidence should resolve request workspace at the status-refresh boundary");
        assertTrue(detailSource.contains("entityNoiseControlReadModelService.buildNoiseControlSummary("),
                "Noise-control evidence should resolve request workspace at its own read-model boundary");
        assertTrue(detailSource.contains("entityActivityReadModelService.getDefinitionActivities(entityId, 12)"),
                "Definition activity evidence should resolve request workspace at the activity query boundary");

        assertTrue(noiseSource.contains("private final EntityWorkspaceAccessService entityWorkspaceAccessService"),
                "Noise-control read model should own request-workspace lookup for silence/inhibit evidence");
        assertTrue(noiseSource.contains("entityWorkspaceAccessService.currentRequestWorkspaceId()"),
                "Noise-control read model should bind default evidence reads to the current request workspace");
    }
}
