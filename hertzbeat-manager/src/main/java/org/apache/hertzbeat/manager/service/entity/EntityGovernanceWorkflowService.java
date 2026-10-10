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

import java.util.List;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceResumeInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceTemplateInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernanceActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernancePresetInfo;
import org.springframework.stereotype.Service;

/**
 * Coordinates shared entity governance workflows.
 */
@Service
public class EntityGovernanceWorkflowService {

    private final EntityGovernanceStateService entityGovernanceStateService;

    public EntityGovernanceWorkflowService(EntityGovernanceStateService entityGovernanceStateService) {
        this.entityGovernanceStateService = entityGovernanceStateService;
    }

    public List<EntityDefinitionWorkspaceTemplateInfo> getDefinitionWorkspaceTemplates(String templateId, int limit) {
        return entityGovernanceStateService.getDefinitionWorkspaceTemplates(templateId, limit);
    }

    public EntityDefinitionWorkspaceTemplateInfo saveDefinitionWorkspaceTemplate(
            EntityDefinitionWorkspaceTemplateInfo templateInfo) {
        return entityGovernanceStateService.saveDefinitionWorkspaceTemplate(templateInfo);
    }

    public void deleteDefinitionWorkspaceTemplate(String templateId) {
        entityGovernanceStateService.deleteDefinitionWorkspaceTemplate(templateId);
    }

    public List<EntityDefinitionWorkspaceActivityInfo> getDefinitionWorkspaceActivities(String activityId, int limit) {
        return entityGovernanceStateService.getDefinitionWorkspaceActivities(activityId, limit);
    }

    public EntityDefinitionWorkspaceActivityInfo saveDefinitionWorkspaceActivity(
            EntityDefinitionWorkspaceActivityInfo activityInfo) {
        return entityGovernanceStateService.saveDefinitionWorkspaceActivity(activityInfo);
    }

    public EntityDefinitionWorkspaceResumeInfo getDefinitionWorkspaceResume(String resumeToken) {
        return entityGovernanceStateService.getDefinitionWorkspaceResume(resumeToken);
    }

    public EntityDefinitionWorkspaceResumeInfo saveDefinitionWorkspaceResume(
            EntityDefinitionWorkspaceResumeInfo resumeInfo) {
        return entityGovernanceStateService.saveDefinitionWorkspaceResume(resumeInfo);
    }

    public void deleteDefinitionWorkspaceResume(String resumeToken) {
        entityGovernanceStateService.deleteDefinitionWorkspaceResume(resumeToken);
    }

    public List<EntityDiscoveryGovernancePresetInfo> getDiscoveryGovernancePresets(int limit) {
        return entityGovernanceStateService.getDiscoveryGovernancePresets(limit);
    }

    public EntityDiscoveryGovernancePresetInfo saveDiscoveryGovernancePreset(
            EntityDiscoveryGovernancePresetInfo presetInfo) {
        return entityGovernanceStateService.saveDiscoveryGovernancePreset(presetInfo);
    }

    public void deleteDiscoveryGovernancePreset(String presetId) {
        entityGovernanceStateService.deleteDiscoveryGovernancePreset(presetId);
    }

    public List<EntityDiscoveryGovernanceActivityInfo> getDiscoveryGovernanceActivities(String activityId, int limit) {
        return entityGovernanceStateService.getDiscoveryGovernanceActivities(activityId, limit);
    }

    public EntityDiscoveryGovernanceActivityInfo saveDiscoveryGovernanceActivity(
            EntityDiscoveryGovernanceActivityInfo activityInfo) {
        return entityGovernanceStateService.saveDiscoveryGovernanceActivity(activityInfo);
    }
}
