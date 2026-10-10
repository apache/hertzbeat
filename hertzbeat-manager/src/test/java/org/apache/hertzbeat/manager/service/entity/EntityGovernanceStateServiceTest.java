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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.EntityGovernanceState;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceResumeInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceTemplateInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernanceActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernanceEntityRefInfo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

/**
 * Contract for the entity governance-state boundary extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityGovernanceStateServiceTest {

    @InjectMocks
    private EntityGovernanceStateService governanceStateService;

    @Mock
    private EntityGovernanceStateQueryService entityGovernanceStateQueryService;

    @Mock
    private EntityGovernanceStateWriteModelService entityGovernanceStateWriteModelService;

    @Test
    void getDefinitionWorkspaceTemplatesUsesWorkspaceScopedLookupAndMapsContent() {
        EntityGovernanceState template = EntityGovernanceState.builder()
                .stateScope("definition")
                .stateKind("template")
                .stateKey("team-template")
                .stateName("Team template")
                .status("telemetry")
                .workspaceId("team-a")
                .content(JsonUtil.fromJson("""
                        {
                          "format":"yaml",
                          "content":"kind: service",
                          "summary":"Shared service template",
                          "source":"telemetry",
                          "kind":"service"
                        }
                        """))
                .creator("alice")
                .gmtUpdate(LocalDateTime.of(2026, 5, 10, 10, 20))
                .build();
        when(entityGovernanceStateQueryService.findGovernanceStates(
                "definition", "template", PageRequest.of(0, 8), "team-a"))
                .thenReturn(List.of(template));

        List<EntityDefinitionWorkspaceTemplateInfo> templates =
                governanceStateService.getDefinitionWorkspaceTemplates(null, 8, "team-a");

        assertEquals(1, templates.size());
        EntityDefinitionWorkspaceTemplateInfo info = templates.getFirst();
        assertEquals("team-template", info.getId());
        assertEquals("Team template", info.getName());
        assertEquals("yaml", info.getFormat());
        assertEquals("kind: service", info.getContent());
        assertEquals("Shared service template", info.getSummary());
        assertEquals("telemetry", info.getSource());
        assertEquals("service", info.getKind());
        assertEquals("alice", info.getCreator());
        verify(entityGovernanceStateQueryService, never())
                .findGovernanceStates(eq("definition"), eq("template"), any(), isNull());
    }

    @Test
    void getDefinitionWorkspaceTemplatesUsesDefaultQueryWorkspaceBoundary() {
        EntityGovernanceState template = EntityGovernanceState.builder()
                .stateScope("definition")
                .stateKind("template")
                .stateKey("team-template")
                .stateName("Team template")
                .workspaceId("team-a")
                .content(JsonUtil.fromJson("""
                        {
                          "format":"yaml",
                          "content":"kind: service"
                        }
                        """))
                .build();
        when(entityGovernanceStateQueryService.findGovernanceStates(
                "definition", "template", PageRequest.of(0, 8)))
                .thenReturn(List.of(template));

        List<EntityDefinitionWorkspaceTemplateInfo> templates =
                governanceStateService.getDefinitionWorkspaceTemplates(null, 8);

        assertEquals(1, templates.size());
        assertEquals("team-template", templates.getFirst().getId());
        verify(entityGovernanceStateQueryService, never())
                .findGovernanceStates(eq("definition"), eq("template"), any(), eq("team-a"));
    }

    @Test
    void saveDiscoveryGovernanceActivityUsesWorkspaceScopedUpsertAndRestoresSeedBundle() {
        EntityDiscoveryGovernanceActivityInfo activityInfo = new EntityDiscoveryGovernanceActivityInfo();
        activityInfo.setId("activity-1");
        activityInfo.setStatus("success");
        activityInfo.setAction("bulk-adopt-definition");
        activityInfo.setSummary("Adopted into definition workspace");
        activityInfo.setDetail("2 rows seeded");
        activityInfo.setWorkspacePath("/entities/import?format=json&seedActivity=activity-1");
        activityInfo.setSeedDefinitionDraft("[{\"kind\":\"service\"}]");
        activityInfo.setSeedDefinitionFormat("json");
        activityInfo.setSeedDefinitionSource("telemetry");
        activityInfo.setSeedDefinitionCount(2);
        activityInfo.setEntityRefs(List.of(new EntityDiscoveryGovernanceEntityRefInfo(101L, "checkout-api")));
        EntityGovernanceState stateForWrite = new EntityGovernanceState();
        stateForWrite.setWorkspaceId("team-a");
        when(entityGovernanceStateWriteModelService.findGovernanceStateForWrite(
                "discovery", "activity", "activity-1", "team-a")).thenReturn(stateForWrite);
        when(entityGovernanceStateWriteModelService.saveGovernanceState(any(EntityGovernanceState.class))).thenAnswer(invocation -> {
            EntityGovernanceState state = invocation.getArgument(0);
            state.setCreator("alice");
            state.setGmtUpdate(LocalDateTime.of(2026, 5, 10, 10, 25));
            return state;
        });

        EntityDiscoveryGovernanceActivityInfo saved =
                governanceStateService.saveDiscoveryGovernanceActivity(activityInfo, "team-a");

        ArgumentCaptor<EntityGovernanceState> captor = ArgumentCaptor.forClass(EntityGovernanceState.class);
        verify(entityGovernanceStateWriteModelService).saveGovernanceState(captor.capture());
        EntityGovernanceState persisted = captor.getValue();
        assertEquals("team-a", persisted.getWorkspaceId());
        assertEquals("discovery", persisted.getStateScope());
        assertEquals("activity", persisted.getStateKind());
        assertEquals("activity-1", persisted.getStateKey());
        assertEquals("Adopted into definition workspace", persisted.getStateName());
        assertEquals("json", persisted.getContent().get("seedDefinitionFormat").asText());
        assertEquals(101L, persisted.getContent().get("entityRefs").get(0).get("entityId").asLong());
        assertEquals("activity-1", saved.getId());
        assertEquals("bulk-adopt-definition", saved.getAction());
        assertEquals("telemetry", saved.getSeedDefinitionSource());
        assertEquals(2, saved.getSeedDefinitionCount());
        assertEquals(101L, saved.getEntityRefs().getFirst().getEntityId());
        assertEquals("alice", saved.getCreator());
    }

    @Test
    void saveDiscoveryGovernanceActivityUsesDefaultWriteWorkspaceBoundary() {
        EntityDiscoveryGovernanceActivityInfo activityInfo = new EntityDiscoveryGovernanceActivityInfo();
        activityInfo.setId("activity-1");
        activityInfo.setStatus("success");
        activityInfo.setSummary("Adopted into definition workspace");
        EntityGovernanceState stateForWrite = new EntityGovernanceState();
        when(entityGovernanceStateWriteModelService.findGovernanceStateForWrite(
                "discovery", "activity", "activity-1")).thenReturn(stateForWrite);
        when(entityGovernanceStateWriteModelService.saveGovernanceState(any(EntityGovernanceState.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        EntityDiscoveryGovernanceActivityInfo saved =
                governanceStateService.saveDiscoveryGovernanceActivity(activityInfo);

        assertEquals("activity-1", saved.getId());
        verify(entityGovernanceStateWriteModelService).findGovernanceStateForWrite(
                "discovery", "activity", "activity-1");
        verify(entityGovernanceStateWriteModelService, never()).findGovernanceStateForWrite(
                "discovery", "activity", "activity-1", "team-a");
    }

    @Test
    void resumeReadAndDeleteRespectWorkspaceBoundary() {
        when(entityGovernanceStateQueryService.findGovernanceState(
                "definition", "resume", "missing", "team-a")).thenReturn(Optional.empty());

        EntityDefinitionWorkspaceResumeInfo missing =
                governanceStateService.getDefinitionWorkspaceResume("missing", "team-a");
        governanceStateService.deleteDefinitionWorkspaceResume("resume-1", "team-a");

        assertNull(missing);
        verify(entityGovernanceStateWriteModelService).deleteGovernanceState(
                "definition", "resume", "resume-1", "team-a");
        verify(entityGovernanceStateWriteModelService, never())
                .deleteGovernanceState("definition", "resume", "resume-1", null);
    }

    @Test
    void resumeReadAndDeleteUseDefaultQueryAndWriteWorkspaceBoundaries() {
        when(entityGovernanceStateQueryService.findGovernanceState(
                "definition", "resume", "missing")).thenReturn(Optional.empty());

        EntityDefinitionWorkspaceResumeInfo missing =
                governanceStateService.getDefinitionWorkspaceResume("missing");
        governanceStateService.deleteDefinitionWorkspaceResume("resume-1");

        assertNull(missing);
        verify(entityGovernanceStateWriteModelService).deleteGovernanceState(
                "definition", "resume", "resume-1");
        verify(entityGovernanceStateWriteModelService, never())
                .deleteGovernanceState("definition", "resume", "resume-1", "team-a");
    }
}
