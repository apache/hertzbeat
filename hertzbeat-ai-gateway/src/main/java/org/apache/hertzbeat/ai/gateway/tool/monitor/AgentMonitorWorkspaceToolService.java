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

import java.util.Map;
import java.util.Set;
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

/** Personal monitor presentation state bound to the trusted invocation actor. */
@Service
public class AgentMonitorWorkspaceToolService {
    private final MetricsFavoriteService favorites;
    private final MonitorMetricLayoutService layouts;

    public AgentMonitorWorkspaceToolService(MetricsFavoriteService favorites, MonitorMetricLayoutService layouts) {
        this.favorites = favorites;
        this.layouts = layouts;
    }

    @Tool(name = "monitor.favorite_list", description = "List the current user's favorite metric groups for a monitor.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Set<String> favoriteList(@ToolParam(description = "Monitor id.") Long monitorId) {
        positive(monitorId);
        return favorites.getUserFavoritedMetrics(actor(), monitorId);
    }

    @Tool(name = "monitor.favorite_set", description = "Add or remove a metric group in the current user's favorites.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Set<String> favoriteSet(@ToolParam(description = "Monitor id.") Long monitorId,
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

    @Tool(name = "monitor.layout_get", description = "Read the current user's metric layout for an application.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> layoutGet(@ToolParam(description = "Monitor application.") String application) {
        var result = layouts.get(actor(), application);
        return result.<Map<String, Object>>map(value -> Map.of("present", true, "layout", value))
                .orElseGet(() -> Map.of("present", false));
    }

    @Tool(name = "monitor.layout_save", description = "Save the current user's versioned metric layout, preserving optimistic revision checks.")
    @AgentToolPolicy(access = AgentToolAccess.USER, risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public MonitorMetricLayout layoutSave(@ToolParam(description = "Monitor application.") String application,
                                         @ToolParam(description = "Versioned layout and expected revision.") MonitorMetricLayoutSaveRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Layout request is required");
        }
        return layouts.save(actor(), application, request);
    }

    @Tool(name = "monitor.layout_delete", description = "Reset the current user's application metric layout with the expected revision.")
    @AgentToolPolicy(access = AgentToolAccess.USER, risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> layoutDelete(@ToolParam(description = "Monitor application.") String application,
                                          @ToolParam(description = "Current layout revision.") String expectedRevision) {
        String user = actor();
        layouts.delete(user, application, expectedRevision);
        return Map.of("deleted", layouts.get(user, application).isEmpty());
    }

    private static String actor() {
        AgentActor actor = AgentToolContextSupport.invocation().getRequest().getActor();
        if (actor == null || !ActorSupport.TYPE_USER.equals(actor.getType()) || actor.getId() == null || actor.getId().isBlank()) {
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
