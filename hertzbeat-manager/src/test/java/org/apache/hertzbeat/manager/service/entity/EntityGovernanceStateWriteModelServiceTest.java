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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.EntityGovernanceState;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.dao.EntityGovernanceStateDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for raw persisted governance-state write ownership and workspace routing.
 */
@ExtendWith(MockitoExtension.class)
class EntityGovernanceStateWriteModelServiceTest {

    @InjectMocks
    private EntityGovernanceStateWriteModelService entityGovernanceStateWriteModelService;

    @Mock
    private EntityGovernanceStateDao entityGovernanceStateDao;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Test
    void findGovernanceStateForWriteUsesCurrentRequestWorkspaceForDefaultCall() {
        EntityGovernanceState existing = EntityGovernanceState.builder()
                .stateScope("definition")
                .stateKind("resume")
                .stateKey("resume-1")
                .workspaceId("team-a")
                .build();
        when(entityWorkspaceAccessService.currentRequestWorkspaceId()).thenReturn("team-a");
        when(entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                "definition", "resume", "resume-1", "team-a")).thenReturn(Optional.of(existing));

        EntityGovernanceState state = entityGovernanceStateWriteModelService.findGovernanceStateForWrite(
                "definition", "resume", "resume-1");

        assertEquals(existing, state);
        verify(entityWorkspaceAccessService).currentRequestWorkspaceId();
        verify(entityGovernanceStateDao, never())
                .findByStateScopeAndStateKindAndStateKey("definition", "resume", "resume-1");
    }

    @Test
    void findGovernanceStateForWriteDefaultsWorkspaceWhenNoScopedRowExists() {
        when(entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKey(
                "definition", "resume", "resume-1")).thenReturn(Optional.empty());

        EntityGovernanceState state = entityGovernanceStateWriteModelService.findGovernanceStateForWrite(
                "definition", "resume", "resume-1", null);

        assertEquals(AuthTokenScopes.DEFAULT_WORKSPACE_ID, state.getWorkspaceId());
    }

    @Test
    void saveGovernanceStateFlushesPreparedRow() {
        EntityGovernanceState state = EntityGovernanceState.builder()
                .stateScope("definition")
                .stateKind("template")
                .stateKey("service-template")
                .workspaceId("team-a")
                .build();
        when(entityGovernanceStateDao.saveAndFlush(state)).thenReturn(state);

        EntityGovernanceState saved = entityGovernanceStateWriteModelService.saveGovernanceState(state);

        assertEquals(state, saved);
        verify(entityGovernanceStateDao).saveAndFlush(state);
    }

    @Test
    void deleteGovernanceStateUsesScopedDeleteWhenRequestWorkspaceIsPresent() {
        entityGovernanceStateWriteModelService.deleteGovernanceState(
                "discovery", "activity", "activity-1", "team-a");

        verify(entityGovernanceStateDao).deleteByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                "discovery", "activity", "activity-1", "team-a");
        verify(entityGovernanceStateDao, never())
                .deleteByStateScopeAndStateKindAndStateKey("discovery", "activity", "activity-1");
    }

    @Test
    void deleteGovernanceStateUsesCurrentRequestWorkspaceForDefaultCall() {
        when(entityWorkspaceAccessService.currentRequestWorkspaceId()).thenReturn("team-a");

        entityGovernanceStateWriteModelService.deleteGovernanceState(
                "discovery", "activity", "activity-1");

        verify(entityWorkspaceAccessService).currentRequestWorkspaceId();
        verify(entityGovernanceStateDao).deleteByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                "discovery", "activity", "activity-1", "team-a");
        verify(entityGovernanceStateDao, never())
                .deleteByStateScopeAndStateKindAndStateKey("discovery", "activity", "activity-1");
    }
}
