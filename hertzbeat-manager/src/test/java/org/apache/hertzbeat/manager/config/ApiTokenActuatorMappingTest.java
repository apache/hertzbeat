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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.usthe.sureness.subject.PrincipalMap;
import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import com.usthe.sureness.util.JsonWebTokenUtil;
import io.jsonwebtoken.Claims;
import java.util.List;
import org.apache.hertzbeat.manager.service.AccountService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.actuate.endpoint.web.EndpointLinksResolver;
import org.springframework.boot.actuate.endpoint.web.EndpointMapping;
import org.springframework.boot.actuate.endpoint.web.EndpointMediaTypes;
import org.springframework.boot.actuate.endpoint.web.ExposableWebEndpoint;
import org.springframework.boot.actuate.endpoint.web.WebEndpointHttpMethod;
import org.springframework.boot.actuate.endpoint.web.WebOperation;
import org.springframework.boot.actuate.endpoint.web.WebOperationRequestPredicate;
import org.springframework.boot.webmvc.actuate.endpoint.web.WebMvcEndpointHandlerMapping;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockServletContext;
import org.springframework.web.context.support.StaticWebApplicationContext;
import org.springframework.web.servlet.HandlerExecutionChain;
import org.springframework.web.servlet.handler.MappedInterceptor;
import org.springframework.web.util.ServletRequestPathUtils;

/** Uses the actual independent Actuator mapping, not standalone MVC controller setup. */
class ApiTokenActuatorMappingTest {

    private final AccountService accounts = mock(AccountService.class);
    private StaticWebApplicationContext context;
    private MappedInterceptor mapped;
    private WebMvcEndpointHandlerMapping actuator;

    @BeforeEach
    void setUp() {
        context = new StaticWebApplicationContext();
        context.setServletContext(new MockServletContext());
        mapped = new ApiTokenValidationConfiguration(new ApiTokenValidationFilter(accounts))
                .managedApiTokenValidationInterceptor();
        context.getBeanFactory().registerSingleton("managedApiTokenValidationInterceptor", mapped);
        context.refresh();
        actuator = mapping("/actuator");
    }

    @AfterEach
    void tearDown() {
        context.close();
    }

    @ParameterizedTest
    @ValueSource(strings = {"metrics", "prometheus", "health"})
    void revokedCredentialIsCheckedOnRealActuatorMapping(String endpoint) throws Exception {
        when(accounts.checkTokenStatus("synthetic-managed")).thenReturn("Token has been revoked");
        MockHttpServletResponse response = new MockHttpServletResponse();
        assertFalse(preHandle(request("/actuator/" + endpoint), response, subject(true)));
        assertEquals(401, response.getStatus());
        verify(accounts).checkTokenStatus("synthetic-managed");
        verify(accounts, never()).touchTokenLastUsedTime(any());
    }

    @Test
    void activeCredentialIsValidatedAndTouchedExactlyOnce() throws Exception {
        assertTrue(preHandle(request("/actuator/metrics"), new MockHttpServletResponse(), subject(true)));
        verify(accounts).checkTokenStatus("synthetic-managed");
        verify(accounts).checkManagedTokenAccess("admin", List.of("admin"));
        verify(accounts).touchTokenLastUsedTime("synthetic-managed");
    }

