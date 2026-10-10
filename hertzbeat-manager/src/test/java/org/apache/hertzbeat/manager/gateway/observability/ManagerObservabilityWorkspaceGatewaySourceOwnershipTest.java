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

package org.apache.hertzbeat.manager.gateway.observability;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/**
 * Source contract that keeps observability-facing entity lookups behind manager query boundaries.
 */
class ManagerObservabilityWorkspaceGatewaySourceOwnershipTest {

    private static final Path MANAGER_OBSERVABILITY_WORKSPACE_QUERY_GATEWAY = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/gateway/observability/"
                    + "ManagerObservabilityWorkspaceQueryGateway.java");

    @Test
    void workspaceGatewayDelegatesEntityLookupsToQueryBoundaries() throws Exception {
        String source = Files.readString(MANAGER_OBSERVABILITY_WORKSPACE_QUERY_GATEWAY);

        assertFalse(source.contains("import org.apache.hertzbeat.manager.dao.EntityIdentityDao"),
                "Observability workspace gateway should not import the entity identity DAO directly");
        assertFalse(source.contains("import org.apache.hertzbeat.manager.dao.ObserveEntityDao"),
                "Observability workspace gateway should not import the entity catalog DAO directly");
        assertFalse(source.contains("import org.apache.hertzbeat.manager.dao.EntityMonitorBindDao"),
                "Observability workspace gateway should not import the entity monitor-bind DAO directly");
        assertFalse(source.contains("private final EntityIdentityDao entityIdentityDao"));
        assertFalse(source.contains("private final ObserveEntityDao observeEntityDao"));
        assertFalse(source.contains("private final EntityMonitorBindDao entityMonitorBindDao"));

        assertTrue(source.contains("private final EntityIdentityQueryService entityIdentityQueryService"),
                "Identity lookups should go through the entity identity query boundary");
        assertTrue(source.contains("private final EntityWorkspaceQueryService entityWorkspaceQueryService"),
                "Entity row lookups should go through the entity workspace query boundary");
        assertTrue(source.contains("private final EntityMonitorBindQueryService entityMonitorBindQueryService"),
                "Bind counts should go through the entity monitor-bind query boundary");
        assertTrue(source.contains("entityIdentityQueryService.countDistinctEntityIdsByIdentityKeys(identityKeys)"));
        assertTrue(source.contains("entityIdentityQueryService.findMatchingIdentities(identityKeys, normalizedValues)"));
        assertTrue(source.contains("entityWorkspaceQueryService.findEntitiesByIds(entityIds)"));
        assertTrue(source.contains("entityMonitorBindQueryService.countMonitorBinds(entityId)"));
        assertTrue(source.contains("entityWorkspaceQueryService.findEntityById(entityId)"));
        assertTrue(source.contains("entityIdentityQueryService.findIdentities(entityId)"));
    }
}
