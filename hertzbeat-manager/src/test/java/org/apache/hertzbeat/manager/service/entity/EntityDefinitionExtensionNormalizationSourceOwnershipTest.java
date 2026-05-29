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
 * Source contract that keeps definition integration/extension envelope attachment out of the broad normalizer.
 */
class EntityDefinitionExtensionNormalizationSourceOwnershipTest {

    private static final Path ENTITY_DEFINITION_NORMALIZATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionNormalizationService.java");
    private static final Path ENTITY_DEFINITION_EXTENSION_NORMALIZATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionExtensionNormalizationService.java");

    @Test
    void definitionNormalizerDelegatesIntegrationAndExtensionEnvelopeAttachment() throws Exception {
        String normalizationSource = Files.readString(ENTITY_DEFINITION_NORMALIZATION_SERVICE);
        String extensionSource = Files.readString(ENTITY_DEFINITION_EXTENSION_NORMALIZATION_SERVICE);

        assertTrue(normalizationSource.contains(
                "private final EntityDefinitionExtensionNormalizationService entityDefinitionExtensionNormalizationService"),
                "Definition add-on object-node parsing should live behind a narrow normalization boundary");
        assertTrue(normalizationSource.contains(
                "entityDefinitionExtensionNormalizationService.attachDefinitionAddOns(definition, root, specMap)"));
        assertFalse(normalizationSource.contains("definition.setIntegrations("),
                "Integration envelope attachment should not live in the broad definition normalizer");
        assertFalse(normalizationSource.contains("definition.setExtensions("),
                "Extension envelope attachment should not live in the broad definition normalizer");
        assertFalse(normalizationSource.contains("root.get(\"integrations\"), specMap.get(\"integrations\")"),
                "Integration root/spec fallback should live with the add-on boundary");
        assertFalse(normalizationSource.contains("root.get(\"extensions\"), specMap.get(\"extensions\")"),
                "Extension root/spec fallback should live with the add-on boundary");
        assertFalse(normalizationSource.contains("private Map<String, Object> extractDefinitionObjectNodeMap("),
                "Integration/extension object-node parsing should not live in the broad definition normalizer");

        assertTrue(extensionSource.contains("public void attachDefinitionAddOns("));
        assertTrue(extensionSource.contains("public Map<String, Object> extractDefinitionObjectNodeMap("));
        assertTrue(extensionSource.contains("definition.setIntegrations("));
        assertTrue(extensionSource.contains("definition.setExtensions("));
        assertTrue(extensionSource.contains("firstNonNull("));
        assertTrue(extensionSource.contains("integrations"));
        assertTrue(extensionSource.contains("extensions"));
        assertTrue(extensionSource.contains("private Map<String, Object> toObjectMap("));
        assertTrue(extensionSource.contains("objectMap.isEmpty() ? Collections.emptyMap() : objectMap"));
    }
}
