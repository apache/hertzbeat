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

package org.apache.hertzbeat.observability.instrumentation.v2;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionErrorCode;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionStatus;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.PollingDecision;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.PollingInstruction;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.SignalDetection;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.BlockType;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.SecretPlaceholder;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Availability;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Authentication;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Gateway;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeEndpoint;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeProfile;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.OtlpTransport;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.TransportSecurity;
import org.apache.hertzbeat.observability.instrumentation.v2.controller.InstrumentationV2Controller;
import org.apache.hertzbeat.observability.instrumentation.service.InstrumentationCatalogService;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationCatalogV2Service;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

class InstrumentationV2ContractTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void freezesCanonicalSurfaceAndClosedWireEnums() throws Exception {
        RequestMapping mapping = InstrumentationV2Controller.class.getAnnotation(RequestMapping.class);
        assertEquals(List.of("/api/instrumentation"), List.of(mapping.path()));
        assertEquals(
                Set.of("/catalog", "/intake-profiles"),
                java.util.Arrays.stream(InstrumentationV2Controller.class.getDeclaredMethods())
                        .map(method -> method.getAnnotation(GetMapping.class))
                        .filter(java.util.Objects::nonNull)
                        .flatMap(annotation -> java.util.Arrays.stream(annotation.value()))
                        .collect(java.util.stream.Collectors.toUnmodifiableSet()));
        assertEquals(
                Set.of("/render", "/detect"),
                java.util.Arrays.stream(InstrumentationV2Controller.class.getDeclaredMethods())
                        .map(method -> method.getAnnotation(PostMapping.class))
                        .filter(java.util.Objects::nonNull)
                        .flatMap(annotation -> java.util.stream.Stream.concat(
                                java.util.Arrays.stream(annotation.value()),
                                java.util.Arrays.stream(annotation.path())))
                        .collect(java.util.stream.Collectors.toUnmodifiableSet()));
        assertEquals("\"quick_start\"", mapper.writeValueAsString(SourceKind.QUICK_START));
        assertEquals("\"application\"", mapper.writeValueAsString(SourceKind.APPLICATION));
        assertEquals("\"existing_opentelemetry\"", mapper.writeValueAsString(SourceKind.EXISTING_OPENTELEMETRY));
        assertEquals(
                List.of("command", "code", "environment", "download", "note", "warning", "link", "check"),
                java.util.Arrays.stream(BlockType.values())
                        .map(value -> mapper.convertValue(value, String.class))
                        .toList());
        assertEquals(
                List.of("waiting", "received", "unsupported", "unavailable", "error"),
                java.util.Arrays.stream(DetectionStatus.values())
                        .map(value -> mapper.convertValue(value, String.class))
                        .toList());
    }

    @Test
    void exposesTypedSourceCatalogInsteadOfLocalizedTutorialContent() {
        var catalog = new InstrumentationCatalogV2Service(new InstrumentationCatalogService()).catalog();
        JsonNode json = mapper.valueToTree(catalog);

        assertEquals(2, catalog.schemaVersion());
        assertEquals(Set.of("schemaVersion", "groups", "sources", "recipes"), fieldNames(json));
        assertTrue(catalog.sources().size() >= 35);
        assertTrue(catalog.sources().stream()
                .allMatch(source -> source.labelKey().startsWith("instrumentation.v2.directory.")));
        assertTrue(catalog.recipes().stream().allMatch(recipe -> recipe.blocksPreview().size() <= 8));
        assertTrue(catalog.recipes().stream()
                .filter(recipe -> recipe.kind() == SourceKind.APPLICATION)
                .anyMatch(recipe -> "go_ebpf_preview".equals(recipe.id()) && recipe.preview()));
        assertTrue(catalog.recipes().stream()
                .filter(recipe -> recipe.kind() == SourceKind.QUICK_START)
                .flatMap(recipe -> recipe.components().stream())
                .allMatch(component -> component.official() && !component.bundledWithHertzBeat()));
    }

    @Test
    void exposesOnlyExplicitCanonicalHttpsCatalogUrls() {
        var catalog = new InstrumentationCatalogV2Service(new InstrumentationCatalogService()).catalog();

        catalog.recipes().stream().flatMap(recipe -> recipe.components().stream()).forEach(component -> {
            assertExplicitCanonicalHttps(component.sourceUrl());
            component.dependencies().forEach(dependency ->
                    assertExplicitCanonicalHttps(dependency.sourceUrl()));
            component.artifacts().forEach(artifact -> {
                assertExplicitCanonicalHttps(artifact.downloadUrl());
                assertExplicitCanonicalHttps(artifact.provenanceUrl());
            });
        });
    }

    @Test
    void omitsUnsetOptionalRecipeFieldsFromCatalogJson() {
        JsonNode catalog = mapper.valueToTree(
                new InstrumentationCatalogV2Service(new InstrumentationCatalogService()).catalog());
        int recipesWithoutApplicationSelection = 0;

        for (JsonNode recipe : catalog.path("recipes")) {
            if ("quick_start".equals(recipe.path("kind").asText())
                    || "existing_opentelemetry".equals(recipe.path("kind").asText())) {
                recipesWithoutApplicationSelection++;
                assertFalse(recipe.has("language"));
                assertFalse(recipe.has("framework"));
                assertFalse(recipe.has("method"));
            }
        }
        assertTrue(recipesWithoutApplicationSelection >= 2);
    }

    @Test
    void omitsUnsetOptionalDetectionFieldsFromJson() {
        JsonNode waiting = mapper.valueToTree(
                new SignalDetection(DetectionStatus.WAITING, null, DetectionErrorCode.SIGNAL_NOT_RECEIVED));
        JsonNode received = mapper.valueToTree(
                new SignalDetection(DetectionStatus.RECEIVED, 1_710_000_000_000L, null));
        JsonNode complete = mapper.valueToTree(
                new PollingInstruction(PollingDecision.COMPLETE, null, 1_710_000_120_000L));

        assertFalse(waiting.has("lastReceivedAt"));
        assertFalse(received.has("errorCode"));
        assertFalse(complete.has("pollAfterMs"));
    }

    @Test
    void intakeProfileIsIndependentExplicitAndDisclosesTransportSecurity() throws Exception {
        IntakeProfile profile = new IntakeProfile(
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

        String json = mapper.writeValueAsString(profile);
        assertTrue(json.contains("\"id\":\"server-primary\""));
        assertTrue(json.contains("\"kind\":\"server\""));
        assertTrue(json.contains("\"authentication\":\"bearer_token\""));
        assertTrue(json.contains("\"authorizationHeader\":\"Authorization\""));
        assertTrue(json.contains("\"endpoints\":{\"http_protobuf\":"
                + "{\"url\":\"https://otel.example.test/v1\",\"security\":\"tls\"}}"));
        assertFalse(json.contains("httpsEndpoints"));
        assertFalse(json.contains("\"token\":"));
        assertFalse(json.contains("authHeaderName"));
        assertFalse(json.contains("collectorId"));
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
        assertEquals(
                TransportSecurity.PLAINTEXT,
                plaintext.endpoints().get(OtlpTransport.HTTP_PROTOBUF).security());
        IntakeProfile mixed = new IntakeProfile(
                "collector:mixed",
                IntakeKind.HERTZBEAT_COLLECTOR,
                Availability.AVAILABLE,
                Gateway.COLLECTOR,
                List.of(OtlpTransport.HTTP_PROTOBUF, OtlpTransport.GRPC),
                Map.of(
                        OtlpTransport.HTTP_PROTOBUF,
                        new IntakeEndpoint("http://127.0.0.1:4318", TransportSecurity.PLAINTEXT),
                        OtlpTransport.GRPC,
                        new IntakeEndpoint("https://collector.example.test:4317", TransportSecurity.TLS)),
                "Authorization",
                "mixed",
                null);
        assertEquals(TransportSecurity.PLAINTEXT,
                mixed.endpoints().get(OtlpTransport.HTTP_PROTOBUF).security());
        assertEquals(TransportSecurity.TLS, mixed.endpoints().get(OtlpTransport.GRPC).security());
        assertThrows(IllegalArgumentException.class, () -> new IntakeProfile(
                "unsafe",
                IntakeKind.SERVER,
                Availability.AVAILABLE,
                Gateway.SERVER,
                List.of(OtlpTransport.GRPC),
                Map.of(
                        OtlpTransport.GRPC,
                        new IntakeEndpoint("ftp://explicit-but-unsupported:4317", TransportSecurity.PLAINTEXT)),
                "Authorization",
                null,
                null));
        assertThrows(IllegalArgumentException.class, () ->
                new IntakeEndpoint("http://127.0.0.1:4318", TransportSecurity.TLS));
        assertThrows(IllegalArgumentException.class, () ->
                new IntakeEndpoint("https://otel.example.test:4318", TransportSecurity.PLAINTEXT));
        assertThrows(IllegalArgumentException.class, () -> new IntakeProfile(
                "duplicate",
                IntakeKind.EXTERNAL_OTEL_COLLECTOR,
                Availability.AVAILABLE,
                Gateway.EXTERNAL,
                List.of(OtlpTransport.GRPC, OtlpTransport.GRPC),
                Map.of(
                        OtlpTransport.GRPC,
                        new IntakeEndpoint("https://otel.example.test:4317", TransportSecurity.TLS)),
                "Authorization",
                null,
                null));
        assertThrows(IllegalArgumentException.class, () -> new IntakeProfile(
                "server-none",
                IntakeKind.SERVER,
                Availability.AVAILABLE,
                Gateway.SERVER,
                List.of(OtlpTransport.HTTP_PROTOBUF),
                Map.of(
                        OtlpTransport.HTTP_PROTOBUF,
                        new IntakeEndpoint("https://otel.example.test:4318", TransportSecurity.TLS)),
                Authentication.NONE,
                null,
                null,
                null));
        assertThrows(IllegalArgumentException.class, () -> new IntakeProfile(
                "external-inconsistent",
                IntakeKind.EXTERNAL_OTEL_COLLECTOR,
                Availability.AVAILABLE,
                Gateway.EXTERNAL,
                List.of(OtlpTransport.HTTP_PROTOBUF),
                Map.of(
                        OtlpTransport.HTTP_PROTOBUF,
                        new IntakeEndpoint("https://otel.example.test:4318", TransportSecurity.TLS)),
                Authentication.NONE,
                "Authorization",
                null,
                null));
    }

    private static void assertExplicitCanonicalHttps(String value) {
        URI uri = URI.create(value);
        assertEquals("https", uri.getScheme(), value);
        assertTrue(uri.getHost() != null && !uri.getHost().isBlank(), value);
        assertNull(uri.getUserInfo(), value);
        assertNull(uri.getRawQuery(), value);
        assertNull(uri.getRawFragment(), value);
    }

    private Set<String> fieldNames(JsonNode node) {
        Set<String> names = new HashSet<>();
        node.fieldNames().forEachRemaining(names::add);
        return names;
    }

    @Test
    void secretPlaceholderDeclaresMarkerWithoutCarryingSecretMaterial() throws Exception {
        SecretPlaceholder placeholder = SecretPlaceholder.authorizationToken();

        assertEquals("${HERTZBEAT_TOKEN}", placeholder.marker());
        assertEquals("authorization_token", placeholder.kind());
        assertNull(placeholder.value());
        assertFalse(mapper.writeValueAsString(placeholder).contains("secret-value"));
    }
}
