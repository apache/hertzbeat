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

import com.fasterxml.jackson.databind.ObjectMapper;

import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.ai.model.tool.ToolCallingManager;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Protocol-specific request mapping, including stateless tool-result replay. */
final class ProtocolRequest {
    static final String STATE = "hertzbeatProviderState";
    private static final ObjectMapper JSON = new ObjectMapper();

    private ProtocolRequest() {}

    static Map<String, Object> body(
            ModelProviderConfig config, Prompt prompt, ToolCallingManager tools) {
        String protocol = ModelConnection.protocol(config);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", config.getModel());
        body.put("stream", true);
        List<Object> messages = new ArrayList<>();
        List<String> system = new ArrayList<>();
        for (Message message : prompt.getInstructions()) {
            if (protocol.equals("anthropic-messages") && message instanceof SystemMessage) {
                system.add(message.getText());
            } else {
                mapMessage(messages, message, protocol, config.getModel());
            }
        }
        body.put(protocol.equals("openai-responses") ? "input" : "messages", messages);
        if (!system.isEmpty()) body.put("system", String.join("\n", system));
        if (protocol.equals("openai-responses")) {
            body.put("store", false);
            body.put("include", List.of("reasoning.encrypted_content"));
        }
        Integer limit = prompt.getOptions() == null ? null : prompt.getOptions().getMaxTokens();
        if (protocol.equals("anthropic-messages"))
            body.put("max_tokens", limit == null ? 4096 : limit);
        else if (limit != null)
            body.put(
                    protocol.equals("openai-responses")
                            ? "max_output_tokens"
                            : "max_completion_tokens",
                    limit);
        // Generation controls are omitted for protocols/models which reject a universal temperature
        // default.
        if (config.getProtocol() == null && protocol.equals("openai-chat")
                && prompt.getOptions() != null
                && prompt.getOptions().getTemperature() != null) {
            body.put("temperature", prompt.getOptions().getTemperature());
        }
        if (prompt.getOptions() instanceof ToolCallingChatOptions options) {
            List<Map<String, Object>> definitions =
                    tools.resolveToolDefinitions(options).stream()
                            .map(
                                    tool -> {
                                        Map<String, Object> definition = new LinkedHashMap<>();
                                        definition.put("name", tool.name());
                                        definition.put("description", tool.description());
                                        definition.put(
                                                protocol.equals("anthropic-messages")
                                                        ? "input_schema"
                                                        : "parameters",
                                                parse(tool.inputSchema()));
                                        if (protocol.equals("openai-responses")) {
                                            definition.put("type", "function");
                                            definition.put("strict", false);
                                        }
                                        return protocol.equals("openai-chat")
                                                ? Map.<String, Object>of(
                                                        "type", "function", "function", definition)
                                                : definition;
                                    })
                            .toList();
            if (!definitions.isEmpty()) body.put("tools", definitions);
        }
        return body;
    }

    private static void mapMessage(
            List<Object> messages, Message message, String protocol, String model) {
        if (message instanceof ToolResponseMessage tool) {
            for (ToolResponseMessage.ToolResponse result : tool.getResponses()) {
                messages.add(
                    switch (protocol) {
                        case "openai-responses" ->
                                    Map.of(
                                            "type",
                                            "function_call_output",
                                            "call_id",
                                            result.id(),
                                            "output",
                                            result.responseData());
                        case "anthropic-messages" ->
                                    Map.of(
                                            "role",
                                            "user",
                                            "content",
                                            List.of(
                                                    Map.of(
                                                            "type",
                                                            "tool_result",
                                                            "tool_use_id",
                                                            result.id(),
                                                            "content",
                                                            result.responseData())));
                        default ->
                                    Map.of(
                                            "role",
                                            "tool",
                                            "tool_call_id",
                                            result.id(),
                                            "content",
                                            result.responseData());
                    });
            }
            return;
        }
        String role = message.getMessageType().getValue();
        String text = message.getText() == null ? "" : message.getText();
        if (!(message instanceof AssistantMessage assistant)) {
            messages.add(Map.of("role", role, "content", text));
            return;
        }
        Object state = assistant.getMetadata().get(STATE);
        if (state instanceof Map<?, ?> saved
                && protocol.equals(saved.get("protocol"))
                && model.equals(saved.get("model"))
                && saved.get("items") instanceof List<?> items) {
            if (protocol.equals("openai-responses")) {
                messages.addAll(items);
                if (!text.isEmpty()) messages.add(Map.of("role", "assistant", "content", text));
            } else if (protocol.equals("anthropic-messages")) {
                List<Object> blocks = new ArrayList<>();
                boolean textAdded = text.isEmpty();
                for (Object item : items) {
                    if (!textAdded && item instanceof Map<?, ?> block
                            && "tool_use".equals(block.get("type"))) {
                        blocks.add(Map.of("type", "text", "text", text));
                        textAdded = true;
                    }
                    blocks.add(item);
                }
                if (!textAdded) blocks.add(Map.of("type", "text", "text", text));
                messages.add(Map.of("role", "assistant", "content", blocks));
            } else {
                mapAssistant(messages, assistant, text, protocol);
            }
            return;
        }
        mapAssistant(messages, assistant, text, protocol);
    }

    private static void mapAssistant(
            List<Object> messages, AssistantMessage assistant, String text, String protocol) {
        List<AssistantMessage.ToolCall> calls =
                assistant.getToolCalls() == null ? List.of() : assistant.getToolCalls();
        if (protocol.equals("openai-responses")) {
            if (!text.isEmpty()) messages.add(Map.of("role", "assistant", "content", text));
            for (var call : calls)
                messages.add(
                        Map.of(
                                "type",
                                "function_call",
                                "call_id",
                                call.id(),
                                "name",
                                call.name(),
                                "arguments",
                                call.arguments()));
        } else if (protocol.equals("anthropic-messages")) {
            List<Object> blocks = new ArrayList<>();
            if (!text.isEmpty()) blocks.add(Map.of("type", "text", "text", text));
            for (var call : calls)
                blocks.add(
                        Map.of(
                                "type",
                                "tool_use",
                                "id",
                                call.id(),
                                "name",
                                call.name(),
                                "input",
                                parse(call.arguments())));
            messages.add(Map.of("role", "assistant", "content", blocks));
        } else {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("role", "assistant");
            item.put("content", text);
            if (!calls.isEmpty())
                item.put(
                        "tool_calls",
                        calls.stream()
                                .map(
                                        call ->
                                                Map.of(
                                                        "id",
                                                        call.id(),
                                                        "type",
                                                        "function",
                                                        "function",
                                                        Map.of(
                                                                "name",
                                                                call.name(),
                                                                "arguments",
                                                                call.arguments())))
                                .toList());
            messages.add(item);
        }
    }

    private static Object parse(String json) {
        try {
            return JSON.readValue(json, Map.class);
        } catch (Exception exception) {
            throw new ModelProviderException("Invalid tool JSON", false);
        }
    }
}
