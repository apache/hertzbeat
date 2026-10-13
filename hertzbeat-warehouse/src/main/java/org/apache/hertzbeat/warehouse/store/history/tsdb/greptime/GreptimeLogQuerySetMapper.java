/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
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
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogQuerySet;
import org.apache.hertzbeat.common.observability.dto.log.LogTrend;

/** Strictly maps complete union-domain cells and fills only proven empty time buckets. */
final class GreptimeLogQuerySetMapper {
    private GreptimeLogQuerySetMapper() { }

    private static final class GroupState {
        private final List<LogAnalysis.GroupKey> keys;
        private final LogComparison.Cell cell;
        private final Map<Long, LogComparison.Cell> buckets = new LinkedHashMap<>();

        GroupState(List<LogAnalysis.GroupKey> keys, LogComparison.Cell cell) {
            this.keys = keys;
            this.cell = cell;
        }
    }

    static LogQuerySet.Result map(List<Map<String, Object>> rows, LogFacets.Window window,
                                  List<LogQuerySet.Population> populations, List<LogQuerySet.Formula> formulas,
                                  String view, long interval) {
        if (rows == null || rows.size() < populations.size() || rows.size() > 24_004) {
            throw new IllegalArgumentException("Missing or unbounded query-set rows");
        }
        var groups = new ArrayList<LinkedHashMap<List<LogAnalysis.GroupKey>, GroupState>>();
        var totals = new long[populations.size()];
        var flags = new long[populations.size()];
        var seen = new boolean[populations.size()];
        for (int i = 0; i < populations.size(); i++) { groups.add(new LinkedHashMap<>()); }
        for (var row : rows) {
            int index = (int) number(row, "source_order");
            if (index >= populations.size()) { throw new IllegalArgumentException("Unexpected query-set source"); }
            long total = number(row, "matching_total");
            long flag = number(row, "truncated");
            if (flag > 4 || seen[index] && (totals[index] != total || flags[index] != flag)) {
                throw new IllegalArgumentException("Inconsistent query-set metadata");
            }
            seen[index] = true;
            totals[index] = total;
            flags[index] = flag;
            if (row.get("k1") == null) { continue; }
            var request = request(populations.get(index), view, interval);
            var keys = keys(row, request);
            var cell = cell(row, "c_", request.measure());
            var state = groups.get(index).computeIfAbsent(keys, ignored -> new GroupState(keys, cell));
            if (!state.cell.equals(cell)) { throw new IllegalArgumentException("Inconsistent query-set cell"); }
            if ("timeseries".equals(view) && row.get("bucket") != null) {
                Long start = GreptimeDbDataStorage.timestampMillis(row.get("bucket"));
                if (start == null || state.buckets.putIfAbsent(start, cell(row, "b_", request.measure())) != null) {
                    throw new IllegalArgumentException("Invalid query-set bucket");
                }
            }
        }
        var sources = new ArrayList<LogQuerySet.Source>();
        for (int i = 0; i < populations.size(); i++) {
            if (!seen[i]) { throw new IllegalArgumentException("Incomplete query-set source"); }
            sources.add(source(populations.get(i), window, totals[i], flags[i], groups.get(i), view, interval));
        }
        validateBudget(sources, formulas);
        return new LogQuerySet.Result(2, window, "timeseries".equals(view) ? interval : null,
                LogQuerySet.Executed.from(populations.stream().map(LogQuerySet.Population::query).toList(), formulas),
                sources, formulas);
    }

    private static LogQuerySet.Source source(LogQuerySet.Population population, LogFacets.Window window,
                                             long total, long flag, LinkedHashMap<List<LogAnalysis.GroupKey>, GroupState> states,
                                             String view, long interval) {
        long shift = population.query().timeShiftMs() == null ? 0 : population.query().timeShiftMs();
        var sourceWindow = new LogFacets.Window(Math.subtractExact(window.start(), shift), Math.subtractExact(window.end(), shift));
        LogAnalysis.Measure measure = population.query().analysis().measure();
        var result = new ArrayList<LogQuerySet.Group>();
        long grouped = 0;
        for (var state : states.values()) {
            grouped = Math.addExact(grouped, state.cell.count());
            result.add(new LogQuerySet.Group(state.keys, state.cell,
                    "timeseries".equals(view) ? fill(state, window, interval, measure) : List.of()));
        }
        if (grouped > total) { throw new IllegalArgumentException("Invalid query-set total"); }
        var query = population.query();
        return new LogQuerySet.Source(query.refId(), query.alias(), query.visible(), sourceWindow, total,
                flag > 0, query.analysis(), result);
    }

