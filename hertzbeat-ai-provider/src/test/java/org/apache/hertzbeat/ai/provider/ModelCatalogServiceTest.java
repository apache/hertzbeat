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
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpServer;

import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

class ModelCatalogServiceTest {
    private HttpServer server;
    private final List<String> paths = new CopyOnWriteArrayList<>();
    private final List<com.sun.net.httpserver.Headers> headers = new CopyOnWriteArrayList<>();
    private volatile String body =
            "{\"data\":[{\"id\":\"model-1\",\"display_name\":\"Model One\"},{\"id\":\"model-1\"}]}";
    private volatile int status = 200;
    private volatile boolean paged;

    @BeforeEach
    void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.setExecutor(java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor());
        server.createContext(
                "/",
                exchange -> {
                    paths.add(exchange.getRequestURI().toString());
                    headers.add(exchange.getRequestHeaders());
                    String payload =
                            paged && exchange.getRequestURI().getQuery().contains("after_id=")
                                    ? "{\"data\":[{\"id\":\"two\"}]}"
                                    : body;
                    byte[] bytes = payload.getBytes(StandardCharsets.UTF_8);
                    exchange.getResponseHeaders().set("Location", "/redirect-destination");
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
    void discoversWithoutModelOrNameUsingTheSameProtocolAuthentication(String protocol) {
        ModelProviderConfig input = config(protocol);
        input.setAuthMode("default");
        input.setApiKey("catalog-test-key");
        var result = new ModelCatalogService().list(input);
        assertEquals("ready", result.status());
        assertEquals(
                List.of(new ModelCatalogService.Model("model-1", "Model One")), result.models());
        assertTrue(paths.getFirst().startsWith("/proxy/v1/models"));
        String authHeader = protocol.equals("anthropic-messages") ? "x-api-key" : "Authorization";
        assertEquals(
                protocol.equals("anthropic-messages")
                        ? "catalog-test-key"
                        : "Bearer catalog-test-key",
                headers.getFirst().getFirst(authHeader));
        if (protocol.equals("anthropic-messages"))
            assertEquals("2023-06-01", headers.getFirst().getFirst("anthropic-version"));
        assertNull(input.getModel());
        assertNull(input.getName());
    }

    @Test
    void supportsFullEndpointsCustomHeadersAndNoAuthentication() {
        ModelProviderConfig input = config("openai-responses");
        input.setBaseUrl(input.getBaseUrl() + "/responses/");
        input.setAuthMode("custom-header");
        input.setHeaders(Map.of("X-Token", "catalog-token"));
        assertEquals("ready", new ModelCatalogService().list(input).status());
        assertEquals("catalog-token", headers.getFirst().getFirst("X-Token"));
        assertNull(headers.getFirst().getFirst("Authorization"));
        assertEquals("/proxy/v1/models", paths.getFirst());
    }

    @Test
    void followsAnthropicPaginationAndRejectsRepeatedCursors() {
        body = "{\"data\":[{\"id\":\"one\"}],\"has_more\":true,\"last_id\":\"one\"}";
        var result = new ModelCatalogService().list(config("anthropic-messages"));
        assertEquals("invalid-response", result.status());
        assertTrue(paths.get(1).contains("after_id=one"));
        assertTrue(result.models().isEmpty());
    }

    @Test
    void collectsAllAnthropicPagesAndDeduplicatesIds() {
        paged = true;
        body =
                "{\"data\":[{\"id\":\"one\"},{\"id\":\"one\"}],\"has_more\":true,\"last_id\":\"one\"}";
        var result = new ModelCatalogService().list(config("anthropic-messages"));
        assertEquals("ready", result.status());
        assertEquals(
                List.of("one", "two"),
                result.models().stream().map(ModelCatalogService.Model::id).toList());
        assertFalse(result.truncated());
        assertEquals(2, paths.size());
    }

    @Test
    void boundsCatalogSizeAndRejectsOversizedResponseBodies() {
        body =
                "{\"data\":["
                        + java.util.stream.IntStream.range(0, 1001)
                                .mapToObj(index -> "{\"id\":\"model-" + index + "\"}")
                                .collect(java.util.stream.Collectors.joining(","))
                        + "]}";
        var result = new ModelCatalogService().list(config("openai-chat"));
        assertEquals("ready", result.status());
        assertEquals(1000, result.models().size());
        assertTrue(result.truncated());
        body = " ".repeat(2 * 1024 * 1024 + 1);
        assertEquals("unavailable", new ModelCatalogService().list(config("openai-chat")).status());
    }

    @ParameterizedTest
    @ValueSource(ints = {401, 403, 404, 405, 500, 302})
    void reportsSafeFailuresWithoutUpstreamBodyOrFollowingRedirects(int code) {
        status = code;
        body = "private-key-and-upstream-body";
        var result = new ModelCatalogService().list(config("openai-chat"));
        assertEquals(
                code == 401 || code == 403
                        ? "authentication-failed"
                        : code == 404 || code == 405 ? "unsupported" : "unavailable",
                result.status());
        assertTrue(result.models().isEmpty());
        assertFalse(result.toString().contains(body));
        assertEquals(1, paths.size());
    }

    @Test
    void rejectsInvalidResponsesAndInvalidConnectionInput() {
        body = "{\"data\":{}}";
        assertEquals(
                "invalid-response", new ModelCatalogService().list(config("openai-chat")).status());
        ModelProviderConfig input = config("openai-chat");
        input.setBaseUrl("file:///tmp/models");
        assertEquals("invalid-input", new ModelCatalogService().list(input).status());
        assertEquals(1, paths.size());
    }

    private ModelProviderConfig config(String protocol) {
        ModelProviderConfig config = new ModelProviderConfig();
        config.setProtocol(protocol);
        config.setAuthMode("none");
        config.setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort() + "/proxy/v1");
        return config;
    }
}
