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

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.EntityGovernanceState;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceResumeInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceTemplateInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernanceActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernanceEntityRefInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernancePresetInfo;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * Owns workspace-scoped shared governance state for entity definition and discovery workflows.
 */
@Service
public class EntityGovernanceStateService {

    private static final String ACTIVITY_SUCCESS = "success";
    private static final String FORMAT_JSON = "json";
    private static final String FORMAT_YAML = "yaml";
    private static final String FORMAT_CURL = "curl";
    private static final String GOVERNANCE_SCOPE_DISCOVERY = "discovery";
    private static final String GOVERNANCE_SCOPE_DEFINITION = "definition";
    private static final String GOVERNANCE_STATE_KIND_PRESET = "preset";
    private static final String GOVERNANCE_STATE_KIND_ACTIVITY = "activity";
    private static final String GOVERNANCE_STATE_KIND_TEMPLATE = "template";
    private static final String GOVERNANCE_STATE_KIND_RESUME = "resume";
    private static final ObjectMapper PRETTY_JSON_MAPPER = JsonMapper.builder().build();

    private final EntityGovernanceStateQueryService entityGovernanceStateQueryService;
    private final EntityGovernanceStateWriteModelService entityGovernanceStateWriteModelService;

    public EntityGovernanceStateService(EntityGovernanceStateQueryService entityGovernanceStateQueryService,
                                        EntityGovernanceStateWriteModelService entityGovernanceStateWriteModelService) {
        this.entityGovernanceStateQueryService = entityGovernanceStateQueryService;
        this.entityGovernanceStateWriteModelService = entityGovernanceStateWriteModelService;
    }

    public List<EntityDefinitionWorkspaceTemplateInfo> getDefinitionWorkspaceTemplates(
            String templateId, int limit) {
        return getDefinitionWorkspaceTemplates(templateId, limit, null, true);
    }

    public List<EntityDefinitionWorkspaceTemplateInfo> getDefinitionWorkspaceTemplates(
            String templateId, int limit, String requestWorkspaceId) {
        return getDefinitionWorkspaceTemplates(templateId, limit, requestWorkspaceId, false);
    }

    private List<EntityDefinitionWorkspaceTemplateInfo> getDefinitionWorkspaceTemplates(
            String templateId, int limit, String requestWorkspaceId, boolean useCurrentRequestWorkspace) {
        if (StringUtils.hasText(templateId)) {
            return readGovernanceState(
                            GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_TEMPLATE, templateId.trim(),
                            requestWorkspaceId, useCurrentRequestWorkspace)
                    .map(this::toDefinitionWorkspaceTemplateInfo)
                    .map(List::of)
                    .orElseGet(List::of);
        }
        return readGovernanceStates(
                        GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_TEMPLATE, pageRequest(limit),
                        requestWorkspaceId, useCurrentRequestWorkspace)
                .stream()
                .map(this::toDefinitionWorkspaceTemplateInfo)
                .toList();
    }

    public EntityDefinitionWorkspaceTemplateInfo saveDefinitionWorkspaceTemplate(
            EntityDefinitionWorkspaceTemplateInfo templateInfo) {
        return saveDefinitionWorkspaceTemplate(templateInfo, null, true);
    }

    public EntityDefinitionWorkspaceTemplateInfo saveDefinitionWorkspaceTemplate(
            EntityDefinitionWorkspaceTemplateInfo templateInfo, String requestWorkspaceId) {
        return saveDefinitionWorkspaceTemplate(templateInfo, requestWorkspaceId, false);
    }

