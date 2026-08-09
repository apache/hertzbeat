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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import com.usthe.sureness.matcher.util.TirePathTree;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

/**
 * Guards the rbac rules covering the generated openapi document.
 *
 * <p>These paths used to sit in {@code excludedResource}. Sureness checks the exclusion
 * tree before any credential check, so an anonymous request returned the full document:
 * every route, http method, parameter name and type, and every request and response
 * model. That is a ready made map of the attack surface, so it is scoped like any other
 * administrative resource.
 */
class SurenessOpenApiDocRuleTest {

    private static final String SEPARATOR = "===";

    /**
     * {@code excludedResource} entries are written as {@code api===method}, but
     * {@code TirePathTree} only accepts the three segment {@code api===method===roles}
     * shape and silently drops anything else. {@code DefaultPathRoleMatcher} therefore
     * appends this marker to every excluded rule before it builds the exclusion tree, and
     * a test that skips the same step builds an empty tree that matches nothing - every
     * {@code assertNull} against it then passes no matter what the yaml says.
     */
    private static final String EXCLUDE_ROLE = SEPARATOR + "[exclude]";

    private static final Path SCRIPT_DIR = Path.of("..", "script");

    private static TirePathTree roleTree;

    private static TirePathTree excludeTree;

    @BeforeAll
    @SuppressWarnings("unchecked")
    static void loadSurenessConfig() throws IOException {
        List<String> resourceRole;
        List<String> excludedResource;
        try (InputStream in = SurenessOpenApiDocRuleTest.class.getResourceAsStream("/sureness.yml")) {
            assertNotNull(in, "sureness.yml must be on the classpath");
            Map<String, Object> document = new Yaml().load(in);
            resourceRole = (List<String>) document.get("resourceRole");
            excludedResource = (List<String>) document.get("excludedResource");
        }
        assertNotNull(resourceRole, "resourceRole must be present");
        assertNotNull(excludedResource, "excludedResource must be present");
        roleTree = new TirePathTree();
        roleTree.buildTree(new LinkedHashSet<>(resourceRole));
        excludeTree = excludeTreeOf(excludedResource);
    }

    @Test
    void theOpenApiDocumentIsRestrictedToAdmin() {
        assertEquals("[admin]", rolesFor(roleTree, "/v3/api-docs"));
        assertEquals("[admin]", rolesFor(roleTree, "/v2/api-docs"));
        assertEquals("[admin]", rolesFor(roleTree, "/swagger-resources/configuration/ui"));
    }

    /**
     * springdoc also serves the grouped documents and its own config under the same
     * prefix; a rule bound to the bare path would leave those anonymous.
     */
    @Test
    void theGroupedDocumentsAreCoveredToo() {
        assertEquals("[admin]", rolesFor(roleTree, "/v3/api-docs/swagger-config"));
        assertEquals("[admin]", rolesFor(roleTree, "/v3/api-docs/default"));
        assertEquals("[admin]", rolesFor(roleTree, "/v3/api-docs/default.yaml"));
    }

    /**
     * {@code OpenApiWebMvcResource} maps the document twice, at the configured path and at
     * that path with a {@code .yaml} suffix. The suffixed form is a sibling path segment
     * rather than a child, so {@code /v3/api-docs/**} does not reach it and it needs its
     * own rule. Without one the yaml document carries no role requirement at all, which
     * sureness treats as no restriction for any authenticated caller including guest.
     */
    @Test
    void theYamlDocumentIsRestrictedToAdmin() {
        assertEquals("[admin]", rolesFor(roleTree, "/v3/api-docs.yaml"));
    }

    @Test
    void theOpenApiDocumentIsNoLongerAnonymous() {
        assertNull(rolesFor(excludeTree, "/v3/api-docs"));
        assertNull(rolesFor(excludeTree, "/v3/api-docs.yaml"));
        assertNull(rolesFor(excludeTree, "/v3/api-docs/swagger-config"));
        assertNull(rolesFor(excludeTree, "/v2/api-docs"));
        assertNull(rolesFor(excludeTree, "/swagger-resources/configuration/ui"));
    }

    /**
     * The assertions above are all {@code assertNull}, so they only mean something while
     * the exclusion tree is capable of matching at all. This pins a path that is meant to
     * stay anonymous and fails if the tree was built in a shape sureness would have
     * rejected.
     */
    @Test
    void theExclusionTreeStillMatchesWhatItShould() {
        assertEquals("[exclude]", rolesFor(excludeTree, "/api/i18n/lang"));
    }

    /**
     * The deployment scripts ship their own copies of {@code sureness.yml}; a rule fixed
     * only in the packaged file would still leave every container deployment serving the
     * document to anonymous callers.
     */
    @Test
    void deploymentCopiesRestrictTheOpenApiDocument() throws IOException {
        for (Path copy : deploymentCopies()) {
            TirePathTree copyRoleTree = new TirePathTree();
            copyRoleTree.buildTree(new LinkedHashSet<>(sectionOf(copy, "resourceRole")));
            assertEquals("[admin]", rolesFor(copyRoleTree, "/v3/api-docs"),
                    "the openapi document is unruled or over-granted in " + copy);
            assertEquals("[admin]", rolesFor(copyRoleTree, "/v3/api-docs.yaml"),
                    "the yaml openapi document is unruled or over-granted in " + copy);
            assertEquals("[admin]", rolesFor(copyRoleTree, "/v3/api-docs/swagger-config"),
                    "the springdoc ui config is unruled or over-granted in " + copy);

            TirePathTree copyExcludeTree = excludeTreeOf(sectionOf(copy, "excludedResource"));
            assertNull(rolesFor(copyExcludeTree, "/v3/api-docs"),
                    "the openapi document is still anonymous in " + copy);
            assertEquals("[exclude]", rolesFor(copyExcludeTree, "/api/i18n/lang"),
                    "the exclusion tree matches nothing in " + copy + ", the assertion above proves nothing");
        }
    }

    private static String rolesFor(TirePathTree tree, String path) {
        return tree.searchPathFilterRoles(path + SEPARATOR + "get");
    }

    /**
     * @param excludedResource the {@code excludedResource} rules, as written in the yaml
     * @return the exclusion tree, built the way {@code DefaultPathRoleMatcher} builds it
     */
    private static TirePathTree excludeTreeOf(List<String> excludedResource) {
        TirePathTree tree = new TirePathTree();
        tree.buildTree(excludedResource.stream()
                .map(rule -> rule + EXCLUDE_ROLE)
                .collect(Collectors.toCollection(LinkedHashSet::new)));
        return tree;
    }

    /**
     * @return the {@code sureness.yml} copies shipped by the deployment scripts
     */
    private static Set<Path> deploymentCopies() throws IOException {
        assumeTrue(Files.isDirectory(SCRIPT_DIR),
                "running outside the source tree, the packaged file asserted above is all we can see");
        try (Stream<Path> paths = Files.walk(SCRIPT_DIR)) {
            Set<Path> copies = paths.filter(path -> path.getFileName().toString().equals("sureness.yml"))
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            assertFalse(copies.isEmpty(), "expected the deployment scripts to ship sureness.yml copies");
            return copies;
        }
    }

    @SuppressWarnings("unchecked")
    private static List<String> sectionOf(Path copy, String section) throws IOException {
        Map<String, Object> document;
        try (InputStream in = Files.newInputStream(copy)) {
            document = new Yaml().load(in);
        }
        List<String> rules = (List<String>) document.get(section);
        assertNotNull(rules, section + " must be present in " + copy);
        return rules;
    }
}
