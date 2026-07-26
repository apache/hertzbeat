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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.stream.Stream;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

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
        when(supervisor.snapshot()).thenReturn(
                new OtelRuntimeSnapshot(
                        OtelRuntimeState.RUNNING,
                        42,
                        0,
                        Instant.parse("2026-07-15T06:00:00Z"),
                        "Authorization: Bearer collector-secret-token"),
                new OtelRuntimeSnapshot(
                        OtelRuntimeState.RUNNING,
                        42,
                        0,
                        Instant.parse("2026-07-15T06:00:05Z"),
                        ""));
        when(supervisor.activeRevision()).thenReturn(1L);
        when(supervisor.sourceStatuses()).thenReturn(List.of());
        OtelRuntimeTelemetryClient telemetryClient = mock(OtelRuntimeTelemetryClient.class);
        when(telemetryClient.scrape(properties, false))
                .thenReturn(telemetry(7, 2048, 0), telemetry(0, 2048, 0));
        OtelRuntimeDiagnosticsReader diagnosticsReader = mock(OtelRuntimeDiagnosticsReader.class);
        when(diagnosticsReader.latestFailure(properties))
                .thenReturn(
                        ManagedOtelRuntimeStatus.FailureCode.AUTHENTICATION_FAILED,
                        ManagedOtelRuntimeStatus.FailureCode.NONE,
                        ManagedOtelRuntimeStatus.FailureCode.NONE);
        when(diagnosticsReader.sanitize("Authorization: Bearer collector-secret-token", properties))
                .thenReturn("[REDACTED_CREDENTIAL]");
        when(diagnosticsReader.sanitize("", properties)).thenReturn("");
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

        ManagedOtelRuntimeStatus recovered = provider.status();
        assertEquals(ManagedOtelRuntimeStatus.FailureCode.NONE, recovered.failureCode());
        assertEquals(42, recovered.pid());
        assertEquals(0, recovered.restartCount());
    }

    @Test
    void keepsPermanentAuthenticationFailureUntilExporterSendSucceeds() {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        properties.setToken("collector-secret-token");
        OtelRuntimeSupervisor supervisor = mock(OtelRuntimeSupervisor.class);
        when(supervisor.snapshot()).thenReturn(new OtelRuntimeSnapshot(
                OtelRuntimeState.RUNNING, 42, 0, Instant.parse("2026-07-15T06:00:00Z"), ""));
        when(supervisor.activeRevision()).thenReturn(1L);
        when(supervisor.sourceStatuses()).thenReturn(List.of());
        OtelRuntimeTelemetryClient telemetryClient = mock(OtelRuntimeTelemetryClient.class);
        when(telemetryClient.scrape(properties, false)).thenReturn(
                exporterTelemetry(0, 1, 0),
                exporterTelemetry(0, 1, 1),
                exporterTelemetry(0, 1, 1));
        OtelRuntimeDiagnosticsReader diagnosticsReader = mock(OtelRuntimeDiagnosticsReader.class);
        when(diagnosticsReader.latestFailure(properties))
                .thenReturn(
                        ManagedOtelRuntimeStatus.FailureCode.AUTHENTICATION_FAILED,
                        ManagedOtelRuntimeStatus.FailureCode.NONE,
                        ManagedOtelRuntimeStatus.FailureCode.NONE);
        when(diagnosticsReader.sanitize("", properties)).thenReturn("");
        OtelRuntimeStatusProvider provider = new OtelRuntimeStatusProvider(
                properties, supervisor, telemetryClient, diagnosticsReader, new OtelRuntimeFailureClassifier());

        ManagedOtelRuntimeStatus rejected = provider.status();
        ManagedOtelRuntimeStatus recovered = provider.status();
        ManagedOtelRuntimeStatus stable = provider.status();

        assertEquals(ManagedOtelRuntimeStatus.FailureCode.AUTHENTICATION_FAILED, rejected.failureCode());
        assertEquals(ManagedOtelRuntimeStatus.FailureCode.NONE, recovered.failureCode());
        assertEquals(ManagedOtelRuntimeStatus.FailureCode.NONE, stable.failureCode());
        assertEquals(42, rejected.pid());
        assertEquals(0, rejected.restartCount());
    }

    @Test
    void redactsRejectedSourceDiagnosticsBeforeHeartbeatSerialization() {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        properties.setToken("collector-secret-token");
        OtelRuntimeSupervisor supervisor = mock(OtelRuntimeSupervisor.class);
        when(supervisor.snapshot()).thenReturn(new OtelRuntimeSnapshot(
                OtelRuntimeState.RUNNING, 42, 0, Instant.parse("2026-07-15T06:00:00Z"), ""));
        when(supervisor.activeRevision()).thenReturn(1L);
        when(supervisor.sourceStatuses()).thenReturn(List.of(
                new ManagedOtelRuntimeStatus.ManagedOtelSourceStatus(
                        ManagedOtelRuntimeStatus.SourceType.PROMETHEUS,
                        "private-source",
                        2,
                        ManagedOtelRuntimeStatus.SourceState.REJECTED,
                        "Authorization: Bearer collector-secret-token")));
        OtelRuntimeTelemetryClient telemetryClient = mock(OtelRuntimeTelemetryClient.class);
        when(telemetryClient.scrape(properties, false)).thenReturn(telemetry(0, 2048, 0));
        OtelRuntimeDiagnosticsReader diagnosticsReader =
                new OtelRuntimeDiagnosticsReader(new OtelRuntimeFailureClassifier());
        OtelRuntimeStatusProvider provider = new OtelRuntimeStatusProvider(
                properties, supervisor, telemetryClient, diagnosticsReader, new OtelRuntimeFailureClassifier());

        ManagedOtelRuntimeStatus status = provider.status();
        String payload = JsonUtil.toJson(status);

        assertTrue(status.sources().getFirst().lastError().startsWith("[REDACTED"));
        assertFalse(payload.contains("collector-secret-token"));
        assertFalse(payload.contains("Authorization"));
        assertFalse(payload.contains("Bearer"));
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
        when(telemetryClient.scrape(properties, false)).thenReturn(telemetry(0, 2048, 3));
        ManagedOtelRuntimeStatus recovered = provider.status();

        assertEquals(ManagedOtelRuntimeStatus.FailureCode.BACKEND_UNAVAILABLE,
                backendUnavailable.failureCode());
        assertEquals(ManagedOtelRuntimeStatus.FailureCode.QUEUE_FULL, queueFull.failureCode());
        assertEquals(ManagedOtelRuntimeStatus.RuntimeState.RUNNING, queueFull.state());
        assertEquals(0, queueFull.restartCount());
        assertEquals(42, queueFull.pid());
        assertEquals(ManagedOtelRuntimeStatus.FailureCode.NONE, recovered.failureCode());
        assertEquals(0, recovered.restartCount());
        assertEquals(42, recovered.pid());
    }

    @Test
    void reportsQueueFullWhenOneSignalPipelineIsFullAndOtherPipelinesAreEmpty() {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        OtelRuntimeSupervisor supervisor = mock(OtelRuntimeSupervisor.class);
        when(supervisor.snapshot()).thenReturn(new OtelRuntimeSnapshot(
                OtelRuntimeState.RUNNING, 42, 0, Instant.parse("2026-07-15T06:00:00Z"), ""));
        when(supervisor.activeRevision()).thenReturn(1L);
        when(supervisor.sourceStatuses()).thenReturn(List.of());
        OtelRuntimeTelemetryClient telemetryClient = mock(OtelRuntimeTelemetryClient.class);
        when(telemetryClient.scrape(properties, false)).thenReturn(telemetryWithSignalQueues(
                2048, 0, 0, 2048, 2048, 2048));
        OtelRuntimeDiagnosticsReader diagnosticsReader = mock(OtelRuntimeDiagnosticsReader.class);
        when(diagnosticsReader.latestFailure(properties)).thenReturn(ManagedOtelRuntimeStatus.FailureCode.NONE);
        when(diagnosticsReader.sanitize("", properties)).thenReturn("");
        OtelRuntimeStatusProvider provider = new OtelRuntimeStatusProvider(
                properties, supervisor, telemetryClient, diagnosticsReader, new OtelRuntimeFailureClassifier());

        ManagedOtelRuntimeStatus status = provider.status();

        assertEquals(ManagedOtelRuntimeStatus.FailureCode.QUEUE_FULL, status.failureCode());
        assertEquals(ManagedOtelRuntimeStatus.RuntimeState.RUNNING, status.state());
        assertEquals(0, status.restartCount());
        assertEquals(42, status.pid());
    }

    @ParameterizedTest
    @MethodSource("lifecycleFailures")
    void convergesCurrentLifecycleDiagnosticsToStableFailureCode(
            OtelRuntimeState state, String diagnostic, ManagedOtelRuntimeStatus.FailureCode expected) {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        OtelRuntimeSupervisor supervisor = mock(OtelRuntimeSupervisor.class);
        when(supervisor.snapshot()).thenReturn(new OtelRuntimeSnapshot(
                state, -1, 2, Instant.parse("2026-07-15T06:00:00Z"), diagnostic));
        when(supervisor.activeRevision()).thenReturn(1L);
        when(supervisor.sourceStatuses()).thenReturn(List.of());
        OtelRuntimeDiagnosticsReader diagnosticsReader = mock(OtelRuntimeDiagnosticsReader.class);
        when(diagnosticsReader.sanitize(diagnostic, properties)).thenReturn("operational diagnostic");
        OtelRuntimeStatusProvider provider = new OtelRuntimeStatusProvider(
                properties,
                supervisor,
                mock(OtelRuntimeTelemetryClient.class),
                diagnosticsReader,
                new OtelRuntimeFailureClassifier());

        ManagedOtelRuntimeStatus status = provider.status();

        assertEquals(expected, status.failureCode());
        assertEquals(state.name(), status.state().name());
        assertEquals(ManagedOtelRuntimeStatus.ValueState.UNAVAILABLE,
                status.telemetry().queueSize().state());
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

    @Test
    void prefersLivePortConflictOverGenericReadinessFailure() {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        OtelRuntimeSupervisor supervisor = mock(OtelRuntimeSupervisor.class);
        when(supervisor.snapshot()).thenReturn(new OtelRuntimeSnapshot(
                OtelRuntimeState.DEGRADED, -1, 1, Instant.parse("2026-07-15T06:00:00Z"),
                "HertzBeat telemetry runtime did not become ready"));
        when(supervisor.activeRevision()).thenReturn(0L);
        when(supervisor.sourceStatuses()).thenReturn(List.of());
        OtelRuntimeDiagnosticsReader diagnosticsReader = mock(OtelRuntimeDiagnosticsReader.class);
        when(diagnosticsReader.latestFailure(properties))
                .thenReturn(ManagedOtelRuntimeStatus.FailureCode.PORT_CONFLICT);
        when(diagnosticsReader.sanitize(
                "HertzBeat telemetry runtime did not become ready", properties))
                .thenReturn("HertzBeat telemetry runtime did not become ready");
        OtelRuntimeStatusProvider provider = new OtelRuntimeStatusProvider(
                properties,
                supervisor,
                mock(OtelRuntimeTelemetryClient.class),
                diagnosticsReader,
                new OtelRuntimeFailureClassifier());

        ManagedOtelRuntimeStatus status = provider.status();

        assertEquals(ManagedOtelRuntimeStatus.FailureCode.PORT_CONFLICT, status.failureCode());
        assertEquals(ManagedOtelRuntimeStatus.RuntimeState.DEGRADED, status.state());
        assertEquals(-1, status.pid());
        assertEquals(1, status.restartCount());
    }

    private static Stream<Arguments> lifecycleFailures() {
        return Stream.of(
                Arguments.of(OtelRuntimeState.DEGRADED, "configuration validation failed",
                        ManagedOtelRuntimeStatus.FailureCode.CONFIGURATION_ERROR),
                Arguments.of(OtelRuntimeState.DEGRADED, "listen tcp: bind: address already in use",
                        ManagedOtelRuntimeStatus.FailureCode.PORT_CONFLICT),
                Arguments.of(OtelRuntimeState.FAILED, "runtime exited unexpectedly with code 137",
                        ManagedOtelRuntimeStatus.FailureCode.PROCESS_CRASH));
    }

    @Test
    void storageFullRequiresNewEnqueueFailureAndClearsWhenCounterStopsAdvancing() {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        OtelRuntimeSupervisor supervisor = mock(OtelRuntimeSupervisor.class);
        when(supervisor.snapshot()).thenReturn(new OtelRuntimeSnapshot(
                OtelRuntimeState.RUNNING, 42, 0, Instant.parse("2026-07-15T06:00:00Z"), ""));
        when(supervisor.activeRevision()).thenReturn(1L);
        when(supervisor.sourceStatuses()).thenReturn(List.of());
        OtelRuntimeTelemetryClient telemetryClient = mock(OtelRuntimeTelemetryClient.class);
        when(telemetryClient.scrape(properties, false)).thenReturn(
                telemetryWithEnqueueFailure(1), telemetryWithEnqueueFailure(1));
        OtelRuntimeDiagnosticsReader diagnosticsReader = mock(OtelRuntimeDiagnosticsReader.class);
        when(diagnosticsReader.latestFailure(properties))
                .thenReturn(ManagedOtelRuntimeStatus.FailureCode.STORAGE_FULL);
        OtelRuntimeStatusProvider provider = new OtelRuntimeStatusProvider(
                properties, supervisor, telemetryClient, diagnosticsReader, new OtelRuntimeFailureClassifier());

        ManagedOtelRuntimeStatus failed = provider.status();
        ManagedOtelRuntimeStatus recovered = provider.status();

        assertEquals(ManagedOtelRuntimeStatus.FailureCode.STORAGE_FULL, failed.failureCode());
        assertEquals(ManagedOtelRuntimeStatus.FailureCode.NONE, recovered.failureCode());
        assertEquals(42, recovered.pid());
        assertEquals(0, recovered.restartCount());
    }

    @Test
    void historicalCorruptionDiagnosticClearsAfterManualRuntimeRecovery() {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        OtelRuntimeSupervisor supervisor = mock(OtelRuntimeSupervisor.class);
        when(supervisor.snapshot()).thenReturn(
                new OtelRuntimeSnapshot(
                        OtelRuntimeState.FAILED, -1, 1, Instant.parse("2026-07-15T06:00:00Z"), ""),
                new OtelRuntimeSnapshot(
                        OtelRuntimeState.RUNNING, 43, 1, Instant.parse("2026-07-15T06:01:00Z"), ""));
        when(supervisor.activeRevision()).thenReturn(1L);
        when(supervisor.sourceStatuses()).thenReturn(List.of());
        OtelRuntimeTelemetryClient telemetryClient = mock(OtelRuntimeTelemetryClient.class);
        when(telemetryClient.scrape(properties, false)).thenReturn(telemetry(0, 6144, 0));
        OtelRuntimeDiagnosticsReader diagnosticsReader = mock(OtelRuntimeDiagnosticsReader.class);
        when(diagnosticsReader.latestFailure(properties))
                .thenReturn(ManagedOtelRuntimeStatus.FailureCode.STORAGE_CORRUPTED);
        OtelRuntimeStatusProvider provider = new OtelRuntimeStatusProvider(
                properties, supervisor, telemetryClient, diagnosticsReader, new OtelRuntimeFailureClassifier());

        ManagedOtelRuntimeStatus failed = provider.status();
        ManagedOtelRuntimeStatus recovered = provider.status();

        assertEquals(ManagedOtelRuntimeStatus.FailureCode.STORAGE_CORRUPTED, failed.failureCode());
        assertEquals(ManagedOtelRuntimeStatus.FailureCode.NONE, recovered.failureCode());
        assertEquals(43, recovered.pid());
    }

    private ManagedOtelRuntimeStatus.RuntimeTelemetry telemetry(
            long queueSize, long queueCapacity, long failedMetrics) {
        ManagedOtelRuntimeStatus.SignalCounters sendFailed = new ManagedOtelRuntimeStatus.SignalCounters(
                ManagedOtelRuntimeStatus.ObservedLong.available(failedMetrics),
                ManagedOtelRuntimeStatus.ObservedLong.unavailable(),
                ManagedOtelRuntimeStatus.ObservedLong.unavailable());
        return new ManagedOtelRuntimeStatus.RuntimeTelemetry(
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                sendFailed,
                ManagedOtelRuntimeStatus.ObservedLong.available(queueSize),
                ManagedOtelRuntimeStatus.ObservedLong.available(queueCapacity),
                ManagedOtelRuntimeStatus.FileConsumerStatus.notApplicable(),
                ManagedOtelRuntimeStatus.SignalGauges.unavailable(),
                ManagedOtelRuntimeStatus.SignalGauges.unavailable(),
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                sendFailed);
    }

    private ManagedOtelRuntimeStatus.RuntimeTelemetry exporterTelemetry(
            long queueSize, long failedMetrics, long sentMetrics) {
        ManagedOtelRuntimeStatus.SignalCounters sent = new ManagedOtelRuntimeStatus.SignalCounters(
                ManagedOtelRuntimeStatus.ObservedLong.available(sentMetrics),
                ManagedOtelRuntimeStatus.ObservedLong.unavailable(),
                ManagedOtelRuntimeStatus.ObservedLong.unavailable());
        ManagedOtelRuntimeStatus.SignalCounters sendFailed = new ManagedOtelRuntimeStatus.SignalCounters(
                ManagedOtelRuntimeStatus.ObservedLong.available(failedMetrics),
                ManagedOtelRuntimeStatus.ObservedLong.unavailable(),
                ManagedOtelRuntimeStatus.ObservedLong.unavailable());
        return new ManagedOtelRuntimeStatus.RuntimeTelemetry(
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                sent,
                sendFailed,
                ManagedOtelRuntimeStatus.ObservedLong.available(queueSize),
                ManagedOtelRuntimeStatus.ObservedLong.available(2048),
                ManagedOtelRuntimeStatus.FileConsumerStatus.notApplicable(),
                ManagedOtelRuntimeStatus.SignalGauges.unavailable(),
                ManagedOtelRuntimeStatus.SignalGauges.unavailable(),
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                sendFailed);
    }

    private ManagedOtelRuntimeStatus.RuntimeTelemetry telemetryWithEnqueueFailure(long enqueueFailures) {
        ManagedOtelRuntimeStatus.SignalCounters enqueueFailed = new ManagedOtelRuntimeStatus.SignalCounters(
                ManagedOtelRuntimeStatus.ObservedLong.available(enqueueFailures),
                ManagedOtelRuntimeStatus.ObservedLong.available(0),
                ManagedOtelRuntimeStatus.ObservedLong.available(0));
        ManagedOtelRuntimeStatus.SignalCounters sendFailed = new ManagedOtelRuntimeStatus.SignalCounters(
                ManagedOtelRuntimeStatus.ObservedLong.available(0),
                ManagedOtelRuntimeStatus.ObservedLong.available(0),
                ManagedOtelRuntimeStatus.ObservedLong.available(0));
        return new ManagedOtelRuntimeStatus.RuntimeTelemetry(
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                enqueueFailed,
                ManagedOtelRuntimeStatus.ObservedLong.available(1),
                ManagedOtelRuntimeStatus.ObservedLong.available(2048),
                ManagedOtelRuntimeStatus.FileConsumerStatus.notApplicable(),
                ManagedOtelRuntimeStatus.SignalGauges.unavailable(),
                ManagedOtelRuntimeStatus.SignalGauges.unavailable(),
                enqueueFailed,
                sendFailed);
    }

    private ManagedOtelRuntimeStatus.RuntimeTelemetry telemetryWithSignalQueues(
            long metricsSize, long logsSize, long tracesSize,
            long metricsCapacity, long logsCapacity, long tracesCapacity) {
        ManagedOtelRuntimeStatus.SignalGauges queueSizes = new ManagedOtelRuntimeStatus.SignalGauges(
                ManagedOtelRuntimeStatus.ObservedLong.available(metricsSize),
                ManagedOtelRuntimeStatus.ObservedLong.available(logsSize),
                ManagedOtelRuntimeStatus.ObservedLong.available(tracesSize));
        ManagedOtelRuntimeStatus.SignalGauges queueCapacities = new ManagedOtelRuntimeStatus.SignalGauges(
                ManagedOtelRuntimeStatus.ObservedLong.available(metricsCapacity),
                ManagedOtelRuntimeStatus.ObservedLong.available(logsCapacity),
                ManagedOtelRuntimeStatus.ObservedLong.available(tracesCapacity));
        return new ManagedOtelRuntimeStatus.RuntimeTelemetry(
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                ManagedOtelRuntimeStatus.ObservedLong.available(metricsSize + logsSize + tracesSize),
                ManagedOtelRuntimeStatus.ObservedLong.available(metricsCapacity + logsCapacity + tracesCapacity),
                ManagedOtelRuntimeStatus.FileConsumerStatus.notApplicable(),
                queueSizes,
                queueCapacities,
                ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                ManagedOtelRuntimeStatus.SignalCounters.unavailable());
    }
}
