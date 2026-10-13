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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.log.LogCalculated;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogTrendBucket;
import org.apache.hertzbeat.common.observability.query.LogCalculatedFormula;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;

/** Terminal trend and facet queries over the same calculated population as the page. */
final class GreptimeLogCalculatedAggregate {
    private GreptimeLogCalculatedAggregate() { }

    static LogCalculated.TrendResult trend(GreptimeSqlQueryExecutor executor, LogCalculated.Query query, String where) {
        String statement = trendSql(query, where, "hertzbeat_logs");
        try { return trend(executor.executeStrict(statement), query); }
        catch (LogCalculatedFormula.ValidationException budget) { throw budget; }
        catch (RuntimeException failure) { throw unavailableOrPattern(failure); }
    }

    static LogCalculated.FacetResult facet(GreptimeSqlQueryExecutor executor, LogCalculated.Query query, String where) {
        String statement = facetSql(query, where, "hertzbeat_logs");
        try { return facet(executor.executeStrict(statement), query); }
        catch (LogCalculatedFormula.ValidationException budget) { throw budget; }
        catch (RuntimeException failure) { throw unavailableOrPattern(failure); }
    }

    static String trendSql(LogCalculated.Query query, String where, String table) {
        var projected = GreptimeLogCalculatedPage.projection(query, where, table);
        String gate = projected.guarded() ? "admission.admitted, " : "";
        String from = projected.guarded() ? "admission CROSS JOIN totals" : "totals";
        long interval = ((LogCalculated.Trend) query.operation()).intervalMs();
        return "WITH " + projected.ctes()
                + ", totals AS (SELECT COUNT(*) AS matching_total FROM filtered)"
                + ", buckets AS (SELECT date_bin('" + (interval / 1000)
                + " seconds', timestamp) AS bucket, COUNT(*) AS bucket_count FROM filtered GROUP BY bucket)"
                + " SELECT " + gate + "totals.matching_total, buckets.bucket, buckets.bucket_count"
                + " FROM " + from + " LEFT JOIN buckets ON true ORDER BY buckets.bucket ASC";
    }

    static String facetSql(LogCalculated.Query query, String where, String table) {
        var projected = GreptimeLogCalculatedPage.projection(query, where, table);
        String gate = projected.guarded() ? "admission.admitted, " : "";
        String from = projected.guarded() ? "admission CROSS JOIN totals" : "totals";
        var operation = (LogCalculated.Facet) query.operation();
        String value = operation.field().startsWith("calculated:")
                ? projected.columns().get(operation.field().substring("calculated:".length()))
                : GreptimeLogFacets.expression(LogFacets.Field.parse(operation.field()));
        if (value == null) { throw new IllegalArgumentException("Unknown calculated facet"); }
        String lookup = operation.valueSearch() == null ? "" : " AND strpos(lower(facet_value), lower('"
                + operation.valueSearch().replace("'", "''") + "')) > 0";
        return "WITH " + projected.ctes()
                + ", facet_rows AS (SELECT " + value + " AS facet_value FROM filtered)"
                + ", totals AS (SELECT COUNT(*) AS matching_total, COUNT(*) - COUNT(facet_value)"
                + " AS missing_or_null_count FROM facet_rows)"
                + ", searched AS (SELECT facet_value FROM facet_rows WHERE facet_value IS NOT NULL" + lookup + ")"
                + ", search_totals AS (SELECT COUNT(*) AS searched_count FROM searched)"
                + ", ranked_values AS (SELECT facet_value AS value, COUNT(*) AS count,"
                + " ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, facet_value ASC) AS facet_rank FROM searched"
                + " GROUP BY facet_value)"
                + ", top_values AS (SELECT value, count, facet_rank FROM ranked_values WHERE facet_rank <= "
                + (operation.limit() + 1) + ")"
                + " SELECT " + gate + "totals.matching_total, totals.missing_or_null_count, search_totals.searched_count,"
                + " top_values.value, top_values.count FROM " + from + " CROSS JOIN search_totals"
                + " LEFT JOIN top_values ON top_values.facet_rank <= " + (operation.limit() + 1)
                + " ORDER BY top_values.count DESC, top_values.value ASC";
    }

