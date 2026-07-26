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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.metadata.ChatResponseMetadata;
import org.springframework.ai.chat.metadata.DefaultUsage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;

/**
 * Test case for {@link HertzBeatModel}.
 */
class HertzBeatModelTest {

    @Test
    void finalAnswerShouldMapAssistantTextAndUsage() {
        CapturingChatModel chatModel = new CapturingChatModel(response(new AssistantMessage("Healthy."),
                ChatResponseMetadata.builder()
                        .usage(new DefaultUsage(11, 7, 18))
                        .build()));
        HertzBeatModel client = new HertzBeatModel(chatModel);

        AgentRuntimeModelResponse response = stream(client, request());

        assertEquals(AgentRuntimeModelResponse.ResponseType.FINAL_ANSWER, response.getType());
        assertEquals("Healthy.", response.getFinalAnswer());
        assertNull(response.getAssistantText());
        assertEquals(11, response.getUsage().promptTokens());
        assertEquals(7, response.getUsage().completionTokens());
        assertEquals(18, response.getUsage().totalTokens());
        assertNull(chatModel.prompt.getOptions().getModel());
        assertEquals(0.4D, chatModel.prompt.getOptions().getTemperature());
        assertEquals(2, chatModel.prompt.getInstructions().size());
        SystemMessage runtimeContext = assertInstanceOf(SystemMessage.class,
                chatModel.prompt.getInstructions().get(1));
        assertFalse(runtimeContext.getMetadata().containsKey("runtimeRuntimePrompt.Frame"));
        assertTrue(runtimeContext.getText().contains("## Runtime"));
        assertFalse(runtimeContext.getText().contains("Trusted"));
        assertTrue(runtimeContext.getText().contains("context"));
        assertFalse(chatModel.prompt.getInstructions().stream()
                .filter(UserMessage.class::isInstance)
                .map(UserMessage.class::cast)
                .map(UserMessage::getText)
                .anyMatch(text -> text.contains("## Runtime")
                        || text.startsWith("Context:")));
        assertFalse(chatModel.prompt.getOptions() instanceof ToolCallingChatOptions);
    }

    @Test
    void finalAnswerShouldKeepModelTextUnchanged() {
        String text = "  raw apiKey=visible " + "x".repeat(1500) + "  ";
        CapturingChatModel chatModel = new CapturingChatModel(response(new AssistantMessage(text),
                ChatResponseMetadata.builder().build()));
        HertzBeatModel client = new HertzBeatModel(chatModel);

        AgentRuntimeModelResponse response = stream(client, request());

        assertEquals(AgentRuntimeModelResponse.ResponseType.FINAL_ANSWER, response.getType());
        assertEquals(text, response.getFinalAnswer());
        assertNull(response.getAssistantText());
    }

    @Test
    void maxCompletionTokensShouldMapToGenericOptions() {
        CapturingChatModel chatModel = new CapturingChatModel(response(new AssistantMessage("Healthy."),
                ChatResponseMetadata.builder().build()));
        HertzBeatModel client = new HertzBeatModel(chatModel);

        stream(client, requestWithMaxCompletionTokens());

        assertEquals(1234, chatModel.prompt.getOptions().getMaxTokens());
    }

    @Test
    void streamingFinalAnswerShouldEmitTextDeltasAndAggregateResponse() {
        CapturingChatModel chatModel = new CapturingChatModel(response(new AssistantMessage("unused"),
                ChatResponseMetadata.builder().build()), List.of(
                response(new AssistantMessage("Healthy "),
                        ChatResponseMetadata.builder().build()),
                response(new AssistantMessage("now."),
                        ChatResponseMetadata.builder()
                                .usage(new DefaultUsage(11, 7, 18))
                                .build())));
        HertzBeatModel client = new HertzBeatModel(chatModel);
        List<String> deltas = new ArrayList<>();

        AgentRuntimeModelResponse response = client.stream(request(), control(), deltas::add);

        assertEquals(List.of("Healthy ", "now."), deltas);
        assertEquals(AgentRuntimeModelResponse.ResponseType.FINAL_ANSWER, response.getType());
        assertEquals("Healthy now.", response.getFinalAnswer());
        assertNull(response.getAssistantText());
        assertEquals(11, response.getUsage().promptTokens());
        assertEquals(7, response.getUsage().completionTokens());
        assertEquals(18, response.getUsage().totalTokens());
        assertNull(chatModel.prompt.getOptions().getModel());
    }

