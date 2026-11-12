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
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationWindow;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.service.entity.MonitorInvestigationReadModelService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Service;

/** Bounded native monitor investigation; entity binding visibility stays with the native service. */
@Service
public class AgentMonitorInvestigationToolService {
    private final MonitorService monitors;
    private final MonitorInvestigationReadModelService investigation;

    public AgentMonitorInvestigationToolService(MonitorService monitors, MonitorInvestigationReadModelService investigation) {
        this.monitors = monitors;
        this.investigation = investigation;
    }

    @Tool(name = "monitor.investigation", description = "Read native collection, current-alert, and workspace-visible entity-binding evidence over at most 24 hours.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> investigate(Long monitorId, Long start, Long end) {
        if (monitorId == null || monitorId <= 0 || start == null || end == null) {
            throw new IllegalArgumentException("Positive monitorId and complete start/end timestamps are required");
        }
        new InvestigationWindow(start, end);
        Monitor monitor = monitors.getMonitor(monitorId);
        if (monitor == null) {
            throw new IllegalArgumentException("Monitor not found");
        }
        return AgentManagementOutputSupport.view(investigation.query(monitor, start, end));
    }
}
