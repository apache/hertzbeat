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

package org.apache.hertzbeat.observability.instrumentation.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Version 1 wire contract for application instrumentation onboarding.
 *
 * <p>The request records intentionally contain no token field. Rendered snippets use a secret
 * placeholder that the browser may replace only in memory.</p>
 */
public final class InstrumentationApiContract {

    public static final int SCHEMA_VERSION = 1;
    public static final long DETECTION_POLL_AFTER_MS = 3_000L;
    public static final long DETECTION_AUTOMATIC_WINDOW_MS = 120_000L;

    private InstrumentationApiContract() {
    }

    /** Supported language families. */
    public enum Language {
        @JsonProperty("java")
        JAVA,
        @JsonProperty("dotnet")
        DOTNET,
        @JsonProperty("nodejs")
        NODEJS,
        @JsonProperty("python")
        PYTHON,
        @JsonProperty("php")
        PHP,
        @JsonProperty("go")
        GO,
        @JsonProperty("generic")
        GENERIC
    }

    /** Framework or application launch family. */
    public enum Framework {
        @JsonProperty("spring_boot")
        SPRING_BOOT,
        @JsonProperty("java_jar")
        JAVA_JAR,
        @JsonProperty("aspnet_core")
        ASPNET_CORE,
        @JsonProperty("nodejs")
        NODEJS,
        @JsonProperty("express")
        EXPRESS,
        @JsonProperty("django")
        DJANGO,
        @JsonProperty("flask")
        FLASK,
        @JsonProperty("php_generic")
        PHP_GENERIC,
        @JsonProperty("laravel")
        LARAVEL,
        @JsonProperty("go_generic")
        GO_GENERIC,
        @JsonProperty("generic")
        GENERIC
    }

    /** Instrumentation method. */
    public enum Method {
        @JsonProperty("zero_code")
        ZERO_CODE,
        @JsonProperty("sdk")
        SDK,
        @JsonProperty("ebpf")
        EBPF
    }

    /** Application deployment environment. */
    public enum Environment {
        @JsonProperty("vm")
        VM,
        @JsonProperty("docker")
        DOCKER,
        @JsonProperty("kubernetes")
        KUBERNETES,
        @JsonProperty("windows_service")
        WINDOWS_SERVICE
    }

    /** Runtime operating system and architecture. */
    public enum Platform {
        @JsonProperty("linux_amd64")
        LINUX_AMD64,
        @JsonProperty("linux_arm64")
        LINUX_ARM64,
        @JsonProperty("macos_amd64")
        MACOS_AMD64,
        @JsonProperty("macos_arm64")
        MACOS_ARM64,
        @JsonProperty("windows_amd64")
        WINDOWS_AMD64,
        @JsonProperty("any")
        ANY
    }

    /** OpenTelemetry signal. */
    public enum Signal {
        @JsonProperty("metrics")
        METRICS,
        @JsonProperty("logs")
        LOGS,
        @JsonProperty("traces")
        TRACES
    }

    /** Product maturity for one signal and method. */
    public enum Capability {
        @JsonProperty("supported")
        SUPPORTED,
        @JsonProperty("preview")
        PREVIEW,
        @JsonProperty("unsupported")
        UNSUPPORTED
    }

    /** How a third-party component version is selected. */
    public enum ComponentVersionPolicy {
        @JsonProperty("pinned")
        PINNED,
        @JsonProperty("language_specific")
        LANGUAGE_SPECIFIC
    }

    /** Stable onboarding step types. */
    public enum StepType {
        @JsonProperty("install")
        INSTALL,
        @JsonProperty("configure")
        CONFIGURE,
        @JsonProperty("start")
        START,
        @JsonProperty("container")
        CONTAINER,
        @JsonProperty("disable")
        DISABLE
    }

    /** Validation rule for a transient secret value inserted by the browser. */
    public enum SecretValueFormat {
        @JsonProperty("url_unreserved")
        URL_UNRESERVED
    }

