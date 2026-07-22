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

package org.apache.hertzbeat.observability.instrumentation.service;

import static org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SCHEMA_VERSION;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Capability;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.CollectorTarget;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideRenderRequest;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideRenderResponse;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideSnippet;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideStep;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.InstrumentationSelection;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.MethodOption;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.RequestErrorCode;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SecretPlaceholder;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SecretReplacement;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SecretValueFormat;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.StepType;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationRequestException;
import org.apache.hertzbeat.observability.instrumentation.guide.InstrumentationGuideAdapter.LanguageGuideSteps;
import org.apache.hertzbeat.observability.instrumentation.guide.InstrumentationGuideAdapterRegistry;
import org.springframework.stereotype.Service;

/**
 * Renders copyable, non-mutating installation guidance from the versioned catalog.
 */
@Service
public class InstrumentationGuideRenderer {

    static final String TOKEN_PLACEHOLDER = "${HERTZBEAT_TOKEN}";
    private static final Pattern RESOURCE_VALUE = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._/-]{0,127}");
    private static final Set<String> ENDPOINT_SCHEMES = Set.of("http", "https");

    private final InstrumentationCatalogService catalogService;
    private final InstrumentationGuideAdapterRegistry adapterRegistry;

    public InstrumentationGuideRenderer(
            InstrumentationCatalogService catalogService,
            InstrumentationGuideAdapterRegistry adapterRegistry) {
        this.catalogService = catalogService;
        this.adapterRegistry = adapterRegistry;
    }

    public GuideRenderResponse render(GuideRenderRequest request) {
        requireRequest(request);
        MethodOption method = catalogService.requireMethod(request.language(), request.framework(), request.method());
        if (!method.environments().contains(request.environment()) || !method.platforms().contains(request.platform())
                && !method.platforms().contains(org.apache.hertzbeat.observability.instrumentation.api
                        .InstrumentationApiContract.Platform.ANY)) {
            throw new InstrumentationRequestException(RequestErrorCode.SELECTION_INVALID);
        }
        CollectorTarget collector = requireCollector(request.collector());
        CollectorOtlpTarget otlpTarget = selectOtlpTarget(collector);
        ServiceIdentity service = requireService(request.service());
        LanguageGuideSteps languageSteps = adapterRegistry.require(request.language()).render(request, method);
        List<GuideStep> steps = List.of(
                languageSteps.install(),
                configureStep(collector, otlpTarget, service, request.platform(), method),
                languageSteps.start(),
                languageSteps.container(),
                languageSteps.disable());
        return new GuideRenderResponse(
                SCHEMA_VERSION,
                new InstrumentationSelection(
                        request.language(),
                        request.framework(),
                        request.method(),
                        request.environment(),
                        request.platform()),
                method.signals(),
                method.component(),
                Map.of(
                        "authorizationToken",
                        new SecretPlaceholder(
                                TOKEN_PLACEHOLDER,
                                SecretValueFormat.URL_UNRESERVED,
                                SecretReplacement.RAW)),
                steps);
    }

    private void requireRequest(GuideRenderRequest request) {
        if (request == null) {
            throw new InstrumentationRequestException(RequestErrorCode.SCHEMA_UNSUPPORTED);
        }
        if (request.schemaVersion() != SCHEMA_VERSION) {
            throw new InstrumentationRequestException(RequestErrorCode.SCHEMA_UNSUPPORTED);
        }
        if (request.language() == null || request.framework() == null || request.method() == null
                || request.environment() == null || request.platform() == null) {
            throw new InstrumentationRequestException(RequestErrorCode.SELECTION_INVALID);
        }
    }

    private CollectorTarget requireCollector(CollectorTarget collector) {
        if (collector == null) {
            throw new InstrumentationRequestException(RequestErrorCode.CONTEXT_INVALID);
        }
        requireResourceValue(collector.collectorId(), "Collector ID");
        if (collector.otlpHttpEndpoint() != null) {
            requireEndpoint(collector.otlpHttpEndpoint(), "HTTP endpoint");
        }
        if (collector.otlpGrpcEndpoint() != null) {
            requireEndpoint(collector.otlpGrpcEndpoint(), "gRPC endpoint");
        }
        if (collector.otlpHttpEndpoint() == null && collector.otlpGrpcEndpoint() == null) {
            throw new InstrumentationRequestException(RequestErrorCode.CONTEXT_INVALID);
        }
        if (!"Authorization".equals(collector.authorizationHeader())) {
            throw new InstrumentationRequestException(RequestErrorCode.CONTEXT_INVALID);
        }
        return collector;
    }

    private CollectorOtlpTarget selectOtlpTarget(CollectorTarget collector) {
        if (collector.otlpHttpEndpoint() != null) {
            return new CollectorOtlpTarget(collector.otlpHttpEndpoint(), "http/protobuf");
        }
        return new CollectorOtlpTarget(collector.otlpGrpcEndpoint(), "grpc");
    }

    private ServiceIdentity requireService(ServiceIdentity service) {
        if (service == null) {
            throw new InstrumentationRequestException(RequestErrorCode.CONTEXT_INVALID);
        }
        requireResourceValue(service.name(), "Service name");
        requireResourceValue(service.namespace(), "Service namespace");
        requireResourceValue(service.environment(), "Deployment environment");
        return service;
    }

    private void requireEndpoint(String value, String label) {
        try {
            URI uri = URI.create(value);
            if (!uri.isAbsolute() || !ENDPOINT_SCHEMES.contains(uri.getScheme()) || uri.getHost() == null
                    || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null) {
                throw new InstrumentationRequestException(RequestErrorCode.CONTEXT_INVALID);
            }
        } catch (RuntimeException exception) {
            throw new InstrumentationRequestException(RequestErrorCode.CONTEXT_INVALID);
        }
    }

    private void requireResourceValue(String value, String label) {
        if (value == null || !RESOURCE_VALUE.matcher(value).matches()) {
            throw new InstrumentationRequestException(RequestErrorCode.CONTEXT_INVALID);
        }
    }

    private GuideStep configureStep(
            CollectorTarget collector, CollectorOtlpTarget otlpTarget, ServiceIdentity service,
            Platform platform, MethodOption method) {
        String resourceAttributes = "service.namespace=" + service.namespace()
                + ",deployment.environment.name=" + service.environment()
                + ",hertzbeat.collector.id=" + collector.collectorId();
        String tracesExporter = exporter(method.signals().traces());
        String metricsExporter = exporter(method.signals().metrics());
        String logsExporter = exporter(method.signals().logs());
        String content;
        String language;
        if (platform == Platform.WINDOWS_AMD64) {
            language = "powershell";
            content = "$env:OTEL_SERVICE_NAME='" + service.name() + "'\n"
                    + "$env:OTEL_RESOURCE_ATTRIBUTES='" + resourceAttributes + "'\n"
                    + "$env:OTEL_EXPORTER_OTLP_ENDPOINT='" + otlpTarget.endpoint() + "'\n"
                    + "$env:OTEL_EXPORTER_OTLP_PROTOCOL='" + otlpTarget.protocol() + "'\n"
                    + "$env:OTEL_TRACES_EXPORTER='" + tracesExporter + "'\n"
                    + "$env:OTEL_METRICS_EXPORTER='" + metricsExporter + "'\n"
                    + "$env:OTEL_LOGS_EXPORTER='" + logsExporter + "'\n"
                    + "$env:OTEL_EXPORTER_OTLP_HEADERS='Authorization=Bearer%20" + TOKEN_PLACEHOLDER + "'";
        } else {
            language = "bash";
            content = "export OTEL_SERVICE_NAME=" + service.name() + "\n"
                    + "export OTEL_RESOURCE_ATTRIBUTES='" + resourceAttributes + "'\n"
                    + "export OTEL_EXPORTER_OTLP_ENDPOINT=" + otlpTarget.endpoint() + "\n"
                    + "export OTEL_EXPORTER_OTLP_PROTOCOL=" + otlpTarget.protocol() + "\n"
                    + "export OTEL_TRACES_EXPORTER=" + tracesExporter + "\n"
                    + "export OTEL_METRICS_EXPORTER=" + metricsExporter + "\n"
                    + "export OTEL_LOGS_EXPORTER=" + logsExporter + "\n"
                    + "export OTEL_EXPORTER_OTLP_HEADERS='Authorization=Bearer%20" + TOKEN_PLACEHOLDER + "'";
        }
        return step(
                "configure",
                StepType.CONFIGURE,
                "instrumentation.step.configure",
                "instrumentation.location.application_environment",
                new GuideSnippet(
                        "otel-environment",
                        language,
                        content,
                        List.of("authorizationToken")));
    }

    private String exporter(Capability capability) {
        return capability == Capability.UNSUPPORTED ? "none" : "otlp";
    }

    private GuideStep step(String id, StepType type, String titleKey, String locationKey, GuideSnippet... snippets) {
        return new GuideStep(id, type, titleKey, locationKey, List.of(snippets));
    }

    private record CollectorOtlpTarget(String endpoint, String protocol) {
    }
}
