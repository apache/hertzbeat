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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.metadata.ChatResponseMetadata;
import org.springframework.ai.chat.metadata.DefaultUsage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Accumulates fragmented tool arguments; only complete calls become executable. */
final class ProtocolStream {
    private static final ObjectMapper JSON = new ObjectMapper();
    private final ModelProviderConfig config;
    private final Map<Integer, Call> calls = new LinkedHashMap<>();
    private final Map<Integer, ObjectNode> items = new LinkedHashMap<>();
    private int inputTokens;
    private int outputTokens;
    private boolean complete;

    ProtocolStream(ModelProviderConfig config) {
        this.config = config;
    }

    ChatResponse accept(JsonNode event) {
        if (event.has("error") || event.path("type").asText().equals("error")) {
            throw new ModelProviderException("Provider returned an error event", false);
        }
        return switch (ModelConnection.protocol(config)) {
            case "openai-responses" -> responses(event);
            case "anthropic-messages" -> anthropic(event);
            default -> chat(event);
        };
    }

    private ChatResponse chat(JsonNode event) {
        usage(event.path("usage"), "prompt_tokens", "completion_tokens");
        JsonNode choice = event.path("choices").path(0);
        JsonNode delta = choice.path("delta");
        if (delta.isMissingNode()) delta = choice.path("message");
        for (JsonNode tool : delta.path("tool_calls")) {
            Call call = calls.computeIfAbsent(tool.path("index").asInt(), ignored -> new Call());
            call.id += tool.path("id").asText("");
            call.name += tool.path("function").path("name").asText("");
            call.arguments.append(tool.path("function").path("arguments").asText(""));
        }
        if (!choice.path("finish_reason").isNull() && !choice.path("finish_reason").isMissingNode())
            complete = true;
        return delta(delta.path("content").asText(""));
    }

    private ChatResponse responses(JsonNode event) {
        String type = event.path("type").asText();
        if (type.equals("response.failed") || type.equals("response.incomplete")) {
            throw new ModelProviderException("Provider response failed or was incomplete", false);
        }
        if (type.equals("response.output_item.done")) {
            ObjectNode item = (ObjectNode) event.path("item").deepCopy();
            items.put(event.path("output_index").asInt(), item);
            if (item.path("type").asText().equals("function_call")) {
                calls.put(
                        event.path("output_index").asInt(),
                        new Call(
                                item.path("call_id").asText(),
                                item.path("name").asText(),
                                item.path("arguments").asText()));
            }
        }
        if (type.equals("response.completed")) {
            complete = true;
            usage(event.path("response").path("usage"), "input_tokens", "output_tokens");
            // Compatible gateways may send only the terminal response instead of output_item.done
            // events.
            int index = 0;
            for (JsonNode item : event.path("response").path("output")) {
                items.put(index, (ObjectNode) item.deepCopy());
                if (item.path("type").asText().equals("function_call"))
                    calls.put(
                            index,
                            new Call(
                                    item.path("call_id").asText(),
                                    item.path("name").asText(),
                                    item.path("arguments").asText()));
                index++;
            }
        }
        return delta(
                type.equals("response.output_text.delta") ? event.path("delta").asText("") : "");
    }

    private ChatResponse anthropic(JsonNode event) {
        String type = event.path("type").asText();
        int index = event.path("index").asInt();
        if (type.equals("message_start"))
            usage(event.path("message").path("usage"), "input_tokens", "output_tokens");
        if (type.equals("message_delta"))
            usage(event.path("usage"), "input_tokens", "output_tokens");
        if (type.equals("content_block_start")) {
            ObjectNode block = (ObjectNode) event.path("content_block").deepCopy();
            items.put(index, block);
            if (block.path("type").asText().equals("tool_use")) {
                Call call = new Call(block.path("id").asText(), block.path("name").asText(), "");
                calls.put(index, call);
            }
        }
        JsonNode delta = event.path("delta");
        if (type.equals("content_block_delta")) {
            String deltaType = delta.path("type").asText();
            if (deltaType.equals("input_json_delta"))
                calls.get(index).arguments.append(delta.path("partial_json").asText());
            ObjectNode block = items.get(index);
            if (block != null) {
                String field = switch (deltaType) {
                    case "text_delta" -> "text";
                    case "thinking_delta" -> "thinking";
                    case "signature_delta" -> "signature";
                    default -> null;
                };
                if (field != null)
                    block.put(field, block.path(field).asText("") + delta.path(field).asText(""));
            }
        }
        if (type.equals("content_block_stop") && calls.containsKey(index)) {
            Call call = calls.get(index);
            try {
                if (call.arguments.isEmpty())
                    call.arguments.append(items.get(index).path("input").toString());
                items.get(index).set("input", JSON.readTree(call.arguments.toString()));
            } catch (Exception exception) {
                throw new ModelProviderException("Provider returned invalid tool arguments", false);
            }
        }
        if (type.equals("message_stop")) complete = true;
        return delta(
                type.equals("content_block_delta")
                                && delta.path("type").asText().equals("text_delta")
                        ? delta.path("text").asText("")
                        : "");
    }

    ChatResponse finish() {
        if (!complete)
            throw new ModelProviderException("Provider stream ended before completion", true);
        List<AssistantMessage.ToolCall> tools = new ArrayList<>();
        for (Call call : calls.values()) {
            if (call.id.isBlank() || call.name.isBlank())
                throw new ModelProviderException(
                        "Provider returned an incomplete tool call", false);
            tools.add(
                    new AssistantMessage.ToolCall(
                            call.id, "function", call.name, call.arguments.toString()));
        }
        Map<String, Object> metadata =
                items.isEmpty()
                        ? Map.of()
                        : Map.of(
                                ProtocolRequest.STATE,
                                Map.of(
                                        "protocol",
                                        ModelConnection.protocol(config),
                                        "model",
                                        config.getModel(),
                                        "items",
                                        items.values().stream()
                                                .filter(item ->
                                                        !item.path("type").asText().equals("message")
                                                                && !item.path("type").asText().equals("text"))
                                                .map(item -> JSON.convertValue(item, Map.class))
                                                .toList()));
        AssistantMessage assistant =
                AssistantMessage.builder()
                        .content("")
                        .toolCalls(tools)
                        .properties(metadata)
                        .build();
        return new ChatResponse(
                List.of(new Generation(assistant)),
                ChatResponseMetadata.builder()
                        .model(config.getModel())
                        .usage(new DefaultUsage(inputTokens, outputTokens))
                        .build());
    }

    private ChatResponse delta(String text) {
        return text.isEmpty()
                ? null
                : new ChatResponse(List.of(new Generation(new AssistantMessage(text))));
    }

    private void usage(JsonNode usage, String input, String output) {
        if (usage.has(input)) inputTokens = usage.path(input).asInt();
        if (usage.has(output)) outputTokens = usage.path(output).asInt();
    }

    private static final class Call {
        private String id = "";
        private String name = "";
        private final StringBuilder arguments = new StringBuilder();

        private Call() {}

        private Call(String id, String name, String arguments) {
            this.id = id;
            this.name = name;
            this.arguments.append(arguments);
        }
    }
}
