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
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogCalculated;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.query.LogCalculatedFormula;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;

/** Prefix-bounded grouped analysis on the shared projected log population. */
final class GreptimeLogCalculatedAnalysis {
    private GreptimeLogCalculatedAnalysis() { }

    static LogCalculated.AnalysisResult read(GreptimeSqlQueryExecutor executor, LogCalculated.Query query, String where) {
        String statement = sql(query, where, "hertzbeat_logs");
        try { return GreptimeLogCalculatedAnalysisRows.map(executor.executeStrict(statement), query); }
        catch (LogCalculatedFormula.ValidationException budget) { throw budget; }
        catch (RuntimeException failure) {
            if (GreptimeLogCalculatedPreview.nativePatternError(failure)) {
                throw new LogCalculatedFormula.ValidationException("invalid_pattern", "calculatedFields");
            }
            throw new TelemetryStorageUnavailableException();
        }
    }

    static String sql(LogCalculated.Query query, String where, String table) {
        var operation = (LogCalculated.Analysis) query.operation();
        var projection = GreptimeLogCalculatedPage.projection(query, where, table);
        String gate = projection.guarded() ? "admission.admitted, " : "";
        String from = projection.guarded() ? "admission CROSS JOIN totals" : "totals";
        int size = operation.grouping().size();
        boolean measured = operation.measure() != null;
        var ctes = new ArrayList<String>();
        ctes.add(projection.ctes());
        ctes.add(prepared(operation, projection.columns(), projection.types()));
        ctes.add("totals AS (SELECT COUNT(*) AS matched FROM prepared)");
        if (size == 0) { global(ctes, operation); }
        else {
            for (int level = 1; level <= size; level++) { level(ctes, operation, level); }
            ctes.add("leaf AS (SELECT * FROM selected" + size + ")");
        }
        String order = rankOrder(operation, size, "");
        ctes.add("ranked_final AS (SELECT *, ROW_NUMBER() OVER (ORDER BY " + order
                + ") AS final_ordinal FROM leaf)");
        ctes.add("ranked_total AS (SELECT COUNT(*) AS ranked_count FROM ranked_final)");
        ctes.add("selected AS (SELECT * FROM ranked_final WHERE final_ordinal <= " + operation.limit()
                + " ORDER BY final_ordinal LIMIT " + operation.limit() + ")");
        if ("timeseries".equals(operation.view())) { ctes.add(buckets(operation)); }
        String overflow = size == 0 ? "0" : IntStream.rangeClosed(1, size)
                .mapToObj(i -> "o" + i + ".overflow" + i).collect(Collectors.joining(" + "));
        String select = " SELECT " + gate + "totals.matched, ranked_total.ranked_count, " + overflow + " AS prefix_overflow"
                + (size == 0 ? "" : ", " + keys(size, "s.")) + ", s.final_ordinal, s.group_count"
                + (measured ? ", s.samples, s.measurement" : "")
                + ("timeseries".equals(operation.view()) ? ", b.bucket, b.bucket_count"
                        + (measured ? ", b.bucket_samples, b.bucket_measurement" : "") : "");
        String joins = " FROM " + from + " CROSS JOIN ranked_total";
        for (int i = 1; i <= size; i++) { joins += " CROSS JOIN overflow" + i + " o" + i; }
        joins += " LEFT JOIN selected s ON true";
        if ("timeseries".equals(operation.view())) {
            joins += " LEFT JOIN buckets b ON " + join(size, "s.", "b.");
        }
        return "WITH " + String.join(", ", ctes) + select + joins
                + " ORDER BY s.final_ordinal ASC" + ("timeseries".equals(operation.view()) ? ", b.bucket ASC" : "");
    }

    private static String prepared(LogCalculated.Analysis operation, Map<String, String> columns,
                                   Map<String, String> types) {
        var projections = new ArrayList<String>();
        projections.add("timestamp");
        for (int i = 0; i < operation.grouping().size(); i++) {
            String field = operation.grouping().get(i).field();
            String expression = value(field, columns);
            String type = field.startsWith("calculated:") ? types.get(field.substring("calculated:".length())) : "string";
            projections.add("CASE WHEN " + expression + " IS NULL THEN 'null' ELSE 'value' END AS k" + (i + 1));
            String fallback = switch (type) {
                case "number" -> "0";
                case "boolean" -> "FALSE";
                default -> "''";
            };
            projections.add("COALESCE(" + expression + ", " + fallback + ") AS v" + (i + 1));
        }
        if (operation.measure() != null) {
            String field = operation.measure().field();
            String sample = field.startsWith("calculated:") ? value(field, columns)
                    : GreptimeLogMeasurement.sample(new LogAnalysis.Measure(operation.measure().function(), field));
            projections.add(sample + " AS sample");
        }
        return "prepared AS (SELECT " + String.join(", ", projections) + " FROM filtered)";
    }

    private static void global(List<String> ctes, LogCalculated.Analysis operation) {
        boolean measured = operation.measure() != null;
        ctes.add("aggregated AS (SELECT COUNT(*) AS group_count" + aggregate(operation, "sample")
                + " FROM prepared HAVING COUNT(*) >= " + operation.minCount() + ")");
        ctes.add("leaf AS (SELECT *" + normalized(measured) + " FROM aggregated)");
    }