    @ParameterizedTest
    @ValueSource(strings = {"Token owner account is no longer valid", "Token owner account is disabled",
            "Token roles are no longer valid"})
    void invalidOwnerIsRejected(String reason) throws Exception {
        when(accounts.checkManagedTokenAccess("admin", List.of("admin"))).thenReturn(reason);
        MockHttpServletResponse response = new MockHttpServletResponse();
        assertFalse(preHandle(request("/actuator/metrics"), response, subject(true)));
        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains(reason));
        verify(accounts, never()).touchTokenLastUsedTime(any());
    }

    @Test
    void unavailableValidationFailsClosed() throws Exception {
        when(accounts.checkTokenStatus("synthetic-managed")).thenThrow(new IllegalStateException("unavailable"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        assertFalse(preHandle(request("/actuator/metrics"), response, subject(true)));
        assertEquals(503, response.getStatus());
        verify(accounts, never()).touchTokenLastUsedTime(any());
    }

    @Test
    void usageTimestampFailureDoesNotInvalidateCredential() throws Exception {
        doThrow(new IllegalStateException("unavailable")).when(accounts).touchTokenLastUsedTime("synthetic-managed");
        assertTrue(preHandle(request("/actuator/metrics"), new MockHttpServletResponse(), subject(true)));
    }

    @Test
    void noSubjectOrLegacySubjectDoesNotChangeAnonymousOrLegacyPolicy() throws Exception {
        // Sureness, not this lifecycle guard, decides whether health may be anonymous.
        for (SubjectSum subject : new SubjectSum[]{null, subject(false)}) {
            MockHttpServletRequest request = request("/actuator/health");
            request.addParameter("token", "unrelated-text");
            request.addParameter("workspaceId", "unrelated-workspace");
            request.addParameter("source", "self");
            assertTrue(preHandle(request, new MockHttpServletResponse(), subject));
            request.removeHeader("Authorization");
            assertTrue(preHandle(request, new MockHttpServletResponse(), subject));
        }
        verifyNoInteractions(accounts);
    }

    @Test
    void customActuatorBasePathIsCovered() throws Exception {
        actuator = mapping("/management");
        when(accounts.checkTokenStatus("synthetic-managed")).thenReturn("Token has been revoked");
        assertFalse(preHandle(request("/management/metrics"), new MockHttpServletResponse(), subject(true)));
    }

    @Test
    void queryCredentialIsCheckedAndMissingManagedCredentialFailsClosed() throws Exception {
        MockHttpServletRequest request = request("/actuator/metrics");
        request.removeHeader("Authorization");
        request.addParameter("token", "synthetic-managed");
        when(accounts.checkTokenStatus("synthetic-managed")).thenReturn("Token has been revoked");
        assertFalse(preHandle(request, new MockHttpServletResponse(), subject(true)));
        verify(accounts).checkTokenStatus("synthetic-managed");
        request.removeParameter("token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        assertFalse(preHandle(request, response, subject(true)));
        assertEquals(401, response.getStatus());
    }

    @Test
    void duplicateCarriersAreValidatedOnceAndMixedRevokedCarrierRejects() throws Exception {
        MockHttpServletRequest request = request("/actuator/metrics");
        request.addParameter("token", "synthetic-managed");
        assertTrue(preHandle(request, new MockHttpServletResponse(), subject(true)));
        verify(accounts).checkTokenStatus("synthetic-managed");
        verify(accounts).touchTokenLastUsedTime("synthetic-managed");
        org.mockito.Mockito.reset(accounts);
        request.setParameter("token", "synthetic-other-managed");
        when(accounts.checkTokenStatus("synthetic-other-managed")).thenReturn("Token has been revoked");
        assertFalse(preHandle(request, new MockHttpServletResponse(), subject(true)));
        verify(accounts, never()).touchTokenLastUsedTime(any());
    }

    private WebMvcEndpointHandlerMapping mapping(String basePath) {
        List<WebOperation> operations = List.of("metrics", "prometheus", "health").stream().map(name -> {
            WebOperation operation = mock(WebOperation.class);
            when(operation.getRequestPredicate()).thenReturn(new WebOperationRequestPredicate(
                    name, WebEndpointHttpMethod.GET, List.of(), List.of("application/json")));
            return operation;
        }).toList();
        ExposableWebEndpoint endpoint = mock(ExposableWebEndpoint.class);
        when(endpoint.getOperations()).thenReturn(operations);
        WebMvcEndpointHandlerMapping result = new WebMvcEndpointHandlerMapping(new EndpointMapping(basePath),
                List.of(endpoint), new EndpointMediaTypes(List.of("application/json"), List.of("application/json")),
                null, mock(EndpointLinksResolver.class), false);
        result.setApplicationContext(context);
        result.afterPropertiesSet();
        return result;
    }

    private MockHttpServletRequest request(String path) {
        MockHttpServletRequest request = new MockHttpServletRequest(context.getServletContext(), "GET", path);
        request.addHeader("Authorization", "Bearer synthetic-managed");
        ServletRequestPathUtils.parseAndCache(request);
        return request;
    }

    private SubjectSum subject(boolean managed) {
        SubjectSum subject = mock(SubjectSum.class);
        PrincipalMap claims = mock(PrincipalMap.class);
        when(subject.getPrincipalMap()).thenReturn(claims);
        when(claims.getPrincipal("managed")).thenReturn(managed);
        when(subject.getPrincipal()).thenReturn("admin");
        when(subject.getRoles()).thenReturn(List.of("admin"));
        return subject;
    }

    private boolean preHandle(MockHttpServletRequest request, MockHttpServletResponse response, SubjectSum subject)
            throws Exception {
        HandlerExecutionChain chain = actuator.getHandler(request);
        assertNotNull(chain);
        assertEquals(1, chain.getInterceptorList().stream().filter(value -> value == mapped.getInterceptor()).count());
        try (var holder = mockStatic(SurenessContextHolder.class);
             var jwt = mockStatic(JsonWebTokenUtil.class)) {
            holder.when(SurenessContextHolder::getBindSubject).thenReturn(subject);
            Claims claims = mock(Claims.class);
            when(claims.get("managed", Boolean.class)).thenReturn(true);
            jwt.when(() -> JsonWebTokenUtil.parseJwt("synthetic-managed")).thenReturn(claims);
            jwt.when(() -> JsonWebTokenUtil.parseJwt("synthetic-other-managed")).thenReturn(claims);
            return mapped.getInterceptor().preHandle(request, response, chain.getHandler());
        }
    }
}
