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

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.ApprovalCompletedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.ApprovalRequestedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.ErrorPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.GatewayEventPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.GatewayEventType;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.MessageCompletedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.InputRequestedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.InputCompletedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.MessageDeltaPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.MessageStartedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.RunCompletedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.RunStartedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.ToolCompletedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.ToolStartedPayload;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvent;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvent.RequestKind;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvent.EventStatus;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeItemKind;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Projects runtime facts into the external Gateway event contract.
 */
@Component
public class GatewayRuntimeEventProjector {


    public GatewayEvent project(AgentRuntimeEvent event, String conversationId, String sessionUid, String runUid) {
        // Runtime publishers only emit complete events; projection cannot represent a missing source event.
        Objects.requireNonNull(event, "Runtime event is required");
        return switch (event.getType()) {
            case RUN_STARTED -> gatewayEvent(event, GatewayEventType.RUN_STARTED, conversationId, sessionUid, runUid,
                    RunStartedPayload.builder()
                            .traceId(event.getTraceId())
                            .build());
            case ITEM_STARTED -> projectItemStarted(event, conversationId, sessionUid, runUid);
            case ITEM_DELTA -> projectItemDelta(event, conversationId, sessionUid, runUid);
            case ITEM_COMPLETED -> projectItemCompleted(event, conversationId, sessionUid, runUid);
            case REQUESTED_ACTION -> projectRequestedAction(event, conversationId, sessionUid, runUid);
            case REQUEST_COMPLETED -> projectRequestCompleted(event, conversationId, sessionUid, runUid);
            case RUN_COMPLETED -> gatewayEvent(event, GatewayEventType.RUN_COMPLETED, conversationId, sessionUid,
                    runUid, RunCompletedPayload.builder()
                            .traceId(event.getTraceId())
                            .build());
            case ERROR -> gatewayEvent(event, GatewayEventType.ERROR, conversationId, sessionUid, runUid,
                    errorPayload(event, event.getErrorMessage()));
        };
    }

    private GatewayEvent projectItemStarted(AgentRuntimeEvent event, String conversationId, String sessionUid,
                                            String runUid) {
        if (isTool(event)) {
            return gatewayEvent(event, GatewayEventType.TOOL_STARTED, conversationId, sessionUid, runUid,
                    ToolStartedPayload.builder()
                            .traceId(event.getTraceId())
                            .toolName(event.getToolName())
                            .toolCallId(event.getToolCallId())
                            .arguments(event.getToolArguments())
                            .status(event.getStatus() == null ? EventStatus.IN_PROGRESS.externalName()
                                    : event.getStatus().externalName())
                            .build());
        }
        if (isAssistantMessage(event)) {
            return gatewayEvent(event, GatewayEventType.MESSAGE_STARTED, conversationId, sessionUid, runUid,
                    MessageStartedPayload.builder()
                            .traceId(event.getTraceId())
                            .build());
        }
        return unsupported(event, conversationId, sessionUid, runUid,
                "Runtime item start event has no supported item kind.");
    }

    private GatewayEvent projectItemDelta(AgentRuntimeEvent event, String conversationId, String sessionUid,
                                          String runUid) {
        // Legacy runtime delta events without itemKind are assistant message deltas.
        if (event.getItemKind() == null || isAssistantMessage(event)) {
            return gatewayEvent(event, GatewayEventType.MESSAGE_DELTA, conversationId, sessionUid, runUid,
                    MessageDeltaPayload.builder()
                            .traceId(event.getTraceId())
                            .deltaIndex(event.getDeltaIndex())
                            .delta(event.getDelta())
                            .build());
        }
        return unsupported(event, conversationId, sessionUid, runUid,
                "Runtime item delta event has no supported item kind.");
    }

    private GatewayEvent projectItemCompleted(AgentRuntimeEvent event, String conversationId, String sessionUid,
                                              String runUid) {
        if (isTool(event)) {
            return gatewayEvent(event, GatewayEventType.TOOL_COMPLETED, conversationId, sessionUid, runUid,
                    ToolCompletedPayload.builder()
                            .traceId(event.getTraceId())
                            .toolName(event.getToolName())
                            .toolCallId(event.getToolCallId())
                            .approvalId(event.getApprovalId())
                            .policyDecision(externalName(event.getPolicyDecision()))
                            .errorMessage(event.getErrorMessage())
                            .elapsedMs(event.getElapsedMs())
                            .status(toolCompletedStatus(event))
                            .build());
        }
        if (isAssistantMessage(event)) {
            return gatewayEvent(event, GatewayEventType.MESSAGE_COMPLETED, conversationId, sessionUid, runUid,
                    MessageCompletedPayload.builder()
                            .traceId(event.getTraceId())
                            .build());
        }
        return unsupported(event, conversationId, sessionUid, runUid,
                "Runtime item completion event has no supported item kind.");
    }

