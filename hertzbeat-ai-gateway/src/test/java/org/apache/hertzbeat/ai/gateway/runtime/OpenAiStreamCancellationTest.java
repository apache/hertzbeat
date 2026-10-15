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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.apache.hertzbeat.ai.gateway.runtime.provider.OpenAiCompatibleAgentModelProvider;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

/** Exercises real SDK HTTP resources through the production provider and runtime controls. */
class OpenAiStreamCancellationTest {

    @Test
    void cancelClosesOnlyItsStreamAndAllowsImmediateRecovery() throws Exception {
        try (Fixture fixture = new Fixture();
                AgentRuntimeControl cancelled = control("hold_cancel");
                AgentRuntimeControl parallel = control("hold_parallel")) {
            HertzBeatModel model = fixture.model();
            AgentRuntimeControlRegistry registry = new AgentRuntimeControlRegistry();
            try (AutoCloseable registration = registry.register(cancelled)) {
                var cancelledResult = fixture.executor.submit(() -> model.stream(request("hold_cancel"), cancelled,
                        ignored -> fixture.cancelled.consumed.countDown()));
                var parallelResult = fixture.executor.submit(() -> model.stream(request("hold_parallel"), parallel,
                        ignored -> fixture.parallel.consumed.countDown()));
                assertTrue(fixture.cancelled.consumed.await(5, TimeUnit.SECONDS));
                assertTrue(fixture.parallel.consumed.await(5, TimeUnit.SECONDS));

                long cancelledAt = System.nanoTime();
                assertTrue(registry.cancel(cancelled.getRunUid(), "Local cancellation proof"));
                assertInstanceOf(AgentRuntimeStoppedException.class, assertThrows(ExecutionException.class,
                        () -> cancelledResult.get(5, TimeUnit.SECONDS)).getCause());
                assertTrue(fixture.cancelled.disconnected.await(
                        Math.max(0, TimeUnit.SECONDS.toNanos(5) - (System.nanoTime() - cancelledAt)), TimeUnit.NANOSECONDS),
                        "Cancelled SDK stream did not close the provider HTTP connection");
                assertFalse(parallelResult.isDone(), "Cancelling one stream affected a concurrent request");
                assertEquals(1, fixture.parallel.disconnected.getCount());

                assertRecovery(fixture, model);
                fixture.parallel.finish.set(true);
                assertEquals(AgentRuntimeModelResponse.ResponseType.FINAL_ANSWER,
                        parallelResult.get(5, TimeUnit.SECONDS).getType());
                assertTrue(fixture.parallel.completed.await(5, TimeUnit.SECONDS));
            }
        }
    }

    @Test
    void runtimeOperationTimeoutClosesProviderStreamAndAllowsImmediateRecovery() throws Exception {
        try (Fixture fixture = new Fixture(); AgentRuntimeControl timedOut = control("hold_timeout")) {
            HertzBeatModel model = fixture.model();
            AgentRuntimeBlockingTaskRunner runner = new AgentRuntimeBlockingTaskRunner(fixture.executor);

            assertThrows(AgentRuntimeOperationTimeoutException.class,
                    () -> runner.run("model", Duration.ofSeconds(8), timedOut,
                            () -> model.stream(request("hold_timeout"), timedOut,
                                    ignored -> fixture.timedOut.consumed.countDown())));

            assertEquals(0, fixture.timedOut.consumed.getCount(), "Timeout must exercise an open provider stream");
            assertTrue(fixture.timedOut.disconnected.await(5, TimeUnit.SECONDS),
                    "Timed-out SDK stream did not close the provider HTTP connection");
            assertRecovery(fixture, model);
        }
    }

    @ParameterizedTest
    @EnumSource(IdlePrefix.class)
    void cancelClosesAnIdleStream(IdlePrefix prefix) throws Exception {
        try (IdleFixture fixture = new IdleFixture(prefix);
                AgentRuntimeControl cancelled = control("hold_idle_cancel")) {
            HertzBeatModel model = fixture.model();
            AgentRuntimeControlRegistry registry = new AgentRuntimeControlRegistry();
            try (AutoCloseable registration = registry.register(cancelled)) {
                IdleState state = fixture.state("hold_idle_cancel");
                var result = fixture.executor.submit(() -> model.stream(request("hold_idle_cancel"), cancelled,
                        ignored -> state.consumed.countDown()));
                fixture.awaitIdle(state);
                long cancelledAt = System.nanoTime();
                assertTrue(registry.cancel(cancelled.getRunUid(), "Local idle cancellation proof"));
                assertTrue(System.nanoTime() - cancelledAt < TimeUnit.SECONDS.toNanos(5),
                        "Cancellation call exhausted the provider-close budget");
                assertTrue(state.disconnected.await(
                        Math.max(0, TimeUnit.SECONDS.toNanos(5) - (System.nanoTime() - cancelledAt)), TimeUnit.NANOSECONDS),
                        "Cancelled idle SDK stream did not close the provider HTTP connection");
                assertInstanceOf(AgentRuntimeStoppedException.class, assertThrows(ExecutionException.class,
                        () -> result.get(5, TimeUnit.SECONDS)).getCause());
                fixture.assertRecovery(model);
            }
        }
    }

