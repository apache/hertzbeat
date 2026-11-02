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

package org.apache.hertzbeat.ai.gateway.tool.status;

import java.util.Map;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;
import org.apache.hertzbeat.manager.service.StatusPageService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/** Native per-component daily health history, bounded before querying storage. */
@Service
public class AgentStatusHistoryToolService {
    private final StatusPageService service;

    public AgentStatusHistoryToolService(StatusPageService service) {
        this.service = service;
    }

    @Tool(name = "status_page.component.history", description = "Read daily component health history for an exact component, up to 90 days. Includes current-day status.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> history(Long componentId, @ToolParam(required = false) Integer days) {
        int resolvedDays = days == null ? 7 : days;
        if (componentId == null || componentId <= 0 || resolvedDays < 1 || resolvedDays > 90) {
            throw new IllegalArgumentException("Positive componentId and days in 1..90 are required");
        }
        return AgentManagementOutputSupport.view(service.queryComponentStatus(componentId, resolvedDays));
    }
}
