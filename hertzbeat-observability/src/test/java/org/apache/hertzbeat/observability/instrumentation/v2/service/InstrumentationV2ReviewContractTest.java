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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionErrorCode;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Environment;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Framework;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Language;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Method;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal;
import org.apache.hertzbeat.observability.instrumentation.guide.InstrumentationGuideAdapterRegistry;
import org.apache.hertzbeat.observability.instrumentation.service.InstrumentationCatalogService;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationCollectorReadinessStore;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.DetectionSnapshot;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.SignalObservation;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.CatalogResponse;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.RecipeOption;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionRequest;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionResponse;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionStatus;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.PollingDecision;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.BlockType;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.GuideBlock;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.RenderRequest;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.RenderResponse;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Availability;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.DiscoveryStatus;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.ErrorCode;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Gateway;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeEndpoint;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeProfile;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.OtlpTransport;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.TransportSecurity;
import org.junit.jupiter.api.Test;

class InstrumentationV2ReviewContractTest {

    private static final long STARTED_AT = 1_710_000_000_000L;
    private static final long DETECTED_AT = STARTED_AT + 5_000L;

    @Test
    void adaptsEveryOfficialV1ApplicationGuideWithoutBundling() {
        InstrumentationGuideV2Renderer renderer = renderer(List.of(serverProfile()));
        List<ApplicationCase> cases = List.of(
                new ApplicationCase(
                        Language.JAVA, Framework.SPRING_BOOT, Method.ZERO_CODE,
                        Environment.VM, Platform.LINUX_AMD64, "opentelemetry-javaagent.jar"),
                new ApplicationCase(
                        Language.DOTNET, Framework.ASPNET_CORE, Method.ZERO_CODE,
                        Environment.WINDOWS_SERVICE, Platform.WINDOWS_AMD64, "Invoke-WebRequest"),
                new ApplicationCase(
                        Language.NODEJS, Framework.NODEJS, Method.ZERO_CODE,
                        Environment.DOCKER, Platform.LINUX_AMD64, "auto-instrumentations-node"),
                new ApplicationCase(
                        Language.PYTHON, Framework.DJANGO, Method.ZERO_CODE,
                        Environment.VM, Platform.LINUX_AMD64, "opentelemetry-bootstrap"),
                new ApplicationCase(
                        Language.PHP, Framework.PHP_GENERIC, Method.ZERO_CODE,
                        Environment.VM, Platform.LINUX_AMD64, "pecl install"),
                new ApplicationCase(
                        Language.GO, Framework.GO_GENERIC, Method.SDK,
                        Environment.VM, Platform.LINUX_AMD64, "autoexport.NewSpanExporter"),
                new ApplicationCase(
                        Language.GO, Framework.GO_GENERIC, Method.EBPF,
                        Environment.KUBERNETES, Platform.LINUX_AMD64, "OTEL_GO_AUTO_TARGET_EXE"),
                new ApplicationCase(
                        Language.GENERIC, Framework.GENERIC, Method.SDK,
                        Environment.VM, Platform.ANY, "https://opentelemetry.io/docs/languages/"));

        for (ApplicationCase item : cases) {
            var response = renderer.render(applicationRequest(item));
            assertTrue(response.blocks().stream().anyMatch(block ->
                    item.expected().equals(block.href())
                            || block.content() != null && block.content().contains(item.expected())));
            assertTrue(response.components().stream().allMatch(component -> !component.bundledWithHertzBeat()));
            assertTrue(response.blocks().stream()
                    .filter(block -> block.type() == BlockType.COMMAND)
                    .allMatch(block -> block.content() != null
                            && !block.content().startsWith("instrumentation.")));
        }
    }

    @Test
    void rendersTelemetrygenCommandsThatActuallyTargetTheSelectedProfile() {
        var response = renderer(List.of(serverProfile())).render(new RenderRequest(
                2, SourceKind.QUICK_START, "opentelemetry_telemetrygen",
                null, null, null, Environment.VM, Platform.LINUX_AMD64,
                "server-primary", service()));

        assertEquals("0.156.0", response.components().getFirst().version());
        assertTrue(response.components().getFirst().sourceUrl().contains("/tree/v0.156.0/cmd/telemetrygen"));
        for (String signal : List.of("metrics", "logs", "traces")) {
            assertTrue(response.blocks().stream().anyMatch(block -> block.content() != null
                    && block.content().contains("telemetrygen " + signal)
                    && block.content().contains("--otlp-endpoint")
                    && block.content().contains("otel.example.test")
                    && block.content().contains("Authorization=")
                    && block.content().contains("${HERTZBEAT_TOKEN}")
                    && block.content().contains("service.namespace")
                    && block.content().contains("deployment.environment.name")));
        }
        assertTrue(response.blocks().stream().anyMatch(block ->
                block.type() == BlockType.NOTE && block.bodyKey().contains("no_persistence")));

        var grpcResponse = renderer(List.of(grpcProfile())).render(new RenderRequest(
                2, SourceKind.QUICK_START, "opentelemetry_telemetrygen",
                null, null, null, Environment.VM, Platform.LINUX_AMD64,
                "external:grpc", service()));
        assertTrue(grpcResponse.blocks().stream().filter(block -> block.id().startsWith("send_"))
                .allMatch(block -> block.content().contains("--otlp-endpoint 'grpc.example.test:4317'")
                        && !block.content().contains("--otlp-http")));
    }

