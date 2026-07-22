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
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.opentelemetry.proto.trace.v1.Span;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

class OtelPhpZeroCodeIntegrationTest {

    private static final String RUNTIME_BINARY_ENV = "HERTZBEAT_OTEL_RUNTIME_BINARY";
    private static final String DOCKER_BINARY_ENV = "HERTZBEAT_DOCKER_BINARY";
    private static final String BRIDGE_PYTHON_BINARY_ENV = "HERTZBEAT_PHP_BRIDGE_PYTHON_BINARY";
    private static final String PHP_EXTENSION_ARCHIVE_ENV = "HERTZBEAT_PHP_EXTENSION_ARCHIVE";
    private static final Path PREFERRED_DOCKER_BINARY = Path.of("/usr/local/bin/docker");
    private static final Path PREFERRED_BRIDGE_PYTHON_BINARY = Path.of("/usr/bin/python3");
    private static final String PHP_IMAGE = "mirror.gcr.io/library/php@sha256:"
            + "318d3be4e782dfe68a47fe80f41c6a4a2f9f2a20bfe137e45b44bc778847e7ad";
    private static final String COMPOSER_IMAGE = "mirror.gcr.io/library/composer@sha256:"
            + "5248900ab8b5f7f880c2d62180e40960cd87f60149ec9a1abfd62ac72a02577c";
    private static final String EXTENSION_SHA256 =
            "de8315ed3299536f327360a37f03618ab8684c02fbf8dfd8f489c025d88a6498";
    private static final String SERVICE_NAME = "checkout-php-zero-code";
    private static final String SERVICE_NAMESPACE = "storefront";
    private static final String ENVIRONMENT = "integration";
    private static final String COLLECTOR_ID = "collector-php-zero-code";

    @Test
    void collectsOfficialPsr18ClientTraceWithoutUnsupportedSignals() throws Exception {
        Path runtimeBinary = requiredExecutable(RUNTIME_BINARY_ENV, null);
        Path dockerBinary = requiredExecutable(DOCKER_BINARY_ENV, PREFERRED_DOCKER_BINARY);
        Path bridgePython = requiredExecutable(BRIDGE_PYTHON_BINARY_ENV, PREFERRED_BRIDGE_PYTHON_BINARY);
        Path extensionArchive = requiredFile(PHP_EXTENSION_ARCHIVE_ENV);
        String suffix = UUID.randomUUID().toString();
        String phpContainer = "hertzbeat-php-zero-code-" + suffix;
        String composerContainer = "hertzbeat-php-composer-" + suffix;

        try (ExternalLanguageProcessHarness harness = ExternalLanguageProcessHarness.create("hertzbeat-php-zero-code-");
             OtelRuntimeTestSupport.OtlpCapture capture = new OtelRuntimeTestSupport.OtlpCapture()) {
            Map<String, String> dockerEnvironment = harness.createDockerEnvironment(dockerBinary);
            assumeDockerReady(harness, dockerBinary, dockerEnvironment);
            Path workspace = prepareWorkspace(harness, extensionArchive);
            try {
                copyComposer(harness, dockerBinary, dockerEnvironment, workspace, composerContainer);
                startPhpContainer(harness, dockerBinary, dockerEnvironment, workspace, phpContainer);
                installOfficialDependencies(harness, dockerBinary, dockerEnvironment, phpContainer);
                assertOfficialVersions(harness, dockerBinary, dockerEnvironment, phpContainer);
                capture.start();
                OtelRuntimeProperties properties = OtelRuntimeTestSupport.properties(
                        harness.resolve("runtime"), runtimeBinary.toString(), capture.port(), COLLECTOR_ID);
                properties.setHostMetricsEnabled(false);
                properties.setHostMetricsScrapers(java.util.Set.of());
                OtelRuntimeSupervisor supervisor = OtelRuntimeTestSupport.supervisor(properties);
                String relayToken = UUID.randomUUID().toString();
                URI runtimeEndpoint = URI.create("http://" + properties.getOtlpHttpEndpoint());
                try (PythonHostBridge bridge = PythonHostBridge.start(
                        harness, bridgePython, runtimeEndpoint, relayToken)) {
                    String plainOutput = runPhpRequest(
                            harness,
                            dockerBinary,
                            dockerEnvironment,
                            phpContainer,
                            bridge.containerTargetUrl(),
                            null,
                            null,
                            false);
                    assertTrue(plainOutput.contains("checkout-ok"),
                            "the PHP request must remain healthy without automatic instrumentation");

                    supervisor.start();
                    assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
                    String output = runPhpRequest(
                            harness,
                            dockerBinary,
                            dockerEnvironment,
                            phpContainer,
                            bridge.containerTargetUrl(),
                            bridge.containerOtlpEndpoint(),
                            relayToken,
                            true);
                    assertTrue(output.contains("checkout-ok"), output);

                    Map<String, String> expectedResource = Map.of(
                            "service.name", SERVICE_NAME,
                            "service.namespace", SERVICE_NAMESPACE,
                            "deployment.environment.name", ENVIRONMENT,
                            "hertzbeat.collector.id", COLLECTOR_ID);
                    OtelRuntimeTestSupport.await(
                            () -> OtelInteropCaptureAssertions.hasSpan(
                                    capture,
                                    expectedResource,
                                    span -> span.getKind() == Span.SpanKind.SPAN_KIND_CLIENT
                                            && span.getName().toUpperCase(java.util.Locale.ROOT).contains("GET")),
                            Duration.ofSeconds(45));
                    assertTrue(OtelInteropCaptureAssertions.hasSpan(
                            capture,
                            expectedResource,
                            span -> span.getKind() == Span.SpanKind.SPAN_KIND_CLIENT
                                    && span.getName().toUpperCase(java.util.Locale.ROOT).contains("GET")),
                            "official PSR-18 client instrumentation did not export a client trace");
                    assertTrue(capture.bodies("metrics").isEmpty(),
                            "unsupported PHP metrics must not be fabricated");
                    assertTrue(capture.bodies("logs").isEmpty(),
                            "unsupported PHP logs must not be fabricated");
                } finally {
                    supervisor.close();
                }
            } finally {
                removeContainer(harness, dockerBinary, dockerEnvironment, composerContainer, "composer-cleanup");
                removeContainer(harness, dockerBinary, dockerEnvironment, phpContainer, "php-cleanup");
            }
        }
    }

