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
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.grpc.Status;
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationContext;
import org.apache.hertzbeat.observability.ingestion.redaction.OtlpIngestionRedactionService;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link OtlpIngestionAuditService}.
 */
class OtlpIngestionAuditServiceTest {

    @Test
    void recordsAcceptedAndRejectedEventsWithWorkspaceAndBoundedHistory() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpCorrelationContext context = new OtlpCorrelationContext("ing-1", "entity-1", "team-a");

        auditService.recordAccepted("logs", "http", context, 128L, 2L, 11L);
        auditService.recordRejected("metrics", "grpc", context, 256L,
                Status.Code.RESOURCE_EXHAUSTED, "quota exceeded", 5L, 13L);

        List<OtlpIngestionAuditEvent> events = auditService.recentEvents();
        assertEquals(2, events.size());
        assertEquals("metrics", events.getFirst().signal());
        assertEquals("grpc", events.getFirst().protocol());
        assertEquals("rejected", events.getFirst().outcome());
        assertEquals("RESOURCE_EXHAUSTED", events.getFirst().statusCode());
        assertEquals("team-a", events.getFirst().workspaceId());
        assertEquals(256L, events.getFirst().requestBytes());
        assertEquals(5L, events.getFirst().signalItems());
        assertEquals("quota exceeded", events.getFirst().reason());
        assertEquals(13L, events.getFirst().durationMillis());

        assertEquals("logs", events.get(1).signal());
        assertEquals("accepted", events.get(1).outcome());
        assertEquals("OK", events.get(1).statusCode());
        assertEquals(2L, events.get(1).signalItems());
        assertEquals(11L, events.get(1).durationMillis());

        for (int index = 0; index < 300; index++) {
            auditService.recordAccepted("traces", "http", context, index);
        }
        assertEquals(256, auditService.recentEvents().size());
        assertTrue(auditService.recentEvents().stream().noneMatch(event -> event.requestBytes() == 0L));
    }

    @Test
    void publishesSanitizedEventsToSinksWithoutBreakingRecentHistory() {
        List<OtlpIngestionAuditEvent> persistedEvents = new ArrayList<>();
        OtlpIngestionAuditEventSink failingSink = event -> {
            throw new IllegalStateException("sink down");
        };
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService(
                new OtlpIngestionRedactionService(),
                List.of(persistedEvents::add, failingSink));
        OtlpCorrelationContext context = new OtlpCorrelationContext("ing-1", "entity-1", "team-a");

        auditService.recordRejected("metrics", "grpc", context, 256L,
                Status.Code.RESOURCE_EXHAUSTED, "token=live-secret", 5L, 13L);

        assertEquals(1, persistedEvents.size());
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent persisted = persistedEvents.getFirst();
        assertEquals("metrics", persisted.signal());
        assertEquals("grpc", persisted.protocol());
        assertEquals("rejected", persisted.outcome());
        assertEquals("RESOURCE_EXHAUSTED", persisted.statusCode());
        assertEquals("team-a", persisted.workspaceId());
        assertEquals(5L, persisted.signalItems());
        assertEquals(13L, persisted.durationMillis());
        assertEquals("token=[REDACTED]", persisted.reason());
        assertEquals(persisted, auditService.recentEvents().getFirst());
    }

    @Test
    void skipsUnsupportedSignalOrProtocolBeforeRecentHistoryAndSinks() {
        List<OtlpIngestionAuditEvent> persistedEvents = new ArrayList<>();
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService(
                new OtlpIngestionRedactionService(), List.of(persistedEvents::add));
        OtlpCorrelationContext context = new OtlpCorrelationContext("ing-1", "entity-1", "team-a");

        auditService.recordAccepted("profiles", "http", context, 128L, 2L, 11L);
        auditService.recordRejected("metrics", "udp", context, 256L,
                Status.Code.RESOURCE_EXHAUSTED, "quota exceeded", 5L, 13L);
        auditService.recordDropped(null, "grpc", context, 512L, 8L,
                "missing signal", 21L);

        assertEquals(0, auditService.recentEvents().size());
        assertEquals(0, persistedEvents.size());
    }

    @Test
    void recordsUnknownRejectionWhenThrowableIsMissing() {
        OtlpIngestionAuditService auditService = new OtlpIngestionAuditService();
        OtlpCorrelationContext context = new OtlpCorrelationContext("ing-1", "entity-1", "team-a");

        assertDoesNotThrow(() -> auditService.recordRejected("metrics", "grpc", context, 256L,
                (Throwable) null, 5L, 13L));

        List<OtlpIngestionAuditEvent> events = auditService.recentEvents();
        assertEquals(1, events.size());
        OtlpIngestionAuditEvent event = events.getFirst();
        assertEquals("metrics", event.signal());
        assertEquals("grpc", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("UNKNOWN", event.statusCode());
        assertEquals(5L, event.signalItems());
        assertEquals(13L, event.durationMillis());
        assertNull(event.reason());
    }
}
