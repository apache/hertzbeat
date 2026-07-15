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

package org.apache.hertzbeat.collector.runtime.otel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

class OtelRuntimeStatusProviderTest {

    @Test
    void reportsLifecycleRevisionsAndLocalCredentialPresence() {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        properties.setConfigRevision(12);
        properties.setToken("managed-intake-token");
        OtelRuntimeSupervisor supervisor = mock(OtelRuntimeSupervisor.class);
        when(supervisor.snapshot()).thenReturn(new OtelRuntimeSnapshot(
                OtelRuntimeState.RUNNING, 42, 2, Instant.parse("2026-07-15T06:00:00Z"), ""));
        when(supervisor.activeRevision()).thenReturn(11L);
        ManagedOtelRuntimeStatus.ManagedOtelSourceStatus source =
                new ManagedOtelRuntimeStatus.ManagedOtelSourceStatus(
                        ManagedOtelRuntimeStatus.SourceType.HOST_METRICS,
                        "host",
                        11,
                        ManagedOtelRuntimeStatus.SourceState.ACTIVE,
                        "");
        when(supervisor.sourceStatuses()).thenReturn(List.of(source));
        OtelRuntimeTelemetryClient telemetryClient = mock(OtelRuntimeTelemetryClient.class);
        ManagedOtelRuntimeStatus.RuntimeTelemetry telemetry = telemetry(5, 2048, 0);
        when(telemetryClient.scrape(properties, false)).thenReturn(telemetry);
        OtelRuntimeDiagnosticsReader diagnosticsReader = mock(OtelRuntimeDiagnosticsReader.class);
        when(diagnosticsReader.latestFailure(properties)).thenReturn(ManagedOtelRuntimeStatus.FailureCode.NONE);
        when(diagnosticsReader.sanitize("", properties)).thenReturn("");
        OtelRuntimeStatusProvider provider = new OtelRuntimeStatusProvider(
                properties, supervisor, telemetryClient, diagnosticsReader, new OtelRuntimeFailureClassifier());

        ManagedOtelRuntimeStatus status = provider.status();

        assertEquals(ManagedOtelRuntimeStatus.RuntimeState.RUNNING, status.state());
        assertEquals(12, status.desiredRevision());
        assertEquals(11, status.activeRevision());
        assertEquals(42, status.pid());
        assertEquals(ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED,
                status.intakeCredentialState());
        assertEquals(List.of(source), status.sources());
        assertEquals(telemetry, status.telemetry());
    }

    @Test
    void disabledRuntimeDoesNotRequireIntakeCredential() {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        OtelRuntimeSupervisor supervisor = mock(OtelRuntimeSupervisor.class);
        when(supervisor.snapshot()).thenReturn(new OtelRuntimeSnapshot(
                OtelRuntimeState.STOPPED, -1, 0, Instant.parse("2026-07-15T06:00:00Z"), ""));
        OtelRuntimeTelemetryClient telemetryClient = mock(OtelRuntimeTelemetryClient.class);
        when(telemetryClient.scrape(properties, false))
                .thenReturn(ManagedOtelRuntimeStatus.RuntimeTelemetry.unavailable(false));
        OtelRuntimeDiagnosticsReader diagnosticsReader = mock(OtelRuntimeDiagnosticsReader.class);
        when(diagnosticsReader.latestFailure(properties)).thenReturn(ManagedOtelRuntimeStatus.FailureCode.NONE);
        when(diagnosticsReader.sanitize("", properties)).thenReturn("");
        OtelRuntimeStatusProvider provider = new OtelRuntimeStatusProvider(
                properties, supervisor, telemetryClient, diagnosticsReader, new OtelRuntimeFailureClassifier());

        ManagedOtelRuntimeStatus status = provider.status();

        assertEquals(ManagedOtelRuntimeStatus.IntakeCredentialState.NOT_REQUIRED,
                status.intakeCredentialState());
    }

    @Test
    void reportsExporterFailureWithoutRestartingRuntimeOrLeakingSensitiveDiagnostics() {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        properties.setToken("collector-secret-token");
        properties.setOtlpGatewayBearerToken("gateway-secret-token");
        OtelRuntimeSupervisor supervisor = mock(OtelRuntimeSupervisor.class);
        when(supervisor.snapshot()).thenReturn(new OtelRuntimeSnapshot(
                OtelRuntimeState.RUNNING,
                42,
                0,
                Instant.parse("2026-07-15T06:00:00Z"),
                "Authorization: Bearer collector-secret-token"));
        when(supervisor.activeRevision()).thenReturn(1L);
        when(supervisor.sourceStatuses()).thenReturn(List.of());
        OtelRuntimeTelemetryClient telemetryClient = mock(OtelRuntimeTelemetryClient.class);
        when(telemetryClient.scrape(properties, false)).thenReturn(telemetry(7, 2048, 0));
        OtelRuntimeDiagnosticsReader diagnosticsReader = mock(OtelRuntimeDiagnosticsReader.class);
        when(diagnosticsReader.latestFailure(properties))
                .thenReturn(ManagedOtelRuntimeStatus.FailureCode.AUTHENTICATION_FAILED);
        when(diagnosticsReader.sanitize("Authorization: Bearer collector-secret-token", properties))
                .thenReturn("Authorization: [REDACTED]");
        OtelRuntimeStatusProvider provider = new OtelRuntimeStatusProvider(
                properties, supervisor, telemetryClient, diagnosticsReader, new OtelRuntimeFailureClassifier());

        ManagedOtelRuntimeStatus status = provider.status();
        String payload = JsonUtil.toJson(status);

        assertEquals(ManagedOtelRuntimeStatus.RuntimeState.RUNNING, status.state());
        assertEquals(0, status.restartCount());
        assertEquals(ManagedOtelRuntimeStatus.FailureCode.AUTHENTICATION_FAILED, status.failureCode());
        assertFalse(payload.contains("collector-secret-token"));
        assertFalse(payload.contains("gateway-secret-token"));
        assertFalse(payload.contains("BEGIN CERTIFICATE"));
        assertFalse(payload.contains("user log body"));
    }

