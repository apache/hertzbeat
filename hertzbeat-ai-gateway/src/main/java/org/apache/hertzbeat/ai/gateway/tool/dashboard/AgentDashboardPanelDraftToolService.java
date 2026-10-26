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

package org.apache.hertzbeat.ai.gateway.tool.dashboard;

import java.util.Map;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.entity.dto.SignalDashboardPanelDraft;
import org.apache.hertzbeat.manager.service.SignalDashboardPanelDraftService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/** Tools for current user’s private panel drafts. */
@Service
public class AgentDashboardPanelDraftToolService {

    private final SignalDashboardPanelDraftService service;

    public AgentDashboardPanelDraftToolService(SignalDashboardPanelDraftService service) {
        this.service = service;
    }

    @Tool(name = "dashboard.panel_draft.list_signal_dashboard_panel_drafts", description = "List current user’s private panel drafts, at most ten per call. "
            + "Drafts have no native revision token.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> listSignalDashboardPanelDrafts(
            @ToolParam(description = "Signal: logs, traces, metrics, alerts.") String signal,
            @ToolParam(required = false, description = "Offset, 0 to 10000; default 0.") Integer offset,
            @ToolParam(required = false, description = "Page size, 1 to 10; default 5.") Integer limit) {
        String actor = SignalAssetToolSupport.actor(true);
        SignalAssetToolSupport.signal(signal, true);
        int start = SignalAssetToolSupport.offset(offset);
        int count = SignalAssetToolSupport.limit(limit);
        return SignalAssetToolSupport.page(service.listSignalDashboardPanelDrafts(actor, signal), start, count, "creator-private");
    }

    @Tool(name = "dashboard.panel_draft.upsert_signal_dashboard_panel_draft", description = "Create or replace current user’s private panel drafts. "
            + "Draft replacement is last-write-wins, without revision CAS. "
            + "Only local signal explorer routes are accepted. Query snapshots are stored, never executed.")
    @AgentToolPolicy(access = AgentToolAccess.USER, risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public SignalDashboardPanelDraft upsertSignalDashboardPanelDraft(
            @ToolParam(description = "Asset fields; omit id, creator and timestamps."
                    + " Specify signal, draftKey, title, visualization and local route.")
            SignalDashboardPanelDraft value) {
        String actor = SignalAssetToolSupport.actor(true);
        if (value == null || value.getId() != null || value.getCreateTime() != null || value.getUpdateTime() != null) {
            throw new IllegalArgumentException("Asset is required; server-owned fields must be omitted");
        }
        SignalAssetToolSupport.signal(value.getSignal(), true);
        SignalAssetToolSupport.key(value.getDraftKey());
        return service.upsertSignalDashboardPanelDraft(actor, value);
    }

    @Tool(name = "dashboard.panel_draft.delete_signal_dashboard_panel_draft", description = "Delete one private panel draft belonging to the current user. "
            + "Underlying signal data is not deleted. "
                    + "AI execution requires administrator confirmation; ordinary users use the native panel-draft controls.")
    @AgentToolPolicy(access = AgentToolAccess.USER, risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> deleteSignalDashboardPanelDraft(
            @ToolParam(description = "Signal: logs, traces, metrics, alerts.") String signal,
            @ToolParam(description = "Exact asset key.") String draftKey,
            @ToolParam(description = "Operator deletion reason recorded in the tool audit ledger.") String reason) {
        String actor = SignalAssetToolSupport.actor(true);
        SignalAssetToolSupport.signal(signal, true);
        SignalAssetToolSupport.key(draftKey);
        SignalAssetToolSupport.reason(reason);
        service.deleteSignalDashboardPanelDraft(actor, signal, draftKey);
        return Map.of("deleted", true, "signal", signal, "draftKey", draftKey, "scope", "creator-private");
    }
}
