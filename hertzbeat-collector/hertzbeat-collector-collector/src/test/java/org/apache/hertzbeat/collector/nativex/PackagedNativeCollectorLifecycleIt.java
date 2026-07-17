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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.protobuf.ByteString;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Stream;
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

    @Test
    @EnabledIfSystemProperty(named = "native.collector.home", matches = ".+")
    void packagedNativeCollectorAppliesHeartbeatAndStopsBundledRuntime() throws Exception {
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
        AtomicReference<ManagedOtelRuntimeStatus> convergedStatus = new AtomicReference<>();
        int managerPort = freePort();
        int backendPort = freePort();
        RemotingServer manager = manager(managerPort, convergedStatus);
        HttpServer backend = backend(backendPort);
        Process collector = null;
        long childPid = -1;
        try {
            manager.start();
            awaitManager(manager);
            backend.start();
            collector = startCollector(home, executable, proofDirectory, managerPort, backendPort);
            ManagedOtelRuntimeStatus status = awaitConvergence(collector, convergedStatus, proofDirectory);
            childPid = status.pid();
            assertTrue(childPid > 0, "Bundled Runtime child PID must be reported");
            assertTrue(status.sources().stream().anyMatch(source ->
                    source.type() == ManagedOtelRuntimeStatus.SourceType.HOST_METRICS
                            && source.state() == ManagedOtelRuntimeStatus.SourceState.ACTIVE));
            assertFalse(status.telemetry().queueCapacityBySignal().equals(
                    ManagedOtelRuntimeStatus.SignalGauges.unavailable()));
            assertFalse(Files.readString(proofDirectory.resolve("collector.log")).contains(PROOF_TOKEN),
                    "The intake token must not be written to the packaged collector log");
        } finally {
            if (collector != null) {
                collector.destroy();
                if (!collector.waitFor(20, TimeUnit.SECONDS)) {
                    collector.destroyForcibly().waitFor(10, TimeUnit.SECONDS);
                }
            }
            backend.stop(0);
            manager.shutdown();
        }
        long stoppedChildPid = childPid;
        assertTrue(awaitCondition(Duration.ofSeconds(20), () ->
                        ProcessHandle.of(stoppedChildPid).map(handle -> !handle.isAlive()).orElse(true)),
                "Bundled Runtime child must stop with the packaged Native Collector");
    }

    private RemotingServer manager(int port, AtomicReference<ManagedOtelRuntimeStatus> convergedStatus) {
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
                    .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(desiredConfig())))
                    .build();
        });
        return server;
    }

    private ManagedOtelRuntimeConfig desiredConfig() {
        return new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION,
                2,
                true,
                Duration.ofSeconds(10),
                List.of(),
                List.of(),
                "native-proof",
                Set.of(ManagedOtelRuntimeConfig.ResourceDetector.SYSTEM),
                Set.of(),
                Set.of(ManagedOtelRuntimeConfig.HostMetricsScraper.CPU));
    }

    private HttpServer backend(int port) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/", exchange -> {
            exchange.getRequestBody().transferTo(java.io.OutputStream.nullOutputStream());
            exchange.sendResponseHeaders(200, -1);
            exchange.close();
        });
        return server;
    }

    private Process startCollector(Path home, Path executable, Path proofDirectory,
                                   int managerPort, int backendPort) throws IOException {
        ProcessBuilder builder = new ProcessBuilder(
                executable.toString(),
                "--server.port=0",
                "--collector.otel-runtime.health-port=" + freePort(),
                "--collector.otel-runtime.internal-telemetry-port=" + freePort(),
                "--collector.otel-runtime.otlp-grpc-endpoint=127.0.0.1:" + freePort(),
                "--collector.otel-runtime.otlp-http-endpoint=127.0.0.1:" + freePort());
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

    @FunctionalInterface
    private interface CheckedBooleanSupplier {
        boolean getAsBoolean() throws Exception;
    }
}