    static LogCalculated.TrendResult trend(List<Map<String, Object>> rows, LogCalculated.Query query) {
        GreptimeLogCalculatedAdmission.check(rows, query);
        var window = query.scope().window();
        long interval = ((LogCalculated.Trend) query.operation()).intervalMs();
        if (rows == null || rows.isEmpty() || rows.size() > 60) { throw new IllegalArgumentException("Invalid calculated trend"); }
        long total = count(rows.getFirst(), "matching_total");
        var counts = new java.util.HashMap<Long, Long>();
        long observed = 0;
        for (var row : rows) {
            if (count(row, "matching_total") != total) { throw new IllegalArgumentException("Inconsistent trend total"); }
            if (row.get("bucket") == null) { continue; }
            Long bucket = GreptimeDbDataStorage.timestampMillis(row.get("bucket"));
            long value = count(row, "bucket_count");
            if (bucket == null || bucket % interval != 0 || counts.putIfAbsent(bucket, value) != null) {
                throw new IllegalArgumentException("Invalid trend bucket");
            }
            observed = Math.addExact(observed, value);
        }
        var result = new ArrayList<LogTrendBucket>();
        long first = Math.floorDiv(window.start(), interval) * interval;
        long last = Math.floorDiv(window.end(), interval) * interval;
        for (long start = first; start <= last; start += interval) {
            result.add(new LogTrendBucket(start, counts.getOrDefault(start, 0L)));
        }
        if (observed != total || counts.keySet().stream().anyMatch(start -> start < first || start > last)) {
            throw new IllegalArgumentException("Incomplete trend");
        }
        return new LogCalculated.TrendResult(total, List.copyOf(result));
    }

    static LogCalculated.FacetResult facet(List<Map<String, Object>> rows, LogCalculated.Query query) {
        GreptimeLogCalculatedAdmission.check(rows, query);
        var operation = (LogCalculated.Facet) query.operation();
        if (rows == null || rows.isEmpty() || rows.size() > operation.limit() + 1) {
            throw new IllegalArgumentException("Invalid calculated facet");
        }
        long total = count(rows.getFirst(), "matching_total");
        long missing = count(rows.getFirst(), "missing_or_null_count");
        long searched = count(rows.getFirst(), "searched_count");
        if (missing > total || searched > total - missing) { throw new IllegalArgumentException("Invalid facet totals"); }
        String type = operation.field().startsWith("calculated:")
                ? query.definitions().outputType(operation.field().substring("calculated:".length())) : "string";
        var values = new ArrayList<LogCalculated.FacetValue>();
        var seen = new HashSet<Object>();
        long observed = 0;
        for (var row : rows) {
            if (count(row, "matching_total") != total || count(row, "missing_or_null_count") != missing
                    || count(row, "searched_count") != searched) { throw new IllegalArgumentException("Inconsistent facet totals"); }
            if (row.get("value") == null && row.get("count") == null) { continue; }
            Object value = switch (type) {
                case "number" -> finiteNumber(row.get("value"));
                case "string" -> row.get("value") instanceof String text ? text : null;
                case "boolean" -> row.get("value") instanceof Boolean bool ? bool : null;
                default -> null;
            };
            long count = count(row, "count");
            if (value == null || count == 0 || !seen.add(value)) { throw new IllegalArgumentException("Invalid facet value"); }
            observed = Math.addExact(observed, count);
            values.add(new LogCalculated.FacetValue(value, count));
        }
        if (observed > searched || values.size() <= operation.limit() && observed != searched) {
            throw new IllegalArgumentException("Inconsistent facet population");
        }
        boolean truncated = values.size() > operation.limit();
        return new LogCalculated.FacetResult(total, missing,
                List.copyOf(values.subList(0, Math.min(operation.limit(), values.size()))), truncated,
                operation.valueSearch() == null ? null : searched);
    }

    private static long count(Map<String, Object> row, String key) {
        Object raw = row.get(key);
        if (raw == null || !raw.toString().matches("[0-9]+")) { throw new IllegalArgumentException("Invalid calculated count"); }
        return Long.parseLong(raw.toString());
    }

    private static Double finiteNumber(Object raw) {
        if (raw == null) { return null; }
        double value = Double.parseDouble(raw.toString());
        if (!Double.isFinite(value)) { throw new IllegalArgumentException("Invalid numeric facet value"); }
        return value;
    }

    private static RuntimeException unavailableOrPattern(RuntimeException failure) {
        if (GreptimeLogCalculatedPreview.nativePatternError(failure)) {
            return new LogCalculatedFormula.ValidationException("invalid_pattern", "calculatedFields");
        }
        return new TelemetryStorageUnavailableException();
    }
}
