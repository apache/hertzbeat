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

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.entity.dto.SignalDashboard;
import org.apache.hertzbeat.manager.service.SignalDashboardService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

import java.util.Map;

/** Shared dashboards: creator is audit identity, never a workspace access boundary. */
@Service
public class AgentDashboardToolService {

    private final SignalDashboardService service;

    public AgentDashboardToolService(SignalDashboardService service) {
        this.service = service;
    }

    @Tool(
            name = "dashboard.list_signal_dashboards",
            description =
                    "List shared dashboards, including their current CAS revision. These assets are"
                        + " shared across users, not isolated by workspace. Returns at most ten"
                        + " documents.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> listSignalDashboards(
            @ToolParam(required = false, description = "Offset, 0 to 10000; default 0.")
                    Integer offset,
            @ToolParam(required = false, description = "Page size, 1 to 10; default 5.")
                    Integer limit) {
        String actor = SignalAssetToolSupport.actor(false);
        int start = SignalAssetToolSupport.offset(offset);
        int count = SignalAssetToolSupport.limit(limit);
        return SignalAssetToolSupport.page(
                service.listSignalDashboards(actor), start, count, "shared");
    }

    @Tool(
            name = "dashboard.upsert_signal_dashboard",
            description =
                    "Create or replace one shared dashboard for all users. Pass the exact read"
                        + " revision for updates; omit revision only for creation. Perses document"
                        + " validation and revision conflicts are enforced by the dashboard"
                        + " service. Legacy raw JSON edits are unsupported; use the dashboard page"
                        + " for legacy assets. Does not execute queries.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public SignalDashboard upsertSignalDashboard(
            @ToolParam(
                            description =
                                    "Dashboard document and key, version and revision. Do not"
                                        + " supply id or timestamps.")
                    SignalDashboard dashboard) {
        String actor = SignalAssetToolSupport.actor(true);
        if (dashboard == null || dashboard.getId() != null || dashboard.getCreateTime() != null || dashboard.getUpdateTime() != null) {
            throw new IllegalArgumentException(
                    "Dashboard is required; server-owned fields must be omitted");
        }
        if (dashboard.getDocument() == null) {
            throw new IllegalArgumentException(
                    "Legacy dashboard edits are unsupported by AI tools; use the dashboard page");
        }
        SignalAssetToolSupport.key(dashboard.getDashboardKey());
        SignalAssetToolSupport.revision(dashboard.getRevision(), false);
        var saved = service.upsertSignalDashboard(actor, dashboard);
        return SignalAssetReadback.saved(
                saved,
                service.listSignalDashboards(actor),
                row -> dashboard.getDashboardKey().equals(row.getDashboardKey()));
    }

    @Tool(
            name = "dashboard.delete_signal_dashboard",
            description =
                    "Delete one shared dashboard for all users, using the exact current revision."
                        + " Does not delete the underlying signal data. AI execution requires"
                        + " administrator confirmation; ordinary users use the native dashboard"
                        + " page.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> deleteSignalDashboard(
            @ToolParam(description = "Exact dashboard key.") String dashboardKey,
            @ToolParam(description = "Current revision obtained from list.") Long revision,
            @ToolParam(description = "Operator deletion reason recorded in the tool audit ledger.")
                    String reason) {
        String actor = SignalAssetToolSupport.actor(true);
        SignalAssetToolSupport.key(dashboardKey);
        SignalAssetToolSupport.revision(revision, true);
        SignalAssetToolSupport.reason(reason);
        service.deleteSignalDashboard(actor, dashboardKey, revision);
        SignalAssetReadback.absent(
                service.listSignalDashboards(actor),
                row -> dashboardKey.equals(row.getDashboardKey()));
        return Map.of(
                "deleted",
                true,
                "dashboardKey",
                dashboardKey,
                "scope",
                "shared",
                "revision",
                revision);
    }
}
