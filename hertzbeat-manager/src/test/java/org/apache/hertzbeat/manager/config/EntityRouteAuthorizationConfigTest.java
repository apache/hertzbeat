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

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.usthe.sureness.matcher.DefaultPathRoleMatcher;
import com.usthe.sureness.processor.exception.UnauthorizedException;
import com.usthe.sureness.processor.exception.UnknownAccountException;
import com.usthe.sureness.processor.support.NoneProcessor;
import com.usthe.sureness.processor.support.PasswordProcessor;
import com.usthe.sureness.provider.DefaultAccount;
import com.usthe.sureness.provider.ducument.DocumentPathTreeProvider;
import com.usthe.sureness.subject.Subject;
import com.usthe.sureness.subject.support.NoneSubject;
import com.usthe.sureness.subject.support.PasswordSubject;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

/**
 * Release-readiness contracts for shipped entity route authorization templates.
 */
class EntityRouteAuthorizationConfigTest {

    private static final String GET_DISCOVERY = "/api/entities/discovery===get";
    private static final String POST_ENTITY = "/api/entities===post";
    private static final String PUT_DEFINITION = "/api/entities/42/definition===put";
    private static final String DELETE_ENTITY = "/api/entities/42===delete";
    private static final List<String> ENTITY_RULES = List.of(
            "  - /api/entities===get===[admin,user,guest]",
            "  - /api/entities/**===get===[admin,user,guest]",
            "  - /api/entities===post===[admin,user]",
            "  - /api/entities/**===post===[admin,user]",
            "  - /api/entities===put===[admin,user]",
            "  - /api/entities/**===put===[admin,user]",
            "  - /api/entities===delete===[admin]",
            "  - /api/entities/**===delete===[admin]");
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

    private final DefaultPathRoleMatcher pathRoleMatcher = loadPathRoleMatcher();

    @Test
    void shippedConfigsKeepEntityRoutesExplicitlyRoleScoped() {
        List<Executable> checks = new ArrayList<>();
        for (String config : SURENESS_CONFIGS) {
            checks.add(() -> assertRules(config));
        }
        assertAll(checks);
    }

    @Test
    void actualSurenessAuthorizationEnforcesEntityReadWriteAndDeleteRoles() {
        assertAll(
                () -> assertAnonymousDenied(GET_DISCOVERY),
                () -> assertAnonymousDenied(POST_ENTITY),
                () -> assertAnonymousDenied(PUT_DEFINITION),
                () -> assertAnonymousDenied(DELETE_ENTITY),
                () -> assertRoleAllowed("guest", GET_DISCOVERY),
                () -> assertRoleForbidden("guest", POST_ENTITY),
                () -> assertRoleForbidden("guest", PUT_DEFINITION),
                () -> assertRoleForbidden("guest", DELETE_ENTITY),
                () -> assertRoleAllowed("user", GET_DISCOVERY),
                () -> assertRoleAllowed("user", POST_ENTITY),
                () -> assertRoleAllowed("user", PUT_DEFINITION),
                () -> assertRoleForbidden("user", DELETE_ENTITY),
                () -> assertRoleAllowed("admin", GET_DISCOVERY),
                () -> assertRoleAllowed("admin", POST_ENTITY),
                () -> assertRoleAllowed("admin", PUT_DEFINITION),
                () -> assertRoleAllowed("admin", DELETE_ENTITY));
    }

    private void assertAnonymousDenied(String resource) {
        Subject subject = NoneSubject.builder().setTargetUri(resource).build();
        pathRoleMatcher.matchRole(subject);
        assertThatThrownBy(() -> new NoneProcessor().process(subject))
                .isInstanceOf(UnknownAccountException.class);
    }

    private void assertRoleAllowed(String role, String resource) {
        Subject subject = subject(role, resource);
        pathRoleMatcher.matchRole(subject);
        assertThatNoException().isThrownBy(() -> passwordProcessor().process(subject));
    }

    private void assertRoleForbidden(String role, String resource) {
        Subject subject = subject(role, resource);
        pathRoleMatcher.matchRole(subject);
        assertThatThrownBy(() -> passwordProcessor().process(subject))
                .isInstanceOf(UnauthorizedException.class);
    }

    private static Subject subject(String role, String resource) {
        return PasswordSubject.builder(role, "credential")
                .setTargetResource(resource)
                .build();
    }

    private static PasswordProcessor passwordProcessor() {
        PasswordProcessor processor = new PasswordProcessor();
        processor.setAccountProvider(appId -> DefaultAccount.builder(appId)
                .setPassword("credential")
                .setOwnRoles(List.of(appId))
                .build());
        return processor;
    }

    private static DefaultPathRoleMatcher loadPathRoleMatcher() {
        DocumentPathTreeProvider provider = new DocumentPathTreeProvider();
        provider.setContextPath(null);
        DefaultPathRoleMatcher matcher = new DefaultPathRoleMatcher();
        matcher.setPathTreeProvider(provider);
        matcher.buildTree();
        return matcher;
    }

    private static void assertRules(String config) throws IOException {
        List<String> lines = Files.readAllLines(repoRoot().resolve(config));
        List<String> actualRules = lines.stream()
                .filter(line -> line.startsWith("  - /api/entities"))
                .toList();
        assertEquals(ENTITY_RULES, actualRules,
                () -> config + " must contain only the reviewed Entity route policy");
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
