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
 * Source contract that keeps shared governance workspace lookup out of the large entity service.
 */
class EntityGovernanceWorkflowSourceOwnershipTest {

    private static final Path OBSERVE_ENTITY_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/ObserveEntityServiceImpl.java");

    @Test
    void observeEntityServiceImplDelegatesGovernanceWorkflowWithoutDirectStateBoundary() throws Exception {
        String source = Files.readString(OBSERVE_ENTITY_SERVICE_IMPL);

        assertTrue(source.contains("EntityGovernanceWorkflowService"));
        assertTrue(source.contains("entityGovernanceWorkflowService.getDefinitionWorkspaceTemplates(templateId, limit)"));
        assertTrue(source.contains("entityGovernanceWorkflowService.saveDefinitionWorkspaceTemplate(templateInfo)"));
        assertTrue(source.contains("entityGovernanceWorkflowService.getDefinitionWorkspaceActivities(activityId, limit)"));
        assertTrue(source.contains("entityGovernanceWorkflowService.saveDefinitionWorkspaceResume(resumeInfo)"));
        assertTrue(source.contains("entityGovernanceWorkflowService.getDiscoveryGovernancePresets(limit)"));
        assertTrue(source.contains("entityGovernanceWorkflowService.saveDiscoveryGovernanceActivity(activityInfo)"));
        assertFalse(source.contains("EntityGovernanceStateService"));
        assertFalse(source.contains("entityGovernanceStateService."));
    }
}