    private Path prepareWorkspace(ExternalLanguageProcessHarness harness, Path extensionArchive) throws Exception {
        assertEquals(EXTENSION_SHA256, sha256(extensionArchive), "official PECL extension archive digest");
        Path workspace = Files.createDirectories(harness.resolve("php-workspace"));
        Files.copy(
                extensionArchive,
                workspace.resolve("opentelemetry-1.2.1.tgz"),
                StandardCopyOption.REPLACE_EXISTING);
        Files.writeString(workspace.resolve("composer.json"), """
                {
                  "require": {
                    "php": "^8.3",
                    "open-telemetry/sdk": "1.14.0",
                    "open-telemetry/exporter-otlp": "1.4.0",
                    "open-telemetry/opentelemetry-auto-psr18": "1.2.0",
                    "guzzlehttp/guzzle": "7.10.0"
                  },
                  "config": {
                    "allow-plugins": {
                      "php-http/discovery": true
                    }
                  }
                }
                """);
        Files.writeString(workspace.resolve("application.php"), """
                <?php
                require __DIR__ . '/vendor/autoload.php';

                $client = new GuzzleHttp\\Client(['connect_timeout' => 5, 'timeout' => 10]);
                $request = new GuzzleHttp\\Psr7\\Request('GET', $argv[1]);
                $response = $client->sendRequest($request);
                if ($response->getStatusCode() !== 200) {
                    throw new RuntimeException('checkout request failed');
                }
                echo 'checkout-ok';
                """);
        return workspace;
    }

    private void copyComposer(
            ExternalLanguageProcessHarness harness,
            Path dockerBinary,
            Map<String, String> environment,
            Path workspace,
            String containerName) throws Exception {
        harness.run(
                dockerCommand(
                        dockerBinary,
                        "run", "--rm", "--name", containerName,
                        "--volume", workspace + ":/workspace",
                        COMPOSER_IMAGE,
                        "sh", "-c", "cp /usr/bin/composer /workspace/composer"),
                environment,
                Duration.ofMinutes(1),
                "composer-copy");
    }

    private void startPhpContainer(
            ExternalLanguageProcessHarness harness,
            Path dockerBinary,
            Map<String, String> environment,
            Path workspace,
            String containerName) throws Exception {
        String containerId = harness.capture(
                dockerCommand(
                        dockerBinary,
                        "run", "--detach", "--name", containerName,
                        "--volume", workspace + ":/workspace",
                        PHP_IMAGE,
                        "sleep", "infinity"),
                environment,
                Duration.ofSeconds(30));
        assertTrue(containerId.matches("[a-f0-9]{64}"), "temporary PHP container did not start");
    }

