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
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogTrend;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;

/** One ranked population query; selected groups are fixed before bucket aggregation. */
final class GreptimeLogAnalysis {
    private GreptimeLogAnalysis() { }

    static LogAnalysis.Result read(GreptimeSqlQueryExecutor executor, LogFacets.Window window,
                                   LogAnalysis.Request request, long intervalMs, String where) {
        try {
            return map(executor.executeStrict(sql(request, intervalMs, where, "hertzbeat_logs")), window, request, intervalMs);
        } catch (RuntimeException failure) {
            throw new TelemetryStorageUnavailableException();
        }
    }

    static String sql(LogAnalysis.Request request, long intervalMs, String where, String table) {
        return sql(request, intervalMs, where, table, false);
    }

    static String sql(LogAnalysis.Request request, long intervalMs, String where, String table, boolean ordinals) {
        if (!LogTrend.EXPLICIT_INTERVALS_MS.contains(intervalMs)
                || (request.intervalMs() != null && request.intervalMs() != intervalMs)) {
            throw new IllegalArgumentException("Invalid interval");
        }
        if (request.grouping() != null) { return GreptimeLogMultiAnalysis.sql(request, intervalMs, where, table, ordinals); }
        String expression = request.field() == null ? "NULL" : GreptimeLogFacets.expression(request.field());
        boolean measured = request.measure() != null;
        boolean timed = "timeseries".equals(request.view());
        String direction = request.order().endsWith("-asc") ? "ASC" : "DESC";
        String rank = measured ? "measurement" : "count";
        String order = " ORDER BY " + rank + " " + direction + " NULLS LAST, kind ASC, value ASC";
        String sql = "WITH filtered AS (SELECT timestamp, " + GreptimeLogGroupProjection.kind(request.field(), expression)
                + " AS kind, COALESCE(" + expression + ", '') AS value"
                + (measured ? ", " + GreptimeLogMeasurement.sample(request.measure()) + " AS sample" : "")
                + GreptimeLogAdditionalMeasurements.projections(request.additionalMeasures())
                + " FROM " + table + where + "), totals AS (SELECT COUNT(*) AS matched FROM filtered),"
                + " aggregated AS (SELECT kind, value, COUNT(*) AS count"
                + (measured ? ", COUNT(sample) AS samples, " + GreptimeLogMeasurement.aggregate(request.measure(), "sample") + " AS raw_measurement" : "")
                + " FROM filtered GROUP BY kind, value HAVING COUNT(*) >= " + request.minCount() + "),"
                + " normalized AS (SELECT *" + (measured ? ", " + GreptimeLogMeasurement.finite("raw_measurement") + " AS measurement" : "")
                + " FROM aggregated), ranked AS (SELECT * FROM normalized" + order
                + " LIMIT " + (request.limit() + 1) + "), ranked_total AS (SELECT LEAST(COUNT(*), "
                + (request.limit() + 1) + ") AS ranked_count FROM normalized),"
                + " selected AS (SELECT * FROM ranked" + order + " LIMIT " + request.limit() + ")";
        if (request.additionalMeasures() != null) {
            sql += ", extras AS (SELECT f.kind, f.value" + GreptimeLogAdditionalMeasurements.aggregates(request.additionalMeasures())
                    + " FROM filtered f INNER JOIN selected s ON f.kind=s.kind AND f.value=s.value GROUP BY f.kind,f.value)";
        }
        if (timed) {
            sql += ", buckets AS (SELECT f.kind, f.value, date_bin('" + (intervalMs / 1000)
                    + " seconds', f.timestamp) AS bucket, COUNT(*) AS bucket_count"
                    + (measured ? ", COUNT(f.sample) AS bucket_samples, "
                    + GreptimeLogMeasurement.finite(GreptimeLogMeasurement.aggregate(request.measure(), "f.sample")) + " AS bucket_measurement" : "")
                    + " FROM filtered f INNER JOIN selected s ON f.kind = s.kind AND f.value = s.value GROUP BY f.kind, f.value, bucket)";
        }
        sql += " SELECT totals.matched, ranked_total.ranked_count, s.kind, s.value, s.count"
                + (measured ? ", s.samples, s.measurement" : "");
        sql += GreptimeLogAdditionalMeasurements.columns(request.additionalMeasures(), "e", "", false);
        if (timed) { sql += ", b.bucket, b.bucket_count" + (measured ? ", b.bucket_samples, b.bucket_measurement" : ""); }
        if (ordinals) {
            sql += ", ROW_NUMBER() OVER (ORDER BY s." + rank + " " + direction + " NULLS LAST, s.kind ASC, s.value ASC) AS ordinal1";
        }
        sql += " FROM totals CROSS JOIN ranked_total LEFT JOIN selected s ON true";
        if (request.additionalMeasures() != null) { sql += " LEFT JOIN extras e ON s.kind=e.kind AND s.value=e.value"; }
        if (timed) { sql += " LEFT JOIN buckets b ON s.kind = b.kind AND s.value = b.value"; }
        return sql + " ORDER BY s." + rank + " " + direction + " NULLS LAST, s.kind ASC, s.value ASC"
                + (timed ? ", b.bucket ASC" : "");
    }

