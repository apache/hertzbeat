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

import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ApprovalDecisionCommand;
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
    private static final Duration DEFAULT_CONSUMPTION_TIMEOUT = Duration.ofSeconds(5);

    private final AgentToolCallLedgerService toolCallLedgerService;
    private final AgentRuntimeApprovalRegistry approvalRegistry;
    private final Duration consumptionTimeout;

    @org.springframework.beans.factory.annotation.Autowired
    public ApprovalCommandService(AgentToolCallLedgerService toolCallLedgerService,
                                  AgentRuntimeApprovalRegistry approvalRegistry) {
        this(toolCallLedgerService, approvalRegistry, DEFAULT_CONSUMPTION_TIMEOUT);
    }

    ApprovalCommandService(AgentToolCallLedgerService toolCallLedgerService,
                           AgentRuntimeApprovalRegistry approvalRegistry,
                           Duration consumptionTimeout) {
        this.toolCallLedgerService = toolCallLedgerService;
        this.approvalRegistry = approvalRegistry;
        this.consumptionTimeout = consumptionTimeout;
    }

    public GatewaySingleResponse decide(ApprovalDecisionCommand command) {
        toolCallLedgerService.requireApprovalOwner(command.approvalId(), command.envelope(),
                command.originEntryType());
        var reservation = approvalRegistry.reserve(command.approvalId());
        if (reservation.isEmpty()) {
            return response(command, null, List.of(errorEvent(command, null,
                    "Agent approval runtime loop is no longer active.")));
        }
        AgentToolCall approval;
        try {
            approval = toolCallLedgerService.decideApproval(command.approvalId(), command.envelope(),
                    command.originEntryType(), command.decision());
        } catch (RuntimeException | Error failure) {
            reservation.orElseThrow().release();
            throw failure;
        }
        var delivery = reservation.orElseThrow().deliver(command.decision());
        if (!delivery.accepted() || !delivery.awaitConsumption(consumptionTimeout)) {
            AgentToolCall terminal = toolCallLedgerService.terminalizeUnconsumedApproval(
                    command.approvalId(), command.envelope(), command.originEntryType(), command.decision());
            return response(command, terminal, List.of(errorEvent(command, terminal,
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
