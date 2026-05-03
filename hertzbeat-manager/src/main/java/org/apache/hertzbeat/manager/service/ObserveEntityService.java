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

package org.apache.hertzbeat.manager.service;

import java.util.List;
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
import org.springframework.data.domain.Page;

/**
 * Entity-centric management services.
 */
public interface ObserveEntityService {

    void validate(EntityDto entityDto, boolean isModify);

    long addEntity(EntityDto entityDto);

    void modifyEntity(EntityDto entityDto);

    void deleteEntity(long entityId);

    EntityDto getEntityDto(long entityId);

    EntityDto parseEntityDefinition(EntityDefinitionRequest definitionRequest, Long entityId);

    List<EntityDto> parseEntityDefinitionBundle(EntityDefinitionRequest definitionRequest);

    long addEntityByDefinition(EntityDefinitionRequest definitionRequest);

    List<Long> addEntitiesByDefinitionBundle(EntityDefinitionRequest definitionRequest);

    void modifyEntityByDefinition(long entityId, EntityDefinitionRequest definitionRequest);

    String getEntityDefinition(long entityId, String format);

    EntityDetailDto getEntityDetail(long entityId);

    Page<SingleAlert> getEntityAlerts(long entityId, String status, String severity, int pageIndex, int pageSize);

    Page<MonitorInfo> getEntityMonitors(long entityId, Byte status, String app, int pageIndex, int pageSize);

    List<EntityDefinitionActivityInfo> getDefinitionActivities(Long entityId, int limit);

    List<EntityDefinitionWorkspaceTemplateInfo> getDefinitionWorkspaceTemplates(String templateId, int limit);

    EntityDefinitionWorkspaceTemplateInfo saveDefinitionWorkspaceTemplate(EntityDefinitionWorkspaceTemplateInfo templateInfo);

    void deleteDefinitionWorkspaceTemplate(String templateId);

    List<EntityDefinitionWorkspaceActivityInfo> getDefinitionWorkspaceActivities(String activityId, int limit);

    EntityDefinitionWorkspaceActivityInfo saveDefinitionWorkspaceActivity(EntityDefinitionWorkspaceActivityInfo activityInfo);

    EntityDefinitionWorkspaceResumeInfo getDefinitionWorkspaceResume(String resumeToken);

    EntityDefinitionWorkspaceResumeInfo saveDefinitionWorkspaceResume(EntityDefinitionWorkspaceResumeInfo resumeInfo);

    void deleteDefinitionWorkspaceResume(String resumeToken);

    List<EntityDiscoveryGovernancePresetInfo> getDiscoveryGovernancePresets(int limit);

    EntityDiscoveryGovernancePresetInfo saveDiscoveryGovernancePreset(EntityDiscoveryGovernancePresetInfo presetInfo);

    void deleteDiscoveryGovernancePreset(String presetId);

    List<EntityDiscoveryGovernanceActivityInfo> getDiscoveryGovernanceActivities(String activityId, int limit);

    EntityDiscoveryGovernanceActivityInfo saveDiscoveryGovernanceActivity(EntityDiscoveryGovernanceActivityInfo activityInfo);

    EntityCatalogSuggestionsInfo getCatalogSuggestions(int limit);

    Page<EntitySummaryInfo> getEntities(List<Long> entityIds, String type, String status, String search,
                                        String owner, String source, String environment, String lifecycle, String tier, String system,
                                        String sort, String order, int pageIndex, int pageSize);

    List<EntityMonitorBindingCandidate> getMonitorBindingCandidates(long monitorId);
}
