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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewayStreamResponse;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunStatus;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvent;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeRequest;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeService;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Flux;

/**
 * Tests command delivery mode conversion at the runtime request boundary.
 */
@ExtendWith(MockitoExtension.class)
class AgentCommandServiceTest {

    @Mock
    private AgentSessionService sessionService;

    @Mock
    private AgentRunService runService;

    @Mock
    private AgentRuntimeService runtimeService;

    @Mock
    private AgentTranscriptRecorder transcriptRecorder;

    private final GatewayRuntimeEventProjector runtimeEventProjector = new GatewayRuntimeEventProjector();

    private AgentSession session;
    private AgentRun run;

    @BeforeEach
    void setUp() {
        session = AgentSession.builder().id(1L).sessionUid("session-1").build();
        run = AgentRun.builder().id(2L).runUid("run-1").sessionId(1L).build();
        when(sessionService.findOrCreateSession(any(), any())).thenReturn(session);
        when(runService.createOrResumeRun(any(), any())).thenReturn(run);
        when(transcriptRecorder.chatHistory(session.getId())).thenReturn(List.of());
        when(runService.markRunning(run)).thenReturn(run);
    }

    @Test
    void finalOnlyCommandShouldDenyExternalApprovalWaits() {
        InvokeCommand command = command(ReplyMode.FINAL_ONLY);
        AgentRuntimeRequest request = service().prepare(command, command.userInput());

        assertEquals(AgentApprovalHandling.DENY, request.getApprovalHandling());
    }

    @Test
    void streamCommandShouldWaitForExternalApprovalDecision() {
        InvokeCommand command = command(ReplyMode.STREAM);
        AgentRuntimeRequest request = service().prepare(command, command.userInput());

        assertEquals(AgentApprovalHandling.WAIT_FOR_DECISION, request.getApprovalHandling());
    }

    @Test
    void finalOnlyShouldCollectTheSameMappedEventsAsStream() {
        Instant timestamp = Instant.parse("2026-07-16T00:00:00Z");
        List<AgentRuntimeEvent> runtimeEvents = List.of(
                AgentRuntimeEvent.runStarted("trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageStarted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.assistantMessageDelta("assistant-1", "trace-1", 0, "Hello ", timestamp),
                AgentRuntimeEvent.assistantMessageDelta("assistant-1", "trace-1", 1, "world", timestamp),
                AgentRuntimeEvent.assistantMessageCompleted("assistant-1", "trace-1", timestamp),
                AgentRuntimeEvent.runCompleted("trace-1", timestamp));
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class)))
                .thenReturn(Flux.fromIterable(runtimeEvents));
        when(runService.markSucceeded(any(), any())).thenAnswer(invocation -> {
            AgentRun completedRun = invocation.getArgument(0);
            completedRun.setStatus(AgentRunStatus.SUCCEEDED.name());
            return completedRun;
        });

        InvokeCommand finalCommand = command(ReplyMode.FINAL_ONLY);
        GatewaySingleResponse finalResponse = service().invokeFinal(finalCommand, finalCommand.userInput());
        InvokeCommand streamCommand = command(ReplyMode.STREAM);
        GatewayStreamResponse streamResponse = service().invokeStream(streamCommand, streamCommand.userInput());
        List<GatewayEvent> streamedEvents = streamResponse.events().collectList().block();

        assertEquals(streamedEvents, finalResponse.events());
        assertEquals("completed", finalResponse.meta().message());
        assertEquals(Map.of("message", "Hello world", "status", AgentRunStatus.SUCCEEDED.name()),
                finalResponse.body());
    }

    @Test
    void finalOnlyShouldMapMissingTerminalEventToTheSharedErrorContract() {
        when(runtimeService.streamInvoke(any(AgentRuntimeRequest.class)))
                .thenReturn(Flux.just(
                        AgentRuntimeEvent.runStarted("trace-1", Instant.parse("2026-07-16T00:00:00Z"))));
        when(runService.markFailed(any(), any())).thenAnswer(invocation -> {
            AgentRun failedRun = invocation.getArgument(0);
            failedRun.setStatus(AgentRunStatus.FAILED.name());
            return failedRun;
        });

        InvokeCommand command = command(ReplyMode.FINAL_ONLY);
        GatewaySingleResponse response = service().invokeFinal(command, command.userInput());

        assertEquals(List.of(GatewayEvent.GatewayEventType.RUN_STARTED, GatewayEvent.GatewayEventType.ERROR),
                response.events().stream().map(GatewayEvent::type).toList());
        assertEquals("error", response.meta().message());
        assertEquals(Map.of(
                "message", "Agent Gateway runtime stream completed without a terminal event.",
                "status", AgentRunStatus.FAILED.name()), response.body());
    }

    private AgentCommandService service() {
        return new AgentCommandService(sessionService, runService, runtimeService, transcriptRecorder,
                runtimeEventProjector);
    }

    private InvokeCommand command(ReplyMode replyMode) {
        return InvokeCommand.builder()
                .envelope(GatewayEnvelope.builder()
                        .channelId("web-ui")
                        .receivedAt(100L)
                        .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                        .build())
                .replyMode(replyMode)
                .commandId("message-1")
                .userInput(userInput())
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .build();
    }

    private UserInput userInput() {
        return UserInput.builder()
                .messageId("message-1")
                .conversationId("conversation-1")
                .message(UserInput.Message.builder().text("diagnose monitor").build())
                .build();
    }
}
