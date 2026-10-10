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

package org.apache.hertzbeat.observability.ingestion.service.impl;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionGuideDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Builds the public OTLP endpoints and copy-ready integration snippets.
 */
@Component
class OtlpIngestionGuideFactory {

    private static final String OTLP_HTTP_PATH = "/api/otlp";
    private static final String OTLP_HOST_PLACEHOLDER = "<your-hertzbeat-host>";

    private final boolean sslEnabled;
    private final int serverPort;
    private final int otlpGrpcPort;

    OtlpIngestionGuideFactory(@Value("${server.ssl.enabled:false}") boolean sslEnabled,
                              @Value("${server.port:1157}") int serverPort,
                              @Value("${hertzbeat.otlp.grpc.port:4317}") int otlpGrpcPort) {
        this.sslEnabled = sslEnabled;
        this.serverPort = serverPort;
        this.otlpGrpcPort = otlpGrpcPort;
    }

    OtlpIngestionGuideDto create(HttpServletRequest request) {
        String unifiedBaseEndpoint = resolveOtlpHttpBaseEndpoint(request);
        String grpcEndpoint = resolveOtlpGrpcEndpoint(request);
        String traceEndpoint = unifiedBaseEndpoint + "/v1/traces";
        String metricsEndpoint = unifiedBaseEndpoint + "/v1/metrics";
        String logsEndpoint = unifiedBaseEndpoint + "/v1/logs";
        String collectorSnippet = """
                receivers:
                  otlp:
                    protocols:
                      http:
                      grpc:

                processors:
                  batch:

                exporters:
                  otlphttp/hertzbeat:
                    endpoint: %s
                    headers:
                      Authorization: "Bearer <api-token>"

                service:
                  pipelines:
                    logs:
                      receivers: [otlp]
                      processors: [batch]
                      exporters: [otlphttp/hertzbeat]
                    traces:
                      receivers: [otlp]
                      processors: [batch]
                      exporters: [otlphttp/hertzbeat]
                    metrics:
                      receivers: [otlp]
                      processors: [batch]
                      exporters: [otlphttp/hertzbeat]
                """.formatted(unifiedBaseEndpoint);
        String collectorGrpcSnippet = """
                receivers:
                  otlp:
                    protocols:
                      http:
                      grpc:

                processors:
                  batch:

                exporters:
                  otlp/hertzbeat:
                    endpoint: %s
                    headers:
                      Authorization: "Bearer <api-token>"
                    tls:
                      insecure: true

                service:
                  pipelines:
                    logs:
                      receivers: [otlp]
                      processors: [batch]
                      exporters: [otlp/hertzbeat]
                    traces:
                      receivers: [otlp]
                      processors: [batch]
                      exporters: [otlp/hertzbeat]
                    metrics:
                      receivers: [otlp]
                      processors: [batch]
                      exporters: [otlp/hertzbeat]
                """.formatted(grpcEndpoint);
        String javaSnippet = """
                export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
                export OTEL_EXPORTER_OTLP_ENDPOINT=%s
                export OTEL_EXPORTER_OTLP_HEADERS=\"Authorization=Bearer <api-token>\"
                export OTEL_RESOURCE_ATTRIBUTES=\"service.name=checkout,service.namespace=commerce,deployment.environment.name=prod\"
                """.formatted(unifiedBaseEndpoint);
        String javaGrpcSnippet = """
                export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
                export OTEL_EXPORTER_OTLP_ENDPOINT=%s
                export OTEL_EXPORTER_OTLP_HEADERS=\"Authorization=Bearer <api-token>\"
                export OTEL_RESOURCE_ATTRIBUTES=\"service.name=checkout,service.namespace=commerce,deployment.environment.name=prod\"
                """.formatted("http://" + grpcEndpoint);
        String pythonSnippet = """
                from opentelemetry.sdk.resources import Resource
                resource = Resource.create({
                    "service.name": "checkout",
                    "service.namespace": "commerce",
                    "deployment.environment.name": "prod",
                })

                # %s
                # %s
                """.formatted(message("observability.otlp.guide.snippet.python.http.comment"), unifiedBaseEndpoint);
        String pythonGrpcSnippet = """
                from opentelemetry.sdk.resources import Resource
                resource = Resource.create({
                    "service.name": "checkout",
                    "service.namespace": "commerce",
                    "deployment.environment.name": "prod",
                })

                # %s
                # %s
                """.formatted(message("observability.otlp.guide.snippet.python.grpc.comment"), grpcEndpoint);

        return new OtlpIngestionGuideDto(
                "OTLP HTTP",
                "OTLP gRPC",
                "Authorization",
                "Bearer <api-token>",
                grpcEndpoint,
                List.of(
                        signalGuide("metrics", "http", "OTLP HTTP", metricsEndpoint),
                        signalGuide("logs", "http", "OTLP HTTP", logsEndpoint),
                        signalGuide("traces", "http", "OTLP HTTP", traceEndpoint),
                        signalGuide("metrics", "grpc", "OTLP gRPC", grpcEndpoint),
                        signalGuide("logs", "grpc", "OTLP gRPC", grpcEndpoint),
                        signalGuide("traces", "grpc", "OTLP gRPC", grpcEndpoint)
                ),
                List.of(
                        new OtlpIngestionGuideDto.Snippet(
                                "collector-http", "http", "OpenTelemetry Collector", "yaml", collectorSnippet),
                        new OtlpIngestionGuideDto.Snippet(
                                "java-http", "http", message("observability.otlp.guide.snippet.java-env"),
                                "bash", javaSnippet),
                        new OtlpIngestionGuideDto.Snippet(
                                "python-http", "http", message("observability.otlp.guide.snippet.python-resource"),
                                "python", pythonSnippet),
                        new OtlpIngestionGuideDto.Snippet(
                                "collector-grpc", "grpc", "OpenTelemetry Collector", "yaml", collectorGrpcSnippet),
                        new OtlpIngestionGuideDto.Snippet(
                                "java-grpc", "grpc", message("observability.otlp.guide.snippet.java-env"),
                                "bash", javaGrpcSnippet),
                        new OtlpIngestionGuideDto.Snippet(
                                "python-grpc", "grpc", message("observability.otlp.guide.snippet.python-resource"),
                                "python", pythonGrpcSnippet)
                )
        );
    }

