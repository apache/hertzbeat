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
 * Source contract that keeps raw request-workspace lookup out of mutation workflow choreography.
 */
class EntityMutationWorkflowWorkspaceSourceOwnershipTest {

    private static final Path ENTITY_MUTATION_WORKFLOW_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMutationWorkflowService.java");

    @Test
    void mutationWorkflowDelegatesWorkspaceLookupToWriteAndReadBoundaries() throws Exception {
        String source = Files.readString(ENTITY_MUTATION_WORKFLOW_SERVICE);

        assertTrue(source.contains("entityWorkspaceAccessService.requireAccessibleEntityForBoundWorkspace(entityId)"));
        assertTrue(source.contains("entityWorkspaceAccessService.requireAccessibleEntityForMutation(update.getId())"));
        assertFalse(source.contains("currentRequestWorkspaceId()"),
                "EntityMutationWorkflowService should not thread request workspace ids");
        assertTrue(source.contains("entityDefinitionDraftService.parseEntityDefinition(definitionRequest, null)"));
        assertTrue(source.contains("entityDefinitionDraftService.parseEntityDefinitionBundle(definitionRequest)"));
        assertTrue(source.contains("entityDefinitionDraftService.parseEntityDefinition(definitionRequest, entityId)"));
        assertTrue(source.contains("entityRelationService.replaceRelations(entity.getId(), entityDto.getRelations())"));
        assertTrue(source.contains("entityStatusRefreshService.refreshEntityStatus(entity)"));
        assertTrue(source.contains("entityActivityWriteModelService.recordDefinitionActivity("));
        assertFalse(source.contains("recordDefinitionActivity(")
                && source.contains(", currentRequestWorkspaceId())"));
        assertFalse(source.contains("recordDefinitionActivityFailure(")
                && source.contains(", currentRequestWorkspaceId())"));
        assertFalse(source.contains("recordEntityLifecycleActivity(")
                && source.contains(", currentRequestWorkspaceId())"));
    }
}
