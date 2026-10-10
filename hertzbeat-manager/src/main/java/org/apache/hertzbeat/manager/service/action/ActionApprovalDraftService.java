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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.EntityGovernanceState;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.apache.hertzbeat.manager.pojo.dto.ActionApprovalDraftDecisionInfo;
import org.apache.hertzbeat.manager.pojo.dto.ActionApprovalDraftInfo;
import org.apache.hertzbeat.manager.service.entity.EntityGovernanceStateQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityGovernanceStateWriteModelService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * Persists suggested-action approval drafts without executing actions.
 */
@Service
public class ActionApprovalDraftService {

    public static final String ACTION_SCOPE = "actions";
    public static final String APPROVAL_DRAFT_KIND = "approval-draft";
    public static final String ADAPTER_OWNER = "manager-action-approval-draft";
    public static final String MANUAL_CONFIRMATION = "manual-required";
    public static final String APPROVAL_DRAFT_EXECUTION_MODE = "manual-approval-draft-only";
    public static final String CREATED_STATE = "approval-draft-created";
    public static final String APPROVED_STATE = "approval-draft-approved";
    public static final String REJECTED_STATE = "approval-draft-rejected";
    public static final String NOT_EXECUTED_STATE = "not-executed";
    public static final String APPROVED_DECISION = "approved";
    public static final String REJECTED_DECISION = "rejected";

    private static final ObjectMapper JSON_MAPPER = JsonMapper.builder().build();

    private final EntityGovernanceStateQueryService entityGovernanceStateQueryService;
    private final EntityGovernanceStateWriteModelService entityGovernanceStateWriteModelService;

    public ActionApprovalDraftService(EntityGovernanceStateQueryService entityGovernanceStateQueryService,
                                      EntityGovernanceStateWriteModelService entityGovernanceStateWriteModelService) {
        this.entityGovernanceStateQueryService = entityGovernanceStateQueryService;
        this.entityGovernanceStateWriteModelService = entityGovernanceStateWriteModelService;
    }

    public ActionApprovalDraftInfo createApprovalDraft(ActionApprovalDraftInfo request) {
        return createApprovalDraft(request, null);
    }

    public ActionApprovalDraftInfo createApprovalDraft(ActionApprovalDraftInfo request, String requestWorkspaceId) {
        validateDraftRequest(request);
        String draftId = defaultText(
                trimToNull(request.getDraftId()),
                "approval-draft-" + trimToNull(request.getActionId()) + "-" + SnowFlakeIdGenerator.generateId());
        EntityGovernanceState state = entityGovernanceStateWriteModelService.findGovernanceStateForWrite(
                ACTION_SCOPE, APPROVAL_DRAFT_KIND, draftId, requestWorkspaceId);
        state.setStateScope(ACTION_SCOPE);
        state.setStateKind(APPROVAL_DRAFT_KIND);
        state.setStateKey(draftId);
        state.setStateName(limitLength(trimToNull(request.getActionId()), 128));
        state.setStatus(CREATED_STATE);
        state.setContent(JSON_MAPPER.valueToTree(toContent(request)));
        return toApprovalDraftInfo(entityGovernanceStateWriteModelService.saveGovernanceState(state));
    }

    public List<ActionApprovalDraftInfo> listApprovalDrafts(int limit) {
        return listApprovalDrafts(limit, null);
    }

    public List<ActionApprovalDraftInfo> listApprovalDrafts(int limit, String requestWorkspaceId) {
        return entityGovernanceStateQueryService.findGovernanceStates(
                        ACTION_SCOPE, APPROVAL_DRAFT_KIND, PageRequest.of(0, normalizeLimit(limit)),
                        requestWorkspaceId)
                .stream()
                .map(this::toApprovalDraftInfo)
                .toList();
    }

