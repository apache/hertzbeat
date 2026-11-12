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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Source-specific helper metadata; never proof of external health, ingestion, or action execution.
 */
final class AgentApplicationHelperReadSemantics {
    static boolean supports(String tool) {
        return Set.of(
                        "action_catalog.list",
                        "platform.i18n_resources",
                        "grafana.dashboard_get",
                        "monitor.app_summary",
                        "metrics.datasource_catalog",
                        "alert_rule.datasource_status",
                        "metrics.query_native")
                .contains(tool);
    }

    AgentReadObservationClassifier.Observation classify(
            AgentRuntimeToolCall call, Map<String, Object> data) {
        try {
            return switch (call.getToolName()) {
                case "action_catalog.list" -> catalog(call.getArguments(), data);
                case "platform.i18n_resources" -> labels(call.getArguments(), data);
                case "grafana.dashboard_get" -> grafana(call.getArguments(), data);
                case "monitor.app_summary" -> summary(call.getArguments(), data);
                case "metrics.datasource_catalog" -> datasourceCatalog(data);
                case "alert_rule.datasource_status" ->
                        alertDatasourceCapabilities(call.getArguments(), data);
                case "metrics.query_native" -> warehouse(call.getArguments(), data);
                default -> null;
            };
        } catch (IllegalArgumentException | ArithmeticException | NullPointerException invalid) {
            return null;
        }
    }

    private AgentReadObservationClassifier.Observation catalog(
            Map<String, Object> args, Map<String, Object> data) {
        long limit = number(args.get("limit"));
        if (limit < 1
                || limit > 50
                || !Boolean.FALSE.equals(data.get("partial"))
                || !Boolean.TRUE.equals(data.get("redactionApplied"))
                || !(data.get("data") instanceof List<?> rows)
                || rows.size() > limit) return null;
        var ids = new java.util.HashSet<String>();
        for (Object value : rows) {
            if (!(value instanceof Map<?, ?> row)
                    || !(row.get("catalogId") instanceof String id)
                    || id.isBlank()
                    || !ids.add(id)
                    || !(row.get("name") instanceof String)
                    || !(row.get("risk") instanceof String)
                    || !(row.get("workspaceId") instanceof String workspace)
                    || workspace.isBlank()
                    || !Boolean.FALSE.equals(row.get("executionAllowed"))
                    || !"manual-approval-draft-only".equals(row.get("executionMode"))) return null;
        }
        return new AgentReadObservationClassifier.Observation(
                "non-executing-action-catalog-rows", rows.size());
    }

    private AgentReadObservationClassifier.Observation labels(
            Map<String, Object> args, Map<String, Object> data) {
        long offset = number(args.get("offset"));
        long limit = number(args.get("limit"));
        long total = number(data.get("total"));
        if (offset < 0
                || offset > 10000
                || limit < 1
                || limit > 100
                || total < 0
                || total > Integer.MAX_VALUE
                || !java.util.Objects.equals(args.get("language"), data.get("language"))
                || number(data.get("offset")) != offset
                || number(data.get("limit")) != limit
                || !Boolean.FALSE.equals(data.get("partial"))
                || !(data.get("items") instanceof List<?> rows)
                || rows.size() != Math.min(limit, Math.max(0, total - offset))
                || !java.util.Objects.equals(offset + rows.size() < total, data.get("hasMore")))
            return null;
        var keys = new java.util.HashSet<String>();
        for (Object value : rows)
            if (!(value instanceof Map<?, ?> row)
                    || !(row.get("key") instanceof String key)
                    || !keys.add(key)
                    || !(row.get("value") instanceof String)) return null;
        return new AgentReadObservationClassifier.Observation(
                "native-resource-label-rows", rows.size());
    }

    private AgentReadObservationClassifier.Observation grafana(
            Map<String, Object> args, Map<String, Object> data) {
        long id = number(args.get("monitorId"));
        if (id <= 0
                || number(data.get("monitorId")) != id
                || data.containsKey("url")
                || data.containsKey("template")) return null;
        if (Boolean.FALSE.equals(data.get("found")))
            return new AgentReadObservationClassifier.Observation(
                    "local-grafana-binding-metadata", 0);
        return Boolean.TRUE.equals(data.get("found"))
                        && data.get("uid") instanceof String uid
                        && !uid.isBlank()
                        && number(data.get("version")) > 0
                        && data.get("enabled") instanceof Boolean
                ? new AgentReadObservationClassifier.Observation(
                        "local-grafana-binding-metadata", 1)
                : null;
    }

    private AgentReadObservationClassifier.Observation summary(
            Map<String, Object> args, Map<String, Object> data) {
        long offset = number(args.get("offset"));
        long limit = number(args.get("limit"));
        long total = number(data.get("totalAppGroups"));
        if (offset < 0
                || offset > 10000
                || limit < 1
                || limit > 100
                || total < 0
                || number(data.get("offset")) != offset
                || number(data.get("limit")) != limit
                || !"native-defined-app-summary".equals(data.get("source"))
                || !Boolean.FALSE.equals(data.get("undefinedAppTypesIncluded"))
                || number(data.get("reportedMonitorCount")) < 0
                || !(data.get("apps") instanceof List<?> rows)
                || rows.size() != Math.min(limit, Math.max(0, total - offset))
                || !java.util.Objects.equals(offset + rows.size() < total, data.get("hasMore")))
            return null;
        long sum = 0;
        var names = new java.util.HashSet<String>();
        for (Object item : rows) {
            if (!(item instanceof Map<?, ?> row)
                    || !(row.get("app") instanceof String app)
                    || !names.add(app)) return null;
            long size = number(row.get("size"));
            long counted = 0;
            for (String key :
                    List.of("availableSize", "unAvailableSize", "unManageSize", "otherSize")) {
                long count = number(row.get(key));
                if (count < 0 || count > size) return null;
                counted = Math.addExact(counted, count);
            }
            if (size < 0 || counted != size) return null;
            sum = Math.addExact(sum, size);
        }
        long reported = number(data.get("reportedMonitorCount"));
        if (sum > reported
                || offset == 0 && !Boolean.TRUE.equals(data.get("hasMore")) && sum != reported)
            return null;
        return new AgentReadObservationClassifier.Observation(
                "native-defined-app-summary-groups", rows.size());
    }

