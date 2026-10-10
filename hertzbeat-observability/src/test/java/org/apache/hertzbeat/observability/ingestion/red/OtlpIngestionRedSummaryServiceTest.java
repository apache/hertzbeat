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

package org.apache.hertzbeat.observability.ingestion.red;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.grpc.Status;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionRedSummaryDto;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.ingestion.audit.OtlpIngestionAuditEvent;
import org.apache.hertzbeat.observability.ingestion.audit.OtlpIngestionAuditEventReader;
import org.apache.hertzbeat.observability.ingestion.audit.OtlpIngestionAuditService;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationContext;
import org.junit.jupiter.api.Test;

class OtlpIngestionRedSummaryServiceTest {

    @Test
    void summarizesRecentRequestsErrorsBytesAndDurationForCurrentWorkspace() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionRedSummaryService summaryService = new OtlpIngestionRedSummaryService(auditService);
        OtlpCorrelationContext teamA = new OtlpCorrelationContext("ing-a", "entity-a", "team-a");
        OtlpCorrelationContext teamB = new OtlpCorrelationContext("ing-b", "entity-b", "team-b");

        auditService.recordAccepted("logs", "http", teamA, 100L, 2L, 12L);
        auditService.recordRejected("logs", "http", teamA, 300L,
                Status.Code.RESOURCE_EXHAUSTED, "quota exceeded", 4L, 18L);
        auditService.recordAccepted("metrics", "grpc", teamB, 50L, 7L, 5L);

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals("team-a", summary.getWorkspaceId());
            assertEquals(2L, summary.getRequestCount());
            assertEquals(1L, summary.getErrorCount());
            assertEquals(0.5D, summary.getErrorRate());
            assertEquals(400L, summary.getRequestBytes());
            assertEquals(6L, summary.getSignalItems());
            assertEquals(3L, summary.getAverageSignalItems());
            assertEquals(4L, summary.getMaxSignalItems());
            assertEquals(15L, summary.getAverageDurationMillis());
            assertEquals(18L, summary.getMaxDurationMillis());
            assertEquals(1, summary.getSignals().size());

            OtlpIngestionRedSummaryDto.SignalRedMetric logsHttp = summary.getSignals().getFirst();
            assertEquals("logs", logsHttp.getSignal());
            assertEquals("http", logsHttp.getProtocol());
            assertEquals(2L, logsHttp.getRequestCount());
            assertEquals(1L, logsHttp.getErrorCount());
            assertEquals(0.5D, logsHttp.getErrorRate());
            assertEquals(400L, logsHttp.getRequestBytes());
            assertEquals(6L, logsHttp.getSignalItems());
            assertEquals(3L, logsHttp.getAverageSignalItems());
            assertEquals(4L, logsHttp.getMaxSignalItems());
            assertEquals(15L, logsHttp.getAverageDurationMillis());
            assertEquals(18L, logsHttp.getMaxDurationMillis());
            assertEquals("RESOURCE_EXHAUSTED", logsHttp.getLatestStatusCode());
            assertEquals("quota exceeded", logsHttp.getLatestReason());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void summarizesDroppedGovernanceEventsWithoutCountingThemAsErrors() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionRedSummaryService summaryService = new OtlpIngestionRedSummaryService(auditService);
        OtlpCorrelationContext teamA = new OtlpCorrelationContext("ing-a", "entity-a", "team-a");

