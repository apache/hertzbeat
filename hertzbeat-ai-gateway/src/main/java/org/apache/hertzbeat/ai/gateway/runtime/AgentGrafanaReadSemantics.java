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

package org.apache.hertzbeat.ai.gateway.runtime;

import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.application.AgentGrafanaDraft;

import java.util.Map;
import java.util.Set;

/** Current editable source metadata is not rendering, datasource health or mutation proof. */
final class AgentGrafanaReadSemantics {
    static boolean supports(String tool) {
        return "grafana.dashboard_source".equals(tool);
    }

    AgentReadObservationClassifier.Observation classify(
            AgentRuntimeToolCall call, Map<String, Object> data) {
        try {
            var args = call.getArguments();
            if (!Set.of("monitorId", "expectedUid", "expectedVersion").equals(args.keySet())
                    || !Boolean.TRUE.equals(data.get("available"))
                    || AgentGrafanaMutationSemantics.number(args.get("monitorId"))
                            != AgentGrafanaMutationSemantics.number(data.get("monitorId"))
                    || !args.get("expectedUid").equals(data.get("uid"))
                    || AgentGrafanaMutationSemantics.number(args.get("expectedVersion"))
                            != AgentGrafanaMutationSemantics.number(data.get("version"))
                    || !(data.get("dashboardJson") instanceof String json)) return null;
            AgentGrafanaDraft.fromArguments(
                    "grafana.dashboard_preview",
                    Map.of(
                            "operation",
                            "update",
                            "monitorId",
                            args.get("monitorId"),
                            "dashboardJson",
                            json,
                            "expectedUid",
                            args.get("expectedUid"),
                            "expectedVersion",
                            args.get("expectedVersion")));
            return GatewayText.sha256(json).equals(data.get("definitionHash"))
                    ? new AgentReadObservationClassifier.Observation(
                            "non-secret-grafana-dashboard-source", 1)
                    : null;
        } catch (RuntimeException invalid) {
            return null;
        }
    }
}