    @Test
    void userPromptBlockShouldBeMappedFromPromptMessages() {
        CapturingChatModel chatModel = new CapturingChatModel(response(new AssistantMessage("Done."),
                ChatResponseMetadata.builder().build()));
        HertzBeatModel client = new HertzBeatModel(chatModel);

        stream(client, requestWithUserContext());

        List<Message> messages = chatModel.prompt.getInstructions();
        assertEquals(3, messages.size());
        SystemMessage runtimeContext = assertInstanceOf(SystemMessage.class, messages.get(1));
        assertFalse(runtimeContext.getText().contains("sender=alice"));
        UserMessage userContextMessage = assertInstanceOf(UserMessage.class, messages.get(2));
        assertFalse(userContextMessage.getMetadata().containsKey("runtimeRuntimePrompt.Frame"));
        assertTrue(userContextMessage.getText().contains("## Runtime"));
        assertFalse(userContextMessage.getText().contains("Untrusted"));
        assertFalse(userContextMessage.getText().contains("<untrusted_context>"));
        assertTrue(userContextMessage.getText().contains("sender=alice"));
    }

    @Test
    void toolCallShouldMapJsonArgumentsWithoutToolCallbacks() {
        AssistantMessage.ToolCall toolCall = new AssistantMessage.ToolCall(
                "call-1", "function", "monitor.get", "{\"pageSize\":1,\"keyword\":\"cpu\"}");
        AssistantMessage assistantMessage = AssistantMessage.builder()
                .content("")
                .toolCalls(List.of(toolCall))
                .build();
        CapturingChatModel chatModel = new CapturingChatModel(response(assistantMessage,
                ChatResponseMetadata.builder().build()));
        HertzBeatModel client = new HertzBeatModel(chatModel);

        AgentRuntimeModelResponse response = stream(client, request());

        assertEquals(AgentRuntimeModelResponse.ResponseType.TOOL_CALLS, response.getType());
        assertNull(response.getFinalAnswer());
        assertEquals(1, response.getToolCalls().size());
        AgentRuntimeToolCall runtimeToolCall = response.getToolCalls().get(0);
        assertEquals("call-1", runtimeToolCall.getToolCallId());
        assertEquals("monitor.get", runtimeToolCall.getToolName());
        assertEquals(1, runtimeToolCall.getArguments().get("pageSize"));
        assertEquals("cpu", runtimeToolCall.getArguments().get("keyword"));
        assertFalse(chatModel.prompt.getOptions() instanceof ToolCallingChatOptions);
    }

    @Test
    void missingToolCallIdsShouldBeGenerated() {
        AssistantMessage assistantMessage = AssistantMessage.builder()
                .content("")
                .toolCalls(List.of(
                        new AssistantMessage.ToolCall(null, "function", "monitor.get", "{\"pageSize\":1}"),
                        new AssistantMessage.ToolCall("   ", "function", "monitor.get", "{\"pageSize\":2}")))
                .build();
        CapturingChatModel chatModel = new CapturingChatModel(response(assistantMessage,
                ChatResponseMetadata.builder().build()));
        HertzBeatModel client = new HertzBeatModel(chatModel);

        AgentRuntimeModelResponse response = stream(client, request());

        assertEquals(AgentRuntimeModelResponse.ResponseType.TOOL_CALLS, response.getType());
        assertEquals(2, response.getToolCalls().size());
        String firstToolCallId = response.getToolCalls().get(0).getToolCallId();
        String secondToolCallId = response.getToolCalls().get(1).getToolCallId();
        assertTrue(firstToolCallId.startsWith("call_"));
        assertTrue(secondToolCallId.startsWith("call_"));
        assertNotEquals(firstToolCallId, secondToolCallId);
        assertEquals(1, response.getToolCalls().get(0).getArguments().get("pageSize"));
        assertEquals(2, response.getToolCalls().get(1).getArguments().get("pageSize"));
    }

