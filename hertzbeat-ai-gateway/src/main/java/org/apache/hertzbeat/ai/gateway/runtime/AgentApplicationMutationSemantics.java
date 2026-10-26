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

/** Explicit typed domain dispatch only; unknown application tools gain no mutation authority. */
final class AgentApplicationMutationSemantics {
    private AgentApplicationMutationSemantics() {}

    static boolean supports(String tool) {
        return AgentInlineCollectionSemantics.supports(tool)
                || AgentConfigurationMutationSemantics.supports(tool)
                || AgentNoticeMutationSemantics.supports(tool)
                || AgentLabelMutationSemantics.supports(tool)
                || AgentMonitorMutationSemantics.supports(tool)
                || AgentDefinitionMutationSemantics.supports(tool)
                || AgentGrafanaMutationSemantics.supports(tool);
    }

    static boolean permits(AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        if (AgentInlineCollectionSemantics.supports(tool)) return AgentInlineCollectionSemantics.permits(goal, args);
        if (AgentConfigurationMutationSemantics.supports(tool))
            return AgentConfigurationMutationSemantics.permits(goal, tool, args);
        if (AgentNoticeMutationSemantics.supports(tool))
            return AgentNoticeMutationSemantics.permits(goal, tool, args);
        if (AgentLabelMutationSemantics.supports(tool))
            return AgentLabelMutationSemantics.permits(goal, tool, args);
        if (AgentGrafanaMutationSemantics.supports(tool))
            return AgentGrafanaMutationSemantics.permits(goal, tool, args);
        return AgentDefinitionMutationSemantics.supports(tool)
                ? AgentDefinitionMutationSemantics.permits(goal, tool, args)
                : AgentMonitorMutationSemantics.permits(goal, tool, args);
    }
}
