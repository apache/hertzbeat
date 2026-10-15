/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogCalculated;

/** Checks and hydrates the bounded calculated analysis result. */
final class GreptimeLogCalculatedAnalysisRows {
    private GreptimeLogCalculatedAnalysisRows() { }

    static LogCalculated.AnalysisResult map(List<Map<String, Object>> rows, LogCalculated.Query query) {
        GreptimeLogCalculatedAdmission.check(rows, query);
        var operation = (LogCalculated.Analysis) query.operation();
        int bound = operation.limit() * ("timeseries".equals(operation.view()) ? 60 : 1);
        if (rows == null || rows.isEmpty() || rows.size() > Math.max(1, bound)) {
            throw new IllegalArgumentException("Unbounded calculated analysis");
        }
        long total = count(rows.getFirst(), "matched");
        long ranked = count(rows.getFirst(), "ranked_count");
        long overflow = count(rows.getFirst(), "prefix_overflow");
        if (ranked > 100 || overflow > operation.grouping().size()) {
            throw new IllegalArgumentException("Unbounded analysis metadata");
        }
        var groups = new LinkedHashMap<List<LogCalculated.AnalysisKey>, GroupRows>();
        for (var row : rows) {
            if (count(row, "matched") != total || count(row, "ranked_count") != ranked
                    || count(row, "prefix_overflow") != overflow) {
                throw new IllegalArgumentException("Inconsistent calculated analysis population");
            }
            if (row.get("group_count") == null) { continue; }
            var keys = keys(row, query);
            long groupCount = count(row, "group_count");
            var measurement = GreptimeLogMeasurement.read(row, "", operation.measure() != null);
            if (groupCount < operation.minCount() || measurement != null
                    && measurement.sampleCount() > groupCount) { throw new IllegalArgumentException("Invalid analysis group"); }
            long ordinal = count(row, "final_ordinal");
            var group = groups.computeIfAbsent(keys, ignored -> new GroupRows(groupCount, measurement, ordinal));
            if (group.count != groupCount || !java.util.Objects.equals(group.measurement, measurement)
                    || group.ordinal != ordinal) { throw new IllegalArgumentException("Inconsistent analysis group"); }
            if ("timeseries".equals(operation.view())) { bucket(row, operation, group); }
            else if (group.rows++ > 0) { throw new IllegalArgumentException("Duplicate analysis group"); }
        }
        if (groups.size() != Math.min(ranked, operation.limit())) {
            throw new IllegalArgumentException("Missing calculated analysis groups");
        }
        long expectedOrdinal = 1;
        long selectedCount = 0;
        var result = new ArrayList<LogCalculated.AnalysisGroup>();
        for (var entry : groups.entrySet()) {
            var group = entry.getValue();
            if (group.ordinal != expectedOrdinal++) { throw new IllegalArgumentException("Invalid analysis order"); }
            selectedCount = Math.addExact(selectedCount, group.count);
            result.add(new LogCalculated.AnalysisGroup(entry.getKey(), group.count, group.measurement,
                    "timeseries".equals(operation.view()) ? grid(group, operation, query) : List.of()));
        }
        if (selectedCount > total) { throw new IllegalArgumentException("Inconsistent analysis group counts"); }
        return new LogCalculated.AnalysisResult(total, overflow > 0 || ranked > operation.limit(), List.copyOf(result));
    }

    private static List<LogCalculated.AnalysisKey> keys(Map<String, Object> row, LogCalculated.Query query) {
        var operation = (LogCalculated.Analysis) query.operation();
        var result = new ArrayList<LogCalculated.AnalysisKey>();
        for (int i = 0; i < operation.grouping().size(); i++) {
            String field = operation.grouping().get(i).field();
            String kind = String.valueOf(row.get("k" + (i + 1)));
            if (!"value".equals(kind) && !"null".equals(kind)) { throw new IllegalArgumentException("Invalid analysis key"); }
            Object value = null;
            if ("value".equals(kind)) {
                Object raw = row.get("v" + (i + 1));
                String type = field.startsWith("calculated:")
                        ? query.definitions().outputType(field.substring("calculated:".length())) : "string";
                value = switch (type) {
                    case "number" -> finite(raw);
                    case "boolean" -> raw instanceof Boolean bool ? bool : null;
                    case "string" -> raw instanceof String text ? text : null;
                    default -> null;
                };
                if (value == null) {
                    throw new IllegalArgumentException("Invalid analysis key value");
                }
            }
            result.add(new LogCalculated.AnalysisKey(field, kind, value));
        }
        return List.copyOf(result);
    }


    private static void bucket(Map<String, Object> row, LogCalculated.Analysis operation, GroupRows group) {
        Long start = GreptimeDbDataStorage.timestampMillis(row.get("bucket"));
        if (start == null || group.buckets.containsKey(start)) { throw new IllegalArgumentException("Invalid analysis bucket"); }
        long count = count(row, "bucket_count");
        if (count == 0) { throw new IllegalArgumentException("Empty native analysis bucket"); }
        var measurement = GreptimeLogMeasurement.read(row, "bucket_", operation.measure() != null);
        if (measurement != null && measurement.sampleCount() > count) {
            throw new IllegalArgumentException("Invalid bucket sample count");
        }
        group.buckets.put(start, new LogCalculated.AnalysisBucket(start, count, measurement));
    }

    private static List<LogCalculated.AnalysisBucket> grid(GroupRows group, LogCalculated.Analysis operation,
                                                           LogCalculated.Query query) {
        long interval = operation.intervalMs();
        long first = Math.floorDiv(query.scope().start(), interval) * interval;
        long last = Math.floorDiv(query.scope().end(), interval) * interval;
        var result = new ArrayList<LogCalculated.AnalysisBucket>();
        long observed = 0;
        long samples = 0;
        for (long start = first; start <= last; start += interval) {
            var bucket = group.buckets.get(start);
            if (bucket == null) {
                bucket = new LogCalculated.AnalysisBucket(start, 0, operation.measure() == null ? null
                        : new LogAnalysis.Measurement("no_samples", 0, null));
            }
            observed = Math.addExact(observed, bucket.count());
            if (bucket.measurement() != null) { samples = Math.addExact(samples, bucket.measurement().sampleCount()); }
            result.add(bucket);
        }
        if (observed != group.count || group.buckets.keySet().stream().anyMatch(start ->
                start < first || start > last || start % interval != 0)
                || group.measurement != null && samples != group.measurement.sampleCount()) {
            throw new IllegalArgumentException("Incomplete analysis buckets");
        }
        return List.copyOf(result);
    }

    private static long count(Map<String, Object> row, String key) {
        Object raw = row.get(key);
        if (raw == null || !raw.toString().matches("[0-9]+")) { throw new IllegalArgumentException("Invalid analysis count"); }
        return Long.parseLong(raw.toString());
    }

    private static Double finite(Object raw) {
        if (raw == null) { return null; }
        double value = Double.parseDouble(raw.toString());
        if (!Double.isFinite(value)) { throw new IllegalArgumentException("Non-finite analysis key"); }
        return value;
    }

    private static final class GroupRows {
        private final long count;
        private final LogAnalysis.Measurement measurement;
        private final long ordinal;
        private final Map<Long, LogCalculated.AnalysisBucket> buckets = new LinkedHashMap<>();
        private int rows;

        private GroupRows(long count, LogAnalysis.Measurement measurement, long ordinal) {
            this.count = count;
            this.measurement = measurement;
            this.ordinal = ordinal;
        }
    }
}