    private void installOfficialDependencies(
            ExternalLanguageProcessHarness harness,
            Path dockerBinary,
            Map<String, String> environment,
            String containerName) throws Exception {
        String setup = "set -eu; "
                + "apt-get update; apt-get install -y --no-install-recommends unzip; "
                + "rm -rf /var/lib/apt/lists/*; "
                + "pecl install /workspace/opentelemetry-1.2.1.tgz; "
                + "docker-php-ext-enable opentelemetry; "
                + "mkdir -p /workspace/composer-home /workspace/composer-cache; "
                + "COMPOSER_HOME=/workspace/composer-home COMPOSER_CACHE_DIR=/workspace/composer-cache "
                + "php /workspace/composer install --working-dir=/workspace --no-dev --no-interaction "
                + "--no-progress --no-ansi --prefer-dist";
        harness.run(
                dockerCommand(dockerBinary, "exec", containerName, "sh", "-c", setup),
                environment,
                Duration.ofMinutes(5),
                "php-dependency-install");
    }

    private void assertOfficialVersions(
            ExternalLanguageProcessHarness harness,
            Path dockerBinary,
            Map<String, String> environment,
            String containerName) throws Exception {
        String extension = harness.capture(
                dockerCommand(dockerBinary, "exec", containerName, "php", "--ri", "opentelemetry"),
                environment,
                Duration.ofSeconds(10));
        assertTrue(extension.contains("version => 1.2.1"), extension);
        assertComposerVersion(harness, dockerBinary, environment, containerName, "open-telemetry/sdk", "1.14.0");
        assertComposerVersion(
                harness, dockerBinary, environment, containerName, "open-telemetry/exporter-otlp", "1.4.0");
        assertComposerVersion(
                harness,
                dockerBinary,
                environment,
                containerName,
                "open-telemetry/opentelemetry-auto-psr18",
                "1.2.0");
    }

    private void assertComposerVersion(
            ExternalLanguageProcessHarness harness,
            Path dockerBinary,
            Map<String, String> environment,
            String containerName,
            String packageName,
            String expectedVersion) throws Exception {
        String output = harness.capture(
                dockerCommand(
                        dockerBinary,
                        "exec", containerName,
                        "php", "/workspace/composer", "show", "--working-dir=/workspace", packageName),
                environment,
                Duration.ofSeconds(15));
        assertTrue(output.lines().anyMatch(line -> line.startsWith("versions") && line.contains(expectedVersion)),
                packageName + " version mismatch: " + output);
    }

    private String runPhpRequest(
            ExternalLanguageProcessHarness harness,
            Path dockerBinary,
            Map<String, String> environment,
            String containerName,
            String targetUrl,
            String otlpEndpoint,
            String relayToken,
            boolean instrumented) throws Exception {
        List<String> command = new ArrayList<>(dockerCommand(dockerBinary, "exec"));
        if (instrumented) {
            addEnvironment(command, "OTEL_PHP_AUTOLOAD_ENABLED", "true");
            addEnvironment(command, "OTEL_SERVICE_NAME", SERVICE_NAME);
            addEnvironment(command, "OTEL_RESOURCE_ATTRIBUTES", "service.namespace=" + SERVICE_NAMESPACE
                    + ",deployment.environment.name=" + ENVIRONMENT);
            addEnvironment(command, "OTEL_TRACES_EXPORTER", "otlp");
            addEnvironment(command, "OTEL_METRICS_EXPORTER", "none");
            addEnvironment(command, "OTEL_LOGS_EXPORTER", "none");
            addEnvironment(command, "OTEL_EXPORTER_OTLP_ENDPOINT", otlpEndpoint);
            addEnvironment(command, "OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf");
            addEnvironment(command, "OTEL_EXPORTER_OTLP_HEADERS", "Authorization=Bearer%20" + relayToken);
            addEnvironment(command, "OTEL_PROPAGATORS", "baggage,tracecontext");
        } else {
            addEnvironment(command, "OTEL_PHP_AUTOLOAD_ENABLED", "false");
        }
        command.add(containerName);
        command.add("php");
        command.add("/workspace/application.php");
        command.add(targetUrl);
        String label = instrumented ? "php-instrumented" : "php-uninstrumented";
        Process process = harness.start(command, environment, label);
        if (!process.waitFor(Duration.ofSeconds(45).toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS)) {
            String diagnostic = harness.processDiagnostic(process, label);
            harness.stop(process, Duration.ofSeconds(5));
            throw new IllegalStateException("PHP request exceeded its bounded timeout; " + diagnostic);
        }
        String diagnostic = harness.processDiagnostic(process, label);
        if (process.exitValue() != 0) {
            throw new IllegalStateException(diagnostic);
        }
        return diagnostic;
    }