    @Test
    void blankAssistantTextShouldMapInvalidResponse() {
        CapturingChatModel chatModel = new CapturingChatModel(response(new AssistantMessage("   "),
                ChatResponseMetadata.builder()
                        .usage(new DefaultUsage(11, 0, 11))
                        .build()));
        HertzBeatModel client = new HertzBeatModel(chatModel);

        AgentRuntimeModelResponse response = stream(client, request());

        assertEquals(AgentRuntimeModelResponse.ResponseType.INVALID_RESPONSE, response.getType());
        assertNull(response.getFinalAnswer());
        assertTrue(response.getToolCalls().isEmpty());
        assertEquals("Runtime model returned neither a final answer nor tool calls.", response.getErrorMessage());
        assertEquals(11, response.getUsage().totalTokens());
    }

    @Test
    void availableToolsShouldBeExposedAsDisabledToolCallbacks() {
        CapturingChatModel chatModel = new CapturingChatModel(response(new AssistantMessage("Need a tool."),
                ChatResponseMetadata.builder().build()));
        HertzBeatModel client = new HertzBeatModel(chatModel);

        stream(client, requestWithTools());

        ToolCallingChatOptions options = assertInstanceOf(ToolCallingChatOptions.class,
                chatModel.prompt.getOptions());
        assertEquals(1234, options.getMaxTokens());
        assertEquals(1, options.getToolCallbacks().size());
        ToolCallback callback = options.getToolCallbacks().get(0);
        ToolDefinition definition = callback.getToolDefinition();
        assertEquals("monitor.get", definition.name());
        assertTrue(definition.description().contains("Query monitor inventory"));
        assertTrue(definition.description().contains("apiKey=secret"));
        assertTrue(definition.inputSchema().contains("\"type\": \"object\""));
        assertTrue(definition.inputSchema().contains("\"pageSize\""));
        assertTrue(definition.inputSchema().contains("\"additionalProperties\": false"));
        UnsupportedOperationException exception = assertThrows(UnsupportedOperationException.class,
                () -> callback.call("{\"pageSize\":1}"));
        assertEquals("Tool execution is owned by AgentRuntimeLoop", exception.getMessage());
        assertTrue(chatModel.prompt.getContents().contains("## Tool Protocol"));
        assertTrue(chatModel.prompt.getContents().contains("monitor.get"));
        assertTrue(chatModel.prompt.getContents().contains("Query monitor inventory"));
        assertTrue(chatModel.prompt.getInstructions().stream()
                .filter(SystemMessage.class::isInstance)
                .map(SystemMessage.class::cast)
                .anyMatch(message -> message.getText().contains("## Tool Protocol")));
        assertFalse(chatModel.prompt.getInstructions().stream()
                .filter(UserMessage.class::isInstance)
                .map(UserMessage.class::cast)
                .map(UserMessage::getText)
                .anyMatch(text -> text.contains("## Tool Protocol")));
    }

