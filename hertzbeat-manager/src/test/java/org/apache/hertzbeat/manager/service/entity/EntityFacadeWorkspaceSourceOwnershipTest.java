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
 * Source contract that keeps request-workspace lookup with the delegated entity domain boundaries.
 */
class EntityFacadeWorkspaceSourceOwnershipTest {

    private static final Path OBSERVE_ENTITY_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/ObserveEntityServiceImpl.java");

    @Test
    void observeEntityServiceImplDelegatesWorkspaceLookupToBoundaryServices() throws Exception {
        String source = Files.readString(OBSERVE_ENTITY_SERVICE_IMPL);

        assertFalse(source.contains("EntityWorkspaceAccessService"),
                "ObserveEntityServiceImpl should not own request workspace lookup");
        assertFalse(source.contains("currentRequestWorkspaceId()"),
                "ObserveEntityServiceImpl should not thread request workspace ids between boundaries");
        assertTrue(source.contains("entityDetailReadModelService.loadEntityDto(entityId)"));
        assertTrue(source.contains("entityDefinitionDraftService.parseEntityDefinition("));
        assertTrue(source.contains("definitionRequest, entityId)"));
        assertTrue(source.contains("entityDefinitionDraftService.parseEntityDefinitionBundle(definitionRequest)"));
        assertTrue(source.contains("entityDetailObservabilityReadModelService.buildEntityDetail(entityId)"));
        assertTrue(source.contains("entityActivityReadModelService.getDefinitionActivities(entityId, limit)"));
        assertTrue(source.contains("entityCatalogProfileService.getCatalogSuggestions(limit)"));
        assertTrue(source.contains("entityIntegrationHintService.getMonitorBindingCandidates(monitorId)"));
    }
}
