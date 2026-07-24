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

import java.util.List;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Capability;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ArtifactVerification;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.CatalogResponse;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ComponentVersionPolicy;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Environment;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Framework;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.FrameworkOption;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Language;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.LanguageOption;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Method;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.MethodOption;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.OfficialComponent;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.OfficialDependency;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.RequestErrorCode;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SignalCapabilities;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationRequestException;
import org.springframework.stereotype.Service;

/**
 * Maintains the frozen version 1 official instrumentation catalog.
 */
@Service
public class InstrumentationCatalogService {

    private static final List<Environment> PORTABLE_ENVIRONMENTS = List.of(
            Environment.VM, Environment.DOCKER, Environment.KUBERNETES);
    private static final List<Environment> DOTNET_ENVIRONMENTS = List.of(
            Environment.VM, Environment.DOCKER, Environment.KUBERNETES, Environment.WINDOWS_SERVICE);
    private static final List<Platform> PORTABLE_PLATFORMS = List.of(
            Platform.LINUX_AMD64,
            Platform.LINUX_ARM64,
            Platform.MACOS_AMD64,
            Platform.MACOS_ARM64,
            Platform.WINDOWS_AMD64);
    private static final List<Platform> UNIX_PLATFORMS = List.of(
            Platform.LINUX_AMD64,
            Platform.LINUX_ARM64,
            Platform.MACOS_AMD64,
            Platform.MACOS_ARM64);

    private final CatalogResponse catalog = buildCatalog();

    public CatalogResponse catalog() {
        return catalog;
    }

    public MethodOption requireMethod(Language language, Framework framework, Method method) {
        if (language == null || framework == null || method == null) {
            throw new InstrumentationRequestException(RequestErrorCode.SELECTION_INVALID);
        }
        return catalog.languages().stream()
                .filter(option -> option.language() == language)
                .flatMap(option -> option.frameworks().stream())
                .filter(option -> option.framework() == framework)
                .flatMap(option -> option.methods().stream())
                .filter(option -> option.method() == method)
                .findFirst()
                .orElseThrow(() -> new InstrumentationRequestException(RequestErrorCode.SELECTION_INVALID));
    }

