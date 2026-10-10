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

package org.apache.hertzbeat.warehouse.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics;

/** Native analytics over the same authorized matching-span predicate as the trace list. */
final class GreptimeTraceAnalytics {
    private GreptimeTraceAnalytics() { }

    static TraceAnalytics.Evidence<?> query(Function<String, List<Map<String, Object>>> execute,
                                            TraceAnalytics.Scope scope, TraceAnalytics.Options options, String where) {
        try {
            String cte = selection(scope, where);
            Object data = switch (options.shape()) {
                case "histogram" -> histogram(execute, scope, options, cte);
                case "facets", "groups" -> groups(execute, scope, options, cte);
                case "spans" -> spans(execute, options, cte);
                default -> throw new IllegalArgumentException("Invalid analytics shape");
            };
            return new TraceAnalytics.Evidence<>("ready", scope.window(), scope.population(),
                    new TraceAnalytics.Coverage("window", null, null, false), data);
        } catch (RuntimeException exception) {
            return TraceAnalytics.Evidence.unavailable(scope.window(), scope.population());
        }
    }

    private static String selection(TraceAnalytics.Scope scope, String where) {
        String error = "CASE WHEN span_status_code IN ('STATUS_CODE_ERROR','ERROR') THEN 1 ELSE 0 END";
        String projection = "trace_id,span_id,parent_span_id,service_name,span_name,span_kind,"
                + "CASE WHEN duration_nano >= 0 THEN duration_nano ELSE NULL END AS duration_nanos,"
                + "CAST(timestamp AS BIGINT) AS start_nanos,"
                + "\"resource_attributes.service.namespace\" AS service_namespace,"
                + "\"resource_attributes.deployment.environment.name\" AS environment,"
                + "CASE WHEN span_status_code IN ('STATUS_CODE_ERROR','ERROR') THEN 'ERROR' "
                + "WHEN span_status_code IN ('STATUS_CODE_OK','OK') THEN 'OK' ELSE 'UNSET' END AS status,"
                + error + " AS is_error";
        return "WITH matched AS (SELECT " + projection + " FROM hzb_traces WHERE " + where + "),"
                + " marked AS (SELECT *,MIN(start_nanos) OVER (PARTITION BY trace_id) AS first_match,"
                + "MAX(is_error) OVER (PARTITION BY trace_id) AS trace_error,"
                + "ROW_NUMBER() OVER (PARTITION BY trace_id ORDER BY start_nanos,span_id) AS match_position FROM matched),"
                + " qualified AS (SELECT * FROM marked"
                + (scope.errorOnly() ? " WHERE " + ("matched_traces".equals(scope.population()) ? "trace_error" : "is_error") + " = 1" : "") + ")";
    }

    private static TraceAnalytics.Histogram histogram(Function<String, List<Map<String, Object>>> execute,
                                                       TraceAnalytics.Scope scope, TraceAnalytics.Options options, String cte) {
        long interval = Math.max(1, Math.ceilDiv(scope.window().end() - scope.window().start(), options.bucketCount()));
        int size = (int) Math.ceilDiv(scope.window().end() - scope.window().start(), interval);
        boolean traces = "matched_traces".equals(scope.population());
        String time = traces ? "first_match" : "start_nanos";
        String bucket = "CAST(LEAST(" + (size - 1) + ",FLOOR((" + time + " - "
                + Math.multiplyExact(scope.window().start(), 1_000_000L) + ") / " + (interval * 1_000_000L) + ")) AS BIGINT)";
        var rows = execute.apply(cte + " SELECT " + bucket + " AS bucket,COUNT(*) AS count,SUM("
                + (traces ? "trace_error" : "is_error") + ") AS errors FROM qualified"
                + (traces ? " WHERE match_position=1" : "") + " GROUP BY bucket ORDER BY bucket ASC");
        if (rows == null || rows.size() > size) {
            throw new IllegalArgumentException("Malformed histogram");
        }
        long[] counts = new long[size];
        long[] errors = new long[size];
        for (var row : rows) {
            int index = Math.toIntExact(number(row.get("bucket")));
            if (index >= size || counts[index] != 0) {
                throw new IllegalArgumentException("Malformed histogram bucket");
            }
            counts[index] = number(row.get("count"));
            errors[index] = number(row.get("errors"));
            if (errors[index] > counts[index] || counts[index] == 0) {
                throw new IllegalArgumentException("Malformed histogram counts");
            }
        }
        long total = 0;
        long errorTotal = 0;
        var buckets = new ArrayList<TraceAnalytics.Bucket>();
        for (int index = 0; index < size; index++) {
            long start = scope.window().start() + index * interval;
            buckets.add(new TraceAnalytics.Bucket(start, Math.min(scope.window().end(), start + interval),
                    index < size - 1 || scope.window().endExclusive(), counts[index], errors[index]));
            total = Math.addExact(total, counts[index]);
            errorTotal = Math.addExact(errorTotal, errors[index]);
        }
        return new TraceAnalytics.Histogram(total, errorTotal, interval, List.copyOf(buckets));
    }

