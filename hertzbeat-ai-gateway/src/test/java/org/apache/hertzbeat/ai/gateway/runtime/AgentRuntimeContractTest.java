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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.contract.UserInput.Message;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.junit.jupiter.api.Test;

/**
 * Test case for runtime contract DTOs.
 */
class AgentRuntimeContractTest {

    private static final String OLD_SUBJECT = "ta" + "sk";

    @Test
    void runtimeRequestShouldKeepExistingFieldsAndAcceptNewContext() {
        TranscriptMessage historyMessage = TranscriptMessage.builder()
            .role(TranscriptMessage.TranscriptRole.USER)
            .content(List.of(TranscriptContent.text("previous bounded summary")))
            .build();
        AgentRuntimeRequest request = AgentRuntimeRequest.builder()
            .entryType(AgentRuntimeEntryType.USER_INPUT)
            .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
            .envelope(GatewayEnvelope.builder()
                .channelId("web-ui")
                .receivedAt(100L)
                .actor(AgentActor.builder().type("user").id("admin").roles(List.of("user")).build())
                .build())
            .userInput(UserInput.builder()
                .conversationId("conversation-1")
                .message(Message.builder().text("diagnose").build())
                .build())
            .session(AgentSession.builder().id(1L).sessionUid("session-1").build())
            .run(AgentRun.builder().id(2L).runUid("run-1").sessionId(1L)
                .build())
            .chatHistory(List.of(historyMessage))
            .build();

        assertEquals(AgentRuntimeEntryType.USER_INPUT, request.getEntryType());
        assertEquals("run-1", request.getRun().getRunUid());
        assertEquals(List.of(historyMessage), request.getChatHistory());
    }

    @Test
    void toolExecutionResultShouldRequireLifecycleState() {
        assertThrows(NullPointerException.class, () -> AgentToolExecutionResult.builder()
            .toolCallId("agc-contract")
            .toolName("monitor.get")
            .decision(AgentPolicyDecision.ALLOW)
            .risk(AgentToolRisk.READ)
            .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
            .build());
        assertThrows(NullPointerException.class, () -> AgentToolExecutionResult.builder()
            .toolCallId("agc-contract")
            .toolName("monitor.get")
            .status(AgentToolStatus.SUCCEEDED)
            .risk(AgentToolRisk.READ)
            .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
            .build());
        assertThrows(NullPointerException.class, () -> AgentToolExecutionResult.builder()
            .toolCallId("agc-contract")
            .toolName("monitor.get")
            .status(AgentToolStatus.SUCCEEDED)
            .decision(AgentPolicyDecision.ALLOW)
            .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
            .build());
        assertThrows(NullPointerException.class, () -> AgentToolExecutionResult.builder()
            .toolCallId("agc-contract")
            .toolName("monitor.get")
            .status(AgentToolStatus.SUCCEEDED)
            .decision(AgentPolicyDecision.ALLOW)
            .risk(AgentToolRisk.READ)
            .approvalStatus(null)
            .build());
    }

    @Test
    void toolExecutionResultShouldRequireToolIdentity() {
        assertThrows(NullPointerException.class, () -> AgentToolExecutionResult.builder()
            .toolName("monitor.get")
            .status(AgentToolStatus.SUCCEEDED)
            .decision(AgentPolicyDecision.ALLOW)
            .risk(AgentToolRisk.READ)
            .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
            .build());
        assertThrows(NullPointerException.class, () -> AgentToolExecutionResult.builder()
            .toolCallId("agc-contract")
            .status(AgentToolStatus.SUCCEEDED)
            .decision(AgentPolicyDecision.ALLOW)
            .risk(AgentToolRisk.READ)
            .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
            .build());
    }

    @Test
    void toolExecutionResultShouldRequireApprovalIdentityWhileWaiting() {
        assertThrows(IllegalArgumentException.class, () -> AgentToolExecutionResult.builder()
            .toolCallId("agc-contract")
            .toolName("monitor.get")
            .status(AgentToolStatus.WAITING_APPROVAL)
            .decision(AgentPolicyDecision.REQUIRE_APPROVAL)
            .risk(AgentToolRisk.CHANGE)
            .approvalStatus(AgentApprovalStatus.PENDING)
            .build());
    }

    @Test
    void runtimeRequestShouldNotExposeDerivedRuntimeFields() {
        List<String> fields = Arrays.stream(AgentRuntimeRequest.class.getDeclaredFields())
            .map(Field::getName)
            .toList();

        assertFalse(fields.contains("message"));
        assertFalse(fields.contains("traceId"));
        assertFalse(fields.contains("deadlineAt"));
        assertFalse(fields.contains("channelContextSummary"));
        assertFalse(fields.contains("runtimeConfig"));
        assertFalse(fields.contains("entry"));
    }

