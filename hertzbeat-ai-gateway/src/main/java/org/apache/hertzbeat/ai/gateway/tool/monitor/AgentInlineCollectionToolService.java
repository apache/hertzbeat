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

package org.apache.hertzbeat.ai.gateway.tool.monitor;

import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolCallLedgerService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.monitor.collection.InlineCollectionPlanService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Objects;

/**
 * Existing monitor collection API only; accepts no arbitrary script, path, SQL or HTTP argument.
 */
@Service
public class AgentInlineCollectionToolService {
    public static final String EXECUTE = "monitor.collection_detect";
    private final InlineCollectionPlanService plans;
    private final AgentToolCallLedgerService ledger;
    private final ObjectProvider<AgentToolRegistry> registry;

    public AgentInlineCollectionToolService(
            InlineCollectionPlanService plans,
            AgentToolCallLedgerService ledger,
            ObjectProvider<AgentToolRegistry> registry) {
        this.plans = plans;
        this.ledger = ledger;
        this.registry = registry;
    }

    @Tool(
            name = "monitor.collection_preview",
            description =
                    "Prepare a fixed existing inline-script monitor for ONE local main-Collector"
                        + " detection. No probe or execution. Remote, cyclic, files and credentials"
                        + " are unsupported. Commands are shown only in the owner's approval UI.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN)
    public Map<String, Object> preview(
            @ToolParam(description = "Existing monitor ID.") Long monitorId) {
        var request = AgentToolContextSupport.invocation().getRequest();
        var p = plans.prepare(scope(request), Objects.requireNonNull(monitorId));
        return Map.of(
                "monitorId",
                p.monitorId(),
                "planId",
                p.planId(),
                "planHash",
                p.planHash(),
                "sourceRevision",
                p.sourceRevision(),
                "expiresAt",
                p.expiresAt(),
                "oneShot",
                true);
    }

    @Tool(
            name = "monitor.collection_detect",
            description =
                    "Execute ONE fixed existing inline collection plan after mandatory per-action"
                        + " ADMIN approval. FULL cannot waive it. Reuse the preview's"
                        + " monitorId/planId/planHash exactly. No remote or periodic execution.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, risk = AgentToolRisk.DANGEROUS)
    public Map<String, Object> detect(
            @ToolParam(description = "Existing monitor ID.") Long monitorId,
            @ToolParam(description = "Opaque prepared plan ID.") String planId,
            @ToolParam(description = "Exact prepared plan hash.") String planHash) {
        var context = AgentToolContextSupport.invocation();
        var request = context.getRequest();
        var row = context.getLedgerCall();
        if (!EXECUTE.equals(request.getToolName())
                || !EXECUTE.equals(row.getToolName())
                || !"APPROVED".equals(row.getApprovalStatus())
                || !"APPROVED".equals(request.getApprovalStatus())
                || !"RUNNING".equals(row.getStatus())
                || request.getApprovalId() == null
                || !request.getApprovalId().equals(row.getApprovalId())
                || !request.getSessionUid().equals(row.getSessionUid())
                || !Objects.equals(request.getRunId(), row.getRunId())
                || !Objects.equals(request.getRunUid(), row.getRunUid())
                || !Objects.equals(request.getRunSessionId(), row.getSessionId())
                || !Objects.equals(request.getToolCallId(), row.getToolCallId())
                || !AgentToolPayloadHasher.normalizedArgumentsHash(
                                AgentToolContextSupport.arguments(
                                        "monitorId",
                                        monitorId,
                                        "planId",
                                        planId,
                                        "planHash",
                                        planHash))
                        .equals(row.getInputHash())
                || !AgentToolPayloadHasher.normalizedArgumentsHash(request.getArguments())
                        .equals(row.getInputHash())) {
            throw new IllegalStateException("Exact approved collection input is required");
        }
        var descriptor = registry.getObject().find(EXECUTE).orElseThrow().descriptor();
        var r =
                plans.execute(
                        scope(request),
                        planId,
                        planHash,
                        Objects.requireNonNull(monitorId),
                        () ->
                                request.getExecutionGuard().getAsBoolean()
                                        && ledger.canDecide(request.getActor(), descriptor));
        return Map.of(
                "receiptVersion", "inline-collection.v1",
                "inputHash", row.getInputHash(),
                "monitorId",
                r.monitorId(),
                "planId",
                r.planId(),
                "planHash",
                r.planHash(),
                "started",
                r.started(),
                "verified",
                r.verified(),
                "oneShot",
                true);
    }

    public InlineCollectionPlanService.Preview approvalPreview(
            AgentToolCall row, AgentToolExecutionRequest request) {
        return view(row, scope(request));
    }

    public InlineCollectionPlanService.Preview approvalPreview(
            AgentToolCall row, GatewayEnvelope envelope) {
        return view(
                row, scope(envelope.getActor(), envelope.getWorkspaceId(), row.getSessionUid()));
    }

    private InlineCollectionPlanService.Preview view(AgentToolCall row, String owner) {
        if (!EXECUTE.equals(row.getToolName())) return null;
        try {
            Map<String, Object> args =
                    JsonUtil.fromJson(
                            row.getInputJson(), new tools.jackson.core.type.TypeReference<>() {});
            if (args == null
                    || !AgentToolPayloadHasher.normalizedArgumentsHash(args)
                            .equals(row.getInputHash())
                    || args.size() != 3
                    || !(args.get("monitorId") instanceof Number id)
                    || !(args.get("planId") instanceof String planId)
                    || !(args.get("planHash") instanceof String hash)) return null;
            return plans.preview(owner, planId, hash, id.longValue());
        } catch (RuntimeException unavailable) {
            return null;
        }
    }

    private String scope(AgentToolExecutionRequest request) {
        return scope(request.getActor(), request.getWorkspaceId(), request.getSessionUid());
    }

    private String scope(AgentActor actor, String workspace, String session) {
        return AgentToolPayloadHasher.normalizedArgumentsHash(
                Map.of(
                        "actorType",
                        actor.getType(),
                        "actorId",
                        actor.getId(),
                        "workspace",
                        workspace == null ? "default" : workspace,
                        "session",
                        session));
    }
}
