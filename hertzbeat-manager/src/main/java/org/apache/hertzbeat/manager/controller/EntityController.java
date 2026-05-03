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

package org.apache.hertzbeat.manager.controller;

import static org.apache.hertzbeat.common.constants.CommonConstants.MONITOR_NOT_EXIST_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionRequest;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityCatalogSuggestionsInfo;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.manager.pojo.dto.EntityDetailDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceResumeInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceTemplateInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernanceActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernancePresetInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityMonitorBindingCandidate;
import org.apache.hertzbeat.manager.pojo.dto.EntitySummaryInfo;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.observability.dto.entity.MonitorInfo;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.springframework.data.domain.Page;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Entity manage API.
 */
@Tag(name = "Entity Manage API")
@RestController
@RequestMapping(path = "/api/entities", produces = {APPLICATION_JSON_VALUE})
public class EntityController {

    @Autowired
    private ObserveEntityService observeEntityService;

    @PostMapping
    @Operation(summary = "Add a new entity", description = "Add a new entity")
    public ResponseEntity<Message<Long>> addEntity(@Valid @RequestBody EntityDto entityDto) {
        observeEntityService.validate(entityDto, false);
        long entityId = observeEntityService.addEntity(entityDto);
        Message<Long> message = Message.success(entityId);
        message.setMsg("Add success");
        return ResponseEntity.ok(message);
    }

    @PutMapping
    @Operation(summary = "Modify an entity", description = "Modify an entity")
    public ResponseEntity<Message<Void>> modifyEntity(@Valid @RequestBody EntityDto entityDto) {
        observeEntityService.validate(entityDto, true);
        observeEntityService.modifyEntity(entityDto);
        return ResponseEntity.ok(Message.success("Modify success"));
    }

    @PostMapping("/definition/parse")
    @Operation(summary = "Parse entity definition", description = "Parse entity definition content to entity dto")
    public ResponseEntity<Message<EntityDto>> parseEntityDefinition(@Valid @RequestBody EntityDefinitionRequest definitionRequest) {
        EntityDto entityDto = observeEntityService.parseEntityDefinition(definitionRequest, null);
        return ResponseEntity.ok(Message.success(entityDto));
    }

    @PostMapping("/definition/bundle/parse")
    @Operation(summary = "Parse entity definition bundle", description = "Parse entity definition bundle content to entity dto list")
    public ResponseEntity<Message<List<EntityDto>>> parseEntityDefinitionBundle(@Valid @RequestBody EntityDefinitionRequest definitionRequest) {
        List<EntityDto> entityDtos = observeEntityService.parseEntityDefinitionBundle(definitionRequest);
        return ResponseEntity.ok(Message.success(entityDtos));
    }

    @PostMapping("/definition")
    @Operation(summary = "Add entity by definition", description = "Add entity by definition content")
    public ResponseEntity<Message<Long>> addEntityByDefinition(@Valid @RequestBody EntityDefinitionRequest definitionRequest) {
        long entityId = observeEntityService.addEntityByDefinition(definitionRequest);
        Message<Long> message = Message.success(entityId);
        message.setMsg("Add success");
        return ResponseEntity.ok(message);
    }

    @PostMapping("/definition/bundle")
    @Operation(summary = "Add entities by definition bundle", description = "Add one or more entities by definition bundle content")
    public ResponseEntity<Message<List<Long>>> addEntitiesByDefinitionBundle(@Valid @RequestBody EntityDefinitionRequest definitionRequest) {
        List<Long> entityIds = observeEntityService.addEntitiesByDefinitionBundle(definitionRequest);
        Message<List<Long>> message = Message.success(entityIds);
        message.setMsg("Add success");
        return ResponseEntity.ok(message);
    }

    @GetMapping("/{id:\\d+}")
    @Operation(summary = "Get entity by ID", description = "Get entity by ID")
    public ResponseEntity<Message<EntityDto>> getEntity(
            @Parameter(description = "Entity ID", example = "87584674384") @PathVariable("id") long id) {
        EntityDto entityDto = observeEntityService.getEntityDto(id);
        if (entityDto == null) {
            return ResponseEntity.ok(Message.fail(MONITOR_NOT_EXIST_CODE, "Entity not exist."));
        }
        return ResponseEntity.ok(Message.success(entityDto));
    }

    @DeleteMapping("/{id:\\d+}")
    @Operation(summary = "Delete entity by ID", description = "Delete entity by ID")
    public ResponseEntity<Message<Void>> deleteEntity(
            @Parameter(description = "Entity ID", example = "87584674384") @PathVariable("id") long id) {
        observeEntityService.deleteEntity(id);
        return ResponseEntity.ok(Message.success("Delete success"));
    }

