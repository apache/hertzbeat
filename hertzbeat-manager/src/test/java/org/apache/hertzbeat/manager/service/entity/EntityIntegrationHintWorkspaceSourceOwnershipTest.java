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
 * Source contract that keeps raw request-workspace lookup at the workspace access boundary.
 */
class EntityIntegrationHintWorkspaceSourceOwnershipTest {

    private static final Path ENTITY_INTEGRATION_HINT_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityIntegrationHintService.java");
    private static final Path ENTITY_IDENTITY_RESOLUTION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityIdentityResolutionService.java");

    @Test
    void integrationHintsDelegateWorkspaceLookupToIdentityResolutionAndWorkspaceAccessBoundaries() throws Exception {
        String hintSource = Files.readString(ENTITY_INTEGRATION_HINT_SERVICE);
        String identitySource = Files.readString(ENTITY_IDENTITY_RESOLUTION_SERVICE);

        assertFalse(hintSource.contains("EntityWorkspaceAccessService"),
                "Integration hints should not own request workspace lookup");
        assertFalse(hintSource.contains("currentRequestWorkspaceId()"),
                "Integration hints should not thread raw request workspace ids");
        assertTrue(hintSource.contains("entityIdentityResolutionService.resolveMonitorBindingCandidates(monitor)"));
        assertFalse(hintSource.contains("resolveMonitorBindingCandidates(monitor,"),
                "Integration hints should use the identity resolution request-workspace overload");

        assertTrue(identitySource.contains("EntityWorkspaceAccessService"));
        assertFalse(identitySource.contains("entityWorkspaceAccessService.currentRequestWorkspaceId()"),
                "Identity resolution should not own default request workspace lookup");
        assertTrue(identitySource.contains("resolveMonitorBindingCandidates(Monitor monitor)"));
        assertTrue(identitySource.contains("entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace("));
        assertTrue(identitySource.contains("entityWorkspaceAccessService.findAccessibleEntitiesByIds("));
    }
}
