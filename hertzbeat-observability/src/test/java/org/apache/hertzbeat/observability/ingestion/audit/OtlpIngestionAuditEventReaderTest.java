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

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class OtlpIngestionAuditEventReaderTest {

    @Test
    void defaultWindowReadbackDropsRowsWithoutPositiveObservedAt() {
        OtlpIngestionAuditEventReader reader = (workspaceId, limit) -> List.of(
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

        List<OtlpIngestionAuditEvent> events = reader.recentEvents("team-a", 10, null, null);

        assertEquals(1, events.size());
        assertEquals("traces", events.getFirst().signal());
        assertEquals(1_710_000_000_000L, events.getFirst().observedAt());
    }

    @Test
    void defaultWindowReadbackFiltersRowsByRequestedWorkspace() {
        OtlpIngestionAuditEventReader reader = (workspaceId, limit) -> List.of(
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "accepted", "OK", "team-a", "entity-a", "ing-a",
                        100L, 2L, null, 10L, 1_710_000_000_000L),
                new OtlpIngestionAuditEvent(
                        "logs", "http", "accepted", "OK", "team-b", "entity-b", "ing-b",
                        200L, 3L, null, 20L, 1_710_000_000_001L),
                new OtlpIngestionAuditEvent(
                        "traces", "grpc", "accepted", "OK", null, "entity-c", "ing-c",
                        300L, 4L, null, 30L, 1_710_000_000_002L)
        );

        List<OtlpIngestionAuditEvent> events = reader.recentEvents("team-a", 10, null, null);

        assertEquals(1, events.size());
        assertEquals("metrics", events.getFirst().signal());
        assertEquals("team-a", events.getFirst().workspaceId());
    }

    @Test
    void defaultWindowReadbackDelegatesTrimmedWorkspaceToLegacyReader() {
        AtomicReference<String> capturedWorkspaceId = new AtomicReference<>();
        OtlpIngestionAuditEventReader reader = (workspaceId, limit) -> {
            capturedWorkspaceId.set(workspaceId);
            return List.of(new OtlpIngestionAuditEvent(
                    "metrics", "grpc", "accepted", "OK", "team-a", "entity-a", "ing-a",
                    100L, 2L, null, 10L, 1_710_000_000_000L));
        };

        List<OtlpIngestionAuditEvent> events = reader.recentEvents(" team-a ", 10, null, null);

        assertEquals("team-a", capturedWorkspaceId.get());
        assertEquals(1, events.size());
        assertEquals("metrics", events.getFirst().signal());
    }

    @Test
    void defaultWindowReadbackDelegatesBoundedLimitToLegacyReaderWhenLimitIsNotPositive() {
        AtomicReference<Integer> capturedLimit = new AtomicReference<>();
        OtlpIngestionAuditEventReader reader = (workspaceId, limit) -> {
            capturedLimit.set(limit);
            return IntStream.rangeClosed(1, 300)
                    .mapToObj(index -> new OtlpIngestionAuditEvent(
                            "logs", "http", "accepted", "OK", "team-a", "entity-a", "ing-" + index,
                            1L, 1L, null, 1L, 1_710_000_000_000L + index))
                    .toList();
        };

        List<OtlpIngestionAuditEvent> events = reader.recentEvents("team-a", 0, null, null);

        assertEquals(OtlpIngestionAuditEventReader.DEFAULT_MAX_LIMIT, capturedLimit.get());
        assertEquals(OtlpIngestionAuditEventReader.DEFAULT_MAX_LIMIT, events.size());
        assertEquals("ing-300", events.getFirst().ingestId());
    }

    @Test
    void defaultWindowReadbackCapsRowsWhenLegacyReaderIgnoresRequestedLimit() {
        OtlpIngestionAuditEventReader reader = (workspaceId, limit) -> List.of(
                new OtlpIngestionAuditEvent(
                        "logs", "http", "accepted", "OK", "team-a", "entity-a", "ing-b",
                        200L, 3L, null, 20L, 1_710_000_000_001L),
                new OtlpIngestionAuditEvent(
                        "traces", "grpc", "accepted", "OK", "team-a", "entity-a", "ing-c",
                        300L, 4L, null, 30L, 1_710_000_000_002L),
                new OtlpIngestionAuditEvent(
                        "metrics", "grpc", "accepted", "OK", "team-a", "entity-a", "ing-a",
                        100L, 2L, null, 10L, 1_710_000_000_003L)
        );

        List<OtlpIngestionAuditEvent> events = reader.recentEvents("team-a", 2, null, null);

        assertEquals(2, events.size());
        assertEquals("metrics", events.getFirst().signal());
        assertEquals("traces", events.get(1).signal());
    }
}
