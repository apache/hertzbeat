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

import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorDefinitionDraft;

import java.util.Map;
import java.util.Set;

/** Exact named template identities, independent from numeric monitor identities. */
final class AgentDefinitionMutationSemantics {
    static boolean supports(String tool) {
        return "monitor.definition_create".equals(tool) || "monitor.definition_update".equals(tool);
    }

    static boolean permits(AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        try {
            if (!supports(tool)
                    || goal == null
                    || !goal.changesResources()
                    || !"monitor_definition".equals(goal.resourceType())
                    || !Integer.valueOf(1).equals(goal.expectedCount())
                    || !goal.resourceIds().isEmpty()
                    || !Set.of("app", "revision", "definitionHash")
                            .containsAll(goal.expectedChanges().keySet())
                    || !(goal.expectedChanges().get("app") instanceof String goalApp)
                    || !(args.get("app") instanceof String nativeApp)
                    || !goalApp.equalsIgnoreCase(nativeApp)) {
                return false;
            }
            boolean create = "monitor.definition_create".equals(tool);
            if (goal.operation()
                            != (create
                                    ? AgentTaskAssessment.Operation.CREATE
                                    : AgentTaskAssessment.Operation.UPDATE)
                    || !Set.of("app", "definition", "previewHash", "revision")
                            .containsAll(args.keySet())
                    || create && args.containsKey("revision")
                    || !create
                            && goal.expectedChanges().containsKey("revision")
                            && !java.util.Objects.equals(
                                    goal.expectedChanges().get("revision"), args.get("revision"))) {
                return false;
            }
            String hash =
                    AgentMonitorDefinitionDraft.previewHash(
                            create ? "create" : "update",
                            (String) args.get("app"),
                            (String) args.get("revision"),
                            (String) args.get("definition"));
            return hash.equals(args.get("previewHash"))
                    && (!goal.expectedChanges().containsKey("definitionHash")
                            || goal.expectedChanges()
                                    .get("definitionHash")
                                    .equals(
                                            AgentMonitorDefinitionDraft.inspect(
                                                            (String) args.get("definition"))
                                                    .definitionHash()));
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static boolean verified(
            String tool, Map<String, Object> args, Map<String, Object> data, String trustedHash) {
        try {
            boolean create = "monitor.definition_create".equals(tool);
            return supports(tool)
                    && "monitor-definition-mutation.v1".equals(data.get("receiptVersion"))
                    && tool.equals(data.get("toolName"))
                    && args.get("app").equals(data.get("app"))
                    && (create ? "CREATE" : "UPDATE").equals(data.get("operation"))
                    && Boolean.TRUE.equals(data.get("verified"))
                    && data.get("revision") instanceof String revision
                    && revision.matches("[a-f0-9]{64}")
                    && trustedHash.equals(data.get("inputHash"))
                    && AgentMonitorDefinitionDraft.inspect((String) args.get("definition"))
                            .definitionHash()
                            .equals(data.get("definitionHash"));
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static String previewHash(Map<String, Object> args, String tool) {
        return AgentMonitorDefinitionDraft.previewHash(
                "monitor.definition_create".equals(tool) ? "create" : "update",
                (String) args.get("app"),
                (String) args.get("revision"),
                (String) args.get("definition"));
    }
}
