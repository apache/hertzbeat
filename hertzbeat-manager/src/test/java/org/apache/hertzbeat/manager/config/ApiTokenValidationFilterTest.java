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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mockStatic;

import com.usthe.sureness.subject.PrincipalMap;
import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.List;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.manager.service.AccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link ApiTokenValidationFilter}
 */
@ExtendWith(MockitoExtension.class)
class ApiTokenValidationFilterTest {

    private ApiTokenValidationFilter filter;

    @Mock
    private AccountService accountService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private PrincipalMap principalMap;

    @BeforeEach
    void setUp() {
        filter = new ApiTokenValidationFilter(accountService);
    }

    @Test
    void testNoAuthorizationHeaderPassesThrough() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn(null);
        SubjectSum subject = mockManagedSubject();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertTrue(filter.preHandle(request, response, new Object()));
        }
    }

    @Test
    void testNonBearerAuthorizationPassesThrough() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Basic dXNlcjpwYXNz");
        SubjectSum subject = mockManagedSubject();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertTrue(filter.preHandle(request, response, new Object()));
        }
    }

    @Test
    void testLegacyTokenPassesThrough() throws Exception {
        SubjectSum subject = mockSubject();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertTrue(filter.preHandle(request, response, new Object()));
            verify(accountService, never()).checkTokenStatus(any());
        }
    }

    @Test
    void testManagedTokenActivePassesThrough() throws Exception {
        String managedToken = "managed-token";
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(accountService.checkTokenStatus(managedToken)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"))).thenReturn(null);
        doNothing().when(accountService).touchTokenLastUsedTime(managedToken);
        SubjectSum subject = mockManagedSubjectWithClaims();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertTrue(filter.preHandle(request, response, new Object()));
            verify(accountService).checkTokenStatus(managedToken);
            verify(accountService).checkManagedTokenAccess("admin", List.of("admin"));
            verify(accountService).touchTokenLastUsedTime(managedToken);
        }
    }

    @Test
    void testManagedTokenRevokedRejected() throws Exception {
        String revokedToken = "revoked-token";
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + revokedToken);
        when(accountService.checkTokenStatus(revokedToken)).thenReturn("Token has been revoked");

        StringWriter stringWriter = new StringWriter();
        PrintWriter printWriter = new PrintWriter(stringWriter);
        when(response.getWriter()).thenReturn(printWriter);
        SubjectSum subject = mockManagedSubject();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertFalse(filter.preHandle(request, response, new Object()));
            verify(response).setStatus(401);
        }
    }

    @Test
    void testManagedTokenStatusCheckFailureRejectsRequest() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer managed-token");
        when(accountService.checkTokenStatus("managed-token")).thenThrow(new RuntimeException("DB down"));

        StringWriter stringWriter = new StringWriter();
        PrintWriter printWriter = new PrintWriter(stringWriter);
        when(response.getWriter()).thenReturn(printWriter);
        SubjectSum subject = mockManagedSubject();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertFalse(filter.preHandle(request, response, new Object()));
            verify(response).setStatus(503);
            verify(accountService, never()).touchTokenLastUsedTime(any());
        }
    }

    @Test
    void testManagedTokenOutdatedRolesRejected() throws Exception {
        String managedToken = "managed-token";
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(accountService.checkTokenStatus(managedToken)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin")))
                .thenReturn("Token permissions are outdated");

        StringWriter stringWriter = new StringWriter();
        PrintWriter printWriter = new PrintWriter(stringWriter);
        when(response.getWriter()).thenReturn(printWriter);
        SubjectSum subject = mockManagedSubjectWithClaims();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertFalse(filter.preHandle(request, response, new Object()));
            verify(response).setStatus(401);
            verify(accountService, never()).touchTokenLastUsedTime(managedToken);
        }
    }

    @Test
    void testEmptyBearerTokenPassesThrough() throws Exception {
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer ");
        SubjectSum subject = mockManagedSubject();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertTrue(filter.preHandle(request, response, new Object()));
        }
    }

    @Test
    void testTouchLastUsedTimeFailureDoesNotRejectRequest() throws Exception {
        String managedToken = "managed-token";
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(accountService.checkTokenStatus(managedToken)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"))).thenReturn(null);
        // touchTokenLastUsedTime throws exception
        org.mockito.Mockito.doThrow(new RuntimeException("DB error"))
                .when(accountService).touchTokenLastUsedTime(managedToken);
        SubjectSum subject = mockManagedSubjectWithClaims();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertTrue(filter.preHandle(request, response, new Object()));
        }
    }

    @Test
    void testUnauthenticatedRequestSkipsValidation() throws Exception {
        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(null);

            org.junit.jupiter.api.Assertions.assertTrue(filter.preHandle(request, response, new Object()));
            verify(accountService, never()).checkTokenStatus(any());
        }
    }

    @Test
    void testManagedTokenAccountValidationFailureRejectsRequest() throws Exception {
        String managedToken = "managed-token";
        when(request.getHeader(NetworkConstants.AUTHORIZATION)).thenReturn("Bearer " + managedToken);
        when(accountService.checkTokenStatus(managedToken)).thenReturn(null);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin")))
                .thenThrow(new RuntimeException("account store unavailable"));

        StringWriter stringWriter = new StringWriter();
        PrintWriter printWriter = new PrintWriter(stringWriter);
        when(response.getWriter()).thenReturn(printWriter);
        SubjectSum subject = mockManagedSubjectWithClaims();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subject);

            org.junit.jupiter.api.Assertions.assertFalse(filter.preHandle(request, response, new Object()));
            verify(response).setStatus(503);
            verify(accountService, never()).touchTokenLastUsedTime(managedToken);
        }
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
