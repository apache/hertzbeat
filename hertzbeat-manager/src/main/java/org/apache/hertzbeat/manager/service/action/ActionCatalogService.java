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

package org.apache.hertzbeat.manager.service.action;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.EntityGovernanceState;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.pojo.dto.ActionCatalogItemInfo;
import org.apache.hertzbeat.manager.service.entity.EntityGovernanceStateQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityGovernanceStateWriteModelService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * Persists action catalog entries without enabling direct execution.
 */
@Service
public class ActionCatalogService {

    public static final String ACTION_SCOPE = "actions";
    public static final String CATALOG_KIND = "catalog-item";
    public static final String ADAPTER_OWNER = "manager-action-catalog";
    public static final String CATALOG_READY_STATE = "catalog-item-ready";
    public static final String APPROVAL_DRAFT_EXECUTION_MODE = "manual-approval-draft-only";

    private static final ObjectMapper JSON_MAPPER = JsonMapper.builder().build();

    private final EntityGovernanceStateQueryService entityGovernanceStateQueryService;
    private final EntityGovernanceStateWriteModelService entityGovernanceStateWriteModelService;

    public ActionCatalogService(EntityGovernanceStateQueryService entityGovernanceStateQueryService,
                                EntityGovernanceStateWriteModelService entityGovernanceStateWriteModelService) {
        this.entityGovernanceStateQueryService = entityGovernanceStateQueryService;
        this.entityGovernanceStateWriteModelService = entityGovernanceStateWriteModelService;
    }

    public ActionCatalogItemInfo saveCatalogItem(ActionCatalogItemInfo request) {
        return saveCatalogItem(request, null);
    }

    public ActionCatalogItemInfo saveCatalogItem(ActionCatalogItemInfo request, String requestWorkspaceId) {
        validateCatalogItem(request);
        String catalogId = trimToNull(request.getCatalogId());
        EntityGovernanceState state = entityGovernanceStateWriteModelService.findGovernanceStateForWrite(
                ACTION_SCOPE, CATALOG_KIND, catalogId, requestWorkspaceId);
        state.setStateScope(ACTION_SCOPE);
        state.setStateKind(CATALOG_KIND);
        state.setStateKey(catalogId);
        state.setStateName(limitLength(trimToNull(request.getName()), 128));
        state.setStatus(CATALOG_READY_STATE);
        state.setContent(JSON_MAPPER.valueToTree(toContent(request)));
        return toCatalogItemInfo(entityGovernanceStateWriteModelService.saveGovernanceState(state));
    }

    public List<ActionCatalogItemInfo> listCatalogItems(int limit) {
        return listCatalogItems(limit, null);
    }

    public List<ActionCatalogItemInfo> listCatalogItems(int limit, String requestWorkspaceId) {
        return entityGovernanceStateQueryService.findGovernanceStates(
                        ACTION_SCOPE, CATALOG_KIND, PageRequest.of(0, normalizeLimit(limit)), requestWorkspaceId)
                .stream()
                .map(this::toCatalogItemInfo)
                .toList();
    }

    private void validateCatalogItem(ActionCatalogItemInfo request) {
        if (request == null) {
            throw new IllegalArgumentException("Action catalog item request can not be null.");
        }
        if (!StringUtils.hasText(request.getCatalogId())) {
            throw new IllegalArgumentException("Action catalog item catalogId can not be blank.");
        }
        if (!StringUtils.hasText(request.getName())) {
            throw new IllegalArgumentException("Action catalog item name can not be blank.");
        }
        if (!StringUtils.hasText(request.getRisk())) {
            throw new IllegalArgumentException("Action catalog item risk can not be blank.");
        }
        String executionMode = trimToNull(request.getExecutionMode());
        if (executionMode != null && !APPROVAL_DRAFT_EXECUTION_MODE.equals(executionMode)) {
            throw new IllegalArgumentException("Action catalog item executionMode must stay manual-only.");
        }
        if (Boolean.TRUE.equals(request.getExecutionAllowed())) {
            throw new IllegalArgumentException("Action catalog item can not execute actions directly.");
        }
    }

    private Map<String, Object> toContent(ActionCatalogItemInfo request) {
        Map<String, Object> content = new LinkedHashMap<>();
        putIfPresent(content, "catalogId", trimToNull(request.getCatalogId()));
        putIfPresent(content, "name", trimToNull(request.getName()));
        putIfPresent(content, "category", trimToNull(request.getCategory()));
        putIfPresent(content, "scope", trimToNull(request.getScope()));
        putIfPresent(content, "owner", trimToNull(request.getOwner()));
        putIfPresent(content, "risk", trimToNull(request.getRisk()));
        putIfPresent(content, "executionMode", APPROVAL_DRAFT_EXECUTION_MODE);
        content.put("executionAllowed", false);
        putIfPresent(content, "adapterOwner", ADAPTER_OWNER);
        if (request.getMetadata() != null && !request.getMetadata().isEmpty()) {
            content.put("metadata", request.getMetadata());
        }
        return content;
    }

    private ActionCatalogItemInfo toCatalogItemInfo(EntityGovernanceState state) {
        JsonNode content = state.getContent();
        ActionCatalogItemInfo info = new ActionCatalogItemInfo();
        info.setCatalogId(defaultText(jsonText(content, "catalogId"), state.getStateKey()));
        info.setName(defaultText(jsonText(content, "name"), state.getStateName()));
        info.setCategory(jsonText(content, "category"));
        info.setScope(jsonText(content, "scope"));
        info.setOwner(jsonText(content, "owner"));
        info.setRisk(jsonText(content, "risk"));
        info.setExecutionMode(defaultText(jsonText(content, "executionMode"), APPROVAL_DRAFT_EXECUTION_MODE));
        info.setExecutionAllowed(false);
        info.setAdapterOwner(defaultText(jsonText(content, "adapterOwner"), ADAPTER_OWNER));
        info.setStatus(defaultText(state.getStatus(), CATALOG_READY_STATE));
        info.setMetadata(jsonMap(content == null ? null : content.get("metadata")));
        info.setWorkspaceId(defaultText(state.getWorkspaceId(), AuthTokenScopes.DEFAULT_WORKSPACE_ID));
        info.setCreator(state.getCreator());
        info.setGmtUpdate(state.getGmtUpdate());
        return info;
    }

    private Map<String, Object> jsonMap(JsonNode node) {
        if (node == null || node.isNull() || !node.isObject()) {
            return Map.of();
        }
        return JSON_MAPPER.convertValue(node, new TypeReference<Map<String, Object>>() { });
    }

    private String jsonText(JsonNode node, String fieldName) {
        if (node == null || node.isNull() || node.get(fieldName) == null || node.get(fieldName).isNull()) {
            return null;
        }
        return trimToNull(node.get(fieldName).asText());
    }

    private int normalizeLimit(int limit) {
        if (limit <= 0) {
            return 8;
        }
        return Math.min(limit, 50);
    }

    private void putIfPresent(Map<String, Object> target, String key, Object value) {
        if (value != null) {
            target.put(key, value);
        }
    }

    private String defaultText(String value, String defaultValue) {
        String normalized = trimToNull(value);
        return normalized == null ? defaultValue : normalized;
    }

    private String limitLength(String value, int limit) {
        String normalized = trimToNull(value);
        if (normalized == null || normalized.length() <= limit) {
            return normalized;
        }
        return normalized.substring(0, limit);
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
