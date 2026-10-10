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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import com.usthe.sureness.subject.PrincipalMap;
import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.util.List;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.observability.gateway.SelfTelemetryProperties;
import org.apache.hertzbeat.common.observability.gateway.TelemetrySourceContext;
import org.apache.hertzbeat.common.observability.gateway.TelemetrySource;
import org.apache.hertzbeat.manager.service.AccountService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class TelemetrySourceAuthorizationTest {

    @AfterEach
    void clear() {
        AuthTokenRequestContext.clear();
        TelemetrySourceContext.clear();
    }

    @Test
    void omittedSourcePreservesLegacyClientAndSelfNeedsExplicitAdminWorkspace() throws Exception {
        assertEquals(200, request(null, "user", null, true, false, "/api/logs", null));
        assertEquals(200, request("manual", "user", null, true, false, "/api/entities", null));
        assertEquals(403, request("self", "user", "operations", true, false, "/api/logs", null));
        assertEquals(403, request("self", "admin", null, true, false, "/api/logs", null));
        assertEquals(403, request("self", "admin", "other", true, false, "/api/logs", null));
        assertEquals(200, request("self", "admin", "operations", true, false, "/api/logs", null));
    }

    @Test
    void invalidInjectedDuplicatedAndIngestSourcesAreRejected() throws Exception {
        for (String source : List.of("all", "SELF", "", "self; DROP DATABASE public", "hertzbeat_self")) {
            assertEquals(400, request(source, "admin", "operations", true, false, "/api/logs", null));
        }
        assertEquals(400, request("self", "admin", "operations", true, false, "/api/otlp/v1/metrics", null));
        assertEquals(400, request("self", "admin", "operations", true, true, "/api/logs", null));
        assertEquals(503, request("self", "admin", "operations", false, false, "/api/logs", null));
        assertEquals(403, request("self", "admin", "operations", true, false, "/api/logs", "other"));
        assertEquals(400, request("self", "admin", "operations", true, false, "/api/logs", "duplicateSource"));
    }

    @Test
    void trustedDatabaseCannotComeFromRequestAndCompletionClearsRoute() throws Exception {
        assertEquals(200, request("self", "admin", "operations", true, false, "/api/logs", "injectHeader"));
        assertEquals(null, TelemetrySourceContext.capture());
    }

    @Test
    void asyncSseHandoffClearsOriginalRequestThread() {
        var filter = new ApiTokenValidationFilter(mock(AccountService.class));
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("operations");
        AuthTokenRequestContext.bindWorkspaceId("operations");
        TelemetrySourceContext.bind(new TelemetrySourceContext.Route(TelemetrySource.SELF, "hertzbeat_self", "operations"));
        filter.afterConcurrentHandlingStarted(new MockHttpServletRequest(), new MockHttpServletResponse(), new Object());
        assertEquals(null, TelemetrySourceContext.capture());
        assertEquals(null, AuthTokenRequestContext.currentWorkspaceId());
        assertEquals(null, AuthTokenRequestContext.currentAuthenticatedWorkspaceId());
    }

    private int request(String source, String role, String workspace, boolean ready, boolean hideInternal,
                        String uri, String extra) throws Exception {
        var properties = new SelfTelemetryProperties();
        properties.setEnabled(true);
        properties.setDatabase("hertzbeat_self");
        properties.setWorkspaceId("operations");
        if (ready) { properties.markReady(); }
        var filter = new ApiTokenValidationFilter(mock(AccountService.class));
        filter.setSelfTelemetryProperties(properties);
        var request = new MockHttpServletRequest("GET", uri);
        if (source != null) { request.addParameter("source", source); }
        if (hideInternal) { request.addParameter("hideInternal", "true"); }
        if ("duplicateSource".equals(extra)) { request.addParameter("source", "external"); }
        if ("injectHeader".equals(extra)) { request.addHeader("X-Greptime-DB-Name", "public"); }
        if ("other".equals(extra)) { request.addParameter("workspaceId", "other"); }
        var response = new MockHttpServletResponse();
        SubjectSum subject = mock(SubjectSum.class);
        PrincipalMap principal = mock(PrincipalMap.class);
        when(subject.getPrincipalMap()).thenReturn(principal);
        when(subject.getRoles()).thenReturn(List.of(role));
        when(principal.getPrincipal(AuthTokenScopes.CLAIM_WORKSPACE_ID)).thenReturn(workspace);
        try (var holder = mockStatic(SurenessContextHolder.class)) {
            holder.when(SurenessContextHolder::getBindSubject).thenReturn(subject);
            boolean accepted = filter.preHandle(request, response, new Object());
            if (response.getStatus() == 200) {
                assertTrue(accepted);
                if ("self".equals(source)) {
                    assertEquals("hertzbeat_self", TelemetrySourceContext.capture().database());
                }
                filter.afterCompletion(request, response, new Object(), null);
            } else {
                assertFalse(accepted);
                assertEquals(null, TelemetrySourceContext.capture());
                assertEquals(null, AuthTokenRequestContext.currentAuthenticatedWorkspaceId());
                assertEquals(null, AuthTokenRequestContext.currentWorkspaceId());
            }
        }
        return response.getStatus();
    }
}
