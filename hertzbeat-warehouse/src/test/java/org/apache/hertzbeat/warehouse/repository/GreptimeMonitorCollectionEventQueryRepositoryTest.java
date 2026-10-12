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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.repository.MonitorCollectionEventQueryRepository.MonitorCollectionEventQuery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

@ExtendWith(MockitoExtension.class)
class GreptimeMonitorCollectionEventQueryRepositoryTest {

    private static final long REAL_WIRE_OBSERVED_AT = 1_787_934_874_782L;
    private static final long START = REAL_WIRE_OBSERVED_AT - 60_000L;
    private static final long END = START + 3_600_000L;

    @Mock
    private ObjectProvider<GreptimeSqlQueryExecutor> executorProvider;

    @Mock
    private GreptimeSqlQueryExecutor executor;

    private GreptimeMonitorCollectionEventQueryRepository repository;

    @BeforeEach
    void setUp() {
        repository = new GreptimeMonitorCollectionEventQueryRepository(executorProvider);
    }

    @Test
    void readsLatestExactMonitorEventFromBoundedWindow() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(eventRow(
                "42", REAL_WIRE_OBSERVED_AT, 700L, "SUCCESS", "NONE", "QUERY", 2, 4)));

        var result = repository.query(new MonitorCollectionEventQuery(42L, START, END));

        assertTrue(result.available());
        assertEquals(REAL_WIRE_OBSERVED_AT, result.event().observedAt());
        assertEquals(700L, result.event().durationMillis());
        assertEquals("SUCCESS", result.event().outcome());
        assertEquals("collector-1", result.event().collectorId());
        assertEquals("db.internal:3306", result.event().target());
        assertEquals("availability", result.event().metricSet());
        assertEquals("NONE", result.event().failureClass());
        assertEquals("QUERY", result.event().phase());
        assertEquals(2, result.event().fieldCount());
        assertEquals(4, result.event().rowCount());

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(executor).executeStrict(sql.capture());
        assertEquals("SELECT monitor_id, CAST(observed_at AS BIGINT) AS observed_at, "
                + "duration_ms, outcome, collector_id, target, metric_set, failure_class, phase, "
                + "field_count, row_count FROM hzb_collection_events WHERE monitor_id = '42' "
                + "AND observed_at >= to_timestamp_millis(" + START + ") "
                + "AND observed_at < to_timestamp_millis(" + END + ") "
                + "ORDER BY observed_at DESC LIMIT 1", sql.getValue());
    }

    @Test
    void validZeroRowsIsEmptyWhileProviderAndQueryFailuresAreUnavailable() {
        when(executorProvider.getIfAvailable())
                .thenReturn(executor)
                .thenThrow(new IllegalStateException("bean failure"))
                .thenReturn(executor);
        when(executor.executeStrict(anyString()))
                .thenReturn(List.of())
                .thenThrow(new IllegalStateException("table missing"));

        var empty = repository.query(new MonitorCollectionEventQuery(42L, START, END));

        assertTrue(empty.available());
        assertNull(empty.event());

        var providerFailure = repository.query(new MonitorCollectionEventQuery(42L, START, END));

        assertFalse(providerFailure.available());
        assertNull(providerFailure.event());

        var queryFailure = repository.query(new MonitorCollectionEventQuery(42L, START, END));

        assertFalse(queryFailure.available());
        assertNull(queryFailure.event());
        verify(executor, times(2)).executeStrict(anyString());
    }

    @Test
    void persistedFailureOutcomeRemainsReadyEvidence() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(eventRow(
                "42", START, -1L, "FAILURE", "TIMEOUT", "CONNECT", 0, 0)));

        var result = repository.query(new MonitorCollectionEventQuery(42L, START, END));

        assertTrue(result.available());
        assertEquals("FAILURE", result.event().outcome());
        assertEquals("TIMEOUT", result.event().failureClass());
        assertEquals(-1L, result.event().durationMillis());
    }

    @Test
    void malformedOrMismatchedRowsAreUnavailable() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        Map<String, Object> oversizedMetricSet = new HashMap<>(
                eventRow("42", START, 1L, "SUCCESS", "NONE", "QUERY", 1, 1));
        oversizedMetricSet.put("metric_set", "m".repeat(193));
        Map<String, Object> oversizedCollectorId = new HashMap<>(
                eventRow("42", START, 1L, "SUCCESS", "NONE", "QUERY", 1, 1));
        oversizedCollectorId.put("collector_id", "c".repeat(129));
        Map<String, Object> oversizedTarget = new HashMap<>(
                eventRow("42", START, 1L, "SUCCESS", "NONE", "QUERY", 1, 1));
        oversizedTarget.put("target", "t".repeat(513));
        when(executor.executeStrict(anyString()))
                .thenReturn(List.of(eventRow("43", START, 1L, "SUCCESS", "NONE", "QUERY", 1, 1)))
                .thenReturn(List.of(eventRow("42", START, 1L, "HEALTHY", "NONE", "QUERY", 1, 1)))
                .thenReturn(List.of(eventRow("42", START, new BigDecimal("1.5"),
                        "SUCCESS", "NONE", "QUERY", 1, 1)))
                .thenReturn(List.of(eventRow("42", END, 1L, "SUCCESS", "NONE", "QUERY", 1, 1)))
                .thenReturn(List.of(oversizedMetricSet))
                .thenReturn(List.of(oversizedCollectorId))
                .thenReturn(List.of(oversizedTarget));

        var mismatch = repository.query(new MonitorCollectionEventQuery(42L, START, END));
        var invalidOutcome = repository.query(new MonitorCollectionEventQuery(42L, START, END));
        var fractionalDuration = repository.query(new MonitorCollectionEventQuery(42L, START, END));
        var outsideWindow = repository.query(new MonitorCollectionEventQuery(42L, START, END));
        var oversizedMetric = repository.query(new MonitorCollectionEventQuery(42L, START, END));
        var oversizedCollector = repository.query(new MonitorCollectionEventQuery(42L, START, END));
        var oversizedRuntimeTarget = repository.query(new MonitorCollectionEventQuery(42L, START, END));

        assertFalse(mismatch.available());
        assertFalse(invalidOutcome.available());
        assertFalse(fractionalDuration.available());
        assertFalse(outsideWindow.available());
        assertFalse(oversizedMetric.available());
        assertFalse(oversizedCollector.available());
        assertFalse(oversizedRuntimeTarget.available());
    }

    @Test
    void missingExecutorIsUnavailableWithoutQuery() {
        when(executorProvider.getIfAvailable()).thenReturn(null);

        var result = repository.query(new MonitorCollectionEventQuery(42L, START, END));

        assertFalse(result.available());
        assertNull(result.event());
        verify(executor, never()).executeStrict(anyString());
    }

    private Map<String, Object> eventRow(String monitorId,
                                         Object observedAt,
                                         Object durationMillis,
                                         String outcome,
                                         String failureClass,
                                         String phase,
                                         Object fieldCount,
                                         Object rowCount) {
        return Map.ofEntries(
                Map.entry("monitor_id", monitorId),
                Map.entry("observed_at", observedAt),
                Map.entry("duration_ms", durationMillis),
                Map.entry("outcome", outcome),
                Map.entry("collector_id", "collector-1"),
                Map.entry("target", "db.internal:3306"),
                Map.entry("metric_set", "availability"),
                Map.entry("failure_class", failureClass),
                Map.entry("phase", phase),
                Map.entry("field_count", fieldCount),
                Map.entry("row_count", rowCount));
    }
}
