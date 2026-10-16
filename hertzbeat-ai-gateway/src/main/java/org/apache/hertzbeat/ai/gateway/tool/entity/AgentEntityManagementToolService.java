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
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.observability.dto.entity.MonitorInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryReadModel;
import org.apache.hertzbeat.manager.pojo.dto.EntityMonitorBindingCandidate;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.apache.hertzbeat.manager.service.entity.EntityDiscoveryReadModelService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

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

    @Tool(name = "entity.editable", description = "Get the non-secret editable metadata subset of an authorized entity. Advanced configuration and graph"
            + " bindings use the entity UI or validated definition workflow.")
    @AgentToolPolicy(access = AgentToolAccess.STANDARD, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Metadata editable(long entityId) {
        positive(entityId);
        EntityDto dto = entities.getEntityDto(entityId);
        if (dto == null || dto.getEntityInfo() == null) {
            throw new IllegalArgumentException("Entity not found");
        }
        EntityInfo info = dto.getEntityInfo();
        return new Metadata(info.getType(), info.getName(), info.getDisplayName(), info.getNamespace(),
                info.getEnvironment(), info.getOwner(), info.getLifecycle(), info.getTier(), info.getSystem(), info.getDescription());
    }

    @Tool(name = "entity.create", description = "Create an entity from non-secret catalog metadata; identities and bindings use the validated definition workflow.")
    @AgentToolPolicy(access = AgentToolAccess.USER, risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> create(Metadata metadata) {
        EntityDto dto = new EntityDto();
        dto.setEntityInfo(new EntityInfo());
        apply(dto.getEntityInfo(), metadata);
        dto.getEntityInfo().setCreator(AgentToolContextSupport.invocation().getRequest().getActor().getId());
        entities.validate(dto, false);
        return Map.of("entityId", entities.addEntity(dto));
    }

    @Tool(name = "entity.update", description = "Update supplied non-null catalog metadata fields, preserving existing identities, bindings and relations. Empty strings explicitly clear fields.")
    @AgentToolPolicy(access = AgentToolAccess.USER, risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND)
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

    @Tool(name = "entity.delete", description = "Delete an entity and its bindings and relations. Administrator authorization and dangerous-action approval are required.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND)
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

    @Tool(name = "entity.alerts", description = "Read paginated alerts in the authorized entity troubleshooting context.")
    @AgentToolPolicy(access = AgentToolAccess.STANDARD, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Page<SingleAlert> alerts(long entityId, @ToolParam(required = false) String status,
                                  @ToolParam(required = false) String severity,
                                  @ToolParam(required = false) Integer pageIndex, @ToolParam(required = false) Integer pageSize) {
        positive(entityId);
        return entities.getEntityAlerts(entityId, status, severity, page(pageIndex), size(pageSize));
    }

    @Tool(name = "entity.monitors", description = "Read paginated monitor summaries bound to an authorized entity; never returns monitor credentials.")
    @AgentToolPolicy(access = AgentToolAccess.STANDARD, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Page<MonitorInfo> monitors(long entityId, @ToolParam(required = false) Byte status,
                                     @ToolParam(required = false) String app,
                                     @ToolParam(required = false) Integer pageIndex, @ToolParam(required = false) Integer pageSize) {
        positive(entityId);
        return entities.getEntityMonitors(entityId, status, app, page(pageIndex), size(pageSize));
    }

    @Tool(name = "entity.discovery", description = "Read the bounded resource discovery catalog for the current workspace.")
    @AgentToolPolicy(access = AgentToolAccess.STANDARD, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public EntityDiscoveryReadModel discovery(@ToolParam(required = false) String search,
                                              @ToolParam(required = false) Integer pageIndex,
                                              @ToolParam(required = false) Integer pageSize) {
        if (search != null && search.trim().length() > 200) {
            throw new IllegalArgumentException("Search must not exceed 200 characters");
        }
        return discovery.getDiscovery(search == null ? null : search.trim(), page(pageIndex), size(pageSize));
    }

    @Tool(name = "entity.binding_candidates", description = "Suggest authorized entity bindings for up to 50 existing monitor IDs without changing bindings.")
    @AgentToolPolicy(access = AgentToolAccess.STANDARD, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<Long, List<EntityMonitorBindingCandidate>> candidates(List<Long> monitorIds) {
        if (monitorIds == null || monitorIds.isEmpty() || monitorIds.size() > 50 || monitorIds.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new IllegalArgumentException("Provide 1 to 50 positive monitor IDs");
        }
        return entities.getMonitorBindingCandidates(monitorIds);
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
