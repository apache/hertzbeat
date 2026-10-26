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

import java.util.Map;

final class AgentConfigurationMutationSemantics {
    static boolean supports(String tool) {
        return AgentAlertInhibitMutationSemantics.supports(tool)
                || AgentPersonalWorkspaceMutationSemantics.supports(tool)
                || AgentAlertGroupMutationSemantics.supports(tool)
                || AgentStatusPageMutationSemantics.supports(tool)
                || AgentSharedAssetMutationSemantics.supports(tool)
                || AgentAlertRuleMutationSemantics.supports(tool)
                || AgentReceiverMutationSemantics.supports(tool);
    }

    static boolean permits(AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        if (AgentAlertInhibitMutationSemantics.supports(tool))
            return AgentAlertInhibitMutationSemantics.permits(goal, tool, args);
        if (AgentPersonalWorkspaceMutationSemantics.supports(tool))
            return AgentPersonalWorkspaceMutationSemantics.permits(goal, tool, args);
        if (AgentAlertGroupMutationSemantics.supports(tool))
            return AgentAlertGroupMutationSemantics.permits(goal, tool, args);
        if (AgentStatusPageMutationSemantics.supports(tool))
            return AgentStatusPageMutationSemantics.permits(goal, tool, args);
        if (AgentSharedAssetMutationSemantics.supports(tool))
            return AgentSharedAssetMutationSemantics.permits(goal, tool, args);
        return AgentReceiverMutationSemantics.supports(tool)
                ? AgentReceiverMutationSemantics.permits(goal, tool, args)
                : AgentAlertRuleMutationSemantics.permits(goal, tool, args);
    }

    static boolean verified(
            String tool, Map<String, Object> args, Map<String, Object> data, String hash) {
        if (AgentAlertInhibitMutationSemantics.supports(tool))
            return AgentAlertInhibitMutationSemantics.verified(tool, args, data, hash);
        if (AgentPersonalWorkspaceMutationSemantics.supports(tool))
            return AgentPersonalWorkspaceMutationSemantics.verified(tool, args, data, hash);
        if (AgentAlertGroupMutationSemantics.supports(tool))
            return AgentAlertGroupMutationSemantics.verified(tool, args, data, hash);
        if (AgentStatusPageMutationSemantics.supports(tool))
            return AgentStatusPageMutationSemantics.verified(tool, args, data, hash);
        if (AgentSharedAssetMutationSemantics.supports(tool))
            return AgentSharedAssetMutationSemantics.verified(tool, args, data, hash);
        return AgentReceiverMutationSemantics.supports(tool)
                ? AgentReceiverMutationSemantics.verified(tool, args, data, hash)
                : AgentAlertRuleMutationSemantics.verified(tool, args, data, hash);
    }

    static boolean resource(String resource) {
        return "alert_inhibit".equals(resource)
                || AgentPersonalWorkspaceMutationSemantics.resource(resource)
                || "alert_group".equals(resource)
                || AgentStatusPageMutationSemantics.resource(resource)
                || AgentSharedAssetMutationSemantics.resource(resource)
                || "alert_rule".equals(resource)
                || "notice_receiver".equals(resource);
    }

    static Object identity(String tool, Map<String, Object> data) {
        if (AgentAlertInhibitMutationSemantics.supports(tool))
            return AgentAlertInhibitMutationSemantics.identity(data);
        if (AgentPersonalWorkspaceMutationSemantics.supports(tool))
            return AgentPersonalWorkspaceMutationSemantics.identity(tool, data);
        if (AgentAlertGroupMutationSemantics.supports(tool))
            return AgentAlertGroupMutationSemantics.identity(data);
        if (AgentStatusPageMutationSemantics.supports(tool))
            return AgentStatusPageMutationSemantics.identity(data);
        if (AgentSharedAssetMutationSemantics.supports(tool))
            return tool.startsWith("dashboard.")
                    ? data.get("dashboardKey")
                    : data.get("signal") + ":" + data.get("viewKey");
        return AgentReceiverMutationSemantics.supports(tool)
                ? AgentLabelMutationSemantics.id(data.get("id"))
                : AgentLabelMutationSemantics.id(
                        AgentAlertRuleMutationSemantics.unwrap(tool, data).get("ruleId"));
    }
}
