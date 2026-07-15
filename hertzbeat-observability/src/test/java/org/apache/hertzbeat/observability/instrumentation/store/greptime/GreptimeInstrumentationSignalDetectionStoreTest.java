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

package org.apache.hertzbeat.observability.instrumentation.store.greptime;

import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionErrorCode.SIGNAL_NOT_RECEIVED;
import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionErrorCode.STORAGE_QUERY_FAILED;
import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionErrorCode.STORAGE_UNAVAILABLE;
import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionStatus.ERROR;
import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionStatus.RECEIVED;
import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionStatus.UNAVAILABLE;
import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionStatus.WAITING;
import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal.LOGS;
import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal.METRICS;
import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal.TRACES;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.DetectionCriteria;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.DetectionSnapshot;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.SignalObservation;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

@ExtendWith(MockitoExtension.class)
class GreptimeInstrumentationSignalDetectionStoreTest {

    private static final long STARTED_AT = 1_710_000_000_000L;

    @Mock
    private ObjectProvider<GreptimeSqlQueryExecutor> executorProvider;

    @Mock
    private GreptimeSqlQueryExecutor executor;

    private GreptimeInstrumentationSignalDetectionStore store;

    @BeforeEach
    void setUp() {
        store = new GreptimeInstrumentationSignalDetectionStore(executorProvider);
    }

