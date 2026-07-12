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

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.manager.controller.UiSessionController;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Adapts same-origin browser session cookies to the existing Sureness Bearer contract.
 */
public class UiSessionCookieFilter extends OncePerRequestFilter {

    public static final String CSRF_HEADER = "X-HertzBeat-CSRF";

    private static final Set<String> SAFE_METHODS = Set.of(
            HttpMethod.GET.name(), HttpMethod.HEAD.name(), HttpMethod.OPTIONS.name());

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String explicitAuthorization = request.getHeader(NetworkConstants.AUTHORIZATION);
        if (StringUtils.isNotBlank(explicitAuthorization)) {
            filterChain.doFilter(request, response);
            return;
        }

        String accessToken = cookie(request, UiSessionController.ACCESS_COOKIE);
        boolean refreshMutation = isRefreshOrLogout(request)
                && StringUtils.isNotBlank(cookie(request, UiSessionController.REFRESH_COOKIE));
        if ((StringUtils.isNotBlank(accessToken) || refreshMutation)
                && !SAFE_METHODS.contains(request.getMethod()) && !isLogin(request)
                && !hasValidBrowserCsrf(request)) {
            response.sendError(HttpStatus.FORBIDDEN.value(), "Invalid browser request");
            return;
        }

        if (StringUtils.isBlank(accessToken) || !request.getRequestURI().startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }
        filterChain.doFilter(withAuthorization(request, "Bearer " + accessToken), response);
    }

    private boolean hasValidBrowserCsrf(HttpServletRequest request) {
        String csrfCookie = cookie(request, UiSessionController.CSRF_COOKIE);
        String csrfHeader = request.getHeader(CSRF_HEADER);
        return StringUtils.isNotBlank(csrfCookie) && csrfCookie.equals(csrfHeader) && hasSameOrigin(request);
    }

    private boolean hasSameOrigin(HttpServletRequest request) {
        String origin = request.getHeader(HttpHeaders.ORIGIN);
        if (StringUtils.isBlank(origin)) {
            return false;
        }
        String forwardedProto = request.getHeader("X-Forwarded-Proto");
        String scheme = StringUtils.defaultIfBlank(forwardedProto, request.getScheme());
        String forwardedHost = request.getHeader("X-Forwarded-Host");
        String host = StringUtils.defaultIfBlank(forwardedHost, request.getHeader(HttpHeaders.HOST));
        if (StringUtils.isBlank(host)) {
            host = request.getServerName();
            if (!isDefaultPort(scheme, request.getServerPort())) {
                host += ":" + request.getServerPort();
            }
        }
        return origin.equalsIgnoreCase(scheme + "://" + host);
    }

    private boolean isDefaultPort(String scheme, int port) {
        return ("http".equalsIgnoreCase(scheme) && port == 80)
                || ("https".equalsIgnoreCase(scheme) && port == 443);
    }

    private boolean isLogin(HttpServletRequest request) {
        return HttpMethod.POST.matches(request.getMethod())
                && "/api/ui/session".equals(request.getRequestURI());
    }

    private boolean isRefreshOrLogout(HttpServletRequest request) {
        return "/api/ui/session/refresh".equals(request.getRequestURI())
                || (HttpMethod.DELETE.matches(request.getMethod())
                && "/api/ui/session".equals(request.getRequestURI()));
    }

    private String cookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private HttpServletRequest withAuthorization(HttpServletRequest request, String authorization) {
        return new HttpServletRequestWrapper(request) {
            @Override
            public String getHeader(String name) {
                return NetworkConstants.AUTHORIZATION.equalsIgnoreCase(name)
                        ? authorization : super.getHeader(name);
            }

            @Override
            public Enumeration<String> getHeaders(String name) {
                return NetworkConstants.AUTHORIZATION.equalsIgnoreCase(name)
                        ? Collections.enumeration(List.of(authorization)) : super.getHeaders(name);
            }

            @Override
            public Enumeration<String> getHeaderNames() {
                Set<String> names = new LinkedHashSet<>(Collections.list(super.getHeaderNames()));
                names.add(NetworkConstants.AUTHORIZATION);
                return Collections.enumeration(names);
            }
        };
    }
}
