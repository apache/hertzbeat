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

package org.apache.hertzbeat.manager.setup.runtime;

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.servlet.FilterChain;
import java.util.List;
import org.apache.hertzbeat.common.runtime.BusinessRuntimeGate;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class SetupRuntimeAccessFilterTest {

    @Test
    void gatedRuntimeAllowsSetupHealthAndStaticApplicationPaths() throws Exception {
        SetupRuntimeAccessFilter filter = new SetupRuntimeAccessFilter(
                BusinessRuntimeGate.fixed(RuntimeMode.FULL_SETUP_GATED));
        List<String> allowed = List.of(
                "/api/setup/status",
                "/api/setup/operations/op-1",
                "/actuator/health",
                "/actuator/health/liveness",
                "/actuator/health/readiness",
                "/setup/index.html");
        for (String path : allowed) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", path);
            MockHttpServletResponse response = new MockHttpServletResponse();
            boolean[] invoked = {false};
            filter.doFilter(request, response, invokedChain(invoked));
            assertTrue(invoked[0], path);
        }
    }

    @Test
    void gatedRuntimeRejectsBusinessApiBehindServletContextPath() throws Exception {
        SetupRuntimeAccessFilter filter = new SetupRuntimeAccessFilter(
                BusinessRuntimeGate.fixed(RuntimeMode.FULL_SETUP_GATED));
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/hertzbeat/api/summary");
        request.setContextPath("/hertzbeat");
        request.setServletPath("/api/summary");
        MockHttpServletResponse response = new MockHttpServletResponse();
        boolean[] invoked = {false};

        filter.doFilter(request, response, invokedChain(invoked));

        assertFalse(invoked[0]);
        assertEquals(503, response.getStatus());
    }

    @Test
    void gatedRuntimeRejectsReadsWritesAndOtlpWithSafeNoStoreEnvelope() throws Exception {
        SetupRuntimeAccessFilter filter = new SetupRuntimeAccessFilter(
                BusinessRuntimeGate.fixed(RuntimeMode.FULL_SETUP_GATED));
        for (String path : List.of("/api/summary", "/api/monitor", "/api/otlp/v1/metrics")) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
            MockHttpServletResponse response = new MockHttpServletResponse();
            boolean[] invoked = {false};
            filter.doFilter(request, response, invokedChain(invoked));
            assertFalse(invoked[0], path);
            assertEquals(503, response.getStatus());
            assertEquals("no-store", response.getHeader("Cache-Control"));
            assertTrue(response.getContentType().startsWith("application/json"));
            String body = response.getContentAsString();
            assertTrue(body.contains("\"code\":" + FAIL_CODE), body);
            assertTrue(body.contains("\"msg\":\"setup_not_complete\""), body);
            assertFalse(body.contains("Exception"), body);
        }
    }

    @Test
    void gatedRuntimeDoesNotExposeOtherActuatorEndpoints() throws Exception {
        SetupRuntimeAccessFilter filter = new SetupRuntimeAccessFilter(
                BusinessRuntimeGate.fixed(RuntimeMode.FULL_SETUP_GATED));
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/actuator/env");
        MockHttpServletResponse response = new MockHttpServletResponse();
        boolean[] invoked = {false};
        filter.doFilter(request, response, invokedChain(invoked));
        assertFalse(invoked[0]);
        assertEquals(503, response.getStatus());
    }

    @Test
    void normalRuntimeDoesNotInterceptBusinessApi() throws Exception {
        SetupRuntimeAccessFilter filter = new SetupRuntimeAccessFilter(BusinessRuntimeGate.fixed(RuntimeMode.NORMAL));
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/monitor");
        MockHttpServletResponse response = new MockHttpServletResponse();
        boolean[] invoked = {false};
        filter.doFilter(request, response, invokedChain(invoked));
        assertTrue(invoked[0]);
    }

    private FilterChain invokedChain(boolean[] invoked) {
        return (request, response) -> invoked[0] = true;
    }
}
