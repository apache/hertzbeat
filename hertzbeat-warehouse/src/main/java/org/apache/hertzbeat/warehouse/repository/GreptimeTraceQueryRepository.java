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

import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeSqlQueryContent;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Repository;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

/**
 * Greptime-backed trace row repository.
 */
@Repository
@RequiredArgsConstructor
@Slf4j
public class GreptimeTraceQueryRepository implements TraceQueryRepository {

    private static final String TRACE_TABLE = "hzb_traces";
    private static final String GREPTIME_QUERY_PATH = "/v1/sql";
    private static final String TRACE_SELECT_COLUMNS = "*";
    private static final String SELF_TELEMETRY_SERVICE_FILTER =
            "LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')";
    private static final String RESOURCE_ATTRIBUTES_COLUMN = "resource_attributes";
    private final ObjectProvider<GreptimeSqlQueryExecutor> greptimeSqlQueryExecutorProvider;
    private final GreptimeProperties greptimeProperties;
    private final RestTemplate restTemplate;
    private volatile Set<String> traceTableColumns;

    @Override
    public List<Map<String, Object>> queryRecentTraceRows(int limit) {
        return queryRecentTraceRows(limit, null, null, null, null, null, null, null, false);
    }

    @Override
    public List<Map<String, Object>> queryRecentTraceRows(int limit, String serviceName, Boolean hideInternal) {
        return queryRecentTraceRows(limit, null, null, serviceName, null, null, null, null, hideInternal);
    }

    @Override
    public List<Map<String, Object>> queryRecentTraceRows(int limit,
                                                          Long start,
                                                          Long end,
                                                          String serviceName,
                                                          String environment,
                                                          Boolean hideInternal) {
        return queryRecentTraceRows(limit, start, end, serviceName, null, environment, null, null, hideInternal);
    }

    @Override
    public List<Map<String, Object>> queryRecentTraceRows(int limit,
                                                          Long start,
                                                          Long end,
                                                          String serviceName,
                                                          String serviceNamespace,
                                                          String environment,
                                                          String workspaceId,
                                                          Map<String, Set<String>> resourceIdentityFilters,
                                                          Boolean hideInternal) {
        StringBuilder sql = new StringBuilder("SELECT ")
                .append(TRACE_SELECT_COLUMNS)
                .append(" FROM ")
                .append(TRACE_TABLE);
        List<String> filters = new LinkedList<>();
        if (start != null) {
            filters.add("timestamp >= to_timestamp_millis(" + start + ")");
        }
        if (end != null) {
            filters.add("timestamp <= to_timestamp_millis(" + end + ")");
        }
        if (StringUtils.hasText(serviceName)) {
            filters.add("service_name = '" + escapeSql(serviceName) + "'");
        }
        if (StringUtils.hasText(serviceNamespace)) {
            filters.add(resourceAttributeFilter(null, "service.namespace", serviceNamespace));
        }
        if (StringUtils.hasText(environment) && !"all".equalsIgnoreCase(environment.trim())) {
            String filter = environmentFilter(null, environment);
            if (StringUtils.hasText(filter)) {
                filters.add(filter);
            }
        }
        if (StringUtils.hasText(workspaceId)) {
            String filter = workspaceFilter(null, workspaceId);
            if (StringUtils.hasText(filter)) {
                filters.add(filter);
            }
        }
        if (!CollectionUtils.isEmpty(resourceIdentityFilters)) {
            addResourceIdentityFilters(filters, null, resourceIdentityFilters, serviceName, serviceNamespace);
        }
        if (Boolean.TRUE.equals(hideInternal)) {
            filters.add(SELF_TELEMETRY_SERVICE_FILTER);
        }
        if (!filters.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", filters));
        }
        sql.append(" ORDER BY timestamp DESC LIMIT ").append(Math.max(limit, 1));
        return queryRows(sql.toString());
    }

    @Override
    public boolean supportsTraceListRows() {
        return true;
    }

