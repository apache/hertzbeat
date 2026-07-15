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

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.zip.GZIPInputStream;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeFaultLoadSupport.BackendFault;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeFaultLoadSupport.LoadProfile;

/** A bounded local OTLP backend that can switch between real retriable transport faults. */
final class OtelRuntimeFaultBackend implements AutoCloseable {

    static final int WORKER_LIMIT = 4;
    static final int TASK_QUEUE_LIMIT = 8;
    private static final int PAYLOAD_LIMIT = 8 * 1024 * 1024;
    private static final int CAPTURE_LIMIT = 64;
    private static final int WATCH_LIMIT = 16;
    private static final Duration SLOW_RESPONSE = Duration.ofSeconds(6);

    private final AtomicReference<BackendFault> fault = new AtomicReference<>();
    private final AtomicInteger attempts = new AtomicInteger();
    private final BoundedPayloads successfulMetrics = new BoundedPayloads(CAPTURE_LIMIT);
    private final BoundedPayloads successfulLogs = new BoundedPayloads(CAPTURE_LIMIT);
    private final BoundedPayloads successfulTraces = new BoundedPayloads(CAPTURE_LIMIT);
    private final AtomicInteger threadSequence = new AtomicInteger();
    private final AtomicInteger maximumTaskQueueDepth = new AtomicInteger();
    private final Set<String> watchedFaultMarkers = new LinkedHashSet<>();
    private final Set<String> observedFaultMarkers = new LinkedHashSet<>();
    private int port;
    private HttpServer server;
    private ThreadPoolExecutor executor;
    private ResetServer resetServer;
    private int largestWorkerCount;
    private boolean workersTerminated = true;
    private boolean resetThreadTerminated = true;
    private boolean stopped;

    void start() throws IOException {
        port = OtelRuntimeFaultLoadSupport.availablePort();
        startHttpServer();
    }

    int port() {
        return port;
    }

    int attemptCount() {
        return attempts.get();
    }

    void fault(BackendFault backendFault) throws IOException, InterruptedException {
        if (backendFault == BackendFault.CONNECTION_RESET) {
            stopHttpServer();
            fault.set(backendFault);
            resetServer = new ResetServer(port, attempts);
            resetServer.start();
            return;
        }
        stopResetServer();
        if (server == null) {
            startHttpServerWithRetry();
        }
        fault.set(backendFault);
    }

    void recover() throws IOException, InterruptedException {
        stopResetServer();
        if (server == null) {
            startHttpServerWithRetry();
        }
        fault.set(null);
    }

    void awaitAttemptAfter(int previous, Duration timeout) throws InterruptedException {
        OtelRuntimeFaultLoadSupport.await(() -> attempts.get() > previous, timeout);
    }

    void awaitFaultPayload(String marker, Duration timeout) throws InterruptedException {
        OtelRuntimeFaultLoadSupport.await(() -> observedFaultMarker(marker), timeout);
    }

    synchronized void watchFaultMarker(String marker) {
        if (!watchedFaultMarkers.contains(marker) && watchedFaultMarkers.size() == WATCH_LIMIT) {
            throw new IllegalStateException("fault marker watch limit reached");
        }
        watchedFaultMarkers.add(marker);
    }

    void awaitSuccessful(LoadProfile profile, String marker, Duration timeout) throws InterruptedException {
        OtelRuntimeFaultLoadSupport.await(() -> successful(profile, marker), timeout);
    }

    void awaitSuccessfulLog(String marker, Duration timeout) throws InterruptedException {
        OtelRuntimeFaultLoadSupport.await(() -> successfulLogs.contains(marker), timeout);
    }

    int successfulOccurrences(String marker) {
        return successfulMetrics.occurrences(marker)
                + successfulLogs.occurrences(marker)
                + successfulTraces.occurrences(marker);
    }

    boolean successfulPayloadContains(String marker) {
        return successfulMetrics.contains(marker)
                || successfulLogs.contains(marker)
                || successfulTraces.contains(marker);
    }

