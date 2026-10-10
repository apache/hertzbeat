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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class ExternalAlertSourceCredentialBridgeFilterTest {

    private static final String HUAWEI_PATH = "/api/alerts/report/huaweicloud-ces";
    private static final String VOLCENGINE_PATH = "/api/alerts/report/volcengine";

    private final ExternalAlertSourceCredentialBridgeFilter filter =
            new ExternalAlertSourceCredentialBridgeFilter();

    @Test
    void bridgesHuaweiCustomHeaderOnlyOnItsExactPostEndpoint() throws Exception {
        MockHttpServletRequest request = request("POST", HUAWEI_PATH);
        request.addHeader("X-HertzBeat-Token", "managed-huawei-token");

        HttpServletRequest bridged = invoke(request);

        assertEquals("Bearer managed-huawei-token", bridged.getHeader(HttpHeaders.AUTHORIZATION));
        assertEquals(List.of("Bearer managed-huawei-token"),
                Collections.list(bridged.getHeaders(HttpHeaders.AUTHORIZATION)));
        assertTrue(Collections.list(bridged.getHeaderNames()).stream()
                .anyMatch(HttpHeaders.AUTHORIZATION::equalsIgnoreCase));
    }

    @Test
    void bridgesVolcengineNativeTokenHeaderOnlyOnItsExactPostEndpoint() throws Exception {
        MockHttpServletRequest request = request("POST", VOLCENGINE_PATH);
        request.addHeader("Token", "managed-volcengine-token");

        HttpServletRequest bridged = invoke(request);

        assertEquals("Bearer managed-volcengine-token", bridged.getHeader(HttpHeaders.AUTHORIZATION));
    }

    @Test
    void explicitAuthorizationAlwaysWins() throws Exception {
        MockHttpServletRequest request = request("POST", VOLCENGINE_PATH);
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer explicit-token");
        request.addHeader("Token", "vendor-token");

        HttpServletRequest forwarded = invoke(request);

        assertEquals("Bearer explicit-token", forwarded.getHeader(HttpHeaders.AUTHORIZATION));
    }

    @Test
    void neverBridgesAcrossSourcesMethodsOrPaths() throws Exception {
        MockHttpServletRequest huaweiHeaderOnVolcengine = request("POST", VOLCENGINE_PATH);
        huaweiHeaderOnVolcengine.addHeader("X-HertzBeat-Token", "wrong-source");
        MockHttpServletRequest volcengineHeaderOnHuawei = request("POST", HUAWEI_PATH);
        volcengineHeaderOnHuawei.addHeader("Token", "wrong-source");
        MockHttpServletRequest getRequest = request("GET", HUAWEI_PATH);
        getRequest.addHeader("X-HertzBeat-Token", "wrong-method");
        MockHttpServletRequest suffixPath = request("POST", HUAWEI_PATH + "/extra");
        suffixPath.addHeader("X-HertzBeat-Token", "wrong-path");

        assertNull(invoke(huaweiHeaderOnVolcengine).getHeader(HttpHeaders.AUTHORIZATION));
        assertNull(invoke(volcengineHeaderOnHuawei).getHeader(HttpHeaders.AUTHORIZATION));
        assertNull(invoke(getRequest).getHeader(HttpHeaders.AUTHORIZATION));
        assertNull(invoke(suffixPath).getHeader(HttpHeaders.AUTHORIZATION));
    }

    @Test
    void ignoresBlankOrAmbiguousVendorCredentials() throws Exception {
        MockHttpServletRequest blank = request("POST", HUAWEI_PATH);
        blank.addHeader("X-HertzBeat-Token", "  ");
        MockHttpServletRequest repeated = request("POST", VOLCENGINE_PATH);
        repeated.addHeader("Token", "first");
        repeated.addHeader("Token", "second");

        assertNull(invoke(blank).getHeader(HttpHeaders.AUTHORIZATION));
        assertNull(invoke(repeated).getHeader(HttpHeaders.AUTHORIZATION));
    }

    @Test
    void matchesApplicationPathWhenContextPathIsConfigured() throws Exception {
        MockHttpServletRequest request = request("POST", "/hertzbeat" + HUAWEI_PATH);
        request.setContextPath("/hertzbeat");
        request.addHeader("X-HertzBeat-Token", "managed-token");

        assertEquals("Bearer managed-token", invoke(request).getHeader(HttpHeaders.AUTHORIZATION));
    }

    @Test
    void registrationRunsBeforeUiCookieBridgeAndSureness() {
        FilterRegistrationBean<ExternalAlertSourceCredentialBridgeFilter> registration =
                new ExternalAlertSourceSecurityConfiguration().externalAlertSourceCredentialBridgeFilter();

        assertEquals(Integer.MAX_VALUE - 2, registration.getOrder());
        assertEquals(List.of("/*"), registration.getUrlPatterns().stream().toList());
        assertTrue(registration.isAsyncSupported());
    }

    private HttpServletRequest invoke(MockHttpServletRequest request) throws Exception {
        AtomicReference<HttpServletRequest> forwarded = new AtomicReference<>();
        filter.doFilter(request, new MockHttpServletResponse(),
                (servletRequest, ignoredResponse) -> forwarded.set((HttpServletRequest) servletRequest));
        return forwarded.get();
    }

    private static MockHttpServletRequest request(String method, String path) {
        return new MockHttpServletRequest(method, path);
    }
}
