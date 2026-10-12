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

import ch.qos.logback.classic.LoggerContext;
import com.google.protobuf.ByteString;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.logs.v1.LogRecord;
import io.opentelemetry.proto.metrics.v1.Metric;
import io.opentelemetry.proto.resource.v1.Resource;
import io.opentelemetry.proto.trace.v1.Span;
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import org.h2.Driver;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.slf4j.LoggerFactory;

class OtelJavaAgentIntegrationTest {

    private static final String RUNTIME_BINARY_ENV = "HERTZBEAT_OTEL_RUNTIME_BINARY";
    private static final String JAVA_AGENT_VERSION = "2.27.0";
    private static final URI JAVA_AGENT_URI = URI.create(
            "https://repo.maven.apache.org/maven2/io/opentelemetry/javaagent/opentelemetry-javaagent/"
                    + JAVA_AGENT_VERSION + "/opentelemetry-javaagent-" + JAVA_AGENT_VERSION + ".jar");
    private static final String JAVA_AGENT_SHA256 =
            "bd01fea1304e8c8803fff827a0bdda02b2266742a85c62548053c6761474bb5b";
    private static final String SERVICE_NAME = "checkout-agent-demo";
    private static final String SERVICE_NAMESPACE = "storefront";
    private static final String ENVIRONMENT = "integration";
    private static final String COLLECTOR_ID = "collector-javaagent-integration";

    @TempDir
    private Path tempDir;

