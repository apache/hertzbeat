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
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Capability;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ComponentVersionPolicy;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Framework;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Language;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Method;
import org.junit.jupiter.api.Test;

class InstrumentationCatalogServiceTest {

    private final InstrumentationCatalogService service = new InstrumentationCatalogService();

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
        assertEquals(Capability.PREVIEW, java.signals().logs());
        assertEquals(Capability.SUPPORTED, java.signals().traces());

        var dotnet = service.requireMethod(Language.DOTNET, Framework.ASPNET_CORE, Method.ZERO_CODE);
        assertEquals("1.15.0", dotnet.component().version());
        assertFalse(dotnet.component().bundledWithHertzBeat());

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
                List.of("0.65.0", "0.19.0"),
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
}
