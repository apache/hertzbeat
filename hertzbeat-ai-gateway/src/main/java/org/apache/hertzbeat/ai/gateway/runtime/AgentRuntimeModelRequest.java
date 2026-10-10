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
import lombok.Builder;
import lombok.Value;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;

/**
 * Bounded model request assembled by the runtime loop.
 */
@Value
public class AgentRuntimeModelRequest {

    RuntimePrompt prompt;

    List<TranscriptMessage> chatHistory;

    List<AgentToolDescriptor> availableTools;

    Double temperature;

    Integer maxCompletionTokens;

    @Builder
    private AgentRuntimeModelRequest(RuntimePrompt prompt, List<TranscriptMessage> chatHistory,
                                     List<AgentToolDescriptor> availableTools, Double temperature,
                                     Integer maxCompletionTokens) {
        // Model requests cannot be repaired after streaming starts, so their prompt is mandatory at this boundary.
        this.prompt = Objects.requireNonNull(prompt, "Agent runtime model prompt is required");
        // New sessions and tool-free requests legitimately omit these builder values.
        this.chatHistory = chatHistory == null ? List.of() : List.copyOf(chatHistory);
        this.availableTools = availableTools == null ? List.of() : List.copyOf(availableTools);
        this.temperature = temperature;
        this.maxCompletionTokens = maxCompletionTokens;
    }
}
