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

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.RecipeOption;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.BlockType;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.GuideBlock;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.RenderRequest;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.RenderResponse;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.SecretPlaceholder;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Authentication;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeProfile;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.OtlpTransport;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.TransportSecurity;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationV2RequestException;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationV2RequestException.ErrorCode;
import org.apache.hertzbeat.observability.instrumentation.v2.guide.InstrumentationSourceGuideV2Registry;
import org.apache.hertzbeat.observability.instrumentation.v2.guide.InstrumentationSourceGuideV2Registry.GuideContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/** Renders validated v2 blocks while delegating application instructions to the v1 adapters. */
@Service
public class InstrumentationGuideV2Renderer {

    private static final Pattern RESOURCE_VALUE = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._/-]{0,127}");
    private static final String TOKEN_MARKER = "${HERTZBEAT_TOKEN}";
    private static final String TOKEN_NAME = "authorizationToken";
    private final InstrumentationCatalogV2Service catalogService;
    private final InstrumentationIntakeProfileV2Service profileService;
    private final InstrumentationApplicationGuideV2Adapter applicationAdapter;
    private final InstrumentationSourceGuideV2Registry sourceTemplates;

    public InstrumentationGuideV2Renderer(
            InstrumentationCatalogV2Service catalogService,
            InstrumentationIntakeProfileV2Service profileService,
            InstrumentationApplicationGuideV2Adapter applicationAdapter) {
        this(catalogService, profileService, applicationAdapter, InstrumentationSourceGuideV2Registry.official());
    }

    @Autowired
    public InstrumentationGuideV2Renderer(
            InstrumentationCatalogV2Service catalogService,
            InstrumentationIntakeProfileV2Service profileService,
            InstrumentationApplicationGuideV2Adapter applicationAdapter,
            InstrumentationSourceGuideV2Registry sourceTemplates) {
        this.catalogService = catalogService;
        this.profileService = profileService;
        this.applicationAdapter = applicationAdapter;
        this.sourceTemplates = sourceTemplates;
    }

    public RenderResponse render(RenderRequest request) {
        requireRequest(request);
        RecipeOption recipe = requireRecipe(request);
        ServiceIdentity service = requireService(request.service());
        IntakeProfile profile = profileService.requireAvailable(request.intakeProfileId());
        Target target = target(profile);
        List<GuideBlock> blocks = new ArrayList<>();
        if (target.security() == TransportSecurity.PLAINTEXT
                && profile.authentication() == Authentication.BEARER_TOKEN) {
            blocks.add(plaintextAuthorizationWarning());
        }
        blocks.addAll(blocks(request, recipe, profile, target, service));
        return new RenderResponse(
                2,
                request.sourceKind(),
                recipe.id(),
                profile,
                service,
                recipe.signals(),
                recipe.components(),
                profile.authentication() == Authentication.BEARER_TOKEN
                        ? Map.of(TOKEN_NAME, SecretPlaceholder.authorizationToken())
                        : Map.of(),
                blocks);
    }

    private List<GuideBlock> blocks(
            RenderRequest request,
            RecipeOption recipe,
            IntakeProfile profile,
            Target target,
            ServiceIdentity service) {
        return switch (recipe.kind()) {
            case APPLICATION -> applicationAdapter.blocks(
                    request, recipe, profile, target.endpoint(), target.protocol(), service);
            case QUICK_START -> quickStartBlocks(
                    target, service, recipe, profile.collectorId(), profile.authentication());
            case EXISTING_OPENTELEMETRY -> sourceTemplates.render(
                    recipe.id(),
                    new GuideContext(target.endpoint(), target.protocol(), service, profile.authentication()));
        };
    }

    private List<GuideBlock> quickStartBlocks(
            Target target,
            ServiceIdentity service,
            RecipeOption recipe,
            String collectorId,
            Authentication authentication) {
        List<GuideBlock> blocks = new ArrayList<>();
        blocks.add(copyable(
                "install_telemetrygen",
                BlockType.DOWNLOAD,
                "instrumentation.v2.block.install_telemetrygen",
                "instrumentation.location.application_host",
                "bash",
                "GOBIN=\"$PWD/.hertzbeat-telemetrygen\" go install "
                        + "github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen@v0.156.0",
                recipe.components().getFirst().sourceUrl(),
                List.of()));
        for (String signal : List.of("metrics", "logs", "traces")) {
            blocks.add(copyable(
                    "send_" + signal,
                    BlockType.COMMAND,
                    "instrumentation.v2.block.send_" + signal,
                    "instrumentation.location.application_host",
                    "bash",
                    telemetrygenCommand(signal, target, service, collectorId, authentication),
                    null,
                    authentication == Authentication.BEARER_TOKEN ? List.of(TOKEN_NAME) : List.of()));
        }
        blocks.add(check("validate_signals", "instrumentation.v2.check.detect_scoped_signals"));
        blocks.add(note(
                "no_persistence",
                "instrumentation.v2.block.no_persistence",
                "instrumentation.v2.note.telemetrygen_no_persistence",
                "instrumentation.location.application_host"));
        blocks.add(copyable(
                "cleanup_telemetrygen",
                BlockType.COMMAND,
                "instrumentation.v2.block.cleanup_telemetrygen",
                "instrumentation.location.application_host",
                "bash",
                "rm -rf -- .hertzbeat-telemetrygen",
                null,
                List.of()));
        return List.copyOf(blocks);
    }

    private String telemetrygenCommand(
            String signal,
            Target target,
            ServiceIdentity service,
            String collectorId,
            Authentication authentication) {
        String countFlag = switch (signal) {
            case "metrics" -> "--metrics 1";
            case "logs" -> "--logs 1";
            case "traces" -> "--traces 1";
            default -> throw new IllegalArgumentException("Unsupported telemetrygen signal");
        };
        String transport = "http/protobuf".equals(target.protocol())
                ? " --otlp-http --otlp-http-url-path " + shellQuote(target.signalPath(signal))
                : "";
        String security = target.security() == TransportSecurity.PLAINTEXT ? " --otlp-insecure" : "";
        String collectorAttribute = collectorId == null
                ? ""
                : telemetrygenAttribute("hertzbeat.collector.id", collectorId);
        String authenticationFlag = authentication == Authentication.BEARER_TOKEN
                ? " --otlp-header 'Authorization=\"Bearer " + TOKEN_MARKER + "\"'"
                : "";
        String command = "./.hertzbeat-telemetrygen/telemetrygen " + signal
                + transport
                + security
                + " --otlp-endpoint " + shellQuote(target.authority())
                + authenticationFlag
                + " --service " + shellQuote(service.name())
                + telemetrygenAttribute("service.namespace", service.namespace())
                + telemetrygenAttribute("deployment.environment.name", service.environment())
                + collectorAttribute + " "
                + countFlag;
        return "if " + command + " >/dev/null 2>&1; then "
                + "printf '%s\\n' 'telemetrygen: success'; else "
                + "printf '%s\\n' 'telemetrygen: failed' >&2; false; fi";
    }

    private String telemetrygenAttribute(String key, String value) {
        return " --otlp-attributes " + shellQuote(key + "=\"" + value + "\"");
    }

    private GuideBlock copyable(
            String id,
            BlockType type,
            String titleKey,
            String locationKey,
            String language,
            String content,
            String href,
            List<String> placeholders) {
        return new GuideBlock(
                id, type, titleKey, null, locationKey, language, content, href, placeholders);
    }

    private GuideBlock note(String id, String titleKey, String bodyKey, String locationKey) {
        return new GuideBlock(
                id, BlockType.NOTE, titleKey, bodyKey, locationKey, null, null, null, List.of());
    }

    private GuideBlock check(String id, String bodyKey) {
        return new GuideBlock(
                id,
                BlockType.CHECK,
                "instrumentation.v2.block.validate_signals",
                bodyKey,
                "instrumentation.location.hertzbeat_ui",
                null,
                null,
                null,
                List.of());
    }

    private GuideBlock plaintextAuthorizationWarning() {
        return new GuideBlock(
                "plaintext_transport_warning",
                BlockType.WARNING,
                "instrumentation.v2.block.plaintext_transport_warning",
                "instrumentation.v2.warning.plaintext_authorization",
                "instrumentation.location.application_host",
                null,
                null,
                null,
                List.of());
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
                && !recipe.platforms().contains(Platform.ANY)
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

    private String shellQuote(String value) {
        return "'" + value.replace("'", "'\"'\"'") + "'";
    }

    private Target target(IntakeProfile profile) {
        if (profile.endpoints().containsKey(OtlpTransport.HTTP_PROTOBUF)) {
            var endpoint = profile.endpoints().get(OtlpTransport.HTTP_PROTOBUF);
            return new Target(endpoint.url(), "http/protobuf", endpoint.security());
        }
        var endpoint = profile.endpoints().get(OtlpTransport.GRPC);
        return new Target(endpoint.url(), "grpc", endpoint.security());
    }

    private record Target(String endpoint, String protocol, TransportSecurity security) {

        String authority() {
            URI uri = URI.create(endpoint);
            return uri.getRawAuthority();
        }

        String signalPath(String signal) {
            String path = URI.create(endpoint).getRawPath();
            String normalized = path == null || path.isBlank() || "/".equals(path)
                    ? ""
                    : path.endsWith("/") ? path.substring(0, path.length() - 1) : path;
            return normalized + "/v1/" + signal;
        }
    }
}