    @Test
    void structuredHistoryShouldPreserveConversationOrder() {
        CapturingChatModel chatModel = new CapturingChatModel(response(new AssistantMessage("Done."),
                ChatResponseMetadata.builder().build()));
        HertzBeatModel client = new HertzBeatModel(chatModel);

        stream(client, requestWithHistory());

        List<Message> messages = chatModel.prompt.getInstructions();
        assertEquals(7, messages.size());
        assertInstanceOf(SystemMessage.class, messages.get(0));
        SystemMessage contextMessage = assertInstanceOf(SystemMessage.class, messages.get(1));
        assertFalse(contextMessage.getMetadata().containsKey("runtimeRuntimePrompt.Frame"));
        assertTrue(contextMessage.getText().contains("## Runtime"));
        assertFalse(contextMessage.getText().contains("Earlier question"));

        UserMessage priorUserMessage = assertInstanceOf(UserMessage.class, messages.get(2));
        assertEquals("Earlier question", priorUserMessage.getText());

        AssistantMessage priorAssistantMessage = assertInstanceOf(AssistantMessage.class, messages.get(3));
        assertEquals("Earlier answer", priorAssistantMessage.getText());

        UserMessage currentUserMessage = assertInstanceOf(UserMessage.class, messages.get(4));
        assertEquals("diagnose", currentUserMessage.getText());

        AssistantMessage toolCallMessage = assertInstanceOf(AssistantMessage.class, messages.get(5));
        assertEquals(1, toolCallMessage.getToolCalls().size());
        AssistantMessage.ToolCall toolCall = toolCallMessage.getToolCalls().get(0);
        assertEquals("call-1", toolCall.id());
        assertEquals("alert.history", toolCall.name());
        assertTrue(toolCall.arguments().contains("\"alertId\":1001")
                || toolCall.arguments().contains("\"alertId\": 1001"));
        assertFalse(toolCall.arguments().contains("agc-1"));

        ToolResponseMessage toolResponseMessage = assertInstanceOf(ToolResponseMessage.class, messages.get(6));
        assertEquals(1, toolResponseMessage.getResponses().size());
        ToolResponseMessage.ToolResponse toolResponse = toolResponseMessage.getResponses().get(0);
        assertEquals("call-1", toolResponse.id());
        assertEquals("alert.history", toolResponse.name());
        assertTrue(toolResponse.responseData().contains("status=SUCCEEDED"));
        assertFalse(toolResponse.responseData().contains("object://agent-output/1"));

        assertFalse(messages.stream()
                .filter(UserMessage.class::isInstance)
                .map(UserMessage.class::cast)
                .map(UserMessage::getText)
                .anyMatch(text -> text.startsWith("Context:")
                        || text.contains("## Runtime")));
    }

    @Test
    void failedToolHistoryShouldUseErrorMessageAsResponseData() {
        CapturingChatModel chatModel = new CapturingChatModel(response(new AssistantMessage("Done."),
            ChatResponseMetadata.builder().build()));
        HertzBeatModel client = new HertzBeatModel(chatModel);
        AgentRuntimeModelRequest request = AgentRuntimeModelRequest.builder()
            .prompt(prompt())
            .chatHistory(List.of(
                TranscriptMessage.assistantToolCalls(null, List.of(TranscriptContent.toolCall(
                    "call-failed", "ssh.inspect", Map.of("monitorId", 42))), null),
                TranscriptMessage.toolResult("call-failed", "ssh.inspect",
                    "partial command output", "SSH authentication failed")))
            .build();

        stream(client, request);

        ToolResponseMessage response = assertInstanceOf(ToolResponseMessage.class,
            chatModel.prompt.getInstructions().getLast());
        assertEquals("SSH authentication failed", response.getResponses().getFirst().responseData());
    }

    @Test
    void compactionSummaryHistoryShouldBeMappedAsUserContext() {
        CapturingChatModel chatModel = new CapturingChatModel(response(new AssistantMessage("Done."),
                ChatResponseMetadata.builder().build()));
        HertzBeatModel client = new HertzBeatModel(chatModel);
        AgentRuntimeModelRequest request = AgentRuntimeModelRequest.builder()
                .prompt(prompt())
                .chatHistory(List.of(
                        TranscriptMessage.compactionSummary(
                                "Previous work found alertId=1001 and monitorId=42.", null, null),
                        TranscriptMessage.userText("recent request")))
                .build();

        stream(client, request);

        List<Message> messages = chatModel.prompt.getInstructions();
        assertEquals(4, messages.size());
        UserMessage summary = assertInstanceOf(UserMessage.class, messages.get(2));
        assertTrue(summary.getText().startsWith("The conversation history before this point was compacted"));
        assertTrue(summary.getText().contains("alertId=1001"));
        UserMessage recent = assertInstanceOf(UserMessage.class, messages.get(3));
        assertEquals("recent request", recent.getText());
    }

