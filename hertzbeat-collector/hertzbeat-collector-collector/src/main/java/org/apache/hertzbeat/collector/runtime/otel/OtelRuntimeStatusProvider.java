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

import java.util.List;
import org.apache.hertzbeat.collector.dispatch.CollectorRuntimeStatusProvider;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.FailureCode;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.ObservedLong;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.RuntimeTelemetry;

/**
 * Adapts the local supervisor snapshot to the versioned Collector control-plane contract.
 */
public class OtelRuntimeStatusProvider implements CollectorRuntimeStatusProvider {

    private final OtelRuntimeProperties properties;
    private final OtelRuntimeSupervisor supervisor;
    private final OtelRuntimeTelemetryClient telemetryClient;
    private final OtelRuntimeDiagnosticsReader diagnosticsReader;
    private final OtelRuntimeFailureClassifier failureClassifier;
    private long telemetryPid = -1;
    private long enqueueFailedMetrics;
    private long enqueueFailedLogs;
    private long enqueueFailedTraces;

    public OtelRuntimeStatusProvider(
            OtelRuntimeProperties properties,
            OtelRuntimeSupervisor supervisor,
            OtelRuntimeTelemetryClient telemetryClient,
            OtelRuntimeDiagnosticsReader diagnosticsReader,
            OtelRuntimeFailureClassifier failureClassifier) {
        this.properties = properties;
        this.supervisor = supervisor;
        this.telemetryClient = telemetryClient;
        this.diagnosticsReader = diagnosticsReader;
        this.failureClassifier = failureClassifier;
    }

    @Override
    public ManagedOtelRuntimeStatus status() {
        OtelRuntimeSnapshot snapshot = supervisor.snapshot();
        List<ManagedOtelRuntimeStatus.ManagedOtelSourceStatus> sources =
                properties.isEnabled() ? sanitize(supervisor.sourceStatuses()) : List.of();
        RuntimeTelemetry telemetry = telemetry(snapshot, sources);
        FailureCode failureCode = failureCode(snapshot, telemetry);
        return new ManagedOtelRuntimeStatus(
                ManagedOtelRuntimeStatus.CURRENT_SCHEMA_VERSION,
                properties.isEnabled(),
                ManagedOtelRuntimeStatus.RuntimeState.valueOf(snapshot.state().name()),
                properties.desiredConfig().revision(),
                supervisor.activeRevision(),
                snapshot.pid(),
                credentialState(),
                snapshot.restartCount(),
                snapshot.changedAt(),
                diagnosticsReader.sanitize(snapshot.lastError(), properties),
                failureCode,
                telemetry,
                sources
        );
    }

    private List<ManagedOtelRuntimeStatus.ManagedOtelSourceStatus> sanitize(
            List<ManagedOtelRuntimeStatus.ManagedOtelSourceStatus> sources) {
        return sources.stream()
                .map(source -> new ManagedOtelRuntimeStatus.ManagedOtelSourceStatus(
                        source.type(),
                        source.name(),
                        source.revision(),
                        source.state(),
                        diagnosticsReader.sanitize(source.lastError(), properties)))
                .toList();
    }

    private RuntimeTelemetry telemetry(
            OtelRuntimeSnapshot snapshot, List<ManagedOtelRuntimeStatus.ManagedOtelSourceStatus> sources) {
        boolean fileConsumerConfigured = sources.stream()
                .anyMatch(source -> source.type() == ManagedOtelRuntimeStatus.SourceType.FILE_LOG);
        if (!properties.isEnabled() || snapshot.state() != OtelRuntimeState.RUNNING) {
            return RuntimeTelemetry.unavailable(fileConsumerConfigured);
        }
        return telemetryClient.scrape(properties, fileConsumerConfigured);
    }