    @Test
    void existingCollectorGuideAddsExporterWithoutReplacingPipelines() {
        var response = renderer(List.of(serverProfile())).render(new RenderRequest(
                2, SourceKind.EXISTING_OPENTELEMETRY, "existing_otlp",
                null, null, null, null, null, "server-primary", service()));

        String fragment = response.blocks().stream()
                .filter(block -> "configure_exporter".equals(block.id()))
                .findFirst().orElseThrow().content();
        assertTrue(fragment.contains("exporters:"));
        assertFalse(fragment.contains("pipelines:"));
        assertFalse(fragment.contains("receivers:"));
        assertTrue(response.blocks().stream().anyMatch(block ->
                "merge_exporter".equals(block.id()) && block.type() == BlockType.NOTE));
        assertTrue(response.blocks().stream().anyMatch(block ->
                "restart_collector".equals(block.id()) && block.type() == BlockType.NOTE));
    }

    @Test
    void distinguishesEmptyDiscoveryFromLookupFailure() throws Exception {
        var empty = new InstrumentationIntakeProfileV2Service(List::of).profiles();
        var failed = new InstrumentationIntakeProfileV2Service(() -> {
            throw new IllegalStateException("private backend detail");
        }).profiles();

        assertEquals(DiscoveryStatus.UNCONFIGURED, empty.status());
        assertNull(empty.errorCode());
        assertEquals(DiscoveryStatus.UNAVAILABLE, failed.status());
        assertEquals(ErrorCode.DISCOVERY_UNAVAILABLE, failed.errorCode());
        ObjectMapper mapper = new ObjectMapper();
        assertEquals(
                "{\"schemaVersion\":2,\"status\":\"unconfigured\",\"profiles\":[]}",
                mapper.writeValueAsString(empty));
        assertEquals(
                "{\"schemaVersion\":2,\"status\":\"unavailable\","
                        + "\"errorCode\":\"intake_profile_discovery_unavailable\",\"profiles\":[]}",
                mapper.writeValueAsString(failed));
        assertFalse(mapper.writeValueAsString(failed).contains("private backend detail"));
    }

    @Test
    void returnsPollingJumpsQueryErrorsAndCollectorReadiness() {
        var queryFailure = detectionService(
                List.of(serverProfile()), ignored -> {
                    throw new IllegalStateException("private query detail");
                }, ignored -> {
                    throw new AssertionError("Server profile must not read Collector readiness");
                });
        var failed = queryFailure.detect(detectionRequest("server-primary"));
        assertEquals(DetectionStatus.ERROR, failed.signals().get(Signal.METRICS).status());
        assertEquals(DetectionErrorCode.STORAGE_QUERY_FAILED, failed.signals().get(Signal.METRICS).errorCode());
        assertEquals(PollingDecision.MANUAL_RETRY, failed.polling().decision());
        assertEquals(3, failed.queryJumps().size());
        assertTrue(failed.queryJumps().stream().noneMatch(jump -> jump.enabled()));
        assertEquals("server-primary", failed.queryJumpContext().intakeProfileId());
        assertEquals("/checkout/{id}", failed.queryJumpContext().endpoint());

        AtomicInteger readinessCalls = new AtomicInteger();
        var waiting = detectionService(
                List.of(collectorProfile()),
                ignored -> waitingSnapshot(),
                collectorId -> {
                    readinessCalls.incrementAndGet();
                    assertEquals("edge", collectorId);
                    return InstrumentationCollectorReadinessStore.CollectorReadiness.authenticationFailed();
                }).detect(detectionRequest("collector:edge"));
        assertEquals(1, readinessCalls.get());
        assertEquals(DetectionStatus.ERROR, waiting.signals().get(Signal.METRICS).status());
        assertEquals(
                DetectionErrorCode.AUTHENTICATION_FAILED,
                waiting.signals().get(Signal.METRICS).errorCode());
    }

