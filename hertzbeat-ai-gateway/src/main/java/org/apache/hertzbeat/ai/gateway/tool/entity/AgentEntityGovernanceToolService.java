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

package org.apache.hertzbeat.ai.gateway.tool.entity;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.text.GatewaySecretRedactor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernancePresetInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceTemplateInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceResumeInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernanceActivityInfo;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/** Workspace-shared catalog governance helpers, preserving the manager service's sharing semantics. */
@Service
public class AgentEntityGovernanceToolService {
    private final ObserveEntityService entities;
    private final AgentEntityDefinitionToolService definitions;

    public AgentEntityGovernanceToolService(ObserveEntityService entities, AgentEntityDefinitionToolService definitions) {
        this.entities = entities;
        this.definitions = definitions;
    }

    @Tool(name = "entity.definition_activities", description = "Read bounded workspace-shared definition activities; helper activities are not proof that an operation ran.")
    @AgentToolPolicy(access = AgentToolAccess.STANDARD, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> activities(@ToolParam(required = false) Long entityId, @ToolParam(required = false) Integer limit) {
        return safe(entities.getDefinitionActivities(entityId, limit(limit)));
    }

    @Tool(name = "entity.definition_templates", description = "Read bounded workspace-shared definition templates; helper activities are not proof that an operation ran.")
    @AgentToolPolicy(access = AgentToolAccess.STANDARD, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> templates(@ToolParam(required = false) String templateId, @ToolParam(required = false) Integer limit) {
        return safe(entities.getDefinitionWorkspaceTemplates(templateId, limit(limit)));
    }

    @Tool(name = "entity.definition_workspace_activities", description = "Read bounded workspace-shared definition workspace activities; helper activities are not proof that an operation ran.")
    @AgentToolPolicy(access = AgentToolAccess.STANDARD, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> workspaceActivities(@ToolParam(required = false) String activityId, @ToolParam(required = false) Integer limit) {
        return safe(entities.getDefinitionWorkspaceActivities(activityId, limit(limit)));
    }

    @Tool(name = "entity.discovery_presets", description = "Read bounded workspace-shared discovery presets; helper activities are not proof that an operation ran.")
    @AgentToolPolicy(access = AgentToolAccess.STANDARD, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> presets(@ToolParam(required = false) Integer limit) {
        return safe(entities.getDiscoveryGovernancePresets(limit(limit)));
    }

    @Tool(name = "entity.discovery_activities", description = "Read bounded workspace-shared discovery activities; helper activities are not proof that an operation ran.")
    @AgentToolPolicy(access = AgentToolAccess.STANDARD, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> discoveryActivities(@ToolParam(required = false) String activityId, @ToolParam(required = false) Integer limit) {
        return safe(entities.getDiscoveryGovernanceActivities(activityId, limit(limit)));
    }

    @Tool(name = "entity.catalog_suggestions", description = "Read bounded workspace-shared catalog suggestions; helper activities are not proof that an operation ran.")
    @AgentToolPolicy(access = AgentToolAccess.STANDARD, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> suggestions(@ToolParam(required = false) Integer limit) {
        return safe(entities.getCatalogSuggestions(limit(limit)));
    }

    @Tool(name = "entity.definition_resume", description = "Read a workspace-shared definition resume snapshot. This is helper state, not an executed import.")
    @AgentToolPolicy(access = AgentToolAccess.STANDARD, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> resume(String resumeToken) {
        key(resumeToken);
        return safe(entities.getDefinitionWorkspaceResume(resumeToken));
    }


    /** Preset typed projection. */
    public record Preset(String id, String name, String owner, String system, String source,
                         String environment, String status, String bulkOwner, String bulkSystem) { }

    @Tool(name = "entity.discovery_preset_save", description = "Create or update a workspace-shared discovery governance preset; does not apply bulk changes to entities.")
    @AgentToolPolicy(access = AgentToolAccess.USER, risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> savePreset(Preset preset) {
        if (preset == null) {
            throw new IllegalArgumentException("preset is required");
        }
        EntityDiscoveryGovernancePresetInfo value = new EntityDiscoveryGovernancePresetInfo();
        value.setId(text(preset.id()));
        value.setName(text(preset.name()));
        value.setOwner(text(preset.owner()));
        value.setSystem(text(preset.system()));
        value.setSource(text(preset.source()));
        value.setEnvironment(text(preset.environment()));
        value.setStatus(text(preset.status()));
        value.setBulkOwner(text(preset.bulkOwner()));
        value.setBulkSystem(text(preset.bulkSystem()));
        value.setCreator(AgentToolContextSupport.invocation().getRequest().getActor().getId());
        return safe(entities.saveDiscoveryGovernancePreset(value));
    }

    @Tool(name = "entity.definition_template_save", description = "Save a validated non-secret definition template shared in this workspace; does not import entities.")
    @AgentToolPolicy(access = AgentToolAccess.USER, risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> saveTemplate(@ToolParam(required = false) String templateId, String name, String content, String format,
                                          @ToolParam(required = false) String summary) {
        definitions.validateTemplate(content, format);
        EntityDefinitionWorkspaceTemplateInfo template = new EntityDefinitionWorkspaceTemplateInfo();
        template.setId(text(templateId));
        template.setName(text(name));
        template.setContent(content);
        template.setFormat(format);
        template.setSummary(text(summary));
        template.setCreator(AgentToolContextSupport.invocation().getRequest().getActor().getId());
        return safe(entities.saveDefinitionWorkspaceTemplate(template));
    }

    @Tool(name = "entity.discovery_preset_delete", description = "Delete workspace-shared governance helper state by key. Requires administrator authorization.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> deletePreset(String key) {
        key(key);
        entities.deleteDiscoveryGovernancePreset(key);
        return Map.of("deleted", true, "key", key);
    }

    @Tool(name = "entity.definition_template_delete", description = "Delete workspace-shared governance helper state by key. Requires administrator authorization.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> deleteTemplate(String key) {
        key(key);
        entities.deleteDefinitionWorkspaceTemplate(key);
        return Map.of("deleted", true, "key", key);
    }

    @Tool(name = "entity.definition_resume_delete", description = "Delete workspace-shared governance helper state by key. Requires administrator authorization.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> deleteResume(String key) {
        key(key);
        entities.deleteDefinitionWorkspaceResume(key);
        return Map.of("deleted", true, "key", key);
    }


    /** Workspace Activity typed projection. */
    public record WorkspaceActivity(String id, String status, String format, String summary, String detail, Long entityId, String entityName) { }

    @Tool(name = "entity.definition_workspace_activity_save", description = "Save workspace-shared helper state, not execution evidence. Advanced route/query parameters and discovery"
            + " entity reference changes require the entity UI.")
    @AgentToolPolicy(access = AgentToolAccess.USER, risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> saveWorkspaceActivity(WorkspaceActivity input) {
        if (input == null) {
            throw new IllegalArgumentException("input is required");
        }
        EntityDefinitionWorkspaceActivityInfo value = new EntityDefinitionWorkspaceActivityInfo();
        value.setId(text(input.id()));
        value.setStatus(text(input.status()));
        value.setFormat(text(input.format()));
        value.setSummary(text(input.summary()));
        value.setDetail(text(input.detail()));
        value.setEntityId(input.entityId());
        value.setEntityName(text(input.entityName()));
        value.setCreator(AgentToolContextSupport.invocation().getRequest().getActor().getId());
        return safe(entities.saveDefinitionWorkspaceActivity(value));
    }


    /** Resume typed projection. */
    public record Resume(String token, String content, String format, String source, Integer count, String ownerDraft, String systemDraft, String runbookDraft) { }

    @Tool(name = "entity.definition_resume_save", description = "Save workspace-shared helper state, not execution evidence. Advanced route/query parameters and discovery"
            + " entity reference changes require the entity UI.")
    @AgentToolPolicy(access = AgentToolAccess.USER, risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> saveResume(Resume input) {
        if (input == null) {
            throw new IllegalArgumentException("input is required");
        }
        definitions.validateTemplate(input.content(), input.format());
        EntityDefinitionWorkspaceResumeInfo value = new EntityDefinitionWorkspaceResumeInfo();
        value.setToken(text(input.token()));
        value.setContent(input.content());
        value.setFormat(text(input.format()));
        value.setSource(text(input.source()));
        value.setCount(input.count());
        value.setOwnerDraft(text(input.ownerDraft()));
        value.setSystemDraft(text(input.systemDraft()));
        value.setRunbookDraft(text(input.runbookDraft()));
        value.setCreator(AgentToolContextSupport.invocation().getRequest().getActor().getId());
        return safe(entities.saveDefinitionWorkspaceResume(value));
    }


    /** Discovery Activity typed projection. */
    public record DiscoveryActivity(String id, String status, String action, String summary, String detail) { }

    @Tool(name = "entity.discovery_activity_save", description = "Save workspace-shared helper state, not execution evidence. Advanced route/query parameters and discovery"
            + " entity reference changes require the entity UI.")
    @AgentToolPolicy(access = AgentToolAccess.USER, risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> saveDiscoveryActivity(DiscoveryActivity input) {
        if (input == null) {
            throw new IllegalArgumentException("input is required");
        }
        EntityDiscoveryGovernanceActivityInfo value = new EntityDiscoveryGovernanceActivityInfo();
        value.setId(text(input.id()));
        value.setStatus(text(input.status()));
        value.setAction(text(input.action()));
        value.setSummary(text(input.summary()));
        value.setDetail(text(input.detail()));
        value.setCreator(AgentToolContextSupport.invocation().getRequest().getActor().getId());
        return safe(entities.saveDiscoveryGovernanceActivity(value));
    }

    private static int limit(Integer limit) {
        if (limit != null && (limit < 1 || limit > 50)) {
            throw new IllegalArgumentException("limit must be between 1 and 50");
        }
        return limit == null ? 10 : limit;
    }

    private static void key(String value) {
        if (value == null || value.isBlank() || value.length() > 256) {
            throw new IllegalArgumentException("A nonblank key of at most 256 characters is required");
        }
    }

    private static String text(String value) {
        if (value != null && value.length() > 512) {
            throw new IllegalArgumentException("Governance text must not exceed 512 characters");
        }
        return value;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> safe(Object value) {
        if (value == null) {
            return Map.of("found", false);
        }
        Map<String, Object> wrapped = JsonUtil.fromJson(JsonUtil.toJson(Map.of("data", value)), Map.class);
        omitDefinitionContent(wrapped);
        return GatewaySecretRedactor.redactMap(wrapped);
    }

    /** Native helper state may contain raw JSON/YAML with credentials, including malformed documents. */
    @SuppressWarnings("unchecked")
    private static void omitDefinitionContent(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> fields = (Map<String, Object>) map;
            if (fields.containsKey("content")) {
                fields.remove("content");
                fields.put("contentOmitted", true);
                fields.put("contentOmissionReason", "Raw definition content may contain credentials; review it in the entity UI");
            }
            fields.values().forEach(AgentEntityGovernanceToolService::omitDefinitionContent);
        } else if (value instanceof List<?> list) {
            list.forEach(AgentEntityGovernanceToolService::omitDefinitionContent);
        }
    }

}
