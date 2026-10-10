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

class OtelNodeZeroCodeIntegrationTest {

    private static final String RUNTIME_BINARY_ENV = "HERTZBEAT_OTEL_RUNTIME_BINARY";
    private static final String NODE_BINARY_ENV = "HERTZBEAT_NODE22_BINARY";
    private static final String NPM_BINARY_ENV = "HERTZBEAT_NPM22_BINARY";
    private static final String SERVICE_NAME = "checkout-node-zero-code";
    private static final String SERVICE_NAMESPACE = "storefront";
    private static final String ENVIRONMENT = "integration";
    private static final String COLLECTOR_ID = "collector-node-zero-code";

    @Test
    void collectsOfficialNodeZeroCodeMetricsAndHttpServerTraceWithoutLogs() throws Exception {
        Path runtimeBinary = requiredExecutable(RUNTIME_BINARY_ENV);
        Path nodeBinary = requiredExecutable(NODE_BINARY_ENV);
        Path npmBinary = requiredExecutable(NPM_BINARY_ENV);

        try (ExternalLanguageProcessHarness harness = ExternalLanguageProcessHarness.create("hertzbeat-node-zero-code-");
             OtelRuntimeTestSupport.OtlpCapture capture = new OtelRuntimeTestSupport.OtlpCapture()) {
            assertTrue(harness.capture(
                    List.of(nodeBinary.toString(), "--version"), Map.of(), Duration.ofSeconds(5)).startsWith("v22."));
            Path application = harness.resolve("app.js");
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
                installOfficialPackages(harness, nodeBinary, npmBinary);

                int instrumentedPort = availablePort();
                Process instrumented = harness.start(
                        List.of(nodeBinary.toString(), application.toString(), Integer.toString(instrumentedPort)),
                        instrumentedEnvironment(properties), "node-instrumented");
                awaitHttp(instrumented, instrumentedPort);
                assertEquals(200, get(instrumentedPort, "/checkout").statusCode());

                OtelRuntimeTestSupport.await(
                        () -> hasNodeMetric(capture) && hasNodeServerSpan(capture), Duration.ofSeconds(45));
                assertTrue(hasNodeMetric(capture), "official Node zero-code metrics were not exported");
                assertTrue(hasNodeServerSpan(capture), "official Node HTTP server span was not exported");
                assertTrue(capture.bodies("logs").isEmpty(), "unsupported Node logs must not be fabricated");

                harness.stop(instrumented, Duration.ofSeconds(5));
                int plainPort = availablePort();
                Process plain = harness.start(
                        List.of(nodeBinary.toString(), application.toString(), Integer.toString(plainPort)),
                        Map.of(), "node-uninstrumented");
                awaitHttp(plain, plainPort);
                assertEquals(200, get(plainPort, "/checkout").statusCode());
                assertTrue(plain.isAlive(), "the Node application must remain healthy without zero-code startup");
            } finally {
                supervisor.close();
            }
        }
    }

    private void installOfficialPackages(
            ExternalLanguageProcessHarness harness, Path nodeBinary, Path npmBinary) throws Exception {
        Map<String, String> environment = Map.of(
                "PATH", nodeBinary.getParent().toString() + ":/usr/bin:/bin:/usr/sbin:/sbin",
                "npm_config_cache", harness.resolve("npm-cache").toString(),
                "npm_config_userconfig", "/dev/null",
                "npm_config_audit", "false",
                "npm_config_fund", "false",
                "npm_config_update_notifier", "false");
        harness.run(
                List.of(
                        npmBinary.toString(),
                        "install",
                        "--no-save",
                        "--package-lock=false",
                        "--ignore-scripts",
                        "@opentelemetry/api@1.9.1",
                        "@opentelemetry/auto-instrumentations-node@0.78.0"),
                environment,
                Duration.ofMinutes(3),
                "npm-install");
    }

    private Map<String, String> instrumentedEnvironment(OtelRuntimeProperties properties) {
        Map<String, String> environment = new HashMap<>();
        environment.put("NODE_OPTIONS", "--require @opentelemetry/auto-instrumentations-node/register");
        environment.put("OTEL_SERVICE_NAME", SERVICE_NAME);
        environment.put("OTEL_RESOURCE_ATTRIBUTES", "service.namespace=" + SERVICE_NAMESPACE
                + ",deployment.environment.name=" + ENVIRONMENT);
        environment.put("OTEL_EXPORTER_OTLP_ENDPOINT", "http://" + properties.getOtlpHttpEndpoint());
        environment.put("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf");
        environment.put("OTEL_EXPORTER_OTLP_HEADERS", "Authorization=Bearer%20" + UUID.randomUUID());
        environment.put("OTEL_TRACES_EXPORTER", "otlp");
        environment.put("OTEL_METRICS_EXPORTER", "otlp");
        environment.put("OTEL_LOGS_EXPORTER", "none");
        environment.put("OTEL_METRIC_EXPORT_INTERVAL", "1000");
        environment.put("OTEL_BSP_SCHEDULE_DELAY", "100");
        environment.put("OTEL_LOG_LEVEL", "NONE");
        return environment;
    }

    private boolean hasNodeMetric(OtelRuntimeTestSupport.OtlpCapture capture) {
        return capture.bodies("metrics").stream().flatMap(body -> {
            try {
                return ExportMetricsServiceRequest.parseFrom(body).getResourceMetricsList().stream();
            } catch (Exception ignored) {
                return Stream.empty();
            }
        }).anyMatch(resourceMetrics -> hasExpectedResource(resourceMetrics.getResource())
                && resourceMetrics.getScopeMetricsList().stream().anyMatch(scope -> !scope.getMetricsList().isEmpty()));
    }

    private boolean hasNodeServerSpan(OtelRuntimeTestSupport.OtlpCapture capture) {
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
                () -> environmentVariable + " is required for the real Node interoperability proof");
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
                const http = require('node:http');
                const port = Number(process.argv[2]);
                const server = http.createServer((request, response) => {
                  response.writeHead(200, {'content-type': 'text/plain'});
                  response.end(request.url === '/checkout' ? 'checkout-ok' : 'healthy');
                });
                server.listen(port, '127.0.0.1');
                const shutdown = () => server.close(() => process.exit(0));
                process.on('SIGTERM', shutdown);
                process.on('SIGINT', shutdown);
                """;
    }
}