    private GatewayEvent projectRequestedAction(AgentRuntimeEvent event, String conversationId, String sessionUid,
                                                String runUid) {
        if (event.getRequestKind() == RequestKind.USER_INPUT) {
            Map<String, Object> requestPayload = event.getRequestPayload() == null
                    ? Map.of() : event.getRequestPayload();
            return gatewayEvent(event, GatewayEventType.INPUT_REQUESTED, conversationId, sessionUid, runUid,
                    InputRequestedPayload.builder()
                            .traceId(event.getTraceId())
                            .interactionId(event.getRequestId())
                            .targetTool(stringValue(requestPayload.get("targetTool")))
                            .title(stringValue(requestPayload.get("title")))
                            .description(stringValue(requestPayload.get("description")))
                            .fields(inputFields(requestPayload.get("fields")))
                            .status(event.getStatus().externalName())
                            .build());
        }
        if (event.getRequestKind() != RequestKind.APPROVAL) {
            return unsupported(event, conversationId, sessionUid, runUid,
                    "Runtime requested action event has no supported request kind.");
        }
        return gatewayEvent(event, GatewayEventType.APPROVAL_REQUESTED, conversationId, sessionUid, runUid,
                ApprovalRequestedPayload.builder()
                        .traceId(event.getTraceId())
                        .toolName(event.getToolName())
                        .approvalId(event.getApprovalId())
                        .toolCallId(event.getToolCallId())
                        .status(event.getStatus() == null ? EventStatus.WAITING_APPROVAL.externalName()
                                : event.getStatus().externalName())
                        .build());
    }

    private GatewayEvent projectRequestCompleted(AgentRuntimeEvent event, String conversationId, String sessionUid,
                                                 String runUid) {
        if (event.getRequestKind() == RequestKind.USER_INPUT) {
            return gatewayEvent(event, GatewayEventType.INPUT_COMPLETED, conversationId, sessionUid, runUid,
                    InputCompletedPayload.builder()
                            .traceId(event.getTraceId())
                            .interactionId(event.getRequestId())
                            .status(event.getStatus().externalName())
                            .errorMessage(event.getErrorMessage())
                            .build());
        }
        if (event.getRequestKind() != RequestKind.APPROVAL) {
            return unsupported(event, conversationId, sessionUid, runUid,
                    "Runtime completed request event has no supported request kind.");
        }
        return gatewayEvent(event, GatewayEventType.APPROVAL_COMPLETED, conversationId, sessionUid, runUid,
                ApprovalCompletedPayload.builder()
                        .traceId(event.getTraceId())
                        .toolName(event.getToolName())
                        .approvalId(event.getApprovalId())
                        .toolCallId(event.getToolCallId())
                        .status(event.getStatus().externalName())
                        .build());
    }

    private GatewayEvent unsupported(AgentRuntimeEvent event, String conversationId, String sessionUid, String runUid,
                                     String message) {
        return gatewayEvent(event, GatewayEventType.ERROR, conversationId, sessionUid, runUid,
                errorPayload(event, message));
    }

    private GatewayEvent gatewayEvent(AgentRuntimeEvent event, GatewayEventType type, String conversationId,
                                      String sessionUid, String runUid, GatewayEventPayload payload) {
        return GatewayEvent.builder()
                .type(type)
                .eventId(eventId(event, type, runUid))
                .conversationId(conversationId)
                .sessionUid(sessionUid)
                .runUid(runUid)
                .itemId(event.getItemId())
                .payload(payload)
                .timestamp(timestamp(event.getTimestamp()))
                .build();
    }

    private ErrorPayload errorPayload(AgentRuntimeEvent event, String errorMessage) {
        return ErrorPayload.builder()
                .traceId(event.getTraceId())
                .errorMessage(errorMessage)
                .build();
    }

    private String eventId(AgentRuntimeEvent event, GatewayEventType type, String runUid) {
        String eventRunUid = StringUtils.hasText(runUid) ? runUid : "run";
        if (event.getEventSequence() != null) {
            return eventRunUid + ":event:" + event.getEventSequence();
        }
        String stableId = Stream.of(event.getRequestId(), event.getApprovalId(), event.getItemId(),
                        event.getToolCallId(), event.getTraceId())
                .filter(StringUtils::hasText)
                .findFirst()
                .orElse("event");
        String eventType = type.name().toLowerCase(Locale.ROOT);
        return eventRunUid + ":" + eventType + ":" + stableId;
    }

    private String toolCompletedStatus(AgentRuntimeEvent event) {
        if (event.getStatus() != null) {
            return event.getStatus().externalName();
        }
        if (StringUtils.hasText(event.getErrorMessage())) {
            return EventStatus.FAILED.externalName();
        }
        if (org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision.REQUIRE_APPROVAL
                == event.getPolicyDecision()) {
            return EventStatus.WAITING_APPROVAL.externalName();
        }
        return EventStatus.COMPLETED.externalName();
    }

    private boolean isAssistantMessage(AgentRuntimeEvent event) {
        return event.getItemKind() == AgentRuntimeItemKind.ASSISTANT_MESSAGE;
    }

    private boolean isTool(AgentRuntimeEvent event) {
        return event.getItemKind() == AgentRuntimeItemKind.TOOL_CALL;
    }

    private Long timestamp(Instant timestamp) {
        return timestamp == null ? System.currentTimeMillis() : timestamp.toEpochMilli();
    }

    private String externalName(Enum<?> value) {
        return value == null ? null : value.name();
    }

    private String stringValue(Object value) {
        return value instanceof String text ? text : null;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> inputFields(Object value) {
        if (!(value instanceof List<?> values)) {
            return List.of();
        }
        return values.stream()
                .filter(Map.class::isInstance)
                .map(item -> Map.copyOf((Map<String, Object>) item))
                .toList();
    }

}