    public ActionApprovalDraftDecisionInfo decideApprovalDraft(String draftId,
                                                               ActionApprovalDraftDecisionInfo request,
                                                               String requestWorkspaceId) {
        String normalizedDraftId = trimToNull(draftId);
        validateDecisionRequest(normalizedDraftId, request);
        EntityGovernanceState state = entityGovernanceStateWriteModelService.findGovernanceStateForWrite(
                ACTION_SCOPE, APPROVAL_DRAFT_KIND, normalizedDraftId, requestWorkspaceId);
        if (state.getContent() == null || state.getContent().isNull()) {
            throw new IllegalArgumentException("Approval draft does not exist.");
        }
        Map<String, Object> content = jsonMap(state.getContent());
        content.put("decision", trimToNull(request.getDecision()));
        putIfPresent(content, "decisionReason", trimToNull(request.getReason()));
        putIfPresent(content, "reviewer", trimToNull(request.getReviewer()));
        content.put("executionAllowed", false);
        content.put("executionState", NOT_EXECUTED_STATE);
        content.put("adapterOwner", ADAPTER_OWNER);
        state.setStateScope(ACTION_SCOPE);
        state.setStateKind(APPROVAL_DRAFT_KIND);
        state.setStateKey(normalizedDraftId);
        state.setStatus(decisionState(trimToNull(request.getDecision())));
        state.setContent(JSON_MAPPER.valueToTree(content));
        return toDecisionInfo(entityGovernanceStateWriteModelService.saveGovernanceState(state));
    }

    private void validateDraftRequest(ActionApprovalDraftInfo request) {
        if (request == null) {
            throw new IllegalArgumentException("Approval draft request can not be null.");
        }
        if (!StringUtils.hasText(request.getActionId())) {
            throw new IllegalArgumentException("Approval draft actionId can not be blank.");
        }
        if (!StringUtils.hasText(request.getCatalogId())) {
            throw new IllegalArgumentException("Approval draft catalogId can not be blank.");
        }
        if (!MANUAL_CONFIRMATION.equals(request.getConfirmation())) {
            throw new IllegalArgumentException("Approval draft confirmation must be manual-required.");
        }
        if (!APPROVAL_DRAFT_EXECUTION_MODE.equals(request.getExecutionMode())) {
            throw new IllegalArgumentException("Approval draft executionMode must stay manual-only.");
        }
        if (!Boolean.FALSE.equals(request.getExecutionAllowed())) {
            throw new IllegalArgumentException("Approval draft can not execute actions.");
        }
    }

    private void validateDecisionRequest(String draftId, ActionApprovalDraftDecisionInfo request) {
        if (!StringUtils.hasText(draftId)) {
            throw new IllegalArgumentException("Approval draft draftId can not be blank.");
        }
        if (request == null) {
            throw new IllegalArgumentException("Approval draft decision request can not be null.");
        }
        String decision = trimToNull(request.getDecision());
        if (!APPROVED_DECISION.equals(decision) && !REJECTED_DECISION.equals(decision)) {
            throw new IllegalArgumentException("Approval draft decision must be approved or rejected.");
        }
        if (Boolean.TRUE.equals(request.getExecutionAllowed())) {
            throw new IllegalArgumentException("Approval draft decision can not execute actions.");
        }
    }

    private Map<String, Object> toContent(ActionApprovalDraftInfo request) {
        Map<String, Object> content = new LinkedHashMap<>();
        putIfPresent(content, "actionId", trimToNull(request.getActionId()));
        putIfPresent(content, "catalogId", trimToNull(request.getCatalogId()));
        putIfPresent(content, "risk", trimToNull(request.getRisk()));
        putIfPresent(content, "confirmation", MANUAL_CONFIRMATION);
        putIfPresent(content, "executionMode", APPROVAL_DRAFT_EXECUTION_MODE);
        content.put("executionAllowed", false);
        putIfPresent(content, "executionState", NOT_EXECUTED_STATE);
        putIfPresent(content, "adapterOwner", ADAPTER_OWNER);
        putIfPresent(content, "evidenceHref", trimToNull(request.getEvidenceHref()));
        if (request.getContext() != null && !request.getContext().isEmpty()) {
            content.put("context", request.getContext());
        }
        return content;
    }