    @Override
    public List<Map<String, Object>> queryTraceListRows(Long start,
                                                        Long end,
                                                        Boolean errorOnly,
                                                        String serviceName,
                                                        String serviceNamespace,
                                                        String environment,
                                                        String workspaceId,
                                                        Map<String, Set<String>> resourceIdentityFilters,
                                                        Boolean hideInternal,
                                                        int offset,
                                                        int limit) {
        String errorExpression = "SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') "
                + "THEN 1 ELSE 0 END)";
        String serviceNamespaceExpression = resourceAttributeExpression(null, "service.namespace");
        String serviceNamespaceProjection = StringUtils.hasText(serviceNamespaceExpression)
                ? "MAX(" + serviceNamespaceExpression + ")"
                : "NULL";
        String resourceAttributesProjection = traceTableColumns().contains(RESOURCE_ATTRIBUTES_COLUMN)
                ? "MAX(" + RESOURCE_ATTRIBUTES_COLUMN + ")"
                : "NULL";
        StringBuilder innerSql = new StringBuilder("SELECT ")
                .append("trace_id, ")
                .append("MAX(span_id) AS root_span_id, ")
                .append("MAX(service_name) AS service_name, ")
                .append(serviceNamespaceProjection)
                .append(" AS service_namespace, ")
                .append("MAX(span_name) AS root_span_name, ")
                .append("MAX(duration_nano) AS duration_nano, ")
                .append("CASE WHEN ")
                .append(errorExpression)
                .append(" > 0 THEN 'ERROR' ELSE 'OK' END AS span_status_code, ")
                .append("MIN(timestamp) AS timestamp, ")
                .append(errorExpression)
                .append(" AS error_span_count, ")
                .append(resourceAttributesProjection)
                .append(" AS resource_attributes ")
                .append("FROM ")
                .append(TRACE_TABLE);
        List<String> filters = new LinkedList<>();
        if (start != null) {
            filters.add("timestamp >= to_timestamp_millis(" + start + ")");
        }
        if (end != null) {
            filters.add("timestamp <= to_timestamp_millis(" + end + ")");
        }
        if (StringUtils.hasText(serviceName)) {
            filters.add("service_name = '" + escapeSql(serviceName) + "'");
        }
        if (StringUtils.hasText(serviceNamespace)) {
            filters.add(resourceAttributeFilter(null, "service.namespace", serviceNamespace));
        }
        if (StringUtils.hasText(environment) && !"all".equalsIgnoreCase(environment.trim())) {
            String filter = environmentFilter(null, environment);
            if (StringUtils.hasText(filter)) {
                filters.add(filter);
            }
        }
        if (StringUtils.hasText(workspaceId)) {
            String filter = workspaceFilter(null, workspaceId);
            if (StringUtils.hasText(filter)) {
                filters.add(filter);
            }
        }
        if (!CollectionUtils.isEmpty(resourceIdentityFilters)) {
            addResourceIdentityFilters(filters, null, resourceIdentityFilters, serviceName, serviceNamespace);
        }
        if (Boolean.TRUE.equals(hideInternal)) {
            filters.add(SELF_TELEMETRY_SERVICE_FILTER);
        }
        if (!filters.isEmpty()) {
            innerSql.append(" WHERE ").append(String.join(" AND ", filters));
        }
        innerSql.append(" GROUP BY trace_id");
        if (Boolean.TRUE.equals(errorOnly)) {
            innerSql.append(" HAVING ").append(errorExpression).append(" > 0");
        }
        String sql = "SELECT *, COUNT(*) OVER () AS total_count FROM ("
                + innerSql
                + ") trace_list ORDER BY timestamp DESC LIMIT "
                + Math.max(limit, 1)
                + " OFFSET "
                + Math.max(offset, 0);
        return queryRows(sql);
    }

    @Override
    public boolean supportsTraceOverviewRows() {
        return true;
    }

    @Override
    public boolean supportsTraceIdOverviewRows() {
        return true;
    }

