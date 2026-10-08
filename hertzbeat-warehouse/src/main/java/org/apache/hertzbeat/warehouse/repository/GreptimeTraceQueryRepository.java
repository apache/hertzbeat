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
import java.net.URLEncoder;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.LongSupplier;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeSqlQueryContent;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
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
@Slf4j
public class GreptimeTraceQueryRepository implements TraceQueryRepository {

    private static final String TRACE_TABLE = "hzb_traces";
    private static final String GREPTIME_QUERY_PATH = "/v1/sql";
    private static final String TRACE_SELECT_COLUMNS = "*";
    private static final String SELF_TELEMETRY_SERVICE_FILTER =
            "LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')";
    private static final List<String> TRACE_LIST_RESOURCE_ATTRIBUTE_KEYS = List.of(
            "hertzbeat.workspace_id",
            "hertzbeat.entity_id",
            "hertzbeat.entity_type",
            "service.namespace",
            "service.instance.id",
            "deployment.environment.name");
    private static final Set<String> STABLE_RESOURCE_ATTRIBUTE_KEYS = Set.copyOf(TRACE_LIST_RESOURCE_ATTRIBUTE_KEYS);
    private static final List<String> TRACE_LIST_EVIDENCE_COLUMNS = List.of(
            "observed_start_nanos", "observed_end_nanos", "evidence_span_count", "evidence_distinct_span_count",
            "invalid_span_count", "representative_span_id", "representative_span_name", "representative_service_name",
            "representative_service_namespace", "representative_start_nanos", "representative_duration_nano");
    private static final int MAX_DISCOVERED_DYNAMIC_ATTRIBUTE_COLUMNS = 4_096;
    private static final long DYNAMIC_ATTRIBUTE_SCHEMA_REFRESH_NANOS = Duration.ofSeconds(30).toNanos();
    private final ObjectProvider<GreptimeSqlQueryExecutor> greptimeSqlQueryExecutorProvider;
    private final GreptimeProperties greptimeProperties;
    private final RestTemplate restTemplate;
    private final LongSupplier monotonicNanos;
    private final long dynamicAttributeSchemaRefreshNanos;
    private volatile DynamicAttributeSchemaSnapshot dynamicAttributeSchemaSnapshot;

    @Autowired
    public GreptimeTraceQueryRepository(
            ObjectProvider<GreptimeSqlQueryExecutor> greptimeSqlQueryExecutorProvider,
            GreptimeProperties greptimeProperties,
            @Qualifier(WarehouseConstants.GREPTIME_QUERY_REST_TEMPLATE) RestTemplate restTemplate) {
        this(greptimeSqlQueryExecutorProvider, greptimeProperties, restTemplate,
                System::nanoTime, DYNAMIC_ATTRIBUTE_SCHEMA_REFRESH_NANOS);
    }

    GreptimeTraceQueryRepository(
            ObjectProvider<GreptimeSqlQueryExecutor> greptimeSqlQueryExecutorProvider,
            GreptimeProperties greptimeProperties,
            RestTemplate restTemplate,
            LongSupplier monotonicNanos,
            long dynamicAttributeSchemaRefreshNanos) {
        this.greptimeSqlQueryExecutorProvider = greptimeSqlQueryExecutorProvider;
        this.greptimeProperties = greptimeProperties;
        this.restTemplate = restTemplate;
        this.monotonicNanos = monotonicNanos;
        this.dynamicAttributeSchemaRefreshNanos = Math.max(1L, dynamicAttributeSchemaRefreshNanos);
    }

    @Override
    public List<Map<String, Object>> queryRecentTraceRows(int limit) {
        return queryRecentTraceRows(limit, null, null, null, null, null, null, null, null, null, null, false);
    }

    @Override
    public List<Map<String, Object>> queryRecentTraceRows(int limit, String serviceName, Boolean hideInternal) {
        return queryRecentTraceRows(limit, null, null, serviceName, null, null, null, null, null, null, null, hideInternal);
    }

    @Override
    public List<Map<String, Object>> queryRecentTraceRows(int limit,
                                                          Long start,
                                                          Long end,
                                                          String serviceName,
                                                          String environment,
                                                          Boolean hideInternal) {
        return queryRecentTraceRows(limit, start, end, serviceName, null, environment, null, null, null, null, null, hideInternal);
    }

    @Override
    public List<Map<String, Object>> queryRecentTraceRows(int limit,
                                                          Long start,
                                                          Long end,
                                                          String serviceName,
                                                          String serviceNamespace,
                                                          String environment,
                                                          String operationName,
                                                          Long minDurationNanos,
                                                          Long maxDurationNanos,
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
        addTraceSpanFilters(filters, operationName, minDurationNanos, maxDurationNanos);
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
        sql.append(" ORDER BY timestamp DESC, trace_id ASC, span_id ASC LIMIT ").append(Math.max(limit, 1));
        return queryRows(sql.toString());
    }

    @Override
    public boolean supportsTraceListRows() {
        return true;
    }

    @Override
    public TraceListPage queryTraceListRows(Long start,
                                                        Long end,
                                                        Boolean errorOnly,
                                                        String serviceName,
                                                        String serviceNamespace,
                                                        String environment,
                                                        String operationName,
                                                        Long minDurationNanos,
                                                        Long maxDurationNanos,
                                                        String workspaceId,
                                                        Map<String, Set<String>> resourceIdentityFilters,
                                                        Boolean hideInternal,
                                                        int offset,
                                                        int limit) {
        return queryTraceListRows(start, end, errorOnly, serviceName, serviceNamespace, environment,
                operationName, minDurationNanos, maxDurationNanos, workspaceId, resourceIdentityFilters,
                hideInternal, null, offset, limit);
    }

