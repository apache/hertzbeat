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
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for relation and dependency normalization in entity definitions.
 */
@ExtendWith(MockitoExtension.class)
class EntityDefinitionRelationNormalizationServiceTest {

    @Mock
    private EntityRelationService entityRelationService;

    @Test
    void extractsRelationsAndDependenciesWithDefaultsAndDeduping() {
        EntityDefinitionRelationNormalizationService normalizationService =
                new EntityDefinitionRelationNormalizationService(entityRelationService);
        Map<String, Object> specMap = Map.of(
                "relations", List.of(
                        Map.of(
                                "targetEntityId", "42",
                                "relationType", "calls",
                                "relationSource", "otel",
                                "status", "observed",
                                "score", "91",
                                "description", "checkout invokes payments",
                                "attributes", Map.of("protocol", "grpc")),
                        Map.of("ref", "service:commerce/payments-api"),
                        Map.of("description", "missing target")),
                "dependsOn", List.of(
                        "service:commerce/payments-api",
                        Map.of("id", "43"),
                        Map.of("entityRef", "queue:commerce/orders"),
                        Map.of("name", "missing-ref"))
        );

        List<EntityDefinition.Relation> relations = normalizationService.mergeDefinitionRelations(
                normalizationService.extractDefinitionRelations("relations", specMap),
                normalizationService.extractDefinitionDependsOn(specMap.get("dependsOn")));

        assertEquals(4, relations.size());
        EntityDefinition.Relation call = relations.getFirst();
        assertEquals(42L, call.getTargetEntityId());
        assertEquals("calls", call.getRelationType());
        assertEquals("otel", call.getRelationSource());
        assertEquals("observed", call.getStatus());
        assertEquals(91, call.getScore());
        assertEquals("checkout invokes payments", call.getDescription());
        assertEquals("grpc", call.getAttributes().get("protocol"));

        EntityDefinition.Relation explicitRef = relations.get(1);
        assertEquals("service:commerce/payments-api", explicitRef.getTargetRef());
        assertEquals("depends_on", explicitRef.getRelationType());
        assertEquals("manual", explicitRef.getRelationSource());
        assertEquals("confirmed", explicitRef.getStatus());

        EntityDefinition.Relation directDependency = relations.get(2);
        assertEquals(43L, directDependency.getTargetEntityId());
        assertEquals(100, directDependency.getScore());

        EntityDefinition.Relation referenceDependency = relations.get(3);
        assertEquals("queue:commerce/orders", referenceDependency.getTargetRef());
    }

    @Test
    void extractsReferencesFromTargetRefsBeforeCatalogFallbacks() {
        EntityDefinitionRelationNormalizationService normalizationService =
                new EntityDefinitionRelationNormalizationService(entityRelationService);
        EntityDefinition.Relation directId = new EntityDefinition.Relation();
        directId.setTargetEntityId(9201L);
        EntityDefinition.Relation explicitRef = new EntityDefinition.Relation();
        explicitRef.setTargetEntityId(9202L);
        explicitRef.setTargetRef("database:commerce/orders-db");
        when(entityRelationService.buildEntityReference(9201L)).thenReturn("service:commerce/orders-worker");

        List<String> references = normalizationService.extractRelationReferences(List.of(directId, explicitRef, directId));

        assertEquals(List.of("service:commerce/orders-worker", "database:commerce/orders-db"), references);
    }

    @Test
    void dedupesDependsOnWhenExplicitRelationAlreadyNamesSameTargetReference() {
        EntityDefinitionRelationNormalizationService normalizationService =
                new EntityDefinitionRelationNormalizationService(entityRelationService);
        Map<String, Object> specMap = Map.of(
                "relations", List.of(Map.of(
                        "targetEntityId", "42",
                        "targetRef", "service:commerce/payments-api",
                        "relationType", "depends_on",
                        "relationSource", "definition")),
                "dependsOn", List.of("service:commerce/payments-api")
        );

        List<EntityDefinition.Relation> relations = normalizationService.mergeDefinitionRelations(
                normalizationService.extractDefinitionRelations("relations", specMap),
                normalizationService.extractDefinitionDependsOn(specMap.get("dependsOn")));

        assertEquals(1, relations.size());
        assertEquals(42L, relations.getFirst().getTargetEntityId());
        assertEquals("service:commerce/payments-api", relations.getFirst().getTargetRef());
        assertEquals("definition", relations.getFirst().getRelationSource());
    }

    @Test
    void attachesRelationEnvelopeFromCanonicalAndLegacyFields() {
        EntityDefinitionRelationNormalizationService normalizationService =
                new EntityDefinitionRelationNormalizationService(entityRelationService);
        EntityDefinition.Spec spec = new EntityDefinition.Spec();
        Map<String, Object> specMap = Map.of(
                "dependencies", List.of(Map.of("target", "44", "relationType", "runs_on")),
                "dependsOn", List.of("service:commerce/payments-api")
        );
        when(entityRelationService.buildEntityReference(44L)).thenReturn("host:prod/node-44");

        normalizationService.attachDefinitionRelations(spec, specMap);

        assertEquals(2, spec.getRelations().size());
        assertEquals(44L, spec.getRelations().getFirst().getTargetEntityId());
        assertEquals("runs_on", spec.getRelations().getFirst().getRelationType());
        assertEquals("service:commerce/payments-api", spec.getRelations().get(1).getTargetRef());
        assertEquals(List.of("host:prod/node-44", "service:commerce/payments-api"), spec.getDependsOn());
    }
}