    private EntityDefinitionWorkspaceTemplateInfo saveDefinitionWorkspaceTemplate(
            EntityDefinitionWorkspaceTemplateInfo templateInfo, String requestWorkspaceId,
            boolean useCurrentRequestWorkspace) {
        if (templateInfo == null || !StringUtils.hasText(templateInfo.getName())) {
            throw new IllegalArgumentException("Definition workspace template name can not be blank.");
        }
        if (!StringUtils.hasText(templateInfo.getContent())) {
            throw new IllegalArgumentException("Definition workspace template content can not be blank.");
        }
        String format = normalizeDefinitionActivityFormat(templateInfo.getFormat());
        String templateId = defaultText(
                trimToNull(templateInfo.getId()), "definition-template-" + SnowFlakeIdGenerator.generateId());
        EntityGovernanceState state = prepareGovernanceStateForWrite(
                GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_TEMPLATE, templateId,
                requestWorkspaceId, useCurrentRequestWorkspace);
        state.setStateScope(GOVERNANCE_SCOPE_DEFINITION);
        state.setStateKind(GOVERNANCE_STATE_KIND_TEMPLATE);
        state.setStateKey(templateId);
        state.setStateName(limitLength(trimToNull(templateInfo.getName()), 128));
        state.setStatus(limitLength(trimToNull(templateInfo.getSource()), 32));
        Map<String, Object> content = new LinkedHashMap<>();
        putIfPresent(content, "format", format);
        putIfPresent(content, "content", trimToNull(templateInfo.getContent()));
        putIfPresent(content, "summary", trimToNull(templateInfo.getSummary()));
        putIfPresent(content, "source", trimToNull(templateInfo.getSource()));
        putIfPresent(content, "kind", trimToNull(templateInfo.getKind()));
        state.setContent(PRETTY_JSON_MAPPER.valueToTree(content));
        return toDefinitionWorkspaceTemplateInfo(entityGovernanceStateWriteModelService.saveGovernanceState(state));
    }

    public void deleteDefinitionWorkspaceTemplate(String templateId) {
        if (!StringUtils.hasText(templateId)) {
            return;
        }
        removeGovernanceState(
                GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_TEMPLATE, templateId.trim(), null, true);
    }

    public void deleteDefinitionWorkspaceTemplate(String templateId, String requestWorkspaceId) {
        if (!StringUtils.hasText(templateId)) {
            return;
        }
        removeGovernanceState(
                GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_TEMPLATE, templateId.trim(),
                requestWorkspaceId, false);
    }

    public List<EntityDefinitionWorkspaceActivityInfo> getDefinitionWorkspaceActivities(
            String activityId, int limit) {
        return getDefinitionWorkspaceActivities(activityId, limit, null, true);
    }

    public List<EntityDefinitionWorkspaceActivityInfo> getDefinitionWorkspaceActivities(
            String activityId, int limit, String requestWorkspaceId) {
        return getDefinitionWorkspaceActivities(activityId, limit, requestWorkspaceId, false);
    }

    private List<EntityDefinitionWorkspaceActivityInfo> getDefinitionWorkspaceActivities(
            String activityId, int limit, String requestWorkspaceId, boolean useCurrentRequestWorkspace) {
        if (StringUtils.hasText(activityId)) {
            return readGovernanceState(
                            GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_ACTIVITY, activityId.trim(),
                            requestWorkspaceId, useCurrentRequestWorkspace)
                    .map(this::toDefinitionWorkspaceActivityInfo)
                    .map(List::of)
                    .orElseGet(List::of);
        }
        return readGovernanceStates(
                        GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_ACTIVITY, pageRequest(limit),
                        requestWorkspaceId, useCurrentRequestWorkspace)
                .stream()
                .map(this::toDefinitionWorkspaceActivityInfo)
                .toList();
    }

    public EntityDefinitionWorkspaceActivityInfo saveDefinitionWorkspaceActivity(
            EntityDefinitionWorkspaceActivityInfo activityInfo) {
        return saveDefinitionWorkspaceActivity(activityInfo, null, true);
    }

    public EntityDefinitionWorkspaceActivityInfo saveDefinitionWorkspaceActivity(
            EntityDefinitionWorkspaceActivityInfo activityInfo, String requestWorkspaceId) {
        return saveDefinitionWorkspaceActivity(activityInfo, requestWorkspaceId, false);
    }

