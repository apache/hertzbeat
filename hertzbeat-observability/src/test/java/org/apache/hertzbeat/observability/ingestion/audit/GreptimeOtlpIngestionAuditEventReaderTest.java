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

package org.apache.hertzbeat.observability.ingestion.audit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

@ExtendWith(MockitoExtension.class)
class GreptimeOtlpIngestionAuditEventReaderTest {

    @Mock
    private ObjectProvider<GreptimeSqlQueryExecutor> greptimeSqlQueryExecutorProvider;

    @Mock
    private GreptimeSqlQueryExecutor greptimeSqlQueryExecutor;

    private GreptimeOtlpIngestionAuditEventReader reader;

    @BeforeEach
    void setUp() {
        reader = new GreptimeOtlpIngestionAuditEventReader(greptimeSqlQueryExecutorProvider);
    }

    @Test
    void returnsEmptyEventsWhenGreptimeExecutorLookupThrowsRuntimeException() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable())
                .thenThrow(new IllegalStateException("greptime executor unavailable"));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents("team-a", 50);

        assertTrue(events.isEmpty());
        verify(greptimeSqlQueryExecutor, never()).execute(anyString());
    }

    @Test
    void readsRecentEventsFromGreptimeWithWorkspaceFilterAndEscaping() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.ofEntries(
                Map.entry("signal", "metrics"),
                Map.entry("protocol", "grpc"),
                Map.entry("outcome", "rejected"),
                Map.entry("status_code", "RESOURCE_EXHAUSTED"),
                Map.entry("workspace_id", "team-'a"),
                Map.entry("entity_id", "entity-1"),
                Map.entry("ingest_id", "ingest-1"),
                Map.entry("request_bytes", 2048L),
                Map.entry("signal_items", 42L),
                Map.entry("reason", "quota exceeded"),
                Map.entry("duration_millis", 17L),
                Map.entry("observed_at", 1710000000123L)
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents("team-'a", 300);

        assertEquals(1, events.size());
        OtlpIngestionAuditEvent event = events.getFirst();
        assertEquals("metrics", event.signal());
        assertEquals("grpc", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("RESOURCE_EXHAUSTED", event.statusCode());
        assertEquals("team-'a", event.workspaceId());
        assertEquals("entity-1", event.entityId());
        assertEquals("ingest-1", event.ingestId());
        assertEquals(2048L, event.requestBytes());
        assertEquals(42L, event.signalItems());
        assertEquals("quota exceeded", event.reason());
        assertEquals(17L, event.durationMillis());
        assertEquals(1710000000123L, event.observedAt());

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor).execute(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTrue(sql.contains("FROM hertzbeat_otlp_ingest_red"));
        assertTrue(sql.contains("workspace_id = 'team-''a'"));
        assertTrue(sql.contains("ORDER BY observed_at DESC LIMIT 256"));
        assertTrue(sql.contains("SELECT observed_at, workspace_id, entity_id, ingest_id"));
    }

    @Test
    void pushesStartMillisIntoGreptimeSqlWithoutDroppingWorkspaceFilter() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of());

        reader.recentEvents("team-a", 50, 1710000000000L);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor).execute(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTrue(sql.contains("WHERE workspace_id = 'team-a' AND observed_at >= to_timestamp_millis(1710000000000)"));
        assertTrue(sql.contains("ORDER BY observed_at DESC LIMIT 50"));
    }

    @Test
    void pushesClosedTimeWindowIntoGreptimeSqlWithoutDroppingWorkspaceFilter() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of());

        reader.recentEvents("team-a", 50, 1710000000000L, 1710000060000L);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor).execute(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTrue(sql.contains("WHERE workspace_id = 'team-a' "
                + "AND observed_at >= to_timestamp_millis(1710000000000) "
                + "AND observed_at <= to_timestamp_millis(1710000060000)"));
        assertTrue(sql.contains("ORDER BY observed_at DESC LIMIT 50"));
    }

    @Test
    void preservesUnknownOptionalCountsAsNullWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "signal", "logs",
                "protocol", "http",
                "outcome", "accepted",
                "status_code", "OK",
                "request_bytes", 100L,
                "observed_at", 1710000000456L
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertNull(events.getFirst().workspaceId());
        assertNull(events.getFirst().signalItems());
        assertNull(events.getFirst().durationMillis());
        assertNull(events.getFirst().reason());
        assertEquals(100L, events.getFirst().requestBytes());
    }

    @Test
    void preservesBlankOrInvalidOptionalCountsAsNullWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "signal", "metrics",
                "protocol", "grpc",
                "outcome", "accepted",
                "status_code", "OK",
                "request_bytes", 100L,
                "signal_items", " ",
                "duration_millis", "unknown",
                "observed_at", 1710000000456L
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertNull(events.getFirst().signalItems());
        assertNull(events.getFirst().durationMillis());
    }

    @Test
    void clampsUnsignedGreptimeCountersInsteadOfWrappingToZeroWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "signal", "metrics",
                "protocol", "grpc",
                "outcome", "rejected",
                "status_code", "RESOURCE_EXHAUSTED",
                "request_bytes", BigInteger.valueOf(Long.MAX_VALUE).add(BigInteger.ONE),
                "signal_items", BigInteger.valueOf(Long.MAX_VALUE).add(BigInteger.TWO),
                "duration_millis", BigInteger.valueOf(Long.MAX_VALUE).add(BigInteger.valueOf(3L)),
                "observed_at", 1710000000456L
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals(Long.MAX_VALUE, events.getFirst().requestBytes());
        assertEquals(Long.MAX_VALUE, events.getFirst().signalItems());
        assertEquals(Long.MAX_VALUE, events.getFirst().durationMillis());
    }

    @Test
    void clampsDecimalGreptimeCountersInsteadOfWrappingToZeroWhenMappingRows() {
        BigDecimal tooLarge = BigDecimal.valueOf(Long.MAX_VALUE).add(BigDecimal.ONE);
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "signal", "metrics",
                "protocol", "grpc",
                "outcome", "rejected",
                "status_code", "RESOURCE_EXHAUSTED",
                "request_bytes", tooLarge,
                "signal_items", tooLarge,
                "duration_millis", tooLarge,
                "observed_at", 1710000000456L
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals(Long.MAX_VALUE, events.getFirst().requestBytes());
        assertEquals(Long.MAX_VALUE, events.getFirst().signalItems());
        assertEquals(Long.MAX_VALUE, events.getFirst().durationMillis());
    }

    @Test
    void clampsUnsignedGreptimeCounterStringsInsteadOfDroppingEvidenceWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "signal", "logs",
                "protocol", "http",
                "outcome", "rejected",
                "status_code", "RESOURCE_EXHAUSTED",
                "request_bytes", BigInteger.valueOf(Long.MAX_VALUE).add(BigInteger.ONE).toString(),
                "signal_items", BigInteger.valueOf(Long.MAX_VALUE).add(BigInteger.TWO).toString(),
                "duration_millis", BigInteger.valueOf(Long.MAX_VALUE).add(BigInteger.valueOf(3L)).toString(),
                "observed_at", 1710000000456L
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals(Long.MAX_VALUE, events.getFirst().requestBytes());
        assertEquals(Long.MAX_VALUE, events.getFirst().signalItems());
        assertEquals(Long.MAX_VALUE, events.getFirst().durationMillis());
    }

    @Test
    void redactsReasonWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "signal", "metrics",
                "protocol", "grpc",
                "outcome", "rejected",
                "status_code", "RESOURCE_EXHAUSTED",
                "request_bytes", 100L,
                "reason", "quota exceeded token=live-token",
                "observed_at", 1710000000456L
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals("quota exceeded token=[REDACTED]", events.getFirst().reason());
    }

    @Test
    void skipsNullRowsWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(null);
        rows.add(Map.of(
                "signal", "logs",
                "protocol", "http",
                "outcome", "accepted",
                "status_code", "OK",
                "request_bytes", 100L,
                "observed_at", 1710000000456L
        ));
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(rows);

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals("logs", events.getFirst().signal());
        assertEquals(1710000000456L, events.getFirst().observedAt());
    }

    @Test
    void skipsMalformedRowsWithoutDroppingValidGreptimeAuditEvidence() {
        Map<String, Object> malformedRow = new java.util.AbstractMap<>() {
            @Override
            public Object get(Object key) {
                throw new IllegalStateException("malformed Greptime row");
            }

            @Override
            public java.util.Set<Entry<String, Object>> entrySet() {
                return java.util.Set.of();
            }
        };
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(
                malformedRow,
                Map.of(
                        "signal", "logs",
                        "protocol", "http",
                        "outcome", "accepted",
                        "status_code", "OK",
                        "request_bytes", 100L,
                        "observed_at", 1710000000456L
                )
        ));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals("logs", events.getFirst().signal());
        assertEquals(1710000000456L, events.getFirst().observedAt());
    }

    @Test
    void dropsRowsWithoutSignalOrProtocolWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(
                Map.of(
                        "protocol", "http",
                        "outcome", "accepted",
                        "status_code", "OK",
                        "request_bytes", 100L,
                        "observed_at", 1710000000456L
                ),
                Map.of(
                        "signal", "metrics",
                        "outcome", "accepted",
                        "status_code", "OK",
                        "request_bytes", 200L,
                        "observed_at", 1710000000457L
                ),
                Map.of(
                        "signal", " ",
                        "protocol", "grpc",
                        "outcome", "accepted",
                        "status_code", "OK",
                        "request_bytes", 300L,
                        "observed_at", 1710000000458L
                ),
                Map.of(
                        "signal", "traces",
                        "protocol", "grpc",
                        "outcome", "accepted",
                        "status_code", "OK",
                        "request_bytes", 400L,
                        "observed_at", 1710000000459L
                )
        ));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals("traces", events.getFirst().signal());
        assertEquals("grpc", events.getFirst().protocol());
    }

    @Test
    void dropsRowsWithUnsupportedSignalOrProtocolWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(
                Map.of(
                        "signal", "profiles",
                        "protocol", "http",
                        "outcome", "accepted",
                        "status_code", "OK",
                        "request_bytes", 100L,
                        "observed_at", 1710000000456L
                ),
                Map.of(
                        "signal", "metrics",
                        "protocol", "udp",
                        "outcome", "accepted",
                        "status_code", "OK",
                        "request_bytes", 200L,
                        "observed_at", 1710000000457L
                ),
                Map.of(
                        "signal", "logs",
                        "protocol", "grpc",
                        "outcome", "accepted",
                        "status_code", "OK",
                        "request_bytes", 300L,
                        "observed_at", 1710000000458L
                )
        ));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals("logs", events.getFirst().signal());
        assertEquals("grpc", events.getFirst().protocol());
    }

    @Test
    void dropsRowsWithUnsupportedOutcomeOrMissingStatusWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(
                Map.of(
                        "signal", "metrics",
                        "protocol", "grpc",
                        "outcome", "queued",
                        "status_code", "OK",
                        "request_bytes", 100L,
                        "observed_at", 1710000000456L
                ),
                Map.of(
                        "signal", "logs",
                        "protocol", "http",
                        "outcome", "accepted",
                        "request_bytes", 200L,
                        "observed_at", 1710000000457L
                ),
                Map.of(
                        "signal", "traces",
                        "protocol", "grpc",
                        "outcome", "dropped",
                        "status_code", "OK",
                        "request_bytes", 300L,
                        "observed_at", 1710000000458L
                )
        ));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals("traces", events.getFirst().signal());
        assertEquals("dropped", events.getFirst().outcome());
        assertEquals("OK", events.getFirst().statusCode());
    }

    @Test
    void keepsRowsWithNonOkStatusWhenOutcomeIsUnsupportedOrMissing() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(
                Map.of(
                        "signal", "metrics",
                        "protocol", "grpc",
                        "outcome", "failed",
                        "status_code", "UNAVAILABLE",
                        "request_bytes", 100L,
                        "observed_at", 1710000000456L
                ),
                Map.of(
                        "signal", "logs",
                        "protocol", "http",
                        "status_code", "RESOURCE_EXHAUSTED",
                        "request_bytes", 200L,
                        "observed_at", 1710000000457L
                ),
                Map.of(
                        "signal", "traces",
                        "protocol", "grpc",
                        "outcome", "queued",
                        "status_code", "OK",
                        "request_bytes", 300L,
                        "observed_at", 1710000000458L
                )
        ));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(2, events.size());
        assertEquals("metrics", events.getFirst().signal());
        assertEquals("failed", events.getFirst().outcome());
        assertEquals("UNAVAILABLE", events.getFirst().statusCode());
        assertEquals("logs", events.get(1).signal());
        assertNull(events.get(1).outcome());
        assertEquals("RESOURCE_EXHAUSTED", events.get(1).statusCode());
    }

    @Test
    void normalizesSignalAndProtocolCaseWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "signal", "METRICS",
                "protocol", "HTTP",
                "outcome", "accepted",
                "status_code", "OK",
                "request_bytes", 100L,
                "observed_at", 1710000000456L
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals("metrics", events.getFirst().signal());
        assertEquals("http", events.getFirst().protocol());
    }

    @Test
    void normalizesOutcomeCaseWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "signal", "logs",
                "protocol", "http",
                "outcome", "REJECTED",
                "status_code", "RESOURCE_EXHAUSTED",
                "request_bytes", 100L,
                "observed_at", 1710000000456L
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals("rejected", events.getFirst().outcome());
    }

    @Test
    void normalizesStatusCodeCaseWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "signal", "metrics",
                "protocol", "grpc",
                "outcome", "rejected",
                "status_code", "resource_exhausted",
                "request_bytes", 100L,
                "observed_at", 1710000000456L
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals("RESOURCE_EXHAUSTED", events.getFirst().statusCode());
    }

    @Test
    void normalizesStatusCodeSeparatorsWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(
                Map.of(
                        "signal", "metrics",
                        "protocol", "grpc",
                        "outcome", "rejected",
                        "status_code", "resource-exhausted",
                        "request_bytes", 100L,
                        "observed_at", 1710000000456L
                ),
                Map.of(
                        "signal", "logs",
                        "protocol", "http",
                        "outcome", "rejected",
                        "status_code", "resource exhausted",
                        "request_bytes", 200L,
                        "observed_at", 1710000000457L
                )
        ));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(2, events.size());
        assertEquals("RESOURCE_EXHAUSTED", events.getFirst().statusCode());
        assertEquals("RESOURCE_EXHAUSTED", events.get(1).statusCode());
    }

    @Test
    void normalizesStatusCodeEdgeSeparatorsWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "signal", "metrics",
                "protocol", "grpc",
                "outcome", "rejected",
                "status_code", " - resource exhausted - ",
                "request_bytes", 100L,
                "observed_at", 1710000000456L
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals("RESOURCE_EXHAUSTED", events.getFirst().statusCode());
    }

    @Test
    void normalizesNumericGrpcStatusCodesWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(
                Map.of(
                        "signal", "metrics",
                        "protocol", "grpc",
                        "outcome", "accepted",
                        "status_code", 0,
                        "request_bytes", 100L,
                        "observed_at", 1710000000456L
                ),
                Map.of(
                        "signal", "logs",
                        "protocol", "http",
                        "outcome", "rejected",
                        "status_code", 8L,
                        "request_bytes", 200L,
                        "observed_at", 1710000000457L
                )
        ));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(2, events.size());
        assertEquals("OK", events.getFirst().statusCode());
        assertEquals("RESOURCE_EXHAUSTED", events.get(1).statusCode());
    }

    @Test
    void normalizesDecimalNumericGrpcStatusCodesWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(
                Map.of(
                        "signal", "metrics",
                        "protocol", "grpc",
                        "outcome", "accepted",
                        "status_code", new BigDecimal("0.0"),
                        "request_bytes", 100L,
                        "observed_at", 1710000000456L
                ),
                Map.of(
                        "signal", "logs",
                        "protocol", "http",
                        "outcome", "rejected",
                        "status_code", new BigDecimal("8.0"),
                        "request_bytes", 200L,
                        "observed_at", 1710000000457L
                )
        ));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(2, events.size());
        assertEquals("OK", events.getFirst().statusCode());
        assertEquals("RESOURCE_EXHAUSTED", events.get(1).statusCode());
    }

    @Test
    void dropsRowsWithNonCanonicalStatusCodesWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(
                Map.of(
                        "signal", "metrics",
                        "protocol", "grpc",
                        "outcome", "rejected",
                        "status_code", "backend-overloaded",
                        "request_bytes", 100L,
                        "observed_at", 1710000000456L
                ),
                Map.of(
                        "signal", "logs",
                        "protocol", "http",
                        "outcome", "rejected",
                        "status_code", "8.5",
                        "request_bytes", 200L,
                        "observed_at", 1710000000457L
                ),
                Map.of(
                        "signal", "traces",
                        "protocol", "grpc",
                        "outcome", "rejected",
                        "status_code", "resource exhausted",
                        "request_bytes", 300L,
                        "observed_at", 1710000000458L
                )
        ));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals("traces", events.getFirst().signal());
        assertEquals("RESOURCE_EXHAUSTED", events.getFirst().statusCode());
    }

    @Test
    void mapsGreptimeTimestampTextWithSpaceSeparatedOffsetWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "signal", "traces",
                "protocol", "grpc",
                "outcome", "accepted",
                "status_code", "OK",
                "request_bytes", 100L,
                "observed_at", "2024-03-09 16:00:00.123+00:00"
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals(Instant.parse("2024-03-09T16:00:00.123Z").toEpochMilli(),
                events.getFirst().observedAt());
    }

    @Test
    void mapsGreptimeTimestampTextWithCompactOffsetWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "signal", "logs",
                "protocol", "http",
                "outcome", "accepted",
                "status_code", "OK",
                "request_bytes", 100L,
                "observed_at", "2024-03-09 16:00:00.123+0000"
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals(Instant.parse("2024-03-09T16:00:00.123Z").toEpochMilli(),
                events.getFirst().observedAt());
    }

    @Test
    void mapsGreptimeTimestampTextWithUtcSuffixWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "signal", "metrics",
                "protocol", "grpc",
                "outcome", "accepted",
                "status_code", "OK",
                "request_bytes", 128L,
                "observed_at", "2024-03-09 16:00:00.123 UTC"
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals(Instant.parse("2024-03-09T16:00:00.123Z").toEpochMilli(),
                events.getFirst().observedAt());
    }

    @Test
    void mapsGreptimeZonedDateTimeWhenMappingRows() {
        ZonedDateTime observedAt = ZonedDateTime.of(
                2024, 3, 9, 16, 0, 0, 123_000_000, ZoneId.of("UTC"));
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "signal", "traces",
                "protocol", "grpc",
                "outcome", "accepted",
                "status_code", "OK",
                "request_bytes", 128L,
                "observed_at", observedAt
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals(observedAt.toInstant().toEpochMilli(), events.getFirst().observedAt());
    }

    @Test
    void mapsGreptimeDateWhenMappingRows() {
        Instant observedAt = Instant.parse("2024-03-09T16:00:00.123Z");
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "signal", "logs",
                "protocol", "http",
                "outcome", "accepted",
                "status_code", "OK",
                "request_bytes", 128L,
                "observed_at", Date.from(observedAt)
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals(observedAt.toEpochMilli(), events.getFirst().observedAt());
    }

    @Test
    void mapsGreptimeSqlDateWhenMappingRows() {
        Instant observedAt = Instant.parse("2024-03-09T16:00:00.123Z");
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "signal", "metrics",
                "protocol", "grpc",
                "outcome", "accepted",
                "status_code", "OK",
                "request_bytes", 128L,
                "observed_at", new java.sql.Date(observedAt.toEpochMilli())
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals(observedAt.toEpochMilli(), events.getFirst().observedAt());
    }

    @Test
    void dropsRowsWhenNormalizedStatusCodeHasNoToken() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(
                Map.of(
                        "signal", "metrics",
                        "protocol", "grpc",
                        "outcome", "rejected",
                        "status_code", " - - ",
                        "request_bytes", 100L,
                        "observed_at", 1710000000456L
                ),
                Map.of(
                        "signal", "logs",
                        "protocol", "http",
                        "outcome", "rejected",
                        "status_code", "resource exhausted",
                        "request_bytes", 200L,
                        "observed_at", 1710000000457L
                )
        ));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals("logs", events.getFirst().signal());
        assertEquals("RESOURCE_EXHAUSTED", events.getFirst().statusCode());
    }

    @Test
    void dropsRowsWithoutPositiveObservedAtWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(
                Map.of(
                        "signal", "metrics",
                        "protocol", "grpc",
                        "outcome", "accepted",
                        "status_code", "OK",
                        "request_bytes", 100L,
                        "observed_at", "not-a-timestamp"
                ),
                Map.of(
                        "signal", "logs",
                        "protocol", "http",
                        "outcome", "accepted",
                        "status_code", "OK",
                        "request_bytes", 200L,
                        "observed_at", 0L
                ),
                Map.of(
                        "signal", "traces",
                        "protocol", "grpc",
                        "outcome", "accepted",
                        "status_code", "OK",
                        "request_bytes", 300L,
                        "observed_at", 1710000000789L
                )
        ));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals("traces", events.getFirst().signal());
        assertEquals(1710000000789L, events.getFirst().observedAt());
    }

    @Test
    void dropsMappedRowsOutsideRequestedWorkspace() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(
                Map.of(
                        "signal", "metrics",
                        "protocol", "grpc",
                        "outcome", "accepted",
                        "status_code", "OK",
                        "workspace_id", "team-a",
                        "request_bytes", 100L,
                        "observed_at", 1710000000123L
                ),
                Map.of(
                        "signal", "logs",
                        "protocol", "http",
                        "outcome", "accepted",
                        "status_code", "OK",
                        "workspace_id", "team-b",
                        "request_bytes", 200L,
                        "observed_at", 1710000000124L
                ),
                Map.of(
                        "signal", "traces",
                        "protocol", "grpc",
                        "outcome", "accepted",
                        "status_code", "OK",
                        "request_bytes", 300L,
                        "observed_at", 1710000000125L
                )
        ));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents("team-a", 10);

        assertEquals(1, events.size());
        assertEquals("metrics", events.getFirst().signal());
        assertEquals("team-a", events.getFirst().workspaceId());
    }

    @Test
    void dropsMappedRowsOutsideClosedTimeWindow() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(
                Map.of(
                        "signal", "metrics",
                        "protocol", "grpc",
                        "outcome", "accepted",
                        "status_code", "OK",
                        "workspace_id", "team-a",
                        "request_bytes", 100L,
                        "observed_at", 1_710_000_000_999L
                ),
                Map.of(
                        "signal", "logs",
                        "protocol", "http",
                        "outcome", "accepted",
                        "status_code", "OK",
                        "workspace_id", "team-a",
                        "request_bytes", 200L,
                        "observed_at", 1_710_000_001_000L
                ),
                Map.of(
                        "signal", "traces",
                        "protocol", "grpc",
                        "outcome", "accepted",
                        "status_code", "OK",
                        "workspace_id", "team-a",
                        "request_bytes", 300L,
                        "observed_at", 1_710_000_002_001L
                )
        ));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(
                "team-a", 10, 1_710_000_001_000L, 1_710_000_002_000L);

        assertEquals(1, events.size());
        assertEquals("logs", events.getFirst().signal());
        assertEquals(1_710_000_001_000L, events.getFirst().observedAt());
    }

    @Test
    void clampsNegativeNumericEvidenceWhenMappingRows() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of(
                "signal", "metrics",
                "protocol", "grpc",
                "outcome", "accepted",
                "status_code", "OK",
                "request_bytes", -100L,
                "signal_items", -2L,
                "duration_millis", -30L,
                "observed_at", 1710000000456L
        )));

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(null, 10);

        assertEquals(1, events.size());
        assertEquals(0L, events.getFirst().requestBytes());
        assertEquals(0L, events.getFirst().signalItems());
        assertEquals(0L, events.getFirst().durationMillis());
    }
}
