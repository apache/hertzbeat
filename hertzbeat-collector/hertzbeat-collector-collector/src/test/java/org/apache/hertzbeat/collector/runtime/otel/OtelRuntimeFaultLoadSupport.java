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
import static org.junit.jupiter.api.Assertions.fail;

import java.io.IOException;
import java.io.OutputStream;
import java.net.BindException;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalLong;
import java.util.function.BooleanSupplier;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.apache.hertzbeat.common.util.JsonUtil;

/** Bounded load and observation helpers for the real official Runtime gate. */
final class OtelRuntimeFaultLoadSupport {

    static final int ITEMS_PER_SIGNAL = 5 * 1024;
    private static final int MAXIMUM_INTAKE_BYTES = 4 * 1024 * 1024;

    private OtelRuntimeFaultLoadSupport() {
    }

    static OtelRuntimeProperties properties(Path home, String runtimeBinary, int exportPort) throws IOException {
        List<Integer> runtimePorts = availablePortsExcluding(exportPort, 4);
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        properties.setHome(home);
        properties.setBinary(Path.of(runtimeBinary));
        properties.setCollectorId("collector-fault-load-integration");
        properties.setWorkspaceId("workspace-fault-load-integration");
        properties.setToken("fault-load-direct-token");
        properties.setHostMetricsEnabled(false);
        properties.setResourceDetectors(java.util.Set.of());
        properties.setExportEndpoint(URI.create("http://127.0.0.1:" + exportPort + "/api/otlp"));
        properties.setOtlpGrpcEndpoint("127.0.0.1:" + runtimePorts.get(0));
        properties.setOtlpHttpEndpoint("127.0.0.1:" + runtimePorts.get(1));
        properties.setHealthPort(runtimePorts.get(2));
        properties.setInternalTelemetryPort(runtimePorts.get(3));
        properties.setHealthTimeout(Duration.ofMillis(200));
        properties.setInternalTelemetryTimeout(Duration.ofMillis(500));
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

    static OtelRuntimeStatusProvider statusProvider(
            OtelRuntimeProperties properties, OtelRuntimeSupervisor supervisor) {
        OtelRuntimeFailureClassifier classifier = new OtelRuntimeFailureClassifier();
        return new OtelRuntimeStatusProvider(
                properties,
                supervisor,
                new OtelRuntimeTelemetryClient(),
                new OtelRuntimeDiagnosticsReader(classifier),
                classifier);
    }

    static LoadObservation sendLoad(String endpoint, LoadProfile profile, String marker) throws IOException {
        return send(endpoint, profile, marker, ITEMS_PER_SIGNAL);
    }

    static LoadObservation sendPersistenceProbe(String endpoint, String marker) throws IOException {
        return send(endpoint, LoadProfile.MIXED, marker, 1);
    }

    private static LoadObservation send(
            String endpoint, LoadProfile profile, String marker, int itemsPerSignal) throws IOException {
        List<Long> latencies = new ArrayList<>(profile.signalCount());
        long started = System.nanoTime();
        if (profile.includesMetrics()) {
            latencies.add(sendOtlpJson(endpoint, "metrics", metricsPayload(marker, itemsPerSignal)));
        }
        if (profile.includesLogs()) {
            latencies.add(sendOtlpJson(endpoint, "logs", logsPayload(marker, itemsPerSignal)));
        }
        if (profile.includesTraces()) {
            latencies.add(sendOtlpJson(endpoint, "traces", tracesPayload(marker, itemsPerSignal)));
        }
        long elapsedMillis = Math.max(1, Duration.ofNanos(System.nanoTime() - started).toMillis());
        long totalItems = (long) itemsPerSignal * profile.signalCount();
        double itemsPerSecond = totalItems * 1000.0 / elapsedMillis;
        long maximumLatency = latencies.stream().mapToLong(Long::longValue).max().orElse(0);
        return new LoadObservation(
                profile, marker, totalItems, latencies.size(), elapsedMillis, maximumLatency, itemsPerSecond);
    }

    static ManagedOtelRuntimeStatus awaitQueued(
            OtelRuntimeStatusProvider statusProvider, LoadProfile profile, Duration timeout)
            throws InterruptedException {
        return awaitStatus(statusProvider, profile, true, timeout);
    }

    static ManagedOtelRuntimeStatus awaitDrained(
            OtelRuntimeStatusProvider statusProvider, LoadProfile profile, Duration timeout)
            throws InterruptedException {
        return awaitStatus(statusProvider, profile, false, timeout);
    }

    static ManagedOtelRuntimeStatus awaitFileConsumerReady(
            OtelRuntimeStatusProvider statusProvider, Duration timeout) throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        ManagedOtelRuntimeStatus status;
        do {
            status = statusProvider.status();
            ManagedOtelRuntimeStatus.ObservedLong openFiles = status.telemetry().fileConsumer().openFiles();
            if (openFiles.state() == ManagedOtelRuntimeStatus.ValueState.AVAILABLE
                    && openFiles.value() > 0) {
                return status;
            }
            Thread.sleep(50);
        } while (System.nanoTime() < deadline);
        return fail(JsonUtil.toJson(status));
    }

