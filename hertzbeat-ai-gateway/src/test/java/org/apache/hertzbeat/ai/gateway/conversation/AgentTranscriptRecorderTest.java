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

package org.apache.hertzbeat.ai.gateway.conversation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.contract.UserInput.Message;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Agent transcript persistence tests.
 */
@ExtendWith(MockitoExtension.class)
class AgentTranscriptRecorderTest {

    @Mock
    private AgentSessionService sessionService;

    @Test
    void shouldPersistUserAndToolTextWithoutSanitizingOrTruncating() {
        when(sessionService.recordTranscriptEntry(any())).thenAnswer(invocation -> invocation.getArgument(0));
        AgentTranscriptRecorder recorder = new AgentTranscriptRecorder(sessionService);
        AgentSession session = AgentSession.builder().id(1L).sessionUid("session-1").build();
        AgentRun run = AgentRun.builder().id(2L).runUid("run-1").sessionId(1L).build();
        String userText = "diagnose token=user-secret " + "detail ".repeat(500);
        UserInput userInput = UserInput.builder()
            .messageId("message-1")
            .conversationId("conversation-1")
            .message(Message.builder().text(userText).build())
            .build();

        AgentTranscriptEntry userEntry = recorder.recordUserTranscriptEntry(session, run, userInput);
        String toolText = "{\"token\":\"tool-secret\",\"rows\":\"" + "x".repeat(3000) + "\"}";
        String toolError = "remote command failed";
        AgentTranscriptEntry toolEntry = recorder.recordRunMessage(
            session, run, TranscriptMessage.toolResult("call-1", "monitor.get", toolText, toolError));

        assertEquals(userText, message(userEntry).text());
        assertEquals(toolText, message(toolEntry).text());
        assertEquals(toolError, message(toolEntry).getErrorMessage());
        assertEquals("call-1", message(toolEntry).getToolCallId());
    }

    private TranscriptMessage message(AgentTranscriptEntry entry) {
        return JsonUtil.fromJson(entry.getPayloadJson(), TranscriptMessage.class);
    }
}
