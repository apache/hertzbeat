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
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;

/** One admitted statement: a ranks, b aggregates its complete population within the selected tuple domain. */
final class GreptimeLogComparison {
    private GreptimeLogComparison() { }

    static LogComparison.Result read(GreptimeSqlQueryExecutor executor, LogFacets.Window window,
                                     LogAnalysis.Request request, long interval, String whereA, String whereB, String formula) {
        return read(executor, window, request, interval, whereA, whereB, formula, null);
    }

    static LogComparison.Result read(GreptimeSqlQueryExecutor executor, LogFacets.Window window,
                                     LogAnalysis.Request request, long interval, String whereA, String whereB, String formula, Long shift) {
        try {
            return GreptimeLogComparisonMapper.map(executor.executeStrict(sql(request, interval, whereA, whereB, "hertzbeat_logs", shift)),
                    window, request, interval, formula, shift);
        } catch (RuntimeException failure) { throw new TelemetryStorageUnavailableException(); }
    }

    static String sql(LogAnalysis.Request request, long interval, String whereA, String whereB, String table) {
        return sql(request, interval, whereA, whereB, table, null);
    }

    static String sql(LogAnalysis.Request request, long interval, String whereA, String whereB, String table, Long shift) {
        if (shift != null) { LogComparison.validateTimeShift(shift); }
        if (request.intervalMs() != null && request.intervalMs() != interval) {
            throw new IllegalArgumentException("Invalid comparison interval");
        }
        var anchor = new LogAnalysis.Request(request.field(), "groups", request.limit(), request.order(), request.minCount(),
                request.measure(), request.grouping(), null, request.additionalMeasures());
        int size = dimensions(request).size();
        int width = Math.max(1, size);
        boolean multi = request.grouping() != null;
        boolean timed = "timeseries".equals(request.view());
        var ctes = new ArrayList<String>();
        ctes.add("anchor_result AS (" + GreptimeLogAnalysis.sql(anchor, interval, whereA, table, true) + ")");
        ctes.add("selected AS (SELECT " + (multi ? keys(width, "") : "kind AS k1, value AS v1")
                + GreptimeLogAdditionalMeasurements.columns(request.additionalMeasures(), "anchor_result", "", false)
                + ", count" + (request.measure() == null ? "" : ", samples, measurement") + ", " + ordinals(width, "")
                + " FROM anchor_result WHERE count IS NOT NULL ORDER BY " + ordinals(width, "") + " LIMIT " + request.limit() + ")");
        ctes.add("anchor_meta AS (SELECT MAX(matched) AS matching_a, MAX("
                + (multi ? "was_truncated" : "CASE WHEN ranked_count > " + request.limit() + " THEN 1 ELSE 0 END")
                + ") AS truncated FROM anchor_result)");
        ctes.add("selected_total AS (SELECT COUNT(*) AS selected_count FROM selected)");
        ctes.add(filtered("b_raw", request, table, whereB));
        ctes.add("b_total AS (SELECT COUNT(*) AS matching_b FROM b_raw)");
        ctes.add(aggregate("b_cells", "b_raw", request, interval, false, null));
        if (timed) {
            ctes.add(filtered("a_raw", request, table, whereA));
            ctes.add(aggregate("a_buckets", "a_raw", request, interval, true, null));
            ctes.add(aggregate("b_buckets", "b_raw", request, interval, true, shift));
            ctes.add("bucket_keys AS (SELECT " + keys(width, "") + ", bucket FROM a_buckets UNION SELECT "
                    + keys(width, "") + ", bucket FROM b_buckets)");
        }
        String sql = "WITH " + String.join(", ", ctes) + " SELECT m.matching_a, t.matching_b, m.truncated, n.selected_count, "
                + keys(width, "s.") + ", " + ordinals(width, "s.") + ", s.count AS a_count, COALESCE(c.count, 0) AS b_count"
                + measurements(request.measure(), "s", "a", false) + measurements(request.measure(), "c", "b", true);
        sql += GreptimeLogAdditionalMeasurements.columns(request.additionalMeasures(), "s", "a_", false)
                + GreptimeLogAdditionalMeasurements.columns(request.additionalMeasures(), "c", "b_", true);
        if (timed) {
            sql += ", u.bucket, COALESCE(ba.count, 0) AS ba_count, COALESCE(bb.count, 0) AS bb_count"
                    + measurements(request.measure(), "ba", "ba", true) + measurements(request.measure(), "bb", "bb", true);
        }
        sql += " FROM anchor_meta m CROSS JOIN b_total t CROSS JOIN selected_total n LEFT JOIN selected s ON true"
                + " LEFT JOIN b_cells c ON " + join(width, "s.", "c.");
        if (timed) {
            sql += " LEFT JOIN bucket_keys u ON " + join(width, "s.", "u.")
                    + " LEFT JOIN a_buckets ba ON " + join(width, "u.", "ba.") + " AND u.bucket = ba.bucket"
                    + " LEFT JOIN b_buckets bb ON " + join(width, "u.", "bb.") + " AND u.bucket = bb.bucket";
        }
        return sql + " ORDER BY " + ordinals(width, "s.") + (timed ? ", u.bucket ASC" : "");
    }

