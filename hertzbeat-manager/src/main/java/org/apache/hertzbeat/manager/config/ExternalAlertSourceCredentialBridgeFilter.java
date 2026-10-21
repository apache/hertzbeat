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
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Adapts vendor-native webhook credential headers to the managed bearer-token boundary.
 * The resulting bearer credential is still authenticated and authorized by Sureness and
 * {@link ApiTokenValidationFilter}; this filter does not create an anonymous ingress path.
 */
public class ExternalAlertSourceCredentialBridgeFilter extends OncePerRequestFilter {

    private static final String BEARER = "Bearer ";
    private static final String HUAWEI_PATH = "/api/alerts/report/huaweicloud-ces";
    private static final String HUAWEI_TOKEN_HEADER = "X-HertzBeat-Token";
    private static final String VOLCENGINE_PATH = "/api/alerts/report/volcengine";
    private static final String VOLCENGINE_TOKEN_HEADER = "Token";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (request.getHeader(HttpHeaders.AUTHORIZATION) != null || !"POST".equalsIgnoreCase(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        String credentialHeader = credentialHeader(applicationPath(request));
        String token = singleHeaderValue(request, credentialHeader);
        chain.doFilter(token == null ? request : new BearerRequest(request, token), response);
    }

    private static String credentialHeader(String path) {
        if (HUAWEI_PATH.equals(path)) {
            return HUAWEI_TOKEN_HEADER;
        }
        if (VOLCENGINE_PATH.equals(path)) {
            return VOLCENGINE_TOKEN_HEADER;
        }
        return null;
    }

    private static String applicationPath(HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (requestUri == null || contextPath == null || contextPath.isEmpty() || !requestUri.startsWith(contextPath)) {
            return requestUri;
        }
        return requestUri.substring(contextPath.length());
    }

    private static String singleHeaderValue(HttpServletRequest request, String headerName) {
        if (headerName == null) {
            return null;
        }
        Enumeration<String> values = request.getHeaders(headerName);
        if (values == null) {
            return null;
        }
        List<String> candidates = Collections.list(values);
        if (candidates.size() != 1) {
            return null;
        }
        String candidate = StringUtils.trimToNull(candidates.getFirst());
        return candidate == null || candidate.indexOf(',') >= 0 ? null : candidate;
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