    @Test
    void queriesOnlyLatestTimestampForEachSignalWithTheCompleteEscapedScope() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            if (sql.contains("FROM greptime_physical_table")) {
                return List.of(Map.of("last_received_at", 1_710_000_001_001L));
            }
            if (sql.contains("FROM hertzbeat_logs")) {
                return List.of(Map.of("last_received_at", Timestamp.from(Instant.ofEpochMilli(1_710_000_002_002L))));
            }
            return List.of(Map.of("last_received_at", "2024-03-09T16:00:03.003Z"));
        });

        DetectionSnapshot snapshot = store.detect(criteria("checkout's-api", "commerce's", "prod's", "collector's"));

        assertReceived(snapshot.observation(METRICS), 1_710_000_001_001L);
        assertReceived(snapshot.observation(LOGS), 1_710_000_002_002L);
        assertReceived(snapshot.observation(TRACES), 1_710_000_003_003L);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(executor, org.mockito.Mockito.times(3)).executeStrict(sqlCaptor.capture());
        List<String> queries = sqlCaptor.getAllValues();
        assertEquals(3, queries.size());
        assertMetricQuery(queries.get(0));
        assertJsonResourceQuery(queries.get(1), "hertzbeat_logs");
        assertJsonResourceQuery(queries.get(2), "hzb_traces");
        queries.forEach(sql -> {
            assertTrue(sql.startsWith("SELECT MAX("));
            assertTrue(sql.contains(" AS last_received_at FROM "));
            assertFalse(sql.toLowerCase().contains("body"));
            assertFalse(sql.toLowerCase().contains("token"));
            assertFalse(sql.contains("SELECT *"));
        });
    }

    @Test
    void returnsWaitingWhenNoScopedRowsExistAtOrAfterTheInclusiveBoundary() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of());

        DetectionSnapshot snapshot = store.detect(criteria("checkout", "commerce", "prod", "collector-1"));

        for (SignalObservation observation : snapshot.observations().values()) {
            assertEquals(WAITING, observation.status());
            assertEquals(SIGNAL_NOT_RECEIVED, observation.errorCode());
            assertNull(observation.lastReceivedAt());
        }
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(executor, org.mockito.Mockito.times(3)).executeStrict(sqlCaptor.capture());
        sqlCaptor.getAllValues().forEach(sql ->
                assertTrue(sql.contains(">= to_timestamp_millis(" + STARTED_AT + ")")));
    }

    @Test
    void doesNotAcceptStorageRowOlderThanTheOnboardingBoundary() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString()))
                .thenReturn(List.of(Map.of("last_received_at", STARTED_AT - 1)));

        DetectionSnapshot snapshot = store.detect(criteria("checkout", "commerce", "prod", "collector-1"));

        snapshot.observations().values().forEach(observation -> {
            assertEquals(WAITING, observation.status());
            assertEquals(SIGNAL_NOT_RECEIVED, observation.errorCode());
        });
    }

    @Test
    void treatsNullAggregateValuesAsWaiting() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString()))
                .thenReturn(List.of(Collections.singletonMap("last_received_at", null)));

        DetectionSnapshot snapshot = store.detect(criteria("checkout", "commerce", "prod", "collector-1"));

        snapshot.observations().values().forEach(observation -> {
            assertEquals(WAITING, observation.status());
            assertEquals(SIGNAL_NOT_RECEIVED, observation.errorCode());
        });
    }

    @Test
    void returnsUnavailableForEverySignalWhenGreptimeExecutorIsAbsent() {
        when(executorProvider.getIfAvailable()).thenReturn(null);

        DetectionSnapshot snapshot = store.detect(criteria("checkout", "commerce", "prod", "collector-1"));

        for (SignalObservation observation : snapshot.observations().values()) {
            assertEquals(UNAVAILABLE, observation.status());
            assertEquals(STORAGE_UNAVAILABLE, observation.errorCode());
            assertNull(observation.lastReceivedAt());
        }
        verify(executor, never()).executeStrict(anyString());
    }

    @Test
    void isolatesOneSignalQueryFailureWithoutDiscardingOtherSignalEvidence() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            if (sql.contains("FROM hertzbeat_logs")) {
                throw new IllegalStateException("warehouse query unavailable");
            }
            if (sql.contains("FROM greptime_physical_table")) {
                return List.of(Map.of("last_received_at", STARTED_AT));
            }
            return List.of();
        });

        DetectionSnapshot snapshot = store.detect(criteria("checkout", "commerce", "prod", "collector-1"));

        assertReceived(snapshot.observation(METRICS), STARTED_AT);
        assertEquals(ERROR, snapshot.observation(LOGS).status());
        assertEquals(STORAGE_QUERY_FAILED, snapshot.observation(LOGS).errorCode());
        assertNull(snapshot.observation(LOGS).lastReceivedAt());
        assertEquals(WAITING, snapshot.observation(TRACES).status());
    }

    @Test
    void treatsExecutorResolutionFailureAsStorageUnavailable() {
        when(executorProvider.getIfAvailable()).thenThrow(new IllegalStateException("bean unavailable"));

        DetectionSnapshot snapshot = store.detect(criteria("checkout", "commerce", "prod", "collector-1"));

        snapshot.observations().values().forEach(observation -> {
            assertEquals(UNAVAILABLE, observation.status());
            assertEquals(STORAGE_UNAVAILABLE, observation.errorCode());
        });
        verify(executor, never()).executeStrict(anyString());
    }

    private DetectionCriteria criteria(String serviceName, String namespace, String environment, String collectorId) {
        return new DetectionCriteria(serviceName, namespace, environment, collectorId, STARTED_AT);
    }

    private void assertMetricQuery(String sql) {
        assertTrue(sql.contains("MAX(greptime_timestamp)"));
        assertTrue(sql.contains("FROM greptime_physical_table"));
        assertTrue(sql.contains("service_name = 'checkout''s-api'"));
        assertTrue(sql.contains("service_namespace = 'commerce''s'"));
        assertTrue(sql.contains("deployment_environment_name = 'prod''s'"));
        assertTrue(sql.contains("hertzbeat_collector_id = 'collector''s'"));
        assertTrue(sql.contains("greptime_timestamp >= to_timestamp_millis(" + STARTED_AT + ")"));
    }

    private void assertJsonResourceQuery(String sql, String table) {
        assertTrue(sql.contains("MAX(timestamp)"));
        assertTrue(sql.contains("FROM " + table));
        assertTrue(sql.contains("service_name = 'checkout''s-api'"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"service.namespace\"]') = 'commerce''s'"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"deployment.environment.name\"]') = 'prod''s'"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"hertzbeat.collector.id\"]') = 'collector''s'"));
        assertTrue(sql.contains("timestamp >= to_timestamp_millis(" + STARTED_AT + ")"));
    }

    private void assertReceived(SignalObservation observation, long expectedTimestamp) {
        assertEquals(RECEIVED, observation.status());
        assertEquals(expectedTimestamp, observation.lastReceivedAt());
        assertNull(observation.errorCode());
    }
}
