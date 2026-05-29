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

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for canonical entity definition normalization extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityDefinitionNormalizationServiceTest {

    @Mock
    private EntityRelationService entityRelationService;

    private EntityDefinitionNormalizationService normalizationService;

    @BeforeEach
    void setUp() {
        normalizationService = new EntityDefinitionNormalizationService(
                new EntityDefinitionDocumentFieldNormalizationService(),
                new EntityDefinitionMetadataNormalizationService(),
                new EntityDefinitionSpecNormalizationService(),
                new EntityDefinitionExtensionNormalizationService(),
                new EntityDefinitionTypeResolverService(),
                new EntityDefinitionTelemetryNormalizationService(),
                new EntityDefinitionRelationNormalizationService(entityRelationService),
                new EntityDefinitionHertzbeatNormalizationService());
    }

    @Test
    void normalizeDefinitionPreservesLegacyAliasesAndRealEvidenceOnly() {
        when(entityRelationService.buildEntityReference(9201L)).thenReturn("service:commerce/orders-worker");
        Map<String, Object> record = Map.of(
                "schema-version", "hertzbeat/v1",
                "dd-service", "checkout-api",
                "team", "payments",
                "labels", Map.of("env", "prod", "tier", "edge"),
                "ci-pipeline-fingerprints", List.of("buildkite:checkout-main"),
                "spec", Map.of(
                        "type", "service",
                        "namespace", "commerce",
                        "environment", "prod",
                        "links", Map.of("runbook", "https://runbooks/checkout"),
                        "telemetry", Map.of(
                                "identities", List.of(Map.of(
                                        "key", "service.name",
                                        "value", "checkout-api",
                                        "type", "otel",
                                        "priority", 100,
                                        "primary", true)),
                                "monitors", List.of(Map.of(
                                        "monitorId", 42,
                                        "status", "active",
                                        "score", 91,
                                        "matchContext", Map.of("service.name", List.of("checkout-api"))))),
                        "relations", List.of(Map.of(
                                "targetEntityId", 9201,
                                "relationType", "calls",
                                "attributes", Map.of("protocol", "grpc"))),
                        "dependsOn", List.of("datastore:commerce/orders-db"))
        );

        EntityDefinition definition = normalizationService.normalizeDefinition(record);

        assertEquals("hertzbeat/v1", definition.getApiVersion());
        assertEquals("service", definition.getKind());
        assertEquals("checkout-api", definition.getMetadata().getName());
        assertEquals("commerce", definition.getMetadata().getNamespace());
        assertEquals("payments", definition.getMetadata().getOwner());
        assertEquals(Map.of("env", "prod", "tier", "edge"), definition.getMetadata().getLabels());
        assertEquals(Set.of("env:prod", "tier:edge"), Set.copyOf(definition.getMetadata().getTags()));
        assertEquals("manual", definition.getSpec().getSource());
        assertEquals("prod", definition.getSpec().getEnvironment());
        assertEquals("https://runbooks/checkout", definition.getSpec().getRunbook());
        assertEquals("checkout-api", definition.getSpec().getTelemetry().getIdentities().getFirst().getValue());
        assertEquals(42L, definition.getSpec().getTelemetry().getMonitors().getFirst().getMonitorId());
        assertEquals(List.of("service:commerce/orders-worker", "datastore:commerce/orders-db"), definition.getSpec().getDependsOn());
        assertEquals("grpc", definition.getSpec().getRelations().getFirst().getAttributes().get("protocol"));
        assertEquals(List.of("buildkite:checkout-main"), definition.getHertzbeat().getPipelines().getFingerprints());
        assertEquals(Map.of(), definition.getIntegrations());
        assertEquals(Map.of(), definition.getExtensions());
    }

    @Test
    void normalizeDefinitionKeepsCanonicalApiShapeAndHertzBeatBlocks() {
        Map<String, Object> record = Map.of(
                "apiVersion", "hertzbeat/v1",
                "kind", "api",
                "metadata", Map.of(
                        "name", "checkout-public",
                        "contacts", Map.of("slack", "#checkout-ops")),
                "spec", Map.of(
                        "type", "graphql",
                        "interface", Map.of(
                                "schema", Map.of("openapi", "3.1.0"),
                                "file_ref", "schemas/checkout.yaml"),
                        "languages", List.of("java", "typescript"),
                        "extensions", Map.of("scorecard", Map.of("level", "gold"))),
                "integrations", "not-an-object",
                "hertzbeat", Map.of(
                        "logs", List.of(Map.of("name", "errors", "query", "level:error")),
                        "performanceData", Map.of("tags", List.of("checkout", "api")))
        );

        EntityDefinition definition = normalizationService.normalizeDefinition(record);

        assertEquals("api", definition.getKind());
        assertEquals("graphql", definition.getSpec().getType());
        assertEquals("schemas/checkout.yaml", definition.getSpec().getApiInterface().getFileRef());
        assertEquals(List.of("java", "typescript"), definition.getSpec().getLanguages());
        assertEquals("#checkout-ops", definition.getMetadata().getContacts().getFirst().getContact());
        assertEquals(Map.of(), definition.getIntegrations());
        assertEquals("gold", ((Map<?, ?>) definition.getExtensions().get("scorecard")).get("level"));
        assertEquals("level:error", definition.getHertzbeat().getLogs().getFirst().getQuery());
        assertEquals(List.of("checkout", "api"), definition.getHertzbeat().getPerformanceData().getTags());
    }
}