    @ParameterizedTest
    @EnumSource(IdlePrefix.class)
    void runtimeTimeoutClosesAnIdleStream(IdlePrefix prefix) throws Exception {
        try (IdleFixture fixture = new IdleFixture(prefix);
                AgentRuntimeControl timedOut = control("hold_idle_timeout")) {
            HertzBeatModel model = fixture.model();
            AgentRuntimeBlockingTaskRunner runner = new AgentRuntimeBlockingTaskRunner(fixture.executor);
            IdleState state = fixture.state("hold_idle_timeout");
            long startedAt = System.nanoTime();
            assertThrows(AgentRuntimeOperationTimeoutException.class,
                    () -> runner.run("model", Duration.ofSeconds(8), timedOut,
                            () -> model.stream(request("hold_idle_timeout"), timedOut,
                                    ignored -> state.consumed.countDown())));
            assertEquals(0, state.opened.getCount(), "Timeout must exercise an open idle provider stream");
            assertEquals(prefix == IdlePrefix.ONE_DELTA ? 0 : 1, state.consumed.getCount());
            assertTrue(System.nanoTime() - startedAt < TimeUnit.SECONDS.toNanos(13),
                    "Timeout operation exhausted the eight-second timeout plus five-second close budget");
            assertTrue(state.disconnected.await(
                    Math.max(0, TimeUnit.SECONDS.toNanos(13) - (System.nanoTime() - startedAt)), TimeUnit.NANOSECONDS),
                    "Timed-out idle SDK stream did not close the provider HTTP connection");
            fixture.assertRecovery(model);
        }
    }

    @Test
    void cancellingOneSilentStreamKeepsItsSiblingAliveAndAllowsCompletion() throws Exception {
        try (IdleFixture fixture = new IdleFixture(IdlePrefix.COMMENT_ONLY);
                AgentRuntimeControl cancelled = control("hold_idle_first");
                AgentRuntimeControl sibling = control("hold_idle_sibling")) {
            HertzBeatModel model = fixture.model();
            IdleState first = fixture.state("hold_idle_first");
            IdleState second = fixture.state("hold_idle_sibling");
            var firstResult = fixture.executor.submit(() -> model.stream(request("hold_idle_first"), cancelled,
                    ignored -> first.consumed.countDown()));
            var secondResult = fixture.executor.submit(() -> model.stream(request("hold_idle_sibling"), sibling,
                    ignored -> second.consumed.countDown()));
            fixture.awaitIdle(first);
            fixture.awaitIdle(second);
            AgentRuntimeControlRegistry registry = new AgentRuntimeControlRegistry();
            try (AutoCloseable registration = registry.register(cancelled)) {
                long cancelledAt = System.nanoTime();
                assertTrue(registry.cancel(cancelled.getRunUid(), "Local sibling isolation proof"));
                assertTrue(System.nanoTime() - cancelledAt < TimeUnit.SECONDS.toNanos(5));
                assertTrue(first.disconnected.await(
                        Math.max(0, TimeUnit.SECONDS.toNanos(5) - (System.nanoTime() - cancelledAt)), TimeUnit.NANOSECONDS));
                assertInstanceOf(AgentRuntimeStoppedException.class, assertThrows(ExecutionException.class,
                        () -> firstResult.get(5, TimeUnit.SECONDS)).getCause());
                assertFalse(secondResult.isDone());
                assertEquals(1, second.disconnected.getCount());
                fixture.assertRecovery(model);
                fixture.finish(second);
                assertEquals("ready ", secondResult.get(5, TimeUnit.SECONDS).getFinalAnswer());
            }
        }
    }

    private void assertRecovery(Fixture fixture, HertzBeatModel model) throws Exception {
        try (AgentRuntimeControl recovery = control("recovery")) {
            var result = fixture.executor.submit(() -> model.stream(request("recovery"), recovery, ignored -> { }));
            assertEquals("ready ", result.get(5, TimeUnit.SECONDS).getFinalAnswer());
        }
    }

    private static AgentRuntimeControl control(String id) {
        return new AgentRuntimeControl("trace-" + id, "run-" + id, Clock.systemUTC());
    }

    private static AgentRuntimeModelRequest request(String id) {
        return AgentRuntimeModelRequest.builder().prompt(RuntimePrompt.builder().instructions(id).build()).build();
    }

