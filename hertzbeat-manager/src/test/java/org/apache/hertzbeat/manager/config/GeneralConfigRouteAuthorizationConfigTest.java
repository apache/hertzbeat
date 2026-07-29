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

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.manager.controller.GeneralConfigController;
import org.apache.hertzbeat.manager.pojo.dto.TemplateConfig;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;

/**
 * Release-readiness contracts for shipped general configuration authorization.
 */
class GeneralConfigRouteAuthorizationConfigTest {

    private static final String ALL_ROLES = "[admin,user,guest]";
    private static final String ADMIN_ROLE = "[admin]";
    private static final Map<GeneralConfigTypeEnum, RolePolicy> ROLE_POLICIES = rolePolicies();
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
    void roleMatrixCoversEverySupportedGeneralConfigType() {
        assertEquals(EnumSet.allOf(GeneralConfigTypeEnum.class), ROLE_POLICIES.keySet());
    }

    @Test
    void controllerKeepsTheGenericTypeAndTemplateMutationRoutes() throws NoSuchMethodException {
        GetMapping getMapping = GeneralConfigController.class.getDeclaredMethod("getConfig", String.class)
                .getAnnotation(GetMapping.class);
        PostMapping postMapping = GeneralConfigController.class
                .getDeclaredMethod("saveOrUpdateConfig", String.class, Object.class)
                .getAnnotation(PostMapping.class);
        PutMapping putMapping = GeneralConfigController.class
                .getDeclaredMethod("updateTemplateAppConfig", String.class, TemplateConfig.AppTemplate.class)
                .getAnnotation(PutMapping.class);

        assertArrayEquals(new String[]{"/{type}"}, getMapping.path());
        assertArrayEquals(new String[]{"/{type}"}, postMapping.path());
        assertArrayEquals(new String[]{"/template/{app}"}, putMapping.path());
    }

    @Test
    void shippedConfigsGiveEverySupportedTypeExactRolesAndStayInSync() throws IOException {
        List<String> referenceRules = generalConfigRules(SURENESS_CONFIGS.get(0));
        for (String config : SURENESS_CONFIGS) {
            List<String> lines = Files.readAllLines(repoRoot().resolve(config));
            assertEquals(referenceRules, generalConfigRules(config),
                    () -> config + " must match the startup general config policy");
            for (Map.Entry<GeneralConfigTypeEnum, RolePolicy> policy : ROLE_POLICIES.entrySet()) {
                String path = "/api/config/" + policy.getKey().name();
                assertExactRule(config, lines, path, "get", policy.getValue().getRoles());
                assertExactRule(config, lines, path, "post", policy.getValue().postRoles());
            }
            assertExactRule(config, lines, "/api/config/template/*", "put", ADMIN_ROLE);
            assertFalse(lines.stream().anyMatch(line -> line.startsWith("  - /api/config/**===")),
                    () -> config + " must not use a broad general config wildcard");
        }
    }

    private static void assertExactRule(
            String config, List<String> lines, String path, String method, String roles) {
        String expected = "  - " + path + "===" + method + "===" + roles;
        long count = lines.stream().filter(expected::equals).count();
        assertEquals(1, count, () -> config + " must contain exactly one " + expected);
    }

    private static List<String> generalConfigRules(String config) throws IOException {
        return Files.readAllLines(repoRoot().resolve(config)).stream()
                .filter(line -> line.startsWith("  - /api/config/"))
                .toList();
    }

    private static Map<GeneralConfigTypeEnum, RolePolicy> rolePolicies() {
        Map<GeneralConfigTypeEnum, RolePolicy> policies = new EnumMap<>(GeneralConfigTypeEnum.class);
        policies.put(GeneralConfigTypeEnum.mute, new RolePolicy(ALL_ROLES, ADMIN_ROLE));
        policies.put(GeneralConfigTypeEnum.template, new RolePolicy(ALL_ROLES, ADMIN_ROLE));
        policies.put(GeneralConfigTypeEnum.secret, new RolePolicy(ADMIN_ROLE, ADMIN_ROLE));
        policies.put(GeneralConfigTypeEnum.sms, new RolePolicy(ALL_ROLES, ADMIN_ROLE));
        policies.put(GeneralConfigTypeEnum.system, new RolePolicy(ALL_ROLES, ADMIN_ROLE));
        policies.put(GeneralConfigTypeEnum.email, new RolePolicy(ALL_ROLES, ADMIN_ROLE));
        policies.put(GeneralConfigTypeEnum.oss, new RolePolicy(ALL_ROLES, ADMIN_ROLE));
        policies.put(GeneralConfigTypeEnum.provider, new RolePolicy(ADMIN_ROLE, ADMIN_ROLE));
        return policies;
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

    private record RolePolicy(String getRoles, String postRoles) {
    }
}
