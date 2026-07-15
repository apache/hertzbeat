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
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BooleanSupplier;
import java.util.zip.GZIPInputStream;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
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
                new OtelRuntimeConfigTransaction(new OtelRuntimeConfigRenderer()),
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

    @Test
    void scrapesPrometheusAndResumesFileLogsFromPersistentOffset() throws Exception {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        Path logDirectory = Files.createDirectories(tempDir.resolve("application-logs"));
        Path applicationLog = Files.writeString(logDirectory.resolve("payments.log"), "historical-line\n");
        OtlpCapture capture = new OtlpCapture();
        PrometheusFixture prometheus = new PrometheusFixture();
        capture.start();
        prometheus.start();
        OtelRuntimeProperties properties = properties(runtimeBinary, capture.port());
        properties.setPrometheusTargets(List.of(new ManagedOtelRuntimeConfig.PrometheusTarget(
                "payments", URI.create("http://127.0.0.1:" + prometheus.port() + "/metrics"),
                Duration.ofSeconds(10))));
        properties.setFileLogAllowRoots(List.of(logDirectory));
        properties.setFileLogProfiles(Map.of("payments-logs", List.of(applicationLog.toString())));
        properties.setFileLogSources(List.of(
                new ManagedOtelRuntimeConfig.FileLogSource("payments", "payments-logs")));
        OtelRuntimeSupervisor supervisor = new OtelRuntimeSupervisor(
                properties,
                new OtelRuntimeBinaryResolver(properties),
                new OtelRuntimeConfigTransaction(new OtelRuntimeConfigRenderer()),
                new OtelRuntimeProcessLauncher(),
                new OtelRuntimeHealthClient()
        );
        String beforeRestart = "payment accepted before restart";
        String afterRotation = "payment accepted after rotation";
        String duringRestart = "payment accepted during restart";
        try {
            supervisor.start();
            assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
            await(() -> capture.containsMetric("hertzbeat_integration_value"), Duration.ofSeconds(20));
            Files.writeString(applicationLog, beforeRestart + "\n", StandardOpenOption.APPEND);
            await(() -> capture.logOccurrences(beforeRestart) == 1, Duration.ofSeconds(15));

            Files.move(applicationLog, logDirectory.resolve("payments.log.1"));
            Files.createFile(applicationLog);
            Files.writeString(applicationLog, afterRotation + "\n", StandardOpenOption.APPEND);
            await(() -> capture.logOccurrences(afterRotation) == 1, Duration.ofSeconds(15));

            long initialPid = supervisor.snapshot().pid();
            ProcessHandle.of(initialPid).orElseThrow().destroyForcibly();
            Files.writeString(applicationLog, duringRestart + "\n", StandardOpenOption.APPEND);
            await(() -> supervisor.snapshot().state() == OtelRuntimeState.RUNNING
                            && supervisor.snapshot().pid() != initialPid,
                    Duration.ofSeconds(15));
            await(() -> capture.logOccurrences(duringRestart) == 1, Duration.ofSeconds(15));
            assertEquals(1, capture.logOccurrences(beforeRestart));
            assertEquals(1, capture.logOccurrences(afterRotation));
            assertEquals(0, capture.logOccurrences("historical-line"));
        } finally {
            supervisor.close();
            prometheus.close();
            capture.close();
        }
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
        private final List<String> metricPayloads = new CopyOnWriteArrayList<>();
        private final List<String> logPayloads = new CopyOnWriteArrayList<>();
        private HttpServer server;

        void start() throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/api/otlp/v1/metrics", exchange -> capture(exchange, metricPayloads));
            server.createContext("/api/otlp/v1/logs", exchange -> capture(exchange, logPayloads));
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

        boolean containsMetric(String metricName) {
            return metricPayloads.stream().anyMatch(value -> value.contains(metricName));
        }

        int logOccurrences(String value) {
            return logPayloads.stream().mapToInt(payloadValue -> occurrences(payloadValue, value)).sum();
        }

        private int occurrences(String payloadValue, String value) {
            int count = 0;
            int start = 0;
            while ((start = payloadValue.indexOf(value, start)) >= 0) {
                count++;
                start += value.length();
            }
            return count;
        }

        private void capture(HttpExchange exchange, List<String> signalPayloads) throws IOException {
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
                String decodedPayload = new String(request, StandardCharsets.ISO_8859_1);
                payload.set(decodedPayload);
                signalPayloads.add(decodedPayload);
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

    private static final class PrometheusFixture implements AutoCloseable {

        private HttpServer server;

        void start() throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/metrics", exchange -> {
                try (exchange) {
                    byte[] body = ("# TYPE hertzbeat_integration_value gauge\n"
                            + "hertzbeat_integration_value 7\n").getBytes(StandardCharsets.UTF_8);
                    exchange.getResponseHeaders().set("Content-Type", "text/plain; version=0.0.4");
                    exchange.sendResponseHeaders(200, body.length);
                    exchange.getResponseBody().write(body);
                }
            });
            server.start();
        }

        int port() {
            return server.getAddress().getPort();
        }

        @Override
        public void close() {
            if (server != null) {
                server.stop(0);
            }
        }
    }
}
