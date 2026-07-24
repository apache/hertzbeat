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

package org.apache.hertzbeat.observability.instrumentation.v2.service;

import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DETECTION_POLL_AFTER_MS;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.function.LongSupplier;
import java.util.regex.Pattern;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Capability;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionErrorCode;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationCollectorReadinessStore;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationCollectorReadinessStore.CollectorReadiness;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationCollectorReadinessStore.ReadinessState;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.DetectionCriteria;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.DetectionSnapshot;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.SignalObservation;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.RecipeOption;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionContext;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionRequest;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionResponse;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionStatus;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.PollingDecision;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.PollingInstruction;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.QueryJump;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.QueryJumpContext;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.SignalDetection;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeProfile;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationV2RequestException;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationV2RequestException.ErrorCode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/** V2 detection orchestration over scoped storage and Collector readiness ports. */
@Service
public class InstrumentationDetectionV2Service {

    private static final long WINDOW_MS = 120_000L;
    private static final Pattern RESOURCE_VALUE = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._/-]{0,127}");
    private final InstrumentationCatalogV2Service catalogService;
    private final InstrumentationIntakeProfileV2Service profileService;
    private final InstrumentationSignalDetectionStore detectionStore;
    private final InstrumentationCollectorReadinessStore readinessStore;
    private final LongSupplier clock;

    @Autowired
    public InstrumentationDetectionV2Service(
            InstrumentationCatalogV2Service catalogService,
            InstrumentationIntakeProfileV2Service profileService,
            InstrumentationSignalDetectionStore detectionStore,
            InstrumentationCollectorReadinessStore readinessStore) {
        this(catalogService, profileService, detectionStore, readinessStore, System::currentTimeMillis);
    }

    InstrumentationDetectionV2Service(
            InstrumentationCatalogV2Service catalogService,
            InstrumentationIntakeProfileV2Service profileService,
            InstrumentationSignalDetectionStore detectionStore,
            LongSupplier clock) {
        this(catalogService, profileService, detectionStore, ignored -> CollectorReadiness.unknown(), clock);
    }

    InstrumentationDetectionV2Service(
            InstrumentationCatalogV2Service catalogService,
            InstrumentationIntakeProfileV2Service profileService,
            InstrumentationSignalDetectionStore detectionStore,
            InstrumentationCollectorReadinessStore readinessStore,
            LongSupplier clock) {
        this.catalogService = catalogService;
        this.profileService = profileService;
        this.detectionStore = detectionStore;
        this.readinessStore = readinessStore;
        this.clock = clock;
    }

    public DetectionResponse detect(DetectionRequest request) {
        requireRequest(request);
        RecipeOption recipe = requireRecipe(request);
        IntakeProfile profile = profileService.requireAvailable(request.intakeProfileId());
        ServiceIdentity service = request.service();
        String collectorId = profile.kind() == IntakeKind.HERTZBEAT_COLLECTOR ? profile.collectorId() : null;
        long detectedAt = clock.getAsLong();
        long windowEndAt = windowEnd(request.startedAt(), detectedAt);
        DetectionCriteria criteria = criteria(service, collectorId, request.startedAt(), detectedAt, windowEndAt);
        DetectionSnapshot snapshot = safeDetect(criteria);
        CollectorReadiness readiness = profile.kind() == IntakeKind.HERTZBEAT_COLLECTOR
                ? safeReadiness(collectorId)
                : CollectorReadiness.unknown();
        EnumMap<Signal, SignalDetection> signals = signals(recipe, snapshot, readiness, criteria);
        QueryJumpContext jumpContext = new QueryJumpContext(
                service.name(),
                service.namespace(),
                service.environment(),
                profile.id(),
                collectorId,
                service.serviceInstanceId(),
                service.endpoint(),
                request.startedAt(),
                detectedAt);
        return new DetectionResponse(
                2,
                detectedAt,
                new DetectionContext(
                        request.sourceKind(),
                        recipe.id(),
                        request.language(),
                        request.framework(),
                        request.method(),
                        request.environment(),
                        request.platform(),
                        service,
                        profile.id(),
                        collectorId,
                        request.startedAt(),
                        windowEndAt),
                signals,
                polling(signals, windowEndAt, detectedAt),
                jumpContext,
                List.of(
                        jump(Signal.METRICS, signals, jumpContext),
                        jump(Signal.LOGS, signals, jumpContext),
                        jump(Signal.TRACES, signals, jumpContext)));
    }

    private long windowEnd(long startedAt, long detectedAt) {
        if (startedAt <= 0 || startedAt > detectedAt) {
            throw new InstrumentationV2RequestException(ErrorCode.CONTEXT_INVALID);
        }
        try {
            return Math.addExact(startedAt, WINDOW_MS);
        } catch (ArithmeticException exception) {
            throw new InstrumentationV2RequestException(ErrorCode.CONTEXT_INVALID);
        }
    }

    private DetectionCriteria criteria(
            ServiceIdentity service, String collectorId, long startedAt, long detectedAt, long windowEndAt) {
        return new DetectionCriteria(
                service.name(),
                service.namespace(),
                service.environment(),
                collectorId,
                service.serviceInstanceId(),
                service.endpoint(),
                startedAt,
                Math.min(detectedAt, windowEndAt));
    }

    private EnumMap<Signal, SignalDetection> signals(
            RecipeOption recipe,
            DetectionSnapshot snapshot,
            CollectorReadiness readiness,
            DetectionCriteria criteria) {
        EnumMap<Signal, SignalDetection> signals = new EnumMap<>(Signal.class);
        for (Signal signal : Signal.values()) {
            signals.put(signal, detection(recipe, signal, snapshot.observation(signal), readiness, criteria));
        }
        return signals;
    }

    private SignalDetection detection(
            RecipeOption recipe,
            Signal signal,
            SignalObservation observation,
            CollectorReadiness readiness,
            DetectionCriteria criteria) {
        if (recipe.signals().capability(signal) == Capability.UNSUPPORTED) {
            return new SignalDetection(
                    DetectionStatus.UNSUPPORTED, null, DetectionErrorCode.SIGNAL_NOT_SUPPORTED);
        }
        if (observation == null) {
            return new SignalDetection(DetectionStatus.UNAVAILABLE, null, DetectionErrorCode.STORAGE_UNAVAILABLE);
        }
        SignalDetection detection = switch (observation.status()) {
            case WAITING -> waiting();
            case RECEIVED -> received(observation, criteria);
            case UNAVAILABLE -> new SignalDetection(
                    DetectionStatus.UNAVAILABLE, null, safeError(observation.errorCode(), false));
            case ERROR -> new SignalDetection(
                    DetectionStatus.ERROR,
                    safeTimestamp(observation.lastReceivedAt(), criteria),
                    safeError(observation.errorCode(), true));
            default -> new SignalDetection(
                    DetectionStatus.ERROR, null, DetectionErrorCode.STORAGE_QUERY_FAILED);
        };
        return applyReadiness(detection, readiness);
    }

    private SignalDetection received(SignalObservation observation, DetectionCriteria criteria) {
        return observation.lastReceivedAt() != null
                && observation.lastReceivedAt() >= criteria.startedAt()
                && observation.lastReceivedAt() <= criteria.detectedAt()
                ? new SignalDetection(DetectionStatus.RECEIVED, observation.lastReceivedAt(), null)
                : waiting();
    }

    private SignalDetection waiting() {
        return new SignalDetection(DetectionStatus.WAITING, null, DetectionErrorCode.SIGNAL_NOT_RECEIVED);
    }

    private SignalDetection applyReadiness(SignalDetection detection, CollectorReadiness readiness) {
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

    private PollingInstruction polling(
            Map<Signal, SignalDetection> signals, long deadlineAt, long detectedAt) {
        List<DetectionStatus> statuses = signals.values().stream().map(SignalDetection::status).toList();
        if (statuses.stream().anyMatch(
                status -> status == DetectionStatus.ERROR || status == DetectionStatus.UNAVAILABLE)) {
            return new PollingInstruction(PollingDecision.MANUAL_RETRY, null, deadlineAt);
        }
        if (statuses.contains(DetectionStatus.WAITING)) {
            return detectedAt < deadlineAt
                    ? new PollingInstruction(PollingDecision.CONTINUE_POLLING, DETECTION_POLL_AFTER_MS, deadlineAt)
                    : new PollingInstruction(PollingDecision.MANUAL_RETRY, null, deadlineAt);
        }
        return new PollingInstruction(PollingDecision.COMPLETE, null, deadlineAt);
    }

    private QueryJump jump(
            Signal signal, Map<Signal, SignalDetection> signals, QueryJumpContext context) {
        return new QueryJump(signal, signals.get(signal).status() == DetectionStatus.RECEIVED, context);
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

    private DetectionSnapshot unavailableSnapshot() {
        EnumMap<Signal, SignalObservation> observations = new EnumMap<>(Signal.class);
        for (Signal signal : Signal.values()) {
            observations.put(signal, SignalObservation.unavailable(DetectionErrorCode.STORAGE_UNAVAILABLE));
        }
        return new DetectionSnapshot(observations);
    }

    private DetectionSnapshot errorSnapshot() {
        EnumMap<Signal, SignalObservation> observations = new EnumMap<>(Signal.class);
        for (Signal signal : Signal.values()) {
            observations.put(signal, SignalObservation.error(DetectionErrorCode.STORAGE_QUERY_FAILED, null));
        }
        return new DetectionSnapshot(observations);
    }

    private DetectionErrorCode safeError(DetectionErrorCode errorCode, boolean error) {
        if (errorCode == DetectionErrorCode.STORAGE_UNAVAILABLE
                || errorCode == DetectionErrorCode.STORAGE_QUERY_FAILED
                || errorCode == DetectionErrorCode.AUTHENTICATION_FAILED
                || errorCode == DetectionErrorCode.COLLECTOR_UNAVAILABLE) {
            return errorCode;
        }
        return error ? DetectionErrorCode.STORAGE_QUERY_FAILED : DetectionErrorCode.STORAGE_UNAVAILABLE;
    }

    private Long safeTimestamp(Long timestamp, DetectionCriteria criteria) {
        return timestamp != null && timestamp >= criteria.startedAt() && timestamp <= criteria.detectedAt()
                ? timestamp
                : null;
    }

    private RecipeOption requireRecipe(DetectionRequest request) {
        if (request.recipeId() != null) {
            RecipeOption recipe = catalogService.requireRecipe(request.sourceKind(), request.recipeId());
            requireRuntimeSelection(request, recipe);
            return recipe;
        }
        if (request.sourceKind() != SourceKind.APPLICATION) {
            throw new InstrumentationV2RequestException(ErrorCode.SELECTION_INVALID);
        }
        RecipeOption recipe = catalogService.catalog().recipes().stream()
                .filter(candidate -> candidate.kind() == SourceKind.APPLICATION
                        && candidate.language() == request.language()
                        && candidate.framework() == request.framework()
                        && candidate.method() == request.method())
                .findFirst()
                .orElseThrow(() -> new InstrumentationV2RequestException(ErrorCode.SELECTION_INVALID));
        requireRuntimeSelection(request, recipe);
        return recipe;
    }

    private void requireRuntimeSelection(DetectionRequest request, RecipeOption recipe) {
        if (request.environment() != null && !recipe.environments().contains(request.environment())
                || request.platform() != null && !recipe.platforms().contains(request.platform())
                && !recipe.platforms().contains(
                        org.apache.hertzbeat.observability.instrumentation.api
                                .InstrumentationApiContract.Platform.ANY)
                || request.sourceKind() == SourceKind.APPLICATION
                && (request.language() != recipe.language()
                || request.framework() != recipe.framework()
                || request.method() != recipe.method()
                || request.environment() == null
                || request.platform() == null)) {
            throw new InstrumentationV2RequestException(ErrorCode.SELECTION_INVALID);
        }
    }

    private void requireRequest(DetectionRequest request) {
        if (request == null || request.schemaVersion() != 2) {
            throw new InstrumentationV2RequestException(ErrorCode.SCHEMA_UNSUPPORTED);
        }
        if (request.sourceKind() == null || request.service() == null
                || !safeResource(request.service().name()) || !safeResource(request.service().namespace())
                || !safeResource(request.service().environment())) {
            throw new InstrumentationV2RequestException(ErrorCode.CONTEXT_INVALID);
        }
    }

    private boolean safeResource(String value) {
        return value != null && RESOURCE_VALUE.matcher(value).matches();
    }
}
