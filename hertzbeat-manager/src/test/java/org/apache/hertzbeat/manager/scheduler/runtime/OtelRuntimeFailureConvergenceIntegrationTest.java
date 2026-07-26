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
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import com.google.protobuf.ByteString;
import io.netty.channel.ChannelHandlerContext;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BooleanSupplier;
import java.util.function.Predicate;
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
    private static final String RATE_LIMIT_PROOF_METRIC = "hertzbeat_rate_limit_proof_metric";
    private static final String UNAVAILABLE_PROOF_METRIC = "hertzbeat_unavailable_proof_metric";
    private static final String RESTART_PROOF_METRIC = "hertzbeat_restart_proof_metric";
    private static final String RESET_PROOF_METRIC = "hertzbeat_reset_proof_metric";
    private static final String QUEUE_PROOF_METRIC = "hertzbeat_queue_proof_metric";
    private static final int QUEUE_CAPACITY = 2048;
    private static final int QUEUE_OVERFLOW_MARGIN = 16;
    private static final int POINTS_PER_EXPORT_BATCH = 1024;
    private static final long MAXIMUM_QUEUE_LOAD_BYTES = 48L * 1024 * 1024;
    private static final Duration MAXIMUM_QUEUE_LOAD_DURATION = Duration.ofSeconds(45);

    @TempDir
    private Path tempDir;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Test
    void stopsResetLoopAfterFirstUnexpectedAcceptFailure() throws Exception {
        ServerSocket socket = mock(ServerSocket.class);
        IOException failure = new IOException("fixture accept failed");
        when(socket.isClosed()).thenReturn(false);
        when(socket.accept()).thenThrow(failure);
        AtomicInteger attempts = new AtomicInteger();
        AtomicReference<IOException> observed = new AtomicReference<>();

        ResetIntake.acceptAndReset(socket, attempts, observed);

        verify(socket).accept();
        assertEquals(0, attempts.get());
        assertSame(failure, observed.get());
    }

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

    @Test
    void reportsRealExporterRateLimitThroughHeartbeatAndQueryThenRecovers(
            CapturedOutput output) throws Exception {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        RetriableIntake intake = new RetriableIntake(429, true);
        intake.start();
        List<Integer> ports = availablePorts(5);
        OtelRuntimeProperties properties = properties(runtimeBinary, ports);
        properties.setExportEndpoint(URI.create("http://127.0.0.1:" + intake.port() + "/api/otlp"));
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
        long runtimePid = -1;
        try {
            supervisor.start();
            runtimePid = supervisor.snapshot().pid();
            sendMetricPayload(properties.getOtlpHttpEndpoint(), singleMetricPayload(RATE_LIMIT_PROOF_METRIC));
            await(() -> intake.rejectedRequests() > 0, Duration.ofSeconds(20));
            ManagedOtelRuntimeStatus limited = awaitStatus(
                    statusProvider, ManagedOtelRuntimeStatus.FailureCode.BACKEND_UNAVAILABLE,
                    Duration.ofSeconds(20));
            assertStableRuntimeIdentity(limited, runtimePid);
            assertTrue(intake.authorizationWasValid());
            assertTrue(positive(limited.telemetry().queueSizeBySignal().metrics()));
            reportHeartbeat(manageServer, limited);
            assertRetriableQuery(
                    query(queryApi), intake.port(), "BACKEND_UNAVAILABLE", RATE_LIMIT_PROOF_METRIC);

            long sentBeforeRecovery = limited.telemetry().sent().metrics().value();
            intake.accept();
            ManagedOtelRuntimeStatus recovered = awaitRuntimeStatus(
                    statusProvider,
                    status -> status.failureCode() == ManagedOtelRuntimeStatus.FailureCode.NONE
                            && zero(status.telemetry().queueSizeBySignal().metrics())
                            && availableGreaterThan(status.telemetry().sent().metrics(), sentBeforeRecovery),
                    Duration.ofSeconds(40));
            assertStableRuntimeIdentity(recovered, runtimePid);
            assertTrue(intake.acceptedRequests() > 0);
            reportHeartbeat(manageServer, recovered);
            assertRetriableQuery(query(queryApi), intake.port(), "NONE", RATE_LIMIT_PROOF_METRIC);
        } finally {
            supervisor.close();
            intake.close();
        }
        assertFalse(ProcessHandle.of(runtimePid).map(ProcessHandle::isAlive).orElse(false));
        assertSafeRetriable(output.getAll(), intake.port(), RATE_LIMIT_PROOF_METRIC);
        String runtimeLog = Files.readString(tempDir.resolve("logs/otel-runtime.log"));
        assertSafe(runtimeLog);
        assertFalse(runtimeLog.contains(RATE_LIMIT_PROOF_METRIC));
        assertFalse(runtimeLog.contains(tempDir.toString()));
    }

    @Test
    void reportsRealExporterUnavailableThroughHeartbeatAndQueryThenRecovers(
            CapturedOutput output) throws Exception {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        RetriableIntake intake = new RetriableIntake(503, true);
        intake.start();
        List<Integer> ports = availablePorts(5);
        OtelRuntimeProperties properties = properties(runtimeBinary, ports);
        properties.setExportEndpoint(URI.create("http://127.0.0.1:" + intake.port() + "/api/otlp"));
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
        long runtimePid = -1;
        try {
            supervisor.start();
            runtimePid = supervisor.snapshot().pid();
            sendMetricPayload(properties.getOtlpHttpEndpoint(), singleMetricPayload(UNAVAILABLE_PROOF_METRIC));
            await(() -> intake.rejectedRequests() > 0, Duration.ofSeconds(20));
            ManagedOtelRuntimeStatus unavailable = awaitStatus(
                    statusProvider, ManagedOtelRuntimeStatus.FailureCode.BACKEND_UNAVAILABLE,
                    Duration.ofSeconds(20));
            assertStableRuntimeIdentity(unavailable, runtimePid);
            assertTrue(intake.authorizationWasValid());
            assertTrue(positive(unavailable.telemetry().queueSizeBySignal().metrics()));
            assertEquals(QUEUE_CAPACITY,
                    unavailable.telemetry().queueCapacityBySignal().metrics().value());
            assertTrue(unavailable.telemetry().queueSizeBySignal().metrics().value()
                    < unavailable.telemetry().queueCapacityBySignal().metrics().value());
            reportHeartbeat(manageServer, unavailable);
            assertRetriableQuery(
                    query(queryApi), intake.port(), "BACKEND_UNAVAILABLE", UNAVAILABLE_PROOF_METRIC);

            long sentBeforeRecovery = unavailable.telemetry().sent().metrics().value();
            intake.accept();
            ManagedOtelRuntimeStatus recovered = awaitRuntimeStatus(
                    statusProvider,
                    status -> status.failureCode() == ManagedOtelRuntimeStatus.FailureCode.NONE
                            && zero(status.telemetry().queueSizeBySignal().metrics())
                            && availableGreaterThan(status.telemetry().sent().metrics(), sentBeforeRecovery),
                    Duration.ofSeconds(40));
            assertStableRuntimeIdentity(recovered, runtimePid);
            assertTrue(intake.acceptedRequests() > 0);
            reportHeartbeat(manageServer, recovered);
            assertRetriableQuery(query(queryApi), intake.port(), "NONE", UNAVAILABLE_PROOF_METRIC);
        } finally {
            supervisor.close();
            intake.close();
        }
        assertFalse(ProcessHandle.of(runtimePid).map(ProcessHandle::isAlive).orElse(false));
        assertSafeRetriable(output.getAll(), intake.port(), UNAVAILABLE_PROOF_METRIC);
        String runtimeLog = Files.readString(tempDir.resolve("logs/otel-runtime.log"));
        assertSafe(runtimeLog);
        assertFalse(runtimeLog.contains(UNAVAILABLE_PROOF_METRIC));
        assertFalse(runtimeLog.contains(tempDir.toString()));
    }

    @Test
    void restoresPersistentExporterQueueAfterForcedRuntimeRestartThroughHeartbeatAndQuery(
            CapturedOutput output) throws Exception {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        RetriableIntake intake = new RetriableIntake(503, true);
        intake.start();
        List<Integer> ports = availablePorts(5);
        OtelRuntimeProperties properties = properties(runtimeBinary, ports);
        properties.setExportEndpoint(URI.create("http://127.0.0.1:" + intake.port() + "/api/otlp"));
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
        long initialPid = -1;
        long restartedPid = -1;
        try {
            supervisor.start();
            initialPid = supervisor.snapshot().pid();
            sendMetricPayload(properties.getOtlpHttpEndpoint(), singleMetricPayload(RESTART_PROOF_METRIC));
            await(() -> intake.rejectedRequests() > 0, Duration.ofSeconds(20));
            ManagedOtelRuntimeStatus queued = awaitRuntimeStatus(
                    statusProvider,
                    status -> status.failureCode() == ManagedOtelRuntimeStatus.FailureCode.BACKEND_UNAVAILABLE
                            && positive(status.telemetry().queueSizeBySignal().metrics()),
                    Duration.ofSeconds(20));
            assertStableRuntimeIdentity(queued, initialPid);
            reportHeartbeat(manageServer, queued);
            String queuedQuery = query(queryApi);
            assertRetriableQuery(
                    queuedQuery, intake.port(), "BACKEND_UNAVAILABLE", RESTART_PROOF_METRIC);
            assertRuntimeIdentityInQuery(queuedQuery, queued);

            ProcessHandle.of(initialPid).orElseThrow().destroyForcibly();
            long killedPid = initialPid;
            await(() -> !ProcessHandle.of(killedPid).map(ProcessHandle::isAlive).orElse(false),
                    Duration.ofSeconds(5));
            ManagedOtelRuntimeStatus restarted = awaitRuntimeStatus(
                    statusProvider,
                    status -> status.state() == ManagedOtelRuntimeStatus.RuntimeState.RUNNING
                            && status.pid() != killedPid
                            && status.restartCount() == 1
                            && status.desiredRevision() == queued.desiredRevision()
                            && status.activeRevision() == queued.activeRevision()
                            && status.failureCode() == ManagedOtelRuntimeStatus.FailureCode.BACKEND_UNAVAILABLE
                            && positive(status.telemetry().queueSizeBySignal().metrics()),
                    Duration.ofSeconds(30));
            restartedPid = restarted.pid();
            reportHeartbeat(manageServer, restarted);
            String restartedQuery = query(queryApi);
            assertRetriableQuery(
                    restartedQuery, intake.port(), "BACKEND_UNAVAILABLE", RESTART_PROOF_METRIC);
            assertRuntimeIdentityInQuery(restartedQuery, restarted);

            long sentBeforeRecovery = restarted.telemetry().sent().metrics().value();
            intake.accept();
            ManagedOtelRuntimeStatus recovered = awaitRuntimeStatus(
                    statusProvider,
                    status -> status.failureCode() == ManagedOtelRuntimeStatus.FailureCode.NONE
                            && status.pid() == restarted.pid()
                            && status.restartCount() == 1
                            && status.desiredRevision() == queued.desiredRevision()
                            && status.activeRevision() == queued.activeRevision()
                            && zero(status.telemetry().queueSizeBySignal().metrics())
                            && availableGreaterThan(status.telemetry().sent().metrics(), sentBeforeRecovery),
                    Duration.ofSeconds(40));
            assertTrue(intake.acceptedRequests() > 0);
            reportHeartbeat(manageServer, recovered);
            String recoveredQuery = query(queryApi);
            assertRetriableQuery(recoveredQuery, intake.port(), "NONE", RESTART_PROOF_METRIC);
            assertRuntimeIdentityInQuery(recoveredQuery, recovered);
        } finally {
            supervisor.close();
            intake.close();
        }
        long terminatedPid = restartedPid;
        assertTrue(terminatedPid > 0);
        await(() -> !ProcessHandle.of(terminatedPid).map(ProcessHandle::isAlive).orElse(false),
                Duration.ofSeconds(5));
        await(() -> noThreadNamed("hertzbeat-otel-runtime-supervisor"), Duration.ofSeconds(5));
        assertTrue(intake.isStopped());
        assertSafeRetriable(output.getAll(), intake.port(), RESTART_PROOF_METRIC);
        String runtimeLog = Files.readString(tempDir.resolve("logs/otel-runtime.log"));
        assertSafe(runtimeLog);
        assertFalse(runtimeLog.contains(RESTART_PROOF_METRIC));
        assertFalse(runtimeLog.contains(tempDir.toString()));
    }

    @Test
    void reportsRealExporterConnectionResetThroughHeartbeatAndQueryThenRecovers(
            CapturedOutput output) throws Exception {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        ResetIntake intake = new ResetIntake();
        intake.start();
        List<Integer> ports = availablePorts(5);
        OtelRuntimeProperties properties = properties(runtimeBinary, ports);
        properties.setExportEndpoint(URI.create("http://127.0.0.1:" + intake.port() + "/api/otlp"));
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
        long runtimePid = -1;
        try {
            supervisor.start();
            runtimePid = supervisor.snapshot().pid();
            sendMetricPayload(properties.getOtlpHttpEndpoint(), singleMetricPayload(RESET_PROOF_METRIC));
            await(() -> intake.resetAttempts() > 0, Duration.ofSeconds(20));
            ManagedOtelRuntimeStatus reset = awaitStatus(
                    statusProvider, ManagedOtelRuntimeStatus.FailureCode.BACKEND_UNAVAILABLE,
                    Duration.ofSeconds(20));
            assertStableRuntimeIdentity(reset, runtimePid);
            assertTrue(positive(reset.telemetry().queueSizeBySignal().metrics()));
            reportHeartbeat(manageServer, reset);
            assertResetQuery(query(queryApi), intake.port(), "BACKEND_UNAVAILABLE");

            long sentBeforeRecovery = reset.telemetry().sent().metrics().value();
            intake.recover();
            ManagedOtelRuntimeStatus recovered = awaitRuntimeStatus(
                    statusProvider,
                    status -> status.failureCode() == ManagedOtelRuntimeStatus.FailureCode.NONE
                            && zero(status.telemetry().queueSizeBySignal().metrics())
                            && availableGreaterThan(status.telemetry().sent().metrics(), sentBeforeRecovery),
                    Duration.ofSeconds(40));
            assertStableRuntimeIdentity(recovered, runtimePid);
            assertTrue(intake.authorizationWasValid());
            assertTrue(intake.acceptedRequests() > 0);
            reportHeartbeat(manageServer, recovered);
            assertResetQuery(query(queryApi), intake.port(), "NONE");
        } finally {
            supervisor.close();
            intake.close();
        }
        assertFalse(ProcessHandle.of(runtimePid).map(ProcessHandle::isAlive).orElse(false));
        assertTrue(intake.isResetThreadTerminated());
        assertSafeReset(output.getAll(), intake.port());
        String runtimeLog = Files.readString(tempDir.resolve("logs/otel-runtime.log"));
        assertSafe(runtimeLog);
        assertFalse(runtimeLog.contains(RESET_PROOF_METRIC));
        assertFalse(runtimeLog.contains(tempDir.toString()));
    }

    @Test
    void reportsRealExporterQueueCapacityThroughHeartbeatAndQueryThenDrains(
            CapturedOutput output) throws Exception {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        RetriableIntake intake = new RetriableIntake(503, false);
        intake.start();
        List<Integer> ports = availablePorts(5);
        OtelRuntimeProperties properties = properties(runtimeBinary, ports);
        properties.setExportEndpoint(URI.create("http://127.0.0.1:" + intake.port() + "/api/otlp"));
        CollectorRuntimeStatusRegistry registry = new CollectorRuntimeStatusRegistry();
        ManageServer manageServer = heartbeatServer(registry);
        MockMvc queryApi = queryApi(registry);
        OtelRuntimeFailureClassifier classifier = new OtelRuntimeFailureClassifier();
        OtelRuntimeDiagnosticsReader diagnosticsReader = new OtelRuntimeDiagnosticsReader(classifier);
        OtelRuntimeSupervisor supervisor = supervisor(properties);
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
            QueueLoad load = fillQueue(properties, statusProvider);
            assertFullQueue(load, runtimePid, intake, diagnosticsReader, properties);
            reportHeartbeat(manageServer, load.status());
            assertQueueQuery(query(queryApi), intake.port(), "QUEUE_FULL");

            long sentBeforeRecovery = load.status().telemetry().sent().metrics().value();
            intake.accept();
            ManagedOtelRuntimeStatus recovered = awaitRuntimeStatus(
                    statusProvider,
                    status -> status.failureCode() == ManagedOtelRuntimeStatus.FailureCode.NONE
                            && zero(status.telemetry().queueSizeBySignal().metrics())
                            && availableGreaterThan(status.telemetry().sent().metrics(), sentBeforeRecovery),
                    Duration.ofSeconds(60));
            assertRecoveredQueue(recovered, runtimePid, intake);
            reportHeartbeat(manageServer, recovered);
            assertQueueQuery(query(queryApi), intake.port(), "NONE");
        } finally {
            supervisor.close();
            intake.close();
        }

        assertFalse(ProcessHandle.of(runtimePid).map(ProcessHandle::isAlive).orElse(false));
        assertSafeQueue(output.getAll(), intake.port());
        String runtimeLog = Files.readString(tempDir.resolve("logs/otel-runtime.log"));
        assertSafe(runtimeLog);
        assertFalse(runtimeLog.contains(QUEUE_PROOF_METRIC));
        assertFalse(runtimeLog.contains(tempDir.toString()));
    }

    private void sendMetric(String endpoint) throws Exception {
        sendMetricPayload(endpoint, """
                {"resourceMetrics":[{"scopeMetrics":[{"metrics":[{
                  "name":"hertzbeat_auth_proof_metric",
                  "gauge":{"dataPoints":[{"asDouble":1.0}]}
                }]}]}]}
                """);
    }

    private void sendMetricPayload(String endpoint, String payload) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://" + endpoint + "/v1/metrics"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();
        HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
        assertEquals(200, response.statusCode());
    }

    private QueueLoad fillQueue(
            OtelRuntimeProperties properties,
            OtelRuntimeStatusProvider statusProvider) throws Exception {
        String payload = queueMetricPayload();
        long maximumLoadBytes = (long) payload.getBytes(StandardCharsets.UTF_8).length
                * (QUEUE_CAPACITY + QUEUE_OVERFLOW_MARGIN);
        assertTrue(maximumLoadBytes <= MAXIMUM_QUEUE_LOAD_BYTES);
        long started = System.nanoTime();
        int requests = 0;
        ManagedOtelRuntimeStatus full = null;
        for (int request = 0; request < QUEUE_CAPACITY + QUEUE_OVERFLOW_MARGIN; request++) {
            sendMetricPayload(properties.getOtlpHttpEndpoint(), payload);
            requests++;
            if ((request + 1) % 32 == 0) {
                ManagedOtelRuntimeStatus sample = statusProvider.status();
                if (queueIsFull(sample) && positive(sample.telemetry().enqueueFailed().metrics())) {
                    full = sample;
                    break;
                }
            }
        }
        if (full == null) {
            full = awaitRuntimeStatus(
                    statusProvider,
                    status -> status.failureCode() == ManagedOtelRuntimeStatus.FailureCode.QUEUE_FULL
                            && queueIsFull(status)
                            && positive(status.telemetry().enqueueFailed().metrics()),
                    Duration.ofSeconds(20));
        }
        return new QueueLoad(
                full,
                requests,
                Duration.ofNanos(System.nanoTime() - started));
    }

    private void assertFullQueue(
            QueueLoad load,
            long runtimePid,
            RetriableIntake intake,
            OtelRuntimeDiagnosticsReader diagnosticsReader,
            OtelRuntimeProperties properties) {
        ManagedOtelRuntimeStatus full = load.status();
        assertTrue(load.duration().compareTo(MAXIMUM_QUEUE_LOAD_DURATION) <= 0);
        assertTrue(load.requests() <= QUEUE_CAPACITY + QUEUE_OVERFLOW_MARGIN);
        assertEquals(ManagedOtelRuntimeStatus.FailureCode.QUEUE_FULL, full.failureCode());
        assertEquals(ManagedOtelRuntimeStatus.RuntimeState.RUNNING, full.state());
        assertEquals(runtimePid, full.pid());
        assertEquals(0, full.restartCount());
        assertEquals(1, full.desiredRevision());
        assertEquals(1, full.activeRevision());
        assertEquals(ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED, full.intakeCredentialState());
        assertTrue(intake.authorizationWasValid());
        assertTrue(intake.rejectedRequests() > 0);
        assertTrue(full.telemetry().accepted().metrics().value()
                >= (long) load.requests() * POINTS_PER_EXPORT_BATCH);
        assertTrue(full.telemetry().queueSizeBySignal().metrics().value()
                >= full.telemetry().queueCapacityBySignal().metrics().value());
        assertEquals(QUEUE_CAPACITY, full.telemetry().queueCapacityBySignal().metrics().value());
        assertFalse(diagnosticsReader.latestFailure(properties)
                == ManagedOtelRuntimeStatus.FailureCode.STORAGE_FULL);
    }

    private void assertRecoveredQueue(
            ManagedOtelRuntimeStatus recovered,
            long runtimePid,
            RetriableIntake intake) {
        assertEquals(ManagedOtelRuntimeStatus.RuntimeState.RUNNING, recovered.state());
        assertEquals(runtimePid, recovered.pid());
        assertEquals(0, recovered.restartCount());
        assertEquals(1, recovered.desiredRevision());
        assertEquals(1, recovered.activeRevision());
        assertTrue(intake.acceptedRequests() > 0);
    }

    private void assertQueueQuery(String query, int intakePort, String failureCode) {
        assertTrue(query.contains("\"failureCode\":\"" + failureCode + "\""));
        assertTrue(query.contains("\"name\":\"" + COLLECTOR_ID + "\""));
        assertSafeQueue(query, intakePort);
    }

    private String queueMetricPayload() {
        StringBuilder payload = new StringBuilder(24 * 1024);
        payload.append("{\"resourceMetrics\":[{\"scopeMetrics\":[{\"metrics\":[{\"name\":\"")
                .append(QUEUE_PROOF_METRIC)
                .append("\",\"gauge\":{\"dataPoints\":[");
        for (int index = 0; index < POINTS_PER_EXPORT_BATCH; index++) {
            if (index > 0) {
                payload.append(',');
            }
            payload.append("{\"asInt\":\"1\"}");
        }
        return payload.append("]}}]}]}]}").toString();
    }

    private String singleMetricPayload(String metricName) {
        return "{\"resourceMetrics\":[{\"scopeMetrics\":[{\"metrics\":[{\"name\":\""
                + metricName
                + "\",\"gauge\":{\"dataPoints\":[{\"asDouble\":1.0}]}}]}]}]}";
    }

    private void assertStableRuntimeIdentity(ManagedOtelRuntimeStatus status, long runtimePid) {
        assertEquals(ManagedOtelRuntimeStatus.RuntimeState.RUNNING, status.state());
        assertEquals(runtimePid, status.pid());
        assertEquals(0, status.restartCount());
        assertEquals(1, status.desiredRevision());
        assertEquals(1, status.activeRevision());
    }

    private void assertRetriableQuery(
            String query, int intakePort, String failureCode, String proofMetric) {
        assertTrue(query.contains("\"failureCode\":\"" + failureCode + "\""));
        assertTrue(query.contains("\"name\":\"" + COLLECTOR_ID + "\""));
        assertSafeRetriable(query, intakePort, proofMetric);
    }

    private void assertRuntimeIdentityInQuery(String query, ManagedOtelRuntimeStatus status) {
        assertTrue(query.contains("\"desiredRevision\":" + status.desiredRevision()));
        assertTrue(query.contains("\"activeRevision\":" + status.activeRevision()));
        assertTrue(query.contains("\"pid\":" + status.pid()));
        assertTrue(query.contains("\"restartCount\":" + status.restartCount()));
    }

    private void assertSafeAuthentication(String content, int intakePort) {
        assertSafe(content);
        assertFalse(content.contains(AUTH_PROOF_METRIC));
        assertFalse(content.contains("/api/otlp"));
        assertFalse(content.contains("127.0.0.1:" + intakePort));
        assertFalse(content.contains(tempDir.toString()));
    }

    private void assertSafeQueue(String content, int intakePort) {
        assertSafe(content);
        assertFalse(content.contains(QUEUE_PROOF_METRIC));
        assertFalse(content.contains("/api/otlp"));
        assertFalse(content.contains("127.0.0.1:" + intakePort));
        assertFalse(content.contains(tempDir.toString()));
    }

    private void assertSafeRetriable(String content, int intakePort, String proofMetric) {
        assertSafe(content);
        assertFalse(content.contains(proofMetric));
        assertFalse(content.contains("/api/otlp"));
        assertFalse(content.contains("127.0.0.1:" + intakePort));
        assertFalse(content.contains(tempDir.toString()));
    }

    private void assertResetQuery(String query, int intakePort, String failureCode) {
        assertTrue(query.contains("\"failureCode\":\"" + failureCode + "\""));
        assertTrue(query.contains("\"name\":\"" + COLLECTOR_ID + "\""));
        assertSafeReset(query, intakePort);
    }

    private void assertSafeReset(String content, int intakePort) {
        assertSafe(content);
        assertFalse(content.contains(RESET_PROOF_METRIC));
        assertFalse(content.contains("/api/otlp"));
        assertFalse(content.contains("127.0.0.1:" + intakePort));
        assertFalse(content.contains(tempDir.toString()));
    }

    private boolean queueIsFull(ManagedOtelRuntimeStatus status) {
        ManagedOtelRuntimeStatus.ObservedLong size = status.telemetry().queueSizeBySignal().metrics();
        ManagedOtelRuntimeStatus.ObservedLong capacity = status.telemetry().queueCapacityBySignal().metrics();
        return size.state() == ManagedOtelRuntimeStatus.ValueState.AVAILABLE
                && capacity.state() == ManagedOtelRuntimeStatus.ValueState.AVAILABLE
                && capacity.value() == QUEUE_CAPACITY
                && size.value() >= capacity.value();
    }

    private boolean positive(ManagedOtelRuntimeStatus.ObservedLong value) {
        return value.state() == ManagedOtelRuntimeStatus.ValueState.AVAILABLE && value.value() > 0;
    }

    private boolean zero(ManagedOtelRuntimeStatus.ObservedLong value) {
        return value.state() == ManagedOtelRuntimeStatus.ValueState.AVAILABLE && value.value() == 0;
    }

    private boolean availableGreaterThan(ManagedOtelRuntimeStatus.ObservedLong value, long baseline) {
        return value.state() == ManagedOtelRuntimeStatus.ValueState.AVAILABLE && value.value() > baseline;
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

    private ManagedOtelRuntimeStatus awaitRuntimeStatus(
            OtelRuntimeStatusProvider provider,
            Predicate<ManagedOtelRuntimeStatus> expected,
            Duration timeout) throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        ManagedOtelRuntimeStatus observed;
        do {
            observed = provider.status();
            if (expected.test(observed)) {
                return observed;
            }
            Thread.sleep(100);
        } while (System.nanoTime() < deadline);
        assertTrue(expected.test(observed), JsonUtil.toJson(observed));
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

    private static boolean noThreadNamed(String name) {
        return Thread.getAllStackTraces().keySet().stream()
                .noneMatch(thread -> thread.isAlive() && name.equals(thread.getName()));
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

    private static final class ResetIntake implements AutoCloseable {

        private final AtomicInteger resetAttempts = new AtomicInteger();
        private final AtomicInteger acceptedRequests = new AtomicInteger();
        private final AtomicBoolean authorizationWasValid = new AtomicBoolean(true);
        private final AtomicReference<IOException> resetFailure = new AtomicReference<>();
        private ServerSocket resetSocket;
        private Thread resetThread;
        private HttpServer recoveredServer;
        private int port;

        void start() throws IOException {
            resetSocket = new ServerSocket();
            resetSocket.setReuseAddress(true);
            resetSocket.bind(new InetSocketAddress("127.0.0.1", 0), 16);
            port = resetSocket.getLocalPort();
            resetThread = new Thread(
                    () -> acceptAndReset(resetSocket, resetAttempts, resetFailure),
                    "otel-reset-intake");
            resetThread.setDaemon(true);
            resetThread.start();
        }

        private static void acceptAndReset(
                ServerSocket socket,
                AtomicInteger attempts,
                AtomicReference<IOException> failure) {
            while (!socket.isClosed()) {
                try (Socket connection = socket.accept()) {
                    attempts.incrementAndGet();
                    connection.setSoLinger(true, 0);
                } catch (IOException exception) {
                    if (!socket.isClosed()) {
                        failure.compareAndSet(null, exception);
                    }
                    break;
                }
            }
        }

        void recover() throws IOException, InterruptedException {
            stopResetServer();
            IOException bindFailure = null;
            for (int attempt = 0; attempt < 20; attempt++) {
                try {
                    recoveredServer = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
                    recoveredServer.createContext("/api/otlp", this::accept);
                    recoveredServer.start();
                    return;
                } catch (IOException exception) {
                    bindFailure = exception;
                    Thread.sleep(100);
                }
            }
            throw bindFailure;
        }

        private void accept(HttpExchange exchange) throws IOException {
            try (exchange) {
                if (!("Bearer " + INTAKE_TOKEN).equals(
                        exchange.getRequestHeaders().getFirst("Authorization"))) {
                    authorizationWasValid.set(false);
                }
                exchange.getRequestBody().transferTo(OutputStream.nullOutputStream());
                acceptedRequests.incrementAndGet();
                exchange.sendResponseHeaders(200, -1);
            }
        }

        private void stopResetServer() throws IOException, InterruptedException {
            if (resetSocket != null && !resetSocket.isClosed()) {
                resetSocket.close();
            }
            if (resetThread != null) {
                resetThread.join(2000);
            }
            IOException failure = resetFailure.get();
            if (failure != null) {
                throw failure;
            }
        }

        int port() {
            return port;
        }

        int resetAttempts() {
            return resetAttempts.get();
        }

        int acceptedRequests() {
            return acceptedRequests.get();
        }

        boolean authorizationWasValid() {
            return authorizationWasValid.get();
        }

        boolean isResetThreadTerminated() {
            return resetThread == null || !resetThread.isAlive();
        }

        @Override
        public void close() throws IOException, InterruptedException {
            try {
                stopResetServer();
            } finally {
                if (recoveredServer != null) {
                    recoveredServer.stop(0);
                }
            }
        }
    }

    private record QueueLoad(
            ManagedOtelRuntimeStatus status,
            int requests,
            Duration duration) {
    }

    private static final class RetriableIntake implements AutoCloseable {

        private final int rejectedStatus;
        private final boolean retryAfter;
        private final ExecutorService executor = new ThreadPoolExecutor(
                4,
                4,
                0,
                TimeUnit.MILLISECONDS,
                new ArrayBlockingQueue<>(8),
                runnable -> {
                    Thread thread = new Thread(runnable, "hertzbeat-retriable-intake");
                    thread.setDaemon(true);
                    return thread;
                },
                new ThreadPoolExecutor.CallerRunsPolicy());
        private final AtomicBoolean accepting = new AtomicBoolean();
        private final AtomicBoolean authorizationWasValid = new AtomicBoolean(true);
        private final AtomicBoolean stopped = new AtomicBoolean(true);
        private final AtomicInteger rejectedRequests = new AtomicInteger();
        private final AtomicInteger acceptedRequests = new AtomicInteger();
        private HttpServer server;

        private RetriableIntake(int rejectedStatus, boolean retryAfter) {
            this.rejectedStatus = rejectedStatus;
            this.retryAfter = retryAfter;
        }

        void start() throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/api/otlp", this::handle);
            server.setExecutor(executor);
            server.start();
            stopped.set(false);
        }

        private void handle(HttpExchange exchange) throws IOException {
            try (exchange) {
                if (!("Bearer " + INTAKE_TOKEN).equals(
                        exchange.getRequestHeaders().getFirst("Authorization"))) {
                    authorizationWasValid.set(false);
                }
                exchange.getRequestBody().transferTo(OutputStream.nullOutputStream());
                if (accepting.get()) {
                    acceptedRequests.incrementAndGet();
                    exchange.sendResponseHeaders(200, -1);
                } else {
                    rejectedRequests.incrementAndGet();
                    if (retryAfter) {
                        exchange.getResponseHeaders().set("Retry-After", "1");
                    }
                    exchange.sendResponseHeaders(rejectedStatus, -1);
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

        boolean isStopped() {
            return stopped.get() && executor.isTerminated();
        }

        @Override
        public void close() {
            if (server != null) {
                server.stop(0);
            }
            executor.shutdownNow();
            try {
                stopped.set(executor.awaitTermination(5, TimeUnit.SECONDS));
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
            }
        }
    }
}
