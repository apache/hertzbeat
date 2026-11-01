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

import io.micrometer.observation.ObservationRegistry;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;

/** Standard callback dispatch with exactly one route into the durable Gateway policy/approval executor. */
final class AgentControlledToolDispatcher {
    private final ToolCallingManager manager;

    AgentControlledToolDispatcher(ObservationRegistry observations) {
        manager = ToolCallingManager.builder().observationRegistry(observations)
                .resolutionFallbackEnabled(false).maxTotalToolCalls(1).maxCallsPerTool(1)
                .toolExecutionExceptionProcessor(exception -> {
                    throw exception;
                }).build();
    }

    AgentToolExecutionResult execute(AgentRuntimeToolCall call, Supplier<AgentToolExecutionResult> gateway) {
        var result = new AtomicReference<AgentToolExecutionResult>();
        String arguments = JsonUtil.toJson(call.getArguments());
        ToolCallback callback = new ToolCallback() {
            @Override
            public ToolDefinition getToolDefinition() {
                return ToolDefinition.builder().name(call.getToolName())
                        .description("Controlled Gateway operation").inputSchema("{\"type\":\"object\"}").build();
            }

            @Override
            public String call(String input) {
                if (!arguments.equals(input) || result.get() != null) {
                    throw new IllegalStateException("Gateway callback arguments or single-dispatch contract changed");
                }
                AgentToolExecutionResult executed = Objects.requireNonNull(gateway.get(), "Gateway result is required");
                result.set(executed);
                // Framework pairing/observations need status only; actual payload is retained by the existing ledger.
                return executed.getStatus().name();
            }
        };
        Prompt prompt = new Prompt(List.of(new UserMessage("Execute the single controlled Gateway call.")), ToolCallingChatOptions.builder().toolCallbacks(callback).build());
        var message = AssistantMessage.builder().toolCalls(List.of(new AssistantMessage.ToolCall(
                call.getToolCallId(), "function", call.getToolName(), arguments))).build();
        var paired = manager.executeToolCalls(prompt, new ChatResponse(List.of(new Generation(message))));
        if (!(paired.conversationHistory().getLast() instanceof ToolResponseMessage response)
                || response.getResponses().size() != 1
                || !call.getToolCallId().equals(response.getResponses().getFirst().id())) {
            throw new IllegalStateException("Framework tool response pairing is invalid");
        }
        return Objects.requireNonNull(result.get(), "Controlled callback did not execute");
    }
}