    private static HertzBeatModel modelAt(int port) {
        ModelProviderConfig config = new ModelProviderConfig();
        config.setCode("custom");
        config.setBaseUrl("http://127.0.0.1:" + port + "/v1");
        config.setModel("local-stream-proof");
        config.setApiKey("local-proof-key");
        return new OpenAiCompatibleAgentModelProvider().createModel(config);
    }

    private enum IdlePrefix {
        BEFORE_HEADERS, COMMENT_ONLY, ONE_DELTA
    }

    private static final class IdleState {
        private final CountDownLatch opened = new CountDownLatch(1);
        private final CountDownLatch consumed = new CountDownLatch(1);
        private final CountDownLatch disconnected = new CountDownLatch(1);
        private OutputStream output;
    }

    /** Observes peer EOF without sending heartbeats that would mask the pending-read lock. */
    private static final class IdleFixture implements AutoCloseable {
        private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
        private final ServerSocket server = new ServerSocket();
        private final Set<Socket> sockets = ConcurrentHashMap.newKeySet();
        private final Map<String, IdleState> states = new ConcurrentHashMap<>();
        private final IdlePrefix prefix;

        private IdleFixture(IdlePrefix prefix) throws IOException {
            this.prefix = prefix;
            server.bind(new InetSocketAddress("127.0.0.1", 0));
            executor.submit(() -> {
                while (!server.isClosed()) {
                    try {
                        Socket socket = server.accept();
                        sockets.add(socket);
                        executor.submit(() -> respond(socket));
                    } catch (IOException exception) {
                        if (!server.isClosed()) {
                            throw new IllegalStateException("Idle fixture accept failed", exception);
                        }
                    }
                }
            });
        }

        private HertzBeatModel model() {
            return modelAt(server.getLocalPort());
        }

        private IdleState state(String id) {
            return states.computeIfAbsent(id, ignored -> new IdleState());
        }

        private void awaitIdle(IdleState state) throws InterruptedException {
            assertTrue(state.opened.await(5, TimeUnit.SECONDS), "Provider did not reach its idle boundary");
            if (prefix == IdlePrefix.ONE_DELTA) {
                assertTrue(state.consumed.await(5, TimeUnit.SECONDS));
            }
            // Let the SDK enter its next blocking read after the prefix, with no further bytes sent.
            Thread.sleep(100);
        }

        private void assertRecovery(HertzBeatModel model) throws Exception {
            try (AgentRuntimeControl recovery = control("recovery")) {
                var result = executor.submit(() -> model.stream(request("recovery"), recovery, ignored -> { }));
                assertEquals("ready ", result.get(5, TimeUnit.SECONDS).getFinalAnswer());
            }
        }

        private void respond(Socket socket) {
            try (socket) {
                socket.setSoTimeout(20000);
                InputStream input = new BufferedInputStream(socket.getInputStream());
                assertEquals("POST /v1/chat/completions HTTP/1.1", line(input));
                int length = 0;
                boolean chunked = false;
                for (String header; !(header = line(input)).isEmpty();) {
                    assertFalse(header.toLowerCase(java.util.Locale.ROOT).startsWith("x-hertzbeat-stream-scope:"),
                            "Internal stream scope header reached the provider");
                    if (header.toLowerCase(java.util.Locale.ROOT).startsWith("content-length:")) {
                        length = Integer.parseInt(header.substring(header.indexOf(':') + 1).trim());
                    } else if (header.equalsIgnoreCase("Transfer-Encoding: chunked")) {
                        chunked = true;
                    }
                }
                ByteArrayOutputStream body = new ByteArrayOutputStream();
                if (chunked) {
                    while ((length = Integer.parseInt(line(input), 16)) > 0) {
                        body.write(input.readNBytes(length));
                        assertEquals("", line(input));
                    }
                    assertEquals("", line(input));
                } else {
                    body.write(input.readNBytes(length));
                }
                String requestBody = body.toString(StandardCharsets.UTF_8);
                IdleState state = states.entrySet().stream().filter(entry -> requestBody.contains(entry.getKey()))
                        .map(Map.Entry::getValue).findFirst().orElse(null);
                if (state != null && prefix == IdlePrefix.BEFORE_HEADERS) {
                    state.opened.countDown();
                    awaitPeerClose(input, socket, state);
                    return;
                }
                OutputStream output = socket.getOutputStream();
                output.write(("HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\n"
                        + "Transfer-Encoding: chunked\r\nConnection: keep-alive\r\n\r\n")
                        .getBytes(StandardCharsets.US_ASCII));
                chunk(output, state != null && prefix == IdlePrefix.COMMENT_ONLY
                        ? ": local idle prefix\n\n".getBytes(StandardCharsets.UTF_8)
                        : Fixture.frame(state != null ? "partial " : "ready ", false));
                if (state != null) {
                    state.output = output;
                    state.opened.countDown();
                    awaitPeerClose(input, socket, state);
                } else {
                    chunk(output, Fixture.frame("", true));
                    chunk(output, "data: [DONE]\n\n".getBytes(StandardCharsets.UTF_8));
                    output.write("0\r\n\r\n".getBytes(StandardCharsets.US_ASCII));
                    output.flush();
                }
            } catch (IOException exception) {
                throw new IllegalStateException("Idle fixture exchange failed", exception);
            } finally {
                sockets.remove(socket);
            }
        }

