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

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.service.AlertAnalysisPolicyService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.entity.alerter.AlertAnalysisPolicy;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/** Agent tools for configuring deterministic automatic alert analysis. */
@Service
public class AgentAlertAnalysisPolicyToolService {

    private final AlertAnalysisPolicyService policyService;

    public AgentAlertAnalysisPolicyToolService(AlertAnalysisPolicyService policyService) {
        this.policyService = policyService;
    }

    @Tool(name = "alert_analysis_policy.create",
            description = "Create an automatic alert analysis policy after inspecting available alert labels.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AlertAnalysisPolicy create(
            @ToolParam(description = "Policy name.") String name,
            @ToolParam(required = false, description = "Exact label values that select input alerts.")
            Map<String, String> matchLabels,
            @ToolParam(description = "Labels whose values identify one analysis context.") List<String> groupByLabels,
            @ToolParam(required = false, description = "Collection window in seconds; default 300.") Long windowSeconds,
            @ToolParam(required = false, description = "Minimum distinct alert count; default 2.")
            Integer minimumAlertCount,
            @ToolParam(required = false, description = "Cooldown for the same context in seconds; default 1800.")
            Long cooldownSeconds) {
        return policyService.create(name, matchLabels, groupByLabels, windowSeconds, minimumAlertCount,
                cooldownSeconds);
    }

    @Tool(name = "alert_analysis_policy.list", description = "List automatic alert analysis policies.")
    @AgentToolPolicy(
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public List<AlertAnalysisPolicy> list() {
        return policyService.findAll();
    }

    @Tool(name = "alert_analysis_policy.toggle", description = "Enable or disable an alert analysis policy.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AlertAnalysisPolicy toggle(@ToolParam(description = "Policy id.") Long policyId,
                                           @ToolParam(description = "Whether the policy is enabled.") boolean enabled) {
        return policyService.toggle(policyId, enabled);
    }

    @Tool(name = "alert_analysis_policy.delete", description = "Delete an automatic alert analysis policy.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public String delete(@ToolParam(description = "Policy id.") Long policyId,
                         @ToolParam(description = "Operator-provided deletion reason recorded with the tool invocation.")
                         String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("reason is required for alert_analysis_policy.delete");
        }
        policyService.delete(policyId);
        return "Alert analysis policy deleted: " + policyId;
    }
}
