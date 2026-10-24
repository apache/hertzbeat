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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import jakarta.validation.Validator;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageOrgInfo;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageComponentInfo;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageIncidentInfo;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageIncidentContentInfo;
import org.apache.hertzbeat.manager.service.StatusPageService;
import org.springframework.data.domain.Page;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;

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

    @Tool(name = "status_page.organization.get", description = "Read status-page organization settings.")
    @AgentToolPolicy(risk = AgentToolRisk.READ, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.STANDARD)
    public Map<String, Object> organization() {
        return AgentManagementOutputSupport.view(service.queryStatusPageOrg());
    }

    @Tool(name = "status_page.organization.save", description = "Publish organization settings to the public status page. "
                    + "AI execution requires administrator confirmation; ordinary users use the native status page.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.USER)
    public Map<String, Object> saveOrganization(Organization configuration) {
        if (configuration == null || configuration.state() < 0 || configuration.state() > 2) {
            throw new IllegalArgumentException("Invalid organization configuration");
        }
        StatusPageOrgInfo value = service.queryStatusPageOrg();
        if (value == null) {
            value = new StatusPageOrgInfo();
        }
        value.setName(configuration.name());
        value.setDescription(configuration.description());
        value.setHome(configuration.home());
        value.setLogo(configuration.logo());
        value.setFeedback(configuration.feedback());
        value.setColor(configuration.color());
        value.setState(configuration.state());
        validate(value);
        return AgentManagementOutputSupport.view(service.saveStatusPageOrg(value));
    }

    @Tool(name = "status_page.component.list", description = "Page status components in memory; the existing manager service still loads all components.")
    @AgentToolPolicy(risk = AgentToolRisk.READ, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.STANDARD)
    public Map<String, Object> components(@ToolParam(required = false) Integer pageIndex,
                                          @ToolParam(required = false) Integer pageSize) {
        int index = AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, Integer.MAX_VALUE);
        int size = AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 100);
        List<StatusPageComponentInfo> all = service.queryStatusPageComponents();
        long offset = (long) index * size;
        int start = (int) Math.min(offset, all.size());
        int end = Math.min(start + size, all.size());
        Map<String, Object> result = AgentManagementOutputSupport.view(Map.of("content", all.subList(start, end),
                "pageIndex", index, "pageSize", size, "totalElements", all.size()));
        result.put("hasMore", end < all.size());
        result.put("sourceReadScope", "all components loaded by existing manager service; output paginated in memory");
        return result;
    }

    @Tool(name = "status_page.component.get", description = "Read an exact status-page component.")
    @AgentToolPolicy(risk = AgentToolRisk.READ, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.STANDARD)
    public Map<String, Object> component(Long componentId) {
        return AgentManagementOutputSupport.view(requiredStatusPageComponentInfo(componentId));
    }

    private StatusPageComponentInfo requiredStatusPageComponentInfo(Long componentId) {
        requireId(componentId);
        StatusPageComponentInfo value = service.queryStatusPageComponent(componentId);
        if (value == null) {
            throw new IllegalArgumentException("Status component not found");
        }
        return value;
    }

    @Tool(name = "status_page.component.create", description = "Publish a status component and its selected monitoring labels. "
                    + "AI execution requires administrator confirmation; ordinary users use the native status page.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.USER)
    public Map<String, Object> createComponent(Component configuration) {
        StatusPageComponentInfo value = apply(new StatusPageComponentInfo(), configuration);
        service.newStatusPageComponent(value);
        return AgentManagementOutputSupport.view(Map.of("operation", "created", "name", value.getName()));
    }

    @Tool(name = "status_page.component.update", description = "Update a publicly visible status component. "
                    + "AI execution requires administrator confirmation; ordinary users use the native status page.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.USER)
    public Map<String, Object> updateComponent(Long componentId, Component configuration) {
        StatusPageComponentInfo value = apply(requiredStatusPageComponentInfo(componentId), configuration);
        service.updateStatusPageComponent(value);
        return Map.of("operation", "updated", "componentId", componentId);
    }

    @Tool(name = "status_page.component.delete", description = "Permanently remove a public status component.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.ADMIN)
    public Map<String, Object> deleteComponent(Long componentId, String reason) {
        requireReason(reason);
        requiredStatusPageComponentInfo(componentId);
        service.deleteStatusPageComponent(componentId);
        return Map.of("deletedId", componentId);
    }

    @Tool(name = "status_page.incident.list", description = "List published status incidents with bounded pagination.")
    @AgentToolPolicy(risk = AgentToolRisk.READ, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.STANDARD)
    public Map<String, Object> incidents(@ToolParam(required = false) String search,
            @ToolParam(required = false) Integer pageIndex, @ToolParam(required = false) Integer pageSize,
            @ToolParam(required = false, description = "Start Unix timestamp in milliseconds.") Long startTime,
            @ToolParam(required = false, description = "End Unix timestamp in milliseconds, maximum 366-day window.") Long endTime) {
        if (startTime != null || endTime != null) {
            if (startTime == null || endTime == null || startTime < 0 || endTime <= startTime
                    || endTime - startTime > java.time.Duration.ofDays(366).toMillis()) {
                throw new IllegalArgumentException("Incident time range must be complete, ordered, and at most 366 days");
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
        result.put("detailOmitted", "Incident contents and components are summarized; use incident.get for bounded details");
        result.put("sourceReadScope", "Existing service loads full history for incidents on this page");
        return result;
    }

    /** Compatibility for existing typed callers. */
    public Map<String, Object> incidents(String search, Integer pageIndex, Integer pageSize) {
        return incidents(search, pageIndex, pageSize, null, null);
    }

    @Tool(name = "status_page.incident.get", description = "Read an exact published status incident.")
    @AgentToolPolicy(risk = AgentToolRisk.READ, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.STANDARD)
    public Map<String, Object> incident(Long incidentId) {
        StatusPageIncidentInfo value = requiredStatusPageIncidentInfo(incidentId);
        Map<String, Object> detail = incidentSummary(value);
        List<StatusPageIncidentContentInfo> contents = value.getContents() == null ? List.of() : value.getContents();
        detail.put("contents", contents.subList(Math.max(0, contents.size() - 20), contents.size()));
        List<StatusPageComponentInfo> components = value.getComponents() == null ? List.of() : value.getComponents();
        detail.put("components", components.subList(0, Math.min(100, components.size())));
        Map<String, Object> result = AgentManagementOutputSupport.view(detail);
        result.put("partial", Boolean.TRUE.equals(result.get("partial")) || contents.size() > 20 || components.size() > 100);
        result.put("historyWindow", "Last 20 entries in stored order; not guaranteed chronological");
        result.put("sourceReadScope", "Existing manager service loads full incident history before output projection");
        return result;
    }

    private StatusPageIncidentInfo requiredStatusPageIncidentInfo(Long incidentId) {
        requireId(incidentId);
        StatusPageIncidentInfo value = service.queryStatusPageIncident(incidentId);
        if (value == null) {
            throw new IllegalArgumentException("Status incident not found");
        }
        return value;
    }

    @Tool(name = "status_page.incident.create", description = "Publish an incident message and affected components publicly. "
                    + "AI execution requires administrator confirmation; ordinary users use the native status page.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.USER)
    public Map<String, Object> createIncident(Incident configuration) {
        StatusPageIncidentInfo value = apply(new StatusPageIncidentInfo(), configuration);
        service.newStatusPageIncident(value);
        return AgentManagementOutputSupport.view(Map.of("operation", "created", "name", value.getName()));
    }

    @Tool(name = "status_page.incident.update", description = "Update a public incident, appending a status message. "
                    + "AI execution requires administrator confirmation; ordinary users use the native status page.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.USER)
    public Map<String, Object> updateIncident(Long incidentId, Incident configuration) {
        StatusPageIncidentInfo value = apply(requiredStatusPageIncidentInfo(incidentId), configuration);
        service.updateStatusPageIncident(value);
        return Map.of("operation", "updated", "incidentId", incidentId);
    }

    @Tool(name = "status_page.incident.delete", description = "Permanently remove a published incident and its history.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.ADMIN)
    public Map<String, Object> deleteIncident(Long incidentId, String reason) {
        requireReason(reason);
        requiredStatusPageIncidentInfo(incidentId);
        service.deleteStatusPageIncident(incidentId);
        return Map.of("deletedId", incidentId);
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
            throw new IllegalArgumentException("Incident components must belong to its organization");
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
        result.put("componentCount", value.getComponents() == null ? 0 : value.getComponents().size());
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
