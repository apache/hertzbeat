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

package org.apache.hertzbeat.startup.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import jakarta.annotation.Nullable;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

/**
 * Guards the springdoc switches that keep the openapi document off by default.
 *
 * <p>Scoping the document to the admin role is only half the story. The document is a map
 * of every route, http method, parameter and model, so a deployment that has no use for it
 * should not serve it at all: both switches are off unless a deployment opts in, and the
 * rbac rules stay as the second line of defence for deployments that do. The swagger ui
 * page itself is reachable anonymously through the {@code /**}{@code /*.html===get}
 * exclusion, but it only renders for a caller whose browser holds an administrator session.
 */
class OpenApiDocumentDisabledByDefaultTest {

    private static final Path SCRIPT_DIR = Path.of("..", "script");

    private static final List<List<String>> SWITCHES = List.of(
            List.of("springdoc", "api-docs", "enabled"),
            List.of("springdoc", "swagger-ui", "enabled"));

    @Test
    void shouldDisableTheOpenApiDocumentInThePackagedConfig() throws IOException {
        try (InputStream in = OpenApiDocumentDisabledByDefaultTest.class.getResourceAsStream("/application.yml")) {
            assertNotNull(in, "application.yml must be on the classpath");
            assertDisabled(documentsOf(in), "application.yml");
        }
    }

    /**
     * The deployment scripts ship their own copies of {@code application.yml} and mount
     * them over the packaged one, so a switch flipped only in the packaged file would
     * still leave every container deployment serving the document.
     */
    @Test
    void shouldDisableTheOpenApiDocumentInDeploymentCopies() throws IOException {
        for (Path copy : deploymentCopies()) {
            try (InputStream in = Files.newInputStream(copy)) {
                assertDisabled(documentsOf(in), copy.toString());
            }
        }
    }

    /**
     * Asserts that every declaration of the springdoc switches across a multi document
     * yaml turns the endpoint off, and that at least one declaration exists - a file that
     * simply omits them falls back to the springdoc default, which is enabled.
     *
     * @param documents the yaml documents, in the order spring applies them
     * @param source    the file the documents came from, for the failure message
     */
    private static void assertDisabled(List<Map<String, Object>> documents, String source) {
        for (List<String> path : SWITCHES) {
            List<Object> declarations = documents.stream()
                    .map(document -> valueAt(document, path))
                    .filter(Objects::nonNull)
                    .toList();
            assertFalse(declarations.isEmpty(),
                    String.join(".", path) + " is unset in " + source + ", so it falls back to enabled");
            declarations.forEach(declared -> assertEquals(Boolean.FALSE, declared,
                    String.join(".", path) + " is enabled in " + source));
        }
    }

    /**
     * @param document the parsed yaml document
     * @param path     the key path to walk, outermost first
     * @return the value at that path, or null when any segment is missing
     */
    @Nullable
    private static Object valueAt(Map<String, Object> document, List<String> path) {
        Object current = document;
        for (String key : path) {
            if (!(current instanceof Map<?, ?> map)) {
                return null;
            }
            current = map.get(key);
        }
        return current;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> documentsOf(InputStream in) {
        List<Map<String, Object>> documents = new ArrayList<>();
        for (Object document : new Yaml().loadAll(in)) {
            if (document instanceof Map<?, ?> map) {
                documents.add((Map<String, Object>) map);
            }
        }
        return documents;
    }

    /**
     * @return the {@code application.yml} copies shipped by the deployment scripts
     */
    private static Set<Path> deploymentCopies() throws IOException {
        assumeTrue(Files.isDirectory(SCRIPT_DIR),
                "running outside the source tree, the packaged file asserted above is all we can see");
        try (Stream<Path> paths = Files.walk(SCRIPT_DIR)) {
            Set<Path> copies = paths.filter(path -> path.getFileName().toString().equals("application.yml"))
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            assertFalse(copies.isEmpty(), "expected the deployment scripts to ship application.yml copies");
            return copies;
        }
    }
}