    private CatalogResponse buildCatalog() {
        MethodOption java = method(
                Method.ZERO_CODE,
                "instrumentation.method.zero_code",
                false,
                DOTNET_ENVIRONMENTS,
                PORTABLE_PLATFORMS,
                capabilities(Capability.SUPPORTED, Capability.SUPPORTED, Capability.SUPPORTED),
                component(
                        "OpenTelemetry Java Agent",
                        "https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/tag/v2.27.0",
                        "2.27.0",
                        List.of(),
                        List.of(artifact(
                                "opentelemetry-javaagent.jar",
                                "https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/"
                                        + "download/v2.27.0/opentelemetry-javaagent.jar",
                                "sha256",
                                "bd01fea1304e8c8803fff827a0bdda02b2266742a85c62548053c6761474bb5b",
                                "https://api.github.com/repos/open-telemetry/opentelemetry-java-instrumentation/"
                                        + "releases/tags/v2.27.0"))));
        MethodOption dotnet = method(
                Method.ZERO_CODE,
                "instrumentation.method.zero_code",
                false,
                DOTNET_ENVIRONMENTS,
                PORTABLE_PLATFORMS,
                capabilities(Capability.SUPPORTED, Capability.SUPPORTED, Capability.SUPPORTED),
                component(
                        "OpenTelemetry .NET Automatic Instrumentation",
                        "https://github.com/open-telemetry/opentelemetry-dotnet-instrumentation/releases/tag/v1.15.0",
                        "1.15.0"));
        MethodOption node = method(
                Method.ZERO_CODE,
                "instrumentation.method.zero_code",
                false,
                PORTABLE_ENVIRONMENTS,
                PORTABLE_PLATFORMS,
                capabilities(Capability.SUPPORTED, Capability.UNSUPPORTED, Capability.SUPPORTED),
                component(
                        "@opentelemetry/auto-instrumentations-node",
                        "https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node/v/0.78.0",
                        "0.78.0",
                        List.of(dependency(
                                "@opentelemetry/api",
                                "https://www.npmjs.com/package/@opentelemetry/api/v/1.9.1",
                                "1.9.1",
                                "instrumentation.dependency.api")),
                        List.of()));
        MethodOption python = method(
                Method.ZERO_CODE,
                "instrumentation.method.zero_code",
                false,
                PORTABLE_ENVIRONMENTS,
                PORTABLE_PLATFORMS,
                capabilities(Capability.SUPPORTED, Capability.PREVIEW, Capability.SUPPORTED),
                component(
                        "opentelemetry-distro",
                        "https://pypi.org/project/opentelemetry-distro/0.64b0/",
                        "0.64b0",
                        List.of(
                                dependency(
                                        "opentelemetry-exporter-otlp",
                                        "https://pypi.org/project/opentelemetry-exporter-otlp/1.43.0/",
                                        "1.43.0",
                                        "instrumentation.dependency.exporter"),
                                dependency(
                                        "opentelemetry-instrumentation-logging",
                                        "https://pypi.org/project/opentelemetry-instrumentation-logging/0.64b0/",
                                        "0.64b0",
                                        "instrumentation.dependency.framework_instrumentation")),
                        List.of()));
        MethodOption phpGeneric = method(
                Method.ZERO_CODE,
                "instrumentation.method.zero_code",
                false,
                PORTABLE_ENVIRONMENTS,
                UNIX_PLATFORMS,
                capabilities(Capability.UNSUPPORTED, Capability.UNSUPPORTED, Capability.SUPPORTED),
                component(
                        "OpenTelemetry PHP extension",
                        "https://pecl.php.net/package/opentelemetry/1.2.1",
                        "1.2.1",
                        phpDependencies("opentelemetry-auto-psr18", "1.2.0"),
                        List.of()));
        MethodOption phpLaravel = method(
                Method.ZERO_CODE,
                "instrumentation.method.zero_code",
                false,
                PORTABLE_ENVIRONMENTS,
                UNIX_PLATFORMS,
                capabilities(Capability.UNSUPPORTED, Capability.UNSUPPORTED, Capability.SUPPORTED),
                component(
                        "OpenTelemetry PHP extension",
                        "https://pecl.php.net/package/opentelemetry/1.2.1",
                        "1.2.1",
                        phpDependencies("opentelemetry-auto-laravel", "1.7.0"),
                        List.of()));
        MethodOption goSdk = method(
                Method.SDK,
                "instrumentation.method.sdk",
                false,
                PORTABLE_ENVIRONMENTS,
                PORTABLE_PLATFORMS,
                capabilities(Capability.SUPPORTED, Capability.PREVIEW, Capability.SUPPORTED),
                component(
                        "OpenTelemetry Go SDK",
                        "https://github.com/open-telemetry/opentelemetry-go/releases/tag/v1.43.0",
                        "1.43.0",
                        List.of(
                                dependency(
                                        "go.opentelemetry.io/otel/sdk/metric",
                                        "https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric@v1.43.0",
                                        "1.43.0",
                                        "instrumentation.dependency.metrics_sdk"),
                                dependency(
                                        "go.opentelemetry.io/contrib/exporters/autoexport",
                                        "https://pkg.go.dev/go.opentelemetry.io/contrib/exporters/autoexport@v0.65.0",
                                        "0.65.0",
                                        "instrumentation.dependency.exporter"),
                                dependency(
                                        "go.opentelemetry.io/otel/sdk/log",
                                        "https://pkg.go.dev/go.opentelemetry.io/otel/sdk/log@v0.19.0",
                                        "0.19.0",
                                        "instrumentation.dependency.logs_sdk")),
                        List.of()));
        MethodOption goEbpf = method(
                Method.EBPF,
                "instrumentation.method.ebpf",
                true,
                List.of(Environment.VM, Environment.DOCKER, Environment.KUBERNETES),
                List.of(Platform.LINUX_AMD64, Platform.LINUX_ARM64),
                capabilities(Capability.UNSUPPORTED, Capability.UNSUPPORTED, Capability.PREVIEW),
                component(
                        "OpenTelemetry Go zero-code instrumentation",
                        "https://github.com/open-telemetry/opentelemetry-go-instrumentation/releases/tag/v0.19.0",
                        "0.19.0"));
        MethodOption generic = method(
                Method.SDK,
                "instrumentation.method.sdk",
                true,
                DOTNET_ENVIRONMENTS,
                List.of(Platform.ANY),
                capabilities(Capability.PREVIEW, Capability.PREVIEW, Capability.PREVIEW),
                languageSpecificComponent(
                        "Official OpenTelemetry SDK",
                        "https://opentelemetry.io/docs/languages/"));

        return new CatalogResponse(SCHEMA_VERSION, List.of(
                language(Language.JAVA, framework(Framework.SPRING_BOOT, java), framework(Framework.JAVA_JAR, java)),
                language(Language.DOTNET, framework(Framework.ASPNET_CORE, dotnet)),
                language(Language.NODEJS, framework(Framework.NODEJS, node), framework(Framework.EXPRESS, node)),
                language(Language.PYTHON, framework(Framework.DJANGO, python), framework(Framework.FLASK, python)),
                language(
                        Language.PHP,
                        framework(Framework.PHP_GENERIC, phpGeneric),
                        framework(Framework.LARAVEL, phpLaravel)),
                language(Language.GO, framework(Framework.GO_GENERIC, goSdk, goEbpf)),
                language(Language.GENERIC, framework(Framework.GENERIC, generic))));
    }

