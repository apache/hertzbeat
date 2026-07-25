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

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Consumer;
import org.apache.hertzbeat.ai.gateway.runtime.provider.AgentModelRequestOptionsFactory;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.metadata.ChatResponseMetadata;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.util.StringUtils;

/**
 * HertzBeat model execution semantics backed by a Spring AI ChatModel.
 */
public class HertzBeatModel {

    private static final int SUMMARY_LIMIT = 1024;
    private static final String RUNTIME_PROMPT_FRAME = "runtimeRuntimePrompt.Frame";
    private static final String DEFAULT_TOOL_TYPE = "function";
    private static final String DEFAULT_TOOL_NAME = "tool_call";
    private static final String DEFAULT_TOOL_RESPONSE_ID = "runtime-tool-response";
    private static final String EMPTY_MODEL_RESPONSE_CODE = "empty_model_response";
    private static final String EMPTY_MODEL_RESPONSE_MESSAGE =
            "Runtime model returned neither a final answer nor tool calls.";
    private static final String TOOL_EXECUTION_DISABLED = "Tool execution is disabled in the Spring AI adapter. "
            + "Return the tool call to AgentRuntimeLoop for controlled execution.";
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final ChatModel chatModel;
    private final ObjectMapper objectMapper;
    private final AgentModelRequestOptionsFactory requestOptionsFactory;

    public HertzBeatModel(ChatModel chatModel) {
        this(chatModel, new ObjectMapper(), HertzBeatModel::genericRequestOptions);
    }

    public HertzBeatModel(ChatModel chatModel,
                          AgentModelRequestOptionsFactory requestOptionsFactory) {
        this(chatModel, new ObjectMapper(), requestOptionsFactory);
    }

    HertzBeatModel(ChatModel chatModel, ObjectMapper objectMapper) {
        this(chatModel, objectMapper, HertzBeatModel::genericRequestOptions);
    }

    HertzBeatModel(ChatModel chatModel, ObjectMapper objectMapper,
                   AgentModelRequestOptionsFactory requestOptionsFactory) {
        this.chatModel = chatModel;
        this.objectMapper = objectMapper;
        this.requestOptionsFactory = requestOptionsFactory;
    }

    public AgentRuntimeModelResponse stream(AgentRuntimeModelRequest request, AgentRuntimeControl control,
                                            Consumer<String> textDeltaConsumer) {
        control.checkpoint();
        Prompt prompt = toPrompt(request);
        Thread currentThread = Thread.currentThread();
        AutoCloseable abortRegistration = control.onAbort(currentThread::interrupt);
        ChatResponseAccumulator accumulator = new ChatResponseAccumulator(textDeltaConsumer);
        try {
            chatModel.stream(prompt)
                    .doOnNext(response -> {
                        control.checkpoint();
                        accumulator.accept(response);
                    })
                    .blockLast();
        } catch (AgentRuntimeModelException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            if (control.isStopRequested()) {
                control.checkpoint();
            }
            // Provider exception messages can include request or credential details and cross into runtime errors.
            String providerMessage = AgentRuntimeTextSanitizer
                    .sanitizeAndLimit(exception.getMessage(), SUMMARY_LIMIT);
            throw AgentRuntimeModelException.retryable(
                    "Spring AI chat model stream failed: " + providerMessage, exception);
        } finally {
            try {
                abortRegistration.close();
            } catch (Exception ignored) {
                // Runtime abort hook cleanup is best effort.
            }
        }
        control.checkpoint();
        return accumulator.toRuntimeResponse();
    }

    private Prompt toPrompt(AgentRuntimeModelRequest request) {
        RuntimePrompt runtimePrompt = request.getPrompt();
        List<Message> messages = new ArrayList<>();
        List<ToolCallback> toolCallbacks = toToolCallbacks(request.getAvailableTools());
        addBaseInstructions(messages, runtimePrompt);
        addPromptBlocks(messages, runtimePrompt, RuntimePrompt.Role.SYSTEM);
        addPromptBlocks(messages, runtimePrompt, RuntimePrompt.Role.USER);
        addHistoryMessages(messages, request.getChatHistory());
        ChatOptions options = requestOptionsFactory.create(request, toolCallbacks);
        return new Prompt(messages, options);
    }

    private void addBaseInstructions(List<Message> messages, RuntimePrompt runtimePrompt) {
        String instructions = runtimePrompt.getInstructions();
        if (!StringUtils.hasText(instructions)) {
            return;
        }
        messages.add(SystemMessage.builder()
                .text(instructions)
                .metadata(Map.of(RUNTIME_PROMPT_FRAME, RuntimePrompt.Frame.BASE_INSTRUCTIONS.id()))
                .build());
    }

