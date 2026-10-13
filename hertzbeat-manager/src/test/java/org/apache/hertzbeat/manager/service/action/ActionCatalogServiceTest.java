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

package org.apache.hertzbeat.manager.service.action;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.EntityGovernanceState;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.ActionCatalogItemInfo;
import org.apache.hertzbeat.manager.service.entity.EntityGovernanceStateQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityGovernanceStateWriteModelService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

/**
 * Contract for durable non-executing action catalog persistence.
 */
@ExtendWith(MockitoExtension.class)
class ActionCatalogServiceTest {

    @InjectMocks
    private ActionCatalogService actionCatalogService;

    @Mock
    private EntityGovernanceStateQueryService entityGovernanceStateQueryService;

    @Mock
    private EntityGovernanceStateWriteModelService entityGovernanceStateWriteModelService;

    @Test
    void saveCatalogItemPersistsManualApprovalOnlyGovernanceState() {
        ActionCatalogItemInfo request = new ActionCatalogItemInfo();
        request.setCatalogId("restart-checkout");
        request.setName("Restart checkout service");
        request.setCategory("remediation");
        request.setScope("service:commerce/checkout");
        request.setOwner("sre");
        request.setRisk("high");
        request.setExecutionMode(ActionCatalogService.APPROVAL_DRAFT_EXECUTION_MODE);
        request.setExecutionAllowed(false);
        request.setMetadata(Map.of("playbook", "checkout-restart", "requiresEvidence", true));
        EntityGovernanceState stateForWrite = new EntityGovernanceState();
        stateForWrite.setWorkspaceId("team-a");
        when(entityGovernanceStateWriteModelService.findGovernanceStateForWrite(
                ActionCatalogService.ACTION_SCOPE,
                ActionCatalogService.CATALOG_KIND,
                "restart-checkout",
                "team-a")).thenReturn(stateForWrite);
        when(entityGovernanceStateWriteModelService.saveGovernanceState(any(EntityGovernanceState.class)))
                .thenAnswer(invocation -> {
                    EntityGovernanceState state = invocation.getArgument(0);
                    state.setCreator("alice");
                    state.setGmtUpdate(LocalDateTime.of(2026, 5, 23, 12, 5));
                    return state;
                });

        ActionCatalogItemInfo saved = actionCatalogService.saveCatalogItem(request, "team-a");

        ArgumentCaptor<EntityGovernanceState> captor = ArgumentCaptor.forClass(EntityGovernanceState.class);
        verify(entityGovernanceStateWriteModelService).saveGovernanceState(captor.capture());
        EntityGovernanceState persisted = captor.getValue();
        assertEquals("actions", persisted.getStateScope());
        assertEquals("catalog-item", persisted.getStateKind());
        assertEquals("restart-checkout", persisted.getStateKey());
        assertEquals("Restart checkout service", persisted.getStateName());
        assertEquals("catalog-item-ready", persisted.getStatus());
        assertEquals("restart-checkout", persisted.getContent().get("catalogId").asText());
        assertEquals("manual-approval-draft-only", persisted.getContent().get("executionMode").asText());
        assertFalse(persisted.getContent().get("executionAllowed").asBoolean());
        assertEquals("manager-action-catalog", persisted.getContent().get("adapterOwner").asText());
        assertEquals("checkout-restart", persisted.getContent().get("metadata").get("playbook").asText());
        assertEquals("manager-action-catalog", saved.getAdapterOwner());
        assertEquals("catalog-item-ready", saved.getStatus());
        assertFalse(saved.getExecutionAllowed());
        assertEquals("alice", saved.getCreator());
    }

    @Test
    void saveCatalogItemRejectsExecutablePayloads() {
        ActionCatalogItemInfo request = new ActionCatalogItemInfo();
        request.setCatalogId("restart-checkout");
        request.setName("Restart checkout service");
        request.setRisk("high");
        request.setExecutionMode("execute-now");
        request.setExecutionAllowed(true);

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> actionCatalogService.saveCatalogItem(request, "team-a"));

        assertEquals("Action catalog item executionMode must stay manual-only.", error.getMessage());
    }

    @Test
    void listCatalogItemsReadsWorkspaceScopedGovernanceState() {
        EntityGovernanceState state = EntityGovernanceState.builder()
                .stateScope("actions")
                .stateKind("catalog-item")
                .stateKey("restart-checkout")
                .stateName("Restart checkout service")
                .status("catalog-item-ready")
                .workspaceId("team-a")
                .content(JsonUtil.fromJson("""
                        {
                          "catalogId":"restart-checkout",
                          "name":"Restart checkout service",
                          "category":"remediation",
                          "scope":"service:commerce/checkout",
                          "owner":"sre",
                          "risk":"high",
                          "executionMode":"manual-approval-draft-only",
                          "executionAllowed":false,
                          "adapterOwner":"manager-action-catalog",
                          "metadata":{"playbook":"checkout-restart"}
                        }
                        """))
                .creator("alice")
                .gmtUpdate(LocalDateTime.of(2026, 5, 23, 12, 10))
                .build();
        when(entityGovernanceStateQueryService.findGovernanceStates(
                "actions", "catalog-item", PageRequest.of(0, 8), "team-a"))
                .thenReturn(List.of(state));

        List<ActionCatalogItemInfo> items = actionCatalogService.listCatalogItems(8, "team-a");

        assertEquals(1, items.size());
        ActionCatalogItemInfo item = items.getFirst();
        assertEquals("restart-checkout", item.getCatalogId());
        assertEquals("Restart checkout service", item.getName());
        assertEquals("manual-approval-draft-only", item.getExecutionMode());
        assertFalse(item.getExecutionAllowed());
        assertEquals("checkout-restart", item.getMetadata().get("playbook"));
        verify(entityGovernanceStateQueryService).findGovernanceStates(
                "actions", "catalog-item", PageRequest.of(0, 8), "team-a");
    }
}