    private void addEnvironment(List<String> command, String key, String value) {
        command.add("--env");
        command.add(key + "=" + value);
    }

    private void assumeDockerReady(
            ExternalLanguageProcessHarness harness,
            Path dockerBinary,
            Map<String, String> environment) throws Exception {
        try {
            String version = harness.capture(
                    dockerCommand(dockerBinary, "version", "--format", "{{.Server.Version}}"),
                    environment,
                    Duration.ofSeconds(10));
            Assumptions.assumeTrue(!version.isBlank(), "Docker Server must be reachable");
            String daemonPlatform = normalizeDockerPlatform(harness.capture(
                    dockerCommand(dockerBinary, "info", "--format", "{{.OSType}}/{{.Architecture}}"),
                    environment,
                    Duration.ofSeconds(10)));
            assertTrue(daemonPlatform.equals("linux/amd64") || daemonPlatform.equals("linux/arm64"),
                    "real PHP proof requires a Linux amd64 or arm64 Docker daemon: " + daemonPlatform);
            assertImage(harness, dockerBinary, environment, PHP_IMAGE, daemonPlatform);
            assertImage(harness, dockerBinary, environment, COMPOSER_IMAGE, daemonPlatform);
        } catch (IllegalStateException exception) {
            Assumptions.assumeTrue(false,
                    () -> DOCKER_BINARY_ENV + " must provide Docker with both pinned official images: "
                            + exception.getMessage());
        }
    }

    private void assertImage(
            ExternalLanguageProcessHarness harness,
            Path dockerBinary,
            Map<String, String> environment,
            String image,
            String daemonPlatform) throws Exception {
        String imagePlatform = normalizeDockerPlatform(harness.capture(
                dockerCommand(dockerBinary, "image", "inspect", "--format", "{{.Os}}/{{.Architecture}}", image),
                environment,
                Duration.ofSeconds(10)));
        assertEquals(daemonPlatform, imagePlatform,
                "pinned official container image platform must match the Docker daemon: " + image);
    }

    private String normalizeDockerPlatform(String platform) {
        String normalized = platform.trim().toLowerCase(java.util.Locale.ROOT);
        if (normalized.endsWith("/aarch64")) {
            return normalized.substring(0, normalized.length() - "aarch64".length()) + "arm64";
        }
        if (normalized.endsWith("/x86_64")) {
            return normalized.substring(0, normalized.length() - "x86_64".length()) + "amd64";
        }
        return normalized;
    }

    private void removeContainer(
            ExternalLanguageProcessHarness harness,
            Path dockerBinary,
            Map<String, String> environment,
            String containerName,
            String label) {
        try {
            harness.run(
                    dockerCommand(dockerBinary, "container", "rm", "--force", containerName),
                    environment,
                    Duration.ofSeconds(15),
                    label);
        } catch (Exception ignored) {
            // The helper uses --rm and an absent container is already clean.
        }
    }

    private List<String> dockerCommand(Path dockerBinary, String... arguments) {
        List<String> command = new ArrayList<>();
        command.add(dockerBinary.toString());
        command.addAll(List.of(arguments));
        return command;
    }

    private Path requiredExecutable(String environmentVariable, Path fallback) {
        String value = System.getenv(environmentVariable);
        Path path = value == null || value.isBlank() ? fallback : Path.of(value);
        Assumptions.assumeTrue(path != null,
                () -> environmentVariable + " is required for the real PHP interoperability proof");
        path = path.toAbsolutePath().normalize();
        Path executable = path;
        Assumptions.assumeTrue(Files.isRegularFile(path) && Files.isExecutable(path),
                () -> environmentVariable + " must identify an executable file: " + executable);
        return path;
    }

    private Path requiredFile(String environmentVariable) {
        String value = System.getenv(environmentVariable);
        Assumptions.assumeTrue(value != null && !value.isBlank(),
                () -> environmentVariable + " is required for the official PHP extension proof");
        Path path = Path.of(value).toAbsolutePath().normalize();
        Assumptions.assumeTrue(Files.isRegularFile(path),
                () -> environmentVariable + " must identify a regular file: " + path);
        return path;
    }

