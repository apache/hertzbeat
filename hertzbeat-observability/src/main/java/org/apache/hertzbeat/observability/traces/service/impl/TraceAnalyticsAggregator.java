/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.traces.service.impl;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics;
import org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics.SpanRow;
import org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics.Value;

/** Counts only the shared bounded matching evidence; never extrapolates to a whole window. */
final class TraceAnalyticsAggregator {
    private TraceAnalyticsAggregator() { }

    static TraceAnalytics.Histogram histogram(List<SpanRow> rows, TraceAnalytics.Window window,
                                              String population, boolean errorOnly, int bucketCount) {
        if (bucketCount < 1 || bucketCount > 60) {
            throw new IllegalArgumentException("Invalid histogram bucket count");
        }
        var units = units(rows, population, errorOnly);
        long interval = Math.max(1, Math.ceilDiv(window.end() - window.start(), bucketCount));
        int count = (int) Math.ceilDiv(window.end() - window.start(), interval);
        long[] totals = new long[count];
        long[] errors = new long[count];
        for (var members : units.values()) {
            long first = members.stream().mapToLong(row -> Long.parseLong(row.startTimeUnixNano())).min().orElseThrow();
            int bucket = (int) Math.min(count - 1, Math.floorDiv(first / 1_000_000L - window.start(), interval));
            if (bucket < 0) {
                throw new IllegalArgumentException("Span outside histogram window");
            }
            totals[bucket]++;
            if (members.stream().anyMatch(TraceAnalyticsAggregator::error)) {
                errors[bucket]++;
            }
        }
        List<TraceAnalytics.Bucket> buckets = new ArrayList<>();
        long errorCount = 0;
        for (int index = 0; index < count; index++) {
            long start = window.start() + index * interval;
            long end = Math.min(window.end(), start + interval);
            buckets.add(new TraceAnalytics.Bucket(start, end, index < count - 1 || window.endExclusive(), totals[index], errors[index]));
            errorCount += errors[index];
        }
        return new TraceAnalytics.Histogram(units.size(), errorCount, interval, List.copyOf(buckets));
    }

    static TraceAnalytics.Facets facets(List<SpanRow> rows, String population, boolean errorOnly, String field, int limit) {
        TraceAnalytics.field(field);
        var units = units(rows, population, errorOnly);
        var groups = counts(units, field);
        long missing = groups.stream().filter(value -> value.value() == null).mapToLong(Value::count).sum();
        var present = groups.stream().filter(value -> value.value() != null).sorted(order("count-desc")).toList();
        return new TraceAnalytics.Facets(field, units.size(), missing, membership(population),
                present.stream().limit(limit).toList(), present.size() > limit);
    }

    static TraceAnalytics.Groups groups(List<SpanRow> rows, String population, boolean errorOnly,
                                         String field, int limit, String orderBy) {
        TraceAnalytics.field(field);
        var units = units(rows, population, errorOnly);
        var groups = counts(units, field).stream().sorted(order(orderBy)).toList();
        return new TraceAnalytics.Groups(field, units.size(), membership(population), orderBy,
                groups.stream().limit(limit).toList(), groups.size() > limit);
    }

    static TraceAnalytics.SpanPage spans(List<SpanRow> rows, boolean errorOnly, int page, int size, String sort) {
        Comparator<SpanRow> newest = Comparator.comparingLong((SpanRow row) -> Long.parseLong(row.startTimeUnixNano())).reversed();
        Comparator<SpanRow> comparator = switch (sort) {
            case "newest" -> newest;
            case "oldest" -> Comparator.comparingLong(row -> Long.parseLong(row.startTimeUnixNano()));
            case "duration_desc" -> Comparator.comparing((SpanRow row) -> row.durationNanos() == null ? null
                    : Long.valueOf(row.durationNanos()), Comparator.nullsLast(Comparator.reverseOrder())).thenComparing(newest);
            default -> throw new IllegalArgumentException("Invalid span sort");
        };
        var selected = units(rows, "matched_spans", errorOnly).values().stream().map(List::getFirst)
                .sorted(comparator.thenComparing(SpanRow::traceId).thenComparing(SpanRow::spanId)).toList();
        return new TraceAnalytics.SpanPage(selected.stream().skip((long) page * size).limit(size).toList(), selected.size(), page, size, sort);
    }

    private static Map<String, List<SpanRow>> units(List<SpanRow> rows, String population, boolean errorOnly) {
        TraceAnalytics.population(population);
        Map<String, List<SpanRow>> units = new LinkedHashMap<>();
        for (var row : rows) {
            String id = "matched_traces".equals(population) ? row.traceId() : row.traceId() + ":" + row.spanId();
            units.computeIfAbsent(id, ignored -> new ArrayList<>()).add(row);
        }
        if (errorOnly) {
            units.values().removeIf(members -> members.stream().noneMatch(TraceAnalyticsAggregator::error));
        }
        return units;
    }

    private static List<Value> counts(Map<String, List<SpanRow>> units, String field) {
        Map<String, long[]> groups = new HashMap<>();
        for (var members : units.values()) {
            boolean error = members.stream().anyMatch(TraceAnalyticsAggregator::error);
            members.stream().map(row -> switch (field) {
                case "serviceName" -> row.serviceName();
                case "operationName" -> row.operationName();
                case "environment" -> row.environment();
                default -> throw new IllegalArgumentException("Invalid trace field");
            }).distinct().forEach(value -> {
                long[] counts = groups.computeIfAbsent(value, ignored -> new long[2]);
                counts[0]++;
                if (error) {
                    counts[1]++;
                }
            });
        }
        return groups.entrySet().stream().map(entry -> new Value(entry.getKey(), entry.getValue()[0], entry.getValue()[1])).toList();
    }

    private static Comparator<Value> order(String order) {
        Comparator<Value> comparator = Comparator.comparingLong(Value::count).reversed();
        if ("error-count-desc".equals(order)) {
            comparator = Comparator.comparingLong(Value::errorCount).reversed().thenComparing(comparator);
        } else if (!"count-desc".equals(order)) {
            throw new IllegalArgumentException("Invalid group sort");
        }
        return Comparator.comparing((Value value) -> value.value() == null).thenComparing(comparator)
                .thenComparing(Value::value, Comparator.nullsLast(Comparator.naturalOrder()));
    }

    private static boolean error(SpanRow row) {
        return "ERROR".equals(row.status());
    }

    private static String membership(String population) {
        return "matched_traces".equals(population) ? "multiple" : "single";
    }
}