    @Override
    public TraceListPage queryTraceListRows(Long start,
                                                        Long end,
                                                        Boolean errorOnly,
                                                        String serviceName,
                                                        String serviceNamespace,
                                                        String environment,
                                                        String operationName,
                                                        Long minDurationNanos,
                                                        Long maxDurationNanos,
                                                        String workspaceId,
                                                        Map<String, Set<String>> resourceIdentityFilters,
                                                        Boolean hideInternal,
                                                        String spanScope,
                                                        int offset,
                                                        int limit) {
        return queryTraceListRows(start, end, errorOnly, serviceName, serviceNamespace, environment,
                operationName, minDurationNanos, maxDurationNanos, workspaceId, resourceIdentityFilters,
                hideInternal, spanScope, offset, limit, TraceSort.NEWEST);
    }

    @Override
    public TraceListPage queryTraceListRows(Long start, Long end, Boolean errorOnly,
                                           String serviceName, String serviceNamespace, String environment,
                                           String operationName, Long minDurationNanos, Long maxDurationNanos,
                                           String workspaceId, Map<String, Set<String>> resourceIdentityFilters,
                                           Boolean hideInternal, String spanScope, int offset, int limit, TraceSort sort) {
        return queryTraceListRows(start, end, errorOnly, serviceName, serviceNamespace, environment, operationName,
                minDurationNanos, maxDurationNanos, workspaceId, resourceIdentityFilters, hideInternal, spanScope, offset, limit, sort, false);
    }

    @Override
    public TraceListPage queryTraceListRows(Long start, Long end, Boolean errorOnly,
                                           String serviceName, String serviceNamespace, String environment,
                                           String operationName, Long minDurationNanos, Long maxDurationNanos,
                                           String workspaceId, Map<String, Set<String>> resourceIdentityFilters,
                                           Boolean hideInternal, String spanScope, int offset, int limit, TraceSort sort, boolean endExclusive) {
        if (!StringUtils.hasText(workspaceId)) {
            throw new TelemetryStorageUnavailableException();
        }
        String candidateErrorExpression = "SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') "
                + "THEN 1 ELSE 0 END)";
        StringBuilder candidateSql = new StringBuilder("SELECT trace_id, MIN(timestamp) AS match_timestamp FROM ")
                .append(TRACE_TABLE);
        List<String> filters = traceCandidateFilters(start, end, endExclusive, serviceName, serviceNamespace, environment,
                operationName, minDurationNanos, maxDurationNanos, workspaceId, resourceIdentityFilters, hideInternal, spanScope);
        if (!filters.isEmpty()) {
            candidateSql.append(" WHERE ").append(String.join(" AND ", filters));
        }
        candidateSql.append(" GROUP BY trace_id");
        if (Boolean.TRUE.equals(errorOnly)) {
            candidateSql.append(" HAVING ").append(candidateErrorExpression).append(" > 0");
        }
        String pageSource = "candidate_traces";
        String candidateCte = "WITH candidate_traces AS (" + candidateSql + ")";
        String orderBy = "match_timestamp DESC, trace_id ASC";
        if (sort == TraceSort.DURATION_DESC) {
            String root = "(parent_span_id IS NULL OR parent_span_id = '')";
            String match = "(" + String.join(" AND ", filters) + ")";
            String qualification = match + (Boolean.TRUE.equals(errorOnly)
                    ? " AND span_status_code IN ('STATUS_CODE_ERROR', 'ERROR')" : "");
            // Greptime can lose rows when grouped candidates self-join their source table. A single
            // aggregate retains every matching span and every workspace root, including roots outside the query window.
            candidateCte = "WITH trace_durations AS (SELECT trace_id, MIN(CASE WHEN " + match
                    + " THEN timestamp ELSE NULL END) AS match_timestamp, "
                    + "CASE WHEN SUM(CASE WHEN " + root + " THEN 1 ELSE 0 END) = 1 "
                    + "THEN MAX(CASE WHEN " + root + " AND duration_nano >= 0 "
                    + "THEN duration_nano ELSE NULL END) ELSE NULL END AS sort_duration "
                    + "FROM " + TRACE_TABLE + " WHERE " + workspaceFilter(null, workspaceId)
                    + " AND (" + root + " OR " + match + ") GROUP BY trace_id "
                    + "HAVING SUM(CASE WHEN " + qualification + " THEN 1 ELSE 0 END) > 0)";
            pageSource = "trace_durations";
            orderBy = "sort_duration DESC NULLS LAST, " + orderBy;
        }
        String candidatePageSql = candidateCte
                + " SELECT trace_id, match_timestamp, COUNT(*) OVER () AS total_count FROM " + pageSource
                + " ORDER BY " + orderBy + " LIMIT "
                + Math.max(limit, 1)
                + " OFFSET "
                + Math.max(offset, 0);
        TraceListCandidatePage candidatePage = traceListCandidatePage(
                queryRows(candidatePageSql), Math.max(offset, 0));
        if (candidatePage.traceIds().isEmpty()) {
            List<Map<String, Object>> countRows = queryRows("WITH candidate_traces AS (" + candidateSql
                    + ") SELECT COUNT(*) AS total_count FROM candidate_traces");
            if (countRows.size() != 1) {
                throw new TelemetryStorageUnavailableException();
            }
            long total = traceListNonNegativeLong(countRows.getFirst(), "total_count");
            if (total > Math.max(offset, 0)) {
                throw new TelemetryStorageUnavailableException();
            }
            return new TraceListPage(List.of(), total);
        }

        String rootPredicate = "(stats.parent_span_id IS NULL OR stats.parent_span_id = '')";
        String errorFlag = "CASE WHEN stats.span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') "
                + "THEN 1 ELSE 0 END";
        String rootServiceNamespace = resourceAttributeExpression("stats", "service.namespace");
        String statsWorkspaceFilter = workspaceFilter("stats", workspaceId);
        if (!StringUtils.hasText(statsWorkspaceFilter)) {
            throw new TelemetryStorageUnavailableException();
        }
        String traceIdFilter = candidatePage.traceIds().stream()
                .map(traceId -> "'" + escapeSql(traceId) + "'")
                .collect(java.util.stream.Collectors.joining(", "));
        String evidenceSql = traceListEvidenceCte(workspaceFilter("evidence", workspaceId), traceIdFilter)
                + " SELECT * FROM trace_evidence LIMIT " + (candidatePage.traceIds().size() + 1);
        String sql = "SELECT stats.trace_id, "
                + "MAX(CASE WHEN " + rootPredicate + " THEN stats.span_id ELSE NULL END) AS root_span_id, "
                + "MAX(CASE WHEN " + rootPredicate + " THEN stats.service_name ELSE NULL END) AS service_name, "
                + "MAX(CASE WHEN " + rootPredicate + " THEN " + rootServiceNamespace
                + " ELSE NULL END) AS service_namespace, "
                + "MAX(CASE WHEN " + rootPredicate + " THEN stats.span_name ELSE NULL END) AS root_span_name, "
                + "MAX(CASE WHEN " + rootPredicate + " THEN stats.duration_nano ELSE NULL END) AS duration_nano, "
                + "MAX(CASE WHEN " + rootPredicate + " THEN stats.timestamp ELSE NULL END) AS timestamp, "
                + "stats.service_name AS stats_service_name, "
                + "COUNT(*) AS service_span_count, "
                + "SUM(" + errorFlag + ") AS service_error_span_count, "
                + "SUM(CASE WHEN stats.span_status_code IN ('STATUS_CODE_OK', 'OK') THEN 1 ELSE 0 END) AS service_ok_span_count, "
                + "SUM(CASE WHEN " + rootPredicate + " THEN 1 ELSE 0 END) AS service_root_span_count, "
                + traceRootResourceAttributeProjections(rootPredicate)
                + " FROM " + TRACE_TABLE + " stats"
                + " WHERE " + statsWorkspaceFilter
                + " AND stats.trace_id IN (" + traceIdFilter + ")"
                + " GROUP BY stats.trace_id, stats.service_name"
                + " ORDER BY stats.trace_id, stats.service_name LIMIT "
                + (TraceQueryRepository.MAX_TRACE_LIST_SERVICE_ROWS + 1);
        // Keep the bounded aggregates separate: joining windowed evidence can lose rows in Greptime.
        // A live trace may gain spans between reads, so retry the complete pair once on count disagreement.
        for (int attempt = 0; attempt < 2; attempt++) {
            Map<String, Map<String, Object>> evidence = traceListEvidenceRows(candidatePage, queryRows(evidenceSql));
            List<Map<String, Object>> completed = completeTraceListRows(candidatePage, queryRows(sql));
            boolean countsMatch = completed.stream().allMatch(row ->
                    traceListNonNegativeLong(row, "span_count") == traceListNonNegativeLong(
                            evidence.get(traceListText(row, "trace_id")), "evidence_span_count"));
            if (countsMatch) {
                for (Map<String, Object> row : completed) {
                    Map<String, Object> traceEvidence = evidence.get(traceListText(row, "trace_id"));
                    for (String column : TRACE_LIST_EVIDENCE_COLUMNS) {
                        row.put(column, traceEvidence.get(column));
                    }
                }
                return new TraceListPage(completed, candidatePage.totalCount());
            }
        }
        throw new TelemetryStorageUnavailableException();
    }

