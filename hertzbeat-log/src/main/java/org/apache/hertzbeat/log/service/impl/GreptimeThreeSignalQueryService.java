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

package org.apache.hertzbeat.log.service.impl;

import java.net.URI;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.apache.hertzbeat.common.entity.dto.observability.MetricPoint;
import org.apache.hertzbeat.common.entity.dto.observability.MetricSeries;
import org.apache.hertzbeat.common.entity.dto.observability.OtlpMetricsConsole;
import org.apache.hertzbeat.common.entity.dto.observability.OtlpMetricsInventory;
import org.apache.hertzbeat.common.entity.dto.observability.SignalPage;
import org.apache.hertzbeat.common.entity.dto.observability.TraceDetail;
import org.apache.hertzbeat.common.entity.dto.observability.TraceListItem;
import org.apache.hertzbeat.common.entity.dto.observability.TraceOverview;
import org.apache.hertzbeat.common.entity.dto.observability.TraceSpanEvent;
import org.apache.hertzbeat.common.entity.dto.observability.TraceSpanNode;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.support.exception.StorageUnavailableException;
import org.apache.hertzbeat.log.service.ThreeSignalQueryService;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.core.type.TypeReference;

/** GreptimeDB implementation of the entity-free three-signal query contract. */
@Service
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeThreeSignalQueryService implements ThreeSignalQueryService {

    private static final String TRACE_TABLE = "hzb_traces";
    private static final Pattern SAFE_IDENTIFIER = Pattern.compile("[A-Za-z_:][A-Za-z0-9_:.-]*");
    private static final Pattern SAFE_LABEL = Pattern.compile("[A-Za-z_][A-Za-z0-9_]*");
    private static final Set<String> AGGREGATIONS = Set.of("sum", "avg", "min", "max", "count");
    private static final long DEFAULT_WINDOW_MILLIS = 30 * 60 * 1000L;
    private static final int DEFAULT_STEP_SECONDS = 30;
    private static final int MAX_PAGE_SIZE = 200;
    private final GreptimeProperties greptimeProperties;
    private final GreptimeSqlQueryExecutor sqlQueryExecutor;
    private final RestTemplate restTemplate;

    public GreptimeThreeSignalQueryService(GreptimeProperties greptimeProperties,
                                           GreptimeSqlQueryExecutor sqlQueryExecutor,
                                           @Qualifier(WarehouseConstants.GREPTIME_QUERY_REST_TEMPLATE)
                                           RestTemplate restTemplate) {
        this.greptimeProperties = greptimeProperties;
        this.sqlQueryExecutor = sqlQueryExecutor;
        this.restTemplate = restTemplate;
    }

    @Override
    public OtlpMetricsConsole queryMetrics(String query, Long start, Long end, String serviceName,
                                           String serviceNamespace, String environment, String filter,
                                           String groupBy, String aggregation, Integer step, String operationName) {
        validateTimeRange(start, end);
        long effectiveEnd = end == null ? Instant.now().toEpochMilli() : end;
        long effectiveStart = start == null ? effectiveEnd - DEFAULT_WINDOW_MILLIS : start;
        int effectiveStep = step == null ? DEFAULT_STEP_SECONDS : Math.max(1, Math.min(step, 3600));
        String effectiveQuery = buildPromql(query, serviceName, serviceNamespace, environment, filter,
                groupBy, aggregation, operationName);
        URI uri = UriComponentsBuilder.fromUriString(greptimeProperties.httpEndpoint())
                .path("/v1/prometheus/api/v1/query_range")
                .queryParam("db", greptimeProperties.database())
                .queryParam("query", effectiveQuery)
                .queryParam("start", effectiveStart / 1000.0)
                .queryParam("end", effectiveEnd / 1000.0)
                .queryParam("step", effectiveStep)
                .build().encode().toUri();
        Map<?, ?> response = getPrometheus(uri);
        return new OtlpMetricsConsole(effectiveQuery, effectiveStart, effectiveEnd, effectiveStep,
                readMetricSeries(response));
    }

    @Override
    public OtlpMetricsInventory metricInventory(Long start, Long end, String serviceName, String serviceNamespace,
                                                String environment, Integer limit) {
        int effectiveLimit = Math.max(1, Math.min(limit == null ? 100 : limit, 500));
        URI uri = UriComponentsBuilder.fromUriString(greptimeProperties.httpEndpoint())
                .path("/v1/prometheus/api/v1/label/__name__/values")
                .queryParam("db", greptimeProperties.database())
                .build().encode().toUri();
        Map<?, ?> response = getPrometheus(uri);
        Object rawData = response == null ? null : response.get("data");
        if (!(rawData instanceof List<?> values)) {
            return new OtlpMetricsInventory(List.of());
        }
        List<String> names = values.stream().map(String::valueOf).filter(StringUtils::hasText)
                .sorted().limit(effectiveLimit).toList();
        return new OtlpMetricsInventory(names);
    }

    private Map<?, ?> getPrometheus(URI uri) {
        HttpHeaders headers = new HttpHeaders();
        if (StringUtils.hasText(greptimeProperties.username())
                && StringUtils.hasText(greptimeProperties.password())) {
            headers.setBasicAuth(greptimeProperties.username(), greptimeProperties.password());
        }
        try {
            ResponseEntity<Map> response = restTemplate.exchange(uri, HttpMethod.GET,
                    new HttpEntity<>(headers), Map.class);
            Map<?, ?> body = response.getBody() == null ? Map.of() : response.getBody();
            if ("error".equals(body.get("status"))) {
                throw new IllegalArgumentException("Invalid PromQL query");
            }
            return body;
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (HttpClientErrorException.BadRequest exception) {
            throw new IllegalArgumentException("Invalid PromQL query", exception);
        } catch (RestClientException exception) {
            throw new StorageUnavailableException("GreptimeDB metrics storage is unavailable", exception);
        }
    }

    @Override
    public SignalPage<TraceListItem> queryTraces(Long start, Long end, String traceId, Boolean errorOnly,
                                                 String serviceName, String serviceNamespace, String environment,
                                                 String operationName, Long minDurationMs, Long maxDurationMs,
                                                 Integer pageIndex, Integer pageSize) {
        validateTraceRange(start, end, minDurationMs, maxDurationMs);
        int effectivePage = Math.max(pageIndex == null ? 0 : pageIndex, 0);
        int effectiveSize = Math.max(1, Math.min(pageSize == null ? 20 : pageSize, MAX_PAGE_SIZE));
        String filters = traceFilters(start, end, traceId, serviceName, serviceNamespace, environment,
                operationName, minDurationMs, maxDurationMs);
        String errorExpression = "SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') "
                + "THEN 1 ELSE 0 END)";
        String rootSpan = "parent_span_id IS NULL OR parent_span_id = ''";
        StringBuilder grouped = new StringBuilder("SELECT trace_id, ")
                .append(rootValue("span_id", "root_span_id", rootSpan))
                .append(", ").append(rootValue("service_name", "service_name", rootSpan))
                .append(", ").append(rootValue("\"resource_attributes.service.namespace\"", "service_namespace", rootSpan))
                .append(", ").append(rootValue("\"resource_attributes.deployment.environment.name\"", "environment", rootSpan))
                .append(", ").append(rootValue("span_name", "root_span_name", rootSpan))
                .append(", ").append(rootValue("duration_nano", "duration_nano", rootSpan)).append(", ")
                .append("MIN(timestamp) AS start_time, ").append(errorExpression).append(" AS error_span_count, ")
                .append("MAX(span_id) AS sampled_span_id FROM ").append(TRACE_TABLE);
        if (StringUtils.hasText(filters)) {
            grouped.append(" WHERE ").append(filters);
        }
        grouped.append(" GROUP BY trace_id");
        if (Boolean.TRUE.equals(errorOnly)) {
            grouped.append(" HAVING ").append(errorExpression).append(" > 0");
        }
        String sql = "SELECT *, COUNT(*) OVER () AS total_count FROM (" + grouped
                + ") trace_page ORDER BY start_time DESC LIMIT " + effectiveSize
                + " OFFSET " + effectivePage * effectiveSize;
        List<Map<String, Object>> rows = sqlQueryExecutor.execute(sql);
        long total = rows.isEmpty() ? 0 : asLong(rows.getFirst().get("total_count"));
        return new SignalPage<>(rows.stream().map(this::toTraceListItem).toList(), effectivePage, effectiveSize, total);
    }

    @Override
    public TraceOverview traceOverview(Long start, Long end, String traceId, Boolean errorOnly, String serviceName,
                                       String serviceNamespace, String environment, String operationName,
                                       Long minDurationMs, Long maxDurationMs) {
        validateTraceRange(start, end, minDurationMs, maxDurationMs);
        String filters = traceFilters(start, end, traceId, serviceName, serviceNamespace, environment,
                operationName, minDurationMs, maxDurationMs);
        String errorExpression = "SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') "
                + "THEN 1 ELSE 0 END)";
        StringBuilder grouped = new StringBuilder("SELECT trace_id, MAX(duration_nano) AS duration_nano, ")
                .append(errorExpression).append(" AS error_span_count FROM ").append(TRACE_TABLE);
        if (StringUtils.hasText(filters)) {
            grouped.append(" WHERE ").append(filters);
        }
        grouped.append(" GROUP BY trace_id");
        if (Boolean.TRUE.equals(errorOnly)) {
            grouped.append(" HAVING ").append(errorExpression).append(" > 0");
        }
        String sql = "SELECT COUNT(*) AS total_count, "
                + "SUM(CASE WHEN error_span_count > 0 THEN 1 ELSE 0 END) AS error_count, "
                + "AVG(duration_nano) AS average_duration, approx_percentile_cont(duration_nano, 0.95) AS p95_duration "
                + "FROM (" + grouped + ") trace_overview";
        List<Map<String, Object>> rows = sqlQueryExecutor.execute(sql);
        if (rows.isEmpty()) {
            return new TraceOverview(0, 0, 0, 0, 0);
        }
        Map<String, Object> row = rows.getFirst();
        long total = asLong(row.get("total_count"));
        long errors = asLong(row.get("error_count"));
        return new TraceOverview(total, errors, total == 0 ? 0 : (double) errors / total,
                asDouble(row.get("average_duration")) / 1_000_000.0,
                asDouble(row.get("p95_duration")) / 1_000_000.0);
    }

    @Override
    public TraceDetail traceDetail(String traceId) {
        if (!StringUtils.hasText(traceId)) {
            throw new IllegalArgumentException("traceId is required");
        }
        String sql = "SELECT * FROM " + TRACE_TABLE + " WHERE trace_id = '" + escapeSql(traceId)
                + "' ORDER BY timestamp ASC LIMIT 5000";
        List<TraceSpanNode> spans = sqlQueryExecutor.execute(sql).stream().map(this::toSpan).toList();
        if (spans.isEmpty()) {
            return new TraceDetail(null, List.of());
        }
        TraceSpanNode root = spans.stream().filter(span -> !StringUtils.hasText(span.parentSpanId()))
                .findFirst().orElse(spans.getFirst());
        long start = spans.stream().mapToLong(TraceSpanNode::startTime).min().orElse(root.startTime());
        long end = spans.stream().mapToLong(span -> span.startTime() + span.durationNanos() / 1_000_000L)
                .max().orElse(start + root.durationNanos() / 1_000_000L);
        long duration = Math.max(root.durationNanos(), Math.max(0, end - start) * 1_000_000L);
        int errors = (int) spans.stream().filter(span -> isError(span.status())).count();
        String namespace = root.resourceAttributes().getOrDefault("service.namespace", "");
        TraceListItem summary = new TraceListItem(traceId, root.spanId(), root.serviceName(), namespace,
                root.spanName(), duration, errors > 0 ? "ERROR" : "OK", start, errors,
                root.resourceAttributes());
        return new TraceDetail(summary, spans);
    }

    private String buildPromql(String query, String serviceName, String serviceNamespace, String environment,
                               String filter, String groupBy, String aggregation, String operationName) {
        String metric = StringUtils.hasText(query) ? query.trim() : "up";
        if (!SAFE_IDENTIFIER.matcher(metric).matches()) {
            return metric;
        }
        Map<String, String> labels = new LinkedHashMap<>();
        putIfText(labels, "service_name", serviceName);
        putIfText(labels, "service_namespace", serviceNamespace);
        putIfText(labels, "deployment_environment_name", environment);
        putIfText(labels, "http_route", operationName);
        parseFriendlyFilter(filter, labels);
        String selector = metric + labels.entrySet().stream()
                .map(entry -> entry.getKey() + "=\"" + escapePromql(entry.getValue()) + "\"")
                .collect(java.util.stream.Collectors.joining(",", "{", "}"));
        if (labels.isEmpty()) {
            selector = metric;
        }
        String normalizedAggregation = StringUtils.hasText(aggregation)
                ? aggregation.toLowerCase(Locale.ROOT) : null;
        if (normalizedAggregation == null || !AGGREGATIONS.contains(normalizedAggregation)) {
            return selector;
        }
        if (StringUtils.hasText(groupBy) && SAFE_LABEL.matcher(groupBy).matches()) {
            return normalizedAggregation + " by (" + groupBy + ") (" + selector + ")";
        }
        return normalizedAggregation + "(" + selector + ")";
    }

    private String rootValue(String column, String alias, String rootSpan) {
        return "COALESCE(MAX(CASE WHEN " + rootSpan + " THEN " + column + " END), MAX(" + column + ")) AS " + alias;
    }

    private void parseFriendlyFilter(String filter, Map<String, String> labels) {
        if (!StringUtils.hasText(filter)) {
            return;
        }
        for (String clause : filter.split(",")) {
            String[] pair = clause.split("=", 2);
            if (pair.length != 2) {
                continue;
            }
            String key = pair[0].trim().replace('.', '_');
            String value = pair[1].trim().replaceAll("^\"|\"$", "");
            if (SAFE_LABEL.matcher(key).matches() && StringUtils.hasText(value)) {
                labels.put(key, value);
            }
        }
    }

    private List<MetricSeries> readMetricSeries(Map<?, ?> response) {
        if (response == null || !(response.get("data") instanceof Map<?, ?> data)
                || !(data.get("result") instanceof List<?> results)) {
            return List.of();
        }
        List<MetricSeries> series = new ArrayList<>();
        for (Object result : results) {
            if (!(result instanceof Map<?, ?> item)) {
                continue;
            }
            Map<String, String> labels = new LinkedHashMap<>();
            if (item.get("metric") instanceof Map<?, ?> metricLabels) {
                metricLabels.forEach((key, value) -> labels.put(String.valueOf(key), String.valueOf(value)));
            }
            List<MetricPoint> points = new ArrayList<>();
            if (item.get("values") instanceof List<?> values) {
                for (Object rawPoint : values) {
                    if (rawPoint instanceof List<?> point && point.size() >= 2) {
                        points.add(new MetricPoint((long) (asDouble(point.get(0)) * 1000), asDouble(point.get(1))));
                    }
                }
            }
            series.add(new MetricSeries(labels, points));
        }
        return series;
    }

    private String traceFilters(Long start, Long end, String traceId, String serviceName, String serviceNamespace,
                                String environment, String operationName, Long minDurationMs, Long maxDurationMs) {
        List<String> filters = new ArrayList<>();
        if (start != null) {
            filters.add("timestamp >= to_timestamp_millis(" + start + ")");
        }
        if (end != null) {
            filters.add("timestamp <= to_timestamp_millis(" + end + ")");
        }
        addTextFilter(filters, "trace_id", traceId);
        addTextFilter(filters, "service_name", serviceName);
        addTextFilter(filters, "span_name", operationName);
        addFlattenedResourceFilter(filters, "resource_attributes.service.namespace", serviceNamespace);
        addFlattenedResourceFilter(filters, "resource_attributes.deployment.environment.name", environment);
        if (minDurationMs != null) {
            filters.add("duration_nano >= " + Math.max(0, minDurationMs) * 1_000_000L);
        }
        if (maxDurationMs != null) {
            filters.add("duration_nano <= " + Math.max(0, maxDurationMs) * 1_000_000L);
        }
        return String.join(" AND ", filters);
    }

    private void addTextFilter(List<String> filters, String column, String value) {
        if (StringUtils.hasText(value)) {
            filters.add(column + " = '" + escapeSql(value) + "'");
        }
    }

    private void addFlattenedResourceFilter(List<String> filters, String column, String value) {
        if (StringUtils.hasText(value) && !"all".equalsIgnoreCase(value)) {
            filters.add("\"" + column + "\" = '" + escapeSql(value) + "'");
        }
    }

    private TraceListItem toTraceListItem(Map<String, Object> row) {
        int errors = (int) asLong(row.get("error_span_count"));
        return new TraceListItem(asString(row.get("trace_id")), asString(row.get("root_span_id")),
                asString(row.get("service_name")), asString(row.get("service_namespace")),
                asString(row.get("root_span_name")), asLong(row.get("duration_nano")),
                errors > 0 ? "ERROR" : "OK", asEpochMillis(row.get("start_time")), errors,
                traceResourceAttributes(row));
    }

    private TraceSpanNode toSpan(Map<String, Object> row) {
        return new TraceSpanNode(asString(row.get("trace_id")), asString(row.get("span_id")),
                asString(row.get("parent_span_id")), asString(row.get("span_name")),
                asString(row.get("service_name")), asString(row.get("span_status_code")),
                asString(row.get("span_kind")), asString(row.get("span_status_message")),
                asLong(row.get("duration_nano")), asEpochMillis(row.get("timestamp")),
                traceResourceAttributes(row), traceSpanAttributes(row),
                asSpanEvents(row.get("span_events")));
    }

    private Map<String, String> traceResourceAttributes(Map<String, Object> row) {
        Map<String, String> attributes = new LinkedHashMap<>(asStringMap(row.get("resource_attributes")));
        row.forEach((key, value) -> putFlattenedAttribute(attributes, key, value, "resource_attributes."));
        putIfText(attributes, "service.namespace", asString(row.get("service_namespace")));
        putIfText(attributes, "deployment.environment.name", asString(row.get("environment")));
        return attributes;
    }

    private Map<String, String> traceSpanAttributes(Map<String, Object> row) {
        Map<String, String> attributes = new LinkedHashMap<>(asStringMap(row.get("span_attributes")));
        row.forEach((key, value) -> putFlattenedAttribute(attributes, key, value, "span_attributes."));
        return attributes;
    }

    private void putFlattenedAttribute(Map<String, String> target, String key, Object value, String prefix) {
        if (key.startsWith(prefix) && value != null) {
            putIfText(target, key.substring(prefix.length()), asString(value));
        }
    }

    private List<TraceSpanEvent> asSpanEvents(Object value) {
        if (!StringUtils.hasText(asString(value)) && !(value instanceof List<?>)) {
            return List.of();
        }
        List<Map<String, Object>> events;
        if (value instanceof List<?> list) {
            events = list.stream()
                    .filter(Map.class::isInstance)
                    .map(Map.class::cast)
                    .map(this::toStringKeyMap)
                    .toList();
        } else {
            events = JsonUtil.fromJson(asString(value), new TypeReference<>() { });
        }
        if (events == null) {
            return List.of();
        }
        return events.stream().map(event -> new TraceSpanEvent(
                asString(event.get("name")),
                asString(event.getOrDefault("time", event.get("timeUnixNano"))),
                asObjectMap(event.get("attributes")))).toList();
    }

    private Map<String, Object> toStringKeyMap(Map<?, ?> source) {
        Map<String, Object> result = new LinkedHashMap<>();
        source.forEach((key, item) -> result.put(String.valueOf(key), item));
        return result;
    }

    private Map<String, Object> asObjectMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return toStringKeyMap(map);
        }
        return Collections.emptyMap();
    }

    private Map<String, String> asStringMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, String> result = new LinkedHashMap<>();
            map.forEach((key, item) -> result.put(String.valueOf(key), String.valueOf(item)));
            return result;
        }
        if (!StringUtils.hasText(asString(value))) {
            return Collections.emptyMap();
        }
        Map<String, Object> parsed = JsonUtil.fromJson(asString(value), new TypeReference<>() { });
        if (parsed == null) {
            return Collections.emptyMap();
        }
        Map<String, String> result = new LinkedHashMap<>();
        parsed.forEach((key, item) -> result.put(key, String.valueOf(item)));
        return result;
    }

    private long asEpochMillis(Object value) {
        if (value instanceof Number number) {
            long timestamp = number.longValue();
            return timestamp > 10_000_000_000_000L ? timestamp / 1_000_000L : timestamp;
        }
        String text = asString(value);
        try {
            return Instant.parse(text).toEpochMilli();
        } catch (DateTimeParseException ignored) {
            return asLong(value);
        }
    }

    private long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return (long) Double.parseDouble(asString(value));
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private double asDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(asString(value));
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private String asString(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private boolean isError(String status) {
        return "ERROR".equalsIgnoreCase(status) || "STATUS_CODE_ERROR".equalsIgnoreCase(status);
    }

    private void putIfText(Map<String, String> target, String key, String value) {
        if (StringUtils.hasText(value) && !"all".equalsIgnoreCase(value)) {
            target.put(key, value.trim());
        }
    }

    private String escapeSql(String value) {
        return value.replace("'", "''");
    }

    private String escapePromql(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private void validateTraceRange(Long start, Long end, Long minDurationMs, Long maxDurationMs) {
        validateTimeRange(start, end);
        if ((minDurationMs != null && minDurationMs < 0) || (maxDurationMs != null && maxDurationMs < 0)) {
            throw new IllegalArgumentException("Trace duration must not be negative");
        }
        if (minDurationMs != null && maxDurationMs != null && minDurationMs > maxDurationMs) {
            throw new IllegalArgumentException("Minimum trace duration must not exceed maximum duration");
        }
    }

    private void validateTimeRange(Long start, Long end) {
        if (start != null && end != null && start > end) {
            throw new IllegalArgumentException("Query start time must not exceed end time");
        }
    }
}
