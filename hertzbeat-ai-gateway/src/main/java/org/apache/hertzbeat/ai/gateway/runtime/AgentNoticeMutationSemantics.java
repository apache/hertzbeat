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

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Native notification rule/template callbacks reread persistence; dispatch and receivers excluded.
 */
final class AgentNoticeMutationSemantics {
    private static final Set<String> TOOLS =
            Set.of(
                    "notice.rule_create",
                    "notice.rule_update",
                    "notice.rule_delete",
                    "notice.template_create",
                    "notice.template_update",
                    "notice.template_delete");
    private static final Set<String> RULE_FIELDS =
            Set.of(
                    "name",
                    "receiverId",
                    "templateId",
                    "enable",
                    "filterAll",
                    "labels",
                    "days",
                    "periodStart",
                    "periodEnd");
    private static final Set<String> TEMPLATE_FIELDS = Set.of("name", "type", "preset", "content");

    static boolean supports(String tool) {
        return TOOLS.contains(tool);
    }

    private static String resource(String tool) {
        return tool.startsWith("notice.rule_") ? "notice_rule" : "notice_template";
    }

    private static Set<String> fields(String tool) {
        return tool.startsWith("notice.rule_") ? RULE_FIELDS : TEMPLATE_FIELDS;
    }

    private static AgentTaskAssessment.Operation operation(String tool) {
        return tool.endsWith("_create")
                ? AgentTaskAssessment.Operation.CREATE
                : tool.endsWith("_update")
                        ? AgentTaskAssessment.Operation.UPDATE
                        : AgentTaskAssessment.Operation.DELETE;
    }

    static boolean permits(AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        try {
            if (!supports(tool)
                    || goal == null
                    || !goal.valid()
                    || !goal.changesResources()
                    || !resource(tool).equals(goal.resourceType())
                    || !Integer.valueOf(1).equals(goal.expectedCount())
                    || goal.operation() != operation(tool)
                    || !fields(tool).containsAll(goal.expectedChanges().keySet())) return false;
            if (operation(tool) == AgentTaskAssessment.Operation.DELETE)
                return args.keySet().equals(Set.of("id"))
                        && goal.expectedChanges().isEmpty()
                        && goal.resourceIds()
                                .equals(List.of(AgentLabelMutationSemantics.id(args.get("id"))));
            if (!args.keySet().equals(Set.of("value"))
                    || !(args.get("value") instanceof Map<?, ?> value)
                    || !(value.get("name") instanceof String name)
                    || name.isBlank()) return false;
            for (var e : value.entrySet()) {
                if (fields(tool).contains(e.getKey())) continue;
                if ("id".equals(e.getKey())
                        && operation(tool) == AgentTaskAssessment.Operation.UPDATE) continue;
                if (e.getValue() != null
                        || !Set.of(
                                        "id",
                                        "creator",
                                        "modifier",
                                        "gmtCreate",
                                        "gmtUpdate",
                                        "receiverName",
                                        "templateName")
                                .contains(e.getKey())) return false;
            }
            if (operation(tool) == AgentTaskAssessment.Operation.CREATE) {
                if (!goal.resourceIds().isEmpty()
                        || value.get("id") != null
                        || !goal.expectedChanges().containsKey("name")) return false;
            } else if (!goal.resourceIds()
                    .equals(List.of(AgentLabelMutationSemantics.id(value.get("id"))))) return false;
            return goal.expectedChanges().entrySet().stream()
                    .allMatch(
                            e -> sameField(tool, e.getKey(), e.getValue(), value.get(e.getKey())));
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static boolean verified(
            String tool, Map<String, Object> args, Map<String, Object> output, String trustedHash) {
        try {
            if (!supports(tool)
                    || trustedHash == null
                    || !AgentToolPayloadHasher.normalizedArgumentsHash(args).equals(trustedHash))
                return false;
            long id = AgentLabelMutationSemantics.id(output.get("id"));
            if (operation(tool) == AgentTaskAssessment.Operation.DELETE)
                return args.keySet().equals(Set.of("id"))
                        && id == AgentLabelMutationSemantics.id(args.get("id"))
                        && Boolean.TRUE.equals(output.get("deleted"));
            if (!(args.get("value") instanceof Map<?, ?> value)
                    || !args.keySet().equals(Set.of("value"))) return false;
            if (operation(tool) == AgentTaskAssessment.Operation.UPDATE
                    && id != AgentLabelMutationSemantics.id(value.get("id"))) return false;
            if (operation(tool) == AgentTaskAssessment.Operation.CREATE && value.get("id") != null)
                return false;
            String get =
                    tool.startsWith("notice.rule_") ? "notice.rule_get" : "notice.template_get";
            if (new AgentNotificationMetadataReadSemantics()
                            .classify(
                                    AgentRuntimeToolCall.builder()
                                            .toolCallId("native-notice-readback")
                                            .toolName(get)
                                            .arguments(Map.of("id", id))
                                            .build(),
                                    output)
                    == null) return false;
            for (var e : value.entrySet()) {
                if (fields(tool).contains(e.getKey())
                        && !sameField(tool, e.getKey(), e.getValue(), output.get(e.getKey())))
                    return false;
            }
            return value.get("name") instanceof String name && name.equals(output.get("name"));
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    private static boolean sameField(String tool, Object key, Object expected, Object actual) {
        // Spring publishes Byte inputs as numeric strings; native Jackson serializes Byte as
        // numbers.
        // Normalize only these declared native Byte fields, never arbitrary strings or booleans.
        if (tool.startsWith("notice.template_") && "type".equals(key))
            return byteValue(expected, 127) == byteValue(actual, 127);
        if (tool.startsWith("notice.rule_")
                && "days".equals(key)
                && expected != null
                && actual != null) {
            if (!(expected instanceof List<?> left)
                    || !(actual instanceof List<?> right)
                    || left.size() != right.size()) return false;
            for (int i = 0; i < left.size(); i++)
                if (byteValue(left.get(i), 7) != byteValue(right.get(i), 7)) return false;
            return true;
        }
        return same(expected, actual);
    }

    private static int byteValue(Object value, int maximum) {
        if (!(value instanceof Number)
                && !(value instanceof String text && text.matches("0|[1-9][0-9]{0,2}")))
            throw new IllegalArgumentException();
        int n = new java.math.BigDecimal(value.toString()).intValueExact();
        if (n < 0 || n > maximum) throw new IllegalArgumentException();
        return n;
    }

    private static boolean same(Object expected, Object actual) {
        return AgentToolPayloadHasher.canonicalArgumentsJson(
                        java.util.Collections.singletonMap("value", expected))
                .equals(
                        AgentToolPayloadHasher.canonicalArgumentsJson(
                                java.util.Collections.singletonMap("value", actual)));
    }
}
