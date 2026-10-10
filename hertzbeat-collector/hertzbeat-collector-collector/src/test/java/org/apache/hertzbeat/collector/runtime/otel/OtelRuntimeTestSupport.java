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

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.BindException;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.BooleanSupplier;
import java.util.zip.GZIPInputStream;

/**
 * Shared process and capture fixtures for real managed-runtime tests.
 */
final class OtelRuntimeTestSupport {

    private OtelRuntimeTestSupport() {
    }

    static OtelRuntimeProperties properties(Path home, String runtimeBinary, int exportPort, String collectorId)
            throws IOException {
        List<Integer> runtimePorts = availablePortsExcluding(exportPort, 3);
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        properties.setHome(home);
        properties.setBinary(Path.of(runtimeBinary));
        properties.setCollectorId(collectorId);
        properties.setWorkspaceId("workspace-runtime-integration");
        properties.setToken("runtime-direct-token");
        properties.setExportEndpoint(URI.create("http://127.0.0.1:" + exportPort + "/api/otlp"));
        properties.setOtlpGrpcEndpoint("127.0.0.1:" + runtimePorts.get(0));
        properties.setOtlpHttpEndpoint("127.0.0.1:" + runtimePorts.get(1));
        properties.setHealthPort(runtimePorts.get(2));
        properties.setHealthTimeout(Duration.ofMillis(200));
        properties.setValidateTimeout(Duration.ofSeconds(10));
        properties.setStartupTimeout(Duration.ofSeconds(10));
        properties.setShutdownTimeout(Duration.ofSeconds(5));
        properties.setRestartDelay(Duration.ofMillis(100));
        return properties;
    }

    static OtelRuntimeSupervisor supervisor(OtelRuntimeProperties properties) {
        return new OtelRuntimeSupervisor(
                properties,
                new OtelRuntimeBinaryResolver(properties),
                new OtelRuntimeConfigTransaction(new OtelRuntimeConfigRenderer()),
                new OtelRuntimeProcessLauncher(),
                new OtelRuntimeHealthClient());
    }

    static void await(BooleanSupplier condition, Duration timeout) throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        while (!condition.getAsBoolean() && System.nanoTime() < deadline) {
            Thread.sleep(50);
        }
        assertTrue(condition.getAsBoolean(), "condition did not become true before deadline");
    }

    private static List<Integer> availablePortsExcluding(int excludedPort, int count) throws IOException {
        List<ServerSocket> reservations = new ArrayList<>(count);
        ServerSocket excludedReservation = null;
        try {
            try {
                excludedReservation = new ServerSocket();
                excludedReservation.bind(new InetSocketAddress("127.0.0.1", excludedPort));
            } catch (BindException alreadyReserved) {
                if (excludedReservation != null) {
                    excludedReservation.close();
                    excludedReservation = null;
                }
            }
            for (int index = 0; index < count; index++) {
                ServerSocket reservation = new ServerSocket();
                reservation.bind(new InetSocketAddress("127.0.0.1", 0));
                reservations.add(reservation);
            }
            return reservations.stream().map(ServerSocket::getLocalPort).toList();
        } finally {
            for (ServerSocket reservation : reservations) {
                reservation.close();
            }
            if (excludedReservation != null) {
                excludedReservation.close();
            }
        }
    }

    static final class OtlpCapture implements AutoCloseable {

        private final List<String> payloads = new CopyOnWriteArrayList<>();
        private final List<CapturedRequest> requests = new CopyOnWriteArrayList<>();
        private final boolean retainPayloads;
        private HttpServer server;

        OtlpCapture() {
            this(true);
        }

        private OtlpCapture(boolean retainPayloads) {
            this.retainPayloads = retainPayloads;
        }

        static OtlpCapture discarding() {
            return new OtlpCapture(false);
        }

        void start() throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/api/otlp/v1/metrics", this::capture);
            server.createContext("/api/otlp/v1/logs", this::capture);
            server.createContext("/api/otlp/v1/traces", this::capture);
            server.start();
        }

        int port() {
            return server.getAddress().getPort();
        }

        boolean contains(String marker) {
            return payloads.stream().anyMatch(payload -> payload.contains(marker));
        }

        List<byte[]> bodies(String signal) {
            String path = "/api/otlp/v1/" + signal;
            return requests.stream()
                    .filter(request -> path.equals(request.path()))
                    .map(request -> request.body().clone())
                    .toList();
        }

        boolean hasAuthorization(String signal, String authorization) {
            String path = "/api/otlp/v1/" + signal;
            return requests.stream().anyMatch(request -> path.equals(request.path())
                    && authorization.equals(request.authorization()));
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
                if (retainPayloads) {
                    payloads.add(new String(request, StandardCharsets.ISO_8859_1));
                    requests.add(new CapturedRequest(
                            exchange.getRequestURI().getPath(),
                            request.clone(),
                            exchange.getRequestHeaders().getFirst("Authorization")));
                }
                exchange.sendResponseHeaders(200, -1);
            }
        }

        @Override
        public void close() {
            if (server != null) {
                server.stop(0);
            }
        }

        private record CapturedRequest(String path, byte[] body, String authorization) {
        }
    }
}
