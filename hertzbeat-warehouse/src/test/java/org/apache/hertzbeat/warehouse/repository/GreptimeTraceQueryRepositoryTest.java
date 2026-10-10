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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.repository.TraceQueryRepository.TraceRowQuery;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeSqlQueryContent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
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
    void analyticsAndListShareAuthorizedPredicatesAndExclusiveEnd() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenAnswer(invocation -> invocation.getArgument(0, String.class).contains("SELECT COUNT(*) AS total_count")
                        ? List.of(Map.of("total_count", 0)) : List.of());
        var scope = new org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics.Scope(
                new org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics.Window(1000, 2000, true),
                "team-a", null, false, "matched_traces", "checkout", null, null, "GET /checkout", 100L, 500L,
                "root", false, Map.of(), Map.of());
        repository.queryAnalytics(scope, new org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics.Options(
                "histogram", null, 20, 10, 0, 20, "newest"));
        repository.queryTraceListRows(1000L, 2000L, false, "checkout", null, null, "GET /checkout", 100L, 500L,
                "team-a", Map.of(), false, "root", 0, 20, TraceQueryRepository.TraceSort.NEWEST, true);
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, org.mockito.Mockito.atLeastOnce()).executeStrict(sql.capture());
        String analytics = sql.getAllValues().stream().filter(value -> value.startsWith("WITH matched")).findFirst().orElseThrow();
        assertTrue(analytics.contains("timestamp < to_timestamp_millis(2000)"));
        assertFalse(analytics.contains("timestamp <= to_timestamp_millis(2000)"));
        assertTrue(analytics.contains("service_name = 'checkout'"));
        assertTrue(analytics.contains("span_name = 'GET /checkout'"));
        assertTrue(analytics.contains("team-a"));
        String list = sql.getAllValues().stream().filter(value -> value.startsWith("WITH candidate_traces")).findFirst().orElseThrow();
        assertTrue(list.contains("timestamp < to_timestamp_millis(2000)"));
        assertTrue(list.contains("span_name = 'GET /checkout'"));
    }

    @Test
    void queryRecentTraceRowsUsesSqlExecutorWhenAvailable() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenReturn(List.of(Map.of("trace_id", "trace-1")));

        List<Map<String, Object>> rows = repository.queryRecentTraceRows(20);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        assertEquals("trace-1", rows.getFirst().get("trace_id"));
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor).executeStrict(sqlCaptor.capture());
        assertTraceSqlProjectsAttribution(sqlCaptor.getValue());
        assertTrue(sqlCaptor.getValue().endsWith("FROM hzb_traces ORDER BY timestamp DESC, trace_id ASC, span_id ASC LIMIT 20"));
    }

    @Test
    void queryRecentTraceRowsPushesServiceAndInternalFiltersIntoNarrowSql() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenReturn(List.of(Map.of("trace_id", "trace-1")));

        List<Map<String, Object>> rows = repository.queryRecentTraceRows(30, "recommendation", true);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor).executeStrict(sqlCaptor.capture());
        assertTraceSqlProjectsAttribution(sqlCaptor.getValue());
        assertTrue(sqlCaptor.getValue().endsWith("FROM hzb_traces WHERE service_name = 'recommendation' "
                + "AND LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat') ORDER BY timestamp DESC, trace_id ASC, span_id ASC LIMIT 30"));
    }

    @Test
    void queryRecentTraceRowsPushesTimeWindowIntoGreptimeSql() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenReturn(List.of(Map.of("trace_id", "trace-1")));

        List<Map<String, Object>> rows = repository.queryRecentTraceRows(
                50, 1710000000000L, 1710003600000L, "checkout", "prod", true);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor).executeStrict(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTraceSqlProjectsAttribution(sql);
        assertTrue(sql.contains("timestamp >= to_timestamp_millis(1710000000000)"));
        assertTrue(sql.contains("timestamp <= to_timestamp_millis(1710003600000)"));
        assertTrue(sql.contains("service_name = 'checkout'"));
        assertTrue(sql.contains("\"resource_attributes.deployment.environment.name\" = 'prod'"));
        assertTrue(sql.contains("LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.endsWith("ORDER BY timestamp DESC, trace_id ASC, span_id ASC LIMIT 50"));
    }

    @Test
    void queryRecentTraceRowsUsesOnlyTheCanonicalFlattenedTraceContract() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenReturn(List.of(Map.of("trace_id", "trace-1")));

        repository.queryRecentTraceRows(
                20,
                1710000000000L,
                1710003600000L,
                "checkout",
                "commerce",
                "prod",
                null,
                null,
                null,
                "team-a",
                Map.of("hertzbeat.entity_id", Set.of("entity-1")),
                false);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor).executeStrict(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTrue(sql.contains("\"resource_attributes.service.namespace\" = 'commerce'"));
        assertTrue(sql.contains("\"resource_attributes.deployment.environment.name\" = 'prod'"));
        assertTrue(sql.contains("\"resource_attributes.hertzbeat.workspace_id\" = 'team-a'"));
        assertTrue(sql.contains("\"resource_attributes.hertzbeat.entity_id\" = 'entity-1'"));
        assertFalse(sql.contains("json_get_string("));
        assertFalse(sql.startsWith("DESC hzb_traces"));
    }

    @Test
    void queryRecentTraceRowsPushesWorkspaceAndEntityScopeIntoGreptimeSql() {
        stubDynamicTraceQuery(
                List.of(Map.of("trace_id", "trace-1")),
                "resource_attributes.host.name");

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
        String sql = captureMainSqlAfterDynamicDiscovery();
        assertTraceSqlProjectsAttribution(sql);
        assertTrue(sql.contains("timestamp >= to_timestamp_millis(1710000000000)"));
        assertTrue(sql.contains("timestamp <= to_timestamp_millis(1710003600000)"));
        assertTrue(sql.contains("service_name = 'checkout'"));
        assertTrue(sql.contains("\"resource_attributes.service.namespace\" = 'commerce'"));
        assertTrue(sql.contains("\"resource_attributes.deployment.environment.name\" = 'prod'"));
        assertCanonicalWorkspaceFilter(sql, "team-a");
        assertTrue(sql.contains("(\"resource_attributes.host.name\" = 'checkout-1' "
                + "OR \"resource_attributes.host.name\" = 'checkout-2')"));
        assertTrue(sql.contains("LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.endsWith("ORDER BY timestamp DESC, trace_id ASC, span_id ASC LIMIT 75"));
    }

    @Test
    void workspaceQueryUsesCanonicalFlattenedColumnWithoutRequiringLegacyAlias() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString()))
                .thenReturn(List.of(Map.of("trace_id", "trace-1")));

        repository.queryRecentTraceRows(
                20, 1000L, 2000L, null, null, null, null, null, null,
                "team-a", Map.of(), false);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor).executeStrict(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTrue(sql.contains("\"resource_attributes.hertzbeat.workspace_id\" = 'team-a'"));
        assertFalse(sql.contains("workspace.id"));
    }

    @Test
    void traceListRetriesOneBoundedEvidencePairWhenLiveSpansArrive() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenReturn(
                List.of(Map.of("trace_id", "trace-1", "total_count", 1L)),
                List.of(traceEvidence("trace-1", 1L)), List.of(traceService("trace-1", 2L)),
                List.of(traceEvidence("trace-1", 2L)), List.of(traceService("trace-1", 2L)));

        var page = repository.queryTraceListRows(100L, 200L, false, null, null, null, null, null, null,
                "team-a", Map.of(), false, 0, 20);

        assertEquals(2L, page.rows().getFirst().get("evidence_span_count"));
        ArgumentCaptor<String> queries = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(5)).executeStrict(queries.capture());
        for (String sql : queries.getAllValues()) {
            assertFalse(sql.contains(" JOIN "));
        }
        assertTrue(queries.getAllValues().get(1).endsWith("SELECT * FROM trace_evidence LIMIT 2"));
        assertTrue(queries.getAllValues().get(1).contains("evidence.\"resource_attributes.hertzbeat.workspace_id\" = 'team-a'"));
        assertTrue(queries.getAllValues().get(2).contains("stats.\"resource_attributes.hertzbeat.workspace_id\" = 'team-a'"));
    }

    private Map<String, Object> traceEvidence(String traceId, long count) {
        return Map.of("trace_id", traceId, "evidence_span_count", count,
                "evidence_distinct_span_count", count, "invalid_span_count", 0L);
    }

    @Test
    void traceListRejectsInvalidEvidenceKeysWithoutRetry() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        for (List<Map<String, Object>> evidence : List.of(List.<Map<String, Object>>of(),
                List.of(traceEvidence("other", 1L)),
                List.of(traceEvidence("trace-1", 1L), traceEvidence("trace-1", 1L)))) {
            List<Map<String, Object>> candidates = evidence.size() == 2
                    ? List.of(Map.of("trace_id", "trace-1", "total_count", 2L),
                    Map.of("trace_id", "trace-2", "total_count", 2L))
                    : List.of(Map.of("trace_id", "trace-1", "total_count", 1L));
            when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenReturn(
                    candidates, evidence);
            assertThrows(TelemetryStorageUnavailableException.class, () -> repository.queryTraceListRows(
                    100L, 200L, false, null, null, null, null, null, null, "team-a", Map.of(), false, 0, 20));
        }
        verify(greptimeSqlQueryExecutor, times(6)).executeStrict(anyString());
    }

    @Test
    void traceListRejectsContinuedArrivalAfterOneRetry() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenReturn(
                List.of(Map.of("trace_id", "trace-1", "total_count", 1L)),
                List.of(traceEvidence("trace-1", 1L)), List.of(traceService("trace-1", 2L)),
                List.of(traceEvidence("trace-1", 2L)), List.of(traceService("trace-1", 3L)));
        assertThrows(TelemetryStorageUnavailableException.class, () -> repository.queryTraceListRows(
                100L, 200L, false, null, null, null, null, null, null, "team-a", Map.of(), false, 0, 20));
        verify(greptimeSqlQueryExecutor, times(5)).executeStrict(anyString());
    }

    private Map<String, Object> traceService(String traceId, long count) {
        return Map.of("trace_id", traceId, "stats_service_name", "checkout", "service_span_count", count,
                "service_error_span_count", 0L, "service_ok_span_count", 0L, "service_root_span_count", 0L);
    }

    @Test
    void durationSortUsesTheOnlyRootAcrossTheWholeWorkspaceTraceBeforePaging() {
        List<String> queries = captureQueriesWithSchemaColumns();

        repository.queryTraceListRows(100L, 200L, true, "checkout", "commerce", "prod",
                "GET /checkout", 10L, 1000L, "team-a", Map.of(), false, "entrypoint", 20, 10,
                TraceQueryRepository.TraceSort.DURATION_DESC);

        String query = queries.getFirst();
        assertFalse(query.contains(" JOIN "));
        assertTrue(query.contains("MIN(CASE WHEN (timestamp >= to_timestamp_millis(100)"));
        assertTrue(query.contains("THEN timestamp ELSE NULL END) AS match_timestamp"));
        assertTrue(query.contains("CASE WHEN SUM(CASE WHEN (parent_span_id IS NULL "
                + "OR parent_span_id = '') THEN 1 ELSE 0 END) = 1"));
        assertTrue(query.contains("AND duration_nano >= 0 THEN duration_nano ELSE NULL END)"));
        assertTrue(query.contains("FROM hzb_traces WHERE \"resource_attributes.hertzbeat.workspace_id\" = 'team-a' "
                + "AND ((parent_span_id IS NULL OR parent_span_id = '') OR (timestamp >= to_timestamp_millis(100)"));
        String qualification = query.substring(query.indexOf(" HAVING "));
        assertTrue(qualification.contains("service_name = 'checkout'"));
        assertTrue(qualification.contains("span_name = 'GET /checkout'"));
        assertTrue(qualification.contains("duration_nano >= 10"));
        assertTrue(qualification.contains("duration_nano <= 1000"));
        assertTrue(qualification.contains("span_status_code IN ('STATUS_CODE_ERROR', 'ERROR')"));
        assertTrue(query.endsWith("ORDER BY sort_duration DESC NULLS LAST, match_timestamp DESC, trace_id ASC LIMIT 10 OFFSET 20"));
        assertEquals(1, query.split(" LIMIT ", -1).length - 1);
    }

    @Test
    void queryTraceListRowsPushesGroupingPaginationAndTotalCountIntoGreptimeSql() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            if (sql.startsWith("DESC hzb_traces")) {
                return List.of(Map.of("Column", "resource_attributes.host.name"));
            }
            if (sql.startsWith("WITH candidate_traces")) {
                return List.of(Map.of("trace_id", "trace-1", "match_timestamp", 1710003599000L,
                        "total_count", 42L));
            }
            if (sql.startsWith("WITH ranked_spans")) {
                return List.of(traceEvidence("trace-1", 3L));
            }
            return List.of(Map.of(
                    "trace_id", "trace-1",
                    "root_span_id", "span-1",
                    "stats_service_name", "checkout",
                    "service_span_count", 3L,
                    "service_error_span_count", 1L,
                    "service_ok_span_count", 2L,
                    "service_root_span_count", 1L));
        });

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
                20).rows();

        assertNotNull(rows);
        assertEquals(1, rows.size());
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(4)).executeStrict(sqlCaptor.capture());
        assertEquals("DESC hzb_traces", sqlCaptor.getAllValues().getFirst());
        String candidateSql = sqlCaptor.getAllValues().get(1);
        String aggregateSql = sqlCaptor.getAllValues().getLast();
        String evidenceSql = sqlCaptor.getAllValues().get(2);
        assertTrue(evidenceSql.contains("ROW_NUMBER() OVER (PARTITION BY evidence.trace_id ORDER BY evidence.timestamp, evidence.span_id)"));
        assertTrue(evidenceSql.contains("AS representative_span_id"));
        assertTrue(evidenceSql.contains("AS observed_start_nanos"));
        assertTrue(evidenceSql.contains("AS observed_end_nanos"));
        assertTrue(candidateSql.contains("WITH candidate_traces AS (SELECT trace_id"));
        assertTrue(candidateSql.contains("COUNT(*) OVER () AS total_count"));
        assertTrue(aggregateSql.contains("stats.service_name AS stats_service_name"));
        assertTrue(aggregateSql.contains("COUNT(*) AS service_span_count"));
        assertTrue(aggregateSql.contains("AS service_error_span_count"));
        assertTrue(aggregateSql.contains("AS service_root_span_count"));
        assertTrue(aggregateSql.contains("CASE WHEN (stats.parent_span_id IS NULL OR stats.parent_span_id = '') "
                + "THEN stats.span_id ELSE NULL END"));
        assertFalse(aggregateSql.contains("MAX(span_id) AS root_span_id"));
        assertTrue(aggregateSql.contains("MAX(CASE WHEN (stats.parent_span_id IS NULL OR stats.parent_span_id = '') "
                + "THEN stats.\"resource_attributes.hertzbeat.workspace_id\" ELSE NULL END) "
                + "AS \"resource_attributes.hertzbeat.workspace_id\""));
        assertTrue(aggregateSql.contains("THEN stats.\"resource_attributes.hertzbeat.entity_id\" ELSE NULL END) "
                + "AS \"resource_attributes.hertzbeat.entity_id\""));
        assertTrue(aggregateSql.contains("THEN stats.\"resource_attributes.hertzbeat.entity_type\" ELSE NULL END) "
                + "AS \"resource_attributes.hertzbeat.entity_type\""));
        assertTrue(candidateSql.contains("FROM hzb_traces WHERE timestamp >= to_timestamp_millis(1710000000000)"));
        assertTrue(candidateSql.contains("timestamp <= to_timestamp_millis(1710003600000)"));
        assertTrue(candidateSql.contains("service_name = 'checkout'"));
        assertTrue(candidateSql.contains("span_name = 'GET /checkout'"));
        assertTrue(candidateSql.contains("duration_nano >= 100000000"));
        assertTrue(candidateSql.contains("duration_nano <= 500000000"));
        assertTrue(candidateSql.contains("\"resource_attributes.service.namespace\" = 'commerce'"));
        assertTrue(candidateSql.contains("\"resource_attributes.deployment.environment.name\" = 'prod'"));
        assertCanonicalWorkspaceFilter(candidateSql, "team-a");
        assertTrue(aggregateSql.contains("stats.\"resource_attributes.hertzbeat.workspace_id\" = 'team-a'"));
        assertTrue(candidateSql.contains("(\"resource_attributes.host.name\" = 'checkout-1' "
                + "OR \"resource_attributes.host.name\" = 'checkout-2')"));
        assertTrue(candidateSql.contains("LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(candidateSql.contains("trace_id IS NOT NULL AND trace_id != ''"));
        assertTrue(candidateSql.contains("GROUP BY trace_id"));
        assertTrue(candidateSql.endsWith("ORDER BY match_timestamp DESC, trace_id ASC LIMIT 20 OFFSET 40"));
        assertTrue(aggregateSql.contains("stats.trace_id IN ('trace-1')"));
        assertTrue(aggregateSql.endsWith("ORDER BY stats.trace_id, stats.service_name LIMIT 4097"));
    }

    @Test
    void traceListSeparatesBoundedCandidatePageFromCompleteTraceAggregation() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString()))
                .thenReturn(
                        List.of(Map.of("trace_id", "trace-1", "match_timestamp", 1710003599000L,
                                "total_count", 42L)),
                        List.of(traceEvidence("trace-1", 3L)),
                        List.of(Map.of(
                                "trace_id", "trace-1",
                                "root_span_id", "span-1",
                                "service_name", "checkout",
                                "stats_service_name", "checkout",
                                "service_span_count", 3L,
                                "service_error_span_count", 1L,
                                "service_ok_span_count", 2L,
                                "service_root_span_count", 1L)));

        List<Map<String, Object>> rows = repository.queryTraceListRows(
                1710000000000L, 1710003600000L, false, null, null, null,
                null, null, null, "team-a", Map.of(), false, 0, 20).rows();

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(3)).executeStrict(sqlCaptor.capture());
        String candidateSql = sqlCaptor.getAllValues().getFirst();
        String aggregateSql = sqlCaptor.getAllValues().getLast();
        assertTrue(candidateSql.contains("COUNT(*) OVER () AS total_count"));
        assertTrue(candidateSql.contains("LIMIT 20 OFFSET 0"));
        assertTrue(candidateSql.contains("timestamp >= to_timestamp_millis(1710000000000)"));
        assertTrue(candidateSql.contains("timestamp <= to_timestamp_millis(1710003600000)"));
        assertTrue(aggregateSql.contains("stats.trace_id IN ('trace-1')"));
        assertTrue(aggregateSql.contains("GROUP BY stats.trace_id, stats.service_name"));
        assertFalse(aggregateSql.contains(" JOIN "));
        assertTrue(sqlCaptor.getAllValues().get(1).contains("ROW_NUMBER() OVER (PARTITION BY evidence.trace_id ORDER BY evidence.timestamp, evidence.span_id)"));
        assertFalse(aggregateSql.contains("stats.timestamp >="));
        assertFalse(aggregateSql.contains("stats.timestamp <="));
        assertEquals(42L, rows.getFirst().get("total_count"));
        assertEquals(3L, rows.getFirst().get("span_count"));
        assertEquals(1L, rows.getFirst().get("error_span_count"));
        assertEquals(1L, rows.getFirst().get("root_span_count"));
        assertEquals(1L, rows.getFirst().get("service_row_count"));
        assertEquals("ERROR", rows.getFirst().get("span_status_code"));
    }

    @Test
    void traceListDoesNotClaimOkWhenAllObservedStatusesAreUnset() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        Map<String, Object> unset = new HashMap<>(serviceTraceListRow("trace-a", "checkout", 1L, 0L, 0L));
        unset.put("service_ok_span_count", 0L);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenReturn(
                List.of(Map.of("trace_id", "trace-a", "total_count", 1L)),
                List.of(traceEvidence("trace-a", 1L)), List.of(unset));
        List<Map<String, Object>> rows = repository.queryTraceListRows(
                null, null, false, null, null, null, null, null, null,
                "team-a", Map.of(), false, 0, 20).rows();
        assertEquals("UNSET", rows.getFirst().get("span_status_code"));
    }

    @Test
    void traceListCompletesMultiServiceTotalsInCandidateOrder() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenReturn(
                List.of(
                        Map.of("trace_id", "trace-b", "total_count", 2L),
                        Map.of("trace_id", "trace-a", "total_count", 2L)),
                List.of(traceEvidence("trace-a", 1L), traceEvidence("trace-b", 5L)),
                List.of(
                        serviceTraceListRow("trace-a", "accounts", 1L, 0L, 1L),
                        serviceTraceListRow("trace-b", "payments", 3L, 0L, 0L),
                        serviceTraceListRow("trace-b", "checkout", 2L, 1L, 1L)));

        List<Map<String, Object>> rows = repository.queryTraceListRows(
                null, null, false, null, null, null, null, null, null,
                "team-a", Map.of(), false, 0, 20).rows();

        assertEquals(List.of("trace-b", "trace-b", "trace-a"),
                rows.stream().map(row -> row.get("trace_id")).toList());
        assertEquals(5L, rows.getFirst().get("span_count"));
        assertEquals(1L, rows.getFirst().get("error_span_count"));
        assertEquals(1L, rows.getFirst().get("root_span_count"));
        assertEquals("ERROR", rows.getFirst().get("span_status_code"));
        assertEquals(1L, rows.getLast().get("span_count"));
        assertEquals("OK", rows.getLast().get("span_status_code"));
        assertTrue(rows.stream().allMatch(row -> Long.valueOf(2L).equals(row.get("total_count"))));
        assertTrue(rows.stream().allMatch(row -> Long.valueOf(3L).equals(row.get("service_row_count"))));
    }

    @Test
    void traceListRejectsAnEmptyPageWhenTheIndependentCountStillRequiresRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenReturn(
                List.of(), List.of(Map.of("total_count", 12L)));

        assertThrows(TelemetryStorageUnavailableException.class, () -> repository.queryTraceListRows(
                100L, 200L, true, "checkout", "commerce", "prod", null, null, null,
                "team-a", Map.of(), false, null, 0, 20, TraceQueryRepository.TraceSort.DURATION_DESC));
    }

    @Test
    void traceListEmptyPageKeepsExactCountAndScopeWithoutSyntheticRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        for (long total : List.of(0L, 2L)) {
            when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenReturn(
                    List.of(), List.of(Map.of("total_count", total)));
            var page = repository.queryTraceListRows(100L, 200L, true, "checkout", "commerce", "prod",
                    "GET /checkout", 100L, 200L, "team-stats.'a", Map.of(), false, "entrypoint", 100, 20);
            assertTrue(page.rows().isEmpty());
            assertEquals(total, page.totalCount());
        }
        ArgumentCaptor<String> queries = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(4)).executeStrict(queries.capture());
        String count = queries.getAllValues().getLast();
        assertTrue(count.contains("'team-stats.''a'"));
        assertTrue(count.contains("timestamp >= to_timestamp_millis(100)"));
        assertTrue(count.contains("timestamp <= to_timestamp_millis(200)"));
        assertTrue(count.contains("GET /checkout"));
        assertTrue(count.contains("HAVING"));
        assertFalse(count.contains("OFFSET"));
        assertTrue(count.endsWith("SELECT COUNT(*) AS total_count FROM candidate_traces"));
    }

    @Test
    void traceListEvidenceAliasNeverChangesLiteralWorkspaceIdentity() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenReturn(
                List.of(Map.of("trace_id", "trace-a", "total_count", 1L)),
                List.of(traceEvidence("trace-a", 1L)),
                List.of(serviceTraceListRow("trace-a", "checkout", 1L, 0L, 1L)));
        repository.queryTraceListRows(null, null, false, null, null, null, null, null, null,
                "team-stats.'a", Map.of(), false, 0, 20);
        ArgumentCaptor<String> queries = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(3)).executeStrict(queries.capture());
        String sql = queries.getAllValues().get(1);
        assertTrue(sql.contains("evidence.\"resource_attributes.hertzbeat.workspace_id\" = 'team-stats.''a'"));
        assertTrue(queries.getAllValues().getLast().contains("stats.\"resource_attributes.hertzbeat.workspace_id\" = 'team-stats.''a'"));
        assertTrue(sql.contains("duration_nano < 0"));
        assertTrue(sql.contains("end_nanos - start_nanos != duration_nano"));
    }

    @Test
    void traceListDoesNotProjectMissingOptionalCollectorColumnWithoutCollectorFilter() {
        List<String> executedSql = captureQueriesWithSchemaColumns();

        repository.queryTraceListRows(
                null, null, false, null, null, null, null, null, null,
                "team-a", Map.of(), false, 0, 20).rows();

        String sql = executedSql.getLast();
        assertFalse(sql.contains("resource_attributes.hertzbeat.collector.id"));
    }

    @Test
    void traceListWithCollectorFilterIsHonestlyEmptyWhenOptionalCollectorColumnIsMissing() {
        List<String> executedSql = captureQueriesWithSchemaColumns();

        List<Map<String, Object>> rows = repository.queryTraceListRows(
                null, null, false, null, null, null, null, null, null,
                "team-a", Map.of("hertzbeat.collector.id", Set.of("collector-a")), false, 0, 20).rows();

        assertTrue(rows.isEmpty());
        String sql = executedSql.getLast();
        assertTrue(sql.contains("1 = 0"));
        assertFalse(sql.contains("resource_attributes.hertzbeat.collector.id"));
    }

    @Test
    void queryTraceListRowsScopesSpanFiltersToEntrypointSpans() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenReturn(
                List.of(Map.of("trace_id", "trace-entry", "total_count", 1L)),
                List.of(traceEvidence("trace-entry", 3L)),
                List.of(Map.of(
                        "trace_id", "trace-entry",
                        "root_span_id", "span-entry",
                        "stats_service_name", "checkout",
                        "service_span_count", 3L,
                        "service_error_span_count", 0L,
                        "service_ok_span_count", 3L,
                        "service_root_span_count", 1L)));

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
                20).rows();

        assertEquals(1, rows.size());
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(3)).executeStrict(sqlCaptor.capture());
        String sql = sqlCaptor.getAllValues().getFirst();
        assertTrue(sql.contains("span_name = 'POST /checkout'"));
        assertTrue(sql.contains("duration_nano >= 100000000"));
        assertTrue(sql.contains("duration_nano <= 500000000"));
        assertTrue(sql.contains("(parent_span_id IS NULL OR parent_span_id = '' "
                + "OR UPPER(span_kind) IN ('SPAN_KIND_SERVER', 'SERVER', 'SPAN_KIND_CONSUMER', 'CONSUMER'))"));
    }

    @Test
    void queryTraceOverviewRowsPushesAggregateFiltersIntoGreptimeSql() {
        stubDynamicTraceQuery(
                List.of(Map.of(
                        "total_trace_count", 42L,
                        "error_trace_count", 7L,
                        "latest_observed_at", 1710003600000L)),
                "resource_attributes.host.name");

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
        String sql = captureMainSqlAfterDynamicDiscovery();
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
        assertCanonicalFlattenedResourceFilters(sql);
        assertTrue(sql.contains("LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.contains("GROUP BY trace_id HAVING "
                + "SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') THEN 1 ELSE 0 END) > 0"));
        assertTrue(sql.endsWith(") trace_overview"));
    }

    @Test
    void queryTraceIdOverviewRowsPushesTraceIdAggregateFiltersIntoGreptimeSql() {
        stubDynamicTraceQuery(
                List.of(Map.of(
                        "total_trace_count", 1L,
                        "error_trace_count", 1L,
                        "latest_observed_at", 1710003600000L)),
                "resource_attributes.host.name");

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
        String sql = captureMainSqlAfterDynamicDiscovery();
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
        assertCanonicalFlattenedResourceFilters(sql);
        assertTrue(sql.contains("LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.contains("GROUP BY trace_id HAVING "
                + "SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') THEN 1 ELSE 0 END) > 0"));
        assertTrue(sql.endsWith(") trace_id_overview"));
    }

    @Test
    void queryTraceSummaryRowsPushesAggregateAndLatestTraceIntoGreptimeSql() {
        stubDynamicTraceQuery(
                List.of(Map.of(
                        "total_trace_count", 7L,
                        "error_trace_count", 2L,
                        "latest_observed_at", 1710003600000L,
                        "latest_trace_id", "trace-latest")),
                "resource_attributes.host.name");

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
        String sql = captureMainSqlAfterDynamicDiscovery();
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
        assertCanonicalFlattenedResourceFilters(sql);
        assertTrue(sql.contains("LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.contains("ORDER BY trace_start_time DESC LIMIT 1"));
        assertTrue(sql.endsWith(") latest ON TRUE"));
    }

    @Test
    void queryTraceGroupByRowsAggregatesByTraceBeforeGroupingFieldValues() {
        stubDynamicTraceQuery(
                List.of(Map.of(
                        "group_value", "1.2.3",
                        "trace_count", 12L,
                        "error_trace_count", 2L,
                        "latency_avg_ms", 84.5d,
                        "latency_p95_ms", 210.0d)),
                "resource_attributes.host.name",
                "resource_attributes.service.version");

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
        String sql = captureMainSqlAfterDynamicDiscovery();
        assertTrue(sql.startsWith("SELECT group_value, COUNT(*) AS trace_count"));
        assertTrue(sql.contains("SUM(CASE WHEN error_span_count > 0 THEN 1 ELSE 0 END) AS error_trace_count"));
        assertTrue(sql.contains("COALESCE(SUM(duration_nano), 0) / NULLIF(COUNT(duration_nano), 0) "
                + "/ 1000000.0 AS latency_avg_ms"));
        assertTrue(sql.contains("uddsketch_calc(0.95, uddsketch_state(128, 0.01, duration_nano)) "
                + "/ 1000000.0 AS latency_p95_ms"));
        assertTrue(sql.contains("FROM (SELECT trace_id, "
                + "COALESCE(NULLIF(MAX(\"resource_attributes.service.version\"), ''), "
                + "'unknown') AS group_value"));
        assertTrue(sql.contains("SUM(CASE WHEN parent_span_id IS NULL OR parent_span_id = '' THEN 1 ELSE 0 END) = 1"));
        assertTrue(sql.contains("THEN duration_nano ELSE NULL END) ELSE NULL END AS duration_nano"));
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
        assertCanonicalFlattenedResourceFilters(sql);
        assertTrue(sql.endsWith("GROUP BY group_value HAVING COUNT(*) >= 5 ORDER BY latency_p95_ms DESC NULLS LAST, group_value ASC LIMIT 7"));
        assertTrue(sql.contains("LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.contains("GROUP BY trace_id HAVING "
                + "SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') THEN 1 ELSE 0 END) > 0"));
        assertTrue(sql.endsWith(") trace_group GROUP BY group_value HAVING COUNT(*) >= 5 ORDER BY latency_p95_ms DESC NULLS LAST, group_value ASC LIMIT 7"));
    }

    @Test
    void queryTraceServiceGraphRowsPushesServiceGraphRedAggregationIntoGreptimeSql() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString()))
                .thenReturn(List.of(Map.of(
                        "source_service_name", "checkout-api",
                        "target_service_name", "payment-api",
                        "request_count", 2L)));

        List<Map<String, Object>> rows = repository.queryTraceServiceGraphRows(
                100, 1710000000000L, 1710003600000L, "prod", List.of("checkout-api", "payment-api"), true);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor).executeStrict(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTrue(sql.startsWith("SELECT parent.service_name AS source_service_name, "
                + "child.service_name AS target_service_name, COUNT(*) AS request_count"));
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
        assertTrue(sql.contains("child.\"resource_attributes.deployment.environment.name\" = 'prod'"));
        assertTrue(sql.contains("parent.\"resource_attributes.deployment.environment.name\" = 'prod'"));
        assertTrue(sql.contains("((child.service_name = 'checkout-api' OR child.service_name = 'payment-api') "
                + "OR (parent.service_name = 'checkout-api' OR parent.service_name = 'payment-api'))"));
        assertTrue(sql.contains("LOWER(child.service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.contains("LOWER(parent.service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.contains("LOWER(child.service_name) != LOWER(parent.service_name)"));
        assertTrue(sql.contains("GROUP BY parent.service_name, child.service_name"));
        assertTrue(sql.endsWith("ORDER BY request_count DESC LIMIT 100"));
    }

    @Test
    void scopedServiceGraphFiltersBothSidesByCanonicalWorkspaceColumn() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString()))
                .thenReturn(List.of(Map.of(
                        "source_service_name", "checkout-api",
                        "target_service_name", "payment-api",
                        "request_count", 2L)));

        repository.queryTraceServiceGraphRows(
                100, 1710000000000L, 1710003600000L, "prod", "team-a",
                List.of("checkout-api", "payment-api"), true);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor).executeStrict(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTrue(sql.contains("child.\"resource_attributes.hertzbeat.workspace_id\" = 'team-a'"));
        assertTrue(sql.contains("parent.\"resource_attributes.hertzbeat.workspace_id\" = 'team-a'"));
        assertFalse(sql.contains("workspace.id"));
        assertFalse(sql.contains("json_get_string("));
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
        assertTrue(sql.endsWith("FROM hzb_traces WHERE trace_id = 'trace-''1' ORDER BY timestamp ASC, trace_id ASC, span_id ASC LIMIT 5"));
    }

    @Test
    void traceHttpFormPreservesSqlArithmeticAndLiteralCharacters() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(null);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class),
                eq(GreptimeSqlQueryContent.class))).thenReturn(ResponseEntity.ok(sqlResponse()));

        repository.queryTraceRows("trace-+ %&='é", 5);

        ArgumentCaptor<HttpEntity> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(anyString(), eq(HttpMethod.POST), entityCaptor.capture(),
                eq(GreptimeSqlQueryContent.class));
        String requestBody = entityCaptor.getValue().getBody().toString();
        String sql = URLDecoder.decode(requestBody.substring("sql=".length()), StandardCharsets.UTF_8);
        assertTrue(sql.contains("trace_id = 'trace-+ %&=''é'"));
        assertTrue(requestBody.contains("%2B"));
        assertFalse(requestBody.substring("sql=".length()).contains("&"));
    }

    @Test
    void queryTraceRowsReportsUnavailableWhenGreptimeHttpRejectsTheQuery() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(null);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                anyString(),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(GreptimeSqlQueryContent.class)
        )).thenReturn(ResponseEntity.<GreptimeSqlQueryContent>status(HttpStatus.SERVICE_UNAVAILABLE).build());

        assertThrows(
                TelemetryStorageUnavailableException.class,
                () -> repository.queryTraceRows("trace-1", 5));
    }

    @Test
    void queryTraceRowsReportsUnavailableWhenGreptimeHttpReturnsAnErrorCode() {
        GreptimeSqlQueryContent rejectedResponse = sqlResponse();
        rejectedResponse.setCode(1);
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(null);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                anyString(),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(GreptimeSqlQueryContent.class)
        )).thenReturn(ResponseEntity.ok(rejectedResponse));

        assertThrows(
                TelemetryStorageUnavailableException.class,
                () -> repository.queryTraceRows("trace-1", 5));
    }

    @Test
    void queryTraceRowsSelectsFlattenedOtlpColumnsForEntityAttribution() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenReturn(List.of(Map.of("trace_id", "trace-1")));

        repository.queryTraceRows("trace-1", 5);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor).executeStrict(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTraceSqlProjectsAttribution(sql);
    }

    @Test
    void queryTraceRowsPushesRouteFiltersIntoGreptimeSql() {
        stubDynamicTraceQuery(
                List.of(Map.of("trace_id", "trace-1")),
                "resource_attributes.host.name");

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

        String sql = captureMainSqlAfterDynamicDiscovery();
        assertTraceSqlProjectsAttribution(sql);
        assertTrue(sql.contains("trace_id = 'trace-''1'"));
        assertTrue(sql.contains("timestamp >= to_timestamp_millis(1710000000000)"));
        assertTrue(sql.contains("timestamp <= to_timestamp_millis(1710003600000)"));
        assertTrue(sql.contains("service_name = 'checkout'"));
        assertTrue(sql.contains("span_name = 'GET /checkout'"));
        assertTrue(sql.contains("duration_nano >= 100000000"));
        assertTrue(sql.contains("duration_nano <= 500000000"));
        assertTrue(sql.contains("\"resource_attributes.service.namespace\" = 'commerce'"));
        assertTrue(sql.contains("\"resource_attributes.deployment.environment.name\" = 'prod'"));
        assertCanonicalWorkspaceFilter(sql, "team-a");
        assertTrue(sql.contains("\"resource_attributes.host.name\" = 'checkout-1'"));
        assertFalse(sql.contains("workspace.id"));
        assertFalse(sql.contains("json_get_string("));
        assertTrue(sql.contains("LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')"));
        assertTrue(sql.endsWith("ORDER BY timestamp ASC, trace_id ASC, span_id ASC LIMIT 25"));
    }

    @Test
    void queryTraceRowsPushesTypedSpanAndAttributeContextIntoGreptimeSql() {
        stubDynamicTraceQuery(
                List.of(Map.of("trace_id", "trace-1")),
                "span_attributes.http.route",
                "resource_attributes.hertzbeat.collector.id");

        repository.queryTraceRows(new TraceRowQuery(
                "trace-'1",
                "span-'1",
                1710000000000L,
                1710003600000L,
                "checkout",
                "commerce",
                "prod",
                null,
                100_000_000L,
                500_000_000L,
                "team-a",
                Map.of(
                        "hertzbeat.collector.id", Set.of("collector-a"),
                        "service.instance.id", Set.of("checkout-7d9")),
                Map.of("http.route", Set.of("/checkout")),
                false),
                25);

        String sql = captureMainSqlAfterDynamicDiscovery();
        assertTrue(sql.contains("trace_id = 'trace-''1'"));
        assertTrue(sql.contains("span_id = 'span-''1'"));
        assertTrue(sql.contains("timestamp >= to_timestamp_millis(1710000000000)"));
        assertTrue(sql.contains("timestamp <= to_timestamp_millis(1710003600000)"));
        assertTrue(sql.contains("\"resource_attributes.hertzbeat.collector.id\" = 'collector-a'"));
        assertTrue(sql.contains("\"resource_attributes.service.instance.id\" = 'checkout-7d9'"));
        assertTrue(sql.contains("\"span_attributes.http.route\" = '/checkout'"));
        assertFalse(sql.contains("json_get_string("));
        assertTrue(sql.contains("duration_nano >= 100000000"));
        assertTrue(sql.contains("duration_nano <= 500000000"));
    }

    @Test
    void queryRecentTraceRowsPushesListAttributeContextBeforeApplyingLimit() {
        stubDynamicTraceQuery(
                List.of(Map.of("trace_id", "trace-1")),
                "span_attributes.http.route");

        repository.queryRecentTraceRows(new TraceRowQuery(
                null,
                null,
                1710000000000L,
                1710003600000L,
                "checkout",
                "commerce",
                "prod",
                null,
                null,
                null,
                "team-a",
                Map.of("service.instance.id", Set.of("checkout-7d9")),
                Map.of("http.route", Set.of("/checkout")),
                false),
                1500);

        String sql = captureMainSqlAfterDynamicDiscovery();
        assertTrue(sql.contains("\"resource_attributes.service.instance.id\" = 'checkout-7d9'"));
        assertTrue(sql.contains("\"span_attributes.http.route\" = '/checkout'"));
        assertFalse(sql.contains("json_get_string("));
        assertTrue(sql.endsWith("ORDER BY timestamp DESC, trace_id ASC, span_id ASC LIMIT 1500"));
    }

    @Test
    void missingDynamicAttributeColumnsProduceAnHonestEmptyQueryWithoutDroppingFilters() {
        stubDynamicTraceQuery(List.of());

        List<Map<String, Object>> rows = repository.queryRecentTraceRows(new TraceRowQuery(
                null,
                null,
                1710000000000L,
                1710003600000L,
                "checkout",
                null,
                null,
                null,
                null,
                null,
                "team-a",
                Map.of("custom.resource.key", Set.of("expected")),
                Map.of("custom.span.key", Set.of("expected")),
                false),
                20);

        assertTrue(rows.isEmpty());
        String sql = captureMainSqlAfterDynamicDiscovery();
        assertTrue(sql.contains("1 = 0"));
        assertFalse(sql.contains("resource_attributes.custom.resource.key"));
        assertFalse(sql.contains("span_attributes.custom.span.key"));
    }

    @Test
    void missingDynamicAttributeColumnIsDiscoveredAfterThrottledSchemaRefresh() {
        AtomicLong now = new AtomicLong();
        AtomicInteger schemaProbeCount = new AtomicInteger();
        List<String> executedSql = new java.util.concurrent.CopyOnWriteArrayList<>();
        repository = new GreptimeTraceQueryRepository(
                greptimeSqlQueryExecutorProvider, greptimeProperties, restTemplate, now::get, 100L);
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            executedSql.add(sql);
            if (sql.startsWith("DESC hzb_traces")) {
                return schemaProbeCount.incrementAndGet() == 1
                        ? List.of()
                        : List.of(Map.of("Column", "resource_attributes.cloud.region"));
            }
            return List.of();
        });

        queryByDynamicResourceAttribute("cloud.region");
        now.set(99L);
        queryByDynamicResourceAttribute("cloud.region");
        now.set(100L);
        queryByDynamicResourceAttribute("cloud.region");

        assertEquals(2, schemaProbeCount.get());
        List<String> mainQueries = executedSql.stream()
                .filter(sql -> !sql.startsWith("DESC hzb_traces"))
                .toList();
        assertEquals(3, mainQueries.size());
        assertTrue(mainQueries.get(0).contains("1 = 0"));
        assertTrue(mainQueries.get(1).contains("1 = 0"));
        assertTrue(mainQueries.get(2).contains("\"resource_attributes.cloud.region\" = 'us-east-1'"));
        assertFalse(mainQueries.get(2).contains("1 = 0"));
    }

    @Test
    void concurrentMissingDynamicAttributeQueriesShareOneSchemaProbeWithinThrottleWindow() throws Exception {
        AtomicLong now = new AtomicLong();
        AtomicInteger schemaProbeCount = new AtomicInteger();
        repository = new GreptimeTraceQueryRepository(
                greptimeSqlQueryExecutorProvider, greptimeProperties, restTemplate, now::get, 100L);
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            if (sql.startsWith("DESC hzb_traces")) {
                schemaProbeCount.incrementAndGet();
            }
            return List.of();
        });

        int taskCount = 8;
        CountDownLatch ready = new CountDownLatch(taskCount);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(taskCount);
        try {
            List<Future<?>> futures = new ArrayList<>();
            for (int index = 0; index < taskCount; index++) {
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    assertTrue(start.await(5, TimeUnit.SECONDS));
                    queryByDynamicResourceAttribute("cloud.region");
                    return null;
                }));
            }
            assertTrue(ready.await(5, TimeUnit.SECONDS));
            start.countDown();
            for (Future<?> future : futures) {
                future.get(5, TimeUnit.SECONDS);
            }
        } finally {
            executor.shutdownNow();
        }

        assertEquals(1, schemaProbeCount.get());
    }

    @Test
    void failedDynamicSchemaProbeIsThrottledAsControlledUnavailable() {
        AtomicLong now = new AtomicLong();
        AtomicInteger schemaProbeCount = new AtomicInteger();
        repository = new GreptimeTraceQueryRepository(
                greptimeSqlQueryExecutorProvider, greptimeProperties, restTemplate, now::get, 100L);
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            if (sql.startsWith("DESC hzb_traces")) {
                schemaProbeCount.incrementAndGet();
                throw new IllegalStateException("schema unavailable");
            }
            return List.of();
        });

        assertThrows(TelemetryStorageUnavailableException.class,
                () -> queryByDynamicResourceAttribute("cloud.region"));
        now.set(99L);
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> queryByDynamicResourceAttribute("cloud.region"));
        assertEquals(1, schemaProbeCount.get());

        now.set(100L);
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> queryByDynamicResourceAttribute("cloud.region"));
        assertEquals(2, schemaProbeCount.get());
    }

    @Test
    void queryFailureLogsOnlyStableCategoryWithoutSqlOrThrowableBody() {
        String secretSentinel = "Bearer secret-token";
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString()))
                .thenThrow(new IllegalStateException(secretSentinel));
        Logger logger = (Logger) LoggerFactory.getLogger(GreptimeTraceQueryRepository.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            assertThrows(
                    TelemetryStorageUnavailableException.class,
                    () -> repository.queryTraceRows("trace-1", 5));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }

        assertEquals(1, appender.list.size());
        ILoggingEvent event = appender.list.getFirst();
        assertEquals("Trace query failed", event.getFormattedMessage());
        assertFalse(event.getFormattedMessage().contains(secretSentinel));
        assertFalse(event.getFormattedMessage().contains("SELECT"));
        assertNull(event.getThrowableProxy());
    }

    private void assertTraceSqlProjectsAttribution(String sql) {
        assertTrue(sql.startsWith("SELECT * FROM hzb_traces"));
        assertTrue(sql.contains("ORDER BY timestamp"));
    }

    private void assertCanonicalFlattenedResourceFilters(String sql) {
        assertTrue(sql.contains("\"resource_attributes.service.namespace\" = 'commerce'"));
        assertTrue(sql.contains("\"resource_attributes.deployment.environment.name\" = 'prod'"));
        assertCanonicalWorkspaceFilter(sql, "team-a");
        assertTrue(sql.contains("(\"resource_attributes.host.name\" = 'checkout-1' "
                + "OR \"resource_attributes.host.name\" = 'checkout-2')"));
        assertFalse(sql.contains("json_get_string("));
    }

    private void assertCanonicalWorkspaceFilter(String sql, String workspaceId) {
        assertTrue(sql.contains("\"resource_attributes.hertzbeat.workspace_id\" = '" + workspaceId + "'"));
    }

    private void queryByDynamicResourceAttribute(String key) {
        repository.queryRecentTraceRows(new TraceRowQuery(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                Map.of(key, Set.of("us-east-1")),
                Map.of(),
                false),
                20);
    }

    private void stubDynamicTraceQuery(List<Map<String, Object>> queryRows, String... dynamicColumns) {
        List<Map<String, Object>> schemaRows = Arrays.stream(dynamicColumns)
                .map(column -> Map.<String, Object>of("Column", column))
                .toList();
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            return sql.startsWith("DESC hzb_traces") ? schemaRows : queryRows;
        });
    }

    private List<String> captureQueriesWithSchemaColumns(String... dynamicColumns) {
        List<String> executedSql = new ArrayList<>();
        List<Map<String, Object>> schemaRows = Arrays.stream(dynamicColumns)
                .map(column -> Map.<String, Object>of("Column", column))
                .toList();
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.executeStrict(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            executedSql.add(sql);
            if (sql.contains("SELECT COUNT(*) AS total_count FROM candidate_traces")) {
                return List.of(Map.of("total_count", 0L));
            }
            return sql.startsWith("DESC hzb_traces") ? schemaRows : List.of();
        });
        return executedSql;
    }

    private Map<String, Object> serviceTraceListRow(String traceId, String serviceName, long spanCount,
                                                     long errorCount, long rootCount) {
        return Map.of(
                "trace_id", traceId,
                "stats_service_name", serviceName,
                "service_span_count", spanCount,
                "service_error_span_count", errorCount,
                "service_ok_span_count", spanCount - errorCount,
                "service_root_span_count", rootCount);
    }

    private String captureMainSqlAfterDynamicDiscovery() {
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor, times(2)).executeStrict(sqlCaptor.capture());
        assertEquals("DESC hzb_traces", sqlCaptor.getAllValues().getFirst());
        return sqlCaptor.getAllValues().getLast();
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