    private OtlpIngestionGuideDto.SignalGuide signalGuide(String signal, String protocol, String label,
                                                           String endpoint) {
        String messagePrefix = "observability.otlp.guide." + signal + "." + protocol;
        return new OtlpIngestionGuideDto.SignalGuide(
                signal,
                protocol,
                label,
                endpoint,
                message(messagePrefix + ".description"),
                message(messagePrefix + ".note")
        );
    }

    private String resolveOtlpHttpBaseEndpoint(HttpServletRequest request) {
        String scheme = firstText(
                extractForwardedComponent(request, "proto"),
                headerValue(request, "X-Forwarded-Proto"),
                sslEnabled ? "https" : "http"
        );
        String host = resolveExternalHost(request);
        if (!StringUtils.hasText(host)) {
            return scheme + "://" + OTLP_HOST_PLACEHOLDER + OTLP_HTTP_PATH;
        }
        return scheme + "://" + appendPortIfNeeded(host, resolveExternalPort(request, scheme), scheme) + OTLP_HTTP_PATH;
    }

    private String resolveOtlpGrpcEndpoint(HttpServletRequest request) {
        String host = resolveExternalHost(request);
        if (!StringUtils.hasText(host)) {
            return OTLP_HOST_PLACEHOLDER + ":" + otlpGrpcPort;
        }
        return stripPort(host) + ":" + otlpGrpcPort;
    }

    private String resolveExternalHost(HttpServletRequest request) {
        String forwardedHost = firstText(
                extractForwardedComponent(request, "host"),
                headerValue(request, "X-Forwarded-Host"),
                headerValue(request, "Host")
        );
        if (StringUtils.hasText(forwardedHost)) {
            return trimForwardedValue(forwardedHost);
        }
        if (request == null || !StringUtils.hasText(request.getServerName())) {
            return null;
        }
        return request.getServerName();
    }

