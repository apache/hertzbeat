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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Capability;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SignalCapabilities;
import org.apache.hertzbeat.observability.instrumentation.service.InstrumentationCatalogService;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.CatalogResponse;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceEntry;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceGroup;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.Support;
import org.apache.hertzbeat.observability.instrumentation.v2.guide.InstrumentationSourceGuideV2Registry;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationCatalogV2Service;
import org.junit.jupiter.api.Test;

class InstrumentationSourceCatalogV2ContractTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void rejectsUnsafeAndInconsistentSourceMetadata() {
        SignalCapabilities unsupported =
                new SignalCapabilities(Capability.UNSUPPORTED, Capability.UNSUPPORTED, Capability.UNSUPPORTED);
        assertThrows(IllegalArgumentException.class, () -> new SourceGroup("../unsafe", "safe.key"));
        assertThrows(IllegalArgumentException.class, () -> new SourceEntry(
                "unsafe",
                "safe.key",
                "safe.description",
                "safe-icon",
                List.of("logs"),
                Support.UNSUPPORTED,
                SourceKind.EXISTING_OPENTELEMETRY,
                List.of(),
                unsupported,
                null));
        assertThrows(IllegalArgumentException.class, () -> new SourceEntry(
                "unsafe",
                "safe.key",
                "safe.description",
                "safe-icon",
                List.of("logs"),
                Support.UNSUPPORTED,
                null,
                List.of(),
                unsupported,
                "https://user:secret@example.test/docs"));
        assertThrows(IllegalArgumentException.class, () -> new CatalogResponse(
                2,
                List.of(new SourceGroup("logs", "safe.logs")),
                List.of(new SourceEntry(
                        "unknown_group",
                        "safe.key",
                        "safe.description",
                        "safe-icon",
                        List.of("missing"),
                        Support.UNSUPPORTED,
                        null,
                        List.of(),
                        unsupported,
                        null)),
                List.of()));
    }

    @Test
    void exposesGroupsSourcesAndRecipesInSingleCatalog() {
        InstrumentationCatalogV2Service recipes =
                new InstrumentationCatalogV2Service(new InstrumentationCatalogService());
        var catalog = recipes.catalog();
        JsonNode json = mapper.valueToTree(catalog);

        assertEquals(Set.of("schemaVersion", "groups", "sources", "recipes"), fieldNames(json));
        assertEquals(2, catalog.schemaVersion());
        assertEquals(
                List.of(
                        "quick_start",
                        "applications",
                        "collectors",
                        "logs",
                        "infrastructure",
                        "cloud",
                        "databases",
                        "messaging"),
                catalog.groups().stream().map(group -> group.id()).toList());
        assertTrue(catalog.sources().size() >= 35);
        assertEquals(
                catalog.sources().size(),
                catalog.sources().stream().map(SourceEntry::id).distinct().count());
    }

    @Test
    void publishesRequiredRenderableAndDiscoveryOnlySources() {
        InstrumentationCatalogV2Service recipes =
                new InstrumentationCatalogV2Service(new InstrumentationCatalogService());
        InstrumentationSourceGuideV2Registry templates = InstrumentationSourceGuideV2Registry.official();
        var catalog = recipes.catalog();

        assertSource(catalog.sources(), "quick_start", Support.SUPPORTED, SourceKind.QUICK_START);
        for (String id : List.of(
                "java",
                "dotnet",
                "nodejs",
                "python",
                "php",
                "go",
                "ruby",
                "rust",
                "elixir",
                "swift",
                "cpp")) {
            assertSource(catalog.sources(), id, id.matches("ruby|rust|elixir|swift|cpp")
                    ? Support.PREVIEW : Support.SUPPORTED, SourceKind.APPLICATION);
        }
        assertSource(
                catalog.sources(), "other_languages", Support.PREVIEW, SourceKind.APPLICATION);
        for (String id : List.of(
                "hertzbeat_hybrid_collector",
                "opentelemetry_collector",
                "hertzbeat_host_metrics",
                "hertzbeat_prometheus",
                "hertzbeat_file_logs")) {
            assertSource(catalog.sources(), id, Support.SUPPORTED, SourceKind.EXISTING_OPENTELEMETRY);
        }
        assertSource(
                catalog.sources(), "logstash", Support.PREVIEW, SourceKind.EXISTING_OPENTELEMETRY);
        assertSource(
                catalog.sources(), "vector", Support.PREVIEW, SourceKind.EXISTING_OPENTELEMETRY);

        SourceEntry logstash = requireSource(catalog.sources(), "logstash");
        assertEquals(Capability.UNSUPPORTED, logstash.signals().metrics());
        assertEquals(Capability.PREVIEW, logstash.signals().logs());
        assertEquals(Capability.UNSUPPORTED, logstash.signals().traces());

        SourceEntry fluentBit = requireSource(catalog.sources(), "fluent_bit");
        assertEquals(Support.UNSUPPORTED, fluentBit.support());
        assertEquals(List.of(), fluentBit.recipeIds());
        assertEquals(null, fluentBit.sourceKind());
        assertEquals(Capability.UNSUPPORTED, fluentBit.signals().metrics());
        assertEquals(Capability.UNSUPPORTED, fluentBit.signals().logs());
        assertEquals(Capability.UNSUPPORTED, fluentBit.signals().traces());

        Set<String> recipeIds = recipes.catalog().recipes().stream()
                .map(recipe -> recipe.id())
                .collect(java.util.stream.Collectors.toSet());
        for (SourceEntry source : catalog.sources()) {
            assertTrue(source.groupIds().stream().allMatch(groupId -> catalog.groups().stream()
                    .anyMatch(group -> group.id().equals(groupId))));
            if (source.support() == Support.UNSUPPORTED) {
                assertTrue(source.recipeIds().isEmpty());
                assertEquals(null, source.sourceKind());
                continue;
            }
            assertFalse(source.recipeIds().isEmpty());
            for (String recipeId : source.recipeIds()) {
                assertTrue(recipeIds.contains(recipeId), recipeId);
                assertEquals(
                        source.sourceKind(),
                        recipes.requireRecipe(source.sourceKind(), recipeId).kind());
                if (source.sourceKind() == SourceKind.EXISTING_OPENTELEMETRY) {
                    assertTrue(templates.supports(recipeId), recipeId);
                }
            }
        }
    }

    @Test
    void derivesApplicationSignalsFromReferencedRecipeCapabilities() {
        InstrumentationCatalogV2Service recipes =
                new InstrumentationCatalogV2Service(new InstrumentationCatalogService());
        var sources = recipes.catalog().sources();

        assertSignals(requireSource(sources, "nodejs"), Capability.SUPPORTED,
                Capability.UNSUPPORTED, Capability.SUPPORTED);
        assertSignals(requireSource(sources, "php"), Capability.UNSUPPORTED,
                Capability.UNSUPPORTED, Capability.SUPPORTED);
        assertSignals(requireSource(sources, "python"), Capability.SUPPORTED,
                Capability.PREVIEW, Capability.SUPPORTED);
        assertSignals(requireSource(sources, "go"), Capability.SUPPORTED,
                Capability.PREVIEW, Capability.SUPPORTED);
        for (String id : List.of("other_languages", "ruby", "rust", "elixir", "swift", "cpp")) {
            assertSignals(requireSource(sources, id), Capability.PREVIEW,
                    Capability.PREVIEW, Capability.PREVIEW);
            assertEquals(Support.PREVIEW, requireSource(sources, id).support());
        }
    }

    private void assertSource(
            List<SourceEntry> sources, String id, Support support, SourceKind sourceKind) {
        SourceEntry source = requireSource(sources, id);
        assertEquals(support, source.support());
        assertEquals(sourceKind, source.sourceKind());
        assertFalse(source.recipeIds().isEmpty());
        assertNotNull(source.iconKey());
    }

    private SourceEntry requireSource(List<SourceEntry> sources, String id) {
        return sources.stream()
                .filter(source -> source.id().equals(id))
                .findFirst()
                .orElseThrow();
    }

    private void assertSignals(
            SourceEntry source, Capability metrics, Capability logs, Capability traces) {
        assertEquals(metrics, source.signals().metrics());
        assertEquals(logs, source.signals().logs());
        assertEquals(traces, source.signals().traces());
    }

    private Set<String> fieldNames(JsonNode node) {
        Set<String> names = new HashSet<>();
        node.fieldNames().forEachRemaining(names::add);
        return names;
    }
}
