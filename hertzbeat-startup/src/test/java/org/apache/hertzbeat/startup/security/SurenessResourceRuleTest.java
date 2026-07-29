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
import static org.junit.jupiter.api.Assertions.assertTrue;
import com.usthe.sureness.matcher.util.TirePathTree;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
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
 * Guards the rbac rules shipped in {@code sureness.yml}.
 *
 * <p>Sureness splits every rule on {@code ===} and silently drops any line that does not
 * yield exactly three segments, so a rule with a mistyped separator disappears from the
 * match tree instead of failing loudly. A dropped rule leaves its endpoint with no role
 * requirement at all, which sureness treats as "no restriction" for an authenticated
 * caller. These tests assert both that every rule is well formed and that the rules
 * protecting destructive endpoints really resolve to the intended roles.
 */
class SurenessResourceRuleTest {

    private static final String SEPARATOR = "===";

    private static final int RESOURCE_ROLE_SEGMENTS = 3;

    private static final int EXCLUDED_RESOURCE_SEGMENTS = 2;

    private static List<String> resourceRole;

    private static List<String> excludedResource;

    private static TirePathTree roleTree;

    @BeforeAll
    @SuppressWarnings("unchecked")
    static void loadSurenessConfig() throws IOException {
        try (InputStream in = SurenessResourceRuleTest.class.getResourceAsStream("/sureness.yml")) {
            assertNotNull(in, "sureness.yml must be on the classpath");
            Map<String, Object> document = new Yaml().load(in);
            resourceRole = (List<String>) document.get("resourceRole");
            excludedResource = (List<String>) document.get("excludedResource");
        }
        assertNotNull(resourceRole, "resourceRole must be present");
        assertNotNull(excludedResource, "excludedResource must be present");

        roleTree = new TirePathTree();
        roleTree.buildTree(new LinkedHashSet<>(resourceRole));
    }

    @Test
    void everyResourceRoleRuleIsWellFormed() {
        for (String rule : resourceRole) {
            assertEquals(RESOURCE_ROLE_SEGMENTS, rule.split(SEPARATOR, -1).length,
                    "resourceRole rule is silently dropped by sureness, it needs exactly two '"
                            + SEPARATOR + "' separators: " + rule);
        }
    }

    @Test
    void everyExcludedResourceRuleIsWellFormed() {
        for (String rule : excludedResource) {
            assertEquals(EXCLUDED_RESOURCE_SEGMENTS, rule.split(SEPARATOR, -1).length,
                    "excludedResource rule is silently dropped by sureness, it needs exactly one '"
                            + SEPARATOR + "' separator: " + rule);
        }
    }

    @Test
    void everyRuleReachesTheMatchTree() {
        assertEquals(resourceRole.size(), roleTree.getResourceNum(),
                "a rule was dropped while building the match tree, leaving its endpoint unprotected");
    }

    @Test
    void deletingOneMonitorIsRestrictedToAdmin() {
        assertEquals("[admin]", roleTree.searchPathFilterRoles("/api/monitor/1" + SEPARATOR + "delete"));
    }

    @Test
    void deletingMonitorsIsRestrictedToAdmin() {
        assertEquals("[admin]", roleTree.searchPathFilterRoles("/api/monitors/1" + SEPARATOR + "delete"));
    }

    @Test
    void readingMonitorsStaysOpenToEveryRole() {
        assertEquals("[admin,user,guest]", roleTree.searchPathFilterRoles("/api/monitors" + SEPARATOR + "get"));
    }

    /**
     * The deployment scripts ship their own copies of {@code sureness.yml}; a rule fixed only
     * in the packaged file would still leave every container deployment exposed.
     */
    @Test
    void deploymentCopiesCarryWellFormedRules() throws IOException {
        Path scriptDir = Path.of("..", "script");
        if (!Files.isDirectory(scriptDir)) {
            // running outside the source tree, the packaged file asserted above is all we can see
            return;
        }
        Set<Path> copies;
        try (Stream<Path> paths = Files.walk(scriptDir)) {
            copies = paths.filter(path -> path.getFileName().toString().equals("sureness.yml"))
                    .collect(Collectors.toCollection(LinkedHashSet::new));
        }
        assertFalse(copies.isEmpty(), "expected the deployment scripts to ship sureness.yml copies");
        for (Path copy : copies) {
            for (String line : Files.readAllLines(copy, StandardCharsets.UTF_8)) {
                String rule = line.strip();
                if (!rule.startsWith("- /") || !rule.contains(SEPARATOR)) {
                    continue;
                }
                rule = rule.substring(1).strip();
                int segments = rule.split(SEPARATOR, -1).length;
                assertTrue(segments == RESOURCE_ROLE_SEGMENTS || segments == EXCLUDED_RESOURCE_SEGMENTS,
                        "rule is silently dropped by sureness in " + copy + ": " + rule);
            }
        }
    }
}
