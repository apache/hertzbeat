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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.ApprovalCompletedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.ApprovalRequestedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.ErrorPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.GatewayEventType;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.InputRequestedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.InputCompletedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.MessageCompletedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.MessageDeltaPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.MessageStartedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.RunCompletedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.RunStartedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.ToolCompletedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.ToolStartedPayload;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvent;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeToolCall;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link GatewayRuntimeEventProjector}.
 */
class GatewayRuntimeEventProjectorTest {

    private final GatewayRuntimeEventProjector projector = new GatewayRuntimeEventProjector();

    @Test
    void projectorShouldConvertRunStarted() {
        GatewayEvent event = project(AgentRuntimeEvent.runStarted("trace-1",
                Instant.parse("2026-04-19T00:00:00Z")));

        RunStartedPayload payload = assertPayload(event, GatewayEventType.RUN_STARTED, RunStartedPayload.class);
        assertEquals("trace-1", payload.traceId());
        assertEquals(Instant.parse("2026-04-19T00:00:00Z").toEpochMilli(), event.timestamp());
    }

    @Test
    void projectorShouldConvertAssistantMessageLifecycle() {
        GatewayEvent started = project(AgentRuntimeEvent.assistantMessageStarted("message-1", "trace-1", null));
        GatewayEvent delta = project(AgentRuntimeEvent.assistantMessageDelta(
                "message-1", "trace-1", 0, "hello", null).sequenced(11L));
        GatewayEvent completed = project(AgentRuntimeEvent.assistantMessageCompleted("message-1", "trace-1", null));

        MessageStartedPayload startedPayload = assertPayload(started, GatewayEventType.MESSAGE_STARTED,
                MessageStartedPayload.class);
        assertEquals("trace-1", startedPayload.traceId());
        MessageDeltaPayload deltaPayload = assertPayload(delta, GatewayEventType.MESSAGE_DELTA,
                MessageDeltaPayload.class);
        assertEquals("hello", deltaPayload.delta());
        assertEquals(0, deltaPayload.deltaIndex());
        assertEquals("run-1:event:11", delta.eventId());
        MessageCompletedPayload completedPayload = assertPayload(completed, GatewayEventType.MESSAGE_COMPLETED,
                MessageCompletedPayload.class);
    }

    @Test
    void projectorShouldConvertToolLifecycle() {
        AgentRuntimeToolCall toolCall = toolCall("agc-1", "alert.history");
        GatewayEvent started = project(AgentRuntimeEvent.toolStarted(
                "model-call-1", "trace-1", toolCall, null));
        GatewayEvent completed = project(AgentRuntimeEvent.toolCompleted("model-call-1", "trace-1",
                toolResult("agc-1", "alert.history", null, AgentToolStatus.SUCCEEDED,
                        AgentPolicyDecision.ALLOW, AgentApprovalStatus.NOT_REQUIRED, 12L),
                null));

        ToolStartedPayload startedPayload = assertPayload(started, GatewayEventType.TOOL_STARTED,
                ToolStartedPayload.class);
        assertEquals("alert.history", startedPayload.toolName());
        assertEquals("agc-1", startedPayload.toolCallId());
        assertEquals(Map.of("monitorId", 42L, "limit", 10), startedPayload.arguments());
        ToolCompletedPayload completedPayload = assertPayload(completed, GatewayEventType.TOOL_COMPLETED,
                ToolCompletedPayload.class);
        assertEquals(12L, completedPayload.elapsedMs());
    }

