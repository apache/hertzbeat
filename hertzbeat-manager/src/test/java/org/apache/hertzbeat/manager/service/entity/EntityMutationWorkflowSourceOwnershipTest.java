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
 * Source contract that keeps mutation workflow sequencing out of the large entity API facade.
 */
class EntityMutationWorkflowSourceOwnershipTest {

    private static final Path OBSERVE_ENTITY_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/ObserveEntityServiceImpl.java");

    @Test
    void observeEntityServiceImplDelegatesMutationWorkflowWithoutWriteStageChoreography() throws Exception {
        String source = Files.readString(OBSERVE_ENTITY_SERVICE_IMPL);

        assertTrue(source.contains("EntityMutationWorkflowService"));
        assertTrue(source.contains("entityMutationWorkflowService.addEntity(entityDto)"));
        assertTrue(source.contains("entityMutationWorkflowService.modifyEntity(entityDto)"));
        assertTrue(source.contains("entityMutationWorkflowService.addEntityByDefinition(definitionRequest)"));
        assertTrue(source.contains("entityMutationWorkflowService.addEntitiesByDefinitionBundle(definitionRequest)"));
        assertTrue(source.contains("entityMutationWorkflowService.modifyEntityByDefinition(entityId, definitionRequest)"));

        assertFalse(source.contains("private long addEntity(EntityDto entityDto, boolean recordLifecycleActivity)"));
        assertFalse(source.contains("private void modifyEntity(EntityDto entityDto, boolean recordLifecycleActivity)"));
        assertFalse(source.contains("SOURCE_MANUAL"));
        assertFalse(source.contains("ACTIVITY_TYPE_DEFINITION_IMPORT"));
        assertFalse(source.contains("ACTIVITY_TYPE_DEFINITION_UPDATE"));
        assertFalse(source.contains("EntityCoreWriteModelService"));
        assertFalse(source.contains("EntityIdentityWriteModelService"));
        assertFalse(source.contains("EntityStatusRefreshService"));
        assertFalse(source.contains("replaceIdentities("));
        assertFalse(source.contains("replaceMonitorBinds("));
        assertFalse(source.contains("replaceRelations("));
        assertFalse(source.contains("refreshEntityStatus("));
        assertFalse(source.contains("recordEntityLifecycleActivity("));
        assertFalse(source.contains("recordDefinitionActivity("));
        assertFalse(source.contains("recordDefinitionActivityFailure("));
    }
}