    private String sha256(Path file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (var input = Files.newInputStream(file)) {
            byte[] buffer = new byte[16 * 1024];
            int read;
            while ((read = input.read(buffer)) >= 0) {
                digest.update(buffer, 0, read);
            }
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    private static final class PythonHostBridge implements AutoCloseable {

        private final ExternalLanguageProcessHarness harness;
        private final Process process;
        private final int port;

        private PythonHostBridge(ExternalLanguageProcessHarness harness, Process process, int port) {
            this.harness = harness;
            this.process = process;
            this.port = port;
        }

        static PythonHostBridge start(
                ExternalLanguageProcessHarness harness,
                Path pythonBinary,
                URI runtimeEndpoint,
                String token) throws Exception {
            Path script = harness.resolve("php-host-bridge.py");
            Files.writeString(script, """
                    import hmac
                    import http.server
                    import os
                    import sys
                    import urllib.error
                    import urllib.request

                    runtime_endpoint = os.environ["RUNTIME_ENDPOINT"]
                    expected = "Bearer " + os.environ["RELAY_TOKEN"]

                    class Handler(http.server.BaseHTTPRequestHandler):
                        def do_GET(self):
                            if self.path in ("/health", "/checkout"):
                                self.send_response(200)
                                self.end_headers()
                                self.wfile.write(b"checkout-target-ok")
                            else:
                                self.send_error(404)

                        def do_POST(self):
                            if not self.path.startswith("/v1/"):
                                self.send_error(404)
                                return
                            if not hmac.compare_digest(self.headers.get("Authorization", ""), expected):
                                self.send_error(401)
                                return
                            body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
                            headers = {"Content-Type": self.headers.get("Content-Type", "application/x-protobuf")}
                            if self.headers.get("Content-Encoding"):
                                headers["Content-Encoding"] = self.headers["Content-Encoding"]
                            request = urllib.request.Request(
                                runtime_endpoint + self.path, data=body, headers=headers, method="POST")
                            try:
                                with urllib.request.urlopen(request, timeout=10) as response:
                                    payload = response.read()
                                    self.send_response(response.status)
                                    self.end_headers()
                                    self.wfile.write(payload)
                            except urllib.error.HTTPError as error:
                                self.send_response(error.code)
                                self.end_headers()
                                self.wfile.write(error.read())
                            except Exception:
                                self.send_error(503)

                        def log_message(self, format, *args):
                            pass

                    http.server.ThreadingHTTPServer(("0.0.0.0", int(sys.argv[1])), Handler).serve_forever()
                    """);
            int port = availablePort();
            Process process = harness.start(
                    List.of(pythonBinary.toString(), script.toString(), Integer.toString(port)),
                    Map.of("RUNTIME_ENDPOINT", runtimeEndpoint.toString(), "RELAY_TOKEN", token),
                    "php-host-bridge");
            PythonHostBridge bridge = new PythonHostBridge(harness, process, port);
            bridge.awaitReady();
            return bridge;
        }

        String containerTargetUrl() {
            return "http://host.docker.internal:" + port + "/checkout";
        }

        String containerOtlpEndpoint() {
            return "http://host.docker.internal:" + port;
        }

        private void awaitReady() throws Exception {
            long deadline = System.nanoTime() + Duration.ofSeconds(10).toNanos();
            while (System.nanoTime() < deadline) {
                if (!process.isAlive()) {
                    throw new IllegalStateException(harness.processDiagnostic(process, "php-host-bridge"));
                }
                try {
                    HttpResponse<String> response = HttpClient.newHttpClient().send(
                            HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/health")).GET().build(),
                            HttpResponse.BodyHandlers.ofString());
                    if (response.statusCode() == 200) {
                        return;
                    }
                } catch (Exception ignored) {
                    // Retry while the process remains alive and the bounded deadline has not elapsed.
                }
                Thread.sleep(50);
            }
            throw new IllegalStateException("PHP host bridge did not become ready; "
                    + harness.processDiagnostic(process, "php-host-bridge"));
        }

        private static int availablePort() throws IOException {
            try (ServerSocket socket = new ServerSocket(0)) {
                return socket.getLocalPort();
            }
        }

        @Override
        public void close() throws InterruptedException {
            harness.stop(process, Duration.ofSeconds(2));
        }
    }
}
