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

package org.apache.hertzbeat.manager.service.impl;

import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.observability.dto.entity.MonitorInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityCatalogSuggestionsInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionRequest;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceResumeInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceTemplateInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDetailDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernanceActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernancePresetInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityMonitorBindingCandidate;
import org.apache.hertzbeat.manager.pojo.dto.EntitySummaryInfo;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.apache.hertzbeat.manager.service.entity.EntityActivityReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityCatalogProfileService;
import org.apache.hertzbeat.manager.service.entity.EntityDeletionWriteModelService;
import org.apache.hertzbeat.manager.service.entity.EntityDefinitionDraftService;
import org.apache.hertzbeat.manager.service.entity.EntityDefinitionExportService;
import org.apache.hertzbeat.manager.service.entity.EntityDetailObservabilityReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityDetailReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityEvidenceReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityGovernanceWorkflowService;
import org.apache.hertzbeat.manager.service.entity.EntityIntegrationHintService;
import org.apache.hertzbeat.manager.service.entity.EntityListReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityMutationWorkflowService;
import org.apache.hertzbeat.manager.service.entity.EntityValidationService;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * ObserveEntity service implementation.
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
@RequiredArgsConstructor
public class ObserveEntityServiceImpl implements ObserveEntityService {
    private final EntityActivityReadModelService entityActivityReadModelService;
    private final EntityCatalogProfileService entityCatalogProfileService;
    private final EntityDeletionWriteModelService entityDeletionWriteModelService;
    private final EntityDefinitionDraftService entityDefinitionDraftService;
    private final EntityDefinitionExportService entityDefinitionExportService;
    private final EntityDetailObservabilityReadModelService entityDetailObservabilityReadModelService;
    private final EntityDetailReadModelService entityDetailReadModelService;
    private final EntityEvidenceReadModelService entityEvidenceReadModelService;
    private final EntityGovernanceWorkflowService entityGovernanceWorkflowService;
    private final EntityIntegrationHintService entityIntegrationHintService;
    private final EntityListReadModelService entityListReadModelService;
    private final EntityMutationWorkflowService entityMutationWorkflowService;
    private final EntityValidationService entityValidationService;

    @Override
    public void validate(EntityDto entityDto, boolean isModify) {
        entityValidationService.validate(entityDto, isModify);
    }

    @Override
    public long addEntity(EntityDto entityDto) {
        return entityMutationWorkflowService.addEntity(entityDto);
    }

    @Override
    public void modifyEntity(EntityDto entityDto) {
        entityMutationWorkflowService.modifyEntity(entityDto);
    }

    @Override
    public void deleteEntity(long entityId) {
        entityDeletionWriteModelService.deleteEntity(entityId);
    }

    @Override
    @Transactional(readOnly = true)
    public EntityDto getEntityDto(long entityId) {
        return entityDetailReadModelService.loadEntityDto(entityId);
    }

    @Override
    public EntityDto parseEntityDefinition(EntityDefinitionRequest definitionRequest, Long entityId) {
        return entityDefinitionDraftService.parseEntityDefinition(definitionRequest, entityId);
    }

    @Override
    public List<EntityDto> parseEntityDefinitionBundle(EntityDefinitionRequest definitionRequest) {
        return entityDefinitionDraftService.parseEntityDefinitionBundle(definitionRequest);
    }

    @Override
    public long addEntityByDefinition(EntityDefinitionRequest definitionRequest) {
        return entityMutationWorkflowService.addEntityByDefinition(definitionRequest);
    }

    @Override
    public List<Long> addEntitiesByDefinitionBundle(EntityDefinitionRequest definitionRequest) {
        return entityMutationWorkflowService.addEntitiesByDefinitionBundle(definitionRequest);
    }

    @Override
    public void modifyEntityByDefinition(long entityId, EntityDefinitionRequest definitionRequest) {
        entityMutationWorkflowService.modifyEntityByDefinition(entityId, definitionRequest);
    }

    @Override
    @Transactional(readOnly = true)
    public String getEntityDefinition(long entityId, String format) {
        return entityDefinitionExportService.getEntityDefinition(entityId, format);
    }

