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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeSqlQueryContent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class GreptimeTraceQueryRepositoryTest {

    @Mock
    private ObjectProvider<GreptimeSqlQueryExecutor> greptimeSqlQueryExecutorProvider;

    @Mock
    private GreptimeSqlQueryExecutor greptimeSqlQueryExecutor;

    @Mock
    private GreptimeProperties greptimeProperties;

    @Mock
    private RestTemplate restTemplate;

    private GreptimeTraceQueryRepository repository;

    @BeforeEach
    void setUp() {
        repository = new GreptimeTraceQueryRepository(
                greptimeSqlQueryExecutorProvider, greptimeProperties, restTemplate);
    }

    @Test
    void queryRecentTraceRowsUsesSqlExecutorWhenAvailable() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of("trace_id", "trace-1")));

        List<Map<String, Object>> rows = repository.queryRecentTraceRows(20);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        assertEquals("trace-1", rows.getFirst().get("trace_id"));
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor).execute(sqlCaptor.capture());
        assertTraceSqlProjectsAttribution(sqlCaptor.getValue());
        assertTrue(sqlCaptor.getValue().endsWith("FROM hzb_traces ORDER BY timestamp DESC LIMIT 20"));
    }

    @Test
    void queryRecentTraceRowsPushesServiceAndInternalFiltersIntoNarrowSql() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of("trace_id", "trace-1")));

        List<Map<String, Object>> rows = repository.queryRecentTraceRows(30, "recommendation", true);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor).execute(sqlCaptor.capture());
        assertTraceSqlProjectsAttribution(sqlCaptor.getValue());
        assertTrue(sqlCaptor.getValue().endsWith("FROM hzb_traces WHERE service_name = 'recommendation' "
                + "AND LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat') ORDER BY timestamp DESC LIMIT 30"));
    }

    @Test
    void queryRecentTraceRowsPushesTimeWindowIntoGreptimeSql() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of("trace_id", "trace-1")));

        List<Map<String, Object>> rows = repository.queryRecentTraceRows(
                50, 1710000000000L, 1710003600000L, "checkout", "prod", true);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(2)).execute(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTraceSqlProjectsAttribution(sql);
        assertTrue(sql.contains("timestamp >= to_timestamp_millis(1710000000000)"));
        assertTrue(sql.contains("timestamp <= to_timestamp_millis(1710003600000)"));
        assertTrue(sql.contains("service_name = 'checkout'"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"deployment.environment.name\"]') "
                + "= 'prod'"));
        assertTrue(sql.contains("LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.endsWith("ORDER BY timestamp DESC LIMIT 50"));
    }

    @Test
    void queryRecentTraceRowsPushesWorkspaceAndEntityScopeIntoGreptimeSql() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of("trace_id", "trace-1")));

        List<Map<String, Object>> rows = repository.queryRecentTraceRows(
                75,
                1710000000000L,
                1710003600000L,
                "checkout",
                "commerce",
                "prod",
                null,
                null,
                null,
                "team-a",
                Map.of(
                        "service.name", Set.of("checkout"),
                        "service.namespace", Set.of("commerce"),
                        "host.name", Set.of("checkout-1", "checkout-2")
                ),
                true);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(2)).execute(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTraceSqlProjectsAttribution(sql);
        assertTrue(sql.contains("timestamp >= to_timestamp_millis(1710000000000)"));
        assertTrue(sql.contains("timestamp <= to_timestamp_millis(1710003600000)"));
        assertTrue(sql.contains("service_name = 'checkout'"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"service.namespace\"]') = 'commerce'"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"deployment.environment.name\"]') "
                + "= 'prod'"));
        assertTrue(sql.contains("(json_get_string(resource_attributes, '$[\"hertzbeat.workspace_id\"]') = 'team-a' "
                + "OR json_get_string(resource_attributes, '$[\"workspace.id\"]') = 'team-a')"));
        assertTrue(sql.contains("(json_get_string(resource_attributes, '$[\"host.name\"]') = 'checkout-1' "
                + "OR json_get_string(resource_attributes, '$[\"host.name\"]') = 'checkout-2')"));
        assertTrue(sql.contains("LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.endsWith("ORDER BY timestamp DESC LIMIT 75"));
    }

    @Test
    void queryTraceListRowsPushesGroupingPaginationAndTotalCountIntoGreptimeSql() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "trace_id", "trace-1",
                "total_count", 42L)));

        List<Map<String, Object>> rows = repository.queryTraceListRows(
                1710000000000L,
                1710003600000L,
                false,
                "checkout",
                "commerce",
                "prod",
                "GET /checkout",
                100_000_000L,
                500_000_000L,
                "team-a",
                Map.of("host.name", Set.of("checkout-1", "checkout-2")),
                true,
                40,
                20);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(2)).execute(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTrue(sql.contains("COUNT(*) OVER () AS total_count"));
        assertTrue(sql.contains("FROM (SELECT trace_id"));
        assertTrue(sql.contains("SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') "
                + "THEN 1 ELSE 0 END) AS error_span_count"));
        assertEquals(1, sql.split(" AS resource_attributes", -1).length - 1,
                "trace-list SQL must project resource_attributes with exactly one alias");
        assertTrue(sql.contains("FROM hzb_traces WHERE timestamp >= to_timestamp_millis(1710000000000)"));
        assertTrue(sql.contains("timestamp <= to_timestamp_millis(1710003600000)"));
        assertTrue(sql.contains("service_name = 'checkout'"));
        assertTrue(sql.contains("span_name = 'GET /checkout'"));
        assertTrue(sql.contains("duration_nano >= 100000000"));
        assertTrue(sql.contains("duration_nano <= 500000000"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"service.namespace\"]') = 'commerce'"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"deployment.environment.name\"]') "
                + "= 'prod'"));
        assertTrue(sql.contains("(json_get_string(resource_attributes, '$[\"hertzbeat.workspace_id\"]') = 'team-a' "
                + "OR json_get_string(resource_attributes, '$[\"workspace.id\"]') = 'team-a')"));
        assertTrue(sql.contains("(json_get_string(resource_attributes, '$[\"host.name\"]') = 'checkout-1' "
                + "OR json_get_string(resource_attributes, '$[\"host.name\"]') = 'checkout-2')"));
        assertTrue(sql.contains("LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.contains("GROUP BY trace_id"));
        assertTrue(sql.endsWith("ORDER BY timestamp DESC LIMIT 20 OFFSET 40"));
    }

    @Test
    void queryTraceListRowsScopesSpanFiltersToEntrypointSpans() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "trace_id", "trace-entry",
                "total_count", 1L)));

        List<Map<String, Object>> rows = repository.queryTraceListRows(
                1710000000000L,
                1710003600000L,
                false,
                "checkout",
                null,
                "prod",
                "POST /checkout",
                100_000_000L,
                500_000_000L,
                "team-a",
                Map.of(),
                false,
                "entrypoint",
                0,
                20);

        assertEquals(1, rows.size());
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(2)).execute(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTrue(sql.contains("span_name = 'POST /checkout'"));
        assertTrue(sql.contains("duration_nano >= 100000000"));
        assertTrue(sql.contains("duration_nano <= 500000000"));
        assertTrue(sql.contains("(parent_span_id IS NULL OR parent_span_id = '' "
                + "OR UPPER(span_kind) IN ('SPAN_KIND_SERVER', 'SERVER', 'SPAN_KIND_CONSUMER', 'CONSUMER'))"));
    }

    @Test
    void queryTraceOverviewRowsPushesAggregateFiltersIntoGreptimeSql() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "total_trace_count", 42L,
                "error_trace_count", 7L,
                "latest_observed_at", 1710003600000L)));

        Map<String, Object> overview = repository.queryTraceOverviewRows(
                1710000000000L,
                1710003600000L,
                true,
                "checkout",
                "commerce",
                "prod",
                "GET /checkout",
                100_000_000L,
                500_000_000L,
                "team-a",
                Map.of("host.name", Set.of("checkout-1", "checkout-2")),
                true,
                "entrypoint");

        assertEquals(42L, overview.get("total_trace_count"));
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(2)).execute(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTrue(sql.startsWith("SELECT COUNT(*) AS total_trace_count"));
        assertTrue(sql.contains("SUM(CASE WHEN error_span_count > 0 THEN 1 ELSE 0 END) AS error_trace_count"));
        assertTrue(sql.contains("MAX(trace_start_time) AS latest_observed_at"));
        assertTrue(sql.contains("FROM (SELECT trace_id, MIN(timestamp) AS trace_start_time"));
        assertTrue(sql.contains("SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') "
                + "THEN 1 ELSE 0 END) AS error_span_count"));
        assertTrue(sql.contains("FROM hzb_traces WHERE timestamp >= to_timestamp_millis(1710000000000)"));
        assertTrue(sql.contains("timestamp <= to_timestamp_millis(1710003600000)"));
        assertTrue(sql.contains("service_name = 'checkout'"));
        assertTrue(sql.contains("span_name = 'GET /checkout'"));
        assertTrue(sql.contains("duration_nano >= 100000000"));
        assertTrue(sql.contains("duration_nano <= 500000000"));
        assertTrue(sql.contains("(parent_span_id IS NULL OR parent_span_id = '' "
                + "OR UPPER(span_kind) IN ('SPAN_KIND_SERVER', 'SERVER', 'SPAN_KIND_CONSUMER', 'CONSUMER'))"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"service.namespace\"]') = 'commerce'"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"deployment.environment.name\"]') "
                + "= 'prod'"));
        assertTrue(sql.contains("(json_get_string(resource_attributes, '$[\"hertzbeat.workspace_id\"]') = 'team-a' "
                + "OR json_get_string(resource_attributes, '$[\"workspace.id\"]') = 'team-a')"));
        assertTrue(sql.contains("(json_get_string(resource_attributes, '$[\"host.name\"]') = 'checkout-1' "
                + "OR json_get_string(resource_attributes, '$[\"host.name\"]') = 'checkout-2')"));
        assertTrue(sql.contains("LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.contains("GROUP BY trace_id HAVING "
                + "SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') THEN 1 ELSE 0 END) > 0"));
        assertTrue(sql.endsWith(") trace_overview"));
    }

    @Test
    void queryTraceIdOverviewRowsPushesTraceIdAggregateFiltersIntoGreptimeSql() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "total_trace_count", 1L,
                "error_trace_count", 1L,
                "latest_observed_at", 1710003600000L)));

        Map<String, Object> overview = repository.queryTraceIdOverviewRows(
                "trace-'filtered",
                1710000000000L,
                1710003600000L,
                true,
                "checkout",
                "commerce",
                "prod",
                "POST /checkout",
                200_000_000L,
                900_000_000L,
                "team-a",
                Map.of("host.name", Set.of("checkout-1", "checkout-2")),
                true,
                "root");

        assertEquals(1L, overview.get("total_trace_count"));
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(2)).execute(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTrue(sql.startsWith("SELECT COUNT(*) AS total_trace_count"));
        assertTrue(sql.contains("SUM(CASE WHEN error_span_count > 0 THEN 1 ELSE 0 END) AS error_trace_count"));
        assertTrue(sql.contains("MAX(trace_start_time) AS latest_observed_at"));
        assertTrue(sql.contains("FROM (SELECT trace_id, MIN(timestamp) AS trace_start_time"));
        assertTrue(sql.contains("trace_id = 'trace-''filtered'"));
        assertTrue(sql.contains("timestamp >= to_timestamp_millis(1710000000000)"));
        assertTrue(sql.contains("timestamp <= to_timestamp_millis(1710003600000)"));
        assertTrue(sql.contains("service_name = 'checkout'"));
        assertTrue(sql.contains("span_name = 'POST /checkout'"));
        assertTrue(sql.contains("duration_nano >= 200000000"));
        assertTrue(sql.contains("duration_nano <= 900000000"));
        assertTrue(sql.contains("(parent_span_id IS NULL OR parent_span_id = '')"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"service.namespace\"]') = 'commerce'"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"deployment.environment.name\"]') "
                + "= 'prod'"));
        assertTrue(sql.contains("(json_get_string(resource_attributes, '$[\"hertzbeat.workspace_id\"]') = 'team-a' "
                + "OR json_get_string(resource_attributes, '$[\"workspace.id\"]') = 'team-a')"));
        assertTrue(sql.contains("(json_get_string(resource_attributes, '$[\"host.name\"]') = 'checkout-1' "
                + "OR json_get_string(resource_attributes, '$[\"host.name\"]') = 'checkout-2')"));
        assertTrue(sql.contains("LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.contains("GROUP BY trace_id HAVING "
                + "SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') THEN 1 ELSE 0 END) > 0"));
        assertTrue(sql.endsWith(") trace_id_overview"));
    }

    @Test
    void queryTraceSummaryRowsPushesAggregateAndLatestTraceIntoGreptimeSql() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "total_trace_count", 7L,
                "error_trace_count", 2L,
                "latest_observed_at", 1710003600000L,
                "latest_trace_id", "trace-latest")));

        Map<String, Object> summary = repository.queryTraceSummaryRows(
                1710000000000L,
                1710003600000L,
                "checkout",
                "commerce",
                "prod",
                "team-a",
                Map.of("host.name", Set.of("checkout-1", "checkout-2")),
                true);

        assertEquals("trace-latest", summary.get("latest_trace_id"));
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(2)).execute(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTrue(sql.startsWith("SELECT summary.total_trace_count"));
        assertTrue(sql.contains("summary.error_trace_count"));
        assertTrue(sql.contains("latest.trace_start_time AS latest_observed_at"));
        assertTrue(sql.contains("latest.trace_id AS latest_trace_id"));
        assertTrue(sql.contains("SELECT COUNT(*) AS total_trace_count"));
        assertTrue(sql.contains("SUM(CASE WHEN error_span_count > 0 THEN 1 ELSE 0 END) AS error_trace_count"));
        assertTrue(sql.contains("FROM (SELECT trace_id, MIN(timestamp) AS trace_start_time"));
        assertTrue(sql.contains("SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') "
                + "THEN 1 ELSE 0 END) AS error_span_count"));
        assertTrue(sql.contains("FROM hzb_traces WHERE timestamp >= to_timestamp_millis(1710000000000)"));
        assertTrue(sql.contains("timestamp <= to_timestamp_millis(1710003600000)"));
        assertTrue(sql.contains("service_name = 'checkout'"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"service.namespace\"]') = 'commerce'"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"deployment.environment.name\"]') "
                + "= 'prod'"));
        assertTrue(sql.contains("(json_get_string(resource_attributes, '$[\"hertzbeat.workspace_id\"]') = 'team-a' "
                + "OR json_get_string(resource_attributes, '$[\"workspace.id\"]') = 'team-a')"));
        assertTrue(sql.contains("(json_get_string(resource_attributes, '$[\"host.name\"]') = 'checkout-1' "
                + "OR json_get_string(resource_attributes, '$[\"host.name\"]') = 'checkout-2')"));
        assertTrue(sql.contains("LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.contains("ORDER BY trace_start_time DESC LIMIT 1"));
        assertTrue(sql.endsWith(") latest ON TRUE"));
    }

    @Test
    void queryTraceGroupByRowsAggregatesByTraceBeforeGroupingFieldValues() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "group_value", "1.2.3",
                "trace_count", 12L,
                "error_trace_count", 2L,
                "latency_avg_ms", 84.5d,
                "latency_p95_ms", 210.0d)));

        List<Map<String, Object>> rows = repository.queryTraceGroupByRows(
                1710000000000L,
                1710003600000L,
                true,
                "checkout",
                "commerce",
                "prod",
                "GET /checkout",
                100_000_000L,
                500_000_000L,
                "team-a",
                Map.of("host.name", Set.of("checkout-1", "checkout-2")),
                true,
                "entrypoint",
                "resource:service.version",
                "latency-p95-desc",
                5,
                7);

        assertEquals("1.2.3", rows.getFirst().get("group_value"));
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(2)).execute(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTrue(sql.startsWith("SELECT group_value, COUNT(*) AS trace_count"));
        assertTrue(sql.contains("SUM(CASE WHEN error_span_count > 0 THEN 1 ELSE 0 END) AS error_trace_count"));
        assertTrue(sql.contains("COALESCE(SUM(duration_nano), 0) / NULLIF(COUNT(duration_nano), 0) "
                + "/ 1000000.0 AS latency_avg_ms"));
        assertTrue(sql.contains("uddsketch_calc(0.95, uddsketch_state(128, 0.01, duration_nano)) "
                + "/ 1000000.0 AS latency_p95_ms"));
        assertTrue(sql.contains("FROM (SELECT trace_id, "
                + "COALESCE(NULLIF(MAX(json_get_string(resource_attributes, '$[\"service.version\"]')), ''), "
                + "'unknown') AS group_value"));
        assertTrue(sql.contains("MAX(duration_nano) AS duration_nano"));
        assertTrue(sql.contains("SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') "
                + "THEN 1 ELSE 0 END) AS error_span_count"));
        assertTrue(sql.contains("FROM hzb_traces WHERE timestamp >= to_timestamp_millis(1710000000000)"));
        assertTrue(sql.contains("(parent_span_id IS NULL OR parent_span_id = '' "
                + "OR UPPER(span_kind) IN ('SPAN_KIND_SERVER', 'SERVER', 'SPAN_KIND_CONSUMER', 'CONSUMER'))"));
        assertTrue(sql.contains("timestamp <= to_timestamp_millis(1710003600000)"));
        assertTrue(sql.contains("service_name = 'checkout'"));
        assertTrue(sql.contains("span_name = 'GET /checkout'"));
        assertTrue(sql.contains("duration_nano >= 100000000"));
        assertTrue(sql.contains("duration_nano <= 500000000"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"service.namespace\"]') = 'commerce'"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"deployment.environment.name\"]') "
                + "= 'prod'"));
        assertTrue(sql.contains("(json_get_string(resource_attributes, '$[\"hertzbeat.workspace_id\"]') = 'team-a' "
                + "OR json_get_string(resource_attributes, '$[\"workspace.id\"]') = 'team-a')"));
        assertTrue(sql.contains("(json_get_string(resource_attributes, '$[\"host.name\"]') = 'checkout-1' "
                + "OR json_get_string(resource_attributes, '$[\"host.name\"]') = 'checkout-2')"));
        assertTrue(sql.endsWith("GROUP BY group_value HAVING COUNT(*) >= 5 ORDER BY latency_p95_ms DESC LIMIT 7"));
        assertTrue(sql.contains("LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.contains("GROUP BY trace_id HAVING "
                + "SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') THEN 1 ELSE 0 END) > 0"));
        assertTrue(sql.endsWith(") trace_group GROUP BY group_value HAVING COUNT(*) >= 5 ORDER BY latency_p95_ms DESC LIMIT 7"));
    }

    @Test
    void queryTraceServiceGraphRowsPushesServiceGraphRedAggregationIntoGreptimeSql() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "source_service_name", "checkout-api",
                "target_service_name", "payment-api",
                "request_count", 2L)));

        List<Map<String, Object>> rows = repository.queryTraceServiceGraphRows(
                100, 1710000000000L, 1710003600000L, "prod", List.of("checkout-api", "payment-api"), true);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(2)).execute(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTrue(sql.startsWith("SELECT parent.service_name AS source_service_name, "
                + "child.service_name AS target_service_name"));
        assertTrue(sql.contains("COUNT(*) AS request_count"));
        assertTrue(sql.contains("SUM(CASE WHEN child.span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') "
                + "THEN 1 ELSE 0 END) AS error_count"));
        assertTrue(sql.contains("COALESCE(SUM(child.duration_nano), 0) AS duration_sum_nano"));
        assertTrue(sql.contains("COUNT(child.duration_nano) AS duration_count"));
        assertTrue(!sql.contains("AS duration_sketch"));
        assertTrue(sql.contains("uddsketch_calc(0.95, uddsketch_state(128, 0.01, child.duration_nano)) "
                + "/ 1000000.0 AS latency_p95_ms"));
        assertTrue(sql.contains("COALESCE(SUM(child.duration_nano), 0) "
                + "/ NULLIF(COUNT(child.duration_nano), 0) / 1000000.0 AS latency_avg_ms"));
        assertTrue(sql.contains("MAX(child.span_id) AS sample_span_id"));
        assertTrue(sql.contains("MIN(child.timestamp) AS first_seen"));
        assertTrue(sql.contains("MAX(child.timestamp) AS last_seen"));
        assertTrue(sql.contains("FROM hzb_traces child JOIN hzb_traces parent"));
        assertTrue(sql.contains("child.trace_id = parent.trace_id"));
        assertTrue(sql.contains("child.parent_span_id = parent.span_id"));
        assertTrue(sql.contains("child.timestamp >= to_timestamp_millis(1710000000000)"));
        assertTrue(sql.contains("child.timestamp <= to_timestamp_millis(1710003600000)"));
        assertTrue(sql.contains("parent.timestamp >= to_timestamp_millis(1710000000000)"));
        assertTrue(sql.contains("parent.timestamp <= to_timestamp_millis(1710003600000)"));
        assertTrue(sql.contains("json_get_string(child.resource_attributes, '$[\"deployment.environment.name\"]') "
                + "= 'prod'"));
        assertTrue(sql.contains("json_get_string(parent.resource_attributes, '$[\"deployment.environment.name\"]') "
                + "= 'prod'"));
        assertTrue(sql.contains("((child.service_name = 'checkout-api' OR child.service_name = 'payment-api') "
                + "OR (parent.service_name = 'checkout-api' OR parent.service_name = 'payment-api'))"));
        assertTrue(sql.contains("LOWER(child.service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.contains("LOWER(parent.service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.contains("LOWER(child.service_name) != LOWER(parent.service_name)"));
        assertTrue(sql.contains("GROUP BY parent.service_name, child.service_name"));
        assertTrue(sql.endsWith("ORDER BY request_count DESC LIMIT 100"));
    }

    @Test
    void queryTraceServiceGraphRowsUsesFlattenedResourceAttributeColumnsWhenGreptimeSchemaHasNoJsonColumn() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            if (sql.startsWith("DESC hzb_traces")) {
                return List.of(
                        Map.of("Column", "timestamp"),
                        Map.of("Column", "service_name"),
                        Map.of("Column", "resource_attributes.deployment.environment.name"),
                        Map.of("Column", "resource_attributes.host.name")
                );
            }
            return List.of(Map.of(
                    "source_service_name", "checkout-api",
                    "target_service_name", "payment-api",
                    "request_count", 2L));
        });

        repository.queryTraceServiceGraphRows(100, 1710000000000L, 1710003600000L, "prod", true);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(2)).execute(sqlCaptor.capture());
        String sql = sqlCaptor.getAllValues().get(1);
        assertTrue(sql.contains("child.\"resource_attributes.deployment.environment.name\" = 'prod'"));
        assertTrue(sql.contains("LOWER(child.service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.contains("LOWER(parent.service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(!sql.contains("json_get_string(child.resource_attributes"));
    }

    @Test
    void queryTraceRowsFallsBackToGreptimeHttpWhenExecutorUnavailable() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(null);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(greptimeProperties.username()).thenReturn("greptime");
        when(greptimeProperties.password()).thenReturn("greptime");
        when(restTemplate.exchange(
                anyString(),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(GreptimeSqlQueryContent.class)
        )).thenReturn(new ResponseEntity<>(sqlResponse(), HttpStatus.OK));

        List<Map<String, Object>> rows = repository.queryTraceRows("trace-'1", 5);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        assertEquals("trace-1", rows.getFirst().get("trace_id"));

        ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<HttpEntity> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(
                urlCaptor.capture(), eq(HttpMethod.POST), entityCaptor.capture(), eq(GreptimeSqlQueryContent.class));
        assertEquals("http://127.0.0.1:4000/v1/sql?db=public", urlCaptor.getValue());
        String requestBody = entityCaptor.getValue().getBody().toString();
        assertTrue(requestBody.startsWith("sql="));
        String sql = URLDecoder.decode(requestBody.substring("sql=".length()), StandardCharsets.UTF_8);
        assertTraceSqlProjectsAttribution(sql);
        assertTrue(sql.endsWith("FROM hzb_traces WHERE trace_id = 'trace-''1' ORDER BY timestamp ASC LIMIT 5"));
    }

    @Test
    void queryTraceRowsSelectsFlattenedOtlpColumnsForEntityAttribution() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of("trace_id", "trace-1")));

        repository.queryTraceRows("trace-1", 5);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor).execute(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTraceSqlProjectsAttribution(sql);
    }

    @Test
    void queryTraceRowsPushesRouteFiltersIntoGreptimeSql() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of("trace_id", "trace-1")));

        repository.queryTraceRows(
                "trace-'1",
                25,
                1710000000000L,
                1710003600000L,
                "checkout",
                "commerce",
                "prod",
                "GET /checkout",
                100_000_000L,
                500_000_000L,
                "team-a",
                Map.of("host.name", Set.of("checkout-1"), "service.name", Set.of("checkout")),
                true
        );

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(2)).execute(sqlCaptor.capture());
        String sql = sqlCaptor.getAllValues().get(1);
        assertTraceSqlProjectsAttribution(sql);
        assertTrue(sql.contains("trace_id = 'trace-''1'"));
        assertTrue(sql.contains("timestamp >= to_timestamp_millis(1710000000000)"));
        assertTrue(sql.contains("timestamp <= to_timestamp_millis(1710003600000)"));
        assertTrue(sql.contains("service_name = 'checkout'"));
        assertTrue(sql.contains("span_name = 'GET /checkout'"));
        assertTrue(sql.contains("duration_nano >= 100000000"));
        assertTrue(sql.contains("duration_nano <= 500000000"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"service.namespace\"]') "
                + "= 'commerce'"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"deployment.environment.name\"]') "
                + "= 'prod'"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"hertzbeat.workspace_id\"]') "
                + "= 'team-a'"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"workspace.id\"]') = 'team-a'"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"host.name\"]') = 'checkout-1'"));
        assertTrue(sql.contains("LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.endsWith("ORDER BY timestamp ASC LIMIT 25"));
    }

    private void assertTraceSqlProjectsAttribution(String sql) {
        assertTrue(sql.startsWith("SELECT * FROM hzb_traces"));
        assertTrue(sql.contains("ORDER BY timestamp"));
    }

    private GreptimeSqlQueryContent sqlResponse() {
        List<GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema> columnSchemas = new ArrayList<>();
        columnSchemas.add(new GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema("trace_id", "String"));
        columnSchemas.add(new GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema("span_id", "String"));

        GreptimeSqlQueryContent.Output.Records.Schema schema =
                new GreptimeSqlQueryContent.Output.Records.Schema();
        schema.setColumnSchemas(columnSchemas);

        GreptimeSqlQueryContent.Output.Records records =
                new GreptimeSqlQueryContent.Output.Records();
        records.setSchema(schema);
        records.setRows(List.of(List.of("trace-1", "span-1")));

        GreptimeSqlQueryContent.Output output = new GreptimeSqlQueryContent.Output();
        output.setRecords(records);

        GreptimeSqlQueryContent response = new GreptimeSqlQueryContent();
        response.setOutput(List.of(output));
        return response;
    }
}