    private AgentReadObservationClassifier.Observation alertDatasourceCapabilities(
            Map<String, Object> args, Map<String, Object> output) {
        if (!args.isEmpty()
                || output.containsKey("error")
                || Boolean.FALSE.equals(output.get("success"))
                || !Boolean.FALSE.equals(output.get("partial"))
                || !Boolean.TRUE.equals(output.get("redactionApplied"))
                || !(output.get("data") instanceof Map<?, ?> data)
                || data.size() != 3
                || !(data.get("hasPromqlExecutor") instanceof Boolean promql)
                || !(data.get("hasSqlExecutor") instanceof Boolean sql)
                || !(data.get("availableExecutors") instanceof List<?> names)
                || names.size() > 100
                || (promql || sql) && names.isEmpty()) return null;
        var seen = new java.util.HashSet<String>();
        for (Object value : names) {
            if (!(value instanceof String name)
                    || name.isBlank()
                    || name.length() > 128
                    || !name.matches("[a-zA-Z0-9._-]+")
                    || !seen.add(name)) return null;
        }
        // Executor registration is metadata, never proof that an external datasource is healthy
        // or that any user query was run. The booleans describe native executor capabilities only.
        return new AgentReadObservationClassifier.Observation(
                "alert-datasource-capabilities-not-health", names.size());
    }

    private AgentReadObservationClassifier.Observation datasourceCatalog(Map<String, Object> data) {
        if (!"promql".equals(data.get("queryLanguage"))
                || !Boolean.FALSE.equals(data.get("availabilityProbed"))
                || !"shared-warehouse".equals(data.get("nativeScope"))
                || !(data.get("datasources") instanceof List<?> rows)
                || rows.stream()
                        .anyMatch(value -> !(value instanceof String name) || name.isBlank())
                || rows.stream().distinct().count() != rows.size()) return null;
        return new AgentReadObservationClassifier.Observation(
                "configured-datasource-identifiers-not-health", rows.size());
    }

    private AgentReadObservationClassifier.Observation warehouse(
            Map<String, Object> args, Map<String, Object> data) {
        if (!"native-warehouse-query.v1".equals(data.get("queryVersion"))
                || !org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                        .normalizedArgumentsHash(args)
                        .equals(data.get("inputHash"))
                || !Boolean.FALSE.equals(data.get("partial"))
                || number(data.get("failedQueries")) != 0
                || !"shared-warehouse".equals(data.get("nativeScope"))
                || !(args.get("queries") instanceof List<?> queries)
                || queries.isEmpty()
                || queries.size() > 3
                || number(data.get("queryCount")) != queries.size()
                || !(data.get("data") instanceof List<?> rows)
                || rows.size() != queries.size()) return null;
        var byRef = new java.util.HashMap<Object, Map<?, ?>>();
        for (Object query : queries) {
            if (!(query instanceof Map<?, ?> q) || byRef.put(q.get("refId"), q) != null)
                return null;
        }
        var seen = new java.util.HashSet<Object>();
        int series = 0;
        for (Object item : rows) {
            if (!(item instanceof Map<?, ?> row)
                    || number(row.get("status")) != 200
                    || !seen.add(row.get("refId"))
                    || !byRef.containsKey(row.get("refId"))
                    || !(row.get("frames") instanceof List<?> frames)) return null;
            Map<?, ?> query = byRef.get(row.get("refId"));
            if (frames.size() > number(query.get("limit"))) return null;
            for (Object value : frames) {
                if (!(value instanceof Map<?, ?> frame)
                        || !(frame.get("schema") instanceof Map<?, ?> schema)
                        || !(schema.get("fields") instanceof List<?> fields)
                        || fields.size() != 2
                        || !(fields.getFirst() instanceof Map<?, ?> time)
                        || !"time".equals(time.get("type"))
                        || !(fields.get(1) instanceof Map<?, ?> metric)
                        || !"number".equals(metric.get("type"))
                        || !(frame.get("data") instanceof List<?> points)
                        || points.size() > 61) return null;
                for (Object point : points) {
                    if (!(point instanceof List<?> tuple)
                            || tuple.size() != 2
                            || number(tuple.getFirst()) < number(query.get("start"))
                            || number(tuple.getFirst()) > number(query.get("end"))
                            || tuple.get(1) == null) return null;
                    new java.math.BigDecimal(tuple.get(1).toString());
                }
            }
            series = Math.addExact(series, frames.size());
        }
        return new AgentReadObservationClassifier.Observation("native-promql-range-series", series);
    }

    private long number(Object value) {
        if (!(value instanceof Number))
            throw new IllegalArgumentException("Native metadata count must be numeric");
        return new java.math.BigDecimal(value.toString()).longValueExact();
    }
}
