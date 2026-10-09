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
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import okhttp3.Call;
import okhttp3.Interceptor;
import okhttp3.Request;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.test.util.ReflectionTestUtils;

class OpenAiStreamBridgeTest {

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void keepsOptionsAndNativeRetriesWithinOneScopeThenRejectsLateCalls(boolean retryFirst) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicReference<OpenAiStreamBridge> owner = new AtomicReference<>();
        AtomicInteger attempts = new AtomicInteger();
        List<Map<String, List<String>>> headers = new CopyOnWriteArrayList<>();
        List<JsonNode> bodies = new CopyOnWriteArrayList<>();
        List<Set<String>> activeScopes = new CopyOnWriteArrayList<>();
        server.createContext("/v1/chat/completions", exchange -> {
            headers.add(Map.copyOf(exchange.getRequestHeaders()));
            bodies.add(new ObjectMapper().readTree(exchange.getRequestBody().readAllBytes()));
            activeScopes.add(Set.copyOf(scopes(owner.get()).keySet()));
            boolean retry = attempts.incrementAndGet() == 1 && retryFirst;
            byte[] response = (retry ? "{\"error\":{\"message\":\"Local retry proof\"}}" :
                    "data: {\"id\":\"local-retry\",\"object\":\"chat.completion.chunk\",\"created\":1,"
                    + "\"model\":\"requested-model\",\"choices\":[{\"index\":0,\"delta\":{\"role\":\"assistant\","
                    + "\"content\":\"ready\"},\"finish_reason\":\"stop\"}]}\n\ndata: [DONE]\n\n")
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", retry ? "application/json" : "text/event-stream");
            exchange.getResponseHeaders().set("Retry-After", "0");
            exchange.sendResponseHeaders(retry ? 503 : 200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();
        try {
            Map<String, String> defaultHeaders = Map.of("X-Default-Proof", "default-value",
                    "x-hertzbeat-stream-scope", "untrusted-default");
            OpenAiChatOptions defaults = OpenAiChatOptions.builder()
                    .baseUrl("http://127.0.0.1:" + server.getAddress().getPort() + "/v1")
                    .apiKey("local-proof-key").model("default-model").customHeaders(defaultHeaders).build();
            OpenAiStreamBridge bridge = new OpenAiStreamBridge(defaults);
            owner.set(bridge);
            Map<String, String> promptHeaders = Map.of("X-Prompt-Proof", "prompt-value",
                    "X-HERTZBEAT-STREAM-SCOPE", "untrusted-prompt");
            OpenAiChatOptions options = OpenAiChatOptions.builder().model("requested-model")
                    .temperature(0.2).maxCompletionTokens(128).customHeaders(promptHeaders).build();
            Prompt prompt = new Prompt("Local native option proof", options);
            assertTrue(scopes(bridge).isEmpty());
            var response = bridge.stream(prompt).collectList().block(Duration.ofSeconds(5));
            assertEquals("ready", response.getFirst().getResult().getOutput().getText());
            assertEquals(retryFirst ? 2 : 1, attempts.get());
            assertTrue(scopes(bridge).isEmpty(), "A completed stream retained native call ownership");
            assertEquals(defaultHeaders, defaults.getCustomHeaders());
            assertEquals(promptHeaders, options.getCustomHeaders());
            assertEquals(1, activeScopes.getFirst().size());
            for (Set<String> active : activeScopes) {
                assertEquals(activeScopes.getFirst(), active, "SDK retry escaped its original subscription scope");
            }
            for (Map<String, List<String>> sent : headers) {
                assertNull(header(sent, "X-HertzBeat-Stream-Scope"), "Internal header reached the provider");
                assertEquals(List.of("default-value"), header(sent, "X-Default-Proof"));
                assertEquals(List.of("prompt-value"), header(sent, "X-Prompt-Proof"));
            }
            for (JsonNode body : bodies) {
                assertEquals("requested-model", body.get("model").asText());
                assertEquals(0.2, body.get("temperature").asDouble());
                assertEquals(128, body.get("max_completion_tokens").asInt());
            }
            assertLateCallRejected(bridge, activeScopes.getFirst().iterator().next());
            assertTrue(scopes(bridge).isEmpty());
        } finally {
            server.stop(0);
        }
    }

    @Test
    void cancellationReleasesScopeAndRejectsAnAttemptEnteringAfterCleanup() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        CountDownLatch opened = new CountDownLatch(1);
        AtomicReference<com.sun.net.httpserver.HttpExchange> held = new AtomicReference<>();
        server.createContext("/v1/chat/completions", exchange -> {
            exchange.getRequestBody().readAllBytes();
            exchange.getResponseHeaders().set("Content-Type", "text/event-stream");
            exchange.sendResponseHeaders(200, 0);
            exchange.getResponseBody().write(": local pending read\n\n".getBytes(StandardCharsets.UTF_8));
            exchange.getResponseBody().flush();
            held.set(exchange);
            opened.countDown();
        });
        server.start();
        OpenAiStreamBridge bridge = bridgeAt(server);
        var subscription = bridge.stream(new Prompt("Local cancellation ownership proof")).subscribe();
        try {
            assertTrue(opened.await(5, TimeUnit.SECONDS));
            assertEquals(1, scopes(bridge).size());
            String scopeId = scopes(bridge).keySet().iterator().next();
            long cancelledAt = System.nanoTime();
            subscription.dispose();
            assertTrue(System.nanoTime() - cancelledAt < TimeUnit.SECONDS.toNanos(5));
            assertTrue(scopes(bridge).isEmpty(), "Cancellation retained native call ownership");
            assertLateCallRejected(bridge, scopeId);
        } finally {
            subscription.dispose();
            if (held.get() != null) {
                held.get().close();
            }
            server.stop(0);
        }
    }

    @Test
    void providerFailureReleasesScope() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicInteger attempts = new AtomicInteger();
        server.createContext("/v1/chat/completions", exchange -> {
            exchange.getRequestBody().readAllBytes();
            attempts.incrementAndGet();
            byte[] error = "{\"error\":{\"message\":\"Local expected rejection\"}}"
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(400, error.length);
            exchange.getResponseBody().write(error);
            exchange.close();
        });
        server.start();
        try {
            OpenAiStreamBridge bridge = bridgeAt(server);
            RuntimeException failure = assertThrows(RuntimeException.class,
                    () -> bridge.stream(new Prompt("Local rejection proof")).blockLast(Duration.ofSeconds(5)));
            assertTrue(failure.getMessage().contains("Local expected rejection"));
            assertEquals(1, attempts.get());
            assertTrue(scopes(bridge).isEmpty(), "Provider failure retained native call ownership");
        } finally {
            server.stop(0);
        }
    }

