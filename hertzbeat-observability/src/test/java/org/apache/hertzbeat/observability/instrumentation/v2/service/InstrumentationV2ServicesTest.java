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
import java.util.concurrent.atomic.AtomicInteger;
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
import org.apache.hertzbeat.observability.instrumentation.guide.InstrumentationGuideAdapterRegistry;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionRequest;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionStatus;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.BlockType;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.RenderRequest;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Availability;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.ErrorCode;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Gateway;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeEndpoint;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeProfile;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.OtlpTransport;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.TransportSecurity;
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
        InstrumentationGuideV2Renderer renderer = new InstrumentationGuideV2Renderer(
                catalog,
                profiles,
                new InstrumentationApplicationGuideV2Adapter(
                        catalog, InstrumentationGuideAdapterRegistry.official()));

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
                .endpoints().get(OtlpTransport.HTTP_PROTOBUF).url());
        String rendered = response.blocks().stream()
                .map(block -> block.content() == null ? "" : block.content())
                .collect(java.util.stream.Collectors.joining("\n"));
        assertTrue(rendered.contains("https://otel.example.test/v1"));
        assertTrue(rendered.contains("${HERTZBEAT_TOKEN}"));
        assertTrue(rendered.contains("otlphttp/hertzbeat"));
        assertFalse(rendered.contains("pipelines:"));
        assertFalse(response.blocks().stream()
                .anyMatch(block -> block.type() == BlockType.WARNING));
        String json = new ObjectMapper().writeValueAsString(response);
        assertFalse(json.contains("secret-value"));
        assertFalse(json.contains("entityId"));
    }

    @Test
    void rendersStableWarningForPlaintextAuthorizationWithoutRejectingProfile() {
        InstrumentationCatalogV2Service catalog = catalog();
        IntakeProfile plaintext = new IntakeProfile(
                "collector:loopback",
                IntakeKind.HERTZBEAT_COLLECTOR,
                Availability.AVAILABLE,
                Gateway.COLLECTOR,
                List.of(OtlpTransport.HTTP_PROTOBUF),
                Map.of(
                        OtlpTransport.HTTP_PROTOBUF,
                        new IntakeEndpoint("http://127.0.0.1:4318", TransportSecurity.PLAINTEXT)),
                "Authorization",
                "loopback",
                null);
        InstrumentationGuideV2Renderer renderer = new InstrumentationGuideV2Renderer(
                catalog,
                new InstrumentationIntakeProfileV2Service(() -> List.of(plaintext)),
                new InstrumentationApplicationGuideV2Adapter(
                        catalog, InstrumentationGuideAdapterRegistry.official()));

        var response = renderer.render(new RenderRequest(
                2,
                SourceKind.EXISTING_OPENTELEMETRY,
                "existing_otlp",
                null,
                null,
                null,
                null,
                null,
                "collector:loopback",
                service()));

        assertEquals(Availability.AVAILABLE, response.intakeProfile().availability());
        assertEquals("plaintext_transport_warning", response.blocks().getFirst().id());
        assertEquals(BlockType.WARNING, response.blocks().getFirst().type());
        assertEquals(
                "instrumentation.v2.warning.plaintext_authorization",
                response.blocks().getFirst().bodyKey());
        assertTrue(response.blocks().stream()
                .filter(block -> block.content() != null)
                .anyMatch(block -> block.content().contains("http://127.0.0.1:4318")));
    }

    @Test
    void rendersPinnedExternalQuickStartWithSafeCleanup() {
        InstrumentationIntakeProfileV2Service profiles =
                new InstrumentationIntakeProfileV2Service(() -> List.of(serverProfile()));
        var response = new InstrumentationGuideV2Renderer(
                catalog(),
                profiles,
                new InstrumentationApplicationGuideV2Adapter(
                        catalog(), InstrumentationGuideAdapterRegistry.official())).render(new RenderRequest(
                2,
                SourceKind.QUICK_START,
                "opentelemetry_telemetrygen",
                null,
                null,
                null,
                Environment.VM,
                Platform.LINUX_AMD64,
                "server-primary",
                service()));

        assertTrue(response.blocks().getFirst().content().contains("telemetrygen@v0.156.0"));
        assertTrue(response.blocks().stream().anyMatch(block -> block.content() != null
                && block.content().contains("rm -rf -- .hertzbeat-telemetrygen")));
        assertEquals(
                response.blocks().size(),
                new HashSet<>(response.blocks().stream().map(block -> block.id()).toList()).size());
        assertTrue(response.components().stream().allMatch(component -> !component.bundledWithHertzBeat()));
    }

    @Test
    void rendersCollectorIdentityRequiredByScopedDetectionForApplicationAndQuickStart() {
        IntakeProfile collector = collectorProfile();
        InstrumentationIntakeProfileV2Service profiles =
                new InstrumentationIntakeProfileV2Service(() -> List.of(collector));
        InstrumentationCatalogV2Service catalog = catalog();
        InstrumentationGuideV2Renderer renderer = new InstrumentationGuideV2Renderer(
                catalog,
                profiles,
                new InstrumentationApplicationGuideV2Adapter(
                        catalog, InstrumentationGuideAdapterRegistry.official()));

        var application = renderer.render(new RenderRequest(
                2,
                SourceKind.APPLICATION,
                "java_spring_boot_zero_code",
                null,
                null,
                null,
                Environment.VM,
                Platform.LINUX_AMD64,
                collector.id(),
                service()));
        var quickStart = renderer.render(new RenderRequest(
                2,
                SourceKind.QUICK_START,
                "opentelemetry_telemetrygen",
                null,
                null,
                null,
                Environment.VM,
                Platform.LINUX_AMD64,
                collector.id(),
                service()));

        assertTrue(renderedContent(application).contains("hertzbeat.collector.id=loopback"));
        assertTrue(renderedContent(quickStart)
                .contains("--otlp-attributes 'hertzbeat.collector.id=\"loopback\"'"));
    }

    @Test
    void doesNotInventCollectorIdentityForServerOrExternalProfiles() {
        IntakeProfile external = new IntakeProfile(
                "external-west",
                IntakeKind.EXTERNAL_OTEL_COLLECTOR,
                Availability.AVAILABLE,
                Gateway.EXTERNAL,
                List.of(OtlpTransport.HTTP_PROTOBUF),
                Map.of(
                        OtlpTransport.HTTP_PROTOBUF,
                        new IntakeEndpoint("https://external.example.test:4318", TransportSecurity.TLS)),
                "Authorization",
                null,
                null);
        for (IntakeProfile profile : List.of(serverProfile(), external)) {
            InstrumentationIntakeProfileV2Service profiles =
                    new InstrumentationIntakeProfileV2Service(() -> List.of(profile));
            InstrumentationCatalogV2Service catalog = catalog();
            InstrumentationGuideV2Renderer renderer = new InstrumentationGuideV2Renderer(
                    catalog,
                    profiles,
                    new InstrumentationApplicationGuideV2Adapter(
                            catalog, InstrumentationGuideAdapterRegistry.official()));

            var application = renderer.render(new RenderRequest(
                    2,
                    SourceKind.APPLICATION,
                    "java_spring_boot_zero_code",
                    null,
                    null,
                    null,
                    Environment.VM,
                    Platform.LINUX_AMD64,
                    profile.id(),
                    service()));
            var quickStart = renderer.render(new RenderRequest(
                    2,
                    SourceKind.QUICK_START,
                    "opentelemetry_telemetrygen",
                    null,
                    null,
                    null,
                    Environment.VM,
                    Platform.LINUX_AMD64,
                    profile.id(),
                    service()));

            assertFalse(renderedContent(application).contains("hertzbeat.collector.id"));
            assertFalse(renderedContent(quickStart).contains("hertzbeat.collector.id"));
        }
    }

    @Test
    void rendersCatalogSourceTemplateAndDetectsOnlyItsDeclaredSignals() {
        InstrumentationIntakeProfileV2Service profiles =
                new InstrumentationIntakeProfileV2Service(() -> List.of(serverProfile()));
        InstrumentationGuideV2Renderer renderer = new InstrumentationGuideV2Renderer(
                catalog(),
                profiles,
                new InstrumentationApplicationGuideV2Adapter(
                        catalog(), InstrumentationGuideAdapterRegistry.official()));

        var rendered = renderer.render(new RenderRequest(
                2,
                SourceKind.EXISTING_OPENTELEMETRY,
                "logstash",
                null,
                null,
                null,
                Environment.VM,
                Platform.ANY,
                "server-primary",
                service()));
        String guide = rendered.blocks().stream()
                .map(block -> block.content() == null ? "" : block.content())
                .collect(java.util.stream.Collectors.joining("\n"));
        assertTrue(guide.contains("tcplog/logstash"));
        assertTrue(guide.contains("service.namespace"));

        var store = (org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore)
                ignored -> new DetectionSnapshot(Map.of(
                        Signal.METRICS, SignalObservation.received(STARTED_AT + 1_000L),
                        Signal.LOGS, SignalObservation.received(STARTED_AT + 1_000L),
                        Signal.TRACES, SignalObservation.received(STARTED_AT + 1_000L)));
        var detected = new InstrumentationDetectionV2Service(
                catalog(), profiles, store, () -> DETECTED_AT).detect(new DetectionRequest(
                2,
                SourceKind.EXISTING_OPENTELEMETRY,
                "logstash",
                null,
                null,
                null,
                Environment.VM,
                Platform.ANY,
                service(),
                "server-primary",
                STARTED_AT));
        assertEquals(DetectionStatus.UNSUPPORTED, detected.signals().get(Signal.METRICS).status());
        assertEquals(DetectionStatus.RECEIVED, detected.signals().get(Signal.LOGS).status());
        assertEquals(DetectionStatus.UNSUPPORTED, detected.signals().get(Signal.TRACES).status());
    }

    @Test
    void rejectsDiscoveryOnlySourceBeforeStorageQuery() {
        AtomicInteger queries = new AtomicInteger();
        InstrumentationDetectionV2Service detection = new InstrumentationDetectionV2Service(
                catalog(),
                new InstrumentationIntakeProfileV2Service(() -> List.of(serverProfile())),
                ignored -> {
                    queries.incrementAndGet();
                    return new DetectionSnapshot(Map.of());
                },
                () -> DETECTED_AT);

        assertThrows(InstrumentationV2RequestException.class, () -> detection.detect(new DetectionRequest(
                2,
                SourceKind.EXISTING_OPENTELEMETRY,
                "fluent_bit",
                null,
                null,
                null,
                Environment.VM,
                Platform.ANY,
                service(),
                "server-primary",
                STARTED_AT)));
        assertEquals(0, queries.get());
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
                "opentelemetry_telemetrygen",
                null,
                null,
                null,
                Environment.VM,
                Platform.LINUX_AMD64,
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
                Map.of(
                        OtlpTransport.HTTP_PROTOBUF,
                        new IntakeEndpoint("https://otel.example.test/v1", TransportSecurity.TLS)),
                "Authorization",
                null,
                null);
    }

    private IntakeProfile collectorProfile() {
        return new IntakeProfile(
                "collector:loopback",
                IntakeKind.HERTZBEAT_COLLECTOR,
                Availability.AVAILABLE,
                Gateway.COLLECTOR,
                List.of(OtlpTransport.HTTP_PROTOBUF),
                Map.of(
                        OtlpTransport.HTTP_PROTOBUF,
                        new IntakeEndpoint("http://127.0.0.1:4318", TransportSecurity.PLAINTEXT)),
                "Authorization",
                "loopback",
                null);
    }

    private String renderedContent(
            org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.RenderResponse response) {
        return response.blocks().stream()
                .map(block -> block.content() == null ? "" : block.content())
                .collect(java.util.stream.Collectors.joining("\n"));
    }

    private ServiceIdentity service() {
        return new ServiceIdentity("checkout-api", "commerce", "prod", "checkout-7d9", "/checkout/{id}");
    }

    private InstrumentationCatalogV2Service catalog() {
        return new InstrumentationCatalogV2Service(new InstrumentationCatalogService());
    }
}
