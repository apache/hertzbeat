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

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.json.JsonMapper;
import java.math.BigDecimal;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.tool.metrics.AgentOtlpMetricQuery;

/** Verifies bounded OTLP console samples; a point count is never an underlying event population. */
final class AgentOtlpConsoleReadSemantics {
    private static final JsonMapper JSON = JsonMapper.builder()
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT).build();
    private static final Set<String> DIMENSIONS = Set.of("entityId", "entityType", "serviceName", "serviceNamespace",
            "environment", "collectorId", "instance", "endpoint", "operationName");

    AgentReadObservationClassifier.Observation classify(Map<String, Object> arguments, Map<String, Object> data) {
        if (arguments == null || data == null) { return null; }
        try {
            AgentOtlpMetricQuery query = JSON.convertValue(arguments.get("q"), AgentOtlpMetricQuery.class);
            if (query == null) { return null; }
            query.validate();
            query.validateOperation("console");
            JsonNode result = JSON.valueToTree(data);
            if (!matchesQuery(query, JSON.valueToTree(arguments.get("q")), result)) { return null; }
            return samples(query, result);
        } catch (IllegalArgumentException | ArithmeticException invalid) {
            return null;
        }
    }

    private boolean matchesQuery(AgentOtlpMetricQuery query, JsonNode requested, JsonNode result) {
        if (query.end() - query.start() > 86_400_000L || !query.query().trim().matches("[A-Za-z_:][A-Za-z0-9_:]*")) {
            return false;
        }
        JsonNode context = result.path("context");
        if (!Objects.equals(integer(context.path("start")), query.start())
                || !Objects.equals(integer(context.path("end")), query.end())) { return false; }
        for (String dimension : DIMENSIONS) {
            JsonNode expected = requested.path(dimension);
            if (expected.isMissingNode() || expected.isNull()) { continue; }
            JsonNode actual = context.path(dimension);
            if (dimension.equals("entityId")) {
                if (integer(expected) == null || !Objects.equals(integer(expected), integer(actual))) { return false; }
            } else if (!expected.isTextual() || !actual.isTextual()
                    || !Objects.equals(expected.asText().trim(), actual.asText())) { return false; }
        }
        String effectiveQuery = result.path("query").asText("").replace("\\\"", "\"");
        return effectiveQuery.contains("__name__=\"" + query.query().trim() + "\"")
                && "promql".equals(result.path("queryMode").asText())
                && result.path("datasource").isTextual() && !result.path("datasource").asText().isBlank()
                && result.path("errorMessage").isNull();
    }

    private AgentReadObservationClassifier.Observation samples(AgentOtlpMetricQuery query, JsonNode result) {
        JsonNode results = result.path("results");
        JsonNode frames = results.path("frames");
        JsonNode stats = result.path("stats");
        int maxSeries = query.query().trim().endsWith("_bucket") ? 64 : 32;
        int limit = query.limit() == null ? maxSeries : Math.min(Integer.parseInt(query.limit()), maxSeries);
        if (!Objects.equals(integer(results.path("status")), 200L) || !results.path("msg").isNull()
                || !"otlp-metrics-console".equals(results.path("refId").asText()) || !frames.isArray()
                || !stats.has("latestObservedAt") || frames.size() > limit || !Objects.equals(integer(stats.path("totalSeries")), (long) frames.size())) {
            return null;
        }
        int nonEmpty = 0;
        int points = 0;
        Long latest = null;
        for (JsonNode frame : frames) {
            if (!validFrame(query, frame)) { return null; }
            JsonNode rows = frame.path("data");
            if (!rows.isEmpty()) {
                nonEmpty++;
                long timestamp = rows.get(rows.size() - 1).get(0).longValue();
                latest = latest == null ? timestamp : Math.max(latest, timestamp);
            }
            points += rows.size();
        }
        if (points > 38_400 || !Objects.equals(integer(stats.path("nonEmptySeries")), (long) nonEmpty)
                || !Objects.equals(integer(stats.path("latestObservedAt")), latest)) { return null; }
        String expectedEmpty = frames.isEmpty() ? "no_matching_metrics" : nonEmpty == 0 ? "current_time_range_no_data" : null;
        JsonNode emptyReason = result.path("emptyStateReason");
        if (expectedEmpty == null ? !emptyReason.isNull() : !expectedEmpty.equals(emptyReason.asText())) { return null; }
        return new AgentReadObservationClassifier.Observation("otlp-metric-points", points);
    }

    private boolean validFrame(AgentOtlpMetricQuery query, JsonNode frame) {
        JsonNode schema = frame.path("schema");
        JsonNode fields = schema.path("fields");
        JsonNode rows = frame.path("data");
        if (!fields.isArray() || fields.size() != 2 || !"time".equals(fields.get(0).path("type").asText())
                || !"number".equals(fields.get(1).path("type").asText()) || !rows.isArray() || rows.size() > 1_200) {
            return false;
        }
        JsonNode name = schema.path("labels").path("__name__");
        // Temporal PromQL functions may drop __name__; the effective selector above still binds the metric.
        if (!name.isMissingNode() && !query.query().trim().equals(name.asText())) { return false; }
        Long previous = null;
        for (JsonNode row : rows) {
            if (!row.isArray() || row.size() != 2) { return false; }
            Long timestamp = integer(row.get(0));
            // PromQL range requests use seconds, rounded down by the producer.
            if (timestamp == null || timestamp < query.start() / 1_000 * 1_000 || timestamp > query.end()
                    || previous != null && timestamp <= previous || !finite(row.get(1))) { return false; }
            previous = timestamp;
        }
        return true;
    }

    private Long integer(JsonNode node) {
        return node != null && node.isIntegralNumber() && node.canConvertToLong() ? node.longValue() : null;
    }

    private boolean finite(JsonNode node) {
        if (node == null || !node.isNumber() && !node.isTextual()) { return false; }
        try {
            new BigDecimal(node.asText());
            return true;
        } catch (NumberFormatException invalid) {
            return false;
        }
    }
}
