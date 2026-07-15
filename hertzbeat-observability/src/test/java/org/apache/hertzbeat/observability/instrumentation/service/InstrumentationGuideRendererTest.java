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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.CollectorTarget;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Environment;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Framework;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideRenderRequest;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Language;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Method;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SecretReplacement;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SecretValueFormat;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.StepType;
import org.apache.hertzbeat.observability.instrumentation.guide.InstrumentationGuideAdapterRegistry;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.api.Test;

class InstrumentationGuideRendererTest {

    private static final String TOKEN_PLACEHOLDER = "${HERTZBEAT_TOKEN}";

    private final InstrumentationGuideRenderer renderer =
            new InstrumentationGuideRenderer(
                    new InstrumentationCatalogService(), InstrumentationGuideAdapterRegistry.official());

    @ParameterizedTest(name = "{0}")
    @MethodSource("renderScenarios")
    void rendersOfficialMatrixWithoutFabricatedInstallScripts(RenderScenario scenario) {
        var guide = renderer.render(request(
                scenario.language(),
                scenario.framework(),
                scenario.method(),
                scenario.environment(),
                scenario.platform()));

        assertEquals(5, guide.steps().size());
        assertEquals(
                List.of(
                        StepType.INSTALL,
                        StepType.CONFIGURE,
                        StepType.START,
                        StepType.CONTAINER,
                        StepType.DISABLE),
                guide.steps().stream().map(step -> step.type()).toList());
        String rendered = renderedContent(guide);
        for (String expected : scenario.expectedContent()) {
            assertTrue(rendered.contains(expected), () -> scenario.name() + " missing: " + expected);
        }
        for (String forbidden : scenario.forbiddenContent()) {
            assertFalse(rendered.contains(forbidden), () -> scenario.name() + " must not contain: " + forbidden);
        }
        assertTrue(rendered.contains(TOKEN_PLACEHOLDER));
        assertFalse(rendered.contains("Bearer secret"));
        assertFalse(rendered.contains(". ./otel-dotnet-auto-instrument.sh"));
    }

    @Test
    void rendersStructuredJavaStepsAndNeverAcceptsOrEchoesPlaintextToken() {
        var guide = renderer.render(new GuideRenderRequest(
                1,
                Language.JAVA,
                Framework.SPRING_BOOT,
                Method.ZERO_CODE,
                Environment.DOCKER,
                Platform.LINUX_AMD64,
                new CollectorTarget(
                        "collector-east",
                        "http://collector.internal:4318",
                        "http://collector.internal:4317",
                        "Authorization"),
                new ServiceIdentity("checkout-api", "commerce", "prod")));

        assertEquals(1, guide.schemaVersion());
        assertEquals(Language.JAVA, guide.selection().language());
        assertEquals("OpenTelemetry Java Agent", guide.component().name());
        assertFalse(guide.component().bundledWithHertzBeat());
        var secret = guide.secretPlaceholders().get("authorizationToken");
        assertEquals(TOKEN_PLACEHOLDER, secret.marker());
        assertEquals(SecretValueFormat.URL_UNRESERVED, secret.valueFormat());
        assertEquals(SecretReplacement.RAW, secret.replacement());
        assertTrue(guide.steps().stream().anyMatch(step -> step.type() == StepType.INSTALL));
        assertTrue(guide.steps().stream().anyMatch(step -> step.type() == StepType.CONFIGURE));
        assertTrue(guide.steps().stream().anyMatch(step -> step.type() == StepType.START));
        assertTrue(guide.steps().stream().anyMatch(step -> step.type() == StepType.CONTAINER));
        assertTrue(guide.steps().stream().anyMatch(step -> step.type() == StepType.DISABLE));

        String rendered = renderedContent(guide);
        assertTrue(rendered.contains("OTEL_SERVICE_NAME=checkout-api"));
        assertTrue(rendered.contains("service.namespace=commerce"));
        assertTrue(rendered.contains("deployment.environment.name=prod"));
        assertTrue(rendered.contains("http://collector.internal:4318"));
        assertTrue(rendered.contains(TOKEN_PLACEHOLDER));
        assertFalse(rendered.contains("Bearer secret"));
    }

