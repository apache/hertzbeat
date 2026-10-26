/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.metrics.inventory.greptime;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import java.util.ArrayList;
import org.apache.hertzbeat.common.observability.gateway.TelemetrySourceContext;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageSchemaIncompatibleException;
import java.util.LinkedHashMap;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsInventoryDto.Metadata;
import org.apache.hertzbeat.common.util.JsonUtil;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.apache.hertzbeat.observability.metrics.inventory.MetricInventoryRepository;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;

/** Greptime metric inventory adapter based on logical-table metadata and exact physical-row scope. */
@Repository
public class GreptimeMetricInventoryRepository implements MetricInventoryRepository {

    private static final int MAX_LIMIT = 201;
    private static final Pattern METRIC_NAME = Pattern.compile("[A-Za-z_:][A-Za-z0-9_:]*");
    private static final Logger LOG = LoggerFactory.getLogger(GreptimeMetricInventoryRepository.class);

    private static final Set<String> REQUIRED_COLUMNS = Set.of("hertzbeat_workspace_id", "greptime_timestamp", "__table_id");
    private static final Set<String> INVENTORY_COLUMNS = Set.of("hertzbeat_workspace_id", "greptime_timestamp", "__table_id",
            "service_name", "service_namespace", "deployment_environment_name", "hertzbeat_collector_id",
            "service_instance_id", "http_route");
    // Learn sparse physical-table capabilities only after a confirmed missing-column response.
    // Bound both cardinality and staleness; separate authorized self/external database routes.
    private final Cache<SchemaKey, Set<String>> schemas = Caffeine.newBuilder().maximumSize(64)
            .expireAfterWrite(Duration.ofSeconds(30)).build();
    private final ObjectProvider<GreptimeSqlQueryExecutor> executorProvider;

    public GreptimeMetricInventoryRepository(ObjectProvider<GreptimeSqlQueryExecutor> executorProvider) {
        this.executorProvider = executorProvider;
    }

    @Override
    public Result findMetricNames(Query query) {
        if (!supports(query)) {
            return Result.unsupported();
        }
        GreptimeSqlQueryExecutor executor;
        try {
            executor = executorProvider.getIfAvailable();
        } catch (RuntimeException exception) {
            logFailure(exception);
            return Result.failure();
        }
        if (executor == null) {
            return Result.unsupported();
        }
        try {
            List<Map<String, Object>> rows = inventoryRows(executor, query);
            Set<String> names = new LinkedHashSet<>();
            for (Map<String, Object> row : rows) {
                String name = row == null ? null : metricName(row.get("table_name"));
                if (StringUtils.hasText(name) && !"greptime_physical_table".equals(name)) {
                    names.add(name);
                }
            }
            return Result.success(new ArrayList<>(names));
        } catch (RuntimeException exception) {
            if (exception instanceof TelemetryStorageSchemaIncompatibleException) {
                LOG.warn("{}", Result.INVENTORY_SCHEMA_INCOMPATIBLE);
                return Result.schemaIncompatible();
            }
            if (nativeMetricsTableNotCreated(exception)) {
                return Result.success(List.of());
            }
            logFailure(exception);
            return Result.failure();
        }
    }

    private List<Map<String, Object>> inventoryRows(GreptimeSqlQueryExecutor executor, Query query) {
        SchemaKey key = new SchemaKey(executor, TelemetrySourceContext.capture());
        Set<String> columns = schemas.getIfPresent(key);
        if (columns != null && !columns.containsAll(REQUIRED_COLUMNS)) {
            throw new TelemetryStorageSchemaIncompatibleException();
        }
        try {
            return executor.executeStrict(buildQuery(query, columns));
        } catch (RuntimeException exception) {
            if (!missingInventoryColumn(exception)) {
                throw exception;
            }
            // One bounded metadata read and retry; timeouts, transport and unrelated SQL failures never become empty.
            schemas.invalidate(key);
            columns = schemas.get(key, ignored -> inventoryColumns(executor));
            if (!columns.containsAll(REQUIRED_COLUMNS)) {
                throw new TelemetryStorageSchemaIncompatibleException();
            }
            return executor.executeStrict(buildQuery(query, columns));
        }
    }

    private Set<String> inventoryColumns(GreptimeSqlQueryExecutor executor) {
        String names = INVENTORY_COLUMNS.stream().sorted().map(name -> "'" + name + "'")
                .collect(java.util.stream.Collectors.joining(","));
        var rows = executor.executeStrict("SELECT column_name FROM information_schema.columns"
                + " WHERE table_catalog = 'greptime' AND table_schema = current_schema()"
                + " AND table_name = 'greptime_physical_table' AND column_name IN (" + names + ")"
                + " ORDER BY column_name LIMIT 10");
        if (rows == null || rows.size() > INVENTORY_COLUMNS.size()) {
            throw new IllegalStateException("Invalid metric inventory schema response");
        }
        Set<String> columns = new LinkedHashSet<>();
        for (var row : rows) {
            if (row == null || !(row.get("column_name") instanceof String column)
                    || !INVENTORY_COLUMNS.contains(column) || !columns.add(column)) {
                throw new IllegalStateException("Invalid metric inventory schema response");
            }
        }
        return Set.copyOf(columns);
    }

    private boolean missingInventoryColumn(RuntimeException exception) {
        Throwable cause = exception;
        for (int depth = 0; cause != null && depth < 8; depth++, cause = cause.getCause()) {
            if (cause instanceof HttpClientErrorException http && http.getStatusCode().value() == 400) {
                var body = JsonUtil.fromJsonQuietly(http.getResponseBodyAsString());
                if (body == null || !body.path("code").isIntegralNumber() || body.path("code").asInt() != 3000) {
                    return false;
                }
                String error = body.path("error").asText("");
                return INVENTORY_COLUMNS.stream().anyMatch(column ->
                        error.startsWith("Failed to plan SQL: No field named p." + column + "."));
            }
        }
        return false;
    }

