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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Capability;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ComponentVersionPolicy;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Environment;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Framework;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Language;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Method;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

class InstrumentationCatalogServiceTest {

    private static final Set<String> OFFICIAL_SOURCE_HOSTS = Set.of(
            "github.com",
            "npmjs.com",
            "www.npmjs.com",
            "pypi.org",
            "pecl.php.net",
            "packagist.org",
            "pkg.go.dev",
            "opentelemetry.io");

    private final InstrumentationCatalogService service = new InstrumentationCatalogService();

    @ParameterizedTest(name = "{0}")
    @MethodSource("officialSignalMatrix")
    void publishesMethodSpecificSignalMaturityFromCurrentOfficialGuidance(SignalScenario scenario) {
        var method = service.requireMethod(scenario.language(), scenario.framework(), scenario.method());

        assertEquals(scenario.metrics(), method.signals().metrics());
        assertEquals(scenario.logs(), method.signals().logs());
        assertEquals(scenario.traces(), method.signals().traces());
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("environmentAndPlatformMatrix")
    void publishesExactEnvironmentAndPlatformMatrixForEverySelection(SupportScenario scenario) {
        var method = service.requireMethod(scenario.language(), scenario.framework(), scenario.method());

        assertEquals(scenario.environments(), method.environments());
        assertEquals(scenario.platforms(), method.platforms());
    }

    @Test
    void disclosesEveryAdditionalOfficialPackageRenderedByNodeAndPythonGuides() {
        var node = service.requireMethod(Language.NODEJS, Framework.EXPRESS, Method.ZERO_CODE);
        assertEquals(
                List.of("@opentelemetry/api@1.9.1"),
                node.component().dependencies().stream()
                        .map(dependency -> dependency.name() + "@" + dependency.version())
                        .toList());

        var python = service.requireMethod(Language.PYTHON, Framework.DJANGO, Method.ZERO_CODE);
        assertEquals(
                List.of(
                        "opentelemetry-exporter-otlp@1.43.0",
                        "opentelemetry-instrumentation-logging@0.64b0"),
                python.component().dependencies().stream()
                        .map(dependency -> dependency.name() + "@" + dependency.version())
                        .toList());
    }

    @Test
    void exposesPinnedOfficialComponentsWithoutBundlingLanguageAgents() {
        var catalog = service.catalog();

        assertEquals(1, catalog.schemaVersion());
        assertEquals(7, catalog.languages().size());

        var java = service.requireMethod(Language.JAVA, Framework.SPRING_BOOT, Method.ZERO_CODE);
        assertEquals("OpenTelemetry Java Agent", java.component().name());
        assertEquals("2.27.0", java.component().version());
        assertEquals("Apache-2.0", java.component().license());
        assertEquals(ComponentVersionPolicy.PINNED, java.component().versionPolicy());
        assertTrue(java.component().official());
        assertFalse(java.component().bundledWithHertzBeat());
        assertEquals(1, java.component().artifacts().size());
        assertEquals("sha256", java.component().artifacts().getFirst().algorithm());
        assertEquals(
                "bd01fea1304e8c8803fff827a0bdda02b2266742a85c62548053c6761474bb5b",
                java.component().artifacts().getFirst().digest());
        assertTrue(java.component().artifacts().getFirst().provenanceUrl().contains("releases/tags/v2.27.0"));
        assertEquals(Capability.SUPPORTED, java.signals().metrics());
        assertEquals(Capability.SUPPORTED, java.signals().logs());
        assertEquals(Capability.SUPPORTED, java.signals().traces());

        var dotnet = service.requireMethod(Language.DOTNET, Framework.ASPNET_CORE, Method.ZERO_CODE);
        assertEquals("1.15.0", dotnet.component().version());
        assertFalse(dotnet.component().bundledWithHertzBeat());
        assertEquals(Capability.PREVIEW, dotnet.signals().logs());

        var node = service.requireMethod(Language.NODEJS, Framework.EXPRESS, Method.ZERO_CODE);
        assertEquals("0.78.0", node.component().version());

        var python = service.requireMethod(Language.PYTHON, Framework.DJANGO, Method.ZERO_CODE);
        assertEquals("0.64b0", python.component().version());

        var php = service.requireMethod(Language.PHP, Framework.PHP_GENERIC, Method.ZERO_CODE);
        assertEquals("1.2.1", php.component().version());
        assertEquals(
                List.of("1.14.0", "1.4.0", "1.2.0"),
                php.component().dependencies().stream().map(dependency -> dependency.version()).toList());
        assertTrue(php.component().dependencies().stream()
                .allMatch(dependency -> dependency.official() && !dependency.bundledWithHertzBeat()));

        var phpLaravel = service.requireMethod(Language.PHP, Framework.LARAVEL, Method.ZERO_CODE);
        assertTrue(phpLaravel.component().dependencies().stream()
                .anyMatch(dependency -> dependency.name().endsWith("auto-laravel")
                        && "1.7.0".equals(dependency.version())));

        var goSdk = service.requireMethod(Language.GO, Framework.GO_GENERIC, Method.SDK);
        assertEquals("1.43.0", goSdk.component().version());
        assertEquals(Capability.SUPPORTED, goSdk.signals().metrics());
        assertEquals(Capability.PREVIEW, goSdk.signals().logs());
        assertEquals(Capability.SUPPORTED, goSdk.signals().traces());
        assertEquals(
                List.of("1.43.0", "0.65.0", "0.19.0"),
                goSdk.component().dependencies().stream().map(dependency -> dependency.version()).toList());

        var goEbpf = service.requireMethod(Language.GO, Framework.GO_GENERIC, Method.EBPF);
        assertEquals(Capability.UNSUPPORTED, goEbpf.signals().metrics());
        assertEquals(Capability.UNSUPPORTED, goEbpf.signals().logs());
        assertEquals(Capability.PREVIEW, goEbpf.signals().traces());
        assertTrue(goEbpf.preview());

        var generic = service.requireMethod(Language.GENERIC, Framework.GENERIC, Method.SDK);
        assertEquals(ComponentVersionPolicy.LANGUAGE_SPECIFIC, generic.component().versionPolicy());
        assertNull(generic.component().version());
    }

    @Test
    void publishesOfficialSourceAndLicenseWithoutBundlingForEverySelectableMethod() {
        service.catalog().languages().stream()
                .flatMap(language -> language.frameworks().stream())
                .flatMap(framework -> framework.methods().stream())
                .forEach(method -> {
                    var component = method.component();
                    assertTrue(component.official(), component.name());
                    assertOfficialSource(component.sourceUrl(), component.name());
                    assertEquals("Apache-2.0", component.license(), component.name());
                    assertFalse(component.bundledWithHertzBeat(), component.name());
                    component.dependencies().forEach(dependency -> {
                        assertTrue(dependency.official(), dependency.name());
                        assertOfficialSource(dependency.sourceUrl(), dependency.name());
                        assertEquals("Apache-2.0", dependency.license(), dependency.name());
                        assertFalse(dependency.bundledWithHertzBeat(), dependency.name());
                    });
                });
    }

    private void assertOfficialSource(String sourceUrl, String name) {
        URI source = URI.create(sourceUrl);
        assertEquals("https", source.getScheme(), name);
        assertTrue(OFFICIAL_SOURCE_HOSTS.contains(source.getHost()), sourceUrl);
    }

    @Test
    void documentedCompleteCatalogMatchesWireSerialization() throws IOException {
        String document = Files.readString(findRepositoryFile("docs/instrumentation-api-v1.md"));
        int heading = document.indexOf("## Complete catalog example");
        int jsonStart = document.indexOf("```json", heading) + "```json".length();
        int jsonEnd = document.indexOf("```", jsonStart);
        ObjectMapper mapper = new ObjectMapper();
        JsonNode documented = mapper.readTree(document.substring(jsonStart, jsonEnd));

        assertEquals(mapper.valueToTree(service.catalog()), documented);
    }

    private Path findRepositoryFile(String relativePath) {
        Path directory = Path.of("").toAbsolutePath();
        while (directory != null) {
            Path candidate = directory.resolve(relativePath);
            if (Files.isRegularFile(candidate)) {
                return candidate;
            }
            directory = directory.getParent();
        }
        throw new IllegalStateException("Repository file not found: " + relativePath);
    }

    private static Stream<SignalScenario> officialSignalMatrix() {
        return Stream.of(
                signal("java", Language.JAVA, Framework.SPRING_BOOT, Method.ZERO_CODE,
                        Capability.SUPPORTED, Capability.SUPPORTED, Capability.SUPPORTED),
                signal("dotnet", Language.DOTNET, Framework.ASPNET_CORE, Method.ZERO_CODE,
                        Capability.SUPPORTED, Capability.PREVIEW, Capability.SUPPORTED),
                signal("node", Language.NODEJS, Framework.EXPRESS, Method.ZERO_CODE,
                        Capability.SUPPORTED, Capability.UNSUPPORTED, Capability.SUPPORTED),
                signal("python", Language.PYTHON, Framework.DJANGO, Method.ZERO_CODE,
                        Capability.SUPPORTED, Capability.PREVIEW, Capability.SUPPORTED),
                signal("php", Language.PHP, Framework.PHP_GENERIC, Method.ZERO_CODE,
                        Capability.UNSUPPORTED, Capability.UNSUPPORTED, Capability.SUPPORTED),
                signal("go-sdk", Language.GO, Framework.GO_GENERIC, Method.SDK,
                        Capability.SUPPORTED, Capability.PREVIEW, Capability.SUPPORTED),
                signal("go-ebpf-wip", Language.GO, Framework.GO_GENERIC, Method.EBPF,
                        Capability.UNSUPPORTED, Capability.UNSUPPORTED, Capability.PREVIEW),
                signal("generic-sdk-selection", Language.GENERIC, Framework.GENERIC, Method.SDK,
                        Capability.PREVIEW, Capability.PREVIEW, Capability.PREVIEW));
    }

    private static Stream<SupportScenario> environmentAndPlatformMatrix() {
        List<Environment> portableEnvironments = List.of(
                Environment.VM, Environment.DOCKER, Environment.KUBERNETES);
        List<Environment> serviceEnvironments = List.of(
                Environment.VM, Environment.DOCKER, Environment.KUBERNETES, Environment.WINDOWS_SERVICE);
        List<Platform> portablePlatforms = List.of(
                Platform.LINUX_AMD64,
                Platform.LINUX_ARM64,
                Platform.MACOS_AMD64,
                Platform.MACOS_ARM64,
                Platform.WINDOWS_AMD64);
        List<Platform> unixPlatforms = List.of(
                Platform.LINUX_AMD64, Platform.LINUX_ARM64, Platform.MACOS_AMD64, Platform.MACOS_ARM64);
        return Stream.of(
                support("java-spring", Language.JAVA, Framework.SPRING_BOOT, Method.ZERO_CODE,
                        serviceEnvironments, portablePlatforms),
                support("java-jar", Language.JAVA, Framework.JAVA_JAR, Method.ZERO_CODE,
                        serviceEnvironments, portablePlatforms),
                support("dotnet", Language.DOTNET, Framework.ASPNET_CORE, Method.ZERO_CODE,
                        serviceEnvironments, portablePlatforms),
                support("node", Language.NODEJS, Framework.NODEJS, Method.ZERO_CODE,
                        portableEnvironments, portablePlatforms),
                support("express", Language.NODEJS, Framework.EXPRESS, Method.ZERO_CODE,
                        portableEnvironments, portablePlatforms),
                support("django", Language.PYTHON, Framework.DJANGO, Method.ZERO_CODE,
                        portableEnvironments, portablePlatforms),
                support("flask", Language.PYTHON, Framework.FLASK, Method.ZERO_CODE,
                        portableEnvironments, portablePlatforms),
                support("php", Language.PHP, Framework.PHP_GENERIC, Method.ZERO_CODE,
                        portableEnvironments, unixPlatforms),
                support("laravel", Language.PHP, Framework.LARAVEL, Method.ZERO_CODE,
                        portableEnvironments, unixPlatforms),
                support("go-sdk", Language.GO, Framework.GO_GENERIC, Method.SDK,
                        portableEnvironments, portablePlatforms),
                support("go-ebpf", Language.GO, Framework.GO_GENERIC, Method.EBPF,
                        portableEnvironments, List.of(Platform.LINUX_AMD64, Platform.LINUX_ARM64)),
                support("generic", Language.GENERIC, Framework.GENERIC, Method.SDK,
                        serviceEnvironments, List.of(Platform.ANY)));
    }

    private static SignalScenario signal(
            String name,
            Language language,
            Framework framework,
            Method method,
            Capability metrics,
            Capability logs,
            Capability traces) {
        return new SignalScenario(name, language, framework, method, metrics, logs, traces);
    }

    private static SupportScenario support(
            String name,
            Language language,
            Framework framework,
            Method method,
            List<Environment> environments,
            List<Platform> platforms) {
        return new SupportScenario(name, language, framework, method, environments, platforms);
    }

    private record SignalScenario(
            String name,
            Language language,
            Framework framework,
            Method method,
            Capability metrics,
            Capability logs,
            Capability traces) {
        @Override
        public String toString() {
            return name;
        }
    }

    private record SupportScenario(
            String name,
            Language language,
            Framework framework,
            Method method,
            List<Environment> environments,
            List<Platform> platforms) {
        @Override
        public String toString() {
            return name;
        }
    }
}
