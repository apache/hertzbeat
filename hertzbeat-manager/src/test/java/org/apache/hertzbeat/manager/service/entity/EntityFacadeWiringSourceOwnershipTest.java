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
import java.util.Map;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/**
 * Source contract that keeps the decomposed entity facade wired to every M5 boundary service.
 */
class EntityFacadeWiringSourceOwnershipTest {

    private static final Path OBSERVE_ENTITY_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/ObserveEntityServiceImpl.java");

    @Test
    void observeEntityServiceImplInjectsEveryDelegatedBoundaryService() throws Exception {
        String source = Files.readString(OBSERVE_ENTITY_SERVICE_IMPL);

        Map<String, String> requiredServices = Map.ofEntries(
                Map.entry("EntityActivityReadModelService", "entityActivityReadModelService"),
                Map.entry("EntityCatalogProfileService", "entityCatalogProfileService"),
                Map.entry("EntityDeletionWriteModelService", "entityDeletionWriteModelService"),
                Map.entry("EntityDefinitionDraftService", "entityDefinitionDraftService"),
                Map.entry("EntityDefinitionExportService", "entityDefinitionExportService"),
                Map.entry("EntityDetailObservabilityReadModelService", "entityDetailObservabilityReadModelService"),
                Map.entry("EntityDetailReadModelService", "entityDetailReadModelService"),
                Map.entry("EntityEvidenceReadModelService", "entityEvidenceReadModelService"),
                Map.entry("EntityGovernanceWorkflowService", "entityGovernanceWorkflowService"),
                Map.entry("EntityIntegrationHintService", "entityIntegrationHintService"),
                Map.entry("EntityListReadModelService", "entityListReadModelService"),
                Map.entry("EntityMutationWorkflowService", "entityMutationWorkflowService"),
                Map.entry("EntityValidationService", "entityValidationService")
        );
        assertTrue(source.contains("@RequiredArgsConstructor"),
                "ObserveEntityServiceImpl should constructor-wire delegated boundary services");
        assertFalse(source.contains("@Autowired"),
                "ObserveEntityServiceImpl should not hide M5 boundary wiring behind mutable field injection");

        for (Map.Entry<String, String> service : requiredServices.entrySet()) {
            Pattern finalField = Pattern.compile("private\\s+final\\s+"
                    + service.getKey() + "\\s+" + service.getValue() + "\\s*;");
            assertTrue(finalField.matcher(source).find(),
                    () -> "ObserveEntityServiceImpl should constructor-wire delegated boundary service `"
                            + service.getValue() + "`");
        }
    }
}
