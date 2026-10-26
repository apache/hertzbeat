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

package org.apache.hertzbeat.ai.gateway.tool.system;

import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;
import org.apache.hertzbeat.manager.controller.TelemetrySourceController;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Service;

/** Preserve the native explicit-subject workspace gate; invocation permissions can only narrow it. */
@Service
public class AgentTelemetrySourceToolService {
    private final TelemetrySourceController source;

    public AgentTelemetrySourceToolService(TelemetrySourceController source) {
        this.source = source;
    }

    @Tool(name = "telemetry.sources", description = "Read external/self telemetry readiness and authorization. "
            + "Self accessibility requires both trusted actor and native explicit-workspace authorization.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> sources() {
        var request = AgentToolContextSupport.invocation().getRequest();
        AgentActor actor = request.getActor();
        Map<String, Object> data = new LinkedHashMap<>(source.sources().getData());
        boolean authorizationUnavailable = false;
        Object value = data.get("self");
        if (value instanceof Map<?, ?> self) {
            Map<String, Object> safe = new LinkedHashMap<>();
            self.forEach((key, item) -> safe.put(String.valueOf(key), item));
            boolean trusted = ActorSupport.TYPE_USER.equals(actor.getType()) && ActorSupport.hasIdentity(actor)
                    && actor.getRoles() != null && actor.getRoles().contains(ActorSupport.ROLE_ADMIN)
                    && request.getWorkspaceId().equals(self.get("workspaceId"));
            try {
                trusted = trusted && actor.getId().equals(ActorSupport.requireCurrentSurenessActor().getId());
            } catch (IllegalStateException exception) {
                trusted = false;
            }
            if (!trusted) {
                authorizationUnavailable = true;
                safe.put("accessible", false);
                safe.put("workspaceId", "");
                safe.put("reason", "Self telemetry requires admin and an explicitly authorized workspace");
            }
            data.put("self", safe);
        }
        Map<String, Object> result = AgentManagementOutputSupport.view(data);
        if (authorizationUnavailable) {
            result.put("partial", true);
            result.put("authorizationEvidence", "Native explicit-workspace subject authorization unavailable or not matched; use the native telemetry page");
        }
        return org.apache.hertzbeat.ai.gateway.tool.metrics.AgentTelemetryReadOutput.bound("telemetry.sources", result, Map.of());
    }
}
