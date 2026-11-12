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

import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorMutationReceipt;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Canonical native bulk arguments and exact item membership, independent of model prose. */
final class AgentMonitorBulkArguments {
    private AgentMonitorBulkArguments() {}

    static Map<String, Object> item(String key, Map<String, Object> nativeArgs) {
        var params = (Map<?, ?>) nativeArgs.get("params");
        String host = String.valueOf(params.get("host"));
        if (host.contains(":") && !host.startsWith("[")) {
            host = "[" + host + "]";
        }
        String url =
                (Boolean.TRUE.equals(params.get("ssl")) ? "https" : "http")
                        + "://"
                        + host
                        + ":"
                        + params.get("port")
                        + (params.containsKey("uri") ? params.get("uri") : "/");
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("idempotencyKey", key);
        item.put("name", nativeArgs.get("name"));
        item.put("url", url);
        item.put("intervals", nativeArgs.get("intervals"));
        if (params.containsKey("timeout")) {
            item.put("timeout", params.get("timeout"));
        }
        return Map.copyOf(item);
    }

    static List<Map<String, Object>> items(Map<String, Object> args) {
        if (args == null
                || !(args.get("items") instanceof List<?> list)
                || list.isEmpty()
                || list.size() > 50
                || !java.util.Set.of("items", "retryPreflightFailures").containsAll(args.keySet())
                || args.containsKey("retryPreflightFailures")
                        && !(args.get("retryPreflightFailures") instanceof Boolean)) {
            return List.of();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        var keys = new java.util.HashSet<String>();
        for (Object value : list) {
            if (!(value instanceof Map<?, ?> map)
                    || !(map.get("idempotencyKey") instanceof String key)
                    || !key.matches("[A-Za-z0-9_.:-]{1,128}")
                    || map.values().stream().anyMatch(java.util.Objects::isNull)
                    || !keys.add(key)
                    || !java.util.Set.of("idempotencyKey", "name", "url", "intervals", "timeout")
                            .containsAll(map.keySet())) {
                return List.of();
            }
            Map<String, Object> safe = new LinkedHashMap<>();
            map.forEach((k, v) -> safe.put(String.valueOf(k), v));
            result.add(Map.copyOf(safe));
        }
        return List.copyOf(result);
    }

    static boolean permits(AgentTaskAssessment.Goal goal, Map<String, Object> args) {
        var batch = items(args);
        if (batch.isEmpty()
                || goal.createTargets().size() != goal.expectedCount()
                || batch.size() > goal.expectedCount()) {
            return false;
        }
        var names = new java.util.HashSet<Object>();
        for (var raw : batch) {
            if (!names.add(raw.get("name"))) {
                return false;
            }
            boolean found = false;
            for (var target : goal.createTargets()) {
                if (target.idempotencyKey() != null
                        && !target.idempotencyKey().equals(raw.get("idempotencyKey"))) {
                    continue;
                }
                try {
                    if (AgentMonitorMutationSemantics.same(
                            item(
                                    (String) raw.get("idempotencyKey"),
                                    AgentMonitorBatch.createArguments(goal, target)),
                            raw)) {
                        found = true;
                        break;
                    }
                } catch (IllegalArgumentException invalid) {
                    return false;
                }
            }
            if (!found) {
                return false;
            }
        }
        return true;
    }

    static Long monitorId(Object value) {
        if (value instanceof String text && text.matches("[1-9][0-9]{0,18}")) {
            try {
                return Long.valueOf(text);
            } catch (NumberFormatException invalid) {
                return null;
            }
        }
        return AgentBatchReconciliation.positiveId(value);
    }

    static boolean targetMatchesItem(
            AgentMonitorMutationReceipt.Target target, Map<String, Object> raw) {
        try {
            if (!(raw.get("name") instanceof String name)
                    || !(raw.get("url") instanceof String url)) {
                return false;
            }
            int interval =
                    new java.math.BigDecimal(String.valueOf(raw.get("intervals"))).intValueExact();
            Map<String, Object> changes =
                    raw.containsKey("timeout")
                            ? Map.of("params", Map.of("timeout", raw.get("timeout")))
                            : Map.of();
            var goal =
                    new AgentTaskAssessment.Goal(
                            AgentTaskAssessment.Type.CHANGE,
                            AgentTaskAssessment.Operation.CREATE,
                            "monitor",
                            1,
                            List.of(),
                            changes);
            return targetMatches(
                    target,
                    AgentMonitorBatch.createArguments(
                            goal, new AgentTaskAssessment.CreateTarget(name, url, interval)));
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static boolean targetMatches(
            AgentMonitorMutationReceipt.Target target, Map<String, Object> nativeArgs) {
        return AgentMonitorMutationSemantics.matchesRequest(
                new AgentMonitorMutationReceipt(
                        AgentMonitorMutationReceipt.VERSION,
                        "monitor.create",
                        "item",
                        List.of(target)),
                nativeArgs);
    }
}
