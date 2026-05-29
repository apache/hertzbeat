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
import org.apache.hertzbeat.manager.pojo.dto.ActionApprovalDraftDecisionInfo;
import org.apache.hertzbeat.manager.pojo.dto.ActionApprovalDraftInfo;
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
 * Contract for non-executing action approval draft persistence.
 */
@ExtendWith(MockitoExtension.class)
class ActionApprovalDraftServiceTest {

    @InjectMocks
    private ActionApprovalDraftService actionApprovalDraftService;

    @Mock
    private EntityGovernanceStateQueryService entityGovernanceStateQueryService;

    @Mock
    private EntityGovernanceStateWriteModelService entityGovernanceStateWriteModelService;

    @Test
    void createApprovalDraftPersistsManualNonExecutingGovernanceState() {
        ActionApprovalDraftInfo request = new ActionApprovalDraftInfo();
        request.setDraftId("approval-draft-suggest-restart-checkout-1");
        request.setActionId("suggest-restart-checkout");
        request.setCatalogId("restart-checkout");
        request.setRisk("high");
        request.setConfirmation(ActionApprovalDraftService.MANUAL_CONFIRMATION);
        request.setExecutionMode(ActionApprovalDraftService.APPROVAL_DRAFT_EXECUTION_MODE);
        request.setExecutionAllowed(false);
        request.setEvidenceHref("/alert?status=firing");
        request.setContext(Map.of("entityId", "service:commerce/checkout", "traceId", "trace-123"));
        EntityGovernanceState stateForWrite = new EntityGovernanceState();
        stateForWrite.setWorkspaceId("team-a");
        when(entityGovernanceStateWriteModelService.findGovernanceStateForWrite(
                ActionApprovalDraftService.ACTION_SCOPE,
                ActionApprovalDraftService.APPROVAL_DRAFT_KIND,
                "approval-draft-suggest-restart-checkout-1",
                "team-a")).thenReturn(stateForWrite);
        when(entityGovernanceStateWriteModelService.saveGovernanceState(any(EntityGovernanceState.class)))
                .thenAnswer(invocation -> {
                    EntityGovernanceState state = invocation.getArgument(0);
                    state.setCreator("alice");
                    state.setGmtUpdate(LocalDateTime.of(2026, 5, 23, 11, 30));
                    return state;
                });

        ActionApprovalDraftInfo saved = actionApprovalDraftService.createApprovalDraft(request, "team-a");

        ArgumentCaptor<EntityGovernanceState> captor = ArgumentCaptor.forClass(EntityGovernanceState.class);
        verify(entityGovernanceStateWriteModelService).saveGovernanceState(captor.capture());
        EntityGovernanceState persisted = captor.getValue();
        assertEquals("actions", persisted.getStateScope());
        assertEquals("approval-draft", persisted.getStateKind());
        assertEquals("approval-draft-suggest-restart-checkout-1", persisted.getStateKey());
        assertEquals("approval-draft-created", persisted.getStatus());
        assertEquals("suggest-restart-checkout", persisted.getContent().get("actionId").asText());
        assertEquals("manual-approval-draft-only", persisted.getContent().get("executionMode").asText());
        assertFalse(persisted.getContent().get("executionAllowed").asBoolean());
        assertEquals("not-executed", persisted.getContent().get("executionState").asText());
        assertEquals("service:commerce/checkout", persisted.getContent().get("context").get("entityId").asText());
        assertEquals("approval-draft-suggest-restart-checkout-1", saved.getDraftId());
        assertEquals("manager-action-approval-draft", saved.getAdapterOwner());
        assertEquals("not-executed", saved.getExecutionState());
        assertFalse(saved.getExecutionAllowed());
        assertEquals("alice", saved.getCreator());
    }

    @Test
    void createApprovalDraftRejectsExecutablePayloads() {
        ActionApprovalDraftInfo request = new ActionApprovalDraftInfo();
        request.setActionId("suggest-restart-checkout");
        request.setCatalogId("restart-checkout");
        request.setConfirmation(ActionApprovalDraftService.MANUAL_CONFIRMATION);
        request.setExecutionMode("execute-now");
        request.setExecutionAllowed(true);

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> actionApprovalDraftService.createApprovalDraft(request, "team-a"));