    private LanguageOption language(Language language, FrameworkOption... frameworks) {
        return new LanguageOption(language, "instrumentation.language." + jsonName(language), List.of(frameworks));
    }

    private FrameworkOption framework(Framework framework, MethodOption... methods) {
        return new FrameworkOption(
                framework, "instrumentation.framework." + jsonName(framework), List.of(methods));
    }

    private MethodOption method(
            Method method,
            String labelKey,
            boolean preview,
            List<Environment> environments,
            List<Platform> platforms,
            SignalCapabilities capabilities,
            OfficialComponent component) {
        return new MethodOption(method, labelKey, preview, environments, platforms, capabilities, component);
    }

    private SignalCapabilities capabilities(Capability metrics, Capability logs, Capability traces) {
        return new SignalCapabilities(metrics, logs, traces);
    }

    private OfficialComponent component(String name, String sourceUrl, String version) {
        return component(name, sourceUrl, version, List.of(), List.of());
    }

    private OfficialComponent component(
            String name,
            String sourceUrl,
            String version,
            List<OfficialDependency> dependencies,
            List<ArtifactVerification> artifacts) {
        return new OfficialComponent(
                name,
                sourceUrl,
                version,
                ComponentVersionPolicy.PINNED,
                "Apache-2.0",
                "instrumentation.location.application_host",
                true,
                false,
                dependencies,
                artifacts);
    }

    private OfficialComponent languageSpecificComponent(String name, String sourceUrl) {
        return new OfficialComponent(
                name,
                sourceUrl,
                null,
                ComponentVersionPolicy.LANGUAGE_SPECIFIC,
                "Apache-2.0",
                "instrumentation.location.application_host",
                true,
                false,
                List.of(),
                List.of());
    }

    private List<OfficialDependency> phpDependencies(String instrumentationPackage, String version) {
        return List.of(
                dependency(
                        "open-telemetry/sdk",
                        "https://packagist.org/packages/open-telemetry/sdk",
                        "1.14.0",
                        "instrumentation.dependency.sdk"),
                dependency(
                        "open-telemetry/exporter-otlp",
                        "https://packagist.org/packages/open-telemetry/exporter-otlp",
                        "1.4.0",
                        "instrumentation.dependency.exporter"),
                dependency(
                        "open-telemetry/" + instrumentationPackage,
                        "https://packagist.org/packages/open-telemetry/" + instrumentationPackage,
                        version,
                        "instrumentation.dependency.framework_instrumentation"));
    }

    private OfficialDependency dependency(String name, String sourceUrl, String version, String purposeKey) {
        return new OfficialDependency(name, sourceUrl, version, "Apache-2.0", purposeKey, true, false);
    }

    private ArtifactVerification artifact(
            String name, String downloadUrl, String algorithm, String digest, String provenanceUrl) {
        return new ArtifactVerification(name, downloadUrl, algorithm, digest, provenanceUrl);
    }

    private String jsonName(Enum<?> value) {
        return value.name().toLowerCase(java.util.Locale.ROOT);
    }
}
