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

import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.resource.v1.Resource;
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
import java.util.stream.Stream;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

class OtelPythonZeroCodeIntegrationTest {

    private static final String RUNTIME_BINARY_ENV = "HERTZBEAT_OTEL_RUNTIME_BINARY";
    private static final String PYTHON_BINARY_ENV = "HERTZBEAT_PYTHON_BINARY";
    private static final String SERVICE_NAME = "checkout-python-zero-code";
    private static final String SERVICE_NAMESPACE = "storefront";
    private static final String ENVIRONMENT = "integration";
    private static final String COLLECTOR_ID = "collector-python-zero-code";

    @Test
    void collectsCatalogPythonZeroCodeSupportedMetricsAndTracesAndObservesPreviewLogs() throws Exception {
        Path runtimeBinary = requiredExecutable(RUNTIME_BINARY_ENV);
        Path pythonBinary = requiredExecutable(PYTHON_BINARY_ENV);

        try (ExternalLanguageProcessHarness harness = ExternalLanguageProcessHarness.create("hertzbeat-python-zero-code-");
             OtelRuntimeTestSupport.OtlpCapture capture = new OtelRuntimeTestSupport.OtlpCapture()) {
            assertTrue(harness.capture(
                    List.of(pythonBinary.toString(), "--version"), Map.of(), Duration.ofSeconds(5))
                    .startsWith("Python 3."));
            Path virtualEnvironment = harness.createPythonVirtualEnvironment(pythonBinary);
            installCatalogPackages(harness, virtualEnvironment);
            Path application = harness.resolve("app.py");
            Files.writeString(application, applicationSource());

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
                        List.of(instrumentCommand(virtualEnvironment).toString(),
                                "--logs_exporter", "otlp", virtualEnvironment.resolve("bin/python").toString(),
                                application.toString(), Integer.toString(instrumentedPort)),
                        instrumentedEnvironment(properties, virtualEnvironment), "python-instrumented");
                awaitHttp(instrumented, instrumentedPort);
                assertEquals(200, get(instrumentedPort, "/checkout").statusCode());

                OtelRuntimeTestSupport.await(
                        () -> hasPythonMetric(capture) && hasPythonServerSpan(capture), Duration.ofSeconds(45));
                assertTrue(hasPythonMetric(capture), "official Python zero-code metrics were not exported");
                assertTrue(hasPythonServerSpan(capture), "official Python zero-code HTTP server span was not exported");
                assertTrue(hasPythonPreviewLog(capture),
                        "catalog-preview Python log export was not observed for the pinned package set");

                harness.stop(instrumented, Duration.ofSeconds(5));
                int plainPort = availablePort();
                Process plain = harness.start(
                        List.of(virtualEnvironment.resolve("bin/python").toString(),
                                application.toString(), Integer.toString(plainPort)),
                        Map.of(), "python-uninstrumented");
                awaitHttp(plain, plainPort);
                assertEquals(200, get(plainPort, "/checkout").statusCode());
                assertTrue(plain.isAlive(), "the Python application must remain healthy without zero-code startup");
            } finally {
                supervisor.close();
            }
        }
    }

    private void installCatalogPackages(
            ExternalLanguageProcessHarness harness, Path virtualEnvironment) throws Exception {
        Path python = virtualEnvironment.resolve("bin/python");
        Map<String, String> environment = installEnvironment(harness, virtualEnvironment);
        harness.run(
                List.of(
                        python.toString(), "-m", "pip", "install", "--disable-pip-version-check", "--no-input",
                        "flask==3.1.2",
                        "opentelemetry-distro==0.64b0",
                        "opentelemetry-exporter-otlp==1.43.0",
                        "opentelemetry-instrumentation-logging==0.64b0"),
                environment, Duration.ofMinutes(3), "pip-install-catalog");
        harness.run(
                List.of(virtualEnvironment.resolve("bin/opentelemetry-bootstrap").toString(), "-a", "install"),
                environment, Duration.ofMinutes(3), "otel-bootstrap");
        String versions = harness.capture(
                List.of(python.toString(), "-c", "import importlib.metadata as m; print('|'.join(("
                        + "m.version('opentelemetry-distro'),m.version('opentelemetry-exporter-otlp'),"
                        + "m.version('opentelemetry-instrumentation-logging'))))"),
                environment, Duration.ofSeconds(10));
        assertEquals("0.64b0|1.43.0|0.64b0", versions, "the real proof must use catalog-pinned packages");
    }

    private Map<String, String> installEnvironment(
            ExternalLanguageProcessHarness harness, Path virtualEnvironment) {
        return Map.of(
                "PATH", virtualEnvironment.resolve("bin") + ":/usr/bin:/bin:/usr/sbin:/sbin",
                "PIP_CACHE_DIR", harness.resolve("pip-cache").toString(),
                "PIP_CONFIG_FILE", "/dev/null",
                "PIP_DISABLE_PIP_VERSION_CHECK", "1",
                "PIP_NO_INPUT", "1");
    }

    private Map<String, String> instrumentedEnvironment(
            OtelRuntimeProperties properties, Path virtualEnvironment) {
        Map<String, String> environment = new HashMap<>();
        environment.put("PATH", virtualEnvironment.resolve("bin") + ":/usr/bin:/bin:/usr/sbin:/sbin");
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
        environment.put("OTEL_LOG_LEVEL", "none");
        return environment;
    }

    private Path instrumentCommand(Path virtualEnvironment) {
        return virtualEnvironment.resolve("bin/opentelemetry-instrument");
    }

    private boolean hasPythonMetric(OtelRuntimeTestSupport.OtlpCapture capture) {
        return capture.bodies("metrics").stream().flatMap(body -> {
            try {
                return ExportMetricsServiceRequest.parseFrom(body).getResourceMetricsList().stream();
            } catch (Exception ignored) {
                return Stream.empty();
            }
        }).anyMatch(resourceMetrics -> hasExpectedResource(resourceMetrics.getResource())
                && resourceMetrics.getScopeMetricsList().stream().anyMatch(scope -> !scope.getMetricsList().isEmpty()));
    }

    private boolean hasPythonServerSpan(OtelRuntimeTestSupport.OtlpCapture capture) {
        return capture.bodies("traces").stream().flatMap(body -> {
            try {
                return ExportTraceServiceRequest.parseFrom(body).getResourceSpansList().stream();
            } catch (Exception ignored) {
                return Stream.empty();
            }
        }).filter(resourceSpans -> hasExpectedResource(resourceSpans.getResource()))
                .flatMap(resourceSpans -> resourceSpans.getScopeSpansList().stream())
                .flatMap(scope -> scope.getSpansList().stream())
                .anyMatch(span -> span.getKind() == Span.SpanKind.SPAN_KIND_SERVER
                        && span.getName().toUpperCase(java.util.Locale.ROOT).contains("GET"));
    }

    private boolean hasPythonPreviewLog(OtelRuntimeTestSupport.OtlpCapture capture) {
        return capture.bodies("logs").stream().flatMap(body -> {
            try {
                return ExportLogsServiceRequest.parseFrom(body).getResourceLogsList().stream();
            } catch (Exception ignored) {
                return Stream.empty();
            }
        }).filter(resourceLogs -> hasExpectedResource(resourceLogs.getResource()))
                .flatMap(resourceLogs -> resourceLogs.getScopeLogsList().stream())
                .flatMap(scope -> scope.getLogRecordsList().stream())
                .anyMatch(log -> log.getBody().getStringValue().contains("checkout-preview-log"));
    }

    private boolean hasExpectedResource(Resource resource) {
        Map<String, String> attributes = new HashMap<>();
        for (KeyValue attribute : resource.getAttributesList()) {
            if (attribute.getValue().hasStringValue()) {
                attributes.put(attribute.getKey(), attribute.getValue().getStringValue());
            }
        }
        return SERVICE_NAME.equals(attributes.get("service.name"))
                && SERVICE_NAMESPACE.equals(attributes.get("service.namespace"))
                && ENVIRONMENT.equals(attributes.get("deployment.environment.name"))
                && COLLECTOR_ID.equals(attributes.get("hertzbeat.collector.id"));
    }

    private void awaitHttp(Process process, int port) throws Exception {
        OtelRuntimeTestSupport.await(() -> {
            if (!process.isAlive()) {
                return false;
            }
            try {
                return get(port, "/health").statusCode() == 200;
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

    private Path requiredExecutable(String environmentVariable) {
        String value = System.getenv(environmentVariable);
        Assumptions.assumeTrue(value != null && !value.isBlank(),
                () -> environmentVariable + " is required for the real Python interoperability proof");
        Path path = Path.of(value).toAbsolutePath().normalize();
        Assumptions.assumeTrue(Files.isRegularFile(path) && Files.isExecutable(path),
                () -> environmentVariable + " must identify an executable file");
        return path;
    }

    private int availablePort() throws Exception {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        }
    }

    private String applicationSource() {
        return """
                import logging
                import sys
                from flask import Flask

                app = Flask(__name__)

                @app.get('/health')
                def health():
                    return 'healthy'

                @app.get('/checkout')
                def checkout():
                    logging.getLogger('checkout').warning('checkout-preview-log')
                    return 'checkout-ok'

                app.run(host='127.0.0.1', port=int(sys.argv[1]), use_reloader=False)
                """;
    }
}
