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
 * Source contract that keeps governance workflow workspace lookup inside the persisted-state boundary.
 */
class EntityGovernanceWorkflowWorkspaceSourceOwnershipTest {

    private static final Path ENTITY_GOVERNANCE_WORKFLOW_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityGovernanceWorkflowService.java");

    @Test
    void governanceWorkflowDelegatesWorkspaceLookupToStateBoundary() throws Exception {
        String source = Files.readString(ENTITY_GOVERNANCE_WORKFLOW_SERVICE);

        assertFalse(source.contains("EntityWorkspaceAccessService"),
                "EntityGovernanceWorkflowService should not own request workspace lookup");
        assertFalse(source.contains("currentRequestWorkspaceId()"),
                "EntityGovernanceWorkflowService should not thread request workspace ids");
        assertTrue(source.contains("entityGovernanceStateService.getDefinitionWorkspaceTemplates(templateId, limit)"));
        assertTrue(source.contains("entityGovernanceStateService.saveDefinitionWorkspaceTemplate(templateInfo)"));
        assertTrue(source.contains("entityGovernanceStateService.deleteDefinitionWorkspaceTemplate(templateId)"));
        assertTrue(source.contains("entityGovernanceStateService.getDefinitionWorkspaceActivities(activityId, limit)"));
        assertTrue(source.contains("entityGovernanceStateService.saveDefinitionWorkspaceActivity(activityInfo)"));
        assertTrue(source.contains("entityGovernanceStateService.getDefinitionWorkspaceResume(resumeToken)"));
        assertTrue(source.contains("entityGovernanceStateService.saveDefinitionWorkspaceResume(resumeInfo)"));
        assertTrue(source.contains("entityGovernanceStateService.deleteDefinitionWorkspaceResume(resumeToken)"));
        assertTrue(source.contains("entityGovernanceStateService.getDiscoveryGovernancePresets(limit)"));
        assertTrue(source.contains("entityGovernanceStateService.saveDiscoveryGovernancePreset(presetInfo)"));
        assertTrue(source.contains("entityGovernanceStateService.deleteDiscoveryGovernancePreset(presetId)"));
        assertTrue(source.contains("entityGovernanceStateService.getDiscoveryGovernanceActivities(activityId, limit)"));
        assertTrue(source.contains("entityGovernanceStateService.saveDiscoveryGovernanceActivity(activityInfo)"));
    }
}
