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

package org.apache.hertzbeat.ai.gateway.channel.webui;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** Correlation does not consume a body, grant authority or change endpoint behavior. */
class WebUiRequestDiagnosticsTest {
    @Test
    void correlatesBeforeBodyParsingWithoutReadingSecretsOrChangingRejection() throws Exception {
        var request =
                new MockHttpServletRequest("POST", "/api/agent/webui/chat/stream") {
                    @Override
                    public jakarta.servlet.ServletInputStream getInputStream() {
                        throw new AssertionError("Diagnostic filter must not read a body");
                    }
                };
        var response = new MockHttpServletResponse();
        String id = "12345678-1234-1234-1234-123456789abc";
        request.addHeader(WebUiRequestDiagnostics.HEADER, id);
        request.addHeader("Authorization", "private-not-readable");
        new WebUiRequestDiagnostics()
                .doFilter(
                        request,
                        response,
                        (req, res) -> {
                            RequestContextHolder.setRequestAttributes(
                                    new ServletRequestAttributes(request));
                            try {
                                assertEquals(id, WebUiRequestDiagnostics.currentId());
                            } finally {
                                RequestContextHolder.resetRequestAttributes();
                            }
                            ((jakarta.servlet.http.HttpServletResponse) res).setStatus(401);
                        });
        assertEquals(id, response.getHeader(WebUiRequestDiagnostics.HEADER));
        assertEquals(401, response.getStatus());
        assertFalse(response.isCommitted());
    }

    @Test
    void rejectsUntrustedCorrelationTextAndDoesNotFilterOtherEndpoints() throws Exception {
        var filter = new WebUiRequestDiagnostics();
        var request = new MockHttpServletRequest("POST", "/api/agent/webui/chat/stream");
        request.addHeader(WebUiRequestDiagnostics.HEADER, "secret-injected-correlation");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> {});
        String id = response.getHeader(WebUiRequestDiagnostics.HEADER);
        assertTrue(id.matches("[0-9a-f-]{36}"));
        assertFalse(id.contains("secret"));
        assertTrue(
                filter.shouldNotFilter(new MockHttpServletRequest("GET", "/api/agent/sessions")));
        assertTrue(filter.shouldNotFilter(new MockHttpServletRequest("POST", "/api/monitors")));
    }

    @Test
    void leavesAsyncOwnershipAndCompletionUnderTheOriginalServlet() throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/agent/webui/chat/stream");
        request.setAsyncSupported(true);
        var response = new MockHttpServletResponse();
        new WebUiRequestDiagnostics()
                .doFilter(request, response, (req, res) -> req.startAsync(req, res));
        assertTrue(request.isAsyncStarted());
        assertEquals(200, response.getStatus());
        request.getAsyncContext().complete();
        assertFalse(request.isAsyncStarted());
    }
}