    private record SchemaKey(GreptimeSqlQueryExecutor executor, TelemetrySourceContext.Route route) {
    }

    private boolean nativeMetricsTableNotCreated(RuntimeException exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof HttpClientErrorException http && http.getStatusCode().value() == 400) {
                var body = JsonUtil.fromJsonQuietly(http.getResponseBodyAsString());
                if (body == null || !body.path("code").isIntegralNumber() || body.path("code").asInt() != 4001) {
                    return false;
                }
                String error = body.path("error").asText("");
                return error.startsWith("Failed to plan SQL: Table not found: ")
                        && error.endsWith(".greptime_physical_table");
            }
        }
        return false;
    }

    @Override
    public Map<String, Metadata> findMetadata(List<String> authorizedNames) {
        if (authorizedNames == null || authorizedNames.isEmpty() || authorizedNames.size() > MAX_LIMIT
                || authorizedNames.stream().anyMatch(name -> metricName(name) == null)) {
            return Map.of();
        }
        try {
            var executor = executorProvider.getIfAvailable();
            if (executor == null) {
                return Map.of();
            }
            String names = authorizedNames.stream().map(name -> "'" + name + "'")
                    .collect(java.util.stream.Collectors.joining(","));
            var rows = executor.executeStrict("SELECT table_name, source, metadata_quality, semantic_options"
                    + " FROM information_schema.table_semantics WHERE table_catalog = 'greptime'"
                    + " AND table_schema = current_schema() AND table_name IN (" + names + ")");
            Map<String, Metadata> result = new LinkedHashMap<>();
            for (var row : rows) {
                String name = row.get("table_name") instanceof String text ? text : null;
                if (name == null || !authorizedNames.contains(name)) {
                    continue;
                }
                var options = JsonUtil.fromJson(String.valueOf(row.get("semantic_options")));
                result.put(name, new Metadata("available", text(row.get("source")),
                        text(row.get("metadata_quality")), options.path("metric.original_name").asText(null),
                        options.path("metric.type").asText(null), options.path("metric.unit").asText(null),
                        options.path("metric.temporality").asText(null), null, "unknown", null));
            }
            return Map.copyOf(result);
        } catch (RuntimeException exception) {
            // Older stores do not expose table_semantics. Name discovery remains independently usable.
            return Map.of();
        }
    }

    private String text(Object value) {
        return value instanceof String text ? text : null;
    }

    @Override
    public Labels findLabels(String metric, List<String> matchers, long start, long end, String label, int limit) {
        try {
            var executor = executorProvider.getIfAvailable();
            return executor == null ? new Labels("unavailable", false, List.of())
                    : GreptimeMetricLabels.query(executor, metric, matchers, start, end, label, limit);
        } catch (RuntimeException exception) {
            return new Labels("unavailable", false, List.of());
        }
    }

    private boolean supports(Query query) {
        return query != null
                && StringUtils.hasText(query.workspaceId())
                && query.start() >= 0
                && query.end() >= query.start()
                && query.limit() > 0
                && (query.search() == null || query.search().length() <= 128);
    }

    private String buildQuery(Query query, Set<String> columns) {
        List<String> filters = new ArrayList<>();
        filters.add(equalsColumn("p.hertzbeat_workspace_id", query.workspaceId()));
        addOptionalEqualsColumn(filters, "p.service_name", query.serviceName(), columns);
        addOptionalEqualsColumn(filters, "p.service_namespace", query.serviceNamespace(), columns);
        addOptionalEqualsColumn(filters, "p.deployment_environment_name", query.environment(), columns);
        addOptionalEqualsColumn(filters, "p.hertzbeat_collector_id", query.collectorId(), columns);
        addOptionalEqualsColumn(filters, "p.service_instance_id", query.instance(), columns);
        addOptionalEqualsColumn(filters, "p.http_route", query.endpoint(), columns);
        filters.add("p.greptime_timestamp >= to_timestamp_millis(" + query.start() + ")");
        filters.add(query.end() == Long.MAX_VALUE
                ? "p.greptime_timestamp <= to_timestamp_millis(" + query.end() + ")"
                : "p.greptime_timestamp < to_timestamp_millis(" + (query.end() + 1L) + ")");
        if (StringUtils.hasText(query.search())) {
            filters.add("strpos(lower(t.table_name), lower('" + query.search().replace("'", "''") + "')) > 0");
        }
        return "SELECT DISTINCT t.table_name AS table_name"
                + " FROM greptime_physical_table AS p"
                + " JOIN information_schema.tables AS t ON p.__table_id = t.table_id"
                + " WHERE " + String.join(" AND ", filters)
                + " ORDER BY t.table_name"
                + " LIMIT " + Math.min(query.limit(), MAX_LIMIT);
    }

    private void addOptionalEqualsColumn(List<String> filters, String column, String value, Set<String> columns) {
        if (StringUtils.hasText(value)) {
            // Supplied optional dimensions are exact constraints. A missing tag cannot match a nonempty value.
            filters.add(columns == null || columns.contains(column.substring(2)) ? equalsColumn(column, value) : "1 = 0");
        }
    }

    private String equalsColumn(String column, String value) {
        return column + " = '" + value.replace("'", "''") + "'";
    }

    private String metricName(Object value) {
        if (value == null) {
            return null;
        }
        String candidate = value.toString();
        return METRIC_NAME.matcher(candidate).matches() ? candidate : null;
    }

    private void logFailure(RuntimeException exception) {
        LOG.warn("{}: {}", Result.INVENTORY_UNAVAILABLE, exception.getClass().getSimpleName());
    }
}
