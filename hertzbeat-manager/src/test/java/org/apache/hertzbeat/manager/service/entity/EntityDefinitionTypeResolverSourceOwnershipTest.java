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
 * Source contract that keeps entity definition kind/type resolution out of the broad normalizer.
 */
class EntityDefinitionTypeResolverSourceOwnershipTest {

    private static final Path ENTITY_DEFINITION_NORMALIZATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionNormalizationService.java");
    private static final Path ENTITY_DEFINITION_TYPE_RESOLVER_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionTypeResolverService.java");

    @Test
    void definitionNormalizerDelegatesKindTypeAndSubtypeResolutionToResolverBoundary() throws Exception {
        String normalizationSource = Files.readString(ENTITY_DEFINITION_NORMALIZATION_SERVICE);
        String resolverSource = Files.readString(ENTITY_DEFINITION_TYPE_RESOLVER_SERVICE);

        assertTrue(normalizationSource.contains(
                "private final EntityDefinitionTypeResolverService entityDefinitionTypeResolverService"),
                "Definition normalization should delegate kind/type ownership to the resolver boundary");
        assertTrue(normalizationSource.contains(
                "entityDefinitionTypeResolverService.resolveDefinitionEntityType(root, specMap)"));
        assertTrue(normalizationSource.contains(
                "entityDefinitionTypeResolverService.resolveDefinitionSubtype(root, specMap, normalizedKind)"));

        assertFalse(normalizationSource.contains("SUPPORTED_TYPES"),
                "Supported entity type taxonomy should live in the resolver boundary");
        assertFalse(normalizationSource.contains("private String normalizeEntityTypeFromKind("),
                "Kind alias normalization should live in the resolver boundary");
        assertFalse(normalizationSource.contains("private String resolveDefinitionEntityType("),
                "Entity type resolution should live in the resolver boundary");
        assertFalse(normalizationSource.contains("private String resolveDefinitionSubtype("),
                "Subtype resolution should live in the resolver boundary");
        assertFalse(normalizationSource.contains("private String normalizeSupportedEntityType("),
                "Supported type checks should live in the resolver boundary");

        assertTrue(resolverSource.contains("private static final Set<String> SUPPORTED_TYPES"));
        assertTrue(resolverSource.contains("public String resolveDefinitionEntityType("));
        assertTrue(resolverSource.contains("public String resolveDefinitionSubtype("));
        assertTrue(resolverSource.contains("private String normalizeEntityTypeFromKind("));
        assertTrue(resolverSource.contains("private String normalizeSupportedEntityType("));
        assertTrue(resolverSource.contains("LEGACY_ENTITY_DEFINITION_KIND.equalsIgnoreCase"));
        assertTrue(resolverSource.contains("case KIND_DATASTORE -> TYPE_DATABASE"));
        assertTrue(resolverSource.contains("case KIND_API -> TYPE_API"));
    }
}
