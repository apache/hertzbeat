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
 * Source contract that keeps definition draft orchestration from owning request-workspace lookup.
 */
class EntityDefinitionDraftWorkspaceSourceOwnershipTest {

    private static final Path ENTITY_DEFINITION_DRAFT_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionDraftService.java");
    private static final Path ENTITY_DEFINITION_MAPPING_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionMappingService.java");

    @Test
    void definitionDraftDelegatesDefaultWorkspaceResolutionToMappingBoundary() throws Exception {
        String draftSource = Files.readString(ENTITY_DEFINITION_DRAFT_SERVICE);
        String mappingSource = Files.readString(ENTITY_DEFINITION_MAPPING_SERVICE);

        assertFalse(draftSource.contains("private final EntityWorkspaceAccessService entityWorkspaceAccessService"),
                "Definition draft orchestration should not own request-workspace lookup");
        assertFalse(draftSource.contains("entityWorkspaceAccessService.currentRequestWorkspaceId()"),
                "Definition draft orchestration should not thread raw request workspace ids");

        assertTrue(draftSource.contains("entityDefinitionMappingService.toEntityDto(definition, entityId)"),
                "Default definition drafts should let mapping resolve request workspace");
        assertTrue(draftSource.contains("entityDefinitionMappingService.toEntityDto(definition, entityId, requestWorkspaceId)"),
                "Explicit workspace compatibility should remain available");

        assertTrue(mappingSource.contains("private final EntityWorkspaceAccessService entityWorkspaceAccessService"),
                "Definition mapping should own request-workspace lookup for relation target resolution");
        assertTrue(mappingSource.contains("entityWorkspaceAccessService.currentRequestWorkspaceId()"),
                "Definition mapping should bind default relation mapping to the current request workspace");
    }
}
