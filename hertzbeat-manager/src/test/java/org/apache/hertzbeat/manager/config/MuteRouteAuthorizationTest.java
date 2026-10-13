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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.usthe.sureness.matcher.DefaultPathRoleMatcher;
import com.usthe.sureness.matcher.PathTreeProvider;
import com.usthe.sureness.matcher.util.TirePathTree;
import com.usthe.sureness.mgt.SecurityManager;
import com.usthe.sureness.processor.support.PasswordProcessor;
import com.usthe.sureness.subject.support.PasswordSubject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.manager.controller.GeneralConfigController;
import org.apache.hertzbeat.manager.service.ConfigService;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.yaml.snakeyaml.Yaml;

/** Reads every shipped policy and exercises real Sureness role authorization for the mute write. */
class MuteRouteAuthorizationTest {

    private static final String WRITE_RESOURCE = "/api/config/mute===post";
    private static final List<String> CONFIGURATIONS = List.of(
            "hertzbeat-startup/src/main/resources/sureness.yml",
            "hertzbeat-manager/src/test/resources/sureness.yml",
            "hertzbeat-e2e/hertzbeat-observability-e2e/src/test/resources/sureness.yml",
            "script/sureness.yml",
            "script/docker-compose/hertzbeat-mysql-iotdb/conf/sureness.yml",
            "script/docker-compose/hertzbeat-mysql-tdengine/conf/sureness.yml",
            "script/docker-compose/hertzbeat-mysql-victoria-metrics/conf/sureness.yml",
            "script/docker-compose/hertzbeat-postgresql-greptimedb/conf/sureness.yml",
            "script/docker-compose/hertzbeat-postgresql-victoria-metrics/conf/sureness.yml");

    @ParameterizedTest
    @MethodSource("configurations")
    void eachConfigurationHasOneConsistentAdminOnlyMuteWrite(String configuration) throws Exception {
        List<String> rules = resourceRoles(configuration);
        assertEquals(List.of(WRITE_RESOURCE + "===[admin]"),
                rules.stream().filter(rule -> rule.startsWith(WRITE_RESOURCE + "===")).toList(), configuration);
        assertEquals("[admin,user,guest]", tree(rules).searchPathFilterRoles("/api/config/mute===get"),
                "read permissions must stay unchanged: " + configuration);
    }

    @ParameterizedTest
    @MethodSource("configurations")
    @SuppressWarnings("unchecked")
    void productionMatcherKeepsMuteWriteAuthenticatedAndAdminOnly(String configuration) throws Exception {
        Map<String, Object> document = new Yaml().load(Files.readString(root().resolve(configuration)));
        DefaultPathRoleMatcher matcher = new DefaultPathRoleMatcher();
        matcher.setPathTreeProvider(new PathTreeProvider() {
            @Override
            public Set<String> providePathData() {
                return Set.copyOf((List<String>) document.get("resourceRole"));
            }

            @Override
            public Set<String> provideExcludedResource() {
                return Set.copyOf((List<String>) document.get("excludedResource"));
            }
        });
        matcher.buildTree();
        PasswordSubject subject = PasswordSubject.builder("fixture-already-authenticated", null)
                .setTargetResource(WRITE_RESOURCE).setOwnRoles(List.of("admin")).build();
        assertFalse(matcher.isExcludedResource(subject), configuration);
        matcher.matchRole(subject);
        assertEquals(List.of("admin"), subject.getSupportRoles(), configuration);
        for (String role : List.of("admin", "user", "guest")) {
            subject.setOwnRoles(List.of(role));
            if ("admin".equals(role)) {
                org.junit.jupiter.api.Assertions.assertDoesNotThrow(() -> new PasswordProcessor().authorized(subject));
            } else {
                org.junit.jupiter.api.Assertions.assertThrows(
                        com.usthe.sureness.processor.exception.UnauthorizedException.class,
                        () -> new PasswordProcessor().authorized(subject));
            }
        }
    }

    @ParameterizedTest
    @MethodSource("rolesAndConfigurations")
    void realMatcherAndAuthorizationAllowAdminAndRejectUserAndGuest(
            String configuration, String role, int expectedStatus) throws Exception {
        String supported = tree(resourceRoles(configuration)).searchPathFilterRoles(WRITE_RESOURCE);
        PasswordSubject subject = PasswordSubject.builder("fixture-already-authenticated", null)
                .setTargetResource(WRITE_RESOURCE).setOwnRoles(List.of(role))
                .setSupportRoles(Arrays.asList(supported.substring(1, supported.length() - 1).split(","))).build();
        SecurityManager manager = mock(SecurityManager.class);
        when(manager.checkIn(any())).thenAnswer(invocation -> {
            new PasswordProcessor().authorized(subject);
            return subject.generateSubjectSummary();
        });
        ConfigService service = mock(ConfigService.class);
        GeneralConfigController controller = new GeneralConfigController();
        ReflectionTestUtils.setField(controller, "configService", service);
        var mvc = MockMvcBuilders.standaloneSetup(controller)
                .addFilter(new SurenessSpring7ServletFilter(manager)).build();
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("mute-fixture-workspace");
        AuthTokenRequestContext.bindWorkspaceId("mute-fixture-workspace");
        try {
            mvc.perform(MockMvcRequestBuilders.post("/api/config/mute")
                            .contentType(MediaType.APPLICATION_JSON).content("true"))
                    .andExpect(status().is(expectedStatus));
            assertEquals("mute-fixture-workspace", AuthTokenRequestContext.currentAuthenticatedWorkspaceId());
            assertEquals("mute-fixture-workspace", AuthTokenRequestContext.currentWorkspaceId());
        } finally {
            AuthTokenRequestContext.clear();
        }
        if (expectedStatus == 200) {
            verify(service).saveConfig("mute", Boolean.TRUE);
        } else {
            verifyNoInteractions(service);
        }
    }

    @SuppressWarnings("unchecked")
    private static List<String> resourceRoles(String configuration) throws Exception {
        Map<String, Object> document = new Yaml().load(Files.readString(root().resolve(configuration)));
        return (List<String>) document.get("resourceRole");
    }

    private static TirePathTree tree(List<String> rules) {
        TirePathTree tree = new TirePathTree();
        tree.buildTree(new LinkedHashSet<>(rules));
        return tree;
    }

    private static Stream<String> configurations() {
        return CONFIGURATIONS.stream();
    }

    private static Stream<Arguments> rolesAndConfigurations() {
        return configurations().flatMap(path -> Stream.of(Arguments.of(path, "admin", 200),
                Arguments.of(path, "user", 403), Arguments.of(path, "guest", 403)));
    }

    private static Path root() {
        Path current = Path.of("").toAbsolutePath();
        while (current != null && !Files.isRegularFile(current.resolve("mvnw"))) {
            current = current.getParent();
        }
        if (current == null) {
            throw new IllegalStateException("Cannot locate repository root");
        }
        return current;
    }
}