    int largestWorkerCount() {
        return Math.max(largestWorkerCount, executor == null ? 0 : executor.getLargestPoolSize());
    }

    int maximumTaskQueueDepth() {
        return maximumTaskQueueDepth.get();
    }

    boolean isStopped() {
        return stopped
                && server == null
                && resetServer == null
                && executor == null
                && workersTerminated
                && resetThreadTerminated;
    }

    @Override
    public void close() {
        try {
            stopResetServer();
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        }
        stopHttpServer();
        stopped = true;
    }

    private boolean successful(LoadProfile profile, String marker) {
        return (!profile.includesMetrics() || successfulMetrics.contains(marker))
                && (!profile.includesLogs() || successfulLogs.contains(marker))
                && (!profile.includesTraces() || successfulTraces.contains(marker));
    }

    private void startHttpServerWithRetry() throws IOException, InterruptedException {
        IOException lastFailure = null;
        for (int attempt = 0; attempt < 20; attempt++) {
            try {
                startHttpServer();
                return;
            } catch (IOException failure) {
                lastFailure = failure;
                Thread.sleep(50);
            }
        }
        throw lastFailure == null ? new IOException("unable to bind fault backend") : lastFailure;
    }

    private void startHttpServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 16);
        server.createContext("/api/otlp/v1/metrics", exchange -> handle(exchange, successfulMetrics));
        server.createContext("/api/otlp/v1/logs", exchange -> handle(exchange, successfulLogs));
        server.createContext("/api/otlp/v1/traces", exchange -> handle(exchange, successfulTraces));
        executor = new ThreadPoolExecutor(
                WORKER_LIMIT,
                WORKER_LIMIT,
                0,
                TimeUnit.MILLISECONDS,
                new ArrayBlockingQueue<>(TASK_QUEUE_LIMIT),
                workerThreadFactory(),
                new ThreadPoolExecutor.CallerRunsPolicy()) {
            @Override
            public void execute(Runnable command) {
                super.execute(command);
                maximumTaskQueueDepth.accumulateAndGet(getQueue().size(), Math::max);
            }
        };
        server.setExecutor(executor);
        server.start();
    }

    private ThreadFactory workerThreadFactory() {
        return task -> {
            Thread thread = new Thread(task, "otel-fault-backend-" + threadSequence.incrementAndGet());
            thread.setDaemon(true);
            return thread;
        };
    }

    private void stopHttpServer() {
        if (server != null) {
            server.stop(0);
            server = null;
        }
        if (executor != null) {
            largestWorkerCount = Math.max(largestWorkerCount, executor.getLargestPoolSize());
            executor.shutdownNow();
            try {
                workersTerminated &= executor.awaitTermination(2, TimeUnit.SECONDS);
            } catch (InterruptedException interrupted) {
                workersTerminated = false;
                Thread.currentThread().interrupt();
            }
            executor = null;
        }
    }

    private void stopResetServer() throws InterruptedException {
        if (resetServer != null) {
            ResetServer current = resetServer;
            try {
                current.close();
            } finally {
                resetThreadTerminated &= current.isTerminated();
                resetServer = null;
            }
        }
    }

    private void handle(HttpExchange exchange, BoundedPayloads successfulSignal) throws IOException {
        BackendFault currentFault = fault.get();
        try (exchange) {
            byte[] request = readBounded(exchange.getRequestBody(), PAYLOAD_LIMIT);
            String encoding = exchange.getRequestHeaders().getFirst("Content-Encoding");
            if (encoding != null && encoding.toLowerCase(Locale.ROOT).contains("gzip")) {
                try (GZIPInputStream gzip = new GZIPInputStream(new ByteArrayInputStream(request))) {
                    request = readBounded(gzip, PAYLOAD_LIMIT);
                }
            }
            String payload = new String(request, StandardCharsets.ISO_8859_1);
            attempts.incrementAndGet();
            if (currentFault == null) {
                successfulSignal.add(payload);
                exchange.sendResponseHeaders(200, -1);
            } else {
                observeFaultMarkers(payload);
                sendFault(exchange, currentFault);
            }
        }
    }

    private void sendFault(HttpExchange exchange, BackendFault currentFault) throws IOException {
        switch (currentFault) {
            case SLOW_RESPONSE -> {
                try {
                    Thread.sleep(SLOW_RESPONSE);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                }
                exchange.sendResponseHeaders(503, -1);
            }
            case HTTP_429 -> {
                exchange.getResponseHeaders().set("Retry-After", "1");
                exchange.sendResponseHeaders(429, -1);
            }
            case HTTP_503 -> {
                exchange.getResponseHeaders().set("Retry-After", "1");
                exchange.sendResponseHeaders(503, -1);
            }
            case CONNECTION_RESET -> throw new IOException("reset mode must use the raw reset server");
            default -> throw new IllegalStateException("unsupported fault mode");
        }
    }

    private static byte[] readBounded(InputStream input, int limit) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream(Math.min(limit, 64 * 1024));
        byte[] buffer = new byte[8192];
        int total = 0;
        int read;
        while ((read = input.read(buffer)) >= 0) {
            total += read;
            if (total > limit) {
                throw new IOException("fault fixture payload exceeded its fixed capture limit");
            }
            output.write(buffer, 0, read);
        }
        return output.toByteArray();
    }

    private synchronized void observeFaultMarkers(String payload) {
        for (String marker : watchedFaultMarkers) {
            if (payload.contains(marker)) {
                observedFaultMarkers.add(marker);
            }
        }
    }

    private synchronized boolean observedFaultMarker(String marker) {
        return observedFaultMarkers.contains(marker);
    }

    private static final class ResetServer implements AutoCloseable {

        private final ServerSocket socket;
        private final AtomicInteger attempts;
        private final AtomicReference<IOException> failure = new AtomicReference<>();
        private Thread thread;

        private ResetServer(int port, AtomicInteger attempts) throws IOException {
            this.attempts = attempts;
            socket = new ServerSocket();
            socket.setReuseAddress(true);
            socket.bind(new InetSocketAddress("127.0.0.1", port), 16);
        }

        private void start() {
            thread = new Thread(this::accept, "otel-fault-backend-reset");
            thread.setDaemon(true);
            thread.start();
        }

        private void accept() {
            while (!socket.isClosed()) {
                try {
                    Socket connection = socket.accept();
                    attempts.incrementAndGet();
                    connection.setSoLinger(true, 0);
                    connection.close();
                } catch (IOException exception) {
                    if (!socket.isClosed()) {
                        failure.compareAndSet(null, exception);
                    }
                }
            }
        }

        private boolean isTerminated() {
            return thread == null || !thread.isAlive();
        }

        @Override
        public void close() throws InterruptedException {
            try {
                socket.close();
            } catch (IOException ignored) {
                // The bounded accept loop is already stopping.
            }
            if (thread != null) {
                thread.join(2000);
            }
            IOException acceptFailure = failure.get();
            if (acceptFailure != null) {
                throw new IllegalStateException("reset fixture failed", acceptFailure);
            }
        }
    }

    private static final class BoundedPayloads {

        private final int capacity;
        private final Deque<String> values;

        private BoundedPayloads(int capacity) {
            this.capacity = capacity;
            values = new ArrayDeque<>(capacity);
        }

        private synchronized void add(String value) {
            if (values.size() == capacity) {
                values.removeFirst();
            }
            values.addLast(value);
        }

        private synchronized boolean contains(String marker) {
            return values.stream().anyMatch(value -> value.contains(marker));
        }

        private synchronized int occurrences(String marker) {
            return values.stream().mapToInt(value -> occurrences(value, marker)).sum();
        }

        private int occurrences(String value, String marker) {
            int count = 0;
            int offset = 0;
            while ((offset = value.indexOf(marker, offset)) >= 0) {
                count++;
                offset += marker.length();
            }
            return count;
        }
    }
}
