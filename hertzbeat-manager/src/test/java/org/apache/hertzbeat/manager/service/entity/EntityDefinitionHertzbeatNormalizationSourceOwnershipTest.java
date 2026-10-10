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
 * Source contract that keeps HertzBeat-specific definition evidence attachment out of the broad normalizer.
 */
class EntityDefinitionHertzbeatNormalizationSourceOwnershipTest {

    private static final Path ENTITY_DEFINITION_NORMALIZATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionNormalizationService.java");
    private static final Path ENTITY_DEFINITION_HERTZBEAT_NORMALIZATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionHertzbeatNormalizationService.java");

    @Test
    void definitionNormalizerDelegatesHertzBeatEvidenceAttachment() throws Exception {
        String normalizationSource = Files.readString(ENTITY_DEFINITION_NORMALIZATION_SERVICE);
        String hertzbeatSource = Files.readString(ENTITY_DEFINITION_HERTZBEAT_NORMALIZATION_SERVICE);

        assertTrue(normalizationSource.contains(
                "private final EntityDefinitionHertzbeatNormalizationService entityDefinitionHertzbeatNormalizationService"),
                "HertzBeat evidence extraction should live behind a narrow normalization boundary");
        assertTrue(normalizationSource.contains(
                "entityDefinitionHertzbeatNormalizationService.attachDefinitionHertzbeat(definition, root, specMap)"));
        assertFalse(normalizationSource.contains("definition.setHertzbeat("),
                "HertzBeat evidence envelope attachment should not stay in the broad definition normalizer");
        assertFalse(normalizationSource.contains("root.get(\"hertzbeat\"), specMap.get(\"hertzbeat\")"),
                "HertzBeat root/spec fallback should live with the HertzBeat evidence boundary");
        assertFalse(normalizationSource.contains("root.get(\"ci-pipeline-fingerprints\")"),
                "Legacy pipeline fallback should live with the HertzBeat evidence boundary");

        assertFalse(normalizationSource.contains("private EntityDefinition.Hertzbeat extractDefinitionHertzbeat("),
                "HertzBeat evidence extraction should not stay in the broad definition normalizer");
        assertFalse(normalizationSource.contains("private List<EntityDefinition.CodeLocation> extractDefinitionCodeLocations("),
                "Code-location extraction should live with the HertzBeat evidence boundary");
        assertFalse(normalizationSource.contains("private List<EntityDefinition.SavedQuery> extractDefinitionSavedQueries("),
                "Saved-query extraction should live with the HertzBeat evidence boundary");
        assertFalse(normalizationSource.contains("private EntityDefinition.PerformanceData extractDefinitionPerformanceData("),
                "Performance-data extraction should live with the HertzBeat evidence boundary");
        assertFalse(normalizationSource.contains("private EntityDefinition.Pipelines extractDefinitionPipelines("),
                "Pipeline extraction should live with the HertzBeat evidence boundary");
        assertFalse(normalizationSource.contains("private boolean hasHertzbeatContent("),
                "HertzBeat content checks should live with the HertzBeat evidence boundary");

        assertTrue(hertzbeatSource.contains("public void attachDefinitionHertzbeat("));
        assertTrue(hertzbeatSource.contains("definition.setHertzbeat("));
        assertTrue(hertzbeatSource.contains("firstNonNull("));
        assertTrue(hertzbeatSource.contains("hertzbeat"));
        assertTrue(hertzbeatSource.contains("ci-pipeline-fingerprints"));
        assertTrue(hertzbeatSource.contains("public EntityDefinition.Hertzbeat extractDefinitionHertzbeat("));
        assertTrue(hertzbeatSource.contains("private List<EntityDefinition.CodeLocation> extractDefinitionCodeLocations("));
        assertTrue(hertzbeatSource.contains("private List<EntityDefinition.SavedQuery> extractDefinitionSavedQueries("));
        assertTrue(hertzbeatSource.contains("private EntityDefinition.PerformanceData extractDefinitionPerformanceData("));
        assertTrue(hertzbeatSource.contains("private EntityDefinition.Pipelines extractDefinitionPipelines("));
        assertTrue(hertzbeatSource.contains("private boolean hasHertzbeatContent("));
    }
}
