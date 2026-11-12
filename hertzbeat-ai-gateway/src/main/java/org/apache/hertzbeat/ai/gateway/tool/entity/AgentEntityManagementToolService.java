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

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.observability.dto.entity.MonitorInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryReadModel;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityMonitorBindingCandidate;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.apache.hertzbeat.manager.service.entity.EntityDiscoveryReadModelService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/** Entity metadata mutations deliberately exclude credentials, graph rewrites and trusted identity fields. */
@Service
public class AgentEntityManagementToolService {
    private final ObserveEntityService entities;
    private final EntityDiscoveryReadModelService discovery;

    public AgentEntityManagementToolService(ObserveEntityService entities, EntityDiscoveryReadModelService discovery) {
        this.entities = entities;
        this.discovery = discovery;
    }


    /** Metadata typed projection. */
    public record Metadata(String type, String name, String displayName, String namespace, String environment,
                           String owner, String lifecycle, String tier, String system, String description) { }

    public Metadata editable(long entityId) {
        positive(entityId);
        EntityDto dto = requiredReadEntity(entityId);
        EntityInfo info = dto.getEntityInfo();
        return new Metadata(info.getType(), info.getName(), info.getDisplayName(), info.getNamespace(),
                info.getEnvironment(), info.getOwner(), info.getLifecycle(), info.getTier(), info.getSystem(), info.getDescription());
    }

    @Tool(
            name = "entity.create",
            description =
                    "Create an entity from non-secret catalog metadata; identities and bindings use"
                        + " the validated definition workflow.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> create(Metadata metadata) {
        EntityDto dto = new EntityDto();
        dto.setEntityInfo(new EntityInfo());
        apply(dto.getEntityInfo(), metadata);
        dto.getEntityInfo().setCreator(AgentToolContextSupport.invocation().getRequest().getActor().getId());
        entities.validate(dto, false);
        return Map.of("entityId", entities.addEntity(dto));
    }

    @Tool(
            name = "entity.update",
            description =
                    "Update supplied non-null catalog metadata fields, preserving existing"
                        + " identities, bindings and relations. Empty strings explicitly clear"
                        + " fields.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> update(long entityId, Metadata metadata) {
        positive(entityId);
        EntityDto dto = entities.getEntityDto(entityId);
        if (dto == null || dto.getEntityInfo() == null) {
            throw new IllegalArgumentException("Entity not found");
        }
        apply(dto.getEntityInfo(), metadata);
        dto.getEntityInfo().setModifier(AgentToolContextSupport.invocation().getRequest().getActor().getId());
        entities.validate(dto, true);
        entities.modifyEntity(dto);
        return Map.of("entityId", entityId, "updated", true);
    }