    @Test
    void rejectsEndpointsThatCouldCarrySecretsInUrl() {
        var request = new GuideRenderRequest(
                1,
                Language.NODEJS,
                Framework.EXPRESS,
                Method.ZERO_CODE,
                Environment.VM,
                Platform.LINUX_AMD64,
                new CollectorTarget(
                        "collector-east",
                        "http://token@collector.internal:4318?authorization=secret",
                        "http://collector.internal:4317",
                        "Authorization"),
                new ServiceIdentity("checkout-api", "commerce", "prod"));

        assertThrows(IllegalArgumentException.class, () -> renderer.render(request));
    }

    @Test
    void rendersOfficialDotnetPowerShellFlowOnWindows() {
        String rendered = renderedContent(renderer.render(request(
                Language.DOTNET,
                Framework.ASPNET_CORE,
                Method.ZERO_CODE,
                Environment.WINDOWS_SERVICE,
                Platform.WINDOWS_AMD64)));

        assertTrue(rendered.contains("OpenTelemetry.DotNet.Auto.psm1"));
        assertTrue(rendered.contains("Install-OpenTelemetryCore"));
        assertTrue(rendered.contains("Register-OpenTelemetryForCurrentSession"));
    }

    @Test
    void documentedRenderExampleMatchesWireSerialization() throws IOException {
        List<String> examples = documentedJsonBlocks(
                "## Render request and response example", "## Detection request and response example");
        ObjectMapper mapper = new ObjectMapper();
        GuideRenderRequest documentedRequest = mapper.readValue(examples.get(0), GuideRenderRequest.class);

        assertEquals(mapper.readTree(examples.get(1)), mapper.valueToTree(renderer.render(documentedRequest)));
    }

    private static Stream<RenderScenario> renderScenarios() {
        return Stream.of(
                new RenderScenario(
                        "java zero-code",
                        Language.JAVA,
                        Framework.SPRING_BOOT,
                        Method.ZERO_CODE,
                        Environment.DOCKER,
                        Platform.LINUX_AMD64,
                        List.of(
                                "releases/download/v2.27.0/opentelemetry-javaagent.jar",
                                "bd01fea1304e8c8803fff827a0bdda02b2266742a85c62548053c6761474bb5b",
                                "sha256sum -c -",
                                "-javaagent:/opt/opentelemetry-javaagent.jar",
                                "OTEL_LOGS_EXPORTER=otlp"),
                        List.of()),
                new RenderScenario(
                        "dotnet zero-code",
                        Language.DOTNET,
                        Framework.ASPNET_CORE,
                        Method.ZERO_CODE,
                        Environment.VM,
                        Platform.LINUX_AMD64,
                        List.of(
                                "releases/download/v1.15.0/otel-dotnet-auto-install.sh",
                                "sh ./otel-dotnet-auto-install.sh",
                                ". $HOME/.otel-dotnet-auto/instrument.sh",
                                "OTEL_LOGS_EXPORTER=otlp"),
                        List.of()),
                new RenderScenario(
                        "node zero-code",
                        Language.NODEJS,
                        Framework.EXPRESS,
                        Method.ZERO_CODE,
                        Environment.DOCKER,
                        Platform.LINUX_AMD64,
                        List.of(
                                "@opentelemetry/api@1.9.1",
                                "@opentelemetry/auto-instrumentations-node@0.78.0",
                                "@opentelemetry/auto-instrumentations-node/register",
                                "NODE_OPTIONS",
                                "OTEL_LOGS_EXPORTER=none"),
                        List.of("OTEL_LOGS_EXPORTER=otlp")),
                new RenderScenario(
                        "python zero-code",
                        Language.PYTHON,
                        Framework.DJANGO,
                        Method.ZERO_CODE,
                        Environment.DOCKER,
                        Platform.LINUX_AMD64,
                        List.of(
                                "opentelemetry-distro==0.64b0",
                                "opentelemetry-exporter-otlp==1.43.0",
                                "opentelemetry-instrumentation-logging==0.64b0",
                                "opentelemetry-bootstrap -a install",
                                "opentelemetry-instrument --logs_exporter otlp python app.py",
                                "OTEL_LOGS_EXPORTER=otlp"),
                        List.of()),
                new RenderScenario(
                        "php zero-code",
                        Language.PHP,
                        Framework.LARAVEL,
                        Method.ZERO_CODE,
                        Environment.DOCKER,
                        Platform.LINUX_AMD64,
                        List.of(
                                "pecl install opentelemetry-1.2.1",
                                "open-telemetry/sdk:1.14.0",
                                "open-telemetry/exporter-otlp:1.4.0",
                                "open-telemetry/opentelemetry-auto-laravel:1.7.0",
                                "OTEL_PHP_AUTOLOAD_ENABLED=true",
                                "OTEL_METRICS_EXPORTER=none",
                                "OTEL_LOGS_EXPORTER=none"),
                        List.of("OTEL_METRICS_EXPORTER=otlp", "OTEL_LOGS_EXPORTER=otlp")),
                new RenderScenario(
                        "go sdk",
                        Language.GO,
                        Framework.GO_GENERIC,
                        Method.SDK,
                        Environment.DOCKER,
                        Platform.LINUX_AMD64,
                        List.of(
                                "go.opentelemetry.io/otel@v1.43.0",
                                "go.opentelemetry.io/otel/sdk/log@v0.19.0",
                                "go.opentelemetry.io/contrib/exporters/autoexport@v0.65.0",
                                "autoexport.NewSpanExporter(ctx)",
                                "autoexport.NewMetricReader(ctx)",
                                "autoexport.NewLogExporter(ctx)",
                                "func setupOpenTelemetry(ctx context.Context)",
                                "shutdown, err := setupOpenTelemetry(context.Background())",
                                "go run ./cmd/application"),
                        List.of()),
                new RenderScenario(
                        "go ebpf preview",
                        Language.GO,
                        Framework.GO_GENERIC,
                        Method.EBPF,
                        Environment.VM,
                        Platform.LINUX_AMD64,
                        List.of(
                                "# Preview/WIP",
                                "--branch v0.19.0",
                                "make build",
                                "sudo --preserve-env=OTEL_SERVICE_NAME",
                                "OTEL_GO_AUTO_TARGET_EXE=/absolute/path/to/application",
                                "./otel-go-instrumentation"),
                        List.of("OTEL_METRICS_EXPORTER=otlp", "OTEL_LOGS_EXPORTER=otlp")),
                new RenderScenario(
                        "generic sdk selection gate",
                        Language.GENERIC,
                        Framework.GENERIC,
                        Method.SDK,
                        Environment.VM,
                        Platform.ANY,
                        List.of("Select the concrete language adapter to receive pinned executable commands."),
                        List.of()));
    }