    @Test
    void projectorShouldConvertApprovalRequestCompletionAndRunCompleted() {
        AgentToolExecutionResult pending = toolResult("agc-1", "node.restart", "approval-1",
                AgentToolStatus.WAITING_APPROVAL, AgentPolicyDecision.REQUIRE_APPROVAL,
                AgentApprovalStatus.PENDING, 0L);
        AgentToolExecutionResult approved = toolResult("agc-1", "node.restart", "approval-1",
                AgentToolStatus.SUCCEEDED, AgentPolicyDecision.REQUIRE_APPROVAL,
                AgentApprovalStatus.APPROVED, 0L);
        GatewayEvent approval = project(AgentRuntimeEvent.approvalRequested(
                "model-call-1", "trace-1", pending, null));
        GatewayEvent approvalCompleted = project(AgentRuntimeEvent.approvalCompleted(
                "model-call-1", "trace-1", approved,
                org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision.APPROVED, null));
        GatewayEvent completed = project(AgentRuntimeEvent.runCompleted("trace-1", null));

        ApprovalRequestedPayload approvalPayload = assertPayload(approval, GatewayEventType.APPROVAL_REQUESTED,
                ApprovalRequestedPayload.class);
        assertEquals("waiting_approval", approvalPayload.status());
        ApprovalCompletedPayload approvalCompletedPayload = assertPayload(approvalCompleted,
                GatewayEventType.APPROVAL_COMPLETED, ApprovalCompletedPayload.class);
        assertEquals("approved", approvalCompletedPayload.status());
        RunCompletedPayload completedPayload = assertPayload(completed, GatewayEventType.RUN_COMPLETED,
                RunCompletedPayload.class);
        assertEquals("trace-1", completedPayload.traceId());
    }

    @Test
    void projectorShouldConvertInputRequest() {
        GatewayEvent event = project(AgentRuntimeEvent.userInputRequested("aui-1", java.util.Map.of(
                        "targetTool", "monitor.create",
                        "title", "Connection details",
                        "description", "Enter the SSH credentials",
                        "fields", java.util.List.of(java.util.Map.of(
                                "field", "password",
                                "type", "secret",
                                "label", "Password",
                                "required", true))))
                .withToolContext("trace-1", "model-call-1", toolCall("agc-1", "interaction.request_input"), null));

        InputRequestedPayload payload = assertPayload(event, GatewayEventType.INPUT_REQUESTED,
                InputRequestedPayload.class);
        assertEquals("aui-1", payload.interactionId());
        assertEquals("monitor.create", payload.targetTool());
        assertEquals("Connection details", payload.title());
        assertEquals("password", payload.fields().get(0).get("field"));
        assertEquals("waiting_input", payload.status());
    }

    @Test
    void projectorShouldConvertInputCompletion() {
        GatewayEvent event = project(AgentRuntimeEvent.userInputCompleted("aui-1")
                .withToolContext("trace-1", "model-call-1", toolCall("agc-1", "interaction.request_input"), null));

        InputCompletedPayload payload = assertPayload(event, GatewayEventType.INPUT_COMPLETED,
                InputCompletedPayload.class);
        assertEquals("aui-1", payload.interactionId());
        assertEquals("completed", payload.status());
        assertNull(payload.errorMessage());
    }

    @Test
    void projectorShouldConvertError() {
        GatewayEvent error = project(AgentRuntimeEvent.runError(null, "model failed", null));

        ErrorPayload errorPayload = assertPayload(error, GatewayEventType.ERROR, ErrorPayload.class);
        assertEquals("model failed", errorPayload.errorMessage());
    }

    @Test
    void projectorShouldReturnNullForNullRuntimeEvent() {
        assertThrows(NullPointerException.class,
                () -> projector.project(null, "conv-1", "ags-1", "run-1"));
    }

    private GatewayEvent project(AgentRuntimeEvent event) {
        return projector.project(event, "conv-1", "ags-1", "run-1");
    }

    private AgentRuntimeToolCall toolCall(String toolCallId, String toolName) {
        return AgentRuntimeToolCall.builder()
                .toolCallId(toolCallId)
                .toolName(toolName)
                .arguments(Map.of("monitorId", 42L, "limit", 10))
                .build();
    }

    private AgentToolExecutionResult toolResult(String toolCallId, String toolName, String approvalId,
                                                AgentToolStatus status, AgentPolicyDecision decision,
                                                AgentApprovalStatus approvalStatus, long elapsedMs) {
        return AgentToolExecutionResult.builder()
                .toolCallId(toolCallId)
                .toolName(toolName)
                .approvalId(approvalId)
                .status(status)
                .decision(decision)
                .risk(AgentToolRisk.READ)
                .approvalStatus(approvalStatus)
                .elapsedMs(elapsedMs)
                .build();
    }

    private <T> T assertPayload(GatewayEvent event, GatewayEventType type, Class<T> payloadType) {
        assertEquals(type, event.type());
        return assertInstanceOf(payloadType, event.payload());
    }
}
