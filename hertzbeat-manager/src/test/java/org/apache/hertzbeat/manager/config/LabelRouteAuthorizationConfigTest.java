/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.api.function.Executable;

/**
 * Release-readiness contracts for shipped Label route authorization templates.
 */
class LabelRouteAuthorizationConfigTest {

    private static final List<String> LABEL_RULES = List.of(
            "  - /api/label===get===[admin,user,guest]",
            "  - /api/label===post===[admin,user]",
            "  - /api/label===put===[admin,user]",
            "  - /api/label===delete===[admin]");
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

    @Test
    void shippedConfigsKeepLabelRoutesExplicitlyRoleScoped() {
        List<Executable> checks = new ArrayList<>();
        for (String config : SURENESS_CONFIGS) {
            checks.add(() -> assertRules(config));
        }
        assertAll(checks);
    }

    private static void assertRules(String config) throws IOException {
        List<String> actualRules = Files.readAllLines(repoRoot().resolve(config)).stream()
                .filter(line -> line.startsWith("  - /api/label") || line.startsWith("  - /api/tag/"))
                .toList();
        List<String> expected = new ArrayList<>(LABEL_RULES);
        if (SurenessPolicyTestSupport.releaseProfile(config)) {
            expected.addAll(List.of("  - /api/label/**===get===[admin,user,guest]",
                    "  - /api/label/**===post===[admin,user]", "  - /api/label/**===put===[admin,user]",
                    "  - /api/label/**===delete===[admin]"));
        }
        assertEquals(expected, actualRules, () -> config + " must preserve exact roots and its fallback profile");
    }

    @ParameterizedTest
    @MethodSource("configurations")
    void realMatcherKeepsRootRolesAndAuthenticatedChildFallback(String config) throws Exception {
        var matcher = SurenessPolicyTestSupport.matcher(config);
        for (String method : List.of("get", "post", "put", "delete")) {
            String roles = switch (method) {
                case "get" -> "[admin,user,guest]";
                case "post", "put" -> "[admin,user]";
                default -> "[admin]";
            };
            SurenessPolicyTestSupport.assertPolicy(matcher, config, "/api/label", method, roles);
            SurenessPolicyTestSupport.assertPolicy(matcher, config, "/api/label/child", method,
                    SurenessPolicyTestSupport.releaseProfile(config) ? roles : null);
        }
    }

    private static Stream<String> configurations() {
        return SURENESS_CONFIGS.stream();
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
