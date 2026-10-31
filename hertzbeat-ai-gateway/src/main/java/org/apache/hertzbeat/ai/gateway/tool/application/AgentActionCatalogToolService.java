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

package org.apache.hertzbeat.ai.gateway.tool.application;

import com.fasterxml.jackson.annotation.JsonProperty;

import org.apache.hertzbeat.ai.gateway.text.GatewaySecretRedactor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.ActionCatalogItemInfo;
import org.apache.hertzbeat.manager.service.action.ActionCatalogService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Map;

/** Non-executing catalog documents scoped to the trusted invocation workspace. */
@Service
public class AgentActionCatalogToolService {
    private final ActionCatalogService catalog;

    public AgentActionCatalogToolService(ActionCatalogService catalog) {
        this.catalog = catalog;
    }

    /** Non-secret catalog content; ownership and execution authority are server-owned. */
    public record Entry(
            String catalogId,
            String name,
            @JsonProperty(required = false) String category,
            @JsonProperty(required = false) String scope,
            @JsonProperty(required = false) String owner,
            String risk,
            @JsonProperty(required = false) Map<String, Object> metadata) {}

    @Tool(
            name = "action_catalog.list",
            description =
                    "List up to 50 action catalog documents in the current trusted workspace."
                        + " Entries are manual-approval drafts, never evidence that an action"
                        + " executed.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> list(@ToolParam(description = "Limit from 1 to 50.") int limit) {
        if (limit < 1 || limit > 50)
            throw new IllegalArgumentException("Catalog limit must be from 1 to 50");
        String workspace = workspace();
        var values = catalog.listCatalogItems(limit, workspace);
        if (values == null || values.size() > limit)
            throw new IllegalStateException("Invalid native catalog page");
        values.forEach(value -> checkScope(value, workspace));
        return AgentManagementOutputSupport.view(values);
    }

    @Tool(
            name = "action_catalog.save",
            description =
                    "Save one non-secret action catalog document in the trusted current workspace."
                        + " This stores a manual-approval-only draft and cannot execute or enable"
                        + " actions. No workspace, creator, execution flag or credentials are"
                        + " accepted.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> save(Entry entry) {
        String workspace = workspace();
        if (entry == null
                || entry.catalogId() == null
                || !entry.catalogId().matches("[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}"))
            throw new IllegalArgumentException("A bounded catalog identity is required");
        String json = JsonUtil.toJson(entry);
        Map<String, Object> raw = JsonUtil.fromJson(json, Map.class);
        if (json.getBytes(StandardCharsets.UTF_8).length > 16384
                || !raw.equals(GatewaySecretRedactor.redactMap(raw))
                || entry.metadata() != null && entry.metadata().size() > 20)
            throw new IllegalArgumentException("Bounded non-secret catalog metadata is required");
        var request = new ActionCatalogItemInfo();
        request.setCatalogId(entry.catalogId());
        request.setName(text(entry.name(), 128, true));
        request.setRisk(text(entry.risk(), 32, true));
        request.setCategory(text(entry.category(), 128, false));
        request.setScope(text(entry.scope(), 128, false));
        request.setOwner(text(entry.owner(), 128, false));
        request.setMetadata(entry.metadata());
        request.setExecutionAllowed(false);
        request.setExecutionMode(ActionCatalogService.APPROVAL_DRAFT_EXECUTION_MODE);
        var saved = catalog.saveCatalogItem(request, workspace);
        checkScope(saved, workspace);
        if (!entry.catalogId().equals(saved.getCatalogId()))
            throw new IllegalStateException("Native catalog identity mismatch");
        return AgentManagementOutputSupport.view(saved);
    }

    private String workspace() {
        String value = AgentToolContextSupport.invocation().getRequest().getWorkspaceId();
        if (value == null || value.isBlank())
            throw new IllegalArgumentException("Trusted workspace is required");
        return value;
    }

    private void checkScope(ActionCatalogItemInfo value, String workspace) {
        if (value == null
                || !workspace.equals(value.getWorkspaceId())
                || !Boolean.FALSE.equals(value.getExecutionAllowed())
                || !ActionCatalogService.APPROVAL_DRAFT_EXECUTION_MODE.equals(
                        value.getExecutionMode()))
            throw new IllegalStateException("Native catalog scope or execution contract mismatch");
    }

    private String text(String value, int max, boolean required) {
        if (value == null && !required) return null;
        if (value == null || value.isBlank() || value.length() > max)
            throw new IllegalArgumentException("Catalog text exceeds its contract");
        return value.trim();
    }
}
