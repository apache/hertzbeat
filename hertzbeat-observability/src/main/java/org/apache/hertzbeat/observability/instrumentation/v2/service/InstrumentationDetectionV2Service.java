/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.instrumentation.v2.service;

import java.util.EnumMap;
import java.util.Map;
import java.util.function.LongSupplier;
import java.util.regex.Pattern;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Capability;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionErrorCode;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal;
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
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.SignalDetection;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeProfile;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationV2RequestException;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationV2RequestException.ErrorCode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/** V2 detection orchestration over the existing fully scoped storage adapter. */
@Service
public class InstrumentationDetectionV2Service {

    private static final long WINDOW_MS = 120_000L;
    private static final Pattern RESOURCE_VALUE = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._/-]{0,127}");
    private final InstrumentationCatalogV2Service catalogService;
    private final InstrumentationIntakeProfileV2Service profileService;
    private final InstrumentationSignalDetectionStore detectionStore;
    private final LongSupplier clock;

    @Autowired
    public InstrumentationDetectionV2Service(
            InstrumentationCatalogV2Service catalogService,
            InstrumentationIntakeProfileV2Service profileService,
            InstrumentationSignalDetectionStore detectionStore) {
        this(catalogService, profileService, detectionStore, System::currentTimeMillis);
    }

    InstrumentationDetectionV2Service(
            InstrumentationCatalogV2Service catalogService,
            InstrumentationIntakeProfileV2Service profileService,
            InstrumentationSignalDetectionStore detectionStore,
            LongSupplier clock) {
        this.catalogService = catalogService;
        this.profileService = profileService;
        this.detectionStore = detectionStore;
        this.clock = clock;
    }

    public DetectionResponse detect(DetectionRequest request) {
        requireRequest(request);
        RecipeOption recipe = requireRecipe(request);
        IntakeProfile profile = profileService.requireAvailable(request.intakeProfileId());
        ServiceIdentity service = request.service();
        String collectorId = profile.kind() == IntakeKind.HERTZBEAT_COLLECTOR ? profile.collectorId() : null;
        long detectedAt = clock.getAsLong();
        if (request.startedAt() <= 0 || request.startedAt() > detectedAt) {
            throw new InstrumentationV2RequestException(ErrorCode.CONTEXT_INVALID);
        }
        long windowEndAt;
        try {
            windowEndAt = Math.addExact(request.startedAt(), WINDOW_MS);
        } catch (ArithmeticException exception) {
            throw new InstrumentationV2RequestException(ErrorCode.CONTEXT_INVALID);
        }
        DetectionCriteria criteria = new DetectionCriteria(
                service.name(),
                service.namespace(),
                service.environment(),
                collectorId,
                service.serviceInstanceId(),
                service.endpoint(),
                request.startedAt(),
                Math.min(detectedAt, windowEndAt));
        DetectionSnapshot snapshot;
        try {
            snapshot = detectionStore.detect(criteria);
        } catch (RuntimeException exception) {
            snapshot = new DetectionSnapshot(Map.of());
        }
        EnumMap<Signal, SignalDetection> signals = new EnumMap<>(Signal.class);
        for (Signal signal : Signal.values()) {
            signals.put(signal, detection(recipe, signal, snapshot.observation(signal), criteria));
        }
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
                signals);
    }

    private SignalDetection detection(
            RecipeOption recipe, Signal signal, SignalObservation observation, DetectionCriteria criteria) {
        if (recipe.signals().capability(signal) == Capability.UNSUPPORTED) {
            return new SignalDetection(
                    DetectionStatus.UNSUPPORTED, null, DetectionErrorCode.SIGNAL_NOT_SUPPORTED);
        }
        if (observation == null) {
            return new SignalDetection(DetectionStatus.UNAVAILABLE, null, DetectionErrorCode.STORAGE_UNAVAILABLE);
        }
        return switch (observation.status()) {
            case WAITING -> new SignalDetection(
                    DetectionStatus.WAITING, null, DetectionErrorCode.SIGNAL_NOT_RECEIVED);
            case RECEIVED -> observation.lastReceivedAt() != null
                    && observation.lastReceivedAt() >= criteria.startedAt()
                    && observation.lastReceivedAt() <= criteria.detectedAt()
                    ? new SignalDetection(DetectionStatus.RECEIVED, observation.lastReceivedAt(), null)
                    : new SignalDetection(
                            DetectionStatus.WAITING, null, DetectionErrorCode.SIGNAL_NOT_RECEIVED);
            case UNAVAILABLE -> new SignalDetection(
                    DetectionStatus.UNAVAILABLE, null, safeError(observation.errorCode(), false));
            case ERROR -> new SignalDetection(
                    DetectionStatus.ERROR, safeTimestamp(observation.lastReceivedAt(), criteria),
                    safeError(observation.errorCode(), true));
            default -> new SignalDetection(
                    DetectionStatus.ERROR, null, DetectionErrorCode.STORAGE_QUERY_FAILED);
        };
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
                && !recipe.platforms().contains(org.apache.hertzbeat.observability.instrumentation.api
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
