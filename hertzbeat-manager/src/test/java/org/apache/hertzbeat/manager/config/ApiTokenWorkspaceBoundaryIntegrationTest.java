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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.usthe.sureness.subject.PrincipalMap;
import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.service.AccountService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

class ApiTokenWorkspaceBoundaryIntegrationTest {

    @Test
    void legacyAuthenticatedSessionWithoutClaimUsesDefaultWorkspace() throws Exception {
        WorkspaceProbeController controller = new WorkspaceProbeController();
        MockMvc mockMvc = mockMvc(controller);
        SubjectSum subject = subjectWithoutWorkspaceClaim();

        try (var context = mockStatic(SurenessContextHolder.class)) {
            context.when(SurenessContextHolder::getBindSubject).thenReturn(subject);
            mockMvc.perform(request(HttpMethod.GET, "/api/entities/discovery"))
                    .andExpect(status().isOk());
        }

        assertThat(controller.workspaceId()).isEqualTo(AuthTokenScopes.DEFAULT_WORKSPACE_ID);
        assertThat(controller.authenticatedWorkspaceId()).isEqualTo(AuthTokenScopes.DEFAULT_WORKSPACE_ID);
    }

    @Test
    void legacyAuthenticatedSessionAllowsExplicitDefaultWorkspace() throws Exception {
        WorkspaceProbeController controller = new WorkspaceProbeController();
        MockMvc mockMvc = mockMvc(controller);
        SubjectSum subject = subjectWithoutWorkspaceClaim();

        try (var context = mockStatic(SurenessContextHolder.class)) {
            context.when(SurenessContextHolder::getBindSubject).thenReturn(subject);
            mockMvc.perform(request(HttpMethod.GET, "/api/entities/discovery")
                            .header(AuthTokenScopes.WORKSPACE_ID_HEADER, AuthTokenScopes.DEFAULT_WORKSPACE_ID))
                    .andExpect(status().isOk());
        }

        assertThat(controller.workspaceId()).isEqualTo(AuthTokenScopes.DEFAULT_WORKSPACE_ID);
        assertThat(controller.authenticatedWorkspaceId()).isEqualTo(AuthTokenScopes.DEFAULT_WORKSPACE_ID);
    }

    @Test
    void anonymousRequestWithoutSelectorRemainsUnbound() throws Exception {
        WorkspaceProbeController controller = new WorkspaceProbeController();
        MockMvc mockMvc = mockMvc(controller);

        try (var context = mockStatic(SurenessContextHolder.class)) {
            context.when(SurenessContextHolder::getBindSubject).thenReturn(null);
            mockMvc.perform(request(HttpMethod.GET, "/api/entities/discovery"))
                    .andExpect(status().isOk());
        }

        assertThat(controller.workspaceId()).isNull();
        assertThat(controller.authenticatedWorkspaceId()).isNull();
    }

    @Test
    void anonymousRequestCannotClaimExplicitWorkspace() throws Exception {
        WorkspaceProbeController controller = new WorkspaceProbeController();
        MockMvc mockMvc = mockMvc(controller);

        try (var context = mockStatic(SurenessContextHolder.class)) {
            context.when(SurenessContextHolder::getBindSubject).thenReturn(null);
            mockMvc.perform(request(HttpMethod.GET, "/api/entities/discovery")
                            .header(AuthTokenScopes.WORKSPACE_ID_HEADER, "team-b"))
                    .andExpect(status().isForbidden());
        }

        assertThat(controller.invocations()).isZero();
    }

    @ParameterizedTest
    @CsvSource({
            "GET,/api/entities/discovery",
            "GET,/api/agent/sessions",
            "POST,/api/otlp/v1/metrics"
    })
    void workspaceOverrideStopsEntityAiAndOtlpHandlers(String method, String path) throws Exception {
        WorkspaceProbeController controller = new WorkspaceProbeController();
        MockMvc mockMvc = mockMvc(controller);
        SubjectSum subject = mock(SubjectSum.class);
        PrincipalMap principalMap = mock(PrincipalMap.class);
        when(subject.getPrincipalMap()).thenReturn(principalMap);
        when(principalMap.getPrincipal(AuthTokenScopes.CLAIM_WORKSPACE_ID)).thenReturn("team-a");

        try (var context = mockStatic(SurenessContextHolder.class)) {
            context.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            mockMvc.perform(request(HttpMethod.valueOf(method), path)
                            .header(AuthTokenScopes.WORKSPACE_ID_HEADER, "team-b"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value(403))
                    .andExpect(jsonPath("$.msg").value("Workspace access denied"));
        }

        assertThat(controller.invocations()).isZero();
    }

    private MockMvc mockMvc(WorkspaceProbeController controller) {
        ApiTokenValidationFilter filter = new ApiTokenValidationFilter(mock(AccountService.class));
        return MockMvcBuilders.standaloneSetup(controller)
                .addInterceptors(filter)
                .build();
    }

    private SubjectSum subjectWithoutWorkspaceClaim() {
        SubjectSum subject = mock(SubjectSum.class);
        when(subject.getPrincipalMap()).thenReturn(mock(PrincipalMap.class));
        return subject;
    }

    @RestController
    private static final class WorkspaceProbeController {

        private final AtomicInteger invocations = new AtomicInteger();
        private final AtomicReference<String> workspaceId = new AtomicReference<>();
        private final AtomicReference<String> authenticatedWorkspaceId = new AtomicReference<>();

        @RequestMapping(path = {
                "/api/entities/discovery",
                "/api/agent/sessions",
                "/api/otlp/v1/metrics"
        }, method = {RequestMethod.GET, RequestMethod.POST})
        String probe() {
            workspaceId.set(AuthTokenRequestContext.currentWorkspaceId());
            authenticatedWorkspaceId.set(AuthTokenRequestContext.currentAuthenticatedWorkspaceId());
            invocations.incrementAndGet();
            return "ok";
        }

        int invocations() {
            return invocations.get();
        }

        String workspaceId() {
            return workspaceId.get();
        }

        String authenticatedWorkspaceId() {
            return authenticatedWorkspaceId.get();
        }
    }
}