    @Tool(
            name = "entity.delete",
            description =
                    "Delete an entity and its bindings and relations. Administrator authorization"
                        + " and dangerous-action approval are required.")
    @AgentToolPolicy(
            access = AgentToolAccess.ADMIN,
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> delete(long entityId) {
        positive(entityId);
        if (entities.getEntityDto(entityId) == null) {
            throw new IllegalArgumentException("Entity not found");
        }
        entities.deleteEntity(entityId);
        if (entities.getEntityDto(entityId) != null) {
            throw new IllegalStateException("Entity deletion could not be verified");
        }
        return Map.of("entityId", entityId, "deleted", true);
    }

    public Page<SingleAlert> alerts(long entityId, @ToolParam(required = false) String status,
                                  @ToolParam(required = false) String severity,
                                  @ToolParam(required = false) Integer pageIndex, @ToolParam(required = false) Integer pageSize) {
        positive(entityId);
        return entities.getEntityAlerts(entityId, status, severity, page(pageIndex), size(pageSize));
    }

    public Page<MonitorInfo> monitors(long entityId, @ToolParam(required = false) Byte status,
                                     @ToolParam(required = false) String app,
                                     @ToolParam(required = false) Integer pageIndex, @ToolParam(required = false) Integer pageSize) {
        positive(entityId);
        return entities.getEntityMonitors(entityId, status, app, page(pageIndex), size(pageSize));
    }

    @Tool(
            name = "entity.discovery",
            description = "Read the bounded resource discovery catalog for the current workspace.")
    @AgentToolPolicy(
            access = AgentToolAccess.STANDARD,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public EntityDiscoveryReadModel discovery(
            @ToolParam(required = false) String search,
            @ToolParam(required = false) Integer pageIndex,
            @ToolParam(required = false) Integer pageSize) {
        if (search != null && search.trim().length() > 200) {
            throw new IllegalArgumentException("Search must not exceed 200 characters");
        }
        return discovery.getDiscovery(search == null ? null : search.trim(), page(pageIndex), size(pageSize));
    }

    public Map<Long, List<EntityMonitorBindingCandidate>> candidates(List<Long> monitorIds) {
        if (monitorIds == null || monitorIds.isEmpty() || monitorIds.size() > 50 || monitorIds.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new IllegalArgumentException("Provide 1 to 50 positive monitor IDs");
        }
        return entities.getMonitorBindingCandidates(monitorIds);
    }

    @Tool(
            name = "entity.editable",
            description =
                    "Read exact accessible entity metadata, with its fixed entity id; no"
                        + " credentials or graph state.")
    @AgentToolPolicy(
            access = AgentToolAccess.STANDARD,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> editableRead(long entityId) {
        return org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport.view(
                Map.of("entityId", entityId, "metadata", editable(entityId)));
    }

    @Tool(
            name = "entity.alerts",
            description =
                    "Read one exact accessible entity's alert page, preserving status/severity"
                        + " scope. Counts are page results, not history totals.")
    @AgentToolPolicy(
            access = AgentToolAccess.STANDARD,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> alertsRead(
            long entityId,
            @ToolParam(required = false, description = "firing, resolved or acknowledged; defaults firing. Query each separately for all statuses.") String status,
            @ToolParam(required = false) String severity,
            @ToolParam(required = false) Integer pageIndex,
            @ToolParam(required = false) Integer pageSize) {
        requiredReadEntity(entityId);
        String selectedStatus = AgentEntityReadScope.alertStatus(status);
        String selectedSeverity = AgentEntityReadScope.severity(severity);
        var result = alerts(entityId, selectedStatus, selectedSeverity, pageIndex, pageSize);
        if (result == null) throw new IllegalStateException("entity_alert_evidence_unavailable");
        var output =
                org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport.view(
                        result);
        output.put(
                "scope",
                AgentEntityReadScope.scope(
                        "entity.alerts",
                        AgentToolContextSupport.arguments(
                                "entityId",
                                entityId,
                                "status",
                                status,
                                "severity",
                                severity,
                                "pageIndex",
                                pageIndex,
                                "pageSize",
                                pageSize)));
        return output;
    }

    @Tool(
            name = "entity.monitors",
            description =
                    "Read monitor summaries for one exact accessible entity, retaining app/status"
                        + " filtering and native pagination. No monitor credentials.")
    @AgentToolPolicy(
            access = AgentToolAccess.STANDARD,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> monitorsRead(
            long entityId,
            @ToolParam(required = false) Byte status,
            @ToolParam(required = false) String app,
            @ToolParam(required = false) Integer pageIndex,
            @ToolParam(required = false) Integer pageSize) {
        requiredReadEntity(entityId);
        if (status != null && (status < 0 || status > 4))
            throw new IllegalArgumentException("Invalid monitor status");
        String selectedApp = AgentEntityReadScope.filter(app);
        var result = monitors(entityId, status, selectedApp, pageIndex, pageSize);
        if (result == null) throw new IllegalStateException("entity_monitor_evidence_unavailable");
        var output =
                org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport.view(
                        result);
        output.put(
                "scope",
                AgentEntityReadScope.scope(
                        "entity.monitors",
                        AgentToolContextSupport.arguments(
                                "entityId",
                                entityId,
                                "status",
                                status,
                                "app",
                                app,
                                "pageIndex",
                                pageIndex,
                                "pageSize",
                                pageSize)));
        return output;
    }

    @Tool(
            name = "entity.binding_candidates",
            description =
                    "Read bounded binding suggestions for exact monitor IDs. Only matched key names"
                        + " are exposed; suggestions do not change bindings. Missing IDs are"
                        + " partial, not empty success.")
    @AgentToolPolicy(
            access = AgentToolAccess.STANDARD,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> candidatesRead(List<Long> monitorIds) {
        if (monitorIds == null || new java.util.HashSet<>(monitorIds).size() != monitorIds.size())
            throw new IllegalArgumentException("Unique monitor IDs required");
        var rows = candidates(monitorIds);
        if (rows == null) throw new IllegalStateException("entity_binding_candidates_unavailable");
        if (!new java.util.HashSet<>(monitorIds).containsAll(rows.keySet()))
            throw new IllegalStateException("foreign_monitor_candidate_result");
        var safe = new java.util.LinkedHashMap<String, Object>();
        for (var entry : rows.entrySet()) {
            if (entry.getValue() == null || entry.getValue().size() > 100)
                throw new IllegalStateException("entity_binding_candidates_unavailable");
            safe.put(
                    entry.getKey().toString(),
                    entry.getValue().stream()
                            .map(
                                    candidate -> {
                                        if (candidate == null
                                                || candidate.getEntityId() == null
                                                || candidate.getEntityId() <= 0)
                                            throw new IllegalStateException(
                                                    "invalid_entity_candidate_result");
                                        return AgentToolContextSupport.arguments(
                                                "entityId",
                                                candidate.getEntityId(),
                                                "entityName",
                                                candidate.getEntityName(),
                                                "entityType",
                                                candidate.getEntityType(),
                                                "score",
                                                candidate.getScore(),
                                                "alreadyBound",
                                                candidate.isAlreadyBound(),
                                                "matchedKeys",
                                                candidate.getMatchedIdentities() == null
                                                        ? List.of()
                                                        : candidate
                                                                .getMatchedIdentities()
                                                                .keySet()
                                                                .stream()
                                                                .sorted()
                                                                .toList());
                                    })
                            .toList());
        }
        var result =
                org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport.view(
                        Map.of("monitorIds", monitorIds, "candidates", safe));
        result.put(
                "partial",
                Boolean.TRUE.equals(result.get("partial")) || safe.size() != monitorIds.size());
        return result;
    }

    private EntityDto requiredReadEntity(long id) {
        positive(id);
        var result = entities.getEntityDto(id);
        if (result == null
                || result.getEntityInfo() == null
                || !Long.valueOf(id).equals(result.getEntityInfo().getId()))
            throw new IllegalArgumentException("Entity not found or inaccessible");
        return result;
    }

    private static void positive(long id) {
        if (id <= 0) {
            throw new IllegalArgumentException("entityId must be positive");
        }
    }

    private static int page(Integer value) {
        if (value != null && (value < 0 || value > 10000)) {
            throw new IllegalArgumentException("pageIndex must be between 0 and 10000");
        }
        return value == null ? 0 : value;
    }

    private static int size(Integer value) {
        if (value != null && (value < 1 || value > 50)) {
            throw new IllegalArgumentException("pageSize must be between 1 and 50");
        }
        return value == null ? 10 : value;
    }

    private static void apply(EntityInfo info, Metadata metadata) {
        if (metadata == null) {
            throw new IllegalArgumentException("metadata is required");
        }
        if (metadata.type() != null) {
            if (metadata.type().length() > 32) {
                throw new IllegalArgumentException("type is too long");
            }
            info.setType(metadata.type());
        }
        if (metadata.name() != null) {
            if (metadata.name().length() > 128) {
                throw new IllegalArgumentException("name is too long");
            }
            info.setName(metadata.name());
        }
        if (metadata.displayName() != null) {
            if (metadata.displayName().length() > 128) {
                throw new IllegalArgumentException("displayName is too long");
            }
            info.setDisplayName(metadata.displayName());
        }
        if (metadata.namespace() != null) {
            if (metadata.namespace().length() > 128) {
                throw new IllegalArgumentException("namespace is too long");
            }
            info.setNamespace(metadata.namespace());
        }
        if (metadata.environment() != null) {
            if (metadata.environment().length() > 128) {
                throw new IllegalArgumentException("environment is too long");
            }
            info.setEnvironment(metadata.environment());
        }
        if (metadata.owner() != null) {
            if (metadata.owner().length() > 128) {
                throw new IllegalArgumentException("owner is too long");
            }
            info.setOwner(metadata.owner());
        }
        if (metadata.lifecycle() != null) {
            if (metadata.lifecycle().length() > 64) {
                throw new IllegalArgumentException("lifecycle is too long");
            }
            info.setLifecycle(metadata.lifecycle());
        }
        if (metadata.tier() != null) {
            if (metadata.tier().length() > 64) {
                throw new IllegalArgumentException("tier is too long");
            }
            info.setTier(metadata.tier());
        }
        if (metadata.system() != null) {
            if (metadata.system().length() > 128) {
                throw new IllegalArgumentException("system is too long");
            }
            info.setSystem(metadata.system());
        }
        if (metadata.description() != null) {
            if (metadata.description().length() > 512) {
                throw new IllegalArgumentException("description is too long");
            }
            info.setDescription(metadata.description());
        }
    }
}
