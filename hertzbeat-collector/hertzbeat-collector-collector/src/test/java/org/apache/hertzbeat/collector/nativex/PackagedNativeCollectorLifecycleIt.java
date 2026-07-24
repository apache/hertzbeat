/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.collector.nativex;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.protobuf.ByteString;
import com.sun.net.httpserver.HttpServer;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.metrics.v1.Metric;
import io.opentelemetry.proto.resource.v1.Resource;
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
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Stream;
import java.util.zip.GZIPInputStream;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.apache.hertzbeat.common.entity.dto.ServerInfo;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.support.CommonThreadPool;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.remoting.RemotingServer;
import org.apache.hertzbeat.remoting.netty.NettyRemotingServer;
import org.apache.hertzbeat.remoting.netty.NettyServerConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

class PackagedNativeCollectorLifecycleIt {

    private static final String PROOF_TOKEN = "native-lifecycle-proof-token";
    private static final String COLLECTOR_ID = "native-active-proof";
    private static final String PROMETHEUS_METRIC = "hertzbeat_packaged_prometheus_value";
    private static final String FILE_LOG_LINE = "packaged-runtime-filelog-proof";

    @Test
    @EnabledIfSystemProperty(named = "native.collector.home", matches = ".+")
    void packagedNativeCollectorActivelyCollectsAndStopsBundledRuntime() throws Exception {
        Path home = Path.of(System.getProperty("native.collector.home")).toAbsolutePath().normalize();
        Path executable;
        try (Stream<Path> homeFiles = Files.list(home)) {
            executable = homeFiles
                    .filter(path -> path.getFileName().toString().startsWith("apache-hertzbeat-collector-native-"))
                    .filter(Files::isExecutable)
                    .findFirst()
                    .orElseThrow(() -> new AssertionError("Packaged Native Collector executable is missing"));
        }
        Path proofDirectory = Files.createTempDirectory("hertzbeat-native-lifecycle-");
        Path applicationLog = Files.createFile(proofDirectory.resolve("active-source.log"));
        AtomicReference<ManagedOtelRuntimeStatus> convergedStatus = new AtomicReference<>();
        int managerPort = freePort();
        PrometheusFixture prometheus = new PrometheusFixture();
        BackendCapture backend = new BackendCapture(PROOF_TOKEN, COLLECTOR_ID);
        RemotingServer manager = manager(managerPort, prometheus, convergedStatus);
        Process collector = null;
        long childPid = -1;
        try {
            prometheus.start();
            backend.start();
            manager.start();
            awaitManager(manager);
            collector = startCollector(home, executable, proofDirectory, applicationLog, managerPort, backend.port());
            ManagedOtelRuntimeStatus status = awaitConvergence(collector, convergedStatus, proofDirectory);
            childPid = status.pid();
            assertTrue(childPid > 0, "Bundled Runtime child PID must be reported");
            assertActive(status, ManagedOtelRuntimeStatus.SourceType.HOST_METRICS, "host");
            assertActive(status, ManagedOtelRuntimeStatus.SourceType.PROMETHEUS, "packaged-prometheus");
            assertActive(status, ManagedOtelRuntimeStatus.SourceType.FILE_LOG, "packaged-filelog");
            assertFalse(status.telemetry().queueCapacityBySignal().equals(
                    ManagedOtelRuntimeStatus.SignalGauges.unavailable()));
            Files.writeString(applicationLog, FILE_LOG_LINE + "\n", StandardOpenOption.APPEND);
            assertTrue(awaitCondition(Duration.ofSeconds(45), () ->
                            backend.containsHostMetric()
                                    && backend.containsPrometheusMetric(7.0)
                                    && backend.containsFileLog(FILE_LOG_LINE)),
                    "Packaged Runtime did not export all active collection evidence");
            assertEquals(0, backend.authenticationFailures(), "Every OTLP export must use the transient proof token");
            assertFalse(Files.readString(proofDirectory.resolve("collector.log")).contains(PROOF_TOKEN),
                    "The intake token must not be written to the packaged collector log");
        } finally {
            if (collector != null) {
                collector.destroy();
                if (!collector.waitFor(20, TimeUnit.SECONDS)) {
                    collector.destroyForcibly().waitFor(10, TimeUnit.SECONDS);
                }
            }
            backend.close();
            prometheus.close();
            manager.shutdown();
        }
        long stoppedChildPid = childPid;
        assertTrue(awaitCondition(Duration.ofSeconds(20), () ->
                        ProcessHandle.of(stoppedChildPid).map(handle -> !handle.isAlive()).orElse(true)),
                "Bundled Runtime child must stop with the packaged Native Collector");
    }