    @Override
    public Map<String, Object> queryTraceOverviewRows(Long start,
                                                      Long end,
                                                      Boolean errorOnly,
                                                      String serviceName,
                                                      String serviceNamespace,
                                                      String environment,
                                                      String workspaceId,
                                                      Map<String, Set<String>> resourceIdentityFilters,
                                                      Boolean hideInternal) {
        String errorExpression = "SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') "
                + "THEN 1 ELSE 0 END)";
        StringBuilder innerSql = new StringBuilder("SELECT trace_id, ")
                .append("MIN(timestamp) AS trace_start_time, ")
                .append(errorExpression)
                .append(" AS error_span_count FROM ")
                .append(TRACE_TABLE);
        List<String> filters = new LinkedList<>();
        if (start != null) {
            filters.add("timestamp >= to_timestamp_millis(" + start + ")");
        }
        if (end != null) {
            filters.add("timestamp <= to_timestamp_millis(" + end + ")");
        }
        if (StringUtils.hasText(serviceName)) {
            filters.add("service_name = '" + escapeSql(serviceName) + "'");
        }
        if (StringUtils.hasText(serviceNamespace)) {
            filters.add(resourceAttributeFilter(null, "service.namespace", serviceNamespace));
        }
        if (StringUtils.hasText(environment) && !"all".equalsIgnoreCase(environment.trim())) {
            String filter = environmentFilter(null, environment);
            if (StringUtils.hasText(filter)) {
                filters.add(filter);
            }
        }
        if (StringUtils.hasText(workspaceId)) {
            String filter = workspaceFilter(null, workspaceId);
            if (StringUtils.hasText(filter)) {
                filters.add(filter);
            }
        }
        if (!CollectionUtils.isEmpty(resourceIdentityFilters)) {
            addResourceIdentityFilters(filters, null, resourceIdentityFilters, serviceName, serviceNamespace);
        }
        if (Boolean.TRUE.equals(hideInternal)) {
            filters.add(SELF_TELEMETRY_SERVICE_FILTER);
        }
        if (!filters.isEmpty()) {
            innerSql.append(" WHERE ").append(String.join(" AND ", filters));
        }
        innerSql.append(" GROUP BY trace_id");
        if (Boolean.TRUE.equals(errorOnly)) {
            innerSql.append(" HAVING ").append(errorExpression).append(" > 0");
        }
        String sql = "SELECT COUNT(*) AS total_trace_count, "
                + "SUM(CASE WHEN error_span_count > 0 THEN 1 ELSE 0 END) AS error_trace_count, "
                + "MAX(trace_start_time) AS latest_observed_at FROM ("
                + innerSql
                + ") trace_overview";
        List<Map<String, Object>> rows = queryRows(sql);
        return rows.isEmpty() ? Map.of() : rows.getFirst();
    }

    @Override
    public Map<String, Object> queryTraceIdOverviewRows(String traceId,
                                                        Long start,
                                                        Long end,
                                                        Boolean errorOnly,
                                                        String serviceName,
                                                        String serviceNamespace,
                                                        String environment,
                                                        String workspaceId,
                                                        Map<String, Set<String>> resourceIdentityFilters,
                                                        Boolean hideInternal) {
        String errorExpression = "SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') "
                + "THEN 1 ELSE 0 END)";
        StringBuilder innerSql = buildTraceGroupedSql(start, end, serviceName, serviceNamespace, environment,
                workspaceId, resourceIdentityFilters, hideInternal, errorExpression, traceId);
        if (Boolean.TRUE.equals(errorOnly)) {
            innerSql.append(" HAVING ").append(errorExpression).append(" > 0");
        }
        String sql = "SELECT COUNT(*) AS total_trace_count, "
                + "SUM(CASE WHEN error_span_count > 0 THEN 1 ELSE 0 END) AS error_trace_count, "
                + "MAX(trace_start_time) AS latest_observed_at FROM ("
                + innerSql
                + ") trace_id_overview";
        List<Map<String, Object>> rows = queryRows(sql);
        return rows.isEmpty() ? Map.of() : rows.getFirst();
    }

