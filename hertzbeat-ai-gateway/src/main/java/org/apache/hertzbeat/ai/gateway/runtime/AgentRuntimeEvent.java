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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.time.Instant;
import java.util.Map;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.NonNull;
import lombok.Value;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;

/**
 * Runtime event for SSE and transcript projection.
 */
@Value
@Builder(access = AccessLevel.PRIVATE, toBuilder = true)
public class AgentRuntimeEvent {

    // Runtime consumers dispatch events by type and cannot project an untyped event.
    @NonNull
    AgentRuntimeEventType type;

    Long eventSequence;

    String traceId;

    EventStatus status;

    String itemId;

    AgentRuntimeItemKind itemKind;

    String requestId;

    RequestKind requestKind;

    Map<String, Object> requestPayload;

    String toolName;

    String toolCallId;

    Map<String, Object> toolArguments;

    String approvalId;

    AgentPolicyDecision policyDecision;

    String delta;

    Integer deltaIndex;

    String errorMessage;

    Long elapsedMs;

    Instant timestamp;

    public static AgentRuntimeEvent runStarted(String traceId, Instant timestamp) {
        return builder().type(AgentRuntimeEventType.RUN_STARTED).traceId(traceId).timestamp(timestamp).build();
    }

    public static AgentRuntimeEvent runCompleted(String traceId, Instant timestamp) {
        return builder().type(AgentRuntimeEventType.RUN_COMPLETED).traceId(traceId).timestamp(timestamp).build();
    }

    public static AgentRuntimeEvent runError(String traceId, String errorMessage, Instant timestamp) {
        return builder().type(AgentRuntimeEventType.ERROR).traceId(traceId).status(EventStatus.FAILED)
                .errorMessage(errorMessage).timestamp(timestamp).build();
    }

    public static AgentRuntimeEvent assistantMessageStarted(String itemId, String traceId, Instant timestamp) {
        return builder().type(AgentRuntimeEventType.ITEM_STARTED).itemKind(AgentRuntimeItemKind.ASSISTANT_MESSAGE)
                .itemId(itemId).traceId(traceId).timestamp(timestamp).build();
    }

    public static AgentRuntimeEvent assistantMessageDelta(String itemId, String traceId, int deltaIndex,
                                                          String delta, Instant timestamp) {
        return builder().type(AgentRuntimeEventType.ITEM_DELTA).itemKind(AgentRuntimeItemKind.ASSISTANT_MESSAGE)
                .itemId(itemId).traceId(traceId).deltaIndex(deltaIndex).delta(delta).timestamp(timestamp).build();
    }

    public static AgentRuntimeEvent assistantMessageCompleted(String itemId, String traceId, Instant timestamp) {
        return builder().type(AgentRuntimeEventType.ITEM_COMPLETED).itemKind(AgentRuntimeItemKind.ASSISTANT_MESSAGE)
                .itemId(itemId).traceId(traceId).timestamp(timestamp).build();
    }

    public static AgentRuntimeEvent toolStarted(String itemId, String traceId, AgentRuntimeToolCall toolCall,
                                                Instant timestamp) {
        return builder().type(AgentRuntimeEventType.ITEM_STARTED).itemKind(AgentRuntimeItemKind.TOOL_CALL)
                .itemId(itemId).traceId(traceId).toolName(toolCall.getToolName())
                .toolCallId(toolCall.getToolCallId()).toolArguments(toolCall.getArguments())
                .status(EventStatus.IN_PROGRESS).timestamp(timestamp).build();
    }

    public static AgentRuntimeEvent toolCompleted(String itemId, String traceId, AgentToolExecutionResult result,
                                                  Instant timestamp) {
        return builder().type(AgentRuntimeEventType.ITEM_COMPLETED).itemKind(AgentRuntimeItemKind.TOOL_CALL)
                .itemId(itemId).traceId(traceId).toolName(result.getToolName()).toolCallId(result.getToolCallId())
                .approvalId(result.getApprovalId()).policyDecision(result.getDecision()).status(toolStatus(result))
                .errorMessage(result.getErrorMessage()).elapsedMs(result.getElapsedMs()).timestamp(timestamp).build();
    }