    private GuideRenderRequest request(
            Language language,
            Framework framework,
            Method method,
            Environment environment,
            Platform platform) {
        return new GuideRenderRequest(
                1,
                language,
                framework,
                method,
                environment,
                platform,
                new CollectorTarget(
                        "collector-east",
                        "http://collector.internal:4318",
                        "http://collector.internal:4317",
                        "Authorization"),
                new ServiceIdentity("checkout-api", "commerce", "prod"));
    }

    private String renderedContent(
            org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideRenderResponse
                    guide) {
        return guide.steps().stream()
                .flatMap(step -> step.snippets().stream())
                .map(snippet -> snippet.content())
                .collect(Collectors.joining("\n"));
    }

    private List<String> documentedJsonBlocks(String heading, String nextHeading) throws IOException {
        String document = Files.readString(findRepositoryFile("docs/instrumentation-api-v1.md"));
        int sectionStart = document.indexOf(heading);
        int sectionEnd = document.indexOf(nextHeading, sectionStart);
        String section = document.substring(sectionStart, sectionEnd);
        List<String> blocks = new ArrayList<>();
        int cursor = 0;
        while ((cursor = section.indexOf("```json", cursor)) >= 0) {
            int jsonStart = cursor + "```json".length();
            int jsonEnd = section.indexOf("```", jsonStart);
            blocks.add(section.substring(jsonStart, jsonEnd));
            cursor = jsonEnd + "```".length();
        }
        assertEquals(2, blocks.size());
        return blocks;
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

    private record RenderScenario(
            String name,
            Language language,
            Framework framework,
            Method method,
            Environment environment,
            Platform platform,
            List<String> expectedContent,
            List<String> forbiddenContent) {
        @Override
        public String toString() {
            return name;
        }
    }
}
