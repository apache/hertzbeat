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

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentPersonalWorkspaceProof;

import java.util.Map;
import java.util.Set;

/** One personal setting at an exact original target; readback receipts cannot expand the task. */
final class AgentPersonalWorkspaceMutationSemantics {
    static boolean supports(String tool) {
        return AgentPersonalWorkspaceProof.supports(tool);
    }

    static boolean resource(String resource) {
        return "monitor_favorite".equals(resource) || namedResource(resource);
    }

    static boolean namedResource(String resource) {
        return "monitor_layout".equals(resource);
    }

    static boolean validGoal(AgentTaskAssessment.Goal goal) {
        try {
            if (!resource(goal.resourceType())
                    || !goal.changesResources()
                    || !Integer.valueOf(1).equals(goal.expectedCount())) return false;
            var fields = goal.expectedChanges();
            if ("monitor_favorite".equals(goal.resourceType()))
                return goal.operation() == AgentTaskAssessment.Operation.UPDATE
                        && goal.resourceIds().size() == 1
                        && fields.keySet().equals(Set.of("metricsName", "favorite"))
                        && AgentPersonalWorkspaceProof.metric(fields.get("metricsName"))
                        && fields.get("favorite") instanceof Boolean;
            if (!goal.resourceIds().isEmpty()) return false;
            AgentPersonalWorkspaceProof.application(fields.get("application"));
            if (goal.operation() == AgentTaskAssessment.Operation.DELETE)
                return fields.keySet().equals(Set.of("application", "expectedRevision"))
                        && AgentPersonalWorkspaceProof.revision(
                                fields.get("expectedRevision"), false);
            return fields.keySet().equals(Set.of("application", "request"))
                    && AgentPersonalWorkspaceProof.validRequest(fields.get("request"))
                    && (goal.operation() == AgentTaskAssessment.Operation.CREATE
                                    && "missing"
                                            .equals(
                                                    ((Map<?, ?>) fields.get("request"))
                                                            .get("expectedRevision"))
                            || goal.operation() == AgentTaskAssessment.Operation.UPDATE
                                    && !"missing"
                                            .equals(
                                                    ((Map<?, ?>) fields.get("request"))
                                                            .get("expectedRevision")));
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static boolean permits(AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        try {
            if (!AgentPersonalWorkspaceProof.validArguments(tool, args)
                    || goal == null
                    || !goal.valid()
                    || !validGoal(goal)) return false;
            var fields = goal.expectedChanges();
            if (tool.equals("monitor.favorite_set"))
                return "monitor_favorite".equals(goal.resourceType())
                        && args.keySet().equals(Set.of("monitorId", "metricsName", "favorite"))
                        && goal.resourceIds().getFirst()
                                == AgentPersonalWorkspaceProof.positive(args.get("monitorId"))
                        && fields.get("metricsName").equals(args.get("metricsName"))
                        && fields.get("favorite").equals(args.get("favorite"));
            if (!namedResource(goal.resourceType())
                    || !AgentPersonalWorkspaceProof.application(fields.get("application"))
                            .equals(
                                    AgentPersonalWorkspaceProof.application(
                                            args.get("application")))) return false;
            if (tool.equals("monitor.layout_delete"))
                return goal.operation() == AgentTaskAssessment.Operation.DELETE
                        && args.keySet().equals(Set.of("application", "expectedRevision"))
                        && fields.get("expectedRevision").equals(args.get("expectedRevision"));
            return goal.operation() != AgentTaskAssessment.Operation.DELETE
                    && args.keySet().equals(Set.of("application", "request"))
                    && AgentPersonalWorkspaceProof.hash(fields.get("request"))
                            .equals(AgentPersonalWorkspaceProof.hash(args.get("request")));
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static boolean verified(
            String tool, Map<String, Object> args, Map<String, Object> out, String hash) {
        try {
            if (!AgentPersonalWorkspaceProof.validArguments(tool, args)
                    || !AgentPersonalWorkspaceProof.VERSION.equals(out.get("receiptVersion"))
                    || !tool.equals(out.get("operation"))
                    || !Boolean.TRUE.equals(out.get("verified"))
                    || hash == null
                    || !hash.equals(AgentToolPayloadHasher.normalizedArgumentsHash(args))
                    || !hash.equals(out.get("inputHash"))) return false;
            if (tool.equals("monitor.favorite_set"))
                return AgentPersonalWorkspaceProof.positive(args.get("monitorId"))
                                == AgentPersonalWorkspaceProof.positive(out.get("monitorId"))
                        && AgentPersonalWorkspaceProof.metric(args.get("metricsName"))
                        && args.get("metricsName").equals(out.get("metricsName"))
                        && args.get("favorite") instanceof Boolean
                        && args.get("favorite").equals(out.get("favorite"))
                        && args.get("favorite").equals(out.get("observedFavorite"));
            if (!AgentPersonalWorkspaceProof.application(args.get("application"))
                    .equals(out.get("application"))) return false;
            if (tool.equals("monitor.layout_delete"))
                return args.get("expectedRevision").equals(out.get("expectedRevision"))
                        && Boolean.TRUE.equals(out.get("absent"));
            if (!(args.get("request") instanceof Map<?, ?> request)
                    || !AgentPersonalWorkspaceProof.validRequest(request)
                    || !AgentPersonalWorkspaceProof.revision(out.get("revision"), false)
                    || out.get("revision").equals(request.get("expectedRevision"))) return false;
            return AgentPersonalWorkspaceProof.hash(AgentPersonalWorkspaceProof.document(request))
                    .equals(out.get("documentHash"));
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static Object identity(String tool, Map<String, Object> out) {
        return tool.equals("monitor.favorite_set") ? out.get("monitorId") : out.get("application");
    }
}
