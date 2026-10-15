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
import static org.junit.jupiter.api.Assertions.fail;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpsConfigurator;
import com.sun.net.httpserver.HttpsServer;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.BindException;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.StandardOpenOption;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BooleanSupplier;
import java.util.zip.GZIPInputStream;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.apache.hertzbeat.common.util.JsonUtil;
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
            assertEquals("", supervisor.snapshot().lastError());
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
    void backendOutageConvergesWithoutRestartAndRecoversAfterDrain() throws Exception {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        int exportPort = availablePort();
        OtelRuntimeProperties properties = properties(runtimeBinary, exportPort);
        OtelRuntimeSupervisor supervisor = new OtelRuntimeSupervisor(
                properties,
                new OtelRuntimeBinaryResolver(properties),
                new OtelRuntimeConfigTransaction(new OtelRuntimeConfigRenderer()),
                new OtelRuntimeProcessLauncher(),
                new OtelRuntimeHealthClient());
        OtelRuntimeFailureClassifier classifier = new OtelRuntimeFailureClassifier();
        OtelRuntimeStatusProvider statusProvider = new OtelRuntimeStatusProvider(
                properties,
                supervisor,
                new OtelRuntimeTelemetryClient(),
                new OtelRuntimeDiagnosticsReader(classifier),
                classifier);
        OtlpCapture capture = new OtlpCapture();
        try {
            supervisor.start();
            long initialPid = supervisor.snapshot().pid();
            sendThreeSignals(properties.getOtlpHttpEndpoint(), "backend-recovery",
                    "300102030405060708090a0b0c0d0e0f", "3001020304050607");

            ManagedOtelRuntimeStatus unavailable = awaitFailureCode(
                    statusProvider, ManagedOtelRuntimeStatus.FailureCode.BACKEND_UNAVAILABLE,
                    Duration.ofSeconds(20));
            unavailable = awaitSignalQueues(statusProvider, Duration.ofSeconds(20));
            assertEquals(initialPid, unavailable.pid());
            assertEquals(0, unavailable.restartCount());
            assertEquals(OtelRuntimeState.RUNNING.name(), unavailable.state().name());
            assertEquals(2048, unavailable.telemetry().queueCapacityBySignal().metrics().value());
            assertEquals(2048, unavailable.telemetry().queueCapacityBySignal().logs().value());
            assertEquals(2048, unavailable.telemetry().queueCapacityBySignal().traces().value());
            assertOwnerOnlyStorage(OtelRuntimeConfigRenderer.resolve(
                    properties.getHome(), properties.getFileStorageDirectory()));

            capture.start(exportPort);
            await(() -> capture.containsMetric("hertzbeat_backend-recovery_metric"), Duration.ofSeconds(30));
            ManagedOtelRuntimeStatus recovered = awaitFailureCode(
                    statusProvider, ManagedOtelRuntimeStatus.FailureCode.NONE, Duration.ofSeconds(30));
            assertEquals(initialPid, recovered.pid());
            assertEquals(0, recovered.restartCount());
            assertEquals(0, recovered.telemetry().queueSize().value());
            String heartbeatPayload = JsonUtil.toJson(recovered);
            assertFalse(heartbeatPayload.contains("phase0-direct-token"));
            assertFalse(heartbeatPayload.contains("Authorization"));
            assertFalse(heartbeatPayload.contains("BEGIN CERTIFICATE"));
            assertFalse(heartbeatPayload.contains("hertzbeat backend-recovery log"));
        } finally {
            supervisor.close();
            capture.close();
        }
    }

    @Test
    void corruptedPersistentQueueConvergesToStableStorageFailure() throws Exception {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        int exportPort = availablePort();
        OtelRuntimeProperties properties = properties(runtimeBinary, exportPort);
        properties.setMaxRestarts(1);
        properties.setRestartDelay(Duration.ofHours(1));
        OtelRuntimeSupervisor supervisor = supervisor(properties);
        try {
            supervisor.start();
            sendThreeSignals(properties.getOtlpHttpEndpoint(), "corrupt-queue",
                    "310102030405060708090a0b0c0d0e0f", "3101020304050607");
            Path storage = OtelRuntimeConfigRenderer.resolve(
                    properties.getHome(), properties.getFileStorageDirectory());
            Thread.sleep(Duration.ofSeconds(6));
            await(() -> containsStoredData(storage), Duration.ofSeconds(15));
            supervisor.close();
            corruptStorageFiles(storage);

            supervisor = supervisor(properties);
            supervisor.start();
            OtelRuntimeFailureClassifier classifier = new OtelRuntimeFailureClassifier();
            OtelRuntimeStatusProvider statusProvider = new OtelRuntimeStatusProvider(
                    properties,
                    supervisor,
                    new OtelRuntimeTelemetryClient(),
                    new OtelRuntimeDiagnosticsReader(classifier),
                    classifier);

            ManagedOtelRuntimeStatus status = awaitFailureCode(
                    statusProvider, ManagedOtelRuntimeStatus.FailureCode.STORAGE_CORRUPTED,
                    Duration.ofSeconds(15));
            assertEquals(ManagedOtelRuntimeStatus.RuntimeState.FAILED, status.state());
            assertEquals(1, status.restartCount());
            assertEquals(-1, status.pid());
        } finally {
            supervisor.close();
        }
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
        properties.setPrometheusTargets(List.of(ManagedOtelRuntimeConfig.PrometheusTarget.basic(
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
        String afterCopyTruncate = "payment accepted after copytruncate";
        String oversizedPrefix = "oversized-line-prefix";
        String oversizedSuffix = "oversized-line-must-be-truncated";
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

            Files.writeString(applicationLog, afterCopyTruncate + "\n", StandardOpenOption.TRUNCATE_EXISTING);
            await(() -> capture.logOccurrences(afterCopyTruncate) == 1, Duration.ofSeconds(15));
            Files.writeString(applicationLog,
                    oversizedPrefix + "x".repeat(1_100_000) + oversizedSuffix + "\n",
                    StandardOpenOption.APPEND);
            await(() -> capture.logOccurrences(oversizedPrefix) == 1, Duration.ofSeconds(15));
            assertEquals(0, capture.logOccurrences(oversizedSuffix));

            long initialPid = supervisor.snapshot().pid();
            ProcessHandle.of(initialPid).orElseThrow().destroyForcibly();
            Files.writeString(applicationLog, duringRestart + "\n", StandardOpenOption.APPEND);
            await(() -> supervisor.snapshot().state() == OtelRuntimeState.RUNNING
                            && supervisor.snapshot().pid() != initialPid,
                    Duration.ofSeconds(15));
            await(() -> capture.logOccurrences(duringRestart) == 1, Duration.ofSeconds(15));
            assertEquals(1, capture.logOccurrences(beforeRestart));
            assertEquals(1, capture.logOccurrences(afterRotation));
            assertEquals(1, capture.logOccurrences(afterCopyTruncate));
            assertEquals(0, capture.logOccurrences("historical-line"));
        } finally {
            supervisor.close();
            prometheus.close();
            capture.close();
        }
    }

    @Test
    void enforcesPrometheusTimeoutHeadersAndCardinalityBeforeRecovering() throws Exception {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        OtlpCapture capture = new OtlpCapture();
        GuardedPrometheusFixture prometheus = new GuardedPrometheusFixture("integration-secret");
        capture.start();
        prometheus.start();
        OtelRuntimeProperties properties = properties(runtimeBinary, capture.port());
        properties.setPrometheusHeaderSecrets(Map.of("payments-token", "integration-secret"));
        properties.setPrometheusTargets(List.of(new ManagedOtelRuntimeConfig.PrometheusTarget(
                "guarded",
                URI.create("http://127.0.0.1:" + prometheus.port() + "/metrics"),
                Duration.ofSeconds(10),
                Duration.ofSeconds(1),
                Map.of("X-Scrape-Token", "payments-token"),
                "")));
        OtelRuntimeSupervisor supervisor = new OtelRuntimeSupervisor(
                properties,
                new OtelRuntimeBinaryResolver(properties),
                new OtelRuntimeConfigTransaction(new OtelRuntimeConfigRenderer()),
                new OtelRuntimeProcessLauncher(),
                new OtelRuntimeHealthClient()
        );
        try {
            supervisor.start();
            assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
            await(() -> capture.containsMetric("hertzbeat_prometheus_recovered"), Duration.ofSeconds(45));

            assertTrue(prometheus.requestCount() >= 4);
            assertEquals(0, prometheus.missingHeaderCount());
            assertFalse(capture.containsMetric("hertzbeat_high_cardinality_overflow"));
        } finally {
            supervisor.close();
            prometheus.close();
            capture.close();
        }
    }

    @Test
    void scrapesPrometheusThroughAnApprovedTlsCaProfile() throws Exception {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        OtlpCapture capture = new OtlpCapture();
        TlsPrometheusFixture prometheus = new TlsPrometheusFixture(tempDir.resolve("prometheus-tls"));
        capture.start();
        prometheus.start();
        OtelRuntimeProperties properties = properties(runtimeBinary, capture.port());
        properties.setPrometheusTlsCaProfiles(Map.of("integration-ca", prometheus.caFile()));
        properties.setPrometheusTargets(List.of(new ManagedOtelRuntimeConfig.PrometheusTarget(
                "tls",
                URI.create("https://127.0.0.1:" + prometheus.port() + "/metrics"),
                Duration.ofSeconds(10),
                Duration.ofSeconds(5),
                Map.of(),
                "integration-ca")));
        OtelRuntimeSupervisor supervisor = new OtelRuntimeSupervisor(
                properties,
                new OtelRuntimeBinaryResolver(properties),
                new OtelRuntimeConfigTransaction(new OtelRuntimeConfigRenderer()),
                new OtelRuntimeProcessLauncher(),
                new OtelRuntimeHealthClient()
        );
        try {
            supervisor.start();
            assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
            await(() -> capture.containsMetric("hertzbeat_tls_scrape"), Duration.ofSeconds(20));
        } finally {
            supervisor.close();
            prometheus.close();
            capture.close();
        }
    }

    @Test
    void receivesAndForwardsOtlpHttpThreeSignals() throws Exception {
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
        try {
            supervisor.start();
            assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
            sendThreeSignals(properties.getOtlpHttpEndpoint(), "receiver",
                    "000102030405060708090a0b0c0d0e0f", "0001020304050607");

            await(() -> capture.containsMetric("hertzbeat_receiver_metric"), Duration.ofSeconds(15));
            await(() -> capture.containsLog("hertzbeat receiver log"), Duration.ofSeconds(15));
            await(() -> capture.containsTrace("hertzbeat receiver span"), Duration.ofSeconds(15));
        } finally {
            supervisor.close();
            capture.close();
        }
    }

    @Test
    void governsResourceIdentityAndSensitiveAttributesAcrossThreeSignals() throws Exception {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        OtlpCapture capture = new OtlpCapture();
        capture.start();
        OtelRuntimeProperties properties = properties(runtimeBinary, capture.port());
        properties.setEnvironment("staging");
        properties.setTelemetryFilterPresets(Set.of(
                ManagedOtelRuntimeConfig.TelemetryFilterPreset.HEALTH_CHECK_TRACES));
        OtelRuntimeSupervisor supervisor = new OtelRuntimeSupervisor(
                properties,
                new OtelRuntimeBinaryResolver(properties),
                new OtelRuntimeConfigTransaction(new OtelRuntimeConfigRenderer()),
                new OtelRuntimeProcessLauncher(),
                new OtelRuntimeHealthClient()
        );
        try {
            supervisor.start();
            assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
            sendGovernedSignals(properties.getOtlpHttpEndpoint());

            await(() -> capture.containsMetric("hertzbeat_governed_metric"), Duration.ofSeconds(15));
            await(() -> capture.containsLog("hertzbeat governed log"), Duration.ofSeconds(15));
            await(() -> capture.containsTrace("hertzbeat governed span"), Duration.ofSeconds(15));
            Thread.sleep(Duration.ofSeconds(6));

            assertTrue(capture.allSignalsContain("collector-phase0-integration"));
            assertTrue(capture.allSignalsContain("deployment.environment.name"));
            assertTrue(capture.allSignalsContain("staging"));
            assertTrue(capture.allSignalsContain("host.name"));
            assertTrue(capture.allSignalsContain("os.type"));
            assertTrue(capture.allSignalsContain("process.pid"));
            assertTrue(capture.allSignalsContain("container.id"));
            assertFalse(capture.containsAnySignal("spoofed-collector"));
            assertFalse(capture.containsAnySignal("forbidden-secret"));
            assertFalse(capture.containsTrace("filtered health span"));
        } finally {
            supervisor.close();
            capture.close();
        }
    }

    @Test
    void persistsThreeSignalsAcrossBackendOutageAndRuntimeRestart() throws Exception {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        int exportPort = availablePort();
        OtelRuntimeProperties properties = properties(runtimeBinary, exportPort);
        OtelRuntimeSupervisor supervisor = new OtelRuntimeSupervisor(
                properties,
                new OtelRuntimeBinaryResolver(properties),
                new OtelRuntimeConfigTransaction(new OtelRuntimeConfigRenderer()),
                new OtelRuntimeProcessLauncher(),
                new OtelRuntimeHealthClient()
        );
        OtlpCapture capture = new OtlpCapture();
        try {
            supervisor.start();
            assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
            sendThreeSignals(properties.getOtlpHttpEndpoint(), "outage",
                    "100102030405060708090a0b0c0d0e0f", "1001020304050607");

            Path storage = OtelRuntimeConfigRenderer.resolve(
                    properties.getHome(), properties.getFileStorageDirectory());
            Thread.sleep(Duration.ofSeconds(6));
            await(() -> containsStoredData(storage), Duration.ofSeconds(15));
            long initialPid = supervisor.snapshot().pid();
            ProcessHandle.of(initialPid).orElseThrow().destroyForcibly();
            capture.start(exportPort);
            await(() -> supervisor.snapshot().state() == OtelRuntimeState.RUNNING
                            && supervisor.snapshot().pid() != initialPid,
                    Duration.ofSeconds(15));
            await(() -> capture.containsMetric("hertzbeat_outage_metric"), Duration.ofSeconds(30));
            await(() -> capture.containsLog("hertzbeat outage log"), Duration.ofSeconds(30));
            await(() -> capture.containsTrace("hertzbeat outage span"), Duration.ofSeconds(30));
        } finally {
            supervisor.close();
            capture.close();
        }
    }

    private OtelRuntimeProperties properties(String runtimeBinary, int exportPort) throws IOException {
        List<Integer> runtimePorts = availablePortsExcluding(exportPort, 3);
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        properties.setHome(tempDir);
        properties.setBinary(Path.of(runtimeBinary));
        properties.setCollectorId("collector-phase0-integration");
        properties.setWorkspaceId("workspace-phase0-integration");
        properties.setToken("phase0-direct-token");
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

    private OtelRuntimeSupervisor supervisor(OtelRuntimeProperties properties) {
        return new OtelRuntimeSupervisor(
                properties,
                new OtelRuntimeBinaryResolver(properties),
                new OtelRuntimeConfigTransaction(new OtelRuntimeConfigRenderer()),
                new OtelRuntimeProcessLauncher(),
                new OtelRuntimeHealthClient());
    }

    private static void sendOtlpJson(String endpoint, String signal, String payload) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://" + endpoint + "/v1/" + signal))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();
        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode(), response.body());
    }

    private static void sendThreeSignals(String endpoint, String scenario, String traceId, String spanId)
            throws Exception {
        sendOtlpJson(endpoint, "metrics", """
                {"resourceMetrics":[{"scopeMetrics":[{"metrics":[{
                  "name":"hertzbeat_%s_metric",
                  "gauge":{"dataPoints":[{"asDouble":7.0}]}
                }]}]}]}
                """.formatted(scenario));
        sendOtlpJson(endpoint, "logs", """
                {"resourceLogs":[{"scopeLogs":[{"logRecords":[{
                  "severityText":"INFO",
                  "body":{"stringValue":"hertzbeat %s log"}
                }]}]}]}
                """.formatted(scenario));
        sendOtlpJson(endpoint, "traces", """
                {"resourceSpans":[{"scopeSpans":[{"spans":[{
                  "traceId":"%s",
                  "spanId":"%s",
                  "name":"hertzbeat %s span",
                  "startTimeUnixNano":"1783757000000000000",
                  "endTimeUnixNano":"1783757000010000000"
                }]}]}]}
                """.formatted(traceId, spanId, scenario));
    }

    private static void sendGovernedSignals(String endpoint) throws Exception {
        String resource = """
                "resource":{"attributes":[
                  {"key":"service.name","value":{"stringValue":"payments"}},
                  {"key":"process.pid","value":{"intValue":"42"}},
                  {"key":"container.id","value":{"stringValue":"container-42"}},
                  {"key":"hertzbeat.collector.id","value":{"stringValue":"spoofed-collector"}},
                  {"key":"authorization","value":{"stringValue":"forbidden-secret"}}
                ]}
                """;
        sendOtlpJson(endpoint, "metrics", """
                {"resourceMetrics":[{%s,"scopeMetrics":[{"metrics":[{
                  "name":"hertzbeat_governed_metric",
                  "gauge":{"dataPoints":[{"asDouble":7.0,"attributes":[
                    {"key":"api_key","value":{"stringValue":"forbidden-secret"}}
                  ]}]}
                }]}]}]}
                """.formatted(resource));
        sendOtlpJson(endpoint, "logs", """
                {"resourceLogs":[{%s,"scopeLogs":[{"logRecords":[{
                  "severityText":"INFO",
                  "body":{"stringValue":"hertzbeat governed log"},
                  "attributes":[
                    {"key":"cookie","value":{"stringValue":"forbidden-secret"}}
                  ]
                }]}]}]}
                """.formatted(resource));
        sendOtlpJson(endpoint, "traces", """
                {"resourceSpans":[{%s,"scopeSpans":[{"spans":[{
                  "traceId":"200102030405060708090a0b0c0d0e0f",
                  "spanId":"2001020304050607",
                  "name":"hertzbeat governed span",
                  "startTimeUnixNano":"1783757000000000000",
                  "endTimeUnixNano":"1783757000010000000",
                  "attributes":[
                    {"key":"http.route","value":{"stringValue":"/checkout"}},
                    {"key":"access_token","value":{"stringValue":"forbidden-secret"}}
                  ]
                },{
                  "traceId":"210102030405060708090a0b0c0d0e0f",
                  "spanId":"2101020304050607",
                  "name":"filtered health span",
                  "startTimeUnixNano":"1783757000000000000",
                  "endTimeUnixNano":"1783757000010000000",
                  "attributes":[
                    {"key":"http.route","value":{"stringValue":"/health"}}
                  ]
                }]}]}]}
                """.formatted(resource));
    }

    private static int availablePort() throws IOException {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
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

    private static void await(BooleanSupplier condition, Duration timeout) throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        while (!condition.getAsBoolean() && System.nanoTime() < deadline) {
            Thread.sleep(50);
        }
        assertTrue(condition.getAsBoolean(), "condition did not become true before deadline");
    }

    private static ManagedOtelRuntimeStatus awaitFailureCode(
            OtelRuntimeStatusProvider statusProvider,
            ManagedOtelRuntimeStatus.FailureCode expected,
            Duration timeout) throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        ManagedOtelRuntimeStatus status;
        do {
            status = statusProvider.status();
            if (status.failureCode() == expected) {
                return status;
            }
            Thread.sleep(50);
        } while (System.nanoTime() < deadline);
        assertEquals(expected, status.failureCode(), JsonUtil.toJson(status));
        return status;
    }

    private static ManagedOtelRuntimeStatus awaitSignalQueues(
            OtelRuntimeStatusProvider statusProvider, Duration timeout) throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        ManagedOtelRuntimeStatus status;
        do {
            status = statusProvider.status();
            if (positive(status.telemetry().queueSizeBySignal().metrics())
                    && positive(status.telemetry().queueSizeBySignal().logs())
                    && positive(status.telemetry().queueSizeBySignal().traces())) {
                return status;
            }
            Thread.sleep(50);
        } while (System.nanoTime() < deadline);
        return fail(JsonUtil.toJson(status));
    }

    private static boolean positive(ManagedOtelRuntimeStatus.ObservedLong value) {
        return value.state() == ManagedOtelRuntimeStatus.ValueState.AVAILABLE && value.value() > 0;
    }

    private static void assertOwnerOnlyStorage(Path storage) throws IOException {
        if (!Files.getFileStore(storage).supportsFileAttributeView("posix")) {
            return;
        }
        assertEquals(Set.of(
                PosixFilePermission.OWNER_READ,
                PosixFilePermission.OWNER_WRITE,
                PosixFilePermission.OWNER_EXECUTE), Files.getPosixFilePermissions(storage));
        try (var files = Files.walk(storage)) {
            for (Path file : files.filter(Files::isRegularFile).toList()) {
                Set<PosixFilePermission> permissions = Files.getPosixFilePermissions(file);
                assertTrue(permissions.stream().allMatch(permission -> permission.name().startsWith("OWNER_")),
                        () -> file + " has non-owner permissions: " + permissions);
            }
        }
    }

    private static boolean containsStoredData(Path storage) {
        if (!Files.isDirectory(storage)) {
            return false;
        }
        try (var paths = Files.walk(storage)) {
            return paths.filter(Files::isRegularFile).anyMatch(path -> {
                try {
                    return Files.size(path) > 0;
                } catch (IOException ignored) {
                    return false;
                }
            });
        } catch (IOException ignored) {
            return false;
        }
    }

    private static void corruptStorageFiles(Path storage) throws IOException {
        try (var files = Files.walk(storage)) {
            for (Path file : files.filter(Files::isRegularFile).toList()) {
                Files.writeString(file, "corrupted persistent queue", StandardOpenOption.TRUNCATE_EXISTING);
            }
        }
    }

    private static final class OtlpCapture implements AutoCloseable {

        private final AtomicInteger requestCount = new AtomicInteger();
        private final AtomicReference<String> authorization = new AtomicReference<>("");
        private final AtomicReference<String> contentType = new AtomicReference<>("");
        private final AtomicReference<String> payload = new AtomicReference<>("");
        private final List<String> metricPayloads = new CopyOnWriteArrayList<>();
        private final List<String> logPayloads = new CopyOnWriteArrayList<>();
        private final List<String> tracePayloads = new CopyOnWriteArrayList<>();
        private HttpServer server;

        void start() throws IOException {
            start(0);
        }

        void start(int port) throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
            server.createContext("/api/otlp/v1/metrics", exchange -> capture(exchange, metricPayloads));
            server.createContext("/api/otlp/v1/logs", exchange -> capture(exchange, logPayloads));
            server.createContext("/api/otlp/v1/traces", exchange -> capture(exchange, tracePayloads));
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

        boolean containsLog(String body) {
            return logPayloads.stream().anyMatch(value -> value.contains(body));
        }

        boolean containsTrace(String spanName) {
            return tracePayloads.stream().anyMatch(value -> value.contains(spanName));
        }

        boolean allSignalsContain(String value) {
            return metricPayloads.stream().anyMatch(payloadValue -> payloadValue.contains(value))
                    && logPayloads.stream().anyMatch(payloadValue -> payloadValue.contains(value))
                    && tracePayloads.stream().anyMatch(payloadValue -> payloadValue.contains(value));
        }

        boolean containsAnySignal(String value) {
            return metricPayloads.stream().anyMatch(payloadValue -> payloadValue.contains(value))
                    || logPayloads.stream().anyMatch(payloadValue -> payloadValue.contains(value))
                    || tracePayloads.stream().anyMatch(payloadValue -> payloadValue.contains(value));
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

    private static final class GuardedPrometheusFixture implements AutoCloseable {

        private final String expectedSecret;
        private final AtomicInteger requests = new AtomicInteger();
        private final AtomicInteger missingHeaders = new AtomicInteger();
        private HttpServer server;

        private GuardedPrometheusFixture(String expectedSecret) {
            this.expectedSecret = expectedSecret;
        }

        void start() throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/metrics", exchange -> {
                try (exchange) {
                    if (!expectedSecret.equals(exchange.getRequestHeaders().getFirst("X-Scrape-Token"))) {
                        missingHeaders.incrementAndGet();
                        exchange.sendResponseHeaders(401, -1);
                        return;
                    }
                    int request = requests.incrementAndGet();
                    if (request == 1) {
                        Thread.sleep(1500);
                        exchange.sendResponseHeaders(200, -1);
                        return;
                    }
                    if (request == 2) {
                        exchange.sendResponseHeaders(503, -1);
                        return;
                    }
                    String body = request == 3 ? highCardinalityBody() : "hertzbeat_prometheus_recovered 1\n";
                    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                    exchange.getResponseHeaders().set("Content-Type", "text/plain; version=0.0.4");
                    exchange.sendResponseHeaders(200, bytes.length);
                    exchange.getResponseBody().write(bytes);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                }
            });
            server.start();
        }

        private String highCardinalityBody() {
            StringBuilder body = new StringBuilder(3_000_000);
            for (int index = 0; index < 50_000; index++) {
                body.append("hertzbeat_cardinality_sample{id=\"")
                        .append(index)
                        .append("\"} ")
                        .append(index)
                        .append('\n');
            }
            body.append("hertzbeat_high_cardinality_overflow 1\n");
            return body.toString();
        }

        int port() {
            return server.getAddress().getPort();
        }

        int requestCount() {
            return requests.get();
        }

        int missingHeaderCount() {
            return missingHeaders.get();
        }

        @Override
        public void close() {
            if (server != null) {
                server.stop(0);
            }
        }
    }

    private static final class TlsPrometheusFixture implements AutoCloseable {

        private static final char[] STORE_PASSWORD = "changeit".toCharArray();
        private final Path directory;
        private Path caFile;
        private HttpsServer server;

        private TlsPrometheusFixture(Path directory) {
            this.directory = directory;
        }

        void start() throws Exception {
            Files.createDirectories(directory);
            Path keyStoreFile = directory.resolve("server.p12");
            caFile = directory.resolve("ca.pem");
            runKeytool("-genkeypair", "-alias", "test", "-keyalg", "RSA", "-storetype", "PKCS12",
                    "-keystore", keyStoreFile.toString(), "-storepass", String.valueOf(STORE_PASSWORD),
                    "-keypass", String.valueOf(STORE_PASSWORD), "-dname", "CN=localhost",
                    "-ext", "SAN=ip:127.0.0.1,dns:localhost", "-validity", "1", "-noprompt");
            runKeytool("-exportcert", "-rfc", "-alias", "test", "-keystore", keyStoreFile.toString(),
                    "-storepass", String.valueOf(STORE_PASSWORD), "-file", caFile.toString());
            KeyStore keyStore = KeyStore.getInstance("PKCS12");
            try (var input = Files.newInputStream(keyStoreFile)) {
                keyStore.load(input, STORE_PASSWORD);
            }
            KeyManagerFactory keyManagers = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
            keyManagers.init(keyStore, STORE_PASSWORD);
            SSLContext context = SSLContext.getInstance("TLS");
            context.init(keyManagers.getKeyManagers(), null, new SecureRandom());
            server = HttpsServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.setHttpsConfigurator(new HttpsConfigurator(context));
            server.createContext("/metrics", exchange -> {
                try (exchange) {
                    byte[] body = "hertzbeat_tls_scrape 1\n".getBytes(StandardCharsets.UTF_8);
                    exchange.getResponseHeaders().set("Content-Type", "text/plain; version=0.0.4");
                    exchange.sendResponseHeaders(200, body.length);
                    exchange.getResponseBody().write(body);
                }
            });
            server.start();
        }

        private void runKeytool(String... arguments) throws Exception {
            String executable = Path.of(System.getProperty("java.home"), "bin",
                    System.getProperty("os.name").toLowerCase(Locale.ROOT).contains("win")
                            ? "keytool.exe" : "keytool").toString();
            List<String> command = new ArrayList<>(arguments.length + 1);
            command.add(executable);
            command.addAll(List.of(arguments));
            Process process = new ProcessBuilder(command).redirectErrorStream(true).start();
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            if (process.waitFor() != 0) {
                throw new IllegalStateException("keytool failed: " + output);
            }
        }

        Path caFile() {
            return caFile;
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
