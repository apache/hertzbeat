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

/** Exact native metadata reads. A valid row is never evidence of mutation or runtime health. */
final class AgentBusinessMetadataReadSemantics {
    private static final Set<String> TOOLS =
            Set.of("alert_rule.get", "alert_rule.list", "label.get", "label.list");

    static boolean supports(String tool) {
        return TOOLS.contains(tool);
    }

    AgentReadObservationClassifier.Observation classify(
            AgentRuntimeToolCall call, Map<String, Object> output) {
        if (call == null || !supports(call.getToolName()) || output == null) return null;
        try {
            boolean label = call.getToolName().startsWith("label.");
            Map<?, ?> data = data(call.getToolName(), output);
            if (data == null) return null;
            String idField = label ? "id" : "ruleId";
            String argument = label ? "labelId" : "ruleId";
            if (call.getToolName().endsWith(".get")) {
                return row(data, label)
                                && positive(data.get(idField))
                                        == positive(call.getArguments().get(argument))
                        ? observation(label, 1)
                        : null;
            }
            return page(call.getArguments(), data, label);
        } catch (IllegalArgumentException | ArithmeticException | NullPointerException invalid) {
            return null;
        }
    }

    static Map<?, ?> data(String tool, Map<String, Object> output) {
        if (!tool.startsWith("label.")) return output;
        return Boolean.FALSE.equals(output.get("partial"))
                        && Boolean.TRUE.equals(output.get("redactionApplied"))
                        && output.get("data") instanceof Map<?, ?> value
                ? value
                : null;
    }

    private AgentReadObservationClassifier.Observation page(
            Map<String, Object> args, Map<?, ?> data, boolean label) {
        long page = number(args.getOrDefault("pageIndex", 0));
        long size = number(args.getOrDefault("pageSize", label ? 20 : 10));
        long total = number(data.get("totalElements"));
        if (page < 0
                || page > Integer.MAX_VALUE
                || size < 1
                || size > 100
                || total < 0
                || total > Integer.MAX_VALUE
                || number(data.get("pageIndex")) != page
                || number(data.get("pageSize")) != size
                || number(data.get("totalPages")) != (total == 0 ? 0 : (total + size - 1) / size)
                || !(data.get("content") instanceof List<?> rows)
                || rows.size() != Math.min(size, Math.max(0, total - page * size))) return null;
        Set<Long> seen = new HashSet<>();
        Set<Long> filter = new HashSet<>();
        if (!label && args.containsKey("ids")) {
            if (!(args.get("ids") instanceof List<?> ids) || ids.isEmpty() || ids.size() > 100)
                return null;
            for (Object id : ids) if (!filter.add(positive(id))) return null;
            if (total > filter.size()) return null;
        }
        for (Object value : rows) {
            if (!(value instanceof Map<?, ?> item) || !row(item, label)) return null;
            long id = positive(item.get(label ? "id" : "ruleId"));
            if (!seen.add(id) || !filter.isEmpty() && !filter.contains(id)) return null;
        }
        return observation(label, rows.size());
    }

    private boolean row(Map<?, ?> row, boolean label) {
        positive(row.get(label ? "id" : "ruleId"));
        if (!(row.get("name") instanceof String name) || name.isBlank() || name.length() > 256)
            return false;
        if (label) return number(row.get("type")) >= 0 && number(row.get("type")) <= 1;
        return row.get("type") instanceof String type
                && !type.isBlank()
                && row.get("expression") instanceof String expression
                && !expression.isBlank()
                && row.get("enabled") instanceof Boolean;
    }

    private AgentReadObservationClassifier.Observation observation(boolean label, int count) {
        return new AgentReadObservationClassifier.Observation(
                label ? "label-metadata-rows" : "alert-rule-metadata-rows", count);
    }

    private long number(Object value) {
        if (!(value instanceof Number))
            throw new IllegalArgumentException("Native count must be numeric");
        return new BigDecimal(value.toString()).longValueExact();
    }

    private long positive(Object value) {
        long id = number(value);
        if (id <= 0) throw new IllegalArgumentException("Native identity must be positive");
        return id;
    }
}
