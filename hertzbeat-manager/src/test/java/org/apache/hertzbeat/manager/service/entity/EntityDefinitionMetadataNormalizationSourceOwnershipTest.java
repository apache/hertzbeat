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
 * Source contract that keeps entity definition metadata extraction out of the broad normalizer.
 */
class EntityDefinitionMetadataNormalizationSourceOwnershipTest {

    private static final Path ENTITY_DEFINITION_NORMALIZATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionNormalizationService.java");
    private static final Path ENTITY_DEFINITION_METADATA_NORMALIZATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionMetadataNormalizationService.java");

    @Test
    void definitionNormalizerDelegatesMetadataAndRunbookExtraction() throws Exception {
        String normalizationSource = Files.readString(ENTITY_DEFINITION_NORMALIZATION_SERVICE);
        String metadataSource = Files.readString(ENTITY_DEFINITION_METADATA_NORMALIZATION_SERVICE);

        assertTrue(normalizationSource.contains(
                "private final EntityDefinitionMetadataNormalizationService entityDefinitionMetadataNormalizationService"),
                "Definition metadata extraction should live behind a narrow normalization boundary");
        assertTrue(normalizationSource.contains(
                "entityDefinitionMetadataNormalizationService.extractDefinitionMetadata(root, specMap)"));
        assertTrue(normalizationSource.contains(
                "entityDefinitionMetadataNormalizationService.extractDefinitionRunbook(root, specMap)"));

        assertFalse(normalizationSource.contains("private Map<String, String> extractDefinitionLabels("),
                "Label extraction should live with the metadata normalization boundary");
        assertFalse(normalizationSource.contains("private List<String> extractDefinitionTags("),
                "Tag extraction should live with the metadata normalization boundary");
        assertFalse(normalizationSource.contains("private List<String> toDefinitionTags("),
                "Label-to-tag fallback should live with the metadata normalization boundary");
        assertFalse(normalizationSource.contains("private String extractRunbook("),
                "Runbook extraction should live with the metadata normalization boundary");
        assertFalse(normalizationSource.contains("private List<EntityDefinition.Link> extractDefinitionLinks("),
                "Link extraction should live with the metadata normalization boundary");
        assertFalse(normalizationSource.contains("private List<EntityDefinition.Contact> extractDefinitionContacts("),
                "Contact extraction should live with the metadata normalization boundary");
        assertFalse(normalizationSource.contains("private List<EntityDefinition.OwnerRef> extractDefinitionOwnerRefs("),
                "Additional owner extraction should live with the metadata normalization boundary");

        assertTrue(metadataSource.contains("public EntityDefinition.Metadata extractDefinitionMetadata("));
        assertTrue(metadataSource.contains("public String extractDefinitionRunbook("));
        assertTrue(metadataSource.contains("private Map<String, String> extractDefinitionLabels("));
        assertTrue(metadataSource.contains("private List<String> extractDefinitionTags("));
        assertTrue(metadataSource.contains("private List<String> toDefinitionTags("));
        assertTrue(metadataSource.contains("private String extractRunbook("));
        assertTrue(metadataSource.contains("private List<EntityDefinition.Link> extractDefinitionLinks("));
        assertTrue(metadataSource.contains("private List<EntityDefinition.Contact> extractDefinitionContacts("));
        assertTrue(metadataSource.contains("private List<EntityDefinition.OwnerRef> extractDefinitionOwnerRefs("));
    }
}
