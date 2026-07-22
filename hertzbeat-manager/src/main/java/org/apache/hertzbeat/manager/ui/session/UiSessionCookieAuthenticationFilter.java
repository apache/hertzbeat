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

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Bridges the HttpOnly UI access cookie to Sureness without exposing it to application code.
 */
public class UiSessionCookieAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER = "Bearer ";
    private static final String SESSION_PATH = "/api/ui/session";
    private static final String FETCH_SITE = "Sec-Fetch-Site";
    private static final String REQUEST_REJECTED = "ui_session_request_rejected";

    private final UiSessionCookieManager cookies;
    private final UiSessionService service;

    public UiSessionCookieAuthenticationFilter(UiSessionCookieManager cookies, UiSessionService service) {
        this.cookies = cookies;
        this.service = service;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        boolean explicitAuthorization = request.getHeader(HttpHeaders.AUTHORIZATION) != null;
        if (requiresOriginCheck(request, explicitAuthorization) && !allowsBrowserOrigin(request)) {
            reject(response);
            return;
        }

        String accessToken = cookies.accessToken(request);
        if (explicitAuthorization || accessToken == null || isSessionPath(request)) {
            chain.doFilter(request, response);
            return;
        }
        UiSessionView session = service.inspect(accessToken);
        if (!session.authenticated()) {
            cookies.clear(request, response);
            chain.doFilter(request, response);
            return;
        }

        chain.doFilter(new BearerRequest(request, accessToken), response);
        if (response.getStatus() == HttpStatus.UNAUTHORIZED.value() && !response.isCommitted()) {
            cookies.clear(request, response);
        }
    }

    private boolean requiresOriginCheck(HttpServletRequest request, boolean explicitAuthorization) {
        if (isSessionMutation(request)) {
            return true;
        }
        if (explicitAuthorization || !cookies.hasSessionCookie(request)) {
            return false;
        }
        return isUnsafe(request.getMethod()) || request.getHeader(HttpHeaders.ORIGIN) != null;
    }

    private boolean allowsBrowserOrigin(HttpServletRequest request) {
        String fetchSite = StringUtils.trimToNull(request.getHeader(FETCH_SITE));
        if (fetchSite != null && "same-origin".equalsIgnoreCase(fetchSite)) {
            return true;
        }
        if (fetchSite != null && "cross-site".equalsIgnoreCase(fetchSite)) {
            return false;
        }
        String origin = StringUtils.trimToNull(request.getHeader(HttpHeaders.ORIGIN));
        if (origin != null) {
            return sameOrigin(origin, request);
        }
        String referer = StringUtils.trimToNull(request.getHeader(HttpHeaders.REFERER));
        if (referer != null) {
            return sameOrigin(referer, request);
        }
        return fetchSite == null || "none".equalsIgnoreCase(fetchSite);
    }

    private boolean sameOrigin(String source, HttpServletRequest request) {
        try {
            URI sourceUri = URI.create(source);
            String expectedScheme = firstOrDefault(request.getHeader("X-Forwarded-Proto"), request.getScheme());
            String expectedHost = firstOrDefault(request.getHeader("X-Forwarded-Host"), request.getServerName());
            int hostSeparator = expectedHost.lastIndexOf(':');
            int expectedPort = forwardedPort(request, expectedScheme, expectedHost, hostSeparator);
            if (hostSeparator > 0) {
                expectedHost = expectedHost.substring(0, hostSeparator);
            }
            return expectedScheme.equalsIgnoreCase(sourceUri.getScheme())
                    && expectedHost.equalsIgnoreCase(sourceUri.getHost())
                    && expectedPort == effectivePort(sourceUri.getScheme(), sourceUri.getPort());
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    private int forwardedPort(HttpServletRequest request, String scheme, String host, int hostSeparator) {
        String forwardedPort = first(request.getHeader("X-Forwarded-Port"));
        if (StringUtils.isNumeric(forwardedPort)) {
            return Integer.parseInt(forwardedPort);
        }
        if (hostSeparator > 0 && StringUtils.isNumeric(host.substring(hostSeparator + 1))) {
            return Integer.parseInt(host.substring(hostSeparator + 1));
        }
        if (first(request.getHeader("X-Forwarded-Proto")) != null
                || first(request.getHeader("X-Forwarded-Host")) != null) {
            return effectivePort(scheme, -1);
        }
        return request.getServerPort() > 0 ? request.getServerPort() : effectivePort(scheme, -1);
    }

    private static int effectivePort(String scheme, int port) {
        if (port >= 0) {
            return port;
        }
        return "https".equalsIgnoreCase(scheme) ? 443 : 80;
    }

    private static boolean isUnsafe(String method) {
        return !("GET".equalsIgnoreCase(method)
                || "HEAD".equalsIgnoreCase(method)
                || "OPTIONS".equalsIgnoreCase(method));
    }

    private static boolean isSessionMutation(HttpServletRequest request) {
        return isSessionPath(request) && isUnsafe(request.getMethod());
    }

    private static boolean isSessionPath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return SESSION_PATH.equals(uri) || (uri != null && uri.startsWith(SESSION_PATH + "/"));
    }

    private static String firstOrDefault(String value, String defaultValue) {
        String first = first(value);
        return first == null ? defaultValue : first;
    }

    private static String first(String value) {
        String normalized = StringUtils.trimToNull(value);
        if (normalized == null) {
            return null;
        }
        int separator = normalized.indexOf(',');
        return (separator < 0 ? normalized : normalized.substring(0, separator)).trim();
    }

    private static void reject(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.getWriter().write(JsonUtil.toJson(Message.fail(FAIL_CODE, REQUEST_REJECTED)));
    }

    private static final class BearerRequest extends HttpServletRequestWrapper {

        private final String authorization;

        private BearerRequest(HttpServletRequest request, String token) {
            super(request);
            authorization = BEARER + token;
        }

        @Override
        public String getHeader(String name) {
            return HttpHeaders.AUTHORIZATION.equalsIgnoreCase(name) ? authorization : super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            return HttpHeaders.AUTHORIZATION.equalsIgnoreCase(name)
                    ? Collections.enumeration(List.of(authorization))
                    : super.getHeaders(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            List<String> names = new ArrayList<>();
            Enumeration<String> existing = super.getHeaderNames();
            if (existing != null) {
                existing.asIterator().forEachRemaining(names::add);
            }
            if (names.stream().noneMatch(HttpHeaders.AUTHORIZATION::equalsIgnoreCase)) {
                names.add(HttpHeaders.AUTHORIZATION);
            }
            return Collections.enumeration(names);
        }
    }
}
