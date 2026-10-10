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
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;

/** Bounded facet result mapping over the shared, authorized history predicate. */
final class GreptimeLogFacets {
    private GreptimeLogFacets() { }

    static LogFacets.Values values(GreptimeSqlQueryExecutor executor, LogFacets.Scope scope,
                                    LogFacets.Field field, int limit, String where) {
        return values(executor, scope, field, limit, where, null);
    }

    static LogFacets.Values values(GreptimeSqlQueryExecutor executor, LogFacets.Scope scope,
                                  LogFacets.Field field, int limit, String where, String valueSearch) {
        String query = LogFacets.normalizeValueSearch(valueSearch);
        if (limit < 1 || limit > 100) {
            throw new IllegalArgumentException("Invalid facet limit");
        }
        try {
            String lookup = query == null ? "" : " AND strpos(lower(facet_value), lower('" + query.replace("'", "''") + "')) > 0";
            String sql = "WITH filtered AS (SELECT " + expression(field) + " AS facet_value FROM hertzbeat_logs"
                    + where + "), totals AS (SELECT COUNT(*) AS matched, COUNT(*) - COUNT(facet_value) AS missing FROM filtered),"
                    + " searched AS (SELECT facet_value FROM filtered WHERE facet_value IS NOT NULL" + lookup + "),"
                    + " search_totals AS (" + (query == null ? "SELECT matched - missing AS searched FROM totals"
                    : "SELECT COUNT(*) AS searched FROM searched") + "),"
                    + " top_values AS (SELECT facet_value AS value, COUNT(*) AS count FROM searched"
                    + " GROUP BY facet_value ORDER BY count DESC, value ASC LIMIT " + (limit + 1) + ")"
                    + " SELECT totals.matched, totals.missing, search_totals.searched, top_values.value, top_values.count FROM totals CROSS JOIN search_totals"
                    + " LEFT JOIN top_values ON true ORDER BY top_values.count DESC, top_values.value ASC";
            var rows = executor.executeStrict(sql);
            if (rows == null || rows.isEmpty() || rows.size() > limit + 1) {
                return LogFacets.Values.unavailable(scope.window(), field, query);
            }
            long matched = number(rows.getFirst().get("matched"));
            long missing = number(rows.getFirst().get("missing"));
            if (missing > matched) {
                throw new IllegalArgumentException("Invalid facet aggregate");
            }
            long searched = query == null ? matched - missing : number(rows.getFirst().get("searched"));
            if (searched > matched - missing) {
                throw new IllegalArgumentException("Invalid facet search total");
            }
            List<LogFacets.Value> values = new ArrayList<>();
            long observed = 0;
            for (var row : rows) {
                if (number(row.get("matched")) != matched || number(row.get("missing")) != missing
                        || (query != null && number(row.get("searched")) != searched)) {
                    throw new IllegalArgumentException("Inconsistent facet totals");
                }
                if (row.get("value") == null && row.get("count") == null) {
                    continue;
                }
                if (!(row.get("value") instanceof String value)) {
                    throw new IllegalArgumentException("Invalid facet value");
                }
                long count = number(row.get("count"));
                if (count <= 0 || values.stream().anyMatch(item -> item.value().equals(value))) {
                    throw new IllegalArgumentException("Invalid facet count");
                }
                observed = Math.addExact(observed, count);
                values.add(new LogFacets.Value(value, count));
            }
            if (observed > searched || (values.size() <= limit && observed != searched)) {
                throw new IllegalArgumentException("Inconsistent facet count");
            }
            boolean truncated = values.size() > limit;
            // Preserve the native ORDER BY, including Unicode ordering, before removing the N+1 sentinel.
            return new LogFacets.Values("ready", scope.window(), field, new LogFacets.FullCoverage("full_window"),
                    matched, missing, List.copyOf(values.subList(0, Math.min(limit, values.size()))), truncated,
                    query == null ? null : new LogFacets.Search(query, searched));
        } catch (RuntimeException exception) {
            return LogFacets.Values.unavailable(scope.window(), field, query);
        }
    }