    @Test
    void unknownHistoryRolesShouldBeSkipped() {
        CapturingChatModel chatModel = new CapturingChatModel(response(new AssistantMessage("Done."),
                ChatResponseMetadata.builder().build()));
        HertzBeatModel client = new HertzBeatModel(chatModel);
        AgentRuntimeModelRequest request = AgentRuntimeModelRequest.builder()
                .prompt(prompt())
                .chatHistory(List.of(
                        TranscriptMessage.builder()
                                .role(null)
                                .content(List.of(TranscriptContent.text("not a chat message")))
                                .build()))
                .build();

        stream(client, request);

        List<Message> messages = chatModel.prompt.getInstructions();
        assertEquals(2, messages.size());
        assertFalse(messages.stream().anyMatch(ToolResponseMessage.class::isInstance));
        assertFalse(messages.stream()
                .map(Message::getText)
                .anyMatch(text -> text.contains("not a chat message")));
    }

    @Test
    void invalidToolCallJsonShouldFailAsNonRetryableModelError() {
        AssistantMessage.ToolCall toolCall = new AssistantMessage.ToolCall(
                "call-1", "function", "monitor.get", "{invalid");
        AssistantMessage assistantMessage = AssistantMessage.builder()
                .content("")
                .toolCalls(List.of(toolCall))
                .build();
        CapturingChatModel chatModel = new CapturingChatModel(response(assistantMessage,
                ChatResponseMetadata.builder().build()));
        HertzBeatModel client = new HertzBeatModel(chatModel);

        AgentRuntimeModelException exception = assertInstanceOf(AgentRuntimeModelException.class,
                org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () -> stream(client, request())));

