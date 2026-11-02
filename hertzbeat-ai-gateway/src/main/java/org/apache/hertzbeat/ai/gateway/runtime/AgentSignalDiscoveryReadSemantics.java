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

import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.decode;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.jsonText;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.list;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.number;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.object;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.observation;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.require;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.same;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.text;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.window;

import org.apache.hertzbeat.ai.gateway.tool.log.AgentLogQuery;
import org.apache.hertzbeat.ai.gateway.tool.metrics.AgentOtlpMetricQuery;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Source-specific bounded discovery: never ingestion, graph changes, health or a population total.
 */
final class AgentSignalDiscoveryReadSemantics {
    static boolean supports(String tool) {
        return Set.of(
                        "metrics.otlp_inventory",
                        "metrics.otlp_labels",
                        "metrics.otlp_related",
                        "logs.facet_fields",
                        "logs.facet_values",
                        "entity.discovery")
                .contains(tool);
    }

    AgentReadObservationClassifier.Observation classify(
            AgentRuntimeToolCall call, Map<String, Object> output) {
        try {
            if (call.getToolName().equals("entity.discovery"))
                return discovery(call.getArguments(), output);
            var data = jsonText(output);
            require(!data.containsKey("error") && data.get("errorMessage") == null);
            require(!org.apache.hertzbeat.common.util.JsonUtil.toJson(data).contains("[REDACTED]"));
            return call.getToolName().startsWith("metrics.")
                    ? metrics(call, data)
                    : facets(call, data);
        } catch (IllegalArgumentException | ArithmeticException | NullPointerException invalid) {
            return null;
        }
    }

    private AgentReadObservationClassifier.Observation metrics(
            AgentRuntimeToolCall call, Map<String, Object> data) {
        var args = object(call.getArguments().get("q"));
        var q = decode(args, AgentOtlpMetricQuery.class);
        require(q != null);
        q.validate();
        String operation = call.getToolName().substring("metrics.otlp_".length());
        q.validateOperation(
                operation.equals("inventory")
                        ? "inventory"
                        : operation.equals("labels") ? "labels" : "related");
        var context = object(data.get("context"));
        require(window(args, context, 604800000));
        for (String field :
                List.of(
                        "entityId",
                        "entityType",
                        "serviceName",
                        "serviceNamespace",
                        "environment",
                        "collectorId",
                        "instance",
                        "endpoint",
                        "operationName")) {
            Object expected = args.get(field);
            if (expected == null) continue;
            if (field.equals("entityId")) same(number(expected), number(context.get(field)));
            else same(text(expected).trim(), context.get(field));
        }
        if (operation.equals("related")) return related(args, data);
        int limit = q.limit() == null ? 100 : Integer.parseInt(q.limit());
        same((long) limit, number(data.get("limit")));
        require(data.get("truncated") instanceof Boolean);
        var items = list(data.get("items"));
        require(items.size() <= limit);
        var seen = new HashSet<String>();
        if (operation.equals("inventory")) {
            same("greptime-inventory", data.get("source"));
            for (Object value : items) {
                var item = object(value);
                String name = text(item.get("metricName"));
                require(name.matches("[A-Za-z_:][A-Za-z0-9_:]*") && seen.add(name));
                text(item.get("family"));
                object(item.get("metadata"));
            }
        } else {
            require(
                    q.end() - q.start() <= 86400000
                            && q.start() > 0
                            && q.query() != null
                            && q.query().matches("[A-Za-z_:][A-Za-z0-9_:]*"));
            same("greptime-labels", data.get("source"));
            same("ready", data.get("state"));
            for (Object item : items) {
                require(item instanceof String && seen.add((String) item));
                if (q.label() == null) require(((String) item).matches("[A-Za-z_][A-Za-z0-9_]*"));
            }
        }
        return observation("otlp-" + operation + "-bounded-discovery", items.size());
    }

    private AgentReadObservationClassifier.Observation related(
            Map<String, Object> args, Map<String, Object> data) {
        same("backend-related-metrics", data.get("source"));
        same(trim(args.get("filter")), data.get("filter"));
        same(trim(args.get("operationName")), data.get("operationName"));
        int limit =
                args.get("limit") == null
                        ? 8
                        : Math.min(32, Integer.parseInt(args.get("limit").toString()));
        var rows = list(data.get("candidates"));
        require(rows.size() <= limit);
        same((long) rows.size(), number(data.get("candidateCount")));
        var seen = new HashSet<String>();
        for (Object value : rows) {
            var row = object(value);
            require(seen.add(text(row.get("query"))));
            text(row.get("source"));
            text(row.get("family"));
            text(row.get("reason"));
            for (Object v : list(row.get("matchedLabels"))) text(v);
            for (var v : object(row.get("resourceMatch")).values()) require(v instanceof String);
        }
        for (Object value : list(data.get("resourceMatchers"))) {
            var matcher = object(value);
            text(matcher.get("label"));
            require(Set.of("=", "!=", "=~", "!~").contains(matcher.get("operator")));
            require(matcher.get("value") instanceof String);
        }
        return observation("otlp-related-bounded-candidates", rows.size());
    }

    private Object trim(Object value) {
        return value instanceof String text && !text.isBlank() ? text.trim() : null;
    }