    public static AgentRuntimeEvent approvalRequested(String itemId, String traceId,
                                                      AgentToolExecutionResult result, Instant timestamp) {
        return builder().type(AgentRuntimeEventType.REQUESTED_ACTION).itemKind(AgentRuntimeItemKind.TOOL_CALL)
                .itemId(itemId).traceId(traceId).requestId(result.getApprovalId()).requestKind(RequestKind.APPROVAL)
                .status(EventStatus.WAITING_APPROVAL).toolName(result.getToolName())
                .toolCallId(result.getToolCallId()).approvalId(result.getApprovalId()).timestamp(timestamp).build();
    }

    public static AgentRuntimeEvent approvalCompleted(String itemId, String traceId,
                                                      AgentToolExecutionResult result, AgentApprovalDecision decision,
                                                      Instant timestamp) {
        EventStatus status = decision == AgentApprovalDecision.REJECTED
                ? EventStatus.REJECTED : EventStatus.APPROVED;
        return builder().type(AgentRuntimeEventType.REQUEST_COMPLETED).itemKind(AgentRuntimeItemKind.TOOL_CALL)
                .itemId(itemId).traceId(traceId).requestId(result.getApprovalId()).requestKind(RequestKind.APPROVAL)
                .status(status).toolName(result.getToolName()).toolCallId(result.getToolCallId())
                .approvalId(result.getApprovalId()).timestamp(timestamp).build();
    }

    public static AgentRuntimeEvent userInputRequested(String requestId, Map<String, Object> requestPayload) {
        return builder().type(AgentRuntimeEventType.REQUESTED_ACTION).requestId(requestId)
                .requestKind(RequestKind.USER_INPUT).status(EventStatus.WAITING_INPUT)
                .requestPayload(requestPayload).build();
    }

    public static AgentRuntimeEvent userInputCompleted(String requestId) {
        return builder().type(AgentRuntimeEventType.REQUEST_COMPLETED).requestId(requestId)
                .requestKind(RequestKind.USER_INPUT).status(EventStatus.COMPLETED).build();
    }

    public static AgentRuntimeEvent userInputFailed(String requestId, String errorMessage) {
        return builder().type(AgentRuntimeEventType.REQUEST_COMPLETED).requestId(requestId)
                .requestKind(RequestKind.USER_INPUT).status(EventStatus.FAILED).errorMessage(errorMessage).build();
    }

    public AgentRuntimeEvent withToolContext(String traceId, String itemId, AgentRuntimeToolCall toolCall,
                                             Instant timestamp) {
        return toBuilder().traceId(traceId).itemId(itemId).itemKind(AgentRuntimeItemKind.TOOL_CALL)
                .toolName(toolCall.getToolName()).toolCallId(toolCall.getToolCallId()).timestamp(timestamp).build();
    }

    public AgentRuntimeEvent sequenced(long eventSequence) {
        return toBuilder().eventSequence(eventSequence).build();
    }

    private static EventStatus toolStatus(AgentToolExecutionResult result) {
        if (result.getStatus() == AgentToolStatus.WAITING_APPROVAL) {
            return EventStatus.WAITING_APPROVAL;
        }
        if (result.getDecision() == AgentPolicyDecision.DENY || result.getStatus() == AgentToolStatus.DENIED) {
            return EventStatus.DECLINED;
        }
        if (result.getStatus() == AgentToolStatus.FAILED || result.getErrorMessage() != null) {
            return EventStatus.FAILED;
        }
        return EventStatus.COMPLETED;
    }

    /** Runtime requests that suspend normal tool progress for an external action. */
    public enum RequestKind {
        APPROVAL("approval"),
        USER_INPUT("user_input");

        private final String externalName;

        RequestKind(String externalName) {
            this.externalName = externalName;
        }

        public String externalName() {
            return externalName;
        }
    }

    /** Runtime item and external-action progress states. */
    public enum EventStatus {
        IN_PROGRESS("in_progress"),
        COMPLETED("completed"),
        FAILED("failed"),
        DECLINED("declined"),
        WAITING_APPROVAL("waiting_approval"),
        APPROVED("approved"),
        REJECTED("rejected"),
        WAITING_INPUT("waiting_input");

        private final String externalName;

        EventStatus(String externalName) {
            this.externalName = externalName;
        }

        public String externalName() {
            return externalName;
        }
    }
}