    @Test
    void classifiesCurrentBackendBacklogAndFullQueueWithoutChangingProcessLifecycle() {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        properties.setToken("managed-intake-token");
        OtelRuntimeSupervisor supervisor = mock(OtelRuntimeSupervisor.class);
        when(supervisor.snapshot()).thenReturn(new OtelRuntimeSnapshot(
                OtelRuntimeState.RUNNING, 42, 0, Instant.parse("2026-07-15T06:00:00Z"), ""));
        when(supervisor.activeRevision()).thenReturn(1L);
        when(supervisor.sourceStatuses()).thenReturn(List.of());
        OtelRuntimeTelemetryClient telemetryClient = mock(OtelRuntimeTelemetryClient.class);
        OtelRuntimeDiagnosticsReader diagnosticsReader = mock(OtelRuntimeDiagnosticsReader.class);
        when(diagnosticsReader.latestFailure(properties)).thenReturn(ManagedOtelRuntimeStatus.FailureCode.NONE);
        when(diagnosticsReader.sanitize("", properties)).thenReturn("");
        OtelRuntimeStatusProvider provider = new OtelRuntimeStatusProvider(
                properties, supervisor, telemetryClient, diagnosticsReader, new OtelRuntimeFailureClassifier());

        when(telemetryClient.scrape(properties, false)).thenReturn(telemetry(7, 2048, 3));
        ManagedOtelRuntimeStatus backendUnavailable = provider.status();
        when(telemetryClient.scrape(properties, false)).thenReturn(telemetry(2048, 2048, 3));
        ManagedOtelRuntimeStatus queueFull = provider.status();

        assertEquals(ManagedOtelRuntimeStatus.FailureCode.BACKEND_UNAVAILABLE,
                backendUnavailable.failureCode());
        assertEquals(ManagedOtelRuntimeStatus.FailureCode.QUEUE_FULL, queueFull.failureCode());
        assertEquals(ManagedOtelRuntimeStatus.RuntimeState.RUNNING, queueFull.state());
        assertEquals(0, queueFull.restartCount());
        assertEquals(42, queueFull.pid());
    }

    @Test
    void ignoresHistoricalStartupFailureAfterRuntimeRecovery() {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        OtelRuntimeSupervisor supervisor = mock(OtelRuntimeSupervisor.class);
        when(supervisor.snapshot()).thenReturn(new OtelRuntimeSnapshot(
                OtelRuntimeState.RUNNING, 42, 0, Instant.parse("2026-07-15T06:00:00Z"), ""));
        when(supervisor.activeRevision()).thenReturn(1L);
        when(supervisor.sourceStatuses()).thenReturn(List.of());
        OtelRuntimeTelemetryClient telemetryClient = mock(OtelRuntimeTelemetryClient.class);
        when(telemetryClient.scrape(properties, false)).thenReturn(telemetry(0, 6144, 0));
        OtelRuntimeDiagnosticsReader diagnosticsReader = mock(OtelRuntimeDiagnosticsReader.class);
        when(diagnosticsReader.latestFailure(properties))
                .thenReturn(ManagedOtelRuntimeStatus.FailureCode.CONFIGURATION_ERROR);
        when(diagnosticsReader.sanitize("", properties)).thenReturn("");
        OtelRuntimeStatusProvider provider = new OtelRuntimeStatusProvider(
                properties, supervisor, telemetryClient, diagnosticsReader, new OtelRuntimeFailureClassifier());

        assertEquals(ManagedOtelRuntimeStatus.FailureCode.NONE, provider.status().failureCode());
    }

    private ManagedOtelRuntimeStatus.RuntimeTelemetry telemetry(
            long queueSize, long queueCapacity, long failedMetrics) {
        return new ManagedOtelRuntimeStatus.RuntimeTelemetry(
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                new ManagedOtelRuntimeStatus.SignalCounters(
                        ManagedOtelRuntimeStatus.ObservedLong.available(failedMetrics),
                        ManagedOtelRuntimeStatus.ObservedLong.unavailable(),
                        ManagedOtelRuntimeStatus.ObservedLong.unavailable()),
                ManagedOtelRuntimeStatus.ObservedLong.available(queueSize),
                ManagedOtelRuntimeStatus.ObservedLong.available(queueCapacity),
                ManagedOtelRuntimeStatus.FileConsumerStatus.notApplicable());
    }
}
