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

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionIdentity;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Exact bounded non-secret saved definitions for the existing revision-bound authoring workflow.
 */
@Service
public class AgentMonitorDefinitionSourceToolService {
    private final MonitorDefinitionService definitions;

    public AgentMonitorDefinitionSourceToolService(MonitorDefinitionService definitions) {
        this.definitions = definitions;
    }

    @Tool(
            name = "monitor.definition_source",
            description =
                    "Read exact saved monitor-template YAML for a requested app, with current"
                        + " revision and independent definitionHash. Administrator only. At most 64"
                        + " KiB; credential placeholders are permitted but literal credentials,"
                        + " malformed or oversized definitions return available=false and require"
                        + " the native secure editor. Never substitutes redacted YAML that could"
                        + " overwrite credentials. Does not read monitor parameter values, prove"
                        + " deployment health, or grant write approval. Use definition_preview"
                        + " before revision-bound definition_update.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> source(
            String app,
            @ToolParam(required = false, description = "Optional display language.")
                    String language) {
        MonitorDefinitionIdentity.requireSafe(app);
        var detail = definitions.detail(app, language);
        if (detail == null
                || !app.equalsIgnoreCase(detail.app())
                || detail.revision() == null
                || !detail.revision().matches("[a-f0-9]{64}"))
            throw new IllegalStateException("Native definition identity or revision mismatch");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("app", detail.app());
        result.put("revision", detail.revision());
        result.put("origin", detail.origin());
        result.put("editable", detail.editable());
        result.put("deletable", detail.deletable());
        result.put("hidden", detail.hidden());
        AgentMonitorDefinitionDraft draft;
        try {
            draft = AgentMonitorDefinitionDraft.inspect(detail.definition());
        } catch (IllegalArgumentException unsafe) {
            return blocked(result);
        }
        if (!detail.app().equals(draft.app()))
            throw new IllegalStateException("Saved definition identity mismatch");
        result.put("available", true);
        result.put("definition", detail.definition());
        result.put("definitionHash", draft.definitionHash());
        String encoded = org.apache.hertzbeat.common.util.JsonUtil.toJson(result);
        if (!encoded.equals(
                org.apache.hertzbeat.ai.gateway.text.GatewayText.redactSecrets(encoded)))
            return blocked(result);
        return result;
    }

    private Map<String, Object> blocked(Map<String, Object> result) {
        result.remove("definition");
        result.remove("definitionHash");
        result.put("available", false);
        result.put("reasonCode", "NATIVE_SECURE_EDITOR_REQUIRED");
        return result;
    }
}
