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

package org.apache.hertzbeat.ai.gateway.runtime.provider;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;

import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeControl;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeModelRequest;
import org.apache.hertzbeat.ai.gateway.runtime.RuntimePrompt;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

class AgentOutputTokenWireTest {
    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void actualCompatibleSdkOmitsUnsetLimitsAndHonorsExplicitLimits(boolean configured)
            throws Exception {
        for (String protocol : List.of("chat-completions", "responses")) {
            var captured = new AtomicReference<JsonNode>();
            var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext(
                    "/v1/",
                    exchange -> {
                        captured.set(
                                new ObjectMapper()
                                        .readTree(exchange.getRequestBody().readAllBytes()));
                        byte[] body = (protocol.equals("responses") ? responsesEvents() : chatEvents()).getBytes(StandardCharsets.UTF_8);
                        exchange.getResponseHeaders().set("Content-Type", "text/event-stream");
                        exchange.sendResponseHeaders(200, body.length);
                        exchange.getResponseBody().write(body);
                        exchange.close();
                    });
            server.start();
            try {
                var config = new ModelProviderConfig();
                config.setCode("custom");
                config.setType("openai-compatible");
                config.setModel("local-model");
                config.setApiKey("local-test-only");
                config.setProtocol(protocol);
                config.setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort() + "/v1");
                var model = new OpenAiCompatibleAgentModelProvider().createModel(config);
                var request =
                        AgentRuntimeModelRequest.builder()
                                .prompt(
                                        RuntimePrompt.builder()
                                                .instructions("Local option proof")
                                                .build())
                                .maxCompletionTokens(configured ? 128 : null)
                                .build();
                try (var control = new AgentRuntimeControl("trace", "run", Clock.systemUTC())) {
                    model.stream(request, control, ignored -> {});
                }
                var sent = captured.get();
                assertNotNull(sent);
                assertFalse(sent.has("max_tokens"));
                String field =
                        protocol.equals("responses")
                                ? "max_output_tokens"
                                : "max_completion_tokens";
                if (configured) assertEquals(128, sent.get(field).asInt());
                else assertFalse(sent.has(field));
            } finally {
                server.stop(0);
            }
        }
    }

    private static String chatEvents() throws java.io.IOException {
        return "data: " + new ObjectMapper().writeValueAsString(Map.of(
                "id", "local", "object", "chat.completion.chunk", "created", 1, "model", "local-model",
                "choices", List.of(Map.of("index", 0, "delta", Map.of("role", "assistant", "content", "ready"),
                        "finish_reason", "stop")))) + "\n\ndata: [DONE]\n\n";
    }

    private static String responsesEvents() throws java.io.IOException {
        String fixture;
        try (var input =
                AgentOutputTokenWireTest.class.getResourceAsStream("/upgrade-responses.json")) {
            fixture =
                    new String(input.readAllBytes(), StandardCharsets.UTF_8)
                            .replace("It is 18 degrees in Paris.", "ready");
        }
        var mapper = new ObjectMapper();
        Object response = mapper.readValue(fixture, Map.class);
        String created =
                mapper.writeValueAsString(
                        Map.of(
                                "type",
                                "response.created",
                                "sequence_number",
                                0,
                                "response",
                                response));
        String delta =
                mapper.writeValueAsString(
                        Map.of(
                                "type",
                                "response.output_text.delta",
                                "sequence_number",
                                1,
                                "item_id",
                                "msg_1",
                                "output_index",
                                1,
                                "content_index",
                                0,
                                "delta",
                                "ready",
                                "logprobs",
                                List.of()));
        String completed =
                mapper.writeValueAsString(
                        Map.of(
                                "type",
                                "response.completed",
                                "sequence_number",
                                2,
                                "response",
                                response));
        return "event: response.created\ndata: "
                + created
                + "\n\n"
                + "event: response.output_text.delta\ndata: "
                + delta
                + "\n\n"
                + "event: response.completed\ndata: "
                + completed
                + "\n\n";
    }
}
