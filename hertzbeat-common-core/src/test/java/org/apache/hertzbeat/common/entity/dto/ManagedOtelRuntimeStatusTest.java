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

package org.apache.hertzbeat.common.entity.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import java.util.List;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

class ManagedOtelRuntimeStatusTest {

    @Test
    void distinguishesUnavailableCountersFromObservedZeroWithoutPayloadContent() {
        ManagedOtelRuntimeStatus.ObservedLong observedZero =
                ManagedOtelRuntimeStatus.ObservedLong.available(0);
        ManagedOtelRuntimeStatus.ObservedLong unavailable =
                ManagedOtelRuntimeStatus.ObservedLong.unavailable();
        ManagedOtelRuntimeStatus.RuntimeTelemetry telemetry = new ManagedOtelRuntimeStatus.RuntimeTelemetry(
                new ManagedOtelRuntimeStatus.SignalCounters(observedZero, unavailable, observedZero),
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                observedZero,
                ManagedOtelRuntimeStatus.ObservedLong.available(2048),
                new ManagedOtelRuntimeStatus.FileConsumerStatus(
                        ManagedOtelRuntimeStatus.ObservedLong.notApplicable(),
                        ManagedOtelRuntimeStatus.ObservedLong.notApplicable()));
        ManagedOtelRuntimeStatus status = new ManagedOtelRuntimeStatus(
                ManagedOtelRuntimeStatus.CURRENT_SCHEMA_VERSION,
                true,
                ManagedOtelRuntimeStatus.RuntimeState.RUNNING,
                12,
                11,
                4201,
                ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED,
                2,
                Instant.parse("2026-07-15T06:00:00Z"),
                "",
                ManagedOtelRuntimeStatus.FailureCode.NONE,
                telemetry,
                List.of());

        assertEquals(4201, status.pid());
        assertEquals(ManagedOtelRuntimeStatus.ValueState.AVAILABLE,
                status.telemetry().accepted().metrics().state());
        assertEquals(0, status.telemetry().accepted().metrics().value());
        assertEquals(ManagedOtelRuntimeStatus.ValueState.UNAVAILABLE,
                status.telemetry().accepted().logs().state());
        assertEquals(ManagedOtelRuntimeStatus.ValueState.UNAVAILABLE,
                status.telemetry().queueSizeBySignal().metrics().state());
        assertFalse(status.toString().contains("telemetry body"));
    }

    @Test
    void acceptsBoundedVersionedRuntimeStatus() {
        ManagedOtelRuntimeStatus status = new ManagedOtelRuntimeStatus(
                ManagedOtelRuntimeStatus.CURRENT_SCHEMA_VERSION,
                true,
                ManagedOtelRuntimeStatus.RuntimeState.RUNNING,
                12,
                11,
                ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED,
                2,
                Instant.parse("2026-07-15T06:00:00Z"),
                "recovered with last-known-good"
        );

        assertEquals(12, status.desiredRevision());
        assertEquals(11, status.activeRevision());
    }

    @Test
    void rejectsInvalidOrUnboundedDiagnostics() {
        assertThrows(IllegalArgumentException.class, () -> new ManagedOtelRuntimeStatus(
                99,
                true,
                ManagedOtelRuntimeStatus.RuntimeState.RUNNING,
                1,
                1,
                ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED,
                0,
                Instant.now(),
                ""
        ));
        assertThrows(IllegalArgumentException.class, () -> new ManagedOtelRuntimeStatus(
                ManagedOtelRuntimeStatus.CURRENT_SCHEMA_VERSION,
                true,
                ManagedOtelRuntimeStatus.RuntimeState.FAILED,
                1,
                0,
                ManagedOtelRuntimeStatus.IntakeCredentialState.MISSING,
                1,
                Instant.now(),
                "x".repeat(513)
        ));
    }

    @Test
    void carriesBoundedDesiredActiveAndRejectedSourceStates() {
        ManagedOtelRuntimeStatus.ManagedOtelSourceStatus active = new ManagedOtelRuntimeStatus.ManagedOtelSourceStatus(
                ManagedOtelRuntimeStatus.SourceType.PROMETHEUS,
                "payments",
                12,
                ManagedOtelRuntimeStatus.SourceState.ACTIVE,
                ""
        );
        ManagedOtelRuntimeStatus.ManagedOtelSourceStatus rejected =
                new ManagedOtelRuntimeStatus.ManagedOtelSourceStatus(
                        ManagedOtelRuntimeStatus.SourceType.FILE_LOG,
                        "payments",
                        13,
                        ManagedOtelRuntimeStatus.SourceState.REJECTED,
                        "Unknown local path profile"
                );
        ManagedOtelRuntimeStatus status = new ManagedOtelRuntimeStatus(
                ManagedOtelRuntimeStatus.CURRENT_SCHEMA_VERSION,
                true,
                ManagedOtelRuntimeStatus.RuntimeState.RUNNING,
                13,
                12,
                ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED,
                0,
                Instant.now(),
                "",
                List.of(active, rejected)
        );

        assertEquals(List.of(active, rejected), status.sources());
    }

    @Test
    void readsLegacyStatusWithoutSourceStates() {
        ManagedOtelRuntimeStatus status = new ManagedOtelRuntimeStatus(
                1,
                true,
                ManagedOtelRuntimeStatus.RuntimeState.RUNNING,
                1,
                1,
                ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED,
                0,
                Instant.now(),
                "",
                null
        );

        assertEquals(List.of(), status.sources());
    }

    @Test
    void readsExistingSchemaTwoHeartbeatWithoutAdditiveRuntimeTelemetryFields() {
        String payload = """
                {
                  "schemaVersion": 2,
                  "enabled": true,
                  "state": "RUNNING",
                  "desiredRevision": 2,
                  "activeRevision": 2,
                  "intakeCredentialState": "CONFIGURED",
                  "restartCount": 0,
                  "changedAt": "2026-07-15T06:00:00Z",
                  "lastError": "",
                  "sources": []
                }
                """;

        ManagedOtelRuntimeStatus status = JsonUtil.fromJson(payload, ManagedOtelRuntimeStatus.class);

        assertEquals(-1, status.pid());
        assertEquals(ManagedOtelRuntimeStatus.FailureCode.NONE, status.failureCode());
        assertEquals(ManagedOtelRuntimeStatus.ValueState.UNAVAILABLE,
                status.telemetry().queueSize().state());
        assertEquals(ManagedOtelRuntimeStatus.ValueState.UNAVAILABLE,
                status.telemetry().queueCapacityBySignal().traces().state());
    }
}