    private EntityDefinitionWorkspaceActivityInfo saveDefinitionWorkspaceActivity(
            EntityDefinitionWorkspaceActivityInfo activityInfo, String requestWorkspaceId,
            boolean useCurrentRequestWorkspace) {
        if (activityInfo == null || !StringUtils.hasText(activityInfo.getSummary())) {
            throw new IllegalArgumentException("Definition workspace activity summary can not be blank.");
        }
        String activityId = defaultText(
                trimToNull(activityInfo.getId()), "definition-workspace-activity-" + SnowFlakeIdGenerator.generateId());
        EntityGovernanceState state = prepareGovernanceStateForWrite(
                GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_ACTIVITY, activityId,
                requestWorkspaceId, useCurrentRequestWorkspace);
        state.setStateScope(GOVERNANCE_SCOPE_DEFINITION);
        state.setStateKind(GOVERNANCE_STATE_KIND_ACTIVITY);
        state.setStateKey(activityId);
        state.setStateName(limitLength(trimToNull(activityInfo.getSummary()), 128));
        state.setStatus(limitLength(trimToNull(activityInfo.getStatus()), 32));
        Map<String, Object> content = new LinkedHashMap<>();
        putIfPresent(content, "format", normalizeDefinitionActivityFormat(activityInfo.getFormat()));
        putIfPresent(content, "summary", trimToNull(activityInfo.getSummary()));
        putIfPresent(content, "detail", trimToNull(activityInfo.getDetail()));
        putIfPresent(content, "entityId", activityInfo.getEntityId());
        putIfPresent(content, "entityName", trimToNull(activityInfo.getEntityName()));
        state.setContent(PRETTY_JSON_MAPPER.valueToTree(content));
        return toDefinitionWorkspaceActivityInfo(entityGovernanceStateWriteModelService.saveGovernanceState(state));
    }

    public EntityDefinitionWorkspaceResumeInfo getDefinitionWorkspaceResume(String resumeToken) {
        return getDefinitionWorkspaceResume(resumeToken, null, true);
    }

    public EntityDefinitionWorkspaceResumeInfo getDefinitionWorkspaceResume(
            String resumeToken, String requestWorkspaceId) {
        return getDefinitionWorkspaceResume(resumeToken, requestWorkspaceId, false);
    }

    private EntityDefinitionWorkspaceResumeInfo getDefinitionWorkspaceResume(
            String resumeToken, String requestWorkspaceId, boolean useCurrentRequestWorkspace) {
        if (!StringUtils.hasText(resumeToken)) {
            return null;
        }
        return readGovernanceState(
                        GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_RESUME, resumeToken.trim(),
                        requestWorkspaceId, useCurrentRequestWorkspace)
                .map(this::toDefinitionWorkspaceResumeInfo)
                .orElse(null);
    }

    public EntityDefinitionWorkspaceResumeInfo saveDefinitionWorkspaceResume(
            EntityDefinitionWorkspaceResumeInfo resumeInfo) {
        return saveDefinitionWorkspaceResume(resumeInfo, null, true);
    }

    public EntityDefinitionWorkspaceResumeInfo saveDefinitionWorkspaceResume(
            EntityDefinitionWorkspaceResumeInfo resumeInfo, String requestWorkspaceId) {
        return saveDefinitionWorkspaceResume(resumeInfo, requestWorkspaceId, false);
    }

