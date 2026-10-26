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

import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertRuleWriteProof;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;

import java.util.List;
import java.util.Map;
import java.util.Set;

/** Explicit native rule operations, excluding notification dispatch and arbitrary SQL. */
final class AgentAlertRuleMutationSemantics {
    private static final Set<String> TOOLS =
            Set.of(
                    "alert_rule.create",
                    "alert_rule.create_configured",
                    "alert_rule.toggle",
                    "alert_rule.update",
                    "alert_rule.bind_monitors",
                    "alert_rule.delete");
    private static final Set<String> FIELDS =
            Set.of(
                    "name",
                    "type",
                    "expression",
                    "period",
                    "times",
                    "template",
                    "labels",
                    "annotations",
                    "enabled",
                    "datasource");
    private static final Set<String> CREATE =
            Set.of(
                    "name",
                    "app",
                    "metrics",
                    "fieldConditions",
                    "type",
                    "period",
                    "times",
                    "priority",
                    "description",
                    "template",
                    "datasource",
                    "labels",
                    "annotations",
                    "enable");

    static boolean supports(String tool) {
        return TOOLS.contains(tool);
    }

    static boolean permits(AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        try {
            if (!supports(tool)
                    || goal == null
                    || !goal.valid()
                    || !goal.changesResources()
                    || !"alert_rule".equals(goal.resourceType())
                    || !Integer.valueOf(1).equals(goal.expectedCount())) return false;
            boolean create = tool.startsWith("alert_rule.create");
            boolean delete = tool.endsWith(".delete");
            if (goal.operation()
                            != (create
                                    ? AgentTaskAssessment.Operation.CREATE
                                    : delete
                                            ? AgentTaskAssessment.Operation.DELETE
                                            : AgentTaskAssessment.Operation.UPDATE)
                    || (create
                            ? !goal.resourceIds().isEmpty()
                            : !goal.resourceIds()
                                    .equals(
                                            List.of(
                                                    AgentLabelMutationSemantics.id(
                                                            args.get("ruleId")))))) return false;
            var changes = goal.expectedChanges();
            if (delete)
                return changes.isEmpty()
                        && args.keySet().equals(Set.of("ruleId", "reason"))
                        && args.get("reason") instanceof String reason
                        && !reason.isBlank();
            if (tool.endsWith(".toggle"))
                return args.keySet().equals(Set.of("ruleId", "enabled"))
                        && args.get("enabled") instanceof Boolean
                        && changes.keySet().equals(Set.of("enabled"))
                        && same(changes.get("enabled"), args.get("enabled"));
            if (tool.endsWith(".update"))
                return args.keySet().equals(Set.of("ruleId", "updates"))
                        && args.get("updates") instanceof Map<?, ?> updates
                        && FIELDS.containsAll(updates.keySet())
                        && same(changes, updates);
            if (tool.endsWith(".bind_monitors")) {
                if (!Set.of("ruleId", "monitorIds", "replaceExisting").containsAll(args.keySet())
                        || !Set.of("monitorIds", "replaceExisting").containsAll(changes.keySet())
                        || !(args.get("monitorIds") instanceof List<?> ids)
                        || ids.isEmpty()
                        || ids.size() > 100
                        || ids.stream().map(AgentLabelMutationSemantics::id).distinct().count()
                                != ids.size()
                        || !same(changes.get("monitorIds"), ids)) return false;
                boolean replace = !Boolean.FALSE.equals(args.get("replaceExisting"));
                return same(changes.getOrDefault("replaceExisting", true), replace);
            }
            Map<?, ?> input;
            if (tool.endsWith("create_configured")) {
                if (!args.keySet().equals(Set.of("configuration"))
                        || !(args.get("configuration") instanceof Map<?, ?> config)
                        || !FIELDS.containsAll(config.keySet())) return false;
                input = config;
            } else {
                if (!CREATE.containsAll(args.keySet())) return false;
                input = args;
            }
            if (!(input.get("name") instanceof String name) || !name.equals(changes.get("name")))
                return false;
            for (var e : changes.entrySet()) {
                String key = e.getKey();
                Object actual = input.get(key);
                if (tool.equals("alert_rule.create")) {
                    if (!CREATE.contains(key) && !"enabled".equals(key)) return false;
                    if ("enabled".equals(key))
                        actual = input.get("enable") == null ? true : input.get("enable");
                    if ("type".equals(key))
                        actual =
                                "periodic".equals(input.get("type"))
                                        ? "periodic_metric"
                                        : "realtime_metric";
                    if ("app".equals(key) && actual instanceof String app)
                        actual = app.trim().toLowerCase(java.util.Locale.ROOT);
                } else if (!FIELDS.contains(key)) return false;
                if (!same(e.getValue(), actual)) return false;
            }
            return true;
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static Map<String, Object> unwrap(String tool, Map<String, Object> output) {
        if (!tool.equals("alert_rule.create_configured")) return output;
        return Boolean.FALSE.equals(output.get("partial"))
                        && Boolean.TRUE.equals(output.get("redactionApplied"))
                        && output.get("data") instanceof Map<?, ?> row
                ? (Map<String, Object>) row
                : null;
    }

    static boolean verified(
            String tool, Map<String, Object> args, Map<String, Object> output, String trustedHash) {
        try {
            var row = unwrap(tool, output);
            if (!supports(tool)
                    || row == null
                    || trustedHash == null
                    || !AgentToolPayloadHasher.normalizedArgumentsHash(args).equals(trustedHash)
                    || !(row.get("mutationReceipt") instanceof Map<?, ?> proof)
                    || !"alert-rule-write.v1".equals(proof.get("version"))
                    || !tool.equals(proof.get("toolName"))
                    || !Boolean.TRUE.equals(proof.get("verified"))
                    || !AgentAlertRuleWriteProof.argumentHash(args)
                            .equals(proof.get("boundArgumentsHash"))) return false;
            long id = AgentLabelMutationSemantics.id(row.get("ruleId"));
            if (id != AgentLabelMutationSemantics.id(proof.get("ruleId"))
                    || !tool.startsWith("alert_rule.create")
                            && id != AgentLabelMutationSemantics.id(args.get("ruleId")))
                return false;
            if (tool.endsWith(".delete"))
                return Boolean.TRUE.equals(proof.get("absent"))
                        && "delete".equals(row.get("operation"));
            return Boolean.FALSE.equals(proof.get("absent"))
                    && AgentAlertRuleWriteProof.nativeHash(row).equals(proof.get("postReadHash"))
                    && new AgentBusinessMetadataReadSemantics()
                                    .classify(
                                            AgentRuntimeToolCall.builder()
                                                    .toolCallId("native-rule-readback")
                                                    .toolName("alert_rule.get")
                                                    .arguments(Map.of("ruleId", id))
                                                    .build(),
                                            row)
                            != null;
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    private static boolean same(Object a, Object b) {
        return AgentToolPayloadHasher.canonicalArgumentsJson(
                        java.util.Collections.singletonMap("v", a))
                .equals(
                        AgentToolPayloadHasher.canonicalArgumentsJson(
                                java.util.Collections.singletonMap("v", b)));
    }
}
