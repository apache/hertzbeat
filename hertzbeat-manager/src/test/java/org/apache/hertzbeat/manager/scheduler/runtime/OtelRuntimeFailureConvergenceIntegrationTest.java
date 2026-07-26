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

package org.apache.hertzbeat.manager.scheduler.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import com.google.protobuf.ByteString;
import io.netty.channel.ChannelHandlerContext;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BooleanSupplier;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeBinaryResolver;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeConfigRenderer;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeConfigTransaction;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeDiagnosticsReader;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeFailureClassifier;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeHealthClient;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeProcessLauncher;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeProperties;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeStatusProvider;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeSupervisor;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.controller.CollectorController;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.instrumentation.intake.CollectorIntakeAdvertisementReader;
import org.apache.hertzbeat.manager.scheduler.ConsistentHash;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
import org.apache.hertzbeat.manager.scheduler.netty.process.HeartbeatProcessor;
import org.apache.hertzbeat.manager.service.impl.CollectorServiceImpl;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(OutputCaptureExtension.class)
class OtelRuntimeFailureConvergenceIntegrationTest {

    private static final String RUNTIME_BINARY_ENV = "HERTZBEAT_OTEL_RUNTIME_BINARY";
    private static final String COLLECTOR_ID = "collector-port-conflict";
    private static final String INTAKE_TOKEN = "port-conflict-intake-token";
    private static final String AUTH_PROOF_METRIC = "hertzbeat_auth_proof_metric";

    @TempDir
    private Path tempDir;

    @Test
    void reportsRealPortConflictThroughHeartbeatAndQueryThenRecovers(
            CapturedOutput output) throws Exception {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        try (ServerSocket occupiedListener = occupiedListener()) {
            int occupiedOtlpHttpPort = occupiedListener.getLocalPort();
            List<Integer> ports = new java.util.ArrayList<>();
            ports.add(occupiedOtlpHttpPort);
            ports.addAll(availablePorts(4));
            OtelRuntimeProperties properties = properties(runtimeBinary, ports);
            CollectorRuntimeStatusRegistry registry = new CollectorRuntimeStatusRegistry();
            ManageServer manageServer = heartbeatServer(registry);
            MockMvc queryApi = queryApi(registry);
            OtelRuntimeFailureClassifier classifier = new OtelRuntimeFailureClassifier();
            OtelRuntimeSupervisor supervisor = supervisor(properties);
            OtelRuntimeStatusProvider statusProvider = new OtelRuntimeStatusProvider(
                    properties,
                    supervisor,
                    new org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeTelemetryClient(),
                    new OtelRuntimeDiagnosticsReader(classifier),
                    classifier);
            ManagedOtelRuntimeStatus conflict;
            ManagedOtelRuntimeStatus recovered;
            try {
                supervisor.start();
                conflict = awaitStatus(
                        statusProvider, ManagedOtelRuntimeStatus.FailureCode.PORT_CONFLICT,
                        Duration.ofSeconds(20));
                reportHeartbeat(manageServer, conflict);

                String conflictQuery = query(queryApi);
                assertEquals(ManagedOtelRuntimeStatus.RuntimeState.DEGRADED, conflict.state());
                assertEquals(-1, conflict.pid());
                assertTrue(conflict.restartCount() > 0);
                assertTrue(conflictQuery.contains("\"failureCode\":\"PORT_CONFLICT\""));
                assertTrue(conflictQuery.contains("\"pid\":-1"));
                assertFalse(conflictQuery.contains(Integer.toString(occupiedOtlpHttpPort)));
                assertSafe(conflictQuery);
                occupiedListener.close();

                recovered = awaitStatus(
                        statusProvider, ManagedOtelRuntimeStatus.FailureCode.NONE,
                        Duration.ofSeconds(20));
                reportHeartbeat(manageServer, recovered);

                String recoveredQuery = query(queryApi);
                assertEquals(ManagedOtelRuntimeStatus.RuntimeState.RUNNING, recovered.state());
                assertTrue(recovered.pid() > 0);
                assertTrue(recovered.restartCount() >= conflict.restartCount());
                assertTrue(recoveredQuery.contains("\"failureCode\":\"NONE\""));
                assertTrue(recoveredQuery.contains("\"state\":\"RUNNING\""));
                assertSafe(recoveredQuery);
            } finally {
                supervisor.close();
            }

            assertSafe(output.getOut());
            assertSafe(output.getErr());
            for (int port : ports) {
                assertFalse(output.getAll().contains("127.0.0.1:" + port));
            }
        }
    }

