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

package org.apache.hertzbeat.ai.gateway.tool.alert;

import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.alert.dto.AlertInhibitRequest;
import org.apache.hertzbeat.alert.service.AlertInhibitService;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;

/** Validated platform management tools. */
@Service
public class AgentAlertInhibitToolService {
    private final AlertInhibitService service;

    public AgentAlertInhibitToolService(AlertInhibitService service) {
        this.service = service;
    }

    @Tool(name = "alert_inhibit.list", description = "List alert inhibition policies.")
    @AgentToolPolicy(risk = AgentToolRisk.READ, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.STANDARD)
    public Map<String, Object> list(@ToolParam(required = false) String search,
            @ToolParam(required = false) Integer pageIndex, @ToolParam(required = false) Integer pageSize) {
        return AgentManagementOutputSupport.view(service.list(null, search, "gmtCreate", "desc",
                AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, Integer.MAX_VALUE),
                AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 100)));
    }

    @Tool(name = "alert_inhibit.get", description = "Get an exact alert inhibition policy.")
    @AgentToolPolicy(risk = AgentToolRisk.READ, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.STANDARD)
    public Map<String, Object> get(Long inhibitId) {
        requireId(inhibitId);
        return AgentManagementOutputSupport.view(service.get(inhibitId));
    }

    @Tool(name = "alert_inhibit.create", description = "Create an inhibition policy; matching target alerts may stop notifying.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.USER)
    public Map<String, Object> create(AlertInhibitRequest configuration) {
        if (configuration == null || configuration.getId() != null) {
            throw new IllegalArgumentException("New configuration must not include an id");
        }
        return AgentManagementOutputSupport.view(service.create(configuration));
    }

    @Tool(name = "alert_inhibit.update", description = "Replace an exact inhibition policy, including enabled state.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.USER)
    public Map<String, Object> update(Long inhibitId, AlertInhibitRequest configuration) {
        requireId(inhibitId);
        if (configuration == null || configuration.getId() != null && !inhibitId.equals(configuration.getId())) {
            throw new IllegalArgumentException("Configuration id must match inhibitId");
        }
        configuration.setId(inhibitId);
        return AgentManagementOutputSupport.view(service.update(configuration));
    }

    @Tool(name = "alert_inhibit.delete", description = "Permanently delete an exact inhibition policy; notifications may resume.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.ADMIN)
    public Map<String, Object> delete(Long inhibitId, String reason) {
        get(inhibitId);
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Deletion reason is required");
        }
        service.delete(Set.of(inhibitId));
        return Map.of("deletedId", inhibitId);
    }

    private void requireId(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("inhibitId must be positive");
        }
    }

}