    private EntityDefinitionWorkspaceResumeInfo saveDefinitionWorkspaceResume(
            EntityDefinitionWorkspaceResumeInfo resumeInfo, String requestWorkspaceId,
            boolean useCurrentRequestWorkspace) {
        if (resumeInfo == null || !StringUtils.hasText(resumeInfo.getToken())) {
            throw new IllegalArgumentException("Definition workspace resume token can not be blank.");
        }
        if (!StringUtils.hasText(resumeInfo.getContent())) {
            throw new IllegalArgumentException("Definition workspace resume content can not be blank.");
        }
        String resumeToken = resumeInfo.getToken().trim();
        EntityGovernanceState state = prepareGovernanceStateForWrite(
                GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_RESUME, resumeToken,
                requestWorkspaceId, useCurrentRequestWorkspace);
        state.setStateScope(GOVERNANCE_SCOPE_DEFINITION);
        state.setStateKind(GOVERNANCE_STATE_KIND_RESUME);
        state.setStateKey(resumeToken);
        state.setStateName(limitLength(trimToNull(resumeInfo.getSource()), 128));
        state.setStatus(limitLength(trimToNull(resumeInfo.getFormat()), 32));
        Map<String, Object> content = new LinkedHashMap<>();
        putIfPresent(content, "content", trimToNull(resumeInfo.getContent()));
        putIfPresent(content, "format", normalizeDefinitionActivityFormat(resumeInfo.getFormat()));
        putIfPresent(content, "source", trimToNull(resumeInfo.getSource()));
        putIfPresent(content, "count", resumeInfo.getCount());
        putIfPresent(content, "ownerDraft", trimToNull(resumeInfo.getOwnerDraft()));
        putIfPresent(content, "systemDraft", trimToNull(resumeInfo.getSystemDraft()));
        putIfPresent(content, "runbookDraft", trimToNull(resumeInfo.getRunbookDraft()));
        if (resumeInfo.getQueryParams() != null && !resumeInfo.getQueryParams().isEmpty()) {
            content.put("queryParams", resumeInfo.getQueryParams());
        }
        state.setContent(PRETTY_JSON_MAPPER.valueToTree(content));
        return toDefinitionWorkspaceResumeInfo(entityGovernanceStateWriteModelService.saveGovernanceState(state));
    }

    public void deleteDefinitionWorkspaceResume(String resumeToken) {
        if (!StringUtils.hasText(resumeToken)) {
            return;
        }
        removeGovernanceState(
                GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_RESUME, resumeToken.trim(), null, true);
    }

    public void deleteDefinitionWorkspaceResume(String resumeToken, String requestWorkspaceId) {
        if (!StringUtils.hasText(resumeToken)) {
            return;
        }
        removeGovernanceState(
                GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_RESUME, resumeToken.trim(),
                requestWorkspaceId, false);
    }

    public List<EntityDiscoveryGovernancePresetInfo> getDiscoveryGovernancePresets(int limit) {
        return getDiscoveryGovernancePresets(limit, null, true);
    }

    public List<EntityDiscoveryGovernancePresetInfo> getDiscoveryGovernancePresets(
            int limit, String requestWorkspaceId) {
        return getDiscoveryGovernancePresets(limit, requestWorkspaceId, false);
    }

    private List<EntityDiscoveryGovernancePresetInfo> getDiscoveryGovernancePresets(
            int limit, String requestWorkspaceId, boolean useCurrentRequestWorkspace) {
        return readGovernanceStates(
                        GOVERNANCE_SCOPE_DISCOVERY, GOVERNANCE_STATE_KIND_PRESET, pageRequest(limit),
                        requestWorkspaceId, useCurrentRequestWorkspace)
                .stream()
                .map(this::toDiscoveryGovernancePresetInfo)
                .toList();
    }

    public EntityDiscoveryGovernancePresetInfo saveDiscoveryGovernancePreset(
            EntityDiscoveryGovernancePresetInfo presetInfo) {
        return saveDiscoveryGovernancePreset(presetInfo, null, true);
    }

    public EntityDiscoveryGovernancePresetInfo saveDiscoveryGovernancePreset(
            EntityDiscoveryGovernancePresetInfo presetInfo, String requestWorkspaceId) {
        return saveDiscoveryGovernancePreset(presetInfo, requestWorkspaceId, false);
    }