    @Override
    public boolean supportsTraceSummaryRows() {
        return true;
    }

    @Override
    public Map<String, Object> queryTraceSummaryRows(Long start,
                                                     Long end,
                                                     String serviceName,
                                                     String serviceNamespace,
                                                     String environment,
                                                     String workspaceId,
                                                     Map<String, Set<String>> resourceIdentityFilters,
                                                     Boolean hideInternal) {
        String errorExpression = "SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') "
                + "THEN 1 ELSE 0 END)";
        String groupedSql = buildTraceGroupedSql(start, end, serviceName, serviceNamespace, environment,
                workspaceId, resourceIdentityFilters, hideInternal, errorExpression, null).toString();
        String sql = "SELECT summary.total_trace_count, summary.error_trace_count, "
                + "latest.trace_start_time AS latest_observed_at, latest.trace_id AS latest_trace_id "
                + "FROM (SELECT COUNT(*) AS total_trace_count, "
                + "SUM(CASE WHEN error_span_count > 0 THEN 1 ELSE 0 END) AS error_trace_count "
                + "FROM ("
                + groupedSql
                + ") entity_trace_summary) summary "
                + "LEFT JOIN (SELECT trace_id, trace_start_time FROM ("
                + groupedSql
                + ") entity_trace_latest ORDER BY trace_start_time DESC LIMIT 1) latest ON TRUE";
        List<Map<String, Object>> rows = queryRows(sql);
        return rows.isEmpty() ? Map.of() : rows.getFirst();
    }

    private StringBuilder buildTraceGroupedSql(Long start,
                                               Long end,
                                               String serviceName,
                                               String serviceNamespace,
                                               String environment,
                                               String workspaceId,
                                               Map<String, Set<String>> resourceIdentityFilters,
                                               Boolean hideInternal,
                                               String errorExpression,
                                               String traceId) {
        StringBuilder innerSql = new StringBuilder("SELECT trace_id, ")
                .append("MIN(timestamp) AS trace_start_time, ")
                .append(errorExpression)
                .append(" AS error_span_count FROM ")
                .append(TRACE_TABLE);
        List<String> filters = new LinkedList<>();
        if (StringUtils.hasText(traceId)) {
            filters.add("trace_id = '" + escapeSql(traceId) + "'");
        }
        if (start != null) {
            filters.add("timestamp >= to_timestamp_millis(" + start + ")");
        }
        if (end != null) {
            filters.add("timestamp <= to_timestamp_millis(" + end + ")");
        }
        if (StringUtils.hasText(serviceName)) {
            filters.add("service_name = '" + escapeSql(serviceName) + "'");
        }
        if (StringUtils.hasText(serviceNamespace)) {
            filters.add(resourceAttributeFilter(null, "service.namespace", serviceNamespace));
        }
        if (StringUtils.hasText(environment) && !"all".equalsIgnoreCase(environment.trim())) {
            String filter = environmentFilter(null, environment);
            if (StringUtils.hasText(filter)) {
                filters.add(filter);
            }
        }
        if (StringUtils.hasText(workspaceId)) {
            String filter = workspaceFilter(null, workspaceId);
            if (StringUtils.hasText(filter)) {
                filters.add(filter);
            }
        }
        if (!CollectionUtils.isEmpty(resourceIdentityFilters)) {
            addResourceIdentityFilters(filters, null, resourceIdentityFilters, serviceName, serviceNamespace);
        }
        if (Boolean.TRUE.equals(hideInternal)) {
            filters.add(SELF_TELEMETRY_SERVICE_FILTER);
        }
        if (!filters.isEmpty()) {
            innerSql.append(" WHERE ").append(String.join(" AND ", filters));
        }
        innerSql.append(" GROUP BY trace_id");
        return innerSql;
    }

    @Override
    public List<Map<String, Object>> queryTraceServiceGraphRows(int limit,
                                                                Long start,
                                                                Long end,
                                                                String environment,
                                                                Boolean hideInternal) {
        return queryTraceServiceGraphRows(limit, start, end, environment, Collections.emptyList(), hideInternal);
    }