    private void addPromptBlocks(List<Message> messages, RuntimePrompt runtimePrompt, RuntimePrompt.Role role) {
        for (RuntimePrompt.Block block : runtimePrompt.getBlocks()) {
            if (block.getRole() != role) {
                continue;
            }
            Message message = toSpringPromptMessage(block);
            if (message != null) {
                messages.add(message);
            }
        }
    }

    private Message toSpringPromptMessage(RuntimePrompt.Block block) {
        String content = block.getContent();
        if (!StringUtils.hasText(content)) {
            return null;
        }
        Map<String, Object> metadata = promptMetadata(block);
        if (block.getRole() == RuntimePrompt.Role.SYSTEM) {
            return SystemMessage.builder()
                    .text(content)
                    .metadata(metadata)
                    .build();
        }
        return UserMessage.builder()
                .text(content)
                .metadata(metadata)
                .build();
    }

    private Map<String, Object> promptMetadata(RuntimePrompt.Block block) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        String frame = block.frameId();
        if (StringUtils.hasText(frame)) {
            metadata.put(RUNTIME_PROMPT_FRAME, frame);
        }
        return metadata;
    }

    private void addHistoryMessages(List<Message> messages, List<TranscriptMessage> chatHistory) {
        if (chatHistory.isEmpty()) {
            return;
        }
        for (TranscriptMessage historyMessage : chatHistory) {
            Message message = toSpringHistoryMessage(historyMessage);
            if (message != null) {
                messages.add(message);
            }
        }
    }

    private Message toSpringHistoryMessage(TranscriptMessage historyMessage) {
        TranscriptMessage.TranscriptRole role = historyMessage.getRole();
        if (role == TranscriptMessage.TranscriptRole.USER) {
            return UserMessage.builder()
                    .text(historyMessage.text())
                    .metadata(historyMetadata(historyMessage))
                    .build();
        }
        if (role == TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY) {
            return UserMessage.builder()
                    .text(historyMessage.renderedCompactionSummary())
                    .metadata(historyMetadata(historyMessage))
                    .build();
        }
        if (role == TranscriptMessage.TranscriptRole.ASSISTANT && !historyMessage.toolCalls().isEmpty()) {
            return assistantToolCallHistoryMessage(historyMessage);
        }
        if (role == TranscriptMessage.TranscriptRole.ASSISTANT) {
            return assistantTextHistoryMessage(historyMessage);
        }
        if (role == TranscriptMessage.TranscriptRole.TOOL_RESULT) {
            return toolResponseHistoryMessage(historyMessage);
        }
        return null;
    }

    private AssistantMessage assistantToolCallHistoryMessage(TranscriptMessage historyMessage) {
        List<AssistantMessage.ToolCall> toolCalls = historyMessage.toolCalls().stream()
                .map(this::springToolCall)
                .toList();
        return AssistantMessage.builder()
                .content(historyMessage.text())
                .properties(historyMetadata(historyMessage))
                .toolCalls(toolCalls)
                .build();
    }

    private AssistantMessage.ToolCall springToolCall(TranscriptContent block) {
        String id = block.getId();
        String name = StringUtils.hasText(block.getName()) ? block.getName() : DEFAULT_TOOL_NAME;
        return new AssistantMessage.ToolCall(
                StringUtils.hasText(id) ? id : DEFAULT_TOOL_RESPONSE_ID,
                DEFAULT_TOOL_TYPE,
                name,
                assistantToolArguments(block));
    }

    private AssistantMessage assistantTextHistoryMessage(TranscriptMessage historyMessage) {
        return AssistantMessage.builder()
                .content(historyMessage.text())
                .properties(historyMetadata(historyMessage))
                .build();
    }

    private ToolResponseMessage toolResponseHistoryMessage(TranscriptMessage historyMessage) {
        String id = historyMessage.getToolCallId();
        String name = StringUtils.hasText(historyMessage.getToolName())
                ? historyMessage.getToolName()
                : DEFAULT_TOOL_NAME;
        ToolResponseMessage.ToolResponse response = new ToolResponseMessage.ToolResponse(
                StringUtils.hasText(id) ? id : DEFAULT_TOOL_RESPONSE_ID,
                name,
                toolResponseData(historyMessage));
        return ToolResponseMessage.builder()
                .responses(List.of(response))
                .metadata(historyMetadata(historyMessage))
                .build();
    }

    private String assistantToolArguments(TranscriptContent block) {
        Map<String, Object> input = block.getInput();
        if (!input.isEmpty()) {
            return toJson(input);
        }
        return "{}";
    }

    private String toolResponseData(TranscriptMessage historyMessage) {
        if (StringUtils.hasText(historyMessage.getErrorMessage())) {
            return historyMessage.getErrorMessage();
        }
        StringBuilder builder = new StringBuilder();
        String content = historyMessage.text();
        if (StringUtils.hasText(content)) {
            builder.append("content=").append(content).append('\n');
        }
        if (historyMessage.isPruned()) {
            builder.append("pruned=true\n");
        }
        if (builder.isEmpty()) {
            return "No result provided";
        }
        // This method appends line delimiters while assembling the provider tool response; remove the final delimiter.
        return builder.toString().strip();
    }

    private Map<String, Object> historyMetadata(TranscriptMessage historyMessage) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        if (historyMessage.getRole() != null) {
            metadata.put("runtimeRole", historyMessage.getRole().wireValue());
        }
        if (StringUtils.hasText(historyMessage.getToolName())) {
            metadata.put("runtimeToolName", historyMessage.getToolName());
        }
        if (StringUtils.hasText(historyMessage.getToolCallId())) {
            metadata.put("runtimeToolCallId", historyMessage.getToolCallId());
        }
        if (historyMessage.isPruned()) {
            metadata.put("runtimePruned", true);
        }
        return metadata;
    }

    private String toJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            return "{}";
        }
    }

    private static ChatOptions genericRequestOptions(AgentRuntimeModelRequest request,
                                                     List<ToolCallback> toolCallbacks) {
        if (toolCallbacks.isEmpty()) {
            ChatOptions.Builder builder = ChatOptions.builder();
            if (request.getTemperature() != null) {
                builder.temperature(request.getTemperature());
            }
            if (request.getMaxCompletionTokens() != null) {
                builder.maxTokens(request.getMaxCompletionTokens());
            }
            return builder.build();
        }
        ToolCallingChatOptions.Builder builder = ToolCallingChatOptions.builder()
                .toolCallbacks(toolCallbacks);
        if (request.getTemperature() != null) {
            builder.temperature(request.getTemperature());
        }
        if (request.getMaxCompletionTokens() != null) {
            builder.maxTokens(request.getMaxCompletionTokens());
        }
        return builder.build();
    }

    private AgentRuntimeModelResponse toRuntimeResponse(String text, List<AgentRuntimeToolCall> toolCalls,
                                                        ChatResponseMetadata metadata) {
        AgentRuntimeModelResponse.Usage usage = toRuntimeUsage(metadata);
        if (!toolCalls.isEmpty()) {
            return AgentRuntimeModelResponse.toolCalls(text, toolCalls, usage);
        }
        if (StringUtils.hasText(text)) {
            return AgentRuntimeModelResponse.finalAnswer(text, usage);
        }
        return AgentRuntimeModelResponse.invalidResponse(EMPTY_MODEL_RESPONSE_CODE,
                EMPTY_MODEL_RESPONSE_MESSAGE, usage);
    }

    private List<AgentRuntimeToolCall> toRuntimeToolCalls(List<AssistantMessage.ToolCall> toolCalls) {
        // Spring AI returns null when the assistant message has no tool calls.
        if (toolCalls == null || toolCalls.isEmpty()) {
            return List.of();
        }
        List<AgentRuntimeToolCall> result = new ArrayList<>(toolCalls.size());
        for (AssistantMessage.ToolCall toolCall : toolCalls) {
            Map<String, Object> arguments = parseArguments(toolCall);
            String toolCallId = toolCall.id();
            // Some OpenAI-compatible providers omit tool call IDs; synthesize one so tool responses can reference it.
            if (!StringUtils.hasText(toolCallId)) {
                toolCallId = "call_" + UUID.randomUUID().toString().replace("-", "");
            }
            result.add(AgentRuntimeToolCall.builder()
                    .toolCallId(toolCallId)
                    .toolName(toolCall.name())
                    .arguments(arguments)
                    .build());
        }
        return List.copyOf(result);
    }

    private List<ToolCallback> toToolCallbacks(List<AgentToolDescriptor> availableTools) {
        if (availableTools.isEmpty()) {
            return List.of();
        }
        List<ToolCallback> callbacks = new ArrayList<>(availableTools.size());
        for (AgentToolDescriptor tool : availableTools) {
            callbacks.add(new DisabledRuntimeToolCallback(tool));
        }
        return List.copyOf(callbacks);
    }

    private Map<String, Object> parseArguments(AssistantMessage.ToolCall toolCall) {
        String arguments = toolCall.arguments();
        if (!StringUtils.hasText(arguments)) {
            return Map.of();
        }
        try {
            JsonNode root = objectMapper.readTree(arguments);
            if (root.isNull()) {
                return Map.of();
            }
            if (!root.isObject()) {
                throw new IllegalArgumentException("tool call arguments must be a JSON object");
            }
            return objectMapper.convertValue(root, MAP_TYPE);
        } catch (JsonProcessingException | IllegalArgumentException exception) {
            // Model-generated tool arguments can contain secrets or huge fragments and are returned in runtime errors.
            String parseMessage = AgentRuntimeTextSanitizer
                    .sanitizeAndLimit(exception.getMessage(), SUMMARY_LIMIT);
            throw AgentRuntimeModelException.nonRetryable(
                    "Spring AI tool call arguments are not valid JSON for tool "
                            + toolCall.name() + ": " + parseMessage,
                    exception);
        }
    }

    private AgentRuntimeModelResponse.Usage toRuntimeUsage(ChatResponseMetadata metadata) {
        // Spring AI metadata and usage are optional; omit usage rather than inventing provider metrics.
        if (metadata == null || metadata.getUsage() == null) {
            return null;
        }
        Usage usage = metadata.getUsage();
        // Spring AI Usage token getters may be null when a provider omits usage fields; normalize them here.
        long promptTokens = Objects.requireNonNullElse(usage.getPromptTokens(), 0).longValue();
        long completionTokens = Objects.requireNonNullElse(usage.getCompletionTokens(), 0).longValue();
        long totalTokens = Objects.requireNonNullElse(usage.getTotalTokens(), 0).longValue();
        return AgentRuntimeModelResponse.Usage.builder()
                .promptTokens(promptTokens)
                .completionTokens(completionTokens)
                .totalTokens(totalTokens > 0 ? totalTokens : promptTokens + completionTokens)
                .build();
    }

    private final class ChatResponseAccumulator {

        private final Consumer<String> textDeltaConsumer;
        private final StringBuilder text = new StringBuilder();
        private List<AgentRuntimeToolCall> toolCalls = List.of();
        private ChatResponseMetadata metadata;

        private ChatResponseAccumulator(Consumer<String> textDeltaConsumer) {
            this.textDeltaConsumer = textDeltaConsumer;
        }

        private void accept(ChatResponse response) {
            // Streaming chunks may omit metadata until the final chunk; keep the last provided metadata.
            ChatResponseMetadata responseMetadata = response.getMetadata();
            if (responseMetadata != null) {
                metadata = responseMetadata;
            }
            Generation generation = response.getResult();
            // Streaming chunks can carry only metadata; wait until an assistant output chunk arrives.
            if (generation == null || generation.getOutput() == null) {
                return;
            }
            AssistantMessage output = generation.getOutput();
            List<AgentRuntimeToolCall> responseToolCalls = toRuntimeToolCalls(output.getToolCalls());
            if (!responseToolCalls.isEmpty()) {
                toolCalls = responseToolCalls;
            }
            String delta = output.getText();
            if (StringUtils.hasLength(delta)) {
                text.append(delta);
                textDeltaConsumer.accept(delta);
            }
        }

        private AgentRuntimeModelResponse toRuntimeResponse() {
            if (text.isEmpty() && toolCalls.isEmpty()) {
                throw new AgentRuntimeModelException("Spring AI chat model stream returned no assistant message.",
                        true);
            }
            return HertzBeatModel.this.toRuntimeResponse(text.toString(), toolCalls, metadata);
        }
    }

    private final class DisabledRuntimeToolCallback implements ToolCallback {

        private final ToolDefinition toolDefinition;

        private DisabledRuntimeToolCallback(AgentToolDescriptor tool) {
            this.toolDefinition = ToolDefinition.builder()
                    .name(tool.getName())
                    .description(tool.getDescription())
                    .inputSchema(tool.getInputSchema())
                    .build();
        }

        @Override
        public ToolDefinition getToolDefinition() {
            return toolDefinition;
        }

        @Override
        public String call(String toolInput) {
            return TOOL_EXECUTION_DISABLED;
        }
    }
}
