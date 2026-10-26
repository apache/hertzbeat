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

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Per-domain native metadata contracts. Page observations count returned rows, never all matches.
 */
final class AgentNotificationMetadataReadSemantics {
    private static final Set<String> TOOLS =
            Set.of(
                    "alert_group.get",
                    "alert_group.list",
                    "alert_inhibit.get",
                    "alert_inhibit.list",
                    "alert_silence.get",
                    "alert_silence.list",
                    "notice.rule_get",
                    "notice.rule_list",
                    "notice.template_get",
                    "notice.template_list");

    static boolean supports(String tool) {
        return TOOLS.contains(tool);
    }

    AgentReadObservationClassifier.Observation classify(
            AgentRuntimeToolCall call, Map<String, Object> output) {
        if (call == null || !supports(call.getToolName()) || output == null) return null;
        try {
            String tool = call.getToolName();
            boolean projected =
                    tool.startsWith("alert_group.") || tool.startsWith("alert_inhibit.");
            Map<?, ?> data = output;
            if (projected) {
                if (!Boolean.FALSE.equals(output.get("partial"))
                        || !Boolean.TRUE.equals(output.get("redactionApplied"))
                        || !(output.get("data") instanceof Map<?, ?> value)) return null;
                data = value;
            }
            if (data.containsKey("error")
                    || Boolean.FALSE.equals(data.get("success"))
                    || Boolean.TRUE.equals(data.get("partial"))) return null;
            boolean silence = tool.startsWith("alert_silence.");
            String id = silence ? "silenceId" : "id";
            if (tool.endsWith(".get") || tool.endsWith("_get")) {
                String argument =
                        tool.startsWith("alert_group.")
                                ? "groupId"
                                : tool.startsWith("alert_inhibit.")
                                        ? "inhibitId"
                                        : silence ? "silenceId" : "id";
                return row(tool, data)
                                && positive(data.get(id))
                                        == positive(call.getArguments().get(argument))
                        ? observation(tool, 1)
                        : null;
            }
            boolean springPage = tool.startsWith("notice.");
            Map<String, Object> args = call.getArguments();
            long page = number(args.getOrDefault(springPage ? "page" : "pageIndex", 0));
            long size = number(args.getOrDefault(springPage ? "size" : "pageSize", 20));
            long total = number(data.get("totalElements"));
            if (page < 0
                    || page > Integer.MAX_VALUE
                    || size < 1
                    || size > 100
                    || total < 0
                    || total > Integer.MAX_VALUE
                    || number(
                                    data.get(
                                            springPage || tool.startsWith("alert_inhibit.")
                                                    ? "number"
                                                    : "pageIndex"))
                            != page
                    || number(
                                    data.get(
                                            springPage || tool.startsWith("alert_inhibit.")
                                                    ? "size"
                                                    : "pageSize"))
                            != size
                    || number(data.get("totalPages"))
                            != (total == 0 ? 0 : (total + size - 1) / size)
                    || !(data.get("content") instanceof List<?> rows)
                    || rows.size() != Math.min(size, Math.max(0, total - page * size))) return null;
            Set<Long> seen = new HashSet<>();
            for (Object value : rows) {
                if (!(value instanceof Map<?, ?> item)
                        || !row(tool, item)
                        || !seen.add(positive(item.get(id)))) return null;
                if (tool.startsWith("notice.template")
                        && args.get("preset") instanceof Boolean preset
                        && !preset.equals(item.get("preset"))) return null;
            }
            return observation(tool, rows.size());
        } catch (IllegalArgumentException | ArithmeticException | NullPointerException invalid) {
            return null;
        }
    }

    private boolean row(String tool, Map<?, ?> row) {
        positive(row.get(tool.startsWith("alert_silence.") ? "silenceId" : "id"));
        if (!(row.get("name") instanceof String name)
                || name.isBlank()
                || name.length() > 256
                || row.containsKey("error")
                || Boolean.TRUE.equals(row.get("partial"))) return false;
        if (tool.startsWith("alert_group."))
            return row.get("enable") instanceof Boolean
                    && strings(row.get("groupLabels"))
                    && number(row.get("groupWait")) >= 0
                    && number(row.get("groupInterval")) > 0
                    && number(row.get("repeatInterval")) >= 0;
        if (tool.startsWith("alert_inhibit."))
            return row.get("enable") instanceof Boolean
                    && labels(row.get("sourceLabels"))
                    && labels(row.get("targetLabels"))
                    && strings(row.get("equalLabels"));
        if (tool.startsWith("alert_silence."))
            return row.get("enabled") instanceof Boolean
                    && row.get("matchAll") instanceof Boolean
                    && Set.of("once", "recurring").contains(row.get("type"))
                    && labels(row.get("labels"))
                    && row.get("days") instanceof List<?>;
        if (tool.startsWith("notice.rule_")) {
            if (!(row.get("enable") instanceof Boolean)
                    || !(row.get("filterAll") instanceof Boolean)
                    || !(row.get("receiverId") instanceof List<?> ids)
                    || ids.size() > 100) return false;
            Set<Long> seen = new HashSet<>();
            for (Object id : ids) if (!seen.add(positive(id))) return false;
            return true;
        }
        return row.get("preset") instanceof Boolean
                && number(row.get("type")) >= 0
                && number(row.get("type")) <= 127
                && row.get("content") instanceof String;
    }

    private boolean strings(Object value) {
        return value instanceof List<?> values
                && values.size() <= 100
                && values.stream()
                        .allMatch(v -> v instanceof String s && !s.isBlank() && s.length() <= 256);
    }

    private boolean labels(Object value) {
        return value instanceof Map<?, ?> values
                && values.size() <= 100
                && values.entrySet().stream()
                        .allMatch(
                                e ->
                                        e.getKey() instanceof String k
                                                && !k.isBlank()
                                                && e.getValue() instanceof String);
    }

    private long number(Object value) {
        if (!(value instanceof Number))
            throw new IllegalArgumentException("Native number required");
        return new BigDecimal(value.toString()).longValueExact();
    }

    private long positive(Object value) {
        long n = number(value);
        if (n <= 0) throw new IllegalArgumentException("Positive native id required");
        return n;
    }

    private AgentReadObservationClassifier.Observation observation(String tool, int count) {
        return new AgentReadObservationClassifier.Observation(
                tool.split("[._]")[0] + "-configuration-rows", count);
    }
}
