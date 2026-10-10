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
 * Source contract that keeps definition export workspace lookup at the detail read-model boundary.
 */
class EntityDefinitionExportWorkspaceSourceOwnershipTest {

    private static final Path ENTITY_DEFINITION_EXPORT_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionExportService.java");

    @Test
    void definitionExportDelegatesWorkspaceLookupToDetailReadModelBoundary() throws Exception {
        String source = Files.readString(ENTITY_DEFINITION_EXPORT_SERVICE);

        assertFalse(source.contains("EntityWorkspaceAccessService"),
                "Definition export should not own request workspace lookup");
        assertFalse(source.contains("currentRequestWorkspaceId()"),
                "Definition export should not thread raw request workspace ids");
        assertTrue(source.contains("entityDetailReadModelService.loadEntityDto(entityId)"));
        assertFalse(source.contains("loadEntityDto(\n                entityId,"),
                "Definition export should use the detail read-model request-workspace overload");
        assertTrue(source.contains("entityDefinitionMappingService.toEntityDefinition(entityDto)"));
        assertTrue(source.contains("entityDefinitionDocumentRendererService.renderDefinition("));
    }
}
