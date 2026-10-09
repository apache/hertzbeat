/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.warehouse.repository;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Greptime adapter for the canonical {@code hertzbeat_apm_red_1m} Flow sink.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeApmRedQueryRepository implements ApmRedQueryRepository {

    private static final String FLOW_TABLE = "hertzbeat_apm_red_1m";

    private final ObjectProvider<GreptimeSqlQueryExecutor> executorProvider;

    public GreptimeApmRedQueryRepository(ObjectProvider<GreptimeSqlQueryExecutor> executorProvider) {
        this.executorProvider = executorProvider;
    }

    @Override
    public ApmRedQueryResult query(ApmRedQuery query) {
        try {
            GreptimeSqlQueryExecutor executor = executorProvider.getIfAvailable();
            if (executor == null) {
                return ApmRedQueryResult.unavailable();
            }
            List<Map<String, Object>> rows = executor.executeStrict(seriesSql(query));
            if (rows.isEmpty()) {
                return ApmRedQueryResult.available(List.of(), null);
            }
            List<ApmRedPoint> points = toPoints(rows, query);
            List<Map<String, Object>> summaryRows = executor.executeStrict(summarySql(query));
            if (summaryRows.size() != 1) {
                return ApmRedQueryResult.unavailable();
            }
            return ApmRedQueryResult.available(points, toSummary(summaryRows.getFirst(), query));
        } catch (RuntimeException exception) {
            log.debug("Greptime APM RED Flow query is unavailable: {}", exception.getClass().getSimpleName());
            return ApmRedQueryResult.unavailable();
        }
    }

    @Override
    public ApmRedBatchResult querySummaries(List<ApmRedQuery> queries) {
        if (queries.isEmpty()) {
            return new ApmRedBatchResult(true, Map.of());
        }
        if (queries.size() > 500) {
            throw new IllegalArgumentException("Too many RED candidates");
        }
        Map<String, ApmRedQuery> scopes = new java.util.LinkedHashMap<>();
        ApmRedQuery first = queries.getFirst();
        for (ApmRedQuery query : queries) {
            if (query.start() != first.start() || query.end() != first.end()
                    || !query.workspaceId().equals(first.workspaceId())
                    || scopes.putIfAbsent(query.entityId(), query) != null) {
                throw new IllegalArgumentException("RED batch scopes must share workspace and window with unique entities");
            }
        }
        try {
            GreptimeSqlQueryExecutor executor = executorProvider.getIfAvailable();
            if (executor == null) {
                return new ApmRedBatchResult(false, Map.of());
            }
            String filters = queries.stream().map(query -> "(" + predicate(query).substring(7) + ")")
                    .collect(java.util.stream.Collectors.joining(" OR "));
            String sql = "SELECT entity_id, entity_type, SUM(calls_total) AS request_count, "
                    + "SUM(error_total) AS error_count, SUM(duration_sum_nano) AS duration_sum_nano, "
                    + "SUM(duration_count) AS duration_count, "
                    + "uddsketch_calc(0.95, uddsketch_merge(128, 0.01, duration_sketch)) / 1000000.0 "
                    + "AS latency_p95_ms FROM " + FLOW_TABLE + " WHERE " + filters
                    + " GROUP BY entity_id, entity_type LIMIT " + (queries.size() + 1);
            Map<String, ApmRedSummary> summaries = new java.util.LinkedHashMap<>();
            for (Map<String, Object> row : executor.executeStrict(sql)) {
                String id = String.valueOf(requiredValue(row, "entity_id"));
                ApmRedQuery scope = scopes.get(id);
                if (scope == null || !scope.entityType().equals(String.valueOf(requiredValue(row, "entity_type")))
                        || summaries.containsKey(id)) {
                    return new ApmRedBatchResult(false, Map.of());
                }
                summaries.put(id, toSummary(row, scope));
            }
            return new ApmRedBatchResult(true, summaries);
        } catch (RuntimeException exception) {
            log.debug("Greptime APM RED batch is unavailable: {}", exception.getClass().getSimpleName());
            return new ApmRedBatchResult(false, Map.of());
        }
    }

    private List<ApmRedPoint> toPoints(List<Map<String, Object>> rows, ApmRedQuery query) {
        if (rows.size() > MAX_POINTS) {
            throw new IllegalArgumentException("APM RED Flow returned too many points");
        }
        List<ApmRedPoint> points = new ArrayList<>(rows.size());
        for (Map<String, Object> row : rows) {
            long requestCount = whole(requiredValue(row, "request_count"));
            if (requestCount == 0L) {
                throw new IllegalArgumentException("APM RED Flow bucket cannot have zero requests");
            }
            long errorCount = whole(requiredValue(row, "error_count"));
            long durationSumNanos = whole(requiredValue(row, "duration_sum_nano"));
            long durationCount = whole(requiredValue(row, "duration_count"));
            long timestamp = timestamp(requiredValue(row, "time_window"));
            if (timestamp < query.start() || timestamp >= query.end()) {
                throw new IllegalArgumentException("APM RED Flow point falls outside the query window");
            }
            points.add(new ApmRedPoint(
                    timestamp,
                    requestCount,
                    errorCount,
                    requestCount / (double) RESOLUTION_SECONDS,
                    ratio(errorCount, requestCount),
                    averageMilliseconds(durationSumNanos, durationCount),
                    nullableDecimal(value(row, "latency_p95_ms"))));
        }
        return List.copyOf(points);
    }

    private ApmRedSummary toSummary(Map<String, Object> row, ApmRedQuery query) {
        long requestCount = whole(requiredValue(row, "request_count"));
        if (requestCount == 0L) {
            throw new IllegalArgumentException("APM RED Flow summary cannot have zero requests");
        }
        long errorCount = whole(requiredValue(row, "error_count"));
        long durationSumNanos = whole(requiredValue(row, "duration_sum_nano"));
        long durationCount = whole(requiredValue(row, "duration_count"));
        double windowSeconds = (query.end() - query.start()) / 1000D;
        return new ApmRedSummary(
                requestCount,
                errorCount,
                requestCount / windowSeconds,
                ratio(errorCount, requestCount),
                averageMilliseconds(durationSumNanos, durationCount),
                nullableDecimal(value(row, "latency_p95_ms")));
    }

    private String seriesSql(ApmRedQuery query) {
        return "SELECT CAST(time_window AS BIGINT) / 1000000 AS time_window, "
                + "SUM(calls_total) AS request_count, "
                + "SUM(error_total) AS error_count, SUM(duration_sum_nano) AS duration_sum_nano, "
                + "SUM(duration_count) AS duration_count, "
                + "uddsketch_calc(0.95, uddsketch_merge(128, 0.01, duration_sketch)) / 1000000.0 "
                + "AS latency_p95_ms FROM " + FLOW_TABLE + predicate(query)
                + " GROUP BY time_window ORDER BY time_window ASC LIMIT " + MAX_POINTS;
    }

    private String summarySql(ApmRedQuery query) {
        return "SELECT SUM(calls_total) AS request_count, SUM(error_total) AS error_count, "
                + "SUM(duration_sum_nano) AS duration_sum_nano, SUM(duration_count) AS duration_count, "
                + "uddsketch_calc(0.95, uddsketch_merge(128, 0.01, duration_sketch)) / 1000000.0 "
                + "AS latency_p95_ms FROM " + FLOW_TABLE + predicate(query) + " LIMIT 1";
    }

    private String predicate(ApmRedQuery query) {
        StringBuilder sql = new StringBuilder(" WHERE time_window >= to_timestamp_millis(")
                .append(query.start())
                .append(") AND time_window < to_timestamp_millis(")
                .append(query.end())
                .append(") AND workspace_id = ").append(sqlLiteral(query.workspaceId()))
                .append(" AND entity_id = ").append(sqlLiteral(query.entityId()))
                .append(" AND entity_type = ").append(sqlLiteral(query.entityType()))
                .append(" AND service_name = ").append(sqlLiteral(query.serviceName()))
                .append(" AND span_kind = 'SERVER'");
        if (query.serviceNamespace() != null) {
            sql.append(" AND service_namespace = ").append(sqlLiteral(query.serviceNamespace()));
        }
        if (query.deploymentEnvironment() != null) {
            sql.append(" AND deployment_environment = ").append(sqlLiteral(query.deploymentEnvironment()));
        }
        return sql.toString();
    }

    private Object requiredValue(Map<String, Object> row, String column) {
        Object value = value(row, column);
        if (value == null) {
            throw new IllegalArgumentException("APM RED Flow row is missing " + column);
        }
        return value;
    }

    private Object value(Map<String, Object> row, String column) {
        Object exact = row.get(column);
        if (exact != null || row.containsKey(column)) {
            return exact;
        }
        return row.entrySet().stream()
                .filter(entry -> entry.getKey() != null && column.equalsIgnoreCase(entry.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(null);
    }

    private long timestamp(Object value) {
        if (value instanceof Instant instant) {
            return instant.toEpochMilli();
        }
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime.toInstant().toEpochMilli();
        }
        if (value instanceof ZonedDateTime zonedDateTime) {
            return zonedDateTime.toInstant().toEpochMilli();
        }
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime.toInstant(ZoneOffset.UTC).toEpochMilli();
        }
        if (value instanceof Number number) {
            return losslessLong(number, "timestamp");
        }
        try {
            return Instant.parse(String.valueOf(value)).toEpochMilli();
        } catch (DateTimeParseException ignored) {
            return OffsetDateTime.parse(String.valueOf(value)).toInstant().toEpochMilli();
        }
    }

    private long whole(Object value) {
        long result;
        if (value instanceof Number number) {
            result = losslessLong(number, "count");
        } else {
            try {
                result = new BigDecimal(String.valueOf(value).trim()).longValueExact();
            } catch (ArithmeticException | NumberFormatException exception) {
                throw new IllegalArgumentException("APM RED Flow count is not a lossless long", exception);
            }
        }
        if (result < 0L) {
            throw new IllegalArgumentException("APM RED Flow count cannot be negative");
        }
        return result;
    }

    private long losslessLong(Number value, String field) {
        try {
            if (value instanceof Byte || value instanceof Short
                    || value instanceof Integer || value instanceof Long) {
                return value.longValue();
            }
            if (value instanceof BigInteger integer) {
                return integer.longValueExact();
            }
            if (value instanceof BigDecimal decimal) {
                return decimal.longValueExact();
            }
            if (value instanceof Float || value instanceof Double) {
                double decimal = value.doubleValue();
                if (!Double.isFinite(decimal)) {
                    throw new IllegalArgumentException("APM RED Flow " + field + " must be finite");
                }
                return BigDecimal.valueOf(decimal).longValueExact();
            }
            return new BigDecimal(value.toString()).longValueExact();
        } catch (ArithmeticException | NumberFormatException exception) {
            throw new IllegalArgumentException(
                    "APM RED Flow " + field + " is not a lossless long", exception);
        }
    }

    private Double nullableDecimal(Object value) {
        if (value == null) {
            return null;
        }
        double result = value instanceof Number number
                ? number.doubleValue()
                : Double.parseDouble(String.valueOf(value));
        if (!Double.isFinite(result) || result < 0D) {
            throw new IllegalArgumentException("APM RED Flow duration is invalid");
        }
        return result;
    }

    private Double averageMilliseconds(long durationSumNanos, long durationCount) {
        return durationCount == 0L ? null : durationSumNanos / (double) durationCount / 1_000_000D;
    }

    private double ratio(long numerator, long denominator) {
        if (numerator > denominator) {
            throw new IllegalArgumentException("APM RED Flow error count exceeds request count");
        }
        return denominator == 0L ? 0D : numerator / (double) denominator;
    }

    private String sqlLiteral(String value) {
        return "'" + value.replace("'", "''") + "'";
    }
}
