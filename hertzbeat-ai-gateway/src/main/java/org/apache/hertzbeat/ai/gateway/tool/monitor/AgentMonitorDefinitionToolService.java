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

package org.apache.hertzbeat.ai.gateway.tool.monitor;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import java.util.List;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionCatalogItem;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionDeleteResponse;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionOperation;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionService;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionValidationRequest;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionValidationResponse;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/** Versioned metadata and conditional deletion, without exposing raw definition contents. */
@Service
public class AgentMonitorDefinitionToolService {
    private final MonitorDefinitionService definitions;

    public AgentMonitorDefinitionToolService(MonitorDefinitionService definitions) {
        this.definitions = definitions;
    }

    @Tool(name = "monitor.definition_catalog", description = "List versioned monitor definition metadata, origins and revisions without raw YAML.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public CatalogPage catalog(@ToolParam(required = false, description = "Language tag.") String language,
            @ToolParam(required = false, description = "Offset from 0 to 10000; defaults to 0.") Integer offset,
            @ToolParam(required = false, description = "Page size from 1 to 100; defaults to 20.") Integer limit) {
        int start = offset == null ? 0 : offset;
        int size = limit == null ? 20 : limit;
        if (start < 0 || start > 10000 || size < 1 || size > 100) {
            throw new IllegalArgumentException("Bounded definition pagination is required");
        }
        var catalog = definitions.catalog(language);
        var all = catalog.items();
        int from = Math.min(start, all.size());
        int to = Math.min(from + size, all.size());
        List<MonitorDefinitionCatalogItem> items = List.copyOf(all.subList(from, to));
        return new CatalogPage(catalog.schemaVersion(), items, start, size, all.size(), to < all.size(), items.size() < all.size());
    }


    /** Catalog Page typed projection. */
    public record CatalogPage(int schemaVersion, List<MonitorDefinitionCatalogItem> items, int offset,
                              int limit, int total, boolean hasMore, boolean partial) { }

    @Tool(name = "monitor.definition_get", description = "Get definition identity, origin, edit/delete capability and revision. Raw YAML remains in the native definition editor.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public MonitorDefinitionCatalogItem detail(@ToolParam(description = "Application identifier.") String app,
            @ToolParam(required = false, description = "Language tag.") String language) {
        var detail = definitions.detail(app, language);
        return new MonitorDefinitionCatalogItem(detail.app(), detail.label(), detail.origin(), detail.editable(),
                detail.deletable(), detail.hidden(), detail.revision());
    }

    @Tool(name = "monitor.definition_validate", description = "Validate the currently saved definition server-side without returning or submitting raw YAML. For new drafts"
            + " use the native versioned editor.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public MonitorDefinitionValidationResponse validate(@ToolParam(description = "Application identifier.") String app) {
        var detail = definitions.detail(app, "en-US");
        return definitions.validate(new MonitorDefinitionValidationRequest(
                MonitorDefinitionOperation.UPDATE, detail.app(), detail.definition()));
    }

    @Tool(name = "monitor.definition_delete", description = "Delete a custom definition or override using the exact current revision. Built-in deletion and stale"
            + " revisions are rejected by the native service.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public MonitorDefinitionDeleteResponse delete(@ToolParam(description = "Application identifier.") String app,
            @ToolParam(description = "Exact If-Match revision from definition_get.") String revision) {
        if (revision == null || revision.isBlank() || revision.length() > 256) {
            throw new IllegalArgumentException("The current definition revision is required");
        }
        return definitions.delete(app, revision.matches("[a-f0-9]{64}") ? "\"" + revision + "\"" : revision);
    }
}
