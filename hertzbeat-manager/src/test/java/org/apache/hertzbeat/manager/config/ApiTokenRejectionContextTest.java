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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import com.usthe.sureness.subject.PrincipalMap;
import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.io.IOException;
import java.util.List;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.service.AccountService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** Direct rejection-lifecycle proof; synthetic subject/storage doubles are not JWT integration. */
class ApiTokenRejectionContextTest {
    @AfterEach
    void cleanFixture() {
        AuthTokenRequestContext.clear();
    }

    @ParameterizedTest
    @ValueSource(strings = {"revoked", "roles", "storage-failure", "workspace", "collector"})
    void eachHandledFalseBranchClearsRequestContext(String boundary) throws Exception {
        AccountService accounts = mock(AccountService.class);
        PrincipalMap claims = mock(PrincipalMap.class);
        SubjectSum subject = subject(claims);
        MockHttpServletRequest request = request();
        MockHttpServletResponse response = new MockHttpServletResponse();
        int status = 401;
        switch (boundary) {
            case "revoked" -> when(accounts.checkTokenStatus(any(), any(), any())).thenReturn("Token has been revoked");
            case "roles" -> when(accounts.checkManagedTokenAccess(any(), any(), any())).thenReturn("Token permissions are outdated");
            case "storage-failure" -> {
                when(accounts.checkTokenStatus(any(), any(), any())).thenThrow(new IllegalStateException("Synthetic store failure"));
                status = 503;
            }
            case "workspace" -> {
                when(claims.getPrincipal("managed")).thenReturn(false);
                request.addHeader(AuthTokenScopes.WORKSPACE_ID_HEADER, "other-workspace");
                status = 403;
            }
            case "collector" -> when(claims.getPrincipal(AuthTokenScopes.CLAIM_TOKEN_AUDIENCE))
                    .thenReturn(AuthTokenScopes.MANAGED_COLLECTOR_AUDIENCE);
            default -> throw new IllegalArgumentException(boundary);
        }
        try (var holder = mockStatic(SurenessContextHolder.class)) {
            holder.when(SurenessContextHolder::getBindSubject).thenReturn(subject);
            assertThat(new ApiTokenValidationFilter(accounts).preHandle(request, response, new Object())).isFalse();
            assertThat(response.getStatus()).isEqualTo(status);
            assertCleared();
        }
    }

    @Test
    void rejectedResponseWriterIoExceptionPropagatesWithContextAlreadyCleared() throws Exception {
        AccountService accounts = mock(AccountService.class);
        when(accounts.checkTokenStatus(any(), any(), any())).thenReturn("Token has been revoked");
        var response = mock(jakarta.servlet.http.HttpServletResponse.class);
        when(response.getWriter()).thenThrow(new IOException("Synthetic writer failure"));
        try (var holder = mockStatic(SurenessContextHolder.class)) {
            SubjectSum subject = subject(mock(PrincipalMap.class));
            holder.when(SurenessContextHolder::getBindSubject).thenReturn(subject);
            assertThatThrownBy(() -> new ApiTokenValidationFilter(accounts).preHandle(request(), response, new Object()))
                    .isInstanceOf(IOException.class).hasMessage("Synthetic writer failure");
            assertCleared();
        }
    }

    private static SubjectSum subject(PrincipalMap claims) {
        SubjectSum subject = mock(SubjectSum.class);
        when(subject.getPrincipalMap()).thenReturn(claims);
        when(subject.getPrincipal()).thenReturn("synthetic-owner");
        when(subject.getRoles()).thenReturn(List.of("user"));
        when(claims.getPrincipal(AuthTokenScopes.CLAIM_WORKSPACE_ID)).thenReturn("default");
        when(claims.getPrincipal("managed")).thenReturn(true);
        return subject;
    }

    private static MockHttpServletRequest request() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/logs/list");
        request.addHeader("Authorization", "Bearer synthetic-token-reference");
        return request;
    }

    private static void assertCleared() {
        assertThat(AuthTokenRequestContext.currentAuthenticatedWorkspaceId()).isNull();
        assertThat(AuthTokenRequestContext.currentWorkspaceId()).isNull();
        assertThat(AuthTokenRequestContext.currentCollectorId()).isNull();
    }
}
