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

package org.apache.hertzbeat.observability.instrumentation.service;

import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SCHEMA_VERSION;
import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DETECTION_AUTOMATIC_WINDOW_MS;
import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DETECTION_POLL_AFTER_MS;

import java.util.List;
import java.util.function.LongSupplier;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Capability;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionContext;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionErrorCode;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionRequest;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionResponse;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionStatus;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.MethodOption;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.PollingDecision;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.PollingInstruction;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.QueryJump;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.QueryJumpContext;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.RequestErrorCode;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SignalDetection;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SignalDetections;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationRequestException;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationCollectorReadinessStore;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationCollectorReadinessStore.CollectorReadiness;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationCollectorReadinessStore.ReadinessState;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.DetectionCriteria;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.DetectionSnapshot;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.SignalObservation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Maps storage-neutral observations onto the fixed onboarding detection contract.
 */
@Service
public class InstrumentationDetectionService {

    private final InstrumentationCatalogService catalogService;
    private final InstrumentationSignalDetectionStore detectionStore;
    private final InstrumentationCollectorReadinessStore readinessStore;
    private final LongSupplier clock;

    @Autowired
    public InstrumentationDetectionService(
            InstrumentationCatalogService catalogService,
            InstrumentationSignalDetectionStore detectionStore,
            InstrumentationCollectorReadinessStore readinessStore) {
        this(catalogService, detectionStore, readinessStore, System::currentTimeMillis);
    }

    public InstrumentationDetectionService(
            InstrumentationCatalogService catalogService,
            InstrumentationSignalDetectionStore detectionStore) {
        this(catalogService, detectionStore, ignored -> CollectorReadiness.unknown(), System::currentTimeMillis);
    }

    InstrumentationDetectionService(
            InstrumentationCatalogService catalogService,
            InstrumentationSignalDetectionStore detectionStore,
            LongSupplier clock) {
        this(catalogService, detectionStore, ignored -> CollectorReadiness.unknown(), clock);
    }

    InstrumentationDetectionService(
            InstrumentationCatalogService catalogService,
            InstrumentationSignalDetectionStore detectionStore,
            InstrumentationCollectorReadinessStore readinessStore,
            LongSupplier clock) {
        this.catalogService = catalogService;
        this.detectionStore = detectionStore;
        this.readinessStore = readinessStore;
        this.clock = clock;
    }

    public DetectionResponse detect(DetectionRequest request) {
        long detectedAt = clock.getAsLong();
        requireRequest(request, detectedAt);
        MethodOption method = catalogService.requireMethod(request.language(), request.framework(), request.method());
        if (!method.environments().contains(request.environment())
                || !method.platforms().contains(request.platform())
                && !method.platforms().contains(
                        org.apache.hertzbeat.observability.instrumentation.api
                                .InstrumentationApiContract.Platform.ANY)) {
            throw new InstrumentationRequestException(RequestErrorCode.SELECTION_INVALID);
        }
        DetectionCriteria criteria = new DetectionCriteria(
                request.service().name(),
                request.service().namespace(),
                request.service().environment(),
                request.collectorId(),
                request.service().serviceInstanceId(),
                request.service().endpoint(),
                request.startedAt(),
                detectedAt);
        DetectionSnapshot snapshot = safeDetect(criteria);
        CollectorReadiness readiness = safeReadiness(request.collectorId());
        SignalDetection metrics = signal(method, snapshot, readiness, Signal.METRICS, request.startedAt());
        SignalDetection logs = signal(method, snapshot, readiness, Signal.LOGS, request.startedAt());
        SignalDetection traces = signal(method, snapshot, readiness, Signal.TRACES, request.startedAt());
        SignalDetections signals = new SignalDetections(metrics, logs, traces);
        PollingInstruction polling = polling(signals, request.startedAt(), detectedAt);
        QueryJumpContext jumpContext = new QueryJumpContext(
                request.service().name(),
                request.service().namespace(),
                request.service().environment(),
                request.collectorId(),
                request.service().serviceInstanceId(),
                request.service().endpoint(),
                request.startedAt(),
                detectedAt);
        return new DetectionResponse(
                SCHEMA_VERSION,
                detectedAt,
                new DetectionContext(
                        request.language(),
                        request.framework(),
                        request.method(),
                        request.environment(),
                        request.platform(),
                        request.service(),
                        request.collectorId(),
                        request.startedAt()),
                signals,
                polling,
                jumpContext,
                List.of(
                        queryJump(Signal.METRICS, metrics, jumpContext),
                        queryJump(Signal.LOGS, logs, jumpContext),
                        queryJump(Signal.TRACES, traces, jumpContext)));
    }