    static List<LogFacets.Field> dimensions(LogAnalysis.Request request) {
        return request.grouping() != null ? request.grouping().dimensions().stream().map(d -> LogFacets.Field.parse(d.field())).toList()
                : request.field() == null ? List.of() : List.of(request.field());
    }

    static String filtered(String name, LogAnalysis.Request request, String table, String where) {
        var fields = dimensions(request);
        var columns = new ArrayList<String>();
        if (fields.isEmpty()) { columns.add("'all' AS k1, '' AS v1"); }
        for (int i = 0; i < fields.size(); i++) {
            String value = GreptimeLogFacets.expression(fields.get(i));
            columns.add(GreptimeLogGroupProjection.kind(fields.get(i), value) + " AS k" + (i + 1)
                    + ", COALESCE(" + value + ", '') AS v" + (i + 1));
        }
        return name + " AS (SELECT timestamp, " + String.join(", ", columns)
                + (request.measure() == null ? "" : ", " + GreptimeLogMeasurement.sample(request.measure()) + " AS sample")
                + GreptimeLogAdditionalMeasurements.projections(request.additionalMeasures())
                + " FROM " + table + where + ")";
    }

    private static String aggregate(String name, String raw, LogAnalysis.Request request, long interval, boolean timed, Long shift) {
        int width = Math.max(1, dimensions(request).size());
        return name + " AS (SELECT " + keys(width, "f.")
                + (timed ? ", " + bucket(interval, shift) + " AS bucket" : "")
                + ", COUNT(*) AS count" + (request.measure() == null ? "" : ", COUNT(f.sample) AS samples, "
                + GreptimeLogMeasurement.finite(GreptimeLogMeasurement.aggregate(request.measure(), "f.sample")) + " AS measurement")
                + (timed ? "" : GreptimeLogAdditionalMeasurements.aggregates(request.additionalMeasures()))
                + " FROM " + raw + " f INNER JOIN selected s ON " + join(width, "s.", "f.")
                + " GROUP BY " + keys(width, "f.") + (timed ? ", bucket" : "") + ")";
    }

    static String bucket(long interval, Long shift) {
        String bin = "date_bin('" + interval / 1000 + " seconds', f.timestamp";
        if (shift == null) { return bin + ")"; }
        return bin + ", to_timestamp_millis(" + -shift + ")) + INTERVAL '" + shift / 1000 + " seconds'";
    }

    private static String measurements(LogAnalysis.Measure measure, String source, String target, boolean optional) {
        if (measure == null) { return ""; }
        String samples = source + ".samples";
        String value = source + ".measurement";
        if (optional) {
            samples = "COALESCE(" + samples + ", 0)";
            value = "CASE WHEN " + source + ".count IS NULL THEN " + ("unique".equals(measure.function()) ? "0" : "NULL")
                    + " ELSE " + value + " END";
        }
        return ", " + samples + " AS " + target + "_samples, " + value + " AS " + target + "_measurement";
    }

    static String keys(int size, String prefix) {
        return IntStream.rangeClosed(1, size).mapToObj(i -> prefix + "k" + i + ", " + prefix + "v" + i).collect(Collectors.joining(", "));
    }

    private static String ordinals(int size, String prefix) {
        return IntStream.rangeClosed(1, size).mapToObj(i -> prefix + "ordinal" + i).collect(Collectors.joining(", "));
    }

    static String join(int size, String left, String right) {
        return IntStream.rangeClosed(1, size).mapToObj(i -> left + "k" + i + " = " + right + "k" + i
                + " AND " + left + "v" + i + " = " + right + "v" + i).collect(Collectors.joining(" AND "));
    }
}
