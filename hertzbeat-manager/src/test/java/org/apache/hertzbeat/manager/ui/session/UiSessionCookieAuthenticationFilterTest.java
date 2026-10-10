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

package org.apache.hertzbeat.manager.ui.session;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class UiSessionCookieAuthenticationFilterTest {

    private UiSessionCookieAuthenticationFilter filter;
    private UiSessionService service;

    @BeforeEach
    void setUp() {
        service = mock(UiSessionService.class);
        when(service.inspect(anyString())).thenReturn(authenticatedSession());
        filter = new UiSessionCookieAuthenticationFilter(new UiSessionCookieManager(), service);
    }

    @Test
    void accessCookieBecomesBearerOnlyWhenExplicitAuthorizationIsAbsent() throws Exception {
        MockHttpServletRequest cookieRequest = request("GET", "/api/plugin");
        cookieRequest.setCookies(new Cookie(UiSessionCookieManager.ACCESS_COOKIE, "cookie-access"));
        AtomicReference<String> authorization = new AtomicReference<>();

        filter.doFilter(cookieRequest, new MockHttpServletResponse(),
                (request, response) -> authorization.set(((HttpServletRequest) request)
                        .getHeader(HttpHeaders.AUTHORIZATION)));
        assertEquals("Bearer cookie-access", authorization.get());

        MockHttpServletRequest bearerRequest = request("GET", "/api/plugin");
        bearerRequest.addHeader(HttpHeaders.AUTHORIZATION, "Bearer explicit-access");
        bearerRequest.setCookies(new Cookie(UiSessionCookieManager.ACCESS_COOKIE, "cookie-access"));
        filter.doFilter(bearerRequest, new MockHttpServletResponse(),
                (request, response) -> authorization.set(((HttpServletRequest) request)
                        .getHeader(HttpHeaders.AUTHORIZATION)));
        assertEquals("Bearer explicit-access", authorization.get());
    }

    @Test
    void crossOriginCookieMutationIsRejectedWithoutEchoingCookie() throws Exception {
        MockHttpServletRequest request = request("POST", "/api/plugin");
        request.setCookies(new Cookie(UiSessionCookieManager.ACCESS_COOKIE, "caller-secret-token"));
        request.addHeader(HttpHeaders.ORIGIN, "https://evil.example");
        request.addHeader("Sec-Fetch-Site", "cross-site");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean invoked = new AtomicBoolean();

        filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> invoked.set(true));

        assertFalse(invoked.get());
        assertEquals(403, response.getStatus());
        assertFalse(response.getContentAsString().contains("caller-secret-token"));
    }

    @Test
    void crossSiteLoginAndRefreshCookieOnlyRequestsAreRejected() throws Exception {
        MockHttpServletRequest login = request("POST", "/api/ui/session");
        login.addHeader(HttpHeaders.ORIGIN, "https://evil.example");
        login.addHeader("Sec-Fetch-Site", "cross-site");
        MockHttpServletResponse loginResponse = new MockHttpServletResponse();
        AtomicBoolean invoked = new AtomicBoolean();
        filter.doFilter(login, loginResponse, (ignoredRequest, ignoredResponse) -> invoked.set(true));
        assertFalse(invoked.get());
        assertEquals(403, loginResponse.getStatus());

        MockHttpServletRequest refresh = request("POST", "/api/ui/session/refresh");
        refresh.setCookies(new Cookie(UiSessionCookieManager.REFRESH_COOKIE, "refresh-only-secret"));
        refresh.addHeader(HttpHeaders.ORIGIN, "https://evil.example");
        refresh.addHeader("Sec-Fetch-Site", "cross-site");
        MockHttpServletResponse refreshResponse = new MockHttpServletResponse();
        filter.doFilter(refresh, refreshResponse, (ignoredRequest, ignoredResponse) -> invoked.set(true));
        assertFalse(invoked.get());
        assertEquals(403, refreshResponse.getStatus());
        assertFalse(refreshResponse.getContentAsString().contains("refresh-only-secret"));
    }

    @Test
    void loginWithoutBrowserOriginMetadataRemainsUsableForCliAndLocalQa() throws Exception {
        MockHttpServletRequest login = request("POST", "/api/ui/session");
        AtomicBoolean invoked = new AtomicBoolean();

        filter.doFilter(login, new MockHttpServletResponse(),
                (ignoredRequest, ignoredResponse) -> invoked.set(true));

        assertTrue(invoked.get());
    }

    @Test
    void sameOriginViteProxyMutationAndBearerClientRemainCompatible() throws Exception {
        MockHttpServletRequest viteRequest = request("POST", "/api/plugin");
        viteRequest.setCookies(new Cookie(UiSessionCookieManager.ACCESS_COOKIE, "cookie-access"));
        viteRequest.addHeader(HttpHeaders.ORIGIN, "http://localhost:4200");
        viteRequest.addHeader("Sec-Fetch-Site", "same-origin");
        AtomicBoolean invoked = new AtomicBoolean();
        filter.doFilter(viteRequest, new MockHttpServletResponse(),
                (ignoredRequest, ignoredResponse) -> invoked.set(true));
        assertTrue(invoked.get());

        MockHttpServletRequest bearerRequest = request("POST", "/api/plugin");
        bearerRequest.addHeader(HttpHeaders.AUTHORIZATION, "Bearer explicit-access");
        bearerRequest.addHeader(HttpHeaders.ORIGIN, "https://automation.example");
        bearerRequest.addHeader("Sec-Fetch-Site", "cross-site");
        filter.doFilter(bearerRequest, new MockHttpServletResponse(),
                (ignoredRequest, ignoredResponse) -> invoked.set(true));
        assertTrue(invoked.get());
    }

    @Test
    void forwardedHttpsOriginUsesTheForwardedDefaultPort() throws Exception {
        MockHttpServletRequest request = request("POST", "/api/plugin");
        request.setCookies(new Cookie(UiSessionCookieManager.ACCESS_COOKIE, "cookie-access"));
        request.addHeader(HttpHeaders.ORIGIN, "https://console.example");
        request.addHeader("X-Forwarded-Proto", "https");
        request.addHeader("X-Forwarded-Host", "console.example");
        AtomicBoolean invoked = new AtomicBoolean();

        filter.doFilter(request, new MockHttpServletResponse(),
                (ignoredRequest, ignoredResponse) -> invoked.set(true));

        assertTrue(invoked.get());
    }

    @Test
    void standardForwardedHeaderRequiresAnExactHttpsProtoParameter() {
        UiSessionCookieManager cookies = new UiSessionCookieManager();
        MockHttpServletRequest https = request("GET", "/api/ui/session");
        https.addHeader("Forwarded", "for=192.0.2.1;proto=\"https\";host=console.example");
        MockHttpServletRequest misleading = request("GET", "/api/ui/session");
        misleading.addHeader("Forwarded", "for=192.0.2.1;xproto=https;host=console.example");

        assertTrue(cookies.isSecure(https));
        assertFalse(cookies.isSecure(misleading));
    }

    @Test
    void anonymousRequestHasNoSynthesizedAuthorizationAndCookieBacked401ClearsSession() throws Exception {
        MockHttpServletRequest anonymous = request("GET", "/api/plugin");
        AtomicReference<String> authorization = new AtomicReference<>();
        filter.doFilter(anonymous, new MockHttpServletResponse(),
                (request, response) -> authorization.set(((HttpServletRequest) request)
                        .getHeader(HttpHeaders.AUTHORIZATION)));
        assertNull(authorization.get());

        MockHttpServletRequest expired = request("GET", "/api/plugin");
        expired.setCookies(new Cookie(UiSessionCookieManager.ACCESS_COOKIE, "expired-access"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(service.inspect("expired-access")).thenReturn(UiSessionView.anonymous());
        filter.doFilter(expired, response, (request, servletResponse) ->
                ((MockHttpServletResponse) servletResponse).setStatus(401));
        assertEquals(2, response.getHeaders(HttpHeaders.SET_COOKIE).size());
        assertTrue(response.getHeaders(HttpHeaders.SET_COOKIE).stream()
                .allMatch(value -> value.contains("Max-Age=0")));
    }

    @Test
    void cookieBridgeRunsImmediatelyBeforeSureness() {
        FilterRegistrationBean<UiSessionCookieAuthenticationFilter> registration =
                new UiSessionSecurityConfiguration().uiSessionCookieFilter(new UiSessionCookieManager(), service);

        assertEquals(Integer.MAX_VALUE - 1, registration.getOrder());
    }

    private static MockHttpServletRequest request(String method, String path) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setScheme("http");
        request.setServerName("localhost");
        request.setServerPort(1157);
        return request;
    }

    private static UiSessionView authenticatedSession() {
        return new UiSessionView(true, "admin", java.util.List.of("admin"), "default",
                java.time.Instant.now().plusSeconds(3600));
    }
}