    private Map<String, Map<String, Object>> traceListEvidenceRows(TraceListCandidatePage candidates,
                                                                List<Map<String, Object>> rows) {
        if (rows == null || rows.size() != candidates.traceIds().size()) {
            throw new TelemetryStorageUnavailableException();
        }
        Map<String, Map<String, Object>> evidence = new HashMap<>();
        for (Map<String, Object> row : rows) {
            String traceId = traceListText(row, "trace_id");
            if (!StringUtils.hasText(traceId) || !candidates.traceIds().contains(traceId)
                    || evidence.putIfAbsent(traceId, row) != null
                    || traceListNonNegativeLong(row, "evidence_span_count") <= 0
                    || traceListNonNegativeLong(row, "evidence_span_count")
                    != traceListNonNegativeLong(row, "evidence_distinct_span_count")
                    || traceListNonNegativeLong(row, "invalid_span_count") != 0) {
                throw new TelemetryStorageUnavailableException();
            }
        }
        return evidence;
    }

    private String traceListEvidenceCte(String workspace, String traceIds) {
        String namespace = resourceAttributeExpression("evidence", "service.namespace");
        return "WITH ranked_spans AS (SELECT evidence.trace_id, evidence.span_id, evidence.span_name, "
                + "evidence.service_name, " + namespace + " AS service_namespace, evidence.duration_nano, "
                + "CAST(evidence.timestamp AS BIGINT) AS start_nanos, "
                + "COALESCE(CAST(evidence.timestamp_end AS BIGINT), "
                + "CAST(evidence.timestamp AS BIGINT) + CAST(evidence.duration_nano AS BIGINT)) AS end_nanos, "
                + "ROW_NUMBER() OVER (PARTITION BY evidence.trace_id ORDER BY evidence.timestamp, evidence.span_id) AS span_rank"
                + " FROM " + TRACE_TABLE + " evidence WHERE " + workspace
                + " AND evidence.trace_id IN (" + traceIds + ")), trace_evidence AS (SELECT trace_id, "
                + "MIN(start_nanos) AS observed_start_nanos, MAX(end_nanos) AS observed_end_nanos, "
                + "COUNT(*) AS evidence_span_count, COUNT(DISTINCT span_id) AS evidence_distinct_span_count, "
                + "SUM(CASE WHEN duration_nano IS NULL OR duration_nano < 0 OR duration_nano > 9007199254740991 "
                + "OR start_nanos IS NULL OR start_nanos < 0 OR end_nanos IS NULL OR end_nanos < start_nanos "
                + "OR end_nanos - start_nanos != duration_nano OR span_id IS NULL "
                + "OR NOT regexp_like(span_id, '^[0-9a-f]{16}$') OR span_id = '0000000000000000' "
                + "THEN 1 ELSE 0 END) AS invalid_span_count, "
                + "MAX(CASE WHEN span_rank = 1 THEN span_id ELSE NULL END) AS representative_span_id, "
                + "MAX(CASE WHEN span_rank = 1 THEN span_name ELSE NULL END) AS representative_span_name, "
                + "MAX(CASE WHEN span_rank = 1 THEN service_name ELSE NULL END) AS representative_service_name, "
                + "MAX(CASE WHEN span_rank = 1 THEN service_namespace ELSE NULL END) AS representative_service_namespace, "
                + "MAX(CASE WHEN span_rank = 1 THEN start_nanos ELSE NULL END) AS representative_start_nanos, "
                + "MAX(CASE WHEN span_rank = 1 THEN duration_nano ELSE NULL END) AS representative_duration_nano "
                + "FROM ranked_spans GROUP BY trace_id)";
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
    public boolean supportsTraceGroupByRows() {
        return true;
    }

    @Override
    public Map<String, Object> queryTraceOverviewRows(Long start,
                                                      Long end,
                                                      Boolean errorOnly,
                                                      String serviceName,
                                                      String serviceNamespace,
                                                      String environment,
                                                      String operationName,
                                                      Long minDurationNanos,
                                                      Long maxDurationNanos,
                                                      String workspaceId,
                                                      Map<String, Set<String>> resourceIdentityFilters,
                                                      Boolean hideInternal) {
        return queryTraceOverviewRows(start, end, errorOnly, serviceName, serviceNamespace, environment,
                operationName, minDurationNanos, maxDurationNanos, workspaceId, resourceIdentityFilters, hideInternal,
                null);
    }

    @Override
    public Map<String, Object> queryTraceOverviewRows(Long start,
                                                      Long end,
                                                      Boolean errorOnly,
                                                      String serviceName,
                                                      String serviceNamespace,
                                                      String environment,
                                                      String operationName,
                                                      Long minDurationNanos,
                                                      Long maxDurationNanos,
                                                      String workspaceId,
                                                      Map<String, Set<String>> resourceIdentityFilters,
                                                      Boolean hideInternal,
                                                      String spanScope) {
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
        addTraceSpanFilters(filters, operationName, minDurationNanos, maxDurationNanos, spanScope);
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
                                                        String operationName,
                                                        Long minDurationNanos,
                                                        Long maxDurationNanos,
                                                        String workspaceId,
                                                        Map<String, Set<String>> resourceIdentityFilters,
                                                        Boolean hideInternal) {
        return queryTraceIdOverviewRows(traceId, start, end, errorOnly, serviceName, serviceNamespace, environment,
                operationName, minDurationNanos, maxDurationNanos, workspaceId, resourceIdentityFilters, hideInternal,
                null);
    }

    @Override
    public Map<String, Object> queryTraceIdOverviewRows(String traceId,
                                                        Long start,
                                                        Long end,
                                                        Boolean errorOnly,
                                                        String serviceName,
                                                        String serviceNamespace,
                                                        String environment,
                                                        String operationName,
                                                        Long minDurationNanos,
                                                        Long maxDurationNanos,
                                                        String workspaceId,
                                                        Map<String, Set<String>> resourceIdentityFilters,
                                                        Boolean hideInternal,
                                                        String spanScope) {
        String errorExpression = "SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') "
                + "THEN 1 ELSE 0 END)";
        StringBuilder innerSql = buildTraceGroupedSql(start, end, serviceName, serviceNamespace, environment,
                operationName, minDurationNanos, maxDurationNanos, workspaceId, resourceIdentityFilters, hideInternal,
                errorExpression, traceId, spanScope);
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
    public List<Map<String, Object>> queryTraceGroupByRows(Long start,
                                                           Long end,
                                                           Boolean errorOnly,
                                                           String serviceName,
                                                           String serviceNamespace,
                                                           String environment,
                                                           String operationName,
                                                           Long minDurationNanos,
                                                           Long maxDurationNanos,
                                                           String workspaceId,
                                                           Map<String, Set<String>> resourceIdentityFilters,
                                                           Boolean hideInternal,
                                                           String groupBy,
                                                           String orderBy,
                                                           long minCount,
                                                           int limit) {
        return queryTraceGroupByRows(start, end, errorOnly, serviceName, serviceNamespace, environment, operationName,
                minDurationNanos, maxDurationNanos, workspaceId, resourceIdentityFilters, hideInternal, null, groupBy,
                orderBy, minCount, limit);
    }

    @Override
    public List<Map<String, Object>> queryTraceGroupByRows(Long start,
                                                           Long end,
                                                           Boolean errorOnly,
                                                           String serviceName,
                                                           String serviceNamespace,
                                                           String environment,
                                                           String operationName,
                                                           Long minDurationNanos,
                                                           Long maxDurationNanos,
                                                           String workspaceId,
                                                           Map<String, Set<String>> resourceIdentityFilters,
                                                           Boolean hideInternal,
                                                           String spanScope,
                                                           String groupBy,
                                                           String orderBy,
                                                           long minCount,
                                                           int limit) {
        String errorExpression = "SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') "
                + "THEN 1 ELSE 0 END)";
        String groupValueProjection = traceGroupValueProjection(groupBy, errorExpression);
        if (!StringUtils.hasText(groupValueProjection)) {
            return Collections.emptyList();
        }
        StringBuilder innerSql = new StringBuilder("SELECT trace_id, ")
                .append(groupValueProjection)
                .append(" AS group_value, ")
                .append("CASE WHEN SUM(CASE WHEN parent_span_id IS NULL OR parent_span_id = '' THEN 1 ELSE 0 END) = 1 ")
                .append("THEN MAX(CASE WHEN parent_span_id IS NULL OR parent_span_id = '' THEN duration_nano ELSE NULL END) ")
                .append("ELSE NULL END AS duration_nano, ")
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
        addTraceSpanFilters(filters, operationName, minDurationNanos, maxDurationNanos, spanScope);
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
        String sql = "SELECT group_value, COUNT(*) AS trace_count, "
                + "SUM(CASE WHEN error_span_count > 0 THEN 1 ELSE 0 END) AS error_trace_count, "
                + "COALESCE(SUM(duration_nano), 0) / NULLIF(COUNT(duration_nano), 0) / 1000000.0 AS latency_avg_ms, "
                + "uddsketch_calc(0.95, uddsketch_state(128, 0.01, duration_nano)) / 1000000.0 AS latency_p95_ms "
                + "FROM ("
                + innerSql
                + ") trace_group GROUP BY group_value HAVING COUNT(*) >= "
                + Math.max(minCount, 1L)
                + " ORDER BY "
                + traceGroupOrderBy(orderBy)
                + " LIMIT "
                + Math.max(limit, 1);
        return queryRows(sql);
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
                null, null, null, workspaceId, resourceIdentityFilters, hideInternal, errorExpression, null, null).toString();
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
                                               String operationName,
                                               Long minDurationNanos,
                                               Long maxDurationNanos,
                                               String workspaceId,
                                               Map<String, Set<String>> resourceIdentityFilters,
                                               Boolean hideInternal,
                                               String errorExpression,
                                               String traceId,
                                               String spanScope) {
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
        addTraceSpanFilters(filters, operationName, minDurationNanos, maxDurationNanos, spanScope);
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
        return queryTraceServiceGraphRowsInternal(
                limit, start, end, environment, null, serviceNames, hideInternal);
    }

    @Override
    public List<Map<String, Object>> queryTraceServiceGraphRows(int limit,
                                                                Long start,
                                                                Long end,
                                                                String environment,
                                                                String workspaceId,
                                                                Collection<String> serviceNames,
                                                                Boolean hideInternal) {
        if (!StringUtils.hasText(workspaceId)) {
            throw new TelemetryStorageUnavailableException();
        }
        return queryTraceServiceGraphRowsInternal(
                limit, start, end, environment, workspaceId.trim(), serviceNames, hideInternal);
    }

    private List<Map<String, Object>> queryTraceServiceGraphRowsInternal(int limit,
                                                                         Long start,
                                                                         Long end,
                                                                         String environment,
                                                                         String workspaceId,
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
        if (StringUtils.hasText(workspaceId)) {
            filters.add(workspaceFilter("child", workspaceId));
            filters.add(workspaceFilter("parent", workspaceId));
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
        return queryTraceRows(traceId, limit, null, null, null, null, null, null, null, null, null, null, false);
    }

    @Override
    public List<Map<String, Object>> queryTraceRows(TraceRowQuery query, int limit) {
        if (query == null || !StringUtils.hasText(query.traceId())) {
            return Collections.emptyList();
        }
        return queryTraceRows(query, limit, true);
    }

    @Override
    public List<Map<String, Object>> queryRecentTraceRows(TraceRowQuery query, int limit) {
        if (query == null) {
            return Collections.emptyList();
        }
        return queryTraceRows(query, limit, false);
    }

    private List<Map<String, Object>> queryTraceRows(TraceRowQuery query, int limit, boolean exactTrace) {
        StringBuilder sql = new StringBuilder("SELECT ")
                .append(TRACE_SELECT_COLUMNS)
                .append(" FROM ")
                .append(TRACE_TABLE);
        List<String> filters = new LinkedList<>();
        if (StringUtils.hasText(query.traceId())) {
            filters.add("trace_id = '" + escapeSql(query.traceId()) + "'");
        } else if (exactTrace) {
            return Collections.emptyList();
        }
        if (StringUtils.hasText(query.spanId())) {
            filters.add("span_id = '" + escapeSql(query.spanId()) + "'");
        }
        addTraceRowFilters(filters, query);
        if (!filters.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", filters));
        }
        sql.append(" ORDER BY timestamp ")
                .append(exactTrace ? "ASC" : "DESC")
                .append(", trace_id ASC, span_id ASC LIMIT ")
                .append(Math.max(limit, 1));
        return queryRows(sql.toString());
    }

    @Override
    public List<Map<String, Object>> queryTraceRows(String traceId,
                                                    int limit,
                                                    Long start,
                                                    Long end,
                                                    String serviceName,
                                                    String serviceNamespace,
                                                    String environment,
                                                    String operationName,
                                                    Long minDurationNanos,
                                                    Long maxDurationNanos,
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
        addTraceSpanFilters(filters, operationName, minDurationNanos, maxDurationNanos);
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
        sql.append(" ORDER BY timestamp ASC, trace_id ASC, span_id ASC LIMIT ").append(Math.max(limit, 1));
        return queryRows(sql.toString());
    }

    private void addTraceRowFilters(List<String> filters, TraceRowQuery query) {
        if (query.start() != null) {
            filters.add("timestamp >= to_timestamp_millis(" + query.start() + ")");
        }
        if (query.end() != null) {
            filters.add("timestamp <= to_timestamp_millis(" + query.end() + ")");
        }
        if (StringUtils.hasText(query.serviceName())) {
            filters.add("service_name = '" + escapeSql(query.serviceName()) + "'");
        }
        addTraceSpanFilters(
                filters, query.operationName(), query.minDurationNanos(), query.maxDurationNanos());
        if (StringUtils.hasText(query.serviceNamespace())) {
            filters.add(resourceAttributeFilter(null, "service.namespace", query.serviceNamespace()));
        }
        if (StringUtils.hasText(query.environment()) && !"all".equalsIgnoreCase(query.environment().trim())) {
            String filter = environmentFilter(null, query.environment());
            if (StringUtils.hasText(filter)) {
                filters.add(filter);
            }
        }
        if (StringUtils.hasText(query.workspaceId())) {
            String filter = workspaceFilter(null, query.workspaceId());
            if (StringUtils.hasText(filter)) {
                filters.add(filter);
            }
        }
        addResourceIdentityFilters(
                filters, null, query.resourceFilters(), query.serviceName(), query.serviceNamespace());
        addSpanAttributeFilters(filters, query.attributeFilters());
        if (Boolean.TRUE.equals(query.hideInternal())) {
            filters.add(SELF_TELEMETRY_SERVICE_FILTER);
        }
    }

    private void addSpanAttributeFilters(List<String> filters, Map<String, Set<String>> attributeFilters) {
        if (CollectionUtils.isEmpty(attributeFilters)) {
            return;
        }
        attributeFilters.forEach((key, values) -> {
            List<String> valueFilters = values.stream()
                    .map(value -> spanAttributeFilter(key, value))
                    .filter(StringUtils::hasText)
                    .toList();
            if (!valueFilters.isEmpty()) {
                filters.add(valueFilters.size() == 1
                        ? valueFilters.getFirst()
                        : "(" + String.join(" OR ", valueFilters) + ")");
            }
        });
    }

    private String spanAttributeFilter(String key, String value) {
        String expression = spanAttributeExpression(key);
        return StringUtils.hasText(expression)
                ? expression + " = '" + escapeSql(value.trim()) + "'"
                : "1 = 0";
    }

    private String spanAttributeExpression(String key) {
        String normalizedKey = key.trim();
        String column = "span_attributes." + normalizedKey;
        return dynamicAttributeColumnExists(column) ? qualifiedColumn(null, column) : null;
    }

    private List<Map<String, Object>> queryRows(String sql) {
        GreptimeSqlQueryExecutor executor = greptimeSqlQueryExecutorProvider.getIfAvailable();
        if (executor != null) {
            try {
                return executor.executeStrict(sql);
            } catch (Exception ex) {
                log.warn("Trace query failed");
                throw new TelemetryStorageUnavailableException();
            }
        }
        if (greptimeProperties == null || !StringUtils.hasText(greptimeProperties.httpEndpoint())) {
            throw new TelemetryStorageUnavailableException();
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
                    "sql=" + URLEncoder.encode(sql, StandardCharsets.UTF_8),
                    headers
            );
            ResponseEntity<GreptimeSqlQueryContent> responseEntity = restTemplate.exchange(
                    url, HttpMethod.POST, httpEntity, GreptimeSqlQueryContent.class
            );
            if (!responseEntity.getStatusCode().is2xxSuccessful() || responseEntity.getBody() == null
                    || (responseEntity.getBody().getCode() != null && responseEntity.getBody().getCode() != 0)
                    || CollectionUtils.isEmpty(responseEntity.getBody().getOutput())) {
                throw new TelemetryStorageUnavailableException();
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
            log.warn("Trace query fallback failed");
            throw new TelemetryStorageUnavailableException();
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
        String canonicalWorkspace = resourceAttributeExpression(alias, "hertzbeat.workspace_id");
        return canonicalWorkspace + " = '" + escapeSql(normalizedWorkspaceId) + "'";
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

    private void addTraceSpanFilters(List<String> filters,
                                     String operationName,
                                     Long minDurationNanos,
                                     Long maxDurationNanos) {
        addTraceSpanFilters(filters, operationName, minDurationNanos, maxDurationNanos, null);
    }

    private void addTraceSpanFilters(List<String> filters,
                                     String operationName,
                                     Long minDurationNanos,
                                     Long maxDurationNanos,
                                     String spanScope) {
        if (StringUtils.hasText(operationName)) {
            filters.add("span_name = '" + escapeSql(operationName.trim()) + "'");
        }
        if (minDurationNanos != null && minDurationNanos >= 0) {
            filters.add("duration_nano >= " + minDurationNanos);
        }
        if (maxDurationNanos != null && maxDurationNanos >= 0) {
            filters.add("duration_nano <= " + maxDurationNanos);
        }
        String scope = StringUtils.trimWhitespace(spanScope);
        if (!StringUtils.hasText(scope) || "all".equalsIgnoreCase(scope)) {
            return;
        }
        if ("root".equalsIgnoreCase(scope)) {
            filters.add("(parent_span_id IS NULL OR parent_span_id = '')");
            return;
        }
        if ("entrypoint".equalsIgnoreCase(scope)
                || "entrypoint-spans".equalsIgnoreCase(scope)
                || "entry".equalsIgnoreCase(scope)) {
            filters.add("(parent_span_id IS NULL OR parent_span_id = '' "
                    + "OR UPPER(span_kind) IN ('SPAN_KIND_SERVER', 'SERVER', 'SPAN_KIND_CONSUMER', 'CONSUMER'))");
        }
    }

    private List<String> traceCandidateFilters(Long start, Long end, boolean endExclusive, String serviceName,
                                                String serviceNamespace, String environment, String operationName,
                                                Long minDurationNanos, Long maxDurationNanos, String workspaceId,
                                                Map<String, Set<String>> resourceIdentityFilters, Boolean hideInternal,
                                                String spanScope) {
        List<String> filters = new LinkedList<>();
        if (start != null) {
            filters.add("timestamp >= to_timestamp_millis(" + start + ")");
        }
        if (end != null) {
            filters.add("timestamp " + (endExclusive ? "<" : "<=") + " to_timestamp_millis(" + end + ")");
        }
        if (StringUtils.hasText(serviceName)) {
            filters.add("service_name = '" + escapeSql(serviceName) + "'");
        }
        addTraceSpanFilters(filters, operationName, minDurationNanos, maxDurationNanos, spanScope);
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
        filters.add("trace_id IS NOT NULL AND trace_id != ''");
        return filters;
    }

    @Override
    public org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics.Evidence<?> queryAnalytics(
            org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics.Scope scope,
            org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics.Options options) {
        if (!scope.attributes().isEmpty()) {
            throw new UnsupportedOperationException("Span-attribute analytics uses bounded evidence");
        }
        var filters = traceCandidateFilters(scope.window().start(), scope.window().end(), scope.window().endExclusive(),
                scope.serviceName(), scope.serviceNamespace(), scope.environment(), scope.operationName(),
                scope.minDurationNanos(), scope.maxDurationNanos(), scope.workspaceId(), scope.resources(), scope.hideInternal(), scope.spanScope());
        if (StringUtils.hasText(scope.traceId())) {
            filters.add("trace_id = '" + escapeSql(scope.traceId()) + "'");
        }
        return GreptimeTraceAnalytics.query(this::queryRows, scope, options, String.join(" AND ", filters));
    }

    private String traceGroupValueProjection(String groupBy, String errorExpression) {
        String expression = traceGroupExpression(groupBy, errorExpression);
        if (!StringUtils.hasText(expression)) {
            return null;
        }
        if ("status".equals(normalizeTraceGroupBy(groupBy))) {
            return expression;
        }
        return "COALESCE(NULLIF(MAX(" + expression + "), ''), 'unknown')";
    }

    private String traceGroupOrderBy(String orderBy) {
        String normalized = StringUtils.trimWhitespace(orderBy);
        if ("error-count-desc".equalsIgnoreCase(normalized)) {
            return "error_trace_count DESC";
        }
        if ("latency-p95-desc".equalsIgnoreCase(normalized)) {
            return "latency_p95_ms DESC NULLS LAST, group_value ASC";
        }
        return "trace_count DESC";
    }

    private String traceGroupExpression(String groupBy, String errorExpression) {
        String normalizedGroupBy = normalizeTraceGroupBy(groupBy);
        if (!StringUtils.hasText(normalizedGroupBy)) {
            return null;
        }
        if ("service.name".equals(normalizedGroupBy)) {
            return "service_name";
        }
        if ("operation.name".equals(normalizedGroupBy)) {
            return "span_name";
        }
        if ("status".equals(normalizedGroupBy)) {
            return "CASE WHEN " + errorExpression + " > 0 THEN 'ERROR' "
                    + "WHEN SUM(CASE WHEN span_status_code IN ('STATUS_CODE_OK', 'OK') THEN 1 ELSE 0 END) = COUNT(*) "
                    + "THEN 'OK' ELSE 'UNSET' END";
        }
        if (normalizedGroupBy.startsWith("resource:")) {
            String key = normalizedGroupBy.substring("resource:".length());
            if (!isSafeTraceGroupResourceKey(key)) {
                return null;
            }
            return resourceAttributeExpression(null, key);
        }
        if (isSafeTraceGroupResourceKey(normalizedGroupBy)) {
            return resourceAttributeExpression(null, normalizedGroupBy);
        }
        return null;
    }

    private String normalizeTraceGroupBy(String groupBy) {
        if (!StringUtils.hasText(groupBy)) {
            return null;
        }
        String normalized = groupBy.trim().toLowerCase();
        if ("service_name".equals(normalized)) {
            return "service.name";
        }
        if ("operation".equals(normalized) || "operation.name".equals(normalized)
                || "span.name".equals(normalized) || "span_name".equals(normalized)) {
            return "operation.name";
        }
        if ("status".equals(normalized) || "error".equals(normalized)) {
            return "status";
        }
        return normalized;
    }

    private boolean isSafeTraceGroupResourceKey(String key) {
        if (!StringUtils.hasText(key)) {
            return false;
        }
        for (int index = 0; index < key.length(); index++) {
            char character = key.charAt(index);
            if (!Character.isLetterOrDigit(character) && character != '.' && character != '_' && character != '-') {
                return false;
            }
        }
        return true;
    }

    private String resourceAttributeFilter(String alias, String key, String value) {
        String expression = resourceAttributeExpression(alias, key);
        if (!StringUtils.hasText(expression)) {
            return "1 = 0";
        }
        return expression + " = '"
                + escapeSql(value.trim()) + "'";
    }

    private String resourceAttributeExpression(String alias, String key) {
        String normalizedKey = key.trim();
        String column = "resource_attributes." + normalizedKey;
        if (STABLE_RESOURCE_ATTRIBUTE_KEYS.contains(normalizedKey) || dynamicAttributeColumnExists(column)) {
            return qualifiedColumn(alias, column);
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

    private String traceRootResourceAttributeProjections(String rootPredicate) {
        return TRACE_LIST_RESOURCE_ATTRIBUTE_KEYS.stream()
                .map(key -> {
                    String column = resourceAttributeExpression("stats", key);
                    return "MAX(CASE WHEN " + rootPredicate + " THEN " + column + " ELSE NULL END) AS "
                            + quoteIdentifier("resource_attributes." + key);
                })
                .collect(java.util.stream.Collectors.joining(", "));
    }

    private TraceListCandidatePage traceListCandidatePage(List<Map<String, Object>> rows, int offset) {
        if (CollectionUtils.isEmpty(rows)) {
            return new TraceListCandidatePage(List.of(), 0L);
        }
        List<String> traceIds = new ArrayList<>(rows.size());
        Set<String> uniqueTraceIds = new LinkedHashSet<>();
        Long totalCount = null;
        for (Map<String, Object> row : rows) {
            String traceId = traceListText(row, "trace_id");
            long rowTotalCount = traceListNonNegativeLong(row, "total_count");
            if (!StringUtils.hasText(traceId) || !uniqueTraceIds.add(traceId)
                    || totalCount != null && totalCount != rowTotalCount) {
                throw new TelemetryStorageUnavailableException();
            }
            traceIds.add(traceId);
            totalCount = rowTotalCount;
        }
        long minimumTotal;
        try {
            minimumTotal = Math.addExact(offset, traceIds.size());
        } catch (ArithmeticException ignored) {
            throw new TelemetryStorageUnavailableException();
        }
        if (totalCount == null || totalCount < minimumTotal) {
            throw new TelemetryStorageUnavailableException();
        }
        return new TraceListCandidatePage(List.copyOf(traceIds), totalCount);
    }

    private List<Map<String, Object>> completeTraceListRows(TraceListCandidatePage candidatePage,
                                                             List<Map<String, Object>> serviceRows) {
        if (CollectionUtils.isEmpty(serviceRows)
                || serviceRows.size() > TraceQueryRepository.MAX_TRACE_LIST_SERVICE_ROWS) {
            throw new TelemetryStorageUnavailableException();
        }
        Map<String, Integer> traceOrder = new LinkedHashMap<>();
        Map<String, long[]> traceTotals = new LinkedHashMap<>();
        for (int index = 0; index < candidatePage.traceIds().size(); index++) {
            String traceId = candidatePage.traceIds().get(index);
            traceOrder.put(traceId, index);
            traceTotals.put(traceId, new long[4]);
        }

        List<Map<String, Object>> completedRows = new ArrayList<>(serviceRows.size());
        Set<String> observedTraceIds = new LinkedHashSet<>();
        try {
            for (Map<String, Object> serviceRow : serviceRows) {
                String traceId = traceListText(serviceRow, "trace_id");
                long[] totals = traceTotals.get(traceId);
                long spanCount = traceListNonNegativeLong(serviceRow, "service_span_count");
                long errorCount = traceListNonNegativeLong(serviceRow, "service_error_span_count");
                long rootCount = traceListNonNegativeLong(serviceRow, "service_root_span_count");
                long okCount = traceListNonNegativeLong(serviceRow, "service_ok_span_count");
                if (totals == null || spanCount == 0 || errorCount > spanCount || rootCount > spanCount
                        || okCount > spanCount - errorCount) {
                    throw new TelemetryStorageUnavailableException();
                }
                totals[0] = Math.addExact(totals[0], spanCount);
                totals[1] = Math.addExact(totals[1], errorCount);
                totals[2] = Math.addExact(totals[2], rootCount);
                totals[3] = Math.addExact(totals[3], okCount);
                observedTraceIds.add(traceId);
                completedRows.add(new HashMap<>(serviceRow));
            }
        } catch (ArithmeticException ignored) {
            throw new TelemetryStorageUnavailableException();
        }
        if (observedTraceIds.size() != candidatePage.traceIds().size()) {
            throw new TelemetryStorageUnavailableException();
        }

        completedRows.sort(Comparator
                .comparingInt((Map<String, Object> row) -> traceOrder.get(traceListText(row, "trace_id")))
                .thenComparing(row -> traceListText(row, "stats_service_name"),
                        Comparator.nullsFirst(String::compareTo)));
        long serviceRowCount = completedRows.size();
        for (Map<String, Object> row : completedRows) {
            long[] totals = traceTotals.get(traceListText(row, "trace_id"));
            row.put("span_status_code", totals[1] > 0 ? "ERROR" : totals[3] == totals[0] ? "OK" : "UNSET");
            row.put("error_span_count", totals[1]);
            row.put("span_count", totals[0]);
            row.put("root_span_count", totals[2]);
            row.put("total_count", candidatePage.totalCount());
            row.put("service_row_count", serviceRowCount);
        }
        return completedRows;
    }

    private String traceListText(Map<String, Object> row, String key) {
        Object value = row == null ? null : row.get(key);
        return value == null ? null : StringUtils.trimWhitespace(String.valueOf(value));
    }

    private long traceListNonNegativeLong(Map<String, Object> row, String key) {
        Object value = row == null ? null : row.get(key);
        long result;
        if (value != null) {
            try {
                result = new BigDecimal(value.toString()).longValueExact();
            } catch (NumberFormatException | ArithmeticException ignored) {
                throw new TelemetryStorageUnavailableException();
            }
        } else {
            throw new TelemetryStorageUnavailableException();
        }
        if (result < 0) {
            throw new TelemetryStorageUnavailableException();
        }
        return result;
    }

    private record TraceListCandidatePage(List<String> traceIds, long totalCount) {
    }

    /**
     * Discovers schema-less long-tail columns with a hard result bound. This is not a
     * version-compatibility probe: stable HertzBeat dimensions never depend on it. Missing columns
     * trigger a throttled refresh so native pipeline schema evolution becomes visible without
     * allowing concurrent or repeated user queries to issue an unbounded number of DESC requests.
     */
    private boolean dynamicAttributeColumnExists(String column) {
        DynamicAttributeSchemaSnapshot snapshot = dynamicAttributeSchemaSnapshot;
        if (snapshot != null && snapshot.columns().contains(column)) {
            return true;
        }
        long now = monotonicNanos.getAsLong();
        if (snapshot == null || refreshDue(snapshot, now)) {
            snapshot = refreshDynamicAttributeColumns(now);
        }
        if (!snapshot.available()) {
            throw new TelemetryStorageUnavailableException();
        }
        return snapshot.columns().contains(column);
    }

    private boolean refreshDue(DynamicAttributeSchemaSnapshot snapshot, long now) {
        return now - snapshot.refreshedAtNanos() >= dynamicAttributeSchemaRefreshNanos;
    }

    private DynamicAttributeSchemaSnapshot refreshDynamicAttributeColumns(long requestedAtNanos) {
        DynamicAttributeSchemaSnapshot cached = dynamicAttributeSchemaSnapshot;
        if (cached != null && !refreshDue(cached, requestedAtNanos)) {
            return cached;
        }
        synchronized (this) {
            cached = dynamicAttributeSchemaSnapshot;
            long refreshedAtNanos = monotonicNanos.getAsLong();
            if (cached != null && !refreshDue(cached, refreshedAtNanos)) {
                return cached;
            }
            try {
                Set<String> discovered = new LinkedHashSet<>();
                for (Map<String, Object> row : queryRows("DESC " + TRACE_TABLE)) {
                    if (discovered.size() >= MAX_DISCOVERED_DYNAMIC_ATTRIBUTE_COLUMNS) {
                        break;
                    }
                    String column = discoveredColumnName(row);
                    if (StringUtils.hasText(column)
                            && (column.startsWith("resource_attributes.") || column.startsWith("span_attributes."))) {
                        discovered.add(column);
                    }
                }
                cached = new DynamicAttributeSchemaSnapshot(
                        Collections.unmodifiableSet(discovered), refreshedAtNanos, true);
                dynamicAttributeSchemaSnapshot = cached;
                return cached;
            } catch (TelemetryStorageUnavailableException ex) {
                Set<String> staleColumns = cached == null ? Collections.emptySet() : cached.columns();
                dynamicAttributeSchemaSnapshot = new DynamicAttributeSchemaSnapshot(
                        staleColumns, refreshedAtNanos, false);
                throw ex;
            }
        }
    }

    private String discoveredColumnName(Map<String, Object> row) {
        if (CollectionUtils.isEmpty(row)) {
            return null;
        }
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            if (("column".equalsIgnoreCase(entry.getKey()) || "column_name".equalsIgnoreCase(entry.getKey()))
                    && entry.getValue() != null) {
                return String.valueOf(entry.getValue()).trim();
            }
        }
        return null;
    }

    private record DynamicAttributeSchemaSnapshot(Set<String> columns, long refreshedAtNanos, boolean available) {
    }

}
