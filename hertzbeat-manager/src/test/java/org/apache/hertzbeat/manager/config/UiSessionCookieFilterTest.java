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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;

import jakarta.servlet.http.Cookie;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.controller.UiSessionController;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class UiSessionCookieFilterTest {

    private final UiSessionCookieFilter filter = new UiSessionCookieFilter();

    @Test
    void registersImmediatelyAfterCorsAndBeforeAuthentication() {
        assertEquals(Integer.MIN_VALUE + 1,
                new SecurityCorsConfiguration().uiSessionCookieFilter().getOrder());
    }

    @Test
    void adaptsCookieWithoutOverwritingExplicitAuthorization() throws Exception {
        MockHttpServletRequest request = request("GET", "/api/monitor");
        request.setCookies(new Cookie(UiSessionController.ACCESS_COOKIE, "cookie-token"));
        AtomicReference<String> authorization = new AtomicReference<>();
        filter.doFilter(request, new MockHttpServletResponse(),
                (wrapped, response) -> authorization.set(((jakarta.servlet.http.HttpServletRequest) wrapped)
                        .getHeader("Authorization")));
        assertEquals("Bearer cookie-token", authorization.get());

        request = request("GET", "/api/monitor");
        request.addHeader("Authorization", "Bearer explicit-token");
        request.setCookies(new Cookie(UiSessionController.ACCESS_COOKIE, "cookie-token"));
        AtomicReference<jakarta.servlet.ServletRequest> passedRequest = new AtomicReference<>();
        filter.doFilter(request, new MockHttpServletResponse(), (wrapped, response) -> passedRequest.set(wrapped));
        assertSame(request, passedRequest.get());
    }

    @Test
    void requiresSameOriginDoubleSubmitCsrfForCookieMutations() throws Exception {
        MockHttpServletRequest rejected = request("POST", "/api/monitor");
        rejected.setCookies(new Cookie(UiSessionController.ACCESS_COOKIE, "cookie-token"));
        MockHttpServletResponse rejectedResponse = new MockHttpServletResponse();
        filter.doFilter(rejected, rejectedResponse, new MockFilterChain());
        assertEquals(403, rejectedResponse.getStatus());

        MockHttpServletRequest accepted = request("POST", "/api/monitor");
        accepted.setCookies(new Cookie(UiSessionController.ACCESS_COOKIE, "cookie-token"),
                new Cookie(UiSessionController.CSRF_COOKIE, "csrf-value"));
        accepted.addHeader(UiSessionCookieFilter.CSRF_HEADER, "csrf-value");
        accepted.addHeader("Origin", "http://localhost");
        MockHttpServletResponse acceptedResponse = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(accepted, acceptedResponse, chain);
        assertEquals(200, acceptedResponse.getStatus());
        assertNotNull(chain.getRequest());
    }

    @Test
    void bearerMutationDoesNotUseBrowserCsrfContract() throws Exception {
        MockHttpServletRequest request = request("POST", "/api/monitor");
        request.addHeader("Authorization", "Bearer api-token");
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(request, new MockHttpServletResponse(), chain);
        assertNotNull(chain.getRequest());
    }

    private MockHttpServletRequest request(String method, String uri) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        request.setScheme("http");
        request.setServerName("localhost");
        request.setServerPort(80);
        return request;
    }
}
