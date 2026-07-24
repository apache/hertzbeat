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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Environment;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionErrorCode;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.DetectionCriteria;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.DetectionSnapshot;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.SignalObservation;
import org.apache.hertzbeat.observability.instrumentation.service.InstrumentationCatalogService;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionRequest;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionStatus;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.RenderRequest;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Availability;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.ErrorCode;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Gateway;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeProfile;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.OtlpTransport;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationV2RequestException;
import org.junit.jupiter.api.Test;

class InstrumentationV2ServicesTest {

    private static final long STARTED_AT = 1_710_000_000_000L;
    private static final long DETECTED_AT = STARTED_AT + 5_000L;

    @Test
    void rendersFromResolvedProfileWithoutSecretMaterialOrCallerEndpoint() throws Exception {
        InstrumentationCatalogV2Service catalog = catalog();
        InstrumentationIntakeProfileV2Service profiles =
                new InstrumentationIntakeProfileV2Service(() -> List.of(serverProfile()));
        InstrumentationGuideV2Renderer renderer = new InstrumentationGuideV2Renderer(catalog, profiles);

        var response = renderer.render(new RenderRequest(
                2,
                SourceKind.EXISTING_OPENTELEMETRY,
                "existing_otlp",
                null,
                null,
                null,
                null,
                null,
                "server-primary",
                service()));

        assertEquals("https://otel.example.test/v1", response.intakeProfile()
                .httpsEndpoints().get(OtlpTransport.HTTP_PROTOBUF));
        assertTrue(response.blocks().getFirst().content().contains("https://otel.example.test/v1"));
        assertTrue(response.blocks().getFirst().content().contains("${HERTZBEAT_TOKEN}"));
        assertTrue(response.blocks().get(1).content().contains("otlphttp/hertzbeat"));
        assertTrue(response.blocks().get(1).content().contains("https://otel.example.test/v1"));
        String json = new ObjectMapper().writeValueAsString(response);
        assertFalse(json.contains("secret-value"));
        assertFalse(json.contains("entityId"));
    }

    @Test
    void rendersPinnedExternalQuickStartWithSafeCleanup() {
        InstrumentationIntakeProfileV2Service profiles =
                new InstrumentationIntakeProfileV2Service(() -> List.of(serverProfile()));
        var response = new InstrumentationGuideV2Renderer(catalog(), profiles).render(new RenderRequest(
                2,
                SourceKind.QUICK_START,
                "opentelemetry_demo",
                null,
                null,
                null,
                Environment.DOCKER,
                Platform.ANY,
                "server-primary",
                service()));

        assertTrue(response.blocks().getFirst().content().contains("63649d6d6a59de88fb421b88c3c3a6185b6d21ad"));
        assertTrue(response.blocks().stream().anyMatch(block -> block.content() != null
                && block.content().contains("docker compose down --volumes --remove-orphans")));
        assertEquals(
                response.blocks().size(),
                new HashSet<>(response.blocks().stream().map(block -> block.id()).toList()).size());
        assertTrue(response.components().stream().allMatch(component -> !component.bundledWithHertzBeat()));
    }

    @Test
    void defaultsToExplicitAvailableServerAndRejectsUnavailableProfile() {
        IntakeProfile unavailable = new IntakeProfile(
                "collector:edge",
                IntakeKind.HERTZBEAT_COLLECTOR,
                Availability.UNAVAILABLE,
                null,
                List.of(),
                Map.of(),
                null,
                "edge",
                ErrorCode.UNAVAILABLE);
        InstrumentationIntakeProfileV2Service profiles =
                new InstrumentationIntakeProfileV2Service(() -> List.of(unavailable, serverProfile()));

        assertEquals("server-primary", profiles.profiles().defaultProfileId());
        InstrumentationV2RequestException exception = assertThrows(
                InstrumentationV2RequestException.class, () -> profiles.requireAvailable("collector:edge"));
        assertEquals(
                InstrumentationV2RequestException.ErrorCode.INTAKE_PROFILE_UNAVAILABLE,
                exception.errorCode());
    }

    @Test
    void scopesEveryDetectionSignalAndRejectsOutOfWindowGlobalEvidence() {
        AtomicReference<DetectionCriteria> criteria = new AtomicReference<>();
        var store = (org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore)
                scope -> {
                    criteria.set(scope);
                    return new DetectionSnapshot(Map.of(
                            Signal.METRICS, SignalObservation.received(STARTED_AT + 1_000L),
                            Signal.LOGS, SignalObservation.received(STARTED_AT - 1L),
                            Signal.TRACES, SignalObservation.error(DetectionErrorCode.STORAGE_QUERY_FAILED, null)));
                };
        InstrumentationIntakeProfileV2Service profiles =
                new InstrumentationIntakeProfileV2Service(() -> List.of(serverProfile()));
        InstrumentationDetectionV2Service service = new InstrumentationDetectionV2Service(
                catalog(), profiles, store, () -> DETECTED_AT);

        var response = service.detect(new DetectionRequest(
                2,
                SourceKind.QUICK_START,
                "opentelemetry_demo",
                null,
                null,
                null,
                Environment.DOCKER,
                Platform.ANY,
                service(),
                "server-primary",
                STARTED_AT));

        assertEquals(new DetectionCriteria(
                "checkout-api", "commerce", "prod", null, "checkout-7d9", "/checkout/{id}",
                STARTED_AT, DETECTED_AT), criteria.get());
        assertEquals(DetectionStatus.RECEIVED, response.signals().get(Signal.METRICS).status());
        assertEquals(DetectionStatus.WAITING, response.signals().get(Signal.LOGS).status());
        assertEquals(DetectionStatus.ERROR, response.signals().get(Signal.TRACES).status());
        assertEquals("server-primary", response.context().intakeProfileId());
        assertNull(response.context().collectorId());
        assertEquals(STARTED_AT + 120_000L, response.context().windowEndAt());
    }

    private IntakeProfile serverProfile() {
        return new IntakeProfile(
                "server-primary",
                IntakeKind.SERVER,
                Availability.AVAILABLE,
                Gateway.SERVER,
                List.of(OtlpTransport.HTTP_PROTOBUF),
                Map.of(OtlpTransport.HTTP_PROTOBUF, "https://otel.example.test/v1"),
                "Authorization",
                null,
                null);
    }

    private ServiceIdentity service() {
        return new ServiceIdentity("checkout-api", "commerce", "prod", "checkout-7d9", "/checkout/{id}");
    }

    private InstrumentationCatalogV2Service catalog() {
        return new InstrumentationCatalogV2Service(new InstrumentationCatalogService());
    }
}