    private static OpenAiStreamBridge bridgeAt(HttpServer server) {
        return new OpenAiStreamBridge(OpenAiChatOptions.builder()
                .baseUrl("http://127.0.0.1:" + server.getAddress().getPort() + "/v1")
                .apiKey("local-proof-key").model("local-stream-proof").build());
    }

    private static void assertLateCallRejected(OpenAiStreamBridge bridge, String scopeId) throws Exception {
        // Models a queued attempt reaching its interceptor after real terminal scope cleanup.
        Interceptor.Chain chain = mock(Interceptor.Chain.class);
        Call call = mock(Call.class);
        when(chain.call()).thenReturn(call);
        when(chain.request()).thenReturn(new Request.Builder().url("http://127.0.0.1/unused")
                .header("X-HertzBeat-Stream-Scope", scopeId).build());
        Method intercept = OpenAiStreamBridge.class.getDeclaredMethod("intercept", Interceptor.Chain.class);
        intercept.setAccessible(true);
        InvocationTargetException rejected = assertThrows(InvocationTargetException.class,
                () -> intercept.invoke(bridge, chain));
        assertInstanceOf(IOException.class, rejected.getCause());
        verify(call).cancel();
        verify(chain, never()).proceed(any());
    }

    @SuppressWarnings("unchecked")
    private static Map<String, ?> scopes(OpenAiStreamBridge bridge) {
        return (Map<String, ?>) ReflectionTestUtils.getField(bridge, "scopes");
    }

    private static List<String> header(Map<String, List<String>> headers, String name) {
        return headers.entrySet().stream().filter(entry -> entry.getKey().equalsIgnoreCase(name))
                .map(Map.Entry::getValue).findFirst().orElse(null);
    }
}
