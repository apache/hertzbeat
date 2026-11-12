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

package org.apache.hertzbeat.ai.gateway.conversation;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeTextSanitizer;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.util.JsonUtil;
import tools.jackson.databind.JsonNode;

/** Allowlisted query-result metadata only. No raw logs, request payloads, credentials or model text leave this projection. */
final class AgentQueryCoverageProjector {
    private static final Set<String> TOOLS = Set.of("traces.query", "monitor.query", "alert.query", "metrics.realtime", "metrics.history",
            "logs.list", "logs.query", "logs.group_by_stats", "logs.repeated_errors.summary");

    AgentQueryCoverage project(AgentToolCall call) {
        if (!"READ".equals(call.getRisk()) || !"SUCCEEDED".equals(call.getStatus()) || !TOOLS.contains(call.getToolName())) {
            return null;
        }
        try {
            JsonNode input = JsonUtil.fromJson(call.getInputJson());
            if (input != null && input.path("q").isObject()) {
                input = input.path("q");
            }
            String output = call.getResultOutput();
            if (output == null || output.length() > 128_000) {
                return unknown(call, input, true);
            }
            JsonNode data = JsonUtil.fromJson(output);
            if (data == null || !data.isObject()) {
                return unknown(call, input, false);
            }
            boolean partial = data.path("partial").asBoolean(false);
            boolean truncated = data.path("projectionTruncated").asBoolean(false) || data.path("truncated").asBoolean(false);
            if ("json_text".equals(data.path("format").asText())) {
                if (!data.path("data").isTextual()) {
                    return unknown(call, input, true);
                }
                data = JsonUtil.fromJson(data.path("data").asText());
            }
            if (data != null && data.has("code")) {
                if (data.path("code").asInt(-1) != 0) {
                    return unknown(call, input, truncated);
                }
                data = data.path("data");
            }
            if (data == null || !data.isObject()
                    || data.has("state") && !"ready".equals(data.path("state").asText())) {
                return unknown(call, input, truncated);
            }
            if ("alert.query".equals(call.getToolName())) {
                data = org.apache.hertzbeat.ai.gateway.runtime.AgentAlertQueryPage.page(data);
                if (data == null) {
                    return unknown(call, input, truncated);
                }
            }
            partial |= data.path("partial").asBoolean(false) || data.path("hasMore").asBoolean(false);
            truncated |= data.path("truncated").asBoolean(false);
            Long returned = count(data, "returnedRows", "rowCount", "returnedPoints");
            String unit = "rows";
            if (data.has("returnedPoints")) {
                unit = "points";
            } else if (data.path("content").isArray()) {
                returned = (long) data.path("content").size();
            } else if (data.path("groups").isArray()) {
                returned = (long) data.path("groups").size();
                unit = "groups";
            }
            if (returned == null) {
                return unknown(call, input, truncated);
            }
            Long total = count(data, "totalElements", "totalPoints", "totalRows", "totalGroups");
            Long offset = count(data, "offset");
            Long page = count(data, "pageIndex", "number");
            Long size = count(data, "pageSize", "size");
            if (offset == null && page != null && size != null) {
                offset = Math.multiplyExact(page, size);
            }
            partial |= total != null && (total > returned || offset != null && offset > 0);
            String state = returned == 0 && !truncated && !partial ? "EMPTY_RESULT"
                    : partial || truncated ? "PARTIAL_PAGE" : total == null ? "BOUNDED_RESULTS" : "OBSERVED_ROWS";
            return new AgentQueryCoverage(call.getToolCallId(), call.getToolName(), state, unit,
                    instant(data, input, "start"), instant(data, input, "end"), offset, returned, total,
                    partial, truncated, scope(input, data));
        } catch (RuntimeException invalid) {
            return unknown(call, null, false);
        }
    }

    private AgentQueryCoverage unknown(AgentToolCall call, JsonNode input, boolean truncated) {
        return new AgentQueryCoverage(call.getToolCallId(), call.getToolName(), "UNKNOWN", "rows",
                instant(null, input, "start"), instant(null, input, "end"), null, null, null, true, truncated, scope(input, null));
    }

    private Long instant(JsonNode output, JsonNode input, String key) {
        Long value = count(output, key);
        value = value == null ? count(input, key) : value;
        return value != null && value <= 253_402_300_799_999L ? value : null;
    }

    private Long count(JsonNode node, String... keys) {
        if (node == null) {
            return null;
        }
        for (String key : keys) {
            JsonNode value = node.path(key);
            if (value.isIntegralNumber() && value.asLong(-1) >= 0) {
                return value.asLong();
            }
        }
        return null;
    }

    private Map<String, String> scope(JsonNode input, JsonNode output) {
        Map<String, String> scope = new LinkedHashMap<>();
        for (String key : List.of("purpose", "alertType", "status", "sort", "order", "monitorId", "metricKey", "app", "metrics", "field", "fieldParameter", "history", "groupBy", "severityCategory",
                "severityText", "entityId", "limit", "minCount")) {
            JsonNode value = output != null && output.hasNonNull(key) ? output.path(key)
                    : input == null ? null : input.path(key);
            if (value != null && (value.isTextual() || value.isIntegralNumber())) {
                scope.put(key, AgentRuntimeTextSanitizer.sanitizeAndLimit(value.asText(), 128));
            }
        }
        if (input != null && (input.hasNonNull("search") || input.hasNonNull("resourceFilter") || input.hasNonNull("attributeFilter"))) {
            scope.put("additionalFiltersPresent", "true");
        }
        return scope;
    }
}
