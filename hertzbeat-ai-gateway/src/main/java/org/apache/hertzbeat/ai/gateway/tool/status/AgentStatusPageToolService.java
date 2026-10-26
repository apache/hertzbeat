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

package org.apache.hertzbeat.ai.gateway.tool.status;

import jakarta.validation.Validator;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageComponentInfo;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageIncidentContentInfo;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageIncidentInfo;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageOrgInfo;
import org.apache.hertzbeat.manager.service.StatusPageService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Validated platform management tools. */
@Service
public class AgentStatusPageToolService {
    private final StatusPageService service;
    private final Validator validator;

    public AgentStatusPageToolService(StatusPageService service, Validator validator) {
        this.service = service;
        this.validator = validator;
    }

    /** Editable organization fields. */
    public record Organization(String name, String description, String home, String logo,
                               String feedback, String color, byte state) { }

    /** Editable component fields. */
    public record Component(Long orgId, String name, String description, Map<String, String> labels,
                            byte method, byte configState) { }

    /** Incident publication input; existing content is retained on updates. */
    public record Incident(Long orgId, String name, byte state, List<Long> componentIds, String message) { }

    @Tool(
            name = "status_page.organization.get",
            description = "Read status-page organization settings.")
    @AgentToolPolicy(
            risk = AgentToolRisk.READ,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.STANDARD)
    public Map<String, Object> organization() {
        var value = service.queryStatusPageOrg();
        return value == null
                ? AgentManagementOutputSupport.view(null)
                : source("status_page.organization.get", value);
    }