    private void assertActive(
            ManagedOtelRuntimeStatus status,
            ManagedOtelRuntimeStatus.SourceType type,
            String name) {
        assertTrue(status.sources().stream().anyMatch(source -> source.type() == type
                        && name.equals(source.name())
                        && source.state() == ManagedOtelRuntimeStatus.SourceState.ACTIVE),
                () -> "Active source missing: " + type + "/" + name + " from " + status.sources());
    }

    private RemotingServer manager(
            int port,
            PrometheusFixture prometheus,
            AtomicReference<ManagedOtelRuntimeStatus> convergedStatus) {
        NettyServerConfig config = new NettyServerConfig();
        config.setPort(port);
        config.setIdleStateEventTriggerTime(60);
        RemotingServer server = new NettyRemotingServer(config, null, new CommonThreadPool());
        server.registerProcessor(ClusterMsg.MessageType.GO_ONLINE, (context, message) ->
                ClusterMsg.Message.newBuilder()
                        .setIdentity(message.getIdentity())
                        .setDirection(ClusterMsg.Direction.RESPONSE)
                        .setType(ClusterMsg.MessageType.GO_ONLINE)
                        .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(
                                ServerInfo.builder().aesSecret(AesUtil.getDefaultSecretKey()).build())))
                        .build());
        server.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, (context, message) -> {
            if (message.getDirection() != ClusterMsg.Direction.REQUEST) {
                return null;
            }
            ManagedOtelRuntimeStatus status = JsonUtil.fromJson(
                    message.getMsg().toStringUtf8(), ManagedOtelRuntimeStatus.class);
            if (status != null && status.desiredRevision() == 2 && status.activeRevision() == 2
                    && status.state() == ManagedOtelRuntimeStatus.RuntimeState.RUNNING) {
                convergedStatus.set(status);
            }
            return ClusterMsg.Message.newBuilder()
                    .setIdentity(message.getIdentity())
                    .setDirection(ClusterMsg.Direction.RESPONSE)
                    .setType(ClusterMsg.MessageType.HEARTBEAT)
                    .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(desiredConfig(prometheus.port()))))
                    .build();
        });
        return server;
    }

    private ManagedOtelRuntimeConfig desiredConfig(int prometheusPort) {
        return new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION,
                2,
                true,
                Duration.ofSeconds(10),
                List.of(ManagedOtelRuntimeConfig.PrometheusTarget.basic(
                        "packaged-prometheus",
                        URI.create("http://127.0.0.1:" + prometheusPort + "/metrics"),
                        Duration.ofSeconds(10))),
                List.of(new ManagedOtelRuntimeConfig.FileLogSource(
                        "packaged-filelog", "packaged-filelog-profile")),
                "native-proof",
                Set.of(ManagedOtelRuntimeConfig.ResourceDetector.SYSTEM),
                Set.of(),
                Set.of(ManagedOtelRuntimeConfig.HostMetricsScraper.CPU));
    }

    private Process startCollector(Path home, Path executable, Path proofDirectory, Path applicationLog,
                                   int managerPort, int backendPort) throws IOException {
        ProcessBuilder builder = new ProcessBuilder(
                executable.toString(),
                "--server.port=0",
                "--collector.otel-runtime.health-port=" + freePort(),
                "--collector.otel-runtime.internal-telemetry-port=" + freePort(),
                "--collector.otel-runtime.otlp-grpc-endpoint=127.0.0.1:" + freePort(),
                "--collector.otel-runtime.otlp-http-endpoint=127.0.0.1:" + freePort(),
                "--collector.otel-runtime.collector-id=" + COLLECTOR_ID,
                "--collector.otel-runtime.file-log-allow-roots[0]=" + proofDirectory,
                "--collector.otel-runtime.file-log-profiles.packaged-filelog-profile[0]=" + applicationLog);
        builder.directory(home.toFile());
        builder.environment().put("MANAGER_HOST", "127.0.0.1");
        builder.environment().put("MANAGER_PORT", Integer.toString(managerPort));
        builder.environment().put("IDENTITY", "native-lifecycle-proof");
        builder.environment().put("HERTZBEAT_HOME", home.toString());
        builder.environment().put("HERTZBEAT_OTEL_RUNTIME_ENABLED", "true");
        builder.environment().put("HERTZBEAT_OTLP_TOKEN", PROOF_TOKEN);
        builder.environment().put("HERTZBEAT_OTLP_HTTP_ENDPOINT",
                "http://127.0.0.1:" + backendPort + "/api/otlp");
        builder.environment().put("HERTZBEAT_OTEL_FILE_STORAGE_DIRECTORY",
                proofDirectory.resolve("storage").toString());
        builder.redirectErrorStream(true);
        builder.redirectOutput(proofDirectory.resolve("collector.log").toFile());
        return builder.start();
    }

    private ManagedOtelRuntimeStatus awaitConvergence(
            Process collector, AtomicReference<ManagedOtelRuntimeStatus> convergedStatus, Path proofDirectory)
            throws Exception {
        boolean converged = awaitCondition(Duration.ofSeconds(75), () -> {
            if (!collector.isAlive()) {
                throw new AssertionError("Packaged Native Collector exited early; local log: "
                        + proofDirectory.resolve("collector.log"));
            }
            return convergedStatus.get() != null;
        });
        assertTrue(converged, "Packaged Native Collector did not converge; local log: "
                + proofDirectory.resolve("collector.log"));
        return convergedStatus.get();
    }

    private void awaitManager(RemotingServer manager) throws Exception {
        assertTrue(awaitCondition(Duration.ofSeconds(10), manager::isStart), "Proof manager did not start");
    }

    private boolean awaitCondition(Duration timeout, CheckedBooleanSupplier condition) throws Exception {
        long deadline = System.nanoTime() + timeout.toNanos();
        while (System.nanoTime() < deadline) {
            if (condition.getAsBoolean()) {
                return true;
            }
            Thread.sleep(100);
        }
        return condition.getAsBoolean();
    }

    private int freePort() throws IOException {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        }
    }

    private static final class PrometheusFixture implements AutoCloseable {

        private HttpServer server;

        void start() throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/metrics", exchange -> {
                try (exchange) {
                    byte[] body = ("# TYPE " + PROMETHEUS_METRIC + " gauge\n"
                            + PROMETHEUS_METRIC + " 7\n").getBytes(StandardCharsets.UTF_8);
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

    private static final class BackendCapture implements AutoCloseable {

        private final String expectedAuthorization;
        private final String collectorId;
        private final List<ExportMetricsServiceRequest> metrics = new CopyOnWriteArrayList<>();
        private final List<ExportLogsServiceRequest> logs = new CopyOnWriteArrayList<>();
        private final java.util.concurrent.atomic.AtomicInteger authenticationFailures =
                new java.util.concurrent.atomic.AtomicInteger();
        private HttpServer server;

        private BackendCapture(String token, String collectorId) {
            this.expectedAuthorization = "Bearer " + token;
            this.collectorId = collectorId;
        }

        void start() throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/api/otlp/v1/metrics", exchange -> {
                try (exchange) {
                    verifyAuthorization(exchange.getRequestHeaders().getFirst("Authorization"));
                    metrics.add(ExportMetricsServiceRequest.parseFrom(requestBody(exchange)));
                    exchange.sendResponseHeaders(200, -1);
                }
            });
            server.createContext("/api/otlp/v1/logs", exchange -> {
                try (exchange) {
                    verifyAuthorization(exchange.getRequestHeaders().getFirst("Authorization"));
                    logs.add(ExportLogsServiceRequest.parseFrom(requestBody(exchange)));
                    exchange.sendResponseHeaders(200, -1);
                }
            });
            server.start();
        }

        int port() {
            return server.getAddress().getPort();
        }

        int authenticationFailures() {
            return authenticationFailures.get();
        }

        boolean containsHostMetric() {
            return metrics.stream().flatMap(request -> request.getResourceMetricsList().stream())
                    .filter(resourceMetrics -> scoped(resourceMetrics.getResource()))
                    .flatMap(resourceMetrics -> resourceMetrics.getScopeMetricsList().stream())
                    .flatMap(scopeMetrics -> scopeMetrics.getMetricsList().stream())
                    .map(Metric::getName)
                    .anyMatch(name -> name.startsWith("system.cpu."));
        }

        boolean containsPrometheusMetric(double expectedValue) {
            return metrics.stream().flatMap(request -> request.getResourceMetricsList().stream())
                    .filter(resourceMetrics -> scoped(resourceMetrics.getResource()))
                    .flatMap(resourceMetrics -> resourceMetrics.getScopeMetricsList().stream())
                    .flatMap(scopeMetrics -> scopeMetrics.getMetricsList().stream())
                    .filter(metric -> PROMETHEUS_METRIC.equals(metric.getName()))
                    .flatMap(metric -> metric.getGauge().getDataPointsList().stream())
                    .anyMatch(point -> point.hasAsDouble() && point.getAsDouble() == expectedValue);
        }

        boolean containsFileLog(String expectedBody) {
            return logs.stream().flatMap(request -> request.getResourceLogsList().stream())
                    .filter(resourceLogs -> scoped(resourceLogs.getResource()))
                    .flatMap(resourceLogs -> resourceLogs.getScopeLogsList().stream())
                    .flatMap(scopeLogs -> scopeLogs.getLogRecordsList().stream())
                    .anyMatch(record -> record.getBody().hasStringValue()
                            && expectedBody.equals(record.getBody().getStringValue()));
        }

        private boolean scoped(Resource resource) {
            return resource.getAttributesList().stream().anyMatch(attribute ->
                    "hertzbeat.collector.id".equals(attribute.getKey())
                            && attribute.getValue().hasStringValue()
                            && collectorId.equals(attribute.getValue().getStringValue()));
        }

        private byte[] requestBody(com.sun.net.httpserver.HttpExchange exchange) throws IOException {
            byte[] request = exchange.getRequestBody().readAllBytes();
            String encoding = exchange.getRequestHeaders().getFirst("Content-Encoding");
            if (encoding != null && encoding.toLowerCase(Locale.ROOT).contains("gzip")) {
                try (GZIPInputStream gzip = new GZIPInputStream(new ByteArrayInputStream(request))) {
                    return gzip.readAllBytes();
                }
            }
            return request;
        }

        private void verifyAuthorization(String actual) {
            if (!expectedAuthorization.equals(actual)) {
                authenticationFailures.incrementAndGet();
            }
        }

        @Override
        public void close() {
            if (server != null) {
                server.stop(0);
            }
        }
    }

    @FunctionalInterface
    private interface CheckedBooleanSupplier {
        boolean getAsBoolean() throws Exception;
    }
}
