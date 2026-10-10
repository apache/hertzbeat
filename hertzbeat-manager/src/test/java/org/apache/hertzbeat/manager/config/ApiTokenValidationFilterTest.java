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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.usthe.sureness.subject.PrincipalMap;
import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.JsonWebTokenUtil;
import com.usthe.sureness.util.SurenessContextHolder;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityAccessTokenGateway;
import org.apache.hertzbeat.manager.service.AccountService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link ApiTokenValidationFilter}
 */
@ExtendWith(MockitoExtension.class)
class ApiTokenValidationFilterTest {

    private static String managedToken;

    private static String otherManagedToken;

    private static String legacyToken;

    private ApiTokenValidationFilter filter;

    @Mock
    private AccountService accountService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private PrincipalMap principalMap;

    @BeforeAll
    static void issueTokens() {
        JsonWebTokenUtil.setDefaultSecretKey("dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp"
                + "CyaFv0bwq2Eik0jdrKUtsA6bx3sDJeFV643R"
                + "LnfKefTjsIfJLBa2YkhEqEGtcHDTNe4CU6+9"
                + "dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp");
        Map<String, Object> managedClaims = new HashMap<>(1);
        managedClaims.put("managed", true);
        managedToken = JsonWebTokenUtil.issueJwt("admin", 3600L, List.of("admin"), managedClaims);
        otherManagedToken = JsonWebTokenUtil.issueJwt("admin", 7200L, List.of("admin"), managedClaims);
        legacyToken = JsonWebTokenUtil.issueJwt("admin", 3600L, List.of("admin"), new HashMap<>(0));
    }

    @BeforeEach
    void setUp() {
        filter = new ApiTokenValidationFilter(accountService);
        AuthTokenRequestContext.clear();
        lenient().when(request.getHeader(AuthTokenScopes.WORKSPACE_ID_HEADER)).thenReturn(null);
        lenient().when(request.getParameter("workspaceId")).thenReturn(null);
        lenient().when(request.getParameter("workspace_id")).thenReturn(null);
        lenient().when(principalMap.getPrincipal(AuthTokenScopes.CLAIM_WORKSPACE_ID)).thenReturn(null);
        lenient().when(principalMap.getPrincipal(
                ObservabilityAccessTokenGateway.CLAIM_CREDENTIAL_VERSION)).thenReturn(null);
    }

    @AfterEach
    void tearDown() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void testManagedSubjectWithoutTokenRejected() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn(null);
        mockErrorWriter();
        SubjectSum subject = mockManagedSubject();

