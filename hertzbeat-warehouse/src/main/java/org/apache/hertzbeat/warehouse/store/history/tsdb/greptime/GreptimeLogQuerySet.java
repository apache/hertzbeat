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
import java.util.stream.IntStream;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogQuerySet;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;

/** One statement: independent source ranks, bounded union domains, complete source cells. */
final class GreptimeLogQuerySet {
    private GreptimeLogQuerySet() { }

    static LogQuerySet.Result read(GreptimeSqlQueryExecutor executor, LogFacets.Window window,
                                   List<LogQuerySet.Population> sources, List<LogQuerySet.Formula> formulas,
                                   String view, long interval, List<String> wheres) {
        List<java.util.Map<String, Object>> rows;
        try {
            rows = executor.executeStrict(sql(sources, view, interval, wheres, "hertzbeat_logs"));
        } catch (RuntimeException failure) {
            throw new TelemetryStorageUnavailableException();
        }
        try {
            return GreptimeLogQuerySetMapper.map(rows, window, sources, formulas, view, interval);
        } catch (LogQuerySet.SeriesBudgetExceeded exceeded) {
            throw exceeded;
        } catch (RuntimeException invalidStorage) {
            throw new TelemetryStorageUnavailableException();
        }
    }

    static String sql(List<LogQuerySet.Population> sources, String view, long interval, List<String> wheres, String table) {
        if (sources == null || sources.isEmpty() || sources.size() > 4 || wheres.size() != sources.size()) {
            throw new IllegalArgumentException("Invalid query-set sources");
        }
        var ctes = new ArrayList<String>();
        var domains = new LinkedHashMap<List<String>, List<Integer>>();
        for (int i = 0; i < sources.size(); i++) {
            var request = request(sources.get(i), view, interval);
            int width = width(request);
            String id = "s" + i;
            ctes.add("rank_" + id + " AS (" + GreptimeLogAnalysis.sql(request, interval, wheres.get(i), table, true) + ")");
            ctes.add("selected_" + id + " AS (SELECT " + rankedKeys(request)
                    + " FROM rank_" + id + " WHERE count IS NOT NULL GROUP BY "
                    + (request.grouping() == null ? "kind, value" : keys(width(request), "")) + ")");
            ctes.add("meta_" + id + " AS (SELECT MAX(matched) AS matching_total, MAX("
                    + (request.grouping() == null ? "CASE WHEN ranked_count > " + request.limit() + " THEN 1 ELSE 0 END"
                            : "was_truncated") + ") AS truncated FROM rank_" + id + ")");
            ctes.add(GreptimeLogComparison.filtered("raw_" + id, request, table, wheres.get(i)));
            domains.computeIfAbsent(signature(request), ignored -> new ArrayList<>()).add(i);
            if (width > 4) { throw new IllegalArgumentException("Unbounded group width"); }
        }
        for (var entry : domains.entrySet()) {
            int width = Math.max(1, entry.getKey().size());
            String domain = domainName(entry.getValue().getFirst());
            String union = entry.getValue().stream().map(i -> "SELECT " + keys(width, "") + " FROM selected_s" + i)
                    .reduce((left, right) -> left + " UNION " + right).orElseThrow();
            ctes.add(domain + " AS (" + union + ")");
        }
        var selects = new ArrayList<String>();
        for (int i = 0; i < sources.size(); i++) {
            var population = sources.get(i);
            var request = request(population, view, interval);
            int width = width(request);
            int domainIndex = domains.get(signature(request)).getFirst();
            String id = "s" + i;
            String domain = domainName(domainIndex);
            ctes.add(aggregate("cells_" + id, "raw_" + id, domain, request, interval, false, null));
            if ("timeseries".equals(request.view())) {
                Long shift = population.query().timeShiftMs();
                ctes.add(aggregate("buckets_" + id, "raw_" + id, domain, request, interval, true,
                        shift == null || shift == 0 ? null : shift));
            }
            selects.add(selection(i, request, domain));
        }
        return "WITH " + String.join(", ", ctes) + " " + String.join(" UNION ALL ", selects)
                + " ORDER BY source_order, k1, v1, k2, v2, k3, v3, k4, v4, bucket";
    }

    private static String selection(int index, LogAnalysis.Request request, String domain) {
        int width = width(request);
        String id = "s" + index;
        boolean timed = "timeseries".equals(request.view());
        String sql = "SELECT " + index + " AS source_order, m.matching_total, m.truncated, "
                + paddedKeys(width) + ", COALESCE(c.count, 0) AS c_count"
                + measured(request, "c", "c_") + (timed ? ", b.bucket, COALESCE(b.count, 0) AS b_count"
                + measured(request, "b", "b_") : ", NULL AS bucket, NULL AS b_count, NULL AS b_samples, NULL AS b_measurement")
                + " FROM meta_" + id + " m LEFT JOIN " + domain + " d ON true"
                + " LEFT JOIN cells_" + id + " c ON " + join(width, "d.", "c.");
        if (timed) { sql += " LEFT JOIN buckets_" + id + " b ON " + join(width, "d.", "b."); }
        return sql;
    }

    private static String measured(LogAnalysis.Request request, String source, String prefix) {
        if (request.measure() == null) { return ", NULL AS " + prefix + "samples, NULL AS " + prefix + "measurement"; }
        return ", COALESCE(" + source + ".samples, 0) AS " + prefix + "samples, CASE WHEN " + source
                + ".count IS NULL THEN NULL ELSE " + source + ".measurement END AS " + prefix + "measurement";
    }

    private static String aggregate(String name, String raw, String domain, LogAnalysis.Request request,
                                    long interval, boolean timed, Long shift) {
        int width = width(request);
        return name + " AS (SELECT " + keys(width, "f.")
                + (timed ? ", " + GreptimeLogComparison.bucket(interval, shift) + " AS bucket" : "")
                + ", COUNT(*) AS count" + (request.measure() == null ? "" : ", COUNT(f.sample) AS samples, "
                + GreptimeLogMeasurement.finite(GreptimeLogMeasurement.aggregate(request.measure(), "f.sample")) + " AS measurement")
                + " FROM " + raw + " f INNER JOIN " + domain + " d ON " + join(width, "d.", "f.")
                + " GROUP BY " + keys(width, "f.") + (timed ? ", bucket" : "") + ")";
    }

    private static String rankedKeys(LogAnalysis.Request request) {
        return request.grouping() == null ? "kind AS k1, value AS v1" : keys(width(request), "");
    }

    private static String paddedKeys(int width) {
        return IntStream.rangeClosed(1, 4).mapToObj(i -> i <= width
                ? "d.k" + i + " AS k" + i + ", d.v" + i + " AS v" + i
                : "'all' AS k" + i + ", '' AS v" + i).reduce((a, b) -> a + ", " + b).orElseThrow();
    }

    private static List<String> signature(LogAnalysis.Request request) {
        return GreptimeLogComparison.dimensions(request).stream().map(LogFacets.Field::id).toList();
    }

    private static int width(LogAnalysis.Request request) { return Math.max(1, signature(request).size()); }

    private static String domainName(int index) { return "domain_s" + index; }

    private static String keys(int width, String prefix) { return GreptimeLogComparison.keys(width, prefix); }

    private static String join(int width, String left, String right) { return GreptimeLogComparison.join(width, left, right); }

    private static LogAnalysis.Request request(LogQuerySet.Population source, String view, long interval) {
        var original = source.query().analysis();
        return original.request(view, "timeseries".equals(view) ? interval : null);
    }
}
