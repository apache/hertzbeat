/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.instrumentation.v2.service;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.RecipeOption;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.BlockType;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.GuideBlock;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.RenderRequest;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.RenderResponse;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.SecretPlaceholder;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeProfile;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.OtlpTransport;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationV2RequestException;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationV2RequestException.ErrorCode;
import org.springframework.stereotype.Service;

/** Explicitly renders typed blocks without a template language or caller-supplied endpoint. */
@Service
public class InstrumentationGuideV2Renderer {

    private static final Pattern RESOURCE_VALUE = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._/-]{0,127}");
    private static final String TOKEN_MARKER = "${HERTZBEAT_TOKEN}";
    private final InstrumentationCatalogV2Service catalogService;
    private final InstrumentationIntakeProfileV2Service profileService;

    public InstrumentationGuideV2Renderer(
            InstrumentationCatalogV2Service catalogService,
            InstrumentationIntakeProfileV2Service profileService) {
        this.catalogService = catalogService;
        this.profileService = profileService;
    }

    public RenderResponse render(RenderRequest request) {
        requireRequest(request);
        RecipeOption recipe = requireRecipe(request);
        ServiceIdentity service = requireService(request.service());
        IntakeProfile profile = profileService.requireAvailable(request.intakeProfileId());
        Target target = target(profile);
        return new RenderResponse(
                2,
                request.sourceKind(),
                recipe.id(),
                profile,
                service,
                recipe.signals(),
                recipe.components(),
                Map.of("authorizationToken", SecretPlaceholder.authorizationToken()),
                blocks(recipe, target, service));
    }

    private List<GuideBlock> blocks(RecipeOption recipe, Target target, ServiceIdentity service) {
        GuideBlock configure = new GuideBlock(
                "configure_exporter",
                BlockType.ENVIRONMENT,
                "instrumentation.v2.block.configure_exporter",
                "instrumentation.location.application_host",
                "shell",
                "OTEL_EXPORTER_OTLP_ENDPOINT=" + target.endpoint() + "\n"
                        + "OTEL_EXPORTER_OTLP_PROTOCOL=" + target.protocol() + "\n"
                        + "OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer " + TOKEN_MARKER + "\n"
                        + "OTEL_SERVICE_NAME=" + service.name() + "\n"
                        + "OTEL_RESOURCE_ATTRIBUTES=service.namespace=" + service.namespace()
                        + ",deployment.environment.name=" + service.environment(),
                null,
                List.of("authorizationToken"));
        GuideBlock validate = new GuideBlock(
                "validate_signals",
                BlockType.CHECK,
                "instrumentation.v2.block.validate_signals",
                "instrumentation.location.hertzbeat_ui",
                null,
                "instrumentation.v2.check.detect_scoped_signals",
                null,
                List.of());
        if (recipe.kind() == SourceKind.EXISTING_OPENTELEMETRY) {
            return List.of(
                    configure,
                    new GuideBlock(
                            "configure_pipeline",
                            BlockType.CODE,
                            "instrumentation.v2.block.configure_pipeline",
                            "instrumentation.location.otel_collector",
                            "yaml",
                            exporterPipeline(target),
                            null,
                            List.of("authorizationToken")),
                    new GuideBlock(
                            "restart_pipeline",
                            BlockType.COMMAND,
                            "instrumentation.v2.block.restart_pipeline",
                            "instrumentation.location.otel_collector",
                            "shell",
                            "instrumentation.v2.command.restart_collector",
                            null,
                            List.of()),
                    validate);
        }
        boolean quickStart = recipe.kind() == SourceKind.QUICK_START;
        GuideBlock source = new GuideBlock(
                "official_source",
                quickStart ? BlockType.DOWNLOAD : BlockType.LINK,
                "instrumentation.v2.block.official_source",
                "instrumentation.location.external",
                quickStart ? "shell" : null,
                quickStart
                        ? "git clone --branch 2.0.2 --depth 1 "
                                + "https://github.com/open-telemetry/opentelemetry-demo.git "
                                + "opentelemetry-demo-2.0.2 && "
                                + "git -C opentelemetry-demo-2.0.2 checkout "
                                + "63649d6d6a59de88fb421b88c3c3a6185b6d21ad"
                        : null,
                recipe.components().getFirst().sourceUrl(),
                List.of());
        if (recipe.kind() == SourceKind.QUICK_START) {
            return List.of(
                    source,
                    configure,
                    new GuideBlock(
                            "run_demo",
                            BlockType.COMMAND,
                            "instrumentation.v2.block.run_demo",
                            "instrumentation.location.external_demo_workspace",
                            "shell",
                            "cd opentelemetry-demo-2.0.2 && docker compose up --detach",
                            null,
                            List.of()),
                    validate,
                    new GuideBlock(
                            "cleanup_demo",
                            BlockType.COMMAND,
                            "instrumentation.v2.block.cleanup_demo",
                            "instrumentation.location.external_demo_workspace",
                            "shell",
                            "cd opentelemetry-demo-2.0.2 && "
                                    + "docker compose down --volumes --remove-orphans",
                            null,
                            List.of()));
        }
        return List.of(
                source,
                configure,
                new GuideBlock(
                        "start_application",
                        BlockType.COMMAND,
                        "instrumentation.v2.block.start_application",
                        "instrumentation.location.application_host",
                        "shell",
                        "instrumentation.v2.command.start_application",
                        null,
                        List.of()),
                validate);
    }

    private RecipeOption requireRecipe(RenderRequest request) {
        if (request.recipeId() != null) {
            RecipeOption recipe = catalogService.requireRecipe(request.sourceKind(), request.recipeId());
            if (request.sourceKind() == SourceKind.APPLICATION && request.language() != null
                    && (recipe.language() != request.language() || recipe.framework() != request.framework()
                    || recipe.method() != request.method())) {
                throw new InstrumentationV2RequestException(ErrorCode.SELECTION_INVALID);
            }
            requireRuntimeSelection(request, recipe);
            return recipe;
        }
        if (request.sourceKind() != SourceKind.APPLICATION || request.language() == null
                || request.framework() == null || request.method() == null) {
            throw new InstrumentationV2RequestException(ErrorCode.SELECTION_INVALID);
        }
        RecipeOption recipe = catalogService.catalog().recipes().stream()
                .filter(candidate -> candidate.kind() == SourceKind.APPLICATION
                        && candidate.language() == request.language()
                        && candidate.framework() == request.framework()
                        && candidate.method() == request.method())
                .findFirst()
                .orElseThrow(() -> new InstrumentationV2RequestException(ErrorCode.SELECTION_INVALID));
        requireRuntimeSelection(request, recipe);
        return recipe;
    }

    private void requireRuntimeSelection(RenderRequest request, RecipeOption recipe) {
        if (request.environment() != null && !recipe.environments().contains(request.environment())
                || request.platform() != null && !recipe.platforms().contains(request.platform())
                && !recipe.platforms().contains(org.apache.hertzbeat.observability.instrumentation.api
                        .InstrumentationApiContract.Platform.ANY)
                || request.sourceKind() == SourceKind.APPLICATION
                && (request.environment() == null || request.platform() == null)) {
            throw new InstrumentationV2RequestException(ErrorCode.SELECTION_INVALID);
        }
    }

    private void requireRequest(RenderRequest request) {
        if (request == null || request.schemaVersion() != 2) {
            throw new InstrumentationV2RequestException(ErrorCode.SCHEMA_UNSUPPORTED);
        }
        if (request.sourceKind() == null) {
            throw new InstrumentationV2RequestException(ErrorCode.SELECTION_INVALID);
        }
    }

    private ServiceIdentity requireService(ServiceIdentity service) {
        if (service == null || !safeResource(service.name()) || !safeResource(service.namespace())
                || !safeResource(service.environment())) {
            throw new InstrumentationV2RequestException(ErrorCode.CONTEXT_INVALID);
        }
        return service;
    }

    private boolean safeResource(String value) {
        return value != null && RESOURCE_VALUE.matcher(value).matches();
    }

    private Target target(IntakeProfile profile) {
        if (profile.httpsEndpoints().containsKey(OtlpTransport.HTTP_PROTOBUF)) {
            return new Target(profile.httpsEndpoints().get(OtlpTransport.HTTP_PROTOBUF), "http/protobuf");
        }
        return new Target(profile.httpsEndpoints().get(OtlpTransport.GRPC), "grpc");
    }

    private String exporterPipeline(Target target) {
        String exporter = "http/protobuf".equals(target.protocol()) ? "otlphttp/hertzbeat" : "otlp/hertzbeat";
        return "exporters:\n"
                + "  " + exporter + ":\n"
                + "    endpoint: " + target.endpoint() + "\n"
                + "    headers:\n"
                + "      Authorization: \"Bearer " + TOKEN_MARKER + "\"\n"
                + "service:\n"
                + "  pipelines:\n"
                + "    metrics:\n"
                + "      exporters: [" + exporter + "]\n"
                + "    logs:\n"
                + "      exporters: [" + exporter + "]\n"
                + "    traces:\n"
                + "      exporters: [" + exporter + "]";
    }

    private record Target(String endpoint, String protocol) {
    }
}