        auditService.recordDropped("metrics", "grpc", teamA, 120L, 3L,
                "OTLP metrics grpc dropped by governance policy: service.name=checkout", 9L);

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(1L, summary.getRequestCount());
            assertEquals(0L, summary.getErrorCount());
            assertEquals(0D, summary.getErrorRate());
            assertEquals(3L, summary.getSignalItems());
            assertEquals("OK", summary.getSignals().getFirst().getLatestStatusCode());
            assertEquals("OTLP metrics grpc dropped by governance policy: service.name=checkout",
                    summary.getSignals().getFirst().getLatestReason());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void prefersDurableReadbackWhenGreptimeEventsAreAvailable() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpCorrelationContext teamA = new OtlpCorrelationContext("memory-ing", "memory-entity", "team-a");
        auditService.recordAccepted("logs", "http", teamA, 999L, 99L, 99L);
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.List.of(
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "accepted", "OK", "team-a", "entity-a", "ing-a",
                        100L, 2L, null, 10L, 1710000000001L),
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "rejected", "RESOURCE_EXHAUSTED", "team-a", "entity-a", "ing-b",
                        300L, null, "quota exceeded", null, 1710000000002L)
        );
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(2L, summary.getRequestCount());
            assertEquals(1L, summary.getErrorCount());
            assertEquals(400L, summary.getRequestBytes());
            assertEquals(2L, summary.getSignalItems());
            assertEquals(2L, summary.getAverageSignalItems());
            assertEquals(2L, summary.getMaxSignalItems());
            assertEquals(10L, summary.getAverageDurationMillis());
            assertEquals("RESOURCE_EXHAUSTED", summary.getSignals().getFirst().getLatestStatusCode());
            assertEquals("quota exceeded", summary.getSignals().getFirst().getLatestReason());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void capsDurableReadbackWhenReaderIgnoresRecentEventLimit() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.stream.IntStream
                .rangeClosed(1, 300)
                .mapToObj(index -> {
                    int newestFirstIndex = 301 - index;
                    return new OtlpIngestionAuditEvent(
                            "logs", "http", "accepted", "OK", "team-a", "entity-a",
                            "ing-" + newestFirstIndex,
                            1L, 1L, null, 1L, 1_710_000_000_000L + newestFirstIndex);
                })
                .toList();
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(256L, summary.getRequestCount());
            assertEquals(256L, summary.getRequestBytes());
            assertEquals(256L, summary.getSignalItems());
            assertEquals(1, summary.getSignals().size());
            assertEquals(256L, summary.getSignals().getFirst().getRequestCount());
            assertEquals(1_710_000_000_300L, summary.getLatestObservedAt());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void capsDurableReadbackToNewestRowsWhenReaderIgnoresLimitOrdering() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.stream.IntStream
                .rangeClosed(1, 300)
                .mapToObj(index -> new OtlpIngestionAuditEvent(
                        "logs", "http", "accepted", "OK", "team-a", "entity-a",
                        "ing-" + index,
                        1L, (long) index, null, 1L, 1_710_000_000_000L + index))
                .toList();
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(256L, summary.getRequestCount());
            assertEquals(java.util.stream.LongStream.rangeClosed(45L, 300L).sum(), summary.getSignalItems());
            assertEquals(1_710_000_000_300L, summary.getLatestObservedAt());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void computesRequestRatePerMinuteFromClosedTimeWindow() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionAuditEventReader durableReader = new OtlpIngestionAuditEventReader() {
            @Override
            public java.util.List<OtlpIngestionAuditEvent> recentEvents(String workspaceId, int limit) {
                return java.util.List.of();
            }

            @Override
            public java.util.List<OtlpIngestionAuditEvent> recentEvents(String workspaceId, int limit,
                                                                        Long startMillis, Long endMillis) {
                return java.util.List.of(
                        new OtlpIngestionAuditEvent(
                                "metrics", "grpc", "accepted", "OK", "team-a", "entity-a", "ing-a",
                                100L, 2L, null, 10L, 1_710_000_000_000L),
                        new OtlpIngestionAuditEvent(
                                "logs", "http", "accepted", "OK", "team-a", "entity-a", "ing-b",
                                200L, 3L, null, 20L, 1_710_000_030_000L),
                        new OtlpIngestionAuditEvent(
                                "logs", "http", "rejected", "RESOURCE_EXHAUSTED", "team-a", "entity-a", "ing-c",
                                300L, null, "quota exceeded", null, 1_710_000_060_000L)
                );
            }
        };
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary(
                    1_710_000_000_000L, 1_710_000_120_000L);

            assertEquals(1.5D, summary.getRequestRatePerMinute());
            assertEquals(0.5D, summary.getSignals().getFirst().getRequestRatePerMinute());
            assertEquals(1.0D, summary.getSignals().get(1).getRequestRatePerMinute());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void computesRequestRatePerMinuteFromShortClosedTimeWindow() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionAuditEventReader durableReader = new OtlpIngestionAuditEventReader() {
            @Override
            public java.util.List<OtlpIngestionAuditEvent> recentEvents(String workspaceId, int limit) {
                return java.util.List.of();
            }

            @Override
            public java.util.List<OtlpIngestionAuditEvent> recentEvents(String workspaceId, int limit,
                                                                        Long startMillis, Long endMillis) {
                return java.util.List.of(
                        new OtlpIngestionAuditEvent(
                                "metrics", "grpc", "accepted", "OK", "team-a", "entity-a", "ing-a",
                                100L, 2L, null, 10L, 1_710_000_000_000L),
                        new OtlpIngestionAuditEvent(
                                "metrics", "grpc", "accepted", "OK", "team-a", "entity-a", "ing-b",
                                200L, 3L, null, 20L, 1_710_000_010_000L),
                        new OtlpIngestionAuditEvent(
                                "logs", "http", "accepted", "OK", "team-a", "entity-a", "ing-c",
                                300L, 4L, null, 30L, 1_710_000_020_000L)
                );
            }
        };
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary(
                    1_710_000_000_000L, 1_710_000_030_000L);

            assertEquals(6D, summary.getRequestRatePerMinute());
            assertEquals(4D, summary.getSignals().getFirst().getRequestRatePerMinute());
            assertEquals(2D, summary.getSignals().get(1).getRequestRatePerMinute());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void dropsDurableRowsWithUnsupportedAuditClassificationBeforeSummarizing() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.List.of(
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "accepted", "OK", "team-a", "entity-a", "ing-a",
                        100L, 2L, null, 10L, 1_710_000_000_000L),
                new OtlpIngestionAuditEvent(
                        null, "grpc", "rejected", "INVALID_ARGUMENT", "team-a", "entity-a", "ing-b",
                        200L, null, "missing signal", null, 1_710_000_000_001L),
                new OtlpIngestionAuditEvent(
                        "custom-signal", null, "accepted", "OK", "team-a", "entity-a", "ing-c",
                        300L, 3L, null, 20L, 1_710_000_000_002L),
                new OtlpIngestionAuditEvent(
                        " ", " ", "accepted", "OK", "team-a", "entity-a", "ing-d",
                        400L, 4L, null, 30L, 1_710_000_000_003L),
                new OtlpIngestionAuditEvent(
                        "traces", "udp", "accepted", "OK", "team-a", "entity-a", "ing-e",
                        500L, 5L, null, 40L, 1_710_000_000_004L),
                new OtlpIngestionAuditEvent(
                        "logs", "http", "queued", "OK", "team-a", "entity-a", "ing-f",
                        600L, 6L, null, 50L, 1_710_000_000_005L),
                new OtlpIngestionAuditEvent(
                        "traces", "grpc", "accepted", null, "team-a", "entity-a", "ing-g",
                        700L, 7L, null, 60L, 1_710_000_000_006L)
        );
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(1L, summary.getRequestCount());
            assertEquals(1, summary.getSignals().size());
            assertEquals("metrics", summary.getSignals().getFirst().getSignal());
            assertEquals("grpc", summary.getSignals().getFirst().getProtocol());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void doesNotFallBackToMemoryWhenDurableReadbackContainsOnlyInvalidRows() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpCorrelationContext teamA = new OtlpCorrelationContext("memory-ing", "memory-entity", "team-a");
        auditService.recordAccepted("logs", "http", teamA, 999L, 99L, 99L);
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.List.of(
                new OtlpIngestionAuditEvent(
                        "profiles", "http", "accepted", "OK", "team-a", "entity-a", "ing-a",
                        100L, 2L, null, 10L, 1_710_000_000_000L),
                new OtlpIngestionAuditEvent(
                        "metrics", "udp", "accepted", "OK", "team-a", "entity-a", "ing-b",
                        200L, 3L, null, 20L, 1_710_000_000_001L),
                new OtlpIngestionAuditEvent(
                        "logs", "http", "queued", "OK", "team-a", "entity-a", "ing-c",
                        300L, 4L, null, 30L, 1_710_000_000_002L)
        );
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(0L, summary.getRequestCount());
            assertEquals(0L, summary.getRequestBytes());
            assertEquals(0, summary.getSignals().size());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void fallsBackToMemoryWhenDurableRowsAreOutsideCurrentWorkspace() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpCorrelationContext teamA = new OtlpCorrelationContext("memory-ing", "memory-entity", "team-a");
        auditService.recordAccepted("logs", "http", teamA, 999L, 99L, 99L);
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.List.of(
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "accepted", "OK", "team-b", "entity-b", "ing-b",
                        100L, 2L, null, 10L, 1_710_000_000_000L)
        );
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(1L, summary.getRequestCount());
            assertEquals(999L, summary.getRequestBytes());
            assertEquals(1, summary.getSignals().size());
            assertEquals("logs", summary.getSignals().getFirst().getSignal());
            assertEquals("http", summary.getSignals().getFirst().getProtocol());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void fallsBackToMemoryWhenDurableReaderReturnsOnlyRowsOutsideCurrentWorkspace() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpCorrelationContext teamA = new OtlpCorrelationContext("memory-ing", "memory-entity", "team-a");
        auditService.recordAccepted("logs", "http", teamA, 999L, 99L, 99L);
        OtlpIngestionAuditEventReader durableReader = new OtlpIngestionAuditEventReader() {
            @Override
            public java.util.List<OtlpIngestionAuditEvent> recentEvents(String workspaceId, int limit) {
                return java.util.List.of();
            }

            @Override
            public java.util.List<OtlpIngestionAuditEvent> recentEvents(String workspaceId, int limit,
                                                                        Long startMillis, Long endMillis) {
                return java.util.List.of(new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "accepted", "OK", "team-b", "entity-b", "ing-b",
                        100L, 2L, null, 10L, 1_710_000_000_000L));
            }
        };
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(1L, summary.getRequestCount());
            assertEquals(999L, summary.getRequestBytes());
            assertEquals(1, summary.getSignals().size());
            assertEquals("logs", summary.getSignals().getFirst().getSignal());
            assertEquals("http", summary.getSignals().getFirst().getProtocol());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void normalizesSignalAndProtocolCaseBeforeSummarizingDurableRows() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.List.of(
                new OtlpIngestionAuditEvent(
                        "Metrics", "GRPC", "accepted", "OK", "team-a", "entity-a", "ing-a",
                        100L, 2L, null, 10L, 1_710_000_000_000L),
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "rejected", "RESOURCE_EXHAUSTED", "team-a", "entity-a", "ing-b",
                        200L, 3L, "quota exceeded", 20L, 1_710_000_000_001L)
        );
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(2L, summary.getRequestCount());
            assertEquals(1, summary.getSignals().size());
            OtlpIngestionRedSummaryDto.SignalRedMetric metricsGrpc = summary.getSignals().getFirst();
            assertEquals("metrics", metricsGrpc.getSignal());
            assertEquals("grpc", metricsGrpc.getProtocol());
            assertEquals(2L, metricsGrpc.getRequestCount());
            assertEquals(1L, metricsGrpc.getErrorCount());
            assertEquals(300L, metricsGrpc.getRequestBytes());
            assertEquals(5L, metricsGrpc.getSignalItems());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void keepsDurableRowsWithMissingOutcomeWhenStatusIsNonOk() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.List.of(
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", null, "RESOURCE_EXHAUSTED", "team-a", "entity-a", "ing-a",
                        100L, 2L, "quota exceeded", 10L, 1_710_000_000_000L),
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", null, "OK", "team-a", "entity-a", "ing-b",
                        200L, 3L, null, 20L, 1_710_000_000_001L),
                new OtlpIngestionAuditEvent(
                        "logs", "http", "dropped", "OK", "team-a", "entity-a", "ing-c",
                        300L, 4L, "governance dropped", 30L, 1_710_000_000_002L)
        );
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(2L, summary.getRequestCount());
            assertEquals(1L, summary.getErrorCount());
            assertEquals(0.5D, summary.getErrorRate());
            assertEquals(2, summary.getSignals().size());
            assertEquals("metrics", summary.getSignals().getFirst().getSignal());
            assertEquals("grpc", summary.getSignals().getFirst().getProtocol());
            assertEquals(1L, summary.getSignals().getFirst().getErrorCount());
            assertEquals("logs", summary.getSignals().get(1).getSignal());
            assertEquals("http", summary.getSignals().get(1).getProtocol());
            assertEquals(0L, summary.getSignals().get(1).getErrorCount());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void keepsDurableRowsWithUnsupportedOutcomeWhenStatusIsNonOk() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.List.of(
                new OtlpIngestionAuditEvent(
                        "traces", "grpc", "failed", "UNAVAILABLE", "team-a", "entity-a", "ing-a",
                        100L, 2L, "greptime unavailable", 10L, 1_710_000_000_000L),
                new OtlpIngestionAuditEvent(
                        "traces", "grpc", "accepted", "OK", "team-a", "entity-a", "ing-b",
                        200L, 3L, null, 20L, 1_710_000_000_001L)
        );
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(2L, summary.getRequestCount());
            assertEquals(1L, summary.getErrorCount());
            assertEquals(0.5D, summary.getErrorRate());
            assertEquals(1, summary.getSignals().size());
            assertEquals("traces", summary.getSignals().getFirst().getSignal());
            assertEquals("grpc", summary.getSignals().getFirst().getProtocol());
            assertEquals(1L, summary.getSignals().getFirst().getErrorCount());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void countsDurableRowsWithNonOkStatusAndUnsupportedOutcomeAsErrors() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.List.of(
                new OtlpIngestionAuditEvent(
                        "traces", "grpc", "failed", "UNAVAILABLE", "team-a", "entity-a", "ing-a",
                        100L, 2L, "greptime unavailable", 10L, 1_710_000_000_000L),
                new OtlpIngestionAuditEvent(
                        "logs", "http", null, "RESOURCE_EXHAUSTED", "team-a", "entity-a", "ing-b",
                        200L, 3L, "quota exceeded", 20L, 1_710_000_000_001L),
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "queued", "OK", "team-a", "entity-a", "ing-c",
                        300L, 4L, "queued without failure", 30L, 1_710_000_000_002L)
        );
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(2L, summary.getRequestCount());
            assertEquals(2L, summary.getErrorCount());
            assertEquals(1D, summary.getErrorRate());
            assertEquals(300L, summary.getRequestBytes());
            assertEquals(2, summary.getSignals().size());
            assertEquals("logs", summary.getSignals().getFirst().getSignal());
            assertEquals("http", summary.getSignals().getFirst().getProtocol());
            assertEquals("RESOURCE_EXHAUSTED", summary.getSignals().getFirst().getLatestStatusCode());
            assertEquals("traces", summary.getSignals().get(1).getSignal());
            assertEquals("grpc", summary.getSignals().get(1).getProtocol());
            assertEquals("UNAVAILABLE", summary.getSignals().get(1).getLatestStatusCode());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void normalizesDurableStatusCodeBeforeSummarizingCustomReaderRows() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.List.of(
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "accepted", "OK", "team-a", "entity-a", "ing-a",
                        100L, 2L, null, 10L, 1_710_000_000_000L),
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "rejected", " - resource exhausted - ", "team-a", "entity-a", "ing-b",
                        200L, 3L, "quota exceeded", 20L, 1_710_000_000_001L)
        );
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(2L, summary.getRequestCount());
            assertEquals(1L, summary.getErrorCount());
            assertEquals("RESOURCE_EXHAUSTED", summary.getSignals().getFirst().getLatestStatusCode());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void normalizesNumericGrpcStatusCodesBeforeSummarizingCustomReaderRows() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.List.of(
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "accepted", "0", "team-a", "entity-a", "ing-a",
                        100L, 2L, null, 10L, 1_710_000_000_000L),
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "rejected", "8", "team-a", "entity-a", "ing-b",
                        200L, 3L, "quota exceeded", 20L, 1_710_000_000_001L)
        );
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(2L, summary.getRequestCount());
            assertEquals(1L, summary.getErrorCount());
            assertEquals("RESOURCE_EXHAUSTED", summary.getSignals().getFirst().getLatestStatusCode());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void normalizesDecimalNumericGrpcStatusCodesBeforeSummarizingCustomReaderRows() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.List.of(
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "accepted", "0.0", "team-a", "entity-a", "ing-a",
                        100L, 2L, null, 10L, 1_710_000_000_000L),
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "rejected", "8.0", "team-a", "entity-a", "ing-b",
                        200L, 3L, "quota exceeded", 20L, 1_710_000_000_001L)
        );
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(2L, summary.getRequestCount());
            assertEquals(1L, summary.getErrorCount());
            assertEquals("RESOURCE_EXHAUSTED", summary.getSignals().getFirst().getLatestStatusCode());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void dropsDurableRowsWhenNormalizedStatusCodeHasNoTokenBeforeSummarizing() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.List.of(
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "accepted", " - - ", "team-a", "entity-a", "ing-a",
                        100L, 2L, null, 10L, 1_710_000_000_000L),
                new OtlpIngestionAuditEvent(
                        "logs", "http", "rejected", "resource exhausted", "team-a", "entity-a", "ing-b",
                        200L, 3L, "quota exceeded", 20L, 1_710_000_000_001L)
        );
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(1L, summary.getRequestCount());
            assertEquals(1L, summary.getErrorCount());
            assertEquals(1, summary.getSignals().size());
            assertEquals("logs", summary.getSignals().getFirst().getSignal());
            assertEquals("RESOURCE_EXHAUSTED", summary.getSignals().getFirst().getLatestStatusCode());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void doesNotSummarizeOrFallbackWhenDurableRowsContainOnlyNonCanonicalStatusCodes() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpCorrelationContext teamA = new OtlpCorrelationContext("memory-ing", "memory-entity", "team-a");
        auditService.recordAccepted("logs", "http", teamA, 999L, 99L, 99L);
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.List.of(
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "rejected", "backend-overloaded", "team-a", "entity-a", "ing-a",
                        100L, 2L, "backend overloaded", 10L, 1_710_000_000_000L),
                new OtlpIngestionAuditEvent(
                        "logs", "http", "rejected", "8.5", "team-a", "entity-a", "ing-b",
                        200L, 3L, "invalid numeric status", 20L, 1_710_000_000_001L)
        );
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(0L, summary.getRequestCount());
            assertEquals(0L, summary.getErrorCount());
            assertEquals(0L, summary.getRequestBytes());
            assertEquals(0, summary.getSignals().size());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void clampsNegativeDurableCountersBeforeSummarizing() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.List.of(
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "accepted", "OK", "team-a", "entity-a", "ing-a",
                        -500L, -5L, null, -40L, 1_710_000_000_000L),
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "accepted", "OK", "team-a", "entity-a", "ing-b",
                        200L, 3L, null, 20L, 1_710_000_000_001L)
        );
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(2L, summary.getRequestCount());
            assertEquals(200L, summary.getRequestBytes());
            assertEquals(3L, summary.getSignalItems());
            assertEquals(2L, summary.getAverageSignalItems());
            assertEquals(3L, summary.getMaxSignalItems());
            assertEquals(10L, summary.getAverageDurationMillis());
            assertEquals(20L, summary.getMaxDurationMillis());

            OtlpIngestionRedSummaryDto.SignalRedMetric metricsGrpc = summary.getSignals().getFirst();
            assertEquals(200L, metricsGrpc.getRequestBytes());
            assertEquals(3L, metricsGrpc.getSignalItems());
            assertEquals(2L, metricsGrpc.getAverageSignalItems());
            assertEquals(10L, metricsGrpc.getAverageDurationMillis());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void saturatesOverflowingDurableCountersBeforeSummarizing() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.List.of(
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "accepted", "OK", "team-a", "entity-a", "ing-a",
                        Long.MAX_VALUE, Long.MAX_VALUE, null, Long.MAX_VALUE, 1_710_000_000_000L),
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "accepted", "OK", "team-a", "entity-a", "ing-b",
                        Long.MAX_VALUE, Long.MAX_VALUE, null, Long.MAX_VALUE, 1_710_000_000_001L)
        );
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(Long.MAX_VALUE, summary.getRequestBytes());
            assertEquals(Long.MAX_VALUE, summary.getSignalItems());
            assertEquals(Long.MAX_VALUE, summary.getAverageSignalItems());
            assertEquals(Long.MAX_VALUE, summary.getMaxSignalItems());
            assertEquals(Long.MAX_VALUE, summary.getAverageDurationMillis());
            assertEquals(Long.MAX_VALUE, summary.getMaxDurationMillis());

            OtlpIngestionRedSummaryDto.SignalRedMetric metricsGrpc = summary.getSignals().getFirst();
            assertEquals(Long.MAX_VALUE, metricsGrpc.getRequestBytes());
            assertEquals(Long.MAX_VALUE, metricsGrpc.getSignalItems());
            assertEquals(Long.MAX_VALUE, metricsGrpc.getAverageSignalItems());
            assertEquals(Long.MAX_VALUE, metricsGrpc.getAverageDurationMillis());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void redactsDurableReasonBeforeExposingRedSummary() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.List.of(
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "rejected", "RESOURCE_EXHAUSTED", "team-a", "entity-a", "ing-a",
                        100L, 2L, "quota exceeded token=live-token", 10L, 1_710_000_000_000L)
        );
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals("quota exceeded token=[REDACTED]", summary.getSignals().getFirst().getLatestReason());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void ignoresDurableRowsWithoutPositiveObservedAtBeforeSummarizing() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpIngestionAuditEventReader durableReader = (workspaceId, limit) -> java.util.List.of(
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "accepted", "OK", "team-a", "entity-a", "ing-a",
                        100L, 2L, null, 10L, 0L),
                new OtlpIngestionAuditEvent(
                        "logs", "http", "accepted", "OK", "team-a", "entity-a", "ing-b",
                        200L, 3L, null, 20L, -1L),
                new OtlpIngestionAuditEvent(
                        "traces", "grpc", "accepted", "OK", "team-a", "entity-a", "ing-c",
                        300L, 4L, null, 30L, 1_710_000_000_000L)
        );
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(durableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary();

            assertEquals(1L, summary.getRequestCount());
            assertEquals(300L, summary.getRequestBytes());
            assertEquals(4L, summary.getSignalItems());
            assertEquals(1_710_000_000_000L, summary.getLatestObservedAt());
            assertEquals(1, summary.getSignals().size());
            assertEquals("traces", summary.getSignals().getFirst().getSignal());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void passesClosedTimeWindowToDurableReaderAndFiltersMemoryFallback() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpCorrelationContext teamA = new OtlpCorrelationContext("memory-ing", "memory-entity", "team-a");
        auditService.recordAccepted("logs", "http", teamA, 100L, 1L, 1L);
        java.util.concurrent.atomic.AtomicReference<Long> capturedStart = new java.util.concurrent.atomic.AtomicReference<>();
        java.util.concurrent.atomic.AtomicReference<Long> capturedEnd = new java.util.concurrent.atomic.AtomicReference<>();
        OtlpIngestionAuditEventReader emptyDurableReader = new OtlpIngestionAuditEventReader() {
            @Override
            public java.util.List<OtlpIngestionAuditEvent> recentEvents(String workspaceId, int limit) {
                return java.util.List.of();
            }

            @Override
            public java.util.List<OtlpIngestionAuditEvent> recentEvents(String workspaceId, int limit,
                                                                        Long startMillis, Long endMillis) {
                capturedStart.set(startMillis);
                capturedEnd.set(endMillis);
                return java.util.List.of();
            }
        };
        OtlpIngestionRedSummaryService summaryService =
                new OtlpIngestionRedSummaryService(auditService, java.util.List.of(emptyDurableReader));

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            long startMillis = System.currentTimeMillis() + 60_000L;
            long endMillis = startMillis + 60_000L;
            OtlpIngestionRedSummaryDto summary = summaryService.getSummary(startMillis, endMillis);

            assertEquals(0L, summary.getRequestCount());
            assertEquals(0L, summary.getRequestBytes());
            assertEquals(startMillis, capturedStart.get());
            assertEquals(endMillis, capturedEnd.get());
            assertEquals(null, summary.getLatestObservedAt());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }
}
