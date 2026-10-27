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

import org.apache.hertzbeat.ai.gateway.text.GatewaySecretRedactor;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.common.util.JsonUtil;

import java.util.List;
import java.util.Map;
import java.util.Set;

/** Fixed named shared assets, original-goal binding and revision/source-preserving replacements. */
final class AgentSharedAssetMutationSemantics {
    private static final Set<String> TOOLS =
            Set.of(
                    "dashboard.upsert_signal_dashboard",
                    "dashboard.delete_signal_dashboard",
                    "saved_query.upsert_signal_saved_view",
                    "saved_query.delete_signal_saved_view");
    private static final Set<String> DASHBOARD =
            Set.of(
                    "dashboardKey",
                    "title",
                    "description",
                    "tags",
                    "document",
                    "version",
                    "revision");
    private static final Set<String> SAVED =
            Set.of(
                    "signal",
                    "viewKey",
                    "label",
                    "description",
                    "route",
                    "querySnapshot",
                    "payload",
                    "revision");

    static boolean supports(String tool) {
        return TOOLS.contains(tool);
    }

    static boolean resource(String resource) {
        return "signal_dashboard".equals(resource) || "saved_query".equals(resource);
    }

    static boolean validGoal(AgentTaskAssessment.Goal goal) {
        try {
            boolean dashboard = "signal_dashboard".equals(goal.resourceType());
            var fields = goal.expectedChanges();
            return resource(goal.resourceType())
                    && Integer.valueOf(1).equals(goal.expectedCount())
                    && goal.resourceIds().isEmpty()
                    && Set.of(
                                    AgentTaskAssessment.Operation.CREATE,
                                    AgentTaskAssessment.Operation.UPDATE,
                                    AgentTaskAssessment.Operation.DELETE)
                            .contains(goal.operation())
                    && (dashboard ? DASHBOARD : SAVED).containsAll(fields.keySet())
                    && key(fields.get(dashboard ? "dashboardKey" : "viewKey"))
                    && (dashboard
                            || Set.of("logs", "traces", "metrics").contains(fields.get("signal")))
                    && safe(fields);
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static boolean permits(AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        try {
            if (!supports(tool)
                    || goal == null
                    || !goal.changesResources()
                    || !goal.valid()
                    || !validGoal(goal)) return false;
            boolean dashboard = tool.startsWith("dashboard.");
            boolean delete = tool.contains(".delete_");
            if (!goal.resourceType().equals(dashboard ? "signal_dashboard" : "saved_query")
                    || (goal.operation() == AgentTaskAssessment.Operation.DELETE) != delete)
                return false;
            Map<?, ?> input = input(tool, args);
            if (input == null || !safe(input)) return false;
            String identity = dashboard ? "dashboardKey" : "viewKey";
            var fields = goal.expectedChanges();
            if (!same(fields.get(identity), input.get(identity))
                    || !dashboard && !same(fields.get("signal"), input.get("signal"))) return false;
            if (delete)
                return args.keySet()
                                .equals(
                                        dashboard
                                                ? Set.of("dashboardKey", "revision", "reason")
                                                : Set.of("signal", "viewKey", "revision", "reason"))
                        && revision(input.get("revision")) >= 0
                        && input.get("reason") instanceof String reason
                        && !reason.isBlank()
                        && fields.keySet().stream()
                                .allMatch(f -> Set.of(identity, "signal", "revision").contains(f))
                        && (!fields.containsKey("revision")
                                || same(fields.get("revision"), input.get("revision")));
            if (!args.keySet().equals(Set.of(dashboard ? "dashboard" : "value"))) return false;
            for (var e : input.entrySet())
                if (!(dashboard ? DASHBOARD : SAVED).contains(e.getKey())
                        && (e.getValue() != null
                                || !Set.of("id", "creator", "createTime", "updateTime")
                                        .contains(e.getKey()))) return false;
            boolean create = goal.operation() == AgentTaskAssessment.Operation.CREATE;
            if (create ? input.get("revision") != null : revision(input.get("revision")) < 0)
                return false;
            if (dashboard && !(input.get("document") instanceof Map<?, ?>)) return false;
            for (var e : fields.entrySet())
                if (!same(e.getValue(), effective(dashboard, input, e.getKey()))) return false;
            return !create || fields.containsKey(dashboard ? "title" : "label");
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static boolean verified(
            String tool, Map<String, Object> args, Map<String, Object> output, String hash) {
        try {
            if (!supports(tool)
                    || hash == null
                    || !hash.equals(AgentToolPayloadHasher.normalizedArgumentsHash(args)))
                return false;
            boolean dashboard = tool.startsWith("dashboard.");
            String key = dashboard ? "dashboardKey" : "viewKey";
            var input = input(tool, args);
            if (input == null
                    || !same(input.get(key), output.get(key))
                    || !dashboard && !same(input.get("signal"), output.get("signal"))) return false;
            if (tool.contains(".delete_"))
                return Boolean.TRUE.equals(output.get("deleted"))
                        && "shared".equals(output.get("scope"))
                        && same(args.get("revision"), output.get("revision"));
            AgentLabelMutationSemantics.id(output.get("id"));
            long actual = revision(output.get("revision"));
            if (actual != (input.get("revision") == null ? 0 : revision(input.get("revision")) + 1)
                    || !safe(output)) return false;
            for (String field : dashboard ? DASHBOARD : SAVED) {
                if (field.equals("revision")) continue;
                if (!same(effective(dashboard, input, field), effective(dashboard, output, field)))
                    return false;
            }
            return true;
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static boolean needsBaseline(String tool, Map<String, Object> args) {
        var input = input(tool, args);
        return tool.contains(".delete_") || input != null && input.get("revision") != null;
    }

    static boolean preserves(
            AgentTaskAssessment.Goal goal,
            String tool,
            Map<String, Object> args,
            Map<?, ?> baseline) {
        try {
            boolean dashboard = tool.startsWith("dashboard.");
            String identity = dashboard ? "dashboardKey" : "viewKey";
            var input = input(tool, args);
            if (!safe(baseline)
                    || !same(input.get(identity), baseline.get(identity))
                    || !same(input.get("revision"), baseline.get("revision"))
                    || !dashboard && !same(input.get("signal"), baseline.get("signal")))
                return false;
            if (tool.contains(".delete_")) return true;
            if (dashboard) {
                if (!(input.get("document") instanceof Map<?, ?> next)
                        || !(baseline.get("document") instanceof Map<?, ?> old)) return false;
                if (!goal.expectedChanges().containsKey("document")) {
                    var left = copy(old);
                    var right = copy(next);
                    if (goal.expectedChanges().containsKey("title")) {
                        remove(left, "spec", "display", "name");
                        remove(right, "spec", "display", "name");
                    }
                    if (goal.expectedChanges().containsKey("description")) {
                        remove(left, "spec", "display", "description");
                        remove(right, "spec", "display", "description");
                    }
                    if (goal.expectedChanges().containsKey("tags")) {
                        remove(left, "metadata", "tags");
                        remove(right, "metadata", "tags");
                    }
                    if (!same(left, right)) return false;
                }
                return same(input.get("version"), baseline.get("version"));
            }
            for (String field : SAVED)
                if (!Set.of("signal", "viewKey", "revision").contains(field)
                        && !goal.expectedChanges().containsKey(field)
                        && !same(effective(false, input, field), effective(false, baseline, field)))
                    return false;
            return true;
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static String identity(String tool, Map<String, Object> args) {
        var value = input(tool, args);
        return tool.startsWith("dashboard.")
                ? String.valueOf(value.get("dashboardKey"))
                : value.get("signal") + ":" + value.get("viewKey");
    }

    static Map<?, ?> input(String tool, Map<String, Object> args) {
        if (tool.contains(".delete_")) return args;
        Object value = args.get(tool.startsWith("dashboard.") ? "dashboard" : "value");
        return value instanceof Map<?, ?> map ? map : null;
    }

    private static Object effective(boolean dashboard, Map<?, ?> value, String field) {
        if (dashboard
                && Set.of("title", "description", "tags").contains(field)
                && value.get("document") instanceof Map<?, ?> document) {
            if (field.equals("tags")) {
                Object tags = at(document, "metadata", "tags");
                return tags instanceof List<?> list
                        ? String.join(",", list.stream().map(String::valueOf).toList())
                        : "";
            }
            Object text =
                    at(document, "spec", "display", field.equals("title") ? "name" : "description");
            return text == null ? "" : text;
        }
        Object result = value.get(field);
        if (!dashboard && field.equals("description") && result == null) return "";
        return result;
    }

    private static Object at(Map<?, ?> value, String... path) {
        Object current = value;
        for (String key : path) {
            if (!(current instanceof Map<?, ?> map)) return null;
            current = map.get(key);
        }
        return current;
    }

    private static void remove(Map<String, Object> value, String... path) {
        Map current = value;
        for (int i = 0; i < path.length - 1; i++) {
            if (!(current.get(path[i]) instanceof Map next)) return;
            current = next;
        }
        current.remove(path[path.length - 1]);
    }

    private static Map<String, Object> copy(Map<?, ?> value) {
        return JsonUtil.fromJson(JsonUtil.toJson(value), Map.class);
    }

    private static boolean key(Object value) {
        return value instanceof String key && key.matches("[A-Za-z0-9_.:-]{1,128}");
    }

    private static long revision(Object value) {
        if (!(value instanceof Number)) throw new IllegalArgumentException();
        long n = new java.math.BigDecimal(value.toString()).longValueExact();
        if (n < 0 || n == Long.MAX_VALUE) throw new IllegalArgumentException();
        return n;
    }

    private static boolean safe(Object value) {
        if (!bounded(value, 0, new int[] {5000})) return false;
        String encoded = JsonUtil.toJson(value);
        if (encoded.length() > 196608
                || encoded.contains("[REDACTED]")
                || !encoded.equals(GatewayText.redactSecrets(encoded))) return false;
        return !(value instanceof Map<?, ?> map)
                || copy(map).equals(GatewaySecretRedactor.redactMap(copy(map)));
    }

    private static boolean bounded(Object value, int depth, int[] remaining) {
        if (depth > 24 || --remaining[0] < 0) return false;
        if (value instanceof Map<?, ?> map) {
            for (Object item : map.values()) if (!bounded(item, depth + 1, remaining)) return false;
        }
        if (value instanceof List<?> list) {
            for (Object item : list) if (!bounded(item, depth + 1, remaining)) return false;
        }
        return true;
    }

    private static boolean same(Object left, Object right) {
        return AgentToolPayloadHasher.canonicalArgumentsJson(
                        java.util.Collections.singletonMap("v", left))
                .equals(
                        AgentToolPayloadHasher.canonicalArgumentsJson(
                                java.util.Collections.singletonMap("v", right)));
    }
}
