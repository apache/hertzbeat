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

import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayout;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayoutSaveRequest;
import org.apache.hertzbeat.manager.service.MetricsFavoriteService;
import org.apache.hertzbeat.manager.service.MonitorMetricLayoutService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

/** Personal monitor presentation state bound to the trusted invocation actor. */
@Service
public class AgentMonitorWorkspaceToolService {
    private final MetricsFavoriteService favorites;
    private final MonitorMetricLayoutService layouts;

    public AgentMonitorWorkspaceToolService(
            MetricsFavoriteService favorites, MonitorMetricLayoutService layouts) {
        this.favorites = favorites;
        this.layouts = layouts;
    }

    @Tool(
            name = "monitor.favorite_list",
            description = "List the current user's favorite metric groups for a monitor.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> favoriteRead(
            @ToolParam(description = "Monitor id.") Long monitorId) {
        var result =
                org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport.view(
                        Map.of("monitorId", monitorId, "metricsNames", favoriteList(monitorId)));
        result.put("readVersion", "monitor-workspace-read.v1");
        return result;
    }

    public Set<String> favoriteList(@ToolParam(description = "Monitor id.") Long monitorId) {
        positive(monitorId);
        return favorites.getUserFavoritedMetrics(actor(), monitorId);
    }

    @Tool(
            name = "monitor.favorite_set",
            description = "Add or remove a metric group in the current user's favorites.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> favoriteWrite(
            @ToolParam(description = "Monitor id.") Long monitorId,
            @ToolParam(description = "Metric group identifier.") String metricsName,
            @ToolParam(description = "True to favorite; false to remove.") boolean favorite) {
        positive(monitorId);
        if (!AgentPersonalWorkspaceProof.metric(metricsName))
            throw new IllegalArgumentException("A metric group identifier is required");
        String user = actor();
        var args =
                AgentToolContextSupport.arguments(
                        "monitorId", monitorId, "metricsName", metricsName, "favorite", favorite);
        AgentPersonalWorkspaceProof.guard("monitor.favorite_set", args);
        if (favorite) favorites.addMetricsFavorite(user, monitorId, metricsName);
        else favorites.removeMetricsFavorite(user, monitorId, metricsName);
        Set<String> observed = null;
        try {
            observed = favorites.getUserFavoritedMetrics(user, monitorId);
        } catch (RuntimeException unavailable) {
            /* The write is not retried when independent readback fails. */
        }
        boolean member = observed != null && observed.contains(metricsName);
        return AgentPersonalWorkspaceProof.receipt(
                "monitor.favorite_set",
                args,
                Map.of(
                        "monitorId",
                        monitorId,
                        "metricsName",
                        metricsName,
                        "favorite",
                        favorite,
                        "observedFavorite",
                        member),
                observed != null && member == favorite);
    }

    public Set<String> favoriteSet(
            @ToolParam(description = "Monitor id.") Long monitorId,
            @ToolParam(description = "Metric group name.") String metricsName,
            @ToolParam(description = "True to favorite; false to remove.") boolean favorite) {
        positive(monitorId);
        if (metricsName == null || metricsName.isBlank() || metricsName.length() > 100) {
            throw new IllegalArgumentException("A bounded metric group name is required");
        }
        String user = actor();
        if (favorite) {
            favorites.addMetricsFavorite(user, monitorId, metricsName);
        } else {
            favorites.removeMetricsFavorite(user, monitorId, metricsName);
        }
        return favorites.getUserFavoritedMetrics(user, monitorId);
    }

    @Tool(
            name = "monitor.layout_get",
            description = "Read the current user's metric layout for an application.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> layoutRead(
            @ToolParam(description = "Monitor application.") String application) {
        String app =
                org.apache.hertzbeat.ai.gateway.tool.metrics.AgentHierarchyReadOutput.application(
                        application);
        if (app.isEmpty()) throw new IllegalArgumentException("application is required");
        Map<String, Object> data = new java.util.LinkedHashMap<>(layoutGet(app));
        data.put("application", app);
        var result =
                org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport.view(data);
        result.put("readVersion", "monitor-workspace-read.v1");
        return result;
    }

    public Map<String, Object> layoutGet(
            @ToolParam(description = "Monitor application.") String application) {
        var result = layouts.get(actor(), application);
        return result.<Map<String, Object>>map(value -> Map.of("present", true, "layout", value))
                .orElseGet(() -> Map.of("present", false));
    }

