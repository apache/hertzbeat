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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.usthe.sureness.matcher.util.TirePathTree;
import com.usthe.sureness.mgt.SecurityManager;
import com.usthe.sureness.processor.support.PasswordProcessor;
import com.usthe.sureness.subject.support.PasswordSubject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.apache.hertzbeat.observability.logs.controller.LogManagerController;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.logs.service.LogManagementService;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.yaml.snakeyaml.Yaml;

/** Exercises the shipped matcher, Sureness authorization and servlet filter on the real delete route. */
class LogDeletionAuthorizationTest {

    @ParameterizedTest
    @MethodSource("rolesAndConfigurations")
    @SuppressWarnings("unchecked")
    void exactDeleteRuleAllowsAdminAndRejectsOtherRoles(String configuration, String role, int expectedStatus)
            throws Exception {
        Map<String, Object> document = new Yaml().load(Files.readString(root().resolve(configuration)));
        TirePathTree tree = new TirePathTree();
        tree.buildTree(new LinkedHashSet<>((List<String>) document.get("resourceRole")));
        String supported = tree.searchPathFilterRoles("/api/logs===delete");
        assertEquals("[admin]", supported, configuration);
        assertNull(tree.searchPathFilterRoles("/api/logs/unrelated===delete"),
                "the fix must not introduce a log-delete wildcard");
        assertEquals("[admin,user,guest]", tree.searchPathFilterRoles("/api/logs/list===get"));
        assertEquals("[admin,user,guest]", tree.searchPathFilterRoles("/api/logs/analysis/compare===post"));
        assertEquals("[admin,user]", tree.searchPathFilterRoles("/api/logs/otlp/v1/logs===post"));
        PasswordSubject subject = PasswordSubject.builder("already-authenticated", null)
                .setTargetResource("/api/logs===delete").setOwnRoles(List.of(role))
                .setSupportRoles(List.of(supported.substring(1, supported.length() - 1))).build();
        SecurityManager manager = mock(SecurityManager.class);
        when(manager.checkIn(any())).thenAnswer(invocation -> {
            new PasswordProcessor().authorized(subject);
            return subject.generateSubjectSummary();
        });
        LogManagementService service = mock(LogManagementService.class);
        if (expectedStatus == 200) {
            when(service.batchDelete(List.of(1L))).thenReturn(true);
        }
        var mvc = MockMvcBuilders.standaloneSetup(new LogManagerController(service))
                .addFilter(new SurenessSpring7ServletFilter(manager)).build();
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("default");
        try {
            mvc.perform(MockMvcRequestBuilders.delete("/api/logs").param("timeUnixNanos", "1"))
                    .andExpect(status().is(expectedStatus));
        } finally {
            AuthTokenRequestContext.clear();
        }
        if (expectedStatus == 200) {
            verify(service).batchDelete(List.of(1L));
        } else {
            verifyNoInteractions(service);
        }
    }

    private static Stream<Arguments> rolesAndConfigurations() {
        return Stream.of("hertzbeat-startup/src/main/resources/sureness.yml",
                "hertzbeat-manager/src/test/resources/sureness.yml",
                "hertzbeat-e2e/hertzbeat-observability-e2e/src/test/resources/sureness.yml",
                "script/sureness.yml",
                "script/docker-compose/hertzbeat-mysql-iotdb/conf/sureness.yml",
                "script/docker-compose/hertzbeat-mysql-tdengine/conf/sureness.yml",
                "script/docker-compose/hertzbeat-mysql-victoria-metrics/conf/sureness.yml",
                "script/docker-compose/hertzbeat-postgresql-greptimedb/conf/sureness.yml",
                "script/docker-compose/hertzbeat-postgresql-victoria-metrics/conf/sureness.yml")
                .flatMap(path -> Stream.of(Arguments.of(path, "admin", 200), Arguments.of(path, "user", 403),
                        Arguments.of(path, "guest", 403)));
    }

    private static Path root() {
        Path candidate = Path.of("").toAbsolutePath();
        while (candidate != null && !Files.isRegularFile(candidate.resolve("mvnw"))) {
            candidate = candidate.getParent();
        }
        if (candidate == null) {
            throw new IllegalStateException("Cannot locate repository root");
        }
        return candidate;
    }
}
