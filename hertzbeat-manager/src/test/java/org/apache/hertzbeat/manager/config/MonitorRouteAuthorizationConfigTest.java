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

package org.apache.hertzbeat.manager.config;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

/**
 * Release-readiness contracts for shipped monitor route authorization templates.
 */
class MonitorRouteAuthorizationConfigTest {

    private static final String MONITOR_DELETE_RULE = "  - /api/monitor/**===delete===[admin]";
    private static final String MALFORMED_MONITOR_DELETE_RULE = "  - /api/monitor/**===delete==[admin]";
    private static final String MONITORS_WILDCARD_GET_RULE = "  - /api/monitors/**===get===[admin,user,guest]";
    private static final String MONITORS_WILDCARD_POST_RULE = "  - /api/monitors/**===post===[admin,user]";
    private static final String MONITORS_WILDCARD_PUT_RULE = "  - /api/monitors/**===put===[admin,user]";
    private static final String MONITORS_WILDCARD_DELETE_RULE = "  - /api/monitors/**===delete===[admin]";
    private static final List<String> REQUIRED_ADMIN_MONITOR_EXPORT_RULES = List.of(
            "  - /api/monitors/export===get===[admin]",
            "  - /api/monitors/export/all===get===[admin]"
    );
    private static final List<String> REQUIRED_EXACT_MONITOR_MANAGE_RULES = List.of(
            "  - /api/monitors/manage===get===[admin,user,guest]",
            "  - /api/monitors/manage===post===[admin,user]",
            "  - /api/monitors/manage===put===[admin,user]",
            "  - /api/monitors/manage===delete===[admin]"
    );
    private static final List<String> REQUIRED_EXACT_MONITOR_ROOT_RULES = List.of(
            "  - /api/monitor===get===[admin,user,guest]",
            "  - /api/monitor===post===[admin,user]",
            "  - /api/monitor===put===[admin,user]",
            "  - /api/monitor===delete===[admin]",
            "  - /api/monitors===get===[admin,user,guest]",
            "  - /api/monitors===delete===[admin]"
    );

    private static final List<String> SURENESS_CONFIGS = List.of(
            "hertzbeat-startup/src/main/resources/sureness.yml",
            "hertzbeat-manager/src/test/resources/sureness.yml",
            "hertzbeat-e2e/hertzbeat-observability-e2e/src/test/resources/sureness.yml",
            "script/sureness.yml",
            "script/docker-compose/hertzbeat-mysql-iotdb/conf/sureness.yml",
            "script/docker-compose/hertzbeat-mysql-tdengine/conf/sureness.yml",
            "script/docker-compose/hertzbeat-mysql-victoria-metrics/conf/sureness.yml",
            "script/docker-compose/hertzbeat-postgresql-greptimedb/conf/sureness.yml",
            "script/docker-compose/hertzbeat-postgresql-victoria-metrics/conf/sureness.yml"
    );

    @Test
    void shippedSurenessConfigsKeepOldMonitorDeleteRouteAdminOnly() {
        List<Executable> checks = new ArrayList<>();
        for (String config : SURENESS_CONFIGS) {
            checks.add(() -> assertMonitorDeleteRule(config));
        }
        assertAll(checks);
    }

    @Test
    void shippedSurenessConfigsKeepExactRootMonitorRoutesCovered() {
        List<Executable> checks = new ArrayList<>();
        for (String config : SURENESS_CONFIGS) {
            checks.add(() -> assertExactRootMonitorRules(config));
        }
        assertAll(checks);
    }

    @Test
    void shippedSurenessConfigsKeepMonitorExportRoutesAdminOnlyBeforeWildcardRead() {
        List<Executable> checks = new ArrayList<>();
        for (String config : SURENESS_CONFIGS) {
            checks.add(() -> assertMonitorExportRules(config));
        }
        assertAll(checks);
    }