    @Override
    public List<Map<String, Object>> queryTraceServiceGraphRows(int limit,
                                                                Long start,
                                                                Long end,
                                                                String environment,
                                                                Collection<String> serviceNames,
                                                                Boolean hideInternal) {
        StringBuilder sql = new StringBuilder("SELECT ")
                .append("parent.service_name AS source_service_name, ")
                .append("child.service_name AS target_service_name, ")
                .append("COUNT(*) AS request_count, ")
                .append("SUM(CASE WHEN child.span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') ")
                .append("THEN 1 ELSE 0 END) AS error_count, ")
                .append("COALESCE(SUM(child.duration_nano), 0) AS duration_sum_nano, ")
                .append("COUNT(child.duration_nano) AS duration_count, ")
                .append("uddsketch_calc(0.95, uddsketch_state(128, 0.01, child.duration_nano)) ")
                .append("/ 1000000.0 AS latency_p95_ms, ")
                .append("COALESCE(SUM(child.duration_nano), 0) ")
                .append("/ NULLIF(COUNT(child.duration_nano), 0) / 1000000.0 AS latency_avg_ms, ")
                .append("MAX(child.trace_id) AS sample_trace_id, ")
                .append("MAX(child.span_id) AS sample_span_id, ")
                .append("MAX(child.span_name) AS sample_span_name, ")
                .append("MAX(child.span_status_code) AS sample_status_code, ")
                .append("MIN(child.timestamp) AS first_seen, ")
                .append("MAX(child.timestamp) AS last_seen ")
                .append("FROM ")
                .append(TRACE_TABLE)
                .append(" child JOIN ")
                .append(TRACE_TABLE)
                .append(" parent ON child.trace_id = parent.trace_id ")
                .append("AND child.parent_span_id = parent.span_id");
        List<String> filters = new LinkedList<>();
        filters.add("child.trace_id IS NOT NULL");
        filters.add("child.parent_span_id IS NOT NULL");
        filters.add("child.service_name IS NOT NULL AND child.service_name != ''");
        filters.add("parent.service_name IS NOT NULL AND parent.service_name != ''");
        filters.add("LOWER(child.service_name) != LOWER(parent.service_name)");
        if (start != null) {
            filters.add("child.timestamp >= to_timestamp_millis(" + start + ")");
            filters.add("parent.timestamp >= to_timestamp_millis(" + start + ")");
        }
        if (end != null) {
            filters.add("child.timestamp <= to_timestamp_millis(" + end + ")");
            filters.add("parent.timestamp <= to_timestamp_millis(" + end + ")");
        }
        if (StringUtils.hasText(environment) && !"all".equalsIgnoreCase(environment.trim())) {
            String filter = environmentFilter("child", environment);
            if (StringUtils.hasText(filter)) {
                filters.add(filter);
            }
            String parentFilter = environmentFilter("parent", environment);
            if (StringUtils.hasText(parentFilter)) {
                filters.add(parentFilter);
            }
        }
        String serviceScopeFilter = serviceGraphServiceScopeFilter(serviceNames);
        if (StringUtils.hasText(serviceScopeFilter)) {
            filters.add(serviceScopeFilter);
        }
        if (Boolean.TRUE.equals(hideInternal)) {
            filters.add(internalServiceFilter("child"));
            filters.add(internalServiceFilter("parent"));
        }
        sql.append(" WHERE ").append(String.join(" AND ", filters));
        sql.append(" GROUP BY parent.service_name, child.service_name");
        sql.append(" ORDER BY request_count DESC LIMIT ").append(Math.max(limit, 1));
        return queryRows(sql.toString());
    }

