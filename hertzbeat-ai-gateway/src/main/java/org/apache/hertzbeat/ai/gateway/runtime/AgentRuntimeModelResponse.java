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

import java.util.List;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Value;
import org.springframework.util.StringUtils;

/**
 * Pure Java model response normalized to one explicit response type.
 */
@Value
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class AgentRuntimeModelResponse {

    ResponseType type;

    String finalAnswer;

    String assistantText;

    List<AgentRuntimeToolCall> toolCalls;

    Usage usage;

    String errorMessage;

    public static AgentRuntimeModelResponse finalAnswer(String finalAnswer,
                                                        Usage usage) {
        // Factory methods enforce the normalized response contract before the runtime loop branches on type.
        if (!StringUtils.hasText(finalAnswer)) {
            throw new IllegalArgumentException("finalAnswer must not be blank for FINAL_ANSWER response.");
        }
        return new AgentRuntimeModelResponse(
                ResponseType.FINAL_ANSWER,
                finalAnswer,
                null,
                List.of(),
                usage,
                null);
    }

    public static AgentRuntimeModelResponse toolCalls(String assistantText,
                                                      List<AgentRuntimeToolCall> toolCalls,
                                                      Usage usage) {
        // Factory methods enforce the normalized response contract before the runtime loop branches on type.
        List<AgentRuntimeToolCall> safeToolCalls = List.copyOf(
                Objects.requireNonNull(toolCalls, "toolCalls must not be null for TOOL_CALLS response."));
        if (safeToolCalls.isEmpty()) {
            throw new IllegalArgumentException("toolCalls must not be empty for TOOL_CALLS response.");
        }
        return new AgentRuntimeModelResponse(
                ResponseType.TOOL_CALLS,
                null,
                assistantText,
                safeToolCalls,
                usage,
                null);
    }

    public static AgentRuntimeModelResponse invalidResponse(String errorMessage,
                                                            Usage usage) {
        // INVALID_RESPONSE becomes a terminal runtime error and must carry a displayable message.
        if (!StringUtils.hasText(errorMessage)) {
            throw new IllegalArgumentException("errorMessage is required for INVALID_RESPONSE.");
        }
        return new AgentRuntimeModelResponse(
                ResponseType.INVALID_RESPONSE,
                null,
                null,
                List.of(),
                usage,
                errorMessage);
    }

    /**
     * Normalized response variants decided at the model client boundary.
     */
    public enum ResponseType {
        FINAL_ANSWER,
        TOOL_CALLS,
        INVALID_RESPONSE
    }

    /**
     * Token usage reported by the model provider.
     */
    @Builder
    public record Usage(long promptTokens, long completionTokens, long totalTokens) {

        public Usage {
            if (promptTokens < 0 || completionTokens < 0 || totalTokens < 0) {
                throw new IllegalArgumentException("Agent runtime token usage must not be negative");
            }
        }

        public long getPromptTokens() {
            return promptTokens;
        }

        public long getCompletionTokens() {
            return completionTokens;
        }

        public long getTotalTokens() {
            return totalTokens;
        }
    }

}