    @Test
    void reportsRealExporterAuthenticationFailureThroughHeartbeatAndQueryThenRecovers(
            CapturedOutput output) throws Exception {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        AuthenticationIntake intake = new AuthenticationIntake();
        intake.start();
        List<Integer> ports = availablePorts(5);
        OtelRuntimeProperties properties = properties(runtimeBinary, ports);
        properties.setExportEndpoint(URI.create("http://127.0.0.1:" + intake.port() + "/api/otlp"));
        CollectorRuntimeStatusRegistry registry = new CollectorRuntimeStatusRegistry();
        ManageServer manageServer = heartbeatServer(registry);
        MockMvc queryApi = queryApi(registry);
        OtelRuntimeFailureClassifier classifier = new OtelRuntimeFailureClassifier();
        OtelRuntimeSupervisor supervisor = supervisor(properties);
        OtelRuntimeDiagnosticsReader diagnosticsReader = new OtelRuntimeDiagnosticsReader(classifier);
        OtelRuntimeStatusProvider statusProvider = new OtelRuntimeStatusProvider(
                properties,
                supervisor,
                new org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeTelemetryClient(),
                diagnosticsReader,
                classifier);
        long runtimePid = -1;
        try {
            supervisor.start();
            runtimePid = supervisor.snapshot().pid();
            assertTrue(runtimePid > 0);
            sendMetric(properties.getOtlpHttpEndpoint());
            await(() -> intake.rejectedRequests() > 0, Duration.ofSeconds(20));
            await(() -> diagnosticsReader.latestFailure(properties)
                    == ManagedOtelRuntimeStatus.FailureCode.AUTHENTICATION_FAILED, Duration.ofSeconds(20));

            ManagedOtelRuntimeStatus rejected = awaitStatus(
                    statusProvider, ManagedOtelRuntimeStatus.FailureCode.AUTHENTICATION_FAILED,
                    Duration.ofSeconds(20));
            reportHeartbeat(manageServer, rejected);
            String rejectedQuery = query(queryApi);
            assertEquals(ManagedOtelRuntimeStatus.RuntimeState.RUNNING, rejected.state());
            assertEquals(runtimePid, rejected.pid());
            assertEquals(0, rejected.restartCount());
            assertTrue(intake.authorizationWasValid());
            assertTrue(rejected.telemetry().sendFailed().metrics().value() > 0);
            assertEquals(0, rejected.telemetry().queueSize().value());
            assertTrue(rejectedQuery.contains("\"failureCode\":\"AUTHENTICATION_FAILED\""));
            assertTrue(rejectedQuery.contains("\"pid\":" + runtimePid));
            assertSafeAuthentication(rejectedQuery, intake.port());

            intake.accept();
            sendMetric(properties.getOtlpHttpEndpoint());
            await(() -> intake.acceptedRequests() > 0, Duration.ofSeconds(20));
            ManagedOtelRuntimeStatus recovered = awaitStatus(
                    statusProvider, ManagedOtelRuntimeStatus.FailureCode.NONE,
                    Duration.ofSeconds(20));
            reportHeartbeat(manageServer, recovered);
            String recoveredQuery = query(queryApi);
            assertEquals(ManagedOtelRuntimeStatus.RuntimeState.RUNNING, recovered.state());
            assertEquals(runtimePid, recovered.pid());
            assertEquals(0, recovered.restartCount());
            assertTrue(recovered.telemetry().sent().metrics().value() > 0);
            assertEquals(0, recovered.telemetry().queueSize().value());
            assertTrue(recoveredQuery.contains("\"failureCode\":\"NONE\""));
            assertSafeAuthentication(recoveredQuery, intake.port());
        } finally {
            supervisor.close();
            intake.close();
        }

        assertFalse(ProcessHandle.of(runtimePid).map(ProcessHandle::isAlive).orElse(false));
        assertSafeAuthentication(output.getAll(), intake.port());
        String runtimeLog = Files.readString(tempDir.resolve("logs/otel-runtime.log"));
        assertSafe(runtimeLog);
        assertFalse(runtimeLog.contains(AUTH_PROOF_METRIC));
        assertFalse(runtimeLog.contains(tempDir.toString()));
    }

