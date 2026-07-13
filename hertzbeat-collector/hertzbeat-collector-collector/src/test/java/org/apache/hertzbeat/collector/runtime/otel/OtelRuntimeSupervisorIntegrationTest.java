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

package org.apache.hertzbeat.collector.runtime.otel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BooleanSupplier;
import java.util.zip.GZIPInputStream;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OtelRuntimeSupervisorIntegrationTest {

    private static final String RUNTIME_BINARY_ENV = "HERTZBEAT_OTEL_RUNTIME_BINARY";

    @TempDir
    private Path tempDir;

    @Test
    void supervisesRealRuntimeAndExportsDirectlyAfterRecovery() throws Exception {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        OtlpCapture capture = new OtlpCapture();
        capture.start();
        OtelRuntimeProperties properties = properties(runtimeBinary, capture.port());
        OtelRuntimeSupervisor supervisor = new OtelRuntimeSupervisor(
                properties,
                new OtelRuntimeBinaryResolver(properties),
                new OtelRuntimeConfigRenderer(),
                new OtelRuntimeProcessLauncher(),
                new OtelRuntimeHealthClient()
        );
        long restartedPid = -1;
        try {
            supervisor.start();
            assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
            long initialPid = supervisor.snapshot().pid();
            await(() -> capture.requestCount() >= 1, Duration.ofSeconds(25));
            assertEquals("Bearer phase0-direct-token", capture.authorization());
            assertTrue(capture.contentType().startsWith("application/x-protobuf"));
            assertTrue(capture.payload().contains("hertzbeat.collector.id"));
            assertTrue(capture.payload().contains("collector-phase0-integration"));

            int requestsBeforeFailure = capture.requestCount();
            ProcessHandle.of(initialPid).orElseThrow().destroyForcibly();
            await(() -> supervisor.snapshot().state() == OtelRuntimeState.RUNNING
                            && supervisor.snapshot().pid() != initialPid,
                    Duration.ofSeconds(15));
            restartedPid = supervisor.snapshot().pid();
            assertEquals(1, supervisor.snapshot().restartCount());
            assertTrue(supervisor.snapshot().lastError().contains("exited unexpectedly"));
            await(() -> capture.requestCount() > requestsBeforeFailure, Duration.ofSeconds(25));
        } finally {
            supervisor.close();
            capture.close();
        }
        long terminatedPid = restartedPid;
        assertTrue(terminatedPid > 0);
        await(() -> !ProcessHandle.of(terminatedPid).map(ProcessHandle::isAlive).orElse(false),
                Duration.ofSeconds(5));
        assertFalse(ProcessHandle.of(terminatedPid).map(ProcessHandle::isAlive).orElse(false));
    }

    private OtelRuntimeProperties properties(String runtimeBinary, int exportPort) throws IOException {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        properties.setHome(tempDir);
        properties.setBinary(Path.of(runtimeBinary));
        properties.setCollectorId("collector-phase0-integration");
        properties.setWorkspaceId("workspace-phase0-integration");
        properties.setToken("phase0-direct-token");
        properties.setExportEndpoint(URI.create("http://127.0.0.1:" + exportPort + "/api/otlp"));
        properties.setHealthPort(availablePort());
        properties.setHealthTimeout(Duration.ofMillis(200));
        properties.setValidateTimeout(Duration.ofSeconds(10));
        properties.setStartupTimeout(Duration.ofSeconds(10));
        properties.setShutdownTimeout(Duration.ofSeconds(5));
        properties.setRestartDelay(Duration.ofMillis(100));
        return properties;
    }

    private static int availablePort() throws IOException {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        }
    }

    private static void await(BooleanSupplier condition, Duration timeout) throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        while (!condition.getAsBoolean() && System.nanoTime() < deadline) {
            Thread.sleep(50);
        }
        assertTrue(condition.getAsBoolean(), "condition did not become true before deadline");
    }

    private static final class OtlpCapture implements AutoCloseable {

        private final AtomicInteger requestCount = new AtomicInteger();
        private final AtomicReference<String> authorization = new AtomicReference<>("");
        private final AtomicReference<String> contentType = new AtomicReference<>("");
        private final AtomicReference<String> payload = new AtomicReference<>("");
        private HttpServer server;

        void start() throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/api/otlp/v1/metrics", this::capture);
            server.start();
        }

        int port() {
            return server.getAddress().getPort();
        }

        int requestCount() {
            return requestCount.get();
        }

        String authorization() {
            return authorization.get();
        }

        String contentType() {
            return contentType.get();
        }

        String payload() {
            return payload.get();
        }

        private void capture(HttpExchange exchange) throws IOException {
            try (exchange) {
                byte[] request = exchange.getRequestBody().readAllBytes();
                String encoding = exchange.getRequestHeaders().getFirst("Content-Encoding");
                if (encoding != null && encoding.toLowerCase(Locale.ROOT).contains("gzip")) {
                    try (GZIPInputStream gzip = new GZIPInputStream(new ByteArrayInputStream(request))) {
                        request = gzip.readAllBytes();
                    }
                }
                authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
                contentType.set(exchange.getRequestHeaders().getFirst("Content-Type"));
                payload.set(new String(request, StandardCharsets.ISO_8859_1));
                requestCount.incrementAndGet();
                exchange.sendResponseHeaders(200, -1);
            }
        }

        @Override
        public void close() {
            if (server != null) {
                server.stop(0);
            }
        }
    }
}
