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

package org.apache.hertzbeat.observability.instrumentation.v2.service;

import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.CollectorTarget;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideRenderRequest;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideSnippet;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideStep;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.MethodOption;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.guide.InstrumentationGuideAdapter.LanguageGuideSteps;
import org.apache.hertzbeat.observability.instrumentation.guide.InstrumentationGuideAdapterRegistry;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.RecipeOption;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.BlockType;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.GuideBlock;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.RenderRequest;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeProfile;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.OtlpTransport;
import org.springframework.stereotype.Component;

/** Maps the existing official language adapters onto closed v2 renderer blocks. */
@Component
public class InstrumentationApplicationGuideV2Adapter {

    private static final String TOKEN_MARKER = "${HERTZBEAT_TOKEN}";
    private static final String TOKEN_NAME = "authorizationToken";
    private final InstrumentationCatalogV2Service catalogService;
    private final InstrumentationGuideAdapterRegistry adapterRegistry;

    public InstrumentationApplicationGuideV2Adapter(
            InstrumentationCatalogV2Service catalogService,
            InstrumentationGuideAdapterRegistry adapterRegistry) {
        this.catalogService = catalogService;
        this.adapterRegistry = adapterRegistry;
    }

    public List<GuideBlock> blocks(
            RenderRequest request,
            RecipeOption recipe,
            IntakeProfile profile,
            String endpoint,
            String protocol,
            ServiceIdentity service) {
        MethodOption method = catalogService.requireApplicationMethod(recipe);
        GuideRenderRequest v1Request = new GuideRenderRequest(
                1,
                recipe.language(),
                recipe.framework(),
                recipe.method(),
                request.environment(),
                request.platform(),
                collector(profile),
                service);
        LanguageGuideSteps languageSteps = adapterRegistry.require(recipe.language()).render(v1Request, method);
        List<GuideBlock> blocks = new ArrayList<>();
        blocks.add(link(method.component().sourceUrl()));
        addStep(blocks, recipe.id(), languageSteps.install());
        blocks.add(environment(endpoint, protocol, service, request.platform(), profile.collectorId()));
        addStep(blocks, recipe.id(), languageSteps.start());
        addStep(blocks, recipe.id(), languageSteps.container());
        addStep(blocks, recipe.id(), languageSteps.disable());
        blocks.add(check());
        return List.copyOf(blocks);
    }

    private CollectorTarget collector(IntakeProfile profile) {
        return new CollectorTarget(
                profile.collectorId() == null ? profile.id() : profile.collectorId(),
                endpointUrl(profile, OtlpTransport.HTTP_PROTOBUF),
                endpointUrl(profile, OtlpTransport.GRPC),
                profile.authHeaderName());
    }

    private String endpointUrl(IntakeProfile profile, OtlpTransport transport) {
        return profile.endpoints().containsKey(transport)
                ? profile.endpoints().get(transport).url()
                : null;
    }

    private void addStep(List<GuideBlock> blocks, String recipeId, GuideStep step) {
        for (GuideSnippet snippet : step.snippets()) {
            String id = step.id() + "_" + snippet.id().replace('-', '_');
            if ("text".equals(snippet.language()) || commentOnly(snippet.content())) {
                blocks.add(new GuideBlock(
                        id,
                        BlockType.NOTE,
                        step.titleKey(),
                        "instrumentation.v2.guide." + recipeId + "." + id,
                        step.executionLocationKey(),
                        null,
                        null,
                        null,
                        List.of()));
            } else {
                BlockType type = switch (snippet.language()) {
                    case "bash", "powershell" -> BlockType.COMMAND;
                    default -> BlockType.CODE;
                };
                blocks.add(new GuideBlock(
                        id,
                        type,
                        step.titleKey(),
                        null,
                        step.executionLocationKey(),
                        snippet.language(),
                        snippet.content(),
                        null,
                        snippet.secretPlaceholders()));
            }
        }
    }

    private boolean commentOnly(String content) {
        return content.lines()
                .map(String::strip)
                .filter(line -> !line.isEmpty())
                .allMatch(line -> line.startsWith("#") || line.startsWith("//"));
    }

    private GuideBlock environment(
            String endpoint, String protocol, ServiceIdentity service, Platform platform, String collectorId) {
        boolean windows = platform == Platform.WINDOWS_AMD64;
        String resourceAttributes = "service.namespace=" + service.namespace()
                + ",deployment.environment.name=" + service.environment()
                + (collectorId == null ? "" : ",hertzbeat.collector.id=" + collectorId);
        String content = windows
                ? "$env:OTEL_EXPORTER_OTLP_ENDPOINT='" + powershellValue(endpoint) + "'\n"
                        + "$env:OTEL_EXPORTER_OTLP_PROTOCOL='" + protocol + "'\n"
                        + "$env:OTEL_EXPORTER_OTLP_HEADERS='Authorization=Bearer%20" + TOKEN_MARKER + "'\n"
                        + "$env:OTEL_SERVICE_NAME='" + service.name() + "'\n"
                        + "$env:OTEL_RESOURCE_ATTRIBUTES='" + powershellValue(resourceAttributes) + "'"
                : "export OTEL_EXPORTER_OTLP_ENDPOINT=" + shellQuote(endpoint) + "\n"
                        + "export OTEL_EXPORTER_OTLP_PROTOCOL=" + shellQuote(protocol) + "\n"
                        + "export OTEL_EXPORTER_OTLP_HEADERS='Authorization=Bearer%20" + TOKEN_MARKER + "'\n"
                        + "export OTEL_SERVICE_NAME=" + service.name() + "\n"
                        + "export OTEL_RESOURCE_ATTRIBUTES=" + shellQuote(resourceAttributes);
        return new GuideBlock(
                "configure_exporter",
                BlockType.ENVIRONMENT,
                "instrumentation.v2.block.configure_exporter",
                null,
                "instrumentation.location.application_host",
                windows ? "powershell" : "bash",
                content,
                null,
                List.of(TOKEN_NAME));
    }

    private GuideBlock link(String href) {
        return new GuideBlock(
                "official_source",
                BlockType.LINK,
                "instrumentation.v2.block.official_source",
                null,
                "instrumentation.location.external",
                null,
                null,
                href,
                List.of());
    }

    private GuideBlock check() {
        return new GuideBlock(
                "validate_signals",
                BlockType.CHECK,
                "instrumentation.v2.block.validate_signals",
                "instrumentation.v2.check.detect_scoped_signals",
                "instrumentation.location.hertzbeat_ui",
                null,
                null,
                null,
                List.of());
    }

    private String shellQuote(String value) {
        return "'" + value.replace("'", "'\"'\"'") + "'";
    }

    private String powershellValue(String value) {
        return value.replace("'", "''");
    }
}