    private void sendMetric(String endpoint) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://" + endpoint + "/v1/metrics"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("""
                        {"resourceMetrics":[{"scopeMetrics":[{"metrics":[{
                          "name":"hertzbeat_auth_proof_metric",
                          "gauge":{"dataPoints":[{"asDouble":1.0}]}
                        }]}]}]}
                        """))
                .build();
        HttpResponse<Void> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.discarding());
        assertEquals(200, response.statusCode());
    }

    private void assertSafeAuthentication(String content, int intakePort) {
        assertSafe(content);
        assertFalse(content.contains(AUTH_PROOF_METRIC));
        assertFalse(content.contains("/api/otlp"));
        assertFalse(content.contains("127.0.0.1:" + intakePort));
        assertFalse(content.contains(tempDir.toString()));
    }

    private OtelRuntimeProperties properties(String runtimeBinary, List<Integer> ports) {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        properties.setHome(tempDir);
        properties.setBinary(Path.of(runtimeBinary));
        properties.setCollectorId(COLLECTOR_ID);
        properties.setWorkspaceId("workspace-port-conflict");
        properties.setToken(INTAKE_TOKEN);
        properties.setHostMetricsEnabled(false);
        properties.setExportEndpoint(URI.create("http://127.0.0.1:" + ports.get(1) + "/api/otlp"));
        properties.setOtlpGrpcEndpoint("127.0.0.1:" + ports.get(2));
        properties.setOtlpHttpEndpoint("127.0.0.1:" + ports.get(0));
        properties.setHealthPort(ports.get(3));
        properties.setInternalTelemetryPort(ports.get(4));
        properties.setHealthTimeout(Duration.ofMillis(200));
        properties.setValidateTimeout(Duration.ofSeconds(10));
        properties.setStartupTimeout(Duration.ofSeconds(5));
        properties.setShutdownTimeout(Duration.ofSeconds(2));
        properties.setRestartDelay(Duration.ofMillis(300));
        properties.setMaxRestarts(100);
        return properties;
    }

    private OtelRuntimeSupervisor supervisor(OtelRuntimeProperties properties) {
        return new OtelRuntimeSupervisor(
                properties,
                new OtelRuntimeBinaryResolver(properties),
                new OtelRuntimeConfigTransaction(new OtelRuntimeConfigRenderer()),
                new OtelRuntimeProcessLauncher(),
                new OtelRuntimeHealthClient());
    }

    private ManageServer heartbeatServer(CollectorRuntimeStatusRegistry registry) {
        ManageServer manageServer = mock(ManageServer.class);
        when(manageServer.isChannelActive(COLLECTOR_ID)).thenReturn(true);
        when(manageServer.getRuntimeStatusRegistry()).thenReturn(registry);
        return manageServer;
    }

    private void reportHeartbeat(ManageServer manageServer, ManagedOtelRuntimeStatus status) {
        ClusterMsg.Message heartbeat = ClusterMsg.Message.newBuilder()
                .setIdentity(COLLECTOR_ID)
                .setType(ClusterMsg.MessageType.HEARTBEAT)
                .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(status)))
                .build();
        new HeartbeatProcessor(manageServer).handle(mock(ChannelHandlerContext.class), heartbeat);
    }

    private MockMvc queryApi(CollectorRuntimeStatusRegistry registry) {
        CollectorDao collectorDao = mock(CollectorDao.class);
        PageRequest request = PageRequest.of(0, 1);
        when(collectorDao.findAll(
                org.mockito.ArgumentMatchers.<Specification<Collector>>any(), eq(request)))
                .thenReturn(new PageImpl<>(
                        List.of(Collector.builder().name(COLLECTOR_ID).build()), request, 1));
        CollectorServiceImpl collectorService = new CollectorServiceImpl();
        ReflectionTestUtils.setField(collectorService, "collectorDao", collectorDao);
        ReflectionTestUtils.setField(
                collectorService, "collectorMonitorBindDao", mock(CollectorMonitorBindDao.class));
        ReflectionTestUtils.setField(collectorService, "consistentHash", mock(ConsistentHash.class));
        ReflectionTestUtils.setField(collectorService, "runtimeStatusRegistry", registry);
        ReflectionTestUtils.setField(collectorService, "intakeAdvertisementReader",
                mock(CollectorIntakeAdvertisementReader.class));
        CollectorController controller = new CollectorController();
        ReflectionTestUtils.setField(controller, "collectorService", collectorService);
        ReflectionTestUtils.setField(
                controller, "runtimeConfigService", mock(CollectorRuntimeConfigService.class));
        return MockMvcBuilders.standaloneSetup(controller).build();
    }

    private String query(MockMvc queryApi) throws Exception {
        return queryApi.perform(MockMvcRequestBuilders.get("/api/collector")
                        .param("name", COLLECTOR_ID)
                        .param("pageIndex", "0")
                        .param("pageSize", "1"))
                .andReturn()
                .getResponse()
                .getContentAsString();
    }

    private void assertSafe(String content) {
        assertFalse(content.contains(INTAKE_TOKEN));
        assertFalse(content.contains("Authorization"));
        assertFalse(content.contains("Bearer"));
        assertFalse(content.contains("address already in use"));
        assertFalse(content.contains("listen tcp"));
        assertFalse(content.contains("user log body"));
        assertFalse(content.contains("resourceMetrics"));
    }

    private ManagedOtelRuntimeStatus awaitStatus(
            OtelRuntimeStatusProvider provider,
            ManagedOtelRuntimeStatus.FailureCode expected,
            Duration timeout) throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        ManagedOtelRuntimeStatus observed;
        do {
            observed = provider.status();
            if (observed.failureCode() == expected) {
                return observed;
            }
            Thread.sleep(100);
        } while (System.nanoTime() < deadline);
        assertEquals(expected, observed.failureCode(), JsonUtil.toJson(observed));
        return observed;
    }

    private static ServerSocket occupiedListener() throws IOException {
        ServerSocket listener = new ServerSocket();
        listener.setReuseAddress(false);
        listener.bind(new InetSocketAddress("127.0.0.1", 0));
        return listener;
    }

    private static List<Integer> availablePorts(int count) throws IOException {
        Set<Integer> ports = new HashSet<>();
        while (ports.size() < count) {
            try (ServerSocket socket = new ServerSocket()) {
                socket.bind(new InetSocketAddress("127.0.0.1", 0));
                ports.add(socket.getLocalPort());
            }
        }
        return List.copyOf(ports);
    }

    private static void await(BooleanSupplier condition, Duration timeout) throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        while (System.nanoTime() < deadline) {
            if (condition.getAsBoolean()) {
                return;
            }
            Thread.sleep(100);
        }
        assertTrue(condition.getAsBoolean(), "Condition was not met within " + timeout);
    }

    private static final class AuthenticationIntake implements AutoCloseable {

        private final AtomicBoolean accepting = new AtomicBoolean();
        private final AtomicBoolean authorizationWasValid = new AtomicBoolean(true);
        private final AtomicInteger rejectedRequests = new AtomicInteger();
        private final AtomicInteger acceptedRequests = new AtomicInteger();
        private HttpServer server;

        void start() throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/api/otlp", this::handle);
            server.start();
        }

        private void handle(HttpExchange exchange) throws IOException {
            try (exchange) {
                authorizationWasValid.compareAndSet(
                        true, ("Bearer " + INTAKE_TOKEN).equals(
                                exchange.getRequestHeaders().getFirst("Authorization")));
                exchange.getRequestBody().transferTo(OutputStream.nullOutputStream());
                if (accepting.get()) {
                    acceptedRequests.incrementAndGet();
                    exchange.sendResponseHeaders(200, -1);
                } else {
                    rejectedRequests.incrementAndGet();
                    exchange.sendResponseHeaders(401, -1);
                }
            }
        }

        void accept() {
            accepting.set(true);
        }

        int port() {
            return server.getAddress().getPort();
        }

        int rejectedRequests() {
            return rejectedRequests.get();
        }

        int acceptedRequests() {
            return acceptedRequests.get();
        }

        boolean authorizationWasValid() {
            return authorizationWasValid.get();
        }

        @Override
        public void close() {
            if (server != null) {
                server.stop(0);
            }
        }
    }
}
