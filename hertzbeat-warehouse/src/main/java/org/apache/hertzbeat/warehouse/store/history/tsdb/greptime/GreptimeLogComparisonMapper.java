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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogTrend;

/** Validates complete paired evidence before filling successful absent buckets on a common grid. */
final class GreptimeLogComparisonMapper {
    private GreptimeLogComparisonMapper() { }

    static LogComparison.Result map(List<Map<String, Object>> rows, LogFacets.Window window,
                                     LogAnalysis.Request request, long interval, String formula) {
        return map(rows, window, request, interval, formula, null);
    }

    static LogComparison.Result map(List<Map<String, Object>> rows, LogFacets.Window window,
                                     LogAnalysis.Request request, long interval, String formula, Long shift) {
        var shiftedWindow = shift == null ? null : LogComparison.shiftedWindow(window, shift);
        boolean timed = "timeseries".equals(request.view());
        if (rows == null || rows.isEmpty() || rows.size() > request.limit() * (timed ? LogTrend.MAX_BUCKETS : 1)) {
            throw new IllegalArgumentException("Missing or unbounded comparison");
        }
        var first = rows.getFirst();
        long matchingA = number(first, "matching_a");
        long matchingB = number(first, "matching_b");
        long selected = number(first, "selected_count");
        long truncated = number(first, "truncated");
        if (selected > request.limit() || truncated > Math.max(1, GreptimeLogComparison.dimensions(request).size())) {
            throw new IllegalArgumentException("Invalid comparison rank metadata");
        }
        var groups = new LinkedHashMap<List<LogAnalysis.GroupKey>, LogComparison.Group>();
        var points = new LinkedHashMap<List<LogAnalysis.GroupKey>, List<LogComparison.Bucket>>();
        List<Long> previous = null;
        for (var row : rows) {
            if (number(row, "matching_a") != matchingA || number(row, "matching_b") != matchingB
                    || number(row, "selected_count") != selected || number(row, "truncated") != truncated) {
                throw new IllegalArgumentException("Inconsistent comparison metadata");
            }
            if (row.get("a_count") == null) {
                if (selected != 0 || rows.size() != 1) { throw new IllegalArgumentException("Missing selected comparison row"); }
                continue;
            }
            var keys = keys(row, request);
            var ordinals = ordinals(row, request);
            var group = new LogComparison.Group(keys, cell(row, "a_", request.measure(), request.additionalMeasures()), cell(row, "b_", request.measure(), request.additionalMeasures()), List.of());
            var old = groups.putIfAbsent(keys, group);
            if (old == null) {
                if (previous != null && compare(previous, ordinals) >= 0) { throw new IllegalArgumentException("Invalid anchor order"); }
                previous = ordinals;
                points.put(keys, new ArrayList<>());
            } else if (!timed || !old.equals(group) || !ordinals.equals(previous)) {
                throw new IllegalArgumentException("Duplicate or inconsistent comparison row");
            }
            if (timed) {
                Long start = GreptimeDbDataStorage.timestampMillis(row.get("bucket"));
                if (start == null) { throw new IllegalArgumentException("Missing comparison bucket"); }
                points.get(keys).add(new LogComparison.Bucket(start, cell(row, "ba_", request.measure(), null), cell(row, "bb_", request.measure(), null)));
            }
        }
        if (groups.size() != selected) { throw new IllegalArgumentException("Incomplete selected comparison groups"); }
        var values = groups.values().stream().map(g -> new LogComparison.Group(g.keys(), g.a(), g.b(), points.get(g.keys()))).toList();
        var sparse = new LogComparison.Result(window, request, matchingA, matchingB, truncated > 0, timed ? interval : null, values, formula, shift, shiftedWindow);
        if (!timed) { return sparse; }
        var filled = values.stream().map(g -> fill(g, window, interval, request.measure())).toList();
        return new LogComparison.Result(window, request, matchingA, matchingB, truncated > 0, interval, filled, formula, shift, shiftedWindow);
    }

    private static LogComparison.Group fill(LogComparison.Group group, LogFacets.Window window, long interval, LogAnalysis.Measure measure) {
        long first = Math.floorDiv(window.start(), interval);
        long last = Math.floorDiv(window.end(), interval);
        if (last - first + 1 > LogTrend.MAX_BUCKETS) { throw new IllegalArgumentException("Unbounded comparison grid"); }
        var actual = new LinkedHashMap<Long, LogComparison.Bucket>();
        group.buckets().forEach(bucket -> actual.put(bucket.start(), bucket));
        var result = new ArrayList<LogComparison.Bucket>();
        var zero = new LogComparison.Cell(0, measure == null ? null : "unique".equals(measure.function())
                ? new LogAnalysis.Measurement("ready", 0, 0.0) : new LogAnalysis.Measurement("no_samples", 0, null));
        for (long index = first; index <= last; index++) {
            long start = Math.multiplyExact(index, interval);
            result.add(actual.getOrDefault(start, new LogComparison.Bucket(start, zero, zero)));
        }
        return new LogComparison.Group(group.keys(), group.a(), group.b(), result);
    }

    private static List<LogAnalysis.GroupKey> keys(Map<String, Object> row, LogAnalysis.Request request) {
        var fields = GreptimeLogComparison.dimensions(request);
        var keys = new ArrayList<LogAnalysis.GroupKey>();
        for (int i = 0; i < fields.size(); i++) {
            String kind = text(row, "k" + (i + 1));
            String value = text(row, "v" + (i + 1));
            if (!"value".equals(kind) && !value.isEmpty()) { throw new IllegalArgumentException("Invalid non-value tuple"); }
            keys.add(new LogAnalysis.GroupKey(fields.get(i).id(), kind, "value".equals(kind) ? value : null));
        }
        if (fields.isEmpty() && (!"all".equals(text(row, "k1")) || !text(row, "v1").isEmpty())) {
            throw new IllegalArgumentException("Invalid global group");
        }
        return keys;
    }

    private static List<Long> ordinals(Map<String, Object> row, LogAnalysis.Request request) {
        var result = new ArrayList<Long>();
        int width = Math.max(1, GreptimeLogComparison.dimensions(request).size());
        for (int i = 0; i < width; i++) {
            long value = number(row, "ordinal" + (i + 1));
            int limit = request.grouping() == null ? request.limit() : request.grouping().dimensions().get(i).limit();
            if (value == 0 || value > limit) { throw new IllegalArgumentException("Invalid anchor ordinal"); }
            result.add(value);
        }
        return result;
    }

    private static int compare(List<Long> left, List<Long> right) {
        for (int i = 0; i < left.size(); i++) {
            int result = left.get(i).compareTo(right.get(i));
            if (result != 0) { return result; }
        }
        return 0;
    }

    private static LogComparison.Cell cell(Map<String, Object> row, String prefix, LogAnalysis.Measure measure, List<LogAnalysis.Measure> extras) {
        return new LogComparison.Cell(number(row, prefix + "count"), GreptimeLogMeasurement.read(row, prefix, measure),
                GreptimeLogAdditionalMeasurements.read(row, prefix, extras));
    }

    private static String text(Map<String, Object> row, String key) {
        if (row.get(key) instanceof String value) { return value; }
        throw new IllegalArgumentException("Invalid comparison key");
    }

    private static long number(Map<String, Object> row, String key) {
        long value = Long.parseLong(String.valueOf(row.get(key)));
        if (value < 0) { throw new IllegalArgumentException("Invalid comparison count"); }
        return value;
    }
}
