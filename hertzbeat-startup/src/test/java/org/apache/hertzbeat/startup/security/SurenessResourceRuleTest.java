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

    private static final Path SCRIPT_DIR = Path.of("..", "script");

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

    @Test
    void readingAlertDefinitionsExcludesGuest() {
        assertEquals("[admin,user]",
                roleTree.searchPathFilterRoles("/api/alert/define/1" + SEPARATOR + "get"));
        assertEquals("[admin,user]",
                roleTree.searchPathFilterRoles("/api/alert/defines" + SEPARATOR + "get"));
        assertEquals("[admin,user]",
                roleTree.searchPathFilterRoles("/api/alert/defines/export" + SEPARATOR + "get"));
    }

    @Test
    void previewingAndAuthoringPeriodicQueriesIsRestrictedToAdmin() {
        assertEquals("[admin]",
                roleTree.searchPathFilterRoles("/api/alert/define/preview/sql" + SEPARATOR + "get"));
        assertEquals("[admin]",
                roleTree.searchPathFilterRoles("/api/alert/define" + SEPARATOR + "post"));
        assertEquals("[admin]",
                roleTree.searchPathFilterRoles("/api/alert/define" + SEPARATOR + "put"));
        assertEquals("[admin]",
                roleTree.searchPathFilterRoles("/api/alert/defines/import" + SEPARATOR + "post"));
    }

    /**
     * Only the {@code get} verb under {@code /api/apps} used to be listed, so the monitoring
     * template writes behind {@code AppController} reached any authenticated caller, down to
     * a {@code guest}.
     *
     * <p>The write verbs are not equally dangerous, and the rules deliberately differ.
     * {@code post} refuses to overwrite an existing template, so it only adds a type that
     * nobody is obliged to use, which puts it on the same footing as creating a monitor.
     * {@code put} overwrites any template including the built-in ones and then hands the new
     * definition to {@code updateAppCollectJob}, retroactively changing what every existing
     * monitor of that type collects for every account, so it stays admin only.
     */
    @Test
    void addingMonitorTemplatesIsOpenToUsers() {
        assertEquals("[admin,user]", roleTree.searchPathFilterRoles("/api/apps/define/yml" + SEPARATOR + "post"));
    }

    @Test
    void overwritingMonitorTemplatesIsRestrictedToAdmin() {
        assertEquals("[admin]", roleTree.searchPathFilterRoles("/api/apps/define/yml" + SEPARATOR + "put"));
    }

    @Test
    void deletingMonitorTemplatesIsRestrictedToAdmin() {
        assertEquals("[admin]", roleTree.searchPathFilterRoles("/api/apps/linux/define/yml" + SEPARATOR + "delete"));
    }

    @Test
    void readingMonitorTemplatesStaysOpenToEveryRole() {
        assertEquals("[admin,user,guest]", roleTree.searchPathFilterRoles("/api/apps/linux/define/yml" + SEPARATOR + "get"));
    }

    /**
     * The deployment scripts ship their own copies of {@code sureness.yml}; a rule fixed only
     * in the packaged file would still leave every container deployment exposed.
     *
     * <p>Each section is checked against its own shape rather than against "either shape".
     * The two sections are not interchangeable: {@code resourceRole} takes
     * {@code api===method===roles} and {@code excludedResource} takes {@code api===method},
     * and sureness consults the exclusion tree before it authenticates. A rule carrying
     * roles that lands under {@code excludedResource} therefore matches nothing and quietly
     * leaves its endpoint unruled, which a check accepting either shape anywhere would
     * wave through.
     */
    @Test
    void deploymentCopiesCarryWellFormedRules() throws IOException {
        for (Path copy : deploymentCopies()) {
            List<String> copyResourceRole = sectionOf(copy, "resourceRole");
            List<String> copyExcludedResource = sectionOf(copy, "excludedResource");

            for (String rule : copyResourceRole) {
                assertEquals(RESOURCE_ROLE_SEGMENTS, rule.split(SEPARATOR, -1).length,
                        "resourceRole rule is silently dropped by sureness in " + copy
                                + ", it needs exactly two '" + SEPARATOR + "' separators: " + rule);
            }
            for (String rule : copyExcludedResource) {
                assertEquals(EXCLUDED_RESOURCE_SEGMENTS, rule.split(SEPARATOR, -1).length,
                        "excludedResource rule is silently dropped by sureness in " + copy
                                + ", it needs exactly one '" + SEPARATOR + "' separator: " + rule);
            }
        }
    }

    /**
     * Well formed is not the same as correct: a copy that simply never listed the write verbs
     * passes every shape check above while leaving the monitoring template writes unruled. The
     * copies are edited by hand, one per deployment flavour, so the roles themselves are pinned
     * here too and a missed copy fails instead of shipping.
     */
    @Test
    void deploymentCopiesRestrictMonitorTemplateWrites() throws IOException {
        for (Path copy : deploymentCopies()) {
            TirePathTree copyTree = new TirePathTree();
            copyTree.buildTree(new LinkedHashSet<>(sectionOf(copy, "resourceRole")));
            assertEquals("[admin,user]", copyTree.searchPathFilterRoles("/api/apps/define/yml" + SEPARATOR + "post"),
                    "adding a monitoring template is unruled or over-granted in " + copy);
            assertEquals("[admin]", copyTree.searchPathFilterRoles("/api/apps/define/yml" + SEPARATOR + "put"),
                    "overwriting a monitoring template is unruled or over-granted in " + copy);
            assertEquals("[admin]", copyTree.searchPathFilterRoles("/api/apps/linux/define/yml" + SEPARATOR + "delete"),
                    "deleting a monitoring template is unruled or over-granted in " + copy);
        }
    }

    @Test
    void deploymentCopiesRestrictAlertQueryAuthoring() throws IOException {
        for (Path copy : deploymentCopies()) {
            TirePathTree copyTree = new TirePathTree();
            copyTree.buildTree(new LinkedHashSet<>(sectionOf(copy, "resourceRole")));
            assertEquals("[admin,user]",
                    copyTree.searchPathFilterRoles("/api/alert/define/1" + SEPARATOR + "get"),
                    "alert definitions expose query expressions to guest in " + copy);
            assertEquals("[admin,user]",
                    copyTree.searchPathFilterRoles("/api/alert/defines" + SEPARATOR + "get"),
                    "alert definition lists expose query expressions to guest in " + copy);
            assertEquals("[admin]",
                    copyTree.searchPathFilterRoles("/api/alert/define/preview/sql" + SEPARATOR + "get"),
                    "alert query preview is over-granted in " + copy);
            assertEquals("[admin]",
                    copyTree.searchPathFilterRoles("/api/alert/define" + SEPARATOR + "post"),
                    "alert query authoring is over-granted in " + copy);
            assertEquals("[admin]",
                    copyTree.searchPathFilterRoles("/api/alert/define" + SEPARATOR + "put"),
                    "alert query modification is over-granted in " + copy);
            assertEquals("[admin]",
                    copyTree.searchPathFilterRoles("/api/alert/defines/import" + SEPARATOR + "post"),
                    "alert query import is over-granted in " + copy);
        }
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