        assertFalse(exception.isRetryable());
    }

    private AgentRuntimeModelResponse stream(HertzBeatModel client,
                                             AgentRuntimeModelRequest request) {
        return client.stream(request, control(), delta -> { });
    }

    private AgentRuntimeControl control() {
        return new AgentRuntimeControl("trace", "run", Clock.systemUTC());
    }

    private AgentRuntimeModelRequest request() {
        return AgentRuntimeModelRequest.builder()
                .temperature(0.4D)
                .prompt(prompt())
                .build();
    }

    private AgentRuntimeModelRequest requestWithMaxCompletionTokens() {
        return AgentRuntimeModelRequest.builder()
                .temperature(0.4D)
                .maxCompletionTokens(1234)
                .prompt(prompt())
                .build();
    }

    private AgentRuntimeModelRequest requestWithUserContext() {
        return AgentRuntimeModelRequest.builder()
                .temperature(0.4D)
                .prompt(RuntimePrompt.builder()
                        .instructions("system")
                        .blocks(List.of(
                                block(RuntimePrompt.Role.SYSTEM, RuntimePrompt.Frame.RUNTIME,
                                        "## Runtime\ncontext"),
                                block(RuntimePrompt.Role.USER, RuntimePrompt.Frame.RUNTIME,
                                        """
                                        ## Runtime
                                        Source: Channel
                                        sender=alice
                                        """)))
                        .build())
                .build();
    }

    private AgentRuntimeModelRequest requestWithTools() {
        AgentToolDescriptor tool = AgentToolDescriptor.builder()
                .name("monitor.get")
                .description("Query monitor inventory. apiKey=secret should be redacted.")
                .inputSchema("""
                        {
                          "type": "object",
                          "properties": {
                            "pageSize": {
                              "type": "integer"
                            }
                          },
                          "additionalProperties": false
                        }
                        """)
                .risk(AgentToolRisk.READ)
                .namespace("monitor")
                .exposure(AgentToolExposure.MODEL_VISIBLE)
                .build();
        return AgentRuntimeModelRequest.builder()
                .temperature(0.4D)
                .maxCompletionTokens(1234)
                .prompt(promptWithToolProtocol())
                .availableTools(List.of(tool))
                .build();
    }

    private AgentRuntimeModelRequest requestWithHistory() {
        return AgentRuntimeModelRequest.builder()
                .temperature(0.4D)
                .prompt(prompt())
                .chatHistory(List.of(
                        TranscriptMessage.builder()
                                .role(TranscriptMessage.TranscriptRole.USER)
                                .content(List.of(TranscriptContent.text("Earlier question")))
                                .build(),
                        TranscriptMessage.builder()
                                .role(TranscriptMessage.TranscriptRole.ASSISTANT)
                                .content(List.of(TranscriptContent.text("Earlier answer")))
                                .build(),
                        TranscriptMessage.builder()
                                .role(TranscriptMessage.TranscriptRole.USER)
                                .content(List.of(TranscriptContent.text("diagnose")))
                                .build(),
                        TranscriptMessage.builder()
                                .role(TranscriptMessage.TranscriptRole.ASSISTANT)
                                .content(List.of(TranscriptContent.toolCall("call-1", "alert.history",
                                        Map.of("alertId", 1001))))
                                .build(),
                        TranscriptMessage.builder()
                                .role(TranscriptMessage.TranscriptRole.TOOL_RESULT)
                                .content(List.of(TranscriptContent.text("status=SUCCEEDED alert closed")))
                                .toolName("alert.history")
                                .toolCallId("call-1")
                                .build()))
                .build();
    }

    private RuntimePrompt prompt() {
        return RuntimePrompt.builder()
                .instructions("system")
                .blocks(List.of(
                        block(RuntimePrompt.Role.SYSTEM, RuntimePrompt.Frame.RUNTIME,
                                """
                                        ## Runtime
                                        context
                                        """)))
                .build();
    }

    private RuntimePrompt promptWithToolProtocol() {
        return RuntimePrompt.builder()
                .instructions("system")
                .blocks(List.of(
                        block(RuntimePrompt.Role.SYSTEM, RuntimePrompt.Frame.RUNTIME,
                                "## Runtime\ncontext"),
                        block(RuntimePrompt.Role.SYSTEM, RuntimePrompt.Frame.TOOL_PROTOCOL,
                                """
                                        ## Tool Protocol
                                        - Available tools are listed below and also provided as structured model tool definitions.

                                        ### Tool: monitor.get
                                        Name: monitor.get
                                        Description: Query monitor inventory.
                                        """)))
                .build();
    }

    private RuntimePrompt.Block block(RuntimePrompt.Role role, RuntimePrompt.Frame frame, String content) {
        return RuntimePrompt.Block.builder()
                .role(role)
                .frame(frame)
                .content(content)
                .build();
    }

    private ChatResponse response(AssistantMessage assistantMessage, ChatResponseMetadata metadata) {
        return new ChatResponse(List.of(new Generation(assistantMessage)), metadata);
    }

    private static final class CapturingChatModel implements ChatModel {

        private final ChatResponse response;
        private final List<ChatResponse> streamResponses;
        private Prompt prompt;

        private CapturingChatModel(ChatResponse response) {
            this(response, null);
        }

        private CapturingChatModel(ChatResponse response, List<ChatResponse> streamResponses) {
            this.response = response;
            this.streamResponses = streamResponses;
        }

        @Override
        public ChatResponse call(Prompt prompt) {
            this.prompt = prompt;
            return response;
        }

        @Override
        public Flux<ChatResponse> stream(Prompt prompt) {
            this.prompt = prompt;
            return Flux.fromIterable(streamResponses == null ? List.of(response) : streamResponses);
        }
    }
}
