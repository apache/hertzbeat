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

package org.apache.hertzbeat.ai.gateway.application;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ApprovalDecisionCommand;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.ErrorPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.GatewayEventType;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.Meta;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeApprovalRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolCallLedgerService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.springframework.stereotype.Service;

/**
 * Approval decision commands for active runtime loops.
 */
@Service
public class ApprovalCommandService {

    private static final String STATUS_COMPLETED = "completed";
    private static final String STATUS_FAILED = "failed";

    private final AgentToolCallLedgerService toolCallLedgerService;
    private final AgentRuntimeApprovalRegistry approvalRegistry;

    public ApprovalCommandService(AgentToolCallLedgerService toolCallLedgerService,
                                  AgentRuntimeApprovalRegistry approvalRegistry) {
        this.toolCallLedgerService = toolCallLedgerService;
        this.approvalRegistry = approvalRegistry;
    }

    public GatewaySingleResponse decide(ApprovalDecisionCommand command) {
        if (!approvalRegistry.isWaiting(command.approvalId())) {
            return response(command, null, List.of(errorEvent(command, null,
                    "Agent approval is not waiting in an active runtime loop.")));
        }
        AgentToolCall approval = command.decision() == AgentApprovalDecision.APPROVED
                ? toolCallLedgerService.approve(command.approvalId(), command.envelope().getActor())
                : toolCallLedgerService.reject(command.approvalId(), command.envelope().getActor());
        if (!approvalRegistry.complete(approval.getApprovalId(), command.decision())) {
            return response(command, approval, List.of(errorEvent(command, approval,
                    "Agent approval runtime loop is no longer active.")));
        }
        return response(command, approval, List.of());
    }

    private GatewaySingleResponse response(ApprovalDecisionCommand command, AgentToolCall approval,
                                           List<GatewayEvent> events) {
        boolean success = events.isEmpty();
        Meta meta = Meta.builder()
                .commandId(command.commandId())
                .sessionUid(approval == null ? null : approval.getSessionUid())
                .runUid(approval == null ? null : approval.getRunUid())
                .terminal(true)
                .message(success ? "approval accepted" : "approval failed")
                .build();
        return GatewaySingleResponse.builder()
                .meta(meta)
                .body(Map.of("status", success ? STATUS_COMPLETED : STATUS_FAILED))
                .events(events)
                .build();
    }

    private GatewayEvent errorEvent(ApprovalDecisionCommand command, AgentToolCall approval, String message) {
        return GatewayEvent.builder()
                .type(GatewayEventType.ERROR)
                .eventId(command.commandId() + ":error")
                .sessionUid(approval == null ? null : approval.getSessionUid())
                .runUid(approval == null ? null : approval.getRunUid())
                .payload(ErrorPayload.builder()
                        .errorMessage(message)
                        .build())
                .timestamp(System.currentTimeMillis())
                .build();
    }
}
