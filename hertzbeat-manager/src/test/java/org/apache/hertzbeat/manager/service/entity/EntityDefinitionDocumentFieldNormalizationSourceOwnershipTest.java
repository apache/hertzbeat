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
 * Source contract that keeps definition document field fallback helpers out of the broad normalizer.
 */
class EntityDefinitionDocumentFieldNormalizationSourceOwnershipTest {

    private static final Path ENTITY_DEFINITION_NORMALIZATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionNormalizationService.java");
    private static final Path ENTITY_DEFINITION_DOCUMENT_FIELD_NORMALIZATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionDocumentFieldNormalizationService.java");

    @Test
    void definitionNormalizerDelegatesDocumentFieldFallbackAndObjectMapParsing() throws Exception {
        String normalizationSource = Files.readString(ENTITY_DEFINITION_NORMALIZATION_SERVICE);
        String documentFieldSource = Files.readString(ENTITY_DEFINITION_DOCUMENT_FIELD_NORMALIZATION_SERVICE);

        assertTrue(normalizationSource.contains(
                "private final EntityDefinitionDocumentFieldNormalizationService entityDefinitionDocumentFieldNormalizationService"),
                "Definition document field helpers should live behind a narrow normalization boundary");
        assertTrue(normalizationSource.contains(
                "entityDefinitionDocumentFieldNormalizationService.resolveDefinitionApiVersion("));
        assertTrue(normalizationSource.contains(
                "entityDefinitionDocumentFieldNormalizationService.resolveDefinitionSpecMap(root)"));
        assertTrue(normalizationSource.contains(
                "entityDefinitionDocumentFieldNormalizationService.resolveDefinitionTelemetryMap(specMap)"));
        assertFalse(normalizationSource.contains(
                "entityDefinitionDocumentFieldNormalizationService.toObjectMap(root.get(\"spec\"))"),
                "Raw spec node selection should stay inside the document-field boundary");
        assertFalse(normalizationSource.contains(
                "entityDefinitionDocumentFieldNormalizationService.toObjectMap(specMap.get(\"telemetry\"))"),
                "Raw telemetry node selection should stay inside the document-field boundary");
        assertFalse(normalizationSource.contains(
                "entityDefinitionDocumentFieldNormalizationService.firstNonNull("),
                "Document fallback selection should stay inside narrower definition envelope boundaries");
        assertFalse(normalizationSource.contains("private Map<String, Object> toObjectMap("),
                "Object-map shaping should not live in the broad definition normalizer");
        assertFalse(normalizationSource.contains("private String asText("),
                "Text trimming should not live in the broad definition normalizer");
        assertFalse(normalizationSource.contains("private Object firstNonNull("),
                "Document fallback selection should not live in the broad definition normalizer");
        assertFalse(normalizationSource.contains("private String defaultText("),
                "Api-version alias defaulting should not live in the broad definition normalizer");

        assertTrue(documentFieldSource.contains("public Map<String, Object> toObjectMap("));
        assertTrue(documentFieldSource.contains("public String asText("));
        assertTrue(documentFieldSource.contains("public Object firstNonNull("));
        assertTrue(documentFieldSource.contains("public String defaultText("));
        assertTrue(documentFieldSource.contains("public String resolveDefinitionApiVersion("));
        assertTrue(documentFieldSource.contains("public Map<String, Object> resolveDefinitionSpecMap("));
        assertTrue(documentFieldSource.contains("public Map<String, Object> resolveDefinitionTelemetryMap("));
    }
}
