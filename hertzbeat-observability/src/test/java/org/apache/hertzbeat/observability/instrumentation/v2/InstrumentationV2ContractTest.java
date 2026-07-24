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
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionErrorCode;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionStatus;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.PollingDecision;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.PollingInstruction;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.SignalDetection;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.BlockType;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.SecretPlaceholder;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Availability;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Gateway;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeProfile;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.OtlpTransport;
import org.apache.hertzbeat.observability.instrumentation.v2.controller.InstrumentationV2Controller;
import org.apache.hertzbeat.observability.instrumentation.service.InstrumentationCatalogService;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationCatalogV2Service;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.RequestMapping;

class InstrumentationV2ContractTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void freezesVersionedSurfaceAndClosedWireEnums() throws Exception {
        RequestMapping mapping = InstrumentationV2Controller.class.getAnnotation(RequestMapping.class);
        assertEquals(List.of("/api/instrumentation/v2"), List.of(mapping.path()));
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

        assertEquals(2, catalog.schemaVersion());
        assertEquals(List.of(SourceKind.QUICK_START, SourceKind.APPLICATION, SourceKind.EXISTING_OPENTELEMETRY),
                catalog.sources().stream().map(InstrumentationCatalogV2.SourceOption::kind).toList());
        assertTrue(catalog.sources().stream().allMatch(source -> source.labelKey().startsWith("instrumentation.v2.")));
        assertEquals(
                List.of(
                        "instrumentation.v2.source.quick_start_description",
                        "instrumentation.v2.source.application_description",
                        "instrumentation.v2.source.existing_opentelemetry_description"),
                catalog.sources().stream().map(InstrumentationCatalogV2.SourceOption::descriptionKey).toList());
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
        assertEquals(2, recipesWithoutApplicationSelection);
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
    void intakeProfileIsIndependentExplicitAndDefensive() throws Exception {
        IntakeProfile profile = new IntakeProfile(
                "server-primary",
                IntakeKind.SERVER,
                Availability.AVAILABLE,
                Gateway.SERVER,
                List.of(OtlpTransport.HTTP_PROTOBUF),
                Map.of(OtlpTransport.HTTP_PROTOBUF, "https://otel.example.test/v1"),
                "Authorization",
                null,
                null);

        String json = mapper.writeValueAsString(profile);
        assertTrue(json.contains("\"id\":\"server-primary\""));
        assertTrue(json.contains("\"kind\":\"server\""));
        assertFalse(json.contains("token"));
        assertFalse(json.contains("collectorId"));
        assertThrows(IllegalArgumentException.class, () -> new IntakeProfile(
                "unsafe",
                IntakeKind.SERVER,
                Availability.AVAILABLE,
                Gateway.SERVER,
                List.of(OtlpTransport.GRPC),
                Map.of(OtlpTransport.GRPC, "http://inferred:4317"),
                "Authorization",
                null,
                null));
        assertThrows(IllegalArgumentException.class, () -> new IntakeProfile(
                "duplicate",
                IntakeKind.EXTERNAL_OTEL_COLLECTOR,
                Availability.AVAILABLE,
                Gateway.EXTERNAL,
                List.of(OtlpTransport.GRPC, OtlpTransport.GRPC),
                Map.of(OtlpTransport.GRPC, "https://otel.example.test:4317"),
                "Authorization",
                null,
                null));
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
