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
import java.util.List;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/**
 * Source contract that keeps entity-definition ownership out of the large entity service.
 */
class EntityDefinitionSourceOwnershipTest {

    private static final Path OBSERVE_ENTITY_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/ObserveEntityServiceImpl.java");

    @Test
    void observeEntityServiceImplDelegatesDefinitionBoundariesWithoutStalePrivateHelpers() throws Exception {
        String source = Files.readString(OBSERVE_ENTITY_SERVICE_IMPL);

        assertTrue(source.contains("EntityDefinitionDraftService"));
        assertTrue(source.contains("EntityDefinitionExportService"));
        assertTrue(source.contains("entityDefinitionDraftService.parseEntityDefinition("));
        assertTrue(source.contains("entityDefinitionDraftService.parseEntityDefinition(definitionRequest, entityId)"));
        assertTrue(source.contains("entityDefinitionDraftService.parseEntityDefinitionBundle("));
        assertTrue(source.contains("entityDefinitionDraftService.parseEntityDefinitionBundle(definitionRequest)"));
        assertTrue(source.contains("entityDefinitionExportService.getEntityDefinition(entityId, format)"));
        assertFalse(source.contains("currentRequestWorkspaceId()"));
        assertFalse(source.contains("EntityDefinitionDocumentParserService"));
        assertFalse(source.contains("EntityDefinitionNormalizationService"));
        assertFalse(source.contains("EntityDefinitionMappingService"));
        assertFalse(source.contains("EntityDefinitionDocumentRendererService"));
        assertFalse(source.contains("renderDefinition("));
        assertFalse(source.contains("parseDefinitionRecords("));
        assertFalse(source.contains("parseEntityDefinitionDtos("));
        assertFalse(source.contains("parseDefinitions("));

        List<String> forbiddenHelpers = List.of(
                "normalizeDefinition",
                "toEntityDto",
                "toEntityDefinition",
                "toEntityIdentities",
                "toEntityMonitorBinds",
                "toEntityRelations",
                "extractDefinitionLabels",
                "extractDefinitionLinks",
                "extractDefinitionContacts",
                "extractDefinitionHertzbeat",
                "extractDefinitionIdentities",
                "extractDefinitionRelations",
                "mergeDefinitionRelations",
                "extractRelationReferences",
                "defaultTargetEntityId",
                "extractDefinitionTags",
                "toDefinitionTags",
                "extractRunbook",
                "toEntityLinks",
                "toEntityContacts",
                "toDefinitionLinks",
                "toDefinitionContacts",
                "extractDefinitionObjectNodeMap",
                "extractDefinitionCodeLocations",
                "extractDefinitionSavedQueries",
                "extractDefinitionPerformanceData",
                "extractDefinitionPipelines",
                "hasHertzbeatContent",
                "toDefinitionHertzbeat",
                "toDefinitionApiInterface",
                "toObjectNodeMap",
                "toJsonNode",
                "extractDefinitionApiInterface",
                "extractDefinitionMonitorBinds",
                "extractDefinitionDependsOn",
                "relationSignature",
                "extractDefinitionOwnerRefs",
                "toEntityOwnerRefs",
                "toDefinitionOwnerRefs",
                "extractDefinitionStringList",
                "toObjectMap",
                "toStringMap",
                "toStringListMap",
                "asInteger",
                "asBoolean",
                "asLong",
                "normalizeEntityTypeFromKind",
                "toDefinitionKind",
                "resolveDefinitionEntityType",
                "resolveDefinitionSubtype",
                "normalizeSupportedEntityType",
                "resolveRelationTarget",
                "trimToNull",
                "firstNonNull"
        );
        for (String helper : forbiddenHelpers) {
            Pattern methodDeclaration = Pattern.compile("\\n\\s*private\\s+[^{;=]+\\s+" + helper + "\\s*\\(");
            assertFalse(methodDeclaration.matcher(source).find(),
                    () -> "ObserveEntityServiceImpl should delegate definition helper `" + helper + "`");
        }
    }
}
