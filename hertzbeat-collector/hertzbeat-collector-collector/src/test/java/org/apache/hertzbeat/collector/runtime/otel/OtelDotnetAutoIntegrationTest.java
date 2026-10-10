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
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

class OtelDotnetAutoIntegrationTest {

    private static final String RUNTIME_BINARY_ENV = "HERTZBEAT_OTEL_RUNTIME_BINARY";
    private static final String DOTNET_BINARY_ENV = "HERTZBEAT_DOTNET_BINARY";
    private static final String DOTNET_AUTO_ARCHIVE_ENV = "HERTZBEAT_DOTNET_AUTO_ARCHIVE";
    private static final String DOTNET_AUTO_VERSION = "1.15.0";
    private static final String DOTNET_AUTO_ARCHIVE_SHA256 =
            "5223c77dc29bc2bed3da96d8bc0c4c0c551d4af8a6e8b130fe5356d50d5c043f";
    private static final String SERVICE_NAME = "checkout-dotnet-auto";
    private static final String SERVICE_NAMESPACE = "storefront";
    private static final String ENVIRONMENT = "integration";
    private static final String COLLECTOR_ID = "collector-dotnet-auto";

    @Test
    void collectsOfficialDotnetAutomaticMetricsLogsAndTraces() throws Exception {
        Path runtimeBinary = requiredExecutable(RUNTIME_BINARY_ENV);
        Path dotnetBinary = requiredExecutable(DOTNET_BINARY_ENV);
        Path agentArchive = requiredFile(DOTNET_AUTO_ARCHIVE_ENV);

        try (ExternalLanguageProcessHarness harness = ExternalLanguageProcessHarness.create("hertzbeat-dotnet-auto-");
             OtelRuntimeTestSupport.OtlpCapture capture = new OtelRuntimeTestSupport.OtlpCapture()) {
            Map<String, String> dotnetEnvironment = harness.createDotnetEnvironment(dotnetBinary);
            assumeSupportedDotnet(harness, dotnetBinary, dotnetEnvironment);
            Path agentHome = extractVerifiedAgent(harness, agentArchive, dotnetEnvironment);
            Path application = publishApplication(harness, dotnetBinary, dotnetEnvironment);

            capture.start();
            OtelRuntimeProperties properties = OtelRuntimeTestSupport.properties(
                    harness.resolve("runtime"), runtimeBinary.toString(), capture.port(), COLLECTOR_ID);
            properties.setHostMetricsEnabled(false);
            properties.setHostMetricsScrapers(java.util.Set.of());
            OtelRuntimeSupervisor supervisor = OtelRuntimeTestSupport.supervisor(properties);
            try {
                supervisor.start();
                assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());

                int instrumentedPort = availablePort();
                Map<String, String> instrumentedEnvironment = instrumentedEnvironment(
                        harness, dotnetEnvironment, agentHome, properties, instrumentedPort);
                Process instrumented = harness.start(
                        List.of(dotnetBinary.toString(), application.toString()),
                        instrumentedEnvironment,
                        "dotnet-instrumented");
                awaitHttp(harness, instrumented, "dotnet-instrumented", instrumentedPort);
                assertEquals(200, get(instrumentedPort, "/checkout").statusCode());

                Map<String, String> expectedResource = Map.of(
                        "service.name", SERVICE_NAME,
                        "service.namespace", SERVICE_NAMESPACE,
                        "deployment.environment.name", ENVIRONMENT,
                        "hertzbeat.collector.id", COLLECTOR_ID);
                OtelRuntimeTestSupport.await(
                        () -> OtelInteropCaptureAssertions.hasMetric(
                                        capture, expectedResource, "http.server.request.duration")
                                && OtelInteropCaptureAssertions.hasSpan(
                                        capture,
                                        expectedResource,
                                        span -> span.getKind() == Span.SpanKind.SPAN_KIND_SERVER
                                                && span.getName().contains("/checkout"))
                                && OtelInteropCaptureAssertions.hasLog(
                                        capture, expectedResource, "checkout-dotnet-auto-log"),
                        Duration.ofSeconds(45));
                assertTrue(OtelInteropCaptureAssertions.hasMetric(
                        capture, expectedResource, "http.server.request.duration"));
                assertTrue(OtelInteropCaptureAssertions.hasSpan(
                        capture,
                        expectedResource,
                        span -> span.getKind() == Span.SpanKind.SPAN_KIND_SERVER
                                && span.getName().contains("/checkout")));
                assertTrue(OtelInteropCaptureAssertions.hasLog(
                        capture, expectedResource, "checkout-dotnet-auto-log"));

                harness.stop(instrumented, Duration.ofSeconds(5));
                int plainPort = availablePort();
                Map<String, String> plainEnvironment = new HashMap<>(dotnetEnvironment);
                plainEnvironment.put("ASPNETCORE_URLS", "http://127.0.0.1:" + plainPort);
                Process plain = harness.start(
                        List.of(dotnetBinary.toString(), application.toString()),
                        plainEnvironment,
                        "dotnet-uninstrumented");
                awaitHttp(harness, plain, "dotnet-uninstrumented", plainPort);
                assertEquals(200, get(plainPort, "/checkout").statusCode());
                assertTrue(plain.isAlive(), "the ASP.NET Core application must remain healthy without instrumentation");
            } finally {
                supervisor.close();
            }
        }
    }

    private Path extractVerifiedAgent(
            ExternalLanguageProcessHarness harness,
            Path archive,
            Map<String, String> environment) throws Exception {
        assertEquals(DOTNET_AUTO_ARCHIVE_SHA256, sha256(archive), "official 1.15.0 macOS archive digest");
        Path agentHome = Files.createDirectories(harness.resolve("dotnet-auto"));
        harness.run(
                List.of("/usr/bin/ditto", "-x", "-k", archive.toString(), agentHome.toString()),
                environment,
                Duration.ofSeconds(30),
                "dotnet-auto-extract");
        assertEquals(DOTNET_AUTO_VERSION, Files.readAllLines(agentHome.resolve("VERSION")).getFirst());
        assertTrue(Files.isRegularFile(agentHome.resolve(
                "osx-arm64/OpenTelemetry.AutoInstrumentation.Native.dylib")));
        assertTrue(Files.isRegularFile(agentHome.resolve(
                "net/OpenTelemetry.AutoInstrumentation.StartupHook.dll")));
        return agentHome;
    }

    private Path publishApplication(
            ExternalLanguageProcessHarness harness,
            Path dotnetBinary,
            Map<String, String> environment) throws Exception {
        Path source = Files.createDirectories(harness.resolve("dotnet-source"));
        Files.writeString(source.resolve("Checkout.csproj"), """
                <Project Sdk="Microsoft.NET.Sdk.Web">
                  <PropertyGroup>
                    <TargetFramework>net8.0</TargetFramework>
                    <Nullable>enable</Nullable>
                    <ImplicitUsings>enable</ImplicitUsings>
                  </PropertyGroup>
                </Project>
                """);
        Files.writeString(source.resolve("Program.cs"), """
                var builder = WebApplication.CreateBuilder(args);
                var app = builder.Build();
                app.MapGet("/health", () => "healthy");
                app.MapGet("/checkout", (ILogger<Program> logger) =>
                {
                    logger.LogInformation("checkout-dotnet-auto-log");
                    return "checkout-ok";
                });
                app.Run();

                public partial class Program;
                """);
        Path output = harness.resolve("dotnet-application");
        harness.run(
                List.of(dotnetBinary.toString(), "publish", source.resolve("Checkout.csproj").toString(),
                        "--configuration", "Release", "--output", output.toString(), "--no-self-contained"),
                environment,
                Duration.ofMinutes(3),
                "dotnet-publish");
        Path application = output.resolve("Checkout.dll");
        assertTrue(Files.isRegularFile(application));
        return application;
    }

    private Map<String, String> instrumentedEnvironment(
            ExternalLanguageProcessHarness harness,
            Map<String, String> dotnetEnvironment,
            Path agentHome,
            OtelRuntimeProperties properties,
            int port) throws Exception {
        Path agentLogDirectory = Files.createDirectories(harness.resolve("dotnet-auto-logs"));
        Map<String, String> environment = new HashMap<>(dotnetEnvironment);
        environment.put("ASPNETCORE_URLS", "http://127.0.0.1:" + port);
        environment.put("OTEL_DOTNET_AUTO_HOME", agentHome.toString());
        environment.put("DOTNET_STARTUP_HOOKS",
                agentHome.resolve("net/OpenTelemetry.AutoInstrumentation.StartupHook.dll").toString());
        environment.put("CORECLR_ENABLE_PROFILING", "1");
        environment.put("CORECLR_PROFILER", "{918728DD-259F-4A6A-AC2B-B85E1B658318}");
        environment.put("CORECLR_PROFILER_PATH",
                agentHome.resolve("osx-arm64/OpenTelemetry.AutoInstrumentation.Native.dylib").toString());
        environment.put("OTEL_DOTNET_AUTO_FAIL_FAST_ENABLED", "true");
        environment.put("OTEL_DOTNET_AUTO_LOG_DIRECTORY", agentLogDirectory.toString());
        environment.put("OTEL_DOTNET_AUTO_LOGGER", "file");
        environment.put("OTEL_LOG_LEVEL", "info");
        environment.put("OTEL_SERVICE_NAME", SERVICE_NAME);
        environment.put("OTEL_RESOURCE_ATTRIBUTES", "service.namespace=" + SERVICE_NAMESPACE
                + ",deployment.environment.name=" + ENVIRONMENT);
        environment.put("OTEL_EXPORTER_OTLP_ENDPOINT", "http://" + properties.getOtlpHttpEndpoint());
        environment.put("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf");
        environment.put("OTEL_EXPORTER_OTLP_HEADERS", "Authorization=Bearer%20" + UUID.randomUUID());
        environment.put("OTEL_TRACES_EXPORTER", "otlp");
        environment.put("OTEL_METRICS_EXPORTER", "otlp");
        environment.put("OTEL_LOGS_EXPORTER", "otlp");
        environment.put("OTEL_METRIC_EXPORT_INTERVAL", "1000");
        environment.put("OTEL_BSP_SCHEDULE_DELAY", "100");
        environment.put("OTEL_BLRP_SCHEDULE_DELAY", "100");
        environment.put("OTEL_DOTNET_AUTO_LOGS_INCLUDE_FORMATTED_MESSAGE", "true");
        return environment;
    }

    private void assumeSupportedDotnet(
            ExternalLanguageProcessHarness harness,
            Path dotnetBinary,
            Map<String, String> environment) throws Exception {
        String version;
        String runtimes;
        try {
            version = harness.capture(
                    List.of(dotnetBinary.toString(), "--version"), environment, Duration.ofSeconds(10));
            runtimes = harness.capture(
                    List.of(dotnetBinary.toString(), "--list-runtimes"), environment, Duration.ofSeconds(10));
        } catch (IllegalStateException exception) {
            Assumptions.assumeTrue(false,
                    () -> DOTNET_BINARY_ENV + " must provide a working official .NET SDK: "
                            + exception.getMessage());
            return;
        }
        Assumptions.assumeTrue(version.matches("8\\.0\\.[0-9]+"),
                () -> DOTNET_BINARY_ENV + " must identify a .NET 8 SDK, found " + version);
        Assumptions.assumeTrue(runtimes.lines().anyMatch(line -> line.startsWith("Microsoft.AspNetCore.App 8.")),
                () -> DOTNET_BINARY_ENV + " must include the ASP.NET Core 8 runtime; found " + runtimes);
    }

    private void awaitHttp(
            ExternalLanguageProcessHarness harness,
            Process process,
            String label,
            int port) throws Exception {
        long deadline = System.nanoTime() + Duration.ofSeconds(20).toNanos();
        while (System.nanoTime() < deadline) {
            if (!process.isAlive()) {
                throw new IllegalStateException(harness.processDiagnostic(process, label));
            }
            try {
                if (get(port, "/health").statusCode() == 200) {
                    return;
                }
            } catch (Exception ignored) {
                // Retry while the process remains alive and the bounded readiness deadline has not elapsed.
            }
            Thread.sleep(50);
        }
        throw new IllegalStateException("ASP.NET Core application did not become ready; "
                + harness.processDiagnostic(process, label));
    }

    private static HttpResponse<String> get(int port, String path) throws Exception {
        return HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private Path requiredExecutable(String environmentVariable) {
        Path path = requiredFile(environmentVariable);
        Assumptions.assumeTrue(Files.isExecutable(path),
                () -> environmentVariable + " must identify an executable file: " + path);
        return path;
    }

    private Path requiredFile(String environmentVariable) {
        String value = System.getenv(environmentVariable);
        Assumptions.assumeTrue(value != null && !value.isBlank(),
                () -> environmentVariable + " is required for the real .NET interoperability proof");
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

    private int availablePort() throws Exception {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        }
    }
}
