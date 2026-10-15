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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceResumeInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceTemplateInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernanceActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernancePresetInfo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for workspace-scoped entity governance workflow orchestration.
 */
@ExtendWith(MockitoExtension.class)
class EntityGovernanceWorkflowServiceTest {

    @InjectMocks
    private EntityGovernanceWorkflowService entityGovernanceWorkflowService;

    @Mock
    private EntityGovernanceStateService entityGovernanceStateService;

    @Test
    void definitionWorkspaceReadsUseCurrentRequestWorkspace() {
        EntityDefinitionWorkspaceTemplateInfo template = new EntityDefinitionWorkspaceTemplateInfo();
        template.setId("template-a");
        when(entityGovernanceStateService.getDefinitionWorkspaceTemplates("template-a", 8))
                .thenReturn(List.of(template));

        List<EntityDefinitionWorkspaceTemplateInfo> templates =
                entityGovernanceWorkflowService.getDefinitionWorkspaceTemplates("template-a", 8);

        assertEquals("template-a", templates.getFirst().getId());
        verify(entityGovernanceStateService).getDefinitionWorkspaceTemplates("template-a", 8);
    }

    @Test
    void definitionWorkspaceWritesAndDeletesUseCurrentRequestWorkspace() {
        EntityDefinitionWorkspaceResumeInfo resumeInfo = new EntityDefinitionWorkspaceResumeInfo();
        resumeInfo.setToken("resume-a");
        when(entityGovernanceStateService.saveDefinitionWorkspaceResume(resumeInfo))
                .thenReturn(resumeInfo);

        EntityDefinitionWorkspaceResumeInfo saved =
                entityGovernanceWorkflowService.saveDefinitionWorkspaceResume(resumeInfo);
        entityGovernanceWorkflowService.deleteDefinitionWorkspaceResume("resume-a");

        assertEquals("resume-a", saved.getToken());
        verify(entityGovernanceStateService).saveDefinitionWorkspaceResume(resumeInfo);
        verify(entityGovernanceStateService).deleteDefinitionWorkspaceResume("resume-a");
    }

    @Test
    void discoveryGovernanceReadsAndWritesUseCurrentRequestWorkspace() {
        EntityDiscoveryGovernancePresetInfo presetInfo = new EntityDiscoveryGovernancePresetInfo();
        presetInfo.setId("preset-a");
        EntityDiscoveryGovernanceActivityInfo activityInfo = new EntityDiscoveryGovernanceActivityInfo();
        activityInfo.setId("activity-a");
        when(entityGovernanceStateService.getDiscoveryGovernancePresets(5))
                .thenReturn(List.of(presetInfo));
        when(entityGovernanceStateService.saveDiscoveryGovernanceActivity(activityInfo))
                .thenReturn(activityInfo);

        List<EntityDiscoveryGovernancePresetInfo> presets =
                entityGovernanceWorkflowService.getDiscoveryGovernancePresets(5);
        EntityDiscoveryGovernanceActivityInfo saved =
                entityGovernanceWorkflowService.saveDiscoveryGovernanceActivity(activityInfo);
        entityGovernanceWorkflowService.deleteDiscoveryGovernancePreset("preset-a");

        assertEquals("preset-a", presets.getFirst().getId());
        assertEquals("activity-a", saved.getId());
        verify(entityGovernanceStateService).getDiscoveryGovernancePresets(5);
        verify(entityGovernanceStateService).saveDiscoveryGovernanceActivity(activityInfo);
        verify(entityGovernanceStateService).deleteDiscoveryGovernancePreset("preset-a");
    }
}