        private static void awaitPeerClose(InputStream input, Socket socket, IdleState state) throws IOException {
            try {
                assertEquals(-1, input.read(), "No second request is expected on the held connection");
                state.disconnected.countDown();
            } catch (java.net.SocketException exception) {
                if (socket.isClosed()) {
                    throw exception;
                }
                state.disconnected.countDown();
            }
        }

        private void finish(IdleState state) throws IOException {
            chunk(state.output, Fixture.frame("ready ", false));
            chunk(state.output, Fixture.frame("", true));
            chunk(state.output, "data: [DONE]\n\n".getBytes(StandardCharsets.UTF_8));
            state.output.write("0\r\n\r\n".getBytes(StandardCharsets.US_ASCII));
            state.output.flush();
        }

        private static String line(InputStream input) throws IOException {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            for (int value; (value = input.read()) != -1;) {
                if (value == '\n') {
                    return bytes.toString(StandardCharsets.US_ASCII).replace("\r", "");
                }
                bytes.write(value);
            }
            throw new IOException("Unexpected EOF in local HTTP request");
        }

        private static void chunk(OutputStream output, byte[] bytes) throws IOException {
            output.write((Integer.toHexString(bytes.length) + "\r\n").getBytes(StandardCharsets.US_ASCII));
            output.write(bytes);
            output.write("\r\n".getBytes(StandardCharsets.US_ASCII));
            output.flush();
        }

        @Override
        public void close() throws Exception {
            server.close();
            for (Socket socket : sockets) {
                socket.close();
            }
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS), "Idle fixture threads did not stop");
        }
    }

    private static final class StreamState {
        private final CountDownLatch consumed = new CountDownLatch(1);
        private final CountDownLatch disconnected = new CountDownLatch(1);
        private final CountDownLatch completed = new CountDownLatch(1);
        private final AtomicBoolean finish = new AtomicBoolean();
    }

    private static final class Fixture implements AutoCloseable {
        private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
        private final HttpServer server;
        private final StreamState cancelled = new StreamState();
        private final StreamState parallel = new StreamState();
        private final StreamState timedOut = new StreamState();
        private final AtomicBoolean stopped = new AtomicBoolean();

        private Fixture() throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.setExecutor(executor);
            server.createContext("/v1/chat/completions", this::respond);
            server.start();
        }

        private HertzBeatModel model() {
            return modelAt(server.getAddress().getPort());
        }

        private void respond(HttpExchange exchange) throws IOException {
            assertFalse(exchange.getRequestHeaders().containsKey("X-HertzBeat-Stream-Scope"),
                    "Internal stream scope header reached the provider");
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            StreamState state = Map.of("hold_cancel", cancelled, "hold_parallel", parallel, "hold_timeout", timedOut)
                    .entrySet().stream().filter(entry -> body.contains(entry.getKey()))
                    .map(Map.Entry::getValue).findFirst().orElse(null);
            exchange.getResponseHeaders().set("Content-Type", "text/event-stream");
            exchange.sendResponseHeaders(200, 0);
            try (var output = exchange.getResponseBody()) {
                do {
                    output.write(frame(state == null ? "ready " : "partial ", false));
                    output.flush();
                    if (state == null || state.finish.get()) {
                        output.write(frame("", true));
                        output.write("data: [DONE]\n\n".getBytes(StandardCharsets.UTF_8));
                        output.flush();
                        if (state != null) {
                            state.completed.countDown();
                        }
                        return;
                    }
                    Thread.sleep(25);
                } while (!stopped.get());
            } catch (IOException disconnected) {
                if (state != null) {
                    state.disconnected.countDown();
                }
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
            } finally {
                exchange.close();
            }
        }

        private static byte[] frame(String content, boolean complete) {
            return ("data: {\"id\":\"local-chunk\",\"object\":\"chat.completion.chunk\","
                    + "\"created\":1,\"model\":\"local-stream-proof\",\"choices\":[{\"index\":0,"
                    + "\"delta\":{\"role\":\"assistant\",\"content\":\"" + content
                    + "\"},\"finish_reason\":" + (complete ? "\"stop\"" : "null") + "}]}\n\n")
                    .getBytes(StandardCharsets.UTF_8);
        }

        @Override
        public void close() throws InterruptedException {
            stopped.set(true);
            server.stop(0);
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS), "Local fixture threads did not stop");
        }
    }
}
