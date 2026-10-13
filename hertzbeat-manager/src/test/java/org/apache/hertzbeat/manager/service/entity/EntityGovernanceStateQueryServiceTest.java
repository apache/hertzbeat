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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.EntityGovernanceState;
import org.apache.hertzbeat.manager.dao.EntityGovernanceStateDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

/**
 * Contract for raw persisted governance-state query and workspace-scoped read routing.
 */
@ExtendWith(MockitoExtension.class)
class EntityGovernanceStateQueryServiceTest {

    @InjectMocks
    private EntityGovernanceStateQueryService entityGovernanceStateQueryService;

    @Mock
    private EntityGovernanceStateDao entityGovernanceStateDao;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Test
    void findGovernanceStatesUsesCurrentRequestWorkspaceForDefaultCall() {
        EntityGovernanceState template = EntityGovernanceState.builder()
                .stateScope("definition")
                .stateKind("template")
                .stateKey("service-template")
                .workspaceId("team-a")
                .build();
        PageRequest pageRequest = PageRequest.of(0, 8);
        when(entityWorkspaceAccessService.currentRequestWorkspaceId()).thenReturn("team-a");
        when(entityGovernanceStateDao.findAllByStateScopeAndStateKindAndWorkspaceIdOrderByGmtUpdateDescIdDesc(
                "definition", "template", "team-a", pageRequest)).thenReturn(List.of(template));

        List<EntityGovernanceState> states = entityGovernanceStateQueryService.findGovernanceStates(
                "definition", "template", pageRequest);

        assertEquals(List.of(template), states);
        verify(entityWorkspaceAccessService).currentRequestWorkspaceId();
        verify(entityGovernanceStateDao, never())
                .findAllByStateScopeAndStateKindOrderByGmtUpdateDescIdDesc(eq("definition"), eq("template"), any());
    }

    @Test
    void findGovernanceStatesUsesScopedLookupWhenRequestWorkspaceIsPresent() {
        EntityGovernanceState template = EntityGovernanceState.builder()
                .stateScope("definition")
                .stateKind("template")
                .stateKey("service-template")
                .workspaceId("team-a")
                .build();
        PageRequest pageRequest = PageRequest.of(0, 8);
        when(entityGovernanceStateDao.findAllByStateScopeAndStateKindAndWorkspaceIdOrderByGmtUpdateDescIdDesc(
                "definition", "template", "team-a", pageRequest)).thenReturn(List.of(template));

        List<EntityGovernanceState> states = entityGovernanceStateQueryService.findGovernanceStates(
                "definition", "template", pageRequest, "team-a");

        assertEquals(List.of(template), states);
        verify(entityGovernanceStateDao, never())
                .findAllByStateScopeAndStateKindOrderByGmtUpdateDescIdDesc(eq("definition"), eq("template"), any());
    }

    @Test
    void findGovernanceStateUsesUnscopedLookupWhenRequestWorkspaceIsAbsent() {
        EntityGovernanceState resume = EntityGovernanceState.builder()
                .stateScope("definition")
                .stateKind("resume")
                .stateKey("resume-1")
                .workspaceId("default")
                .build();
        when(entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKey(
                "definition", "resume", "resume-1")).thenReturn(Optional.of(resume));

        Optional<EntityGovernanceState> state = entityGovernanceStateQueryService.findGovernanceState(
                "definition", "resume", "resume-1", null);

        assertEquals(Optional.of(resume), state);
        verify(entityGovernanceStateDao, never())
                .findByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                        "definition", "resume", "resume-1", "team-a");
    }

    @Test
    void findGovernanceStateUsesCurrentRequestWorkspaceForDefaultCall() {
        EntityGovernanceState resume = EntityGovernanceState.builder()
                .stateScope("definition")
                .stateKind("resume")
                .stateKey("resume-1")
                .workspaceId("team-a")
                .build();
        when(entityWorkspaceAccessService.currentRequestWorkspaceId()).thenReturn("team-a");
        when(entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                "definition", "resume", "resume-1", "team-a")).thenReturn(Optional.of(resume));

        Optional<EntityGovernanceState> state = entityGovernanceStateQueryService.findGovernanceState(
                "definition", "resume", "resume-1");

        assertEquals(Optional.of(resume), state);
        verify(entityWorkspaceAccessService).currentRequestWorkspaceId();
        verify(entityGovernanceStateDao, never())
                .findByStateScopeAndStateKindAndStateKey("definition", "resume", "resume-1");
    }
}