    @GetMapping
    @Operation(summary = "Query entities", description = "Query entities with filters")
    public ResponseEntity<Message<Page<EntitySummaryInfo>>> getEntities(
            @Parameter(description = "Entity IDs") @RequestParam(required = false) List<Long> ids,
            @Parameter(description = "Entity type", example = "service") @RequestParam(required = false) String type,
            @Parameter(description = "Entity status", example = "healthy") @RequestParam(required = false) String status,
            @Parameter(description = "Owner", example = "team-sre") @RequestParam(required = false) String owner,
            @Parameter(description = "Entity source", example = "manual") @RequestParam(required = false) String source,
            @Parameter(description = "Environment", example = "prod") @RequestParam(required = false) String environment,
            @Parameter(description = "Lifecycle", example = "production") @RequestParam(required = false) String lifecycle,
            @Parameter(description = "Tier", example = "tier1") @RequestParam(required = false) String tier,
            @Parameter(description = "System", example = "commerce-platform") @RequestParam(required = false) String system,
            @Parameter(description = "Search", example = "payment") @RequestParam(required = false) String search,
            @Parameter(description = "Sort field", example = "gmtUpdate") @RequestParam(defaultValue = "gmtUpdate") String sort,
            @Parameter(description = "Sort order", example = "desc") @RequestParam(defaultValue = "desc") String order,
            @Parameter(description = "Page index", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Page size", example = "8") @RequestParam(defaultValue = "8") int pageSize) {
        Page<EntitySummaryInfo> page = observeEntityService.getEntities(ids, type, status, search, owner, source,
                environment, lifecycle, tier, system,
                sort, order, pageIndex, pageSize);
        return ResponseEntity.ok(Message.success(page));
    }

    @GetMapping("/{id:\\d+}/detail")
    @Operation(summary = "Get entity detail workspace", description = "Get entity detail workspace")
    public ResponseEntity<Message<EntityDetailDto>> getEntityDetail(
            @Parameter(description = "Entity ID", example = "87584674384") @PathVariable("id") long id) {
        EntityDetailDto detail = observeEntityService.getEntityDetail(id);
        if (detail == null) {
            return ResponseEntity.ok(Message.fail(MONITOR_NOT_EXIST_CODE, "Entity not exist."));
        }
        return ResponseEntity.ok(Message.success(detail));
    }

    @GetMapping("/{id:\\d+}/alerts")
    @Operation(summary = "Get entity alerts", description = "Query active alerts in the entity troubleshooting context")
    public ResponseEntity<Message<Page<SingleAlert>>> getEntityAlerts(
            @Parameter(description = "Entity ID", example = "87584674384") @PathVariable("id") long id,
            @Parameter(description = "Alert status", example = "firing") @RequestParam(required = false) String status,
            @Parameter(description = "Alert severity", example = "critical") @RequestParam(required = false) String severity,
            @Parameter(description = "Page index", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Page size", example = "10") @RequestParam(defaultValue = "10") int pageSize) {
        return ResponseEntity.ok(Message.success(observeEntityService.getEntityAlerts(id, status, severity, pageIndex, pageSize)));
    }

    @GetMapping("/{id:\\d+}/monitors")
    @Operation(summary = "Get entity monitors", description = "Query bound monitors in the entity troubleshooting context")
    public ResponseEntity<Message<Page<MonitorInfo>>> getEntityMonitors(
            @Parameter(description = "Entity ID", example = "87584674384") @PathVariable("id") long id,
            @Parameter(description = "Monitor status", example = "2") @RequestParam(required = false) Byte status,
            @Parameter(description = "Monitor app", example = "springboot3") @RequestParam(required = false) String app,
            @Parameter(description = "Page index", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Page size", example = "10") @RequestParam(defaultValue = "10") int pageSize) {
        return ResponseEntity.ok(Message.success(observeEntityService.getEntityMonitors(id, status, app, pageIndex, pageSize)));
    }

    @GetMapping("/definition-activities")
    @Operation(summary = "Get entity definition activities", description = "Query recent entity definition lifecycle activities")
    public ResponseEntity<Message<List<EntityDefinitionActivityInfo>>> getDefinitionActivities(
            @Parameter(description = "Entity ID", example = "87584674384") @RequestParam(required = false) Long entityId,
            @Parameter(description = "Page size", example = "12") @RequestParam(defaultValue = "12") int limit) {
        return ResponseEntity.ok(Message.success(observeEntityService.getDefinitionActivities(entityId, limit)));
    }

    @GetMapping("/definition/templates")
    @Operation(summary = "Get definition workspace templates", description = "Query shared definition workspace templates")
    public ResponseEntity<Message<List<EntityDefinitionWorkspaceTemplateInfo>>> getDefinitionWorkspaceTemplates(
            @Parameter(description = "Template ID", example = "definition-template-1710000000") @RequestParam(required = false) String templateId,
            @Parameter(description = "Page size", example = "8") @RequestParam(defaultValue = "8") int limit) {
        return ResponseEntity.ok(Message.success(observeEntityService.getDefinitionWorkspaceTemplates(templateId, limit)));
    }

    @PostMapping("/definition/templates")
    @Operation(summary = "Save definition workspace template", description = "Create or update a shared definition workspace template")
    public ResponseEntity<Message<EntityDefinitionWorkspaceTemplateInfo>> saveDefinitionWorkspaceTemplate(
            @Valid @RequestBody EntityDefinitionWorkspaceTemplateInfo templateInfo) {
        return ResponseEntity.ok(Message.success(observeEntityService.saveDefinitionWorkspaceTemplate(templateInfo)));
    }

    @DeleteMapping("/definition/templates/{templateId}")
    @Operation(summary = "Delete definition workspace template", description = "Delete a shared definition workspace template")
    public ResponseEntity<Message<Void>> deleteDefinitionWorkspaceTemplate(
            @Parameter(description = "Template ID", example = "definition-template-1710000000") @PathVariable("templateId") String templateId) {
        observeEntityService.deleteDefinitionWorkspaceTemplate(templateId);
        return ResponseEntity.ok(Message.success("Delete success"));
    }

    @GetMapping("/definition/workspace-activities")
    @Operation(summary = "Get definition workspace activities", description = "Query shared definition workspace helper activities")
    public ResponseEntity<Message<List<EntityDefinitionWorkspaceActivityInfo>>> getDefinitionWorkspaceActivities(
            @Parameter(description = "Activity ID", example = "definition-workspace-activity-1710000000") @RequestParam(required = false) String activityId,
            @Parameter(description = "Page size", example = "8") @RequestParam(defaultValue = "8") int limit) {
        return ResponseEntity.ok(Message.success(observeEntityService.getDefinitionWorkspaceActivities(activityId, limit)));
    }

    @PostMapping("/definition/workspace-activities")
    @Operation(summary = "Save definition workspace activity", description = "Create or update a shared definition workspace helper activity")
    public ResponseEntity<Message<EntityDefinitionWorkspaceActivityInfo>> saveDefinitionWorkspaceActivity(
            @Valid @RequestBody EntityDefinitionWorkspaceActivityInfo activityInfo) {
        return ResponseEntity.ok(Message.success(observeEntityService.saveDefinitionWorkspaceActivity(activityInfo)));
    }

    @GetMapping("/definition/workspace-resumes")
    @Operation(summary = "Get definition workspace resume state", description = "Query shared definition workspace resume state by token")
    public ResponseEntity<Message<EntityDefinitionWorkspaceResumeInfo>> getDefinitionWorkspaceResume(
            @Parameter(description = "Resume token", example = "definition-resume-1710000000") @RequestParam("token") String token) {
        return ResponseEntity.ok(Message.success(observeEntityService.getDefinitionWorkspaceResume(token)));
    }

    @PostMapping("/definition/workspace-resumes")
    @Operation(summary = "Save definition workspace resume state", description = "Create or update a shared definition workspace resume state")
    public ResponseEntity<Message<EntityDefinitionWorkspaceResumeInfo>> saveDefinitionWorkspaceResume(
            @Valid @RequestBody EntityDefinitionWorkspaceResumeInfo resumeInfo) {
        return ResponseEntity.ok(Message.success(observeEntityService.saveDefinitionWorkspaceResume(resumeInfo)));
    }

    @DeleteMapping("/definition/workspace-resumes/{token}")
    @Operation(summary = "Delete definition workspace resume state", description = "Delete a shared definition workspace resume state")
    public ResponseEntity<Message<Void>> deleteDefinitionWorkspaceResume(
            @Parameter(description = "Resume token", example = "definition-resume-1710000000") @PathVariable("token") String token) {
        observeEntityService.deleteDefinitionWorkspaceResume(token);
        return ResponseEntity.ok(Message.success("Delete success"));
    }

    @GetMapping("/discovery/governance-presets")
    @Operation(summary = "Get discovery governance presets", description = "Query shared discovery governance presets")
    public ResponseEntity<Message<List<EntityDiscoveryGovernancePresetInfo>>> getDiscoveryGovernancePresets(
            @Parameter(description = "Page size", example = "8") @RequestParam(defaultValue = "8") int limit) {
        return ResponseEntity.ok(Message.success(observeEntityService.getDiscoveryGovernancePresets(limit)));
    }

    @PostMapping("/discovery/governance-presets")
    @Operation(summary = "Save discovery governance preset", description = "Create or update a shared discovery governance preset")
    public ResponseEntity<Message<EntityDiscoveryGovernancePresetInfo>> saveDiscoveryGovernancePreset(
            @Valid @RequestBody EntityDiscoveryGovernancePresetInfo presetInfo) {
        return ResponseEntity.ok(Message.success(observeEntityService.saveDiscoveryGovernancePreset(presetInfo)));
    }

    @DeleteMapping("/discovery/governance-presets/{presetId}")
    @Operation(summary = "Delete discovery governance preset", description = "Delete a shared discovery governance preset")
    public ResponseEntity<Message<Void>> deleteDiscoveryGovernancePreset(
            @Parameter(description = "Preset ID", example = "preset-1710000000") @PathVariable("presetId") String presetId) {
        observeEntityService.deleteDiscoveryGovernancePreset(presetId);
        return ResponseEntity.ok(Message.success("Delete success"));
    }

    @GetMapping("/discovery/governance-activities")
    @Operation(summary = "Get discovery governance activities", description = "Query shared discovery governance helper activities")
    public ResponseEntity<Message<List<EntityDiscoveryGovernanceActivityInfo>>> getDiscoveryGovernanceActivities(
            @Parameter(description = "Activity ID", example = "activity-1710000000") @RequestParam(required = false) String activityId,
            @Parameter(description = "Page size", example = "8") @RequestParam(defaultValue = "8") int limit) {
        return ResponseEntity.ok(Message.success(observeEntityService.getDiscoveryGovernanceActivities(activityId, limit)));
    }

    @PostMapping("/discovery/governance-activities")
    @Operation(summary = "Save discovery governance activity", description = "Create or update a shared discovery governance helper activity")
    public ResponseEntity<Message<EntityDiscoveryGovernanceActivityInfo>> saveDiscoveryGovernanceActivity(
            @Valid @RequestBody EntityDiscoveryGovernanceActivityInfo activityInfo) {
        return ResponseEntity.ok(Message.success(observeEntityService.saveDiscoveryGovernanceActivity(activityInfo)));
    }

    @GetMapping("/catalog-suggestions")
    @Operation(summary = "Get reusable catalog suggestions", description = "Query reusable owners, systems, references and governance values from the entity catalog")
    public ResponseEntity<Message<EntityCatalogSuggestionsInfo>> getCatalogSuggestions(
            @Parameter(description = "Suggestion count limit", example = "120") @RequestParam(defaultValue = "120") int limit) {
        return ResponseEntity.ok(Message.success(observeEntityService.getCatalogSuggestions(limit)));
    }

    @GetMapping("/{id:\\d+}/definition")
    @Operation(summary = "Get entity definition", description = "Get entity definition in yaml or json")
    public ResponseEntity<Message<String>> getEntityDefinition(
            @Parameter(description = "Entity ID", example = "87584674384") @PathVariable("id") long id,
            @Parameter(description = "Definition format", example = "yaml") @RequestParam(defaultValue = "yaml") String format) {
        EntityDto entityDto = observeEntityService.getEntityDto(id);
        if (entityDto == null) {
            return ResponseEntity.ok(Message.fail(MONITOR_NOT_EXIST_CODE, "Entity not exist."));
        }
        Message<String> message = Message.success();
        message.setData(observeEntityService.getEntityDefinition(id, format));
        return ResponseEntity.ok(message);
    }

    @PutMapping("/{id:\\d+}/definition")
    @Operation(summary = "Modify entity by definition", description = "Modify entity by definition content")
    public ResponseEntity<Message<Void>> modifyEntityByDefinition(
            @Parameter(description = "Entity ID", example = "87584674384") @PathVariable("id") long id,
            @Valid @RequestBody EntityDefinitionRequest definitionRequest) {
        observeEntityService.modifyEntityByDefinition(id, definitionRequest);
        return ResponseEntity.ok(Message.success("Modify success"));
    }

    @GetMapping("/monitor/{monitorId:\\d+}/candidates")
    @Operation(summary = "Recommend entities for a monitor", description = "Recommend entities for a monitor")
    public ResponseEntity<Message<List<EntityMonitorBindingCandidate>>> getMonitorBindingCandidates(
            @Parameter(description = "Monitor ID", example = "87584674384") @PathVariable("monitorId") long monitorId) {
        List<EntityMonitorBindingCandidate> candidates = observeEntityService.getMonitorBindingCandidates(monitorId);
        return ResponseEntity.ok(Message.success(candidates));
    }
}
