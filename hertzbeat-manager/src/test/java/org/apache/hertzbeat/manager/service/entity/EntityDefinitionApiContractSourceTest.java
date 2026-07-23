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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionRequest;
import org.junit.jupiter.api.Test;

/**
 * Source contract for the existing entity definition HTTP and ownership boundaries.
 */
class EntityDefinitionApiContractSourceTest {

    private static final Path ENTITY_CONTROLLER = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/controller/EntityController.java");
    private static final Path OBSERVE_ENTITY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/ObserveEntityServiceImpl.java");
    private static final Path DEFINITION_DRAFT_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionDraftService.java");
    private static final Path DEFINITION_EXPORT_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionExportService.java");
    private static final Path MUTATION_WORKFLOW_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMutationWorkflowService.java");
    private static final Path DOCUMENT_PARSER_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionDocumentParserService.java");
    private static final Path ACTIVITY_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityActivityWriteModelService.java");
    private static final Path GLOBAL_EXCEPTION_HANDLER = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/support/GlobalExceptionHandler.java");

    @Test
    void definitionRoutesAndRequestShapeRemainStable() throws Exception {
        String controllerSource = Files.readString(ENTITY_CONTROLLER);

        assertTrue(controllerSource.contains("@RequestMapping(path = \"/api/entities\""));
        assertTrue(controllerSource.contains("@PostMapping(\"/definition/parse\")"));
        assertTrue(controllerSource.contains("@PostMapping(\"/{id:\\\\d+}/definition/parse\")"));
        assertTrue(controllerSource.contains("@PostMapping(\"/definition/bundle/parse\")"));
        assertTrue(controllerSource.contains("@PostMapping(\"/definition\")"));
        assertTrue(controllerSource.contains("@PostMapping(\"/definition/bundle\")"));
        assertTrue(controllerSource.contains("@GetMapping(\"/{id:\\\\d+}/definition\")"));
        assertTrue(controllerSource.contains("@PutMapping(\"/{id:\\\\d+}/definition\")"));
        assertTrue(controllerSource.contains("ResponseEntity<Message<EntityDto>> parseEntityDefinition("));
        assertTrue(controllerSource.contains("ResponseEntity<Message<List<EntityDto>>> parseEntityDefinitionBundle("));
        assertTrue(controllerSource.contains("ResponseEntity<Message<Long>> addEntityByDefinition("));
        assertTrue(controllerSource.contains("ResponseEntity<Message<List<Long>>> addEntitiesByDefinitionBundle("));
        assertTrue(controllerSource.contains("ResponseEntity<Message<String>> getEntityDefinition("));
        assertTrue(controllerSource.contains("ResponseEntity<Message<Void>> modifyEntityByDefinition("));
        assertTrue(controllerSource.contains("Message.fail(MONITOR_NOT_EXIST_CODE, \"Entity not exist.\")"));

        assertEquals(
                java.util.List.of("content", "format"),
                Arrays.stream(EntityDefinitionRequest.class.getDeclaredFields())
                        .map(java.lang.reflect.Field::getName)
                        .sorted()
                        .toList());
    }

    @Test
    void parseExportAndMutationOwnershipRemainSafeAndAtomic() throws Exception {
        String facadeSource = Files.readString(OBSERVE_ENTITY_SERVICE);
        String draftSource = Files.readString(DEFINITION_DRAFT_SERVICE);
        String exportSource = Files.readString(DEFINITION_EXPORT_SERVICE);
        String mutationSource = Files.readString(MUTATION_WORKFLOW_SERVICE);
        String parserSource = Files.readString(DOCUMENT_PARSER_SERVICE);
        String activitySource = Files.readString(ACTIVITY_WRITE_MODEL_SERVICE);
        String exceptionHandlerSource = Files.readString(GLOBAL_EXCEPTION_HANDLER);

        assertTrue(facadeSource.contains("@Transactional(rollbackFor = Exception.class)"));
        assertFalse(draftSource.contains("WriteModelService"));
        assertFalse(draftSource.contains("MutationWorkflowService"));
        assertTrue(exportSource.contains("entityDetailReadModelService.loadEntityDto(entityId)"));
        assertTrue(mutationSource.contains("entityWorkspaceAccessService.requireAccessibleEntityForBoundWorkspace(entityId)"));
        assertTrue(mutationSource.indexOf("requireAccessibleEntityForBoundWorkspace(entityId)")
                < mutationSource.indexOf("parseEntityDefinition(definitionRequest, entityId)"));
        assertTrue(mutationSource.contains("entityCoreWriteModelService.createEntities("));
        assertFalse(parserSource.contains("JsonUtil.fromJson(payload"));
        assertFalse(activitySource.contains("defaultText(exception.getMessage()"));
        assertTrue(facadeSource.contains(
                "throw new IllegalArgumentException(\"Entity definition conflicts with existing data.\")"));
        assertTrue(facadeSource.contains(
                "throw new CommonException(\"Entity definition service is temporarily unavailable.\")"));
        assertTrue(exceptionHandlerSource.contains("Message.fail(PARAM_INVALID_CODE, exception.getMessage())"));
        assertTrue(exceptionHandlerSource.contains("Message.fail(FAIL_CODE, exception.getMessage())"));
    }
}
