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

import io.opentelemetry.proto.trace.v1.Span;
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

class OtelGoSdkIntegrationTest {

    private static final String RUNTIME_BINARY_ENV = "HERTZBEAT_OTEL_RUNTIME_BINARY";
    private static final String GO_BINARY_ENV = "HERTZBEAT_GO_BINARY";
    private static final Path PREFERRED_GO_BINARY = Path.of("/opt/homebrew/bin/go");
    private static final String SERVICE_NAME = "checkout-go-sdk";
    private static final String SERVICE_NAMESPACE = "storefront";
    private static final String ENVIRONMENT = "integration";
    private static final String COLLECTOR_ID = "collector-go-sdk";

    @Test
    void collectsOfficialGoSdkSupportedSignalsAndPreviewLog() throws Exception {
        Path runtimeBinary = requiredExecutable(RUNTIME_BINARY_ENV, null);
        Path goBinary = requiredExecutable(GO_BINARY_ENV, PREFERRED_GO_BINARY);

        try (ExternalLanguageProcessHarness harness = ExternalLanguageProcessHarness.create("hertzbeat-go-sdk-");
             OtelRuntimeTestSupport.OtlpCapture capture = new OtelRuntimeTestSupport.OtlpCapture()) {
            Map<String, String> goEnvironment = harness.createGoEnvironment(goBinary);
            assumeSupportedGo(harness, goBinary, goEnvironment);
            Path module = writeModule(harness);
            Path application = buildApplication(harness, goBinary, goEnvironment, module);

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
                Process instrumented = harness.start(
                        List.of(application.toString(), Integer.toString(instrumentedPort), "instrumented"),
                        instrumentedEnvironment(properties), "go-instrumented");
                awaitHttp(harness, instrumented, "go-instrumented", instrumentedPort);
                assertEquals(200, get(instrumentedPort, "/checkout").statusCode());

                Map<String, String> expectedResource = Map.of(
                        "service.name", SERVICE_NAME,
                        "service.namespace", SERVICE_NAMESPACE,
                        "deployment.environment.name", ENVIRONMENT,
                        "hertzbeat.collector.id", COLLECTOR_ID);
                OtelRuntimeTestSupport.await(
                        () -> OtelInteropCaptureAssertions.hasMetric(
                                        capture, expectedResource, "checkout.go.requests")
                                && OtelInteropCaptureAssertions.hasSpan(
                                        capture,
                                        expectedResource,
                                        span -> span.getKind() == Span.SpanKind.SPAN_KIND_SERVER
                                                && "GET /checkout".equals(span.getName()))
                                && OtelInteropCaptureAssertions.hasLog(
                                        capture, expectedResource, "checkout-preview-log"),
                        Duration.ofSeconds(45));
                assertTrue(OtelInteropCaptureAssertions.hasMetric(
                        capture, expectedResource, "checkout.go.requests"));
                assertTrue(OtelInteropCaptureAssertions.hasSpan(
                        capture,
                        expectedResource,
                        span -> span.getKind() == Span.SpanKind.SPAN_KIND_SERVER
                                && "GET /checkout".equals(span.getName())));
                assertTrue(OtelInteropCaptureAssertions.hasLog(
                        capture, expectedResource, "checkout-preview-log"),
                        "catalog-preview Go log export was not observed for the pinned SDK set");

                harness.stop(instrumented, Duration.ofSeconds(5));
                int plainPort = availablePort();
                Process plain = harness.start(
                        List.of(application.toString(), Integer.toString(plainPort), "plain"),
                        Map.of(), "go-uninstrumented");
                awaitHttp(harness, plain, "go-uninstrumented", plainPort);
                assertEquals(200, get(plainPort, "/checkout").statusCode());
                assertTrue(plain.isAlive(), "the Go application must remain healthy without SDK setup");
            } finally {
                supervisor.close();
            }
        }
    }

    private Path writeModule(ExternalLanguageProcessHarness harness) throws Exception {
        Path module = Files.createDirectories(harness.resolve("go-module"));
        Files.writeString(module.resolve("go.mod"), """
                module hertzbeat-go-sdk-smoke

                go 1.25.0

                require (
                    go.opentelemetry.io/contrib/exporters/autoexport v0.65.0
                    go.opentelemetry.io/otel v1.43.0
                    go.opentelemetry.io/otel/sdk v1.43.0
                    go.opentelemetry.io/otel/sdk/log v0.19.0
                    go.opentelemetry.io/otel/sdk/metric v1.43.0
                )
                """);
        Files.writeString(module.resolve("main.go"), applicationSource());
        return module;
    }

    private Path buildApplication(
            ExternalLanguageProcessHarness harness,
            Path goBinary,
            Map<String, String> goEnvironment,
            Path module) throws Exception {
        Map<String, String> environment = new HashMap<>(goEnvironment);
        environment.put("PWD", module.toString());
        harness.run(
                List.of(goBinary.toString(), "-C", module.toString(), "mod", "tidy"),
                environment, Duration.ofMinutes(3), "go-mod-tidy");
        assertCatalogVersions(harness, goBinary, environment, module);
        Path application = harness.resolve("go-application");
        harness.run(
                List.of(goBinary.toString(), "-C", module.toString(), "build", "-trimpath",
                        "-o", application.toString(), "."),
                environment, Duration.ofMinutes(3), "go-build");
        assertTrue(Files.isRegularFile(application) && Files.isExecutable(application));
        assertNoEbpfMaterial(harness, module);
        return application;
    }

    private void assertCatalogVersions(
            ExternalLanguageProcessHarness harness,
            Path goBinary,
            Map<String, String> environment,
            Path module) throws Exception {
        List<String> modules = List.of(
                "go.opentelemetry.io/otel",
                "go.opentelemetry.io/otel/sdk/metric",
                "go.opentelemetry.io/contrib/exporters/autoexport",
                "go.opentelemetry.io/otel/sdk/log");
        List<String> expected = List.of("v1.43.0", "v1.43.0", "v0.65.0", "v0.19.0");
        for (int index = 0; index < modules.size(); index++) {
            String version = harness.capture(
                    List.of(goBinary.toString(), "-C", module.toString(), "list", "-m", "-f", "{{.Version}}",
                            modules.get(index)),
                    environment, Duration.ofSeconds(15));
            assertEquals(expected.get(index), version, modules.get(index));
        }
    }

    private void assertNoEbpfMaterial(ExternalLanguageProcessHarness harness, Path module) throws Exception {
        String moduleFiles = Files.readString(module.resolve("go.mod"))
                + Files.readString(module.resolve("go.sum"));
        assertFalse(moduleFiles.contains("opentelemetry-go-instrumentation"));
        try (var paths = Files.walk(harness.resolve("go"))) {
            assertTrue(paths.noneMatch(path -> path.toString().contains("opentelemetry-go-instrumentation")));
        }
    }

    private void assumeSupportedGo(
            ExternalLanguageProcessHarness harness,
            Path goBinary,
            Map<String, String> environment) throws Exception {
        String version;
        try {
            version = harness.capture(
                    List.of(goBinary.toString(), "version"), environment, Duration.ofSeconds(10));
        } catch (IllegalStateException exception) {
            Assumptions.assumeTrue(false,
                    () -> GO_BINARY_ENV + " must provide a working local Go toolchain: " + exception.getMessage());
            return;
        }
        Assumptions.assumeTrue(version.matches("go version go1\\.(2[5-9]|[3-9][0-9])(?:\\..*)? .*"),
                () -> GO_BINARY_ENV + " must identify Go 1.25 or newer, found " + version);
    }

    private Map<String, String> instrumentedEnvironment(OtelRuntimeProperties properties) {
        Map<String, String> environment = new HashMap<>();
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
        return environment;
    }

    private void awaitHttp(
            ExternalLanguageProcessHarness harness, Process process, String label, int port) throws Exception {
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
        throw new IllegalStateException("Go HTTP application did not become ready; "
                + harness.processDiagnostic(process, label));
    }

    private static HttpResponse<String> get(int port, String path) throws Exception {
        return HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private Path requiredExecutable(String environmentVariable, Path fallback) {
        String value = System.getenv(environmentVariable);
        Path path = value == null || value.isBlank() ? fallback : Path.of(value);
        Assumptions.assumeTrue(path != null,
                () -> environmentVariable + " is required for the real Go SDK interoperability proof");
        path = path.toAbsolutePath().normalize();
        Path executable = path;
        Assumptions.assumeTrue(Files.isRegularFile(path) && Files.isExecutable(path),
                () -> environmentVariable + " must identify an executable file: " + executable);
        return path;
    }

    private int availablePort() throws Exception {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        }
    }

    private String applicationSource() {
        return """
                package main

                import (
                    "context"
                    "errors"
                    "fmt"
                    "log"
                    "net/http"
                    "os"
                    "os/signal"
                    "strconv"
                    "syscall"
                    "time"

                    "go.opentelemetry.io/contrib/exporters/autoexport"
                    "go.opentelemetry.io/otel"
                    otellog "go.opentelemetry.io/otel/log"
                    "go.opentelemetry.io/otel/log/global"
                    sdklog "go.opentelemetry.io/otel/sdk/log"
                    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
                    sdktrace "go.opentelemetry.io/otel/sdk/trace"
                    "go.opentelemetry.io/otel/trace"
                )

                func setupOpenTelemetry(ctx context.Context) (func(context.Context) error, error) {
                    spanExporter, err := autoexport.NewSpanExporter(ctx)
                    if err != nil {
                        return nil, err
                    }
                    tracerProvider := sdktrace.NewTracerProvider(sdktrace.WithBatcher(spanExporter))

                    metricReader, err := autoexport.NewMetricReader(ctx)
                    if err != nil {
                        _ = tracerProvider.Shutdown(ctx)
                        return nil, err
                    }
                    meterProvider := sdkmetric.NewMeterProvider(sdkmetric.WithReader(metricReader))

                    logExporter, err := autoexport.NewLogExporter(ctx)
                    if err != nil {
                        _ = meterProvider.Shutdown(ctx)
                        _ = tracerProvider.Shutdown(ctx)
                        return nil, err
                    }
                    loggerProvider := sdklog.NewLoggerProvider(
                        sdklog.WithProcessor(sdklog.NewBatchProcessor(logExporter)))

                    otel.SetTracerProvider(tracerProvider)
                    otel.SetMeterProvider(meterProvider)
                    global.SetLoggerProvider(loggerProvider)
                    return func(ctx context.Context) error {
                        return errors.Join(
                            loggerProvider.Shutdown(ctx),
                            meterProvider.Shutdown(ctx),
                            tracerProvider.Shutdown(ctx),
                        )
                    }, nil
                }

                func main() {
                    if len(os.Args) != 3 {
                        log.Fatal("port and mode are required")
                    }
                    port, err := strconv.Atoi(os.Args[1])
                    if err != nil {
                        log.Fatal(err)
                    }
                    instrumented := os.Args[2] == "instrumented"
                    shutdownTelemetry := func(context.Context) error { return nil }
                    if instrumented {
                        shutdownTelemetry, err = setupOpenTelemetry(context.Background())
                        if err != nil {
                            log.Fatal(err)
                        }
                    }

                    counter, err := otel.Meter("hertzbeat-go-sdk-smoke").Int64Counter("checkout.go.requests")
                    if err != nil {
                        log.Fatal(err)
                    }
                    logger := global.GetLoggerProvider().Logger("hertzbeat-go-sdk-smoke")
                    mux := http.NewServeMux()
                    mux.HandleFunc("/health", func(writer http.ResponseWriter, request *http.Request) {
                        _, _ = writer.Write([]byte("healthy"))
                    })
                    mux.HandleFunc("/checkout", func(writer http.ResponseWriter, request *http.Request) {
                        ctx := request.Context()
                        var span trace.Span
                        if instrumented {
                            ctx, span = otel.Tracer("hertzbeat-go-sdk-smoke").Start(
                                ctx, "GET /checkout", trace.WithSpanKind(trace.SpanKindServer))
                            defer span.End()
                            counter.Add(ctx, 1)
                            var record otellog.Record
                            record.SetTimestamp(time.Now())
                            record.SetBody(otellog.StringValue("checkout-preview-log"))
                            logger.Emit(ctx, record)
                        }
                        _, _ = writer.Write([]byte("checkout-ok"))
                    })

                    server := &http.Server{Addr: fmt.Sprintf("127.0.0.1:%d", port), Handler: mux}
                    stopped := make(chan os.Signal, 1)
                    signal.Notify(stopped, syscall.SIGINT, syscall.SIGTERM)
                    go func() {
                        if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
                            log.Fatal(err)
                        }
                    }()
                    <-stopped
                    shutdownContext, cancel := context.WithTimeout(context.Background(), 5*time.Second)
                    defer cancel()
                    _ = server.Shutdown(shutdownContext)
                    if err := shutdownTelemetry(shutdownContext); err != nil {
                        log.Printf("OpenTelemetry shutdown failed: %v", err)
                    }
                }
                """;
    }
}