    @Test
    void shippedSurenessConfigsKeepExactMonitorManageMutationRoutesBeforeWildcards() {
        List<Executable> checks = new ArrayList<>();
        for (String config : SURENESS_CONFIGS) {
            checks.add(() -> assertExactMonitorManageRules(config));
        }
        assertAll(checks);
    }

    private static void assertMonitorDeleteRule(String config) throws IOException {
        Path configPath = repoRoot().resolve(config);
        List<String> lines = Files.readAllLines(configPath);
        assertTrue(lines.contains(MONITOR_DELETE_RULE),
                () -> config + " must use a parseable admin-only /api/monitor DELETE rule");
        assertFalse(lines.contains(MALFORMED_MONITOR_DELETE_RULE),
                () -> config + " must not use the malformed delete==[admin] Sureness delimiter");
    }

    private static void assertExactRootMonitorRules(String config) throws IOException {
        Path configPath = repoRoot().resolve(config);
        List<String> lines = Files.readAllLines(configPath);
        for (String rule : REQUIRED_EXACT_MONITOR_ROOT_RULES) {
            assertTrue(lines.contains(rule), () -> config + " must include exact root rule " + rule.trim());
        }
    }

    private static void assertMonitorExportRules(String config) throws IOException {
        Path configPath = repoRoot().resolve(config);
        List<String> lines = Files.readAllLines(configPath);
        int wildcardGetIndex = lines.indexOf(MONITORS_WILDCARD_GET_RULE);
        assertTrue(wildcardGetIndex >= 0, () -> config + " must keep the monitor wildcard GET rule");
        for (String rule : REQUIRED_ADMIN_MONITOR_EXPORT_RULES) {
            int ruleIndex = lines.indexOf(rule);
            assertTrue(ruleIndex >= 0, () -> config + " must include admin-only monitor export rule " + rule.trim());
            assertTrue(ruleIndex < wildcardGetIndex,
                    () -> config + " must place " + rule.trim() + " before the broad monitor wildcard GET rule");
        }
    }

    private static void assertExactMonitorManageRules(String config) throws IOException {
        Path configPath = repoRoot().resolve(config);
        List<String> lines = Files.readAllLines(configPath);
        assertRuleBeforeWildcard(config, lines, REQUIRED_EXACT_MONITOR_MANAGE_RULES.get(0), MONITORS_WILDCARD_GET_RULE);
        assertRuleBeforeWildcard(config, lines, REQUIRED_EXACT_MONITOR_MANAGE_RULES.get(1), MONITORS_WILDCARD_POST_RULE);
        assertRuleBeforeWildcard(config, lines, REQUIRED_EXACT_MONITOR_MANAGE_RULES.get(2), MONITORS_WILDCARD_PUT_RULE);
        assertRuleBeforeWildcard(config, lines, REQUIRED_EXACT_MONITOR_MANAGE_RULES.get(3), MONITORS_WILDCARD_DELETE_RULE);
    }

    private static void assertRuleBeforeWildcard(String config, List<String> lines, String exactRule, String wildcardRule) {
        int exactIndex = lines.indexOf(exactRule);
        int wildcardIndex = lines.indexOf(wildcardRule);
        assertTrue(exactIndex >= 0, () -> config + " must include exact monitor manage rule " + exactRule.trim());
        assertTrue(wildcardIndex >= 0, () -> config + " must keep wildcard monitor rule " + wildcardRule.trim());
        assertTrue(exactIndex < wildcardIndex,
                () -> config + " must place " + exactRule.trim() + " before " + wildcardRule.trim());
    }

    private static Path repoRoot() {
        Path current = Paths.get("").toAbsolutePath();
        while (current != null && !Files.exists(current.resolve("hertzbeat-manager/pom.xml"))) {
            current = current.getParent();
        }
        if (current == null) {
            throw new IllegalStateException("Cannot locate HertzBeat repository root");
        }
        return current;
    }
}
