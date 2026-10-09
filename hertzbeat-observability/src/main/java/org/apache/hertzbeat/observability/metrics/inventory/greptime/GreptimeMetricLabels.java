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

package org.apache.hertzbeat.observability.metrics.inventory.greptime;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.observability.metrics.inventory.MetricInventoryRepository.Labels;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;

/** SQL translation of trusted, already normalized console matchers. */
final class GreptimeMetricLabels {
    private static final Pattern IDENTIFIER = Pattern.compile("[A-Za-z_][A-Za-z0-9_]*");
    private static final Pattern MATCHER = Pattern.compile("([A-Za-z_][A-Za-z0-9_]*)(=~|!~|!=|=)(\".*\")");
    private static final Set<String> HIDDEN = Set.of("hertzbeat_workspace_id", "hertzbeat_entity_id",
            "hertzbeat_entity_type", "hertzbeat_entity_name", "hertzbeat_collector_id");

    private GreptimeMetricLabels() {
    }

    static Labels query(GreptimeSqlQueryExecutor executor, String metric, List<String> matchers,
                        long start, long end, String label, int limit) {
        if (!metric.matches("[A-Za-z_:][A-Za-z0-9_:]*") || limit < 1 || limit > 100
                || start <= 0 || end <= start || end - start > 86_400_000L
                || matchers.stream().noneMatch(value -> value.startsWith("hertzbeat_workspace_id=\""))) {
            return unavailable();
        }
        var rows = executor.executeStrict("SELECT column_name FROM information_schema.columns"
                + " WHERE table_catalog = 'greptime' AND table_schema = current_schema()"
                + " AND table_name = '" + metric + "' AND semantic_type = 'TAG' ORDER BY column_name LIMIT 129");
        if (rows.size() > 128) {
            return new Labels("scope_too_large", false, List.of());
        }
        List<String> columns = rows.stream().map(row -> row.get("column_name"))
                .filter(String.class::isInstance).map(String.class::cast)
                .filter(value -> IDENTIFIER.matcher(value).matches()).filter(value -> !HIDDEN.contains(value)).toList();
        if (label != null && !columns.contains(label)) {
            return new Labels("ready", false, List.of());
        }
        if (columns.isEmpty()) {
            return new Labels("ready", false, List.of());
        }
        String where = where(matchers, start, end);
        if (label != null) {
            var values = executor.executeStrict("SELECT DISTINCT \"" + label + "\" AS value FROM \"" + metric
                    + "\" WHERE " + where + " AND \"" + label + "\" IS NOT NULL ORDER BY value LIMIT " + (limit + 1));
            var items = values.stream().map(row -> row.get("value")).filter(String.class::isInstance)
                    .map(String.class::cast).limit(limit).toList();
            return new Labels("ready", values.size() > limit, items);
        }
        String presence = columns.stream().map(column -> "MAX(CASE WHEN \"" + column
                + "\" IS NOT NULL THEN 1 ELSE 0 END) AS \"" + column + "\"")
                .collect(java.util.stream.Collectors.joining(","));
        var counts = executor.executeStrict("SELECT " + presence + " FROM \"" + metric + "\" WHERE " + where);
        var items = columns.stream().filter(column -> !counts.isEmpty()
                && counts.getFirst().get(column) instanceof Number number && number.intValue() > 0).toList();
        return new Labels("ready", items.size() > limit, items.stream().limit(limit).toList());
    }

    private static String where(List<String> matchers, long start, long end) {
        List<String> predicates = new ArrayList<>();
        predicates.add("greptime_timestamp >= to_timestamp_millis(" + start + ")");
        predicates.add("greptime_timestamp <= to_timestamp_millis(" + end + ")");
        for (String text : matchers) {
            var matcher = MATCHER.matcher(text);
            if (!matcher.matches()) {
                throw new IllegalArgumentException("Invalid canonical metric matcher");
            }
            if ("__name__".equals(matcher.group(1))) {
                continue;
            }
            String value = JsonUtil.fromJson(matcher.group(3), String.class).replace("'", "''");
            String column = "COALESCE(\"" + matcher.group(1) + "\", '')";
            String operator = matcher.group(2);
            predicates.add(switch (operator) {
                case "=~" -> "regexp_like(" + column + ", '^(?:" + value + ")$')";
                case "!~" -> "NOT regexp_like(" + column + ", '^(?:" + value + ")$')";
                case "!=" -> column + " <> '" + value + "'";
                default -> column + " = '" + value + "'";
            });
        }
        return String.join(" AND ", predicates);
    }

    private static Labels unavailable() {
        return new Labels("unavailable", false, List.of());
    }
}
