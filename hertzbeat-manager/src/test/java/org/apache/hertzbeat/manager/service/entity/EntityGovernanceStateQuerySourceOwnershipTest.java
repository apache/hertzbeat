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
 * Source contract that keeps persisted governance-state lookup and mutation behind separate boundaries.
 */
class EntityGovernanceStateQuerySourceOwnershipTest {

    private static final Path ENTITY_GOVERNANCE_STATE_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityGovernanceStateService.java");
    private static final Path ENTITY_GOVERNANCE_STATE_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityGovernanceStateQueryService.java");
    private static final Path ENTITY_GOVERNANCE_STATE_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityGovernanceStateWriteModelService.java");

    @Test
    void governanceStateServiceDelegatesRawStateLookupAndMutationToSeparateBoundaries() throws Exception {
        String stateSource = Files.readString(ENTITY_GOVERNANCE_STATE_SERVICE);

        assertTrue(Files.exists(ENTITY_GOVERNANCE_STATE_QUERY_SERVICE),
                "EntityGovernanceStateQueryService should own raw governance-state storage access");
        assertTrue(Files.exists(ENTITY_GOVERNANCE_STATE_WRITE_MODEL_SERVICE),
                "EntityGovernanceStateWriteModelService should own raw governance-state persistence");
        String querySource = Files.readString(ENTITY_GOVERNANCE_STATE_QUERY_SERVICE);
        String writeModelSource = Files.readString(ENTITY_GOVERNANCE_STATE_WRITE_MODEL_SERVICE);

        assertFalse(stateSource.contains("import org.apache.hertzbeat.manager.dao.EntityGovernanceStateDao"),
                "State DTO mapper should not import the governance-state DAO");
        assertFalse(stateSource.contains("private final EntityGovernanceStateDao entityGovernanceStateDao"),
                "State DTO mapper should not keep the governance-state DAO field");
        assertFalse(stateSource.contains("entityGovernanceStateDao."),
                "State DTO mapper should not call the governance-state DAO directly");
        assertFalse(stateSource.contains("EntityWorkspaceAccessService"),
                "State DTO mapper should not own current request workspace lookup");
        assertFalse(stateSource.contains("currentRequestWorkspaceId()"),
                "State DTO mapper should delegate default request workspace lookup to query/write boundaries");
        assertFalse(stateSource.contains("AuthTokenScopes.DEFAULT_WORKSPACE_ID"),
                "State DTO mapper should not resolve persisted workspace ids directly");
        assertFalse(stateSource.contains("private List<EntityGovernanceState> findGovernanceStates("),
                "Raw list lookup belongs to the query boundary");
        assertFalse(stateSource.contains("private Optional<EntityGovernanceState> findGovernanceState("),
                "Raw single-row lookup belongs to the query boundary");
        assertFalse(stateSource.contains("private EntityGovernanceState findGovernanceStateForWrite("),
                "Raw upsert row lookup belongs to the write-model boundary");
        assertFalse(stateSource.contains("private void deleteGovernanceState("),
                "Raw delete routing belongs to the write-model boundary");
        assertFalse(stateSource.contains("private String resolveGovernanceWorkspaceId("),
                "Persisted workspace id resolution belongs to the write-model boundary");

        assertTrue(stateSource.contains("private final EntityGovernanceStateQueryService entityGovernanceStateQueryService"));
        assertTrue(stateSource.contains(
                "private final EntityGovernanceStateWriteModelService entityGovernanceStateWriteModelService"));
        assertTrue(stateSource.contains("entityGovernanceStateQueryService.findGovernanceStates("));
        assertTrue(stateSource.contains("entityGovernanceStateQueryService.findGovernanceState("));
        assertFalse(stateSource.contains("entityGovernanceStateQueryService.findGovernanceStateForWrite("),
                "Governance-state upsert row lookup should not be owned by the query boundary");
        assertFalse(stateSource.contains("entityGovernanceStateQueryService.saveGovernanceState("),
                "Governance-state saves should not be owned by the query boundary");
        assertFalse(stateSource.contains("entityGovernanceStateQueryService.deleteGovernanceState("),
                "Governance-state deletes should not be owned by the query boundary");
        assertTrue(stateSource.contains("entityGovernanceStateWriteModelService.findGovernanceStateForWrite("));
        assertTrue(stateSource.contains("entityGovernanceStateWriteModelService.saveGovernanceState("));
        assertTrue(stateSource.contains("entityGovernanceStateWriteModelService.deleteGovernanceState("));

        assertTrue(querySource.contains("import org.apache.hertzbeat.manager.dao.EntityGovernanceStateDao"));
        assertTrue(querySource.contains("private final EntityGovernanceStateDao entityGovernanceStateDao"));
        assertTrue(querySource.contains("private final EntityWorkspaceAccessService entityWorkspaceAccessService"));
        assertTrue(querySource.contains("public List<EntityGovernanceState> findGovernanceStates(\n"
                + "            String stateScope, String stateKind, Pageable pageable)"));
        assertTrue(querySource.contains("public List<EntityGovernanceState> findGovernanceStates("));
        assertTrue(querySource.contains("public Optional<EntityGovernanceState> findGovernanceState(\n"
                + "            String stateScope, String stateKind, String stateKey)"));
        assertTrue(querySource.contains("public Optional<EntityGovernanceState> findGovernanceState("));
        assertTrue(querySource.contains("entityWorkspaceAccessService.currentRequestWorkspaceId()"));
        assertFalse(querySource.contains("public EntityGovernanceState findGovernanceStateForWrite("),
                "Query boundary should not own upsert row preparation");
        assertFalse(querySource.contains("public EntityGovernanceState saveGovernanceState("),
                "Query boundary should not own governance-state saves");
        assertFalse(querySource.contains("public void deleteGovernanceState("),
                "Query boundary should not own governance-state deletes");
        assertFalse(querySource.contains("AuthTokenScopes.DEFAULT_WORKSPACE_ID"),
                "Persisted workspace id defaults belong to the write-model boundary");

        assertTrue(writeModelSource.contains("import org.apache.hertzbeat.manager.dao.EntityGovernanceStateDao"));
        assertTrue(writeModelSource.contains("private final EntityGovernanceStateDao entityGovernanceStateDao"));
        assertTrue(writeModelSource.contains("private final EntityWorkspaceAccessService entityWorkspaceAccessService"));
        assertTrue(writeModelSource.contains("public EntityGovernanceState findGovernanceStateForWrite(\n"
                + "            String stateScope, String stateKind, String stateKey)"));
        assertTrue(writeModelSource.contains("public EntityGovernanceState findGovernanceStateForWrite("));
        assertTrue(writeModelSource.contains("public EntityGovernanceState saveGovernanceState("));
        assertTrue(writeModelSource.contains("public void deleteGovernanceState(\n"
                + "            String stateScope, String stateKind, String stateKey)"));
        assertTrue(writeModelSource.contains("public void deleteGovernanceState("));
        assertTrue(writeModelSource.contains("entityWorkspaceAccessService.currentRequestWorkspaceId()"));
        assertTrue(writeModelSource.contains("AuthTokenScopes.DEFAULT_WORKSPACE_ID"));
    }
}