    @Tool(
            name = "monitor.layout_save",
            description =
                    "Save the current user's versioned metric layout, preserving optimistic"
                            + " revision checks.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> layoutWrite(
            @ToolParam(description = "Monitor application.") String application,
            @ToolParam(
                            description =
                                    "Complete versioned schemaVersion1, columns12 layout and"
                                            + " expectedRevision.")
                    MonitorMetricLayoutSaveRequest request) {
        var frozen =
                org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                        org.apache.hertzbeat.common.util.JsonUtil.toJson(request),
                        MonitorMetricLayoutSaveRequest.class);
        var args = AgentPersonalWorkspaceProof.args(application, frozen);
        String app = AgentPersonalWorkspaceProof.application(application);
        String user = actor();
        if (!AgentPersonalWorkspaceProof.validRequest(AgentPersonalWorkspaceProof.object(frozen)))
            throw new IllegalArgumentException("A complete valid versioned layout is required");
        AgentPersonalWorkspaceProof.guard("monitor.layout_save", args);
        var saved = layouts.save(user, app, frozen);
        MonitorMetricLayout observed = null;
        try {
            observed = layouts.get(user, app).orElse(null);
        } catch (RuntimeException unavailable) {
            /* Unknown postcondition is a non-verifying receipt. */
        }
        boolean verified = AgentPersonalWorkspaceProof.matches(observed, saved, frozen, app);
        return AgentPersonalWorkspaceProof.receipt(
                "monitor.layout_save",
                args,
                Map.of(
                        "application",
                        app,
                        "revision",
                        observed == null ? "" : observed.revision(),
                        "writeRevision",
                        saved == null ? "" : saved.revision(),
                        "documentHash",
                        observed == null
                                ? ""
                                : AgentPersonalWorkspaceProof.hash(
                                        AgentPersonalWorkspaceProof.document(
                                                AgentPersonalWorkspaceProof.object(observed)))),
                verified);
    }

    public MonitorMetricLayout layoutSave(
            @ToolParam(description = "Monitor application.") String application,
            @ToolParam(description = "Versioned layout and expected revision.")
                    MonitorMetricLayoutSaveRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Layout request is required");
        }
        return layouts.save(actor(), application, request);
    }

    @Tool(
            name = "monitor.layout_delete",
            description =
                    "Reset the current user's application metric layout with the expected"
                            + " revision.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> layoutReset(
            @ToolParam(description = "Monitor application.") String application,
            @ToolParam(description = "Exact current UUID layout revision.")
                    String expectedRevision) {
        String app = AgentPersonalWorkspaceProof.application(application);
        String user = actor();
        if (!AgentPersonalWorkspaceProof.revision(expectedRevision, false))
            throw new IllegalArgumentException("Current layout revision is required");
        var args =
                AgentToolContextSupport.arguments(
                        "application", application, "expectedRevision", expectedRevision);
        AgentPersonalWorkspaceProof.guard("monitor.layout_delete", args);
        var before =
                layouts.get(user, app)
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "Layout does not exist; no reset started"));
        if (!expectedRevision.equals(before.revision()))
            throw new IllegalArgumentException("Layout revision changed; no reset started");
        AgentPersonalWorkspaceProof.guard("monitor.layout_delete", args);
        layouts.delete(user, app, expectedRevision);
        boolean absent = false;
        try {
            absent = layouts.get(user, app).isEmpty();
        } catch (RuntimeException unavailable) {
            /* Never repeat a successful delete to obtain readback. */
        }
        return AgentPersonalWorkspaceProof.receipt(
                "monitor.layout_delete",
                args,
                Map.of("application", app, "expectedRevision", expectedRevision, "absent", absent),
                absent);
    }

    public Map<String, Object> layoutDelete(
            @ToolParam(description = "Monitor application.") String application,
            @ToolParam(description = "Current layout revision.") String expectedRevision) {
        String user = actor();
        layouts.delete(user, application, expectedRevision);
        return Map.of("deleted", layouts.get(user, application).isEmpty());
    }

    private static String actor() {
        AgentActor actor = AgentToolContextSupport.invocation().getRequest().getActor();
        if (actor == null
                || !ActorSupport.TYPE_USER.equals(actor.getType())
                || actor.getId() == null
                || actor.getId().isBlank()) {
            throw new IllegalArgumentException("Authenticated user identity is required");
        }
        return actor.getId();
    }

    private static void positive(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("A positive monitor id is required");
        }
    }
}
