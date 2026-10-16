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

package org.apache.hertzbeat.ai.gateway.tool.savedview;

import java.util.Map;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.dashboard.SignalAssetToolSupport;
import org.apache.hertzbeat.common.entity.dto.SignalSavedView;
import org.apache.hertzbeat.manager.service.SignalSavedViewService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/** Tools for saved views shared across all users. */
@Service
public class AgentSavedViewToolService {

    private final SignalSavedViewService service;

    public AgentSavedViewToolService(SignalSavedViewService service) {
        this.service = service;
    }

    @Tool(name = "saved_query.list_signal_saved_views", description = "List saved views shared across all users, at most ten per call. "
            + "Includes current revision for CAS updates; not workspace-isolated.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> listSignalSavedViews(
            @ToolParam(description = "Signal: logs, traces, metrics.") String signal,
            @ToolParam(required = false, description = "Offset, 0 to 10000; default 0.") Integer offset,
            @ToolParam(required = false, description = "Page size, 1 to 10; default 5.") Integer limit) {
        String actor = SignalAssetToolSupport.actor(false);
        SignalAssetToolSupport.signal(signal, false);
        int start = SignalAssetToolSupport.offset(offset);
        int count = SignalAssetToolSupport.limit(limit);
        return SignalAssetToolSupport.page(service.listSignalSavedViews(actor, signal), start, count, "shared");
    }

    @Tool(name = "saved_query.upsert_signal_saved_view", description = "Create or replace saved views shared across all users. "
            + "Updates require the exact current revision; creation requires omitted revision. "
            + "Only local signal explorer routes are accepted. Query snapshots are stored, never executed.")
    @AgentToolPolicy(access = AgentToolAccess.USER, risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public SignalSavedView upsertSignalSavedView(
            @ToolParam(description = "Asset fields; omit id, creator and timestamps."
                    + " Specify signal, viewKey, label, local route and revision for updates.")
            SignalSavedView value) {
        String actor = SignalAssetToolSupport.actor(true);
        if (value == null || value.getId() != null || value.getCreateTime() != null || value.getUpdateTime() != null) {
            throw new IllegalArgumentException("Asset is required; server-owned fields must be omitted");
        }
        SignalAssetToolSupport.signal(value.getSignal(), false);
        SignalAssetToolSupport.key(value.getViewKey());
        if (value.getCreator() != null) {
            throw new IllegalArgumentException("creator is server-owned audit identity");
        }
        SignalAssetToolSupport.revision(value.getRevision(), false);
        return service.upsertSignalSavedView(actor, value);
    }

    @Tool(name = "saved_query.delete_signal_saved_view", description = "Delete one shared saved view for all users at its current revision. "
            + "Underlying signal data is not deleted. "
                    + "AI execution requires administrator confirmation; ordinary users use the native saved-view controls.")
    @AgentToolPolicy(access = AgentToolAccess.USER, risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> deleteSignalSavedView(
            @ToolParam(description = "Signal: logs, traces, metrics.") String signal,
            @ToolParam(description = "Exact asset key.") String viewKey,
            @ToolParam(description = "Exact current revision from list.") Long revision,
            @ToolParam(description = "Operator deletion reason recorded in the tool audit ledger.") String reason) {
        String actor = SignalAssetToolSupport.actor(true);
        SignalAssetToolSupport.signal(signal, false);
        SignalAssetToolSupport.key(viewKey);
        SignalAssetToolSupport.revision(revision, true);
        SignalAssetToolSupport.reason(reason);
        service.deleteSignalSavedView(actor, signal, viewKey, revision);
        return Map.of("deleted", true, "signal", signal, "viewKey", viewKey, "scope", "shared");
    }
}