    private String serviceGraphServiceScopeFilter(Collection<String> serviceNames) {
        if (serviceNames == null) {
            return null;
        }
        Set<String> normalizedServices = new LinkedHashSet<>();
        serviceNames.forEach(serviceName -> {
            if (StringUtils.hasText(serviceName)) {
                normalizedServices.add(serviceName.trim());
            }
        });
        if (normalizedServices.isEmpty()) {
            return null;
        }
        String childFilter = serviceNameAnyFilter("child", normalizedServices);
        String parentFilter = serviceNameAnyFilter("parent", normalizedServices);
        if (!StringUtils.hasText(childFilter)) {
            return parentFilter;
        }
        if (!StringUtils.hasText(parentFilter)) {
            return childFilter;
        }
        return "(" + childFilter + " OR " + parentFilter + ")";
    }

    @Override
    public List<Map<String, Object>> queryTraceRows(String traceId, int limit) {
        return queryTraceRows(traceId, limit, null, null, null, null, null, null, null, false);
    }

    @Override
    public List<Map<String, Object>> queryTraceRows(String traceId,
                                                    int limit,
                                                    Long start,
                                                    Long end,
                                                    String serviceName,
                                                    String serviceNamespace,
                                                    String environment,
                                                    String workspaceId,
                                                    Map<String, Set<String>> resourceIdentityFilters,
                                                    Boolean hideInternal) {
        if (!StringUtils.hasText(traceId)) {
            return Collections.emptyList();
        }
        StringBuilder sql = new StringBuilder("SELECT ")
                .append(TRACE_SELECT_COLUMNS)
                .append(" FROM ")
                .append(TRACE_TABLE);
        List<String> filters = new LinkedList<>();
        filters.add("trace_id = '" + escapeSql(traceId) + "'");
        if (start != null) {
            filters.add("timestamp >= to_timestamp_millis(" + start + ")");
        }
        if (end != null) {
            filters.add("timestamp <= to_timestamp_millis(" + end + ")");
        }
        if (StringUtils.hasText(serviceName)) {
            filters.add("service_name = '" + escapeSql(serviceName) + "'");
        }
        if (StringUtils.hasText(serviceNamespace)) {
            filters.add(resourceAttributeFilter(null, "service.namespace", serviceNamespace));
        }
        if (StringUtils.hasText(environment) && !"all".equalsIgnoreCase(environment.trim())) {
            String filter = environmentFilter(null, environment);
            if (StringUtils.hasText(filter)) {
                filters.add(filter);
            }
        }
        if (StringUtils.hasText(workspaceId)) {
            String filter = workspaceFilter(null, workspaceId);
            if (StringUtils.hasText(filter)) {
                filters.add(filter);
            }
        }
        if (!CollectionUtils.isEmpty(resourceIdentityFilters)) {
            addResourceIdentityFilters(filters, null, resourceIdentityFilters, serviceName, serviceNamespace);
        }
        if (Boolean.TRUE.equals(hideInternal)) {
            filters.add(SELF_TELEMETRY_SERVICE_FILTER);
        }
        sql.append(" WHERE ").append(String.join(" AND ", filters));
        sql.append(" ORDER BY timestamp ASC LIMIT ").append(Math.max(limit, 1));
        return queryRows(sql.toString());
    }

    private List<Map<String, Object>> queryRows(String sql) {
        GreptimeSqlQueryExecutor executor = greptimeSqlQueryExecutorProvider.getIfAvailable();
        if (executor != null) {
            try {
                return executor.execute(sql);
            } catch (Exception ex) {
                log.warn("Query trace rows failed, sql={}, message={}", sql, ex.getMessage());
                return Collections.emptyList();
            }
        }
        if (greptimeProperties == null || !StringUtils.hasText(greptimeProperties.httpEndpoint())) {
            return Collections.emptyList();
        }
        return queryRowsByGreptimeHttp(sql);
    }

