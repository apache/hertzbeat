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
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;
import org.apache.hertzbeat.alert.integration.service.AlertIntegrationCatalogService;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Service;

/** Token-free native integration guides and workspace verification evidence. */
@Service
public class AgentAlertIntegrationReadToolService {
    private final AlertIntegrationCatalogService service;

    public AgentAlertIntegrationReadToolService(AlertIntegrationCatalogService service) {
        this.service = service;
    }

    @Tool(name = "alert.integration.catalog", description = "Read external integration catalog including workspace-scoped verification status. Does not start verification or send test traffic.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> catalog() {
        String workspace = AuthTokenRequestContext.currentWorkspaceId();
        if (workspace == null || workspace.isBlank()) {
            throw new IllegalArgumentException("Trusted workspace is required");
        }
        return AgentManagementOutputSupport.view(service.catalog(workspace));
    }

    @Tool(name = "alert.integration.guide", description = "Render a registered token-free integration guide. Credentials must be supplied separately by the operator, never by this tool.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> guide(String source) {
        if (source == null || !source.matches("[a-zA-Z0-9_-]{1,64}")) {
            throw new IllegalArgumentException("Invalid integration source");
        }
        return AgentManagementOutputSupport.view(service.render(source));
    }

    @Tool(name = "alert.integration.verification.start", description = "Start or restart a workspace integration verification window. Records WAITING only; does not send test traffic or credentials.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE, access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> startVerification(String source) {
        if (source == null || !source.matches("[a-zA-Z0-9_-]{1,64}")) {
            throw new IllegalArgumentException("Invalid integration source");
        }
        String workspace = AuthTokenRequestContext.currentWorkspaceId();
        if (workspace == null || workspace.isBlank()) {
            throw new IllegalArgumentException("Trusted workspace is required");
        }
        return AgentManagementOutputSupport.view(service.startVerification(workspace, source));
    }

}