    private static Object groups(Function<String, List<Map<String, Object>>> execute, TraceAnalytics.Scope scope,
                                   TraceAnalytics.Options options, String cte) {
        boolean traces = "matched_traces".equals(scope.population());
        String field = switch (TraceAnalytics.field(options.field())) {
            case "serviceName" -> "service_name";
            case "operationName" -> "span_name";
            default -> "environment";
        };
        String member = traces ? "trace_id" : "trace_id || ':' || span_id";
        String membership = traces ? "multiple" : "single";
        String totals = "SELECT " + (traces ? "COUNT(DISTINCT trace_id)" : "COUNT(*)") + " AS total FROM qualified";
        String entries = "SELECT " + (traces ? "DISTINCT " : "") + member + " AS member_id," + field + " AS value,"
                + (traces ? "trace_error" : "is_error") + " AS is_error FROM qualified";
        String order = "CASE WHEN value IS NULL THEN 1 ELSE 0 END ASC,"
                + ("error-count-desc".equals(options.sort()) ? "errors DESC," : "") + "count DESC,value ASC";
        boolean facets = "facets".equals(options.shape());
        String sql = cte + ", memberships AS (" + entries + "), totals AS (" + totals + "),"
                + " missing AS (SELECT COUNT(*) AS missing_count FROM memberships WHERE value IS NULL),"
                + " ranked AS (SELECT value,COUNT(*) AS count,SUM(is_error) AS errors FROM memberships"
                + (facets ? " WHERE value IS NOT NULL" : "") + " GROUP BY value ORDER BY " + order
                + " LIMIT " + (options.limit() + 1) + ") SELECT totals.total,missing.missing_count,ranked.value,ranked.count,ranked.errors"
                + " FROM totals CROSS JOIN missing LEFT JOIN ranked ON true ORDER BY " + order + " LIMIT " + (options.limit() + 1);
        var rows = execute.apply(sql);
        if (rows == null || rows.isEmpty() || rows.size() > options.limit() + 1) {
            throw new IllegalArgumentException("Malformed trace groups");
        }
        long total = number(rows.getFirst().get("total"));
        long missing = number(rows.getFirst().get("missing_count"));
        if (missing > total) {
            throw new IllegalArgumentException("Malformed missing count");
        }
        var values = new ArrayList<TraceAnalytics.Value>();
        for (var row : rows) {
            if (number(row.get("total")) != total || number(row.get("missing_count")) != missing) {
                throw new IllegalArgumentException("Inconsistent group totals");
            }
            if (row.get("count") == null) {
                continue;
            }
            long count = number(row.get("count"));
            long errors = number(row.get("errors"));
            if (count == 0 || count > total || errors > count) {
                throw new IllegalArgumentException("Malformed group count");
            }
            values.add(new TraceAnalytics.Value(text(row.get("value")), count, errors));
        }
        boolean truncated = values.size() > options.limit();
        var limited = List.copyOf(values.subList(0, Math.min(values.size(), options.limit())));
        return facets ? new TraceAnalytics.Facets(options.field(), total, missing, membership, limited, truncated)
                : new TraceAnalytics.Groups(options.field(), total, membership, options.sort(), limited, truncated);
    }

    private static TraceAnalytics.SpanPage spans(Function<String, List<Map<String, Object>>> execute,
                                                 TraceAnalytics.Options options, String cte) {
        String order = switch (options.sort()) {
            case "oldest" -> "start_nanos ASC";
            case "duration_desc" -> "duration_nanos DESC NULLS LAST,start_nanos DESC";
            default -> "start_nanos DESC";
        };
        var rows = execute.apply(cte + " SELECT *,COUNT(*) OVER () AS total FROM qualified ORDER BY " + order
                + ",trace_id ASC,span_id ASC LIMIT " + options.pageSize() + " OFFSET " + ((long) options.pageIndex() * options.pageSize()));
        if (rows == null || rows.size() > options.pageSize()) {
            throw new IllegalArgumentException("Malformed span page");
        }
        long total;
        if (rows.isEmpty()) {
            var counts = execute.apply(cte + " SELECT COUNT(*) AS total FROM qualified");
            if (counts == null || counts.size() != 1) {
                throw new IllegalArgumentException("Malformed span total");
            }
            total = number(counts.getFirst().get("total"));
        } else {
            total = number(rows.getFirst().get("total"));
        }
        long offset = (long) options.pageIndex() * options.pageSize();
        if (rows.isEmpty() && total > offset || !rows.isEmpty() && total < offset + rows.size()) {
            throw new IllegalArgumentException("Inconsistent span page coverage");
        }
        var result = new ArrayList<TraceAnalytics.SpanRow>();
        for (var row : rows) {
            if (number(row.get("total")) != total) {
                throw new IllegalArgumentException("Inconsistent span total");
            }
            String trace = identifier(row.get("trace_id"), 32);
            String span = identifier(row.get("span_id"), 16);
            result.add(new TraceAnalytics.SpanRow(trace, span, text(row.get("parent_span_id")), text(row.get("service_name")),
                    text(row.get("service_namespace")), text(row.get("environment")), text(row.get("span_name")),
                    text(row.get("span_kind")), text(row.get("status")), Long.toString(number(row.get("start_nanos"))),
                    row.get("duration_nanos") == null ? null : Long.toString(number(row.get("duration_nanos")))));
        }
        return new TraceAnalytics.SpanPage(List.copyOf(result), total, options.pageIndex(), options.pageSize(), options.sort());
    }

    private static long number(Object raw) {
        if (raw == null || !raw.toString().matches("[0-9]+")) {
            throw new IllegalArgumentException("Malformed trace aggregate");
        }
        return Long.parseLong(raw.toString());
    }

    private static String identifier(Object raw, int length) {
        String value = text(raw);
        if (value == null || value.equals("0".repeat(length)) || !value.matches("[0-9a-f]{" + length + "}")) {
            throw new IllegalArgumentException("Malformed span identity");
        }
        return value;
    }

    private static String text(Object value) {
        return value == null ? null : value.toString();
    }
}