    private EntityDiscoveryGovernancePresetInfo saveDiscoveryGovernancePreset(
            EntityDiscoveryGovernancePresetInfo presetInfo, String requestWorkspaceId,
            boolean useCurrentRequestWorkspace) {
        if (presetInfo == null || !StringUtils.hasText(presetInfo.getName())) {
            throw new IllegalArgumentException("Discovery governance preset name can not be blank.");
        }
        String presetId = defaultText(trimToNull(presetInfo.getId()), "preset-" + SnowFlakeIdGenerator.generateId());
        EntityGovernanceState state = prepareGovernanceStateForWrite(
                GOVERNANCE_SCOPE_DISCOVERY, GOVERNANCE_STATE_KIND_PRESET, presetId,
                requestWorkspaceId, useCurrentRequestWorkspace);
        state.setStateScope(GOVERNANCE_SCOPE_DISCOVERY);
        state.setStateKind(GOVERNANCE_STATE_KIND_PRESET);
        state.setStateKey(presetId);
        state.setStateName(limitLength(trimToNull(presetInfo.getName()), 128));
        state.setStatus(limitLength(trimToNull(presetInfo.getStatus()), 32));
        Map<String, Object> content = new LinkedHashMap<>();
        putIfPresent(content, "owner", trimToNull(presetInfo.getOwner()));
        putIfPresent(content, "system", trimToNull(presetInfo.getSystem()));
        putIfPresent(content, "source", trimToNull(presetInfo.getSource()));
        putIfPresent(content, "environment", trimToNull(presetInfo.getEnvironment()));
        putIfPresent(content, "status", trimToNull(presetInfo.getStatus()));
        putIfPresent(content, "bulkOwner", trimToNull(presetInfo.getBulkOwner()));
        putIfPresent(content, "bulkSystem", trimToNull(presetInfo.getBulkSystem()));
        state.setContent(PRETTY_JSON_MAPPER.valueToTree(content));
        return toDiscoveryGovernancePresetInfo(entityGovernanceStateWriteModelService.saveGovernanceState(state));
    }

    public void deleteDiscoveryGovernancePreset(String presetId) {
        if (!StringUtils.hasText(presetId)) {
            return;
        }
        removeGovernanceState(GOVERNANCE_SCOPE_DISCOVERY, GOVERNANCE_STATE_KIND_PRESET, presetId.trim(), null, true);
    }

    public void deleteDiscoveryGovernancePreset(String presetId, String requestWorkspaceId) {
        if (!StringUtils.hasText(presetId)) {
            return;
        }
        removeGovernanceState(
                GOVERNANCE_SCOPE_DISCOVERY, GOVERNANCE_STATE_KIND_PRESET, presetId.trim(),
                requestWorkspaceId, false);
    }

    public List<EntityDiscoveryGovernanceActivityInfo> getDiscoveryGovernanceActivities(
            String activityId, int limit) {
        return getDiscoveryGovernanceActivities(activityId, limit, null, true);
    }

    public List<EntityDiscoveryGovernanceActivityInfo> getDiscoveryGovernanceActivities(
            String activityId, int limit, String requestWorkspaceId) {
        return getDiscoveryGovernanceActivities(activityId, limit, requestWorkspaceId, false);
    }

    private List<EntityDiscoveryGovernanceActivityInfo> getDiscoveryGovernanceActivities(
            String activityId, int limit, String requestWorkspaceId, boolean useCurrentRequestWorkspace) {
        if (StringUtils.hasText(activityId)) {
            return readGovernanceState(
                            GOVERNANCE_SCOPE_DISCOVERY, GOVERNANCE_STATE_KIND_ACTIVITY, activityId.trim(),
                            requestWorkspaceId, useCurrentRequestWorkspace)
                    .map(this::toDiscoveryGovernanceActivityInfo)
                    .map(List::of)
                    .orElseGet(List::of);
        }
        return readGovernanceStates(
                        GOVERNANCE_SCOPE_DISCOVERY, GOVERNANCE_STATE_KIND_ACTIVITY, pageRequest(limit),
                        requestWorkspaceId, useCurrentRequestWorkspace)
                .stream()
                .map(this::toDiscoveryGovernanceActivityInfo)
                .toList();
    }