    @Test
    void collectsRealApplicationMetricsCorrelatedLogsAndTraces() throws Exception {
        String runtimeBinary = requiredRuntimeBinary();
        try (ExternalLanguageProcessHarness harness =
                     ExternalLanguageProcessHarness.create("hertzbeat-java-agent-")) {
            Path agentJar = downloadVerifiedAgent(harness);
            Path applicationLog = Files.createDirectories(tempDir.resolve("logs")).resolve("application.json");
            Files.createFile(applicationLog);
            OtelRuntimeTestSupport.OtlpCapture capture = new OtelRuntimeTestSupport.OtlpCapture();
            capture.start();
            OtelRuntimeProperties properties = runtimeProperties(runtimeBinary, capture.port(), applicationLog);
            OtelRuntimeSupervisor supervisor = OtelRuntimeTestSupport.supervisor(properties);
            Process application = null;
            try {
                supervisor.start();
                assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());

                int applicationPort = availablePort();
                application = startApplication(agentJar, applicationLog, applicationPort, properties, true);
                awaitApplication(application, applicationPort);
                assertEquals(200, get(applicationPort, "/checkout").statusCode());
                assertEquals(500, get(applicationPort, "/failure").statusCode());

                OtelRuntimeTestSupport.await(
                        () -> hasJvmMetric(capture) && hasApplicationSignals(capture), Duration.ofSeconds(30));

                assertTrue(metricResources(capture).stream().anyMatch(
                        OtelJavaAgentIntegrationTest::hasDetectionContext),
                        () -> "metric resources: " + metricResources(capture));
                assertTrue(logResources(capture).stream().anyMatch(
                        OtelJavaAgentIntegrationTest::hasDetectionContext),
                        () -> "log resources: " + logResources(capture));
                assertTrue(traceResources(capture).stream().anyMatch(
                        OtelJavaAgentIntegrationTest::hasDetectionContext),
                        () -> "trace resources: " + traceResources(capture));

                List<Span> spans = spans(capture);
                assertTrue(spans.stream().anyMatch(span -> span.getName().contains("checkout")), spanNames(spans));
                assertTrue(spans.stream().anyMatch(span -> span.getName().contains("inventory")), spanNames(spans));
                assertTrue(spans.stream().anyMatch(span -> span.getName().toUpperCase().contains("SELECT")),
                        spanNames(spans));
                assertTrue(spans.stream().anyMatch(span -> span.getStatus().getCodeValue() == 2), spanNames(spans));

                LogRecord correlatedLog = logs(capture).stream()
                        .filter(log -> log.getBody().getStringValue().contains("checkout-completed"))
                        .findFirst().orElseThrow();
                assertFalse(correlatedLog.getTraceId().isEmpty());
                assertFalse(correlatedLog.getSpanId().isEmpty());
                Set<String> traceIds = new LinkedHashSet<>();
                spans.forEach(span -> traceIds.add(hex(span.getTraceId())));
                assertTrue(traceIds.contains(hex(correlatedLog.getTraceId())));
            } finally {
                stopApplication(application);
                supervisor.close();
                capture.close();
            }
        }
    }

    @Test
    void applicationWorksNormallyWhenAgentIsNotEnabled() throws Exception {
        int applicationPort = availablePort();
        Path applicationLog = tempDir.resolve("agent-disabled.log");
        Process application = startApplication(null, applicationLog, applicationPort, null, false);
        try {
            awaitApplication(application, applicationPort);
            assertEquals(200, get(applicationPort, "/checkout").statusCode());
            assertTrue(application.isAlive());
        } finally {
            stopApplication(application);
        }
    }

    private OtelRuntimeProperties runtimeProperties(String runtimeBinary, int exportPort, Path applicationLog)
            throws Exception {
        OtelRuntimeProperties properties = OtelRuntimeTestSupport.properties(
                tempDir, runtimeBinary, exportPort, COLLECTOR_ID);
        properties.setHostMetricsEnabled(false);
        properties.setHostMetricsScrapers(Set.of());
        return properties;
    }

    private Process startApplication(Path agentJar, Path logFile, int port,
                                     OtelRuntimeProperties runtime, boolean enabled) throws Exception {
        Path logback = writeLogbackConfiguration(logFile);
        List<String> command = new java.util.ArrayList<>();
        command.add(javaExecutable().toString());
        if (enabled) {
            command.add("-javaagent:" + agentJar);
            command.add("-Dotel.service.name=" + SERVICE_NAME);
            command.add("-Dotel.resource.attributes=service.namespace=" + SERVICE_NAMESPACE
                    + ",deployment.environment.name=" + ENVIRONMENT);
            command.add("-Dotel.exporter.otlp.endpoint=http://" + runtime.getOtlpHttpEndpoint());
            command.add("-Dotel.exporter.otlp.protocol=http/protobuf");
            command.add("-Dotel.traces.exporter=otlp");
            command.add("-Dotel.metrics.exporter=otlp");
            command.add("-Dotel.logs.exporter=otlp");
            command.add("-Dotel.metric.export.interval=1000");
            command.add("-Dotel.bsp.schedule.delay=100");
            command.add("-Dotel.javaagent.logging=none");
            command.add("-Dotel.instrumentation.logback-mdc.enabled=true");
        }
        command.add("-Dlogback.configurationFile=" + logback);
        command.add("-cp");
        command.add(applicationClasspath());
        command.add(OtelJavaAgentDemoApplication.class.getName());
        command.add(Integer.toString(port));
        return new ProcessBuilder(command)
                .redirectErrorStream(true)
                .redirectOutput(tempDir.resolve(enabled ? "agent-enabled.out" : "agent-disabled.out").toFile())
                .start();
    }

    private Path writeLogbackConfiguration(Path logFile) throws Exception {
        String escapedPath = logFile.toAbsolutePath().toString().replace("&", "&amp;");
        return Files.writeString(tempDir.resolve("logback-" + logFile.getFileName() + ".xml"), """
                <configuration>
                  <appender name="FILE" class="ch.qos.logback.core.FileAppender">
                    <file>%s</file>
                    <append>true</append>
                    <encoder>
                      <pattern>{"message":"%%msg","severity":"%%level","trace_id":"%%X{trace_id}","span_id":"%%X{span_id}","trace_flags":"%%X{trace_flags}"}%%n</pattern>
                    </encoder>
                  </appender>
                  <root level="INFO"><appender-ref ref="FILE"/></root>
                </configuration>
                """.formatted(escapedPath));
    }

    private static void awaitApplication(Process process, int port) throws Exception {
        OtelRuntimeTestSupport.await(() -> {
            if (!process.isAlive()) {
                return false;
            }
            try {
                return get(port, "/inventory").statusCode() == 200;
            } catch (Exception ignored) {
                return false;
            }
        }, Duration.ofSeconds(20));
    }

    private static HttpResponse<String> get(int port, String path) throws Exception {
        return HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private static boolean hasJvmMetric(OtelRuntimeTestSupport.OtlpCapture capture) {
        return metrics(capture).stream().map(Metric::getName)
                .anyMatch(name -> name.startsWith("jvm.") || name.startsWith("process.runtime.jvm."));
    }

    private static boolean hasApplicationSignals(OtelRuntimeTestSupport.OtlpCapture capture) {
        return spans(capture).stream().anyMatch(span -> span.getName().contains("checkout"))
                && logs(capture).stream().anyMatch(log -> log.getBody().getStringValue().contains("checkout"));
    }

    private static List<Metric> metrics(OtelRuntimeTestSupport.OtlpCapture capture) {
        return capture.bodies("metrics").stream().flatMap(body -> {
            try {
                return ExportMetricsServiceRequest.parseFrom(body).getResourceMetricsList().stream();
            } catch (Exception ignored) {
                return Stream.empty();
            }
        }).flatMap(resource -> resource.getScopeMetricsList().stream())
                .flatMap(scope -> scope.getMetricsList().stream()).toList();
    }

    private static List<Resource> metricResources(OtelRuntimeTestSupport.OtlpCapture capture) {
        return capture.bodies("metrics").stream().flatMap(body -> {
            try {
                return ExportMetricsServiceRequest.parseFrom(body).getResourceMetricsList().stream();
            } catch (Exception ignored) {
                return Stream.empty();
            }
        }).filter(resource -> resource.getScopeMetricsList().stream()
                .flatMap(scope -> scope.getMetricsList().stream())
                .map(Metric::getName)
                .anyMatch(name -> name.startsWith("jvm.") || name.startsWith("process.runtime.jvm.")))
                .map(io.opentelemetry.proto.metrics.v1.ResourceMetrics::getResource)
                .toList();
    }

    private static List<LogRecord> logs(OtelRuntimeTestSupport.OtlpCapture capture) {
        return capture.bodies("logs").stream().flatMap(body -> {
            try {
                return ExportLogsServiceRequest.parseFrom(body).getResourceLogsList().stream();
            } catch (Exception ignored) {
                return Stream.empty();
            }
        }).flatMap(resource -> resource.getScopeLogsList().stream())
                .flatMap(scope -> scope.getLogRecordsList().stream()).toList();
    }

    private static List<Resource> logResources(OtelRuntimeTestSupport.OtlpCapture capture) {
        return capture.bodies("logs").stream().flatMap(body -> {
            try {
                return ExportLogsServiceRequest.parseFrom(body).getResourceLogsList().stream();
            } catch (Exception ignored) {
                return Stream.empty();
            }
        }).filter(resource -> resource.getScopeLogsList().stream()
                .flatMap(scope -> scope.getLogRecordsList().stream())
                .anyMatch(log -> log.getBody().getStringValue().contains("checkout-completed")))
                .map(io.opentelemetry.proto.logs.v1.ResourceLogs::getResource)
                .toList();
    }

    private static List<Span> spans(OtelRuntimeTestSupport.OtlpCapture capture) {
        return capture.bodies("traces").stream().flatMap(body -> {
            try {
                return ExportTraceServiceRequest.parseFrom(body).getResourceSpansList().stream();
            } catch (Exception ignored) {
                return Stream.empty();
            }
        }).flatMap(resource -> resource.getScopeSpansList().stream())
                .flatMap(scope -> scope.getSpansList().stream()).toList();
    }

    private static List<Resource> traceResources(OtelRuntimeTestSupport.OtlpCapture capture) {
        return capture.bodies("traces").stream().flatMap(body -> {
            try {
                return ExportTraceServiceRequest.parseFrom(body).getResourceSpansList().stream();
            } catch (Exception ignored) {
                return Stream.empty();
            }
        }).filter(resource -> resource.getScopeSpansList().stream()
                .flatMap(scope -> scope.getSpansList().stream())
                .anyMatch(span -> span.getName().contains("checkout")))
                .map(io.opentelemetry.proto.trace.v1.ResourceSpans::getResource)
                .toList();
    }

    private static boolean hasDetectionContext(Resource resource) {
        Map<String, String> attributes = resource.getAttributesList().stream()
                .collect(java.util.stream.Collectors.toMap(
                        attribute -> attribute.getKey(),
                        attribute -> attribute.getValue().getStringValue(),
                        (first, second) -> second));
        return SERVICE_NAME.equals(attributes.get("service.name"))
                && SERVICE_NAMESPACE.equals(attributes.get("service.namespace"))
                && ENVIRONMENT.equals(attributes.get("deployment.environment.name"))
                && COLLECTOR_ID.equals(attributes.get("hertzbeat.collector.id"));
    }

    private static String spanNames(List<Span> spans) {
        return spans.stream().map(Span::getName).toList().toString();
    }

    private static String hex(ByteString value) {
        return HexFormat.of().formatHex(value.toByteArray());
    }

    private static String requiredRuntimeBinary() {
        String binary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(binary != null && !binary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real Java Agent proof");
        return binary;
    }

    private static Path downloadVerifiedAgent(ExternalLanguageProcessHarness harness) throws Exception {
        Path mavenCacheAgent = Path.of(
                System.getProperty("user.home"),
                ".m2",
                "repository",
                "io",
                "opentelemetry",
                "javaagent",
                "opentelemetry-javaagent",
                JAVA_AGENT_VERSION,
                "opentelemetry-javaagent-" + JAVA_AGENT_VERSION + ".jar");
        // Reuse the official Maven artifact when available. The digest check preserves the
        // interoperability boundary without repeatedly depending on an external download.
        if (Files.isRegularFile(mavenCacheAgent)
                && JAVA_AGENT_SHA256.equals(sha256(mavenCacheAgent))) {
            return mavenCacheAgent;
        }
        Path cache = Files.createDirectories(harness.resolve("java-agent-cache"));
        Path agentJar = cache.resolve("opentelemetry-javaagent-" + JAVA_AGENT_VERSION + ".jar");
        HttpRequest request = HttpRequest.newBuilder(JAVA_AGENT_URI)
                .timeout(Duration.ofMinutes(2))
                .GET()
                .build();
        HttpResponse<Path> response = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build()
                .send(request, HttpResponse.BodyHandlers.ofFile(agentJar));
        assertEquals(200, response.statusCode(), "official Java Agent download status");
        assertEquals(JAVA_AGENT_SHA256, sha256(agentJar), "official Java Agent " + JAVA_AGENT_VERSION + " digest");
        return agentJar;
    }

    private static String sha256(Path file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (var input = Files.newInputStream(file)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) >= 0) {
                digest.update(buffer, 0, read);
            }
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    private static Path javaExecutable() {
        String executable = System.getProperty("os.name").toLowerCase().contains("win") ? "java.exe" : "java";
        return Path.of(System.getProperty("java.home"), "bin", executable);
    }

    private static String applicationClasspath() throws Exception {
        return Stream.of(
                        OtelJavaAgentDemoApplication.class,
                        Driver.class,
                        LoggerFactory.class,
                        LoggerContext.class,
                        ch.qos.logback.core.Context.class)
                .map(type -> {
                    try {
                        return Path.of(type.getProtectionDomain().getCodeSource().getLocation().toURI()).toString();
                    } catch (Exception exception) {
                        throw new IllegalStateException(exception);
                    }
                })
                .distinct()
                .collect(java.util.stream.Collectors.joining(System.getProperty("path.separator")));
    }

    private static int availablePort() throws Exception {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        }
    }

    private static void stopApplication(Process application) throws Exception {
        if (application == null || !application.isAlive()) {
            return;
        }
        application.destroy();
        if (!application.waitFor(5, TimeUnit.SECONDS)) {
            application.destroyForcibly().waitFor(5, TimeUnit.SECONDS);
        }
    }
}