        assertEquals("Approval draft executionMode must stay manual-only.", error.getMessage());
    }

    @Test
    void listApprovalDraftsReadsWorkspaceScopedGovernanceState() {
        EntityGovernanceState state = EntityGovernanceState.builder()
                .stateScope("actions")
                .stateKind("approval-draft")
                .stateKey("approval-draft-suggest-restart-checkout-1")
                .stateName("suggest-restart-checkout")
                .status("approval-draft-created")
                .workspaceId("team-a")
                .content(JsonUtil.fromJson("""
                        {
                          "actionId":"suggest-restart-checkout",
                          "catalogId":"restart-checkout",
                          "risk":"high",
                          "confirmation":"manual-required",
                          "executionMode":"manual-approval-draft-only",
                          "executionAllowed":false,
                          "executionState":"not-executed",
                          "adapterOwner":"manager-action-approval-draft",
                          "context":{"traceId":"trace-123"}
                        }
                        """))
                .creator("alice")
                .gmtUpdate(LocalDateTime.of(2026, 5, 23, 11, 35))
                .build();
        when(entityGovernanceStateQueryService.findGovernanceStates(
                "actions", "approval-draft", PageRequest.of(0, 8), "team-a"))
                .thenReturn(List.of(state));

        List<ActionApprovalDraftInfo> drafts = actionApprovalDraftService.listApprovalDrafts(8, "team-a");

        assertEquals(1, drafts.size());
        ActionApprovalDraftInfo draft = drafts.getFirst();
        assertEquals("approval-draft-suggest-restart-checkout-1", draft.getDraftId());
        assertEquals("restart-checkout", draft.getCatalogId());
        assertEquals("not-executed", draft.getExecutionState());
        assertFalse(draft.getExecutionAllowed());
        assertEquals("trace-123", draft.getContext().get("traceId"));
        verify(entityGovernanceStateQueryService).findGovernanceStates(
                "actions", "approval-draft", PageRequest.of(0, 8), "team-a");
    }

    @Test
    void decideApprovalDraftPersistsNonExecutingDecisionState() {
        EntityGovernanceState stateForWrite = EntityGovernanceState.builder()
                .stateScope("actions")
                .stateKind("approval-draft")
                .stateKey("approval-draft-suggest-restart-checkout-1")
                .stateName("suggest-restart-checkout")
                .status("approval-draft-created")
                .workspaceId("team-a")
                .content(JsonUtil.fromJson("""
                        {
                          "actionId":"suggest-restart-checkout",
                          "catalogId":"restart-checkout",
                          "risk":"high",
                          "confirmation":"manual-required",
                          "executionMode":"manual-approval-draft-only",
                          "executionAllowed":false,
                          "executionState":"not-executed",
                          "adapterOwner":"manager-action-approval-draft"
                        }
                        """))
                .build();
        when(entityGovernanceStateWriteModelService.findGovernanceStateForWrite(
                "actions", "approval-draft", "approval-draft-suggest-restart-checkout-1", "team-a"))
                .thenReturn(stateForWrite);
        when(entityGovernanceStateWriteModelService.saveGovernanceState(any(EntityGovernanceState.class)))
                .thenAnswer(invocation -> {
                    EntityGovernanceState state = invocation.getArgument(0);
                    state.setCreator("alice");
                    state.setGmtUpdate(LocalDateTime.of(2026, 5, 23, 12, 15));
                    return state;
                });
        ActionApprovalDraftDecisionInfo request = new ActionApprovalDraftDecisionInfo();
        request.setDecision("approved");
        request.setReviewer("alice");
        request.setReason("Evidence reviewed.");
        request.setExecutionAllowed(false);

        ActionApprovalDraftDecisionInfo decision = actionApprovalDraftService.decideApprovalDraft(
                "approval-draft-suggest-restart-checkout-1", request, "team-a");

        ArgumentCaptor<EntityGovernanceState> captor = ArgumentCaptor.forClass(EntityGovernanceState.class);
        verify(entityGovernanceStateWriteModelService).saveGovernanceState(captor.capture());
        EntityGovernanceState persisted = captor.getValue();
        assertEquals("approval-draft-approved", persisted.getStatus());
        assertEquals("approved", persisted.getContent().get("decision").asText());
        assertEquals("alice", persisted.getContent().get("reviewer").asText());
        assertEquals("Evidence reviewed.", persisted.getContent().get("decisionReason").asText());
        assertFalse(persisted.getContent().get("executionAllowed").asBoolean());
        assertEquals("not-executed", persisted.getContent().get("executionState").asText());
        assertEquals("approval-draft-suggest-restart-checkout-1", decision.getDraftId());
        assertEquals("approved", decision.getDecision());
        assertEquals("approval-draft-approved", decision.getState());
        assertFalse(decision.getExecutionAllowed());
        assertEquals("not-executed", decision.getExecutionState());
        assertEquals("manager-action-approval-draft", decision.getAdapterOwner());
    }

    @Test
    void decideApprovalDraftRejectsExecutableDecisions() {
        ActionApprovalDraftDecisionInfo request = new ActionApprovalDraftDecisionInfo();
        request.setDecision("approved");
        request.setExecutionAllowed(true);

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> actionApprovalDraftService.decideApprovalDraft(
                        "approval-draft-suggest-restart-checkout-1", request, "team-a"));

        assertEquals("Approval draft decision can not execute actions.", error.getMessage());
    }
}