    private static List<LogQuerySet.Bucket> fill(GroupState state, LogFacets.Window window,
                                                 long interval, LogAnalysis.Measure measure) {
        long first = Math.floorDiv(window.start(), interval);
        long last = Math.floorDiv(window.end(), interval);
        if (last - first + 1 > LogTrend.MAX_BUCKETS) { throw new IllegalArgumentException("Unbounded query-set grid"); }
        var empty = new LogComparison.Cell(0, measure == null ? null : new LogAnalysis.Measurement("no_samples", 0, null));
        var result = new ArrayList<LogQuerySet.Bucket>();
        long count = 0;
        for (long index = first; index <= last; index++) {
            long start = Math.multiplyExact(index, interval);
            var cell = state.buckets.getOrDefault(start, empty);
            count = Math.addExact(count, cell.count());
            result.add(new LogQuerySet.Bucket(start, cell));
        }
        if (state.buckets.keySet().stream().anyMatch(start -> start < result.getFirst().start()
                || start > result.getLast().start() || Math.floorMod(start, interval) != 0)
                || count != state.cell.count()) {
            throw new IllegalArgumentException("Incomplete query-set buckets");
        }
        return result;
    }

    private static List<LogAnalysis.GroupKey> keys(Map<String, Object> row, LogAnalysis.Request request) {
        var fields = GreptimeLogComparison.dimensions(request);
        if (fields.isEmpty()) {
            if (!"all".equals(text(row, "k1")) || !"".equals(text(row, "v1"))) {
                throw new IllegalArgumentException("Invalid global query-set group");
            }
            return List.of();
        }
        var result = new ArrayList<LogAnalysis.GroupKey>();
        for (int i = 0; i < fields.size(); i++) {
            String kind = text(row, "k" + (i + 1));
            String value = text(row, "v" + (i + 1));
            result.add(new LogAnalysis.GroupKey(fields.get(i).id(), kind, "value".equals(kind) ? value : null));
        }
        return List.copyOf(result);
    }

    private static LogComparison.Cell cell(Map<String, Object> row, String prefix, LogAnalysis.Measure measure) {
        var measurement = GreptimeLogMeasurement.read(row, prefix, measure);
        if (measurement != null && measurement.sampleCount() == 0) {
            measurement = new LogAnalysis.Measurement("no_samples", 0, null);
        }
        return new LogComparison.Cell(number(row, prefix + "count"), measurement);
    }

    private static void validateBudget(List<LogQuerySet.Source> sources, List<LogQuerySet.Formula> formulas) {
        int series = sources.stream().mapToInt(source -> source.groups().size()).sum();
        for (var formula : formulas) {
            var referenced = formula.dependsOn().isEmpty() ? sources.getFirst()
                    : sources.stream().filter(source -> formula.dependsOn().contains(source.refId())).findFirst().orElseThrow();
            series += referenced.groups().size();
        }
        if (series > 100) { throw new LogQuerySet.SeriesBudgetExceeded(); }
    }

    private static LogAnalysis.Request request(LogQuerySet.Population population, String view, long interval) {
        return population.query().analysis().request(view, "timeseries".equals(view) ? interval : null);
    }

    private static String text(Map<String, Object> row, String key) {
        if (row.get(key) instanceof String value) { return value; }
        throw new IllegalArgumentException("Invalid query-set group key");
    }

    private static long number(Map<String, Object> row, String key) {
        long value = Long.parseLong(String.valueOf(row.get(key)));
        if (value < 0) { throw new IllegalArgumentException("Invalid query-set number"); }
        return value;
    }
}
