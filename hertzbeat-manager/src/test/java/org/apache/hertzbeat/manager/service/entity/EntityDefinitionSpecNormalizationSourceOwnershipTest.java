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
 * Source contract that keeps entity definition spec profile extraction out of the broad normalizer.
 */
class EntityDefinitionSpecNormalizationSourceOwnershipTest {

    private static final Path ENTITY_DEFINITION_NORMALIZATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionNormalizationService.java");
    private static final Path ENTITY_DEFINITION_SPEC_NORMALIZATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionSpecNormalizationService.java");

    @Test
    void definitionNormalizerDelegatesSpecProfileExtraction() throws Exception {
        String normalizationSource = Files.readString(ENTITY_DEFINITION_NORMALIZATION_SERVICE);
        String specSource = Files.readString(ENTITY_DEFINITION_SPEC_NORMALIZATION_SERVICE);

        assertTrue(normalizationSource.contains(
                "private final EntityDefinitionSpecNormalizationService entityDefinitionSpecNormalizationService"),
                "Definition spec profile extraction should live behind a narrow normalization boundary");
        assertTrue(normalizationSource.contains(
                "entityDefinitionSpecNormalizationService.extractDefinitionSpec("));
        assertTrue(normalizationSource.contains(
                "entityDefinitionTypeResolverService.resolveDefinitionSubtype(root, specMap, normalizedKind)"));
        assertTrue(normalizationSource.contains(
                "entityDefinitionMetadataNormalizationService.extractDefinitionRunbook(root, specMap)"));

        assertFalse(normalizationSource.contains("private EntityDefinition.ApiInterface extractDefinitionApiInterface("),
                "API interface extraction should live with the spec normalization boundary");
        assertFalse(normalizationSource.contains("private List<String> extractDefinitionStringList("),
                "String-list extraction should live with the spec normalization boundary");
        assertFalse(normalizationSource.contains("private <T> List<T> defaultList("),
                "Spec list fallback selection should live with the spec normalization boundary");
        assertFalse(normalizationSource.contains("componentOf.size() > 1"),
                "Legacy componentOf system derivation should live with the spec normalization boundary");

        assertTrue(specSource.contains("public EntityDefinition.Spec extractDefinitionSpec("));
        assertTrue(specSource.contains("private EntityDefinition.ApiInterface extractDefinitionApiInterface("));
        assertTrue(specSource.contains("private List<String> extractDefinitionStringList("));
        assertTrue(specSource.contains("private <T> List<T> defaultList("));
        assertTrue(specSource.contains("componentOf.size() > 1"));
        assertTrue(specSource.contains("SOURCE_MANUAL"));
    }
}
