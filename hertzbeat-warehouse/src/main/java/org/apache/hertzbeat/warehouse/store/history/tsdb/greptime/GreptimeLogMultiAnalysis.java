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
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;

/** Ordered prefix ranking from raw rows; each selected parent has its own child limit. */
final class GreptimeLogMultiAnalysis {
    private GreptimeLogMultiAnalysis() { }

    static String sql(LogAnalysis.Request request, long intervalMs, String where, String table) {
        return sql(request, intervalMs, where, table, false);
    }

    static String sql(LogAnalysis.Request request, long intervalMs, String where, String table, boolean includeOrdinals) {
        var dimensions = request.grouping().dimensions();
        int size = dimensions.size();
        var ctes = new ArrayList<String>();
        var projections = new ArrayList<String>();
        for (int index = 0; index < size; index++) {
            var field = LogFacets.Field.parse(dimensions.get(index).field());
            String value = GreptimeLogFacets.expression(field);
            projections.add(GreptimeLogGroupProjection.kind(field, value) + " AS k" + (index + 1));
            projections.add("COALESCE(" + value + ", '') AS v" + (index + 1));
        }
        if (request.measure() != null) { projections.add(GreptimeLogMeasurement.sample(request.measure()) + " AS sample"); }
        ctes.add("filtered AS (SELECT timestamp, " + String.join(", ", projections) + GreptimeLogAdditionalMeasurements.projections(request.additionalMeasures()) + " FROM " + table + where + ")");
        ctes.add("totals AS (SELECT COUNT(*) AS matched FROM filtered)");
        for (int level = 1; level <= size; level++) { addLevel(ctes, request, level); }
        ctes.add("leaf_total AS (SELECT COUNT(*) AS ranked_count FROM selected" + size + ")");
        if ("timeseries".equals(request.view())) { ctes.add(buckets(request, intervalMs)); }
        if (request.additionalMeasures() != null) {
            ctes.add("extras AS (SELECT " + keys(size, "f.") + GreptimeLogAdditionalMeasurements.aggregates(request.additionalMeasures())
                    + " FROM filtered f INNER JOIN selected" + size + " s ON " + join(size, "f.", "s.")
                    + " GROUP BY " + keys(size, "f.") + ")");
        }
        String selected = keys(size, "s.");
        String sql = "WITH " + String.join(", ", ctes) + " SELECT totals.matched, leaf_total.ranked_count, "
                + IntStream.rangeClosed(1, size).mapToObj(i -> "o" + i + ".overflow" + i).collect(Collectors.joining(" + "))
                + " AS was_truncated, " + selected + ", s.count" + (request.measure() == null ? "" : ", s.samples, s.measurement");
        if ("timeseries".equals(request.view())) {
            sql += ", b.bucket, b.bucket_count" + (request.measure() == null ? "" : ", b.bucket_samples, b.bucket_measurement");
        }
        sql += GreptimeLogAdditionalMeasurements.columns(request.additionalMeasures(), "e", "", false);
        if (includeOrdinals) { sql += ", " + ordinals(size, "s."); }
        sql += " FROM totals CROSS JOIN leaf_total";
        for (int i = 1; i <= size; i++) { sql += " CROSS JOIN overflow" + i + " o" + i; }
        sql += " LEFT JOIN selected" + size + " s ON true";
        if (request.additionalMeasures() != null) { sql += " LEFT JOIN extras e ON " + join(size, "s.", "e."); }
        if ("timeseries".equals(request.view())) { sql += " LEFT JOIN buckets b ON " + join(size, "s.", "b."); }
        return sql + " ORDER BY " + ordinals(size, "s.") + ("timeseries".equals(request.view()) ? ", b.bucket ASC" : "");
    }

    private static void addLevel(List<String> ctes, LogAnalysis.Request request, int level) {
        boolean measured = request.measure() != null;
        String ancestors = level == 1 ? "" : ", " + ordinals(level - 1, "p.");
        String aggregate = "aggregate" + level + " AS (SELECT " + keys(level, "f.") + ancestors + ", COUNT(*) AS count"
                + (measured ? ", COUNT(f.sample) AS samples, " + GreptimeLogMeasurement.aggregate(request.measure(), "f.sample") + " AS raw_measurement" : "")
                + " FROM filtered f" + (level == 1 ? "" : " INNER JOIN selected" + (level - 1) + " p ON " + join(level - 1, "f.", "p."))
                + " GROUP BY " + keys(level, "f.") + ancestors + " HAVING COUNT(*) >= " + request.minCount() + ")";
        ctes.add(aggregate);
        ctes.add("normalized" + level + " AS (SELECT *" + (measured ? ", "
                + GreptimeLogMeasurement.finite("raw_measurement") + " AS measurement" : "") + " FROM aggregate" + level + ")");
        String partition = level == 1 ? "" : "PARTITION BY " + keys(level - 1, "") + " ";
        String order = (measured ? "measurement" : "count") + (request.order().endsWith("-asc") ? " ASC" : " DESC")
                + " NULLS LAST, k" + level + " ASC, v" + level + " ASC";
        ctes.add("ranked" + level + " AS (SELECT *, ROW_NUMBER() OVER (" + partition + "ORDER BY " + order
                + ") AS ordinal" + level + " FROM normalized" + level + ")");
        int limit = request.grouping().dimensions().get(level - 1).limit();
        ctes.add("overflow" + level + " AS (SELECT COALESCE(MAX(CASE WHEN ordinal" + level + " > " + limit
                + " THEN 1 ELSE 0 END), 0) AS overflow" + level + " FROM ranked" + level + ")");
        // Pinned Greptime needs a bounded global sort before reusing window-ranked rows in a join.
        // This cumulative bound is redundant: the per-parent limits already bound each prefix.
        int prefixLimit = request.grouping().dimensions().subList(0, level).stream()
                .mapToInt(LogAnalysis.Dimension::limit).reduce(1, Math::multiplyExact);
        ctes.add("selected" + level + " AS (SELECT * FROM ranked" + level + " WHERE ordinal" + level + " <= " + limit
                + " ORDER BY " + ordinals(level, "") + " LIMIT " + prefixLimit + ")");
    }

    private static String buckets(LogAnalysis.Request request, long intervalMs) {
        int size = request.grouping().dimensions().size();
        return "buckets AS (SELECT " + keys(size, "f.") + ", date_bin('" + (intervalMs / 1000)
                + " seconds', f.timestamp) AS bucket, COUNT(*) AS bucket_count"
                + (request.measure() == null ? "" : ", COUNT(f.sample) AS bucket_samples, "
                + GreptimeLogMeasurement.finite(GreptimeLogMeasurement.aggregate(request.measure(), "f.sample")) + " AS bucket_measurement")
                + " FROM filtered f INNER JOIN selected" + size + " s ON " + join(size, "f.", "s.")
                + " GROUP BY " + keys(size, "f.") + ", bucket)";
    }

    private static String keys(int size, String prefix) {
        return IntStream.rangeClosed(1, size).mapToObj(i -> prefix + "k" + i + ", " + prefix + "v" + i).collect(Collectors.joining(", "));
    }

    private static String ordinals(int size, String prefix) {
        return IntStream.rangeClosed(1, size).mapToObj(i -> prefix + "ordinal" + i).collect(Collectors.joining(", "));
    }

    private static String join(int size, String left, String right) {
        return IntStream.rangeClosed(1, size).mapToObj(i -> left + "k" + i + " = " + right + "k" + i
                + " AND " + left + "v" + i + " = " + right + "v" + i).collect(Collectors.joining(" AND "));
    }
}