    public EntityDiscoveryGovernanceActivityInfo saveDiscoveryGovernanceActivity(
            EntityDiscoveryGovernanceActivityInfo activityInfo) {
        return saveDiscoveryGovernanceActivity(activityInfo, null, true);
    }

    public EntityDiscoveryGovernanceActivityInfo saveDiscoveryGovernanceActivity(
            EntityDiscoveryGovernanceActivityInfo activityInfo, String requestWorkspaceId) {
        return saveDiscoveryGovernanceActivity(activityInfo, requestWorkspaceId, false);
    }

    private EntityDiscoveryGovernanceActivityInfo saveDiscoveryGovernanceActivity(
            EntityDiscoveryGovernanceActivityInfo activityInfo, String requestWorkspaceId,
            boolean useCurrentRequestWorkspace) {
        if (activityInfo == null || !StringUtils.hasText(activityInfo.getSummary())) {
            throw new IllegalArgumentException("Discovery governance activity summary can not be blank.");
        }
        String activityId = defaultText(trimToNull(activityInfo.getId()), "activity-" + SnowFlakeIdGenerator.generateId());
        EntityGovernanceState state = prepareGovernanceStateForWrite(
                GOVERNANCE_SCOPE_DISCOVERY, GOVERNANCE_STATE_KIND_ACTIVITY, activityId,
                requestWorkspaceId, useCurrentRequestWorkspace);
        state.setStateScope(GOVERNANCE_SCOPE_DISCOVERY);
        state.setStateKind(GOVERNANCE_STATE_KIND_ACTIVITY);
        state.setStateKey(activityId);
        state.setStateName(limitLength(trimToNull(activityInfo.getSummary()), 128));
        state.setStatus(limitLength(trimToNull(activityInfo.getStatus()), 32));
        Map<String, Object> content = new LinkedHashMap<>();
        putIfPresent(content, "action", trimToNull(activityInfo.getAction()));
        putIfPresent(content, "summary", trimToNull(activityInfo.getSummary()));
        putIfPresent(content, "detail", trimToNull(activityInfo.getDetail()));
        putIfPresent(content, "workspacePath", trimToNull(activityInfo.getWorkspacePath()));
        putIfPresent(content, "seedDefinitionDraft", trimToNull(activityInfo.getSeedDefinitionDraft()));
        putIfPresent(content, "seedDefinitionFormat", trimToNull(activityInfo.getSeedDefinitionFormat()));
        putIfPresent(content, "seedDefinitionSource", trimToNull(activityInfo.getSeedDefinitionSource()));
        putIfPresent(content, "seedDefinitionCount", activityInfo.getSeedDefinitionCount());
        putIfPresent(content, "entityRefs",
                CollectionUtils.isEmpty(activityInfo.getEntityRefs()) ? null : activityInfo.getEntityRefs());
        state.setContent(PRETTY_JSON_MAPPER.valueToTree(content));
        return toDiscoveryGovernanceActivityInfo(entityGovernanceStateWriteModelService.saveGovernanceState(state));
    }

    private List<EntityGovernanceState> readGovernanceStates(
            String stateScope, String stateKind, PageRequest pageRequest, String requestWorkspaceId,
            boolean useCurrentRequestWorkspace) {
        if (useCurrentRequestWorkspace) {
            return entityGovernanceStateQueryService.findGovernanceStates(stateScope, stateKind, pageRequest);
        }
        return entityGovernanceStateQueryService.findGovernanceStates(
                stateScope, stateKind, pageRequest, requestWorkspaceId);
    }

    private Optional<EntityGovernanceState> readGovernanceState(
            String stateScope, String stateKind, String stateKey, String requestWorkspaceId,
            boolean useCurrentRequestWorkspace) {
        if (useCurrentRequestWorkspace) {
            return entityGovernanceStateQueryService.findGovernanceState(stateScope, stateKind, stateKey);
        }
        return entityGovernanceStateQueryService.findGovernanceState(
                stateScope, stateKind, stateKey, requestWorkspaceId);
    }