    /** How the browser replaces a marker after validating the transient value. */
    public enum SecretReplacement {
        @JsonProperty("raw")
        RAW
    }

    /** Detection lifecycle values. */
    public enum DetectionStatus {
        @JsonProperty("waiting")
        WAITING,
        @JsonProperty("received")
        RECEIVED,
        @JsonProperty("unsupported")
        UNSUPPORTED,
        @JsonProperty("unavailable")
        UNAVAILABLE,
        @JsonProperty("error")
        ERROR
    }

    /** Backend-owned next action for detection polling. */
    public enum PollingDecision {
        @JsonProperty("continue_polling")
        CONTINUE_POLLING,
        @JsonProperty("complete")
        COMPLETE,
        @JsonProperty("manual_retry")
        MANUAL_RETRY
    }

    /** Stable machine codes returned in the ordinary Message envelope. */
    public enum RequestErrorCode {
        SCHEMA_UNSUPPORTED("instrumentation_schema_unsupported"),
        SELECTION_INVALID("instrumentation_selection_invalid"),
        CONTEXT_INVALID("instrumentation_context_invalid");

        private final String code;

        RequestErrorCode(String code) {
            this.code = code;
        }

        public String code() {
            return code;
        }
    }

    /** Stable machine-actionable detection errors. */
    public enum DetectionErrorCode {
        @JsonProperty("signal_not_received")
        SIGNAL_NOT_RECEIVED,
        @JsonProperty("signal_not_supported")
        SIGNAL_NOT_SUPPORTED,
        @JsonProperty("storage_unavailable")
        STORAGE_UNAVAILABLE,
        @JsonProperty("storage_query_failed")
        STORAGE_QUERY_FAILED,
        @JsonProperty("collector_unavailable")
        COLLECTOR_UNAVAILABLE,
        @JsonProperty("authentication_failed")
        AUTHENTICATION_FAILED,
        @JsonProperty("invalid_context")
        INVALID_CONTEXT
    }

    /** Catalog response. */
    public record CatalogResponse(int schemaVersion, List<LanguageOption> languages) {
        public CatalogResponse {
            languages = List.copyOf(languages);
        }
    }

    /** One language and its supported framework selections. */
    public record LanguageOption(Language language, String labelKey, List<FrameworkOption> frameworks) {
        public LanguageOption {
            frameworks = List.copyOf(frameworks);
        }
    }

    /** One framework and its available methods. */
    public record FrameworkOption(Framework framework, String labelKey, List<MethodOption> methods) {
        public FrameworkOption {
            methods = List.copyOf(methods);
        }
    }

    /** One selectable instrumentation method. */
    public record MethodOption(
            Method method,
            String labelKey,
            boolean preview,
            List<Environment> environments,
            List<Platform> platforms,
            SignalCapabilities signals,
            OfficialComponent component) {
        public MethodOption {
            environments = List.copyOf(environments);
            platforms = List.copyOf(platforms);
        }
    }

    /** Metrics, logs, and traces maturity matrix. */
    public record SignalCapabilities(Capability metrics, Capability logs, Capability traces) {
        public Capability capability(Signal signal) {
            return switch (signal) {
                case METRICS -> metrics;
                case LOGS -> logs;
                case TRACES -> traces;
            };
        }
    }

    /** Third-party component disclosure. */
    public record OfficialComponent(
            String name,
            String sourceUrl,
            String version,
            ComponentVersionPolicy versionPolicy,
            String license,
            String installationLocationKey,
            boolean official,
            boolean bundledWithHertzBeat,
            List<OfficialDependency> dependencies,
            List<ArtifactVerification> artifacts) {
        public OfficialComponent {
            dependencies = List.copyOf(dependencies);
            artifacts = List.copyOf(artifacts);
        }
    }

    /** Additional pinned package required by a rendered framework guide. */
    public record OfficialDependency(
            String name,
            String sourceUrl,
            String version,
            String license,
            String purposeKey,
            boolean official,
            boolean bundledWithHertzBeat) {
    }