    static LogFacets.Fields fields(GreptimeSqlQueryExecutor executor, LogFacets.Scope scope, String where) {
        try {
            var rows = executor.executeStrict("SELECT json_to_string(resource_attributes) AS resource_json, "
                    + "json_to_string(log_attributes) AS attribute_json FROM hertzbeat_logs" + where
                    + " ORDER BY timestamp DESC, log_record_uid DESC LIMIT " + (LogFacets.ROW_LIMIT + 1));
            if (rows == null || rows.size() > LogFacets.ROW_LIMIT + 1) {
                return LogFacets.Fields.unavailable(scope.window());
            }
            Map<String, LogFacets.Field> fields = new LinkedHashMap<>();
            LogFacets.builtins().forEach(field -> fields.put(field.id(), field));
            int scanned = Math.min(LogFacets.ROW_LIMIT, rows.size());
            for (var row : rows.subList(0, scanned)) {
                discover(fields, "resource", row.get("resource_json"));
                discover(fields, "attribute", row.get("attribute_json"));
            }
            var sorted = fields.values().stream().sorted(Comparator.comparing((LogFacets.Field field) -> !"builtin".equals(field.source()))
                    .thenComparing(LogFacets.Field::source).thenComparing(LogFacets.Field::key)).limit(LogFacets.FIELD_LIMIT).toList();
            return new LogFacets.Fields("ready", scope.window(),
                    new LogFacets.BoundedCoverage("bounded_rows", LogFacets.ROW_LIMIT, scanned, rows.size() > scanned),
                    sorted, fields.size() > LogFacets.FIELD_LIMIT);
        } catch (RuntimeException exception) {
            return LogFacets.Fields.unavailable(scope.window());
        }
    }

    private static void discover(Map<String, LogFacets.Field> fields, String source, Object json) {
        if (json == null) {
            return;
        }
        Map<?, ?> object = GreptimeNativeLogJson.decode(json);
        if (object == null) {
            throw new IllegalArgumentException("Malformed log attributes");
        }
        for (var entry : object.entrySet()) {
            String key = String.valueOf(entry.getKey());
            if (key.length() <= 256 && key.matches("[A-Za-z0-9_.:-]+")) {
                var field = LogFacets.Field.parse(source + ":" + key);
                boolean scalar = entry.getValue() instanceof String || entry.getValue() instanceof Number
                        || entry.getValue() instanceof Boolean;
                var previous = fields.get(field.id());
                fields.put(field.id(), new LogFacets.Field(field.id(), field.source(), field.key(),
                        scalar || (previous != null && Boolean.TRUE.equals(previous.scalar()))));
            }
        }
    }

    private static long number(Object raw) {
        if (raw == null || !String.valueOf(raw).matches("[0-9]+")) {
            throw new IllegalArgumentException("Invalid facet aggregate");
        }
        return Long.parseLong(String.valueOf(raw));
    }

    static String expression(LogFacets.Field field) {
        field = LogFacets.Field.parse(field.id());
        if (!"builtin".equals(field.source())) {
            String column = "resource".equals(field.source()) ? "resource_attributes" : "log_attributes";
            return "json_get_string(" + column + ", '$[\"" + field.key() + "\"]')";
        }
        return switch (field.key()) {
            case "serviceName" -> "service_name";
            case "environment" -> "json_get_string(resource_attributes, '$[\"deployment.environment.name\"]')";
            case "severityCategory" -> "CASE WHEN severity_number BETWEEN 1 AND 4 THEN 'TRACE'"
                    + " WHEN severity_number BETWEEN 5 AND 8 THEN 'DEBUG' WHEN severity_number BETWEEN 9 AND 12 THEN 'INFO'"
                    + " WHEN severity_number BETWEEN 13 AND 16 THEN 'WARN' WHEN severity_number BETWEEN 17 AND 20 THEN 'ERROR'"
                    + " WHEN severity_number BETWEEN 21 AND 24 THEN 'FATAL' ELSE NULL END";
            default -> throw new IllegalArgumentException("Invalid builtin field");
        };
    }
}