    private Integer resolveExternalPort(HttpServletRequest request, String scheme) {
        String host = resolveExternalHost(request);
        String forwardedPort = firstText(
                extractForwardedComponent(request, "port"),
                headerValue(request, "X-Forwarded-Port")
        );
        if (StringUtils.hasText(forwardedPort)) {
            try {
                return Integer.parseInt(trimForwardedValue(forwardedPort));
            } catch (NumberFormatException ignored) {
                // Fall through to the request or configured server port.
            }
        }
        Integer explicitHostPort = extractPortFromHost(host);
        if (explicitHostPort != null) {
            return explicitHostPort;
        }
        if (request != null && request.getServerPort() > 0) {
            return request.getServerPort();
        }
        return "https".equalsIgnoreCase(scheme) ? 443 : serverPort;
    }

    private String extractForwardedComponent(HttpServletRequest request, String key) {
        String forwarded = headerValue(request, "Forwarded");
        if (!StringUtils.hasText(forwarded)) {
            return null;
        }
        String firstPart = forwarded.split(",", 2)[0];
        for (String token : firstPart.split(";")) {
            String[] pair = token.split("=", 2);
            if (pair.length == 2 && key.equalsIgnoreCase(pair[0].trim())) {
                return trimForwardedValue(pair[1]);
            }
        }
        return null;
    }

    private String headerValue(HttpServletRequest request, String headerName) {
        return request == null ? null : request.getHeader(headerName);
    }

    private String firstText(String... candidates) {
        for (String candidate : candidates) {
            if (StringUtils.hasText(candidate)) {
                return trimForwardedValue(candidate);
            }
        }
        return null;
    }

    private String trimForwardedValue(String value) {
        if (!StringUtils.hasText(value)) {
            return value;
        }
        String trimmed = value.trim();
        if (trimmed.startsWith("\"") && trimmed.endsWith("\"") && trimmed.length() > 1) {
            trimmed = trimmed.substring(1, trimmed.length() - 1);
        }
        int commaIndex = trimmed.indexOf(',');
        if (commaIndex > 0) {
            trimmed = trimmed.substring(0, commaIndex);
        }
        return trimmed.trim();
    }

    private String appendPortIfNeeded(String host, Integer port, String scheme) {
        String normalizedHost = stripPort(host);
        if (!StringUtils.hasText(normalizedHost) || port == null) {
            return normalizedHost;
        }
        if (("http".equalsIgnoreCase(scheme) && port == 80)
                || ("https".equalsIgnoreCase(scheme) && port == 443)) {
            return normalizedHost;
        }
        return normalizedHost + ":" + port;
    }

    private String stripPort(String host) {
        if (!StringUtils.hasText(host)) {
            return host;
        }
        String trimmed = host.trim();
        if (trimmed.startsWith("[") && trimmed.contains("]")) {
            return trimmed.substring(0, trimmed.indexOf(']') + 1);
        }
        int colonIndex = trimmed.lastIndexOf(':');
        if (colonIndex > 0 && trimmed.indexOf(':') == colonIndex) {
            return trimmed.substring(0, colonIndex);
        }
        if (colonIndex > 0) {
            return "[" + trimmed + "]";
        }
        return trimmed;
    }

    private Integer extractPortFromHost(String host) {
        if (!StringUtils.hasText(host)) {
            return null;
        }
        String trimmed = host.trim();
        if (trimmed.startsWith("[") && trimmed.contains("]")) {
            int lastColon = trimmed.lastIndexOf(':');
            int closingBracket = trimmed.lastIndexOf(']');
            if (lastColon > closingBracket) {
                return parsePort(trimmed.substring(lastColon + 1));
            }
            return null;
        }
        int colonIndex = trimmed.lastIndexOf(':');
        if (colonIndex > 0 && trimmed.indexOf(':') == colonIndex) {
            return parsePort(trimmed.substring(colonIndex + 1));
        }
        return null;
    }

    private Integer parsePort(String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static String message(String key) {
        return OtlpIngestionMessages.get(key);
    }
}
