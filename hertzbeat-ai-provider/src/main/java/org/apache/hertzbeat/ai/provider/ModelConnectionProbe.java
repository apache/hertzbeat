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

package org.apache.hertzbeat.ai.provider;

import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/** Probes capabilities without saving configuration or changing the active connection. */
@Service
public class ModelConnectionProbe {
    private final ProtocolChatModelFactory factory;

    public ModelConnectionProbe(ProtocolChatModelFactory factory) {
        this.factory = factory;
    }

    public Result test(ModelProviderConfig config) {
        var model = factory.create(config, false);
        String text = "failed";
        String streaming = "failed";
        String toolCalling = "not-observed";
        String error = null;
        try {
            var chunks =
                    model.stream(new Prompt("Reply with OK.",
                                    ToolCallingChatOptions.builder().maxTokens(128).build()))
                            .collectList()
                            .block(Duration.ofSeconds(30));
            boolean hasText =
                    chunks.stream()
                            .anyMatch(
                                    chunk ->
                                            chunk.getResult() != null
                                                    && !chunk.getResult()
                                                            .getOutput()
                                                            .getText()
                                                            .isBlank());
            text = hasText ? "passed" : "not-observed";
            streaming = hasText ? "passed" : "not-observed";
        } catch (RuntimeException exception) {
            error = sanitized(exception);
        }
        try {
            ToolCallingChatOptions options =
                    ToolCallingChatOptions.builder().maxTokens(128).toolCallbacks(probeTool()).build();
            List<Message> history = new ArrayList<>();
            history.add(
                    new UserMessage(
                            "Call hertzbeat_connection_test once, then report its result."));
            var response = model.call(new Prompt(history, options));
            if (response.hasToolCalls()) {
                history.add(response.getResult().getOutput());
                List<ToolResponseMessage.ToolResponse> results = new ArrayList<>();
                for (var call : response.getResult().getOutput().getToolCalls()) {
                    if (!call.name().equals("hertzbeat_connection_test"))
                        throw new ModelProviderException("Unexpected probe tool", false);
                    results.add(new ToolResponseMessage.ToolResponse(call.id(), call.name(), "OK"));
                }
                history.add(ToolResponseMessage.builder().responses(results).build());
                var followUp = model.call(new Prompt(history, options));
                toolCalling =
                        !followUp.hasToolCalls()
                                        && !followUp.getResult().getOutput().getText().isBlank()
                                ? "passed"
                                : "not-observed";
            }
        } catch (RuntimeException exception) {
            toolCalling = "failed";
            error = sanitized(exception);
        }
        return new Result(text, streaming, toolCalling, error);
    }

    private String sanitized(RuntimeException exception) {
        return exception instanceof ModelProviderException
                ? exception.getMessage()
                : "Connection test failed or timed out";
    }

    private ToolCallback probeTool() {
        return new ToolCallback() {
            public ToolDefinition getToolDefinition() {
                return ToolDefinition.builder()
                        .name("hertzbeat_connection_test")
                        .description("Return OK")
                        .inputSchema("{\"type\":\"object\",\"properties\":{}}")
                        .build();
            }

            public String call(String input) {
                return "OK";
            }
        };
    }

    /** Independently observed model capabilities. */
    public record Result(String text, String streaming, String toolCalling, String error) {}
}