    /** Versioned integrity metadata for an artifact downloaded outside a package manager. */
    public record ArtifactVerification(
            String name,
            String downloadUrl,
            String algorithm,
            String digest,
            String provenanceUrl) {
    }

    /** Guide rendering request. */
    public record GuideRenderRequest(
            int schemaVersion,
            Language language,
            Framework framework,
            Method method,
            Environment environment,
            Platform platform,
            CollectorTarget collector,
            ServiceIdentity service) {
    }

    /** Safe Collector endpoints. No credential value is part of this record. */
    public record CollectorTarget(
            String collectorId,
            String otlpHttpEndpoint,
            String otlpGrpcEndpoint,
            String authorizationHeader) {
    }

    /** OpenTelemetry service resource identity. */
    public record ServiceIdentity(String name, String namespace, String environment) {
    }

    /** Rendered structured guide. */
    public record GuideRenderResponse(
            int schemaVersion,
            InstrumentationSelection selection,
            SignalCapabilities signals,
            OfficialComponent component,
            Map<String, SecretPlaceholder> secretPlaceholders,
            List<GuideStep> steps) {
        public GuideRenderResponse {
            secretPlaceholders = Map.copyOf(secretPlaceholders);
            steps = List.copyOf(steps);
            validateSecretPlaceholders(secretPlaceholders, steps);
        }

        private static void validateSecretPlaceholders(
                Map<String, SecretPlaceholder> placeholders, List<GuideStep> steps) {
            Set<String> markers = new HashSet<>();
            placeholders.forEach((name, placeholder) -> {
                if (name.isBlank() || placeholder.marker() == null || placeholder.marker().isBlank()
                        || !markers.add(placeholder.marker())) {
                    throw new IllegalArgumentException("Secret placeholder names and markers must be unique");
                }
            });

            Set<String> referenced = new HashSet<>();
            for (GuideStep step : steps) {
                for (GuideSnippet snippet : step.snippets()) {
                    validateSecretReferences(placeholders, referenced, snippet);
                }
            }
            if (!referenced.containsAll(placeholders.keySet())) {
                throw new IllegalArgumentException("Every secret placeholder must be used by a snippet");
            }
        }

        private static void validateSecretReferences(
                Map<String, SecretPlaceholder> placeholders, Set<String> referenced, GuideSnippet snippet) {
            if (snippet.content() == null) {
                throw new IllegalArgumentException("Guide snippet content is required");
            }
            for (String name : snippet.secretPlaceholders()) {
                SecretPlaceholder placeholder = placeholders.get(name);
                if (placeholder == null || !snippet.content().contains(placeholder.marker())) {
                    throw new IllegalArgumentException("Snippet secret reference must match a declared marker");
                }
                referenced.add(name);
            }
            placeholders.forEach((name, placeholder) -> {
                if (snippet.content().contains(placeholder.marker())
                        && !snippet.secretPlaceholders().contains(name)) {
                    throw new IllegalArgumentException("Snippet secret marker must be declared");
                }
            });
        }
    }

    /** Safe replacement semantics for one transient secret marker. */
    public record SecretPlaceholder(
            String marker,
            SecretValueFormat valueFormat,
            SecretReplacement replacement) {
    }

    /** Echo of the validated non-secret catalog selection. */
    public record InstrumentationSelection(
            Language language,
            Framework framework,
            Method method,
            Environment environment,
            Platform platform) {
    }

    /** One executable guide step. */
    public record GuideStep(
            String id,
            StepType type,
            String titleKey,
            String executionLocationKey,
            List<GuideSnippet> snippets) {
        public GuideStep {
            snippets = List.copyOf(snippets);
        }
    }

    /** Copyable code or configuration content. */
    public record GuideSnippet(String id, String language, String content, List<String> secretPlaceholders) {
        public GuideSnippet {
            secretPlaceholders = List.copyOf(secretPlaceholders);
        }
    }