    private PollingInstruction polling(SignalDetections signals, long startedAt, long detectedAt) {
        long deadlineAt = startedAt + DETECTION_AUTOMATIC_WINDOW_MS;
        List<DetectionStatus> statuses = List.of(
                signals.metrics().status(), signals.logs().status(), signals.traces().status());
        if (statuses.stream().anyMatch(
                status -> status == DetectionStatus.UNAVAILABLE || status == DetectionStatus.ERROR)) {
            return new PollingInstruction(PollingDecision.MANUAL_RETRY, null, deadlineAt);
        }
        if (statuses.contains(DetectionStatus.WAITING)) {
            return detectedAt < deadlineAt
                    ? new PollingInstruction(PollingDecision.CONTINUE_POLLING, DETECTION_POLL_AFTER_MS, deadlineAt)
                    : new PollingInstruction(PollingDecision.MANUAL_RETRY, null, deadlineAt);
        }
        return new PollingInstruction(PollingDecision.COMPLETE, null, deadlineAt);
    }

    private QueryJump queryJump(Signal signal, SignalDetection detection, QueryJumpContext context) {
        return new QueryJump(signal, detection.status() == DetectionStatus.RECEIVED, context);
    }

    private DetectionSnapshot safeDetect(DetectionCriteria criteria) {
        try {
            DetectionSnapshot snapshot = detectionStore.detect(criteria);
            return snapshot == null ? unavailableSnapshot() : snapshot;
        } catch (RuntimeException exception) {
            return errorSnapshot();
        }
    }

    private CollectorReadiness safeReadiness(String collectorId) {
        try {
            CollectorReadiness readiness = readinessStore.readiness(collectorId);
            return readiness == null ? CollectorReadiness.unknown() : readiness;
        } catch (RuntimeException exception) {
            return CollectorReadiness.unknown();
        }
    }

    private SignalDetection signal(
            MethodOption method,
            DetectionSnapshot snapshot,
            CollectorReadiness readiness,
            Signal signal,
            long startedAt) {
        Capability capability = method.signals().capability(signal);
        if (capability == Capability.UNSUPPORTED) {
            return new SignalDetection(
                    DetectionStatus.UNSUPPORTED, null, DetectionErrorCode.SIGNAL_NOT_SUPPORTED);
        }
        SignalObservation observation = snapshot.observation(signal);
        if (observation == null) {
            return new SignalDetection(
                    DetectionStatus.UNAVAILABLE, null, DetectionErrorCode.STORAGE_UNAVAILABLE);
        }
        SignalDetection detection = observation.status() == DetectionStatus.RECEIVED
                        && (observation.lastReceivedAt() == null || observation.lastReceivedAt() < startedAt)
                ? new SignalDetection(
                        DetectionStatus.WAITING, null, DetectionErrorCode.SIGNAL_NOT_RECEIVED)
                : new SignalDetection(
                        observation.status(), observation.lastReceivedAt(), observation.errorCode());
        if (detection.status() != DetectionStatus.WAITING) {
            return detection;
        }
        if (readiness.state() == ReadinessState.UNAVAILABLE) {
            return new SignalDetection(
                    DetectionStatus.UNAVAILABLE, null, DetectionErrorCode.COLLECTOR_UNAVAILABLE);
        }
        if (readiness.state() == ReadinessState.AUTHENTICATION_FAILED) {
            return new SignalDetection(
                    DetectionStatus.ERROR, null, DetectionErrorCode.AUTHENTICATION_FAILED);
        }
        return detection;
    }

    private DetectionSnapshot unavailableSnapshot() {
        java.util.EnumMap<Signal, SignalObservation> observations = new java.util.EnumMap<>(Signal.class);
        for (Signal signal : Signal.values()) {
            observations.put(signal, SignalObservation.unavailable(DetectionErrorCode.STORAGE_UNAVAILABLE));
        }
        return new DetectionSnapshot(observations);
    }

    private DetectionSnapshot errorSnapshot() {
        java.util.EnumMap<Signal, SignalObservation> observations = new java.util.EnumMap<>(Signal.class);
        for (Signal signal : Signal.values()) {
            observations.put(signal, SignalObservation.error(DetectionErrorCode.STORAGE_QUERY_FAILED, null));
        }
        return new DetectionSnapshot(observations);
    }

    private void requireRequest(DetectionRequest request, long detectedAt) {
        if (request == null || request.schemaVersion() != SCHEMA_VERSION) {
            throw new InstrumentationRequestException(RequestErrorCode.SCHEMA_UNSUPPORTED);
        }
        if (request.language() == null || request.framework() == null || request.method() == null
                || request.environment() == null || request.platform() == null) {
            throw new InstrumentationRequestException(RequestErrorCode.SELECTION_INVALID);
        }
        requireService(request.service());
        requireSafeValue(request.collectorId(), "Collector ID");
        if (request.startedAt() <= 0 || request.startedAt() > detectedAt + 60_000) {
            throw new InstrumentationRequestException(RequestErrorCode.CONTEXT_INVALID);
        }
    }

    private void requireService(ServiceIdentity service) {
        if (service == null) {
            throw new InstrumentationRequestException(RequestErrorCode.CONTEXT_INVALID);
        }
        requireSafeValue(service.name(), "Service name");
        requireSafeValue(service.namespace(), "Service namespace");
        requireSafeValue(service.environment(), "Deployment environment");
    }

    private void requireSafeValue(String value, String label) {
        if (value == null || !value.matches("[A-Za-z0-9][A-Za-z0-9._/-]{0,127}")) {
            throw new InstrumentationRequestException(RequestErrorCode.CONTEXT_INVALID);
        }
    }
}