    private ActionApprovalDraftInfo toApprovalDraftInfo(EntityGovernanceState state) {
        JsonNode content = state.getContent();
        ActionApprovalDraftInfo info = new ActionApprovalDraftInfo();
        info.setDraftId(state.getStateKey());
        info.setState(defaultText(state.getStatus(), CREATED_STATE));
        info.setExecutionState(defaultText(jsonText(content, "executionState"), NOT_EXECUTED_STATE));
        info.setExecutionAllowed(false);
        info.setAdapterOwner(defaultText(jsonText(content, "adapterOwner"), ADAPTER_OWNER));
        info.setActionId(jsonText(content, "actionId"));
        info.setCatalogId(jsonText(content, "catalogId"));
        info.setRisk(jsonText(content, "risk"));
        info.setConfirmation(defaultText(jsonText(content, "confirmation"), MANUAL_CONFIRMATION));
        info.setExecutionMode(defaultText(jsonText(content, "executionMode"), APPROVAL_DRAFT_EXECUTION_MODE));
        info.setEvidenceHref(jsonText(content, "evidenceHref"));
        info.setContext(jsonMap(content == null ? null : content.get("context")));
        info.setWorkspaceId(defaultText(state.getWorkspaceId(), AuthTokenScopes.DEFAULT_WORKSPACE_ID));
        info.setCreator(state.getCreator());
        info.setGmtUpdate(state.getGmtUpdate());
        return info;
    }

    private ActionApprovalDraftDecisionInfo toDecisionInfo(EntityGovernanceState state) {
        JsonNode content = state.getContent();
        ActionApprovalDraftDecisionInfo info = new ActionApprovalDraftDecisionInfo();
        info.setDraftId(state.getStateKey());
        info.setDecision(jsonText(content, "decision"));
        info.setReviewer(jsonText(content, "reviewer"));
        info.setReason(jsonText(content, "decisionReason"));
        info.setState(defaultText(state.getStatus(), CREATED_STATE));
        info.setExecutionState(defaultText(jsonText(content, "executionState"), NOT_EXECUTED_STATE));
        info.setExecutionAllowed(false);
        info.setAdapterOwner(defaultText(jsonText(content, "adapterOwner"), ADAPTER_OWNER));
        info.setWorkspaceId(defaultText(state.getWorkspaceId(), AuthTokenScopes.DEFAULT_WORKSPACE_ID));
        info.setCreator(state.getCreator());
        info.setGmtUpdate(state.getGmtUpdate());
        return info;
    }

    private String decisionState(String decision) {
        return APPROVED_DECISION.equals(decision) ? APPROVED_STATE : REJECTED_STATE;
    }

    private Map<String, Object> jsonMap(JsonNode node) {
        if (node == null || node.isNull() || !node.isObject()) {
            return Map.of();
        }
        return JSON_MAPPER.convertValue(node, new TypeReference<Map<String, Object>>() { });
    }

    private String jsonText(JsonNode node, String fieldName) {
        if (node == null || node.isNull() || node.get(fieldName) == null || node.get(fieldName).isNull()) {
            return null;
        }
        return trimToNull(node.get(fieldName).asText());
    }

    private int normalizeLimit(int limit) {
        if (limit <= 0) {
            return 8;
        }
        return Math.min(limit, 50);
    }

    private void putIfPresent(Map<String, Object> target, String key, Object value) {
        if (value != null) {
            target.put(key, value);
        }
    }

    private String defaultText(String value, String defaultValue) {
        String normalized = trimToNull(value);
        return normalized == null ? defaultValue : normalized;
    }

    private String limitLength(String value, int limit) {
        String normalized = trimToNull(value);
        if (normalized == null || normalized.length() <= limit) {
            return normalized;
        }
        return normalized.substring(0, limit);
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
