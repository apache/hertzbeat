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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.repository.ApmRedQueryRepository.ApmRedQuery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

@ExtendWith(MockitoExtension.class)
class GreptimeApmRedQueryRepositoryTest {

    private static final long START = 1_777_000_000_000L;
    private static final long END = START + 3_600_000L;

    @Mock
    private ObjectProvider<GreptimeSqlQueryExecutor> executorProvider;

    @Mock
    private GreptimeSqlQueryExecutor executor;

    private GreptimeApmRedQueryRepository repository;

    @BeforeEach
    void setUp() {
        repository = new GreptimeApmRedQueryRepository(executorProvider);
    }

    @Test
    void readsAllCandidateSummariesInOneScopedQuery() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(Map.of(
                "entity_id", "8", "entity_type", "service", "request_count", 12L, "error_count", 3L,
                "duration_sum_nano", 12000000L, "duration_count", 12L, "latency_p95_ms", 4D)));
        var scopes = List.of(
                new ApmRedQuery(START, END, "team-a", "7", "service", "checkout", "shop", "prod"),
                new ApmRedQuery(START, END, "team-a", "8", "service", "checkout", "other", "stage"));
        var result = repository.querySummaries(scopes);
        assertTrue(result.available());
        assertEquals(3, result.summaries().get("8").errorCount());
        assertFalse(result.summaries().containsKey("7"));
        var sql = ArgumentCaptor.forClass(String.class);
        verify(executor, times(1)).executeStrict(sql.capture());
        assertTrue(sql.getValue().contains("GROUP BY entity_id, entity_type"));
        assertTrue(sql.getValue().contains("uddsketch_merge"));
        assertTrue(sql.getValue().contains("workspace_id = 'team-a'"));
        assertTrue(sql.getValue().contains("service_namespace = 'other'"));
        assertTrue(sql.getValue().contains("span_kind = 'SERVER'"));
    }

    @Test
    void batchRejectsMalformedAndUnexpectedRowsInsteadOfPartialRanking() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        var scope = query("checkout", null, null);
        for (Map<String, Object> invalid : List.of(
                Map.<String, Object>of("entity_id", "901", "entity_type", "service", "request_count", 0L, "error_count", 0L,
                        "duration_sum_nano", 0L, "duration_count", 0L),
                Map.<String, Object>of("entity_id", "901", "entity_type", "service", "request_count", 1L, "error_count", 2L,
                        "duration_sum_nano", 0L, "duration_count", 0L),
                Map.<String, Object>of("entity_id", "foreign", "entity_type", "service", "request_count", 1L, "error_count", 0L,
                        "duration_sum_nano", 0L, "duration_count", 0L))) {
            when(executor.executeStrict(anyString())).thenReturn(List.of(invalid));
            var result = repository.querySummaries(List.of(scope));
            assertFalse(result.available());
            assertTrue(result.summaries().isEmpty());
        }
    }

    @Test
    void readsBoundedMinuteSeriesAndSummaryFromFlowOnly() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString()))
                .thenReturn(List.of(Map.of(
                        "time_window", START,
                        "request_count", 120L,
                        "error_count", 6L,
                        "duration_sum_nano", 12_000_000_000L,
                        "duration_count", 120L,
                        "latency_p95_ms", 240D)))
                .thenReturn(List.of(Map.of(
                        "request_count", 120L,
                        "error_count", 6L,
                        "duration_sum_nano", 12_000_000_000L,
                        "duration_count", 120L,
                        "latency_p95_ms", 240D)));

        var result = repository.query(query("check'out", "commerce", "prod"));

        assertTrue(result.available());
        assertEquals(1, result.points().size());
        assertEquals(START, result.points().getFirst().timestamp());
        assertEquals(2D, result.points().getFirst().requestRatePerSecond(), 0.000001D);
        assertEquals(0.05D, result.points().getFirst().errorRate(), 0.000001D);
        assertEquals(100D, result.points().getFirst().latencyAverageMs(), 0.000001D);
        assertEquals(240D, result.points().getFirst().latencyP95Ms(), 0.000001D);
        assertEquals(120D / 3600D, result.summary().requestRatePerSecond(), 0.000001D);

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(executor, times(2)).executeStrict(sql.capture());
        String seriesSql = sql.getAllValues().getFirst();
        assertTrue(seriesSql.startsWith(
                "SELECT CAST(time_window AS BIGINT) / 1000000 AS time_window, SUM(calls_total)"));
        assertTrue(seriesSql.contains("FROM hertzbeat_apm_red_1m"));
        assertFalse(seriesSql.contains("hzb_traces"));
        assertTrue(seriesSql.contains("time_window >= to_timestamp_millis(" + START + ")"));
        assertTrue(seriesSql.contains("time_window < to_timestamp_millis(" + END + ")"));
        assertTrue(seriesSql.contains("workspace_id = 'workspace-a'"));
        assertTrue(seriesSql.contains("entity_id = '901'"));
        assertTrue(seriesSql.contains("entity_type = 'service'"));
        assertTrue(seriesSql.contains("service_name = 'check''out'"));
        assertTrue(seriesSql.contains("service_namespace = 'commerce'"));
        assertTrue(seriesSql.contains("deployment_environment = 'prod'"));
        assertTrue(seriesSql.contains("span_kind = 'SERVER'"));
        assertTrue(seriesSql.contains("uddsketch_merge(128, 0.01, duration_sketch)"));
        assertTrue(seriesSql.endsWith("ORDER BY time_window ASC LIMIT 1440"));
    }

    @Test
    void validEmptyFlowResultStaysAvailableAndDoesNotInventSummary() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of());

        var result = repository.query(query("checkout", null, null));

        assertTrue(result.available());
        assertTrue(result.points().isEmpty());
        assertNull(result.summary());
        verify(executor, times(1)).executeStrict(anyString());
    }

    @Test
    void missingExecutorOrFlowFailureIsUnavailableRatherThanEmpty() {
        when(executorProvider.getIfAvailable()).thenReturn(null);

        var missingExecutor = repository.query(query("checkout", null, null));

        assertFalse(missingExecutor.available());
        assertTrue(missingExecutor.points().isEmpty());
        verify(executor, never()).executeStrict(anyString());

        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenThrow(new IllegalStateException("table not found"));

        var missingFlow = repository.query(query("checkout", null, null));

        assertFalse(missingFlow.available());
        assertTrue(missingFlow.points().isEmpty());
        assertNull(missingFlow.summary());
    }

    @Test
    void executorProviderFailureIsUnavailableRatherThanEscaping() {
        when(executorProvider.getIfAvailable()).thenThrow(new IllegalStateException("bean resolution failed"));

        var result = repository.query(query("checkout", null, null));

        assertFalse(result.available());
        assertTrue(result.points().isEmpty());
        assertNull(result.summary());
        verify(executor, never()).executeStrict(anyString());
    }

    @Test
    void malformedAvailableRowsAreUnavailableRatherThanSyntheticZero() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(Map.of(
                "time_window", START,
                "request_count", "not-a-number")));

        var result = repository.query(query("checkout", null, null));

        assertFalse(result.available());
        assertTrue(result.points().isEmpty());
        assertNull(result.summary());
    }

    @Test
    void rejectsFlowBucketsOutsideTheExactRequestedWindow() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(Map.of(
                "time_window", START - 60_000L,
                "request_count", 1L,
                "error_count", 0L,
                "duration_sum_nano", 1_000_000L,
                "duration_count", 1L,
                "latency_p95_ms", 1D)));

        var result = repository.query(query("checkout", null, null));

        assertFalse(result.available());
        assertTrue(result.points().isEmpty());
        verify(executor, times(1)).executeStrict(anyString());
    }

    @Test
    void rejectsFractionalNonFiniteAndOverflowingCountsWithoutTruncation() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString()))
                .thenReturn(List.of(flowRow(new BigDecimal("1.5"))))
                .thenReturn(List.of(flowRow(Double.NaN)))
                .thenReturn(List.of(flowRow(new BigInteger("9223372036854775808"))));

        var fractional = repository.query(query("checkout", null, null));
        var nonFinite = repository.query(query("checkout", null, null));
        var overflow = repository.query(query("checkout", null, null));

        assertFalse(fractional.available());
        assertFalse(nonFinite.available());
        assertFalse(overflow.available());
        assertTrue(fractional.points().isEmpty());
        assertTrue(nonFinite.points().isEmpty());
        assertTrue(overflow.points().isEmpty());
    }

    @Test
    void rejectsZeroRequestFlowBucketAsMalformedEvidence() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(flowRow(0L)));

        var result = repository.query(query("checkout", null, null));

        assertFalse(result.available());
        assertTrue(result.points().isEmpty());
        assertNull(result.summary());
        verify(executor, times(1)).executeStrict(anyString());
    }

    @Test
    void rejectsFractionalNumericTimestampWithoutTruncation() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString()))
                .thenReturn(List.of(flowRowAt(new BigDecimal(START + ".5"), 1L)));

        var result = repository.query(query("checkout", null, null));

        assertFalse(result.available());
        assertTrue(result.points().isEmpty());
        assertNull(result.summary());
        verify(executor, times(1)).executeStrict(anyString());
    }

    @Test
    void rejectsOverflowingNumericTimestampWithoutWrapping() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        BigInteger wrappedToStart = BigInteger.valueOf(START).add(BigInteger.ONE.shiftLeft(Long.SIZE));
        when(executor.executeStrict(anyString())).thenReturn(List.of(flowRowAt(wrappedToStart, 1L)));

        var result = repository.query(query("checkout", null, null));

        assertFalse(result.available());
        assertTrue(result.points().isEmpty());
        assertNull(result.summary());
        verify(executor, times(1)).executeStrict(anyString());
    }

    private Map<String, Object> flowRow(Object requestCount) {
        return flowRowAt(START, requestCount);
    }

    private Map<String, Object> flowRowAt(Object timestamp, Object requestCount) {
        return Map.of(
                "time_window", timestamp,
                "request_count", requestCount,
                "error_count", 0L,
                "duration_sum_nano", 1_000_000L,
                "duration_count", 1L,
                "latency_p95_ms", 1D);
    }

    private ApmRedQuery query(String serviceName, String namespace, String environment) {
        return new ApmRedQuery(
                START, END, "workspace-a", "901", "service", serviceName, namespace, environment);
    }
}
