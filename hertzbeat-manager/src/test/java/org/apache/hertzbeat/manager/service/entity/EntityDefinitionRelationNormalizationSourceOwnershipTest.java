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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/**
 * Source contract that keeps entity definition relation extraction out of the broad normalizer.
 */
class EntityDefinitionRelationNormalizationSourceOwnershipTest {

    private static final Path ENTITY_DEFINITION_NORMALIZATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionNormalizationService.java");
    private static final Path ENTITY_DEFINITION_RELATION_NORMALIZATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionRelationNormalizationService.java");

    @Test
    void definitionNormalizerDelegatesRelationExtractionAndReferenceProjection() throws Exception {
        String normalizationSource = Files.readString(ENTITY_DEFINITION_NORMALIZATION_SERVICE);
        String relationSource = Files.readString(ENTITY_DEFINITION_RELATION_NORMALIZATION_SERVICE);

        assertTrue(normalizationSource.contains(
                "private final EntityDefinitionRelationNormalizationService entityDefinitionRelationNormalizationService"),
                "Definition relation parsing should live behind a narrow normalization boundary");
        assertTrue(normalizationSource.contains(
                "entityDefinitionRelationNormalizationService.attachDefinitionRelations(spec, specMap)"));
        assertFalse(normalizationSource.contains(
                "entityDefinitionRelationNormalizationService.extractDefinitionRelations("),
                "Relation key selection should live in the relation boundary");
        assertFalse(normalizationSource.contains(
                "entityDefinitionRelationNormalizationService.extractDefinitionDependsOn("),
                "dependsOn projection should live in the relation boundary");
        assertFalse(normalizationSource.contains(
                "entityDefinitionRelationNormalizationService.mergeDefinitionRelations("),
                "Relation dedupe orchestration should live in the relation boundary");
        assertFalse(normalizationSource.contains("spec.setRelations("),
                "Relation attachment should live in the relation boundary");
        assertFalse(normalizationSource.contains("spec.setDependsOn("),
                "Dependency reference attachment should live in the relation boundary");

        assertFalse(normalizationSource.contains(
                "private List<EntityDefinition.Relation> extractDefinitionRelations("),
                "Relation extraction should not stay in the broad definition normalizer");
        assertFalse(normalizationSource.contains(
                "private List<EntityDefinition.Relation> extractDefinitionDependsOn("),
                "Dependency extraction should not stay in the broad definition normalizer");
        assertFalse(normalizationSource.contains(
                "private List<EntityDefinition.Relation> mergeDefinitionRelations("),
                "Relation dedupe should not stay in the broad definition normalizer");
        assertFalse(normalizationSource.contains("private String relationSignature("),
                "Relation dedupe signatures should live with relation normalization");
        assertFalse(normalizationSource.contains("private String buildEntityReference("),
                "Relation reference fallback should live with relation normalization");
        assertFalse(normalizationSource.contains("RELATION_CONFIRMED"),
                "Relation defaults should live with relation extraction");

        assertTrue(relationSource.contains("private static final String SOURCE_MANUAL = \"manual\""));
        assertTrue(relationSource.contains("private static final String RELATION_CONFIRMED = \"confirmed\""));
        assertTrue(relationSource.contains(
                "public void attachDefinitionRelations(EntityDefinition.Spec spec, Map<String, Object> specMap)"));
        assertTrue(relationSource.contains("spec.setRelations(relations)"));
        assertTrue(relationSource.contains("spec.setDependsOn(extractRelationReferences(relations))"));
        assertTrue(relationSource.contains("containsKey(\"dependencies\")"));
        assertTrue(relationSource.contains("public List<EntityDefinition.Relation> extractDefinitionRelations("));
        assertTrue(relationSource.contains("public List<EntityDefinition.Relation> extractDefinitionDependsOn("));
        assertTrue(relationSource.contains("public List<EntityDefinition.Relation> mergeDefinitionRelations("));
        assertTrue(relationSource.contains("public List<String> extractRelationReferences("));
        assertTrue(relationSource.contains("entityRelationService.buildEntityReference(entityId)"));
    }
}
