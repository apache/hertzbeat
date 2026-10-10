/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.config;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.manager.controller.CollectorController;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;

/** Release-readiness contracts for Collector route authorization. */
class CollectorRouteAuthorizationConfigTest {

    private static final String COLLECTOR_ROOT = "/api/collector";
    private static final String COLLECTOR_GET_WILDCARD =
            "  - /api/collector/**===get===[admin,user,guest]";
    private static final String COLLECTOR_PUT_WILDCARD =
            "  - /api/collector/**===put===[admin,user]";
    private static final String COLLECTOR_DELETE_WILDCARD =
            "  - /api/collector/**===delete===[admin]";
    private static final List<String> REQUIRED_EXACT_RULES = List.of(
            "  - /api/collector===get===[admin,user,guest]",
            "  - /api/collector/*/runtime-config===get===[admin,user,guest]",
            "  - /api/collector/online===put===[admin,user]",
            "  - /api/collector/offline===put===[admin,user]",
            "  - /api/collector/*/runtime-config===put===[admin,user]",
            "  - /api/collector===delete===[admin]");
    private static final List<String> SURENESS_CONFIGS = List.of(
            "hertzbeat-startup/src/main/resources/sureness.yml",
            "hertzbeat-manager/src/test/resources/sureness.yml",
            "hertzbeat-e2e/hertzbeat-observability-e2e/src/test/resources/sureness.yml",
            "script/sureness.yml",
            "script/docker-compose/hertzbeat-mysql-iotdb/conf/sureness.yml",
            "script/docker-compose/hertzbeat-mysql-tdengine/conf/sureness.yml",
            "script/docker-compose/hertzbeat-mysql-victoria-metrics/conf/sureness.yml",
            "script/docker-compose/hertzbeat-postgresql-greptimedb/conf/sureness.yml",
            "script/docker-compose/hertzbeat-postgresql-victoria-metrics/conf/sureness.yml");
    private static final List<String> CURRENT_DOCS = List.of(
            "home/docs/start/account-modify.md",
            "home/i18n/zh-cn/docusaurus-plugin-content-docs/current/start/account-modify.md");

    @Test
    void collectorControllerKeepsReviewedReadAndMutationRoutes() {
        assertAll(
                () -> assertMapping("getCollectors", GetMapping.class, COLLECTOR_ROOT),
                () -> assertMapping("getRuntimeConfig", GetMapping.class,
                        COLLECTOR_ROOT + "/*/runtime-config"),
                () -> assertMapping("onlineCollector", PutMapping.class, COLLECTOR_ROOT + "/online"),
                () -> assertMapping("offlineCollector", PutMapping.class, COLLECTOR_ROOT + "/offline"),
                () -> assertMapping("updateRuntimeConfig", PutMapping.class,
                        COLLECTOR_ROOT + "/*/runtime-config"),
                () -> assertMapping("deleteCollector", DeleteMapping.class, COLLECTOR_ROOT));
    }

    @Test
    void shippedConfigsAndCurrentDocsKeepExactCollectorRulesBeforeWildcards() {
        List<Executable> checks = new ArrayList<>();
        for (String resource : concat(SURENESS_CONFIGS, CURRENT_DOCS)) {
            checks.add(() -> assertExactRules(resource));
        }
        assertAll(checks);
    }

    private static void assertExactRules(String resource) throws IOException {
        List<String> lines = Files.readAllLines(repoRoot().resolve(resource));
        for (String exactRule : REQUIRED_EXACT_RULES) {
            assertEquals(1, lines.stream().filter(exactRule::equals).count(),
                    () -> resource + " must contain exactly one " + exactRule.trim());
            String wildcard = wildcardFor(exactRule);
            assertTrue(lines.indexOf(exactRule) < lines.indexOf(wildcard),
                    () -> resource + " must place " + exactRule.trim() + " before " + wildcard.trim());
        }
    }

    private static String wildcardFor(String exactRule) {
        if (exactRule.contains("===get===")) {
            return COLLECTOR_GET_WILDCARD;
        }
        if (exactRule.contains("===put===")) {
            return COLLECTOR_PUT_WILDCARD;
        }
        return COLLECTOR_DELETE_WILDCARD;
    }

    private static void assertMapping(
            String methodName, Class<? extends java.lang.annotation.Annotation> mappingType, String expectedPath) {
        Method method = List.of(CollectorController.class.getDeclaredMethods()).stream()
                .filter(candidate -> candidate.getName().equals(methodName))
                .findFirst()
                .orElseThrow();
        String methodPath;
        if (mappingType == GetMapping.class) {
            methodPath = firstPath(method.getAnnotation(GetMapping.class).value());
        } else if (mappingType == PutMapping.class) {
            methodPath = firstPath(method.getAnnotation(PutMapping.class).value());
        } else {
            methodPath = firstPath(method.getAnnotation(DeleteMapping.class).value());
        }
        assertEquals(expectedPath, COLLECTOR_ROOT + methodPath.replace("{collector}", "*"));
    }

    private static String firstPath(String[] paths) {
        return paths.length == 0 ? "" : paths[0];
    }

    private static List<String> concat(List<String> first, List<String> second) {
        List<String> resources = new ArrayList<>(first);
        resources.addAll(second);
        return resources;
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