    private static LogAnalysis.Result map(List<Map<String, Object>> rows, LogFacets.Window window,
                                          LogAnalysis.Request request, long intervalMs) {
        if (rows == null || rows.isEmpty() || rows.size() > request.limit() * LogTrend.MAX_BUCKETS) {
            throw new IllegalArgumentException("Missing or unbounded analysis result");
        }
        long total = number(rows.getFirst().get("matched"));
        long ranked = number(rows.getFirst().get("ranked_count"));
        if (ranked > request.limit() + 1L) { throw new IllegalArgumentException("Invalid ranked count"); }
        Map<Object, LogAnalysis.Group> groups = new LinkedHashMap<>();
        Map<Object, List<LogAnalysis.Bucket>> buckets = new LinkedHashMap<>();
        for (var row : rows) {
            if (number(row.get("matched")) != total || number(row.get("ranked_count")) != ranked) {
                throw new IllegalArgumentException("Inconsistent population");
            }
            if (row.get("count") == null) { continue; }
            var group = group(row, request);
            Object id = group.keys() == null ? java.util.Arrays.asList(group.kind(), group.value()) : group.keys();
            var previous = groups.putIfAbsent(id, group);
            if (previous != null && (!"timeseries".equals(request.view()) || !previous.equals(group))) {
                throw new IllegalArgumentException("Duplicate or inconsistent group");
            }
            var points = buckets.computeIfAbsent(id, ignored -> new ArrayList<>());
            if ("timeseries".equals(request.view())) {
                Long start = GreptimeDbDataStorage.timestampMillis(row.get("bucket"));
                if (start == null) { throw new IllegalArgumentException("Missing analysis bucket"); }
                points.add(new LogAnalysis.Bucket(start, number(row.get("bucket_count")),
                        GreptimeLogMeasurement.read(row, "bucket_", request.measure())));
            }
        }
        if (groups.size() != Math.min(ranked, request.limit())) { throw new IllegalArgumentException("Missing ranked groups"); }
        var result = new ArrayList<LogAnalysis.Group>();
        for (var entry : groups.entrySet()) {
            var group = entry.getValue();
            var points = buckets.get(entry.getKey());
            result.add(new LogAnalysis.Group(group.kind(), group.value(), group.count(), points, group.measurement(), group.keys(), group.additionalMeasurements()));
        }
        return new LogAnalysis.Result(window, request.field(), request.view(), request.limit(), request.order(), request.minCount(),
                total, request.grouping() == null ? ranked > request.limit() : truncated(rows, request.grouping().dimensions().size()),
                "timeseries".equals(request.view()) ? intervalMs : null, result, request.measure(), request.grouping(), request.additionalMeasures(), request.transform());
    }

    private static LogAnalysis.Group group(Map<String, Object> row, LogAnalysis.Request request) {
        long count = number(row.get("count"));
        var measurement = GreptimeLogMeasurement.read(row, "", request.measure());
        if (request.grouping() != null) {
            var keys = new ArrayList<LogAnalysis.GroupKey>();
            for (int i = 0; i < request.grouping().dimensions().size(); i++) {
                String kind = text(row, "k" + (i + 1));
                String value = text(row, "v" + (i + 1));
                keys.add(new LogAnalysis.GroupKey(request.grouping().dimensions().get(i).field(), kind, "value".equals(kind) ? value : null));
            }
            return new LogAnalysis.Group(null, null, count, List.of(), measurement, keys, GreptimeLogAdditionalMeasurements.read(row, "", request.additionalMeasures()));
        }
        String kind = text(row, "kind");
        String value = text(row, "value");
        return new LogAnalysis.Group(kind, "value".equals(kind) ? value : null, count, List.of(), measurement, null, GreptimeLogAdditionalMeasurements.read(row, "", request.additionalMeasures()));
    }

    private static String text(Map<String, Object> row, String key) {
        if (row.get(key) instanceof String value) { return value; }
        throw new IllegalArgumentException("Invalid group identity");
    }

    private static boolean truncated(List<Map<String, Object>> rows, int dimensions) {
        long flags = number(rows.getFirst().get("was_truncated"));
        if (flags > dimensions || rows.stream().anyMatch(row -> number(row.get("was_truncated")) != flags)) {
            throw new IllegalArgumentException("Invalid prefix truncation metadata");
        }
        return flags > 0;
    }

    private static long number(Object value) {
        long result = Long.parseLong(String.valueOf(value));
        if (result < 0) { throw new IllegalArgumentException("Negative count"); }
        return result;
    }
}
