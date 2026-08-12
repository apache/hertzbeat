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
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockFilterChain;

/**
 * Test case for {@link SecurityCorsConfiguration}.
 *
 * <p>The filter answers every origin, which is intentional, and requests authenticate with
 * a token in the Authorization header rather than a cookie, so credentials do not need to
 * be allowed. Both halves are asserted: the credentials header is not sent, and a preflight
 * still succeeds so the api stays reachable cross origin.
 */
class SecurityCorsConfigurationTest {

    private static final String OTHER_ORIGIN = "https://other.example";

    @Test
    void testCredentialsAreNotAllowedForCrossOriginRequests() throws Exception {
        MockHttpServletResponse response = handlePreflight();

        assertNotEquals("true", response.getHeader("Access-Control-Allow-Credentials"));
    }

    @Test
    void testCrossOriginRequestsAreStillAnswered() throws Exception {
        MockHttpServletResponse response = handlePreflight();

        assertNotNull(response.getHeader("Access-Control-Allow-Origin"),
            "the api is meant to stay reachable cross origin");
        assertEquals(200, response.getStatus());
    }

    private MockHttpServletResponse handlePreflight() throws Exception {
        FilterRegistrationBean<?> registration = new SecurityCorsConfiguration().corsFilter();
        Filter filter = (Filter) registration.getFilter();

        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/monitors");
        request.addHeader("Origin", OTHER_ORIGIN);
        request.addHeader("Access-Control-Request-Method", "GET");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }
}