    @Override
    public EntityDetailDto getEntityDetail(long entityId) {
        return entityDetailObservabilityReadModelService.buildEntityDetail(entityId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SingleAlert> getEntityAlerts(long entityId, String status, String severity, int pageIndex, int pageSize) {
        return entityEvidenceReadModelService.getEntityAlerts(entityId, status, severity, pageIndex, pageSize);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<MonitorInfo> getEntityMonitors(long entityId, Byte status, String app, int pageIndex, int pageSize) {
        return entityEvidenceReadModelService.getEntityMonitors(entityId, status, app, pageIndex, pageSize);
    }

    @Override
    public List<EntityDefinitionActivityInfo> getDefinitionActivities(Long entityId, int limit) {
        return entityActivityReadModelService.getDefinitionActivities(entityId, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EntityDefinitionWorkspaceTemplateInfo> getDefinitionWorkspaceTemplates(String templateId, int limit) {
        return entityGovernanceWorkflowService.getDefinitionWorkspaceTemplates(templateId, limit);
    }

    @Override
    public EntityDefinitionWorkspaceTemplateInfo saveDefinitionWorkspaceTemplate(EntityDefinitionWorkspaceTemplateInfo templateInfo) {
        return entityGovernanceWorkflowService.saveDefinitionWorkspaceTemplate(templateInfo);
    }

    @Override
    public void deleteDefinitionWorkspaceTemplate(String templateId) {
        entityGovernanceWorkflowService.deleteDefinitionWorkspaceTemplate(templateId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EntityDefinitionWorkspaceActivityInfo> getDefinitionWorkspaceActivities(String activityId, int limit) {
        return entityGovernanceWorkflowService.getDefinitionWorkspaceActivities(activityId, limit);
    }

    @Override
    public EntityDefinitionWorkspaceActivityInfo saveDefinitionWorkspaceActivity(EntityDefinitionWorkspaceActivityInfo activityInfo) {
        return entityGovernanceWorkflowService.saveDefinitionWorkspaceActivity(activityInfo);
    }

    @Override
    @Transactional(readOnly = true)
    public EntityDefinitionWorkspaceResumeInfo getDefinitionWorkspaceResume(String resumeToken) {
        return entityGovernanceWorkflowService.getDefinitionWorkspaceResume(resumeToken);
    }

    @Override
    public EntityDefinitionWorkspaceResumeInfo saveDefinitionWorkspaceResume(EntityDefinitionWorkspaceResumeInfo resumeInfo) {
        return entityGovernanceWorkflowService.saveDefinitionWorkspaceResume(resumeInfo);
    }

    @Override
    public void deleteDefinitionWorkspaceResume(String resumeToken) {
        entityGovernanceWorkflowService.deleteDefinitionWorkspaceResume(resumeToken);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EntityDiscoveryGovernancePresetInfo> getDiscoveryGovernancePresets(int limit) {
        return entityGovernanceWorkflowService.getDiscoveryGovernancePresets(limit);
    }

    @Override
    public EntityDiscoveryGovernancePresetInfo saveDiscoveryGovernancePreset(EntityDiscoveryGovernancePresetInfo presetInfo) {
        return entityGovernanceWorkflowService.saveDiscoveryGovernancePreset(presetInfo);
    }

    @Override
    public void deleteDiscoveryGovernancePreset(String presetId) {
        entityGovernanceWorkflowService.deleteDiscoveryGovernancePreset(presetId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EntityDiscoveryGovernanceActivityInfo> getDiscoveryGovernanceActivities(String activityId, int limit) {
        return entityGovernanceWorkflowService.getDiscoveryGovernanceActivities(activityId, limit);
    }

    @Override
    public EntityDiscoveryGovernanceActivityInfo saveDiscoveryGovernanceActivity(EntityDiscoveryGovernanceActivityInfo activityInfo) {
        return entityGovernanceWorkflowService.saveDiscoveryGovernanceActivity(activityInfo);
    }

    @Override
    @Transactional(readOnly = true)
    public EntityCatalogSuggestionsInfo getCatalogSuggestions(int limit) {
        return entityCatalogProfileService.getCatalogSuggestions(limit);
    }

    @Override
    public Page<EntitySummaryInfo> getEntities(List<Long> entityIds, String type, String status, String search,
                                               String owner, String source, String environment, String lifecycle, String tier, String system,
                                               String sort, String order, int pageIndex, int pageSize) {
        return entityListReadModelService.getEntities(
                entityIds, type, status, search, owner, source, environment, lifecycle, tier, system,
                sort, order, pageIndex, pageSize);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EntityMonitorBindingCandidate> getMonitorBindingCandidates(long monitorId) {
        return entityIntegrationHintService.getMonitorBindingCandidates(monitorId);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<Long, List<EntityMonitorBindingCandidate>> getMonitorBindingCandidates(List<Long> monitorIds) {
        return entityIntegrationHintService.getMonitorBindingCandidates(monitorIds);
    }

}