    private EntityGovernanceState prepareGovernanceStateForWrite(
            String stateScope, String stateKind, String stateKey, String requestWorkspaceId,
            boolean useCurrentRequestWorkspace) {
        if (useCurrentRequestWorkspace) {
            return entityGovernanceStateWriteModelService.findGovernanceStateForWrite(stateScope, stateKind, stateKey);
        }
        return entityGovernanceStateWriteModelService.findGovernanceStateForWrite(
                stateScope, stateKind, stateKey, requestWorkspaceId);
    }

    private void removeGovernanceState(
            String stateScope, String stateKind, String stateKey, String requestWorkspaceId,
            boolean useCurrentRequestWorkspace) {
        if (useCurrentRequestWorkspace) {
            entityGovernanceStateWriteModelService.deleteGovernanceState(stateScope, stateKind, stateKey);
            return;
        }
        entityGovernanceStateWriteModelService.deleteGovernanceState(
                stateScope, stateKind, stateKey, requestWorkspaceId);
    }

    private PageRequest pageRequest(int limit) {
        int pageSize = limit <= 0 ? 8 : Math.min(limit, 50);
        return PageRequest.of(0, pageSize);
    }

    private EntityDefinitionWorkspaceTemplateInfo toDefinitionWorkspaceTemplateInfo(EntityGovernanceState state) {
        JsonNode content = state.getContent();
        LocalDateTime updatedAt = state.getGmtUpdate() != null ? state.getGmtUpdate() : state.getGmtCreate();
        return new EntityDefinitionWorkspaceTemplateInfo(
                state.getStateKey(),
                defaultText(trimToNull(state.getStateName()), state.getStateKey()),
                defaultText(jsonText(content, "format"), FORMAT_YAML),
                defaultText(jsonText(content, "content"), ""),
                jsonText(content, "summary"),
                defaultText(jsonText(content, "source"), state.getStatus()),
                jsonText(content, "kind"),
                state.getCreator(),
                updatedAt
        );
    }

    private EntityDefinitionWorkspaceActivityInfo toDefinitionWorkspaceActivityInfo(EntityGovernanceState state) {
        JsonNode content = state.getContent();
        LocalDateTime happenedAt = state.getGmtUpdate() != null ? state.getGmtUpdate() : state.getGmtCreate();
        Long entityId = content != null && content.hasNonNull("entityId") ? content.get("entityId").asLong() : null;
        return new EntityDefinitionWorkspaceActivityInfo(
                state.getStateKey(),
                happenedAt,
                defaultText(state.getStatus(), ACTIVITY_SUCCESS),
                defaultText(jsonText(content, "format"), FORMAT_YAML),
                defaultText(jsonText(content, "summary"), trimToNull(state.getStateName()), state.getStateKey()),
                jsonText(content, "detail"),
                entityId,
                jsonText(content, "entityName"),
                state.getCreator()
        );
    }

    private EntityDefinitionWorkspaceResumeInfo toDefinitionWorkspaceResumeInfo(EntityGovernanceState state) {
        JsonNode content = state.getContent();
        LocalDateTime updatedAt = state.getGmtUpdate() != null ? state.getGmtUpdate() : state.getGmtCreate();
        return new EntityDefinitionWorkspaceResumeInfo(
                state.getStateKey(),
                defaultText(jsonText(content, "content"), ""),
                defaultText(jsonText(content, "format"), FORMAT_YAML),
                defaultText(jsonText(content, "source"), trimToNull(state.getStateName())),
                jsonInteger(content, "count"),
                jsonText(content, "ownerDraft"),
                jsonText(content, "systemDraft"),
                jsonText(content, "runbookDraft"),
                jsonStringMap(content == null ? null : content.get("queryParams")),
                state.getCreator(),
                updatedAt
        );
    }

