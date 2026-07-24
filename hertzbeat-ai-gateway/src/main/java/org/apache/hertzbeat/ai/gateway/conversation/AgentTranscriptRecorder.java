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

import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeHistoryWindow;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptContent;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.stereotype.Service;

/**
 * Records and rehydrates Agent Gateway transcript messages.
 */
@Service
public class AgentTranscriptRecorder {

    private static final int TRANSCRIPT_TOOL_NAME_LIMIT = 128;
    private static final int TRANSCRIPT_TOOL_CALL_ID_LIMIT = 128;
    private static final int TRANSCRIPT_TOOL_ERROR_LIMIT = 2048;

    private final AgentSessionService sessionService;

    public AgentTranscriptRecorder(AgentSessionService sessionService) {
        // Transcript persistence is required for every recorder operation.
        this.sessionService = Objects.requireNonNull(sessionService, "sessionService must not be null");
    }

    public List<TranscriptMessage> chatHistory(Long sessionId) {
        return List.copyOf(sessionService.findRecentTranscriptMessages(sessionId));
    }

    public void recordCompactionCheckpoint(AgentSession session,
                                           AgentRuntimeHistoryWindow.CompactionCheckpoint checkpoint) {
        sessionService.persistCompactionCheckpoint(session.getId(), checkpoint);
    }

    public AgentTranscriptEntry recordUserTranscriptEntry(AgentSession session, AgentRun run, UserInput userInput) {
        return recordTranscriptMessage(session, run, TranscriptMessage.userText(userInput.getMessage().getText()));
    }

    /** Append a runtime message immediately using the owning session's durable sequence. */
    public AgentTranscriptEntry recordRunMessage(AgentSession session, AgentRun run, TranscriptMessage message) {
        return recordTranscriptMessage(session, run, message);
    }

    private AgentTranscriptEntry recordTranscriptMessage(AgentSession session, AgentRun run,
                                                          TranscriptMessage message) {
        TranscriptMessage validatedMessage = validateTranscriptMessage(message);
        return sessionService.recordTranscriptEntry(AgentTranscriptEntry.builder()
            .sessionId(session.getId())
            .runId(run.getId())
            .payloadJson(toJson(validatedMessage))
            .messageRole(validatedMessage.getRole().wireValue())
            .build());
    }

    private TranscriptMessage validateTranscriptMessage(TranscriptMessage message) {
        // Every persisted payload must have a supported role so checkpoint queries and replay remain deterministic.
        if (message.getRole() == null) {
            throw new IllegalArgumentException("Transcript message role must not be null");
        }
        return message.toBuilder()
            .toolCallId(GatewayText.requireBounded(
                    message.getToolCallId(), TRANSCRIPT_TOOL_CALL_ID_LIMIT,
                    "Transcript model tool-call id"))
            .toolName(GatewayText.requireBounded(
                    message.getToolName(), TRANSCRIPT_TOOL_NAME_LIMIT, "Transcript tool name"))
            .errorMessage(GatewayText.requireBounded(
                    message.getErrorMessage(), TRANSCRIPT_TOOL_ERROR_LIMIT,
                    "Transcript tool error"))
            .content(validateTranscriptContent(message.getContent()))
            .build();
    }

    private List<TranscriptContent> validateTranscriptContent(List<TranscriptContent> content) {
        if (content == null || content.isEmpty()) {
            return List.of();
        }
        return content.stream()
            .filter(Objects::nonNull)
            .map(block -> block.toBuilder()
                .id(GatewayText.requireBounded(
                        block.getId(), TRANSCRIPT_TOOL_CALL_ID_LIMIT, "Transcript tool-call id"))
                .name(GatewayText.requireBounded(
                        block.getName(), TRANSCRIPT_TOOL_NAME_LIMIT, "Transcript tool name"))
                .input(block.getInput() == null ? Map.of() : block.getInput())
                .build())
            .toList();
    }

    private String toJson(TranscriptMessage message) {
        String json = JsonUtil.toJson(message);
        if (GatewayText.isBlank(json)) {
            throw new IllegalArgumentException("Agent transcript payload cannot be serialized");
        }
        return json;
    }
}
