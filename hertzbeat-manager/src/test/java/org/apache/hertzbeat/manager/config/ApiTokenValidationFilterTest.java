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
import org.apache.hertzbeat.manager.service.AccountService;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
    void testManagedTokenActivePassesThrough() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(accountService.checkTokenStatus(managedToken)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"))).thenReturn(null);
        doNothing().when(accountService).touchTokenLastUsedTime(managedToken);
        SubjectSum subject = mockManagedSubjectWithClaims();

        assertTrue(preHandle(subject));
        verify(accountService).checkTokenStatus(managedToken);
        verify(accountService).checkManagedTokenAccess("admin", List.of("admin"));
        verify(accountService).touchTokenLastUsedTime(managedToken);
    }

    @Test
    void testManagedTokenRevokedRejected() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(accountService.checkTokenStatus(managedToken)).thenReturn("Token has been revoked");
        mockErrorWriter();
        SubjectSum subject = mockManagedSubject();

        assertFalse(preHandle(subject));
        verify(response).setStatus(401);
    }

    @Test
    void testManagedTokenInQueryParameterRevokedRejected() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn(null);
        when(request.getParameter("token")).thenReturn(managedToken);
        when(accountService.checkTokenStatus(managedToken)).thenReturn("Token has been revoked");
        mockErrorWriter();
        SubjectSum subject = mockManagedSubject();

        assertFalse(preHandle(subject));
        verify(response).setStatus(401);
    }

    @Test
    void testManagedTokenInQueryParameterActivePassesThrough() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn(null);
        when(request.getParameter("token")).thenReturn(managedToken);
        when(accountService.checkTokenStatus(managedToken)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"))).thenReturn(null);
        SubjectSum subject = mockManagedSubjectWithClaims();

        assertTrue(preHandle(subject));
        verify(accountService).touchTokenLastUsedTime(managedToken);
    }

    @Test
    void testRevokedQueryTokenRejectedEvenWithActiveHeaderToken() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + otherManagedToken);
        when(request.getParameter("token")).thenReturn(managedToken);
        when(accountService.checkTokenStatus(otherManagedToken)).thenReturn(null);
        when(accountService.checkTokenStatus(managedToken)).thenReturn("Token has been revoked");
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"))).thenReturn(null);
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
        when(accountService.checkTokenStatus(managedToken)).thenReturn("Token has been revoked");
        mockErrorWriter();
        SubjectSum subject = mockManagedSubject();

        assertFalse(preHandle(subject));
        verify(response).setStatus(401);
        verify(accountService, never()).checkTokenStatus(otherManagedToken);
    }

    @Test
    void testNonManagedCandidatesAreIgnored() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(request.getParameter("token")).thenReturn(legacyToken);
        when(accountService.checkTokenStatus(managedToken)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"))).thenReturn(null);
        SubjectSum subject = mockManagedSubjectWithClaims();

        assertTrue(preHandle(subject));
        verify(accountService, never()).checkTokenStatus(legacyToken);
    }

    @Test
    void testManagedTokenStatusCheckFailureRejectsRequest() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(accountService.checkTokenStatus(managedToken)).thenThrow(new RuntimeException("DB down"));
        mockErrorWriter();
        SubjectSum subject = mockManagedSubject();

        assertFalse(preHandle(subject));
        verify(response).setStatus(503);
        verify(accountService, never()).touchTokenLastUsedTime(any());
    }

    @Test
    void testManagedTokenOutdatedRolesRejected() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(accountService.checkTokenStatus(managedToken)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin")))
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
        when(accountService.checkTokenStatus(managedToken)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"))).thenReturn(null);
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
        when(accountService.checkTokenStatus(managedToken)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin")))
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
