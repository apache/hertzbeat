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

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.util.JsonUtil;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/** Per-run, monotonic accounting of equivalent requests and redundant observations. */
final class AgentRuntimeReadBudget {
    private static final Set<String> VIEW_CONTROLS =
            Set.of(
                    "pageIndex",
                    "pageSize",
                    "offset",
                    "cursor",
                    "limit",
                    "maxPoints",
                    "orderBy",
                    "sort",
                    "groupBy",
                    "search",
                    "searchSyntax");
    private final Map<String, Integer> equivalent = new HashMap<>();
    private final Map<String, Set<String>> observations = new HashMap<>();
    private final Map<String, Integer> redundant = new HashMap<>();

    String record(AgentRuntimeToolCall call, AgentToolExecutionResult result, AgentRuntimeProperties limits) {
        return record(new Attempt(result.getToolCallId(), result.getToolName(), result.getRisk(), result.getStatus(),
                call.getArguments(), result.getOutput(), result.getErrorMessage()), limits);
    }

    String record(Attempt attempt, AgentRuntimeProperties limits) {
        if (attempt.risk() != AgentToolRisk.READ) {
            return null;
        }
        String observation = attempt.status() == AgentToolStatus.SUCCEEDED
                ? observation(attempt.toolName(), attempt.output()) : null;
        String request = attempt.toolName() + canonical(attempt.arguments());
        // Only a recognized, changed observation is progress. Arbitrary response timestamps cannot reset a budget.
        String equivalentKey = request + (observation == null ? "" : observation);
        int repeats = equivalent.merge(equivalentKey, 1, Integer::sum);
        if (repeats >= limits.getMaxEquivalentReadCalls()) {
            return "PARTIAL: READ_EQUIVALENT_REQUEST_BUDGET reached for "
                    + attempt.toolName()
                    + " ("
                    + repeats
                    + "). Recorded attempts are retained; no further tool or model request will"
                    + " run.";
        }
        if (observation == null) {
            return null;
        }
        Map<?, ?> arguments =
                attempt.arguments().get("q") instanceof Map<?, ?> q ? q : attempt.arguments();
        Map<String, Object> scope = new TreeMap<>();
        arguments.forEach((key, value) -> {
            if (!VIEW_CONTROLS.contains(String.valueOf(key))) {
                scope.put(String.valueOf(key), value);
            }
        });
        String family = attempt.toolName() + canonical(scope);
        if (!observations.computeIfAbsent(family, ignored -> new HashSet<>()).add(observation)) {
            int count = redundant.merge(family, 1, Integer::sum);
            if (count >= limits.getMaxNoProgressReadCalls()) {
                return "PARTIAL: READ_NO_PROGRESS_BUDGET reached for "
                        + attempt.toolName()
                        + " ("
                        + count
                        + " redundant observations in the same scope). Pagination with new rows and"
                        + " changed time windows have separate progress; recorded attempts are"
                        + " retained.";
            }
        }
        return null;
    }

    static String canonical(Object value) {
        return JsonUtil.toJson(normalized(value));
    }

    private static Object normalized(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> sorted = new TreeMap<>();
            map.forEach(
                    (key, item) -> {
                        String name = String.valueOf(key);
                        if (item != null
                                && !(Set.of("hideInternal", "hideNoise").contains(name)
                                        && Boolean.FALSE.equals(item))) {
                            Object semantic = item;
                            if (item instanceof String text) {
                                if ("severityCategory".equals(name)) {
                                    semantic = text.strip().toUpperCase(java.util.Locale.ROOT);
                                } else if (Set.of(
                                                "groupBy",
                                                "orderBy",
                                                "fieldParameter",
                                                "app",
                                                "metrics",
                                                "history",
                                                "step")
                                        .contains(name)) {
                                    semantic = text.strip();
                                }
                            }
                            sorted.put(name, normalized(semantic));
                        }
                    });
            return sorted;
        }
        if (value instanceof List<?> list) {
            return list.stream().map(AgentRuntimeReadBudget::normalized).toList();
        }
        if (value instanceof Number number) {
            return new BigDecimal(number.toString()).stripTrailingZeros();
        }
        return value;
    }

    private String observation(String tool, String output) {
        try {
            var node = JsonUtil.fromJson(output);
            if (node == null) {
                return null;
            }
            if ("json_text".equals(node.path("format").asText())) {
                node = JsonUtil.fromJson(node.path("data").asText());
            }
            if (node != null && node.has("code")) {
                if (node.path("code").asInt(-1) != 0) {
                    return null;
                }
                node = node.path("data");
            }
            if (node == null) {
                return null;
            }
            if ("logs.group_by_stats".equals(tool) && node.path("groups").isArray()) {
                if (node.path("groups").isEmpty()) {
                    return "EMPTY_GROUPS";
                }
                List<String> groups = new ArrayList<>();
                node.path("groups")
                        .forEach(
                                group ->
                                        groups.add(
                                                canonical(
                                                        JsonUtil.fromJson(
                                                                group.toString(), Object.class))));
                groups.sort(String::compareTo);
                return canonical(
                        Map.of("groupBy", node.path("groupBy").asText(), "groups", groups));
            }
            if ("traces.query".equals(tool) && node.path("content").isArray()) {
                return canonical(JsonUtil.fromJson(node.path("content").toString(), Object.class));
            }
            if ("metrics.realtime".equals(tool) && node.path("valueRows").isArray()) {
                return canonical(
                        JsonUtil.fromJson(node.path("valueRows").toString(), Object.class));
            }
            if ("metrics.history".equals(tool) && node.path("values").isObject()) {
                return canonical(JsonUtil.fromJson(node.path("values").toString(), Object.class));
            }
            return null;
        } catch (RuntimeException malformed) {
            return null;
        }
    }

    /**
     * Minimal durable facts needed to restore counters for the same run, never for previous
     * sessions.
     */
    record Attempt(
            String toolCallId,
            String toolName,
            AgentToolRisk risk,
            AgentToolStatus status,
            Map<String, Object> arguments,
            String output,
            String errorMessage,
            String trustedInputHash,
            String approvalId) {
        Attempt(
                String toolCallId,
                String toolName,
                AgentToolRisk risk,
                AgentToolStatus status,
                Map<String, Object> arguments,
                String output,
                String errorMessage,
                String trustedInputHash) {
            this(
                    toolCallId,
                    toolName,
                    risk,
                    status,
                    arguments,
                    output,
                    errorMessage,
                    trustedInputHash,
                    null);
        }

        Attempt(
                String toolCallId,
                String toolName,
                AgentToolRisk risk,
                AgentToolStatus status,
                Map<String, Object> arguments,
                String output,
                String errorMessage) {
            this(toolCallId, toolName, risk, status, arguments, output, errorMessage, null);
        }
    }
}
