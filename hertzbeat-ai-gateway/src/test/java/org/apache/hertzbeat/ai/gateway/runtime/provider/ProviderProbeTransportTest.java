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

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.Proxy;
import java.net.ProxySelector;
import java.net.SocketAddress;
import java.io.IOException;
import java.util.List;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.ai.gateway.application.ProviderConnectionTest.Category;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class ProviderProbeTransportTest {
    private HttpServer server;
    private String origin;
    private final AtomicReference<String> request = new AtomicReference<>();
    private final AtomicReference<String> path = new AtomicReference<>();
    private final AtomicInteger requests = new AtomicInteger();
    private String body = "{\"choices\":[{\"message\":{\"content\":\"READY\"}}]}";
    private int status = 200;

    @BeforeEach
    void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        origin = "http://127.0.0.1:" + server.getAddress().getPort();
        server.createContext("/", exchange -> {
            requests.incrementAndGet();
            path.set(exchange.getRequestURI().getPath());
            request.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            exchange.getResponseHeaders().add("Location", origin + "/redirect-target");
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
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

    private ProviderProbeTransport.Outcome probe(String protocol) throws Exception {
        var destination = new ProviderProbeDestinationPolicy().resolve(origin + "/v1", protocol);
        return new ProviderProbeTransport().execute(destination, protocol, "fixture", "", call -> { });
    }

    @Test
    void chatSendsOnlyFixedSyntheticTextAndNoToolsOrBusinessPayload() throws Exception {
        assertEquals(Category.OK, probe("chat-completions").category());
        var sent = JsonUtil.fromJsonQuietly(request.get());
        assertEquals("/v1/chat/completions", path.get());
        assertEquals(ProviderProbeTransport.SYNTHETIC_INPUT, sent.path("messages").path(0).path("content").asText());
        assertFalse(sent.path("stream").asBoolean());
        assertFalse(sent.has("tools"));
        assertFalse(sent.has("previous_response_id"));
        assertEquals(1, requests.get());
    }

    @Test
    void responsesUsesSelectedWireProtocolWithoutChatFallback() throws Exception {
        body = "{\"output\":[{\"content\":[{\"type\":\"output_text\",\"text\":\"READY\"}]}]}";
        assertEquals(Category.OK, probe("responses").category());
        assertEquals("/v1/responses", path.get());
        var sent = JsonUtil.fromJsonQuietly(request.get());
        assertEquals(ProviderProbeTransport.SYNTHETIC_INPUT, sent.path("input").asText());
        assertFalse(sent.path("store").asBoolean());
        assertFalse(sent.has("messages"));
        assertFalse(sent.has("tools"));
        assertEquals(1, requests.get());
    }

    @ParameterizedTest
    @CsvSource({"401,AUTHENTICATION", "403,AUTHENTICATION", "404,ADDRESS_PATH", "302,ADDRESS_PATH",
        "429,RATE_LIMIT", "500,UPSTREAM", "415,PROTOCOL"})
    void classifiesAndRedactsUpstreamErrorsWithoutFollowingRedirects(int code, Category category) throws Exception {
        status = code;
        body = "{\"error\":{\"message\":\"synthetic-private-fixture\"}}";
        var outcome = probe("responses");
        assertEquals(category, outcome.category());
        assertEquals(code, outcome.httpStatus());
        assertFalse(JsonUtil.toJson(outcome).contains("synthetic-private-fixture"));
        assertEquals(1, requests.get());
    }

    @Test
    void rejectsMalformedOrMismatchedResponsesAndOversizedBodies() throws Exception {
        assertEquals(Category.PROTOCOL, probe("responses").category());
        body = "x".repeat(9000);
        assertEquals(Category.PROTOCOL, probe("responses").category());
        body = "{\"error\":{\"code\":\"model_not_found\"}}";
        status = 404;
        assertEquals(Category.MODEL, probe("responses").category());
    }

    @Test
    void usesTheNormalProxySelectorWithoutLocallyResolvingTheProviderHostname() throws Exception {
        ProxySelector previous = ProxySelector.getDefault();
        var selected = new java.util.concurrent.CopyOnWriteArrayList<URI>();
        ProxySelector.setDefault(new ProxySelector() {
            @Override
            public List<Proxy> select(URI uri) {
                selected.add(uri);
                return List.of(new Proxy(Proxy.Type.HTTP, new InetSocketAddress("127.0.0.1", server.getAddress().getPort())));
            }

            @Override
            public void connectFailed(URI uri, SocketAddress address, IOException failure) { }
        });
        try {
            var target = new ProviderProbeDestinationPolicy().resolve("http://unresolved.fixture.invalid/v1", "chat-completions");
            assertEquals(Category.OK, new ProviderProbeTransport().execute(target, "chat-completions", "fixture", "", call -> { }).category());
            org.junit.jupiter.api.Assertions.assertTrue(selected.stream().anyMatch(uri -> "unresolved.fixture.invalid".equals(uri.getHost())));
            assertEquals("/v1/chat/completions", path.get());
            assertEquals(1, requests.get());
        } finally {
            ProxySelector.setDefault(previous);
        }
    }

    @Test
    void successfulHttpStatusAloneDoesNotCertifyModelResponse() throws Exception {
        for (String response : List.of("{}", "<html>OK</html>", "{\"error\":{\"message\":\"synthetic-private-fixture\"}}",
                "{\"status\":\"failed\",\"output\":[{\"content\":[{\"type\":\"output_text\",\"text\":\"READY\"}]}]}")) {
            body = response;
            var result = probe("responses");
            assertEquals(200, result.httpStatus());
            assertEquals(Category.PROTOCOL, result.category());
        }
    }

    @Test
    void redirectsCannotReachAnotherOriginOrForwardItsCredential() throws Exception {
        var targetRequests = new AtomicInteger();
        var targetServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        targetServer.createContext("/", exchange -> {
            targetRequests.incrementAndGet();
            exchange.sendResponseHeaders(200, -1);
            exchange.close();
        });
        targetServer.start();
        server.createContext("/redirect", exchange -> {
            exchange.getResponseHeaders().set("Location", "http://127.0.0.1:" + targetServer.getAddress().getPort() + "/captured");
            exchange.sendResponseHeaders(302, -1);
            exchange.close();
        });
        try {
            var destination = new ProviderProbeDestinationPolicy().resolve(origin + "/redirect", "responses");
            var result = new ProviderProbeTransport().execute(destination, "responses", "fixture", "synthetic-header-fixture", call -> { });
            assertEquals(Category.ADDRESS_PATH, result.category());
            assertEquals(0, targetRequests.get());
        } finally {
            targetServer.stop(0);
        }
    }

    @Test
    void cancelledCallDoesNotSend() throws Exception {
        var target = new ProviderProbeDestinationPolicy().resolve(origin + "/v1", "responses");
        new ProviderProbeTransport().execute(target, "responses", "fixture", "", okhttp3.Call::cancel);
        assertEquals(0, requests.get());
    }

    @Test
    void boundsHungProviderRequest() throws Exception {
        server.createContext("/slow", exchange -> {
            try {
                Thread.sleep(11000);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
            } finally {
                exchange.close();
            }
        });
        var target = new ProviderProbeDestinationPolicy().resolve(origin + "/slow/v1", "responses");
        long started = System.nanoTime();
        var outcome = new ProviderProbeTransport().execute(target, "responses", "fixture", "", call -> { });
        assertEquals(Category.TIMEOUT, outcome.category());
        org.junit.jupiter.api.Assertions.assertTrue(java.util.concurrent.TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started) < 12000);
    }

}