    static void awaitProcessStopped(long pid, Duration timeout) throws InterruptedException {
        await(() -> !ProcessHandle.of(pid).map(ProcessHandle::isAlive).orElse(false), timeout);
    }

    static List<Path> storageFiles(OtelRuntimeProperties properties) throws IOException {
        Path storage = OtelRuntimeConfigRenderer.resolve(
                properties.getHome(), properties.getFileStorageDirectory());
        if (!Files.isDirectory(storage)) {
            return List.of();
        }
        try (var paths = Files.walk(storage)) {
            return paths.filter(Files::isRegularFile).toList();
        }
    }

    static long storageBytes(OtelRuntimeProperties properties) {
        try {
            long bytes = 0;
            for (Path file : storageFiles(properties)) {
                bytes = Math.addExact(bytes, Files.size(file));
            }
            return bytes;
        } catch (IOException | ArithmeticException ignored) {
            return -1;
        }
    }

    static Map<String, Object> observation(
            BackendFault fault,
            LoadObservation load,
            long recoveryMillis,
            long pid,
            OtelRuntimeProperties properties) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("fault", fault.name().toLowerCase(java.util.Locale.ROOT));
        values.put("profile", load.profile().name().toLowerCase(java.util.Locale.ROOT));
        values.put("items", load.itemCount());
        values.put("intakeRequests", load.requestCount());
        values.put("intakeElapsedMs", load.elapsedMillis());
        values.put("maximumIntakeLatencyMs", load.maximumIntakeLatencyMillis());
        values.put("observedIntakeItemsPerSecond", load.observedItemsPerSecond());
        values.put("recoveryElapsedMs", nullable(recoveryMillis));
        values.put("runtimeCpuMs", nullable(cpuMillis(pid)));
        values.put("runtimeRssBytes", nullable(rssBytes(pid)));
        values.put("storageBytes", nullable(storageBytes(properties)));
        return values;
    }

    static void writeLocalReport(String name, List<Map<String, Object>> observations) throws IOException {
        Path directory = repositoryRoot().resolve(
                Path.of(".tmp", "hybrid-collector", "m7-2")).toAbsolutePath().normalize();
        Files.createDirectories(directory);
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("observedAt", Instant.now().toString());
        report.put("scope", "short deterministic local gate; not a production capacity claim");
        report.put("observations", observations);
        Files.writeString(directory.resolve(name), JsonUtil.toJson(report), StandardCharsets.UTF_8);
    }

    private static Path repositoryRoot() {
        Path candidate = Path.of(System.getProperty("maven.multiModuleProjectDirectory", "."))
                .toAbsolutePath()
                .normalize();
        while (candidate.getParent() != null && !Files.exists(candidate.resolve(".git"))) {
            candidate = candidate.getParent();
        }
        return candidate;
    }

    static int availablePort() throws IOException {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        }
    }

    static void await(BooleanSupplier condition, Duration timeout) throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        while (!condition.getAsBoolean() && System.nanoTime() < deadline) {
            Thread.sleep(50);
        }
        if (!condition.getAsBoolean()) {
            fail("condition did not become true before deadline");
        }
    }

    private static ManagedOtelRuntimeStatus awaitStatus(
            OtelRuntimeStatusProvider statusProvider,
            LoadProfile profile,
            boolean queued,
            Duration timeout) throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        ManagedOtelRuntimeStatus status;
        do {
            status = statusProvider.status();
            if (queueState(status.telemetry().queueSizeBySignal(), profile, queued)
                    && (queued || status.failureCode() == ManagedOtelRuntimeStatus.FailureCode.NONE)) {
                return status;
            }
            Thread.sleep(50);
        } while (System.nanoTime() < deadline);
        return fail(JsonUtil.toJson(status));
    }

    private static boolean queueState(
            ManagedOtelRuntimeStatus.SignalGauges sizes, LoadProfile profile, boolean queued) {
        return (!profile.includesMetrics() || observed(sizes.metrics(), queued))
                && (!profile.includesLogs() || observed(sizes.logs(), queued))
                && (!profile.includesTraces() || observed(sizes.traces(), queued));
    }

    private static boolean observed(ManagedOtelRuntimeStatus.ObservedLong value, boolean positive) {
        return value.state() == ManagedOtelRuntimeStatus.ValueState.AVAILABLE
                && (positive ? value.value() > 0 : value.value() == 0);
    }

    private static long sendOtlpJson(String endpoint, String signal, String payload) throws IOException {
        byte[] body = payload.getBytes(StandardCharsets.UTF_8);
        if (body.length > MAXIMUM_INTAKE_BYTES) {
            throw new IOException("bounded OTLP load exceeds the configured intake limit");
        }
        long started = System.nanoTime();
        HttpURLConnection connection = (HttpURLConnection) URI.create(
                "http://" + endpoint + "/v1/" + signal).toURL().openConnection();
        connection.setConnectTimeout(5000);
        connection.setReadTimeout(15000);
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setDoOutput(true);
        try {
            try (OutputStream output = connection.getOutputStream()) {
                output.write(body);
            }
            assertEquals(200, connection.getResponseCode());
            return Duration.ofNanos(System.nanoTime() - started).toMillis();
        } finally {
            connection.disconnect();
        }
    }

    private static String metricsPayload(String marker, int items) {
        StringBuilder payload = new StringBuilder(640 * 1024);
        payload.append("{\"resourceMetrics\":[{\"resource\":").append(resource(marker))
                .append(",\"scopeMetrics\":[{\"metrics\":[");
        String metricPrefix = "hertzbeat_" + marker.replace('-', '_') + "_metric_";
        for (int index = 0; index < items; index++) {
            comma(payload, index);
            payload.append("{\"name\":\"").append(metricPrefix).append(index)
                    .append("\",\"gauge\":{\"dataPoints\":[{\"asInt\":\"")
                    .append(index).append("\"}]}}");
        }
        return payload.append("]}]}]}]}").toString();
    }

    private static String logsPayload(String marker, int items) {
        StringBuilder payload = new StringBuilder(640 * 1024);
        payload.append("{\"resourceLogs\":[{\"resource\":").append(resource(marker))
                .append(",\"scopeLogs\":[{\"logRecords\":[");
        for (int index = 0; index < items; index++) {
            comma(payload, index);
            payload.append("{\"severityText\":\"INFO\",\"body\":{\"stringValue\":\"")
                    .append(marker).append(" log ").append(index).append("\"}}");
        }
        return payload.append("]}]}]}]}").toString();
    }

    private static String tracesPayload(String marker, int items) {
        StringBuilder payload = new StringBuilder(1400 * 1024);
        payload.append("{\"resourceSpans\":[{\"resource\":").append(resource(marker))
                .append(",\"scopeSpans\":[{\"spans\":[");
        for (int index = 0; index < items; index++) {
            comma(payload, index);
            payload.append("{\"traceId\":\"").append(fixedHex(index + 1L, 32))
                    .append("\",\"spanId\":\"").append(fixedHex(index + 1L, 16))
                    .append("\",\"name\":\"").append(marker).append(" span ").append(index)
                    .append("\",\"startTimeUnixNano\":\"1783757000000000000\",")
                    .append("\"endTimeUnixNano\":\"1783757000010000000\"}");
        }
        return payload.append("]}]}]}]}").toString();
    }

    private static String resource(String marker) {
        return "{\"attributes\":[{\"key\":\"load.marker\",\"value\":{\"stringValue\":\""
                + marker + "\"}}]}";
    }

    private static String fixedHex(long value, int width) {
        String hex = Long.toHexString(value);
        return "0".repeat(width - hex.length()) + hex;
    }

    private static void comma(StringBuilder payload, int index) {
        if (index > 0) {
            payload.append(',');
        }
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

    private static long cpuMillis(long pid) {
        return ProcessHandle.of(pid)
                .flatMap(handle -> handle.info().totalCpuDuration())
                .map(Duration::toMillis)
                .orElse(-1L);
    }

    private static Long nullable(long value) {
        return value < 0 ? null : value;
    }

    private static long rssBytes(long pid) {
        try {
            Process process = new ProcessBuilder("ps", "-o", "rss=", "-p", Long.toString(pid)).start();
            if (!process.waitFor(2, java.util.concurrent.TimeUnit.SECONDS) || process.exitValue() != 0) {
                process.destroyForcibly();
                return -1;
            }
            String value = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
            if (value.isEmpty()) {
                return -1;
            }
            OptionalLong kibibytes = java.util.Arrays.stream(value.split("\\s+"))
                    .mapToLong(Long::parseLong)
                    .findFirst();
            return kibibytes.isPresent() ? Math.multiplyExact(kibibytes.getAsLong(), 1024) : -1;
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return -1;
        } catch (IOException | NumberFormatException | ArithmeticException ignored) {
            return -1;
        }
    }

    enum BackendFault {
        SLOW_RESPONSE,
        HTTP_429,
        HTTP_503,
        CONNECTION_RESET
    }

    enum LoadProfile {
        METRICS(true, false, false),
        LOGS(false, true, false),
        TRACES(false, false, true),
        MIXED(true, true, true);

        private final boolean metrics;
        private final boolean logs;
        private final boolean traces;

        LoadProfile(boolean metrics, boolean logs, boolean traces) {
            this.metrics = metrics;
            this.logs = logs;
            this.traces = traces;
        }

        boolean includesMetrics() {
            return metrics;
        }

        boolean includesLogs() {
            return logs;
        }

        boolean includesTraces() {
            return traces;
        }

        int signalCount() {
            return (metrics ? 1 : 0) + (logs ? 1 : 0) + (traces ? 1 : 0);
        }
    }

    record LoadObservation(
            LoadProfile profile,
            String marker,
            long itemCount,
            int requestCount,
            long elapsedMillis,
            long maximumIntakeLatencyMillis,
            double observedItemsPerSecond) {
    }
}