    @Test
    void rejectsDuplicateRecipesIncompleteSignalsAndInconsistentBlocks() {
        CatalogResponse catalog = catalog().catalog();
        RecipeOption first = catalog.recipes().getFirst();
        RecipeOption duplicate = new RecipeOption(
                first.id(),
                first.kind(),
                first.labelKey() + ".duplicate",
                first.preview(),
                first.language(),
                first.framework(),
                first.method(),
                first.environments(),
                first.platforms(),
                first.signals(),
                first.components(),
                first.blocksPreview());
        assertThrows(
                IllegalArgumentException.class,
                () -> new CatalogResponse(
                        2, catalog.groups(), catalog.sources(), List.of(first, duplicate)));

        DetectionResponse detected = detectionService(
                List.of(serverProfile()), ignored -> waitingSnapshot(), ignored -> null)
                .detect(detectionRequest("server-primary"));
        assertThrows(IllegalArgumentException.class, () -> new DetectionResponse(
                2,
                detected.detectedAt(),
                detected.context(),
                Map.of(Signal.METRICS, detected.signals().get(Signal.METRICS)),
                detected.polling(),
                detected.queryJumpContext(),
                detected.queryJumps()));

        RenderResponse rendered = renderer(List.of(serverProfile())).render(new RenderRequest(
                2, SourceKind.EXISTING_OPENTELEMETRY, "existing_otlp",
                null, null, null, null, null, "server-primary", service()));
        GuideBlock exporter = rendered.blocks().getFirst();
        GuideBlock undeclaredMarker = new GuideBlock(
                exporter.id(),
                exporter.type(),
                exporter.titleKey(),
                exporter.bodyKey(),
                exporter.executionLocationKey(),
                exporter.language(),
                exporter.content(),
                exporter.href(),
                List.of());
        assertThrows(IllegalArgumentException.class, () -> new RenderResponse(
                rendered.schemaVersion(),
                rendered.sourceKind(),
                rendered.recipeId(),
                rendered.intakeProfile(),
                rendered.service(),
                rendered.signals(),
                rendered.components(),
                rendered.secretPlaceholders(),
                List.of(undeclaredMarker)));
        assertThrows(IllegalArgumentException.class, () -> new GuideBlock(
                "unsafe_link",
                BlockType.LINK,
                "instrumentation.v2.block.official_source",
                null,
                "instrumentation.location.external",
                null,
                null,
                "http://example.test/docs",
                List.of()));
    }

    private InstrumentationGuideV2Renderer renderer(List<IntakeProfile> profiles) {
        InstrumentationCatalogV2Service catalog = catalog();
        return new InstrumentationGuideV2Renderer(
                catalog,
                new InstrumentationIntakeProfileV2Service(() -> profiles),
                new InstrumentationApplicationGuideV2Adapter(
                        catalog, InstrumentationGuideAdapterRegistry.official()));
    }

    private InstrumentationDetectionV2Service detectionService(
            List<IntakeProfile> profiles,
            org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore store,
            InstrumentationCollectorReadinessStore readiness) {
        return new InstrumentationDetectionV2Service(
                catalog(),
                new InstrumentationIntakeProfileV2Service(() -> profiles),
                store,
                readiness,
                () -> DETECTED_AT);
    }

    private RenderRequest applicationRequest(ApplicationCase item) {
        return new RenderRequest(
                2, SourceKind.APPLICATION, null,
                item.language(), item.framework(), item.method(), item.environment(), item.platform(),
                "server-primary", service());
    }

    private DetectionRequest detectionRequest(String profileId) {
        return new DetectionRequest(
                2, SourceKind.QUICK_START, "opentelemetry_telemetrygen",
                null, null, null, Environment.VM, Platform.LINUX_AMD64,
                service(), profileId, STARTED_AT);
    }

    private DetectionSnapshot waitingSnapshot() {
        EnumMap<Signal, SignalObservation> observations = new EnumMap<>(Signal.class);
        for (Signal signal : Signal.values()) {
            observations.put(signal, SignalObservation.waiting());
        }
        return new DetectionSnapshot(observations);
    }

    private IntakeProfile serverProfile() {
        return new IntakeProfile(
                "server-primary", IntakeKind.SERVER, Availability.AVAILABLE, Gateway.SERVER,
                List.of(OtlpTransport.HTTP_PROTOBUF),
                Map.of(
                        OtlpTransport.HTTP_PROTOBUF,
                        new IntakeEndpoint(
                                "https://otel.example.test/api/otlp", TransportSecurity.TLS)),
                "Authorization", null, null);
    }

    private IntakeProfile collectorProfile() {
        return new IntakeProfile(
                "collector:edge", IntakeKind.HERTZBEAT_COLLECTOR, Availability.AVAILABLE, Gateway.COLLECTOR,
                List.of(OtlpTransport.HTTP_PROTOBUF),
                Map.of(
                        OtlpTransport.HTTP_PROTOBUF,
                        new IntakeEndpoint(
                                "https://edge.example.test/api/otlp", TransportSecurity.TLS)),
                "Authorization", "edge", null);
    }

    private IntakeProfile grpcProfile() {
        return new IntakeProfile(
                "external:grpc",
                IntakeKind.EXTERNAL_OTEL_COLLECTOR,
                Availability.AVAILABLE,
                Gateway.EXTERNAL,
                List.of(OtlpTransport.GRPC),
                Map.of(
                        OtlpTransport.GRPC,
                        new IntakeEndpoint("https://grpc.example.test:4317", TransportSecurity.TLS)),
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

    private record ApplicationCase(
            Language language,
            Framework framework,
            Method method,
            Environment environment,
            Platform platform,
            String expected) {
    }
}