    private static void level(List<String> ctes, LogCalculated.Analysis operation, int level) {
        boolean measured = operation.measure() != null;
        String ancestors = level == 1 ? "" : ", " + ordinals(level - 1, "p.");
        ctes.add("aggregate" + level + " AS (SELECT " + keys(level, "f.") + ancestors
                + ", COUNT(*) AS group_count" + aggregate(operation, "f.sample")
                + " FROM prepared f" + (level == 1 ? "" : " INNER JOIN selected" + (level - 1)
                        + " p ON " + join(level - 1, "f.", "p."))
                + " GROUP BY " + keys(level, "f.") + ancestors
                + " HAVING COUNT(*) >= " + operation.minCount() + ")");
        ctes.add("normalized" + level + " AS (SELECT *" + normalized(measured)
                + " FROM aggregate" + level + ")");
        String partition = level == 1 ? "" : "PARTITION BY " + keys(level - 1, "") + " ";
        ctes.add("ranked" + level + " AS (SELECT *, ROW_NUMBER() OVER (" + partition
                + "ORDER BY " + rankOrder(operation, level, "") + ") AS ordinal" + level
                + " FROM normalized" + level + ")");
        int limit = operation.grouping().get(level - 1).limit();
        ctes.add("overflow" + level + " AS (SELECT COALESCE(MAX(CASE WHEN ordinal" + level + " > "
                + limit + " THEN 1 ELSE 0 END), 0) AS overflow" + level + " FROM ranked" + level + ")");
        int bound = operation.grouping().subList(0, level).stream()
                .mapToInt(LogCalculated.Dimension::limit).reduce(1, Math::multiplyExact);
        ctes.add("selected" + level + " AS (SELECT * FROM ranked" + level + " WHERE ordinal" + level
                + " <= " + limit + " ORDER BY " + ordinals(level, "") + " LIMIT " + bound + ")");
    }

    private static String buckets(LogCalculated.Analysis operation) {
        int size = operation.grouping().size();
        String grouping = size == 0 ? "" : keys(size, "f.") + ", ";
        String selected = size == 0 ? "true" : join(size, "f.", "s.");
        String bucket = "date_bin('" + (operation.intervalMs() / 1000) + " seconds', f.timestamp)";
        String count = "COUNT(*) AS bucket_count";
        String measurement = operation.measure() == null ? "" : ", COUNT(f.sample) AS bucket_samples, "
                + "CASE WHEN COUNT(f.sample)=0 THEN NULL ELSE "
                + GreptimeLogMeasurement.finite(GreptimeLogMeasurement.aggregate(operation.measure().function(), "f.sample"))
                + " END AS bucket_measurement";
        return "buckets AS (SELECT " + grouping + bucket + " AS bucket, " + count + measurement
                + " FROM prepared f INNER JOIN selected s ON " + selected
                + " GROUP BY " + grouping + "bucket)";
    }

    private static String aggregate(LogCalculated.Analysis operation, String sample) {
        if (operation.measure() == null) { return ""; }
        return ", COUNT(" + sample + ") AS samples, "
                + GreptimeLogMeasurement.aggregate(operation.measure().function(), sample) + " AS raw_measurement";
    }

    private static String normalized(boolean measured) {
        return measured ? ", CASE WHEN samples=0 THEN NULL ELSE "
                + GreptimeLogMeasurement.finite("raw_measurement") + " END AS measurement" : "";
    }

    private static String rankOrder(LogCalculated.Analysis operation, int size, String prefix) {
        String score = operation.measure() == null ? "group_count" : "measurement";
        String direction = operation.order().endsWith("-asc") ? "ASC" : "DESC";
        String keys = size == 0 ? "" : ", " + IntStream.rangeClosed(1, size)
                .mapToObj(i -> prefix + "k" + i + " ASC, " + prefix + "v" + i + " ASC")
                .collect(Collectors.joining(", "));
        return prefix + score + " " + direction + " NULLS LAST" + keys;
    }

    private static String value(String field, Map<String, String> columns) {
        if (field.startsWith("calculated:")) {
            String value = columns.get(field.substring("calculated:".length()));
            if (value == null) { throw new IllegalArgumentException("Unknown calculated analysis field"); }
            return value;
        }
        return GreptimeLogFacets.expression(LogFacets.Field.parse(field));
    }

    private static String keys(int size, String prefix) {
        return IntStream.rangeClosed(1, size).mapToObj(i -> prefix + "k" + i + ", " + prefix + "v" + i)
                .collect(Collectors.joining(", "));
    }

    private static String ordinals(int size, String prefix) {
        return IntStream.rangeClosed(1, size).mapToObj(i -> prefix + "ordinal" + i)
                .collect(Collectors.joining(", "));
    }

    private static String join(int size, String left, String right) {
        return size == 0 ? "true" : IntStream.rangeClosed(1, size)
                .mapToObj(i -> left + "k" + i + " = " + right + "k" + i
                        + " AND " + left + "v" + i + " = " + right + "v" + i)
                .collect(Collectors.joining(" AND "));
    }
}