    @Test
    void runtimeRequestShouldExposeStructuredChatHistoryContract() throws NoSuchFieldException {
        assertTrue(Arrays.stream(AgentRuntimeRequest.class.getDeclaredFields())
            .map(Field::getName)
            .noneMatch("historyWindow"::equals));
        Field chatHistory = AgentRuntimeRequest.class.getDeclaredField("chatHistory");

        assertEquals(List.class, chatHistory.getType());
        assertTrue(chatHistory.getGenericType().getTypeName()
            .contains(TranscriptMessage.class.getName()));
        assertFalse(chatHistory.getGenericType().getTypeName().contains("java.lang.String"));
    }

    @Test
    void sessionServiceShouldExposeStructuredTranscriptHistoryContract() throws NoSuchMethodException {
        assertTrue(Arrays.stream(AgentSessionService.class.getDeclaredMethods())
            .map(Method::getName)
            .noneMatch("findRecentTranscriptPromptHistory"::equals));
        Method transcriptHistory = AgentSessionService.class
            .getDeclaredMethod("findRecentTranscriptMessages", Long.class);

        assertEquals(List.class, transcriptHistory.getReturnType());
        assertTrue(transcriptHistory.getGenericReturnType().getTypeName()
            .contains(TranscriptMessage.class.getName()));
        assertFalse(transcriptHistory.getGenericReturnType().getTypeName().contains("java.lang.String"));
    }

    @Test
    void runtimeChatMessageShouldPreserveProviderNeutralHistoryFields() {
        TranscriptMessage message = TranscriptMessage.builder()
            .role(TranscriptMessage.TranscriptRole.TOOL_RESULT)
            .content(List.of(TranscriptContent.text("tool completed")))
            .toolName("alert.history")
            .toolCallId("call-1")
            .pruned(true)
            .build();

        assertEquals(TranscriptMessage.TranscriptRole.TOOL_RESULT, message.getRole());
        assertEquals("tool completed", message.text());
        assertEquals("alert.history", message.getToolName());
        assertEquals("call-1", message.getToolCallId());
        assertTrue(message.isPruned());
    }

    @Test
    void runtimeRequestShouldDeclareRunOnlyIdentifiers() {
        assertTrue(Arrays.stream(AgentRuntimeRequest.class.getDeclaredFields())
            .map(field -> field.getName().toLowerCase(Locale.ROOT))
            .noneMatch(fieldName -> fieldName.contains(OLD_SUBJECT)));
    }

    @Test
    void runtimeModelRequestShouldUseChatHistoryInsteadOfObservationsSideChannel() {
        assertTrue(Arrays.stream(AgentRuntimeModelRequest.class.getDeclaredFields())
            .map(Field::getName)
            .noneMatch("observations"::equals));
        assertTrue(Arrays.stream(AgentRuntimeModelRequest.class.getDeclaredMethods())
            .map(Method::getName)
            .noneMatch("getObservations"::equals));
        assertTrue(Arrays.stream(AgentRuntimeModelRequest.class.getDeclaredFields())
            .map(Field::getName)
            .noneMatch(fieldName -> fieldName.equals("remainingToolCalls")
                || fieldName.equals("deadlineAt")));
        assertTrue(Arrays.stream(AgentRuntimeModelRequest.class.getDeclaredMethods())
            .map(Method::getName)
            .noneMatch(methodName -> methodName.equals("getRemainingToolCalls")
                || methodName.equals("getDeadlineAt")));
    }

    @Test
    void toolExecutionRequestShouldExposeRunIdentifiersWithoutOldSubjectFields() {
        AgentToolExecutionRequest request = AgentToolExecutionRequest.builder()
            .sessionUid("ags-1")
            .runId(2L)
            .runUid("run-1")
            .runSessionId(1L)
            .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
            .entryType(AgentRuntimeEntryType.USER_INPUT)
            .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
            .toolName("monitor.get")
            .toolCallId("agc-contract")
            .arguments(Map.of())
            .build();

        assertEquals("ags-1", request.getSessionUid());
        assertEquals(2L, request.getRunId());
        assertEquals("run-1", request.getRunUid());
        assertEquals(1L, request.getRunSessionId());
        assertTrue(Arrays.stream(AgentToolExecutionRequest.class.getDeclaredFields())
            .map(field -> field.getName().toLowerCase(Locale.ROOT))
            .noneMatch(fieldName -> fieldName.contains(OLD_SUBJECT)));
    }

}
