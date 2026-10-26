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
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.integer;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.keys;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.list;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.number;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.object;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.observation;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.require;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.same;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.text;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.traceProjection;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.window;

import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolArguments.Selection;
import org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Population, page and exact histogram-boundary validation; bounded evidence never becomes a window
 * total.
 */
final class AgentNativeTraceReadSemantics {
    AgentReadObservationClassifier.Observation classify(
            String tool, Map<String, Object> args, Map<String, Object> data) {
        traceProjection(data);
        var selection = decode(args.get("selection"), Selection.class);
        require(selection != null);
        var scope = object(args.get("selection"));
        if (tool.equals("traces.list")) {
            return traceList(args, scope, data);
        }
        require(window(scope, object(data.get("window")), 86_400_000));
        var boundary = object(data.get("window"));
        same(Boolean.TRUE.equals(args.get("endExclusive")), boundary.get("endExclusive"));
        same("ready", data.get("state"));
        String population =
                tool.equals("traces.spans")
                        ? "matched_spans"
                        : Objects.toString(args.get("population"), "matched_traces");
        same(TraceAnalytics.population(population), data.get("population"));
        String mode = coverage(object(data.get("coverage")));
        var result = object(data.get("data"));
        return switch (tool) {
            case "traces.spans" -> spans(args, scope, result, mode);
            case "traces.histogram" -> histogram(args, boundary, result, mode);
            case "traces.groups" -> groups(args, result, population, mode);
            case "traces.facet_values" -> facets(args, result, population, mode);
            default -> null;
        };
    }

    private String coverage(Map<String, Object> data) {
        keys(data, "mode", "truncated");
        String mode = text(data.get("mode"));
        require(
                List.of("window", "bounded").contains(mode)
                        && data.get("truncated") instanceof Boolean);
        if (mode.equals("window")) {
            require(Boolean.FALSE.equals(data.get("truncated")));
        }
        if (mode.equals("bounded")) {
            long limit = number(data.get("rowLimit"));
            long scanned = number(data.get("scannedRows"));
            require(limit > 0 && scanned <= limit);
        }
        return mode;
    }

    private AgentReadObservationClassifier.Observation traceList(
            Map<String, Object> args, Map<String, Object> scope, Map<String, Object> data) {
        require(window(scope, data, 604_800_000));
        var query = object(data.get("query"));
        String mode = text(query.get("coverage"));
        require(
                List.of("window", "bounded").contains(mode)
                        && query.get("truncated") instanceof Boolean);
        if (mode.equals("window")) {
            require(Boolean.FALSE.equals(query.get("truncated")));
        } else {
            require(number(query.get("rowLimit")) > 0);
        }
        String sort = Objects.toString(args.get("sort"), "NEWEST");
        require(List.of("NEWEST", "DURATION_DESC").contains(sort));
        same(sort.equals("NEWEST") ? "newest" : "duration_desc", query.get("sort"));
        var content = page(args, data);
        var seen = new java.util.HashSet<String>();
        for (Object value : content) {
            var row = object(value);
            String trace = hex(row.get("traceId"), 32);
            require(seen.add(trace));
            if (scope.get("traceId") != null) {
                same(scope.get("traceId"), trace);
            }
            require(
                    number(row.get("spanCount")) > 0
                            && number(row.get("errorSpanCount")) <= number(row.get("spanCount")));
            long roots = number(row.get("rootSpanCount"));
            same(
                    roots == 0 ? "missing" : roots == 1 ? "unique" : "ambiguous",
                    row.get("rootState"));
            if (roots == 1) {
                hex(row.get("rootSpanId"), 16);
                number(row.get("durationNanos"));
            }
            require(number(row.get("observedEndTime")) >= number(row.get("observedStartTime")));
            hex(object(row.get("representativeSpan")).get("spanId"), 16);
            require(roots <= number(row.get("spanCount")));
        }
        return observation("trace-page-records-" + mode, content.size());
    }

    private List<?> page(Map<String, Object> args, Map<String, Object> data) {
        keys(data, "content", "totalElements", "pageIndex", "pageSize");
        int index = option(args, "pageIndex", 0, 0, 10_000);
        int size = option(args, "pageSize", 20, 1, 50);
        same((long) index, number(data.get("pageIndex")));
        same((long) size, number(data.get("pageSize")));
        var rows = list(data.get("content"));
        require(
                rows.size() <= size
                        && number(data.get("totalElements"))
                                >= (rows.isEmpty() ? 0 : (long) index * size + rows.size()));
        return rows;
    }

    private AgentReadObservationClassifier.Observation spans(
            Map<String, Object> args,
            Map<String, Object> scope,
            Map<String, Object> data,
            String mode) {
        var rows = page(args, data);
        String sort = Objects.toString(args.get("sort"), "newest");
        require(List.of("newest", "oldest", "duration_desc").contains(sort));
        same(sort, data.get("sort"));
        var seen = new java.util.HashSet<String>();
        for (Object value : rows) {
            var row = decode(value, TraceAnalytics.SpanRow.class);
            String trace = hex(row.traceId(), 32);
            String span = hex(row.spanId(), 16);
            require(seen.add(trace + span));
            if (row.parentSpanId() != null && !row.parentSpanId().isEmpty()) {
                require(row.parentSpanId().matches("[0-9a-f]{16}"));
            }
            if (scope.get("traceId") != null) {
                same(scope.get("traceId"), trace);
            }
            long nano = Long.parseLong(text(row.startTimeUnixNano()));
            long millis = nano / 1_000_000;
            require(
                    nano > 0
                            && millis >= number(scope.get("start"))
                            && millis <= number(scope.get("end")));
            require(row.durationNanos() == null || Long.parseLong(row.durationNanos()) >= 0);
            require(List.of("ERROR", "OK", "UNSET").contains(row.status()));
            if (Boolean.TRUE.equals(scope.get("errorOnly"))) {
                same("ERROR", row.status());
            }
            for (String key :
                    List.of("serviceName", "serviceNamespace", "environment", "operationName")) {
                if (scope.get(key) != null) {
                    same(scope.get(key), object(value).get(key));
                }
            }
        }
        return observation("trace-span-page-" + mode, rows.size());
    }