    private AgentReadObservationClassifier.Observation facets(
            AgentRuntimeToolCall call, Map<String, Object> data) {
        var args = object(call.getArguments().get("q"));
        var q = decode(args, AgentLogQuery.class);
        require(q != null);
        boolean fields = call.getToolName().equals("logs.facet_fields");
        q.validateOperation(fields ? "facetFields" : "facetValues");
        require(window(args, object(data.get("window")), 86400000));
        same("ready", data.get("state"));
        var coverage = object(data.get("coverage"));
        if (fields) {
            same("bounded_rows", coverage.get("mode"));
            same(1000L, number(coverage.get("rowLimit")));
            long scanned = number(coverage.get("scannedRows"));
            require(
                    scanned <= 1000
                            && coverage.get("hasMore") instanceof Boolean
                            && data.get("truncated") instanceof Boolean);
            var rows = list(data.get("fields"));
            require(rows.size() <= LogFacets.FIELD_LIMIT);
            require(
                    !Boolean.TRUE.equals(coverage.get("hasMore"))
                            || scanned == LogFacets.ROW_LIMIT);
            require(
                    !Boolean.TRUE.equals(data.get("truncated"))
                            || rows.size() == LogFacets.FIELD_LIMIT);
            var seen = new HashSet<String>();
            for (Object v : rows) {
                var row = object(v);
                String id = text(row.get("id"));
                var expected = LogFacets.Field.parse(id);
                require(seen.add(id));
                same(expected.source(), row.get("source"));
                same(expected.key(), row.get("key"));
                if (row.containsKey("scalar")) require(row.get("scalar") instanceof Boolean);
            }
            require(
                    seen.containsAll(
                            LogFacets.builtins().stream().map(LogFacets.Field::id).toList()));
            require(scanned != 0 || rows.size() == LogFacets.builtins().size());
            return observation("log-facet-fields-bounded-discovery", rows.size());
        }
        same("full_window", coverage.get("mode"));
        var field = LogFacets.Field.parse(text(args.get("field")));
        var actual = object(data.get("field"));
        same(field.id(), actual.get("id"));
        same(field.source(), actual.get("source"));
        same(field.key(), actual.get("key"));
        long total = number(data.get("matchedCount"));
        long missing = number(data.get("missingOrNullCount"));
        require(missing <= total && data.get("truncated") instanceof Boolean);
        long available = total - missing;
        String lookup = LogFacets.normalizeValueSearch(q.valueSearch());
        if (lookup != null) {
            var search = object(data.get("search"));
            same(lookup, search.get("query"));
            available = number(search.get("matchedCount"));
            require(available <= total - missing);
        } else require(data.get("search") == null);
        var rows = list(data.get("values"));
        long limit = args.get("limit") == null ? 20 : number(args.get("limit"));
        require(rows.size() <= limit);
        var seen = new HashSet<String>();
        long sum = 0;
        for (Object value : rows) {
            var row = object(value);
            require(row.get("value") instanceof String && seen.add((String) row.get("value")));
            long count = number(row.get("count"));
            require(count > 0);
            sum = Math.addExact(sum, count);
        }
        require(
                sum <= available
                        && (Boolean.TRUE.equals(data.get("truncated")) || sum == available));
        return observation("log-facet-returned-values", rows.size());
    }

    private AgentReadObservationClassifier.Observation discovery(
            Map<String, Object> args, Map<String, Object> data) {
        require(Set.of("search", "pageIndex", "pageSize").containsAll(args.keySet()));
        require(
                args.get("search") == null
                        || args.get("search") instanceof String search
                                && search.trim().length() <= 200);
        same(1L, number(data.get("schemaVersion")));
        long page = args.get("pageIndex") == null ? 0 : number(args.get("pageIndex"));
        long size = args.get("pageSize") == null ? 10 : number(args.get("pageSize"));
        require(page <= 10000 && size >= 1 && size <= 50);
        same(page, number(data.get("pageIndex")));
        same(size, number(data.get("pageSize")));
        long total = number(data.get("totalElements"));
        require(total <= Integer.MAX_VALUE);
        same(total == 0 ? 0 : (total + size - 1) / size, number(data.get("totalPages")));
        var rows = list(data.get("content"));
        require(rows.size() == Math.min(size, Math.max(0, total - page * size)));
        var seen = new HashSet<Long>();
        for (Object value : rows) {
            var row = object(value);
            var monitor = object(row.get("monitor"));
            long id = number(monitor.get("id"));
            require(id > 0 && seen.add(id));
            text(monitor.get("name"));
            text(monitor.get("app"));
            require(number(monitor.get("status")) <= 4);
            var ids = new HashSet<Long>();
            for (Object item : list(row.get("candidates"))) {
                var candidate = object(item);
                long resource = number(candidate.get("resourceId"));
                require(resource > 0 && ids.add(resource));
                text(candidate.get("resourceName"));
                text(candidate.get("resourceType"));
                require(
                        Set.of("already_bound", "direct", "suggested")
                                .contains(candidate.get("match")));
                for (Object key : list(candidate.get("matchedKeys"))) text(key);
            }
        }
        return observation("entity-discovery-page-only", rows.size());
    }
}