        assertFalse(preHandle(subject));
        verify(response).setStatus(401);
        verify(accountService, never()).checkTokenStatus(any());
    }

    @Test
    void testManagedSubjectWithNonBearerAuthorizationRejected() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Basic dXNlcjpwYXNz");
        mockErrorWriter();
        SubjectSum subject = mockManagedSubject();

        assertFalse(preHandle(subject));
        verify(response).setStatus(401);
    }

    @Test
    void testManagedSubjectWithEmptyBearerRejected() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer ");
        mockErrorWriter();
        SubjectSum subject = mockManagedSubject();

        assertFalse(preHandle(subject));
        verify(response).setStatus(401);
    }

    @Test
    void testLegacyTokenPassesThrough() throws Exception {
        SubjectSum subject = mockSubject();

        assertTrue(preHandle(subject));
        verify(accountService, never()).checkTokenStatus(any());
    }

    @Test
    void testUiSessionRejectsWorkspaceOverrideWithoutManagedValidation() throws Exception {
        SubjectSum subject = mockSubject();
        when(principalMap.getPrincipal(AuthTokenScopes.CLAIM_WORKSPACE_ID)).thenReturn("team-a");
        when(request.getParameter("workspaceId")).thenReturn("team-b");
        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertFalse(filter.preHandle(request, response, new Object()));
            verify(response).setStatus(403);
            org.junit.jupiter.api.Assertions.assertNull(AuthTokenRequestContext.currentWorkspaceId());
            org.junit.jupiter.api.Assertions.assertNull(AuthTokenRequestContext.currentAuthenticatedWorkspaceId());
            verify(accountService, never()).checkTokenStatus(any());
        }
    }

    @Test
    void testMissingSubjectWorkspaceRejectsRequestedWorkspace() throws Exception {
        SubjectSum subject = mockSubject();
        when(request.getHeader(AuthTokenScopes.WORKSPACE_ID_HEADER)).thenReturn("team-b");
        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertFalse(filter.preHandle(request, response, new Object()));
            verify(response).setStatus(403);
            org.junit.jupiter.api.Assertions.assertNull(AuthTokenRequestContext.currentWorkspaceId());
            org.junit.jupiter.api.Assertions.assertNull(AuthTokenRequestContext.currentAuthenticatedWorkspaceId());
        }
    }

    @Test
    void testUiSessionAllowsMatchingRequestedWorkspace() throws Exception {
        SubjectSum subject = mockSubject();
        when(principalMap.getPrincipal(AuthTokenScopes.CLAIM_WORKSPACE_ID)).thenReturn("team-a");
        when(request.getHeader(AuthTokenScopes.WORKSPACE_ID_HEADER)).thenReturn(" team-a ");

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertTrue(filter.preHandle(request, response, new Object()));
            org.junit.jupiter.api.Assertions.assertEquals("team-a", AuthTokenRequestContext.currentWorkspaceId());
            org.junit.jupiter.api.Assertions.assertEquals(
                    "team-a", AuthTokenRequestContext.currentAuthenticatedWorkspaceId());
        }
    }

    @Test
    void testUiSessionRejectsSnakeCaseWorkspaceOverride() throws Exception {
        SubjectSum subject = mockSubject();
        when(principalMap.getPrincipal(AuthTokenScopes.CLAIM_WORKSPACE_ID)).thenReturn("team-a");
        when(request.getParameter("workspace_id")).thenReturn("team-b");
        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertFalse(filter.preHandle(request, response, new Object()));
            verify(response).setStatus(403);
            org.junit.jupiter.api.Assertions.assertNull(AuthTokenRequestContext.currentWorkspaceId());
            org.junit.jupiter.api.Assertions.assertNull(AuthTokenRequestContext.currentAuthenticatedWorkspaceId());
        }
    }

    @Test
    void testManagedTokenActivePassesThrough() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/monitor");
        when(accountService.checkTokenStatus(
                managedToken, AuthTokenScopes.API_ADMIN, AuthTokenScopes.DEFAULT_WORKSPACE_ID)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"), 7L)).thenReturn(null);
        doNothing().when(accountService).touchTokenLastUsedTime(managedToken);
        SubjectSum subject = mockManagedSubjectWithClaims();
        when(principalMap.getPrincipal(ObservabilityAccessTokenGateway.CLAIM_CREDENTIAL_VERSION)).thenReturn(7L);

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertTrue(filter.preHandle(request, response, new Object()));
            verify(accountService).checkTokenStatus(
                    managedToken, AuthTokenScopes.API_ADMIN, AuthTokenScopes.DEFAULT_WORKSPACE_ID);
            verify(accountService).checkManagedTokenAccess("admin", List.of("admin"), 7L);
            verify(accountService).touchTokenLastUsedTime(managedToken);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"POST", "PUT"})
    void monitorManageWritesRequireApiAdminScopeExactlyOnce(String method) throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(request.getMethod()).thenReturn(method);
        when(request.getRequestURI()).thenReturn("/api/monitors/manage");
        when(accountService.checkTokenStatus(
                managedToken, AuthTokenScopes.API_ADMIN, AuthTokenScopes.DEFAULT_WORKSPACE_ID)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"), null)).thenReturn(null);
        doNothing().when(accountService).touchTokenLastUsedTime(managedToken);
        SubjectSum subject = mockManagedSubjectWithClaims();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertTrue(filter.preHandle(request, response, new Object()));
            verify(accountService).checkTokenStatus(
                    managedToken, AuthTokenScopes.API_ADMIN, AuthTokenScopes.DEFAULT_WORKSPACE_ID);
            verify(accountService).checkManagedTokenAccess("admin", List.of("admin"), null);
            verify(accountService).touchTokenLastUsedTime(managedToken);
        }
    }

    @Test
    void testManagedTokenReadRequestRequiresReadonlyScope() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(request.getMethod()).thenReturn("GET");
        when(request.getRequestURI()).thenReturn("/api/monitor");
        when(accountService.checkTokenStatus(
                managedToken, AuthTokenScopes.READONLY_QUERY, AuthTokenScopes.DEFAULT_WORKSPACE_ID)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"), null)).thenReturn(null);
        doNothing().when(accountService).touchTokenLastUsedTime(managedToken);
        SubjectSum subject = mockManagedSubjectWithClaims();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertTrue(filter.preHandle(request, response, new Object()));
            verify(accountService).checkTokenStatus(
                    managedToken, AuthTokenScopes.READONLY_QUERY, AuthTokenScopes.DEFAULT_WORKSPACE_ID);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/logs/analysis/compare", "/api/logs/analysis/compare/other", "/api/monitors/manage"})
    void comparisonPostAloneUsesReadOnlyScope(String uri) throws Exception {
        String required = "/api/logs/analysis/compare".equals(uri) ? AuthTokenScopes.READONLY_QUERY : AuthTokenScopes.API_ADMIN;
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn(uri);
        when(accountService.checkTokenStatus(
                managedToken, required, AuthTokenScopes.DEFAULT_WORKSPACE_ID)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"), null)).thenReturn(null);
        doNothing().when(accountService).touchTokenLastUsedTime(managedToken);
        SubjectSum subject = mockManagedSubjectWithClaims();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertTrue(filter.preHandle(request, response, new Object()));
            verify(accountService).checkTokenStatus(
                    managedToken, required, AuthTokenScopes.DEFAULT_WORKSPACE_ID);
        }
    }

    @Test
    void testManagedTokenOtlpRequestRequiresIngestScope() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(request.getRequestURI()).thenReturn("/api/otlp/v1/metrics");
        when(accountService.checkTokenStatus(
                managedToken, AuthTokenScopes.OTLP_INGEST, AuthTokenScopes.DEFAULT_WORKSPACE_ID)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"), null)).thenReturn(null);
        doNothing().when(accountService).touchTokenLastUsedTime(managedToken);
        SubjectSum subject = mockManagedSubjectWithClaims();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertTrue(filter.preHandle(request, response, new Object()));
            verify(accountService).checkTokenStatus(
                    managedToken, AuthTokenScopes.OTLP_INGEST, AuthTokenScopes.DEFAULT_WORKSPACE_ID);
            org.junit.jupiter.api.Assertions.assertNull(AuthTokenRequestContext.currentCollectorId());
        }
    }

    @Test
    void testManagedCollectorTokenBindsIdentityForAllowedSignal() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(request.getRequestURI()).thenReturn("/api/otlp/v1/metrics");
        when(accountService.checkTokenStatus(
                managedToken, AuthTokenScopes.OTLP_INGEST, AuthTokenScopes.DEFAULT_WORKSPACE_ID)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"), null)).thenReturn(null);
        SubjectSum subject = mockManagedSubjectWithClaims();
        when(principalMap.getPrincipal(AuthTokenScopes.CLAIM_TOKEN_AUDIENCE))
                .thenReturn(AuthTokenScopes.MANAGED_COLLECTOR_AUDIENCE);
        when(principalMap.getPrincipal(AuthTokenScopes.CLAIM_COLLECTOR_ID)).thenReturn("edge-west");
        when(principalMap.getPrincipal(AuthTokenScopes.CLAIM_ALLOWED_SIGNALS))
                .thenReturn(List.of("metrics", "logs", "traces"));

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertTrue(filter.preHandle(request, response, new Object()));
            org.junit.jupiter.api.Assertions.assertEquals("edge-west", AuthTokenRequestContext.currentCollectorId());

            filter.afterCompletion(request, response, new Object(), null);
            org.junit.jupiter.api.Assertions.assertNull(AuthTokenRequestContext.currentCollectorId());
        }
    }

    @Test
    void testManagedCollectorTokenRejectsUnallowedSignal() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(request.getRequestURI()).thenReturn("/api/otlp/v1/traces");
        when(accountService.checkTokenStatus(
                managedToken, AuthTokenScopes.OTLP_INGEST, AuthTokenScopes.DEFAULT_WORKSPACE_ID)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"), null)).thenReturn(null);
        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));
        SubjectSum subject = mockManagedSubjectWithClaims();
        when(principalMap.getPrincipal(AuthTokenScopes.CLAIM_TOKEN_AUDIENCE))
                .thenReturn(AuthTokenScopes.MANAGED_COLLECTOR_AUDIENCE);
        when(principalMap.getPrincipal(AuthTokenScopes.CLAIM_COLLECTOR_ID)).thenReturn("edge-west");
        when(principalMap.getPrincipal(AuthTokenScopes.CLAIM_ALLOWED_SIGNALS)).thenReturn(List.of("metrics"));

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertFalse(filter.preHandle(request, response, new Object()));
            verify(response).setStatus(401);
            verify(accountService, never()).touchTokenLastUsedTime(managedToken);
        }
    }

    @Test
    void testManagedTokenWorkspaceOverrideRejectedAfterTokenBoundaryValidation() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(request.getHeader(AuthTokenScopes.WORKSPACE_ID_HEADER)).thenReturn("prod-west");
        when(principalMap.getPrincipal(AuthTokenScopes.CLAIM_WORKSPACE_ID)).thenReturn("team-a");
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/monitor");
        when(accountService.checkTokenStatus(managedToken, AuthTokenScopes.API_ADMIN, "team-a")).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"), null)).thenReturn(null);
        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));
        SubjectSum subject = mockManagedSubjectWithClaims();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertFalse(filter.preHandle(request, response, new Object()));
            verify(accountService).checkTokenStatus(managedToken, AuthTokenScopes.API_ADMIN, "team-a");
            verify(accountService).checkManagedTokenAccess("admin", List.of("admin"), null);
            verify(accountService, never()).touchTokenLastUsedTime(managedToken);
            verify(response).setStatus(403);
            org.junit.jupiter.api.Assertions.assertNull(AuthTokenRequestContext.currentWorkspaceId());
            org.junit.jupiter.api.Assertions.assertNull(AuthTokenRequestContext.currentAuthenticatedWorkspaceId());
        }
    }

    @Test
    void testManagedTokenRevokedRejected() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/monitor");
        when(accountService.checkTokenStatus(
                managedToken, AuthTokenScopes.API_ADMIN, AuthTokenScopes.DEFAULT_WORKSPACE_ID))
                .thenReturn("Token has been revoked");
        mockErrorWriter();
        SubjectSum subject = mockManagedSubject();

        assertFalse(preHandle(subject));
        verify(response).setStatus(401);
    }

    @Test
    void testManagedTokenInQueryParameterRevokedRejected() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn(null);
        when(request.getParameter("token")).thenReturn(managedToken);
        when(accountService.checkTokenStatus(
                managedToken, AuthTokenScopes.API_ADMIN, AuthTokenScopes.DEFAULT_WORKSPACE_ID))
                .thenReturn("Token has been revoked");
        mockErrorWriter();
        SubjectSum subject = mockManagedSubject();

        assertFalse(preHandle(subject));
        verify(response).setStatus(401);
    }

    @Test
    void testManagedTokenInQueryParameterActivePassesThrough() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn(null);
        when(request.getParameter("token")).thenReturn(managedToken);
        when(accountService.checkTokenStatus(
                managedToken, AuthTokenScopes.API_ADMIN, AuthTokenScopes.DEFAULT_WORKSPACE_ID))
                .thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"), null)).thenReturn(null);
        SubjectSum subject = mockManagedSubjectWithClaims();

        assertTrue(preHandle(subject));
        verify(accountService).touchTokenLastUsedTime(managedToken);
    }

    @Test
    void testRevokedQueryTokenRejectedEvenWithActiveHeaderToken() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + otherManagedToken);
        when(request.getParameter("token")).thenReturn(managedToken);
        when(accountService.checkTokenStatus(
                otherManagedToken, AuthTokenScopes.API_ADMIN, AuthTokenScopes.DEFAULT_WORKSPACE_ID))
                .thenReturn(null);
        when(accountService.checkTokenStatus(
                managedToken, AuthTokenScopes.API_ADMIN, AuthTokenScopes.DEFAULT_WORKSPACE_ID))
                .thenReturn("Token has been revoked");
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"), null)).thenReturn(null);
        mockErrorWriter();
        SubjectSum subject = mockManagedSubjectWithClaims();

        assertFalse(preHandle(subject));
        verify(response).setStatus(401);
    }

    @Test
    void testHeaderTokenExtractedLikeSurenessRejectsRevokedToken() throws Exception {
        // Sureness strips every "Bearer" from the header, so a trailing "Bearer" still authenticates the token
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken + "Bearer");
        when(request.getParameter("token")).thenReturn(otherManagedToken);
        when(accountService.checkTokenStatus(
                managedToken, AuthTokenScopes.API_ADMIN, AuthTokenScopes.DEFAULT_WORKSPACE_ID))
                .thenReturn("Token has been revoked");
        mockErrorWriter();
        SubjectSum subject = mockManagedSubject();

        assertFalse(preHandle(subject));
        verify(response).setStatus(401);
        verify(accountService, never()).checkTokenStatus(
                org.mockito.ArgumentMatchers.eq(otherManagedToken), any(), any());
    }

    @Test
    void testNonManagedCandidatesAreIgnored() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(request.getParameter("token")).thenReturn(legacyToken);
        when(accountService.checkTokenStatus(
                managedToken, AuthTokenScopes.API_ADMIN, AuthTokenScopes.DEFAULT_WORKSPACE_ID))
                .thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"), null)).thenReturn(null);
        SubjectSum subject = mockManagedSubjectWithClaims();

        assertTrue(preHandle(subject));
        verify(accountService, never()).checkTokenStatus(
                org.mockito.ArgumentMatchers.eq(legacyToken), any(), any());
    }

    @Test
    void testManagedTokenStatusCheckFailureRejectsRequest() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/monitor");
        when(accountService.checkTokenStatus(
                managedToken, AuthTokenScopes.API_ADMIN, AuthTokenScopes.DEFAULT_WORKSPACE_ID))
                .thenThrow(new RuntimeException("DB down"));
        mockErrorWriter();
        SubjectSum subject = mockManagedSubject();

        assertFalse(preHandle(subject));
        verify(response).setStatus(503);
        verify(accountService, never()).touchTokenLastUsedTime(any());
    }

    @Test
    void testManagedTokenOutdatedRolesRejected() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/monitor");
        when(accountService.checkTokenStatus(
                managedToken, AuthTokenScopes.API_ADMIN, AuthTokenScopes.DEFAULT_WORKSPACE_ID)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"), null))
                .thenReturn("Token permissions are outdated");
        mockErrorWriter();
        SubjectSum subject = mockManagedSubjectWithClaims();

        assertFalse(preHandle(subject));
        verify(response).setStatus(401);
        verify(accountService, never()).touchTokenLastUsedTime(managedToken);
    }

    @Test
    void testTouchLastUsedTimeFailureDoesNotRejectRequest() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/monitor");
        when(accountService.checkTokenStatus(
                managedToken, AuthTokenScopes.API_ADMIN, AuthTokenScopes.DEFAULT_WORKSPACE_ID)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"), null)).thenReturn(null);
        // touchTokenLastUsedTime throws exception
        org.mockito.Mockito.doThrow(new RuntimeException("DB error"))
                .when(accountService).touchTokenLastUsedTime(managedToken);
        SubjectSum subject = mockManagedSubjectWithClaims();

        assertTrue(preHandle(subject));
    }

    @Test
    void testUnauthenticatedRequestSkipsValidation() throws Exception {
        assertTrue(preHandle(null));
        verify(accountService, never()).checkTokenStatus(any());
    }

    @Test
    void testManagedTokenAccountValidationFailureRejectsRequest() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/monitor");
        when(accountService.checkTokenStatus(
                managedToken, AuthTokenScopes.API_ADMIN, AuthTokenScopes.DEFAULT_WORKSPACE_ID)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"), null))
                .thenThrow(new RuntimeException("account store unavailable"));
        mockErrorWriter();
        SubjectSum subject = mockManagedSubjectWithClaims();

        assertFalse(preHandle(subject));
        verify(response).setStatus(503);
        verify(accountService, never()).touchTokenLastUsedTime(managedToken);
    }

    private boolean preHandle(SubjectSum subject) throws Exception {
        try (MockedStatic<SurenessContextHolder> holder = mockStatic(SurenessContextHolder.class)) {
            holder.when(SurenessContextHolder::getBindSubject).thenReturn(subject);
            return filter.preHandle(request, response, new Object());
        }
    }

    private void mockErrorWriter() throws Exception {
        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));
    }

    private SubjectSum mockSubject() {
        SubjectSum subjectSum = org.mockito.Mockito.mock(SubjectSum.class);
        when(subjectSum.getPrincipalMap()).thenReturn(principalMap);
        return subjectSum;
    }

    private SubjectSum mockManagedSubject() {
        SubjectSum subjectSum = mockSubject();
        when(principalMap.getPrincipal("managed")).thenReturn(true);
        return subjectSum;
    }

    private SubjectSum mockManagedSubjectWithClaims() {
        SubjectSum subjectSum = mockManagedSubject();
        when(subjectSum.getPrincipal()).thenReturn("admin");
        when(subjectSum.getRoles()).thenReturn(List.of("admin"));
        return subjectSum;
    }
}