    private AgentReadObservationClassifier.Observation histogram(
            Map<String, Object> args,
            Map<String, Object> window,
            Map<String, Object> data,
            String mode) {
        keys(data, "totalCount", "errorCount", "intervalMs", "buckets");
        var result = decode(data, TraceAnalytics.Histogram.class);
        long start = number(window.get("start"));
        long end = number(window.get("end"));
        long interval =
                Math.max(1, Math.ceilDiv(end - start, option(args, "bucketCount", 30, 1, 60)));
        require(
                result.intervalMs() == interval
                        && result.buckets().size() == Math.ceilDiv(end - start, interval));
        long count = 0;
        long errors = 0;
        for (var bucket : result.buckets()) {
            require(bucket.start() == start && bucket.end() == Math.min(end, start + interval));
            require(
                    bucket.endExclusive()
                            == (bucket.end() < end
                                    || Boolean.TRUE.equals(window.get("endExclusive"))));
            require(
                    bucket.count() >= 0
                            && bucket.errorCount() >= 0
                            && bucket.errorCount() <= bucket.count());
            count = Math.addExact(count, bucket.count());
            errors = Math.addExact(errors, bucket.errorCount());
            start = bucket.end();
        }
        require(count == result.totalCount() && errors == result.errorCount());
        return observation("trace-histogram-" + mode, count == 0 ? 0 : 1);
    }

    private AgentReadObservationClassifier.Observation groups(
            Map<String, Object> args, Map<String, Object> data, String population, String mode) {
        keys(data, "groupBy", "totalCount", "membership", "orderBy", "groups", "truncated");
        var result = decode(data, TraceAnalytics.Groups.class);
        same(TraceAnalytics.field(text(args.get("groupBy"))), result.groupBy());
        String order = Objects.toString(args.get("orderBy"), "COUNT_DESC");
        require(List.of("COUNT_DESC", "ERROR_COUNT_DESC").contains(order));
        same(order.equals("COUNT_DESC") ? "count-desc" : "error-count-desc", result.orderBy());
        same(population.equals("matched_traces") ? "multiple" : "single", result.membership());
        int limit = option(args, "limit", 20, 1, 50);
        require(result.totalCount() >= 0 && result.groups().size() <= limit);
        var seen = new java.util.HashSet<String>();
        long total = 0;
        long previous = Long.MAX_VALUE;
        for (var group : result.groups()) {
            require(
                    seen.add(group.value())
                            && group.count() > 0
                            && group.count() <= result.totalCount()
                            && group.errorCount() >= 0
                            && group.errorCount() <= group.count());
            long ranking = order.equals("COUNT_DESC") ? group.count() : group.errorCount();
            require(ranking <= previous);
            previous = ranking;
            total = Math.addExact(total, group.count());
        }
        if (population.equals("matched_spans")) {
            require(
                    total <= result.totalCount()
                            && (result.truncated() || total == result.totalCount()));
        }
        if (population.equals("matched_traces") && !result.truncated()) {
            require(total >= result.totalCount());
        }
        require(!result.truncated() || result.groups().size() == limit);
        return observation("trace-ranked-groups-" + mode, result.groups().size());
    }

    private AgentReadObservationClassifier.Observation facets(
            Map<String, Object> args, Map<String, Object> data, String population, String mode) {
        keys(data, "field", "totalCount", "missingCount", "membership", "values", "truncated");
        var result = decode(data, TraceAnalytics.Facets.class);
        same(TraceAnalytics.field(text(args.get("field"))), result.field());
        same(population.equals("matched_traces") ? "multiple" : "single", result.membership());
        int limit = option(args, "limit", 20, 1, 50);
        require(
                result.totalCount() >= 0
                        && result.missingCount() >= 0
                        && result.missingCount() <= result.totalCount()
                        && result.values().size() <= limit);
        var seen = new java.util.HashSet<String>();
        long total = 0;
        long previous = Long.MAX_VALUE;
        for (var item : result.values()) {
            require(
                    item.value() != null
                            && seen.add(item.value())
                            && item.count() > 0
                            && item.count() <= result.totalCount()
                            && item.errorCount() >= 0
                            && item.errorCount() <= item.count()
                            && item.count() <= previous);
            previous = item.count();
            total = Math.addExact(total, item.count());
        }
        if (population.equals("matched_spans"))
            require(
                    total <= result.totalCount() - result.missingCount()
                            && (result.truncated()
                                    || total == result.totalCount() - result.missingCount()));
        if (population.equals("matched_traces") && !result.truncated())
            require(total >= result.totalCount() - result.missingCount());
        require(!result.truncated() || result.values().size() == limit);
        return observation("trace-facet-memberships-" + mode, result.values().size());
    }

    static String hex(Object value, int length) {
        String text = text(value);
        require(text.matches("[0-9a-f]{" + length + "}") && !text.equals("0".repeat(length)));
        return text;
    }

    private int option(Map<String, Object> args, String key, int fallback, int min, int max) {
        int value = args.get(key) == null ? fallback : integer(args.get(key));
        require(value >= min && value <= max);
        return value;
    }
}