    @Tool(
            name = "status_page.organization.save",
            description =
                    "Publish organization settings to the public status page. AI execution requires"
                        + " administrator confirmation; ordinary users use the native status page.")
    @AgentToolPolicy(
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.USER)
    public Map<String, Object> saveOrganization(
            Organization configuration,
            @ToolParam(
                            required = false,
                            description =
                                    "Exact existing organization id for update; omit only for first"
                                        + " creation.")
                    Long expectedOrgId,
            @ToolParam(
                            required = false,
                            description =
                                    "Exact sourceHash from organization.get for update; omit only"
                                        + " for creation.")
                    String sourceHash) {
        if (configuration == null || configuration.state() < 0 || configuration.state() > 2) {
            throw new IllegalArgumentException("Invalid organization configuration");
        }
        StatusPageOrgInfo value = service.queryStatusPageOrg();
        if (value == null) {
            if (expectedOrgId != null || sourceHash != null)
                throw new IllegalArgumentException("Organization source is absent");
            value = new StatusPageOrgInfo();
        } else {
            if (expectedOrgId == null || !expectedOrgId.equals(value.getId()))
                throw new IllegalArgumentException("Exact organization target is required");
            AgentStatusPageWriteProof.requireSource(
                    "status_page.organization.save", sourceHash, value);
        }
        value.setName(configuration.name());
        value.setDescription(configuration.description());
        value.setHome(configuration.home());
        value.setLogo(configuration.logo());
        value.setFeedback(configuration.feedback());
        value.setColor(configuration.color());
        value.setState(configuration.state());
        validate(value);
        var expected =
                AgentStatusPageWriteProof.contentHash("status_page.organization.save", value);
        var saved = service.saveStatusPageOrg(value);
        requireId(saved == null ? null : saved.getId());
        var observed = service.queryStatusPageOrg();
        if (observed == null || !saved.getId().equals(observed.getId()))
            throw new IllegalStateException(
                    "STATUS_PAGE_ORGANIZATION_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
        return written(
                "status_page.organization.save",
                AgentToolContextSupport.arguments(
                        "configuration",
                        configuration,
                        "expectedOrgId",
                        expectedOrgId,
                        "sourceHash",
                        sourceHash),
                expected,
                observed,
                saved.getId());
    }

    @Tool(
            name = "status_page.component.list",
            description =
                    "Page status components in memory; the existing manager service still loads all"
                        + " components.")
    @AgentToolPolicy(
            risk = AgentToolRisk.READ,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.STANDARD)
    public Map<String, Object> components(
            @ToolParam(required = false) Integer pageIndex,
            @ToolParam(required = false) Integer pageSize) {
        int index = AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, Integer.MAX_VALUE);
        int size = AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 100);
        List<StatusPageComponentInfo> all = service.queryStatusPageComponents();
        long offset = (long) index * size;
        int start = (int) Math.min(offset, all.size());
        int end = Math.min(start + size, all.size());
        Map<String, Object> result =
                AgentManagementOutputSupport.view(
                        Map.of(
                                "content",
                                all.subList(start, end),
                                "pageIndex",
                                index,
                                "pageSize",
                                size,
                                "totalElements",
                                all.size()));
        result.put("hasMore", end < all.size());
        result.put(
                "sourceReadScope",
                "all components loaded by existing manager service; output paginated in memory");
        return result;
    }

    @Tool(name = "status_page.component.get", description = "Read an exact status-page component.")
    @AgentToolPolicy(risk = AgentToolRisk.READ, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.STANDARD)
    public Map<String, Object> component(Long componentId) {
        return source("status_page.component.get", requiredStatusPageComponentInfo(componentId));
    }

    private StatusPageComponentInfo requiredStatusPageComponentInfo(Long componentId) {
        requireId(componentId);
        StatusPageComponentInfo value = service.queryStatusPageComponent(componentId);
        if (value == null || !componentId.equals(value.getId())) {
            throw new IllegalArgumentException("Status component not found");
        }
        return value;
    }

    @Tool(
            name = "status_page.component.create",
            description =
                    "Publish a status component and its selected monitoring labels. AI execution"
                        + " requires administrator confirmation; ordinary users use the native"
                        + " status page.")
    @AgentToolPolicy(
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.USER)
    public Map<String, Object> createComponent(Component configuration) {
        StatusPageComponentInfo value = apply(new StatusPageComponentInfo(), configuration);
        var expected = AgentStatusPageWriteProof.contentHash("status_page.component.create", value);
        service.newStatusPageComponent(value);
        return written(
                "status_page.component.create",
                AgentToolContextSupport.arguments("configuration", configuration),
                expected,
                requiredStatusPageComponentInfo(value.getId()),
                value.getId());
    }

    @Tool(
            name = "status_page.component.update",
            description =
                    "Update a publicly visible status component. AI execution requires"
                        + " administrator confirmation; ordinary users use the native status page.")
    @AgentToolPolicy(
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.USER)
    public Map<String, Object> updateComponent(
            Long componentId,
            Component configuration,
            @ToolParam(
                            description =
                                    "sourceHash from component.get; snapshot condition, not atomic"
                                        + " CAS.")
                    String sourceHash) {
        var current = requiredStatusPageComponentInfo(componentId);
        AgentStatusPageWriteProof.requireSource(
                "status_page.component.update", sourceHash, current);
        StatusPageComponentInfo value = apply(current, configuration);
        var expected = AgentStatusPageWriteProof.contentHash("status_page.component.update", value);
        service.updateStatusPageComponent(value);
        return written(
                "status_page.component.update",
                AgentToolContextSupport.arguments(
                        "componentId",
                        componentId,
                        "configuration",
                        configuration,
                        "sourceHash",
                        sourceHash),
                expected,
                requiredStatusPageComponentInfo(componentId),
                componentId);
    }

    @Tool(
            name = "status_page.component.delete",
            description = "Permanently remove a public status component.")
    @AgentToolPolicy(
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.ADMIN)
    public Map<String, Object> deleteComponent(
            Long componentId,
            String reason,
            @ToolParam(
                            description =
                                    "sourceHash from component.get; preserves exact approval"
                                        + " target.")
                    String sourceHash) {
        requireReason(reason);
        AgentStatusPageWriteProof.requireSource(
                "status_page.component.delete",
                sourceHash,
                requiredStatusPageComponentInfo(componentId));
        service.deleteStatusPageComponent(componentId);
        if (service.queryStatusPageComponent(componentId) != null)
            throw new IllegalStateException("STATUS_PAGE_DELETE_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
        return Map.of(
                "deletedId",
                componentId,
                "mutationReceipt",
                AgentStatusPageWriteProof.receipt(
                        "status_page.component.delete",
                        componentId,
                        AgentToolContextSupport.arguments(
                                "componentId",
                                componentId,
                                "reason",
                                reason,
                                "sourceHash",
                                sourceHash),
                        "absent",
                        true));
    }

    @Tool(
            name = "status_page.incident.list",
            description = "List published status incidents with bounded pagination.")
    @AgentToolPolicy(
            risk = AgentToolRisk.READ,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.STANDARD)
    public Map<String, Object> incidents(
            @ToolParam(required = false) String search,
            @ToolParam(required = false) Integer pageIndex,
            @ToolParam(required = false) Integer pageSize,
            @ToolParam(required = false, description = "Start Unix timestamp in milliseconds.")
                    Long startTime,
            @ToolParam(
                            required = false,
                            description =
                                    "End Unix timestamp in milliseconds, maximum 366-day window.")
                    Long endTime) {
        if (startTime != null || endTime != null) {
            if (startTime == null || endTime == null || startTime < 0 || endTime <= startTime
                    || endTime - startTime > java.time.Duration.ofDays(366).toMillis()) {
                throw new IllegalArgumentException(
                        "Incident time range must be complete, ordered, and at most 366 days");
            }
        }
        if (search != null && search.length() > 256) {
            throw new IllegalArgumentException("Incident search exceeds 256 characters");
        }
        Page<StatusPageIncidentInfo> page = service.queryStatusPageIncidents(search, startTime, endTime,
                AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, Integer.MAX_VALUE),
                AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 100));
        Map<String, Object> result = AgentManagementOutputSupport.view(page.map(this::incidentSummary));
        result.put("summaryOnly", true);
        result.put(
                "detailOmitted",
                "Incident contents and components are summarized; use incident.get for bounded"
                    + " details");
        result.put(
                "sourceReadScope",
                "Existing service loads full history for incidents on this page");
        return result;
    }

    /** Compatibility for existing typed callers. */
    public Map<String, Object> incidents(String search, Integer pageIndex, Integer pageSize) {
        return incidents(search, pageIndex, pageSize, null, null);
    }

    @Tool(
            name = "status_page.incident.get",
            description = "Read an exact published status incident.")
    @AgentToolPolicy(
            risk = AgentToolRisk.READ,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.STANDARD)
    public Map<String, Object> incident(Long incidentId) {
        StatusPageIncidentInfo value = requiredStatusPageIncidentInfo(incidentId);
        Map<String, Object> detail = incidentSummary(value);
        List<StatusPageIncidentContentInfo> contents = value.getContents() == null ? List.of() : value.getContents();
        detail.put(
                "contents", contents.subList(Math.max(0, contents.size() - 20), contents.size()));
        List<StatusPageComponentInfo> components = value.getComponents() == null ? List.of() : value.getComponents();
        detail.put("components", components.subList(0, Math.min(100, components.size())));
        Map<String, Object> result = AgentManagementOutputSupport.view(detail);
        result.put(
                "partial",
                Boolean.TRUE.equals(result.get("partial"))
                        || contents.size() > 20
                        || components.size() > 100);
        if (!Boolean.TRUE.equals(result.get("partial")))
            result.put(
                    "sourceHash",
                    AgentStatusPageWriteProof.sourceHash("status_page.incident.get", value));
        result.put(
                "historyWindow", "Last 20 entries in stored order; not guaranteed chronological");
        result.put(
                "sourceReadScope",
                "Existing manager service loads full incident history before output projection");
        return result;
    }

    private StatusPageIncidentInfo requiredStatusPageIncidentInfo(Long incidentId) {
        requireId(incidentId);
        StatusPageIncidentInfo value = service.queryStatusPageIncident(incidentId);
        if (value == null || !incidentId.equals(value.getId())) {
            throw new IllegalArgumentException("Status incident not found");
        }
        return value;
    }

    @Tool(
            name = "status_page.incident.create",
            description =
                    "Publish an incident message and affected components publicly. AI execution"
                        + " requires administrator confirmation; ordinary users use the native"
                        + " status page.")
    @AgentToolPolicy(
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.USER)
    public Map<String, Object> createIncident(Incident configuration) {
        StatusPageIncidentInfo value = apply(new StatusPageIncidentInfo(), configuration);
        var expected = AgentStatusPageWriteProof.contentHash("status_page.incident.create", value);
        service.newStatusPageIncident(value);
        return written(
                "status_page.incident.create",
                AgentToolContextSupport.arguments("configuration", configuration),
                expected,
                requiredStatusPageIncidentInfo(value.getId()),
                value.getId());
    }

    @Tool(
            name = "status_page.incident.update",
            description =
                    "Update a public incident, appending a status message. AI execution requires"
                        + " administrator confirmation; ordinary users use the native status page.")
    @AgentToolPolicy(
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.USER)
    public Map<String, Object> updateIncident(
            Long incidentId,
            Incident configuration,
            @ToolParam(
                            description =
                                    "sourceHash from complete incident.get; partial history"
                                        + " requires native editor.")
                    String sourceHash) {
        var current = requiredStatusPageIncidentInfo(incidentId);
        AgentStatusPageWriteProof.requireSource("status_page.incident.update", sourceHash, current);
        StatusPageIncidentInfo value = apply(current, configuration);
        var expected = AgentStatusPageWriteProof.contentHash("status_page.incident.update", value);
        service.updateStatusPageIncident(value);
        return written(
                "status_page.incident.update",
                AgentToolContextSupport.arguments(
                        "incidentId",
                        incidentId,
                        "configuration",
                        configuration,
                        "sourceHash",
                        sourceHash),
                expected,
                requiredStatusPageIncidentInfo(incidentId),
                incidentId);
    }

    @Tool(
            name = "status_page.incident.delete",
            description = "Permanently remove a published incident and its history.")
    @AgentToolPolicy(
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.ADMIN)
    public Map<String, Object> deleteIncident(
            Long incidentId,
            String reason,
            @ToolParam(
                            description =
                                    "sourceHash from complete incident.get; exact destructive"
                                        + " target.")
                    String sourceHash) {
        requireReason(reason);
        AgentStatusPageWriteProof.requireSource(
                "status_page.incident.delete",
                sourceHash,
                requiredStatusPageIncidentInfo(incidentId));
        service.deleteStatusPageIncident(incidentId);
        if (service.queryStatusPageIncident(incidentId) != null)
            throw new IllegalStateException("STATUS_PAGE_DELETE_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
        return Map.of(
                "deletedId",
                incidentId,
                "mutationReceipt",
                AgentStatusPageWriteProof.receipt(
                        "status_page.incident.delete",
                        incidentId,
                        AgentToolContextSupport.arguments(
                                "incidentId",
                                incidentId,
                                "reason",
                                reason,
                                "sourceHash",
                                sourceHash),
                        "absent",
                        true));
    }

    /**
     * Existing Java callers retain their signatures; model callbacks use explicit snapshot
     * preconditions.
     */
    public Map<String, Object> saveOrganization(Organization value) {
        var current = service.queryStatusPageOrg();
        return saveOrganization(
                value,
                current == null ? null : current.getId(),
                current == null
                        ? null
                        : AgentStatusPageWriteProof.sourceHash(
                                "status_page.organization.save", current));
    }

    public Map<String, Object> updateComponent(Long id, Component value) {
        return updateComponent(
                id,
                value,
                AgentStatusPageWriteProof.sourceHash(
                        "status_page.component.update", requiredStatusPageComponentInfo(id)));
    }

    public Map<String, Object> updateIncident(Long id, Incident value) {
        return updateIncident(
                id,
                value,
                AgentStatusPageWriteProof.sourceHash(
                        "status_page.incident.update", requiredStatusPageIncidentInfo(id)));
    }

    public Map<String, Object> deleteComponent(Long id, String reason) {
        requireReason(reason);
        return deleteComponent(
                id,
                reason,
                AgentStatusPageWriteProof.sourceHash(
                        "status_page.component.delete", requiredStatusPageComponentInfo(id)));
    }

    public Map<String, Object> deleteIncident(Long id, String reason) {
        requireReason(reason);
        return deleteIncident(
                id,
                reason,
                AgentStatusPageWriteProof.sourceHash(
                        "status_page.incident.delete", requiredStatusPageIncidentInfo(id)));
    }

    private Map<String, Object> source(String tool, Object value) {
        var result = AgentManagementOutputSupport.view(value);
        if (!Boolean.TRUE.equals(result.get("partial")))
            result.put("sourceHash", AgentStatusPageWriteProof.sourceHash(tool, value));
        return result;
    }

    private Map<String, Object> written(
            String tool, Map<String, Object> args, String expected, Object value, Long id) {
        if (!expected.equals(AgentStatusPageWriteProof.contentHash(tool, value)))
            throw new IllegalStateException("STATUS_PAGE_WRITE_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
        requireId(id);
        Map<String, Object> row = JsonUtil.fromJson(JsonUtil.toJson(value), Map.class);
        row.put(
                "mutationReceipt",
                AgentStatusPageWriteProof.receipt(
                        tool, id, args, AgentStatusPageWriteProof.contentHash(tool, value), false));
        return AgentManagementOutputSupport.view(row);
    }

    private StatusPageComponentInfo apply(StatusPageComponentInfo value, Component config) {
        if (config == null || config.name() == null || config.name().isBlank() || config.name().length() > 255
                || config.method() < 0 || config.method() > 1 || config.configState() < 0 || config.configState() > 2
                || config.labels() != null && JsonUtil.toJson(config.labels()).length() > 2048) {
            throw new IllegalArgumentException("Invalid component configuration");
        }
        requireOrganization(config.orgId());
        value.setOrgId(config.orgId());
        value.setName(config.name());
        value.setDescription(config.description());
        value.setLabels(config.labels());
        value.setMethod(config.method());
        value.setConfigState(config.configState());
        validate(value);
        return value;
    }

    private StatusPageIncidentInfo apply(StatusPageIncidentInfo value, Incident config) {
        if (config == null || config.state() < 0 || config.state() > 3 || config.componentIds() == null
                || config.componentIds().size() > 100 || config.message() == null || config.message().isBlank()
                || config.message().length() > 2048) {
            throw new IllegalArgumentException("Invalid incident configuration");
        }
        requireOrganization(config.orgId());
        List<StatusPageComponentInfo> components = config.componentIds().stream().distinct().map(this::requiredStatusPageComponentInfo).toList();
        if (components.stream().anyMatch(item -> !config.orgId().equals(item.getOrgId()))) {
            throw new IllegalArgumentException(
                    "Incident components must belong to its organization");
        }
        value.setOrgId(config.orgId());
        value.setName(config.name());
        value.setState(config.state());
        value.setComponents(components);
        List<StatusPageIncidentContentInfo> contents = new ArrayList<>(value.getContents() == null ? List.of() : value.getContents());
        StatusPageIncidentContentInfo content = new StatusPageIncidentContentInfo();
        content.setIncidentId(value.getId());
        content.setMessage(config.message());
        content.setState(config.state());
        content.setTimestamp(System.currentTimeMillis());
        contents.add(content);
        value.setContents(contents);
        validate(value);
        return value;
    }

    private Map<String, Object> incidentSummary(StatusPageIncidentInfo value) {
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("id", value.getId());
        result.put("orgId", value.getOrgId());
        result.put("name", value.getName());
        result.put("state", value.getState());
        result.put("startTime", value.getStartTime());
        result.put("endTime", value.getEndTime());
        result.put("contentCount", value.getContents() == null ? 0 : value.getContents().size());
        result.put(
                "componentCount", value.getComponents() == null ? 0 : value.getComponents().size());
        return result;
    }

    private void requireOrganization(Long id) {
        requireId(id);
        StatusPageOrgInfo org = service.queryStatusPageOrg();
        if (org == null || !id.equals(org.getId())) {
            throw new IllegalArgumentException("Status organization not found");
        }
    }

    private void validate(Object value) {
        if (!validator.validate(value).isEmpty()) {
            throw new IllegalArgumentException("Invalid status-page fields");
        }
    }

    private void requireId(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("A positive id is required");
        }
    }

    private void requireReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Deletion reason is required");
        }
    }

}