    private EntityDiscoveryGovernancePresetInfo toDiscoveryGovernancePresetInfo(EntityGovernanceState state) {
        JsonNode content = state.getContent();
        LocalDateTime updatedAt = state.getGmtUpdate() != null ? state.getGmtUpdate() : state.getGmtCreate();
        return new EntityDiscoveryGovernancePresetInfo(
                state.getStateKey(),
                defaultText(trimToNull(state.getStateName()), state.getStateKey()),
                jsonText(content, "owner"),
                jsonText(content, "system"),
                jsonText(content, "source"),
                jsonText(content, "environment"),
                defaultText(jsonText(content, "status"), state.getStatus()),
                jsonText(content, "bulkOwner"),
                jsonText(content, "bulkSystem"),
                state.getCreator(),
                updatedAt
        );
    }

    private EntityDiscoveryGovernanceActivityInfo toDiscoveryGovernanceActivityInfo(EntityGovernanceState state) {
        JsonNode content = state.getContent();
        LocalDateTime happenedAt = state.getGmtUpdate() != null ? state.getGmtUpdate() : state.getGmtCreate();
        return new EntityDiscoveryGovernanceActivityInfo(
                state.getStateKey(),
                happenedAt,
                defaultText(state.getStatus(), "info"),
                defaultText(jsonText(content, "action"), "review"),
                defaultText(jsonText(content, "summary"), trimToNull(state.getStateName()), state.getStateKey()),
                jsonText(content, "detail"),
                jsonEntityRefs(content == null ? null : content.get("entityRefs")),
                jsonText(content, "workspacePath"),
                jsonText(content, "seedDefinitionDraft"),
                jsonText(content, "seedDefinitionFormat"),
                jsonText(content, "seedDefinitionSource"),
                jsonInteger(content, "seedDefinitionCount"),
                state.getCreator()
        );
    }

    private List<EntityDiscoveryGovernanceEntityRefInfo> jsonEntityRefs(JsonNode node) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        java.util.ArrayList<EntityDiscoveryGovernanceEntityRefInfo> refs = new java.util.ArrayList<>();
        node.forEach(item -> {
            Long entityId = item != null && item.hasNonNull("entityId") ? item.get("entityId").asLong() : null;
            if (entityId != null) {
                refs.add(new EntityDiscoveryGovernanceEntityRefInfo(entityId, jsonText(item, "entityName")));
            }
        });
        return refs;
    }

    private Map<String, String> jsonStringMap(JsonNode node) {
        if (node == null || !node.isObject()) {
            return Map.of();
        }
        Map<String, String> raw = PRETTY_JSON_MAPPER.convertValue(node, new TypeReference<Map<String, String>>() { });
        if (raw == null || raw.isEmpty()) {
            return Map.of();
        }
        Map<String, String> values = new LinkedHashMap<>();
        raw.forEach((key, value) -> {
            String normalizedValue = trimToNull(value);
            if (StringUtils.hasText(key) && normalizedValue != null) {
                values.put(key, normalizedValue);
            }
        });
        return values.isEmpty() ? Map.of() : values;
    }

    private String jsonText(JsonNode node, String fieldName) {
        if (node == null || !node.has(fieldName) || node.get(fieldName).isNull()) {
            return null;
        }
        return trimToNull(node.get(fieldName).asText());
    }

    private Integer jsonInteger(JsonNode node, String fieldName) {
        if (node == null || !node.has(fieldName) || node.get(fieldName).isNull()) {
            return null;
        }
        return node.get(fieldName).asInt();
    }

    private String normalizeDefinitionActivityFormat(String format) {
        if (!StringUtils.hasText(format)) {
            return null;
        }
        if (FORMAT_CURL.equalsIgnoreCase(defaultText(format, ""))) {
            return FORMAT_CURL;
        }
        if (FORMAT_JSON.equalsIgnoreCase(defaultText(format, ""))) {
            return FORMAT_JSON;
        }
        return FORMAT_YAML;
    }

    private void putIfPresent(Map<String, Object> content, String key, Object value) {
        if (value != null) {
            content.put(key, value);
        }
    }

    private String limitLength(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String defaultText(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }
}
