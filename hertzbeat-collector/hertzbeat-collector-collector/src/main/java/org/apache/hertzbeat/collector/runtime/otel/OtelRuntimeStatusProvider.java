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
                properties.isEnabled() ? supervisor.sourceStatuses() : List.of();
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
        if (supervisorFailure != FailureCode.NONE && supervisorFailure != FailureCode.UNKNOWN) {
            return supervisorFailure;
        }
        FailureCode diagnosticFailure = diagnosticsReader.latestFailure(properties);
        if (diagnosticFailure == FailureCode.AUTHENTICATION_FAILED && positive(telemetry.queueSize())) {
            return diagnosticFailure;
        }
        if (queueFull(telemetry)) {
            return FailureCode.QUEUE_FULL;
        }
        if (positive(telemetry.queueSize())
                && (failed(telemetry) || diagnosticFailure == FailureCode.BACKEND_UNAVAILABLE)) {
            return FailureCode.BACKEND_UNAVAILABLE;
        }
        // Historical startup failures can remain in the bounded log tail after recovery. Only
        // current lifecycle diagnostics or exporter failures corroborated by live telemetry apply.
        return supervisorFailure;
    }

    private boolean queueFull(RuntimeTelemetry telemetry) {
        return available(telemetry.queueSize())
                && available(telemetry.queueCapacity())
                && telemetry.queueCapacity().value() > 0
                && telemetry.queueSize().value() >= telemetry.queueCapacity().value();
    }

    private boolean failed(RuntimeTelemetry telemetry) {
        return positive(telemetry.failed().metrics())
                || positive(telemetry.failed().logs())
                || positive(telemetry.failed().traces());
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
