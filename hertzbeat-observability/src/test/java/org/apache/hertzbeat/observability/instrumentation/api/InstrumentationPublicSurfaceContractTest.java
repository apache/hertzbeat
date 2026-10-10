/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.hertzbeat.observability.instrumentation.v2.controller.InstrumentationV2Controller;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

class InstrumentationPublicSurfaceContractTest {

    private static final String ROOT_PATH = "/api/instrumentation";
    private static final Pattern DOCUMENTED_ROUTE =
            Pattern.compile("\\| `(GET|POST)` \\| `(/api/instrumentation/[^`]+)` \\|");
    private static final Set<Route> PUBLIC_ROUTES = Set.of(
            new Route("GET", ROOT_PATH + "/catalog"),
            new Route("GET", ROOT_PATH + "/intake-profiles"),
            new Route("POST", ROOT_PATH + "/render"),
            new Route("POST", ROOT_PATH + "/detect"));

    @Test
    void springMappingsExposeOnlyTheCanonicalUnversionedRoutes() {
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        assertEquals(
                Set.of(InstrumentationV2Controller.class.getName()),
                scanner.findCandidateComponents("org.apache.hertzbeat.observability.instrumentation").stream()
                        .map(definition -> definition.getBeanClassName())
                        .collect(Collectors.toUnmodifiableSet()));

        RequestMapping root = InstrumentationV2Controller.class.getAnnotation(RequestMapping.class);
        assertEquals(Set.of(ROOT_PATH), Set.of(root.path()));

        Set<Route> routes = Arrays.stream(InstrumentationV2Controller.class.getDeclaredMethods())
                .flatMap(method -> {
                    GetMapping get = method.getAnnotation(GetMapping.class);
                    if (get != null) {
                        return Arrays.stream(get.value()).map(path -> new Route("GET", ROOT_PATH + path));
                    }
                    PostMapping post = method.getAnnotation(PostMapping.class);
                    if (post != null) {
                        return Stream.concat(Arrays.stream(post.value()), Arrays.stream(post.path()))
                                .map(path -> new Route("POST", ROOT_PATH + path));
                    }
                    return Stream.empty();
                })
                .collect(Collectors.toUnmodifiableSet());

        assertEquals(PUBLIC_ROUTES, routes);
        assertTrue(routes.stream().noneMatch(route -> route.path().matches(".*/v[0-9]+(?:/.*)?")));
    }

    @Test
    void documentationPublishesOnlyTheCanonicalUnversionedRoutes() throws Exception {
        Path root = repositoryRoot();
        Path publicContract = root.resolve("docs/instrumentation-api.md");
        assertTrue(Files.isRegularFile(publicContract), "Canonical instrumentation API document is required");
        assertFalse(Files.exists(root.resolve("docs/instrumentation-api-v1.md")),
                "Versioned legacy documentation must not remain public");

        String document = Files.readString(publicContract);
        Set<Route> documentedRoutes = DOCUMENTED_ROUTE.matcher(document).results()
                .map(match -> new Route(match.group(1), match.group(2)))
                .collect(Collectors.toUnmodifiableSet());
        assertEquals(PUBLIC_ROUTES, documentedRoutes);
        assertFalse(document.matches("(?s).*/api/instrumentation/v[0-9]+(?:/.*)?.*"));
    }

    private static Path repositoryRoot() {
        Path current = Path.of("").toAbsolutePath();
        while (current != null && !Files.exists(current.resolve("hertzbeat-observability/pom.xml"))) {
            current = current.getParent();
        }
        if (current == null) {
            throw new IllegalStateException("Cannot locate HertzBeat repository root");
        }
        return current;
    }

    private record Route(String method, String path) {
    }
}
