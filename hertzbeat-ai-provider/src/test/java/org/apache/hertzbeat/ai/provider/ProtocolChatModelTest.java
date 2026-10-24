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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;

import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/** Verifies real HTTP protocol contracts against local fixtures. */
class ProtocolChatModelTest {
    private final ObjectMapper json = new ObjectMapper();
    private final List<JsonNode> bodies = new CopyOnWriteArrayList<>();
    private final List<String> paths = new CopyOnWriteArrayList<>();
    private final List<com.sun.net.httpserver.Headers> headers = new CopyOnWriteArrayList<>();
    private HttpServer server;
    private volatile String fixture;
    private volatile int status = 200;

    @BeforeEach
    void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.setExecutor(java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor());
        server.createContext(
                "/",
                exchange -> {
                    paths.add(exchange.getRequestURI().getPath());
                    headers.add(exchange.getRequestHeaders());
                    bodies.add(json.readTree(exchange.getRequestBody()));
                    byte[] bytes = fixture.getBytes(StandardCharsets.UTF_8);
                    exchange.getResponseHeaders().set("Content-Type", "text/event-stream");
                    exchange.sendResponseHeaders(status, bytes.length);
                    exchange.getResponseBody().write(bytes);
                    exchange.close();
                });
        server.start();
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    @ParameterizedTest
    @ValueSource(strings = {"openai-chat", "openai-responses", "anthropic-messages"})
    void streamsTextAndCompleteToolsAndReplaysToolResults(String protocol) {
        fixture =
        switch (protocol) {
            case "openai-chat" ->
                            event(
                                            "{\"choices\":[{\"delta\":{\"content\":\"Hello\",\"tool_calls\":[{\"index\":0,"
                                            + "\"id\":\"call1\",\"function\":{\"name\":\"lookup\",\"arguments\":\"{\"}}]}}]}")
                                    + event(
                                            "{\"choices\":[{\"delta\":{\"tool_calls\":[{\"index\":0,\"function\":{\"arguments\":\"}\"}}]},"
                                            + "\"finish_reason\":\"tool_calls\"}],\"usage\":{\"prompt_tokens\":10,\"completion_tokens\":2}}")
                                    + "data: [DONE]\n\n";
            case "openai-responses" ->
                            event("{\"type\":\"response.output_text.delta\",\"delta\":\"Hello\"}")
                                    + event(
                                            "{\"type\":\"response.output_item.done\",\"output_index\":0,"
                                            + "\"item\":{\"type\":\"reasoning\",\"id\":\"rs1\",\"summary\":[],\"encrypted_content\":\"opaque\"}}")
                                    + event(
                                            "{\"type\":\"response.output_item.done\",\"output_index\":1,"
                                            + "\"item\":{\"type\":\"function_call\",\"call_id\":\"call1\",\"name\":\"lookup\",\"arguments\":\"{}\"}}")
                                    + event(
                                            "{\"type\":\"response.completed\",\"response\":{\"usage\":{\"input_tokens\":10,\"output_tokens\":2}}}");
            default ->
                            event(
                                            "{\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":10}}}")
                                    + event(
                                            "{\"type\":\"content_block_start\",\"index\":0,\"content_block\":{\"type\":\"text\",\"text\":\"\"}}")
                                    + event(
                                            "{\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"Hello\"}}")
                                    + event(
                                            "{\"type\":\"content_block_start\",\"index\":1,\"content_block\":{\"type\":\"tool_use\",\"id\":\"call1\",\"name\":\"lookup\",\"input\":{}}}")
                                    + event(
                                            "{\"type\":\"content_block_delta\",\"index\":1,\"delta\":{\"type\":\"input_json_delta\",\"partial_json\":\"{}\"}}")
                                    + event("{\"type\":\"content_block_stop\",\"index\":1}")
                                    + event(
                                            "{\"type\":\"message_delta\",\"usage\":{\"output_tokens\":2}}")
                                    + event("{\"type\":\"message_stop\"}");
        };
        ModelProviderConfig config = config(protocol);
        config.setAuthMode("default");
        config.setApiKey("unit-test-key");
        var model = new ProtocolChatModelFactory().create(config, false);
        ToolCallingChatOptions options =
                ToolCallingChatOptions.builder().toolCallbacks(tool()).build();
        var chunks =
                model.stream(new Prompt(List.of(new UserMessage("lookup")), options))
                        .collectList()
                        .block(Duration.ofSeconds(5));
        assertEquals(
                "Hello",
                chunks.stream()
                        .map(chunk -> chunk.getResult().getOutput().getText())
                        .reduce("", String::concat));
        var last = chunks.getLast();
        var assistant = last.getResult().getOutput();
        assertEquals("{}", assistant.getToolCalls().getFirst().arguments());
        assertEquals("call1", assistant.getToolCalls().getFirst().id());
        assertEquals(12, last.getMetadata().getUsage().getTotalTokens());
        assertEquals(
                protocol.equals("anthropic-messages") ? "unit-test-key" : "Bearer unit-test-key",
                headers.getFirst()
                        .getFirst(
                                protocol.equals("anthropic-messages")
                                        ? "x-api-key"
                                        : "Authorization"));
        assertFalse(paths.getFirst().contains("/v1/v1/"));
        var result =
                ToolResponseMessage.builder()
                        .responses(
                                List.of(
                                        new ToolResponseMessage.ToolResponse(
                                                "call1", "lookup", "found")))
                        .build();
        model.stream(new Prompt(List.of(new UserMessage("lookup"), assistant, result), options))
                .collectList()
                .block(Duration.ofSeconds(5));
        String replay = bodies.getLast().toString();
        assertTrue(replay.contains("call1"));
        assertTrue(replay.contains("found"));
        if (protocol.equals("openai-responses")) {
            assertTrue(replay.contains("opaque"));
            assertFalse(bodies.getLast().path("store").asBoolean(true));
        }
        assertTrue(bodies.getFirst().has("tools"));
        assertEquals(2, bodies.size());
    }

    @Test
    void noAuthAndCustomHeadersUseExactPrefixOrFinalEndpoint() {
        fixture =
                event(
                        "{\"choices\":[{\"delta\":{\"content\":\"OK\"},\"finish_reason\":\"stop\"}]}");
        ModelProviderConfig config = config("openai-chat");
        config.setBaseUrl(config.getBaseUrl() + "/chat/completions");
        config.setHeaders(Map.of("X-Gateway-Token", "header-secret"));
        config.setAuthMode("custom-header");
        assertEquals(
                "OK",
                new ProtocolChatModelFactory()
                        .create(config, false)
                        .call(new Prompt("hi"))
                        .getResult()
                        .getOutput()
                        .getText());
        assertEquals("/proxy/v1/chat/completions", paths.getFirst());
        assertNull(headers.getFirst().getFirst("Authorization"));
        assertEquals("header-secret", headers.getFirst().getFirst("X-Gateway-Token"));
    }

    @Test
    void sanitizedHttpErrorsAreNonRetryableForAuthentication() {
        status = 401;
        fixture = "credential-leak unit-test-key";
        var model = new ProtocolChatModelFactory().create(config("openai-chat"), false);
        var error = assertThrows(ModelProviderException.class, () -> model.call(new Prompt("hi")));
        assertFalse(error.isRetryable());
        assertEquals("Provider HTTP 401", error.getMessage());
    }

    @Test
    void truncatedStreamFailsInsteadOfExecutingPartialTool() {
        fixture = event("{\"choices\":[{\"delta\":{\"content\":\"partial\"}}]}");
        var model = new ProtocolChatModelFactory().create(config("openai-chat"), false);
        assertThrows(ModelProviderException.class, () -> model.call(new Prompt("hi")));
    }

    @Test
    void cancellationClosesSilentStreamPromptly() throws Exception {
        server.removeContext("/");
        CountDownLatch opened = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        server.createContext(
                "/",
                exchange -> {
                    exchange.sendResponseHeaders(200, 0);
                    exchange.getResponseBody().flush();
                    opened.countDown();
                    try {
                        release.await(5, TimeUnit.SECONDS);
                    } catch (InterruptedException ignored) {
                        Thread.currentThread().interrupt();
                    }
                    exchange.close();
                });
        var model = new ProtocolChatModelFactory().create(config("openai-chat"), false);
        var subscription = model.stream(new Prompt("hi")).subscribe();
        assertTrue(opened.await(3, TimeUnit.SECONDS));
        assertTimeoutPreemptively(Duration.ofSeconds(2), subscription::dispose);
        release.countDown();
    }

    @Test
    void legacyClientExecutesCallbacksAndReplaysTheirResults() {
        fixture = event("{\"choices\":[{\"delta\":{\"tool_calls\":[{\"index\":0,\"id\":\"call1\","
                + "\"function\":{\"name\":\"lookup\",\"arguments\":\"{}\"}}]},\"finish_reason\":\"tool_calls\"}]}");
        java.util.concurrent.atomic.AtomicInteger invoked = new java.util.concurrent.atomic.AtomicInteger();
        ToolCallback callback = new ToolCallback() {
            public ToolDefinition getToolDefinition() { return tool().getToolDefinition(); }

            public String call(String input) {
                invoked.incrementAndGet();
                fixture = event("{\"choices\":[{\"delta\":{\"content\":\"found\"},\"finish_reason\":\"stop\"}]}");
                return "found";
            }
        };
        var options = ToolCallingChatOptions.builder().toolCallbacks(callback).build();
        var response = new ProtocolChatModelFactory().create(config("openai-chat"), true)
                .call(new Prompt(List.of(new UserMessage("lookup")), options));
        assertEquals("found", response.getResult().getOutput().getText());
        assertEquals(1, invoked.get());
        assertTrue(bodies.getLast().toString().contains("found"));
    }

    @Test
    void internalToolTurnsAreSeparatedInTheBlockingAnswer() {
        fixture = event("{\"choices\":[{\"delta\":{\"content\":\"checking\"}}]}")
                + event("{\"choices\":[{\"delta\":{\"tool_calls\":[{\"index\":0,\"id\":\"call1\",\"function\":"
                        + "{\"name\":\"lookup\",\"arguments\":\"{}\"}}]},\"finish_reason\":\"tool_calls\"}]}");
        ToolCallback callback = new ToolCallback() {
            public ToolDefinition getToolDefinition() { return tool().getToolDefinition(); }

            public String call(String input) {
                fixture = event("{\"choices\":[{\"delta\":{\"content\":\"done\"},\"finish_reason\":\"stop\"}]}");
                return "done";
            }
        };
        var options = ToolCallingChatOptions.builder().toolCallbacks(callback).build();
        var response = new ProtocolChatModelFactory().create(config("openai-chat"), true)
                .call(new Prompt(List.of(new UserMessage("lookup")), options));
        assertEquals("checking\ndone", response.getResult().getOutput().getText());
    }

    private ModelProviderConfig config(String protocol) {
        ModelProviderConfig config = new ModelProviderConfig();
        config.setName("test");
        config.setProtocol(protocol);
        config.setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort() + "/proxy/v1");
        config.setModel("test-model");
        config.setAuthMode("none");
        return config;
    }

    private ToolCallback tool() {
        return new ToolCallback() {
            public ToolDefinition getToolDefinition() {
                return ToolDefinition.builder()
                        .name("lookup")
                        .description("lookup")
                        .inputSchema("{\"type\":\"object\",\"properties\":{}}")
                        .build();
            }

            public String call(String input) {
                throw new AssertionError("Gateway must own tool execution");
            }
        };
    }

    private String event(String json) {
        return "data: " + json + "\n\n";
    }
}
