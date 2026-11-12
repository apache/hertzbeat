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

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.grafana.service.DashboardService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/** Native local dashboard binding metadata; never sends a request to Grafana. */
@Service
public class AgentGrafanaMetadataToolService {
    private final DashboardService dashboards;

    public AgentGrafanaMetadataToolService(DashboardService dashboards) {
        this.dashboards = dashboards;
    }

    @Tool(
            name = "grafana.dashboard_get",
            description =
                    "Get local Grafana dashboard binding metadata for an exact monitor id,"
                        + " including UID and version. Does not contact Grafana, execute queries,"
                        + " expose template or credentials, or prove external health.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> get(Long monitorId) {
        if (monitorId == null || monitorId <= 0)
            throw new IllegalArgumentException("Positive monitorId is required");
        var value = dashboards.getDashboardByMonitorId(monitorId);
        if (value == null) return Map.of("monitorId", monitorId, "found", false);
        if (!monitorId.equals(value.getMonitorId()))
            throw new IllegalStateException("Native monitor binding mismatch");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("monitorId", monitorId);
        result.put("found", true);
        result.put("uid", value.getUid());
        result.put("version", value.getVersion());
        result.put("enabled", value.isEnabled());
        return result;
    }
}