    /** Detection request scoped to one onboarding attempt. */
    public record DetectionRequest(
            int schemaVersion,
            Language language,
            Framework framework,
            Method method,
            Environment environment,
            Platform platform,
            ServiceIdentity service,
            String collectorId,
            long startedAt) {
    }

    /** Detection response. */
    public record DetectionResponse(
            int schemaVersion,
            long detectedAt,
            DetectionContext context,
            SignalDetections signals,
            PollingInstruction polling,
            QueryJumpContext queryJumpContext,
            List<QueryJump> queryJumps) {
        public DetectionResponse {
            queryJumps = List.copyOf(queryJumps);
        }
    }

    /** Safe echo of the exact detection selection and identity. */
    public record DetectionContext(
            Language language,
            Framework framework,
            Method method,
            Environment environment,
            Platform platform,
            ServiceIdentity service,
            String collectorId,
            long startedAt) {
    }

    /** Fixed three-signal result shape. */
    public record SignalDetections(
            SignalDetection metrics,
            SignalDetection logs,
            SignalDetection traces) {
        public SignalDetection signal(Signal signal) {
            return switch (signal) {
                case METRICS -> metrics;
                case LOGS -> logs;
                case TRACES -> traces;
            };
        }
    }

    /** One signal's latest scoped detection state. */
    public record SignalDetection(
            DetectionStatus status,
            Long lastReceivedAt,
            DetectionErrorCode errorCode) {
        public SignalDetection {
            if (status == null) {
                throw new IllegalArgumentException("Detection status is required");
            }
            if (lastReceivedAt != null && lastReceivedAt <= 0) {
                throw new IllegalArgumentException("Detection timestamp must be positive epoch milliseconds");
            }
            switch (status) {
                case RECEIVED -> {
                    if (lastReceivedAt == null || errorCode != null) {
                        throw new IllegalArgumentException("Received requires a timestamp and no error");
                    }
                }
                case WAITING -> requireEmptyTimestampAndError(
                        lastReceivedAt, errorCode, DetectionErrorCode.SIGNAL_NOT_RECEIVED, "Waiting");
                case UNSUPPORTED -> requireEmptyTimestampAndError(
                        lastReceivedAt, errorCode, DetectionErrorCode.SIGNAL_NOT_SUPPORTED, "Unsupported");
                case UNAVAILABLE -> {
                    if (lastReceivedAt != null || errorCode == null) {
                        throw new IllegalArgumentException("Unavailable requires an error and no timestamp");
                    }
                }
                case ERROR -> {
                    if (errorCode == null) {
                        throw new IllegalArgumentException("Error requires an error code");
                    }
                }
                default -> throw new IllegalArgumentException("Unsupported detection status");
            }
        }

        private static void requireEmptyTimestampAndError(
                Long timestamp,
                DetectionErrorCode actual,
                DetectionErrorCode expected,
                String label) {
            if (timestamp != null || actual != expected) {
                throw new IllegalArgumentException(label + " has invalid timestamp or error code");
            }
        }
    }

    /** Fixed polling cadence and automatic detection deadline, all times in epoch milliseconds. */
    public record PollingInstruction(
            PollingDecision decision,
            Long pollAfterMs,
            long deadlineAt) {
        public PollingInstruction {
            if (decision == null || deadlineAt <= 0) {
                throw new IllegalArgumentException("Polling decision and deadline are required");
            }
            if (decision == PollingDecision.CONTINUE_POLLING) {
                if (pollAfterMs == null || pollAfterMs <= 0) {
                    throw new IllegalArgumentException("Continue polling requires a positive delay");
                }
            } else if (pollAfterMs != null) {
                throw new IllegalArgumentException("Terminal polling decisions cannot carry a delay");
            }
        }
    }

    /** Shared query context retained when leaving the onboarding flow. */
    public record QueryJumpContext(
            String serviceName,
            String serviceNamespace,
            String environment,
            String collectorId,
            long startedAt,
            long detectedAt) {
    }

    /** Typed signal query handoff; only received signals are enabled. */
    public record QueryJump(Signal signal, boolean enabled, QueryJumpContext context) {
    }
}
