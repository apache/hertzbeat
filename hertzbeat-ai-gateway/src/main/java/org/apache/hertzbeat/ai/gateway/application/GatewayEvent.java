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
import java.util.Objects;
import lombok.Builder;
import org.springframework.util.StringUtils;

/**
 * Channel-neutral event emitted by the Gateway layer.
 */
@Builder
public record GatewayEvent(
        GatewayEventType type,
        String eventId,
        String conversationId,
        String sessionUid,
        String runUid,
        String itemId,
        GatewayEventPayload payload,
        Long timestamp) {

    public GatewayEvent {
        // GatewayEvent is the external event boundary; clients need stable identity and a concrete schema.
        Objects.requireNonNull(type, "type is required");
        if (!StringUtils.hasText(eventId)) {
            throw new IllegalArgumentException("eventId is required");
        }
        Objects.requireNonNull(payload, "payload is required");
        Objects.requireNonNull(timestamp, "timestamp is required");
        if (timestamp < 0) {
            throw new IllegalArgumentException("timestamp must not be negative");
        }
    }

    /**
     * Event categories exposed to channels.
     */
    public enum GatewayEventType {
        RUN_STARTED,
        MESSAGE_STARTED,
        MESSAGE_DELTA,
        MESSAGE_COMPLETED,
        TOOL_STARTED,
        TOOL_COMPLETED,
        INPUT_REQUESTED,
        INPUT_COMPLETED,
        APPROVAL_REQUESTED,
        APPROVAL_COMPLETED,
        RUN_COMPLETED,
        ERROR
    }

    /**
     * Marker boundary for structured event payloads.
     */
    public sealed interface GatewayEventPayload permits
            RunStartedPayload,
            MessageStartedPayload,
            MessageDeltaPayload,
            MessageCompletedPayload,
            ToolStartedPayload,
            ToolCompletedPayload,
            InputRequestedPayload,
            InputCompletedPayload,
            ApprovalRequestedPayload,
            ApprovalCompletedPayload,
            RunCompletedPayload,
            ErrorPayload {
    }

    /** Run start payload. */
    @Builder
    public record RunStartedPayload(String traceId) implements GatewayEventPayload {
    }

    /** Assistant message start payload. */
    @Builder
    public record MessageStartedPayload(String traceId) implements GatewayEventPayload {
    }

    /** Assistant message delta payload. */
    @Builder
    public record MessageDeltaPayload(
            String traceId,
            Integer deltaIndex,
            String delta) implements GatewayEventPayload {
    }

    /** Assistant message completion payload. */
    @Builder
    public record MessageCompletedPayload(String traceId) implements GatewayEventPayload {
    }

    /** Tool execution start payload. */
    @Builder
    public record ToolStartedPayload(
            String traceId,
            String toolName,
            String toolCallId,
            Map<String, Object> arguments,
            String status) implements GatewayEventPayload {
    }

    /** Tool execution completion payload. */
    @Builder
    public record ToolCompletedPayload(
            String traceId,
            String toolName,
            String toolCallId,
            String approvalId,
            String policyDecision,
            String errorMessage,
            Long elapsedMs,
            String status) implements GatewayEventPayload {
    }

    /** Structured user input requested by a tool. */
    @Builder
    public record InputRequestedPayload(
            String traceId,
            String interactionId,
            String targetTool,
            String title,
            String description,
            List<Map<String, Object>> fields,
            String status) implements GatewayEventPayload {
    }

    /** Completion of a structured user input request. */
    @Builder
    public record InputCompletedPayload(
            String traceId,
            String interactionId,
            String status,
            String errorMessage) implements GatewayEventPayload {
    }

    /** Approval request payload. */
    @Builder
    public record ApprovalRequestedPayload(
            String traceId,
            String toolName,
            String approvalId,
            String toolCallId,
            String status) implements GatewayEventPayload {
    }

    /** Approval completion payload. */
    @Builder
    public record ApprovalCompletedPayload(
            String traceId,
            String toolName,
            String approvalId,
            String toolCallId,
            String status) implements GatewayEventPayload {
    }

    /** Run completion payload. */
    @Builder
    public record RunCompletedPayload(String traceId) implements GatewayEventPayload {
    }

    /** Gateway error payload. */
    @Builder
    public record ErrorPayload(
            String traceId,
            String errorMessage) implements GatewayEventPayload {
    }
}