    private FailureCode failureCode(OtelRuntimeSnapshot snapshot, RuntimeTelemetry telemetry) {
        FailureCode supervisorFailure = failureClassifier.classify(snapshot.lastError());
        FailureCode diagnosticFailure = diagnosticsReader.latestFailure(properties);
        boolean enqueueFailureAdvanced = enqueueFailureAdvanced(snapshot.pid(), telemetry.enqueueFailed());
        if (diagnosticFailure == FailureCode.STORAGE_CORRUPTED
                && snapshot.state() != OtelRuntimeState.RUNNING) {
            return diagnosticFailure;
        }
        if (supervisorFailure != FailureCode.NONE && supervisorFailure != FailureCode.UNKNOWN) {
            return supervisorFailure;
        }
        if (diagnosticFailure == FailureCode.AUTHENTICATION_FAILED && positive(telemetry.queueSize())) {
            return diagnosticFailure;
        }
        if (queueFull(telemetry)) {
            return FailureCode.QUEUE_FULL;
        }
        if (diagnosticFailure == FailureCode.STORAGE_FULL && enqueueFailureAdvanced) {
            return FailureCode.STORAGE_FULL;
        }
        if (positive(telemetry.queueSize())
                && (failed(telemetry) || diagnosticFailure == FailureCode.BACKEND_UNAVAILABLE)) {
            return FailureCode.BACKEND_UNAVAILABLE;
        }
        // Historical startup failures can remain in the bounded log tail after recovery. Only
        // current lifecycle diagnostics or exporter failures corroborated by live telemetry apply.
        return supervisorFailure;
    }

    private synchronized boolean enqueueFailureAdvanced(
            long pid, ManagedOtelRuntimeStatus.SignalCounters current) {
        if (pid != telemetryPid) {
            telemetryPid = pid;
            enqueueFailedMetrics = 0;
            enqueueFailedLogs = 0;
            enqueueFailedTraces = 0;
        }
        boolean advanced = advanced(current.metrics(), enqueueFailedMetrics)
                || advanced(current.logs(), enqueueFailedLogs)
                || advanced(current.traces(), enqueueFailedTraces);
        enqueueFailedMetrics = observedOrPrevious(current.metrics(), enqueueFailedMetrics);
        enqueueFailedLogs = observedOrPrevious(current.logs(), enqueueFailedLogs);
        enqueueFailedTraces = observedOrPrevious(current.traces(), enqueueFailedTraces);
        return advanced;
    }

    private boolean advanced(ObservedLong current, long previous) {
        return available(current) && current.value() > previous;
    }

    private long observedOrPrevious(ObservedLong current, long previous) {
        return available(current) ? current.value() : previous;
    }

    private boolean queueFull(RuntimeTelemetry telemetry) {
        ManagedOtelRuntimeStatus.SignalGauges sizes = telemetry.queueSizeBySignal();
        ManagedOtelRuntimeStatus.SignalGauges capacities = telemetry.queueCapacityBySignal();
        boolean perSignalAvailable = queueGaugeAvailable(sizes.metrics(), capacities.metrics())
                || queueGaugeAvailable(sizes.logs(), capacities.logs())
                || queueGaugeAvailable(sizes.traces(), capacities.traces());
        if (perSignalAvailable) {
            return queueGaugeFull(sizes.metrics(), capacities.metrics())
                    || queueGaugeFull(sizes.logs(), capacities.logs())
                    || queueGaugeFull(sizes.traces(), capacities.traces());
        }
        return available(telemetry.queueSize())
                && available(telemetry.queueCapacity())
                && telemetry.queueCapacity().value() > 0
                && telemetry.queueSize().value() >= telemetry.queueCapacity().value();
    }

    private boolean queueGaugeAvailable(ObservedLong size, ObservedLong capacity) {
        return available(size) && available(capacity);
    }

    private boolean queueGaugeFull(ObservedLong size, ObservedLong capacity) {
        return queueGaugeAvailable(size, capacity)
                && capacity.value() > 0
                && size.value() >= capacity.value();
    }

    private boolean failed(RuntimeTelemetry telemetry) {
        return positive(telemetry.sendFailed().metrics())
                || positive(telemetry.sendFailed().logs())
                || positive(telemetry.sendFailed().traces());
    }

    private boolean positive(ObservedLong value) {
        return available(value) && value.value() > 0;
    }

    private boolean available(ObservedLong value) {
        return value.state() == ManagedOtelRuntimeStatus.ValueState.AVAILABLE;
    }

    private ManagedOtelRuntimeStatus.IntakeCredentialState credentialState() {
        if (!properties.isEnabled()) {
            return ManagedOtelRuntimeStatus.IntakeCredentialState.NOT_REQUIRED;
        }
        if (properties.getToken() == null || properties.getToken().isBlank()) {
            return ManagedOtelRuntimeStatus.IntakeCredentialState.MISSING;
        }
        return ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED;
    }
}
