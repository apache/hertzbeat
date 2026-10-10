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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeTextSanitizer;
import org.apache.hertzbeat.ai.gateway.text.GatewaySecretRedactor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.manager.pojo.dto.EntityDetailDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntitySummaryInfo;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

/** Workspace-aware entity read tools. */
@Service
public class AgentEntityToolService {

    private static final Set<String> SORT_FIELDS = Set.of("id", "name", "type", "status", "gmtUpdate");

    private final ObserveEntityService observeEntityService;

    public AgentEntityToolService(ObserveEntityService observeEntityService) {
        this.observeEntityService = observeEntityService;
    }

    @Tool(name = "entity.get", description = "Get an observable entity and its current operational summaries.")
    @AgentToolPolicy
    public Map<String, Object> getEntity(@ToolParam(description = "Observable entity id.") Long entityId) {
        if (entityId == null || entityId <= 0) {
            throw new IllegalArgumentException("entity.get requires a positive entityId");
        }
        EntityDetailDto detail = observeEntityService.getEntityDetail(entityId);
        if (detail == null || detail.getEntity() == null || detail.getEntity().getEntityInfo() == null) {
            throw new IllegalArgumentException("Entity not found: " + entityId);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("entity", entity(detail.getEntity().getEntityInfo()));
        put(result, "status", detail.getStatus());
        put(result, "evidenceSummary", detail.getEvidenceSummary());
        put(result, "alertSummary", detail.getAlertSummary());
        put(result, "monitorSummary", detail.getMonitorSummary());
        put(result, "logSummary", detail.getLogSummary());
        put(result, "traceSummary", detail.getTraceSummary());
        put(result, "signalEvidence", detail.getSignalEvidence());
        put(result, "triageRecommendation", detail.getTriageRecommendation());
        put(result, "opsSummary", detail.getOpsSummary());
        result.put("nextActions", detail.getNextActions() == null ? List.of() : detail.getNextActions());
        result.put("topologyNeighbors",
                detail.getTopologyNeighbors() == null ? List.of() : detail.getTopologyNeighbors());
        return result;
    }

    @Tool(name = "entity.query", description = "Query observable entities with bounded filters and pagination.")
    @AgentToolPolicy
    public Map<String, Object> queryEntities(
            @ToolParam(required = false, description = "Exact entity ids.") List<Long> entityIds,
            @ToolParam(required = false, description = "Entity type.") String type,
            @ToolParam(required = false, description = "Entity status.") String status,
            @ToolParam(required = false, description = "Name or description search text.") String search,
            @ToolParam(required = false, description = "Entity owner.") String owner,
            @ToolParam(required = false, description = "Entity source.") String source,
            @ToolParam(required = false, description = "Deployment environment.") String environment,
            @ToolParam(required = false, description = "Lifecycle classification.") String lifecycle,
            @ToolParam(required = false, description = "Operational tier.") String tier,
            @ToolParam(required = false, description = "Owning system.") String system,
            @ToolParam(required = false, description = "Sort field.") String sort,
            @ToolParam(required = false, description = "Sort order: asc or desc.") String order,
            @ToolParam(required = false, description = "Zero-based page index.") Integer pageIndex,
            @ToolParam(required = false, description = "Page size; maximum 50.") Integer pageSize) {
        int resolvedPageIndex = AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, 10_000);
        int resolvedPageSize = AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 50);
        String resolvedSort = sort == null || sort.isBlank() ? "gmtUpdate" : sort;
        if (!SORT_FIELDS.contains(resolvedSort)) {
            throw new IllegalArgumentException("sort must be id, name, type, status, or gmtUpdate");
        }
        String resolvedOrder = order == null || order.isBlank() ? "desc" : order.toLowerCase(Locale.ROOT);
        if (!"asc".equals(resolvedOrder) && !"desc".equals(resolvedOrder)) {
            throw new IllegalArgumentException("order must be asc or desc");
        }
        Page<EntitySummaryInfo> page = observeEntityService.getEntities(entityIds, type, status, search, owner,
                source, environment, lifecycle, tier, system, resolvedSort, resolvedOrder,
                resolvedPageIndex, resolvedPageSize);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", page.getContent().stream().map(this::summary).toList());
        result.put("pageIndex", page.getNumber());
        result.put("pageSize", page.getSize());
        result.put("totalElements", page.getTotalElements());
        result.put("totalPages", page.getTotalPages());
        return result;
    }

    private Map<String, Object> summary(EntitySummaryInfo summary) {
        Map<String, Object> row = new LinkedHashMap<>();
        if (summary != null && summary.getEntity() != null) {
            row.put("entity", entity(summary.getEntity()));
        }
        if (summary != null) {
            row.put("identityCount", summary.getIdentityCount());
            row.put("monitorCount", summary.getMonitorCount());
            row.put("relationCount", summary.getRelationCount());
            row.put("activeAlertCount", summary.getActiveAlertCount());
            put(row, "status", summary.getStatus());
            put(row, "opsSummary", summary.getOpsSummary());
            put(row, "nextAction", summary.getNextAction());
            put(row, "lastEvidenceAt", summary.getLastEvidenceAt());
        }
        return row;
    }

    private Map<String, Object> entity(EntityInfo info) {
        Map<String, Object> entity = new LinkedHashMap<>();
        put(entity, "id", info.getId());
        put(entity, "type", info.getType());
        put(entity, "name", safe(info.getName(), 256));
        put(entity, "displayName", safe(info.getDisplayName(), 256));
        put(entity, "subtype", info.getSubtype());
        put(entity, "namespace", safe(info.getNamespace(), 256));
        put(entity, "environment", safe(info.getEnvironment(), 256));
        put(entity, "status", info.getStatus());
        put(entity, "criticality", info.getCriticality());
        put(entity, "owner", safe(info.getOwner(), 256));
        put(entity, "lifecycle", info.getLifecycle());
        put(entity, "tier", info.getTier());
        put(entity, "system", safe(info.getSystem(), 256));
        put(entity, "source", info.getSource());
        put(entity, "description", safe(info.getDescription(), 1024));
        entity.put("labels", GatewaySecretRedactor.redactMap(asObjectMap(info.getLabels())));
        entity.put("tags", info.getTags() == null ? List.of() : info.getTags().stream()
                .map(tag -> safe(tag, 128)).toList());
        return entity;
    }

    private Map<String, Object> asObjectMap(Map<String, String> values) {
        if (values == null || values.isEmpty()) {
            return Map.of();
        }
        return new LinkedHashMap<>(values);
    }

    private String safe(String value, int maxLength) {
        return value == null ? null : AgentRuntimeTextSanitizer.sanitizeAndLimit(value, maxLength);
    }

    private void put(Map<String, Object> target, String key, Object value) {
        if (value != null) {
            target.put(key, value);
        }
    }
}