    private List<Map<String, Object>> queryRowsByGreptimeHttp(String sql) {
        try {
            String endpoint = greptimeProperties.httpEndpoint();
            String url = endpoint.endsWith("/") ? endpoint.substring(0, endpoint.length() - 1) : endpoint;
            url += GREPTIME_QUERY_PATH;
            if (StringUtils.hasText(greptimeProperties.database())) {
                url += "?db=" + UriUtils.encodeQueryParam(greptimeProperties.database(), StandardCharsets.UTF_8);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            if (StringUtils.hasText(greptimeProperties.username())
                    && StringUtils.hasText(greptimeProperties.password())) {
                headers.setBasicAuth(
                        greptimeProperties.username(),
                        greptimeProperties.password(),
                        StandardCharsets.UTF_8);
            }
            HttpEntity<String> httpEntity = new HttpEntity<>(
                    "sql=" + UriUtils.encodeQueryParam(sql, StandardCharsets.UTF_8),
                    headers
            );
            ResponseEntity<GreptimeSqlQueryContent> responseEntity = restTemplate.exchange(
                    url, HttpMethod.POST, httpEntity, GreptimeSqlQueryContent.class
            );
            if (!responseEntity.getStatusCode().is2xxSuccessful() || responseEntity.getBody() == null
                    || CollectionUtils.isEmpty(responseEntity.getBody().getOutput())) {
                return Collections.emptyList();
            }
            List<Map<String, Object>> results = new LinkedList<>();
            for (GreptimeSqlQueryContent.Output output : responseEntity.getBody().getOutput()) {
                if (output == null
                        || output.getRecords() == null
                        || CollectionUtils.isEmpty(output.getRecords().getRows())) {
                    continue;
                }
                GreptimeSqlQueryContent.Output.Records.Schema schema = output.getRecords().getSchema();
                List<GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema> columns =
                        schema == null ? Collections.emptyList() : schema.getColumnSchemas();
                for (List<Object> row : output.getRecords().getRows()) {
                    Map<String, Object> rowMap = new HashMap<>();
                    if (!CollectionUtils.isEmpty(columns)) {
                        for (int i = 0; i < Math.min(columns.size(), row.size()); i++) {
                            rowMap.put(columns.get(i).getName(), row.get(i));
                        }
                    } else {
                        for (int i = 0; i < row.size(); i++) {
                            rowMap.put("col_" + i, row.get(i));
                        }
                    }
                    results.add(rowMap);
                }
            }
            return results;
        } catch (Exception ex) {
            log.warn("Query trace rows fallback failed, sql={}, message={}", sql, ex.getMessage());
            return Collections.emptyList();
        }
    }

    private String escapeSql(String value) {
        return value == null ? "" : value.replace("'", "''");
    }

    private String internalServiceFilter(String alias) {
        return "LOWER(" + alias + ".service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')";
    }

    private String environmentFilter(String alias, String environment) {
        return resourceAttributeFilter(alias, "deployment.environment.name", environment);
    }

    private void addResourceIdentityFilters(List<String> filters,
                                            String alias,
                                            Map<String, Set<String>> resourceIdentityFilters,
                                            String serviceName,
                                            String serviceNamespace) {
        resourceIdentityFilters.entrySet().stream()
                .filter(entry -> StringUtils.hasText(entry.getKey()) && !CollectionUtils.isEmpty(entry.getValue()))
                .forEach(entry -> {
                    String key = entry.getKey().trim();
                    if ("service.name".equals(key) && StringUtils.hasText(serviceName)) {
                        return;
                    }
                    if ("service.namespace".equals(key) && StringUtils.hasText(serviceNamespace)) {
                        return;
                    }
                    String filter = resourceAttributeAnyFilter(alias, key, entry.getValue());
                    if (StringUtils.hasText(filter)) {
                        filters.add(filter);
                    }
                });
    }

    private String workspaceFilter(String alias, String workspaceId) {
        String normalizedWorkspaceId = workspaceId.trim();
        List<String> workspaceFilters = new LinkedList<>();
        String hertzbeatWorkspaceFilter = resourceAttributeFilter(alias, "hertzbeat.workspace_id",
                normalizedWorkspaceId);
        if (StringUtils.hasText(hertzbeatWorkspaceFilter)) {
            workspaceFilters.add(hertzbeatWorkspaceFilter);
        }
        String workspaceIdFilter = resourceAttributeFilter(alias, "workspace.id", normalizedWorkspaceId);
        if (StringUtils.hasText(workspaceIdFilter)) {
            workspaceFilters.add(workspaceIdFilter);
        }
        if (workspaceFilters.isEmpty()) {
            return null;
        }
        if (workspaceFilters.size() == 1) {
            return workspaceFilters.getFirst();
        }
        return "(" + String.join(" OR ", workspaceFilters) + ")";
    }

    private String resourceAttributeAnyFilter(String alias, String key, Collection<String> values) {
        if ("service.name".equals(key)) {
            return serviceNameAnyFilter(alias, values);
        }
        List<String> valueFilters = values.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .sorted()
                .map(value -> resourceAttributeFilter(alias, key, value))
                .filter(StringUtils::hasText)
                .toList();
        if (valueFilters.isEmpty()) {
            return null;
        }
        if (valueFilters.size() == 1) {
            return valueFilters.getFirst();
        }
        return "(" + String.join(" OR ", valueFilters) + ")";
    }

    private String serviceNameAnyFilter(String alias, Collection<String> values) {
        String column = StringUtils.hasText(alias) ? alias + ".service_name" : "service_name";
        List<String> valueFilters = values.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .sorted()
                .map(value -> column + " = '" + escapeSql(value) + "'")
                .toList();
        if (valueFilters.isEmpty()) {
            return null;
        }
        if (valueFilters.size() == 1) {
            return valueFilters.getFirst();
        }
        return "(" + String.join(" OR ", valueFilters) + ")";
    }

    private String resourceAttributeFilter(String alias, String key, String value) {
        String expression = resourceAttributeExpression(alias, key);
        if (!StringUtils.hasText(expression)) {
            return null;
        }
        return expression + " = '"
                + escapeSql(value.trim()) + "'";
    }

    private String resourceAttributeExpression(String alias, String key) {
        Set<String> columns = traceTableColumns();
        String normalizedKey = key.trim();
        String flattenedColumn = RESOURCE_ATTRIBUTES_COLUMN + "." + normalizedKey;
        if (columns.contains(flattenedColumn)) {
            return qualifiedColumn(alias, flattenedColumn);
        }
        if (columns.contains(RESOURCE_ATTRIBUTES_COLUMN)) {
            String column = StringUtils.hasText(alias)
                    ? alias + "." + RESOURCE_ATTRIBUTES_COLUMN
                    : RESOURCE_ATTRIBUTES_COLUMN;
            return "json_get_string(" + column + ", '$[\"" + escapeJsonPathKey(normalizedKey) + "\"]')";
        }
        return null;
    }

    private String qualifiedColumn(String alias, String column) {
        String quotedColumn = quoteIdentifier(column);
        return StringUtils.hasText(alias) ? alias + "." + quotedColumn : quotedColumn;
    }

    private String quoteIdentifier(String column) {
        return "\"" + column.replace("\"", "\"\"") + "\"";
    }

    private Set<String> traceTableColumns() {
        Set<String> cachedColumns = traceTableColumns;
        if (cachedColumns != null) {
            return cachedColumns;
        }
        Set<String> discoveredColumns = new LinkedHashSet<>();
        for (Map<String, Object> row : queryRows("DESC " + TRACE_TABLE)) {
            String column = readText(row, "Column");
            if (StringUtils.hasText(column)) {
                discoveredColumns.add(column);
            }
        }
        if (discoveredColumns.isEmpty()) {
            discoveredColumns.add(RESOURCE_ATTRIBUTES_COLUMN);
        }
        Set<String> immutableColumns = Collections.unmodifiableSet(discoveredColumns);
        traceTableColumns = immutableColumns;
        return immutableColumns;
    }

    private String readText(Map<String, Object> row, String key) {
        if (row == null || !row.containsKey(key)) {
            return null;
        }
        String value = String.valueOf(row.get(key)).trim();
        return StringUtils.hasText(value) ? value : null;
    }

    private String escapeJsonPathKey(String key) {
        return key.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
